const styleConfig = require("./homeWelcomeStyle.json");

const DEFAULT_OFF_STYLE_TITLE_PATTERNS = Object.freeze([
  "任务",
  "挑战",
  "闯关",
  "冲刺",
  "打卡",
  "刷题",
  "计划",
  "安排",
  "立刻",
  "马上",
  "赶紧",
  "快来",
  "出发",
  "开启",
  "开始吧",
  "冲呀",
  "太棒啦",
  "最棒",
  "错题"
]);
const DEFAULT_TITLE_ANCHOR_KEYWORDS = Object.freeze(["小岛", "猫头鹰"]);
const TIME_MENTION_ALIAS_MAP = Object.freeze(
  styleConfig?.timeMentionAliasMap && typeof styleConfig.timeMentionAliasMap === "object"
    ? styleConfig.timeMentionAliasMap
    : {}
);
const TITLE_ANCHOR_KEYWORDS = Object.freeze(
  Array.isArray(styleConfig?.titleAnchorKeywords) && styleConfig.titleAnchorKeywords.length > 0
    ? styleConfig.titleAnchorKeywords
    : DEFAULT_TITLE_ANCHOR_KEYWORDS
);

function normalizeInlineText(value = "", maxLength = 0) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function getTimeMentionCandidates({ timeContextKey = "", timeCueLabel = "", timeGreetingLabel = "" } = {}) {
  return Array.from(
    new Set([timeCueLabel, timeGreetingLabel, ...(TIME_MENTION_ALIAS_MAP[String(timeContextKey || "").trim()] || [])].filter(Boolean))
  );
}

function normalizeComparableText(value = "") {
  return normalizeInlineText(value, 120).replace(/[，。！？!?、；：“”"'‘’（）()\-\s]/g, "").trim();
}

function isTextTooSimilar(left, right) {
  const normalizedLeft = normalizeComparableText(left);
  const normalizedRight = normalizeComparableText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft;

  if (shorter.length >= 6 && longer.includes(shorter)) {
    return true;
  }

  const minLength = Math.min(normalizedLeft.length, normalizedRight.length);
  let commonPrefixLength = 0;

  while (
    commonPrefixLength < minLength &&
    normalizedLeft[commonPrefixLength] === normalizedRight[commonPrefixLength]
  ) {
    commonPrefixLength += 1;
  }

  return commonPrefixLength >= 8 || commonPrefixLength / minLength >= 0.72;
}

function isTitleOffStyle(
  title,
  {
    timeCueLabel = "",
    timeGreetingLabel = "",
    monthVibe = "",
    displayName = ""
  } = {},
  customPatterns = null
) {
  const normalizedTitle = normalizeInlineText(title, Number(styleConfig.maxTitleLength || 28) * 3);

  if (!normalizedTitle || normalizedTitle.length < 4) {
    return true;
  }

  const patterns =
    Array.isArray(customPatterns) && customPatterns.length > 0
      ? customPatterns
      : Array.isArray(styleConfig.offStyleTitlePatterns) && styleConfig.offStyleTitlePatterns.length > 0
        ? styleConfig.offStyleTitlePatterns
        : DEFAULT_OFF_STYLE_TITLE_PATTERNS;

  if (patterns.some((pattern) => normalizedTitle.includes(pattern))) {
    return true;
  }

  if ((normalizedTitle.match(/[!！]/g) || []).length > 1) {
    return true;
  }

  const anchors = [timeCueLabel, timeGreetingLabel, monthVibe, displayName, ...TITLE_ANCHOR_KEYWORDS]
    .map((value) => normalizeInlineText(value, 20))
    .filter(Boolean);

  return !anchors.some((anchor) => normalizedTitle.includes(anchor));
}

const homeWelcomeRules = {
  styleConfig,
  offStyleTitlePatterns:
    Array.isArray(styleConfig.offStyleTitlePatterns) && styleConfig.offStyleTitlePatterns.length > 0
      ? styleConfig.offStyleTitlePatterns
      : DEFAULT_OFF_STYLE_TITLE_PATTERNS,
  timeMentionAliasMap: TIME_MENTION_ALIAS_MAP,
  titleAnchorKeywords: TITLE_ANCHOR_KEYWORDS,
  getTimeMentionCandidates,
  normalizeComparableText,
  isTextTooSimilar,
  isTitleOffStyle
};

module.exports = homeWelcomeRules;
module.exports.default = homeWelcomeRules;
