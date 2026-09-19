import { describe, expect, it } from "vitest";
import {
  countChapterRewards,
  evaluateChapterAchievements,
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

describe("章节成长摘要（多章节复用）", () => {
  const stageIds = ["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"];

  const gradeTwoProgress = {
    unlockedStageIds: stageIds,
    bestResults: {
      "stage-1": { starCount: 3, bestAccuracy: 100, attempts: 1, rewardEarned: true },
      "stage-2": { starCount: 2, bestAccuracy: 80, attempts: 1, rewardEarned: true },
      "stage-3": { starCount: 1, bestAccuracy: 60, attempts: 1, rewardEarned: false }
    }
  };

  const gradeThreeProgress = {
    unlockedStageIds: stageIds,
    bestResults: {
      "stage-1": { starCount: 3, bestAccuracy: 100, attempts: 2, rewardEarned: true },
      "stage-2": { starCount: 3, bestAccuracy: 100, attempts: 2, rewardEarned: true },
      "stage-3": { starCount: 3, bestAccuracy: 100, attempts: 2, rewardEarned: true },
      "stage-4": { starCount: 3, bestAccuracy: 100, attempts: 2, rewardEarned: true },
      "stage-5": { starCount: 3, bestAccuracy: 90, attempts: 2, rewardEarned: true },
      "stage-6": { starCount: 3, bestAccuracy: 90, attempts: 2, rewardEarned: false },
      "stage-7": { starCount: 2, bestAccuracy: 80, attempts: 2, rewardEarned: false }
    }
  };

  it("countChapterRewards 只数本章收下的收藏", () => {
    expect(countChapterRewards(gradeTwoProgress, stageIds)).toBe(2);
    expect(countChapterRewards(gradeThreeProgress, stageIds)).toBe(5);
    expect(countChapterRewards({}, stageIds)).toBe(0);
  });

  it("countChapterRewards 不传关卡列表时回退到 bestResults 的 key", () => {
    expect(countChapterRewards(gradeTwoProgress)).toBe(2);
  });

  it("evaluateChapterAchievements 只按传入的那一章评估成就", () => {
    const gradeTwo = evaluateChapterAchievements(gradeTwoProgress, { totalStageCount: 7 });
    const gradeThree = evaluateChapterAchievements(gradeThreeProgress, { totalStageCount: 7 });

    expect(gradeTwo).toHaveLength(8);
    expect(gradeTwo.find((achievement) => achievement.id === "first-clear").isUnlocked).toBe(true);
    expect(gradeTwo.find((achievement) => achievement.id === "collector-3").isUnlocked).toBe(false);
    expect(gradeTwo.find((achievement) => achievement.id === "collector-3").progressValue).toBe(2);
    expect(gradeTwo.find((achievement) => achievement.id === "collector-3").progressText).toBe("收藏 2 / 3");

    expect(gradeThree.filter((achievement) => achievement.isUnlocked).length).toBeGreaterThan(
      gradeTwo.filter((achievement) => achievement.isUnlocked).length
    );
    expect(gradeThree.find((achievement) => achievement.id === "collector-3").isUnlocked).toBe(true);
  });

  it("两个章节的成就数量确实不同，混用会看得出来", () => {
    const gradeTwoUnlocked = evaluateChapterAchievements(gradeTwoProgress, { totalStageCount: 7 }).filter(
      (achievement) => achievement.isUnlocked
    ).length;
    const gradeThreeUnlocked = evaluateChapterAchievements(gradeThreeProgress, { totalStageCount: 7 }).filter(
      (achievement) => achievement.isUnlocked
    ).length;

    expect(gradeThreeUnlocked).not.toBe(gradeTwoUnlocked);
  });

  it("不传 freshAchievementIds 时不会凭空出现新解锁", () => {
    const achievements = evaluateChapterAchievements(gradeThreeProgress, { totalStageCount: 7 });

    expect(achievements.every((achievement) => achievement.fresh === false)).toBe(true);
  });

  it("只把本次结算真正新解锁的 id 标成 fresh", () => {
    const achievements = evaluateChapterAchievements(gradeThreeProgress, {
      totalStageCount: 7,
      freshAchievementIds: ["collector-3"]
    });

    expect(achievements.find((achievement) => achievement.id === "collector-3").fresh).toBe(true);
    expect(achievements.filter((achievement) => achievement.fresh)).toHaveLength(1);
  });
});
});
