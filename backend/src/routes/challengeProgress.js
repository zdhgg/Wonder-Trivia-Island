const { randomUUID } = require("node:crypto");
const express = require("express");
const { createDatabaseConnection, get, run } = require("../db/database");

const router = express.Router();
const CHALLENGE_STAGE_IDS = Object.freeze([
  "stage-1",
  "stage-2",
  "stage-3",
  "stage-4",
  "stage-5",
  "stage-6",
  "stage-7"
]);
const CHALLENGE_ACHIEVEMENT_IDS = Object.freeze([
  "first-clear",
  "perfect-accuracy",
  "timed-keeper",
  "collector-3",
  "route-unlocked",
  "route-cleared",
  "reward-complete",
  "route-perfect"
]);
const CHALLENGE_CHAPTER_IDS = Object.freeze([
  "chapter-grade-1-upper",
  "chapter-grade-1-lower",
  "chapter-grade-2-upper",
  "chapter-grade-2-lower",
  "chapter-grade-3-upper",
  "chapter-grade-3-lower",
  "chapter-grade-4-upper",
  "chapter-grade-4-lower",
  "chapter-grade-5-upper",
  "chapter-grade-5-lower",
  "chapter-grade-6-upper",
  "chapter-grade-6-lower"
]);
const LEGACY_CHALLENGE_CHAPTER_TARGETS = Object.freeze({
  "chapter-grade-2": Object.freeze(["chapter-grade-2-upper", "chapter-grade-2-lower"]),
  "chapter-grade-3": Object.freeze(["chapter-grade-3-upper", "chapter-grade-3-lower"]),
  "chapter-grade-4": Object.freeze(["chapter-grade-4-upper", "chapter-grade-4-lower"]),
  "chapter-grade-5": Object.freeze(["chapter-grade-5-upper", "chapter-grade-5-lower"]),
  "chapter-grade-6": Object.freeze(["chapter-grade-6-upper", "chapter-grade-6-lower"])
});
const LEGACY_CHALLENGE_ACTIVE_CHAPTER_MAP = Object.freeze({
  "chapter-grade-2": "chapter-grade-2-upper",
  "chapter-grade-3": "chapter-grade-3-upper",
  "chapter-grade-4": "chapter-grade-4-upper",
  "chapter-grade-5": "chapter-grade-5-upper",
  "chapter-grade-6": "chapter-grade-6-upper"
});
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const FIRST_STAGE_ID = CHALLENGE_STAGE_IDS[0];
const DEFAULT_CHALLENGE_CHAPTER_ID = "chapter-grade-3-upper";
const createTableSql = `
  CREATE TABLE IF NOT EXISTS challenge_progress (
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

function ensureChallengeProgressTable(db) {
  run(db, createTableSql);
}

function normalizeAchievementState(rawState) {
  if (!rawState || typeof rawState !== "object") {
    return null;
  }

  const unlockedAt = String(rawState.unlockedAt ?? "").trim();

  if (!unlockedAt || Number.isNaN(Date.parse(unlockedAt))) {
    return null;
  }

  return { unlockedAt };
}

function normalizeChallengeProgress(progress = {}) {
  const rawUnlockedStageIds = Array.isArray(progress.unlockedStageIds) ? progress.unlockedStageIds : [];
  const unlockedStageIds = CHALLENGE_STAGE_IDS.filter((stageId) => rawUnlockedStageIds.includes(stageId));

  if (!unlockedStageIds.includes(FIRST_STAGE_ID)) {
    unlockedStageIds.unshift(FIRST_STAGE_ID);
  }

  const rawBestResults = progress.bestResults && typeof progress.bestResults === "object" ? progress.bestResults : {};
  const bestResults = {};
  const rawAchievements = progress.achievements && typeof progress.achievements === "object" ? progress.achievements : {};
  const achievements = {};

  for (const stageId of CHALLENGE_STAGE_IDS) {
    const rawStageResult = rawBestResults[stageId];

    if (!rawStageResult || typeof rawStageResult !== "object") {
      continue;
    }

    const normalizedStageResult = {
      starCount: clampInteger(rawStageResult.starCount, { min: 0, max: 3 }),
      bestAccuracy: clampInteger(rawStageResult.bestAccuracy, { min: 0, max: 100 }),
      attempts: clampInteger(rawStageResult.attempts, { min: 0, max: 9999 }),
      bestScore: clampInteger(rawStageResult.bestScore, { min: 0, max: 999999 }),
      rewardEarned: Boolean(rawStageResult.rewardEarned)
    };

    if (
      normalizedStageResult.starCount > 0 ||
      normalizedStageResult.bestAccuracy > 0 ||
      normalizedStageResult.attempts > 0 ||
      normalizedStageResult.bestScore > 0 ||
      normalizedStageResult.rewardEarned
    ) {
      bestResults[stageId] = normalizedStageResult;
    }
  }

  for (const achievementId of CHALLENGE_ACHIEVEMENT_IDS) {
    const normalizedAchievementState = normalizeAchievementState(rawAchievements[achievementId]);

    if (normalizedAchievementState) {
      achievements[achievementId] = normalizedAchievementState;
    }
  }

  return {
    unlockedStageIds,
    bestResults,
    achievements
  };
}

function mergeChallengeProgress(primaryProgress = {}, secondaryProgress = {}) {
  const leftProgress = normalizeChallengeProgress(primaryProgress);
  const rightProgress = normalizeChallengeProgress(secondaryProgress);
  const unlockedStageIds = CHALLENGE_STAGE_IDS.filter(
    (stageId) => leftProgress.unlockedStageIds.includes(stageId) || rightProgress.unlockedStageIds.includes(stageId)
  );
  const bestResults = {};
  const achievements = {};

  for (const stageId of CHALLENGE_STAGE_IDS) {
    const leftStageResult = leftProgress.bestResults[stageId] ?? {};
    const rightStageResult = rightProgress.bestResults[stageId] ?? {};
    const mergedStageResult = {
      starCount: Math.max(leftStageResult.starCount ?? 0, rightStageResult.starCount ?? 0),
      bestAccuracy: Math.max(leftStageResult.bestAccuracy ?? 0, rightStageResult.bestAccuracy ?? 0),
      attempts: Math.max(leftStageResult.attempts ?? 0, rightStageResult.attempts ?? 0),
      bestScore: Math.max(leftStageResult.bestScore ?? 0, rightStageResult.bestScore ?? 0),
      rewardEarned: Boolean(leftStageResult.rewardEarned) || Boolean(rightStageResult.rewardEarned)
    };

    if (
      mergedStageResult.starCount > 0 ||
      mergedStageResult.bestAccuracy > 0 ||
      mergedStageResult.attempts > 0 ||
      mergedStageResult.bestScore > 0 ||
      mergedStageResult.rewardEarned
    ) {
      bestResults[stageId] = mergedStageResult;
    }
  }

  for (const achievementId of CHALLENGE_ACHIEVEMENT_IDS) {
    const leftAchievement = normalizeAchievementState(leftProgress.achievements[achievementId]);
    const rightAchievement = normalizeAchievementState(rightProgress.achievements[achievementId]);
    const candidateTimestamps = [leftAchievement?.unlockedAt, rightAchievement?.unlockedAt].filter(Boolean);

    if (candidateTimestamps.length > 0) {
      achievements[achievementId] = {
        unlockedAt: candidateTimestamps.sort()[0]
      };
    }
  }

  return {
    unlockedStageIds,
    bestResults,
    achievements
  };
}

function isLegacyChallengeProgressShape(progress) {
  return Boolean(progress) && Array.isArray(progress.unlockedStageIds) && typeof progress.bestResults === "object";
}

function getNormalizedChallengeChapterTargets(chapterId) {
  const normalizedChapterId = String(chapterId || "").trim();

  if (LEGACY_CHALLENGE_CHAPTER_TARGETS[normalizedChapterId]) {
    return [...LEGACY_CHALLENGE_CHAPTER_TARGETS[normalizedChapterId]];
  }

  return CHALLENGE_CHAPTER_IDS.includes(normalizedChapterId) ? [normalizedChapterId] : [];
}

function getNormalizedChallengeActiveChapterId(chapterId) {
  const normalizedChapterId = String(chapterId || "").trim();
  const migratedChapterId = LEGACY_CHALLENGE_ACTIVE_CHAPTER_MAP[normalizedChapterId] || normalizedChapterId;

  return CHALLENGE_CHAPTER_IDS.includes(migratedChapterId) ? migratedChapterId : DEFAULT_CHALLENGE_CHAPTER_ID;
}

function normalizeChallengeProgressEntries(rawChapters = {}) {
  const normalizedEntries = {};

  for (const [rawChapterId, rawProgress] of Object.entries(rawChapters)) {
    if (!rawProgress || typeof rawProgress !== "object") {
      continue;
    }

    const normalizedProgress = normalizeChallengeProgress(rawProgress);

    for (const chapterId of getNormalizedChallengeChapterTargets(rawChapterId)) {
      normalizedEntries[chapterId] = normalizedEntries[chapterId]
        ? mergeChallengeProgress(normalizedEntries[chapterId], normalizedProgress)
        : normalizedProgress;
    }
  }

  return normalizedEntries;
}

function normalizeChallengeProgressBook(progressBook = {}) {
  if (isLegacyChallengeProgressShape(progressBook)) {
    return {
      activeChapterId: DEFAULT_CHALLENGE_CHAPTER_ID,
      chapters: {
        [DEFAULT_CHALLENGE_CHAPTER_ID]: normalizeChallengeProgress(progressBook)
      }
    };
  }

  const rawChapters = progressBook?.chapters && typeof progressBook.chapters === "object" ? progressBook.chapters : {};
  const normalizedEntries = normalizeChallengeProgressEntries(rawChapters);
  const chapters = {};

  for (const chapterId of CHALLENGE_CHAPTER_IDS) {
    const normalizedProgress = normalizedEntries[chapterId];

    if (!normalizedProgress || typeof normalizedProgress !== "object") {
      continue;
    }

    if (chapterId === DEFAULT_CHALLENGE_CHAPTER_ID || Object.keys(normalizedProgress.bestResults).length > 0) {
      chapters[chapterId] = normalizedProgress;
    }
  }

  const activeChapterId = getNormalizedChallengeActiveChapterId(progressBook?.activeChapterId);

  if (!chapters[activeChapterId]) {
    chapters[activeChapterId] = normalizeChallengeProgress();
  }

  return {
    activeChapterId,
    chapters
  };
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

function getStoredChallengeProgress(db, profileId) {
  ensureChallengeProgressTable(db);
  const row = get(
    db,
    `
      SELECT progress_json, updated_at
      FROM challenge_progress
      WHERE profile_id = ?
    `,
    [profileId]
  );

  if (!row) {
    return {
      progressBook: normalizeChallengeProgressBook(),
      updatedAt: null
    };
  }

  try {
    return {
      progressBook: normalizeChallengeProgressBook(JSON.parse(row.progress_json)),
      updatedAt: row.updated_at || null
    };
  } catch {
    return {
      progressBook: normalizeChallengeProgressBook(),
      updatedAt: row.updated_at || null
    };
  }
}

function saveChallengeProgress(db, profileId, progressBook) {
  const normalizedProgressBook = normalizeChallengeProgressBook(progressBook);
  const updatedAt = new Date().toISOString();

  ensureChallengeProgressTable(db);
  run(
    db,
    `
      INSERT INTO challenge_progress (profile_id, progress_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        progress_json = excluded.progress_json,
        updated_at = excluded.updated_at
    `,
    [profileId, JSON.stringify(normalizedProgressBook), updatedAt]
  );

  return {
    progressBook: normalizedProgressBook,
    updatedAt
  };
}

router.get("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);
    const payload = getStoredChallengeProgress(db, profileId);

    res.json(payload);
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.put("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const rawProgressBook = req.body?.progressBook ?? req.body?.progress;

    if (!rawProgressBook || typeof rawProgressBook !== "object") {
      res.status(400).json({
        message: "progressBook 必须是对象。"
      });
      return;
    }

    const profileId = getProfileId(req, res);
    const payload = saveChallengeProgress(db, profileId, rawProgressBook);

    res.json(payload);
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

module.exports = router;
