const { all, get, run, runInSavepoint } = require("../db/database");
const {
  ensureExternalAiProposalsTable,
  getProposal,
  getTeachingIntervention,
  parseProposalId
} = require("./externalAiProposals");
const {
  isSupportedTeachingDemoType,
  MAX_SPEC_JSON_LENGTH,
  normalizeTeachingDemoSpec,
  SUPPORTED_TEACHING_DEMO_TYPES
} = require("./teachingDemoSpec");

const DRAFT_STATUSES = Object.freeze(["draft", "approved", "rejected"]);
const REQUEST_STATUSES = Object.freeze(["requested", "submitted"]);
const DRAFT_STATUS_SET = new Set(DRAFT_STATUSES);
const MAX_REVIEW_NOTE_LENGTH = 2000;
const DEFAULT_REQUEST_LIMIT = 20;
const MAX_REQUEST_LIMIT = 50;

// 最小“待外部生成请求”状态：只记录「这个 proposal 已被用户明确请求制作」，
// 不引入 Job Queue / 工作流引擎。三态由两张表组合表达：
//   1. 没有 request 行且没有 draft 行 = 尚未请求
//   2. request.status = 'requested'    = 已请求、等待外部 Harness
//   3. draft 行存在（request.status = 'submitted'）= Harness 已提交草稿
const createRequestsTableSql = `
  CREATE TABLE IF NOT EXISTS teaching_demo_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL UNIQUE,
    intervention_type TEXT NOT NULL CHECK (intervention_type IN ('comparison_demo', 'micro_animation')),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'submitted')),
    requested_at TEXT NOT NULL,
    submitted_at TEXT,
    FOREIGN KEY (proposal_id) REFERENCES external_ai_proposals(id) ON DELETE CASCADE
  );
`;

const createTableSql = `
  CREATE TABLE IF NOT EXISTS teaching_demo_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
    intervention_type TEXT NOT NULL CHECK (intervention_type IN ('comparison_demo', 'micro_animation')),
    spec_json TEXT NOT NULL,
    review_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    FOREIGN KEY (proposal_id) REFERENCES external_ai_proposals(id) ON DELETE CASCADE
  );
`;

function ensureTeachingDemoDraftsTable(db) {
  ensureExternalAiProposalsTable(db);
  run(db, createTableSql);
  run(db, createRequestsTableSql);
  run(db, "CREATE INDEX IF NOT EXISTS idx_teaching_demo_drafts_status ON teaching_demo_drafts(status)");
  run(db, "CREATE INDEX IF NOT EXISTS idx_teaching_demo_requests_status ON teaching_demo_requests(status)");
}

function normalizeReviewNote(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, MAX_REVIEW_NOTE_LENGTH);
}

function parseDraftId(rawValue) {
  const parsed = Number.parseInt(String(rawValue || ""), 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseStoredJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeDraftRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    proposalId: Number(row.proposal_id),
    status: row.status,
    interventionType: row.intervention_type,
    spec: parseStoredJson(row.spec_json, null),
    reviewNote: row.review_note || "",
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || null
  };
}

function serializeRequestRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    proposalId: Number(row.proposal_id),
    interventionType: row.intervention_type,
    status: row.status,
    requestedAt: row.requested_at,
    submittedAt: row.submitted_at || null
  };
}

const DRAFT_FIELDS = "id, proposal_id, status, intervention_type, spec_json, review_note, created_at, reviewed_at";
const REQUEST_FIELDS = "id, proposal_id, intervention_type, status, requested_at, submitted_at";

function findDraftRowByProposalId(db, proposalId) {
  return get(db, `SELECT ${DRAFT_FIELDS} FROM teaching_demo_drafts WHERE proposal_id = ?`, [proposalId]);
}

function findRequestRowByProposalId(db, proposalId) {
  return get(db, `SELECT ${REQUEST_FIELDS} FROM teaching_demo_requests WHERE proposal_id = ?`, [proposalId]);
}

function getTeachingDemoDraftByProposalId(db, proposalId) {
  ensureTeachingDemoDraftsTable(db);
  const id = parseProposalId(proposalId);

  if (!id) {
    return null;
  }

  return serializeDraftRow(findDraftRowByProposalId(db, id));
}

function getTeachingDemoRequestByProposalId(db, proposalId) {
  ensureTeachingDemoDraftsTable(db);
  const id = parseProposalId(proposalId);

  if (!id) {
    return null;
  }

  return serializeRequestRow(findRequestRowByProposalId(db, id));
}

function getTeachingDemoDraft(db, draftId) {
  ensureTeachingDemoDraftsTable(db);
  const id = parseDraftId(draftId);

  if (!id) {
    return null;
  }

  return serializeDraftRow(get(db, `SELECT ${DRAFT_FIELDS} FROM teaching_demo_drafts WHERE id = ?`, [id]));
}

/**
 * 用户点击“制作教学演示草稿”时的唯一写入口：只登记待外部生成请求，绝不调用任何模型。
 */
function createTeachingDemoRequest(db, proposalId) {
  ensureTeachingDemoDraftsTable(db);
  const id = parseProposalId(proposalId);

  if (!id) {
    return { kind: "invalid" };
  }

  const proposal = getProposal(db, id);

  if (!proposal) {
    return { kind: "missingProposal" };
  }

  if (proposal.status !== "accepted") {
    return { kind: "proposalNotAccepted", proposal };
  }

  const intervention = getTeachingIntervention(proposal.suggestion);

  if (!intervention) {
    return { kind: "missingIntervention", proposal };
  }

  const interventionType = intervention.recommendedIntervention;

  if (!isSupportedTeachingDemoType(interventionType)) {
    return { kind: "unsupportedIntervention", interventionType, proposal };
  }

  const draft = getTeachingDemoDraftByProposalId(db, id);

  if (draft?.status === "approved") {
    return { kind: "draftApproved", draft };
  }

  const existing = findRequestRowByProposalId(db, id);
  const requestedAt = new Date().toISOString();

  if (existing && existing.status === "requested" && existing.intervention_type === interventionType) {
    return { kind: "existing", request: serializeRequestRow(existing), draft };
  }

  if (existing) {
    // 已提交过的草稿被放弃（rejected）后重新请求：复用同一行，回到等待状态，不建立版本历史。
    run(
      db,
      `
        UPDATE teaching_demo_requests
        SET intervention_type = ?, status = 'requested', requested_at = ?, submitted_at = NULL
        WHERE id = ?
      `,
      [interventionType, requestedAt, existing.id]
    );

    return { kind: "renewed", request: getTeachingDemoRequestByProposalId(db, id), draft };
  }

  run(
    db,
    `
      INSERT INTO teaching_demo_requests (proposal_id, intervention_type, status, requested_at)
      VALUES (?, ?, 'requested', ?)
    `,
    [id, interventionType, requestedAt]
  );

  return { kind: "created", request: getTeachingDemoRequestByProposalId(db, id), draft };
}

/**
 * External Harness 查询“等待外部生成”的教学演示请求。
 * 只返回 accepted proposal 且用户明确请求过、且尚未收到 draft 的请求。
 */
function listRequestedTeachingDemoRequests(db, { limit = DEFAULT_REQUEST_LIMIT } = {}) {
  ensureTeachingDemoDraftsTable(db);
  const parsedLimit = Number.parseInt(String(limit ?? ""), 10);
  const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, MAX_REQUEST_LIMIT)
    : DEFAULT_REQUEST_LIMIT;
  const rows = all(
    db,
    `
      SELECT r.id AS request_id,
             r.proposal_id AS proposal_id,
             r.intervention_type AS intervention_type,
             r.status AS request_status,
             r.requested_at AS requested_at,
             p.proposal_type AS proposal_type,
             p.status AS proposal_status,
             p.scope_json AS scope_json,
             p.suggestion_json AS suggestion_json,
             p.source_json AS source_json,
             p.evidence_json AS evidence_json
      FROM teaching_demo_requests r
      JOIN external_ai_proposals p ON p.id = r.proposal_id
      WHERE r.status = 'requested' AND p.status = 'accepted'
      ORDER BY r.requested_at ASC, r.id ASC
      LIMIT ?
    `,
    [safeLimit]
  );

  return rows.map((row) => ({
    proposalId: Number(row.proposal_id),
    proposalType: row.proposal_type,
    interventionType: row.intervention_type,
    requestStatus: row.request_status,
    requestedAt: row.requested_at,
    scope: parseStoredJson(row.scope_json, {}),
    suggestion: parseStoredJson(row.suggestion_json, ""),
    source: parseStoredJson(row.source_json, ""),
    evidence: parseStoredJson(row.evidence_json, {})
  }));
}

/**
 * 保存外部 Harness 提交的候选 demo spec。
 * 服务端强制检查：proposal 存在且 accepted、用户确实请求过且该请求尚未被满足、
 * 类型与推荐一致、spec 通过白名单校验。
 * spec 的归一化在这里完成，调用方无法绕过白名单。
 * 覆盖规则：等待人工审核中的 draft 与已 approved 的 draft 都不能被 Harness 覆盖；
 * rejected 的 draft 必须由用户重新登记请求后才能再次提交。
 */
function saveTeachingDemoDraft(db, { proposalId, interventionType, spec } = {}) {
  ensureTeachingDemoDraftsTable(db);
  const id = parseProposalId(proposalId);

  if (!id) {
    return { kind: "invalid" };
  }

  if (!isSupportedTeachingDemoType(interventionType)) {
    return { kind: "unsupported" };
  }

  const proposal = getProposal(db, id);

  if (!proposal) {
    return { kind: "missingProposal" };
  }

  if (proposal.status !== "accepted") {
    return { kind: "proposalNotAccepted", proposal };
  }

  const request = getTeachingDemoRequestByProposalId(db, id);

  if (!request) {
    return { kind: "requestMissing", proposal };
  }

  const intervention = getTeachingIntervention(proposal.suggestion);

  if (!intervention) {
    return { kind: "missingIntervention", proposal };
  }

  if (intervention.recommendedIntervention !== interventionType) {
    return { kind: "interventionMismatch", expectedInterventionType: intervention.recommendedIntervention, proposal };
  }

  if (request.interventionType !== interventionType) {
    return { kind: "interventionMismatch", expectedInterventionType: request.interventionType, proposal };
  }

  const existing = findDraftRowByProposalId(db, id);

  // 已确认可用是人工的最终决定，Harness 永远不能覆盖。
  if (existing && existing.status === "approved") {
    return { kind: "draftApproved", draft: serializeDraftRow(existing) };
  }

  // Harness 只在「用户明确请求、且这份请求还没有被满足」时才能写入 draft：
  // - 等待人工审核中的 draft 不能被重复 POST 覆盖（request 已 submitted）；
  // - rejected 的 draft 必须先由用户重新登记请求（request 回到 requested）才允许再次提交。
  if (request.status !== "requested") {
    return {
      kind: existing && existing.status === "draft" ? "draftAwaitingReview" : "requestNotPending",
      draft: serializeDraftRow(existing)
    };
  }

  // 白名单校验放在状态检查之后：未请求的 proposal 得到 409，而不是 422。
  const normalizedSpec = normalizeTeachingDemoSpec(spec, interventionType);
  const specJson = JSON.stringify(normalizedSpec);

  if (!specJson || specJson.length > MAX_SPEC_JSON_LENGTH) {
    return { kind: "invalidSpec" };
  }

  const createdAt = new Date().toISOString();

  // draft 落库与 request → submitted 必须一起生效，
  // 否则会出现“已有草稿但 request 仍是 requested”的脏状态。
  const savedDraft = runInSavepoint(db, "save_teaching_demo_draft", () => {
    if (existing) {
      run(
        db,
        `
          UPDATE teaching_demo_drafts
          SET status = 'draft', intervention_type = ?, spec_json = ?,
              review_note = '', created_at = ?, reviewed_at = NULL
          WHERE id = ?
        `,
        [interventionType, specJson, createdAt, existing.id]
      );
    } else {
      run(
        db,
        `
          INSERT INTO teaching_demo_drafts (
            proposal_id, status, intervention_type, spec_json, created_at
          )
          VALUES (?, 'draft', ?, ?, ?)
        `,
        [id, interventionType, specJson, createdAt]
      );
    }

    run(
      db,
      `
        UPDATE teaching_demo_requests
        SET status = 'submitted', submitted_at = ?
        WHERE proposal_id = ?
      `,
      [createdAt, id]
    );

    return serializeDraftRow(findDraftRowByProposalId(db, id));
  });

  return { kind: "saved", draft: savedDraft };
}

/**
 * 内部管理端审核：只有 Wonder-Trivia-Island 自己的管理接口能改 draft 状态。
 * External Gateway 不暴露、也不能调用这个函数。
 */
function reviewTeachingDemoDraft(db, draftId, status, reviewNote = "") {
  ensureTeachingDemoDraftsTable(db);
  const id = parseDraftId(draftId);
  const normalizedStatus = String(status || "").trim();

  if (!id || !DRAFT_STATUS_SET.has(normalizedStatus) || normalizedStatus === "draft") {
    return { kind: "invalid" };
  }

  const existing = getTeachingDemoDraft(db, id);

  if (!existing) {
    return { kind: "missing" };
  }

  const proposal = getProposal(db, existing.proposalId);

  if (!proposal) {
    return { kind: "missingProposal" };
  }

  if (proposal.status !== "accepted") {
    return { kind: "proposalNotAccepted", proposal };
  }

  if (existing.status !== "draft") {
    return { kind: "alreadyReviewed", draft: existing };
  }

  run(
    db,
    `
      UPDATE teaching_demo_drafts
      SET status = ?, review_note = ?, reviewed_at = ?
      WHERE id = ? AND status = 'draft'
    `,
    [normalizedStatus, normalizeReviewNote(reviewNote), new Date().toISOString(), id]
  );

  return { kind: "updated", draft: getTeachingDemoDraft(db, id) };
}

/**
 * 管理页读取单个 proposal 的完整教学演示状态：请求状态 + 草稿。
 */
function getTeachingDemoState(db, proposalId) {
  ensureTeachingDemoDraftsTable(db);
  const id = parseProposalId(proposalId);

  if (!id) {
    return null;
  }

  return {
    proposalId: id,
    request: getTeachingDemoRequestByProposalId(db, id),
    draft: getTeachingDemoDraftByProposalId(db, id)
  };
}

module.exports = {
  DRAFT_STATUSES,
  REQUEST_STATUSES,
  SUPPORTED_TEACHING_DEMO_TYPES,
  DEFAULT_REQUEST_LIMIT,
  MAX_REQUEST_LIMIT,
  ensureTeachingDemoDraftsTable,
  parseDraftId,
  getTeachingDemoDraft,
  getTeachingDemoDraftByProposalId,
  getTeachingDemoRequestByProposalId,
  getTeachingDemoState,
  createTeachingDemoRequest,
  listRequestedTeachingDemoRequests,
  saveTeachingDemoDraft,
  reviewTeachingDemoDraft
};
