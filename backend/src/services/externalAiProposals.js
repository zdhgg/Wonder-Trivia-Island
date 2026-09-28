const { all, get, run } = require("../db/database");
const {
  ALLOWED_GRADES,
  ALLOWED_SEMESTERS,
  ALLOWED_SUBJECTS
} = require("../questions/repository");

const PROPOSAL_TYPES = Object.freeze([
  "focus_mark",
  "common_mistake",
  "knowledge_update",
  "question_type_advice"
]);
const PROPOSAL_STATUSES = Object.freeze(["pending", "accepted", "rejected"]);
const PROPOSAL_TYPE_SET = new Set(PROPOSAL_TYPES);
const PROPOSAL_STATUS_SET = new Set(PROPOSAL_STATUSES);
const MAX_JSON_LENGTH = 64 * 1024;
const MAX_REVIEW_NOTE_LENGTH = 2000;
const createTableSql = `
  CREATE TABLE IF NOT EXISTS external_ai_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_type TEXT NOT NULL CHECK (proposal_type IN ('focus_mark', 'common_mistake', 'knowledge_update', 'question_type_advice')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    source_key TEXT NOT NULL,
    scope_json TEXT NOT NULL,
    suggestion_json TEXT NOT NULL,
    source_json TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    review_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    reviewed_at TEXT
  );
`;

function ensureExternalAiProposalsTable(db) {
  run(db, createTableSql);
  run(db, "CREATE INDEX IF NOT EXISTS idx_external_ai_proposals_status_created ON external_ai_proposals(status, created_at DESC)");
  run(db, "CREATE INDEX IF NOT EXISTS idx_external_ai_proposals_source_key ON external_ai_proposals(source_key)");
}

function normalizeText(value, maxLength = 0) {
  const normalized = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function serializeJsonValue(value, label, { required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`${label}不能为空。`);
    }

    return { value: null, text: "null" };
  }

  if (typeof value === "string") {
    const normalized = normalizeText(value, MAX_JSON_LENGTH);

    if (required && !normalized) {
      throw new Error(`${label}不能为空。`);
    }

    return {
      value: normalized,
      text: JSON.stringify(normalized)
    };
  }

  if (typeof value !== "object") {
    throw new Error(`${label}必须是文本、对象或数组。`);
  }

  const text = JSON.stringify(value);

  if (!text || text.length > MAX_JSON_LENGTH) {
    throw new Error(`${label}内容过大。`);
  }

  return { value, text };
}

function normalizeScope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("scope 必须是对象。");
  }

  const { value: normalized, text } = serializeJsonValue(value, "scope");
  return { value: normalized, text };
}

function getSourceKey(source) {
  if (typeof source === "string") {
    return normalizeText(source, 120);
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return "";
  }

  return normalizeText(
    source.harnessId || source.harness || source.sourceId || source.id || source.name || source.runId,
    120
  );
}

function normalizeProposalInput(input = {}) {
  const proposalType = normalizeText(input.type || input.proposalType, 40);

  if (!PROPOSAL_TYPE_SET.has(proposalType)) {
    throw new Error(`proposal type 仅支持：${PROPOSAL_TYPES.join("、")}。`);
  }

  const source = serializeJsonValue(input.source, "source");
  const sourceKey = getSourceKey(source.value);

  if (!sourceKey) {
    throw new Error("source 必须包含 harnessId、sourceId、id、name 或 runId。");
  }

  const scope = normalizeScope(input.scope);
  const suggestion = serializeJsonValue(input.suggestion, "suggestion");
  const evidence = serializeJsonValue(input.evidence, "evidence");

  return {
    proposalType,
    sourceKey,
    scope,
    suggestion,
    source,
    evidence
  };
}

function parseStoredJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeProposalRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    type: row.proposal_type,
    status: row.status,
    scope: parseStoredJson(row.scope_json, {}),
    suggestion: parseStoredJson(row.suggestion_json, ""),
    source: parseStoredJson(row.source_json, row.source_key),
    sourceKey: row.source_key,
    evidence: parseStoredJson(row.evidence_json, {}),
    reviewNote: row.review_note || "",
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || null
  };
}

function createProposal(db, input) {
  ensureExternalAiProposalsTable(db);
  const normalized = normalizeProposalInput(input);
  const createdAt = new Date().toISOString();
  const result = run(
    db,
    `
      INSERT INTO external_ai_proposals (
        proposal_type,
        status,
        source_key,
        scope_json,
        suggestion_json,
        source_json,
        evidence_json,
        created_at
      )
      VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)
    `,
    [
      normalized.proposalType,
      normalized.sourceKey,
      normalized.scope.text,
      normalized.suggestion.text,
      normalized.source.text,
      normalized.evidence.text,
      createdAt
    ]
  );

  return getProposal(db, Number(result.lastInsertRowid));
}

function parseProposalId(rawValue) {
  const parsed = Number.parseInt(String(rawValue || ""), 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getProposal(db, proposalId) {
  ensureExternalAiProposalsTable(db);
  const id = parseProposalId(proposalId);

  if (!id) {
    return null;
  }

  return serializeProposalRow(
    get(
      db,
      `
        SELECT id, proposal_type, status, source_key, scope_json, suggestion_json,
               source_json, evidence_json, review_note, created_at, reviewed_at
        FROM external_ai_proposals
        WHERE id = ?
      `,
      [id]
    )
  );
}

function listProposals(db, { status = "", sourceKey = "", limit = 50, offset = 0 } = {}) {
  ensureExternalAiProposalsTable(db);
  const normalizedStatus = normalizeText(status, 20);
  const where = [];
  const params = [];

  if (normalizedStatus) {
    if (!PROPOSAL_STATUS_SET.has(normalizedStatus)) {
      throw new Error(`status 仅支持：${PROPOSAL_STATUSES.join("、")}。`);
    }

    where.push("status = ?");
    params.push(normalizedStatus);
  }

  if (sourceKey) {
    where.push("source_key = ?");
    params.push(normalizeText(sourceKey, 120));
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const countRow = get(db, `SELECT COUNT(*) AS count FROM external_ai_proposals ${whereSql}`, params);
  const rows = all(
    db,
    `
      SELECT id, proposal_type, status, source_key, scope_json, suggestion_json,
             source_json, evidence_json, review_note, created_at, reviewed_at
      FROM external_ai_proposals
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return {
    data: rows.map(serializeProposalRow),
    pagination: {
      total: Number(countRow?.count || 0),
      limit,
      offset
    }
  };
}

function reviewProposal(db, proposalId, status, reviewNote = "") {
  ensureExternalAiProposalsTable(db);
  const id = parseProposalId(proposalId);
  const normalizedStatus = normalizeText(status, 20);

  if (!id || !PROPOSAL_STATUS_SET.has(normalizedStatus) || normalizedStatus === "pending") {
    return { kind: "invalid" };
  }

  const existing = getProposal(db, id);

  if (!existing) {
    return { kind: "missing" };
  }

  if (existing.status !== "pending") {
    return { kind: "alreadyReviewed", proposal: existing };
  }

  const reviewedAt = new Date().toISOString();
  run(
    db,
    `
      UPDATE external_ai_proposals
      SET status = ?, review_note = ?, reviewed_at = ?
      WHERE id = ? AND status = 'pending'
    `,
    [normalizedStatus, normalizeText(reviewNote, MAX_REVIEW_NOTE_LENGTH), reviewedAt, id]
  );

  return { kind: "updated", proposal: getProposal(db, id) };
}

function normalizeEvidenceFilter(rawValue, maxLength = 80) {
  return normalizeText(rawValue, maxLength);
}

function reviewStatusForRecord(record, now = Date.now()) {
  if (record.masteredAt) {
    return "mastered";
  }

  if (!record.nextReviewAt) {
    return "due";
  }

  const nextReviewTime = Date.parse(record.nextReviewAt);

  return Number.isNaN(nextReviewTime) || nextReviewTime <= now ? "due" : "scheduled";
}

function numericRecordValue(record, key) {
  const value = Number(record?.[key]);

  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function buildLearningEvidence(db, filters = {}) {
  const profileId = normalizeEvidenceFilter(filters.profileId, 80);
  const subject = normalizeEvidenceFilter(filters.subject, 16);
  const grade = normalizeEvidenceFilter(filters.grade, 16);
  const semester = normalizeEvidenceFilter(filters.semester, 16);
  const knowledgeTag = normalizeEvidenceFilter(filters.knowledgeTag, 48);
  const maxGroups = Math.min(Math.max(Number(filters.limit) || 20, 1), 50);
  let rows = [];

  try {
    rows = all(db, "SELECT profile_id, record_book_json FROM study_record_book");
  } catch {
    rows = [];
  }

  const grouped = new Map();
  const now = Date.now();

  for (const row of rows) {
    if (profileId && row.profile_id !== profileId) {
      continue;
    }

    const recordBook = parseStoredJson(row.record_book_json, {});
    const questionRecords =
      recordBook?.questionRecords && typeof recordBook.questionRecords === "object" && !Array.isArray(recordBook.questionRecords)
        ? recordBook.questionRecords
        : {};

    for (const rawRecord of Object.values(questionRecords)) {
      const snapshot = rawRecord?.snapshot || rawRecord?.question || {};
      const recordSubject = normalizeText(snapshot.subject, 16);
      const recordGrade = normalizeText(snapshot.grade, 16);
      const recordSemester = normalizeText(snapshot.semester, 16);
      const recordKnowledgeTag = normalizeText(snapshot.knowledgeTag, 48) || normalizeText(snapshot.type, 48) || "未标注知识点";

      if (
        (subject && recordSubject !== subject) ||
        (grade && recordGrade !== grade) ||
        (semester && recordSemester !== semester) ||
        (knowledgeTag && recordKnowledgeTag !== knowledgeTag)
      ) {
        continue;
      }

      const groupKey = [recordKnowledgeTag, recordSubject, recordGrade, recordSemester].join("\u0001");
      let group = grouped.get(groupKey);

      if (!group) {
        group = {
          knowledgeTag: recordKnowledgeTag,
          subject: recordSubject,
          grade: recordGrade,
          semester: recordSemester,
          profileIds: new Set(),
          questionRefs: new Map(),
          attempts: 0,
          correctCount: 0,
          wrongCount: 0,
          timeoutCount: 0,
          dueCount: 0,
          scheduledCount: 0,
          masteredCount: 0,
          latestAnsweredAt: ""
        };
        grouped.set(groupKey, group);
      }

      const reviewStatus = reviewStatusForRecord(rawRecord, now);
      const questionId = Number(rawRecord?.questionId || snapshot.id) || null;
      const attempts = numericRecordValue(rawRecord, "attempts");
      const correctCount = numericRecordValue(rawRecord, "correctCount");
      const wrongCount = numericRecordValue(rawRecord, "wrongCount");
      const timeoutCount = numericRecordValue(rawRecord, "timeoutCount");
      const nextReviewAt = normalizeText(rawRecord?.nextReviewAt, 64);
      const lastAnsweredAt = normalizeText(rawRecord?.lastAnsweredAt, 64);

      group.profileIds.add(row.profile_id);
      group.attempts += attempts;
      group.correctCount += correctCount;
      group.wrongCount += wrongCount;
      group.timeoutCount += timeoutCount;
      if (reviewStatus === "due") group.dueCount += 1;
      if (reviewStatus === "scheduled") group.scheduledCount += 1;
      if (reviewStatus === "mastered") group.masteredCount += 1;
      if (lastAnsweredAt > group.latestAnsweredAt) group.latestAnsweredAt = lastAnsweredAt;

      if (questionId) {
        let questionRef = group.questionRefs.get(questionId);

        if (!questionRef) {
          questionRef = {
            questionId,
            subject: recordSubject,
            grade: recordGrade,
            semester: recordSemester,
            attempts: 0,
            correctCount: 0,
            wrongCount: 0,
            timeoutCount: 0,
            reviewStatus,
            nextReviewAt,
            lastAnsweredAt
          };
          group.questionRefs.set(questionId, questionRef);
        }

        questionRef.attempts += attempts;
        questionRef.correctCount += correctCount;
        questionRef.wrongCount += wrongCount;
        questionRef.timeoutCount += timeoutCount;
        if (reviewStatus === "due") questionRef.reviewStatus = "due";
        if (lastAnsweredAt > questionRef.lastAnsweredAt) questionRef.lastAnsweredAt = lastAnsweredAt;
        if (nextReviewAt && (!questionRef.nextReviewAt || nextReviewAt < questionRef.nextReviewAt)) {
          questionRef.nextReviewAt = nextReviewAt;
        }
      }
    }
  }

  const data = [...grouped.values()]
    .sort((left, right) => right.wrongCount - left.wrongCount || right.attempts - left.attempts)
    .slice(0, maxGroups)
    .map((group) => ({
      knowledgeTag: group.knowledgeTag,
      subject: group.subject,
      grade: group.grade,
      semester: group.semester,
      profileCount: group.profileIds.size,
      attempts: group.attempts,
      correctCount: group.correctCount,
      wrongCount: group.wrongCount,
      timeoutCount: group.timeoutCount,
      dueCount: group.dueCount,
      scheduledCount: group.scheduledCount,
      masteredCount: group.masteredCount,
      latestAnsweredAt: group.latestAnsweredAt || null,
      questionRefs: [...group.questionRefs.values()].slice(0, 20)
    }));

  return {
    filters: {
      profileId: profileId || null,
      subject: subject || null,
      grade: grade || null,
      semester: semester || null,
      knowledgeTag: knowledgeTag || null
    },
    data
  };
}

module.exports = {
  PROPOSAL_TYPES,
  PROPOSAL_STATUSES,
  ensureExternalAiProposalsTable,
  normalizeProposalInput,
  createProposal,
  parseProposalId,
  getProposal,
  listProposals,
  reviewProposal,
  buildLearningEvidence
};
