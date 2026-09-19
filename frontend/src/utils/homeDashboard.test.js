import { describe, expect, it } from "vitest";
import {
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
  it("三年级档案不会拿到二年级的专项描述", () => {
    const context = resolveWeakPointContext({ preferredGrade: "三年级" });

    expect(context.status).toBe("preparing");
    expect(context.note).toBe("专项内容准备中");
    expect(context.note).not.toContain("二年级");
    expect(context.isPreferredGrade).toBe(false);
  });

  it("档案年级有专项内容时直接用档案年级", () => {
    const context = resolveWeakPointContext({ preferredGrade: "二年级" });

    expect(context.grade).toBe("二年级");
    expect(context.status).toBe("ready");
    expect(context.isPreferredGrade).toBe(true);
    expect(context.weakPointCount).toBe(
      countWeakPointsForGrade("二年级")
    );
    expect(context.note).toContain("二年级");
  });

  it("某年级没有专项数据时不崩溃，也能给出容错结果", () => {
    expect(countWeakPointsForGrade("完全没铺的年级")).toBe(0);
    expect(countWeakPointsForGrade("")).toBe(0);

    const context = resolveWeakPointContext({ preferredGrade: "完全没铺的年级" });

    expect(context).toBeTruthy();
    expect(context.weakPointCount).toBeGreaterThan(0);
    expect(context.status).toBe("preparing");
  });

  it("整个专项库都取不到内容时返回 unavailable 而不是报错", () => {
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

  it("章节全部通关时给出换岛的引导", () => {
    const adventure = buildHomeAdventure({
      chapter: { islandName: "火山岛" },
      chapterStarsEarned: 21,
      chapterTotalStars: 21,
      nextStage: null,
      stageCount: 7
    });

    expect(adventure.stageLabel).toBe("这条路线已经走完啦");
    expect(adventure.goalText).toContain("别的岛");
  });
});

describe("homeDashboard · 我的成长", () => {
  it("正确统计已有成就数量", () => {
    const growth = buildHomeGrowth({
      totalStars: 18,
      rewardCount: 4,
      rewardTotal: 7,
      achievements: ACHIEVEMENTS
    });

    expect(growth.achievementCount).toBe(1);
    expect(growth.achievementText).toBe("1 / 3");
    expect(growth.rewardText).toBe("4 / 7");
    expect(growth.totalStars).toBe(18);
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
  it("今日小任务按真实进度展示，不伪造完成状态", () => {
    const tasks = buildDailyTasks({
      tasks: { stagesCleared: 1, reviewedQuestionIds: ["11"], completedLessonIds: [] },
      reviewedTodayCount: 2
    });

    const byId = Object.fromEntries(tasks.map((task) => [task.id, task]));

    expect(byId.challenge.done).toBe(true);
    expect(byId.challenge.progressText).toBe("1 / 1");
    expect(byId.review.done).toBe(false);
    expect(byId.review.progressText).toBe("2 / 3");
    expect(byId.study.done).toBe(false);
    expect(byId.study.progressText).toBe("0 / 1");
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
      welcome: { eyebrow: "早上好", title: "欢迎回来", profileChip: "二年级 · 上册", themeTone: "morning", summary: "今天先闯一关吧。" },
      grade: "二年级",
      semester: "上册",
      adventureSource: {
        chapter: { islandName: "鼓浪屿", grade: "二年级", semester: "上册" },
        chapterStarsEarned: 0,
        chapterTotalStars: 21,
        nextStage: { order: 1, title: "看图选词" },
        stageCount: 7
      },
      growthSource: { totalStars: 0, rewardCount: 0, rewardTotal: 7 },
      achievements: []
    });

    expect(dashboard.dateKey).toBe("2026-05-01");
    expect(dashboard.greeting.summary).toBe("今天先闯一关吧。");
    expect(dashboard.greeting.gradeLabel).toBe("二年级 · 上册");
    expect(dashboard.advice.id).toBe("challenge");
    expect(dashboard.dailyTasks).toHaveLength(3);
    expect(dashboard.teacherTips).toEqual([]);
    expect(dashboard.exploreItems).toHaveLength(4);
    expect(dashboard.practiceScope).toHaveLength(3);
    expect(dashboard.weakPoint.grade).toBe("二年级");
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
    expect(dashboard.weakPoint.note).toBe("专项内容准备中");
    expect(dashboard.exploreItems.find((item) => item.id === "weak-point").hint).toBe("专项内容准备中");
  });
});
