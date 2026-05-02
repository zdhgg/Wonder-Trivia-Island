const express = require("express");
const { getQuestionCount } = require("../../questions/repository");
const {
  all,
  get,
  ALLOWED_GRADES,
  ALLOWED_SEMESTERS,
  ALLOWED_SUBJECTS,
  QUESTION_SELECT_FIELDS,
  requireImportAccess,
  parseIntegerParam,
  parseBooleanParam,
  parseQuestionOptions,
  serializeQuestionRow,
  buildGroupedCounts,
  buildTopKnowledgeTags,
  parseQuestionFilters,
  validateQuestionFilters,
  parseCoverageTargets,
  buildWhereSql,
  findRandomQuestions,
  appendRandomFallbackRows
} = require("./shared");

const router = express.Router();

router.get("/stats", (req, res, next) => {
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

router.post("/coverage", (req, res, next) => {
  const targets = parseCoverageTargets(req.body?.targets, res);

  if (!targets) {
    return;
  }

  try {
    const data = targets.map((target) => {
      const { params, whereSql } = buildWhereSql(target);
      const countRow = get(
        req.db,
        `
          SELECT COUNT(*) AS count
          FROM questions
          ${whereSql}
        `,
        params
      );

      return {
        key: target.key,
        count: Number(countRow?.count || 0)
      };
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireImportAccess, (req, res, next) => {
  const page = parseIntegerParam(req.query?.page, 1, { min: 1, max: 100000 });
  const pageSize = parseIntegerParam(req.query?.pageSize, 6, { min: 1, max: 50 });
  const questionFilters = parseQuestionFilters(req.query);
  const query = String(req.query?.query || "").trim();

  if (page === null || pageSize === null) {
    res.status(400).json({
      message: "page 和 pageSize 必须是合法的正整数。"
    });
    return;
  }

  if (!validateQuestionFilters(questionFilters, res, req.query)) {
    return;
  }

  try {
    const { params, whereSql } = buildWhereSql({
      ...questionFilters,
      query
    });
    const totalRow = get(
      req.db,
      `
        SELECT COUNT(*) AS count
        FROM questions
        ${whereSql}
      `,
      params
    );
    const total = Number(totalRow?.count || 0);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;
    const rows = all(
      req.db,
      `
        SELECT ${QUESTION_SELECT_FIELDS}
        FROM questions
        ${whereSql}
        ORDER BY id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    res.json({
      data: rows.map(serializeQuestionRow),
      pagination: {
        page: currentPage,
        pageSize,
        total,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: totalPages > 0 && currentPage < totalPages
      },
      filters: {
        ...questionFilters,
        query
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/random", (req, res, next) => {
  const count = parseIntegerParam(req.query?.count, 3, { min: 1, max: 20 });
  const questionFilters = parseQuestionFilters(req.query);
  const allowSemesterFallback = parseBooleanParam(req.query?.allowSemesterFallback, false);

  if (count === null) {
    res.status(400).json({
      message: "count 仅支持 1 到 20 的正整数。"
    });
    return;
  }

  if (!validateQuestionFilters(questionFilters, res, req.query)) {
    return;
  }

  try {
    let rows = findRandomQuestions(req.db, questionFilters, count);
    let usedKnowledgeTagFallback = false;
    let usedSemesterFallback = false;
    const canUseSemesterFallback =
      allowSemesterFallback && questionFilters.semester && questionFilters.semester !== "通用";

    if (canUseSemesterFallback && rows.length < count) {
      const nextRows = appendRandomFallbackRows(
        req.db,
        rows,
        {
          ...questionFilters,
          semester: "通用"
        },
        count
      );

      if (nextRows.length > rows.length) {
        rows = nextRows;
        usedSemesterFallback = true;
      }
    }

    if (questionFilters.knowledgeTag && rows.length < count) {
      const nextRows = appendRandomFallbackRows(
        req.db,
        rows,
        {
          ...questionFilters,
          knowledgeTag: ""
        },
        count
      );

      if (nextRows.length > rows.length) {
        rows = nextRows;
        usedKnowledgeTagFallback = true;
      }

      if (canUseSemesterFallback && rows.length < count) {
        const nextSemesterRows = appendRandomFallbackRows(
          req.db,
          rows,
          {
            ...questionFilters,
            semester: "通用",
            knowledgeTag: ""
          },
          count
        );

        if (nextSemesterRows.length > rows.length) {
          rows = nextSemesterRows;
          usedKnowledgeTagFallback = true;
          usedSemesterFallback = true;
        }
      }
    }

    const questions = rows.map((row) => ({
      ...row,
      options: parseQuestionOptions(row.options)
    }));

    res.json({
      count: questions.length,
      requestedCount: count,
      filters: questionFilters,
      usedKnowledgeTagFallback,
      usedSemesterFallback,
      data: questions
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
