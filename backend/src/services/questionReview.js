const OpenAI = require("openai");
const { requestStructuredOutput } = require("./openAiStructuredOutput");
const { createMimoTtsAudio, isMimoCompatRuntime, isMimoTtsModel } = require("./mimoTtsCompat");
const { normalizeText, resolveClientRuntimeConfig } = require("./aiRuntimeConfig");

const DEFAULT_REVIEW_MODEL = "gpt-5.4-mini";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "coral";
const REVIEW_TONE_OPTIONS = ["celebrate", "steady", "repair"];
const REVIEW_LENGTH_OPTIONS = ["short", "standard", "detailed"];
const MAX_SUMMARY_ATTEMPTS = 18;

let openAIReviewClientFactory = null;

function createServiceError(statusCode, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = Array.isArray(details) ? details : [];
  return error;
}

function setOpenAIReviewClientFactoryForTesting(factory) {
  openAIReviewClientFactory = typeof factory === "function" ? factory : null;
}

function createOpenAIClient(runtimeConfig = {}) {
  if (openAIReviewClientFactory) {
    return openAIReviewClientFactory(runtimeConfig);
  }

  return new OpenAI({
    apiKey: runtimeConfig.apiKey,
    baseURL: runtimeConfig.baseUrl || undefined
  });
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

function resolveReviewBubbleText({ bubbleText, tone, encouragement, diagnosis, nextStep, speechText } = {}) {
  if (tone === "repair") {
    return pickBubbleText(bubbleText, nextStep, diagnosis, encouragement, speechText);
  }

  return pickBubbleText(bubbleText, encouragement, nextStep, diagnosis, speechText);
}

function resolveSummaryBubbleText({ bubbleText, focusPoint, nextPlan, overview, speechText } = {}) {
  return pickBubbleText(bubbleText, focusPoint, nextPlan, overview, speechText);
}

function resolveReviewModel(model) {
  return normalizeText(model, 120) || normalizeText(process.env.OPENAI_REVIEW_MODEL, 120) || DEFAULT_REVIEW_MODEL;
}

function resolveTtsModel(model) {
  return normalizeText(model, 120) || normalizeText(process.env.OPENAI_TTS_MODEL, 120) || DEFAULT_TTS_MODEL;
}

function resolveReviewLength(reviewLength) {
  const normalizedLength = normalizeText(reviewLength, 20);

  if (REVIEW_LENGTH_OPTIONS.includes(normalizedLength)) {
    return normalizedLength;
  }

  return "standard";
}

function resolveTtsVoice(voice) {
  return normalizeText(voice, 40) || normalizeText(process.env.OPENAI_TTS_VOICE, 40) || DEFAULT_TTS_VOICE;
}

function resolveTtsSpeed(speed) {
  const numericSpeed = Number(speed);

  if (Number.isFinite(numericSpeed) && numericSpeed >= 0.25 && numericSpeed <= 4) {
    return numericSpeed;
  }

  const envSpeed = Number(process.env.OPENAI_TTS_SPEED);

  if (Number.isFinite(envSpeed) && envSpeed >= 0.25 && envSpeed <= 4) {
    return envSpeed;
  }

  return 1;
}

function resolveSpeechResponseFormat(format, fallback = "mp3") {
  const normalizedFormat = normalizeText(format, 20).toLowerCase();

  if (["mp3", "wav", "pcm16"].includes(normalizedFormat)) {
    return normalizedFormat;
  }

  return fallback;
}

function resolveSelectedOptionText(question, selectedOption) {
  if (!Array.isArray(question?.options)) {
    return "";
  }

  return (
    question.options.find((option) => String(option?.key || "").trim() === String(selectedOption || "").trim())?.text || ""
  );
}

function buildReviewSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      tone: {
        type: "string",
        enum: REVIEW_TONE_OPTIONS
      },
      title: {
        type: "string"
      },
      encouragement: {
        type: "string"
      },
      diagnosis: {
        type: "string"
      },
      nextStep: {
        type: "string"
      },
      bubbleText: {
        type: "string"
      },
      speechText: {
        type: "string"
      }
    },
    required: ["tone", "title", "encouragement", "diagnosis", "nextStep", "speechText"]
  };
}

function buildSessionSummarySchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      tone: {
        type: "string",
        enum: REVIEW_TONE_OPTIONS
      },
      title: {
        type: "string"
      },
      overview: {
        type: "string"
      },
      strengths: {
        type: "string"
      },
      focusPoint: {
        type: "string"
      },
      nextPlan: {
        type: "string"
      },
      parentTip: {
        type: "string"
      },
      bubbleText: {
        type: "string"
      },
      speechText: {
        type: "string"
      }
    },
    required: ["tone", "title", "overview", "strengths", "focusPoint", "nextPlan", "parentTip", "speechText"]
  };
}

function buildGradeToneGuidance(grade) {
  const normalizedGrade = normalizeText(grade, 20);

  if (normalizedGrade === "一年级" || normalizedGrade === "二年级") {
    return [
      "当前对象是低年级学生。",
      "用词要更口语、更短句，优先说清一个关键点，不要一次给两三个步骤。",
      "鼓励语要更直接，像老师轻轻提醒。"
    ].join("\n");
  }

  if (normalizedGrade === "三年级" || normalizedGrade === "四年级") {
    return [
      "当前对象是中年级学生。",
      "可以明确指出漏看的条件、数量关系或判断顺序。",
      "建议保持简洁，但可以给到一个完整方法提示。"
    ].join("\n");
  }

  return [
    "当前对象是高年级学生。",
    "语气仍要温和，但可以更明确地指出审题、关系判断、步骤选择这些方法问题。",
    "建议要更可执行，避免只说“认真一点”。"
  ].join("\n");
}

function buildSubjectGuidance(subject) {
  const normalizedSubject = normalizeText(subject, 20);

  if (normalizedSubject === "数学") {
    return [
      "当前题目属于数学。",
      "点评时优先指出数量关系、条件变化、单位、运算顺序或审题漏看点。",
      "下一步建议要更像数学方法提醒，例如先圈条件、先找谁和谁在比较、先判断是加减还是乘除。"
    ].join("\n");
  }

  if (normalizedSubject === "语文") {
    return [
      "当前题目属于语文。",
      "点评时优先指出关键词、句意、上下文线索、表达重点或题干限定词。",
      "下一步建议要更像语文阅读或表达提醒，例如先找关键词、先回到原句、先看题目问的到底是什么。"
    ].join("\n");
  }

  if (normalizedSubject === "英语") {
    return [
      "当前题目属于英语。",
      "点评时优先指出场景、说话对象、句子功能、语气、关键词或固定表达，不要只说单词记错了。",
      "下一步建议要更像英语场景提醒，例如先看谁在说话、先判断是在提问还是回答、先找礼貌或时间地点线索。"
    ].join("\n");
  }

  return [
    "当前题目属于综合练习。",
    "点评时优先指出题干里的关键条件和最直接的解题线索。"
  ].join("\n");
}

function buildReviewLengthGuidance(reviewLength) {
  if (reviewLength === "short") {
    return [
      "当前点评长度档位：简短。",
      "encouragement、diagnosis、nextStep 各尽量一句话内，speechText 尽量控制在 45 字内。"
    ].join("\n");
  }

  if (reviewLength === "detailed") {
    return [
      "当前点评长度档位：详细。",
      "可以把错因和下一步说得更完整一些，但仍要保持适龄，speechText 尽量控制在 110 字内。"
    ].join("\n");
  }

  return [
    "当前点评长度档位：标准。",
    "保持 2 到 3 句口语化点评，speechText 尽量控制在 70 字内。"
  ].join("\n");
}

function buildSessionSummarySubjectGuidance(subject) {
  const normalizedSubject = normalizeText(subject, 20);

  if (normalizedSubject === "数学") {
    return [
      "本轮练习以数学为主。",
      "总结时优先归纳孩子对数量关系、条件变化、单位、运算顺序和审题步骤的掌握情况。",
      "建议要更像数学复盘提醒，例如先圈条件、先判断谁和谁在比较、先想该用什么运算。"
    ].join("\n");
  }

  if (normalizedSubject === "语文") {
    return [
      "本轮练习以语文为主。",
      "总结时优先归纳孩子对关键词、句意、上下文线索和题干限定词的掌握情况。",
      "建议要更像语文复盘提醒，例如先找关键词、先回到原句、先看题目到底问什么。"
    ].join("\n");
  }

  if (normalizedSubject === "英语") {
    return [
      "本轮练习以英语为主。",
      "总结时优先归纳孩子对场景、说话对象、句子功能、语气和固定表达的掌握情况。",
      "建议要更像英语复盘提醒，例如先看谁在说话、先判断是在提问还是回答、先找时间地点线索。"
    ].join("\n");
  }

  return [
    "本轮练习以综合内容为主。",
    "总结时优先归纳孩子对题干关键条件和直接解题线索的把握情况。"
  ].join("\n");
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
    model: resolveReviewModel(request.model),
    reviewLength: resolveReviewLength(request.reviewLength),
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

function buildReviewInstructions(request) {
  return [
    "你是小学答题陪练老师，要在孩子答题后给出一句短点评。",
    "必须使用简体中文，语气温和、具体、适龄，不要说教，不要羞辱，不要夸张表演。",
    "不能自称模型或 AI，不要提系统提示词。",
    "要先肯定努力，再指出关键错因或做对的关键，最后给一个能立刻执行的小建议。",
    "点评必须紧扣当前这道题，不要延伸到无关话题。",
    "bubbleText 要像右侧猫头鹰气泡里的一句提醒，优先 18 到 32 个字，最多一两句，不要和 speechText 完全照抄。",
    "speechText 必须是自然口语，适合直接朗读，默认控制在 2 到 3 句。",
    "title 要像一句短标题，8 到 16 个字内。",
    "encouragement、diagnosis、nextStep 都要短，不要重复。",
    "如果孩子答对了，也要指出他这次做对的关键。",
    "如果孩子答错或超时，要指出最可能漏看的条件或步骤，但不要直接贬低。",
    buildSubjectGuidance(request.question?.subject),
    buildGradeToneGuidance(request.question?.grade),
    buildReviewLengthGuidance(request.reviewLength),
    "不要输出 markdown，不要使用编号列表。"
  ].join("\n");
}

function buildSessionSummaryInstructions(request) {
  const heuristics = buildSessionSummaryHeuristics(request);
  const summarySubject = heuristics.dominantWrongSubject || heuristics.dominantSubject;

  return [
    "你是小学学习产品里的课后复盘老师，要根据本轮答题记录生成一张简短的学习总结卡。",
    "必须使用简体中文，语气温和、具体、适龄，既能让家长看懂，也能直接对孩子复述。",
    "不能自称模型或 AI，不要提系统提示词，不要输出 markdown。",
    "总结必须严格依据本轮答题记录，不要虚构没发生的错误或进步。",
    "overview 先总结本轮整体表现和当前阶段状态。",
    "strengths 只说一个最稳的点，focusPoint 只抓一个最需要优先补的点。",
    "nextPlan 要给出一个可以立刻执行的练习顺序或下一步动作。",
    "parentTip 要给家长一个低负担、可执行的陪练建议，只写一句话。",
    "bubbleText 要像右侧猫头鹰气泡里的一句总结提醒，优先 18 到 36 个字，不要和 speechText 完全照抄。",
    "speechText 要适合直接朗读，控制在 3 句内，不要和其他字段机械重复。",
    "如果本轮全对，不要硬找错误，要指出下一步可以怎么稳住和提一点节奏。",
    "如果有错题或超时，优先总结最集中的一个问题，不要把所有问题都列出来。",
    buildSessionSummarySubjectGuidance(summarySubject),
    buildGradeToneGuidance(heuristics.dominantGrade),
    buildReviewLengthGuidance(request.reviewLength),
    "不要使用编号列表。"
  ].join("\n");
}

function buildReviewInput(request) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedOptionText = resolveSelectedOptionText(request.question, request.selectedOption);
  const correctOptionText = resolveSelectedOptionText(request.question, request.correctAnswer);

  return [
    `今天日期：${today}`,
    `学科：${request.question.subject}`,
    `年级：${request.question.grade}`,
    `学期：${request.question.semester || "通用"}`,
    `知识标签：${request.question.knowledgeTag || "无"}`,
    `题型：${request.question.type || "未标注"}`,
    `点评长度档位：${request.reviewLength}`,
    `题目：${request.question.content}`,
    `学生作答结果：${request.isCorrect ? "答对" : request.isTimeout ? "超时判错" : "答错"}`,
    `学生选择：${request.isTimeout ? "超时未作答" : `${request.selectedOption}${selectedOptionText ? ` · ${selectedOptionText}` : ""}`}`,
    `正确答案：${request.correctAnswer}${correctOptionText ? ` · ${correctOptionText}` : ""}`,
    `题目解析：${request.explanation}`
  ].join("\n\n");
}

function buildSessionSummaryInput(request) {
  const today = new Date().toISOString().slice(0, 10);
  const heuristics = buildSessionSummaryHeuristics(request);
  const wrongFocus = heuristics.dominantWrongKnowledgeTag || heuristics.dominantWrongSubject || "暂无明显集中错因";
  const attemptsText = request.attempts
    .map((attempt, index) => {
      const resultLabel = attempt.isCorrect ? "答对" : attempt.isTimeout ? "超时判错" : "答错";

      return [
        `第 ${index + 1} 题：${resultLabel}`,
        `学科：${attempt.question.subject || "综合"} / 年级：${attempt.question.grade || "未标注"} / 知识标签：${attempt.question.knowledgeTag || attempt.question.type || "未标注"}`,
        `题目：${attempt.question.content}`,
        `学生选择：${attempt.isTimeout ? "超时未作答" : attempt.selectedOption || "未作答"}`,
        `正确答案：${attempt.correctAnswer}`,
        `题目解析：${attempt.explanation || "无"}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    `今天日期：${today}`,
    `练习模式：${request.playMode === "challenge" ? "挑战闯关" : "自由练习"}`,
    `关卡标题：${request.stageTitle || "无"}`,
    `点评长度档位：${request.reviewLength}`,
    `总得分：${request.score} 分`,
    `总题数：${request.totalQuestions} 题`,
    `答对：${request.correctCount} 题`,
    `答错：${request.wrongCount} 题`,
    `正确率：${request.accuracyPercent}%`,
    `系统归纳：本轮主要学科 ${heuristics.dominantSubject || "综合"}；错题集中点 ${wrongFocus}；超时 ${heuristics.timeoutCount} 题。`,
    "题目记录：",
    attemptsText
  ].join("\n\n");
}

function validateReviewPayload(payload) {
  const tone = normalizeText(payload?.tone, 20);
  const title = normalizeText(payload?.title, 40);
  const encouragement = normalizeText(payload?.encouragement, 80);
  const diagnosis = normalizeText(payload?.diagnosis, 120);
  const nextStep = normalizeText(payload?.nextStep, 120);
  const speechText = normalizeText(payload?.speechText, 160);
  const bubbleText = resolveReviewBubbleText({
    bubbleText: payload?.bubbleText,
    tone,
    encouragement,
    diagnosis,
    nextStep,
    speechText
  });

  if (!REVIEW_TONE_OPTIONS.includes(tone) || !title || !encouragement || !diagnosis || !nextStep || !speechText) {
    throw createServiceError(502, "AI 点评结果格式不正确。");
  }

  return {
    tone,
    title,
    encouragement,
    diagnosis,
    nextStep,
    bubbleText,
    speechText
  };
}

function validateSessionSummaryPayload(payload) {
  const tone = normalizeText(payload?.tone, 20);
  const title = normalizeText(payload?.title, 40);
  const overview = normalizeText(payload?.overview, 140);
  const strengths = normalizeText(payload?.strengths, 140);
  const focusPoint = normalizeText(payload?.focusPoint, 160);
  const nextPlan = normalizeText(payload?.nextPlan, 160);
  const parentTip = normalizeText(payload?.parentTip, 160);
  const speechText = normalizeText(payload?.speechText, 180);
  const bubbleText = resolveSummaryBubbleText({
    bubbleText: payload?.bubbleText,
    focusPoint,
    nextPlan,
    overview,
    speechText
  });

  if (!REVIEW_TONE_OPTIONS.includes(tone) || !title || !overview || !strengths || !focusPoint || !nextPlan || !parentTip || !speechText) {
    throw createServiceError(502, "本轮总结结果格式不正确。");
  }

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

async function requestQuestionReviewFromModel(client, request, textApiMode = "auto") {
  const requestedModel = resolveReviewModel(request.model);
  const response = await requestStructuredOutput({
    client,
    model: requestedModel,
    instructions: buildReviewInstructions(request),
    input: buildReviewInput(request),
    schemaName: "elementary_answer_review",
    schema: buildReviewSchema(),
    textApiMode
  });

  return {
    model: response.model || requestedModel,
    responseId: response.responseId || "",
    parsed: validateReviewPayload(response.parsed),
    api: response.api
  };
}

async function requestSessionSummaryFromModel(client, request, textApiMode = "auto") {
  const requestedModel = resolveReviewModel(request.model);
  const response = await requestStructuredOutput({
    client,
    model: requestedModel,
    instructions: buildSessionSummaryInstructions(request),
    input: buildSessionSummaryInput(request),
    schemaName: "elementary_session_summary",
    schema: buildSessionSummarySchema(),
    textApiMode
  });

  return {
    model: response.model || requestedModel,
    responseId: response.responseId || "",
    parsed: validateSessionSummaryPayload(response.parsed),
    api: response.api
  };
}

async function generateQuestionReview(request = {}) {
  const runtimeConfig = resolveClientRuntimeConfig(request.aiRuntime);

  if (!runtimeConfig.apiKey) {
    throw createServiceError(503, "当前未配置可用的 AI API Key，暂时无法生成 AI 点评。");
  }

  const normalizedRequest = {
    model: resolveReviewModel(request.model),
    reviewLength: resolveReviewLength(request.reviewLength),
    selectedOption: normalizeText(request.selectedOption, 8),
    correctAnswer: normalizeText(request.correctAnswer, 8),
    explanation: normalizeText(request.explanation, 600),
    isCorrect: Boolean(request.isCorrect),
    isTimeout: Boolean(request.isTimeout),
    question: {
      subject: normalizeText(request.question?.subject, 20),
      grade: normalizeText(request.question?.grade, 20),
      semester: normalizeText(request.question?.semester, 20),
      knowledgeTag: normalizeText(request.question?.knowledgeTag, 40),
      type: normalizeText(request.question?.type, 40),
      content: normalizeText(request.question?.content, 500),
      options: Array.isArray(request.question?.options)
        ? request.question.options.map((option) => ({
            key: normalizeText(option?.key, 8),
            text: normalizeText(option?.text, 120)
          }))
        : []
    }
  };

  if (
    !normalizedRequest.question.subject ||
    !normalizedRequest.question.grade ||
    !normalizedRequest.question.content ||
    !normalizedRequest.correctAnswer ||
    !normalizedRequest.explanation
  ) {
    throw createServiceError(400, "生成 AI 点评时缺少必要题目信息。");
  }

  const client = createOpenAIClient(runtimeConfig);

  try {
    const response = await requestQuestionReviewFromModel(client, normalizedRequest, runtimeConfig.textApiMode);
    return {
      review: response.parsed,
      meta: {
        model: response.model,
        responseId: response.responseId,
        api: response.api
      }
    };
  } catch (error) {
    if (error?.statusCode) {
      throw error;
    }

    const message = error?.message ? `AI 点评请求失败：${error.message}` : "AI 点评请求失败。";
    throw createServiceError(502, message);
  }
}

async function generateQuizSessionSummary(request = {}) {
  const normalizedRequest = normalizeSessionSummaryRequest(request);

  if (normalizedRequest.attempts.length === 0) {
    throw createServiceError(400, "生成本轮总结时缺少题目作答记录。");
  }

  const runtimeConfig = resolveClientRuntimeConfig(request.aiRuntime);
  const fallbackSummary = buildSessionSummaryFallback(normalizedRequest);

  if (!runtimeConfig.apiKey) {
    return {
      summary: fallbackSummary,
      meta: {
        model: "",
        responseId: "",
        source: "fallback"
      }
    };
  }

  const client = createOpenAIClient(runtimeConfig);

  try {
    const response = await requestSessionSummaryFromModel(client, normalizedRequest, runtimeConfig.textApiMode);
    return {
      summary: response.parsed,
      meta: {
        model: response.model,
        responseId: response.responseId,
        source: "model",
        api: response.api
      }
    };
  } catch (error) {
    if (error?.statusCode === 400) {
      throw error;
    }

    return {
      summary: fallbackSummary,
      meta: {
        model: normalizedRequest.model,
        responseId: "",
        source: "fallback",
        fallbackReason: error?.message ? normalizeText(error.message, 160) : "model-error"
      }
    };
  }
}

async function synthesizeQuestionReviewSpeech({ text, model, aiRuntime, voice, speed, audioFormat = "" } = {}) {
  const runtimeConfig = resolveClientRuntimeConfig(aiRuntime);
  const normalizedText = normalizeText(text, 200);
  const resolvedVoice = resolveTtsVoice(voice || runtimeConfig.ttsVoice);
  const resolvedAudioFormat = resolveSpeechResponseFormat(audioFormat || runtimeConfig.ttsAudioFormat, "mp3");

  if (!runtimeConfig.apiKey) {
    throw createServiceError(503, "当前未配置可用的 AI API Key，暂时无法生成点评语音。");
  }

  if (!normalizedText) {
    throw createServiceError(400, "点评语音内容不能为空。");
  }

  const client = createOpenAIClient(runtimeConfig);

  try {
    const resolvedModel = resolveTtsModel(model);

    if (isMimoCompatRuntime(runtimeConfig) && isMimoTtsModel(resolvedModel)) {
      return await createMimoTtsAudio(client, {
        model: resolvedModel,
        text: normalizedText,
        voice: resolvedVoice,
        instructions: "Warm, clear, natural Mandarin Chinese delivery with a gentle teacher-like tone.",
        format: resolveSpeechResponseFormat(audioFormat || runtimeConfig.ttsAudioFormat, "wav")
      });
    }

    const response = await client.audio.speech.create({
      model: resolvedModel,
      voice: resolvedVoice,
      input: normalizedText,
      instructions: "请用温和、清楚、自然的中文语气朗读，像小学老师在轻声提醒学生一样，不要太快。",
      response_format: resolvedAudioFormat === "wav" ? "wav" : "mp3",
      speed: resolveTtsSpeed(speed)
    });

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      format: resolvedAudioFormat === "wav" ? "wav" : "mp3"
    };
  } catch (error) {
    const message = error?.message ? `点评语音生成失败：${error.message}` : "点评语音生成失败。";
    throw createServiceError(502, message);
  }
}

module.exports = {
  DEFAULT_REVIEW_MODEL,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  generateQuestionReview,
  generateQuizSessionSummary,
  synthesizeQuestionReviewSpeech,
  setOpenAIReviewClientFactoryForTesting
};
