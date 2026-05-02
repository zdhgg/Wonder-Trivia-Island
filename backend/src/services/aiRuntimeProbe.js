const OpenAI = require("openai");
const { requestStructuredOutput } = require("./openAiStructuredOutput");
const { createMimoTtsAudio, isMimoCompatRuntime, isMimoTtsModel } = require("./mimoTtsCompat");
const { normalizeText, resolveClientRuntimeConfig } = require("./aiRuntimeConfig");

const DEFAULT_TEXT_MODEL = "gpt-5.4-mini";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "coral";

let openAIProbeClientFactory = null;

function createServiceError(statusCode, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = Array.isArray(details) ? details : [];
  return error;
}

function setOpenAIProbeClientFactoryForTesting(factory) {
  openAIProbeClientFactory = typeof factory === "function" ? factory : null;
}

function createOpenAIClient(runtimeConfig = {}) {
  if (openAIProbeClientFactory) {
    return openAIProbeClientFactory(runtimeConfig);
  }

  return new OpenAI({
    apiKey: runtimeConfig.apiKey,
    baseURL: runtimeConfig.baseUrl || undefined
  });
}

function resolveTextProbeModel(value, envKey) {
  return normalizeText(value, 120) || normalizeText(process.env[envKey], 120) || DEFAULT_TEXT_MODEL;
}

function resolveTtsProbeModel(value) {
  return normalizeText(value, 120) || normalizeText(process.env.OPENAI_TTS_MODEL, 120) || DEFAULT_TTS_MODEL;
}

function buildProbeSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      status: {
        type: "string"
      }
    },
    required: ["status"]
  };
}

function buildProviderSummary(runtimeConfig) {
  if (runtimeConfig.providerLabel) {
    return runtimeConfig.providerLabel;
  }

  if (runtimeConfig.baseUrl) {
    return runtimeConfig.baseUrl;
  }

  return "服务端默认";
}

function createSuccessResult(key, label, type, model, detail, extra = {}) {
  return {
    key,
    label,
    type,
    ok: true,
    status: "ok",
    model,
    detail,
    ...extra
  };
}

function createErrorResult(key, label, type, model, error) {
  return {
    key,
    label,
    type,
    ok: false,
    status: "error",
    model,
    detail: error?.message ? normalizeText(error.message, 200) : "连接失败。"
  };
}

async function probeTextModel(client, { key, label, model, textApiMode = "auto" }) {
  try {
    const response = await requestStructuredOutput({
      client,
      model,
      instructions: "这是系统连接测试。请严格返回 JSON，不要展开解释。",
      input: "请返回 status=ok。",
      schemaName: "ai_runtime_probe",
      schema: buildProbeSchema(),
      textApiMode
    });

    return createSuccessResult(key, label, response.api || "responses", response.model || model, `${response.api === "chat.completions" ? "Chat Completions" : "Responses"} API 可用。`, {
      responseId: response.responseId || ""
    });
  } catch (error) {
    return createErrorResult(key, label, "responses", model, error);
  }
}

async function probeTtsModel(client, { key, label, model, runtimeConfig = {} }) {
  try {
    const audioResult =
      isMimoCompatRuntime(runtimeConfig) && isMimoTtsModel(model)
        ? await createMimoTtsAudio(client, {
            model,
            text: "连接测试",
            voice: runtimeConfig.ttsVoice || "Chloe",
            instructions: "Warm, clear, natural tone.",
            format: runtimeConfig.ttsAudioFormat || "wav"
          })
        : {
            buffer: Buffer.from(
              await (
                await client.audio.speech.create({
                  model,
                  voice: runtimeConfig.ttsVoice || DEFAULT_TTS_VOICE,
                  input: "连接测试",
                  response_format: runtimeConfig.ttsAudioFormat === "wav" ? "wav" : "mp3",
                  speed: 1
                })
              ).arrayBuffer()
            ),
            format: runtimeConfig.ttsAudioFormat === "wav" ? "wav" : "mp3"
          };

    const audioBuffer = audioResult.buffer;

    if (!audioBuffer.byteLength) {
      throw new Error("语音接口返回了空内容。");
    }

    return createSuccessResult(
      key,
      label,
      isMimoCompatRuntime(runtimeConfig) && isMimoTtsModel(model) ? "chat.completions.audio" : "tts",
      model,
      `语音接口可用，返回 ${audioBuffer.byteLength} 字节。`,
      {
        audioFormat: audioResult.format
      }
    );
  } catch (error) {
    return createErrorResult(key, label, "tts", model, error);
  }
}

async function probeAiRuntimeConnection({
  aiRuntime,
  questionModel,
  reviewModel,
  ttsModel
} = {}) {
  const runtimeConfig = resolveClientRuntimeConfig(aiRuntime);

  if (!runtimeConfig.apiKey) {
    throw createServiceError(503, "当前未配置可用的 AI API Key，暂时无法测试连接。");
  }

  const client = createOpenAIClient(runtimeConfig);
  const resolvedQuestionModel = resolveTextProbeModel(questionModel, "OPENAI_QUESTION_MODEL");
  const resolvedReviewModel = resolveTextProbeModel(reviewModel, "OPENAI_REVIEW_MODEL");
  const resolvedTtsModel = resolveTtsProbeModel(ttsModel);

  const tests = [
    await probeTextModel(client, {
      key: "questionModel",
      label: "出题模型",
      model: resolvedQuestionModel,
      textApiMode: runtimeConfig.textApiMode
    }),
    await probeTextModel(client, {
      key: "reviewModel",
      label: "点评模型",
      model: resolvedReviewModel,
      textApiMode: runtimeConfig.textApiMode
    }),
    await probeTtsModel(client, {
      key: "ttsModel",
      label: "语音模型",
      model: resolvedTtsModel,
      runtimeConfig
    })
  ];

  return {
    checkedAt: new Date().toISOString(),
    provider: {
      label: buildProviderSummary(runtimeConfig),
      baseUrl: runtimeConfig.baseUrl,
      authSource: runtimeConfig.usingRuntimeApiKey ? "runtime" : "server-env",
      endpointSource: runtimeConfig.usingRuntimeBaseUrl ? "runtime" : "server-env"
    },
    allPassed: tests.every((item) => item.ok),
    tests
  };
}

module.exports = {
  probeAiRuntimeConnection,
  setOpenAIProbeClientFactoryForTesting
};
