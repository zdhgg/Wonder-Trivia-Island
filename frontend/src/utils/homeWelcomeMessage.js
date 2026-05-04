import homeWelcomeRulesModule from "../../../shared/homeWelcomeRules.browser.mjs";

export const HOME_WELCOME_CACHE_KEY = "wonder-trivia-island.home-welcome.cache";
export const HOME_WELCOME_VISIT_DATE_KEY = "wonder-trivia-island.home-welcome.visit-date";
export const HOME_WELCOME_AUTO_SPEECH_DATE_KEY = "wonder-trivia-island.home-welcome.auto-speech-date";
export const HOME_WELCOME_CACHE_VERSION = 4;
const HOME_WELCOME_SHARED_RULES =
  homeWelcomeRulesModule && typeof homeWelcomeRulesModule === "object" ? homeWelcomeRulesModule : {};
const HOME_WELCOME_STYLE_CONFIG =
  HOME_WELCOME_SHARED_RULES.styleConfig && typeof HOME_WELCOME_SHARED_RULES.styleConfig === "object"
    ? HOME_WELCOME_SHARED_RULES.styleConfig
    : {};
export const HOME_WELCOME_MAX_LINE_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxBubbleLength || 28);
export const HOME_WELCOME_MAX_SPEECH_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxSpeechLength || 80);
export const HOME_WELCOME_MAX_TITLE_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxTitleLength || 28);
const HOME_WELCOME_OFF_STYLE_TITLE_PATTERNS = Object.freeze(
  Array.isArray(HOME_WELCOME_SHARED_RULES.offStyleTitlePatterns) && HOME_WELCOME_SHARED_RULES.offStyleTitlePatterns.length > 0
    ? HOME_WELCOME_SHARED_RULES.offStyleTitlePatterns
    : [
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
    ]
);

const HOME_WELCOME_FALLBACKS = Object.freeze({
  profileSaved: Object.freeze([
    (context, date) => {
      const gradeSemesterLabel = formatGradeSemesterLabel(context);
      return gradeSemesterLabel ? `${gradeSemesterLabel}已经放到首页啦。` : "新的学习档案已经放到首页啦。";
    },
    () => "档案已经就位，今天轻轻来就好。",
    () => "首页已经按你的档案准备好了。"
  ]),
  firstVisitToday: Object.freeze([
    (context, date) => buildFirstVisitFallbackLine(context, date),
    (context, date) => buildFirstVisitFallbackSceneLine(context, date),
    (context, date) => buildFirstVisitCompanionLine(context, date)
  ]),
  default: Object.freeze([
    (context, date) => buildDefaultFallbackLine(context, date),
    (context, date) => buildDefaultFallbackSceneLine(context, date),
    (context, date) => {
      const { schoolYearPhase } = resolveTemporalLabels(context, date);
      if (schoolYearPhase === "期末临近") return "快到期末了，慢慢来，不用慌。";
      if (schoolYearPhase === "寒假里") return "寒假里也来啦，真高兴。";
      if (schoolYearPhase === "暑假里") return "暑假里也来啦，小岛一直在这儿。";
      if (schoolYearPhase === "新学期开始") return "新学期开始了，小岛也跟着亮起来了。";
      return "猫头鹰一直在等你呢。";
    },
    (context, date) => buildDefaultFallbackCompanionLine(context, date),
    (context, date) => buildDefaultFallbackReturnLine(context, date),
    (context, date) => buildDefaultFallbackEaseLine(context, date)
  ])
});

const HOME_WELCOME_FALLBACK_SPEECHES = Object.freeze({
  profileSaved: Object.freeze([
    (context, date) => {
      const gradeSemesterLabel = formatGradeSemesterLabel(context);
      return gradeSemesterLabel
        ? `${gradeSemesterLabel}已经放到首页了，今天轻轻来就好，我会在这里陪你。`
        : "新的学习档案已经放到首页了，今天轻轻来就好，我会在这里陪你。";
    },
    () => "档案已经准备好了，今天想从哪儿开始都可以，不着急。",
    () => "首页已经按你的档案备好了，慢慢来，我一直在这儿。"
  ]),
  firstVisitToday: Object.freeze([
    (context, date) => buildFirstVisitFallbackSpeech(context, date),
    (context, date) => buildFirstVisitFallbackSceneSpeech(context, date),
    (context, date) => buildFirstVisitFallbackEaseSpeech(context, date)
  ]),
  default: Object.freeze([
    (context, date) => buildDefaultFallbackSpeech(context, date),
    (context, date) => buildDefaultFallbackSceneSpeech(context, date),
    (context, date) => {
      const { schoolYearPhase } = resolveTemporalLabels(context, date);
      if (schoolYearPhase === "期末临近") return "快期末了，不用慌，按自己的节奏慢慢来，我一直在这儿。";
      if (schoolYearPhase === "寒假里") return "寒假里也来啦，真高兴，小岛一直都在。";
      if (schoolYearPhase === "暑假里") return "暑假里也来看看啦，小岛一直在这儿等你。";
      if (schoolYearPhase === "新学期开始") return "新学期开始了，小岛也跟着亮起来了，慢慢来就好。";
      return "今天想做什么都可以，不着急，先在这儿待一会儿就好。";
    },
    (context, date) => buildDefaultFallbackCompanionSpeech(context, date)
  ])
});

function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function toSeedNumber(seed = "") {
  let hash = 0;

  for (const character of String(seed || "")) {
    hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function pickStableVariant(candidates = [], seed = "") {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "";
  }

  return candidates[toSeedNumber(seed) % candidates.length] || candidates[0] || "";
}

function formatGradeSemesterLabel(context = {}) {
  const grade = normalizeText(context.grade, 20);
  const semester = normalizeText(context.semester, 20);
  return `${grade}${semester}`;
}

function formatDisplayName(value = "") {
  return normalizeText(value, 20);
}

function getHomeWelcomeVariantToken(context = {}) {
  const variantIndex = Number.parseInt(String(context?.variantIndex ?? "0"), 10);

  if (!Number.isFinite(variantIndex) || variantIndex <= 0) {
    return "0";
  }

  return String(variantIndex);
}

const CHINESE_MONTH_LABELS = Object.freeze(["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]);

function resolveHomeWelcomeReferenceDate(context = {}, date = new Date()) {
  const timestamp = Number(context?.currentTimestamp || 0);

  if (Number.isFinite(timestamp) && timestamp > 0) {
    const resolvedDate = new Date(timestamp);

    if (!Number.isNaN(resolvedDate.getTime())) {
      return resolvedDate;
    }
  }

  const fallbackDate = date instanceof Date ? date : new Date(date);
  return Number.isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate;
}

function resolveTimeBandFromDate(date = new Date()) {
  return resolveTimeCopyFromDate(date).timeBand;
}

function resolveTimeCopyFromDate(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) {
    return {
      timeBand: "morning",
      timeContextKey: "morning",
      timeCueLabel: "早晨",
      timeGreetingLabel: "早上好"
    };
  }

  if (hour >= 11 && hour < 14) {
    return {
      timeBand: "noon",
      timeContextKey: "noon",
      timeCueLabel: "中午",
      timeGreetingLabel: "中午好"
    };
  }

  if (hour >= 14 && hour < 18) {
    return {
      timeBand: "afternoon",
      timeContextKey: "afternoon",
      timeCueLabel: "下午",
      timeGreetingLabel: "下午好"
    };
  }

  if (hour >= 18 && hour < 20) {
    return {
      timeBand: "evening",
      timeContextKey: "dusk",
      timeCueLabel: "傍晚",
      timeGreetingLabel: "傍晚了"
    };
  }

  if (hour >= 20 && hour < 23) {
    return {
      timeBand: "evening",
      timeContextKey: "evening",
      timeCueLabel: "晚上",
      timeGreetingLabel: "晚上好"
    };
  }

  return {
    timeBand: "night",
    timeContextKey: "late-night",
    timeCueLabel: "深夜",
    timeGreetingLabel: "夜深了"
  };
}

function resolveSeasonLabelFromMonth(monthNumber = 1) {
  if ([3, 4].includes(monthNumber)) {
    return "春天";
  }

  if ([5, 6].includes(monthNumber)) {
    return "初夏";
  }

  if ([7, 8].includes(monthNumber)) {
    return "盛夏";
  }

  if ([9, 10].includes(monthNumber)) {
    return "秋天";
  }

  if ([11, 12].includes(monthNumber)) {
    return "初冬";
  }

  return "新年里";
}

function resolveMonthVibe(monthNumber = 1) {
  const vibes = Object.freeze({
    1: "新年伊始",
    2: "寒假将尽",
    3: "春意初萌",
    4: "春暖花开",
    5: "初夏微风",
    6: "盛夏将至",
    7: "盛夏时光",
    8: "夏末微凉",
    9: "秋日新学期",
    10: "金秋十月",
    11: "深秋时节",
    12: "冬日暖阳"
  });

  return vibes[monthNumber] || "";
}

function resolveSchoolYearPhase(monthNumber = 1) {
  if (monthNumber === 1) return "期末临近";
  if (monthNumber === 2) return "寒假里";
  if (monthNumber === 3) return "开学不久";
  if (monthNumber === 4) return "学期中段";
  if (monthNumber === 5) return "学期过半";
  if (monthNumber === 6) return "期末临近";
  if (monthNumber >= 7 && monthNumber <= 8) return "暑假里";
  if (monthNumber === 9) return "新学期开始";
  if (monthNumber === 10) return "学期中段";
  if (monthNumber === 11) return "学期过半";
  if (monthNumber === 12) return "期末临近";
  return "";
}

export function buildHomeWelcomeTemporalContext(date = new Date()) {
  const referenceDate = date instanceof Date ? date : new Date(date);
  const monthNumber = referenceDate.getMonth() + 1;
  const {
    timeBand,
    timeContextKey,
    timeCueLabel,
    timeGreetingLabel
  } = resolveTimeCopyFromDate(referenceDate);

  return {
    currentTimestamp: referenceDate.getTime(),
    hour: referenceDate.getHours(),
    monthNumber,
    monthLabel: CHINESE_MONTH_LABELS[monthNumber - 1] || `${monthNumber}月`,
    seasonLabel: resolveSeasonLabelFromMonth(monthNumber),
    monthVibe: resolveMonthVibe(monthNumber),
    schoolYearPhase: resolveSchoolYearPhase(monthNumber),
    timeBand,
    timeContextKey,
    timeCueLabel,
    timeGreetingLabel
  };
}

function resolveTemporalLabels(context = {}, date = new Date()) {
  const referenceDate = resolveHomeWelcomeReferenceDate(context, date);
  const temporalContext = buildHomeWelcomeTemporalContext(referenceDate);
  const timeBand = normalizeText(context.timeBand, 20) || temporalContext.timeBand;
  const timeContextKey = normalizeText(context.timeContextKey, 20) || temporalContext.timeContextKey;
  const timeCueLabel = normalizeText(context.timeCueLabel, 20) || temporalContext.timeCueLabel;
  const timeGreetingLabel = normalizeText(context.timeGreetingLabel, 20) || temporalContext.timeGreetingLabel;
  const monthLabel = normalizeText(context.monthLabel, 20) || temporalContext.monthLabel;
  const seasonLabel = normalizeText(context.seasonLabel, 20) || temporalContext.seasonLabel;
  const monthVibe = normalizeText(context.monthVibe, 20) || temporalContext.monthVibe;
  const schoolYearPhase = normalizeText(context.schoolYearPhase, 20) || temporalContext.schoolYearPhase;

  return {
    referenceDate,
    timeBand,
    timeContextKey,
    timeCueLabel,
    timeGreetingLabel,
    monthLabel,
    seasonLabel,
    monthVibe,
    schoolYearPhase
  };
}

function resolveTimeMentionCandidates(context = {}, date = new Date()) {
  const { timeContextKey, timeCueLabel, timeGreetingLabel } = resolveTemporalLabels(context, date);
  if (typeof HOME_WELCOME_SHARED_RULES.getTimeMentionCandidates === "function") {
    return HOME_WELCOME_SHARED_RULES.getTimeMentionCandidates({
      timeContextKey,
      timeCueLabel,
      timeGreetingLabel
    });
  }

  return Array.from(new Set([timeCueLabel, timeGreetingLabel].filter(Boolean)));
}

function ensureHomeWelcomeTimeMention(
  value,
  context = {},
  {
    date = new Date(),
    maxLength = HOME_WELCOME_MAX_LINE_LENGTH,
    forSpeech = false
  } = {}
) {
  const normalized = normalizeText(value, maxLength * 3);

  if (!normalized) {
    return "";
  }

  const mentions = resolveTimeMentionCandidates(context, date);

  if (mentions.some((mention) => normalized.includes(mention))) {
    return forSpeech
      ? normalizeHomeWelcomeSpeechText(normalized, maxLength)
      : normalizeHomeWelcomeLine(normalized, maxLength);
  }

  const { timeGreetingLabel, timeCueLabel } = resolveTemporalLabels(context, date);
  const prefix = timeGreetingLabel || timeCueLabel || "欢迎回来";
  const prefixed = `${prefix}，${normalized}`;

  return forSpeech
    ? normalizeHomeWelcomeSpeechText(prefixed, maxLength)
    : normalizeHomeWelcomeLine(prefixed, maxLength);
}

function resolveHomeWelcomeDisplayName(context = {}) {
  return formatDisplayName(context.displayName);
}

function withMonthVibe(vibe, text) {
  if (!vibe || !text) {
    return text || vibe || "";
  }

  return `${vibe}里，${text}`;
}

function composeHomeWelcomeSentence(...segments) {
  const normalizedSegments = segments.map((segment) => normalizeText(segment, 80)).filter(Boolean);

  if (normalizedSegments.length === 0) {
    return "";
  }

  if (normalizedSegments.length === 1) {
    return `${normalizedSegments[0]}。`;
  }

  if (normalizedSegments.length === 2) {
    return `${normalizedSegments[0]}，${normalizedSegments[1]}。`;
  }

  return `${normalizedSegments[0]}，${normalizedSegments.slice(1).join("，")}。`;
}

function buildFirstVisitFallbackLine(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);
  const displayName = resolveHomeWelcomeDisplayName(context);
  const companionCue = displayName ? `${displayName}，猫头鹰在等你` : "猫头鹰在等你";

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, `早上好，${companionCue}`);
    case "noon":
      return withMonthVibe(monthVibe, `中午好，${companionCue}`);
    case "afternoon":
      return withMonthVibe(monthVibe, `下午好，${companionCue}`);
    case "dusk":
      return withMonthVibe(monthVibe, `傍晚好，小岛的灯还亮着呢`);
    case "evening":
      return withMonthVibe(monthVibe, `晚上好，小岛的灯还亮着呢`);
    default:
      return withMonthVibe(monthVibe, "夜深了，小岛还亮着一盏灯");
  }
}

function buildFirstVisitFallbackSceneLine(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);
  const displayName = resolveHomeWelcomeDisplayName(context);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, displayName ? `早晨见到${displayName}真好` : "早晨见到你真好");
    case "noon":
      return withMonthVibe(monthVibe, displayName ? `中午见到${displayName}真好` : "中午见到你真好");
    case "afternoon":
      return withMonthVibe(monthVibe, displayName ? `下午见到${displayName}真好` : "下午见到你真好");
    case "dusk":
      return withMonthVibe(monthVibe, displayName ? `傍晚见到${displayName}真好` : "傍晚见到你真好");
    case "evening":
      return withMonthVibe(monthVibe, displayName ? `晚上见到${displayName}真好` : "晚上见到你真好");
    default:
      return withMonthVibe(monthVibe, "深夜也别着急，慢慢来就好");
  }
}

function buildFirstVisitCompanionLine(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);
  const displayName = resolveHomeWelcomeDisplayName(context);
  const companionCue = displayName ? `${displayName}，猫头鹰在这儿陪你` : "猫头鹰在这儿陪你";

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, companionCue);
    case "noon":
      return withMonthVibe(monthVibe, companionCue);
    case "afternoon":
      return withMonthVibe(monthVibe, companionCue);
    case "dusk":
      return withMonthVibe(monthVibe, companionCue);
    case "evening":
      return withMonthVibe(monthVibe, companionCue);
    default:
      return withMonthVibe(monthVibe, "小岛还亮着一盏灯，慢慢来");
  }
}

function buildDefaultFallbackLine(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);
  const displayName = resolveHomeWelcomeDisplayName(context);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, displayName ? `早上见到${displayName}真好` : "早上见到你真好");
    case "noon":
      return withMonthVibe(monthVibe, displayName ? `中午也来啦，${displayName}` : "中午也来啦");
    case "afternoon":
      return withMonthVibe(monthVibe, displayName ? `下午也慢慢来，${displayName}` : "下午也慢慢来");
    case "dusk":
      return withMonthVibe(monthVibe, displayName ? `傍晚回来看看也刚刚好，${displayName}` : "傍晚回来看看也刚刚好");
    case "evening":
      return withMonthVibe(monthVibe, displayName ? `晚上回来看看也刚刚好，${displayName}` : "晚上回来看看也刚刚好");
    default:
      return withMonthVibe(monthVibe, "夜深了，慢慢来就好");
  }
}

function buildDefaultFallbackSceneLine(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿陪你");
    case "noon":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿陪你");
    case "afternoon":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿陪你");
    case "dusk":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿陪你");
    case "evening":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿陪你");
    default:
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿陪你");
  }
}

function buildDefaultFallbackCompanionLine(context = {}, date = new Date()) {
  const { timeContextKey } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return "早上想做什么都可以，不着急。";
    case "noon":
      return "中午想做什么都可以，不着急。";
    case "afternoon":
      return "下午想做什么都可以，不着急。";
    case "dusk":
      return "傍晚也慢慢来，不着急。";
    case "evening":
      return "晚上想做什么都可以，不着急。";
    default:
      return "夜深了，先在这儿待一会儿就好。";
  }
}

function buildDefaultFallbackReturnLine(context = {}, date = new Date()) {
  const { timeContextKey } = resolveTemporalLabels(context, date);

  if (timeContextKey === "dusk") {
    return "傍晚回来看看，也刚刚好。";
  }

  if (timeContextKey === "evening") {
    return "晚上回来看看，也刚刚好。";
  }

  if (timeContextKey === "late-night") {
    return "夜深了，回来看看也刚刚好。";
  }

  return "今天的阳光正好，进来坐坐吧。";
}

function buildDefaultFallbackEaseLine(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, "慢慢来就好");
    case "noon":
      return withMonthVibe(monthVibe, "慢慢来就好");
    case "afternoon":
      return withMonthVibe(monthVibe, "慢慢来就好");
    case "dusk":
      return withMonthVibe(monthVibe, "慢慢来就好");
    case "evening":
      return withMonthVibe(monthVibe, "慢慢来就好");
    default:
      return withMonthVibe(monthVibe, "不着急，慢慢来就好");
  }
}

function buildFirstVisitFallbackSpeech(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);
  const displayName = resolveHomeWelcomeDisplayName(context);
  const greet = displayName ? `${displayName}，` : "";

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, `${greet}早上的小岛很安静，猫头鹰在这儿等你`);
    case "noon":
      return withMonthVibe(monthVibe, `${greet}中午了，来小岛坐一会儿吧，猫头鹰一直在这儿`);
    case "afternoon":
      return withMonthVibe(monthVibe, `${greet}下午的风正轻，进来坐坐吧，猫头鹰一直在这儿`);
    case "dusk":
      return withMonthVibe(monthVibe, `${greet}傍晚的小岛还亮着，慢慢待一会儿就好`);
    case "evening":
      return withMonthVibe(monthVibe, `${greet}晚上好，小岛的灯还亮着，慢慢待一会儿就好`);
    default:
      return withMonthVibe(monthVibe, `${greet}夜深了，小岛还亮着一盏灯，不着急`);
  }
}

function buildFirstVisitFallbackSceneSpeech(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, "早晨见到你真好，今天也慢慢来");
    case "noon":
      return withMonthVibe(monthVibe, "中午见到你真好，今天也慢慢来");
    case "afternoon":
      return withMonthVibe(monthVibe, "下午见到你真好，今天也慢慢来");
    case "dusk":
      return withMonthVibe(monthVibe, "傍晚见到你真好，今天也慢慢来");
    case "evening":
      return withMonthVibe(monthVibe, "晚上见到你真好，今天也慢慢来");
    default:
      return withMonthVibe(monthVibe, "深夜也不着急，慢慢来就好");
  }
}

function buildFirstVisitFallbackEaseSpeech(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, "今天早上也慢慢来就好");
    case "noon":
      return withMonthVibe(monthVibe, "今天中午也慢慢来就好");
    case "afternoon":
      return withMonthVibe(monthVibe, "今天下午也慢慢来就好");
    case "dusk":
      return withMonthVibe(monthVibe, "今天傍晚也慢慢来就好");
    case "evening":
      return withMonthVibe(monthVibe, "今天晚上也慢慢来就好");
    default:
      return withMonthVibe(monthVibe, "深夜也别着急，慢慢来就好");
  }
}

function buildDefaultFallbackSpeech(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, "早上见到你真好，猫头鹰会一直在这里陪着你");
    case "noon":
      return withMonthVibe(monthVibe, "中午也来啦，猫头鹰会一直在这里陪着你");
    case "afternoon":
      return withMonthVibe(monthVibe, "下午也慢慢来，猫头鹰会一直在这里陪着你");
    case "dusk":
      return withMonthVibe(monthVibe, "傍晚的小岛很安静，慢慢来，我一直在这儿");
    case "evening":
      return withMonthVibe(monthVibe, "晚上也慢慢来，猫头鹰会一直在这里陪着你");
    default:
      return withMonthVibe(monthVibe, "深夜也别着急，我一直在这儿");
  }
}

function buildDefaultFallbackSceneSpeech(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿，慢慢来");
    case "noon":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿，慢慢来");
    case "afternoon":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿，慢慢来");
    case "dusk":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿，慢慢来");
    case "evening":
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿，慢慢来");
    default:
      return withMonthVibe(monthVibe, "小岛还是安安静静地在这儿，慢慢来");
  }
}

function buildDefaultFallbackCompanionSpeech(context = {}, date = new Date()) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  switch (timeContextKey) {
    case "morning":
      return withMonthVibe(monthVibe, "早上你来了就好");
    case "noon":
      return withMonthVibe(monthVibe, "中午你来了就好");
    case "afternoon":
      return withMonthVibe(monthVibe, "下午你来了就好");
    case "dusk":
      return withMonthVibe(monthVibe, "傍晚你来了就好");
    case "evening":
      return withMonthVibe(monthVibe, "晚上你来了就好");
    default:
      return withMonthVibe(monthVibe, "深夜你来了就好");
  }
}

function resolveTimeAwareNamedTitle(timeContextKey = "morning", normalizedName = "") {
  switch (timeContextKey) {
    case "morning":
      return `早晨见到你真好，${normalizedName}`;
    case "noon":
      return `中午也来啦，${normalizedName}`;
    case "afternoon":
      return `下午来坐坐吧，${normalizedName}`;
    case "dusk":
      return `傍晚来啦，${normalizedName}`;
    case "evening":
      return `晚上来啦，${normalizedName}`;
    default:
      return `夜深了，${normalizedName}`;
  }
}

function resolveTimeAwareNamedInvitation(timeContextKey = "morning", normalizedName = "") {
  switch (timeContextKey) {
    case "morning":
      return `早晨来坐坐吧，${normalizedName}`;
    case "noon":
      return `中午来坐坐吧，${normalizedName}`;
    case "afternoon":
      return `下午来坐坐吧，${normalizedName}`;
    case "dusk":
      return `傍晚来坐坐吧，${normalizedName}`;
    case "evening":
      return `晚上来坐坐吧，${normalizedName}`;
    default:
      return `夜深了，${normalizedName}`;
  }
}

function resolveTimeAwareNamedWaitTitle(timeContextKey = "morning", normalizedName = "") {
  switch (timeContextKey) {
    case "morning":
      return `早晨的小岛在等你，${normalizedName}`;
    case "noon":
      return `中午的小岛在等你，${normalizedName}`;
    case "afternoon":
      return `下午的小岛在等你，${normalizedName}`;
    case "dusk":
      return `小岛等你，${normalizedName}`;
    case "evening":
      return `小岛等你，${normalizedName}`;
    default:
      return `小岛的灯还亮着呢，${normalizedName}`;
  }
}

function resolveTimeAwareVibeNamedTitle(timeContextKey = "morning", monthVibe = "", normalizedName = "") {
  if (!monthVibe) {
    return resolveTimeAwareNamedTitle(timeContextKey, normalizedName);
  }

  switch (timeContextKey) {
    case "morning":
      return `${monthVibe}，早晨见到你真好，${normalizedName}`;
    case "noon":
      return `${monthVibe}，中午来啦，${normalizedName}`;
    case "afternoon":
      return `${monthVibe}，下午来坐坐吧，${normalizedName}`;
    case "dusk":
      return `${monthVibe}，傍晚来啦，${normalizedName}`;
    case "evening":
      return `${monthVibe}，晚上来啦，${normalizedName}`;
    default:
      return `夜深了，${normalizedName}`;
  }
}

function resolveTimeAwareIslandTitle(timeContextKey = "morning") {
  switch (timeContextKey) {
    case "morning":
      return "早晨的小岛在等你";
    case "noon":
      return "中午的小岛在等你";
    case "afternoon":
      return "下午来小岛坐坐吧";
    case "dusk":
      return "傍晚来啦";
    case "evening":
      return "晚上来啦";
    default:
      return "夜深了，小岛还亮着一盏灯";
  }
}

function resolveTimeAwareIslandInvitation(timeContextKey = "morning") {
  switch (timeContextKey) {
    case "morning":
      return "早晨来小岛坐坐吧";
    case "noon":
      return "中午来小岛坐坐吧";
    case "afternoon":
      return "下午来小岛坐坐吧";
    case "dusk":
      return "傍晚来小岛坐坐吧";
    case "evening":
      return "晚上来小岛坐坐吧";
    default:
      return "夜深了，来坐坐吧";
  }
}

function resolveTimeAwareIslandWaitTitle(timeContextKey = "morning") {
  switch (timeContextKey) {
    case "morning":
      return "早晨的小岛陪着你";
    case "noon":
      return "中午的小岛陪着你";
    case "afternoon":
      return "下午的小岛在等你";
    case "dusk":
      return "傍晚的小岛等你";
    case "evening":
      return "晚上的小岛等你";
    default:
      return "夜深了，小岛还亮着一盏灯";
  }
}

function resolveTimeAwareVibeIslandTitle(timeContextKey = "morning", monthVibe = "") {
  if (!monthVibe) {
    return resolveTimeAwareIslandTitle(timeContextKey);
  }

  switch (timeContextKey) {
    case "morning":
      return `${monthVibe}，早晨的小岛在等你`;
    case "noon":
      return `${monthVibe}，中午的小岛在等你`;
    case "afternoon":
      return `${monthVibe}，下午来小岛坐坐吧`;
    case "dusk":
      return `${monthVibe}，傍晚来啦`;
    case "evening":
      return `${monthVibe}，晚上来啦`;
    default:
      return "夜深了，小岛还亮着一盏灯";
  }
}

function buildNamedHomeWelcomeTitleCandidates(
  context = {},
  {
    scene = "default",
    normalizedName = "",
    gradeSemesterLabel = "",
    date = new Date()
  } = {}
) {
  const { timeContextKey, monthVibe } = resolveTemporalLabels(context, date);

  if (scene === "profileSaved") {
    return [
      `${normalizedName}，新的路线已经备好`,
      gradeSemesterLabel ? `${gradeSemesterLabel}已经就位，${normalizedName}` : `${normalizedName}，今天轻轻来就好`,
      `首页已经备好，${normalizedName}`,
      `${normalizedName}，今天慢慢来就行`,
      `${normalizedName}，现在可以安心啦`
    ];
  }

  if (scene === "firstVisitToday") {
    return [
      resolveTimeAwareNamedTitle(timeContextKey, normalizedName),
      resolveTimeAwareNamedInvitation(timeContextKey, normalizedName),
      resolveTimeAwareNamedWaitTitle(timeContextKey, normalizedName),
      resolveTimeAwareVibeNamedTitle(timeContextKey, monthVibe, normalizedName)
    ];
  }

  return [
    resolveTimeAwareNamedTitle(timeContextKey, normalizedName),
    resolveTimeAwareNamedInvitation(timeContextKey, normalizedName),
    resolveTimeAwareNamedWaitTitle(timeContextKey, normalizedName),
    resolveTimeAwareVibeNamedTitle(timeContextKey, monthVibe, normalizedName)
  ];
}

function buildDefaultHomeWelcomeTitleCandidates(
  context = {},
  {
    scene = "default",
    gradeSemesterLabel = "",
    date = new Date()
  } = {}
) {
  const { monthVibe, timeContextKey } = resolveTemporalLabels(context, date);

  if (scene === "profileSaved") {
    return [
      "首页已经按档案同步好",
      "新的路线已经准备好了",
      gradeSemesterLabel ? `${gradeSemesterLabel}已经就位` : "新的学习档案已经就位",
      "今天的小岛已经按新档案备好",
      "欢迎来到奇妙知识岛"
    ];
  }

  if (scene === "firstVisitToday") {
    return [
      resolveTimeAwareIslandTitle(timeContextKey),
      resolveTimeAwareIslandInvitation(timeContextKey),
      resolveTimeAwareIslandWaitTitle(timeContextKey),
      resolveTimeAwareVibeIslandTitle(timeContextKey, monthVibe)
    ];
  }

  return [
    resolveTimeAwareIslandTitle(timeContextKey),
    resolveTimeAwareIslandInvitation(timeContextKey),
    resolveTimeAwareIslandWaitTitle(timeContextKey),
    resolveTimeAwareVibeIslandTitle(timeContextKey, monthVibe)
  ];
}

function resolveFallbackScene(context = {}) {
  if (context.isProfileJustSaved) {
    return "profileSaved";
  }

  if (context.isFirstHomeVisitToday) {
    return "firstVisitToday";
  }

  return "default";
}

function safeReadLocalStorage(key) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeWriteLocalStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures and keep the homepage usable.
  }
}

export function getHomeWelcomeDateKey(date = new Date()) {
  const current = date instanceof Date ? date : new Date(date);
  const year = current.getFullYear();
  const month = `${current.getMonth() + 1}`.padStart(2, "0");
  const day = `${current.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function normalizeHomeWelcomeLine(value, maxLength = HOME_WELCOME_MAX_LINE_LENGTH) {
  const normalized = normalizeText(value, maxLength * 3);

  if (!normalized) {
    return "";
  }

  const firstSentence = normalized.match(/^[^。！？!?]+[。！？!?]?/)?.[0]?.trim() || normalized;
  const candidate = firstSentence.replace(/^[""'“”‘’]+|[""'“”‘’]+$/g, "").trim();

  if (!candidate) {
    return "";
  }

  if (candidate.length <= maxLength) {
    return candidate;
  }

  if (maxLength <= 1) {
    return candidate.slice(0, maxLength);
  }

  return `${candidate.slice(0, maxLength - 1).trim()}…`;
}

export function normalizeHomeWelcomeSpeechText(value, maxLength = HOME_WELCOME_MAX_SPEECH_LENGTH) {
  const normalized = normalizeText(value, maxLength * 3);

  if (!normalized) {
    return "";
  }

  const firstSentence = normalized.match(/^[^。！？!?]+[。！？!?]?/)?.[0]?.trim() || normalized;
  const candidate = firstSentence.replace(/^[""'“”‘’]+|[""'“”‘’]+$/g, "").trim();

  if (!candidate) {
    return "";
  }

  if (candidate.length <= maxLength) {
    return candidate;
  }

  if (maxLength <= 1) {
    return candidate.slice(0, maxLength);
  }

  return `${candidate.slice(0, maxLength - 1).trim()}…`;
}

export function normalizeHomeWelcomeTitle(value, maxLength = HOME_WELCOME_MAX_TITLE_LENGTH) {
  return normalizeHomeWelcomeLine(value, maxLength);
}

export function isHomeWelcomeTextTooSimilar(left, right) {
  if (typeof HOME_WELCOME_SHARED_RULES.isTextTooSimilar === "function") {
    return HOME_WELCOME_SHARED_RULES.isTextTooSimilar(left, right);
  }

  return false;
}

export function isHomeWelcomeTitleOffStyle(title, context = {}) {
  const { timeCueLabel, timeGreetingLabel, monthVibe } = resolveTemporalLabels(context);
  const displayName = normalizeText(context.displayName, 20);

  if (typeof HOME_WELCOME_SHARED_RULES.isTitleOffStyle === "function") {
    return HOME_WELCOME_SHARED_RULES.isTitleOffStyle(
      title,
      {
        timeCueLabel,
        timeGreetingLabel,
        monthVibe,
        displayName
      },
      HOME_WELCOME_OFF_STYLE_TITLE_PATTERNS
    );
  }

  return false;
}

export function buildHomeWelcomeContextHash(context = {}) {
  return [
    normalizeText(context.grade, 20),
    normalizeText(context.semester, 20),
    normalizeText(context.recommendedMode, 20),
    normalizeText(context.challengeStageLabel, 60),
    String(Number(context.reviewDueCount || 0)),
    String(Number(context.reviewingCount || 0)),
    normalizeText(context.timeBand, 20),
    normalizeText(context.timeContextKey, 20),
    normalizeText(context.timeCueLabel, 20),
    normalizeText(context.monthLabel, 20),
    context.isProfileJustSaved ? "profile-saved" : "steady",
    context.isFirstHomeVisitToday ? "first" : "repeat"
  ].join("|");
}

export function buildHomeWelcomeFallbackLine(context = {}, date = new Date()) {
  const scene = resolveFallbackScene(context);
  const options = HOME_WELCOME_FALLBACKS[scene] || HOME_WELCOME_FALLBACKS.default;
  const seed = `${getHomeWelcomeDateKey(date)}|${buildHomeWelcomeContextHash(context)}|${getHomeWelcomeVariantToken(context)}|${scene}`;
  const selectedOption = pickStableVariant(options, seed);
  const rawLine = typeof selectedOption === "function" ? selectedOption(context, date) : selectedOption;

  return ensureHomeWelcomeTimeMention(rawLine, context, {
    date,
    maxLength: HOME_WELCOME_MAX_LINE_LENGTH
  });
}

export function buildHomeWelcomeFallbackSpeechText(context = {}, date = new Date()) {
  const scene = resolveFallbackScene(context);
  const options = HOME_WELCOME_FALLBACK_SPEECHES[scene] || HOME_WELCOME_FALLBACK_SPEECHES.default;
  const seed = `${getHomeWelcomeDateKey(date)}|${buildHomeWelcomeContextHash(context)}|${getHomeWelcomeVariantToken(context)}|speech|${scene}`;
  const selectedOption = pickStableVariant(options, seed);
  const rawLine = typeof selectedOption === "function" ? selectedOption(context, date) : selectedOption;

  return (
    ensureHomeWelcomeTimeMention(rawLine, context, {
      date,
      maxLength: HOME_WELCOME_MAX_SPEECH_LENGTH,
      forSpeech: true
    }) || buildHomeWelcomeFallbackLine(context, date)
  );
}

export function buildHomeWelcomeEyebrow(context = {}, date = new Date()) {
  const { timeGreetingLabel } = resolveTemporalLabels(context, date);
  return normalizeText(timeGreetingLabel, 16) || "欢迎回来";
}

export function buildHomeWelcomeTitle(
  context = {},
  {
    displayName = "",
    useCustomName = false,
    avoidText = "",
    date = new Date()
  } = {}
) {
  const scene = resolveFallbackScene(context);
  const normalizedName = formatDisplayName(displayName);
  const hasCustomName = Boolean(useCustomName && normalizedName);
  const gradeSemesterLabel = formatGradeSemesterLabel(context);
  const candidates = hasCustomName
    ? buildNamedHomeWelcomeTitleCandidates(context, {
      scene,
      normalizedName,
      gradeSemesterLabel,
      date
    })
    : buildDefaultHomeWelcomeTitleCandidates(context, {
      scene,
      gradeSemesterLabel,
      date
    });
  const seed = `${getHomeWelcomeDateKey(date)}|${buildHomeWelcomeContextHash(context)}|${getHomeWelcomeVariantToken(context)}|title|${normalizedName}|${scene}`;
  const availableCandidates = candidates.filter(Boolean);
  const distinctCandidates = availableCandidates.filter((candidate) => !isHomeWelcomeTextTooSimilar(candidate, avoidText));
  const picked = pickStableVariant(distinctCandidates.length > 0 ? distinctCandidates : availableCandidates, seed);

  return normalizeHomeWelcomeTitle(picked) || (hasCustomName ? `欢迎回来，${normalizedName}` : "欢迎来到奇妙知识岛");
}

export function buildHomeWelcomeVoiceButtonLabel(
  context = {},
  {
    status = "idle",
    date = new Date()
  } = {}
) {
  if (status === "loading") {
    return "猫头鹰在准备";
  }

  if (status === "playing") {
    return "先停一下";
  }

  if (status === "error") {
    return "再听一遍";
  }

  const scene = resolveFallbackScene(context);
  const labelMap = Object.freeze({
    profileSaved: ["听猫头鹰说", "听小岛小提醒", "听首页小提醒"],
    firstVisitToday: ["听猫头鹰欢迎你", "听小岛问好", "听猫头鹰说"],
    default: ["听猫头鹰说", "听小岛小提醒", "听猫头鹰轻轻说"]
  });
  const candidates = labelMap[scene] || labelMap.default;
  const seed = `${getHomeWelcomeDateKey(date)}|${buildHomeWelcomeContextHash(context)}|${getHomeWelcomeVariantToken(context)}|voice-button|${scene}`;

  return normalizeText(pickStableVariant(candidates, seed), 18) || "听猫头鹰说";
}

export function readHomeWelcomeVisitDate() {
  return normalizeText(safeReadLocalStorage(HOME_WELCOME_VISIT_DATE_KEY), 20);
}

export function markHomeWelcomeVisited(date = new Date()) {
  const dateKey = getHomeWelcomeDateKey(date);
  safeWriteLocalStorage(HOME_WELCOME_VISIT_DATE_KEY, dateKey);
  return dateKey;
}

export function readHomeWelcomeAutoSpeechDate() {
  return normalizeText(safeReadLocalStorage(HOME_WELCOME_AUTO_SPEECH_DATE_KEY), 20);
}

export function markHomeWelcomeAutoSpeechPlayed(date = new Date()) {
  const dateKey = getHomeWelcomeDateKey(date);
  safeWriteLocalStorage(HOME_WELCOME_AUTO_SPEECH_DATE_KEY, dateKey);
  return dateKey;
}

export function readHomeWelcomeCache(context = {}, date = new Date()) {
  const rawCache = safeReadLocalStorage(HOME_WELCOME_CACHE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache = JSON.parse(rawCache);
    const normalizedTitle = normalizeHomeWelcomeTitle(parsedCache?.title);
    const normalizedText = normalizeHomeWelcomeLine(parsedCache?.text);
    const normalizedSpeechText = normalizeHomeWelcomeSpeechText(parsedCache?.speechText || parsedCache?.text);

    if (
      parsedCache?.version !== HOME_WELCOME_CACHE_VERSION ||
      normalizeText(parsedCache?.date, 20) !== getHomeWelcomeDateKey(date) ||
      normalizeText(parsedCache?.contextHash, 200) !== buildHomeWelcomeContextHash(context) ||
      !normalizedText ||
      !normalizedSpeechText
    ) {
      return null;
    }

    return {
      ...parsedCache,
      title: normalizedTitle,
      text: normalizedText,
      speechText: normalizedSpeechText
    };
  } catch {
    return null;
  }
}

export function writeHomeWelcomeCache(
  context = {},
  text = "",
  {
    title = "",
    speechText = "",
    source = "ai",
    date = new Date()
  } = {}
) {
  const normalizedTitle = normalizeHomeWelcomeTitle(title);
  const normalizedText = normalizeHomeWelcomeLine(text);
  const normalizedSpeechText = normalizeHomeWelcomeSpeechText(speechText || normalizedText);

  if (!normalizedText || !normalizedSpeechText) {
    return null;
  }

  const snapshot = {
    version: HOME_WELCOME_CACHE_VERSION,
    date: getHomeWelcomeDateKey(date),
    contextHash: buildHomeWelcomeContextHash(context),
    title: normalizedTitle,
    text: normalizedText,
    speechText: normalizedSpeechText,
    source: normalizeText(source, 20) || "ai",
    createdAt: new Date().toISOString()
  };

  safeWriteLocalStorage(HOME_WELCOME_CACHE_KEY, JSON.stringify(snapshot));
  return snapshot;
}
