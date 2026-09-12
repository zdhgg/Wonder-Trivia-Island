import { describe, expect, it } from "vitest";
import {
  evaluateStageMission,
  getEffectiveChallengeTimeLimitSeconds,
  getFinalSprintCorrectCount,
  getFinalSprintWindow,
  getLongestCorrectStreak
} from "./challengeStageRules.js";

describe("challengeStageRules", () => {
  it("counts the longest correct streak while ignoring invalid result values", () => {
    expect(getLongestCorrectStreak(["correct", "correct", "wrong", "correct", "skip", "correct", "correct"])).toBe(3);
    expect(getLongestCorrectStreak(["wrong", "timeout", "skip"])).toBe(0);
  });

  it("builds final sprint windows from stage mission configuration", () => {
    const stage = {
      questionCount: 10,
      mission: {
        type: "final-sprint",
        windowSize: 3
      }
    };

    expect(getFinalSprintWindow(stage)).toEqual({ size: 3, startIndex: 7 });
    expect(getFinalSprintWindow(stage, 5)).toEqual({ size: 3, startIndex: 2 });
    expect(getFinalSprintWindow({ ...stage, mission: { type: "pass", windowSize: 3 } }, 10)).toBeNull();
  });

  it("applies sprint time limits only inside the final sprint window", () => {
    const stage = {
      questionCount: 10,
      mission: {
        type: "final-sprint",
        windowSize: 3,
        sprintTimeLimitSeconds: 12
      }
    };

    expect(getEffectiveChallengeTimeLimitSeconds(stage, 20, 6, 10)).toBe(20);
    expect(getEffectiveChallengeTimeLimitSeconds(stage, 20, 7, 10)).toBe(12);
  });

  it("counts only correct answers in the final sprint window", () => {
    const stage = {
      questionCount: 6,
      mission: {
        type: "final-sprint",
        windowSize: 3
      }
    };

    expect(getFinalSprintCorrectCount(stage, ["correct", "wrong", "correct", "correct", "timeout", "correct"])).toBe(2);
  });

  it("evaluates representative mission types with stable tones", () => {
    expect(
      evaluateStageMission(
        { questionCount: 5, mission: { type: "streak", target: 3 } },
        { questionResults: ["correct", "correct", "wrong", "correct", "correct", "correct"] }
      )
    ).toMatchObject({ completed: true, tone: "complete" });

    expect(
      evaluateStageMission(
        { questionCount: 3, mission: { type: "zero-timeout" } },
        { answeredCount: 3, totalQuestions: 3, questionResults: ["correct", "timeout", "correct"] }
      )
    ).toMatchObject({ completed: false, tone: "alert" });

    expect(
      evaluateStageMission(
        { questionCount: 5, mission: { type: "correct-target", target: 4 } },
        { correctCount: 3, totalQuestions: 5 }
      )
    ).toMatchObject({ completed: false, tone: "progress" });
  });
});
