export const HOME_WELCOME_CACHE_KEY = "wonder-trivia-island.home-welcome.cache";
export const HOME_WELCOME_VISIT_DATE_KEY = "wonder-trivia-island.home-welcome.visit-date";
export const HOME_WELCOME_AUTO_SPEECH_DATE_KEY = "wonder-trivia-island.home-welcome.auto-speech-date";
export const HOME_WELCOME_CACHE_VERSION = 1;
export const HOME_WELCOME_MAX_LINE_LENGTH = 28;
export const HOME_WELCOME_MAX_SPEECH_LENGTH = 80;

const HOME_WELCOME_FALLBACKS = Object.freeze({
  profileSaved: Object.freeze([
    (context) => {
      const gradeSemesterLabel = formatGradeSemesterLabel(context);
      return gradeSemesterLabel ? `${gradeSemesterLabel}已经放到首页啦。` : "新的学习档案已经放到首页啦。";
    },
    () => "新的学习档案已经就位。",
    (context) => {
      const gradeSemesterLabel = formatGradeSemesterLabel(context);
      return gradeSemesterLabel ? `今天会按${gradeSemesterLabel}陪你继续。` : "今天会按这份档案陪你继续。";
    }
  ]),
  reviewThenChallenge: Object.freeze([
    (context) => {
      const stageLabel = extractChallengeFocusLabel(context.challengeStageLabel);
      return stageLabel ? `${stageLabel}这站还亮着，错题本也在等你。` : "错题本和今天的主线都还亮着。";
    },
    (context) => {
      const stageLabel = extractChallengeFocusLabel(context.challengeStageLabel);
      return stageLabel ? `回头看看错题本，${stageLabel}这条线还接着上次。` : "回头看看错题本，今天的路线还接着上次。";
    },
    () => "今天的路线已经排好了，慢慢来就行。"
  ]),
  reviewDue: Object.freeze([
    (context) => {
      const dueCount = Math.max(1, Number(context.reviewDueCount || 0));
      return `错题本里那${dueCount}题，还在等你回头看看。`;
    },
    () => "今天的温习已经排好了，慢慢来就行。",
    () => "这几题放在眼前，心里会更稳。"
  ]),
  reviewWarm: Object.freeze([
    () => "回温中的几题还亮着，今天顺手看看就好。",
    () => "这几题还在回温，慢慢翻一翻会更稳。",
    () => "回温中的小提醒，还在这里等你。"
  ]),
  challengeContinue: Object.freeze([
    (context) => {
      const stageLabel = extractChallengeFocusLabel(context.challengeStageLabel);
      return stageLabel ? `${stageLabel}这站还亮着。` : "这条闯关路线还接着上次。";
    },
    () => "上次的路线还接着，今天照着往前走就行。",
    () => "这条主线没有断开，还能接着走。"
  ]),
  firstVisitToday: Object.freeze([
    (context) => {
      const { monthLabel } = resolveTemporalLabels(context);
      return `${monthLabel}的小岛已经准备好啦。`;
    },
    (context) => {
      const { timeBand } = resolveTemporalLabels(context);
      return timeBand === "evening" || timeBand === "night" ? "晚上回来看一看也刚刚好。" : "今天的路线已经亮起来了。";
    },
    () => "挑一站开始，猫头鹰会陪着你。"
  ]),
  default: Object.freeze([
    () => "今天想从哪一站开始？",
    (context) => {
      const { seasonLabel } = resolveTemporalLabels(context);
      return `${seasonLabel}的小岛已经准备好，慢慢来就行。`;
    },
    () => "挑一个入口出发，猫头鹰在这儿陪你。"
  ])
});

const HOME_WELCOME_FALLBACK_SPEECHES = Object.freeze({
  profileSaved: Object.freeze([
    (context) => {
      const gradeSemesterLabel = formatGradeSemesterLabel(context);
      return gradeSemesterLabel
        ? `${gradeSemesterLabel}已经放到首页了，今天就按这份档案慢慢往前学。`
        : "新的学习档案已经放到首页了，今天就按这份档案慢慢往前学。";
    },
    () => "新的学习档案已经准备好了，今天就顺着这份档案慢慢往前学。",
    (context) => {
      const stageLabel = extractChallengeFocusLabel(context.challengeStageLabel);
      return stageLabel ? `档案已经准备好了，${stageLabel}这条线也已经替你接好了。` : "档案已经准备好了，今天想从哪一站开始都行。";
    }
  ]),
  reviewThenChallenge: Object.freeze([
    (context) => {
      const stageLabel = extractChallengeFocusLabel(context.challengeStageLabel);
      return stageLabel ? `${stageLabel}这站还亮着，错题本里的几题也在等你回头看看。` : "错题本和今天的主线都已经备好了，慢慢来就行。";
    },
    (context) => {
      const stageLabel = extractChallengeFocusLabel(context.challengeStageLabel);
      return stageLabel ? `回头看看错题本，${stageLabel}这条线还接着上次。` : "回头看看错题本，今天的路线也还接着上次。";
    },
    () => "今天的路线已经排好了，你按自己的节奏往前走就好。"
  ]),
  reviewDue: Object.freeze([
    () => "错题本里那几题还在等你，今天慢慢翻一翻就好。",
    () => "今天的温习已经排好了，先回头看看，后面会更稳。",
    (context) => {
      const dueCount = Math.max(1, Number(context.reviewDueCount || 0));
      return `今天有${dueCount}题到期温习，它们还在错题本里等你。`;
    }
  ]),
  reviewWarm: Object.freeze([
    () => "回温中的几题还亮着，今天顺手看看，节奏会更稳。",
    () => "这几题还在回温里，慢慢翻一翻就好，不用着急。",
    () => "回温中的小提醒还在这里，今天看一看会更安心。"
  ]),
  challengeContinue: Object.freeze([
    (context) => {
      const stageLabel = extractChallengeFocusLabel(context.challengeStageLabel);
      return stageLabel ? `${stageLabel}这站还亮着，今天接着往前走就行。` : "这条闯关路线还接着上次，今天慢慢往前走就好。";
    },
    () => "上次的路线还接着，今天照着往前走就行，不用重新开始。",
    () => "这条主线没有断开，还在前面等你慢慢接上。"
  ]),
  firstVisitToday: Object.freeze([
    () => "今天的小岛已经准备好了，想从哪一站开始都行。",
    () => "今天的路线已经亮起来了，猫头鹰会在这里陪着你。",
    () => "欢迎回来，今天我们也慢慢往前走。"
  ]),
  default: Object.freeze([
    () => "今天想先从哪一站开始，我会在这里陪着你。",
    () => "小岛已经准备好了，今天慢慢往前走一点就好。",
    () => "挑一个入口开始吧，猫头鹰会一直在这里等你。"
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

function extractChallengeFocusLabel(value = "") {
  const segments = normalizeText(value, 80)
    .split("·")
    .map((segment) => normalizeText(segment, 40))
    .filter(Boolean);

  if (segments.length >= 2) {
    return segments[segments.length - 1];
  }

  return segments[0] || "";
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
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) {
    return "morning";
  }

  if (hour >= 11 && hour < 14) {
    return "noon";
  }

  if (hour >= 14 && hour < 18) {
    return "afternoon";
  }

  if (hour >= 18 && hour < 23) {
    return "evening";
  }

  return "night";
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

export function buildHomeWelcomeTemporalContext(date = new Date()) {
  const referenceDate = date instanceof Date ? date : new Date(date);
  const monthNumber = referenceDate.getMonth() + 1;
  const timeBand = resolveTimeBandFromDate(referenceDate);

  return {
    currentTimestamp: referenceDate.getTime(),
    hour: referenceDate.getHours(),
    monthNumber,
    monthLabel: CHINESE_MONTH_LABELS[monthNumber - 1] || `${monthNumber}月`,
    seasonLabel: resolveSeasonLabelFromMonth(monthNumber),
    timeBand
  };
}

function resolveTemporalLabels(context = {}, date = new Date()) {
  const referenceDate = resolveHomeWelcomeReferenceDate(context, date);
  const timeBand = normalizeText(context.timeBand, 20) || resolveTimeBandFromDate(referenceDate);
  const monthLabel = normalizeText(context.monthLabel, 20) || buildHomeWelcomeTemporalContext(referenceDate).monthLabel;
  const seasonLabel = normalizeText(context.seasonLabel, 20) || buildHomeWelcomeTemporalContext(referenceDate).seasonLabel;

  return {
    referenceDate,
    timeBand,
    monthLabel,
    seasonLabel
  };
}

function resolveFallbackScene(context = {}) {
  if (context.isProfileJustSaved) {
    return "profileSaved";
  }

  if (Number(context.reviewDueCount || 0) > 0 && normalizeText(context.challengeStageLabel, 60)) {
    return "reviewThenChallenge";
  }

  if (Number(context.reviewDueCount || 0) > 0) {
    return "reviewDue";
  }

  if (Number(context.reviewingCount || 0) > 0) {
    return "reviewWarm";
  }

  if (context.recommendedMode === "challenge" && normalizeText(context.challengeStageLabel, 60)) {
    return "challengeContinue";
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

export function buildHomeWelcomeContextHash(context = {}) {
  return [
    normalizeText(context.grade, 20),
    normalizeText(context.semester, 20),
    normalizeText(context.recommendedMode, 20),
    normalizeText(context.challengeStageLabel, 60),
    String(Number(context.reviewDueCount || 0)),
    String(Number(context.reviewingCount || 0)),
    normalizeText(context.timeBand, 20),
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
  const rawLine = typeof selectedOption === "function" ? selectedOption(context) : selectedOption;

  return normalizeHomeWelcomeLine(rawLine);
}

export function buildHomeWelcomeFallbackSpeechText(context = {}, date = new Date()) {
  const scene = resolveFallbackScene(context);
  const options = HOME_WELCOME_FALLBACK_SPEECHES[scene] || HOME_WELCOME_FALLBACK_SPEECHES.default;
  const seed = `${getHomeWelcomeDateKey(date)}|${buildHomeWelcomeContextHash(context)}|${getHomeWelcomeVariantToken(context)}|speech|${scene}`;
  const selectedOption = pickStableVariant(options, seed);
  const rawLine = typeof selectedOption === "function" ? selectedOption(context) : selectedOption;

  return normalizeHomeWelcomeSpeechText(rawLine) || buildHomeWelcomeFallbackLine(context, date);
}

export function buildHomeWelcomeEyebrow(context = {}, date = new Date()) {
  const scene = resolveFallbackScene(context);
  const { timeBand, monthLabel } = resolveTemporalLabels(context, date);
  const timeEyebrowMap = Object.freeze({
    morning: "早上好",
    noon: "中午好",
    afternoon: "下午好",
    evening: "晚上好",
    night: "夜里好"
  });
  const eyebrowMap = Object.freeze({
    profileSaved: ["已经同步好", "档案已就位", "今天准备好了"],
    reviewThenChallenge: ["先回看看", "今天先稳一稳", "错题本在等你"],
    reviewDue: ["先回看看", "今天先稳一稳", "错题本在等你"],
    reviewWarm: ["回温继续", "今天慢慢来", "先把方法稳住"],
    challengeContinue: ["继续往前走", "主线已经点亮", "今天接着学"],
    firstVisitToday: [timeEyebrowMap[timeBand], `${monthLabel}见`, "小岛准备好了"],
    default: [timeEyebrowMap[timeBand], `${monthLabel}见`, "奇妙知识岛"]
  });
  const candidates = eyebrowMap[scene] || eyebrowMap.default;
  const seed = `${getHomeWelcomeDateKey(date)}|${buildHomeWelcomeContextHash(context)}|${getHomeWelcomeVariantToken(context)}|eyebrow|${scene}`;

  return normalizeText(pickStableVariant(candidates, seed), 16) || "欢迎回来";
}

export function buildHomeWelcomeTitle(
  context = {},
  {
    displayName = "",
    useCustomName = false,
    date = new Date()
  } = {}
) {
  const scene = resolveFallbackScene(context);
  const normalizedName = formatDisplayName(displayName);
  const hasCustomName = Boolean(useCustomName && normalizedName);
  const gradeSemesterLabel = formatGradeSemesterLabel(context);
  const stageFocusLabel = extractChallengeFocusLabel(context.challengeStageLabel);
  const { timeBand, monthLabel, seasonLabel } = resolveTemporalLabels(context, date);
  const timeGreetingMap = Object.freeze({
    morning: "早上好",
    noon: "中午好",
    afternoon: "下午好",
    evening: "晚上好",
    night: "夜里好"
  });
  const timeGreeting = timeGreetingMap[timeBand] || "欢迎回来";
  const customTitleMap = Object.freeze({
    profileSaved: [
      `欢迎回来，${normalizedName}`,
      `${normalizedName}，新的路线已经备好`,
      gradeSemesterLabel ? `${gradeSemesterLabel}已经就位，${normalizedName}` : `${normalizedName}，今天按新档案继续`,
      `首页已经备好，${normalizedName}`,
      `${normalizedName}，今天按新档案继续`
    ],
    reviewThenChallenge: [
      `${normalizedName}，先稳一稳再出发`,
      `${normalizedName}，错题本和主线都在等你`,
      stageFocusLabel ? `${stageFocusLabel}还亮着，${normalizedName}` : `${normalizedName}，今天也慢慢往前走`,
      `回看几题再出发，${normalizedName}`,
      `欢迎回来，${normalizedName}`
    ],
    reviewDue: [
      `${normalizedName}，先把错题本翻一翻`,
      `今天先稳一稳，${normalizedName}`,
      `回看几题再出发，${normalizedName}`,
      `${normalizedName}，先从最顺手的几题开始`,
      `错题本在前面等你，${normalizedName}`
    ],
    reviewWarm: [
      `${normalizedName}，这几题还在回温中`,
      `${normalizedName}，把方法再听一遍`,
      `${normalizedName}，今天轻轻复习一下`,
      `欢迎回来，${normalizedName}`,
      `${normalizedName}，先把节奏找回来`
    ],
    challengeContinue: [
      `${normalizedName}，主线已经亮起来了`,
      stageFocusLabel ? `${stageFocusLabel}这站还在等你` : `${normalizedName}，今天接着往前走`,
      `${normalizedName}，这条线还接着上次`,
      `欢迎回来，${normalizedName}`,
      `${normalizedName}，今天继续往前走`
    ],
    firstVisitToday: [
      `${timeGreeting}，${normalizedName}`,
      `${monthLabel}的小岛已经准备好，${normalizedName}`,
      `${normalizedName}，今天从哪一站开始`,
      `欢迎回来，${normalizedName}`,
      gradeSemesterLabel ? `${gradeSemesterLabel}已经备好，${normalizedName}` : `${seasonLabel}的小岛在等你，${normalizedName}`
    ],
    default: [
      `${timeGreeting}，${normalizedName}`,
      `${normalizedName}，今天想先去哪一站`,
      `${normalizedName}，准备好继续了`,
      `欢迎回来，${normalizedName}`,
      `${seasonLabel}也到了，${normalizedName}`,
      `${monthLabel}的小岛已经在等你，${normalizedName}`
    ]
  });
  const defaultTitleMap = Object.freeze({
    profileSaved: [
      "首页已经按档案同步好",
      "新的学习路线已经准备好",
      gradeSemesterLabel ? `${gradeSemesterLabel}已经就位` : "新的学习档案已经就位",
      "今天的小岛已经按新档案备好",
      "欢迎来到奇妙知识岛"
    ],
    reviewThenChallenge: [
      "今天先稳一稳再出发",
      "错题本和主线都已经备好",
      stageFocusLabel ? `${stageFocusLabel}这站还亮着` : "今天的小岛已经准备好",
      "先回看看，再继续往前走",
      "欢迎来到奇妙知识岛"
    ],
    reviewDue: [
      "今天的小岛已经准备好",
      "先从错题本开始也不错",
      "回看几题，再慢慢出发",
      "先把今天到期的几题稳住",
      "欢迎来到奇妙知识岛"
    ],
    reviewWarm: [
      "今天也来奇妙知识岛啦",
      "先把回温中的方法再听一遍",
      "准备好继续听一听了",
      "今天先稳一稳节奏",
      "欢迎来到奇妙知识岛"
    ],
    challengeContinue: [
      "主线已经在前面亮起来了",
      stageFocusLabel ? `${stageFocusLabel}这站还在等你` : "今天可以继续往前走",
      "这条路线还接着上次",
      "今天的小岛已经点亮",
      "欢迎来到奇妙知识岛"
    ],
    firstVisitToday: [
      `${timeGreeting}，奇妙知识岛`,
      `${monthLabel}的小岛已经准备好`,
      "奇妙知识岛欢迎你回来",
      "今天从哪一站开始",
      gradeSemesterLabel ? `${gradeSemesterLabel}已经备好` : `${seasonLabel}的小岛在等你`,
      "欢迎来到奇妙知识岛"
    ],
    default: [
      `${timeGreeting}，奇妙知识岛`,
      "奇妙知识岛欢迎你回来",
      "今天的小岛已经准备好",
      "准备好继续往前走",
      `${monthLabel}的小岛已经亮起来了`,
      "今天想从哪一站开始",
      "欢迎来到奇妙知识岛"
    ]
  });
  const candidates = hasCustomName ? customTitleMap[scene] || customTitleMap.default : defaultTitleMap[scene] || defaultTitleMap.default;
  const seed = `${getHomeWelcomeDateKey(date)}|${buildHomeWelcomeContextHash(context)}|${getHomeWelcomeVariantToken(context)}|title|${normalizedName}|${scene}`;
  const picked = pickStableVariant(candidates.filter(Boolean), seed);

  return normalizeText(picked, 28) || (hasCustomName ? `欢迎回来，${normalizedName}` : "欢迎来到奇妙知识岛");
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
    profileSaved: ["听同步提醒", "听首页小提醒", "听猫头鹰带你看看"],
    reviewThenChallenge: ["听今天提醒", "听猫头鹰轻轻说", "听路线小提醒"],
    reviewDue: ["听错题本提醒", "听今天提醒", "听猫头鹰轻轻说"],
    reviewWarm: ["听回温提醒", "听猫头鹰轻轻说", "听方法小提醒"],
    challengeContinue: ["听主线提醒", "听今天提醒", "听猫头鹰带路"],
    firstVisitToday: ["听猫头鹰欢迎你", "听今天提醒", "听小岛问好"],
    default: ["听猫头鹰说", "听今天提醒", "听小岛小提醒"]
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
      text: normalizedText,
      speechText: normalizedSpeechText
    };
  } catch {
    return null;
  }
}

export function writeHomeWelcomeCache(context = {}, text = "", { speechText = "", source = "ai", date = new Date() } = {}) {
  const normalizedText = normalizeHomeWelcomeLine(text);
  const normalizedSpeechText = normalizeHomeWelcomeSpeechText(speechText || normalizedText);

  if (!normalizedText || !normalizedSpeechText) {
    return null;
  }

  const snapshot = {
    version: HOME_WELCOME_CACHE_VERSION,
    date: getHomeWelcomeDateKey(date),
    contextHash: buildHomeWelcomeContextHash(context),
    text: normalizedText,
    speechText: normalizedSpeechText,
    source: normalizeText(source, 20) || "ai",
    createdAt: new Date().toISOString()
  };

  safeWriteLocalStorage(HOME_WELCOME_CACHE_KEY, JSON.stringify(snapshot));
  return snapshot;
}
