export async function fetchRandomQuestions({
  subject = "",
  grade = "",
  semester = "",
  knowledgeTag = "",
  count = 3,
  difficulty = "",
  allowSemesterFallback = false,
  signal
} = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("count", String(count));

  if (String(subject || "").trim()) {
    searchParams.set("subject", String(subject).trim());
  }

  if (String(grade || "").trim()) {
    searchParams.set("grade", String(grade).trim());
  }

  if (String(semester || "").trim()) {
    searchParams.set("semester", String(semester).trim());
  }

  if (String(knowledgeTag || "").trim()) {
    searchParams.set("knowledgeTag", String(knowledgeTag).trim());
  }

  if (String(difficulty || "").trim()) {
    searchParams.set("difficulty", String(difficulty).trim());
  }

  if (allowSemesterFallback) {
    searchParams.set("allowSemesterFallback", "1");
  }

  const response = await fetch(`/api/questions/random${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, {
    method: "GET",
    signal
  });

  if (!response.ok) {
    throw new Error(`加载题目失败：${response.status}`);
  }

  const payload = await response.json();

  if (!payload?.data || !Array.isArray(payload.data)) {
    throw new Error("题目数据格式不正确。");
  }

  return payload.data;
}

export async function fetchQuestionStats(signal) {
  const response = await fetch("/api/questions/stats", {
    method: "GET",
    signal
  });

  if (!response.ok) {
    throw new Error(`加载题库信息失败：${response.status}`);
  }

  const payload = await response.json();

  if (
    typeof payload?.total !== "number" ||
    !payload?.bySubject ||
    !payload?.byGrade ||
    !payload?.bySemester ||
    !Array.isArray(payload?.topKnowledgeTags)
  ) {
    throw new Error("题库信息格式不正确。");
  }

  return payload;
}

export async function fetchHealthStatus(signal) {
  const response = await fetch("/api/health", {
    method: "GET",
    signal
  });

  if (!response.ok) {
    throw new Error(`服务健康检查失败：${response.status}`);
  }

  const payload = await response.json();

  if (typeof payload?.message !== "string") {
    throw new Error("服务健康检查结果格式不正确。");
  }

  return payload;
}

export async function fetchQuestionCoverage({ targets = [], signal } = {}) {
  const response = await fetch("/api/questions/coverage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      targets
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `加载题量盘点失败：${response.status}`);
  }

  if (!Array.isArray(payload?.data)) {
    throw new Error("题量盘点结果格式不正确。");
  }

  return payload;
}

export async function submitQuestionAnswer({ questionId, selectedOption, signal }) {
  const response = await fetch("/api/questions/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionId,
      selectedOption
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`提交答案失败：${response.status}`);
  }

  const payload = await response.json();

  if (
    typeof payload?.correct !== "boolean" ||
    typeof payload?.correctAnswer !== "string" ||
    typeof payload?.explanation !== "string"
  ) {
    throw new Error("判题结果格式不正确。");
  }

  return payload;
}

export async function generateQuestionReview({
  questionId,
  selectedOption,
  model = "",
  reviewLength = "",
  aiRuntime = null,
  signal
} = {}) {
  const response = await fetch("/api/questions/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionId,
      selectedOption,
      model,
      reviewLength,
      aiRuntime
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `AI 点评失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (!payload?.data || typeof payload?.data?.speechText !== "string") {
    throw new Error("AI 点评结果格式不正确。");
  }

  return payload;
}

export async function testAiRuntimeConnection({
  questionModel = "",
  reviewModel = "",
  ttsModel = "",
  aiRuntime = null,
  signal
} = {}) {
  const response = await fetch("/api/questions/ai/runtime-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionModel,
      reviewModel,
      ttsModel,
      aiRuntime
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `AI 连接测试失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (!payload?.data || !Array.isArray(payload?.data?.tests)) {
    throw new Error("AI 连接测试结果格式不正确。");
  }

  return payload;
}

export async function generateQuizSessionSummary({
  attempts = [],
  score = 0,
  correctCount = 0,
  wrongCount = 0,
  totalQuestions = 0,
  accuracyPercent = 0,
  playMode = "free",
  stageTitle = "",
  model = "",
  reviewLength = "",
  aiRuntime = null,
  signal
} = {}) {
  const response = await fetch("/api/questions/review/summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attempts,
      score,
      correctCount,
      wrongCount,
      totalQuestions,
      accuracyPercent,
      playMode,
      stageTitle,
      model,
      reviewLength,
      aiRuntime
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `AI 学习总结生成失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (!payload?.data || typeof payload?.data?.speechText !== "string") {
    throw new Error("AI 学习总结结果格式不正确。");
  }

  return payload;
}

export async function generateHomeWelcomeMessage({
  context = {},
  model = "",
  aiRuntime = null,
  signal
} = {}) {
  const response = await fetch("/api/questions/review/home-welcome", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      context,
      model,
      aiRuntime
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `AI 首页欢迎语生成失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (!payload?.data || typeof payload?.data?.bubbleText !== "string") {
    throw new Error("AI 首页欢迎语结果格式不正确。");
  }

  return payload;
}

export async function generateQuestionReviewSpeech({
  text,
  model = "",
  voice = "",
  speed,
  audioFormat = "",
  aiRuntime = null,
  signal
} = {}) {
  const response = await fetch("/api/questions/review/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model,
      voice,
      speed,
      audioFormat,
      aiRuntime
    }),
    signal
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message || `点评语音生成失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  return response.blob();
}

function buildAdminHeaders(adminKey, includeJsonContentType = false) {
  const headers = {};

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (String(adminKey || "").trim()) {
    headers["x-admin-key"] = String(adminKey).trim();
  }

  return headers;
}

export async function fetchQuestionCatalog({
  page = 1,
  pageSize = 6,
  subject = "",
  grade = "",
  semester = "",
  knowledgeTag = "",
  difficulty = "",
  query = "",
  adminKey = "",
  signal
} = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  if (String(subject || "").trim()) {
    searchParams.set("subject", String(subject).trim());
  }

  if (String(grade || "").trim()) {
    searchParams.set("grade", String(grade).trim());
  }

  if (String(semester || "").trim()) {
    searchParams.set("semester", String(semester).trim());
  }

  if (String(knowledgeTag || "").trim()) {
    searchParams.set("knowledgeTag", String(knowledgeTag).trim());
  }

  if (String(difficulty || "").trim()) {
    searchParams.set("difficulty", String(difficulty).trim());
  }

  if (String(query || "").trim()) {
    searchParams.set("query", String(query).trim());
  }

  const response = await fetch(`/api/questions?${searchParams.toString()}`, {
    method: "GET",
    headers: buildAdminHeaders(adminKey),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `加载题库列表失败：${response.status}`);
  }

  if (!Array.isArray(payload?.data) || typeof payload?.pagination?.total !== "number") {
    throw new Error("题库列表格式不正确。");
  }

  return payload;
}

export async function previewQuestionImport({ rows, mode = "append", adminKey = "", signal }) {
  const response = await fetch("/api/questions/import/preview", {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify({
      rows,
      mode
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `题库预检失败：${response.status}`);
  }

  if (!payload?.summary || !Array.isArray(payload.rows) || !Array.isArray(payload.validQuestions)) {
    throw new Error("题库预检结果格式不正确。");
  }

  return payload;
}

export async function createQuestion({ question, adminKey = "", signal }) {
  const response = await fetch("/api/questions", {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify(question),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `新增题目失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (!payload?.data || typeof payload?.data?.id !== "number") {
    throw new Error("新增后的题目数据格式不正确。");
  }

  return payload;
}

export async function generateQuestionDraft({
  request,
  adminKey = "",
  signal
} = {}) {
  const response = await fetch("/api/questions/generate", {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify(request || {}),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `AI 出题失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (!payload?.data || !Array.isArray(payload?.drafts)) {
    throw new Error("AI 出题结果格式不正确。");
  }

  return payload;
}

export async function updateQuestion({ questionId, question, adminKey = "", signal }) {
  const response = await fetch(`/api/questions/${questionId}`, {
    method: "PATCH",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify(question),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `更新题目失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (!payload?.data || typeof payload?.data?.id !== "number") {
    throw new Error("更新后的题目数据格式不正确。");
  }

  return payload;
}

export async function deleteQuestion({ questionId, adminKey = "", signal }) {
  const response = await fetch(`/api/questions/${questionId}`, {
    method: "DELETE",
    headers: buildAdminHeaders(adminKey),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `删除题目失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (typeof payload?.deletedId !== "number") {
    throw new Error("删除题目结果格式不正确。");
  }

  return payload;
}

export async function updateQuestionsBatch({ ids, changes, adminKey = "", signal }) {
  const response = await fetch("/api/questions/batch/update", {
    method: "PATCH",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify({
      ids,
      changes
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `批量更新题目失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (typeof payload?.updatedCount !== "number") {
    throw new Error("批量更新结果格式不正确。");
  }

  return payload;
}

export async function deleteQuestionsBatch({ ids, adminKey = "", signal }) {
  const response = await fetch("/api/questions/batch/delete", {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify({
      ids
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `批量删除题目失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (typeof payload?.deletedCount !== "number") {
    throw new Error("批量删除结果格式不正确。");
  }

  return payload;
}

export async function commitQuestionImport({ questions, mode = "append", adminKey = "", signal }) {
  const response = await fetch("/api/questions/import/commit", {
    method: "POST",
    headers: buildAdminHeaders(adminKey, true),
    body: JSON.stringify({
      questions,
      mode
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `题库导入失败：${response.status}`);
    error.details = payload?.details || [];
    throw error;
  }

  if (typeof payload?.importedCount !== "number" || typeof payload?.totalQuestionCount !== "number") {
    throw new Error("题库导入结果格式不正确。");
  }

  return payload;
}
