const CHALLENGE_ACHIEVEMENTS = Object.freeze([
  Object.freeze({
    id: "first-clear",
    glyph: "启",
    name: "初次靠岸",
    summary: "通过任意一关，正式踏上这条挑战路线。"
  }),
  Object.freeze({
    id: "perfect-accuracy",
    glyph: "百",
    name: "百发百中",
    summary: "任意一关达到 100% 正确率。"
  }),
  Object.freeze({
    id: "timed-keeper",
    glyph: "时",
    name: "稳住节奏",
    summary: "通过任意限时关卡，且全程 0 次超时。"
  }),
  Object.freeze({
    id: "collector-3",
    glyph: "藏",
    name: "收藏上手",
    summary: "在当前章节收下 3 件航海收藏。"
  }),
  Object.freeze({
    id: "route-unlocked",
    glyph: "图",
    name: "全线解锁",
    summary: "解锁当前章节全部关卡。"
  }),
  Object.freeze({
    id: "route-cleared",
    glyph: "通",
    name: "章节通关",
    summary: "通过当前章节全部关卡。"
  }),
  Object.freeze({
    id: "reward-complete",
    glyph: "册",
    name: "航海满册",
    summary: "收下当前章节全部航海收藏。"
  }),
  Object.freeze({
    id: "route-perfect",
    glyph: "冠",
    name: "满星征服",
    summary: "当前章节全部关卡都达到 3 星。"
  })
]);

const CHALLENGE_ACHIEVEMENT_IDS = Object.freeze(CHALLENGE_ACHIEVEMENTS.map((achievement) => achievement.id));
const LEGACY_ACHIEVEMENT_UNLOCKED_AT = "2000-01-01T00:00:00.000Z";

function normalizeUnlockedAt(rawValue) {
  const normalizedValue = String(rawValue ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  return Number.isNaN(Date.parse(normalizedValue)) ? "" : normalizedValue;
}

function normalizeAchievementCount(value, fallback = 0) {
  const parsedValue = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

function getAchievementUnlockedAtList(...candidates) {
  return candidates
    .map((candidate) => normalizeUnlockedAt(candidate))
    .filter(Boolean)
    .sort();
}

export function normalizeChallengeAchievementStates(rawStates = {}) {
  const source = rawStates && typeof rawStates === "object" ? rawStates : {};
  const normalizedStates = {};

  for (const achievementId of CHALLENGE_ACHIEVEMENT_IDS) {
    const rawState = source[achievementId];

    if (!rawState || typeof rawState !== "object") {
      continue;
    }

    const unlockedAt = normalizeUnlockedAt(rawState.unlockedAt);

    if (unlockedAt) {
      normalizedStates[achievementId] = { unlockedAt };
    }
  }

  return normalizedStates;
}

export function mergeChallengeAchievementStates(primaryStates = {}, secondaryStates = {}) {
  const leftStates = normalizeChallengeAchievementStates(primaryStates);
  const rightStates = normalizeChallengeAchievementStates(secondaryStates);
  const mergedStates = {};

  for (const achievementId of CHALLENGE_ACHIEVEMENT_IDS) {
    const unlockedAtList = getAchievementUnlockedAtList(
      leftStates[achievementId]?.unlockedAt,
      rightStates[achievementId]?.unlockedAt
    );

    if (unlockedAtList.length > 0) {
      mergedStates[achievementId] = {
        unlockedAt: unlockedAtList[0]
      };
    }
  }

  return mergedStates;
}

function getChallengeAchievementMetrics(progress = {}, totalStageCount = 7) {
  const unlockedStageIds = Array.isArray(progress.unlockedStageIds) ? progress.unlockedStageIds : [];
  const rawBestResults = progress.bestResults && typeof progress.bestResults === "object" ? progress.bestResults : {};
  let clearedStageCount = 0;
  let perfectStageCount = 0;
  let rewardCount = 0;
  let maxAccuracy = 0;

  for (const stageResult of Object.values(rawBestResults)) {
    if (!stageResult || typeof stageResult !== "object") {
      continue;
    }

    const starCount = normalizeAchievementCount(stageResult.starCount, 0);
    const bestAccuracy = Math.min(100, normalizeAchievementCount(stageResult.bestAccuracy, 0));

    if (starCount > 0) {
      clearedStageCount += 1;
    }

    if (starCount >= 3) {
      perfectStageCount += 1;
    }

    if (stageResult.rewardEarned) {
      rewardCount += 1;
    }

    maxAccuracy = Math.max(maxAccuracy, bestAccuracy);
  }

  return {
    unlockedStageCount: unlockedStageIds.length,
    clearedStageCount,
    perfectStageCount,
    rewardCount,
    maxAccuracy,
    totalStageCount
  };
}

function evaluateAchievement(achievementId, metrics, runContext = {}, existingState = null) {
  const hasExistingUnlock = Boolean(existingState?.unlockedAt);
  const timedStageClearedWithoutTimeout =
    Boolean(runContext?.isPassed) &&
    normalizeAchievementCount(runContext?.stage?.timeLimitSeconds, 0) > 0 &&
    Array.isArray(runContext?.questionResults) &&
    !runContext.questionResults.includes("timeout");

  if (achievementId === "first-clear") {
    return {
      isUnlocked: hasExistingUnlock || metrics.clearedStageCount >= 1,
      progressText:
        metrics.clearedStageCount >= 1
          ? `已通过 ${metrics.clearedStageCount} 关`
          : `通过 0 / 1 关`
    };
  }

  if (achievementId === "perfect-accuracy") {
    return {
      isUnlocked: hasExistingUnlock || metrics.maxAccuracy >= 100 || normalizeAchievementCount(runContext?.result?.accuracyPercent, 0) >= 100,
      progressText:
        metrics.maxAccuracy >= 100 || normalizeAchievementCount(runContext?.result?.accuracyPercent, 0) >= 100
          ? "任意一关已达到 100%"
          : `当前最高正确率 ${metrics.maxAccuracy}%`
    };
  }

  if (achievementId === "timed-keeper") {
    return {
      isUnlocked: hasExistingUnlock || timedStageClearedWithoutTimeout,
      progressText: hasExistingUnlock || timedStageClearedWithoutTimeout ? "已经拿下一次 0 超时通关" : "通过任意限时关卡且保持 0 次超时"
    };
  }

  if (achievementId === "collector-3") {
    return {
      isUnlocked: hasExistingUnlock || metrics.rewardCount >= 3,
      progressText: `收藏 ${Math.min(metrics.rewardCount, 3)} / 3`
    };
  }

  if (achievementId === "route-unlocked") {
    return {
      isUnlocked: hasExistingUnlock || metrics.unlockedStageCount >= metrics.totalStageCount,
      progressText: `解锁 ${Math.min(metrics.unlockedStageCount, metrics.totalStageCount)} / ${metrics.totalStageCount}`
    };
  }

  if (achievementId === "route-cleared") {
    return {
      isUnlocked: hasExistingUnlock || metrics.clearedStageCount >= metrics.totalStageCount,
      progressText: `通关 ${Math.min(metrics.clearedStageCount, metrics.totalStageCount)} / ${metrics.totalStageCount}`
    };
  }

  if (achievementId === "reward-complete") {
    return {
      isUnlocked: hasExistingUnlock || metrics.rewardCount >= metrics.totalStageCount,
      progressText: `收藏 ${Math.min(metrics.rewardCount, metrics.totalStageCount)} / ${metrics.totalStageCount}`
    };
  }

  if (achievementId === "route-perfect") {
    return {
      isUnlocked: hasExistingUnlock || metrics.perfectStageCount >= metrics.totalStageCount,
      progressText: `满星 ${Math.min(metrics.perfectStageCount, metrics.totalStageCount)} / ${metrics.totalStageCount}`
    };
  }

  return {
    isUnlocked: hasExistingUnlock,
    progressText: ""
  };
}

export function evaluateChallengeAchievements(
  progress = {},
  runContext = {},
  { totalStageCount = 7, unlockTimestamp = new Date().toISOString() } = {}
) {
  const existingStates = normalizeChallengeAchievementStates(progress.achievements);
  const metrics = getChallengeAchievementMetrics(progress, totalStageCount);
  const nextStates = { ...existingStates };
  const evaluationTime = normalizeUnlockedAt(unlockTimestamp) || LEGACY_ACHIEVEMENT_UNLOCKED_AT;

  const achievements = CHALLENGE_ACHIEVEMENTS.map((achievement) => {
    const existingState = existingStates[achievement.id] ?? null;
    const evaluation = evaluateAchievement(achievement.id, metrics, runContext, existingState);
    const wasUnlocked = Boolean(existingState?.unlockedAt);

    if (evaluation.isUnlocked && !wasUnlocked) {
      nextStates[achievement.id] = {
        unlockedAt: evaluationTime
      };
    }

    return {
      ...achievement,
      isUnlocked: evaluation.isUnlocked,
      unlockedAt: nextStates[achievement.id]?.unlockedAt || "",
      fresh: evaluation.isUnlocked && !wasUnlocked,
      progressText: evaluation.progressText
    };
  });

  return {
    achievements,
    achievementStates: normalizeChallengeAchievementStates(nextStates),
    unlockedCount: achievements.filter((achievement) => achievement.isUnlocked).length,
    newlyUnlockedIds: achievements.filter((achievement) => achievement.fresh).map((achievement) => achievement.id)
  };
}

export { CHALLENGE_ACHIEVEMENTS, CHALLENGE_ACHIEVEMENT_IDS };
