import { describe, expect, it } from "vitest";
import {
  FOOTPRINT_CATEGORIES,
  FOOTPRINT_CATEGORY_IDS,
  FOOTPRINT_SUMMARY_EMPTY_TEXT,
  FOOTPRINT_TAG_IDS,
  FOOTPRINT_TAGS,
  MAX_FOOTPRINT_NOTE_LENGTH,
  MAX_FOOTPRINT_TITLE_LENGTH,
  buildFootprintSummary,
  getFootprintCategoryMeta,
  getFootprintTagMeta,
  getLocalDateKey,
  groupFootprintsByMonth,
  isValidFootprintDate,
  normalizeFootprint,
  normalizeFootprintDate,
  normalizeFootprints,
  normalizeFootprintTags,
  sortFootprintsDesc,
  validateFootprintDraft
} from "./growthFootprints.js";

// 固定参考日：所有日期用例都相对它判断，绝不依赖跑测试那一天。
const REFERENCE_DATE = new Date(2026, 9, 18);
const REFERENCE_DATE_KEY = "2026-10-18";

function buildRawFootprint(overrides = {}) {
  return {
    id: 12,
    occurredOn: "2026-10-18",
    category: "explore",
    title: "第一次一起做火山实验",
    note: "一开始还有点担心。\n后来特别开心。",
    tags: ["first", "coop"],
    createdAt: "2026-10-18T09:12:00.000Z",
    updatedAt: "2026-10-18T09:12:00.000Z",
    ...overrides
  };
}

// 只关心 id 顺序时的简写。
function buildTimelineFootprint(id, occurredOn, overrides = {}) {
  return buildRawFootprint({
    id,
    occurredOn,
    title: `第 ${id} 件事`,
    ...overrides
  });
}

describe("growthFootprints · 类别与标签常量", () => {
  it("类别正好 5 个，id 与展示文案固定", () => {
    expect(FOOTPRINT_CATEGORY_IDS).toEqual(["learning", "explore", "outdoor", "create", "together"]);
    expect(FOOTPRINT_CATEGORIES.map((category) => category.displayLabel)).toEqual([
      "📚 一起学习",
      "🔬 一起探索",
      "🌳 一起出门",
      "🎨 一起创作",
      "❤️ 一起时光"
    ]);
    // together 是「一起时光」，不是「一起度过」。
    expect(FOOTPRINT_CATEGORIES[4].label).toBe("一起时光");
    // 没有 special 这种类别，也没有「等级 / 成就」味道的类别。
    expect(FOOTPRINT_CATEGORY_IDS).not.toContain("special");
  });

  it("标签正好 5 个，id 与展示文案固定", () => {
    expect(FOOTPRINT_TAG_IDS).toEqual(["first", "special", "coop", "discover", "brave"]);
    expect(FOOTPRINT_TAGS.map((tag) => tag.displayLabel)).toEqual([
      "✨ 第一次",
      "❤️ 特别时刻",
      "🤝 一起合作",
      "🔍 新发现",
      "💪 勇敢尝试"
    ]);
    // persist / solo 这类容易滑回学习评价体系的标签不在第一版里。
    expect(FOOTPRINT_TAG_IDS).not.toContain("persist");
    expect(FOOTPRINT_TAG_IDS).not.toContain("solo");
  });

  it("类别与标签的 meta 查询带上安全兜底，且不认识的 id 原样保留", () => {
    expect(getFootprintCategoryMeta("outdoor")).toEqual({
      id: "outdoor",
      glyph: "🌳",
      label: "一起出门",
      displayLabel: "🌳 一起出门",
      isKnown: true
    });
    // 未知类别绝不偷偷映射成某个真实类别。
    expect(getFootprintCategoryMeta("mystery")).toEqual({
      id: "mystery",
      glyph: "📝",
      label: "其他记录",
      displayLabel: "📝 其他记录",
      isKnown: false
    });
    expect(getFootprintCategoryMeta("")).toEqual({
      id: "",
      glyph: "📝",
      label: "其他记录",
      displayLabel: "📝 其他记录",
      isKnown: false
    });
    expect(getFootprintTagMeta("discover").label).toBe("新发现");
    expect(getFootprintTagMeta("persist")).toEqual({
      id: "persist",
      glyph: "🏷️",
      label: "",
      displayLabel: "",
      isKnown: false
    });
    expect(getFootprintTagMeta(undefined).isKnown).toBe(false);
  });
});

describe("growthFootprints · 日期判断", () => {
  it("接受真实历史日期", () => {
    for (const dateKey of ["2026-10-18", "2026-01-01", "2024-02-29", "2000-02-29", "1900-01-01"]) {
      expect(isValidFootprintDate(dateKey), dateKey).toBe(true);
      expect(normalizeFootprintDate(dateKey)).toBe(dateKey);
    }
  });

  it("接受闰年 2 月 29 日，拒绝非闰年 2 月 29 日", () => {
    expect(isValidFootprintDate("2024-02-29")).toBe(true);
    expect(isValidFootprintDate("2000-02-29")).toBe(true);
    // 2026 不是闰年；1900 能被 100 整除但不能被 400 整除，也不是闰年。
    expect(isValidFootprintDate("2026-02-29")).toBe(false);
    expect(isValidFootprintDate("1900-02-29")).toBe(false);
  });

  it("拒绝不存在的日期，绝不静默归一化", () => {
    // 2026-02-30 如果被 new Date("2026-02-30") 处理会变成 3 月 2 日——这里必须直接判非法。
    for (const impossibleDateKey of ["2026-02-30", "2026-13-01", "2027-04-31", "2026-00-10", "2026-01-00", "2026-11-31"]) {
      expect(isValidFootprintDate(impossibleDateKey), impossibleDateKey).toBe(false);
      expect(normalizeFootprintDate(impossibleDateKey)).toBe("");
    }
  });

  it("拒绝格式不正确的日期", () => {
    for (const malformedDateKey of ["2026/10/18", "2026-10-8", "20261018", "2026-10-18T00:00:00.000Z", "", "today"]) {
      expect(isValidFootprintDate(malformedDateKey), malformedDateKey).toBe(false);
    }

    expect(isValidFootprintDate(null)).toBe(false);
    expect(isValidFootprintDate(undefined)).toBe(false);
    expect(isValidFootprintDate(20261018)).toBe(false);
    expect(normalizeFootprintDate(null)).toBe("");
  });

  it("getLocalDateKey 用本地年月日拼，不经过 UTC", () => {
    expect(getLocalDateKey(REFERENCE_DATE)).toBe(REFERENCE_DATE_KEY);
    expect(getLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    // 非法输入退回「现在」，不抛错。
    expect(getLocalDateKey("not-a-date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("未来但真实的日期在第 1 层合法，是否允许提交由第 2 层决定", () => {
    // 第 1 层（isValidFootprintDate / normalizeFootprintDate）：只管「是不是真实存在的日历日」。
    // 未来日期在这一层是合法的——不能把「未来检查」塞回这里。
    expect(isValidFootprintDate("2099-01-01")).toBe(true);
    expect(normalizeFootprintDate("2099-01-01")).toBe("2099-01-01");
    expect(normalizeFootprint(buildRawFootprint({ occurredOn: "2099-01-01" })).occurredOn).toBe("2099-01-01");

    // 对照：真正不存在的日历日在第 1 层就该被判非法。
    expect(isValidFootprintDate("2099-02-30")).toBe(false);
    expect(normalizeFootprintDate("2099-02-30")).toBe("");

    // 第 2 层（validateFootprintDraft）：在真实日期成立之后，才追加「不得晚于参考日」。
    const result = validateFootprintDraft(
      { occurredOn: "2099-01-01", category: "explore", title: "未来的事" },
      { referenceDate: REFERENCE_DATE }
    );

    expect(result.isValid).toBe(false);
    expect(result.value).toBeNull();
    expect(result.issues.map((issue) => issue.field)).toContain("occurredOn");

    // real calendar date ≠ allowed submission date：
    // 同一个 2099-01-01，第 1 层为 true，第 2 层为 invalid。
    expect(isValidFootprintDate("2099-01-01")).toBe(true);
  });
});

describe("growthFootprints · 标签归一化", () => {
  it("剔除未知标签、去重、按固定顺序输出", () => {
    expect(normalizeFootprintTags(["brave", "first", "brave"])).toEqual(["first", "brave"]);
    expect(normalizeFootprintTags(["coop", "unknown", "first"])).toEqual(["first", "coop"]);
    expect(normalizeFootprintTags([...FOOTPRINT_TAG_IDS].reverse())).toEqual([...FOOTPRINT_TAG_IDS]);
    expect(normalizeFootprintTags([])).toEqual([]);
  });

  it("非数组一律降级为空数组", () => {
    for (const rawTags of [undefined, null, "first", 1, { first: true }]) {
      expect(normalizeFootprintTags(rawTags)).toEqual([]);
    }
  });
});

describe("growthFootprints · normalizeFootprint", () => {
  it("正常记录逐字段归一化", () => {
    const footprint = normalizeFootprint(buildRawFootprint());

    expect(footprint.id).toBe(12);
    expect(footprint.occurredOn).toBe("2026-10-18");
    expect(footprint.category).toBe("explore");
    expect(footprint.categoryMeta.displayLabel).toBe("🔬 一起探索");
    expect(footprint.title).toBe("第一次一起做火山实验");
    expect(footprint.note).toBe("一开始还有点担心。\n后来特别开心。");
    expect(footprint.tags).toEqual(["first", "coop"]);
    expect(footprint.tagMetas.map((tag) => tag.displayLabel)).toEqual(["✨ 第一次", "🤝 一起合作"]);
    expect(footprint.createdAt).toBe("2026-10-18T09:12:00.000Z");
    expect(footprint.updatedAt).toBe("2026-10-18T09:12:00.000Z");
  });

  it("id 只接受真正的正整数 number，其它一律归零（与服务端 id 语义严格一致）", () => {
    // 合法：原样保留，不做任何解析或改写。
    for (const validId of [1, 3, 999, Number.MAX_SAFE_INTEGER]) {
      expect(normalizeFootprint(buildRawFootprint({ id: validId })).id, String(validId)).toBe(validId);
    }

    // 非法：全部必须是 0。
    // 尤其是 "3.7" / "1e3" / "01" 不能再被 parseInt 猜成 3 / 1 / 1，
    // number 3.7 也不能被读成 3（那会显示一个服务端根本不存在的 id）。
    const invalidIds = [
      0,
      -1,
      3.7,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      "1",
      "01",
      "3.7",
      "1e3",
      "abc",
      "",
      null,
      undefined,
      {},
      [],
      true,
      false
    ];

    for (const invalidId of invalidIds) {
      expect(normalizeFootprint(buildRawFootprint({ id: invalidId })).id, String(invalidId)).toBe(0);
    }

    // 列表路径同样严格。
    expect(normalizeFootprints([{ id: "1" }, { id: 2 }]).map((footprint) => footprint.id)).toEqual([0, 2]);
  });

  it("CRLF 归一成 LF，首尾空白被 trim，但内部换行与 emoji 一个不少", () => {
    const footprint = normalizeFootprint(
      buildRawFootprint({
        title: "  🌟 第一次一起做火山实验  ",
        note: "第一行\r\n\r\n第二行 🌋  \r\n",
        category: "explore"
      })
    );

    expect(footprint.title).toBe("🌟 第一次一起做火山实验");
    // 段落之间的空行必须保留：这是真实记录，不是要被清洗的文本。
    expect(footprint.note).toBe("第一行\n\n第二行 🌋");
  });

  it("tags 去重、固定顺序，未知 tag 被剔除", () => {
    const footprint = normalizeFootprint(
      buildRawFootprint({ tags: ["brave", "first", "brave", "persist", "coop"] })
    );

    expect(footprint.tags).toEqual(["first", "coop", "brave"]);
  });

  it("脏数据被安全降级，不抛错也不伪造记录", () => {
    const footprint = normalizeFootprint({
      id: "abc",
      occurredOn: "2026-02-30",
      category: "mystery-category",
      title: 42,
      note: null,
      tags: "first",
      createdAt: null,
      updatedAt: undefined
    });

    expect(footprint.id).toBe(0);
    expect(footprint.occurredOn).toBe("");
    expect(footprint.category).toBe("mystery-category");
    expect(footprint.categoryMeta.isKnown).toBe(false);
    expect(footprint.categoryMeta.label).toBe("其他记录");
    expect(footprint.title).toBe("42");
    expect(footprint.note).toBe("");
    expect(footprint.tags).toEqual([]);
    expect(footprint.tagMetas).toEqual([]);
    expect(footprint.createdAt).toBe("");
    expect(footprint.updatedAt).toBe("");
  });

  it("空 list 与非法输入得到空数组", () => {
    expect(normalizeFootprints([])).toEqual([]);
    expect(normalizeFootprints(null)).toEqual([]);
    expect(normalizeFootprints(undefined)).toEqual([]);
    expect(normalizeFootprints({})).toEqual([]);
    // 单条非法输入也会被归一化成一条安全记录，而不是被丢掉。
    expect(normalizeFootprints([null])).toHaveLength(1);
    expect(normalizeFootprints([null])[0].id).toBe(0);
  });

  it("排序契约与服务端一致：occurredOn DESC，同日 id DESC", () => {
    const sorted = sortFootprintsDesc([
      buildTimelineFootprint(1, "2026-10-01"),
      buildTimelineFootprint(3, "2026-10-05"),
      buildTimelineFootprint(2, "2026-10-05"),
      buildTimelineFootprint(4, "2025-12-31")
    ]);

    expect(sorted.map((footprint) => footprint.id)).toEqual([3, 2, 1, 4]);
    // 不改原数组
    expect(sorted).toHaveLength(4);
  });
});

describe("growthFootprints · validateFootprintDraft", () => {
  function buildDraft(overrides = {}) {
    return {
      occurredOn: REFERENCE_DATE_KEY,
      category: "explore",
      title: "第一次一起做火山实验",
      note: "冒泡特别开心。",
      tags: ["first", "coop"],
      ...overrides
    };
  }

  function validate(draft) {
    return validateFootprintDraft(draft, { referenceDate: REFERENCE_DATE });
  }

  it("合法草稿通过，并给出可直接提交的值", () => {
    const result = validate(buildDraft({ title: "  一起看星星  ", tags: ["coop", "coop", "first"] }));

    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.value).toEqual({
      occurredOn: REFERENCE_DATE_KEY,
      category: "explore",
      title: "一起看星星",
      note: "冒泡特别开心。",
      tags: ["first", "coop"]
    });
  });

  it("日期：历史合法、闰年合法、未来与不存在的日期非法", () => {
    expect(validate(buildDraft({ occurredOn: "2024-02-29" })).isValid).toBe(true);
    expect(validate(buildDraft({ occurredOn: "2000-02-29" })).isValid).toBe(true);
    // 参考日当天允许（今天也可以记）。
    expect(validate(buildDraft({ occurredOn: REFERENCE_DATE_KEY })).isValid).toBe(true);

    for (const invalidDateKey of [
      "2026-10-19",
      "2027-01-01",
      "2026-02-29",
      "2026-02-30",
      "2026-13-01",
      "2026/10/18",
      "2026-10-8",
      ""
    ]) {
      const result = validate(buildDraft({ occurredOn: invalidDateKey }));

      expect(result.isValid, invalidDateKey).toBe(false);
      expect(result.issues.map((issue) => issue.field)).toContain("occurredOn");
      expect(result.value).toBeNull();
    }
  });

  it("类别：只接受 5 个固定 id", () => {
    for (const category of FOOTPRINT_CATEGORY_IDS) {
      expect(validate(buildDraft({ category })).isValid, category).toBe(true);
    }

    for (const invalidCategory of ["special", "study", "EXPLORE", "", "学习"]) {
      const result = validate(buildDraft({ category: invalidCategory }));

      expect(result.isValid, invalidCategory).toBe(false);
      expect(result.issues.map((issue) => issue.field)).toContain("category");
    }
  });

  it("标题：1 / 40 合法，0 / 41 非法", () => {
    expect(validate(buildDraft({ title: "字" })).isValid).toBe(true);

    const longestAllowed = validate(buildDraft({ title: "字".repeat(MAX_FOOTPRINT_TITLE_LENGTH) }));

    expect(longestAllowed.isValid).toBe(true);
    expect(longestAllowed.value.title).toHaveLength(MAX_FOOTPRINT_TITLE_LENGTH);

    for (const invalidTitle of ["", "   ", "\n", null, undefined, "字".repeat(MAX_FOOTPRINT_TITLE_LENGTH + 1)]) {
      const result = validate(buildDraft({ title: invalidTitle }));

      expect(result.isValid, JSON.stringify(invalidTitle)).toBe(false);
      expect(result.issues.map((issue) => issue.field)).toContain("title");
    }
  });

  it("记录：0 / 500 合法，501 非法", () => {
    expect(validate(buildDraft({ note: "" })).isValid).toBe(true);
    expect(validate(buildDraft({ note: undefined })).isValid).toBe(true);

    const longestAllowed = validate(buildDraft({ note: "记".repeat(MAX_FOOTPRINT_NOTE_LENGTH) }));

    expect(longestAllowed.isValid).toBe(true);
    expect(longestAllowed.value.note).toHaveLength(MAX_FOOTPRINT_NOTE_LENGTH);

    const tooLong = validate(buildDraft({ note: "记".repeat(MAX_FOOTPRINT_NOTE_LENGTH + 1) }));

    expect(tooLong.isValid).toBe(false);
    expect(tooLong.issues.map((issue) => issue.field)).toContain("note");
  });

  it("标签：可以空、可以省略、未知与非数组非法", () => {
    expect(validate(buildDraft({ tags: [] })).value.tags).toEqual([]);
    expect(validate(buildDraft({ tags: undefined })).value.tags).toEqual([]);
    expect(validate(buildDraft({ tags: null })).value.tags).toEqual([]);
    expect(validate(buildDraft({ tags: [...FOOTPRINT_TAG_IDS].reverse() })).value.tags).toEqual([...FOOTPRINT_TAG_IDS]);

    for (const invalidTags of [["persist"], ["first", "nope"], "first", 1, { first: true }]) {
      const result = validate(buildDraft({ tags: invalidTags }));

      expect(result.isValid, JSON.stringify(invalidTags)).toBe(false);
      expect(result.issues.map((issue) => issue.field)).toContain("tags");
    }
  });

  it("多条问题会一次性全部报出来，值只在完全合法时才给出", () => {
    const result = validate({ occurredOn: "2026-02-30", category: "nope", title: "", note: "记".repeat(501), tags: "x" });

    expect(result.isValid).toBe(false);
    expect(result.value).toBeNull();
    expect(result.issues.map((issue) => issue.field)).toEqual(["occurredOn", "category", "title", "note", "tags"]);
    expect(result.issues.every((issue) => Boolean(issue.message))).toBe(true);
  });

  it("非法草稿输入不会抛错", () => {
    for (const draft of [undefined, null, "draft", 42]) {
      const result = validateFootprintDraft(draft, { referenceDate: REFERENCE_DATE });

      expect(result.isValid).toBe(false);
      expect(result.value).toBeNull();
    }
  });
});

describe("growthFootprints · groupFootprintsByMonth", () => {
  const TIMELINE = [
    buildTimelineFootprint(1, "2024-05-01"),
    buildTimelineFootprint(2, "2025-12-31"),
    buildTimelineFootprint(3, "2026-01-01"),
    buildTimelineFootprint(4, "2026-01-01"),
    buildTimelineFootprint(5, "2025-12-31")
  ];

  it("空数据得到空分组", () => {
    expect(groupFootprintsByMonth([])).toEqual([]);
    expect(groupFootprintsByMonth(null)).toEqual([]);
  });

  it("单条记录也成组，标题带年带月", () => {
    const groups = groupFootprintsByMonth([buildTimelineFootprint(1, "2026-10-18")]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("2026-10");
    expect(groups[0].year).toBe(2026);
    expect(groups[0].month).toBe(10);
    expect(groups[0].label).toBe("2026 年 10 月");
    expect(groups[0].items.map((footprint) => footprint.id)).toEqual([1]);
  });

  it("同月归一组，跨月跨年按月份降序", () => {
    const groups = groupFootprintsByMonth(TIMELINE);

    expect(groups.map((group) => group.key)).toEqual(["2026-01", "2025-12", "2024-05"]);
    expect(groups.map((group) => group.label)).toEqual(["2026 年 1 月", "2025 年 12 月", "2024 年 5 月"]);
    expect(groups.map((group) => group.items.map((footprint) => footprint.id))).toEqual([
      [4, 3],
      [5, 2],
      [1]
    ]);
  });

  it("输入顺序不影响结果，同一天按 id 降序（后记的在前）", () => {
    const shuffled = [TIMELINE[3], TIMELINE[0], TIMELINE[4], TIMELINE[2], TIMELINE[1]];

    expect(groupFootprintsByMonth(shuffled)).toEqual(groupFootprintsByMonth(TIMELINE));

    const sameDay = groupFootprintsByMonth([
      buildTimelineFootprint(7, "2026-10-18"),
      buildTimelineFootprint(9, "2026-10-18"),
      buildTimelineFootprint(8, "2026-10-18")
    ]);

    expect(sameDay[0].items.map((footprint) => footprint.id)).toEqual([9, 8, 7]);
  });

  it("日期非法的脏记录不进时间线，但同月其它记录照常展示", () => {
    const groups = groupFootprintsByMonth([
      buildTimelineFootprint(1, "2026-10-18"),
      buildTimelineFootprint(2, "2026-02-30"),
      buildTimelineFootprint(3, "not-a-date")
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((footprint) => footprint.id)).toEqual([1]);
  });
});

describe("growthFootprints · buildFootprintSummary", () => {
  it("0 条：空状态文案，没有「最近一次」", () => {
    const summary = buildFootprintSummary([]);

    expect(summary.count).toBe(0);
    expect(summary.hasFootprints).toBe(false);
    expect(summary.countText).toBe("还没有一起经历的故事");
    expect(summary.recentFootprint).toBeNull();
    expect(summary.recentTitle).toBe("");
    expect(summary.recentText).toBe("");
    expect(summary.emptyText).toBe(FOOTPRINT_SUMMARY_EMPTY_TEXT);
  });

  it("1 条：就是最近一次", () => {
    const summary = buildFootprintSummary([buildTimelineFootprint(1, "2026-10-18", { title: "第一次一起做彩虹水实验" })]);

    expect(summary.count).toBe(1);
    expect(summary.hasFootprints).toBe(true);
    expect(summary.countText).toBe("已经留下 1 个一起经历的故事");
    expect(summary.recentTitle).toBe("第一次一起做彩虹水实验");
    expect(summary.recentText).toBe("最近一次：第一次一起做彩虹水实验");
    expect(summary.recentFootprint.id).toBe(1);
  });

  it("多条：count 正确，最近一次按日期与 id 取最新的那条", () => {
    const summary = buildFootprintSummary([
      buildTimelineFootprint(1, "2024-05-01", { title: "最早的一件事" }),
      buildTimelineFootprint(2, "2026-10-18", { title: "同日先记" }),
      buildTimelineFootprint(3, "2026-10-18", { title: "同日后记" }),
      buildTimelineFootprint(4, "2026-09-30", { title: "中间的一件事" })
    ]);

    expect(summary.count).toBe(4);
    expect(summary.countText).toBe("已经留下 4 个一起经历的故事");
    expect(summary.recentTitle).toBe("同日后记");
    expect(summary.recentFootprint.id).toBe(3);
    expect(summary.recentText).toBe("最近一次：同日后记");
    // 日期非法的脏记录不算进故事数量。
    expect(buildFootprintSummary([buildTimelineFootprint(5, "2026-02-30")]).count).toBe(0);
  });

  it("摘要文案不做游戏化：没有分数、进度、经验值、完成率", () => {
    const summary = buildFootprintSummary([
      buildTimelineFootprint(1, "2026-10-18", { title: "第一次一起做彩虹水实验" }),
      buildTimelineFootprint(2, "2026-10-17", { title: "去公园找秋天的叶子" })
    ]);

    for (const text of [summary.countText, summary.recentText, summary.emptyText]) {
      expect(text).not.toMatch(/\d+\s*\/\s*\d+/);
      for (const forbiddenWord of ["进度", "经验", "升级", "加油", "完成率", "成就", "印章", "宝箱", "任务"]) {
        expect(text, `${text} 不应该出现「${forbiddenWord}」`).not.toContain(forbiddenWord);
      }
    }
  });
});
