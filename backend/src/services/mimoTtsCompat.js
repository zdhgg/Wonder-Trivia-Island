function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").trim();

  if (maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function isMimoCompatRuntime(runtime = {}) {
  const providerLabel = normalizeText(runtime.providerLabel, 80).toLowerCase();
  const baseUrl = normalizeText(runtime.baseUrl, 240).toLowerCase();

  return providerLabel.includes("mimo") || providerLabel.includes("xiaomi") || baseUrl.includes("xiaomimimo.com");
}

function isMimoTtsModel(model = "") {
  return normalizeText(model, 120).toLowerCase().includes("mimo") && normalizeText(model, 120).toLowerCase().includes("tts");
}

function resolveMimoVoice(voice = "") {
  const normalizedVoice = normalizeText(voice, 40);

  if (normalizedVoice && normalizedVoice.toLowerCase() !== "coral") {
    return normalizedVoice;
  }

  return "Chloe";
}

function resolveMimoAudioFormat(format = "") {
  const normalizedFormat = normalizeText(format, 20).toLowerCase();

  if (["wav", "pcm16"].includes(normalizedFormat)) {
    return normalizedFormat;
  }

  return "wav";
}

function buildMimoTtsMessages(text = "", instructions = "") {
  const normalizedInstructions = normalizeText(instructions, 400);
  const normalizedText = normalizeText(text, 1200);

  return [
    {
      role: "user",
      content: normalizedInstructions || "Warm, clear, natural Mandarin Chinese delivery with a gentle teacher-like tone."
    },
    {
      role: "assistant",
      content: normalizedText
    }
  ];
}

async function createMimoTtsAudio(client, { model, text, voice, instructions, format = "wav", stream = false } = {}) {
  const resolvedFormat = resolveMimoAudioFormat(format);
  const completion = await client.chat.completions.create({
    model,
    messages: buildMimoTtsMessages(text, instructions),
    audio: {
      format: resolvedFormat,
      voice: resolveMimoVoice(voice)
    },
    ...(stream ? { stream: true } : {})
  });

  if (stream) {
    throw new Error("当前未实现 MiMo TTS 流式兼容。");
  }

  const audioBase64 = completion?.choices?.[0]?.message?.audio?.data || "";

  if (!audioBase64) {
    throw new Error("MiMo TTS 未返回音频数据。");
  }

  return {
    buffer: Buffer.from(audioBase64, "base64"),
    format: resolvedFormat
  };
}

module.exports = {
  isMimoCompatRuntime,
  isMimoTtsModel,
  createMimoTtsAudio,
  resolveMimoVoice,
  resolveMimoAudioFormat
};
