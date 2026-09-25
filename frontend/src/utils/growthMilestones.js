// 「她的成长」的前端契约（Phase 2D-D1）。
//
// 它是纪念册的第二条记录线：只记录**真实发生过的成长**，
// 不评价孩子——没有优良中差、没有分数、没有成长指数、没有排名、没有连续打卡。
//
// 和「我们一起」（growthFootprints.js）的关系：
//   - 两边共享「日期是真实日历日」「按月份分组」这些规则，但实现各写一份纯函数，
//     因为它俩的字段本来就不一样（成长记录没有 tags），合并成一个通用模型反而更难读；
//   - 长度上限复用纪念册的常量：同一本纪念册里，标题 / 记录的字数上限应该是一致的。
import {
  MAX_FOOTPRINT_NOTE_LENGTH,
  MAX_FOOTPRINT_TITLE_LENGTH,
  getLocalDateKey,
  isValidFootprintDate,
  normalizeFootprintDate,
  normalizeFootprintPhotos,
  normalizeFootprintText
} from "./growthFootprints.js";

export const MAX_MILESTONE_TITLE_LENGTH = MAX_FOOTPRINT_TITLE_LENGTH;
export const MAX_MILESTONE_NOTE_LENGTH = MAX_FOOTPRINT_NOTE_LENGTH;

function createMilestoneCategoryList(definitions) {
  return Object.freeze(
    definitions.map((definition) =>
      Object.freeze({
        ...definition,
        displayLabel: `${definition.glyph} ${definition.label}`,
        isKnown: true
      })
    )
  );
}

// 类别说清「这是哪一类经历」，不是等级：学习课堂 / 校园活动 / 兴趣爱好 / 成长变化 / 特别经历。
export const MILESTONE_CATEGORIES = createMilestoneCategoryList([
  { id: "classroom", glyph: "📚", label: "学习课堂" },
  { id: "school", glyph: "🎭", label: "校园活动" },
  { id: "hobby", glyph: "🎨", label: "兴趣爱好" },
  { id: "growth", glyph: "🌱", label: "成长变化" },
  { id: "special", glyph: "🏅", label: "特别经历" }
]);

export const MILESTONE_CATEGORY_IDS = Object.freeze(MILESTONE_CATEGORIES.map((category) => category.id));

// 未知类别不做「偷偷映射成某个真实类别」——那会造成语义错误。
const MILESTONE_CATEGORY_FALLBACK = Object.freeze({
  glyph: "📝",
  label: "其他记录",
  displayLabel: "📝 其他记录"
});

export const MILESTONE_EMPTY_TEXT = "还没有记下她自己的成长瞬间。想到哪一件，就记哪一件。";

export function getMilestoneCategoryMeta(category) {
  const normalizedCategory = normalizeFootprintText(category);
  const matchedCategory = MILESTONE_CATEGORIES.find((item) => item.id === normalizedCategory);

  if (matchedCategory) {
    return matchedCategory;
  }

  return {
    ...MILESTONE_CATEGORY_FALLBACK,
    id: normalizedCategory,
    isKnown: false
  };
}

function toPositiveInteger(value) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : 0;
}

// 「服务端数据 → 展示模型」的安全归一化，规则与 normalizeFootprint 一致：
// 只把可疑值降级，不伪造真实记录。
export function normalizeMilestone(rawMilestone) {
  const source = rawMilestone && typeof rawMilestone === "object" ? rawMilestone : {};
  const category = normalizeFootprintText(source.category);

  return {
    id: toPositiveInteger(source.id),
    occurredOn: normalizeFootprintDate(source.occurredOn),
    category,
    categoryMeta: getMilestoneCategoryMeta(category),
    title: normalizeFootprintText(source.title),
    note: normalizeFootprintText(source.note),
    photos: normalizeFootprintPhotos(source.photos),
    createdAt: normalizeFootprintText(source.createdAt),
    updatedAt: normalizeFootprintText(source.updatedAt)
  };
}

export function normalizeMilestones(list) {
  return Array.isArray(list) ? list.map((item) => normalizeMilestone(item)) : [];
}

// 与服务端一致的排序契约：occurredOn DESC，同一天按 id DESC（后记的在前）。
export function sortMilestonesDesc(milestones) {
  return [...(Array.isArray(milestones) ? milestones : [])].sort((left, right) => {
    const leftDate = String(left?.occurredOn ?? "");
    const rightDate = String(right?.occurredOn ?? "");

    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }

    return toPositiveInteger(right?.id) - toPositiveInteger(left?.id);
  });
}

// 日期非法的脏记录无法在时间线上定位，不进时间线。
function listTimelineMilestones(milestones) {
  return sortMilestonesDesc(normalizeMilestones(milestones)).filter((milestone) => Boolean(milestone.occurredOn));
}

// 纪念册用的月份分组：月份降序，组内 occurredOn DESC + id DESC。
// 分组形状与 groupFootprintsByMonth 完全一致，页面因此可以共用一套排版。
export function groupMilestonesByMonth(milestones = []) {
  const groups = [];
  const groupIndexByKey = new Map();

  for (const milestone of listTimelineMilestones(milestones)) {
    const key = milestone.occurredOn.slice(0, 7);
    const year = Number.parseInt(key.slice(0, 4), 10);
    const month = Number.parseInt(key.slice(5, 7), 10);

    if (!groupIndexByKey.has(key)) {
      groupIndexByKey.set(key, groups.length);
      groups.push({
        key,
        year,
        month,
        label: `${year} 年 ${month} 月`,
        items: []
      });
    }

    groups[groupIndexByKey.get(key)].items.push(milestone);
  }

  return groups;
}

// 空状态之外的一句提示：告诉她「想到哪件就记哪件」，而不是「还差几条」。
export function buildMilestoneSummary(milestones = []) {
  const count = listTimelineMilestones(milestones).length;

  return {
    count,
    hasMilestones: count > 0,
    countText: count > 0 ? `已经记下 ${count} 个她的成长瞬间` : "还没有记下她的成长瞬间",
    emptyText: MILESTONE_EMPTY_TEXT
  };
}

// 前端校验是用户体验层，服务端仍是最终权威。
// 与 validateFootprintDraft 同一套两层规则：日期先判「真实日历日」，再判「不得晚于参考日」。
export function validateMilestoneDraft(draft = {}, { referenceDate = new Date() } = {}) {
  const source = draft && typeof draft === "object" ? draft : {};
  const issues = [];
  const referenceDateKey = getLocalDateKey(referenceDate);
  const occurredOn = normalizeFootprintDate(source.occurredOn);

  if (!occurredOn) {
    issues.push({ field: "occurredOn", message: "请选一个真实存在的日期。" });
  } else if (occurredOn > referenceDateKey) {
    issues.push({ field: "occurredOn", message: "日期不能选到未来。" });
  }

  const category = normalizeFootprintText(source.category);

  if (!MILESTONE_CATEGORY_IDS.includes(category)) {
    issues.push({ field: "category", message: "请选一个类别。" });
  }

  const title = normalizeFootprintText(source.title);

  if (!title) {
    issues.push({ field: "title", message: "给这件事写一个标题吧。" });
  } else if (title.length > MAX_MILESTONE_TITLE_LENGTH) {
    issues.push({ field: "title", message: `标题最多 ${MAX_MILESTONE_TITLE_LENGTH} 个字。` });
  }

  const note = normalizeFootprintText(source.note);

  if (note.length > MAX_MILESTONE_NOTE_LENGTH) {
    issues.push({ field: "note", message: `记录最多 ${MAX_MILESTONE_NOTE_LENGTH} 个字。` });
  }

  // 照片同样不进 value：它由专门的接口追加，不参与文字部分的提交。
  if (source.photos !== undefined && source.photos !== null && !Array.isArray(source.photos)) {
    issues.push({ field: "photos", message: "照片格式不正确。" });
  }

  return {
    isValid: issues.length === 0,
    issues,
    value: issues.length === 0 ? { occurredOn, category, title, note } : null
  };
}

// 「她的成长」页面日期输入的合法上界（浏览器本地今天）。
export function getMilestoneDateLimit(referenceDate = new Date()) {
  return getLocalDateKey(referenceDate);
}

// 复用纪念册的日期判断，方便页面与测试从同一个入口拿。
export { isValidFootprintDate as isValidMilestoneDate, normalizeFootprintDate as normalizeMilestoneDate };
