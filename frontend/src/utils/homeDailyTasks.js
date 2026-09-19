// 首页“今日小任务”的轻量本地进度。
//
// 这里只记录“今天做过什么”，不建立新的任务系统，也不增加后端依赖：
// - 数据结构极简：每个自然日一条快照，日期键变化即自动重置；
// - 只保留今天，跨天读写时顺带把过期快照丢掉；
// - 读写失败都静默降级为空进度，绝不影响首页可用性。
export const HOME_DAILY_TASKS_STORAGE_KEY = "wonder-trivia-island.home.daily-tasks";
export const HOME_DAILY_TASKS_VERSION = 1;

function normalizeDateKey(value) {
  const normalized = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

// 本地日期键：用本地年月日，避免 UTC 跨时区把“今天”算错。
export function getHomeDailyTaskDateKey(date = new Date()) {
  const resolvedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(resolvedDate.getTime())) {
    return getHomeDailyTaskDateKey(new Date());
  }

  const year = resolvedDate.getFullYear();
  const month = `${resolvedDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${resolvedDate.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeIdList(rawValue, limit = 200) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const uniqueIds = [];

  for (const entry of rawValue) {
    const normalizedId = String(entry ?? "").trim();

    if (!normalizedId || uniqueIds.includes(normalizedId)) {
      continue;
    }

    uniqueIds.push(normalizedId);

    if (uniqueIds.length >= limit) {
      break;
    }
  }

  return uniqueIds;
}

export function createEmptyHomeDailyTasks() {
  return {
    stagesCleared: 0,
    reviewedQuestionIds: [],
    completedLessonIds: []
  };
}

export function normalizeHomeDailyTasks(rawTasks = {}) {
  const parsedStages = Number.parseInt(String(rawTasks?.stagesCleared ?? 0), 10);

  return {
    stagesCleared: Number.isFinite(parsedStages) && parsedStages > 0 ? parsedStages : 0,
    reviewedQuestionIds: normalizeIdList(rawTasks?.reviewedQuestionIds),
    completedLessonIds: normalizeIdList(rawTasks?.completedLessonIds)
  };
}

function normalizeHomeDailyTaskStore(rawStore = {}) {
  const dateKey = normalizeDateKey(rawStore?.dateKey);

  if (!dateKey) {
    return null;
  }

  return {
    version: HOME_DAILY_TASKS_VERSION,
    dateKey,
    tasks: normalizeHomeDailyTasks(rawStore?.tasks),
    updatedAt: String(rawStore?.updatedAt ?? "").trim()
  };
}

function safeReadStorage() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(HOME_DAILY_TASKS_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function safeWriteStorage(store) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(HOME_DAILY_TASKS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 存储失败只影响“今日小任务”的进度显示，首页其余部分照常工作。
  }
}

export function readHomeDailyTaskStore() {
  const rawStore = safeReadStorage();

  if (!rawStore) {
    return null;
  }

  try {
    return normalizeHomeDailyTaskStore(JSON.parse(rawStore));
  } catch {
    return null;
  }
}

export function readHomeDailyTasks(referenceDate = new Date()) {
  const store = readHomeDailyTaskStore();

  if (!store || store.dateKey !== getHomeDailyTaskDateKey(referenceDate)) {
    return createEmptyHomeDailyTasks();
  }

  return store.tasks;
}

// 把任务变更收敛成一个入口，调用方只需要给出“今天应该是什么样”。
export function writeHomeDailyTasks(tasks, referenceDate = new Date()) {
  const dateKey = getHomeDailyTaskDateKey(referenceDate);
  const nextStore = {
    version: HOME_DAILY_TASKS_VERSION,
    dateKey,
    tasks: normalizeHomeDailyTasks(tasks),
    updatedAt: new Date().toISOString()
  };

  safeWriteStorage(nextStore);
  return nextStore.tasks;
}

// 所有写入都基于“今天”的既有进度，跨天调用会自动从空进度重新开始。
export function updateHomeDailyTasks(updater, referenceDate = new Date()) {
  const currentTasks = readHomeDailyTasks(referenceDate);
  const nextTasks = typeof updater === "function" ? updater(currentTasks) : updater ?? currentTasks;

  return writeHomeDailyTasks(nextTasks, referenceDate);
}

export function recordHomeDailyTaskStageCleared(referenceDate = new Date()) {
  return updateHomeDailyTasks(
    (currentTasks) => ({
      ...currentTasks,
      stagesCleared: currentTasks.stagesCleared + 1
    }),
    referenceDate
  );
}

export function recordHomeDailyTaskQuestionsReviewed(questionIds = [], referenceDate = new Date()) {
  const nextQuestionIds = normalizeIdList(
    Array.isArray(questionIds) ? questionIds : [questionIds]
  );

  if (nextQuestionIds.length === 0) {
    return readHomeDailyTasks(referenceDate);
  }

  return updateHomeDailyTasks(
    (currentTasks) => ({
      ...currentTasks,
      reviewedQuestionIds: normalizeIdList([...currentTasks.reviewedQuestionIds, ...nextQuestionIds])
    }),
    referenceDate
  );
}

export function recordHomeDailyTaskLessonCompleted(lessonId, referenceDate = new Date()) {
  const normalizedLessonId = String(lessonId ?? "").trim();

  if (!normalizedLessonId) {
    return readHomeDailyTasks(referenceDate);
  }

  return updateHomeDailyTasks(
    (currentTasks) => ({
      ...currentTasks,
      completedLessonIds: normalizeIdList([...currentTasks.completedLessonIds, normalizedLessonId])
    }),
    referenceDate
  );
}

// “温习一道”的口径判断（纯函数，便于直接测）：
// 只有“在错题温习里做完了某一道题”才算——答对、答错、超时都算，
// 因为超时同样会走完整套结算（判题 + 写错题本 + 推进进度），说明这一题确实做过了。
// 普通自由练习 / 闯关不算；没有题目 id 不算；不是今天的作答也不算。
// 去重交给 recordHomeDailyTaskQuestionsReviewed（同一道题当天多次作答只留一条）。
export function resolveReviewedQuestionIdForToday(
  { isWrongBookPractice = false, questionId = "", answeredAt = "" } = {},
  referenceDate = new Date()
) {
  if (!isWrongBookPractice) {
    return "";
  }

  const normalizedQuestionId = String(questionId ?? "").trim();

  if (!normalizedQuestionId) {
    return "";
  }

  if (getHomeDailyTaskDateKey(answeredAt) !== getHomeDailyTaskDateKey(referenceDate)) {
    return "";
  }

  return normalizedQuestionId;
}
