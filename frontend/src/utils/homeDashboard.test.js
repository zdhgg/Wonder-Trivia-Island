import { describe, expect, it } from "vitest";
import {
  buildChapterGrowthSource,
  buildDailyTasks,
  buildHomeAdvice,
  buildHomeAdventure,
  buildHomeDashboard,
  buildHomeGrowth,
  buildPracticeScope,
  buildTeacherTips,
  countWeakPointsForGrade,
  extractAchievementProgress,
  formatHomeCountText,
  resolveWeakPointContext,
  selectNextAchievement
} from "./homeDashboard.js";

const STAGE_IDS = Object.freeze(["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"]);

// 构造一份“真实形状”的章节 progress：starCount > 0 才算过关。
function buildChapterProgress({ starCounts = [], rewards = [] } = {}) {
  return {
    unlockedStageIds: [...STAGE_IDS],
    bestResults: Object.fromEntries(
      STAGE_IDS.map((stageId, index) => [
        stageId,
        {
          starCount: starCounts[index] ?? 0,
          bestAccuracy: (starCounts[index] ?? 0) > 0 ? 80 : 0,
          attempts: 1,
          bestScore: 100,
          rewardEarned: Boolean(rewards[index])
        }
      ])
    ),
    achievements: {}
  };
}

const ACHIEVEMENTS = Object.freeze([
  {
    id: "first-clear",
    glyph: "启",
    name: "初次靠岸",
    summary: "通过任意一关。",
    isUnlocked: true,
    progressValue: 1,
    progressTarget: 1,
    progressText: "已通过 2 关"
  },
  {
    id: "collector-3",
    glyph: "藏",
    name: "收藏上手",
    summary: "在当前章节收下 3 件航海收藏。",
    isUnlocked: false,
    progressValue: 2,
    progressTarget: 3,
    progressText: "收藏 2 / 3"
  },
  {
    id: "route-unlocked",
    glyph: "图",
    name: "全线解锁",
    summary: "解锁当前章节全部关卡。",
    isUnlocked: false,
    progressValue: 3,
    progressTarget: 7,
    progressText: "解锁 3 / 7"
  }
]);

function buildAdviceFor({ reviewDueCount = 0, resume = null, weakPointContext = null, adventure = null } = {}) {
  return buildHomeAdvice({ reviewDueCount, resume, weakPointContext, adventure });
}

describe("homeDashboard · 专项强化年级", () => {
  it("三年级档案不会 fallback 到二年级：年级保持三年级、数量为 0", () => {
    const context = resolveWeakPointContext({
      preferredGrade: "三年级",
      fallbackGrades: ["二年级"]
    });

    expect(context.status).toBe("preparing");
    expect(context.preferredGrade).toBe("三年级");
    expect(context.grade).toBe("三年级");
    expect(context.weakPointCount).toBe(0);
    expect(context.note).toBe("专项内容准备中");
    expect(context.note).not.toContain("二年级");
    expect(context.fallbackGrade).toBe("");
    expect(context.isPreferredGrade).toBe(false);
  });

  it("有明确档案年级时完全不看 fallbackGrades", () => {
    const withFallback = resolveWeakPointContext({
      preferredGrade: "三年级",
      fallbackGrades: ["二年级"]
    });
    const withoutFallback = resolveWeakPointContext({ preferredGrade: "三年级" });

    expect(withFallback).toEqual(withoutFallback);
  });

  it("档案年级有专项内容时就直接用档案年级", () => {
    const context = resolveWeakPointContext({ preferredGrade: "二年级" });

    expect(context.grade).toBe("二年级");
    expect(context.preferredGrade).toBe("二年级");
    expect(context.status).toBe("ready");
    expect(context.isPreferredGrade).toBe(true);
    expect(context.weakPointCount).toBe(countWeakPointsForGrade("二年级"));
    expect(context.note).toContain("二年级");
    expect(context.note).not.toContain("准备中");
  });

  it("只有没有档案年级时才允许 fallback 到目录里已有的年级", () => {
    const context = resolveWeakPointContext({ preferredGrade: "", fallbackGrades: ["二年级"] });

    expect(context.status).toBe("ready");
    expect(context.preferredGrade).toBe("");
    expect(context.grade).toBe("二年级");
    expect(context.fallbackGrade).toBe("二年级");
    expect(context.isPreferredGrade).toBe(false);
  });

  it("某年级没有专项数据时不崩溃，数量为 0 而不是借别的年级", () => {
    expect(countWeakPointsForGrade("完全没铺的年级")).toBe(0);
    expect(countWeakPointsForGrade("")).toBe(0);

    const context = resolveWeakPointContext({ preferredGrade: "完全没铺的年级" });

    expect(context.status).toBe("preparing");
    expect(context.grade).toBe("完全没铺的年级");
    expect(context.weakPointCount).toBe(0);
  });

  it("档案年级为空且目录也取不到内容时返回 unavailable", () => {
    const context = resolveWeakPointContext({});

    expect(["ready", "preparing", "unavailable"]).toContain(context.status);
    expect(typeof context.note).toBe("string");
  });
});

describe("homeDashboard · 欢迎区行动建议", () => {
  it("有到期错题时推荐错题温习", () => {
    const advice = buildAdviceFor({
      reviewDueCount: 5,
      adventure: { title: "火山岛", stageOrder: 3, stageTitle: "短文找点" }
    });

    expect(advice.id).toBe("review");
    expect(advice.text).toContain("五");
    expect(advice.text).toContain("温习");
  });

  it("无到期错题时可以推荐主线闯关", () => {
    const advice = buildAdviceFor({
      reviewDueCount: 0,
      adventure: { title: "火山岛", stageOrder: 3, stageTitle: "短文找点" }
    });

    expect(advice.id).toBe("challenge");
    expect(advice.text).toContain("火山岛");
    expect(advice.text).toContain("第 3 关");
  });

  it("没有历史学习记录、没有错题时也给出可执行建议", () => {
    const advice = buildAdviceFor({});

    expect(advice.id).toBe("explore");
    expect(advice.text.length).toBeGreaterThan(0);
  });

  it("把数量写成孩子能读的汉字", () => {
    expect(formatHomeCountText(0)).toBe("零");
    expect(formatHomeCountText(5)).toBe("五");
    expect(formatHomeCountText(10)).toBe("十");
    expect(formatHomeCountText(12)).toBe("十二");
    expect(formatHomeCountText(25)).toBe("25");
  });
});

describe("homeDashboard · 今天的探险", () => {
  it("主线卡正确显示当前关卡与章节星星进度", () => {
    const adventure = buildHomeAdventure({
      chapter: {
        id: "chapter-grade-2-upper",
        grade: "二年级",
        semester: "上册",
        label: "二年级上册",
        islandName: "鼓浪屿",
        themeTitle: "琴鸣踏浪屿",
        emoji: "🎹",
        routeTitle: "海岛小路"
      },
      chapterStarsEarned: 6,
      chapterTotalStars: 21,
      nextStage: { order: 3, title: "短文找点" },
      stageCount: 7
    });

    expect(adventure.title).toBe("鼓浪屿");
    expect(adventure.stageLabel).toBe("第 3 关 · 短文找点");
    expect(adventure.starText).toBe("6 / 21");
    expect(adventure.goLabel).toBe("继续第 3 关");
    expect(adventure.goalText).toContain("再获得 1 颗星");
  });

  it("整章星星不会超过总星数", () => {
    const adventure = buildHomeAdventure({
      chapter: { islandName: "火山岛" },
      chapterStarsEarned: 99,
      chapterTotalStars: 21,
      nextStage: { order: 1, title: "看图选词" },
      stageCount: 7
    });

    expect(adventure.starText).toBe("21 / 21");
  });

  it("未全部通关时仍然正常继续当前关", () => {
    const adventure = buildHomeAdventure({
      chapter: { islandName: "火山岛" },
      chapterStarsEarned: 16,
      chapterTotalStars: 21,
      nextStage: { order: 7, title: "终极冲刺" },
      stageCount: 7,
      isChapterComplete: false
    });

    expect(adventure.isChapterComplete).toBe(false);
    expect(adventure.stageLabel).toBe("第 7 关 · 终极冲刺");
    expect(adventure.goLabel).toBe("继续第 7 关");
    expect(adventure.goalText).toContain("再获得 1 颗星");
  });

  it("整章通关后不再显示继续最后一关，CTA 指向大地图", () => {
    const adventure = buildHomeAdventure({
      chapter: { islandName: "火山岛" },
      // 7 关全过、但只有 17 / 21 星：仍然算通关。
      chapterStarsEarned: 17,
      chapterTotalStars: 21,
      nextStage: { order: 7, title: "终极冲刺" },
      stageCount: 7,
      isChapterComplete: true
    });

    expect(adventure.isChapterComplete).toBe(true);
    expect(adventure.stageOrder).toBe(0);
    expect(adventure.stageTitle).toBe("");
    expect(adventure.stageLabel).toBe("这一章已经全部通关");
    expect(adventure.goLabel).toBe("回到大地图看看");
    expect(adventure.goLabel).not.toContain("继续");
    expect(adventure.goalText).not.toContain("再获得 1 颗星");
    // 通关但没满星：星星照常显示 17 / 21，并提示还有星星可以回头补。
    expect(adventure.starText).toBe("17 / 21");
    expect(adventure.goalText).toContain("星星可以回头补");
  });

  it("整章通关且满星时提示可以去别的岛", () => {
    const adventure = buildHomeAdventure({
      chapter: { islandName: "火山岛" },
      chapterStarsEarned: 21,
      chapterTotalStars: 21,
      nextStage: { order: 7, title: "终极冲刺" },
      stageCount: 7,
      isChapterComplete: true
    });

    expect(adventure.goLabel).toBe("回到大地图看看");
    expect(adventure.goalText).toContain("别的岛");
    expect(adventure.goalText).not.toContain("回头补");
  });

  it("整章通关后行动建议不再推主线闯关", () => {
    const adventure = buildHomeAdventure({
      chapter: { islandName: "火山岛" },
      chapterStarsEarned: 17,
      chapterTotalStars: 21,
      nextStage: { order: 7, title: "终极冲刺" },
      stageCount: 7,
      isChapterComplete: true
    });
    const advice = buildAdviceFor({ reviewDueCount: 0, adventure });

    expect(advice.id).toBe("explore");
    expect(advice.contextKey).toBe("chapter-complete");
    expect(advice.text).toContain("别的岛");
    expect(advice.text).not.toContain("还等着你");
  });
});

describe("homeDashboard · 我的成长", () => {
  it("三个指标都是当前章节口径，星星带分母", () => {
    const growth = buildHomeGrowth({
      totalStars: 6,
      starTotal: 21,
      rewardCount: 4,
      rewardTotal: 7,
      achievements: ACHIEVEMENTS
    });

    expect(growth.totalStars).toBe(6);
    expect(growth.starTotal).toBe(21);
    expect(growth.starText).toBe("6 / 21");
    expect(growth.rewardText).toBe("4 / 7");
    expect(growth.achievementText).toBe("1 / 3");
    expect(growth.achievementCount).toBe(1);
  });

  it("其他章节的星星不会污染当前章节成长卡", () => {
    // 当前章节 6 / 21；如果把全世界的星星（再加 20）算进来，就会变成 26。
    const growth = buildHomeGrowth({
      totalStars: 6,
      starTotal: 21,
      rewardCount: 4,
      rewardTotal: 7,
      achievements: ACHIEVEMENTS
    });

    expect(growth.starText).toBe("6 / 21");
    expect(growth.totalStars).toBe(6);
    expect(growth.totalStars).not.toBe(26);
  });

  it("没有星星总数时只显示星数，不显示 0 / 0", () => {
    const growth = buildHomeGrowth({ totalStars: 3 });

    expect(growth.starText).toBe("3");
    expect(growth.starTotal).toBe(0);
  });

  it("能找出最接近完成的未解锁成就", () => {
    const next = selectNextAchievement(ACHIEVEMENTS);

    expect(next.id).toBe("collector-3");
    expect(next.progressText).toBe("收藏 2 / 3");
    expect(next.goalText).toContain("再获得 1 个");
  });

  it("只有 progressText 时也能解析出进度", () => {
    const next = selectNextAchievement([
      { id: "a", name: "A", isUnlocked: false, progressText: "解锁 3 / 7" },
      { id: "b", name: "B", isUnlocked: false, progressText: "满星 6 / 7" }
    ]);

    expect(next.id).toBe("b");
    expect(extractAchievementProgress("当前最高正确率 80%")).toBeNull();
    expect(extractAchievementProgress("收藏 2 / 3")).toEqual({ value: 2, target: 3 });
  });

  it("没有可比较进度的成就时退回第一个进行中的成就", () => {
    const next = selectNextAchievement([
      { id: "timed", name: "稳住节奏", isUnlocked: false, progressText: "通过任意限时关卡且保持 0 次超时" },
      { id: "done", name: "已完成", isUnlocked: true, progressText: "" }
    ]);

    expect(next.id).toBe("timed");
    expect(next.progressTarget).toBe(0);
    expect(next.goalText).toBe("通过任意限时关卡且保持 0 次超时");
  });

  it("所有成就都完成时不报错，也不造假进度", () => {
    const growth = buildHomeGrowth({
      totalStars: 21,
      rewardCount: 7,
      rewardTotal: 7,
      achievements: ACHIEVEMENTS.map((achievement) => ({ ...achievement, isUnlocked: true }))
    });

    expect(growth.nextAchievement).toBeNull();
    expect(growth.allAchievementsDone).toBe(true);
    expect(growth.achievementText).toBe("3 / 3");
  });

  it("成就是空数组时也不会崩", () => {
    const growth = buildHomeGrowth({ achievements: [] });

    expect(growth.nextAchievement).toBeNull();
    expect(growth.allAchievementsDone).toBe(false);
    expect(growth.achievementText).toBe("0 / 0");
  });
});

describe("homeDashboard · 今日小任务与老师提醒", () => {
  it("今日小任务只按本地日进度计算，不伪造完成状态", () => {
    const tasks = buildDailyTasks({
      tasks: { stagesCleared: 1, reviewedQuestionIds: ["11", "12"], completedLessonIds: [] }
    });

    const byId = Object.fromEntries(tasks.map((task) => [task.id, task]));

    expect(byId.challenge.done).toBe(true);
    expect(byId.challenge.progressText).toBe("1 / 1");
    expect(byId.review.done).toBe(false);
    expect(byId.review.progressText).toBe("2 / 3");
    expect(byId.study.done).toBe(false);
    expect(byId.study.progressText).toBe("0 / 1");
  });

  it("错题温习达到 3 道就算完成", () => {
    const tasks = buildDailyTasks({
      tasks: { stagesCleared: 0, reviewedQuestionIds: ["11", "12", "13"], completedLessonIds: [] }
    });

    const review = tasks.find((task) => task.id === "review");

    expect(review.done).toBe(true);
    expect(review.progressText).toBe("3 / 3");
  });

  it("没有到期错题和薄弱点时不给提醒", () => {
    expect(buildTeacherTips({})).toEqual([]);
  });

  it("最多给两条提醒", () => {
    const tips = buildTeacherTips({
      reviewDueCount: 5,
      weakPointContext: { knowledgeTag: "表内乘法" },
      resume: { lessonTitle: "角的初步认识" }
    });

    expect(tips).toHaveLength(2);
    expect(tips[0].target).toBe("wrong-review");
    expect(tips[1].title).toContain("表内乘法");
  });

  it("没有错题时也能把续学提醒推出来", () => {
    const tips = buildTeacherTips({ resume: { lessonTitle: "角的初步认识" } });

    expect(tips).toHaveLength(1);
    expect(tips[0].target).toBe("knowledge-study");
    expect(tips[0].title).toContain("角的初步认识");
  });
});

describe("homeDashboard · 首页成长口径只认首页那一章", () => {
  // 二年级：6 / 21 星、2 / 7 收藏、2 / 8 成就。
  const gradeTwoProgress = buildChapterProgress({
    starCounts: [3, 2, 1, 0, 0, 0, 0],
    rewards: [true, true, false, false, false, false, false]
  });
  // 三年级：数据明显不同（20 / 21 星、5 / 7 收藏、多解锁好几个成就）。
  const gradeThreeProgress = buildChapterProgress({
    starCounts: [3, 3, 3, 3, 3, 3, 2],
    rewards: [true, true, true, true, true, false, false]
  });

  it("拿到的成就按真实关卡数评估（二年级 3 关有成绩时解锁 2 个）", () => {
    const source = buildChapterGrowthSource({
      chapterProgress: gradeTwoProgress,
      stageIds: STAGE_IDS,
      totalStageCount: 7
    });

    const unlockedIds = source.achievements.filter((achievement) => achievement.isUnlocked).map((a) => a.id);

    // 通过 3 关（first-clear）、7 关全部解锁（route-unlocked）成立；
    // 最高正确率只有 80%，所以 perfect-accuracy 不算解锁；收藏 2 / 3 也还差 1 件。
    expect(unlockedIds.sort()).toEqual(["first-clear", "route-unlocked"]);
    expect(source.achievements.find((achievement) => achievement.id === "perfect-accuracy").isUnlocked).toBe(false);
    expect(source.achievements.find((achievement) => achievement.id === "collector-3").isUnlocked).toBe(false);
    expect(source.achievements.find((achievement) => achievement.id === "collector-3").progressText).toBe("收藏 2 / 3");
  });

  it("两个章节的成长数据确实明显不同（证明混口径会看得出来）", () => {
    const gradeTwo = buildChapterGrowthSource({
      chapterProgress: gradeTwoProgress,
      stageIds: STAGE_IDS,
      totalStageCount: 7
    });
    const gradeThree = buildChapterGrowthSource({
      chapterProgress: gradeThreeProgress,
      stageIds: STAGE_IDS,
      totalStageCount: 7
    });

    expect(gradeTwo.totalStars).toBe(6);
    expect(gradeThree.totalStars).toBe(20);
    expect(gradeTwo.rewardCount).toBe(2);
    expect(gradeThree.rewardCount).toBe(5);
    expect(gradeThree.achievements.filter((achievement) => achievement.isUnlocked).length).toBeGreaterThan(
      gradeTwo.achievements.filter((achievement) => achievement.isUnlocked).length
    );
  });

  it("挑战页停在三年级、首页档案是二年级时，首页只显示二年级数据", () => {
    // 模拟真实场景：challengeRuntime 的 challengeProgress 停在三年级，
    // 而首页 homeChallengeChapter 已经是二年级。
    const runtimeSelectedChapterProgress = gradeThreeProgress;
    const homeChapterProgress = gradeTwoProgress;

    const homeGrowthSource = buildChapterGrowthSource({
      chapterProgress: homeChapterProgress,
      stageIds: STAGE_IDS,
      totalStageCount: 7
    });

    const dashboard = buildHomeDashboard({
      dateKey: "2026-05-02",
      grade: "二年级",
      semester: "上册",
      adventureSource: {
        chapter: { islandName: "鼓浪屿", grade: "二年级", semester: "上册" },
        chapterStarsEarned: homeGrowthSource.totalStars,
        chapterTotalStars: homeGrowthSource.starTotal,
        nextStage: { order: 4, title: "看图写话" },
        stageCount: 7,
        isChapterComplete: false
      },
      growthSource: {
        totalStars: homeGrowthSource.totalStars,
        starTotal: homeGrowthSource.starTotal,
        rewardCount: homeGrowthSource.rewardCount,
        rewardTotal: homeGrowthSource.rewardTotal
      },
      achievements: homeGrowthSource.achievements
    });

    // 首页成长区三项全部是二年级口径：6 / 21 星、2 / 7 收藏、2 / 8 成就。
    expect(dashboard.growth.starText).toBe("6 / 21");
    expect(dashboard.growth.rewardText).toBe("2 / 7");
    expect(dashboard.growth.achievementText).toBe("2 / 8");

    // 探险卡和成长卡用的是同一份本章星数。
    expect(dashboard.adventure.starText).toBe("6 / 21");

    // 三年级的数据一个都不能漏进来。
    const gradeThree = buildChapterGrowthSource({
      chapterProgress: runtimeSelectedChapterProgress,
      stageIds: STAGE_IDS,
      totalStageCount: 7
    });
    const gradeThreeUnlockedCount = gradeThree.achievements.filter((achievement) => achievement.isUnlocked).length;

    expect(gradeThree.totalStars).toBe(20);
    expect(gradeThree.rewardCount).toBe(5);
    // 三年级这一章：通过关卡、百发百中、全线解锁、章节通关 4 个成就成立；
    // 收藏还差 2 件、满星还差 2 关、也没有 0 超时记录，所以这 3 个仍未解锁。
    expect(gradeThreeUnlockedCount).toBe(4);
    expect(gradeThreeUnlockedCount).not.toBe(dashboard.growth.achievementCount);

    expect(dashboard.growth.totalStars).not.toBe(gradeThree.totalStars);
    expect(dashboard.growth.rewardCount).not.toBe(gradeThree.rewardCount);
    expect(dashboard.growth.achievementCount).not.toBe(gradeThreeUnlockedCount);
    expect(dashboard.growth.starText).not.toBe("20 / 21");
    expect(dashboard.growth.rewardText).not.toBe("5 / 7");
    expect(dashboard.growth.achievementText).not.toBe("4 / 8");
    expect(dashboard.growth.achievementText).toBe("2 / 8");
  });

  it("没有章节进度时给出 0 星 0 收藏，成就全部未解锁而不是报错", () => {
    const source = buildChapterGrowthSource({});

    expect(source.totalStars).toBe(0);
    expect(source.rewardCount).toBe(0);
    // 没传关卡数时兜底到真实关卡数，不会退化成 0 / 0。
    expect(source.starTotal).toBe(STAGE_IDS.length * 3);
    expect(source.rewardTotal).toBe(STAGE_IDS.length);
    expect(source.achievements).toHaveLength(8);
    expect(source.achievements.filter((achievement) => achievement.isUnlocked)).toEqual([]);
  });
});

describe("homeDashboard · 自由探索", () => {
  it("保留按年级 / 按学科 / 随便练三种进入方式", () => {
    const scope = buildPracticeScope({
      gradePracticeGrade: "二年级",
      gradePracticeSemester: "上册",
      subjectPracticeSubject: "数学",
      subjectPracticeGrade: "二年级",
      subjectPracticeSemester: "下册"
    });

    expect(scope.map((option) => option.id)).toEqual(["grade-practice", "subject-practice", "free-practice"]);
    expect(scope[0].meta).toBe("二年级 · 上册");
    expect(scope[1].meta).toBe("数学 · 二年级 · 下册");
    expect(scope[2].meta).toBe("不限年级学科");
  });
});

describe("homeDashboard · 组装", () => {
  it("无历史学习记录、无错题时也能组装出完整首页", () => {
    const dashboard = buildHomeDashboard({
      dateKey: "2026-05-01",
      welcome: { eyebrow: "早上好", title: "欢迎回来", profileChip: "二年级 · 上册", themeTone: "morning", summary: "去火山岛继续探险吧" },
      grade: "二年级",
      semester: "上册",
      adventureSource: {
        chapter: { islandName: "鼓浪屿", grade: "二年级", semester: "上册" },
        chapterStarsEarned: 0,
        chapterTotalStars: 21,
        nextStage: { order: 1, title: "看图选词" },
        stageCount: 7
      },
      growthSource: { totalStars: 0, starTotal: 21, rewardCount: 0, rewardTotal: 7 },
      achievements: []
    });

    expect(dashboard.dateKey).toBe("2026-05-01");
    // 行动建议由确定性规则给出，不受 AI 欢迎文案影响。
    expect(dashboard.greeting.summary).toBe(dashboard.advice.text);
    expect(dashboard.greeting.summarySource).toBe("advice");
    expect(dashboard.greeting.summary).not.toContain("火山岛继续探险");
    expect(dashboard.greeting.gradeLabel).toBe("二年级 · 上册");
    expect(dashboard.advice.id).toBe("challenge");
    expect(dashboard.dailyTasks).toHaveLength(3);
    expect(dashboard.teacherTips).toEqual([]);
    expect(dashboard.exploreItems).toHaveLength(4);
    expect(dashboard.practiceScope).toHaveLength(3);
    expect(dashboard.weakPoint.grade).toBe("二年级");
  });

  it("有到期错题时，确定性建议压过 AI 欢迎文案", () => {
    const dashboard = buildHomeDashboard({
      welcome: {
        eyebrow: "晚上好",
        title: "小心心，欢迎回来",
        summary: "去火山岛继续探险吧",
        summarySource: "ai"
      },
      grade: "二年级",
      semester: "上册",
      reviewDueCount: 5,
      adventureSource: {
        chapter: { islandName: "火山岛", grade: "二年级" },
        chapterStarsEarned: 6,
        chapterTotalStars: 21,
        nextStage: { order: 3, title: "短文找点" },
        stageCount: 7
      },
      growthSource: { totalStars: 6, starTotal: 21 },
      achievements: []
    });

    expect(dashboard.advice.id).toBe("review");
    expect(dashboard.greeting.summary).toBe(dashboard.advice.text);
    expect(dashboard.greeting.summary).toContain("温习");
    expect(dashboard.greeting.summary).not.toContain("火山岛");
    expect(dashboard.greeting.summarySource).toBe("advice");
  });

  it("没有到期错题时，建议正常落到主线 / 续学", () => {
    const challengeDashboard = buildHomeDashboard({
      welcome: { summary: "随便逛逛吧" },
      grade: "二年级",
      reviewDueCount: 0,
      adventureSource: {
        chapter: { islandName: "鼓浪屿" },
        chapterStarsEarned: 6,
        chapterTotalStars: 21,
        nextStage: { order: 3, title: "短文找点" },
        stageCount: 7
      },
      growthSource: {},
      achievements: []
    });

    expect(challengeDashboard.advice.id).toBe("challenge");
    expect(challengeDashboard.greeting.summary).toContain("第 3 关");

    const studyDashboard = buildHomeDashboard({
      welcome: { summary: "随便逛逛吧" },
      grade: "二年级",
      reviewDueCount: 0,
      resume: { lessonTitle: "角的初步认识" },
      adventureSource: {
        chapter: { islandName: "鼓浪屿" },
        chapterStarsEarned: 6,
        chapterTotalStars: 21,
        nextStage: { order: 3, title: "短文找点" },
        stageCount: 7
      },
      growthSource: {},
      achievements: []
    });

    expect(studyDashboard.advice.id).toBe("study");
    expect(studyDashboard.greeting.summary).toContain("角的初步认识");
  });

  it("档案是三年级时不出现二年级专项文案", () => {
    const dashboard = buildHomeDashboard({
      grade: "三年级",
      semester: "上册",
      adventureSource: { chapter: { grade: "三年级", semester: "上册", islandName: "桃花岛" } },
      growthSource: {},
      achievements: []
    });

    expect(dashboard.weakPoint.status).toBe("preparing");
    expect(dashboard.weakPoint.grade).toBe("三年级");
    expect(dashboard.weakPoint.weakPointCount).toBe(0);
    expect(dashboard.weakPoint.note).toBe("专项内容准备中");
    expect(dashboard.exploreItems.find((item) => item.id === "weak-point").hint).toBe("专项内容准备中");
  });

  it("章节全部通关时首页组装结果不再指向最后一关", () => {
    const dashboard = buildHomeDashboard({
      grade: "二年级",
      semester: "上册",
      adventureSource: {
        chapter: { islandName: "鼓浪屿" },
        chapterStarsEarned: 17,
        chapterTotalStars: 21,
        nextStage: { order: 7, title: "终极冲刺" },
        stageCount: 7,
        isChapterComplete: true
      },
      growthSource: { totalStars: 17, starTotal: 21 },
      achievements: []
    });

    expect(dashboard.adventure.goLabel).toBe("回到大地图看看");
    expect(dashboard.adventure.stageTitle).toBe("");
    expect(dashboard.advice.contextKey).toBe("chapter-complete");
  });
});
