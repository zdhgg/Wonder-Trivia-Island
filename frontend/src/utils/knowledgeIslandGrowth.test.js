import { describe, expect, it } from "vitest";
import { buildAdventureCollectionBook } from "./adventureCollectionBook.js";
import { buildHomeDashboard } from "./homeDashboard.js";
import {
  KNOWLEDGE_ISLAND_STAGES,
  buildKnowledgeIslandGrowth,
  isKnowledgeIslandMaxStage,
  normalizeKnowledgeIslandStampCount,
  resolveKnowledgeIslandStageIndex
} from "./knowledgeIslandGrowth.js";

// 本轮阈值固定，测试里也写死这一组，改动阈值必须同时改这里（防止“顺手调参”）。
const FIXED_THRESHOLDS = Object.freeze([0, 3, 7, 15, 30]);

function stageAt(threshold) {
  return KNOWLEDGE_ISLAND_STAGES.find((stage) => stage.threshold === threshold);
}

// 用真实关卡配置形状喂给收藏册，保证收藏册分支也是真跑的。
const CHAPTER = Object.freeze({
  id: "chapter-grade-3-upper",
  grade: "三年级",
  semester: "上册",
  islandName: "澎湖湾",
  themeTitle: "远航码头",
  emoji: "⛵",
  routeTitle: "方法上手线"
});

const STAGES = Object.freeze([
  { id: "stage-1", title: "海边码头", glyph: "海", reward: { id: "harbor-ticket", glyph: "票", name: "启航船票" } }
]);

function buildGrowthProgress({ stampCount = 0, dateKeys = [] } = {}) {
  return {
    version: 1,
    totalDailyChests: stampCount,
    dailyClaims: Object.fromEntries(dateKeys.map((dateKey) => [dateKey, { claimedAt: `${dateKey}T08:00:00.000Z` }]))
  };
}

// 收藏册只传账本（内部自己取印章数），首页只传 stampCount —— 两条真实路径。
function readCollectionBookStageId(stampCount) {
  const book = buildAdventureCollectionBook({
    chapter: CHAPTER,
    stages: STAGES,
    chapterProgress: {},
    achievements: [],
    growthProgress: buildGrowthProgress({ stampCount })
  });

  return book.stamps.knowledgeIsland.currentStage.id;
}

function readHomeSummaryStageId(stampCount) {
  const dashboard = buildHomeDashboard({ growthProgress: buildGrowthProgress({ stampCount }) });

  return dashboard.growth.knowledgeIsland.currentStage.id;
}

describe("knowledgeIslandGrowth · 阶段配置", () => {
  it("阈值严格递增且与本轮固定值一致", () => {
    const thresholds = KNOWLEDGE_ISLAND_STAGES.map((stage) => stage.threshold);

    expect(thresholds).toEqual(FIXED_THRESHOLDS);

    for (let index = 1; index < thresholds.length; index += 1) {
      expect(thresholds[index]).toBeGreaterThan(thresholds[index - 1]);
    }
  });

  it("每个阶段都有稳定的 id / name / glyph / summary / features", () => {
    const ids = KNOWLEDGE_ISLAND_STAGES.map((stage) => stage.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const stage of KNOWLEDGE_ISLAND_STAGES) {
      expect(stage.id).toBeTruthy();
      expect(stage.name).toBeTruthy();
      expect(stage.glyph).toBeTruthy();
      expect(stage.summary).toBeTruthy();
      expect(Array.isArray(stage.features)).toBe(true);
      expect(stage.features.length).toBeGreaterThan(0);
    }
  });

  it("阶段只增长：后面的阶段元素只多不少，不会把前一阶段的元素拿走", () => {
    for (let index = 1; index < KNOWLEDGE_ISLAND_STAGES.length; index += 1) {
      const previousFeatures = KNOWLEDGE_ISLAND_STAGES[index - 1].features;
      const currentFeatures = KNOWLEDGE_ISLAND_STAGES[index].features;

      expect(currentFeatures.length).toBeGreaterThan(previousFeatures.length);
      expect(currentFeatures.slice(0, previousFeatures.length)).toEqual([...previousFeatures]);
    }
  });

  it("阶段配置对象是只读的，不会被组件改写", () => {
    expect(Object.isFrozen(KNOWLEDGE_ISLAND_STAGES)).toBe(true);
    expect(KNOWLEDGE_ISLAND_STAGES.every((stage) => Object.isFrozen(stage))).toBe(true);
  });
});

describe("knowledgeIslandGrowth · 阶段边界", () => {
  it("0 枚进入第一阶段，并且已经是一座“刚刚开始”的小岛", () => {
    const growth = buildKnowledgeIslandGrowth(0);

    expect(growth.currentStage.id).toBe(stageAt(0).id);
    expect(growth.currentStage.name).toBe(stageAt(0).name);
    // 0 枚也不能是空白：第一阶段就有自己的岛上元素。
    expect(growth.currentStage.features.length).toBeGreaterThan(0);
    expect(growth.progressValue).toBe(0);
    expect(growth.progressTarget).toBe(3);
    expect(growth.progressPercent).toBe(0);
    expect(growth.stampText).toBe("已经攒了 0 枚探险印章");
  });

  it("1 / 2 枚仍在第一阶段，进度按当前区间增长", () => {
    const one = buildKnowledgeIslandGrowth(1);
    const two = buildKnowledgeIslandGrowth(2);

    expect(one.currentStage.id).toBe(stageAt(0).id);
    expect(one.progressValue).toBe(1);
    expect(one.progressTarget).toBe(3);
    expect(one.progressPercent).toBe(33);
    expect(one.remainingToNext).toBe(2);

    expect(two.currentStage.id).toBe(stageAt(0).id);
    expect(two.progressValue).toBe(2);
    expect(two.progressPercent).toBe(67);
    expect(two.remainingToNext).toBe(1);
  });

  it("恰好 3 枚立刻进入第二阶段，且新阶段进度从 0 重新开始", () => {
    const growth = buildKnowledgeIslandGrowth(3);

    expect(growth.currentStage.id).toBe(stageAt(3).id);
    expect(growth.currentStage.threshold).toBe(3);
    expect(growth.progressValue).toBe(0);
    expect(growth.progressTarget).toBe(4);
    expect(growth.progressPercent).toBe(0);
    expect(growth.remainingToNext).toBe(4);
  });

  it("4 枚的进度是 1 / 4 = 25%，而不是 4 / 7", () => {
    const growth = buildKnowledgeIslandGrowth(4);

    expect(growth.currentStage.threshold).toBe(3);
    expect(growth.nextStage.threshold).toBe(7);
    expect(growth.progressValue).toBe(1);
    expect(growth.progressTarget).toBe(4);
    expect(growth.progressPercent).toBe(25);
    expect(growth.remainingToNext).toBe(3);
  });

  it("6 枚是第二阶段最后一步（3 / 4）", () => {
    const growth = buildKnowledgeIslandGrowth(6);

    expect(growth.currentStage.id).toBe(stageAt(3).id);
    expect(growth.progressValue).toBe(3);
    expect(growth.progressTarget).toBe(4);
    expect(growth.progressPercent).toBe(75);
    expect(growth.remainingToNext).toBe(1);
  });

  it("恰好 7 枚进入第三阶段", () => {
    const growth = buildKnowledgeIslandGrowth(7);

    expect(growth.currentStage.id).toBe(stageAt(7).id);
    expect(growth.currentStage.name).toBe(stageAt(7).name);
    expect(growth.nextStage.id).toBe(stageAt(15).id);
    expect(growth.progressTarget).toBe(8);
    expect(growth.progressPercent).toBe(0);
  });

  it("14 枚是第三阶段最后一步", () => {
    const growth = buildKnowledgeIslandGrowth(14);

    expect(growth.currentStage.id).toBe(stageAt(7).id);
    expect(growth.progressValue).toBe(7);
    expect(growth.progressTarget).toBe(8);
    expect(growth.progressPercent).toBe(88);
    expect(growth.remainingToNext).toBe(1);
  });

  it("恰好 15 枚进入第四阶段", () => {
    const growth = buildKnowledgeIslandGrowth(15);

    expect(growth.currentStage.id).toBe(stageAt(15).id);
    expect(growth.nextStage.id).toBe(stageAt(30).id);
    expect(growth.progressTarget).toBe(15);
    expect(growth.progressPercent).toBe(0);
  });

  it("29 枚是第四阶段最后一步", () => {
    const growth = buildKnowledgeIslandGrowth(29);

    expect(growth.currentStage.id).toBe(stageAt(15).id);
    expect(growth.progressValue).toBe(14);
    expect(growth.progressTarget).toBe(15);
    expect(growth.progressPercent).toBe(93);
    expect(growth.remainingToNext).toBe(1);
  });
});

describe("knowledgeIslandGrowth · 最高阶段", () => {
  it("恰好 30 枚进入最高阶段：进度满、不再有下一阶段", () => {
    const growth = buildKnowledgeIslandGrowth(30);

    expect(growth.currentStage.id).toBe(stageAt(30).id);
    expect(growth.isMaxStage).toBe(true);
    expect(growth.hasNextStage).toBe(false);
    expect(growth.nextStage).toBeNull();
    expect(growth.progressPercent).toBe(100);
    expect(growth.remainingToNext).toBe(0);
    expect(growth.nextText).not.toContain("再攒");
    // 最高阶段不说“满级”这种系统词。
    expect(growth.nextText).not.toContain("满级");
    expect(growth.nextText).toContain("热闹");
  });

  it("超过 30 枚（31 / 100）停留最高阶段，不出现错误进度或负数", () => {
    for (const stampCount of [31, 100, 100000]) {
      const growth = buildKnowledgeIslandGrowth(stampCount);

      expect(growth.stampCount).toBe(stampCount);
      expect(growth.currentStage.id).toBe(stageAt(30).id);
      expect(growth.isMaxStage).toBe(true);
      expect(growth.progressPercent).toBe(100);
      expect(growth.progressValue).toBe(0);
      expect(growth.progressTarget).toBe(0);
      expect(growth.remainingToNext).toBe(0);
      expect(growth.nextText).not.toContain("再攒");
    }
  });

  it("任何一个阶段都不会出现负数、NaN 或超过 100% 的进度", () => {
    for (const stampCount of [0, 1, 2, 3, 6, 7, 14, 15, 29, 30, 31, 100]) {
      const growth = buildKnowledgeIslandGrowth(stampCount);

      expect(Number.isFinite(growth.progressValue)).toBe(true);
      expect(Number.isFinite(growth.progressTarget)).toBe(true);
      expect(growth.progressValue).toBeGreaterThanOrEqual(0);
      expect(growth.progressTarget).toBeGreaterThanOrEqual(0);
      // 最高阶段 progressTarget 为 0（没有下一阶段），其余阶段 value 不能超过 target。
      if (growth.progressTarget > 0) {
        expect(growth.progressValue).toBeLessThanOrEqual(growth.progressTarget);
      }
      expect(growth.progressPercent).toBeGreaterThanOrEqual(0);
      expect(growth.progressPercent).toBeLessThanOrEqual(100);
      expect(growth.remainingToNext).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("knowledgeIslandGrowth · 非法输入", () => {
  it("异常输入安全归零，仍然返回一座可展示的小岛", () => {
    const brokenInputs = [undefined, null, "", "   ", "abc", NaN, -1, -100, {}, [], true, false, () => {}];

    for (const brokenInput of brokenInputs) {
      const growth = buildKnowledgeIslandGrowth(brokenInput);

      expect(growth.stampCount).toBe(0);
      expect(growth.currentStage.id).toBe(stageAt(0).id);
      expect(growth.progressPercent).toBe(0);
      expect(Number.isNaN(growth.progressPercent)).toBe(false);
      expect(Number.isNaN(growth.remainingToNext)).toBe(false);
      expect(growth.remainingToNext).toBe(3);
    }
  });

  it("小数向下取整、数字字符串按数字处理，不做模糊猜测", () => {
    expect(normalizeKnowledgeIslandStampCount(6.9)).toBe(6);
    expect(normalizeKnowledgeIslandStampCount("6")).toBe(6);
    expect(normalizeKnowledgeIslandStampCount("6 枚")).toBe(6);
    expect(normalizeKnowledgeIslandStampCount("七")).toBe(0);
    expect(buildKnowledgeIslandGrowth(6.9).stampCount).toBe(6);
  });

  it("不传参数时等价于 0 枚", () => {
    expect(buildKnowledgeIslandGrowth().stampCount).toBe(0);
    expect(resolveKnowledgeIslandStageIndex()).toBe(0);
    expect(isKnowledgeIslandMaxStage()).toBe(false);
  });
});

describe("knowledgeIslandGrowth · 首页与收藏册同口径", () => {
  it("同一枚印章数下，首页摘要与收藏册得到完全相同的阶段", () => {
    for (const stampCount of [0, 1, 2, 3, 4, 6, 7, 14, 15, 29, 30, 31, 100]) {
      const homeStageId = readHomeSummaryStageId(stampCount);
      const bookStageId = readCollectionBookStageId(stampCount);
      const pureStageId = buildKnowledgeIslandGrowth(stampCount).currentStage.id;

      // 两处都必须等于同一个纯函数的结论，不允许各自算一遍。
      expect(homeStageId).toBe(pureStageId);
      expect(bookStageId).toBe(pureStageId);
    }
  });

  it("0 枚时首页与收藏册都在第一阶段", () => {
    expect(readHomeSummaryStageId(0)).toBe(stageAt(0).id);
    expect(readCollectionBookStageId(0)).toBe(stageAt(0).id);
  });

  it("恰好 7 枚时首页与收藏册一起切到第三阶段", () => {
    expect(readHomeSummaryStageId(7)).toBe(stageAt(7).id);
    expect(readCollectionBookStageId(7)).toBe(stageAt(7).id);
  });

  it("30 枚时首页与收藏册都是最高阶段", () => {
    const dashboard = buildHomeDashboard({ growthProgress: buildGrowthProgress({ stampCount: 30 }) });
    const book = buildAdventureCollectionBook({
      chapter: CHAPTER,
      stages: STAGES,
      chapterProgress: {},
      achievements: [],
      growthProgress: buildGrowthProgress({ stampCount: 30 })
    });

    expect(dashboard.growth.knowledgeIsland.isMaxStage).toBe(true);
    expect(book.stamps.knowledgeIsland.isMaxStage).toBe(true);
    expect(dashboard.growth.knowledgeIsland.nextText).toBe(book.stamps.knowledgeIsland.nextText);
    expect(dashboard.growth.knowledgeIsland.nextText).not.toContain("再攒");
  });

  it("收藏册的印章数仍然只来自同一个账本，没有第二套数字", () => {
    const book = buildAdventureCollectionBook({
      chapter: CHAPTER,
      stages: STAGES,
      chapterProgress: {},
      achievements: [],
      growthProgress: buildGrowthProgress({ stampCount: 5, dateKeys: ["2026-09-22"] })
    });

    expect(book.stamps.total).toBe(5);
    expect(book.stamps.knowledgeIsland.stampCount).toBe(5);
    expect(book.stamps.knowledgeIsland.stampText).toBe("已经攒了 5 枚探险印章");
    // 最近领取日期仍然保留（原“探险印章”的数据没有消失）。
    expect(book.stamps.recentClaims[0].label).toBe("9 月 22 日");
  });

  it("知识岛的作用域提示只说长期 / 跨章节，不写成别的账户口径", () => {
    const scopeText = buildKnowledgeIslandGrowth(7).islandScopeText;

    // 收藏册顶部是“本章”作用域，这里必须能对冲掉“知识岛只属于当前这一章”的误读。
    expect(scopeText).toContain("长期成长");
    expect(scopeText).toContain("小岛长大");
    // 不引入账户 / 全服 / 等级这套系统词。
    for (const forbidden of ["全局", "账户", "账号", "全服", "等级", "满级", "XP", "经验值"]) {
      expect(scopeText).not.toContain(forbidden);
    }
    // 不是“跨 profile”，是“跨章节”。
    expect(scopeText).not.toContain("profile");
  });

  it("首页三个本章指标不受知识岛影响", () => {
    const dashboard = buildHomeDashboard({
      growthSource: { totalStars: 3, starTotal: 21, rewardCount: 1, rewardTotal: 7 },
      growthProgress: buildGrowthProgress({ stampCount: 13 })
    });

    expect(dashboard.growth.starText).toBe("3 / 21");
    expect(dashboard.growth.rewardText).toBe("1 / 7");
    expect(dashboard.growth.stampCount).toBe(13);
    expect(dashboard.growth.knowledgeIsland.currentStage.id).toBe(stageAt(7).id);
    expect(dashboard.growth.knowledgeIsland.nextText).toBe("再攒 2 枚印章，小岛会有新变化");
  });
});
