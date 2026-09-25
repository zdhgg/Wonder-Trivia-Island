import { describe, expect, it } from "vitest";
import {
  MAX_MILESTONE_NOTE_LENGTH,
  MAX_MILESTONE_TITLE_LENGTH,
  MILESTONE_CATEGORIES,
  MILESTONE_CATEGORY_IDS,
  MILESTONE_EMPTY_TEXT,
  buildMilestoneSummary,
  getMilestoneCategoryMeta,
  getMilestoneDateLimit,
  groupMilestonesByMonth,
  normalizeMilestone,
  normalizeMilestones,
  sortMilestonesDesc,
  validateMilestoneDraft
} from "./growthMilestones.js";
import { MAX_FOOTPRINT_NOTE_LENGTH, MAX_FOOTPRINT_TITLE_LENGTH } from "./growthFootprints.js";

// 固定参考日：所有日期用例都相对它判断，绝不依赖跑测试那一天。
const REFERENCE_DATE = new Date(2026, 9, 18);
const REFERENCE_DATE_KEY = "2026-10-18";

function buildRawMilestone(overrides = {}) {
  return {
    id: 4,
    occurredOn: "2026-10-18",
    category: "classroom",
    title: "第一次自己举手回答问题",
    note: "举了三次才被叫到。",
    photos: [],
    createdAt: "2026-10-18T09:12:00.000Z",
    updatedAt: "2026-10-18T09:12:00.000Z",
    ...overrides
  };
}

describe("growthMilestones · 类别", () => {
  it("五个类别固定：学习课堂 / 校园活动 / 兴趣爱好 / 成长变化 / 特别经历", () => {
    expect(MILESTONE_CATEGORY_IDS).toEqual(["classroom", "school", "hobby", "growth", "special"]);
    expect(MILESTONE_CATEGORIES.map((category) => category.displayLabel)).toEqual([
      "📚 学习课堂",
      "🎭 校园活动",
      "🎨 兴趣爱好",
      "🌱 成长变化",
      "🏅 特别经历"
    ]);
  });

  it("类别里没有任何评价性的词（优良中差 / 分数 / 等级）", () => {
    for (const category of MILESTONE_CATEGORIES) {
      for (const text of [category.label, category.id]) {
        for (const forbiddenWord of ["优", "良", "中", "差", "分数", "等级", "评级", "排名"]) {
          expect(text, `${text} 不应该出现「${forbiddenWord}」`).not.toContain(forbiddenWord);
        }
      }
    }
  });

  it("未知类别给安全兜底，并原样保留 id", () => {
    expect(getMilestoneCategoryMeta("hobby").displayLabel).toBe("🎨 兴趣爱好");
    expect(getMilestoneCategoryMeta("mystery")).toEqual({
      id: "mystery",
      glyph: "📝",
      label: "其他记录",
      displayLabel: "📝 其他记录",
      isKnown: false
    });
    expect(getMilestoneCategoryMeta(undefined).isKnown).toBe(false);
  });
});

describe("growthMilestones · 与纪念册共用同一套长度与日期口径", () => {
  it("标题 / 记录的字数上限与「我们一起」完全一致", () => {
    expect(MAX_MILESTONE_TITLE_LENGTH).toBe(MAX_FOOTPRINT_TITLE_LENGTH);
    expect(MAX_MILESTONE_NOTE_LENGTH).toBe(MAX_FOOTPRINT_NOTE_LENGTH);
  });

  it("日期上界就是浏览器本地今天", () => {
    expect(getMilestoneDateLimit(REFERENCE_DATE)).toBe(REFERENCE_DATE_KEY);
  });
});

describe("growthMilestones · normalizeMilestone", () => {
  it("正常记录逐字段归一化，且没有 tags 这个概念", () => {
    const milestone = normalizeMilestone(buildRawMilestone());

    expect(milestone.id).toBe(4);
    expect(milestone.occurredOn).toBe("2026-10-18");
    expect(milestone.category).toBe("classroom");
    expect(milestone.categoryMeta.displayLabel).toBe("📚 学习课堂");
    expect(milestone.title).toBe("第一次自己举手回答问题");
    expect(milestone.note).toBe("举了三次才被叫到。");
    expect(milestone.photos).toEqual([]);
    expect(milestone.tags).toBeUndefined();
  });

  it("照片沿用纪念册的规则：形状不可信的丢掉", () => {
    const milestone = normalizeMilestone(
      buildRawMilestone({
        photos: [
          { id: 2, url: "/api/growth-milestones/photos/2", mimeType: "image/jpeg", byteSize: 120000 },
          { id: 0, url: "/api/growth-milestones/photos/0" },
          { id: 3, url: "https://example.com/a.jpg" }
        ]
      })
    );

    expect(milestone.photos).toHaveLength(1);
    expect(milestone.photos[0].url).toBe("/api/growth-milestones/photos/2");
  });

  it("脏数据被安全降级，不抛错也不伪造记录", () => {
    const milestone = normalizeMilestone({
      id: "abc",
      occurredOn: "2026-02-30",
      category: "mystery",
      title: 42,
      note: null,
      photos: "nope",
      createdAt: null
    });

    expect(milestone.id).toBe(0);
    expect(milestone.occurredOn).toBe("");
    expect(milestone.categoryMeta.isKnown).toBe(false);
    expect(milestone.title).toBe("42");
    expect(milestone.note).toBe("");
    expect(milestone.photos).toEqual([]);
    expect(milestone.createdAt).toBe("");
  });

  it("非数组输入得到空数组；单条脏输入仍然归一化成一条安全记录", () => {
    expect(normalizeMilestones(null)).toEqual([]);
    expect(normalizeMilestones({})).toEqual([]);
    expect(normalizeMilestones([null])).toHaveLength(1);
  });
});

describe("growthMilestones · 排序与分月", () => {
  it("排序契约与服务端一致：occurredOn DESC，同日 id DESC", () => {
    const sorted = sortMilestonesDesc([
      buildRawMilestone({ id: 1, occurredOn: "2026-09-01" }),
      buildRawMilestone({ id: 3, occurredOn: "2026-10-18" }),
      buildRawMilestone({ id: 2, occurredOn: "2026-10-18" })
    ]);

    expect(sorted.map((milestone) => milestone.id)).toEqual([3, 2, 1]);
  });

  it("按月份分组，月份降序，日期非法的记录不进时间线", () => {
    const groups = groupMilestonesByMonth([
      buildRawMilestone({ id: 1, occurredOn: "2026-10-18" }),
      buildRawMilestone({ id: 2, occurredOn: "2025-12-31" }),
      buildRawMilestone({ id: 3, occurredOn: "2026-10-05" }),
      buildRawMilestone({ id: 4, occurredOn: "not-a-date" })
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-10", "2025-12"]);
    expect(groups[0].label).toBe("2026 年 10 月");
    expect(groups[0].items.map((milestone) => milestone.id)).toEqual([1, 3]);
    expect(groupMilestonesByMonth(null)).toEqual([]);
  });
});

describe("growthMilestones · validateMilestoneDraft", () => {
  function buildDraft(overrides = {}) {
    return {
      occurredOn: REFERENCE_DATE_KEY,
      category: "growth",
      title: "第一次自己系鞋带",
      note: "系了两遍才系好。",
      ...overrides
    };
  }

  function validate(draft) {
    return validateMilestoneDraft(draft, { referenceDate: REFERENCE_DATE });
  }

  it("合法草稿通过，并给出可直接提交的值", () => {
    const result = validate(buildDraft({ title: "  第一次自己系鞋带  " }));

    expect(result.isValid).toBe(true);
    expect(result.value).toEqual({
      occurredOn: REFERENCE_DATE_KEY,
      category: "growth",
      title: "第一次自己系鞋带",
      note: "系了两遍才系好。"
    });
  });

  it("日期：未来与不存在的日期都非法", () => {
    for (const occurredOn of ["2026-10-19", "2026-02-30", "", "2026/10/18"]) {
      const result = validate(buildDraft({ occurredOn }));

      expect(result.isValid, occurredOn).toBe(false);
      expect(result.issues.map((issue) => issue.field)).toContain("occurredOn");
    }
  });

  it("类别：只接受五个固定 id", () => {
    for (const category of MILESTONE_CATEGORY_IDS) {
      expect(validate(buildDraft({ category })).isValid, category).toBe(true);
    }

    for (const category of ["nope", "", "A", "学习"]) {
      const result = validate(buildDraft({ category }));

      expect(result.isValid, category).toBe(false);
      expect(result.issues.map((issue) => issue.field)).toContain("category");
    }
  });

  it("标题：1 / 40 合法，0 / 41 非法", () => {
    expect(validate(buildDraft({ title: "字" })).isValid).toBe(true);
    expect(validate(buildDraft({ title: "字".repeat(MAX_MILESTONE_TITLE_LENGTH) })).isValid).toBe(true);

    for (const title of ["", "   ", null, undefined, "字".repeat(MAX_MILESTONE_TITLE_LENGTH + 1)]) {
      expect(validate(buildDraft({ title })).isValid, String(title)).toBe(false);
    }
  });

  it("记录：0 / 500 合法，501 非法", () => {
    expect(validate(buildDraft({ note: "" })).isValid).toBe(true);
    expect(validate(buildDraft({ note: "记".repeat(MAX_MILESTONE_NOTE_LENGTH) })).isValid).toBe(true);
    expect(validate(buildDraft({ note: "记".repeat(MAX_MILESTONE_NOTE_LENGTH + 1) })).isValid).toBe(false);
  });

  it("照片不参与文字校验，也不进可提交的值", () => {
    const withPhotos = validate(buildDraft({ photos: [{ id: 1, url: "/api/growth-milestones/photos/1" }] }));

    expect(withPhotos.isValid).toBe(true);
    expect(withPhotos.value.photos).toBeUndefined();

    // 形状明显不对的照片仍然会被指出来。
    expect(validate(buildDraft({ photos: "nope" })).issues.map((issue) => issue.field)).toEqual(["photos"]);
  });

  it("多条问题一次性报出，非法输入不抛错", () => {
    const result = validate({ occurredOn: "2026-02-30", category: "nope", title: "" });

    expect(result.issues.map((issue) => issue.field)).toEqual(["occurredOn", "category", "title"]);
    expect(validate(undefined).isValid).toBe(false);
    expect(validate(null).value).toBeNull();
  });
});

describe("growthMilestones · buildMilestoneSummary", () => {
  it("0 条：空状态文案，不做评价也不催", () => {
    const summary = buildMilestoneSummary([]);

    expect(summary.count).toBe(0);
    expect(summary.hasMilestones).toBe(false);
    expect(summary.countText).toBe("还没有记下她的成长瞬间");
    expect(summary.emptyText).toBe(MILESTONE_EMPTY_TEXT);
  });

  it("多条：只数真实记录，日期非法的脏记录不算", () => {
    const summary = buildMilestoneSummary([
      buildRawMilestone({ id: 1 }),
      buildRawMilestone({ id: 2, occurredOn: "2026-02-30" })
    ]);

    expect(summary.count).toBe(1);
    expect(summary.countText).toBe("已经记下 1 个她的成长瞬间");
  });

  it("文案里没有评价、分数、排名、打卡这类词", () => {
    const summary = buildMilestoneSummary([buildRawMilestone()]);

    for (const text of [summary.countText, summary.emptyText]) {
      expect(text).not.toMatch(/\d+\s*\/\s*\d+/);

      for (const forbiddenWord of ["优", "良", "进步值", "分数", "得分", "排名", "指数", "打卡", "连续", "完成率", "成就", "XP"]) {
        expect(text, `${text} 不应该出现「${forbiddenWord}」`).not.toContain(forbiddenWord);
      }
    }
  });
});
