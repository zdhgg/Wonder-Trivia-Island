import { describe, expect, it } from "vitest";
import {
  evaluateChallengeAchievements,
  mergeChallengeAchievementStates,
  normalizeChallengeAchievementStates
} from "./challengeAchievements.js";

describe("challengeAchievements", () => {
  it("normalizes achievement states to known ids with valid timestamps", () => {
    expect(
      normalizeChallengeAchievementStates({
        "first-clear": { unlockedAt: "2026-01-01T00:00:00.000Z" },
        "perfect-accuracy": { unlockedAt: "not-a-date" },
        unknown: { unlockedAt: "2026-01-02T00:00:00.000Z" }
      })
    ).toEqual({
      "first-clear": { unlockedAt: "2026-01-01T00:00:00.000Z" }
    });
  });

  it("merges achievement states using the earliest unlock timestamp", () => {
    expect(
      mergeChallengeAchievementStates(
        {
          "first-clear": { unlockedAt: "2026-02-01T00:00:00.000Z" },
          "route-unlocked": { unlockedAt: "2026-03-01T00:00:00.000Z" }
        },
        {
          "first-clear": { unlockedAt: "2026-01-01T00:00:00.000Z" },
          "perfect-accuracy": { unlockedAt: "2026-04-01T00:00:00.000Z" }
        }
      )
    ).toEqual({
      "first-clear": { unlockedAt: "2026-01-01T00:00:00.000Z" },
      "perfect-accuracy": { unlockedAt: "2026-04-01T00:00:00.000Z" },
      "route-unlocked": { unlockedAt: "2026-03-01T00:00:00.000Z" }
    });
  });

  it("evaluates progress achievements from best stage results", () => {
    const result = evaluateChallengeAchievements(
      {
        unlockedStageIds: ["stage-1", "stage-2", "stage-3"],
        bestResults: {
          "stage-1": { starCount: 1, bestAccuracy: 60, rewardEarned: true },
          "stage-2": { starCount: 3, bestAccuracy: 100, rewardEarned: true },
          "stage-3": { starCount: 2, bestAccuracy: 80, rewardEarned: true }
        }
      },
      {},
      {
        totalStageCount: 3,
        unlockTimestamp: "2026-05-01T00:00:00.000Z"
      }
    );

    expect(result.newlyUnlockedIds).toEqual([
      "first-clear",
      "perfect-accuracy",
      "collector-3",
      "route-unlocked",
      "route-cleared",
      "reward-complete"
    ]);
    expect(result.unlockedCount).toBe(6);
    expect(result.achievementStates["route-perfect"]).toBeUndefined();
  });

  it("keeps existing unlocks and marks only new run unlocks as fresh", () => {
    const result = evaluateChallengeAchievements(
      {
        achievements: {
          "first-clear": { unlockedAt: "2026-01-01T00:00:00.000Z" }
        },
        unlockedStageIds: ["stage-1"],
        bestResults: {}
      },
      {
        isPassed: true,
        stage: { timeLimitSeconds: 30 },
        questionResults: ["correct", "wrong"],
        result: { accuracyPercent: 100 }
      },
      {
        totalStageCount: 7,
        unlockTimestamp: "2026-05-01T00:00:00.000Z"
      }
    );

    expect(result.newlyUnlockedIds).toEqual(["perfect-accuracy", "timed-keeper"]);
    expect(result.achievementStates["first-clear"]).toEqual({ unlockedAt: "2026-01-01T00:00:00.000Z" });
    expect(result.achievementStates["perfect-accuracy"]).toEqual({ unlockedAt: "2026-05-01T00:00:00.000Z" });
    expect(result.achievementStates["timed-keeper"]).toEqual({ unlockedAt: "2026-05-01T00:00:00.000Z" });
  });
});
