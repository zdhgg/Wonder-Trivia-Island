function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").trim();

  if (maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function isEndpointCompatibilityError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  const message = normalizeText(error?.message, 400).toLowerCase();

  if (status === 404 || status === 405) {
    return true;
  }

  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("unknown url") ||
    message.includes("/responses") ||
    message.includes("responses api")
  );
}

function extractChatMessageContent(message = {}) {
  const rawContent = message?.content;

  if (typeof rawContent === "string") {
    return normalizeText(rawContent);
  }

  if (!Array.isArray(rawContent)) {
    return "";
  }

  return normalizeText(
    rawContent
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (!item || typeof item !== "object") {
          return "";
        }

        return item.text || item.content || "";
      })
      .filter(Boolean)
      .join("\n")
  );
}

function parseJsonFromText(rawText = "") {
  const normalized = normalizeText(rawText);

  if (!normalized) {
    throw new Error("兼容模式下未返回可解析内容。");
  }

  const withoutFence = normalized.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");

    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(withoutFence.slice(objectStart, objectEnd + 1));
    }

    throw new Error("兼容模式返回了非 JSON 内容。");
  }
}

function buildCompatInstructions(instructions = "", schema = {}) {
  return [
    normalizeText(instructions),
    "你必须只返回一个合法 JSON 对象，不要输出 markdown，不要输出代码块，不要补充解释。",
    `返回内容必须符合这个 JSON Schema：${JSON.stringify(schema)}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function requestStructuredOutput({
  client,
  model,
  instructions,
  input,
  schema,
  schemaName,
  textApiMode = "auto"
} = {}) {
  if (textApiMode !== "chat-completions") {
    try {
      const response = await client.responses.parse({
        model,
        instructions,
        input,
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema
          }
        }
      });

      return {
        api: "responses",
        model: response.model || model,
        responseId: response.id || "",
        parsed: response.output_parsed
      };
    } catch (error) {
      if (textApiMode === "responses" || !isEndpointCompatibilityError(error)) {
        throw error;
      }
    }
  }

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: buildCompatInstructions(instructions, schema)
      },
      {
        role: "user",
        content: normalizeText(input)
      }
    ]
  });

  return {
    api: "chat.completions",
    model: completion.model || model,
    responseId: completion.id || "",
    parsed: parseJsonFromText(extractChatMessageContent(completion?.choices?.[0]?.message))
  };
}

module.exports = {
  requestStructuredOutput
};
