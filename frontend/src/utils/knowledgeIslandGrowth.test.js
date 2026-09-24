import { describe, expect, it } from "vitest";
import { buildAdventureCollectionBook } from "./adventureCollectionBook.js";
import { buildHomeDashboard } from "./homeDashboard.js";
import {
  KNOWLEDGE_ISLAND_STAGES,
  buildKnowledgeIslandGrowth,
  buildKnowledgeIslandStageTransition,
  getKnowledgeIslandFeatureGlyph,
  getKnowledgeIslandStageIndexById,
  isKnowledgeIslandMaxStage,
  isKnowledgeIslandStageAtOrAfter,
  isValidKnowledgeIslandStampCount,
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

describe("knowledgeIslandGrowth · 阶段顺序的唯一来源", () => {
  it("阶段索引完全来自 KNOWLEDGE_ISLAND_STAGES，不再需要组件本地顺序数组", () => {
    KNOWLEDGE_ISLAND_STAGES.forEach((stage, index) => {
      expect(getKnowledgeIslandStageIndexById(stage.id)).toBe(index);
    });

    // 第一个 / 最后一个都要能定位。
    expect(getKnowledgeIslandStageIndexById(KNOWLEDGE_ISLAND_STAGES[0].id)).toBe(0);
    expect(getKnowledgeIslandStageIndexById(KNOWLEDGE_ISLAND_STAGES.at(-1).id)).toBe(KNOWLEDGE_ISLAND_STAGES.length - 1);
  });

  it("未知 / 非法 stage id 安全返回 -1，不猜也不抛错", () => {
    for (const brokenStageId of [undefined, null, "", "   ", "not-a-stage", 0, {}, []]) {
      expect(getKnowledgeIslandStageIndexById(brokenStageId)).toBe(-1);
    }
  });

  it("stageAtOrAfter 用阶段顺序比较，未知 id 一律返回 false", () => {
    expect(isKnowledgeIslandStageAtOrAfter("palm-camp", "sprout-coast")).toBe(true);
    expect(isKnowledgeIslandStageAtOrAfter("palm-camp", "palm-camp")).toBe(true);
    expect(isKnowledgeIslandStageAtOrAfter("palm-camp", "explorer-dock")).toBe(false);
    expect(isKnowledgeIslandStageAtOrAfter("first-sight", "first-sight")).toBe(true);
    expect(isKnowledgeIslandStageAtOrAfter("knowledge-lighthouse", "first-sight")).toBe(true);

    // 任何一边是未知 id 都不成立（安全方向：宁可不显示，也不误显示）。
    expect(isKnowledgeIslandStageAtOrAfter("unknown", "sprout-coast")).toBe(false);
    expect(isKnowledgeIslandStageAtOrAfter("palm-camp", "unknown")).toBe(false);
    expect(isKnowledgeIslandStageAtOrAfter(undefined, undefined)).toBe(false);
  });

  it("岛上元素图标集中在纯函数层，收藏册与庆祝层共用同一份", () => {
    expect(getKnowledgeIslandFeatureGlyph("嫩芽")).toBe("🌱");
    expect(getKnowledgeIslandFeatureGlyph("小草丛")).toBe("🌿");
    expect(getKnowledgeIslandFeatureGlyph("椰子树")).toBe("🌴");
    expect(getKnowledgeIslandFeatureGlyph("小帐篷")).toBe("⛺");
    expect(getKnowledgeIslandFeatureGlyph("泊岸小船")).toBe("⛵");
    expect(getKnowledgeIslandFeatureGlyph("灯塔")).toBe("🗼");
    expect(getKnowledgeIslandFeatureGlyph("灯光")).toBe("💡");
    expect(getKnowledgeIslandFeatureGlyph("不存在的东西")).toBe("");
    expect(getKnowledgeIslandFeatureGlyph(undefined)).toBe("");
  });
});

describe("knowledgeIslandGrowth · 一次性事件的严格输入语义", () => {
  // 展示层容错归零没有问题；但“一次性事件检测”不能容错，
  // 否则一次脏输入就会被当成真实的 0 → N 领取，弹出虚假庆祝。
  it("只接受非负整数 number", () => {
    for (const validValue of [0, 1, 2, 3, 7, 15, 29, 30, 100, 10000]) {
      expect(isValidKnowledgeIslandStampCount(validValue)).toBe(true);
    }

    for (const invalidValue of [
      undefined,
      null,
      "",
      " ",
      "0",
      "3",
      "abc",
      NaN,
      Infinity,
      -Infinity,
      -1,
      -100,
      2.5,
      0.1,
      Number.MAX_SAFE_INTEGER + 2,
      true,
      false,
      {},
      [],
      [3],
      () => {},
      Symbol("3"),
      3n
    ]) {
      expect(isValidKnowledgeIslandStampCount(invalidValue)).toBe(false);
    }
  });
});

describe("knowledgeIslandGrowth · 阶段变化 transition", () => {
  it("没跨阶段时一律返回 null（同值 / 普通 +1 / 倒退）", () => {
    // 普通领取：没到阈值
    expect(buildKnowledgeIslandStageTransition(0, 1)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(1, 2)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(3, 4)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(4, 5)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(7, 8)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(15, 16)).toBeNull();

    // 同值
    expect(buildKnowledgeIslandStageTransition(3, 3)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(0, 0)).toBeNull();

    // 倒退
    expect(buildKnowledgeIslandStageTransition(7, 6)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(30, 29)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(15, 0)).toBeNull();

    // 最高阶段之后再涨也不再“进阶段”
    expect(buildKnowledgeIslandStageTransition(30, 31)).toBeNull();
    expect(buildKnowledgeIslandStageTransition(30, 100)).toBeNull();
  });

  it("恰好跨过阈值时返回 transition，并带上正确的起止阶段", () => {
    const sprout = buildKnowledgeIslandStageTransition(2, 3);

    expect(sprout).not.toBeNull();
    expect(sprout.previousStampCount).toBe(2);
    expect(sprout.nextStampCount).toBe(3);
    expect(sprout.fromStage.id).toBe("first-sight");
    expect(sprout.toStage.id).toBe("sprout-coast");
    expect(sprout.fromStageIndex).toBe(0);
    expect(sprout.toStageIndex).toBe(1);
    expect(sprout.isMaxStageReached).toBe(false);
    expect(sprout.title).toBe("小岛有新变化啦！");
    expect(sprout.actionLabel).toBe("去看看我的知识岛");
    expect(sprout.dismissLabel).toBe("知道啦");

    expect(buildKnowledgeIslandStageTransition(6, 7).toStage.id).toBe("palm-camp");
    expect(buildKnowledgeIslandStageTransition(14, 15).toStage.id).toBe("explorer-dock");

    const lighthouse = buildKnowledgeIslandStageTransition(29, 30);

    expect(lighthouse.toStage.id).toBe("knowledge-lighthouse");
    expect(lighthouse.toStage.name).toBe("知识灯塔");
    expect(lighthouse.isMaxStageReached).toBe(true);
    // 最高阶段用儿童化的完成表达，不出现“满级 / 等级 / XP”。
    for (const forbidden of ["满级", "等级", "Level", "XP", "经验值", "升级"]) {
      expect(lighthouse.celebrateText).not.toContain(forbidden);
      expect(lighthouse.title).not.toContain(forbidden);
    }
  });

  it("newFeatures 是阶段配置的差集：toStage.features - fromStage.features", () => {
    expect(buildKnowledgeIslandStageTransition(2, 3).newFeatures.map((feature) => feature.name)).toEqual([
      "嫩芽",
      "小草丛"
    ]);
    expect(buildKnowledgeIslandStageTransition(6, 7).newFeatures.map((feature) => feature.name)).toEqual([
      "椰子树",
      "小帐篷"
    ]);
    expect(buildKnowledgeIslandStageTransition(14, 15).newFeatures.map((feature) => feature.name)).toEqual([
      "小码头",
      "泊岸小船"
    ]);
    expect(buildKnowledgeIslandStageTransition(29, 30).newFeatures.map((feature) => feature.name)).toEqual([
      "灯塔",
      "灯光"
    ]);

    // 每件新元素都带图标（图标只在纯函数层定义一次）。
    for (const transition of [
      buildKnowledgeIslandStageTransition(2, 3),
      buildKnowledgeIslandStageTransition(6, 7),
      buildKnowledgeIslandStageTransition(14, 15),
      buildKnowledgeIslandStageTransition(29, 30)
    ]) {
      expect(transition.hasNewFeatures).toBe(true);
      expect(transition.newFeatures.every((feature) => feature.glyph)).toBe(true);
    }
  });

  it("2 → 3 的差集确实等于「进阶后多出来的元素」，不重复前一阶段已经有的", () => {
    const sprout = buildKnowledgeIslandStageTransition(2, 3);
    const fromFeatures = stageAt(0).features;
    const toFeatures = stageAt(3).features;

    expect(toFeatures.filter((feature) => !fromFeatures.includes(feature))).toEqual(
      sprout.newFeatures.map((feature) => feature.name)
    );
    // 沙滩 / 海浪 不是新出现的。
    expect(sprout.newFeatures.map((feature) => feature.name)).not.toContain("沙滩");
    expect(sprout.newFeatures.map((feature) => feature.name)).not.toContain("海浪");
  });

  it("island 直接复用 buildKnowledgeIslandGrowth，庆祝与收藏册是同一座岛", () => {
    for (const [previousStampCount, nextStampCount] of [
      [2, 3],
      [6, 7],
      [14, 15],
      [29, 30]
    ]) {
      const transition = buildKnowledgeIslandStageTransition(previousStampCount, nextStampCount);

      expect(transition.island).toEqual(buildKnowledgeIslandGrowth(nextStampCount));
      expect(transition.island.currentStage.id).toBe(transition.toStage.id);
      expect(transition.island.stampCount).toBe(nextStampCount);
    }

    // 最高阶段：不再提示“再攒 X 枚”。
    const lighthouse = buildKnowledgeIslandStageTransition(29, 30);

    expect(lighthouse.island.isMaxStage).toBe(true);
    expect(lighthouse.island.progressPercent).toBe(100);
    expect(lighthouse.island.remainingToNext).toBe(0);
    expect(lighthouse.island.nextText).not.toContain("再攒");
  });

  it("一次跳过多个阶段也只产生一个 transition（不做庆祝队列）", () => {
    const jumped = buildKnowledgeIslandStageTransition(2, 15);

    expect(jumped).not.toBeNull();
    expect(jumped.toStage.id).toBe("explorer-dock");
    expect(jumped.fromStage.id).toBe("first-sight");
    expect(jumped.toStageIndex).toBe(3);
    // 期间跨过的所有新元素一次性给全：嫩芽 / 小草丛 / 椰子树 / 小帐篷 / 小码头 / 泊岸小船。
    expect(jumped.newFeatures.map((feature) => feature.name)).toEqual([
      "嫩芽",
      "小草丛",
      "椰子树",
      "小帐篷",
      "小码头",
      "泊岸小船"
    ]);

    const bigJump = buildKnowledgeIslandStageTransition(0, 30);

    expect(bigJump.toStage.id).toBe("knowledge-lighthouse");
    expect(bigJump.isMaxStageReached).toBe(true);
    expect(bigJump.newFeatures).toHaveLength(stageAt(30).features.length - stageAt(0).features.length);
  });

  it("非法输入一律返回 null，绝不因为容错归零产生虚假庆祝", () => {
    // 反方向：第二个参数非法。
    const brokenPairs = [
      [undefined, undefined],
      [null, null],
      ["", ""],
      ["abc", "def"],
      [NaN, NaN],
      [-5, -1],
      [{}, []],
      [true, false],
      [() => {}, () => {}],
      // 一边合法、一边非法：不允许把非法那边归零后继续比较。
      [undefined, 3],
      [null, 3],
      ["abc", 3],
      [3, undefined],
      [3, null],
      [3, "abc"],
      [{}, 3],
      [[], 3],
      [NaN, 3],
      [-1, 3],
      [3, {}],
      [3, []],
      [3, NaN],
      [3, -1],
      // 严格 number 语义：数字字符串也不接受。
      ["2", 3],
      [3, "4"],
      ["2", "3"],
      // 小数不是非负整数。
      [2.5, 3],
      [2, 3.5],
      [2.5, 3.5],
      // 其它类型
      [true, 3],
      [3, true],
      [() => {}, 3],
      [3, () => {}],
      [Number.MAX_SAFE_INTEGER + 2, 3]
    ];

    for (const [previousStampCount, nextStampCount] of brokenPairs) {
      expect(buildKnowledgeIslandStageTransition(previousStampCount, nextStampCount)).toBeNull();
    }
  });

  it("合法输入就是两个非负整数 number，transition 里原样保留", () => {    const transition = buildKnowledgeIslandStageTransition(2, 3);

    expect(transition.previousStampCount).toBe(2);
    expect(transition.nextStampCount).toBe(3);
    expect(Number.isInteger(transition.previousStampCount)).toBe(true);
    expect(Number.isInteger(transition.nextStampCount)).toBe(true);
  });

  it("展示层仍然容错归零，与 transition 的严格语义刻意不同", () => {
    // 展示：异常输入 → 0 枚，仍然能渲染。
    for (const brokenInput of [undefined, null, "", "abc", NaN, -1, {}, []]) {
      expect(normalizeKnowledgeIslandStampCount(brokenInput)).toBe(0);
      expect(buildKnowledgeIslandGrowth(brokenInput).stampCount).toBe(0);
    }

    // 一次性事件：同样的输入必须直接 null，不能变成 0 → N。
    expect(buildKnowledgeIslandStageTransition(undefined, 3)).toBeNull();
    expect(isValidKnowledgeIslandStampCount(undefined)).toBe(false);
    expect(isValidKnowledgeIslandStampCount(0)).toBe(true);
  });

  it("真实领取路径只 +1：只有阈值那一枚会产生反馈", () => {
    const thresholds = KNOWLEDGE_ISLAND_STAGES.map((stage) => stage.threshold).filter((threshold) => threshold > 0);

    for (let stampCount = 0; stampCount <= 35; stampCount += 1) {
      // 真实路径里 previous 会被 max(0, next - 1) 兜到 0，同时必须是合法整数。
      const transition = buildKnowledgeIslandStageTransition(Math.max(0, stampCount - 1), stampCount);
      const shouldCelebrate = thresholds.includes(stampCount);

      if (shouldCelebrate) {
        expect(transition).not.toBeNull();
        expect(transition.nextStampCount).toBe(stampCount);
      } else {
        expect(transition).toBeNull();
      }
    }
  });
});
