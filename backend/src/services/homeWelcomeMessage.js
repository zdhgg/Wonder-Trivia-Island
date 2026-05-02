const OpenAI = require("openai");
const { requestStructuredOutput } = require("./openAiStructuredOutput");
const { normalizeText, resolveClientRuntimeConfig } = require("./aiRuntimeConfig");

const DEFAULT_REVIEW_MODEL = "gpt-5.4-mini";
const HOME_WELCOME_TONE_OPTIONS = ["warm", "steady", "playful"];
const HOME_WELCOME_MAX_BUBBLE_LENGTH = 28;
const HOME_WELCOME_MAX_SPEECH_LENGTH = 80;

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

function createOpenAIClient(runtimeConfig = {}) {
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
    monthLabel: normalizeInlineText(context.monthLabel, 20),
    seasonLabel: normalizeInlineText(context.seasonLabel, 20),
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

function validateHomeWelcomePayload(payload = {}) {
  const tone = normalizeHomeWelcomeTone(payload.tone);
  const bubbleText = normalizeHomeWelcomeLine(payload.bubbleText || payload.speechText, HOME_WELCOME_MAX_BUBBLE_LENGTH);
  const speechText = normalizeHomeWelcomeLine(payload.speechText || bubbleText, HOME_WELCOME_MAX_SPEECH_LENGTH) || bubbleText;

  if (!bubbleText || !speechText) {
    throw createServiceError(502, "AI 首页欢迎语结果不完整。");
  }

  return {
    tone,
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
  const modeHint =
    context.recommendedMode === "review"
      ? "首页应该偏向回看错题。"
      : context.recommendedMode === "challenge"
        ? "首页应该偏向继续闯关。"
        : context.recommendedMode === "grade"
          ? "首页应该偏向年级同步。"
          : context.recommendedMode === "subject"
            ? "首页应该偏向科目专项。"
            : "首页应该给出一个轻柔的开始方向。";
  const contextHint = context.isProfileJustSaved
    ? "刚保存过学习档案，语气要像欢迎回家。"
    : context.isFirstHomeVisitToday
      ? "这是今天第一次进入首页。"
      : "这是普通回访。";
  const reviewHint = context.reviewDueCount > 0
    ? `有 ${context.reviewDueCount} 题待温习，回看错题要自然。`
    : "没有必须强调的错题数量。";
  const challengeHint = context.challengeStageLabel ? `当前闯关提示是：${context.challengeStageLabel}。` : "暂无闯关进度可强调。";
  const nameHint = context.displayName ? `昵称是${context.displayName}。` : "昵称未设置。";
  const temporalHint = [
    context.timeBand ? `当前时段是${context.timeBand}。` : "",
    context.monthLabel ? `当前月份提示是${context.monthLabel}。` : "",
    context.seasonLabel ? `当前季节提示是${context.seasonLabel}。` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "你在为小学学习产品首页里的猫头鹰生成一句欢迎短句。",
    "只输出符合 JSON Schema 的内容，不要输出多余文本。",
    "bubbleText 和 speechText 可以相同，但都必须自然、简短、像老师轻声提醒。",
    "不能编造数据，只能使用上下文里真实存在的信息。",
    "不要同时提出两个行动，只建议一个最合适的方向。",
    "长度优先控制在 12 到 24 个中文字符，最多不超过 28 个字符。",
    "低年级更短、更口语；高年级更稳、更克制。",
    "语气要像小学老师在首页轻轻接住孩子，不要像广告，不要像活动文案，不要喊口号。",
    "更像在描述当前状态、轻轻陪着孩子，而不是给用户下指令、排任务。",
    "不要连续感叹，不要使用空泛鼓励词，例如“冲呀”“太棒啦”“一起出发吧”“快来挑战”。",
    "不要总是使用同一种句式，尤其避免每次都写成“先……再……”。可以有时先说状态，有时再轻轻点一句方向。",
    "如果时段、月份或季节信息自然合适，可以轻轻带上一点，但不要变成报时或念日历。",
    "如果上下文里有闯关提示，优先自然提一句当前这站，不要机械重复完整标签。",
    "如果上下文里有待温习题目，可以轻轻提错题本，但不要把数字念得太重。",
    "如果刚保存过档案，优先表达“已经准备好”或“已经放到首页”，不要再解释设置流程。",
    gradeHint,
    semesterHint,
    modeHint,
    contextHint,
    reviewHint,
    challengeHint,
    nameHint,
    temporalHint,
    "可接受示例：今天可以从启蒙冲线继续往前走。",
    "可接受示例：错题本里有几题在等你回看。",
    "可接受示例：启蒙冲线这条线，还在前面等你。",
    "可接受示例：今天的小岛已经准备好，先挑一站开始。",
    "可接受示例：回温中的几题还亮着，慢慢来就好。",
    "可接受示例：五月的小岛已经准备好，慢慢来就行。",
    "不可接受示例：欢迎来到最棒的学习之旅，现在立刻开始挑战吧！"
  ].join("\n");
}

function buildHomeWelcomeInput(context) {
  return [
    `昵称：${context.displayName || "未设置"}`,
    `年级：${context.grade || "未设置"}`,
    `学期：${context.semester || "未设置"}`,
    `推荐入口：${context.recommendedMode}`,
    `闯关提示：${context.challengeStageLabel || "无"}`,
    `今日到期：${context.reviewDueCount}`,
    `回温中：${context.reviewingCount}`,
    `时段：${context.timeBand || "无"}`,
    `月份：${context.monthLabel || "无"}`,
    `季节：${context.seasonLabel || "无"}`,
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
    parsed: validateHomeWelcomePayload(response.parsed),
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
  generateHomeWelcomeMessage
};
