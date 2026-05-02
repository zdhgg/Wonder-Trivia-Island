const TEXT_API_MODE_OPTIONS = Object.freeze(["auto", "responses", "chat-completions"]);
const TTS_AUDIO_FORMAT_OPTIONS = Object.freeze(["mp3", "wav", "pcm16"]);

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

function normalizeRuntimeBaseUrl(value) {
  const normalized = normalizeText(value, 240);

  if (!normalized) {
    return "";
  }

  try {
    const parsedUrl = new URL(normalized);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "";
    }

    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function resolveClientRuntimeConfig(runtime = {}, env = process.env) {
  const normalizedRuntime = runtime && typeof runtime === "object" ? runtime : {};
  const runtimeApiKey = normalizeText(normalizedRuntime.apiKey, 240);
  const runtimeBaseUrl = normalizeRuntimeBaseUrl(normalizedRuntime.baseUrl);
  const normalizedTtsAudioFormat = normalizeText(normalizedRuntime.ttsAudioFormat, 20).toLowerCase();
  const envApiKey = normalizeText(env.OPENAI_API_KEY, 240);
  const envBaseUrl = normalizeRuntimeBaseUrl(env.OPENAI_BASE_URL);
  const usingRuntimeApiKey = Boolean(runtimeApiKey);
  const usingRuntimeBaseUrl = Boolean(runtimeBaseUrl) && usingRuntimeApiKey;

  return {
    providerLabel: normalizeText(normalizedRuntime.providerLabel, 40),
    apiKey: runtimeApiKey || envApiKey,
    baseUrl: usingRuntimeBaseUrl ? runtimeBaseUrl : envBaseUrl,
    textApiMode: TEXT_API_MODE_OPTIONS.includes(normalizeText(normalizedRuntime.textApiMode, 32))
      ? normalizeText(normalizedRuntime.textApiMode, 32)
      : "auto",
    ttsVoice: normalizeText(normalizedRuntime.ttsVoice, 40),
    ttsAudioFormat: TTS_AUDIO_FORMAT_OPTIONS.includes(normalizedTtsAudioFormat) ? normalizedTtsAudioFormat : "",
    usingRuntimeApiKey,
    usingRuntimeBaseUrl
  };
}

module.exports = {
  TEXT_API_MODE_OPTIONS,
  TTS_AUDIO_FORMAT_OPTIONS,
  normalizeText,
  normalizeRuntimeBaseUrl,
  resolveClientRuntimeConfig
};
