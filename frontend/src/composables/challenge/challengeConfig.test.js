import { describe, expect, it } from "vitest";
import { getChallengeStageConfig, getChallengeStageList } from "./challengeConfig.js";

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
