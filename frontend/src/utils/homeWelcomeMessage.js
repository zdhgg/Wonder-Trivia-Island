import homeWelcomeRulesModule from "../../../shared/homeWelcomeRules.browser.mjs";

export const HOME_WELCOME_CACHE_KEY = "wonder-trivia-island.home-welcome.cache";
export const HOME_WELCOME_VISIT_DATE_KEY = "wonder-trivia-island.home-welcome.visit-date";
export const HOME_WELCOME_CACHE_VERSION = 5;
const HOME_WELCOME_SHARED_RULES =
  homeWelcomeRulesModule && typeof homeWelcomeRulesModule === "object" ? homeWelcomeRulesModule : {};
const HOME_WELCOME_STYLE_CONFIG =
  HOME_WELCOME_SHARED_RULES.styleConfig && typeof HOME_WELCOME_SHARED_RULES.styleConfig === "object"
    ? HOME_WELCOME_SHARED_RULES.styleConfig
    : {};
export const HOME_WELCOME_MAX_LINE_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxBubbleLength || 28);
export const HOME_WELCOME_MAX_SPEECH_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxSpeechLength || 80);
export const HOME_WELCOME_MAX_TITLE_LENGTH = Number(HOME_WELCOME_STYLE_CONFIG.maxTitleLength || 28);

const HOME_WELCOME_FALLBACKS = Object.freeze({
  profileSaved: Object.freeze([buildProfileSavedSummary]),
  firstVisitToday: Object.freeze([buildFirstVisitSummary]),
  default: Object.freeze([buildReturnSummary])
});

const HOME_WELCOME_FALLBACK_SPEECHES = Object.freeze({
  profileSaved: Object.freeze([buildProfileSavedSpeech]),
  firstVisitToday: Object.freeze([buildFirstVisitSpeech]),
  default: Object.freeze([buildReturnSpeech])
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

function buildProgressAwareSummary(context = {}) {
  const reviewDueCount = Math.max(0, Number.parseInt(String(context.reviewDueCount || 0), 10) || 0);
  const reviewingCount = Math.max(0, Number.parseInt(String(context.reviewingCount || 0), 10) || 0);
  const challengeStageLabel = normalizeText(context.challengeStageLabel, 10);

  if (reviewDueCount > 0) {
    return `有 ${reviewDueCount} 道小题值得再看一眼，也可以先去探索。`;
  }

  if (reviewingCount > 0) {
    return `上次温习的 ${reviewingCount} 道小题还在，也可以先去探索。`;
  }

  if (challengeStageLabel) {
    return `上次停下的${challengeStageLabel}还亮着，也可以换条路线。`;
  }

  return "";
}

function buildProfileSavedSummary(context = {}) {
  const gradeSemesterLabel = formatGradeSemesterLabel(context);
  return gradeSemesterLabel
    ? `${gradeSemesterLabel}的新路线已经同步到首页。`
    : "首页已经按你的新档案重新整理。";
}

function buildFirstVisitSummary(context = {}) {
  return buildProgressAwareSummary(context) || "火山、森林、矿洞和海滩都准备好了。";
}

function buildReturnSummary(context = {}) {
  return buildProgressAwareSummary(context) || "继续上次的旅程，或者换一条新路线。";
}

function buildSpeechGreeting(context = {}, date = new Date()) {
  const { timeGreetingLabel } = resolveTemporalLabels(context, date);
  const displayName = resolveHomeWelcomeDisplayName(context);
  const greeting = timeGreetingLabel || "欢迎回来";
  return displayName ? `${greeting}，${displayName}。` : `${greeting}。`;
}

function buildProfileSavedSpeech(context = {}, date = new Date()) {
  const gradeSemesterLabel = formatGradeSemesterLabel(context);
  const detail = gradeSemesterLabel
    ? `${gradeSemesterLabel}的新路线已经准备好，首页也同步完成了。`
    : "新的学习档案已经准备好，首页也同步完成了。";
  return `${buildSpeechGreeting(context, date)}${detail}`;
}

function buildFirstVisitSpeech(context = {}, date = new Date()) {
  const progressSummary = buildProgressAwareSummary(context);
  const detail = progressSummary || "猫头鹰把路线图准备好了，今天想去哪座岛看看？";
  return `${buildSpeechGreeting(context, date)}${detail}`;
}

function buildReturnSpeech(context = {}, date = new Date()) {
  const detail = buildProgressAwareSummary(context) || "猫头鹰把路线图准备好了，想继续走走，还是换座岛看看？";
  return `${buildSpeechGreeting(context, date)}${detail}`;
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

  const candidate = normalized.replace(/^[""'“”‘’]+|[""'“”‘’]+$/g, "").trim();

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

  return normalizeHomeWelcomeLine(rawLine, HOME_WELCOME_MAX_LINE_LENGTH);
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
  if (context.isProfileJustSaved) {
    return "档案已更新";
  }

  const { timeGreetingLabel } = resolveTemporalLabels(context, date);
  return normalizeText(timeGreetingLabel, 16) || "欢迎回来";
}

export function buildHomeWelcomeTitle(
  context = {},
  {
    displayName = "",
    useCustomName = false
  } = {}
) {
  const scene = resolveFallbackScene(context);
  const normalizedName = formatDisplayName(displayName);
  const hasCustomName = Boolean(useCustomName && normalizedName);

  if (scene === "profileSaved") {
    return "新路线准备好了";
  }

  if (hasCustomName) {
    return normalizeHomeWelcomeTitle(`${normalizedName}，欢迎回来`);
  }

  if (scene === "firstVisitToday") {
    return "今天想去哪座岛看看？";
  }

  return "欢迎回到奇妙知识岛";
}

export function readHomeWelcomeVisitDate() {
  return normalizeText(safeReadLocalStorage(HOME_WELCOME_VISIT_DATE_KEY), 20);
}

export function markHomeWelcomeVisited(date = new Date()) {
  const dateKey = getHomeWelcomeDateKey(date);
  safeWriteLocalStorage(HOME_WELCOME_VISIT_DATE_KEY, dateKey);
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
