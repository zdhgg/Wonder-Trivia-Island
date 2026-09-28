const express = require("express");
const { getQuestionCount } = require("../questions/repository");
const {
  all,
  get,
  ALLOWED_GRADES,
  ALLOWED_SEMESTERS,
  ALLOWED_SUBJECTS,
  buildGroupedCounts,
  buildTopKnowledgeTags,
  buildWhereSql,
  normalizeKnowledgeTag,
  parseIntegerParam,
  parseQuestionOptions,
  serializeQuestionRow,
  validateQuestionFilters,
  parseQuestionFilters
} = require("./questions/shared");
const {
  createProposal,
  buildLearningEvidence,
  getProposal,
  listProposals,
  parseProposalId,
  PROPOSAL_STATUSES
} = require("../services/externalAiProposals");

const router = express.Router();
const QUESTION_CONTEXT_FIELDS = [
  "id",
  "subject",
  "grade",
  "semester",
  "knowledgeTag",
  "type",
  "content",
  "imageUrl",
  "options",
  "explanation",
  "difficulty",
  "createdAt",
  "updatedAt"
].join(", ");

function requireGatewayAccess(req, res, next) {
  const expectedKey = String(process.env.EXTERNAL_AI_GATEWAY_KEY || "").trim();

  if (!expectedKey) {
    res.status(503).json({
      message: "External AI Gateway 尚未配置 EXTERNAL_AI_GATEWAY_KEY。"
    });
    return;
  }

  const providedKey = String(req.get("x-external-ai-key") || "").trim();

  if (providedKey !== expectedKey) {
    res.status(401).json({
      message: "External AI Gateway 凭证无效。"
    });
    return;
  }

  next();
}

function normalizeQueryText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function validateFilterQuery(req, res) {
  const filters = parseQuestionFilters(req.query);

  if (!validateQuestionFilters(filters, res, req.query)) {
    return null;
  }

  return filters;
}

function serializeContextQuestion(row) {
  const serialized = serializeQuestionRow(row);

  return {
    id: serialized.id,
    subject: serialized.subject,
    grade: serialized.grade,
    semester: serialized.semester,
    knowledgeTag: serialized.knowledgeTag,
    type: serialized.type,
    content: serialized.content,
    imageUrl: serialized.imageUrl,
    options: parseQuestionOptions(row.options),
    explanation: serialized.explanation,
    difficulty: serialized.difficulty,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt
  };
}

router.use(requireGatewayAccess);

router.get("/question-stats", (req, res, next) => {
  try {
    res.json({
      total: getQuestionCount(req.db),
      bySubject: buildGroupedCounts(req.db, "subject", ALLOWED_SUBJECTS),
      byGrade: buildGroupedCounts(req.db, "grade", ALLOWED_GRADES),
      bySemester: buildGroupedCounts(req.db, "semester", ALLOWED_SEMESTERS),
      topKnowledgeTags: buildTopKnowledgeTags(req.db)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/questions", (req, res, next) => {
  const page = parseIntegerParam(req.query?.page, 1, { min: 1, max: 100000 });
  const pageSize = parseIntegerParam(req.query?.pageSize, 20, { min: 1, max: 20 });
  const questionId = parseIntegerParam(req.query?.questionId, null, { min: 1 });
  const filters = validateFilterQuery(req, res);
  const query = normalizeQueryText(req.query?.query);

  if (page === null || pageSize === null || (req.query?.questionId !== undefined && questionId === null)) {
    res.status(400).json({
      message: "page、pageSize 和 questionId 必须是合法的正整数。"
    });
    return;
  }

  if (!filters) {
    return;
  }

  try {
    const built = buildWhereSql({
      ...filters,
      query
    });
    const params = [...built.params];
    const whereClauses = built.whereSql ? [built.whereSql.slice(6)] : [];

    if (questionId) {
      whereClauses.push("id = ?");
      params.push(questionId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const totalRow = get(req.db, `SELECT COUNT(*) AS count FROM questions ${whereSql}`, params);
    const total = Number(totalRow?.count || 0);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;
    const rows = all(
      req.db,
      `
        SELECT ${QUESTION_CONTEXT_FIELDS}
        FROM questions
        ${whereSql}
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    res.json({
      data: rows.map(serializeContextQuestion),
      pagination: {
        page: currentPage,
        pageSize,
        total,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: totalPages > 0 && currentPage < totalPages
      },
      filters: {
        ...filters,
        knowledgeTag: normalizeKnowledgeTag(filters.knowledgeTag),
        query,
        questionId: questionId || null
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/learning-evidence", (req, res, next) => {
  const filters = {
    profileId: normalizeQueryText(req.query?.profileId, 80),
    subject: normalizeQueryText(req.query?.subject, 16),
    grade: normalizeQueryText(req.query?.grade, 16),
    semester: normalizeQueryText(req.query?.semester, 16),
    knowledgeTag: normalizeQueryText(req.query?.knowledgeTag, 48),
    limit: parseIntegerParam(req.query?.limit, 20, { min: 1, max: 50 })
  };

  if (!filters.profileId) {
    res.status(400).json({
      message: "profileId 必须提供，用于精确筛选学习证据。"
    });
    return;
  }

  if (filters.limit === null) {
    res.status(400).json({
      message: "limit 仅支持 1 到 50。"
    });
    return;
  }

  if (
    (filters.subject && !ALLOWED_SUBJECTS.includes(filters.subject)) ||
    (filters.grade && !ALLOWED_GRADES.includes(filters.grade)) ||
    (filters.semester && !ALLOWED_SEMESTERS.includes(filters.semester))
  ) {
    res.status(400).json({
      message: "subject、grade 或 semester 不是系统支持的值。"
    });
    return;
  }

  try {
    res.json(buildLearningEvidence(req.db, filters));
  } catch (error) {
    next(error);
  }
});

router.get("/proposals", (req, res, next) => {
  const status = normalizeQueryText(req.query?.status, 20);
  const sourceId = normalizeQueryText(req.query?.sourceId, 120);
  const limit = parseIntegerParam(req.query?.limit, 50, { min: 1, max: 50 });
  const offset = parseIntegerParam(req.query?.offset, 0, { min: 0, max: 100000 });

  if (limit === null || offset === null || (status && !PROPOSAL_STATUSES.includes(status))) {
    res.status(400).json({
      message: `status 仅支持：${PROPOSAL_STATUSES.join("、")}，limit/offset 必须合法。`
    });
    return;
  }

  // accepted 是动态知识补充上下文；pending/rejected 要求提交来源筛选值。
  // sourceId 只是筛选字段，不是 Harness 身份认证或安全隔离。
  if (status !== "accepted" && !sourceId) {
    res.status(400).json({
      message: "查询 pending 或 rejected proposal 时必须提供 sourceId。"
    });
    return;
  }

  try {
    res.json(listProposals(req.db, { status: status || "accepted", sourceKey: sourceId, limit, offset }));
  } catch (error) {
    next(error);
  }
});

router.get("/proposals/:id", (req, res, next) => {
  const proposalId = parseProposalId(req.params.id);
  const sourceId = normalizeQueryText(req.query?.sourceId, 120);

  if (!proposalId) {
    res.status(400).json({ message: "proposal id 必须是正整数。" });
    return;
  }

  try {
    const proposal = getProposal(req.db, proposalId);

    if (!proposal) {
      res.status(404).json({ message: "proposal 不存在。" });
      return;
    }

    if (proposal.status !== "accepted" && proposal.sourceKey !== sourceId) {
      res.status(404).json({ message: "proposal 不存在。" });
      return;
    }

    res.json({ data: proposal });
  } catch (error) {
    next(error);
  }
});

router.post("/proposals", (req, res, next) => {
  try {
    const proposal = createProposal(req.db, req.body || {});
    res.status(201).json({ data: proposal });
  } catch (error) {
    res.status(400).json({
      message: error.message || "proposal 数据不合法。"
    });
  }
});

module.exports = {
  router,
  requireGatewayAccess
};
