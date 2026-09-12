const OpenAI = require("openai");
const { requestStructuredOutput } = require("./openAiStructuredOutput");
const { normalizeText, resolveClientRuntimeConfig } = require("./aiRuntimeConfig");
const homeWelcomeRules = require("../../../shared/homeWelcomeRules.node.cjs");

const DEFAULT_REVIEW_MODEL = "gpt-5.4-mini";
const HOME_WELCOME_TONE_OPTIONS = ["warm", "steady", "playful"];
const HOME_WELCOME_SHARED_RULES =
  homeWelcomeRules && typeof homeWelcomeRules === "object" ? homeWelcomeRules : {};
const HOME_WELCOME_STYLE_CONFIG =
  HOME_WELCOME_SHARED_RULES.styleConfig && typeof HOME_WELCOME_SHARED_RULES.styleConfig === "object"
    ? HOME_WELCOME_SHARED_RULES.styleConfig
    : {};
const HOME_WELCOME_MAX_TITLE_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxTitleLength || 28);
const HOME_WELCOME_MAX_BUBBLE_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxBubbleLength || 28);
const HOME_WELCOME_MAX_SPEECH_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxSpeechLength || 80);
const HOME_WELCOME_OFF_STYLE_TITLE_PATTERNS = Object.freeze(
  Array.isArray(HOME_WELCOME_SHARED_RULES.offStyleTitlePatterns) && HOME_WELCOME_SHARED_RULES.offStyleTitlePatterns.length > 0
    ? HOME_WELCOME_SHARED_RULES.offStyleTitlePatterns
    : [
      "任务",
      "挑战",
      "闯关",
      "冲刺",
      "打卡",
      "刷题",
      "计划",
      "安排",
      "立刻",
      "马上",
      "赶紧",
      "快来",
      "出发",
      "开启",
      "开始吧",
      "冲呀",
      "太棒啦",
      "最棒",
      "错题"
    ]
);
let openAIHomeWelcomeClientFactory = null;

function createServiceError(statusCode, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = Array.isArray(details) ? details : [];
  return error;
}

function normalizeInlineText(value, maxLength = 0) {
  const normalized = normalizeText(value, maxLength).replace(/\s+/g, " ").trim();
  return normalized || "";
}

function setOpenAIHomeWelcomeClientFactoryForTesting(factory) {
  openAIHomeWelcomeClientFactory = typeof factory === "function" ? factory : null;
}

function createOpenAIClient(runtimeConfig = {}) {
  if (openAIHomeWelcomeClientFactory) {
    return openAIHomeWelcomeClientFactory(runtimeConfig);
  }

  return new OpenAI({
    apiKey: runtimeConfig.apiKey,
    baseURL: runtimeConfig.baseUrl || undefined
  });
}

function resolveReviewModel(model) {
  return normalizeInlineText(model, 120) || normalizeInlineText(process.env.OPENAI_REVIEW_MODEL, 120) || DEFAULT_REVIEW_MODEL;
}

function normalizeHomeWelcomeContext(rawContext = {}) {
  const context = rawContext && typeof rawContext === "object" && !Array.isArray(rawContext) ? rawContext : {};

  return {
    displayName: normalizeInlineText(context.displayName, 20),
    grade: normalizeInlineText(context.grade, 20),
    semester: normalizeInlineText(context.semester, 20),
    recommendedMode: ["challenge", "review", "grade", "subject", "free"].includes(normalizeInlineText(context.recommendedMode, 20))
      ? normalizeInlineText(context.recommendedMode, 20)
      : "default",
    challengeStageLabel: normalizeInlineText(context.challengeStageLabel, 80),
    reviewDueCount: Number(context.reviewDueCount || 0),
    reviewingCount: Number(context.reviewingCount || 0),
    timeBand: normalizeInlineText(context.timeBand, 20),
    timeContextKey: normalizeInlineText(context.timeContextKey, 20),
    timeCueLabel: normalizeInlineText(context.timeCueLabel, 20),
    timeGreetingLabel: normalizeInlineText(context.timeGreetingLabel, 20),
    monthLabel: normalizeInlineText(context.monthLabel, 20),
    seasonLabel: normalizeInlineText(context.seasonLabel, 20),
    monthVibe: normalizeInlineText(context.monthVibe, 20),
    schoolYearPhase: normalizeInlineText(context.schoolYearPhase, 20),
    isProfileJustSaved: Boolean(context.isProfileJustSaved),
    isFirstHomeVisitToday: Boolean(context.isFirstHomeVisitToday)
  };
}

function normalizeHomeWelcomeLine(value, maxLength = HOME_WELCOME_MAX_BUBBLE_LENGTH) {
  const normalized = normalizeInlineText(value, maxLength * 3);

  if (!normalized) {
    return "";
  }

  const firstSentence = normalized.match(/^[^。！？!?]+[。！？!?]?/)?.[0]?.trim() || normalized;

  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  if (maxLength <= 1) {
    return firstSentence.slice(0, maxLength);
  }

  return `${firstSentence.slice(0, maxLength - 1).trim()}…`;
}

function normalizeHomeWelcomeTone(value) {
  const normalized = normalizeInlineText(value, 20);

  if (HOME_WELCOME_TONE_OPTIONS.includes(normalized)) {
    return normalized;
  }

  return "warm";
}

function normalizeHomeWelcomeTitle(value) {
  return normalizeHomeWelcomeLine(value, HOME_WELCOME_MAX_TITLE_LENGTH);
}

function isHomeWelcomeTextTooSimilar(left, right) {
  if (typeof HOME_WELCOME_SHARED_RULES.isTextTooSimilar === "function") {
    return HOME_WELCOME_SHARED_RULES.isTextTooSimilar(left, right);
  }

  return false;
}

function isHomeWelcomeTitleOffStyle(title, context = {}) {
  if (typeof HOME_WELCOME_SHARED_RULES.isTitleOffStyle === "function") {
    return HOME_WELCOME_SHARED_RULES.isTitleOffStyle(
      title,
      {
        timeCueLabel: normalizeInlineText(context.timeCueLabel, 20),
        timeGreetingLabel: normalizeInlineText(context.timeGreetingLabel, 20),
        monthVibe: normalizeInlineText(context.monthVibe, 20),
        displayName: normalizeInlineText(context.displayName, 20)
      },
      HOME_WELCOME_OFF_STYLE_TITLE_PATTERNS
    );
  }

  return false;
}

function buildHomeWelcomeFallbackTitle(context = {}) {
  const displayName = normalizeInlineText(context.displayName, 20);

  if (context.isProfileJustSaved) {
    return "新路线准备好了";
  }

  if (displayName) {
    return `${displayName}，欢迎回来`;
  }

  return context.isFirstHomeVisitToday ? "今天想去哪座岛看看？" : "欢迎回到奇妙知识岛";
}

function buildHomeWelcomeFallbackBubbleText(context = {}) {
  const reviewDueCount = Math.max(0, Number.parseInt(String(context.reviewDueCount || 0), 10) || 0);
  const reviewingCount = Math.max(0, Number.parseInt(String(context.reviewingCount || 0), 10) || 0);
  const challengeStageLabel = normalizeInlineText(context.challengeStageLabel, 10);
  const gradeSemesterLabel = `${normalizeInlineText(context.grade, 20)}${normalizeInlineText(context.semester, 20)}`;

  if (context.isProfileJustSaved) {
    return gradeSemesterLabel
      ? `${gradeSemesterLabel}的新路线已经同步到首页。`
      : "首页已经按你的新档案重新整理。";
  }

  if (reviewDueCount > 0) {
    return `有 ${reviewDueCount} 道小题值得再看一眼，也可以先去探索。`;
  }

  if (reviewingCount > 0) {
    return `上次温习的 ${reviewingCount} 道小题还在，也可以先去探索。`;
  }

  if (challengeStageLabel) {
    return `上次停下的${challengeStageLabel}还亮着，也可以换条路线。`;
  }

  return context.isFirstHomeVisitToday
    ? "火山、森林、矿洞和海滩都准备好了。"
    : "继续上次的旅程，或者换一条新路线。";
}

function resolveTimeMentionCandidates(context = {}) {
  const timeContextKey = normalizeInlineText(context.timeContextKey, 20);
  const timeCueLabel = normalizeInlineText(context.timeCueLabel, 20);
  const timeGreetingLabel = normalizeInlineText(context.timeGreetingLabel, 20);

  if (typeof HOME_WELCOME_SHARED_RULES.getTimeMentionCandidates === "function") {
    return HOME_WELCOME_SHARED_RULES.getTimeMentionCandidates({
      timeContextKey,
      timeCueLabel,
      timeGreetingLabel
    });
  }

  return Array.from(new Set([timeCueLabel, timeGreetingLabel].filter(Boolean)));
}

function normalizeHomeWelcomeSpeechText(value, maxLength = HOME_WELCOME_MAX_SPEECH_LENGTH) {
  const normalized = normalizeInlineText(value, maxLength * 3);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= 1) {
    return normalized.slice(0, maxLength);
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function normalizeHomeWelcomeSpeechWithTime(value, context = {}, maxLength = HOME_WELCOME_MAX_SPEECH_LENGTH) {
  const normalized = normalizeInlineText(value, maxLength * 3);

  if (!normalized) {
    return "";
  }

  const mentions = resolveTimeMentionCandidates(context);

  if (mentions.some((mention) => normalized.includes(mention))) {
    return normalizeHomeWelcomeSpeechText(normalized, maxLength);
  }

  const prefix = normalizeInlineText(context.timeGreetingLabel, 20) || normalizeInlineText(context.timeCueLabel, 20);
  const prefixed = prefix ? `${prefix}，${normalized}` : normalized;
  return normalizeHomeWelcomeSpeechText(prefixed, maxLength);
}

function isHomeWelcomeBubbleOffRole(bubbleText, title, context = {}) {
  const disallowedTokens = [
    ...resolveTimeMentionCandidates(context),
    normalizeInlineText(context.monthLabel, 20),
    normalizeInlineText(context.monthVibe, 20),
    normalizeInlineText(context.seasonLabel, 20),
    normalizeInlineText(context.displayName, 20)
  ].filter(Boolean);

  return disallowedTokens.some((token) => bubbleText.includes(token)) || isHomeWelcomeTextTooSimilar(title, bubbleText);
}

function validateHomeWelcomePayload(payload = {}, context = {}) {
  const tone = normalizeHomeWelcomeTone(payload.tone);
  const fallbackTitle = normalizeHomeWelcomeTitle(buildHomeWelcomeFallbackTitle(context));
  let title = normalizeHomeWelcomeTitle(payload.title || fallbackTitle) || fallbackTitle;
  let bubbleText = normalizeHomeWelcomeLine(payload.bubbleText || payload.speechText, HOME_WELCOME_MAX_BUBBLE_LENGTH);

  if (isHomeWelcomeTitleOffStyle(title, context) || isHomeWelcomeTextTooSimilar(title, bubbleText)) {
    title = fallbackTitle;
  }

  if (!bubbleText || isHomeWelcomeBubbleOffRole(bubbleText, title, context)) {
    bubbleText = normalizeHomeWelcomeLine(buildHomeWelcomeFallbackBubbleText(context), HOME_WELCOME_MAX_BUBBLE_LENGTH);
  }

  const speechText =
    normalizeHomeWelcomeSpeechWithTime(payload.speechText || bubbleText, context, HOME_WELCOME_MAX_SPEECH_LENGTH) || bubbleText;

  if (!bubbleText || !speechText) {
    throw createServiceError(502, "AI 首页欢迎语结果不完整。");
  }

  return {
    tone,
    title,
    bubbleText,
    speechText
  };
}

function buildHomeWelcomeSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      tone: {
        type: "string",
        enum: HOME_WELCOME_TONE_OPTIONS
      },
      title: {
        type: "string"
      },
      bubbleText: {
        type: "string"
      },
      speechText: {
        type: "string"
      }
    },
    required: ["tone", "bubbleText", "speechText"]
  };
}

function buildHomeWelcomeInput(context) {
  return [
    `昵称：${context.displayName || "未设置"}`,
    `年级：${context.grade || "未设置"}`,
    `学期：${context.semester || "未设置"}`,
    `时段：${context.timeBand || "无"}`,
    `时段键：${context.timeContextKey || "无"}`,
    `时段关键词：${context.timeCueLabel || "无"}`,
    `时段问候：${context.timeGreetingLabel || "无"}`,
    `月份：${context.monthLabel || "无"}`,
    `月份气息：${context.monthVibe || "无"}`,
    `季节：${context.seasonLabel || "无"}`,
    `学季阶段：${context.schoolYearPhase || "无"}`,
    `刚保存档案：${context.isProfileJustSaved ? "是" : "否"}`,
    `今天首次进入首页：${context.isFirstHomeVisitToday ? "是" : "否"}`
  ].join("\n");
}

function buildFocusedHomeWelcomeInstructions(context) {
  const gradeHint = context.grade ? `当前年级是${context.grade}。` : "年级未知。";
  const semesterHint = context.semester ? `当前学期是${context.semester}。` : "学期未知。";
  const visitHint = context.isProfileJustSaved
    ? "刚保存过学习档案，明确告诉孩子新路线和首页已经准备好。"
    : context.isFirstHomeVisitToday
      ? "这是今天第一次进入首页，欢迎之后自然地邀请孩子选一座岛看看。"
      : "这是普通回访，优先承接上次进度，再给孩子换路线的自由。";
  const backgroundHint = [
    context.reviewDueCount > 0 ? `有 ${context.reviewDueCount} 题待温习。` : "",
    context.reviewingCount > 0 ? `有 ${context.reviewingCount} 题正在回温中。` : "",
    context.challengeStageLabel ? `上次停在：${context.challengeStageLabel}。` : ""
  ]
    .filter(Boolean)
    .join(" ");
  const progressStateHint = context.reviewDueCount > 0
    ? `bubbleText 优先写成“有 ${context.reviewDueCount} 道小题值得再看一眼，也可以先去探索”这一类温和提示。`
    : context.reviewingCount > 0
      ? "bubbleText 优先说明上次温习的小题还在，同时保留先去探索的选择。"
      : context.challengeStageLabel
        ? "bubbleText 优先说明上次停下的那一站还亮着，同时允许孩子换一条路线。"
        : "没有可承接的进度时，bubbleText 简短介绍火山、森林、矿洞、海滩或新的路线。";
  const temporalHint = [
    context.timeGreetingLabel ? `speechText 可用的时段问候是：${context.timeGreetingLabel}。` : "",
    context.monthVibe ? `月份气息仅可偶尔用于 speechText：${context.monthVibe}。` : "",
    context.schoolYearPhase ? `当前学季阶段是：${context.schoolYearPhase}。` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "你在为小学学习产品“奇妙知识岛”的首页生成欢迎文案。",
    "只输出符合 JSON Schema 的内容，不要输出多余文本。",
    "title 是稳定欢迎标题，bubbleText 是标题下方的行动提示，speechText 用于猫头鹰播报；三者必须各司其职。",
    "title 控制在 8 到 14 个中文字符，最多 18 个字符。",
    "普通回访且有昵称时，title 优先使用“昵称，欢迎回来”；没有昵称时可使用“今天想去哪座岛看看”。",
    "刚保存档案时，title 优先使用“新路线准备好了”。",
    "title 不要出现“任务、挑战、闯关、冲刺、打卡、立刻、马上”这类有催促感的词。",
    "bubbleText 控制在 14 到 24 个中文字符，最多 30 个字符，只写一句。",
    "bubbleText 优先承接真实进度并给出一个低压力选择；没有进度时再介绍可探索的路线。",
    "bubbleText 不写时段、月份或季节，不重复 title，也不要再次叫昵称。",
    "speechText 控制在 24 到 56 个中文字符，最多两句，适合直接朗读。",
    "时段只在 speechText 中自然出现一次；不要让 title 和 bubbleText 再重复时段。",
    "speechText 可以先问候，再补充 bubbleText 没有容纳的陪伴信息，但不要机械照抄。",
    "不能编造数据，只能使用上下文里真实存在的信息。",
    "核心目标：让孩子感到被欢迎，同时清楚知道可以继续上次进度，也可以自由换路线。",
    "语气要温暖、有探索感，但不能像任务清单，也不能像广告口号。",
    "低年级更短、更口语、更可爱；高年级更稳、更温柔。",
    "不要连续感叹，不要使用空泛鼓励词，例如“冲呀”“太棒啦”“一起出发吧”“快来挑战”。",
    "不要反复使用“慢慢来、轻轻来、不着急、安心啦、来坐坐吧”这类过度安抚表达。",
    "月份和季节不是必填信息，只能偶尔出现在 speechText，不能堆叠气氛词。",
    "不要直接提“错题”“闯关”“任务”“挑战”“冲刺”这些词。",
    "如果时段是晚上或深夜，降低兴奋度，但仍然保持清楚、自然。",
    gradeHint,
    semesterHint,
    context.displayName ? `昵称是${context.displayName}。` : "昵称未设置。",
    temporalHint,
    visitHint,
    progressStateHint,
    backgroundHint ? `背景参考（不需要说出来，只是让你了解情况）：${backgroundHint}` : "",
    "可接受示例：title“小心心，欢迎回来”，bubbleText“上次停下的第 3 站还亮着，也可以换条路线”。",
    "可接受示例：title“今天想去哪座岛看看”，bubbleText“火山、森林、矿洞和海滩都准备好了”。",
    "可接受示例：title“新路线准备好了”，bubbleText“五年级下册的新路线已经同步到首页”。",
    "可接受 speechText：下午好，小心心。猫头鹰把路线图准备好了，今天想去哪座岛看看？",
    "不可接受示例：欢迎来到最棒的学习之旅，现在立刻开始挑战吧！",
    "不可接受示例：夏末微凉里，下午好，小岛安安静静地在这里陪你。",
    "不可接受示例：今天的学习任务已经排好了，先从错题本开始吧！"
  ].join("\n");
}

async function requestHomeWelcomeFromModel(client, request, textApiMode = "auto") {
  const requestedModel = resolveReviewModel(request.model);
  const response = await requestStructuredOutput({
    client,
    model: requestedModel,
    instructions: buildFocusedHomeWelcomeInstructions(request.context),
    input: buildHomeWelcomeInput(request.context),
    schemaName: "elementary_home_welcome",
    schema: buildHomeWelcomeSchema(),
    textApiMode
  });

  return {
    model: response.model || requestedModel,
    responseId: response.responseId || "",
    parsed: validateHomeWelcomePayload(response.parsed, request.context),
    api: response.api
  };
}

async function generateHomeWelcomeMessage(request = {}) {
  const runtimeConfig = resolveClientRuntimeConfig(request.aiRuntime);

  if (!runtimeConfig.apiKey) {
    throw createServiceError(503, "当前未配置可用的 AI API Key，暂时无法生成首页欢迎语。");
  }

  const normalizedRequest = {
    model: resolveReviewModel(request.model),
    context: normalizeHomeWelcomeContext(request.context)
  };

  const client = createOpenAIClient(runtimeConfig);

  try {
    const response = await requestHomeWelcomeFromModel(client, normalizedRequest, runtimeConfig.textApiMode);
    return {
      message: response.parsed,
      meta: {
        model: response.model,
        responseId: response.responseId,
        source: "model",
        api: response.api
      }
    };
  } catch (error) {
    if (error?.statusCode) {
      throw error;
    }

    const message = error?.message ? `AI 首页欢迎语请求失败：${error.message}` : "AI 首页欢迎语请求失败。";
    throw createServiceError(502, message);
  }
}

module.exports = {
  generateHomeWelcomeMessage,
  setOpenAIHomeWelcomeClientFactoryForTesting
};
