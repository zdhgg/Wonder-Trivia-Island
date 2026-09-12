import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ANSWER_STATUS, useQuizStore } from "./useQuizStore";

describe("quiz store scoring", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("applies a sprint penalty without allowing a negative score", () => {
    const store = useQuizStore();

    store.submitAnswer(false, 10, 5);
    expect(store.currentScore).toBe(0);
    expect(store.answerState).toBe(ANSWER_STATUS.WRONG);

    store.setWaiting();
    store.submitAnswer(true, 10);
    store.setWaiting();
    store.submitAnswer(false, 10, 5);

    expect(store.currentScore).toBe(5);
    expect(store.consecutiveCorrectCount).toBe(0);
  });
});
