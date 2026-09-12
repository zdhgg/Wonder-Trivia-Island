import { describe, expect, it } from "vitest";
import { createQuizSession } from "./useQuizSession.js";

// createQuizSession 的返回对象是 useTriviaApp 解构后直接使用的契约。
// 之前踩过一次坑：在内部新增了 isWeakPointPractice 计算属性，却忘了加进返回对象，
// 结果 loadQuestions 里读 undefined.value 抛错，专项练习直接开不出题。
function createSession(overrides = {}) {
  const PLAY_MODE = Object.freeze({ FREE: "free", CHALLENGE: "challenge" });
  const QUIZ_PRACTICE_SOURCE = Object.freeze({
    GENERAL: "general",
    KNOWLEDGE: "knowledge",
    WEAK_POINT: "weak-point",
    WRONG_BOOK: "wrong-book"
  });

  return createQuizSession({
    PLAY_MODE,
    QUIZ_PRACTICE_SOURCE,
    QUIZ_SESSION_STORAGE_KEY: "test-key",
    CHALLENGE_STAGES: [],
    getNormalizedChallengeActiveChapterId: () => "",
    quizRouteName: "quiz",
    getCurrentRouteName: () => "home",
    getCurrentRouteQuery: () => ({}),
    selectedChallengeChapterId: { value: "" },
    selectedStageId: { value: "" },
    challengeProgress: { value: { unlockedStageIds: [] } },
    setSelectedChallengeChapter: () => {},
    ...overrides
  });
}

describe("createQuizSession returned contract", () => {
  it("exports every flag the question loading path reads", () => {
    const session = createSession();

    // 这些键在 loadQuestions / useTriviaApp 里会被直接读取，缺一个就会在运行时炸。
    for (const key of [
      "isChallengeMode",
      "isKnowledgePractice",
      "isWeakPointPractice",
      "isWrongBookPractice",
      "loadQuestions",
      "questions",
      "errorMessage",
      "quizPracticeContext",
      "setQuizPracticeContext"
    ]) {
      expect(key in session, `createQuizSession 应该返回 ${key}`).toBe(true);
    }

    expect(session.isWeakPointPractice.value).toBe(false);
    expect(session.isKnowledgePractice.value).toBe(false);
  });

  it("keeps the weak-point practice source instead of falling back to general", () => {
    const session = createSession();

    session.setQuizPracticeContext({ source: "weak-point", knowledgeTag: "乘法" });

    expect(session.quizPracticeContext.value.source).toBe("weak-point");
    expect(session.quizPracticeContext.value.knowledgeTag).toBe("乘法");
    expect(session.isWeakPointPractice.value).toBe(true);
    expect(session.isKnowledgePractice.value).toBe(false);
  });

  it("still normalizes unknown sources to general", () => {
    const session = createSession();

    session.setQuizPracticeContext({ source: "not-a-real-source", knowledgeTag: "乘法" });

    expect(session.quizPracticeContext.value.source).toBe("general");
    expect(session.isWeakPointPractice.value).toBe(false);
  });
});
