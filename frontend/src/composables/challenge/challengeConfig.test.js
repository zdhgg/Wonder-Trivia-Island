import { describe, expect, it } from "vitest";
import {
  CHALLENGE_CHAPTERS,
  CHALLENGE_STAGES,
  markChallengeWorldCardsByProfileGrade,
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

// 世界大地图的年级视觉层级：只加视觉标记，不排序、不筛选、不隐藏岛卡。
describe("challenge world map grade highlight", () => {
  it("档案年级的上册 / 下册两张岛被标成我的年级，其余年级标成其他年级", () => {
    const marked = markChallengeWorldCardsByProfileGrade(CHALLENGE_CHAPTERS, "四年级");

    // 12 张岛一张不少，顺序与 CHALLENGE_CHAPTERS 完全一致（不重排、不折叠）。
    expect(marked).toHaveLength(CHALLENGE_CHAPTERS.length);
    expect(marked.map((chapter) => chapter.id)).toEqual(CHALLENGE_CHAPTERS.map((chapter) => chapter.id));

    const currentIds = marked.filter((chapter) => chapter.isCurrentGrade).map((chapter) => chapter.id);
    const otherCount = marked.filter((chapter) => chapter.isOtherGrade).length;

    expect(currentIds).toEqual(["chapter-grade-4-upper", "chapter-grade-4-lower"]);
    expect(otherCount).toBe(CHALLENGE_CHAPTERS.length - 2);
    // 高亮与弱化互斥，不会出现同一张卡又高亮又弱化。
    expect(marked.every((chapter) => chapter.isCurrentGrade !== chapter.isOtherGrade)).toBe(true);
  });

  it("年级跟着档案走：换一个年级，高亮就换到另外两张岛", () => {
    const firstGradeIds = markChallengeWorldCardsByProfileGrade(CHALLENGE_CHAPTERS, "一年级")
      .filter((chapter) => chapter.isCurrentGrade)
      .map((chapter) => chapter.id);
    const nextGradeIds = markChallengeWorldCardsByProfileGrade(CHALLENGE_CHAPTERS, "六年级")
      .filter((chapter) => chapter.isCurrentGrade)
      .map((chapter) => chapter.id);

    expect(firstGradeIds).toEqual(["chapter-grade-1-upper", "chapter-grade-1-lower"]);
    expect(nextGradeIds).toEqual(["chapter-grade-6-upper", "chapter-grade-6-lower"]);
  });

  it("年级两边空格照常识别，标记只依赖 grade 字段", () => {
    const marked = markChallengeWorldCardsByProfileGrade(CHALLENGE_CHAPTERS, "  三年级  ");

    expect(marked.filter((chapter) => chapter.isCurrentGrade).map((chapter) => chapter.id)).toEqual([
      "chapter-grade-3-upper",
      "chapter-grade-3-lower"
    ]);
    // 进度等业务字段原样带过来，不被视觉标记覆盖。
    const withProgress = markChallengeWorldCardsByProfileGrade(
      [{ id: "chapter-grade-3-upper", grade: "三年级", starsEarned: 7, progressPercent: 33 }],
      "三年级"
    );
    expect(withProgress[0]).toMatchObject({ starsEarned: 7, progressPercent: 33, isCurrentGrade: true });
  });

  it("档案年级缺失或异常时不做任何弱化，12 张卡保持同等视觉", () => {
    for (const abnormalGrade of ["", "   ", "七年级", null, undefined]) {
      const marked = markChallengeWorldCardsByProfileGrade(CHALLENGE_CHAPTERS, abnormalGrade);

      expect(marked).toHaveLength(CHALLENGE_CHAPTERS.length);
      expect(marked.some((chapter) => chapter.isCurrentGrade || chapter.isOtherGrade)).toBe(false);
    }
  });
});
