import { beforeEach, describe, expect, it } from "vitest";
import {
  HOME_DAILY_TASKS_STORAGE_KEY,
  createEmptyHomeDailyTasks,
  getHomeDailyTaskDateKey,
  normalizeHomeDailyTasks,
  readHomeDailyTasks,
  recordHomeDailyTaskLessonCompleted,
  recordHomeDailyTaskQuestionsReviewed,
  recordHomeDailyTaskStageCleared,
  writeHomeDailyTasks
} from "./homeDailyTasks.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

describe("homeDailyTasks", () => {
  beforeEach(() => {
    globalThis.window = { localStorage: createMemoryStorage() };
  });

  it("生成稳定的本地日期键", () => {
    expect(getHomeDailyTaskDateKey(new Date(2026, 4, 1, 23, 30))).toBe("2026-05-01");
    expect(getHomeDailyTaskDateKey("2026-12-31T10:00:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("没有存储时返回空进度", () => {
    expect(readHomeDailyTasks(new Date(2026, 4, 1))).toEqual(createEmptyHomeDailyTasks());
  });

  it("同一自然日内累加闯关、错题和知识学习进度", () => {
    const today = new Date(2026, 4, 1, 10, 0);

    recordHomeDailyTaskStageCleared(today);
    recordHomeDailyTaskStageCleared(today);
    recordHomeDailyTaskQuestionsReviewed([11, 12, 12], today);
    recordHomeDailyTaskLessonCompleted("g2-math-lesson-1", today);

    const tasks = readHomeDailyTasks(today);

    expect(tasks.stagesCleared).toBe(2);
    expect(tasks.reviewedQuestionIds).toEqual(["11", "12"]);
    expect(tasks.completedLessonIds).toEqual(["g2-math-lesson-1"]);
  });

  it("空 id 不会写进进度", () => {
    const today = new Date(2026, 4, 1, 10, 0);

    recordHomeDailyTaskQuestionsReviewed([], today);
    recordHomeDailyTaskLessonCompleted("   ", today);

    expect(readHomeDailyTasks(today)).toEqual(createEmptyHomeDailyTasks());
  });

  it("跨天后自动从空进度开始（日期隔离）", () => {
    const dayOne = new Date(2026, 4, 1, 22, 0);
    const dayTwo = new Date(2026, 4, 2, 8, 0);

    recordHomeDailyTaskStageCleared(dayOne);
    expect(readHomeDailyTasks(dayOne).stagesCleared).toBe(1);

    expect(readHomeDailyTasks(dayTwo)).toEqual(createEmptyHomeDailyTasks());

    recordHomeDailyTaskStageCleared(dayTwo);
    expect(readHomeDailyTasks(dayTwo).stagesCleared).toBe(1);
    expect(readHomeDailyTasks(dayOne).stagesCleared).toBe(0);
  });

  it("写入时覆盖旧的一天的快照，只保留今天", () => {
    writeHomeDailyTasks({ stagesCleared: 3 }, new Date(2026, 4, 1));

    const rawStore = JSON.parse(globalThis.window.localStorage.getItem(HOME_DAILY_TASKS_STORAGE_KEY));

    expect(rawStore.dateKey).toBe("2026-05-01");
    expect(rawStore.tasks.stagesCleared).toBe(3);
  });

  it("损坏或非法数据不会让首页崩掉", () => {
    globalThis.window.localStorage.setItem(HOME_DAILY_TASKS_STORAGE_KEY, "{不是 JSON");

    expect(readHomeDailyTasks(new Date(2026, 4, 1))).toEqual(createEmptyHomeDailyTasks());

    globalThis.window.localStorage.setItem(
      HOME_DAILY_TASKS_STORAGE_KEY,
      JSON.stringify({ version: 1, dateKey: "2026-05-01", tasks: { stagesCleared: -5, reviewedQuestionIds: "x" } })
    );

    expect(readHomeDailyTasks(new Date(2026, 4, 1))).toEqual({
      stagesCleared: 0,
      reviewedQuestionIds: [],
      completedLessonIds: []
    });
  });

  it("normalize 会过滤重复和空白 id", () => {
    expect(
      normalizeHomeDailyTasks({
        stagesCleared: "2",
        reviewedQuestionIds: [" 7 ", "7", "", null, 8],
        completedLessonIds: ["a", "a", "b"]
      })
    ).toEqual({
      stagesCleared: 2,
      reviewedQuestionIds: ["7", "8"],
      completedLessonIds: ["a", "b"]
    });
  });
});
