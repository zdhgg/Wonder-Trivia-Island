// 长期成长账本的接口封装：只读写独立的 /api/growth-progress，
// 不混进挑战存档或错题本请求。
function assertGrowthProgressPayload(payload) {
  if (payload?.growthProgress && typeof payload.growthProgress === "object") {
    return;
  }

  throw new Error("成长账本格式不正确。");
}

export async function fetchGrowthProgress(signal) {
  const response = await fetch("/api/growth-progress", {
    method: "GET",
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `加载成长账本失败：${response.status}`);
  }

  assertGrowthProgressPayload(payload);
  return payload;
}

export async function claimDailyChest({ dateKey, signal } = {}) {
  const normalizedDateKey = String(dateKey ?? "").trim();

  if (!normalizedDateKey) {
    throw new Error("领取今日宝箱需要日期。");
  }

  const response = await fetch("/api/growth-progress/daily-chest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ dateKey: normalizedDateKey }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `领取今日宝箱失败：${response.status}`);
  }

  assertGrowthProgressPayload(payload);
  return payload;
}
