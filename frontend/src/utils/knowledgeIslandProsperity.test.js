import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_ISLAND_MAX_PROSPERITY,
  KNOWLEDGE_ISLAND_PROSPERITY_TIERS,
  buildKnowledgeIslandProsperity,
  isKnowledgeIslandMaxProsperity,
  normalizeKnowledgeIslandStarCount,
  resolveKnowledgeIslandProsperityIndex,
  sumChallengeProgressBookStars
} from "./knowledgeIslandProsperity.js";

// 本轮阈值固定，测试里也写死这一组，改动阈值必须同时改这里（防止“顺手调参”）。
const FIXED_TIER_THRESHOLDS = Object.freeze([
  Object.freeze({ level: 0, key: "basic", label: "基础", minStars: 0, maxStars: 20 }),
  Object.freeze({ level: 1, key: "lush", label: "丰盛", minStars: 21, maxStars: 62 }),
  Object.freeze({ level: 2, key: "flourishing", label: "繁荣", minStars: 63, maxStars: null })
]);

// 一关的真实形状：starCount 就是这一关历史最好成绩。
function buildStageResult(starCount) {
  return {
    starCount,
    bestAccuracy: starCount > 0 ? 90 : 0,
    attempts: 1,
    bestScore: 80,
    rewardEarned: false
  };
}

// 真实账本形状：{ activeChapterId, chapters: { [chapterId]: { unlockedStageIds, bestResults } } }。
// stageStars 是「该章节每一关各拿几颗星」，7 关为一章。
function buildProgressBook(activeChapterId, chapterStarMap) {
  const chapters = {};

  for (const [chapterId, stageStarList] of Object.entries(chapterStarMap)) {
    const bestResults = {};

    stageStarList.forEach((starCount, index) => {
      bestResults[`stage-${index + 1}`] = buildStageResult(starCount);
    });

    chapters[chapterId] = {
      unlockedStageIds: stageStarList.map((_, index) => `stage-${index + 1}`),
      bestResults
    };
  }

  return { activeChapterId, chapters };
}

// 三个满星章节 = 7 × 3 × 3 = 63 颗，正好踩到繁荣档门槛。
const THREE_FULL_CHAPTERS = Object.freeze({
  "chapter-grade-1-upper": [3, 3, 3, 3, 3, 3, 3],
  "chapter-grade-1-lower": [3, 3, 3, 3, 3, 3, 3],
  "chapter-grade-2-upper": [3, 3, 3, 3, 3, 3, 3]
});

describe("knowledgeIslandProsperity · 档位配置", () => {
  it("三档阈值严格递增且与本轮固定值一致", () => {
    expect(
      KNOWLEDGE_ISLAND_PROSPERITY_TIERS.map((tier) => ({
        level: tier.level,
        key: tier.key,
        label: tier.label,
        minStars: tier.minStars,
        maxStars: tier.maxStars
      }))
    ).toEqual(FIXED_TIER_THRESHOLDS);

    for (let index = 1; index < KNOWLEDGE_ISLAND_PROSPERITY_TIERS.length; index += 1) {
      expect(KNOWLEDGE_ISLAND_PROSPERITY_TIERS[index].minStars).toBeGreaterThan(
        KNOWLEDGE_ISLAND_PROSPERITY_TIERS[index - 1].minStars
      );
    }
  });

  it("档位对象只读、level 与 key 稳定，不会被组件改写", () => {
    expect(Object.isFrozen(KNOWLEDGE_ISLAND_PROSPERITY_TIERS)).toBe(true);
    expect(KNOWLEDGE_ISLAND_PROSPERITY_TIERS.every((tier) => Object.isFrozen(tier))).toBe(true);
    expect(KNOWLEDGE_ISLAND_MAX_PROSPERITY.key).toBe("flourishing");
  });

  it("最高档是 63 而不是更小的数：真实账号已有的 40 多星不能一上线就顶格", () => {
    // 现有真实账号约 42 星，必须落在“丰盛”而不是“繁荣”，成长过程要留得下来。
    expect(buildKnowledgeIslandProsperity(42).key).toBe("lush");
    expect(KNOWLEDGE_ISLAND_MAX_PROSPERITY.minStars).toBe(63);
  });
});

describe("knowledgeIslandProsperity · 三档边界", () => {
  it("0 / 20 星都是基础", () => {
    for (const starCount of [0, 1, 10, 19, 20]) {
      const prosperity = buildKnowledgeIslandProsperity(starCount);

      expect(prosperity.level).toBe(0);
      expect(prosperity.key).toBe("basic");
      expect(prosperity.label).toBe("基础");
      expect(resolveKnowledgeIslandProsperityIndex(starCount)).toBe(0);
    }
  });

  it("21 / 62 星都是丰盛", () => {
    for (const starCount of [21, 30, 45, 61, 62]) {
      const prosperity = buildKnowledgeIslandProsperity(starCount);

      expect(prosperity.level).toBe(1);
      expect(prosperity.key).toBe("lush");
      expect(prosperity.label).toBe("丰盛");
      expect(resolveKnowledgeIslandProsperityIndex(starCount)).toBe(1);
    }
  });

  it("63 星及以上都是繁荣，且没有更高的档", () => {
    for (const starCount of [63, 64, 120, 999, 100000]) {
      const prosperity = buildKnowledgeIslandProsperity(starCount);

      expect(prosperity.level).toBe(2);
      expect(prosperity.key).toBe("flourishing");
      expect(prosperity.label).toBe("繁荣");
      expect(resolveKnowledgeIslandProsperityIndex(starCount)).toBe(2);
      expect(prosperity.isMaxProsperity).toBe(true);
      expect(prosperity.hasNextTier).toBe(false);
      expect(prosperity.progressPercent).toBe(100);
      expect(prosperity.nextText).not.toContain("再攒");
    }
  });

  it("恰好到阈值立刻进新档（21 / 63 是切换点，前一星不是）", () => {
    expect(buildKnowledgeIslandProsperity(20).key).toBe("basic");
    expect(buildKnowledgeIslandProsperity(21).key).toBe("lush");
    expect(buildKnowledgeIslandProsperity(62).key).toBe("lush");
    expect(buildKnowledgeIslandProsperity(63).key).toBe("flourishing");
  });

  it("未到顶档时给出还差几颗星，且进度是 0~100", () => {
    const basic = buildKnowledgeIslandProsperity(0);
    const lush = buildKnowledgeIslandProsperity(21);

    expect(basic.remainingToNext).toBe(21);
    expect(basic.nextTierStars).toBe(21);
    expect(basic.progressPercent).toBe(0);

    expect(lush.remainingToNext).toBe(42);
    expect(lush.nextTierStars).toBe(63);
    expect(lush.progressPercent).toBe(0);
    expect(buildKnowledgeIslandProsperity(62).remainingToNext).toBe(1);

    for (const starCount of [0, 10, 20, 21, 40, 62]) {
      const prosperity = buildKnowledgeIslandProsperity(starCount);

      expect(prosperity.progressPercent).toBeGreaterThanOrEqual(0);
      expect(prosperity.progressPercent).toBeLessThanOrEqual(100);
      expect(prosperity.remainingToNext).toBeGreaterThanOrEqual(0);
    }
  });

  it("星星只增不减：星数涨回去，档位不会掉档逻辑只跟当前星数走", () => {
    // 单调性检查：星数越大档位越靠后。
    for (let starCount = 0; starCount <= 200; starCount += 1) {
      expect(resolveKnowledgeIslandProsperityIndex(starCount)).toBeGreaterThanOrEqual(
        resolveKnowledgeIslandProsperityIndex(starCount - 1) || 0
      );
    }
  });

  it("isKnowledgeIslandMaxProsperity 只在 63 星及以上为真", () => {
    expect(isKnowledgeIslandMaxProsperity(62)).toBe(false);
    expect(isKnowledgeIslandMaxProsperity(63)).toBe(true);
    expect(isKnowledgeIslandMaxProsperity()).toBe(false);
  });
});

describe("knowledgeIslandProsperity · 文案", () => {
  it("文案强调是跨章节累计星星，不是本章星星，也不出现系统词", () => {
    const prosperity = buildKnowledgeIslandProsperity(63);

    expect(prosperity.starText).toBe("累计 63 颗闯关星星");
    expect(prosperity.prosperityText).toBe("繁荣 · 累计 63 颗闯关星星");

    for (const forbidden of ["等级", "满级", "经验", "XP", "金币", "兑换", "消费", "商店"]) {
      expect(prosperity.prosperityText).not.toContain(forbidden);
      expect(prosperity.nextText).not.toContain(forbidden);
    }
  });
});

describe("knowledgeIslandProsperity · 非法输入", () => {
  it("星数异常输入安全归零，仍然落在基础档", () => {
    const brokenInputs = [undefined, null, "", "   ", "abc", NaN, -1, -100, {}, [], true, false, () => {}];

    for (const brokenInput of brokenInputs) {
      const prosperity = buildKnowledgeIslandProsperity(brokenInput);

      expect(prosperity.starCount).toBe(0);
      expect(prosperity.key).toBe("basic");
      expect(Number.isNaN(prosperity.starCount)).toBe(false);
      expect(Number.isNaN(prosperity.progressPercent)).toBe(false);
    }

    expect(buildKnowledgeIslandProsperity().starCount).toBe(0);
    expect(normalizeKnowledgeIslandStarCount(6.9)).toBe(6);
    expect(normalizeKnowledgeIslandStarCount("6")).toBe(6);
    expect(normalizeKnowledgeIslandStarCount("七")).toBe(0);
  });
});

describe("sumChallengeProgressBookStars · 全部历史章节累计最好星数", () => {
  it("遍历全部章节求和，而不是只看当前选中的那一章", () => {
    const book = buildProgressBook("chapter-grade-1-upper", {
      "chapter-grade-1-upper": [3, 2, 0, 0, 0, 0, 0],
      "chapter-grade-1-lower": [3, 3, 0, 0, 0, 0, 0],
      "chapter-grade-2-upper": [1, 0, 0, 0, 0, 0, 0]
    });

    // 5 + 6 + 1 = 12
    expect(sumChallengeProgressBookStars(book)).toBe(12);
  });

  it("不绑 activeChapterId：切到哪一章，累计星数都不变", () => {
    const chapters = THREE_FULL_CHAPTERS;
    const starCounts = [
      "chapter-grade-1-upper",
      "chapter-grade-1-lower",
      "chapter-grade-2-upper",
      "chapter-grade-6-upper"
    ].map((chapterId) => sumChallengeProgressBookStars(buildProgressBook(chapterId, chapters)));

    // 四个不同的 activeChapterId，全部等于 63。
    expect(new Set(starCounts).size).toBe(1);
    expect(starCounts[0]).toBe(63);
  });

  it("不绑 preferredGrade / 学习档案：星数只由账本内容决定，与调用方任何年级状态无关", () => {
    const book = buildProgressBook("chapter-grade-1-upper", THREE_FULL_CHAPTERS);
    const before = sumChallengeProgressBookStars(book);

    // 模拟“升到六年级”：只是把 activeChapterId 换到高年级章节，历史章节一个都不动。
    const afterUpgrade = sumChallengeProgressBookStars({
      ...book,
      activeChapterId: "chapter-grade-6-upper",
      chapters: {
        ...book.chapters,
        // 新年级章节是空的，0 颗星。
        "chapter-grade-6-upper": { unlockedStageIds: ["stage-1"], bestResults: { "stage-1": buildStageResult(0) } }
      }
    });

    expect(afterUpgrade).toBe(before);
    expect(afterUpgrade).toBe(63);
  });

  it("新开一个 0 星章节：总星数不下降", () => {
    const before = sumChallengeProgressBookStars(
      buildProgressBook("chapter-grade-1-upper", { "chapter-grade-1-upper": [3, 3, 3, 0, 0, 0, 0] })
    );

    const afterNewChapter = sumChallengeProgressBookStars(
      buildProgressBook("chapter-grade-1-upper", {
        "chapter-grade-1-upper": [3, 3, 3, 0, 0, 0, 0],
        // 刚开的新章节：一颗星都还没有。
        "chapter-grade-2-upper": [0, 0, 0, 0, 0, 0, 0]
      })
    );

    expect(before).toBe(9);
    expect(afterNewChapter).toBe(9);
  });

  it("重复刷同一关不会重复累计：只读 bestResults 里的最好成绩", () => {
    // bestResults[stageId] 是一个槽位，重复通关只会把同一个槽位覆盖成更好的成绩，
    // 账本里从来不会存“通关历史流水”，所以这里天然不可能把同一关数两次。
    const book = buildProgressBook("chapter-grade-1-upper", { "chapter-grade-1-upper": [3, 3, 3, 3, 3, 3, 3] });

    expect(sumChallengeProgressBookStars(book)).toBe(21);
    // 再刷一遍：同一个槽位仍然是 3 颗。
    expect(sumChallengeProgressBookStars(book)).toBe(21);
    expect(Object.keys(book.chapters["chapter-grade-1-upper"].bestResults)).toHaveLength(7);

    // 更好的成绩只是替换槽位值，不是叠加。
    const improved = buildProgressBook("chapter-grade-1-upper", { "chapter-grade-1-upper": [3, 3, 3, 3, 3, 3, 3] });

    improved.chapters["chapter-grade-1-upper"].bestResults["stage-1"].starCount = 3;
    expect(sumChallengeProgressBookStars(improved)).toBe(21);
  });

  it("unlockedStageIds 完全不参与：解锁了但没拿到星的关卡不贡献星数", () => {
    const book = {
      activeChapterId: "chapter-grade-1-upper",
      chapters: {
        "chapter-grade-1-upper": {
          // 7 关全部解锁，但只有 2 关拿到过星。
          unlockedStageIds: ["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"],
          bestResults: {
            "stage-1": buildStageResult(3),
            "stage-2": buildStageResult(2)
          }
        }
      }
    };

    expect(sumChallengeProgressBookStars(book)).toBe(5);
  });

  it("非法 / 缺失 progressBook 安全返回 0，绝不抛错", () => {
    const brokenBooks = [
      undefined,
      null,
      {},
      "",
      "not-a-book",
      0,
      false,
      [],
      {},
      { chapters: null },
      { chapters: "nope" },
      { chapters: [] },
      { chapters: {} },
      () => {}
    ];

    for (const brokenBook of brokenBooks) {
      expect(() => sumChallengeProgressBookStars(brokenBook)).not.toThrow();
      expect(sumChallengeProgressBookStars(brokenBook)).toBe(0);
    }
  });

  it("章节内部脏数据按 0 计，不影响其它章节的真实成绩", () => {
    const book = {
      activeChapterId: "chapter-grade-1-upper",
      chapters: {
        "chapter-grade-1-upper": {
          unlockedStageIds: ["stage-1"],
          bestResults: { "stage-1": buildStageResult(3) }
        },
        // 整章都没有 bestResults。
        "chapter-grade-1-lower": { unlockedStageIds: [] },
        // bestResults 不是对象。
        "chapter-grade-2-upper": { bestResults: "broken" },
        // 章节本身不是对象。
        "chapter-grade-2-lower": null,
        // 单关成绩里的 starCount 是脏值。
        "chapter-grade-3-upper": {
          unlockedStageIds: ["stage-1", "stage-2", "stage-3"],
          bestResults: {
            "stage-1": buildStageResult(2),
            "stage-2": { starCount: "abc" },
            "stage-3": null
          }
        }
      }
    };

    // 3 + 2 = 5，其余全部安全归零。
    expect(sumChallengeProgressBookStars(book)).toBe(5);
  });
});
