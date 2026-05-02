function toPositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeQuestionResults(questionResults = []) {
  if (!Array.isArray(questionResults)) {
    return [];
  }

  return questionResults.filter((result) => ["correct", "wrong", "timeout"].includes(result));
}

function countQuestionResults(questionResults = [], expectedStates = []) {
  const stateSet = new Set(expectedStates);
  return normalizeQuestionResults(questionResults).reduce(
    (count, result) => (stateSet.has(result) ? count + 1 : count),
    0
  );
}

export function getLongestCorrectStreak(questionResults = []) {
  let currentStreak = 0;
  let longestStreak = 0;

  for (const result of normalizeQuestionResults(questionResults)) {
    if (result === "correct") {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      continue;
    }

    currentStreak = 0;
  }

  return longestStreak;
}

export function getFinalSprintWindow(stage, totalQuestions = 0) {
  const mission = stage?.mission;
  const questionTotal = toPositiveInt(totalQuestions, toPositiveInt(stage?.questionCount, 0));
  const finalSprintSize = toPositiveInt(mission?.windowSize, 0);

  if (mission?.type !== "final-sprint" || questionTotal <= 0 || finalSprintSize <= 0) {
    return null;
  }

  return {
    size: finalSprintSize,
    startIndex: Math.max(0, questionTotal - finalSprintSize)
  };
}

export function getFinalSprintCorrectCount(stage, questionResults = [], totalQuestions = 0) {
  const sprintWindow = getFinalSprintWindow(stage, totalQuestions);

  if (!sprintWindow) {
    return 0;
  }

  return normalizeQuestionResults(questionResults)
    .slice(sprintWindow.startIndex)
    .filter((result) => result === "correct").length;
}

export function getEffectiveChallengeTimeLimitSeconds(stage, baseTimeLimitSeconds = 0, currentQuestionIndex = 0, totalQuestions = 0) {
  const baseTimeLimit = toPositiveInt(baseTimeLimitSeconds, 0);
  const mission = stage?.mission;
  const sprintWindow = getFinalSprintWindow(stage, totalQuestions);
  const sprintTimeLimit = toPositiveInt(mission?.sprintTimeLimitSeconds, 0);

  if (!sprintWindow || sprintTimeLimit <= 0 || currentQuestionIndex < sprintWindow.startIndex) {
    return baseTimeLimit;
  }

  return sprintTimeLimit;
}

export function evaluateStageMission(stage, metrics = {}) {
  const mission = stage?.mission;

  if (!mission) {
    return {
      completed: false,
      label: "",
      progressText: "",
      tone: "neutral"
    };
  }

  const questionResults = normalizeQuestionResults(metrics.questionResults);
  const totalQuestions = toPositiveInt(metrics.totalQuestions, toPositiveInt(stage?.questionCount, 0));
  const answeredCount = toPositiveInt(metrics.answeredCount, questionResults.length);
  const correctCount = toPositiveInt(metrics.correctCount, countQuestionResults(questionResults, ["correct"]));
  const timeoutCount = toPositiveInt(metrics.timeoutCount, countQuestionResults(questionResults, ["timeout"]));
  const isPassed = Boolean(metrics.isPassed);

  if (mission.type === "pass") {
    return {
      completed: isPassed,
      label: mission.label || "完成本关",
      progressText:
        answeredCount >= totalQuestions && totalQuestions > 0
          ? isPassed
            ? "任务完成"
            : "先过关就能收下奖励"
          : `完成 ${Math.min(answeredCount, totalQuestions)} / ${totalQuestions}`,
      tone: isPassed ? "complete" : answeredCount > 0 ? "progress" : "neutral"
    };
  }

  if (mission.type === "streak") {
    const target = Math.max(1, toPositiveInt(mission.target, 3));
    const longestStreak = getLongestCorrectStreak(questionResults);
    const completed = longestStreak >= target;

    return {
      completed,
      label: mission.label || `连对 ${target} 题`,
      progressText: completed ? `已连对 ${target} 题` : `连对 ${Math.min(longestStreak, target)} / ${target}`,
      tone: completed ? "complete" : longestStreak > 0 ? "progress" : "neutral"
    };
  }

  if (mission.type === "zero-timeout") {
    const completed = answeredCount >= totalQuestions && totalQuestions > 0 && timeoutCount === 0;

    return {
      completed,
      label: mission.label || "全程不超时",
      progressText: timeoutCount === 0 ? "保持 0 次超时" : `已超时 ${timeoutCount} 次`,
      tone: completed ? "complete" : timeoutCount > 0 ? "alert" : "progress"
    };
  }

  if (mission.type === "correct-target") {
    const target = Math.max(1, toPositiveInt(mission.target, totalQuestions));
    const completed = correctCount >= target;

    return {
      completed,
      label: mission.label || `答对 ${target} 题`,
      progressText: completed ? `已答对 ${target} 题` : `答对 ${Math.min(correctCount, target)} / ${target}`,
      tone: completed ? "complete" : correctCount > 0 ? "progress" : "neutral"
    };
  }

  if (mission.type === "final-sprint") {
    const sprintWindow = getFinalSprintWindow(stage, totalQuestions);
    const target = Math.max(1, toPositiveInt(mission.target, 1));
    const finalSprintCorrectCount = getFinalSprintCorrectCount(stage, questionResults, totalQuestions);
    const sprintStarted = Boolean(sprintWindow) && answeredCount > sprintWindow.startIndex;
    const completed = finalSprintCorrectCount >= target;

    return {
      completed,
      label: mission.label || `最后 ${sprintWindow?.size ?? 0} 题答对 ${target} 题`,
      progressText: sprintStarted
        ? completed
          ? `冲刺答对 ${target} 题`
          : `冲刺答对 ${Math.min(finalSprintCorrectCount, target)} / ${target}`
        : `最后 ${sprintWindow?.size ?? 0} 题开启冲刺`,
      tone: completed ? "complete" : sprintStarted ? "progress" : "neutral"
    };
  }

  return {
    completed: false,
    label: mission.label || "",
    progressText: mission.label || "",
    tone: "neutral"
  };
}
