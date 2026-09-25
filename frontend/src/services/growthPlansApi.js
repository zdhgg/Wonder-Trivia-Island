import { normalizeFootprint } from "../utils/growthFootprints.js";

// 「下次我们一起做什么」的接口封装（Phase 2D-B1）：只读写独立的 /api/growth-plans。
//
// 两条线在这里汇合：
//   - 想做清单：GET / POST / PATCH / DELETE（还没发生的事）
//   - 完成 → 一条真实足迹：POST /:id/complete（服务端在一个事务里写足迹 + 删想做）
//
// 和其它 service 一样：服务端是唯一事实来源，形状不对就抛错，绝不伪造本地记录。
function normalizePlan(rawPlan) {
  const source = rawPlan && typeof rawPlan === "object" ? rawPlan : {};
  const durationMinutes = Number.parseInt(String(source.durationMinutes ?? ""), 10);

  return {
    id: normalizePositiveInteger(source.id),
    sourceId: String(source.sourceId ?? "").trim(),
    title: String(source.title ?? "").trim(),
    note: String(source.note ?? "").trim(),
    category: String(source.category ?? "").trim(),
    durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null,
    createdAt: String(source.createdAt ?? "").trim()
  };
}

function normalizePositiveInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}

// 与服务端一致的排序契约：created_at DESC，同刻按 id DESC（新加的在前）。
export function sortPlansDesc(plans) {
  return [...(Array.isArray(plans) ? plans : [])].sort((left, right) => {
    const leftCreatedAt = String(left?.createdAt ?? "");
    const rightCreatedAt = String(right?.createdAt ?? "");

    if (leftCreatedAt !== rightCreatedAt) {
      return rightCreatedAt.localeCompare(leftCreatedAt);
    }

    return (right?.id ?? 0) - (left?.id ?? 0);
  });
}

export function normalizePlans(list) {
  return sortPlansDesc(Array.isArray(list) ? list.map(normalizePlan) : []);
}

function resolvePlan(payload) {
  const plan = normalizePlan(payload?.plan);

  return plan.id > 0 ? plan : null;
}

function resolvePlans(payload) {
  return Array.isArray(payload?.plans) ? normalizePlans(payload.plans) : null;
}

function resolveFootprint(payload) {
  const footprint = normalizeFootprint(payload?.footprint);

  return footprint.id > 0 ? footprint : null;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export async function fetchGrowthPlans(signal) {
  const response = await fetch("/api/growth-plans", {
    method: "GET",
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `加载想一起做的清单失败：${response.status}`);
  }

  const plans = resolvePlans(payload);

  if (!plans) {
    throw new Error("想一起做的清单格式不正确。");
  }

  return plans;
}

export async function createGrowthPlan({ sourceId = "", title, note = "", category, durationMinutes = null } = {}, signal) {
  const body = {
    title: String(title ?? "").trim(),
    category: String(category ?? "").trim()
  };

  // 推荐带来源 id（服务端据此防重复）；自定义条目不带，允许和推荐同名。
  if (String(sourceId ?? "").trim()) {
    body.sourceId = String(sourceId).trim();
  }

  if (String(note ?? "").trim()) {
    body.note = String(note).trim();
  }

  if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
    body.durationMinutes = durationMinutes;
  }

  const response = await fetch("/api/growth-plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `加入想一起做失败：${response.status}`);
  }

  const plan = resolvePlan(payload);

  if (!plan) {
    throw new Error("想一起做的清单格式不正确。");
  }

  return plan;
}

export async function deleteGrowthPlan(planId, signal) {
  const response = await fetch(`/api/growth-plans/${encodeURIComponent(planId)}`, {
    method: "DELETE",
    signal
  });

  if (!response.ok) {
    const payload = await readJson(response);

    throw new Error(payload?.message || `从想一起做里拿掉这件事失败：${response.status}`);
  }

  return planId;
}

// 完成：服务端在一个事务里写足迹（含照片）+ 删想做，所以这里要么拿到足迹、要么抛错，
// 不存在「足迹写进去了但清单没删掉」或者「记录在、照片没存上」的中间状态。
export async function completeGrowthPlan(
  planId,
  { occurredOn, category, tags = [], note = "", photos = [] } = {},
  signal
) {
  const body = {
    occurredOn: String(occurredOn ?? "").trim(),
    category: String(category ?? "").trim(),
    tags: Array.isArray(tags) ? tags : []
  };

  if (String(note ?? "").trim()) {
    body.note = String(note).trim();
  }

  if (Array.isArray(photos) && photos.length > 0) {
    body.photos = photos;
  }

  const response = await fetch(`/api/growth-plans/${encodeURIComponent(planId)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `把这件事收进纪念册失败：${response.status}`);
  }

  const footprint = resolveFootprint(payload);

  if (!footprint) {
    throw new Error("成长纪念册格式不正确。");
  }

  return footprint;
}
