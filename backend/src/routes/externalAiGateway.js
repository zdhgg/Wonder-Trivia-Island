const express = require("express");
const { isLoopbackRequest } = require("../security/localAccess");
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
  getTeachingIntervention,
  listProposals,
  parseProposalId,
  PROPOSAL_STATUSES
} = require("../services/externalAiProposals");
const {
  DEFAULT_REQUEST_LIMIT,
  MAX_REQUEST_LIMIT,
  listRequestedTeachingDemoRequests,
  saveTeachingDemoDraft
} = require("../services/teachingDemoDrafts");

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

// External AI Gateway 是本机进程间接口，不是远程认证接口。
//
// 最终安全模型：
//   DSH / External Harness → 本机直连 127.0.0.1:8008 → 真实 socket 是 loopback → 允许
//   局域网 / 其他设备      → :8008/api/external-ai/* → 403
//   浏览器（本机或局域网）  → :3008/api/external-ai/* → 404（Vite 明确不代理该前缀）
//
// 因此这里只依据内核给出的 socket 对端地址做判定，不引入任何 token / secret / session：
//   · 不读取任何 Gateway 专用密钥（该配置已随本机化一并移除）
//   · 不接受 ADMIN_IMPORT_KEY（那是人工管理面的另一套权限边界）
//   · 不读取 X-Forwarded-For / Forwarded / X-Real-IP / req.ip
// 判定真源是 shared/loopbackAddress.mjs，经 ../security/localAccess 暴露，
// 与 requireImportAccess 共用同一份实现。
function requireGatewayAccess(req, res, next) {
  if (isLoopbackRequest(req)) {
    next();
    return;
  }

  res.status(403).json({
    message: "External AI Gateway 只允许本机直连访问。"
  });
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

// ---------------------------------------------------------------------------
// 教学演示（Teaching Demo）外部生成闭环
//
// Wonder-Trivia-Island 不调用任何模型：
//   1. 用户在管理页点击“制作教学演示草稿”，系统只登记待生成请求；
//   2. 外部 Harness 用下面第一个接口拉取请求，自行用任意模型生成受控 spec；
//   3. Harness 用第二个接口提交 draft，服务端强制校验后保存为待审核草稿。
// Harness 不能 approve/reject proposal 或 demo，也不能修改题库、学习记录。
// ---------------------------------------------------------------------------

// 只返回「已 accepted 且用户明确请求过、且尚未提交草稿」的最小必要数据。
router.get("/teaching-demo-requests", (req, res, next) => {
  const limit = parseIntegerParam(req.query?.limit, DEFAULT_REQUEST_LIMIT, {
    min: 1,
    max: MAX_REQUEST_LIMIT
  });

  if (limit === null) {
    res.status(400).json({
      message: `limit 仅支持 1 到 ${MAX_REQUEST_LIMIT}。`
    });
    return;
  }

  try {
    const requests = listRequestedTeachingDemoRequests(req.db, { limit });

    res.json({
      // 只暴露外部 Harness 真正需要的数据：不含管理员字段、数据库结构或完整学习档案。
      data: requests.map((item) => ({
        proposalId: item.proposalId,
        proposalType: item.proposalType,
        interventionType: item.interventionType,
        scope: item.scope,
        suggestion: item.suggestion,
        teachingIntervention: getTeachingIntervention(item.suggestion),
        source: item.source,
        evidence: item.evidence,
        requestedAt: item.requestedAt
      })),
      limit
    });
  } catch (error) {
    next(error);
  }
});

// 提交候选 demo spec。服务端检查 proposal 状态、用户请求记录、类型一致性，
// 并通过 teachingDemoSpec 白名单归一化后才落库为 draft。
router.post("/teaching-demo-drafts", (req, res, next) => {
  const proposalId = parseProposalId(req.body?.proposalId);
  const interventionType = normalizeQueryText(req.body?.interventionType, 40);

  if (!proposalId) {
    res.status(400).json({ message: "proposalId 必须是正整数。" });
    return;
  }

  if (!interventionType) {
    res.status(400).json({ message: "interventionType 必须提供。" });
    return;
  }

  try {
    const proposal = getProposal(req.db, proposalId);

    if (!proposal) {
      res.status(404).json({ message: "proposal 不存在。" });
      return;
    }

    if (proposal.status !== "accepted") {
      res.status(409).json({ message: "只有 accepted proposal 才能提交教学演示草稿。" });
      return;
    }

    const intervention = getTeachingIntervention(proposal.suggestion);

    if (!intervention) {
      res.status(409).json({ message: "该 proposal 没有合法的 teachingIntervention。" });
      return;
    }

    if (intervention.recommendedIntervention !== interventionType) {
      res.status(409).json({
        message: `interventionType 必须与 proposal 推荐的教学方式一致：${intervention.recommendedIntervention}。`
      });
      return;
    }

    let saved;

    try {
      saved = saveTeachingDemoDraft(req.db, {
        proposalId,
        interventionType,
        spec: req.body?.spec
      });
    } catch (error) {
      if (Number(error?.statusCode) === 422) {
        res.status(422).json({
          message: error.message || "教学演示规格未通过系统白名单校验。",
          details: Array.isArray(error.details) ? error.details : []
        });
        return;
      }

      throw error;
    }

    if (saved.kind === "requestMissing") {
      res.status(409).json({
        message: "该 proposal 尚未由用户在系统内请求制作教学演示草稿，Harness 不能主动提交 demo。"
      });
      return;
    }

    if (saved.kind === "unsupported") {
      res.status(409).json({ message: "教学演示类型不受支持，只允许 comparison_demo 或 micro_animation。" });
      return;
    }

    if (saved.kind === "interventionMismatch") {
      res.status(409).json({
        message: `interventionType 与请求记录不一致：${saved.expectedInterventionType}。`
      });
      return;
    }

    if (saved.kind === "draftApproved") {
      res.status(409).json({ message: "教学演示草稿已经确认可用，不能覆盖。" });
      return;
    }

    if (saved.kind === "draftAwaitingReview") {
      res.status(409).json({
        message: "该教学演示草稿正在等待人工审核，Harness 不能重复提交覆盖。"
      });
      return;
    }

    if (saved.kind === "requestNotPending") {
      res.status(409).json({
        message: "当前没有待处理的生成请求；已不采用的草稿需要用户在系统内重新登记请求后才能再次提交。"
      });
      return;
    }

    if (saved.kind !== "saved") {
      res.status(400).json({ message: "教学演示草稿保存失败。" });
      return;
    }

    res.status(201).json({ data: saved.draft });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  router,
  requireGatewayAccess
};
