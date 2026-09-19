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
  resolveReviewedQuestionIdForToday,
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

describe("homeDailyTasks · 错题温习口径", () => {
  const today = new Date(2026, 4, 1, 10, 0);
  const todayIso = new Date(2026, 4, 1, 10, 0).toISOString();
  const yesterdayIso = new Date(2026, 3, 30, 10, 0).toISOString();

  beforeEach(() => {
    globalThis.window = { localStorage: createMemoryStorage() };
  });

  it("错题温习答对算温习一道", () => {
    const questionId = resolveReviewedQuestionIdForToday(
      { isWrongBookPractice: true, questionId: 42, answeredAt: todayIso, isCorrect: true },
      today
    );

    expect(questionId).toBe("42");

    recordHomeDailyTaskQuestionsReviewed([questionId], today);
    expect(readHomeDailyTasks(today).reviewedQuestionIds).toEqual(["42"]);
  });

  it("错题温习答错也算温习一道", () => {
    const questionId = resolveReviewedQuestionIdForToday(
      { isWrongBookPractice: true, questionId: 42, answeredAt: todayIso, isCorrect: false },
      today
    );

    expect(questionId).toBe("42");
    expect(readHomeDailyTasks(today).reviewedQuestionIds).toEqual([]);

    recordHomeDailyTaskQuestionsReviewed([questionId], today);
    expect(readHomeDailyTasks(today).reviewedQuestionIds).toEqual(["42"]);
  });

  it("错题温习超时同样算做过了这一题", () => {
    const questionId = resolveReviewedQuestionIdForToday(
      { isWrongBookPractice: true, questionId: 42, answeredAt: todayIso, isCorrect: false, isTimeout: true },
      today
    );

    expect(questionId).toBe("42");
  });

  it("同一道错题当天重复作答只计一次", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const questionId = resolveReviewedQuestionIdForToday(
        { isWrongBookPractice: true, questionId: 42, answeredAt: todayIso },
        today
      );

      recordHomeDailyTaskQuestionsReviewed([questionId], today);
    }

    expect(readHomeDailyTasks(today).reviewedQuestionIds).toEqual(["42"]);
  });

  it("普通自由练习 / 闯关不计入错题温习任务", () => {
    expect(
      resolveReviewedQuestionIdForToday(
        { isWrongBookPractice: false, questionId: 42, answeredAt: todayIso },
        today
      )
    ).toBe("");

    expect(
      resolveReviewedQuestionIdForToday(
        { isWrongBookPractice: true, questionId: "", answeredAt: todayIso },
        today
      )
    ).toBe("");
  });

  it("不是今天的作答不会写进今天的进度", () => {
    expect(
      resolveReviewedQuestionIdForToday(
        { isWrongBookPractice: true, questionId: 42, answeredAt: yesterdayIso },
        today
      )
    ).toBe("");
  });

  it("次日重新开始：昨天的温习进度不会带到今天", () => {
    const dayOne = new Date(2026, 4, 1, 21, 0);
    const dayTwo = new Date(2026, 4, 2, 9, 0);

    recordHomeDailyTaskQuestionsReviewed(["42", "43"], dayOne);
    expect(readHomeDailyTasks(dayOne).reviewedQuestionIds).toEqual(["42", "43"]);

    // 新的一天从空进度开始，昨天的题不会算进今天。
    expect(readHomeDailyTasks(dayTwo).reviewedQuestionIds).toEqual([]);

    recordHomeDailyTaskQuestionsReviewed(["42"], dayTwo);
    expect(readHomeDailyTasks(dayTwo).reviewedQuestionIds).toEqual(["42"]);

    // 只保留今天这一份快照：昨天写完今天的进度后，昨天的数据不再被读回来，
    // 因此 dayOne 读到的是“空”，而不是把两天的进度混在一起。
    expect(readHomeDailyTasks(dayOne).reviewedQuestionIds).toEqual([]);
  });

  it("写日进度只动自己的 key，不碰错题本等其它本地数据", () => {
    const studyRecordBook = JSON.stringify({
      questionRecords: { 42: { questionId: 42, wrongCount: 1, reviewCorrectStreak: 1 } },
      updatedAt: todayIso
    });

    globalThis.window.localStorage.setItem("wonder-trivia-island.study.record-book", studyRecordBook);

    recordHomeDailyTaskQuestionsReviewed(["42", "43"], today);

    // 错题本原封不动，掌握度逻辑不受首页日任务影响。
    expect(globalThis.window.localStorage.getItem("wonder-trivia-island.study.record-book")).toBe(studyRecordBook);
    expect(readHomeDailyTasks(today).reviewedQuestionIds).toEqual(["42", "43"]);
  });
});
