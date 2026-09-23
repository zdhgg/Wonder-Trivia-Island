// 探险收藏册 ViewModel：把已有的三类成长数据整理成孩子能看懂的展示结构。
//
// 纯函数，不读全局状态、不写任何进度、不新增奖励规则：
// - 探险印章：来自持久化成长账本（growthProgress.totalDailyChests / dailyClaims）
// - 本章航海收藏：来自当前章节的关卡奖励配置（stage.reward）+ 本章 progress
// - 本章成就：直接接收 challengeAchievements 已经判定好的结果，不重新定义规则
//
// 章节作用域由调用方决定（传哪一章，就只展示那一章的数据），
// 这样首页 / 闯关地图各自用自己那一章，不会出现“首页 A 章、点进去 B 章”。
import { normalizeGrowthProgress } from "./growthProgress";

export const COLLECTION_BOOK_RECENT_STAMP_LIMIT = 5;

function normalizeText(value, maxLength = 0) {
  const normalized = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function toNonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// “2026-09-22” → “9 月 22 日”：孩子读得懂，也不受时区影响（纯字符串切分）。
export function formatCollectionStampDate(dateKey) {
  const normalized = normalizeText(dateKey, 10);
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!matched) {
    return "";
  }

  const month = Number.parseInt(matched[2], 10);
  const day = Number.parseInt(matched[3], 10);

  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return "";
  }

  return `${month} 月 ${day} 日`;
}

// 最近领取的日期优先：dateKey 是 "YYYY-MM-DD"，字符串倒序就是时间倒序。
export function listRecentDailyChestClaims(growthProgress, limit = COLLECTION_BOOK_RECENT_STAMP_LIMIT) {
  const dailyClaims = normalizeGrowthProgress(growthProgress).dailyClaims;
  const resolvedLimit = Math.max(0, toNonNegativeInteger(limit) || COLLECTION_BOOK_RECENT_STAMP_LIMIT);

  return Object.keys(dailyClaims)
    .sort((left, right) => right.localeCompare(left))
    .slice(0, resolvedLimit)
    .map((dateKey) => ({
      dateKey,
      label: formatCollectionStampDate(dateKey),
      claimedAt: dailyClaims[dateKey].claimedAt
    }));
}

export function buildCollectionStampSection({
  growthProgress = {},
  recentStampLimit = COLLECTION_BOOK_RECENT_STAMP_LIMIT
} = {}) {
  const normalizedProgress = normalizeGrowthProgress(growthProgress);
  const total = normalizedProgress.totalDailyChests;
  const recentClaims = listRecentDailyChestClaims(normalizedProgress, recentStampLimit);

  return {
    total,
    hasStamps: total > 0,
    countText: `累计 ${total} 枚探险印章`,
    countLabel: "探险印章",
    recentClaims,
    hasRecentClaims: recentClaims.length > 0,
    recentTitle: "最近领取",
    // 儿童化的空状态：不说“无数据”，直接告诉孩子怎么拿到第一枚。
    emptyText: "还没有探险印章。先把今天的 3 个小任务做完，打开今日宝箱就能拿到一枚啦。",
    hintText: "每打开一次今日宝箱，就会多一枚探险印章。"
  };
}

// 本章 7 个关卡的航海收藏：奖励图标 / 名称直接复用关卡配置，是否获得看本章 progress。
export function buildCollectionRewardSection({ stages = [], chapterProgress = {} } = {}) {
  const stageList = Array.isArray(stages) ? stages : [];
  const bestResults =
    chapterProgress?.bestResults && typeof chapterProgress.bestResults === "object" ? chapterProgress.bestResults : {};
  const items = stageList.map((stage, index) => {
    const reward = stage?.reward && typeof stage.reward === "object" ? stage.reward : {};
    const earned = Boolean(bestResults?.[stage?.id]?.rewardEarned);

    return {
      id: normalizeText(stage?.id, 40) || `stage-${index + 1}`,
      order: index + 1,
      stageTitle: normalizeText(stage?.title, 24),
      stageGlyph: normalizeText(stage?.glyph, 4),
      glyph: normalizeText(reward.glyph, 4) || "🎁",
      name: normalizeText(reward.name, 24) || `第 ${index + 1} 站收藏`,
      summary: normalizeText(reward.summary, 60),
      earned,
      statusLabel: earned ? "已获得" : "未获得"
    };
  });
  const earnedCount = items.filter((item) => item.earned).length;

  return {
    items,
    earnedCount,
    totalCount: items.length,
    text: `${earnedCount} / ${items.length}`,
    title: "本章航海收藏",
    emptyText: "这一章还没有收下任何航海收藏，去闯关就能一件件收齐。",
    completedText: "这一章的航海收藏已经全部收齐啦！"
  };
}

// 本章成就：只做展示，状态与 progressText 全部来自现有判定结果。
export function buildCollectionAchievementSection({ achievements = [] } = {}) {
  const achievementList = Array.isArray(achievements) ? achievements : [];
  const items = achievementList.map((achievement) => ({
    id: normalizeText(achievement?.id, 40),
    glyph: normalizeText(achievement?.glyph, 4) || "🏅",
    name: normalizeText(achievement?.name, 24),
    summary: normalizeText(achievement?.summary, 80),
    isUnlocked: Boolean(achievement?.isUnlocked),
    fresh: Boolean(achievement?.fresh),
    progressText: normalizeText(achievement?.progressText, 40),
    statusLabel: achievement?.isUnlocked ? "已达成" : "进行中"
  }));
  const unlockedCount = items.filter((item) => item.isUnlocked).length;

  return {
    items,
    unlockedCount,
    totalCount: items.length,
    text: `${unlockedCount} / ${items.length}`,
    title: "本章成就",
    hintText: "成就只按当前这一章的闯关表现来算。"
  };
}

// 收藏册顶部的作用域文案：年级 · 学期 · 路线名称。
export function buildCollectionScopeLabel(chapter = {}) {
  const grade = normalizeText(chapter?.grade, 16);
  const semester = normalizeText(chapter?.semester, 16);
  const routeTitle = normalizeText(chapter?.routeTitle, 20);
  const segments = [grade, semester].filter(Boolean).join(" · ");

  if (routeTitle) {
    return segments ? `${segments} · ${routeTitle}` : routeTitle;
  }

  return segments || normalizeText(chapter?.label, 20) || "当前章节";
}

export function buildAdventureCollectionBook({
  chapter = {},
  stages = [],
  chapterProgress = {},
  achievements = [],
  growthProgress = {},
  recentStampLimit = COLLECTION_BOOK_RECENT_STAMP_LIMIT
} = {}) {
  const rewardSection = buildCollectionRewardSection({ stages, chapterProgress });

  return {
    chapterId: normalizeText(chapter?.id, 60),
    emoji: normalizeText(chapter?.emoji, 8) || "🧭",
    islandName: normalizeText(chapter?.islandName, 20),
    themeTitle: normalizeText(chapter?.themeTitle, 24),
    routeTitle: normalizeText(chapter?.routeTitle, 20),
    scopeLabel: buildCollectionScopeLabel(chapter),
    title: "我的探险收藏册",
    stamps: buildCollectionStampSection({ growthProgress, recentStampLimit }),
    rewards: rewardSection,
    achievements: buildCollectionAchievementSection({ achievements })
  };
}
