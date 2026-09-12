import { describe, expect, it } from "vitest";
import {
  PLAY_STRATEGY_MODE,
  STRATEGY_WRONG_PENALTY,
  getGradePlayGoalState,
  getGradePlayRewardConfig,
  getQuizCorrectReward,
  getQuizWrongPenalty,
  isBalloonOptionGrade,
  isStrategyGrade,
  isVoyageOptionGrade
} from "./quizPlayRewards";

describe("quiz play rewards", () => {
  it("assigns age-appropriate option modes", () => {
    expect(isBalloonOptionGrade("二年级")).toBe(true);
    expect(isVoyageOptionGrade("三年级")).toBe(true);
    expect(isStrategyGrade("六年级")).toBe(true);
    expect(isStrategyGrade("三年级")).toBe(false);
  });

  it("uses total correct answers for grade one and two collection loops", () => {
    expect(getGradePlayRewardConfig("一年级")).toMatchObject({ target: 3, metric: "total" });
    expect(getGradePlayGoalState({ grade: "二年级", correctCount: 3, rewardCount: 0 })).toMatchObject({
      progress: 3,
      remaining: 1,
      rewardCount: 0
    });
  });

  it("unlocks a bridge after the fourth grade-two correct answer", () => {
    expect(getQuizCorrectReward({ grade: "二年级", correctCountBefore: 3, basePoints: 10 })).toMatchObject({
      pointsEarned: 15,
      bonusPoints: 5,
      rewardUnlocked: true,
      rewardLabel: "彩桥"
    });
    expect(
      getGradePlayGoalState({
        grade: "二年级",
        correctCount: 4,
        rewardCount: 1,
        showCompletedMilestone: true
      })
    ).toMatchObject({ progress: 4, remaining: 0 });
    expect(getGradePlayGoalState({ grade: "二年级", correctCount: 4, rewardCount: 1 })).toMatchObject({
      progress: 0,
      remaining: 4
    });
  });

  it("uses consecutive answers for the grade-three tailwind loop", () => {
    expect(
      getQuizCorrectReward({ grade: "三年级", consecutiveCorrectBefore: 2, basePoints: 10 })
    ).toMatchObject({
      pointsEarned: 15,
      rewardUnlocked: true,
      rewardLabel: "顺风旗"
    });
    expect(getGradePlayGoalState({ grade: "三年级", streakCount: 0, rewardCount: 1 })).toMatchObject({
      progress: 0,
      remaining: 3,
      rewardCount: 1
    });
  });

  it("adds risk and reward only to high-grade sprint answers", () => {
    expect(
      getQuizCorrectReward({
        grade: "五年级",
        basePoints: 10,
        strategyMode: PLAY_STRATEGY_MODE.SPRINT
      })
    ).toMatchObject({ pointsEarned: 15, bonusPoints: 5, rewardKey: "sprint" });
    expect(getQuizWrongPenalty({ grade: "五年级", strategyMode: PLAY_STRATEGY_MODE.SPRINT })).toBe(
      STRATEGY_WRONG_PENALTY
    );
    expect(getQuizWrongPenalty({ grade: "五年级", strategyMode: PLAY_STRATEGY_MODE.STEADY })).toBe(0);
    expect(getQuizWrongPenalty({ grade: "三年级", strategyMode: PLAY_STRATEGY_MODE.SPRINT })).toBe(0);
  });
});
