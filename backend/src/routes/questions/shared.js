const { all, get, run } = require("../../db/database");
const {
  ALLOWED_GRADES,
  ALLOWED_SEMESTERS,
  MAX_KNOWLEDGE_TAG_LENGTH,
  ALLOWED_SUBJECTS
} = require("../../questions/repository");
const { getKnowledgeTagSearchTerms } = require("../../questions/knowledgeTagAliases");
const { normalizeRuntimeBaseUrl } = require("../../services/aiRuntimeConfig");

const ALLOWED_GRADE_SET = new Set(ALLOWED_GRADES);
const ALLOWED_SEMESTER_SET = new Set(ALLOWED_SEMESTERS);
const ALLOWED_SUBJECT_SET = new Set(ALLOWED_SUBJECTS);
const QUESTION_SELECT_FIELDS = [
  "id",
  "subject",
  "grade",
  "semester",
  "knowledgeTag",
  "type",
  "content",
  "imageUrl",
  "options",
  "answer",
  "explanation",
  "difficulty",
  "createdAt",
  "updatedAt"
].join(", ");
const MAX_COVERAGE_TARGETS = 32;

function isLoopbackRequest(req) {
  const candidates = [req.ip, req.socket?.remoteAddress, req.headers["x-forwarded-for"]];

  return candidates.some((value) =>
    String(value || "")
      .split(",")
      .some((candidate) => {
        const normalized = candidate.trim();

        return (
          normalized === "::1" ||
          normalized === "127.0.0.1" ||
          normalized === "::ffff:127.0.0.1"
        );
      })
  );
}

function requireImportAccess(req, res, next) {
  const expectedKey = String(process.env.ADMIN_IMPORT_KEY || "").trim();

  if (!expectedKey) {
    if (isLoopbackRequest(req)) {
      next();
      return;
    }

    res.status(403).json({
      message: "当前未配置 ADMIN_IMPORT_KEY，导入功能仅允许在本机访问。"
    });
    return;
  }

  const providedKey = String(req.get("x-admin-key") || "").trim();

  if (providedKey !== expectedKey) {
    res.status(401).json({
      message: "导入口令无效。"
    });
    return;
  }

  next();
}

function parseIntegerParam(rawValue, defaultValue, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  const parsed = Number.parseInt(String(rawValue), 10);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function parseQuestionId(rawValue) {
  return parseIntegerParam(rawValue, null, { min: 1 });
}

function parseBooleanParam(rawValue, defaultValue = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  const normalized = String(rawValue).trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function parseQuestionIds(rawIds) {
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return null;
  }

  const parsedIds = rawIds.map((rawId) => parseQuestionId(rawId));

  if (parsedIds.some((id) => id === null)) {
    return null;
  }

  return [...new Set(parsedIds)];
}

function escapeLikePattern(value) {
  return String(value || "").replace(/[\\%_]/g, "\\$&");
}

function parseQuestionOptions(rawOptions) {
  try {
    const parsed = JSON.parse(rawOptions);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeRequestText(rawValue, maxLength = 0) {
  const normalized = String(rawValue || "").replace(/\r\n/g, "\n").trim();

  if (maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function normalizeImageUrl(rawValue) {
  return normalizeRequestText(rawValue, 2000);
}

function parseAiRuntime(rawRuntime) {
  if (!rawRuntime || typeof rawRuntime !== "object" || Array.isArray(rawRuntime)) {
    return {
      config: null,
      issues: [],
      usingRuntimeApiKey: false,
      usingRuntimeBaseUrl: false
    };
  }

  const providerLabel = normalizeRequestText(rawRuntime.providerLabel, 40);
  const baseUrlInput = normalizeRequestText(rawRuntime.baseUrl, 240);
  const baseUrl = normalizeRuntimeBaseUrl(rawRuntime.baseUrl);
  const apiKey = normalizeRequestText(rawRuntime.apiKey, 240);
  const normalizedTextApiMode = normalizeRequestText(rawRuntime.textApiMode, 32);
  const textApiMode = ["auto", "responses", "chat-completions"].includes(normalizedTextApiMode)
    ? normalizedTextApiMode
    : "auto";
  const ttsVoice = normalizeRequestText(rawRuntime.ttsVoice, 40);
  const normalizedTtsAudioFormat = normalizeRequestText(rawRuntime.ttsAudioFormat || rawRuntime.audioFormat, 20).toLowerCase();
  const ttsAudioFormat = ["mp3", "wav", "pcm16"].includes(normalizedTtsAudioFormat) ? normalizedTtsAudioFormat : "";
  const issues = [];

  if (baseUrlInput && !baseUrl) {
    issues.push("aiRuntime.baseUrl 必须是有效的 http(s) 地址。");
  }

  if (baseUrl && !apiKey) {
    issues.push("aiRuntime.baseUrl 仅在同时提供 aiRuntime.apiKey 时才允许自定义。");
  }

  return {
    config: {
      providerLabel,
      baseUrl,
      apiKey,
      textApiMode,
      ttsVoice,
      ttsAudioFormat
    },
    issues,
    usingRuntimeApiKey: Boolean(apiKey),
    usingRuntimeBaseUrl: Boolean(baseUrl && apiKey)
  };
}

function normalizeKnowledgeTag(rawValue) {
  return normalizeRequestText(rawValue, MAX_KNOWLEDGE_TAG_LENGTH).replace(/\s+/g, " ");
}

function serializeQuestionRow(row) {
  if (!row) {
    return null;
  }

  const resolvedKnowledgeTag = normalizeKnowledgeTag(row.knowledgeTag) || normalizeRequestText(row.type, MAX_KNOWLEDGE_TAG_LENGTH);

  return {
    ...row,
    knowledgeTag: resolvedKnowledgeTag,
    imageUrl: normalizeImageUrl(row.imageUrl),
    options: parseQuestionOptions(row.options)
  };
}

function findQuestionById(db, questionId) {
  return get(
    db,
    `
      SELECT ${QUESTION_SELECT_FIELDS}
      FROM questions
      WHERE id = ?
    `,
    [questionId]
  );
}

function buildQuestionReviewPayload(row, selectedOption, model = "") {
  const serializedQuestion = serializeQuestionRow(row);

  return {
    model,
    selectedOption,
    correctAnswer: serializedQuestion.answer,
    explanation: serializedQuestion.explanation,
    isCorrect: selectedOption === serializedQuestion.answer,
    isTimeout: selectedOption === "__timeout__",
    question: {
      subject: serializedQuestion.subject,
      grade: serializedQuestion.grade,
      semester: serializedQuestion.semester,
      knowledgeTag: serializedQuestion.knowledgeTag,
      type: serializedQuestion.type,
      content: serializedQuestion.content,
      imageUrl: serializedQuestion.imageUrl,
      options: serializedQuestion.options
    }
  };
}

function findQuestionsByIds(db, questionIds) {
  if (questionIds.length === 0) {
    return [];
  }

  const placeholders = questionIds.map(() => "?").join(", ");

  return all(
    db,
    `
      SELECT id, subject, grade, semester
      FROM questions
      WHERE id IN (${placeholders})
    `,
    questionIds
  );
}

function buildGroupedCounts(db, columnName, expectedValues) {
  const groupedCounts = Object.fromEntries(expectedValues.map((value) => [value, 0]));
  const rows = all(
    db,
    `
      SELECT ${columnName} AS value, COUNT(*) AS count
      FROM questions
      GROUP BY ${columnName}
    `
  );

  for (const row of rows) {
    groupedCounts[row.value] = Number(row.count || 0);
  }

  return groupedCounts;
}

function buildTopKnowledgeTags(db, limit = 16) {
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 16;
  const rows = all(
    db,
    `
      SELECT label, COUNT(*) AS count
      FROM (
        SELECT CASE
          WHEN TRIM(COALESCE(knowledgeTag, '')) <> '' THEN TRIM(knowledgeTag)
          ELSE TRIM(type)
        END AS label
        FROM questions
      )
      WHERE label <> ''
      GROUP BY label
      ORDER BY count DESC, label ASC
      LIMIT ?
    `,
    [normalizedLimit]
  );

  return rows.map((row) => ({
    label: String(row.label || "").trim(),
    count: Number(row.count || 0)
  }));
}

function parseQuestionFilters(query = {}) {
  const subject = String(query.subject || "").trim();
  const grade = String(query.grade || "").trim();
  const semester = String(query.semester || "").trim();
  const knowledgeTag = normalizeKnowledgeTag(query.knowledgeTag);
  const difficulty = parseIntegerParam(query.difficulty, null, { min: 1, max: 3 });

  return {
    subject,
    grade,
    semester,
    knowledgeTag,
    difficulty
  };
}

function validateQuestionFilters({ subject, grade, semester, difficulty }, res, query = {}) {
  if (query.difficulty !== undefined && difficulty === null) {
    res.status(400).json({
      message: "difficulty 仅支持 1 到 3。"
    });
    return false;
  }

  if (subject && !ALLOWED_SUBJECT_SET.has(subject)) {
    res.status(400).json({
      message: `subject 仅支持：${ALLOWED_SUBJECTS.join("、")}。`
    });
    return false;
  }

  if (grade && !ALLOWED_GRADE_SET.has(grade)) {
    res.status(400).json({
      message: `grade 仅支持：${ALLOWED_GRADES.join("、")}。`
    });
    return false;
  }

  if (semester && !ALLOWED_SEMESTER_SET.has(semester)) {
    res.status(400).json({
      message: `semester 仅支持：${ALLOWED_SEMESTERS.join("、")}。`
    });
    return false;
  }

  return true;
}

function parseCoverageTargets(rawTargets, res) {
  if (!Array.isArray(rawTargets) || rawTargets.length === 0) {
    res.status(400).json({
      message: "targets 必须是非空数组。"
    });
    return null;
  }

  if (rawTargets.length > MAX_COVERAGE_TARGETS) {
    res.status(400).json({
      message: `单次最多只支持 ${MAX_COVERAGE_TARGETS} 个题量盘点目标。`
    });
    return null;
  }

  const targets = [];

  for (const [index, rawTarget] of rawTargets.entries()) {
    const filters = parseQuestionFilters(rawTarget);

    if (!validateQuestionFilters(filters, res, rawTarget)) {
      return null;
    }

    targets.push({
      key: normalizeRequestText(rawTarget?.key, 64) || `target-${index + 1}`,
      ...filters
    });
  }

  return targets;
}

function buildWhereSql({ subject, grade, semester, knowledgeTag, difficulty, query = "", excludeIds = [] }) {
  const whereClauses = [];
  const params = [];

  if (subject) {
    whereClauses.push("subject = ?");
    params.push(subject);
  }

  if (grade) {
    whereClauses.push("grade = ?");
    params.push(grade);
  }

  if (semester) {
    whereClauses.push("semester = ?");
    params.push(semester);
  }

  if (knowledgeTag) {
    const knowledgeSearchTerms = getKnowledgeTagSearchTerms(knowledgeTag);
    const placeholders = knowledgeSearchTerms.map(() => "?").join(", ");

    whereClauses.push(
      `
        (
          TRIM(COALESCE(knowledgeTag, '')) IN (${placeholders})
          OR TRIM(COALESCE(type, '')) IN (${placeholders})
        )
      `
    );
    params.push(...knowledgeSearchTerms, ...knowledgeSearchTerms);
  }

  if (difficulty !== null) {
    whereClauses.push("difficulty = ?");
    params.push(difficulty);
  }

  if (query) {
    const likePattern = `%${escapeLikePattern(query)}%`;
    whereClauses.push(
      `
        (
          content LIKE ? ESCAPE '\\'
          OR type LIKE ? ESCAPE '\\'
          OR explanation LIKE ? ESCAPE '\\'
          OR answer LIKE ? ESCAPE '\\'
          OR knowledgeTag LIKE ? ESCAPE '\\'
        )
      `
    );
    params.push(likePattern, likePattern, likePattern, likePattern, likePattern);
  }

  if (Array.isArray(excludeIds) && excludeIds.length > 0) {
    whereClauses.push(`id NOT IN (${excludeIds.map(() => "?").join(", ")})`);
    params.push(...excludeIds);
  }

  return {
    params,
    whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""
  };
}

function findRandomQuestions(db, filters, count, excludeIds = []) {
  const { params, whereSql } = buildWhereSql({
    ...filters,
    excludeIds
  });

  return all(
    db,
    `
      SELECT id, subject, grade, semester, knowledgeTag, type, content, imageUrl, options, difficulty
      FROM questions
      ${whereSql}
      ORDER BY RANDOM()
      LIMIT ?
    `,
    [...params, count]
  );
}

function appendRandomFallbackRows(db, rows, filters, count) {
  const remaining = count - rows.length;

  if (remaining <= 0) {
    return rows;
  }

  const fallbackRows = findRandomQuestions(
    db,
    filters,
    remaining,
    rows.map((row) => row.id)
  );

  if (fallbackRows.length === 0) {
    return rows;
  }

  return [...rows, ...fallbackRows];
}

module.exports = {
  all,
  get,
  run,
  ALLOWED_GRADES,
  ALLOWED_SEMESTERS,
  ALLOWED_SUBJECTS,
  ALLOWED_GRADE_SET,
  ALLOWED_SEMESTER_SET,
  ALLOWED_SUBJECT_SET,
  QUESTION_SELECT_FIELDS,
  requireImportAccess,
  parseIntegerParam,
  parseQuestionId,
  parseBooleanParam,
  parseQuestionIds,
  parseQuestionOptions,
  normalizeRequestText,
  normalizeImageUrl,
  parseAiRuntime,
  normalizeKnowledgeTag,
  serializeQuestionRow,
  findQuestionById,
  buildQuestionReviewPayload,
  findQuestionsByIds,
  buildGroupedCounts,
  buildTopKnowledgeTags,
  parseQuestionFilters,
  validateQuestionFilters,
  parseCoverageTargets,
  buildWhereSql,
  findRandomQuestions,
  appendRandomFallbackRows
};
