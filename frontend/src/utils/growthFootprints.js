// 共同成长足迹（前端纯函数契约，Phase 2D-A1）。
//
// 一条 footprint = 真实发生过的一件「一起经历的事」。
// 这里只做纯函数和常量：归一化、校验、按月分组、首页摘要。
// 不 fetch、不读 localStorage、不用 Vue ref、不碰 DOM / router——
// 数据获取留到 Phase 2D-A2 的 service 与 composable。
//
// 与后端的关系：服务端是最终权威，这里只是用户体验层。
// 常量（类别 / 标签 id、长度上限、日期规则）与 backend/src/routes/growthFootprints.js 各维护一份，
// 两侧都有测试把 id 与边界钉死；不为了消除这点重复去新建 shared package。
export const MAX_FOOTPRINT_TITLE_LENGTH = 40;
export const MAX_FOOTPRINT_NOTE_LENGTH = 500;

const FOOTPRINT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function createFootprintMetaList(definitions) {
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

// 经历的「性质」，不是成就等级。没有 special 这种类别——「特别」由标签表达。
export const FOOTPRINT_CATEGORIES = createFootprintMetaList([
  { id: "learning", glyph: "📚", label: "一起学习" },
  { id: "explore", glyph: "🔬", label: "一起探索" },
  { id: "outdoor", glyph: "🌳", label: "一起出门" },
  { id: "create", glyph: "🎨", label: "一起创作" },
  { id: "together", glyph: "❤️", label: "一起时光" }
]);

// 固定标签：这些是「事情发生当时」才最容易知道的事实，事后再也可靠反推不出来。
export const FOOTPRINT_TAGS = createFootprintMetaList([
  { id: "first", glyph: "✨", label: "第一次" },
  { id: "special", glyph: "❤️", label: "特别时刻" },
  { id: "coop", glyph: "🤝", label: "一起合作" },
  { id: "discover", glyph: "🔍", label: "新发现" },
  { id: "brave", glyph: "💪", label: "勇敢尝试" }
]);

export const FOOTPRINT_CATEGORY_IDS = Object.freeze(FOOTPRINT_CATEGORIES.map((category) => category.id));
export const FOOTPRINT_TAG_IDS = Object.freeze(FOOTPRINT_TAGS.map((tag) => tag.id));

// 未知类别不做「偷偷映射成某个真实类别」——那会造成语义错误。
// 这里给一个安全的兜底展示，同时原样保留 category id 供调试。
const FOOTPRINT_CATEGORY_FALLBACK = Object.freeze({
  glyph: "📝",
  label: "其他记录",
  displayLabel: "📝 其他记录"
});
const FOOTPRINT_TAG_FALLBACK = Object.freeze({
  glyph: "🏷️",
  label: "",
  displayLabel: ""
});

export const FOOTPRINT_SUMMARY_EMPTY_TEXT = "还没有一起经历的故事，找个时间一起做点什么吧。";

// 只做「首尾 trim + CRLF → LF」，不折叠内部空格、不改写用户记录的内容（emoji / 换行都原样保留）。
export function normalizeFootprintText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

// 浏览器本地今天。注意：前端**不知道**服务器时钟，所以它只是第 2 层提交规则的参考日
// （表单默认值 + validateFootprintDraft 的「不得晚于」判断），
// 真正的「不得晚于今天」由服务端按它自己的本地日期再判一次。
export function getLocalDateKey(referenceDate = new Date()) {
  const resolvedDate =
    referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  const month = `${resolvedDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${resolvedDate.getDate()}`.padStart(2, "0");

  return `${resolvedDate.getFullYear()}-${month}-${day}`;
}

// 只判断「这个字符串是否表示一个真实存在的日历日」：格式 + 逐字段比对。
//
// 它**不**判断「这个日期是否允许提交」——未来日期、超过参考日之类都不在这一层。
// 所以 2099-01-01 在这里是 true（它确实是真实日历日），
// 只是稍后会被 validateFootprintDraft() 以「不能选到未来」拒绝。
//
// 两层职责刻意分开，别把未来检查塞进本函数：
//   第 1 层（本函数）              真实日历日：YYYY-MM-DD 且真实存在
//   第 2 层（validateFootprintDraft）提交规则：在真实日期成立的基础上，不得晚于浏览器本地参考日
// 服务端同样是两层：normalizeOccurredOn() 判真实日期，normalizeFootprintInput() 再判不晚于服务器本地今天。
//
// 第 1 层没有最早年份下限，只有「格式」和「真实存在」两条规则；
// 下面 setFullYear 的基准日只是构造用的壳子，三个字段都会被显式覆盖，不构成任何日期下限。
export function isValidFootprintDate(value) {
  const matched = FOOTPRINT_DATE_PATTERN.exec(String(value ?? "").trim());

  if (!matched) {
    return false;
  }

  const year = Number.parseInt(matched[1], 10);
  const month = Number.parseInt(matched[2], 10);
  const day = Number.parseInt(matched[3], 10);
  const calendarProbe = new Date();

  calendarProbe.setHours(0, 0, 0, 0);
  // 月份 / 日期溢出时会滚到下一个月（或下一年），逐字段比对立刻能发现。
  calendarProbe.setFullYear(year, month - 1, day);

  return (
    calendarProbe.getFullYear() === year &&
    calendarProbe.getMonth() === month - 1 &&
    calendarProbe.getDate() === day
  );
}

// 只做「真实日历日」归一化：合法 → "YYYY-MM-DD"，不合法 → ""（不猜、不归一化、不补零修复）。
// 同样**不**负责判断这个日期是否未来：未来但真实的日期会原样返回，
// 是否允许提交由 validateFootprintDraft() 决定。
export function normalizeFootprintDate(value) {
  const normalized = String(value ?? "").trim();

  return isValidFootprintDate(normalized) ? normalized : "";
}

export function getFootprintCategoryMeta(category) {
  const normalizedCategory = normalizeFootprintText(category);
  const matchedCategory = FOOTPRINT_CATEGORIES.find((item) => item.id === normalizedCategory);

  if (matchedCategory) {
    return matchedCategory;
  }

  return {
    ...FOOTPRINT_CATEGORY_FALLBACK,
    id: normalizedCategory,
    isKnown: false
  };
}

export function getFootprintTagMeta(tag) {
  const normalizedTag = normalizeFootprintText(tag);
  const matchedTag = FOOTPRINT_TAGS.find((item) => item.id === normalizedTag);

  if (matchedTag) {
    return matchedTag;
  }

  return {
    ...FOOTPRINT_TAG_FALLBACK,
    id: normalizedTag,
    isKnown: false
  };
}

// 严格对齐服务端的 id 语义：只接受「真正的正整数 number」，其它一律 0。
//
// 这里刻意不用 parseInt 式的宽松解析：那会把 "3.7" / "1e3" / "01" 猜成 3 / 1 / 1，
// 甚至把 number 3.7 读成 3——于是前端会显示一个服务端根本不存在的 id。
// 也不接受数字字符串：服务端 JSON 里的 id 本来就是 number，没有兼容字符串的必要。
function toPositiveInteger(value) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : 0;
}

// 未知标签剔除、重复标签去重、顺序永远按 FOOTPRINT_TAGS 固定——
// 客户端传什么顺序都不影响展示结果。
export function normalizeFootprintTags(rawTags) {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  const normalizedTags = rawTags.map((tag) => normalizeFootprintText(tag));

  return FOOTPRINT_TAG_IDS.filter((tagId) => normalizedTags.includes(tagId));
}

// 「服务端数据 → 展示模型」的安全归一化：只把可疑值降级，不伪造真实记录。
// - id 不是「正整数 number」→ 0（严格对齐服务端 id 语义，见 toPositiveInteger）
// - occurredOn 不是真实日历日 → ""（不会出现在时间线上，但原值仍可通过重新请求拿到）
//   注意这里只做真实日历日归一化，未来日期会原样保留
// - category 原样保留，另给一份安全的 categoryMeta
// - 长度不在这里截断：长度是校验层的事，归一化层不改写记录内容
// - photos：只保留形状可信的那几张（有 id、有可用的 /api 地址），坏数据直接丢掉，
//   而不是在页面上渲染一个破图。
export function normalizeFootprintPhoto(rawPhoto) {
  const source = rawPhoto && typeof rawPhoto === "object" ? rawPhoto : {};
  const id = toPositiveInteger(source.id);
  const url = normalizeFootprintText(source.url);

  if (id <= 0 || !url.startsWith("/api/")) {
    return null;
  }

  const byteSize = Number(source.byteSize);

  return {
    id,
    url,
    mimeType: normalizeFootprintText(source.mimeType),
    byteSize: Number.isFinite(byteSize) && byteSize > 0 ? Math.round(byteSize) : 0,
    createdAt: normalizeFootprintText(source.createdAt)
  };
}

export function normalizeFootprintPhotos(rawPhotos) {
  if (!Array.isArray(rawPhotos)) {
    return [];
  }

  return rawPhotos.map((photo) => normalizeFootprintPhoto(photo)).filter(Boolean);
}

export function normalizeFootprint(rawFootprint) {
  const source = rawFootprint && typeof rawFootprint === "object" ? rawFootprint : {};
  const category = normalizeFootprintText(source.category);
  const tags = normalizeFootprintTags(source.tags);

  return {
    id: toPositiveInteger(source.id),
    occurredOn: normalizeFootprintDate(source.occurredOn),
    category,
    categoryMeta: getFootprintCategoryMeta(category),
    title: normalizeFootprintText(source.title),
    note: normalizeFootprintText(source.note),
    tags,
    tagMetas: tags.map((tag) => getFootprintTagMeta(tag)),
    photos: normalizeFootprintPhotos(source.photos),
    createdAt: normalizeFootprintText(source.createdAt),
    updatedAt: normalizeFootprintText(source.updatedAt)
  };
}

export function normalizeFootprints(list) {
  return Array.isArray(list) ? list.map((item) => normalizeFootprint(item)) : [];
}

// 与服务端一致的排序契约：occurredOn DESC，同一天按 id DESC（后记的在前）。
export function sortFootprintsDesc(footprints) {
  return [...(Array.isArray(footprints) ? footprints : [])].sort((left, right) => {
    const leftDate = String(left?.occurredOn ?? "");
    const rightDate = String(right?.occurredOn ?? "");

    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }

    return toPositiveInteger(right?.id) - toPositiveInteger(left?.id);
  });
}

// 时间线上真正能排位置的那些：日期合法。日期非法的脏记录不进时间线。
function listTimelineFootprints(footprints) {
  return sortFootprintsDesc(normalizeFootprints(footprints)).filter((footprint) => Boolean(footprint.occurredOn));
}

// 前端校验是用户体验层，服务端仍是最终权威。
// referenceDate 让单测不依赖真实当天；它代表「浏览器本地今天」。
//
// 这里是第 2 层「是否允许提交」，未来检查只在这一层做：
//   normalizeFootprintDate() 已经保证了「真实日历日」；
//   本函数在此基础上再补一条「不得晚于 referenceDate 的本地自然日」。
// 所以同一个 2099-01-01：isValidFootprintDate() 是 true（那一天真实存在），
// 但本函数会因为晚于参考日而判非法。服务端还会用它自己的本地今天再判一次。
//
// 返回 { isValid, issues, value }：issues 是 [{ field, message }] 供表单逐字段提示；
// 只有全部通过时 value 才是可直接提交给服务端的形状，否则 value 为 null
// （和服务端一样，绝不给调用方一个「看起来能用」的非法值）。
export function validateFootprintDraft(draft = {}, { referenceDate = new Date() } = {}) {
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

  if (!FOOTPRINT_CATEGORY_IDS.includes(category)) {
    issues.push({ field: "category", message: "请选一个经历类别。" });
  }

  const title = normalizeFootprintText(source.title);

  if (!title) {
    issues.push({ field: "title", message: "给这件事写一个标题吧。" });
  } else if (title.length > MAX_FOOTPRINT_TITLE_LENGTH) {
    issues.push({ field: "title", message: `标题最多 ${MAX_FOOTPRINT_TITLE_LENGTH} 个字。` });
  }

  const note = normalizeFootprintText(source.note);

  if (note.length > MAX_FOOTPRINT_NOTE_LENGTH) {
    issues.push({ field: "note", message: `记录最多 ${MAX_FOOTPRINT_NOTE_LENGTH} 个字。` });
  }

  const hasTags = source.tags !== undefined && source.tags !== null;
  let tags = [];

  if (hasTags && !Array.isArray(source.tags)) {
    issues.push({ field: "tags", message: "标签格式不正确。" });
  } else {
    const rawTags = hasTags ? source.tags.map((tag) => normalizeFootprintText(tag)) : [];
    const hasUnknownTag = rawTags.some((tag) => !FOOTPRINT_TAG_IDS.includes(tag));

    if (hasUnknownTag) {
      issues.push({ field: "tags", message: "有不能识别的标签。" });
    } else {
      tags = FOOTPRINT_TAG_IDS.filter((tagId) => rawTags.includes(tagId));
    }
  }

  // 照片是「已经存下来的东西」，不是用户手填的字段：这里只挡住形状不对的输入。
  // 数量上限由服务端把关（前端只在上传前提示），照片本身也不进 value——
  // 草稿校验只管「文字部分能不能提交」，照片走专门的接口追加，
  // 这样编辑一条老记录不会因为照片把整次提交打回。
  if (source.photos !== undefined && source.photos !== null && !Array.isArray(source.photos)) {
    issues.push({ field: "photos", message: "照片格式不正确。" });
  }

  return {
    isValid: issues.length === 0,
    issues,
    value: issues.length === 0 ? { occurredOn, category, title, note, tags } : null
  };
}

// 纪念册用的月份分组：月份降序，组内 occurredOn DESC + id DESC。
// 日期非法的记录无法在时间线上定位，不出现在任何月份里（服务端不会产生这种数据）。
export function groupFootprintsByMonth(footprints = []) {
  const groups = [];
  const groupIndexByKey = new Map();

  for (const footprint of listTimelineFootprints(footprints)) {
    const key = footprint.occurredOn.slice(0, 7);
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

    groups[groupIndexByKey.get(key)].items.push(footprint);
  }

  return groups;
}

// 「全部」页签：把两条记录线按真实日期混排成一条时间线。
//
// 纯展示层的汇总：不新建数据、不复制记录，只在每条记录上标一个 kind，
// 页面据此决定用哪套配色 / 标签（足迹有 tags，成长记录没有）。
// 分组形状与 groupFootprintsByMonth 完全一致（key / year / month / label / items），
// 所以三条页签可以共用同一套月份排版。
//
// 注意：这个函数只做「合并 + 排序 + 分组」，不做归一化——两条线各自由
// normalizeFootprints / normalizeMilestones 归一化之后再传进来。
// 把混在一起的数组交给其中任意一个归一化函数，都会让另一条线被错误解释
// （比如成长记录被套上 footprints 的语义，凭空多出 tags、日期校验也换了规则）。
export function mergeFootprintTimelines({ footprints = [], milestones = [] } = {}) {
  const merged = [
    ...(Array.isArray(footprints) ? footprints : []).map((footprint) => ({ ...footprint, kind: "footprint" })),
    ...(Array.isArray(milestones) ? milestones : []).map((milestone) => ({ ...milestone, kind: "milestone" }))
  ];
  // 两条线各自的排序契约本来就一样（occurredOn DESC，同日 id DESC），
  // 所以这里直接复用足迹的排序函数，同日时两条线的记录交错出现。
  // 日期为空的记录（脏数据）无法在时间线上定位，和 groupFootprintsByMonth 一样不进时间线。
  const timeline = sortFootprintsDesc(merged).filter(
    (item) => typeof item.occurredOn === "string" && item.occurredOn.length > 0
  );
  const groups = [];
  const groupIndexByKey = new Map();

  for (const item of timeline) {
    const key = item.occurredOn.slice(0, 7);
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

    groups[groupIndexByKey.get(key)].items.push(item);
  }

  return groups;
}

// 「全部」页签的一句话状态：只说记下了多少，不做评价、不给分母。
export function buildMergedTimelineSummary({ footprints = [], milestones = [] } = {}) {
  const count = mergeFootprintTimelines({ footprints, milestones }).reduce(
    (total, group) => total + group.items.length,
    0
  );

  return {
    count,
    hasRecords: count > 0,
    countText: count > 0 ? `一共留下了 ${count} 个成长瞬间` : "纪念册还没有翻开过"
  };
}

// 首页「我们的足迹」轻量摘要（Phase 2D-A3 才会接线，本轮只建立契约）。
// 文案刻意不做游戏化：不说进度、不说完成率、不说经验值，只陈述留下了几个故事。
export function buildFootprintSummary(footprints = []) {
  const timeline = listTimelineFootprints(footprints);
  const count = timeline.length;
  const recentFootprint = count > 0 ? timeline[0] : null;
  const recentTitle = recentFootprint ? recentFootprint.title : "";

  return {
    count,
    hasFootprints: count > 0,
    countText: count > 0 ? `已经留下 ${count} 个一起经历的故事` : "还没有一起经历的故事",
    recentFootprint,
    recentTitle,
    recentText: recentTitle ? `最近一次：${recentTitle}` : "",
    emptyText: FOOTPRINT_SUMMARY_EMPTY_TEXT
  };
}
