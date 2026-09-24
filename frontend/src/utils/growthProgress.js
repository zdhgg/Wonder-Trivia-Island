// 长期成长账本（前端侧）。
//
// 账本的服务端结构（growth_progress 表里的 progress_json）：
//   {
//     version: 1,
//     totalDailyChests: 0,
//     dailyClaims: { "2026-09-22": { claimedAt: "..." } }
//   }
//
// 前端只做三件事：
// - 把服务端 / 本地缓存里的账本规范化成统一形状；
// - 在本地留一份镜像，服务端暂时取不回来时“今日已领取”不会闪回未领取；
// - 用纯函数表达“同一个自然日只能领一次”的幂等语义，方便直接测。
//
// 探险印章数暂时就等于 totalDailyChests，不引入金币 / XP / 连续签到。
export const GROWTH_PROGRESS_STORAGE_KEY = "wonder-trivia-island.growth.progress";
export const GROWTH_PROGRESS_VERSION = 1;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAILY_CLAIMS = 1000;

export function normalizeGrowthDateKey(value) {
  const normalized = String(value ?? "").trim();

  return DATE_KEY_PATTERN.test(normalized) ? normalized : "";
}

function normalizeTimestamp(value) {
  const normalized = String(value ?? "").trim();

  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    return "";
  }

  return new Date(normalized).toISOString();
}

function toNonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function createEmptyGrowthProgress() {
  return {
    version: GROWTH_PROGRESS_VERSION,
    totalDailyChests: 0,
    dailyClaims: {}
  };
}

export function normalizeGrowthProgress(rawProgress = {}) {
  const rawClaims =
    rawProgress?.dailyClaims && typeof rawProgress.dailyClaims === "object" && !Array.isArray(rawProgress.dailyClaims)
      ? rawProgress.dailyClaims
      : {};
  const entries = [];

  for (const [rawDateKey, rawClaim] of Object.entries(rawClaims)) {
    const dateKey = normalizeGrowthDateKey(rawDateKey);
    const claimedAt = normalizeTimestamp(rawClaim?.claimedAt);

    if (!dateKey || !claimedAt) {
      continue;
    }

    entries.push([dateKey, { claimedAt }]);
  }

  entries.sort((left, right) => left[0].localeCompare(right[0]));

  const keptEntries = entries.slice(-MAX_DAILY_CLAIMS);

  return {
    version: GROWTH_PROGRESS_VERSION,
    // 累计数不低于真实领取条数，脏数据不会把已经到手的印章算丢。
    totalDailyChests: Math.max(toNonNegativeInteger(rawProgress?.totalDailyChests), keptEntries.length),
    dailyClaims: Object.fromEntries(keptEntries)
  };
}

export function getGrowthTotalDailyChests(progress) {
  return normalizeGrowthProgress(progress).totalDailyChests;
}

// 探险印章数暂时就是累计开启的宝箱数。
export function getExplorerStampCount(progress) {
  return getGrowthTotalDailyChests(progress);
}

export function getDailyChestClaim(progress, dateKey) {
  const normalizedDateKey = normalizeGrowthDateKey(dateKey);

  if (!normalizedDateKey) {
    return null;
  }

  return normalizeGrowthProgress(progress).dailyClaims[normalizedDateKey] || null;
}

export function isDailyChestClaimed(progress, dateKey) {
  return Boolean(getDailyChestClaim(progress, dateKey));
}

// 幂等的核心语义（与服务端 claimDailyChest 完全一致）：
//   同一个 dateKey 已经出现过 → 原样返回，累计数不变，alreadyClaimed = true；
//   没出现过 → 只加 1 条 claim，累计数 +1。
export function claimDailyChestInProgress(progress, dateKey, claimedAt = new Date().toISOString()) {
  const normalizedProgress = normalizeGrowthProgress(progress);
  const normalizedDateKey = normalizeGrowthDateKey(dateKey);
  const normalizedClaimedAt = normalizeTimestamp(claimedAt) || new Date().toISOString();

  if (!normalizedDateKey) {
    return {
      progress: normalizedProgress,
      alreadyClaimed: false,
      claimedAt: "",
      isValid: false
    };
  }

  const existingClaim = normalizedProgress.dailyClaims[normalizedDateKey];

  if (existingClaim) {
    return {
      progress: normalizedProgress,
      alreadyClaimed: true,
      claimedAt: existingClaim.claimedAt,
      isValid: true
    };
  }

  const nextProgress = normalizeGrowthProgress({
    version: GROWTH_PROGRESS_VERSION,
    totalDailyChests: normalizedProgress.totalDailyChests + 1,
    dailyClaims: {
      ...normalizedProgress.dailyClaims,
      [normalizedDateKey]: { claimedAt: normalizedClaimedAt }
    }
  });

  return {
    progress: nextProgress,
    alreadyClaimed: false,
    claimedAt: normalizedClaimedAt,
    isValid: true
  };
}

export function isGrowthProgressEqual(left, right) {
  return JSON.stringify(normalizeGrowthProgress(left)) === JSON.stringify(normalizeGrowthProgress(right));
}

// 领取成功后按服务端返回的账本回写镜像；读取时只用于“服务端暂时取不回来”的兜底显示。
export function writeGrowthProgressCache(progress) {
  if (typeof window === "undefined") {
    return null;
  }

  const normalizedProgress = normalizeGrowthProgress(progress);

  try {
    window.localStorage.setItem(
      GROWTH_PROGRESS_STORAGE_KEY,
      JSON.stringify({ ...normalizedProgress, cachedAt: new Date().toISOString() })
    );
  } catch {
    // 缓存失败只影响离线兜底显示，首页其余部分照常工作。
  }

  return normalizedProgress;
}

export function readGrowthProgressCache() {
  if (typeof window === "undefined") {
    return createEmptyGrowthProgress();
  }

  let rawCache = "";

  try {
    rawCache = window.localStorage.getItem(GROWTH_PROGRESS_STORAGE_KEY) || "";
  } catch {
    return createEmptyGrowthProgress();
  }

  if (!rawCache) {
    return createEmptyGrowthProgress();
  }

  try {
    return normalizeGrowthProgress(JSON.parse(rawCache));
  } catch {
    return createEmptyGrowthProgress();
  }
}

// “已经攒了 N 枚探险印章”：N 就是账本里的累计数。
// 只说一次数字（印章数 = 开过的宝箱数），不在同一句里重复两遍。
export function buildGrowthStampText(progress) {
  const totalDailyChests = getGrowthTotalDailyChests(progress);

  return `已经攒了 ${totalDailyChests} 枚探险印章`;
}
