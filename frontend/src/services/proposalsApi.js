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
