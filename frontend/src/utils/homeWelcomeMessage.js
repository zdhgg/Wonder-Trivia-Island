export const HOME_WELCOME_CACHE_KEY = "wonder-trivia-island.home-welcome.cache";
export const HOME_WELCOME_VISIT_DATE_KEY = "wonder-trivia-island.home-welcome.visit-date";
export const HOME_WELCOME_AUTO_SPEECH_DATE_KEY = "wonder-trivia-island.home-welcome.auto-speech-date";
export const HOME_WELCOME_CACHE_VERSION = 2;
export const HOME_WELCOME_MAX_LINE_LENGTH = 28;
export const HOME_WELCOME_MAX_SPEECH_LENGTH = 80;

const HOME_WELCOME_FALLBACKS = Object.freeze({
  profileSaved: Object.freeze([
    (context) => {
      const gradeSemesterLabel = formatGradeSemesterLabel(context);
      return gradeSemesterLabel ? `${gradeSemesterLabel}已经放到首页啦。` : "新的学习档案已经放到首页啦。";
    },
    () => "档案已经就位，今天轻轻来就好。",
    () => "首页已经按你的档案准备好了。"
  ]),
  firstVisitToday: Object.freeze([
    (context) => {
      const { monthVibe } = resolveTemporalLabels(context);
      return monthVibe ? `${monthVibe}，小岛已经准备好啦。` : "今天的小岛已经准备好啦。";
    },
    (context) => {
      const { timeBand } = resolveTemporalLabels(context);
      if (timeBand === "morning") return "早上的小岛很安静，慢慢来就好。";
      if (timeBand === "noon") return "中午了，来小岛坐一会儿吧。";
      if (timeBand === "afternoon") return "下午的阳光正好，进来坐坐吧。";
      if (timeBand === "evening") return "晚上好，小岛的灯还亮着呢。";
      return "夜深了，小岛还亮着一盏灯。";
    },
    (context) => {
      const { monthVibe } = resolveTemporalLabels(context);
      return monthVibe ? `${monthVibe}，猫头鹰在这儿等你。` : "猫头鹰在这儿等你。";
    }
  ]),
  default: Object.freeze([
    () => "今天也来啦，真高兴见到你。",
    (context) => {
      const { monthVibe } = resolveTemporalLabels(context);
      return monthVibe ? `${monthVibe}，小岛还是老样子。` : "小岛还是老样子。";
    },
    (context) => {
      const { schoolYearPhase } = resolveTemporalLabels(context);
      if (schoolYearPhase === "期末临近") return "快到期末了，慢慢来，不用慌。";
      if (schoolYearPhase === "寒假里") return "寒假里也来啦，真高兴。";
      if (schoolYearPhase === "暑假里") return "暑假里也来啦，小岛一直在这儿。";
      if (schoolYearPhase === "新学期开始") return "新学期开始了，小岛也跟着亮起来了。";
      return "猫头鹰一直在等你呢。";
    },
    () => "今天想做什么都可以，不着急。",
    (context) => {
      const { timeBand } = resolveTemporalLabels(context);
      if (timeBand === "evening" || timeBand === "night") return "晚上回来看看，也刚刚好。";
      return "今天的阳光正好，进来坐坐吧。";
    },
    (context) => {
      const { monthVibe } = resolveTemporalLabels(context);
      return monthVibe ? `${monthVibe}，慢慢来就好。` : "慢慢来就好。";
    }
  ])
});

const HOME_WELCOME_FALLBACK_SPEECHES = Object.freeze({
  profileSaved: Object.freeze([
    (context) => {
      const gradeSemesterLabel = formatGradeSemesterLabel(context);
      return gradeSemesterLabel
        ? `${gradeSemesterLabel}已经放到首页了，今天轻轻来就好，我会在这里陪你。`
        : "新的学习档案已经放到首页了，今天轻轻来就好，我会在这里陪你。";
    },
    () => "档案已经准备好了，今天想从哪儿开始都可以，不着急。",
    () => "首页已经按你的档案备好了，慢慢来，我一直在这儿。"
  ]),
  firstVisitToday: Object.freeze([
    () => "今天的小岛已经准备好了，想做什么都行，猫头鹰会在这里陪着你。",
    (context) => {
      const { timeBand, monthVibe } = resolveTemporalLabels(context);
      if (timeBand === "morning") return monthVibe ? `${monthVibe}，早上的小岛很安静，不急不忙，猫头鹰在这儿等你。` : "早上的小岛很安静，不急不忙，猫头鹰在这儿等你。";
      if (timeBand === "evening" || timeBand === "night") return "晚上好，小岛的灯还亮着，慢慢待一会儿就好。";
      return monthVibe ? `${monthVibe}，来小岛坐坐吧，猫头鹰一直在。` : "今天的阳光正好，来小岛坐坐吧，猫头鹰一直在。";
    },
    (context) => {
      const { monthVibe } = resolveTemporalLabels(context);
      return monthVibe ? `欢迎回来，${monthVibe}，我们也慢慢来，不着急。` : "欢迎回来，今天我们也慢慢来，不着急。";
    }
  ]),
  default: Object.freeze([
    () => "今天也来啦，真高兴见到你，猫头鹰会一直在这里陪着你。",
    (context) => {
      const { monthVibe } = resolveTemporalLabels(context);
      return monthVibe ? `${monthVibe}，小岛还是安安静静的，慢慢来，我一直在这儿。` : "小岛还是安安静静的，慢慢来，我一直在这儿。";
    },
    (context) => {
      const { schoolYearPhase } = resolveTemporalLabels(context);
      if (schoolYearPhase === "期末临近") return "快期末了，不用慌，按自己的节奏慢慢来，我一直在这儿。";
      if (schoolYearPhase === "寒假里") return "寒假里也来啦，真高兴，小岛一直都在。";
      if (schoolYearPhase === "暑假里") return "暑假里也来看看啦，小岛一直在这儿等你。";
      if (schoolYearPhase === "新学期开始") return "新学期开始了，小岛也跟着亮起来了，慢慢来就好。";
      return "今天想做什么都可以，不着急，先在这儿待一会儿就好。";
    },
    (context) => {
      const { monthVibe } = resolveTemporalLabels(context);
      return monthVibe ? `${monthVibe}，你来了就好。` : "你来了就好。";
    }
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
  const timeBand = resolveTimeBandFromDate(referenceDate);

  return {
    currentTimestamp: referenceDate.getTime(),
    hour: referenceDate.getHours(),
    monthNumber,
    monthLabel: CHINESE_MONTH_LABELS[monthNumber - 1] || `${monthNumber}月`,
    seasonLabel: resolveSeasonLabelFromMonth(monthNumber),
    monthVibe: resolveMonthVibe(monthNumber),
    schoolYearPhase: resolveSchoolYearPhase(monthNumber),
    timeBand
  };
}

function resolveTemporalLabels(context = {}, date = new Date()) {
  const referenceDate = resolveHomeWelcomeReferenceDate(context, date);
  const temporalContext = buildHomeWelcomeTemporalContext(referenceDate);
  const timeBand = normalizeText(context.timeBand, 20) || temporalContext.timeBand;
  const monthLabel = normalizeText(context.monthLabel, 20) || temporalContext.monthLabel;
  const seasonLabel = normalizeText(context.seasonLabel, 20) || temporalContext.seasonLabel;
  const monthVibe = normalizeText(context.monthVibe, 20) || temporalContext.monthVibe;
  const schoolYearPhase = normalizeText(context.schoolYearPhase, 20) || temporalContext.schoolYearPhase;

  return {
    referenceDate,
    timeBand,
    monthLabel,
    seasonLabel,
    monthVibe,
    schoolYearPhase
  };
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
  const { timeBand, monthVibe } = resolveTemporalLabels(context, date);
  const timeEyebrowMap = Object.freeze({
    morning: "早上好",
    noon: "中午好",
    afternoon: "下午好",
    evening: "晚上好",
    night: "夜里好"
  });
  const timeGreeting = timeEyebrowMap[timeBand] || "欢迎回来";
  const vibeGreeting = monthVibe || "";
  const eyebrowMap = Object.freeze({
    profileSaved: ["已经同步好", "档案已就位", "今天准备好了"],
    firstVisitToday: [timeGreeting, vibeGreeting, `${timeGreeting}，小岛见`],
    default: [timeGreeting, vibeGreeting, "又见面了", "奇妙知识岛"]
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
  const { timeBand, monthVibe, schoolYearPhase } = resolveTemporalLabels(context, date);
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
      gradeSemesterLabel ? `${gradeSemesterLabel}已经就位，${normalizedName}` : `${normalizedName}，今天轻轻来就好`,
      `首页已经备好，${normalizedName}`,
      `${normalizedName}，今天慢慢来就行`
    ],
    firstVisitToday: [
      `${timeGreeting}，${normalizedName}`,
      monthVibe ? `${monthVibe}，${normalizedName}` : `欢迎回来，${normalizedName}`,
      `${normalizedName}，今天想做什么都可以`,
      `欢迎回来，${normalizedName}`,
      monthVibe ? `${monthVibe}，小岛在等你，${normalizedName}` : `小岛在等你，${normalizedName}`
    ],
    default: [
      `${timeGreeting}，${normalizedName}`,
      `${normalizedName}，今天也见到你了`,
      monthVibe ? `${monthVibe}，${normalizedName}` : `${normalizedName}，在这儿坐一会儿吧`,
      `欢迎回来，${normalizedName}`,
      schoolYearPhase === "期末临近" ? `快期末了，慢慢来，${normalizedName}` : "",
      schoolYearPhase === "寒假里" ? `寒假快乐，${normalizedName}` : "",
      schoolYearPhase === "暑假里" ? `暑假快乐，${normalizedName}` : "",
      schoolYearPhase === "新学期开始" ? `新学期好，${normalizedName}` : "",
      monthVibe ? `${monthVibe}，小岛一直在，${normalizedName}` : `${normalizedName}，小岛一直在`
    ]
  });
  const defaultTitleMap = Object.freeze({
    profileSaved: [
      "首页已经按档案同步好",
      "新的路线已经准备好了",
      gradeSemesterLabel ? `${gradeSemesterLabel}已经就位` : "新的学习档案已经就位",
      "今天的小岛已经按新档案备好",
      "欢迎来到奇妙知识岛"
    ],
    firstVisitToday: [
      `${timeGreeting}，奇妙知识岛`,
      monthVibe ? `${monthVibe}的奇妙知识岛` : "奇妙知识岛欢迎你回来",
      "奇妙知识岛欢迎你回来",
      "今天轻轻来就好",
      monthVibe ? `${monthVibe}，小岛在等你` : "小岛在等你",
      "欢迎来到奇妙知识岛"
    ],
    default: [
      `${timeGreeting}，奇妙知识岛`,
      "奇妙知识岛欢迎你回来",
      "今天的小岛已经准备好",
      monthVibe ? monthVibe : "今天也来坐坐吧",
      schoolYearPhase === "期末临近" ? "快期末了，不用慌" : "",
      schoolYearPhase === "寒假里" ? "寒假也来啦" : "",
      schoolYearPhase === "暑假里" ? "暑假也来啦" : "",
      schoolYearPhase === "新学期开始" ? "新学期开始了" : "",
      "又见面了",
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
