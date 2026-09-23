const { randomUUID } = require("node:crypto");
const express = require("express");
const { createDatabaseConnection, get, run } = require("../db/database");

// 长期成长账本：和闯关存档 / 错题本完全独立的一张表、一份 JSON。
//
// 本轮只有一件事需要长期记住：每个本地自然日最多领一次“今日宝箱”，
// 每领一次累计 +1，探险印章数暂时就等于累计宝箱数。
// 不引入金币、商店、XP、连续签到，也不碰任何既有进度结构。
const router = express.Router();
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const GROWTH_PROGRESS_VERSION = 1;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// 一天一条，1000 条足够覆盖三年多；超过时保留最近的记录，累计数不回退。
const MAX_DAILY_CLAIMS = 1000;
const createTableSql = `
  CREATE TABLE IF NOT EXISTS growth_progress (
    profile_id TEXT PRIMARY KEY,
    progress_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

function parseCookieHeader(rawHeader = "") {
  return String(rawHeader || "")
    .split(";")
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (name) {
        cookies[name] = decodeURIComponent(value);
      }

      return cookies;
    }, {});
}

function clampInteger(rawValue, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsedValue = Number.parseInt(String(rawValue ?? ""), 10);

  if (!Number.isInteger(parsedValue)) {
    return min;
  }

  return Math.max(min, Math.min(max, parsedValue));
}

function normalizeDateKey(value) {
  const normalized = String(value ?? "").trim();

  return DATE_KEY_PATTERN.test(normalized) ? normalized : "";
}

// 服务端的“本地今天”，用本地年月日拼，和前端 getHomeDailyTaskDateKey 同一口径。
//
// 前后端都跑在同一台机器上（本机家庭学习系统），所以不需要时区库、也不做 +-1 天容忍：
// 只认服务器本地今天这一个日期，未来的日子领不到，历史的日子也补不回来。
function getServerLocalDateKey(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = `${referenceDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${referenceDate.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeTimestamp(value) {
  const normalized = String(value ?? "").trim();

  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    return "";
  }

  return new Date(normalized).toISOString();
}

function createEmptyGrowthProgress() {
  return {
    version: GROWTH_PROGRESS_VERSION,
    totalDailyChests: 0,
    dailyClaims: {}
  };
}

function normalizeGrowthProgress(progress = {}) {
  const rawClaims =
    progress?.dailyClaims && typeof progress.dailyClaims === "object" && !Array.isArray(progress.dailyClaims)
      ? progress.dailyClaims
      : {};
  const normalizedEntries = [];

  for (const [rawDateKey, rawClaim] of Object.entries(rawClaims)) {
    const dateKey = normalizeDateKey(rawDateKey);
    const claimedAt = normalizeTimestamp(rawClaim?.claimedAt);

    if (!dateKey || !claimedAt) {
      continue;
    }

    normalizedEntries.push([dateKey, { claimedAt }]);
  }

  // 按日期排序后只保留最近的一批，保证 normalize 是稳定且收敛的。
  normalizedEntries.sort((left, right) => left[0].localeCompare(right[0]));

  const keptEntries = normalizedEntries.slice(-MAX_DAILY_CLAIMS);
  const claimCount = keptEntries.length;
  const storedTotal = clampInteger(progress?.totalDailyChests, { min: 0 });

  return {
    version: GROWTH_PROGRESS_VERSION,
    // 累计数永远不低于真实领取条数，避免脏数据把已经到手的印章算丢。
    totalDailyChests: Math.max(storedTotal, claimCount),
    dailyClaims: Object.fromEntries(keptEntries)
  };
}

function ensureGrowthProgressTable(db) {
  run(db, createTableSql);
}

// 读-改-写在同一个事务里完成，配合数据库层的 busy_timeout，
// 即使有另一个连接同时领取，也不会出现两次自增。
function runInImmediateTransaction(db, operation) {
  db.exec("BEGIN IMMEDIATE");

  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // 保留原始错误。
    }

    throw error;
  }
}

function getProfileId(req, res) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const existingProfileId = String(cookies[PROFILE_COOKIE_NAME] || "").trim();

  if (PROFILE_ID_PATTERN.test(existingProfileId)) {
    return existingProfileId;
  }

  const profileId = randomUUID();

  res.cookie(PROFILE_COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365 * 2
  });

  return profileId;
}

function readStoredGrowthProgress(db, profileId) {
  const row = get(
    db,
    `
      SELECT progress_json, updated_at
      FROM growth_progress
      WHERE profile_id = ?
    `,
    [profileId]
  );

  if (!row) {
    return {
      growthProgress: createEmptyGrowthProgress(),
      updatedAt: null
    };
  }

  try {
    return {
      growthProgress: normalizeGrowthProgress(JSON.parse(row.progress_json)),
      updatedAt: row.updated_at || null
    };
  } catch {
    return {
      growthProgress: createEmptyGrowthProgress(),
      updatedAt: row.updated_at || null
    };
  }
}

function writeGrowthProgress(db, profileId, progress, updatedAt) {
  run(
    db,
    `
      INSERT INTO growth_progress (profile_id, progress_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        progress_json = excluded.progress_json,
        updated_at = excluded.updated_at
    `,
    [profileId, JSON.stringify(normalizeGrowthProgress(progress)), updatedAt]
  );
}

// 幂等的核心：先看这个 dateKey 是否已经领过。
//   已领过 → 原样返回，绝不再自增；
//   没领过 → 记一条 claim 并把累计数 +1。
// 同一个 profile + dateKey 无论请求多少次，累计数都只加 1。
// 调用方（POST 路由）必须先保证 dateKey 就是服务器本地今天，这里不做日期合法性再判断。
function claimDailyChest(db, profileId, dateKey, claimedAt) {
  ensureGrowthProgressTable(db);

  return runInImmediateTransaction(db, () => {
    const stored = readStoredGrowthProgress(db, profileId);
    const existingClaim = stored.growthProgress.dailyClaims[dateKey];

    if (existingClaim) {
      return {
        growthProgress: stored.growthProgress,
        updatedAt: stored.updatedAt,
        dateKey,
        alreadyClaimed: true,
        claimedAt: existingClaim.claimedAt
      };
    }

    const nextProgress = {
      version: GROWTH_PROGRESS_VERSION,
      totalDailyChests: stored.growthProgress.totalDailyChests + 1,
      dailyClaims: {
        ...stored.growthProgress.dailyClaims,
        [dateKey]: { claimedAt }
      }
    };
    const updatedAt = new Date().toISOString();

    writeGrowthProgress(db, profileId, nextProgress, updatedAt);

    return {
      growthProgress: normalizeGrowthProgress(nextProgress),
      updatedAt,
      dateKey,
      alreadyClaimed: false,
      claimedAt
    };
  });
}

router.get("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthProgressTable(db);

    const payload = readStoredGrowthProgress(db, profileId);

    res.json(payload);
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.post("/daily-chest", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const dateKey = normalizeDateKey(req.body?.dateKey);

    if (!dateKey) {
      res.status(400).json({
        message: "dateKey 必须是 YYYY-MM-DD 格式的本地自然日。"
      });
      return;
    }

    // 只允许领取“服务器本地今天”。
    // 未来日期：提前把还没到的日子领掉 = 凭空刷印章；
    // 过去日期：连续提交不同的历史 dateKey，同样能无限加印章。
    // 两种都直接拒绝，累计数只在真实的今天 +1。
    const todayDateKey = getServerLocalDateKey();

    if (dateKey !== todayDateKey) {
      res.status(400).json({
        message: `只能领取今天（${todayDateKey}）的今日宝箱。`
      });
      return;
    }

    const profileId = getProfileId(req, res);
    const payload = claimDailyChest(db, profileId, dateKey, new Date().toISOString());

    res.json(payload);
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

module.exports = router;
