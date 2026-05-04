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

function normalizeHomeWelcomeTitle(value, context = {}) {
  return normalizeHomeWelcomeTextWithTime(value, context, HOME_WELCOME_MAX_TITLE_LENGTH);
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
  const timeCueLabel = normalizeInlineText(context.timeCueLabel, 20);
  const monthVibe = normalizeInlineText(context.monthVibe, 20);

  if (displayName && timeCueLabel) {
    return `${timeCueLabel}的小岛在等你，${displayName}`;
  }

  if (monthVibe && timeCueLabel) {
    return `${monthVibe}，${timeCueLabel}的小岛在等你`;
  }

  if (timeCueLabel) {
    return `${timeCueLabel}的小岛在等你`;
  }

  if (displayName) {
    return `欢迎回来，${displayName}`;
  }

  return "欢迎来到奇妙知识岛";
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

function normalizeHomeWelcomeTextWithTime(value, context = {}, maxLength = HOME_WELCOME_MAX_BUBBLE_LENGTH) {
  const normalized = normalizeInlineText(value, maxLength * 3);

  if (!normalized) {
    return "";
  }

  const mentions = resolveTimeMentionCandidates(context);

  if (mentions.some((mention) => normalized.includes(mention))) {
    return normalizeHomeWelcomeLine(normalized, maxLength);
  }

  const prefix = normalizeInlineText(context.timeGreetingLabel, 20) || normalizeInlineText(context.timeCueLabel, 20);
  const prefixed = prefix ? `${prefix}，${normalized}` : normalized;
  return normalizeHomeWelcomeLine(prefixed, maxLength);
}

function validateHomeWelcomePayload(payload = {}, context = {}) {
  const tone = normalizeHomeWelcomeTone(payload.tone);
  const bubbleText = normalizeHomeWelcomeTextWithTime(
    payload.bubbleText || payload.speechText,
    context,
    HOME_WELCOME_MAX_BUBBLE_LENGTH
  );
  const speechText =
    normalizeHomeWelcomeTextWithTime(payload.speechText || bubbleText, context, HOME_WELCOME_MAX_SPEECH_LENGTH) || bubbleText;
  const fallbackTitle = normalizeHomeWelcomeTitle(buildHomeWelcomeFallbackTitle(context), context);
  let title = normalizeHomeWelcomeTitle(payload.title || fallbackTitle, context) || fallbackTitle;

  if (isHomeWelcomeTitleOffStyle(title, context) || isHomeWelcomeTextTooSimilar(title, bubbleText)) {
    title = fallbackTitle;
  }

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

function buildHomeWelcomeInstructions(context) {
  const gradeHint = context.grade ? `当前年级是${context.grade}。` : "年级未知。";
  const semesterHint = context.semester ? `当前学期是${context.semester}。` : "学期未知。";
  const visitHint = context.isProfileJustSaved
    ? "刚保存过学习档案，重点是让孩子感到已经准备好了、可以安心了，像回家一样温暖。"
    : context.isFirstHomeVisitToday
      ? "这是今天第一次进入首页，要像第一次见面那样温暖地打招呼。"
      : "这是普通回访，语气要像老朋友又见面了，自然亲切。";
  const backgroundHint = [
    context.reviewDueCount > 0 ? `有 ${context.reviewDueCount} 题待温习。` : "",
    context.reviewingCount > 0 ? `有 ${context.reviewingCount} 题正在回温中。` : "",
    context.challengeStageLabel ? `闯关停在：${context.challengeStageLabel}。` : ""
  ]
    .filter(Boolean)
    .join(" ");
  const progressStateHint = context.reviewDueCount > 0
    ? "当前更适合写成轻轻提醒型欢迎语：像在说“有几道还惦记着你的小题还在这儿，想先看一眼也行”，但不要制造任务压力。"
    : context.reviewingCount > 0
      ? "当前更适合写成延续陪伴型欢迎语：像在说“上次看到的那几题还在这儿等你，今天接着慢慢来就好”。"
      : context.challengeStageLabel
        ? "当前更适合写成续接路线型欢迎语：像在说“上次停下的那一站还亮着，想接着往前走一点也行”。"
        : "当前更适合写成纯欢迎型欢迎语：重点是安静地欢迎回来，不必特意提进度。";
  const nameHint = context.displayName ? `昵称是${context.displayName}。` : "昵称未设置。";
  const temporalHint = [
    context.timeBand ? `当前时段是${context.timeBand}。` : "",
    context.timeCueLabel ? `当前要显式写出的时段词是：${context.timeCueLabel}。` : "",
    context.timeGreetingLabel ? `可直接使用的时段问候是：${context.timeGreetingLabel}。` : "",
    context.monthLabel ? `当前是${context.monthLabel}。` : "",
    context.monthVibe ? `当前月份的感觉是：${context.monthVibe}。` : "",
    context.seasonLabel ? `当前季节是${context.seasonLabel}。` : "",
    context.schoolYearPhase ? `当前学季阶段是：${context.schoolYearPhase}。` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "你在为小学学习产品首页里的猫头鹰生成一句温馨的欢迎短句。",
    "只输出符合 JSON Schema 的内容，不要输出多余文本。",
    "title 用在首页大标题，bubbleText 用在标题下方的一句欢迎短句，speechText 用于播报。",
    "title 要像首页主标题一样自然醒目，优先 10 到 18 个中文字符，最多不超过 28 个字符。",
    "title 可以带昵称，但不要和 bubbleText 完全一样，也不要只是重复眉标问候。",
    "title 和 bubbleText 不能只差一个称呼或一个短前缀，二者要有明确区分。",
    "title 不要出现“任务、挑战、闯关、冲刺、打卡、立刻、马上”这类有催促感的词。",
    "bubbleText 可以比以前更有内容一些，优先 18 到 32 个中文字符，必要时可以接近 36 个字符。",
    "允许 bubbleText 带一层更明显的个性化，比如自然地叫一声昵称，或者轻轻提到孩子上次停下的位置和节奏感。",
    "如果上下文里有昵称，优先自然带一次昵称，但不要显得刻意，也不要每句都叫昵称。",
    "允许一句话里有两到三个短停顿，不必为了过短而只剩标签式表达。",
    "bubbleText 和 speechText 可以相同，但都必须自然、简短、温暖。",
    "不能编造数据，只能使用上下文里真实存在的信息。",
    "核心目标：让孩子感到被看见、被欢迎，而不是被安排任务。",
    "更像在轻轻说\u300c我在这里陪你\u300d，而不是\u300c你应该做什么\u300d。",
    "整体长度依然要克制，但可以比之前更丰富一点，不必刻意压成非常短的碎句。",
    "低年级更短、更口语、更可爱；高年级更稳、更温柔。",
    "必须显式带上给定的时段词，不要只写月份气氛而省略时段。",
    "时段词要自然嵌入句子，不要只是在最前面机械地补一个问候。",
    "不要像广告，不要像活动文案，不要喊口号。",
    "不要连续感叹，不要使用空泛鼓励词，例如\u201c冲呀\u201d\u201c太棒啦\u201d\u201c一起出发吧\u201d\u201c快来挑战\u201d。",
    "优先使用月份的氛围、学季的阶段感、时段的早晚来营造温暖的气氛。",
    "不同月份要有不同的气息：比如新年伊始的安静、春暖花开的温柔、初夏微风的轻快、盛夏时光的慵懒、秋日新学期的清爽、深秋时节的沉静、冬日暖阳的温暖。",
    "不同学季阶段要有不同的语气：期末临近要温暖安抚、寒暑假里要轻松愉快、新学期开始要温柔鼓励、学期中段要平静陪伴。",
    "可以轻轻提到学习进度，但必须像朋友聊天时顺口一提，不能变成任务清单。",
    "不要直接提\u201c错题\u201d\u201c闯关\u201d\u201c任务\u201d\u201c挑战\u201d\u201c冲刺\u201d这些词。",
    "如果刚保存过档案，表达\u201c已经准备好了\u201d\u201c可以安心了\u201d的感觉。",
    "如果时段是晚上或深夜，语气要更轻更静，像在说\u201c不着急，待一会儿就好\u201d。",
    "尽量让每个年级、每个时段的孩子都觉得猫头鹰只是在等他，不是在催他。",
    gradeHint,
    semesterHint,
    nameHint,
    temporalHint,
    visitHint,
    progressStateHint,
    backgroundHint ? `背景参考（不需要说出来，只是让你了解情况）：${backgroundHint}` : "",
    "可接受示例：新年伊始，小岛安安静静的，进来坐坐吧。",
    "可接受示例：春暖花开的时候，小岛也醒过来了。",
    "可接受示例：初夏微风里，小岛还是老样子。",
    "可接受示例：暑假里也来啦，小岛一直在这儿。",
    "可接受示例：新学期开始了，小岛也跟着亮起来了。",
    "可接受示例：深秋的小岛，安静又温柔。",
    "可接受示例：快期末了，不用慌，慢慢来。",
    "可接受示例：晚上好，小岛的灯还亮着呢，不着急。",
    "可接受示例：傍晚的小岛还亮着，进来坐坐吧。",
    "可接受示例：深夜了，小岛还留着一盏灯。",
    "可接受示例：新的档案已经就位，今天轻轻来就好。",
    "不可接受示例：欢迎来到最棒的学习之旅，现在立刻开始挑战吧！",
    "不可接受示例：错题本里有3题在等你回看！",
    "不可接受示例：启蒙冲线这站还亮着，快去闯关吧！",
    "不可接受示例：今天的学习任务已经排好了，先从错题本开始吧！"
  ].join("\n");
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

async function requestHomeWelcomeFromModel(client, request, textApiMode = "auto") {
  const requestedModel = resolveReviewModel(request.model);
  const response = await requestStructuredOutput({
    client,
    model: requestedModel,
    instructions: buildHomeWelcomeInstructions(request.context),
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
