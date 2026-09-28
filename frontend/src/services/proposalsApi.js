function buildAdminHeaders(adminKey, includeJsonContentType = false) {
  const headers = {};

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (String(adminKey || "").trim()) {
    headers["x-admin-key"] = String(adminKey).trim();
  }

  return headers;
}

async function readResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `${fallbackMessage}：${response.status}`);
  }

  return payload;
}

export async function fetchProposalReviewList({ status = "pending", adminKey = "", signal } = {}) {
  const searchParams = new URLSearchParams();

  if (String(status || "").trim()) {
    searchParams.set("status", String(status).trim());
  }

  const response = await fetch(`/api/proposals?${searchParams.toString()}`, {
    method: "GET",
    headers: buildAdminHeaders(adminKey),
    signal
  });
  const payload = await readResponse(response, "加载 proposal 失败");

  if (!Array.isArray(payload?.data)) {
    throw new Error("proposal 列表格式不正确。");
  }

  return payload;
}

export async function reviewProposal({ proposalId, decision, reviewNote = "", adminKey = "", signal } = {}) {
  const normalizedDecision = decision === "accepted" ? "accept" : decision === "rejected" ? "reject" : "";

  if (!proposalId || !normalizedDecision) {
    throw new Error("proposal 审核参数不完整。");
  }

  const response = await fetch(`/api/proposals/${proposalId}/${normalizedDecision}`, {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify({
      reviewNote: String(reviewNote || "").trim()
    }),
    signal
  });
  const payload = await readResponse(response, "审核 proposal 失败");

  if (!payload?.data || typeof payload.data.id !== "number") {
    throw new Error("proposal 审核结果格式不正确。");
  }

  return payload.data;
}

// 教学演示状态由「外部生成请求 + 已提交草稿」两部分组成。
// 前端只读取和登记请求，永远不会在这里触发任何模型调用。
function normalizeTeachingDemoState(payload) {
  const state = payload?.data;

  if (!state || typeof state !== "object" || typeof state.proposalId !== "number") {
    throw new Error("教学演示状态格式不正确。");
  }

  const request = state.request || null;
  const draft = state.draft || null;

  if (request && (typeof request.status !== "string" || !request.interventionType)) {
    throw new Error("教学演示请求格式不正确。");
  }

  if (draft && (typeof draft.id !== "number" || typeof draft.status !== "string")) {
    throw new Error("教学演示草稿格式不正确。");
  }

  return {
    proposalId: state.proposalId,
    request,
    draft
  };
}

export async function fetchTeachingDemoState({ proposalId, adminKey = "", signal } = {}) {
  if (!proposalId) {
    throw new Error("教学演示状态查询参数不完整。");
  }

  const response = await fetch(`/api/proposals/${proposalId}/teaching-demo`, {
    method: "GET",
    headers: buildAdminHeaders(adminKey),
    signal
  });
  const payload = await readResponse(response, "加载教学演示状态失败");

  return normalizeTeachingDemoState(payload);
}

export async function requestTeachingDemoDraft({ proposalId, adminKey = "", signal } = {}) {
  if (!proposalId) {
    throw new Error("制作教学演示草稿参数不完整。");
  }

  const response = await fetch(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify({}),
    signal
  });
  const payload = await readResponse(response, "登记教学演示生成请求失败");

  return normalizeTeachingDemoState(payload);
}

export async function reviewTeachingDemoDraft({ proposalId, decision, reviewNote = "", adminKey = "", signal } = {}) {
  const normalizedDecision = decision === "approved" ? "approve" : decision === "rejected" ? "reject" : "";

  if (!proposalId || !normalizedDecision) {
    throw new Error("教学演示草稿审核参数不完整。");
  }

  const response = await fetch(`/api/proposals/${proposalId}/teaching-demo/${normalizedDecision}`, {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify({
      reviewNote: String(reviewNote || "").trim()
    }),
    signal
  });
  const payload = await readResponse(response, "审核教学演示草稿失败");

  return normalizeTeachingDemoState(payload);
}
