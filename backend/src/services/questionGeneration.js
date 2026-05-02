const OpenAI = require("openai");
const { ALLOWED_TYPES, MAX_KNOWLEDGE_TAG_LENGTH } = require("../questions/repository");
const { validatePreparedQuestion } = require("./questionImport");
const { requestStructuredOutput } = require("./openAiStructuredOutput");
const { normalizeText, resolveClientRuntimeConfig } = require("./aiRuntimeConfig");

const DEFAULT_MODEL = "gpt-5.4-mini";
const OPTION_KEYS = ["A", "B", "C", "D"];
const MAX_GENERATION_ATTEMPTS = 2;

let openAIClientFactory = null;

function createServiceError(statusCode, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = Array.isArray(details) ? details : [];
  return error;
}

function setOpenAIClientFactoryForTesting(factory) {
  openAIClientFactory = typeof factory === "function" ? factory : null;
}

function createOpenAIClient(runtimeConfig = {}) {
  if (openAIClientFactory) {
    return openAIClientFactory(runtimeConfig);
  }

  return new OpenAI({
    apiKey: runtimeConfig.apiKey,
    baseURL: runtimeConfig.baseUrl || undefined
  });
}

function resolveRequestedModel(model) {
  return (
    normalizeText(model, 120) ||
    normalizeText(process.env.OPENAI_QUESTION_MODEL, 120) ||
    DEFAULT_MODEL
  );
}

function getSourceMode({ topic, guidance, referenceText }) {
  if (referenceText) {
    return "reference";
  }

  if (topic || guidance) {
    return "prompt";
  }

  return "evergreen";
}

function buildQuestionSchema({ subject, grade, semester, knowledgeTag, difficulty, count }) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: {
              type: "string",
              enum: [subject]
            },
            grade: {
              type: "string",
              enum: [grade]
            },
            semester: {
              type: "string",
              enum: [semester]
            },
            knowledgeTag: {
              type: "string",
              enum: [knowledgeTag || ""]
            },
            type: {
              type: "string",
              enum: ALLOWED_TYPES
            },
            content: {
              type: "string"
            },
            options: {
              type: "array",
              minItems: OPTION_KEYS.length,
              maxItems: OPTION_KEYS.length,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  key: {
                    type: "string",
                    enum: OPTION_KEYS
                  },
                  text: {
                    type: "string"
                  }
                },
                required: ["key", "text"]
              }
            },
            answer: {
              type: "string",
              enum: OPTION_KEYS
            },
            explanation: {
              type: "string"
            },
            difficulty: {
              type: "integer",
              enum: [difficulty]
            }
          },
          required: ["subject", "grade", "semester", "knowledgeTag", "type", "content", "options", "answer", "explanation", "difficulty"]
        }
      }
    },
    required: ["questions"]
  };
}

function buildGenerationInstructions(request, repairIssues = []) {
  const issueBlock =
    repairIssues.length > 0
      ? `\n上一次结果存在这些问题，请本次修正：\n- ${repairIssues.join("\n- ")}`
      : "";

  return [
    "你是小学题库编辑助手，负责生成适合小学生的四选一选择题。",
    "你的输出会直接进入系统校验，因此必须严格遵守结构和教学边界。",
    `请只从以下题型中选择最贴切的一项：${ALLOWED_TYPES.join("、")}。`,
    "所有题目必须使用简体中文；如果学科是英语，题干或选项可包含必要英文，但解释仍使用中文。",
    "题目必须只有一个明确正确答案，且四个选项内容不能重复。",
    "解析要简洁、适龄、可直接展示给小学生或家长。",
    "不要生成带有暴力、成人化、政治争议、医疗建议或不适龄信息的内容。",
    "如果用户提供了参考材料，只能使用参考材料明确支持的信息，不要自行补充未经提供的最新事实。",
    "如果用户没有提供参考材料，但需求看起来带有时效性，也不要假装掌握最新事实。优先改写成稳定、通用、不会过时的题目。",
    issueBlock
  ]
    .filter(Boolean)
    .join("\n");
}

function buildGenerationInput(request, repairIssues = []) {
  const today = new Date().toISOString().slice(0, 10);
  const sourceMode = getSourceMode(request);
  const sections = [
    `今天日期：${today}`,
    `请生成 ${request.count} 道题。`,
    `学科：${request.subject}`,
    `年级：${request.grade}`,
    `学期：${request.semester}`,
    `能力标签：${request.knowledgeTag || "无"}`,
    `难度：${request.difficulty}`,
    `生成模式：${sourceMode}`
  ];

  if (request.topic) {
    sections.push(`主题：${request.topic}`);
  }

  if (request.guidance) {
    sections.push(`补充要求：${request.guidance}`);
  }

  if (request.referenceText) {
    sections.push(`参考材料：\n${request.referenceText}`);
  }

  if (!request.referenceText) {
    sections.push("如果需要涉及节日、季节、校园生活等场景，请优先使用常识型、稳定型表述。");
  }

  if (repairIssues.length > 0) {
    sections.push(`请修正这些问题：\n- ${repairIssues.join("\n- ")}`);
  }

  return sections.join("\n\n");
}

function buildOptionTextSet(question) {
  return new Set(
    (Array.isArray(question.options) ? question.options : []).map((option) =>
      normalizeText(option?.text).toLocaleLowerCase("zh-Hans-CN")
    )
  );
}

function validateGeneratedQuestions(rawQuestions, expectedCount) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length !== expectedCount) {
    return {
      questions: [],
      issues: [`AI 返回的题目数量不正确，预期 ${expectedCount} 道，实际 ${Array.isArray(rawQuestions) ? rawQuestions.length : 0} 道。`]
    };
  }

  const questions = [];
  const issues = [];

  rawQuestions.forEach((rawQuestion, index) => {
    const validationResult = validatePreparedQuestion(rawQuestion, `AI 草稿 ${index + 1}`);

    if (validationResult.issues.length > 0) {
      issues.push(...validationResult.issues);
      return;
    }

    const normalizedQuestion = validationResult.question;
    const optionTextSet = buildOptionTextSet(normalizedQuestion);

    if (optionTextSet.size !== OPTION_KEYS.length) {
      issues.push(`AI 草稿 ${index + 1} 的选项内容有重复。`);
      return;
    }

    const optionKeys = normalizedQuestion.options.map((option) => option.key);

    if (optionKeys.join(",") !== OPTION_KEYS.join(",")) {
      issues.push(`AI 草稿 ${index + 1} 的选项顺序必须是 A、B、C、D。`);
      return;
    }

    questions.push(normalizedQuestion);
  });

  return {
    questions,
    issues
  };
}

async function requestDraftsFromModel(client, request, repairIssues = [], textApiMode = "auto") {
  const requestedModel = resolveRequestedModel(request.model);
  const response = await requestStructuredOutput({
    client,
    model: requestedModel,
    instructions: buildGenerationInstructions(request, repairIssues),
    input: buildGenerationInput(request, repairIssues),
    schemaName: "elementary_question_drafts",
    schema: buildQuestionSchema(request),
    textApiMode
  });

  return {
    model: response.model || requestedModel,
    responseId: response.responseId || "",
    parsed: response.parsed,
    api: response.api
  };
}

async function generateQuestionDrafts(request) {
  const runtimeConfig = resolveClientRuntimeConfig(request.aiRuntime);

  if (!runtimeConfig.apiKey) {
    throw createServiceError(503, "当前未配置可用的 AI API Key，暂时无法使用 AI 出题。");
  }

  const normalizedRequest = {
    subject: normalizeText(request.subject, 20),
    grade: normalizeText(request.grade, 20),
    semester: normalizeText(request.semester, 20),
    knowledgeTag: normalizeText(request.knowledgeTag, MAX_KNOWLEDGE_TAG_LENGTH),
    difficulty: Number.parseInt(request.difficulty, 10),
    count: Number.parseInt(request.count, 10),
    model: resolveRequestedModel(request.model),
    topic: normalizeText(request.topic, 120),
    guidance: normalizeText(request.guidance, 600),
    referenceText: normalizeText(request.referenceText, 6000)
  };
  const client = createOpenAIClient(runtimeConfig);
  let lastIssues = [];
  let lastMeta = {
    model: normalizedRequest.model,
    responseId: ""
  };

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    let modelResponse;

    try {
      modelResponse = await requestDraftsFromModel(client, normalizedRequest, lastIssues, runtimeConfig.textApiMode);
    } catch (error) {
      const message = error?.message ? `AI 出题请求失败：${error.message}` : "AI 出题请求失败。";
      throw createServiceError(502, message);
    }

    lastMeta = {
      model: modelResponse.model,
      responseId: modelResponse.responseId
    };

    const validationResult = validateGeneratedQuestions(modelResponse.parsed?.questions, normalizedRequest.count);

    if (validationResult.issues.length === 0) {
      return {
        questions: validationResult.questions,
        meta: {
          ...lastMeta,
          api: modelResponse.api,
          sourceMode: getSourceMode(normalizedRequest),
          attempt
        }
      };
    }

    lastIssues = validationResult.issues.slice(0, 8);
  }

  throw createServiceError(502, "AI 生成的题目未通过系统校验，请调整要求后重试。", lastIssues);
}

module.exports = {
  DEFAULT_MODEL,
  generateQuestionDrafts,
  setOpenAIClientFactoryForTesting
};
