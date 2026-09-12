export const PLAY_STRATEGY_MODE = Object.freeze({
  STEADY: "steady",
  SPRINT: "sprint"
});

export const STRATEGY_BONUS_POINTS = 5;
export const STRATEGY_WRONG_PENALTY = 5;

const GRADE_PLAY_REWARD_CONFIG = Object.freeze({
  一年级: Object.freeze({
    key: "rainbow-shell",
    title: "彩虹贝寻宝",
    rewardLabel: "彩虹贝",
    countLabel: "贝",
    target: 3,
    metric: "total",
    bonusPoints: 5
  }),
  二年级: Object.freeze({
    key: "rainbow-bridge",
    title: "彩桥点灯",
    rewardLabel: "彩桥",
    countLabel: "桥",
    target: 4,
    metric: "total",
    bonusPoints: 5
  }),
  三年级: Object.freeze({
    key: "tailwind-route",
    title: "顺风航程",
    rewardLabel: "顺风旗",
    countLabel: "旗",
    target: 3,
    metric: "streak",
    bonusPoints: 5
  })
});

function toNonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function getGradePlayRewardConfig(grade) {
  return GRADE_PLAY_REWARD_CONFIG[String(grade || "").trim()] || null;
}

export function isBalloonOptionGrade(grade) {
  return ["一年级", "二年级"].includes(String(grade || "").trim());
}

export function isVoyageOptionGrade(grade) {
  return String(grade || "").trim() === "三年级";
}

export function isStrategyGrade(grade) {
  return ["四年级", "五年级", "六年级"].includes(String(grade || "").trim());
}

export function getGradePlayGoalState({
  grade,
  correctCount = 0,
  streakCount = 0,
  rewardCount = 0,
  showCompletedMilestone = false
} = {}) {
  const config = getGradePlayRewardConfig(grade);

  if (!config) {
    return null;
  }

  const metricCount = toNonNegativeInteger(config.metric === "streak" ? streakCount : correctCount);
  const remainder = metricCount % config.target;
  const progress = metricCount > 0 && remainder === 0 && showCompletedMilestone ? config.target : remainder;

  return {
    ...config,
    progress,
    remaining: progress === config.target ? 0 : config.target - progress,
    rewardCount: toNonNegativeInteger(rewardCount)
  };
}

export function getQuizCorrectReward({
  grade,
  correctCountBefore = 0,
  consecutiveCorrectBefore = 0,
  basePoints = 10,
  strategyMode = PLAY_STRATEGY_MODE.STEADY
} = {}) {
  const normalizedBasePoints = Math.max(0, Number(basePoints) || 0);
  const config = getGradePlayRewardConfig(grade);

  if (config) {
    const nextMetricCount =
      config.metric === "streak"
        ? toNonNegativeInteger(consecutiveCorrectBefore) + 1
        : toNonNegativeInteger(correctCountBefore) + 1;
    const rewardUnlocked = nextMetricCount % config.target === 0;
    const bonusPoints = rewardUnlocked ? config.bonusPoints : 0;

    return {
      pointsEarned: normalizedBasePoints + bonusPoints,
      bonusPoints,
      rewardUnlocked,
      rewardLabel: config.rewardLabel,
      rewardKey: config.key
    };
  }

  const sprintEnabled = isStrategyGrade(grade) && strategyMode === PLAY_STRATEGY_MODE.SPRINT;
  const bonusPoints = sprintEnabled ? STRATEGY_BONUS_POINTS : 0;

  return {
    pointsEarned: normalizedBasePoints + bonusPoints,
    bonusPoints,
    rewardUnlocked: false,
    rewardLabel: sprintEnabled ? "冲刺加分" : "",
    rewardKey: sprintEnabled ? "sprint" : ""
  };
}

export function getQuizWrongPenalty({ grade, strategyMode = PLAY_STRATEGY_MODE.STEADY } = {}) {
  return isStrategyGrade(grade) && strategyMode === PLAY_STRATEGY_MODE.SPRINT
    ? STRATEGY_WRONG_PENALTY
    : 0;
}
