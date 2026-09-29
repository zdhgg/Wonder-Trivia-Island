const MAX_SUMMARY_ATTEMPTS = 18;

function createServiceError(statusCode, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = Array.isArray(details) ? details : [];
  return error;
}

function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return "";
  }

  if (maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function normalizeBubbleText(value, maxLength = 42) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  const firstSentence = normalized.split(/[。！？!?]/)[0]?.trim() || normalized;
  const candidate = firstSentence || normalized;

  if (candidate.length <= maxLength) {
    return candidate;
  }

  return `${candidate.slice(0, maxLength).trim()}…`;
}

function pickBubbleText(...values) {
  for (const value of values) {
    const candidate = normalizeBubbleText(value);

    if (candidate) {
      return candidate;
    }
  }

  return "";
}

function resolveSummaryBubbleText({ bubbleText, focusPoint, nextPlan, overview, speechText } = {}) {
  return pickBubbleText(bubbleText, focusPoint, nextPlan, overview, speechText);
}

function normalizeInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}

function toAttemptLabelCountMap(attempts, selector) {
  const counter = new Map();

  attempts.forEach((attempt) => {
    const label = normalizeText(selector(attempt), 40);

    if (!label) {
      return;
    }

    counter.set(label, (counter.get(label) || 0) + 1);
  });

  return counter;
}

function getDominantLabel(attempts, selector) {
  const counter = toAttemptLabelCountMap(attempts, selector);

  return Array.from(counter.entries()).sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0]?.[0] || "";
}

function resolveSummaryMethodHint(subject) {
  if (subject === "数学") {
    return "先圈条件，再判断数量关系。";
  }

  if (subject === "语文") {
    return "先找关键词，再回到原句。";
  }

  if (subject === "英语") {
    return "先看场景，再判断是在问还是在答。";
  }

  return "先圈出题干里的关键条件。";
}

function resolveParentSupportTip(subject, grade) {
  const normalizedGrade = normalizeText(grade, 20);
  const normalizedSubject = normalizeText(subject, 20);

  if (normalizedGrade === "一年级" || normalizedGrade === "二年级") {
    return "家长可以先陪孩子慢读一遍题，再让他自己说出第一步先看什么。";
  }

  if (normalizedSubject === "数学") {
    return "家长可以先让孩子口头说出已知条件和要求什么，再动笔计算。";
  }

  if (normalizedSubject === "语文") {
    return "家长可以提醒孩子先圈关键词，再回到原句找依据。";
  }

  if (normalizedSubject === "英语") {
    return "家长可以先让孩子判断说话场景，再决定该选提问还是回答。";
  }

  return "家长可以先让孩子自己复述题目，再追问他准备先看哪一个条件。";
}

function normalizeSummaryAttempt(attempt = {}) {
  return {
    selectedOption: normalizeText(attempt.selectedOption, 12),
    correctAnswer: normalizeText(attempt.correctAnswer, 12),
    explanation: normalizeText(attempt.explanation, 240),
    isCorrect: Boolean(attempt.isCorrect),
    isTimeout: Boolean(attempt.isTimeout),
    question: {
      id: normalizeInteger(attempt.question?.id, 0, { min: 0, max: Number.MAX_SAFE_INTEGER }),
      subject: normalizeText(attempt.question?.subject, 20),
      grade: normalizeText(attempt.question?.grade, 20),
      semester: normalizeText(attempt.question?.semester, 20),
      knowledgeTag: normalizeText(attempt.question?.knowledgeTag, 40),
      type: normalizeText(attempt.question?.type, 40),
      content: normalizeText(attempt.question?.content, 220),
      difficulty: normalizeText(attempt.question?.difficulty, 20)
    }
  };
}

function normalizeSessionSummaryRequest(request = {}) {
  const attempts = Array.isArray(request.attempts)
    ? request.attempts
        .slice(0, MAX_SUMMARY_ATTEMPTS)
        .map((attempt) => normalizeSummaryAttempt(attempt))
        .filter((attempt) => attempt.question.content && attempt.correctAnswer)
    : [];
  const computedCorrectCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const totalQuestions = normalizeInteger(request.totalQuestions, attempts.length, { min: 0, max: 200 }) || attempts.length;
  const correctCount = normalizeInteger(request.correctCount, computedCorrectCount, { min: 0, max: totalQuestions || 200 });
  const wrongCount = normalizeInteger(request.wrongCount, Math.max(0, attempts.length - correctCount), {
    min: 0,
    max: totalQuestions || 200
  });
  const accuracyPercent =
    normalizeInteger(request.accuracyPercent, null, { min: 0, max: 100 }) ??
    (attempts.length > 0 ? Math.round((computedCorrectCount / attempts.length) * 100) : 0);

  return {
    playMode: normalizeText(request.playMode, 20) === "challenge" ? "challenge" : "free",
    stageTitle: normalizeText(request.stageTitle, 80),
    score: normalizeInteger(request.score, 0, { min: 0, max: 100000 }),
    totalQuestions,
    correctCount,
    wrongCount,
    accuracyPercent,
    attempts
  };
}

function buildSessionSummaryHeuristics(request) {
  const wrongAttempts = request.attempts.filter((attempt) => !attempt.isCorrect);

  return {
    wrongAttempts,
    timeoutCount: wrongAttempts.filter((attempt) => attempt.isTimeout).length,
    dominantGrade: getDominantLabel(request.attempts, (attempt) => attempt.question.grade),
    dominantSubject: getDominantLabel(request.attempts, (attempt) => attempt.question.subject),
    dominantWrongSubject: getDominantLabel(wrongAttempts, (attempt) => attempt.question.subject),
    dominantWrongKnowledgeTag:
      getDominantLabel(wrongAttempts, (attempt) => attempt.question.knowledgeTag) ||
      getDominantLabel(wrongAttempts, (attempt) => attempt.question.type),
    strongestKnowledgeTag:
      getDominantLabel(
        request.attempts.filter((attempt) => attempt.isCorrect),
        (attempt) => attempt.question.knowledgeTag
      ) || getDominantLabel(request.attempts.filter((attempt) => attempt.isCorrect), (attempt) => attempt.question.subject)
  };
}

function buildSessionSummaryFallback(request) {
  const heuristics = buildSessionSummaryHeuristics(request);
  const wrongAttempts = heuristics.wrongAttempts;
  const focusSubject = heuristics.dominantWrongSubject || heuristics.dominantSubject;
  const focusLabel = heuristics.dominantWrongKnowledgeTag || focusSubject || "当前知识点";
  const methodHint = resolveSummaryMethodHint(focusSubject);
  const parentTip = resolveParentSupportTip(focusSubject, heuristics.dominantGrade);
  const isPerfectRound = request.correctCount > 0 && request.correctCount === request.totalQuestions;
  const tone =
    request.accuracyPercent >= 90 ? "celebrate" : request.accuracyPercent >= 67 ? "steady" : "repair";
  let title = "先抓住一个关键点";
  let overview = `本轮共完成 ${request.totalQuestions} 题，答对 ${request.correctCount} 题，当前更适合先把一个最常出错的点补稳。`;

  if (isPerfectRound) {
    title = "这轮节奏很稳";
    overview = `本轮共完成 ${request.totalQuestions} 题，全部答对，说明这一块基础已经比较稳。`;
  } else if (request.accuracyPercent >= 67) {
    title = "这轮基础稳住了";
    overview = `本轮共完成 ${request.totalQuestions} 题，答对 ${request.correctCount} 题，整体节奏已经稳住了一大半。`;
  }

  const strengths = heuristics.strongestKnowledgeTag
    ? `已经能在 ${heuristics.strongestKnowledgeTag} 这类题里抓到主要线索。`
    : "已经能把一部分题目的主要线索抓住。";
  const focusPoint =
    wrongAttempts.length > 0
      ? `这轮最值得优先补的是 ${focusLabel}，容易在关键条件或判断顺序上丢分。${heuristics.timeoutCount > 0 ? "其中还有超时，说明读题和下手顺序还不够稳。" : ""}`
      : "这轮没有明显短板，下一步更适合在保持准确率的同时稍微提一点节奏。";
  const nextPlan =
    wrongAttempts.length > 0
      ? `建议先回看这轮错题，再围绕 ${focusLabel} 加练 3 到 5 题，练的时候${methodHint}`
      : `建议把同知识点再练一轮，先保持准确率，再慢慢把速度提起来。`;
  const bubbleText = resolveSummaryBubbleText({
    focusPoint,
    nextPlan,
    overview
  });
  const speechText = normalizeText([overview, focusPoint, nextPlan].join(" "), 180);

  return {
    tone,
    title,
    overview,
    strengths,
    focusPoint,
    nextPlan,
    parentTip,
    bubbleText,
    speechText
  };
}

async function generateQuizSessionSummary(request = {}) {
  const normalizedRequest = normalizeSessionSummaryRequest(request);

  if (normalizedRequest.attempts.length === 0) {
    throw createServiceError(400, "生成本轮总结时缺少题目作答记录。");
  }

  // 整轮学习总结完全由本地确定性规则生成（buildSessionSummaryFallback），
  // 不读取模型配置、不调用任何模型，与 API Key 状态无关。
  return {
    summary: buildSessionSummaryFallback(normalizedRequest),
    meta: {
      model: "",
      responseId: "",
      source: "fallback"
    }
  };
}

module.exports = {
  generateQuizSessionSummary
};
