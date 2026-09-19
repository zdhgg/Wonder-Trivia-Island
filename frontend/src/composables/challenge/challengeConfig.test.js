import { describe, expect, it } from "vitest";
import {
  CHALLENGE_STAGES,
  getChallengeStageConfig,
  getChallengeStageList,
  getChallengeChapterClearedStageCount,
  isChallengeChapterComplete,
  normalizeChallengeProgress
} from "./challengeConfig.js";

describe("challenge grade stage progression", () => {
  it("keeps the first four grade-one stages short and untimed", () => {
    const stages = getChallengeStageList("chapter-grade-1-upper");

    expect(stages.slice(0, 4).map((stage) => stage.questionCount)).toEqual([3, 4, 4, 5]);
    expect(stages.slice(0, 4).map((stage) => stage.timeLimitSeconds)).toEqual([0, 0, 0, 0]);
    expect(stages[3].mission).toMatchObject({
      type: "correct-target",
      target: 4,
      label: "答对 4 题"
    });
    expect(stages[3].travelNote).toContain("不限时");
  });

  it("introduces time pressure gradually for grades two and three", () => {
    const gradeTwoFinal = getChallengeStageConfig("stage-7", "chapter-grade-2-upper");
    const gradeThreeSecond = getChallengeStageConfig("stage-2", "chapter-grade-3-lower");

    expect(gradeTwoFinal).toMatchObject({
      questionCount: 8,
      timeLimitSeconds: 20,
      passAccuracy: 75,
      mission: {
        type: "final-sprint",
        target: 2,
        windowSize: 3,
        sprintTimeLimitSeconds: 18
      }
    });
    expect(gradeThreeSecond).toMatchObject({
      questionCount: 5,
      timeLimitSeconds: 35,
      mission: { type: "streak", target: 3 }
    });
  });

  it("raises the final-stage challenge across the strategy grades", () => {
    const finalStages = [4, 5, 6].map((grade) =>
      getChallengeStageConfig("stage-7", `chapter-grade-${grade}-upper`)
    );

    expect(finalStages.map((stage) => stage.timeLimitSeconds)).toEqual([15, 13, 12]);
    expect(finalStages.map((stage) => stage.passAccuracy)).toEqual([80, 85, 85]);
    expect(finalStages.map((stage) => stage.mission.target)).toEqual([4, 4, 5]);
  });

  it("shares grade rules across semesters while preserving chapter-specific copy", () => {
    const upperStage = getChallengeStageConfig("stage-2", "chapter-grade-1-upper");
    const lowerStage = getChallengeStageConfig("stage-2", "chapter-grade-1-lower");

    expect(upperStage.title).toBe("顺序跟答");
    expect(lowerStage.title).toBe("条件配对");
    expect(lowerStage).toMatchObject({
      questionCount: upperStage.questionCount,
      timeLimitSeconds: upperStage.timeLimitSeconds,
      passAccuracy: upperStage.passAccuracy,
      mission: {
        type: upperStage.mission.type,
        target: upperStage.mission.target
      }
    });
  });
});

describe("challenge chapter completion", () => {
  // 用真实 progress 结构构造：bestResults[stageId].starCount > 0 才算过关。
  function buildProgressWithStarCounts(starCounts = []) {
    return normalizeChallengeProgress({
      unlockedStageIds: CHALLENGE_STAGES.map((stage) => stage.id),
      bestResults: Object.fromEntries(
        CHALLENGE_STAGES.map((stage, index) => [
          stage.id,
          {
            starCount: starCounts[index] ?? 0,
            bestAccuracy: (starCounts[index] ?? 0) > 0 ? 80 : 0,
            attempts: 1
          }
        ])
      )
    });
  }

  it("没打过的章节不算通关", () => {
    const progress = normalizeChallengeProgress({ unlockedStageIds: [CHALLENGE_STAGES[0].id] });

    expect(isChallengeChapterComplete(progress)).toBe(false);
    expect(getChallengeChapterClearedStageCount(progress)).toBe(0);
  });

  it("只过了部分关卡不算通关", () => {
    const progress = buildProgressWithStarCounts([3, 2, 1, 0, 0, 0, 0]);

    expect(isChallengeChapterComplete(progress)).toBe(false);
    expect(getChallengeChapterClearedStageCount(progress)).toBe(3);
  });

  it("全部解锁但最后一关没过不算通关", () => {
    const progress = buildProgressWithStarCounts([1, 1, 1, 1, 1, 1, 0]);

    expect(isChallengeChapterComplete(progress)).toBe(false);
    expect(getChallengeChapterClearedStageCount(progress)).toBe(6);
  });

  it("7 关全部过关即算通关，不要求满星", () => {
    const progress = buildProgressWithStarCounts([1, 2, 1, 3, 1, 2, 1]);

    expect(progress.unlockedStageIds).toHaveLength(CHALLENGE_STAGES.length);
    expect(isChallengeChapterComplete(progress)).toBe(true);
    expect(getChallengeChapterClearedStageCount(progress)).toBe(CHALLENGE_STAGES.length);
  });

  it("满星通关同样算通关", () => {
    const progress = buildProgressWithStarCounts(CHALLENGE_STAGES.map(() => 3));

    expect(isChallengeChapterComplete(progress)).toBe(true);
  });

  it("只有记录但没有星星（尝试过没过）不算过关", () => {
    const progress = normalizeChallengeProgress({
      unlockedStageIds: CHALLENGE_STAGES.map((stage) => stage.id),
      bestResults: Object.fromEntries(
        CHALLENGE_STAGES.map((stage) => [stage.id, { starCount: 0, bestAccuracy: 40, attempts: 2 }])
      )
    });

    expect(isChallengeChapterComplete(progress)).toBe(false);
    expect(getChallengeChapterClearedStageCount(progress)).toBe(0);
  });
});
