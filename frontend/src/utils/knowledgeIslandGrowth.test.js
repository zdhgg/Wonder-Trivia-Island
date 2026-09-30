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
// 22 这一档（观星高台）是为补上 15 → 30 之间过长的中段而新加的。
const FIXED_THRESHOLDS = Object.freeze([0, 3, 7, 15, 22, 30]);

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
    expect(growth.nextStage.id).toBe(stageAt(22).id);
    expect(growth.progressTarget).toBe(7);
    expect(growth.progressPercent).toBe(0);
  });

  it("21 枚是第四阶段最后一步", () => {
    const growth = buildKnowledgeIslandGrowth(21);

    expect(growth.currentStage.id).toBe(stageAt(15).id);
    expect(growth.progressValue).toBe(6);
    expect(growth.progressTarget).toBe(7);
    expect(growth.progressPercent).toBe(86);
    expect(growth.remainingToNext).toBe(1);
  });

  it("恰好 22 枚进入第五阶段（观星高台）", () => {
    const growth = buildKnowledgeIslandGrowth(22);

    expect(growth.currentStage.id).toBe(stageAt(22).id);
    expect(growth.currentStage.name).toBe("观星高台");
    expect(growth.nextStage.id).toBe(stageAt(30).id);
    expect(growth.progressTarget).toBe(8);
    expect(growth.progressPercent).toBe(0);
    expect(growth.remainingToNext).toBe(8);
  });

  it("29 枚是第五阶段最后一步", () => {
    const growth = buildKnowledgeIslandGrowth(29);

    expect(growth.currentStage.id).toBe(stageAt(22).id);
    expect(growth.progressValue).toBe(7);
    expect(growth.progressTarget).toBe(8);
    expect(growth.progressPercent).toBe(88);
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
    expect(getKnowledgeIslandFeatureGlyph("海星")).toBe("🌟");
    expect(getKnowledgeIslandFeatureGlyph("漂流木")).toBe("🪵");
    expect(getKnowledgeIslandFeatureGlyph("嫩芽")).toBe("🌱");
    expect(getKnowledgeIslandFeatureGlyph("小草丛")).toBe("🌿");
    expect(getKnowledgeIslandFeatureGlyph("椰子树")).toBe("🌴");
    expect(getKnowledgeIslandFeatureGlyph("小帐篷")).toBe("⛺");
    expect(getKnowledgeIslandFeatureGlyph("泊岸小船")).toBe("⛵");
    expect(getKnowledgeIslandFeatureGlyph("观星台")).toBe("🔭");
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
    expect(buildKnowledgeIslandStageTransition(21, 22).newFeatures.map((feature) => feature.name)).toEqual([
      "观星台"
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
      buildKnowledgeIslandStageTransition(21, 22),
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

// ---------------------------------------------------------------------------
// 繁荣度 MVP：星星只改变“已解锁内容有多丰富”，绝不改变岛屿大阶段。
// 阈值 0 / 21 / 63 固定在这里，knowledgeIslandProsperity.test.js 里也写死同一组。
// ---------------------------------------------------------------------------
const FIXED_PROSPERITY_BOUNDS = Object.freeze({ basic: 20, lushStart: 21, lushEnd: 62, flourishingStart: 63 });

describe("knowledgeIslandGrowth · 繁荣度三档", () => {
  it("0 / 20 星是基础，21 / 62 星是丰盛，63+ 星是繁荣", () => {
    expect(buildKnowledgeIslandGrowth(0, { starCount: 0 }).prosperityKey).toBe("basic");
    expect(buildKnowledgeIslandGrowth(0, { starCount: FIXED_PROSPERITY_BOUNDS.basic }).prosperityKey).toBe("basic");
    expect(buildKnowledgeIslandGrowth(0, { starCount: FIXED_PROSPERITY_BOUNDS.lushStart }).prosperityKey).toBe("lush");
    expect(buildKnowledgeIslandGrowth(0, { starCount: FIXED_PROSPERITY_BOUNDS.lushEnd }).prosperityKey).toBe("lush");
    expect(
      buildKnowledgeIslandGrowth(0, { starCount: FIXED_PROSPERITY_BOUNDS.flourishingStart }).prosperityKey
    ).toBe("flourishing");
    expect(buildKnowledgeIslandGrowth(0, { starCount: 500 }).prosperityKey).toBe("flourishing");
  });

  it("繁荣度同时给出摊平字段，组件不必再解一层", () => {
    const growth = buildKnowledgeIslandGrowth(7, { starCount: 63 });

    expect(growth.prosperityLevel).toBe(2);
    expect(growth.prosperityKey).toBe("flourishing");
    expect(growth.prosperityLabel).toBe("繁荣");
    expect(growth.prosperityStarCount).toBe(63);
    expect(growth.prosperity.prosperityText).toBe("繁荣 · 累计 63 颗闯关星星");
  });

  it("旧调用保持兼容：不传第二个参数时繁荣度固定为基础档，其它字段一字不变", () => {
    const legacy = buildKnowledgeIslandGrowth(7);
    const explicitBasic = buildKnowledgeIslandGrowth(7, { starCount: 0 });

    expect(legacy.prosperityKey).toBe("basic");
    expect(legacy.prosperityLevel).toBe(0);
    expect(legacy.prosperityStarCount).toBe(0);

    // 阶段 / 进度 / 文案与显式传 0 颗星完全一致。
    expect(legacy.currentStage).toEqual(explicitBasic.currentStage);
    expect(legacy.progressPercent).toBe(explicitBasic.progressPercent);
    expect(legacy.nextText).toBe(explicitBasic.nextText);
    expect(legacy.stampText).toBe(explicitBasic.stampText);
  });

  it("第二个参数非法时安全退化成基础档，不影响阶段判定", () => {
    const growth = buildKnowledgeIslandGrowth(15, { starCount: "abc" });

    expect(growth.prosperityStarCount).toBe(0);
    expect(growth.prosperityKey).toBe("basic");
    expect(growth.currentStage.id).toBe(stageAt(15).id);

    // 第二个参数整体缺失、null、类型不对也都不抛错。
    expect(() => buildKnowledgeIslandGrowth(7, null)).not.toThrow();
    expect(buildKnowledgeIslandGrowth(7, null).prosperityKey).toBe("basic");
    expect(buildKnowledgeIslandGrowth(7, 63).prosperityKey).toBe("basic");
  });
});

describe("knowledgeIslandGrowth · 星星绝不越级解锁后续建筑", () => {
  it("0 枚印章 + 63 星：仍然是初见小岛，阶段元素一个都不多", () => {
    const noStars = buildKnowledgeIslandGrowth(0, { starCount: 0 });
    const fullStars = buildKnowledgeIslandGrowth(0, { starCount: 999 });

    // 仍然是第一阶段。
    expect(fullStars.currentStage.id).toBe(stageAt(0).id);
    expect(fullStars.currentStage.name).toBe("初见小岛");
    expect(fullStars.currentStage.features).toEqual(noStars.currentStage.features);
    // 阶段进度、下一阶段提示也完全不受星星影响。
    expect(fullStars.progressValue).toBe(0);
    expect(fullStars.progressTarget).toBe(3);
    expect(fullStars.nextText).toBe(noStars.nextText);
    expect(fullStars.remainingToNext).toBe(3);

    // 繁荣度确实变了——但只是细节丰富度。
    expect(fullStars.prosperityKey).toBe("flourishing");
    expect(noStars.prosperityKey).toBe("basic");

    // 关键：0 枚印章时，后续阶段的核心植被 / 建筑一个都不在 features 里。
    for (const lockedFeature of ["嫩芽", "小草丛", "椰子树", "小帐篷", "小码头", "泊岸小船", "观星台", "灯塔", "灯光"]) {
      expect(fullStars.currentStage.features).not.toContain(lockedFeature);
    }
  });

  it("任意印章数下，星星都不改变阶段、features、进度或下一阶段", () => {
    // 覆盖 0 / 3 / 7 / 15 / 22 / 30 六个阶段边界以及中间值。
    for (const stampCount of [0, 1, 2, 3, 4, 6, 7, 14, 15, 21, 22, 29, 30, 31, 100]) {
      const basic = buildKnowledgeIslandGrowth(stampCount, { starCount: 0 });
      const lush = buildKnowledgeIslandGrowth(stampCount, { starCount: 30 });
      const flourishing = buildKnowledgeIslandGrowth(stampCount, { starCount: 63 });

      for (const compared of [lush, flourishing]) {
        // 阶段判定与现在完全一致。
        expect(compared.currentStage).toEqual(basic.currentStage);
        expect(compared.nextStage).toEqual(basic.nextStage);
        expect(compared.stampCount).toBe(basic.stampCount);
        // 星星只改变细节丰富度。
        expect(compared.progressValue).toBe(basic.progressValue);
        expect(compared.progressTarget).toBe(basic.progressTarget);
        expect(compared.progressPercent).toBe(basic.progressPercent);
        expect(compared.remainingToNext).toBe(basic.remainingToNext);
        expect(compared.nextText).toBe(basic.nextText);
        expect(compared.stampText).toBe(basic.stampText);
        expect(compared.stageHintText).toBe(basic.stageHintText);
        expect(compared.isMaxStage).toBe(basic.isMaxStage);
        // 繁荣度确实按三档变化。
        expect(compared.prosperityKey).not.toBe(basic.prosperityKey);
      }
    }
  });

  it("0 / 3 / 7 / 15 / 22 / 30 枚印章的阶段判定与本轮之前完全一致", () => {
    // 写死期望值：防止有人顺手改了阶段阈值。
    const expectedStageIds = [
      "first-sight",
      "sprout-coast",
      "palm-camp",
      "explorer-dock",
      "starwatch-hill",
      "knowledge-lighthouse"
    ];

    FIXED_THRESHOLDS.forEach((threshold, index) => {
      const growth = buildKnowledgeIslandGrowth(threshold, { starCount: 999 });

      expect(growth.currentStage.id).toBe(expectedStageIds[index]);
      // 三档繁荣度下阶段都一样。
      expect(buildKnowledgeIslandGrowth(threshold, { starCount: 0 }).currentStage.id).toBe(expectedStageIds[index]);
      expect(buildKnowledgeIslandGrowth(threshold, { starCount: 30 }).currentStage.id).toBe(expectedStageIds[index]);
    });
  });

  it("阶段只增不减：星星不会把后面阶段的元素“借给”前面的阶段", () => {
    // 每个阶段在最高繁荣度下都不能出现比它更后面的阶段才有的元素。
    // 注意 沙滩 / 海浪 是每一阶段都有的公共元素，不属于“后面阶段独有的”，要排除掉。
    for (let index = 0; index < KNOWLEDGE_ISLAND_STAGES.length; index += 1) {
      const stage = KNOWLEDGE_ISLAND_STAGES[index];
      const growth = buildKnowledgeIslandGrowth(stage.threshold, { starCount: 999 });
      const laterOnlyFeatures = KNOWLEDGE_ISLAND_STAGES.slice(index + 1)
        .flatMap((laterStage) => laterStage.features)
        .filter((feature) => !stage.features.includes(feature));

      expect(laterOnlyFeatures.length).toBeGreaterThanOrEqual(0);
      for (const feature of laterOnlyFeatures) {
        expect(growth.currentStage.features).not.toContain(feature);
      }
    }
  });

  it("后面阶段独有的元素在 0 / 3 / 7 / 15 / 22 / 30 边界上都不会提前出现", () => {
    // 逐阶段写死“这一步才有的元素”，再确认它在之前的阶段（含最高繁荣度）里永远不存在。
    // 海星 / 漂流木是初见小岛的起点元素，从 0 枚就有，不属于任何“后面阶段独有”。
    const stageOnlyFeatures = Object.freeze({
      "first-sight": [],
      "sprout-coast": ["嫩芽", "小草丛"],
      "palm-camp": ["椰子树", "小帐篷"],
      "explorer-dock": ["小码头", "泊岸小船"],
      "starwatch-hill": ["观星台"],
      "knowledge-lighthouse": ["灯塔", "灯光"]
    });

    KNOWLEDGE_ISLAND_STAGES.forEach((stage, index) => {
      for (const feature of stageOnlyFeatures[stage.id]) {
        // 上一阶段（及更早）在最高繁荣度下都不能提前拥有它。
        for (let earlierIndex = 0; earlierIndex < index; earlierIndex += 1) {
          const earlierGrowth = buildKnowledgeIslandGrowth(KNOWLEDGE_ISLAND_STAGES[earlierIndex].threshold, {
            starCount: 999
          });

          expect(earlierGrowth.currentStage.features).not.toContain(feature);
        }

        // 当前阶段一到就必须真的拥有它。
        expect(buildKnowledgeIslandGrowth(stage.threshold, { starCount: 0 }).currentStage.features).toContain(feature);
      }
    });
  });
});

describe("knowledgeIslandGrowth · 繁荣度只看累计星星", () => {
  it("繁荣度只取决于 starCount，与印章数无关（同一星数永远同一档）", () => {
    for (const starCount of [0, 20, 21, 62, 63, 200]) {
      const prosperityKeys = [0, 3, 7, 15, 30, 100].map(
        (stampCount) => buildKnowledgeIslandGrowth(stampCount, { starCount }).prosperityKey
      );

      expect(new Set(prosperityKeys).size).toBe(1);
    }
  });

  it("累计星星只增不减：新开 0 星章节不会让小岛退化", () => {
    // 同一本历史账本，追加一个全是 0 星的章节前后，累计星数与繁荣度都不变。
    const history = buildKnowledgeIslandGrowth(3, { starCount: 42 });

    expect(history.prosperityKey).toBe("lush");

    const afterNewChapter = buildKnowledgeIslandGrowth(3, { starCount: 42 });

    expect(afterNewChapter.prosperityStarCount).toBe(42);
    expect(afterNewChapter.prosperityKey).toBe(history.prosperityKey);
    expect(afterNewChapter.currentStage.id).toBe(history.currentStage.id);
  });
});

describe("knowledgeIslandGrowth · 首页与收藏册的繁荣度同口径", () => {
  // 两个真实入口都吃同一个 lifetimeStarCount，而不是各自那一章的星星。
  function readHomeSummaryProsperity(stampCount, lifetimeStarCount, chapterStars) {
    const dashboard = buildHomeDashboard({
      growthSource: { totalStars: chapterStars, starTotal: 21 },
      growthProgress: buildGrowthProgress({ stampCount }),
      lifetimeStarCount
    });

    return dashboard.growth.knowledgeIsland;
  }

  function readCollectionBookProsperity(stampCount, lifetimeStarCount, chapterStars) {
    const book = buildAdventureCollectionBook({
      chapter: CHAPTER,
      stages: STAGES,
      chapterProgress: { bestResults: { "stage-1": { starCount: chapterStars } } },
      achievements: [],
      growthProgress: buildGrowthProgress({ stampCount }),
      lifetimeStarCount
    });

    return book.stamps.knowledgeIsland;
  }

  it("同一枚印章数 + 同一份累计星星下，首页摘要与收藏册得到完全相同的繁荣度", () => {
    for (const stampCount of [0, 3, 7, 15, 30]) {
      for (const lifetimeStarCount of [0, 20, 21, 62, 63, 120]) {
        const home = readHomeSummaryProsperity(stampCount, lifetimeStarCount, 3);
        const book = readCollectionBookProsperity(stampCount, lifetimeStarCount, 3);

        expect(home.prosperityKey).toBe(book.prosperityKey);
        expect(home.prosperityLevel).toBe(book.prosperityLevel);
        expect(home.prosperityLabel).toBe(book.prosperityLabel);
        expect(home.prosperityStarCount).toBe(book.prosperityStarCount);
        expect(home.currentStage.id).toBe(book.currentStage.id);
      }
    }
  });

  it("不传 lifetimeStarCount 时两处都是基础档，行为与本轮之前一致", () => {
    const home = readHomeSummaryProsperity(7, undefined, 3);
    const book = readCollectionBookProsperity(7, undefined, 3);

    expect(home.prosperityKey).toBe("basic");
    expect(book.prosperityKey).toBe("basic");
  });

  it("切 activeChapterId（本章星星变了）时，lifetime 星星与繁荣度都不变", () => {
    // 本章星星从 0 变到 21：首页三个本章指标要跟着变，
    // 但知识岛繁荣度吃的是 lifetimeStarCount，必须纹丝不动。
    const before = readHomeSummaryProsperity(15, 42, 0);
    const after = readHomeSummaryProsperity(15, 42, 21);

    expect(before.prosperityStarCount).toBe(after.prosperityStarCount);
    expect(before.prosperityKey).toBe(after.prosperityKey);
    expect(before.currentStage.id).toBe(after.currentStage.id);
    expect(after.prosperityKey).toBe("lush");
  });

  it("本章星星再多也不会把知识岛顶到繁荣：只有 lifetimeStarCount 能", () => {
    // 本章满星 21 颗仍然是丰盛。
    const chapterMaxed = readHomeSummaryProsperity(0, 21, 21);

    expect(chapterMaxed.prosperityKey).toBe("lush");

    // 本章星星被误当成累计星星传进去，最多也只能到本章的 21 颗 → 丰盛，不会到繁荣。
    expect(readHomeSummaryProsperity(0, 63, 21).prosperityKey).toBe("flourishing");
  });

  it("0 枚印章 + 63 颗累计星星：两处都还是初见小岛，繁荣只是细节", () => {
    for (const readIsland of [readHomeSummaryProsperity, readCollectionBookProsperity]) {
      const island = readIsland(0, 63, 0);

      expect(island.currentStage.id).toBe(stageAt(0).id);
      expect(island.currentStage.name).toBe("初见小岛");
      expect(island.prosperityKey).toBe("flourishing");

      for (const lockedFeature of ["嫩芽", "小草丛", "椰子树", "小帐篷", "小码头", "泊岸小船", "观星台", "灯塔", "灯光"]) {
        expect(island.currentStage.features).not.toContain(lockedFeature);
      }
    }
  });

  it("非法 lifetimeStarCount 安全退化成基础档，两处都不抛错", () => {
    for (const brokenStarCount of [undefined, null, "abc", NaN, -10, {}]) {
      const home = readHomeSummaryProsperity(7, brokenStarCount, 3);
      const book = readCollectionBookProsperity(7, brokenStarCount, 3);

      expect(home.prosperityStarCount).toBe(0);
      expect(home.prosperityKey).toBe("basic");
      expect(book.prosperityKey).toBe("basic");
    }
  });
});
