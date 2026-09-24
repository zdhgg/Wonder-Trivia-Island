import { describe, expect, it } from "vitest";
import {
  COLLECTION_BOOK_RECENT_STAMP_LIMIT,
  buildAdventureCollectionBook,
  buildCollectionAchievementSection,
  buildCollectionRewardSection,
  buildCollectionScopeLabel,
  buildCollectionStampSection,
  formatCollectionStampDate,
  listRecentDailyChestClaims
} from "./adventureCollectionBook.js";

// 收藏册只做“已有成长数据的收藏化展示”，所以测试也都直接喂真实形状的数据。
const GRADE_THREE_UPPER = Object.freeze({
  id: "chapter-grade-3-upper",
  grade: "三年级",
  semester: "上册",
  label: "三年级上册",
  islandName: "澎湖湾",
  themeTitle: "远航码头",
  emoji: "⛵",
  routeTitle: "方法上手线"
});

const GRADE_FOUR_UPPER = Object.freeze({
  id: "chapter-grade-4-upper",
  grade: "四年级",
  semester: "上册",
  label: "四年级上册",
  islandName: "探索山径",
  themeTitle: "思维山径",
  emoji: "🏔️",
  routeTitle: "读题转弯线"
});

// 真实关卡配置的形状：reward 里有 glyph / name / summary。
const STAGES = Object.freeze([
  { id: "stage-1", title: "海边码头", glyph: "海", reward: { id: "harbor-ticket", glyph: "票", name: "启航船票", summary: "第一张通行票。" } },
  { id: "stage-2", title: "贝壳浅滩", glyph: "贝", reward: { id: "tide-shell", glyph: "贝", name: "潮汐贝壳", summary: "浅滩站的收藏。" } },
  { id: "stage-3", title: "珊瑚礁", glyph: "珊", reward: { id: "coral-fan", glyph: "瑚", name: "珊瑚折扇", summary: "礁石站的收藏。" } },
  { id: "stage-4", title: "海龟湾", glyph: "龟", reward: { id: "turtle-map", glyph: "龟", name: "海龟航线图", summary: "海湾站的收藏。" } },
  { id: "stage-5", title: "鲸歌海峡", glyph: "鲸", reward: { id: "whale-song", glyph: "鲸", name: "鲸歌螺号", summary: "海峡站的收藏。" } },
  { id: "stage-6", title: "风暴角", glyph: "风", reward: { id: "storm-lantern", glyph: "灯", name: "风暴灯", summary: "风暴站的收藏。" } },
  { id: "stage-7", title: "灯塔终点", glyph: "塔", reward: { id: "lighthouse-key", glyph: "钥", name: "灯塔钥匙", summary: "终点站的收藏。" } }
]);

function buildProgress({ rewards = [] } = {}) {
  return {
    unlockedStageIds: STAGES.slice(0, Math.max(1, rewards.length)).map((stage) => stage.id),
    bestResults: Object.fromEntries(
      STAGES.map((stage, index) => [
        stage.id,
        {
          starCount: rewards[index] ? 3 : 0,
          bestAccuracy: rewards[index] ? 100 : 0,
          attempts: rewards[index] ? 1 : 0,
          bestScore: rewards[index] ? 100 : 0,
          rewardEarned: Boolean(rewards[index])
        }
      ])
    ),
    achievements: {}
  };
}

function buildGrowthProgress({ dateKeys = [], totalDailyChests } = {}) {
  return {
    version: 1,
    totalDailyChests: totalDailyChests ?? dateKeys.length,
    dailyClaims: Object.fromEntries(
      dateKeys.map((dateKey) => [dateKey, { claimedAt: `${dateKey}T08:00:00.000Z` }])
    )
  };
}

describe("adventureCollectionBook · 探险印章", () => {
  it("显示累计印章数，并按最近日期优先列出领取记录", () => {
    const section = buildCollectionStampSection({
      growthProgress: buildGrowthProgress({
        // 故意乱序传入，展示必须自己按日期倒序。
        dateKeys: ["2026-09-20", "2026-09-22", "2026-09-21"]
      })
    });

    expect(section.total).toBe(3);
    expect(section.hasStamps).toBe(true);
    expect(section.countText).toBe("累计 3 枚探险印章");
    expect(section.recentClaims.map((claim) => claim.dateKey)).toEqual([
      "2026-09-22",
      "2026-09-21",
      "2026-09-20"
    ]);
    expect(section.recentClaims.map((claim) => claim.label)).toEqual(["9 月 22 日", "9 月 21 日", "9 月 20 日"]);
    expect(section.hasRecentClaims).toBe(true);
  });

  it("领取记录超过上限时只保留最近的几条", () => {
    const dateKeys = Array.from({ length: 9 }, (unused, index) => `2026-09-${`${index + 1}`.padStart(2, "0")}`);

    const claims = listRecentDailyChestClaims(buildGrowthProgress({ dateKeys }), 3);

    expect(COLLECTION_BOOK_RECENT_STAMP_LIMIT).toBe(5);
    expect(claims.map((claim) => claim.dateKey)).toEqual(["2026-09-09", "2026-09-08", "2026-09-07"]);
  });

  it("没有印章时给出儿童化空状态，不显示假数据", () => {
    const section = buildCollectionStampSection({ growthProgress: buildGrowthProgress() });

    expect(section.total).toBe(0);
    expect(section.hasStamps).toBe(false);
    expect(section.recentClaims).toEqual([]);
    expect(section.hasRecentClaims).toBe(false);
    expect(section.emptyText).toContain("还没有探险印章");
    expect(section.emptyText).toContain("今日宝箱");
  });

  it("Phase 2A 已领取的印章（持久化账本里的 dailyClaims）能在收藏册看到", () => {
    const book = buildAdventureCollectionBook({
      chapter: GRADE_THREE_UPPER,
      stages: STAGES,
      chapterProgress: buildProgress(),
      achievements: [],
      growthProgress: buildGrowthProgress({ dateKeys: ["2026-09-22"] })
    });

    expect(book.stamps.hasStamps).toBe(true);
    expect(book.stamps.total).toBe(1);
    expect(book.stamps.recentClaims[0].label).toBe("9 月 22 日");
  });

  it("日期格式化只接受 YYYY-MM-DD，格式不对返回空串而不是瞎猜", () => {
    expect(formatCollectionStampDate("2026-09-22")).toBe("9 月 22 日");
    expect(formatCollectionStampDate("2026-12-01")).toBe("12 月 1 日");
    expect(formatCollectionStampDate("2026/09/22")).toBe("");
    expect(formatCollectionStampDate("")).toBe("");
  });
});

describe("adventureCollectionBook · 本章航海收藏", () => {
  it("正确区分已获得 / 未获得，并给出 X / 7", () => {
    const section = buildCollectionRewardSection({
      stages: STAGES,
      chapterProgress: buildProgress({ rewards: [true, true, false, false, false, false, false] })
    });

    expect(section.totalCount).toBe(7);
    expect(section.earnedCount).toBe(2);
    expect(section.text).toBe("2 / 7");
    expect(section.items[0]).toMatchObject({ name: "启航船票", glyph: "票", earned: true, statusLabel: "已获得", order: 1 });
    expect(section.items[1]).toMatchObject({ name: "潮汐贝壳", earned: true, statusLabel: "已获得" });
    expect(section.items[2]).toMatchObject({ name: "珊瑚折扇", earned: false, statusLabel: "未获得", order: 3 });
    expect(section.items[6].earned).toBe(false);
  });

  it("奖励图标与名称直接来自关卡配置，不另起一套文案", () => {
    const section = buildCollectionRewardSection({ stages: STAGES, chapterProgress: buildProgress() });

    expect(section.items.map((item) => item.name)).toEqual(STAGES.map((stage) => stage.reward.name));
    expect(section.items.map((item) => item.glyph)).toEqual(STAGES.map((stage) => stage.reward.glyph));
    expect(section.items.map((item) => item.stageTitle)).toEqual(STAGES.map((stage) => stage.title));
  });

  it("没有任何 progress 时全部按未获得处理，不报错", () => {
    const section = buildCollectionRewardSection({ stages: STAGES, chapterProgress: {} });

    expect(section.earnedCount).toBe(0);
    expect(section.text).toBe("0 / 7");
    expect(section.items.every((item) => !item.earned)).toBe(true);
  });

  it("关卡列表为空时不崩，给出空状态文案", () => {
    const section = buildCollectionRewardSection({ stages: [], chapterProgress: {} });

    expect(section.totalCount).toBe(0);
    expect(section.text).toBe("0 / 0");
    expect(section.items).toEqual([]);
  });
});

describe("adventureCollectionBook · 本章成就", () => {
  const ACHIEVEMENTS = Object.freeze([
    { id: "first-clear", glyph: "启", name: "初次靠岸", summary: "通过任意一关。", isUnlocked: true, progressText: "已通过 2 关" },
    { id: "collector-3", glyph: "藏", name: "收藏上手", summary: "收下 3 件收藏。", isUnlocked: false, progressText: "收藏 2 / 3" },
    { id: "route-cleared", glyph: "通", name: "章节通关", summary: "通过全部关卡。", isUnlocked: false, progressText: "通关 2 / 7" }
  ]);

  it("直接复用传入的成就判定结果（状态 + progressText），不重新定义规则", () => {
    const section = buildCollectionAchievementSection({ achievements: ACHIEVEMENTS });

    expect(section.text).toBe("1 / 3");
    expect(section.items[0]).toMatchObject({ name: "初次靠岸", statusLabel: "已达成", isUnlocked: true, progressText: "已通过 2 关" });
    expect(section.items[1]).toMatchObject({ name: "收藏上手", statusLabel: "进行中", isUnlocked: false, progressText: "收藏 2 / 3" });
    expect(section.items[2].progressText).toBe("通关 2 / 7");
  });

  it("没有成就数据时返回空列表而不是伪造成就", () => {
    const section = buildCollectionAchievementSection({});

    expect(section.items).toEqual([]);
    expect(section.totalCount).toBe(0);
    expect(section.text).toBe("0 / 0");
  });
});

describe("adventureCollectionBook · 章节作用域", () => {
  it("顶部作用域文案是「年级 · 学期 · 路线名称」", () => {
    expect(buildCollectionScopeLabel(GRADE_THREE_UPPER)).toBe("三年级 · 上册 · 方法上手线");
    expect(buildCollectionScopeLabel(GRADE_FOUR_UPPER)).toBe("四年级 · 上册 · 读题转弯线");
  });

  it("缺字段时降级但不出现 undefined", () => {
    expect(buildCollectionScopeLabel({ grade: "三年级", semester: "上册" })).toBe("三年级 · 上册");
    expect(buildCollectionScopeLabel({ label: "三年级上册" })).toBe("三年级上册");
    expect(buildCollectionScopeLabel({})).toBe("当前章节");
  });

  it("传哪一章就只展示哪一章：两章的收藏 / 成就 / 作用域互不串台", () => {
    // 三年级：2 件收藏；四年级：5 件收藏。这是「首页 A 章、点进去 B 章」的回归点。
    const threeBook = buildAdventureCollectionBook({
      chapter: GRADE_THREE_UPPER,
      stages: STAGES,
      chapterProgress: buildProgress({ rewards: [true, true] }),
      achievements: [{ id: "first-clear", glyph: "启", name: "初次靠岸", isUnlocked: true, progressText: "已通过 2 关" }],
      growthProgress: buildGrowthProgress()
    });
    const fourBook = buildAdventureCollectionBook({
      chapter: GRADE_FOUR_UPPER,
      stages: STAGES,
      chapterProgress: buildProgress({ rewards: [true, true, true, true, true] }),
      achievements: [{ id: "collector-3", glyph: "藏", name: "收藏上手", isUnlocked: true, progressText: "收藏 5 / 3" }],
      growthProgress: buildGrowthProgress()
    });

    expect(threeBook.chapterId).toBe("chapter-grade-3-upper");
    expect(threeBook.scopeLabel).toBe("三年级 · 上册 · 方法上手线");
    expect(threeBook.rewards.text).toBe("2 / 7");
    expect(threeBook.rewards.items[2].earned).toBe(false);
    expect(threeBook.achievements.items[0].name).toBe("初次靠岸");

    expect(fourBook.chapterId).toBe("chapter-grade-4-upper");
    expect(fourBook.scopeLabel).toBe("四年级 · 上册 · 读题转弯线");
    expect(fourBook.rewards.text).toBe("5 / 7");
    expect(fourBook.rewards.items[4].earned).toBe(true);
    expect(fourBook.achievements.items[0].name).toBe("收藏上手");
  });

  it("组装结果永远带上三块内容与固定标题", () => {
    const book = buildAdventureCollectionBook({
      chapter: GRADE_THREE_UPPER,
      stages: STAGES,
      chapterProgress: buildProgress(),
      achievements: [],
      growthProgress: buildGrowthProgress()
    });

    expect(book.title).toBe("我的探险收藏册");
    expect(book.emoji).toBe("⛵");
    expect(book.islandName).toBe("澎湖湾");
    expect(book.rewards.title).toBe("本章航海收藏");
    expect(book.achievements.title).toBe("本章成就");
    expect(book.stamps.countLabel).toBe("探险印章");
  });

  it("第一块是「我的知识岛」，并带上长期 / 跨章节的作用域提示", () => {
    const book = buildAdventureCollectionBook({
      chapter: GRADE_THREE_UPPER,
      stages: STAGES,
      chapterProgress: buildProgress(),
      achievements: [],
      growthProgress: buildGrowthProgress({ dateKeys: ["2026-09-22", "2026-09-21", "2026-09-20"] })
    });

    // 第一块换了标题，但印章数据一个都没少。
    expect(book.stamps.islandTitle).toBe("我的知识岛");
    expect(book.stamps.total).toBe(3);
    expect(book.stamps.countText).toBe("累计 3 枚探险印章");
    // 顶部作用域仍然只描述当前章节。
    expect(book.scopeLabel).toBe("三年级 · 上册 · 方法上手线");
    // 长期作用域只在知识岛块内部说明一次。
    expect(book.stamps.knowledgeIsland.islandScopeText).toContain("长期成长");
    expect(book.stamps.knowledgeIsland.islandScopeText).toContain("小岛长大");
    expect(book.stamps.islandHintText).toContain("现在的小岛有");
    // 下面两块仍然明确是本章作用域。
    expect(book.rewards.title).toContain("本章");
    expect(book.achievements.title).toContain("本章");
  });

  it("换章节只影响本章两块，知识岛逐字段不变（跨章节审计）", () => {
    const growthProgress = buildGrowthProgress({ dateKeys: ["2026-09-22", "2026-09-21"] });
    // 三年级：2 件收藏；四年级：5 件收藏，其余数据故意不同。
    const threeBook = buildAdventureCollectionBook({
      chapter: GRADE_THREE_UPPER,
      stages: STAGES,
      chapterProgress: buildProgress({ rewards: [true, true] }),
      achievements: [{ id: "first-clear", glyph: "启", name: "初次靠岸", isUnlocked: true, progressText: "已通过 2 关" }],
      growthProgress
    });
    const fourBook = buildAdventureCollectionBook({
      chapter: GRADE_FOUR_UPPER,
      stages: STAGES,
      chapterProgress: buildProgress({ rewards: [true, true, true, true, true] }),
      achievements: [{ id: "collector-3", glyph: "藏", name: "收藏上手", isUnlocked: false, progressText: "收藏 5 / 3" }],
      growthProgress
    });

    // 知识岛：与章节无关，逐字段一致。
    expect(fourBook.stamps.knowledgeIsland).toEqual(threeBook.stamps.knowledgeIsland);
    expect(fourBook.stamps.total).toBe(threeBook.stamps.total);
    expect(fourBook.stamps.recentClaims).toEqual(threeBook.stamps.recentClaims);
    expect(fourBook.stamps.islandTitle).toBe(threeBook.stamps.islandTitle);

    // 本章两块：随章节变化。
    expect(fourBook.scopeLabel).not.toBe(threeBook.scopeLabel);
    expect(fourBook.rewards.earnedCount).not.toBe(threeBook.rewards.earnedCount);
    expect(fourBook.achievements.items[0].id).not.toBe(threeBook.achievements.items[0].id);
    expect(fourBook.achievements.text).not.toBe(threeBook.achievements.text);
  });
});
