// 首页聚合层：把闯关 / 错题 / 知识学习 / 用户档案 / 成就这几路已有数据，
// 拼成首页需要的 ViewModel。
//
// 这里只做“读数据 + 组合 + 排序”，不引入新的全局状态，也不改任何现有进度结构。
// 所有函数都是纯函数，方便直接写测试；写入类副作用留在 useTriviaApp 里。
import {
  WEAK_POINT_GRADE_OPTIONS,
  getWeakPointSubjects,
  getWeakPoints
} from "./studyWeakPoints";
import { countChapterRewards, evaluateChapterAchievements } from "./challengeAchievements";
import { buildGrowthStampText, getDailyChestClaim, getExplorerStampCount } from "./growthProgress";
import { buildKnowledgeIslandGrowth } from "./knowledgeIslandGrowth";
import { FOOTPRINT_SUMMARY_EMPTY_TEXT } from "./growthFootprints";
import { CHALLENGE_STAGES } from "../composables/challenge/challengeConfig";

const CHINESE_DIGITS = Object.freeze(["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]);

function normalizeText(value, maxLength = 0) {
  const normalized = String(value ?? "").replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function toNonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// 首页文案里的数量都很小（错题、星星、关卡），用汉字更贴近孩子读的句子。
export function formatHomeCountText(value) {
  const normalized = toNonNegativeInteger(value);

  if (normalized <= 9) {
    return CHINESE_DIGITS[normalized];
  }

  if (normalized === 10) {
    return "十";
  }

  if (normalized < 20) {
    return `十${CHINESE_DIGITS[normalized - 10]}`;
  }

  return String(normalized);
}

// ---------------------------------------------------------------------------
// 专项强化年级：有档案年级就严格跟随档案，绝不串到别的年级。
// ---------------------------------------------------------------------------

export function countWeakPointsForGrade(grade) {
  const normalizedGrade = normalizeText(grade, 16);

  if (!normalizedGrade) {
    return 0;
  }

  return getWeakPointSubjects(normalizedGrade).reduce(
    (total, subject) => total + getWeakPoints(normalizedGrade, subject).length,
    0
  );
}

// - preferredGrade 有内容 → ready，用该年级的专项；
// - preferredGrade 没内容 → preparing，年级保持档案年级、数量为 0，
//   不 fallback、不给别的年级的知识点、也不允许打开别的年级专项；
// - 只有在没有明确 preferredGrade 的特殊场景（例如档案没填），
//   才考虑 fallbackGrades / 目录里已有的年级。
export function resolveWeakPointContext({ preferredGrade = "", fallbackGrades = [] } = {}) {
  const normalizedPreferredGrade = normalizeText(preferredGrade, 16);

  if (normalizedPreferredGrade) {
    const preferredWeakPointCount = countWeakPointsForGrade(normalizedPreferredGrade);

    return {
      preferredGrade: normalizedPreferredGrade,
      grade: normalizedPreferredGrade,
      fallbackGrade: "",
      weakPointCount: preferredWeakPointCount,
      isPreferredGrade: preferredWeakPointCount > 0,
      status: preferredWeakPointCount > 0 ? "ready" : "preparing",
      note:
        preferredWeakPointCount > 0
          ? `${normalizedPreferredGrade} · 共 ${preferredWeakPointCount} 个知识点`
          : "专项内容准备中"
    };
  }

  const fallbackCandidates = [...fallbackGrades, ...WEAK_POINT_GRADE_OPTIONS]
    .map((grade) => normalizeText(grade, 16))
    .filter((grade, index, list) => grade && list.indexOf(grade) === index);

  for (const grade of fallbackCandidates) {
    const weakPointCount = countWeakPointsForGrade(grade);

    if (weakPointCount > 0) {
      return {
        preferredGrade: "",
        grade,
        fallbackGrade: grade,
        weakPointCount,
        isPreferredGrade: false,
        status: "ready",
        note: `${grade} · 共 ${weakPointCount} 个知识点`
      };
    }
  }

  return {
    preferredGrade: "",
    grade: "",
    fallbackGrade: "",
    weakPointCount: 0,
    isPreferredGrade: false,
    status: "unavailable",
    note: "专项内容准备中"
  };
}

// ---------------------------------------------------------------------------
// 成就：首页只做摘要，完整列表在“我的探险收藏册”。
// ---------------------------------------------------------------------------

// 从 "收藏 2 / 3" 这类文案里取进度，取不到就返回 null（不做模糊打分）。
export function extractAchievementProgress(progressText = "") {
  const normalized = normalizeText(progressText, 60);
  const matched = normalized.match(/(\d+)\s*\/\s*(\d+)(?!\s*%)/);

  if (!matched) {
    return null;
  }

  const value = Number.parseInt(matched[1], 10);
  const target = Number.parseInt(matched[2], 10);

  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) {
    return null;
  }

  return {
    value: Math.max(0, Math.min(value, target)),
    target
  };
}

function getAchievementProgress(achievement = {}) {
  const explicitValue = Number.parseInt(String(achievement.progressValue ?? ""), 10);
  const explicitTarget = Number.parseInt(String(achievement.progressTarget ?? ""), 10);

  if (Number.isFinite(explicitValue) && Number.isFinite(explicitTarget) && explicitTarget > 0) {
    return {
      value: Math.max(0, Math.min(explicitValue, explicitTarget)),
      target: explicitTarget
    };
  }

  return extractAchievementProgress(achievement.progressText);
}

export function selectNextAchievement(achievements = []) {
  const candidates = (Array.isArray(achievements) ? achievements : [])
    .filter((achievement) => achievement && !achievement.isUnlocked)
    .map((achievement) => ({
      achievement,
      progress: getAchievementProgress(achievement)
    }));

  if (candidates.length === 0) {
    return null;
  }

  const trackable = candidates.filter((candidate) => candidate.progress);
  const orderedCandidates = trackable.length > 0
    ? trackable.sort((left, right) => {
        // “最接近完成”优先：先看还差多少，差得一样多时选目标更小的那个。
        const leftRemaining = left.progress.target - left.progress.value;
        const rightRemaining = right.progress.target - right.progress.value;

        if (leftRemaining !== rightRemaining) {
          return leftRemaining - rightRemaining;
        }

        return left.progress.target - right.progress.target;
      })
    : candidates;

  const { achievement, progress } = orderedCandidates[0];
  const remaining = progress ? progress.target - progress.value : 0;

  return {
    id: achievement.id,
    glyph: achievement.glyph || "🏅",
    name: achievement.name || "",
    summary: achievement.summary || "",
    progressText: normalizeText(achievement.progressText, 40),
    progressValue: progress ? progress.value : 0,
    progressTarget: progress ? progress.target : 0,
    remaining,
    goalText: progress
      ? remaining > 0
        ? `再获得 ${remaining} 个就能解锁`
        : "马上就能解锁"
      : normalizeText(achievement.progressText, 40)
  };
}

export function buildHomeGrowth({
  totalStars = 0,
  starTotal = 0,
  rewardCount = 0,
  rewardTotal = 0,
  stampCount = 0,
  achievements = []
} = {}) {
  const achievementList = Array.isArray(achievements) ? achievements : [];
  const unlockedCount = achievementList.filter((achievement) => achievement?.isUnlocked).length;
  const nextAchievement = selectNextAchievement(achievementList);
  const normalizedStars = toNonNegativeInteger(totalStars);
  const normalizedStarTotal = toNonNegativeInteger(starTotal);
  // 探险印章是长期账本里的独立累计数，不参与上面三个“本章指标”的口径。
  const normalizedStampCount = toNonNegativeInteger(stampCount);
  // 知识岛摘要和收藏册调的是同一个纯函数，所以同一个印章数在两边永远是同一个阶段。
  const knowledgeIsland = buildKnowledgeIslandGrowth(normalizedStampCount);

  return {
    totalStars: normalizedStars,
    starTotal: normalizedStarTotal,
    // 星星和收藏一样给出分母，三个指标才是一致的“当前章节 n / m”口径。
    starText: normalizedStarTotal > 0 ? `${normalizedStars} / ${normalizedStarTotal}` : `${normalizedStars}`,
    rewardCount: toNonNegativeInteger(rewardCount),
    rewardTotal: toNonNegativeInteger(rewardTotal),
    rewardText: `${toNonNegativeInteger(rewardCount)} / ${toNonNegativeInteger(rewardTotal)}`,
    achievementCount: unlockedCount,
    achievementTotal: achievementList.length,
    achievementText: `${unlockedCount} / ${achievementList.length}`,
    stampCount: normalizedStampCount,
    // 只说一次数字（印章数 = 开过的宝箱数），不要“累计开启 N 个宝箱 · N 枚印章”。
    stampText: buildGrowthStampText({ totalDailyChests: normalizedStampCount }),
    // 首页只做轻量摘要：岛名 + 印章数 + 下一变化，不把整座岛搬到首页。
    knowledgeIsland,
    knowledgeIslandTitle: "我的知识岛",
    knowledgeIslandText: `${knowledgeIsland.currentStage.name} · ${knowledgeIsland.stampText}`,
    nextAchievement,
    allAchievementsDone: achievementList.length > 0 && unlockedCount >= achievementList.length
  };
}

export function buildHomeGrowthBookEntry() {
  return {
    icon: "📖",
    // 和纪念册内部空状态同一句文案：同一件事在首页和纪念册里不会出现两种说法。
    hint: FOOTPRINT_SUMMARY_EMPTY_TEXT,
    ariaLabel: "打开我们的成长纪念册"
  };
}

// 「下次我们一起做什么」的首页入口文案。
// 这条入口指的是**还没发生**的事，所以文案刻意是「想」「下次」的语气：
// 首页上只说这是一个可以随便挑的地方，不报条数（报条数就变成待办清单了）。
export function buildHomeGrowthPlansEntry() {
  return {
    icon: "🌤️",
    hint: "想一起做点什么？挑一件放进清单里",
    ariaLabel: "打开下次我们一起做什么"
  };
}

// ---------------------------------------------------------------------------
// 今天的探险：主线任务卡。
// ---------------------------------------------------------------------------

export function buildHomeAdventure({
  chapter = {},
  chapterStarsEarned = 0,
  chapterTotalStars = 0,
  currentStage = null,
  nextStage = null,
  stageCount = 0,
  isChapterComplete = false
} = {}) {
  // 整章通关后不再有“下一关”，否则会出现“7 关都过了还让孩子继续第 7 关”。
  const resolvedStage = isChapterComplete ? null : nextStage || currentStage || null;
  const totalStars = toNonNegativeInteger(chapterTotalStars);
  const rawStarsEarned = toNonNegativeInteger(chapterStarsEarned);
  const starsEarned = totalStars > 0 ? Math.min(rawStarsEarned, totalStars) : rawStarsEarned;
  const hasRemainingStars = totalStars > 0 && starsEarned < totalStars;

  return {
    chapterId: normalizeText(chapter?.id, 60),
    grade: normalizeText(chapter?.grade, 16),
    semester: normalizeText(chapter?.semester, 16),
    emoji: normalizeText(chapter?.emoji, 8) || "🌋",
    title: normalizeText(chapter?.islandName, 20) || "探险岛",
    subtitle: normalizeText(chapter?.themeTitle, 24),
    chapterLabel: normalizeText(chapter?.label, 20),
    routeTitle: normalizeText(chapter?.routeTitle, 20) || "挑战路线",
    stageOrder: resolvedStage ? toNonNegativeInteger(resolvedStage.order) || 1 : 0,
    stageTitle: normalizeText(resolvedStage?.title, 24),
    stageCount: toNonNegativeInteger(stageCount),
    isChapterComplete: Boolean(isChapterComplete),
    stageLabel: resolvedStage
      ? `第 ${toNonNegativeInteger(resolvedStage.order) || 1} 关 · ${normalizeText(resolvedStage.title, 24)}`
      : "这一章已经全部通关",
    starsEarned,
    totalStars,
    starText: `${starsEarned} / ${totalStars}`,
    goLabel: resolvedStage ? `继续第 ${toNonNegativeInteger(resolvedStage.order) || 1} 关` : "回到大地图看看",
    // 通关但没满星时，仍然提示星星，让孩子知道可以回头补。
    goalText: resolvedStage
      ? "再获得 1 颗星，就离下一站更近啦"
      : hasRemainingStars
        ? "这一章已经全部通关，还有星星可以回头补哦"
        : "这一章已经全部通关，可以去别的岛看看",
    goalAction: resolvedStage ? "再拿 1 颗星" : "换一座岛"
  };
}

// ---------------------------------------------------------------------------
// 欢迎区行动建议：复用 existing 的 reviewDueCount / resume / 薄弱点数据。
//
// 注意：advice 本身仍然覆盖全部 5 种情况（review / study / weak-point /
// challenge / explore），供首页其它位置复用；但欢迎区「今日建议」只展示其中
// 一部分，见 HOME_WELCOME_SUMMARY_ADVICE_IDS。
// ---------------------------------------------------------------------------

export function buildHomeAdvice({
  reviewDueCount = 0,
  resume = null,
  weakPointContext = null,
  adventure = null
} = {}) {
  const dueCount = toNonNegativeInteger(reviewDueCount);

  if (dueCount > 0) {
    return {
      id: "review",
      contextKey: "review-due",
      icon: "📝",
      text: `今天有 ${formatHomeCountText(dueCount)} 道小题该回来看看啦，先温习一下吧。`
    };
  }

  if (resume?.lessonTitle) {
    return {
      id: "study",
      contextKey: "resume-lesson",
      icon: "📚",
      text: `上次学到「${normalizeText(resume.lessonTitle, 20)}」，接着往下看一小段吧。`
    };
  }

  if (weakPointContext?.knowledgeTag) {
    return {
      id: "weak-point",
      contextKey: "weak-point",
      icon: "🎯",
      text: `最近「${normalizeText(weakPointContext.knowledgeTag, 20)}」可以再练一练，练熟了就稳啦。`
    };
  }

  if (adventure?.stageTitle) {
    const stageOrder = adventure.stageOrder ? `第 ${adventure.stageOrder} 关` : "下一关";

    return {
      id: "challenge",
      contextKey: "challenge-stage",
      icon: "🌋",
      text: `${adventure.title}${stageOrder}还等着你，再拿 1 颗星就能继续前进。`
    };
  }

  // 整章通关后不能再推荐“继续下一关”。
  if (adventure?.isChapterComplete) {
    return {
      id: "explore",
      contextKey: "chapter-complete",
      icon: "🧭",
      text: "这一章已经全部通关啦，可以回大地图看看别的岛。"
    };
  }

  return {
    id: "explore",
    contextKey: "explore",
    icon: "🧭",
    text: "今天的路线都准备好了，先闯一关试试看吧。"
  };
}

// 欢迎区「今日建议」只在这些 advice 上出现：
// review / study / weak-point 代表“比继续主线更值得先处理的事情”。
// challenge（继续下一关）与 explore / chapter-complete（回大地图、随便闯一关）
// 已经由「今天的探险」主卡承担，欢迎区不再重复指挥，避免首屏出现两个“下一步做什么”。
export const HOME_WELCOME_SUMMARY_ADVICE_IDS = Object.freeze(["review", "study", "weak-point"]);

export function buildHomeWelcomeSummary(advice = {}) {
  const adviceId = normalizeText(advice?.id, 24);

  if (!HOME_WELCOME_SUMMARY_ADVICE_IDS.includes(adviceId)) {
    return "";
  }

  return normalizeText(advice?.text, 80);
}

// ---------------------------------------------------------------------------
// 老师的小提醒：0~2 条，只推系统真的有把握的内容。
// ---------------------------------------------------------------------------

export function buildTeacherTips({
  reviewDueCount = 0,
  weakPointContext = null,
  resume = null
} = {}) {
  const tips = [];
  const dueCount = toNonNegativeInteger(reviewDueCount);

  if (dueCount > 0) {
    tips.push({
      id: "review-due",
      icon: "📝",
      title: `有 ${dueCount} 道错题今天到期`,
      actionLabel: "去温习",
      target: "wrong-review"
    });
  }

  if (weakPointContext?.knowledgeTag) {
    tips.push({
      id: "weak-point",
      icon: "🎯",
      title: `最近“${normalizeText(weakPointContext.knowledgeTag, 20)}”需要再练练`,
      actionLabel: "再练一练",
      target: "weak-point"
    });
  }

  if (resume?.lessonTitle) {
    tips.push({
      id: "resume-lesson",
      icon: "📚",
      title: `上次学到“${normalizeText(resume.lessonTitle, 20)}”`,
      actionLabel: "继续学习",
      target: "knowledge-study"
    });
  }

  return tips.slice(0, 2);
}

// ---------------------------------------------------------------------------
// 今日小任务：目标固定，进度只来自本地日进度（单一口径，不做双来源 max）。
// ---------------------------------------------------------------------------

export function buildDailyTasks({ tasks = {} } = {}) {
  const reviewedCount = Array.isArray(tasks?.reviewedQuestionIds) ? tasks.reviewedQuestionIds.length : 0;
  const clearedCount = toNonNegativeInteger(tasks?.stagesCleared);
  const lessonCount = Array.isArray(tasks?.completedLessonIds) ? tasks.completedLessonIds.length : 0;

  const items = [
    {
      id: "challenge",
      icon: "🌋",
      label: "今日闯关",
      value: Math.min(clearedCount, 1),
      target: 1,
      done: clearedCount >= 1,
      accent: "volcano"
    },
    {
      id: "review",
      icon: "📝",
      label: "错题温习",
      value: Math.min(reviewedCount, 3),
      target: 3,
      done: reviewedCount >= 3,
      accent: "review"
    },
    {
      id: "study",
      icon: "📚",
      label: "学习知识",
      value: Math.min(lessonCount, 1),
      target: 1,
      done: lessonCount >= 1,
      accent: "study"
    }
  ];

  return items.map((item) => ({
    ...item,
    progressText: `${item.value} / ${item.target}`
  }));
}

// ---------------------------------------------------------------------------
// 今日宝箱：3 个今日小任务全做完才解锁，每个本地自然日只能领一次。
//
// 任务完成口径直接复用 buildDailyTasks 的结果，不新增第二套判定；
// 领取状态来自独立的长期成长账本（growthProgress），和任务进度互不写入。
// ---------------------------------------------------------------------------
export function buildHomeDailyChest({
  tasks = [],
  growthProgress = {},
  dateKey = "",
  justClaimed = false
} = {}) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const totalCount = taskList.length;
  const completedCount = taskList.filter((task) => Boolean(task?.done)).length;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const isUnlocked = totalCount > 0 && completedCount >= totalCount;
  const normalizedDateKey = normalizeText(dateKey, 20);
  const isClaimed = Boolean(getDailyChestClaim(growthProgress, normalizedDateKey));
  const stampCount = getExplorerStampCount(growthProgress);

  return {
    dateKey: normalizedDateKey,
    completedCount,
    totalCount,
    remainingCount,
    progressText: `${completedCount} / ${totalCount}`,
    isUnlocked,
    isClaimed,
    canClaim: isUnlocked && !isClaimed,
    statusTone: isClaimed ? "claimed" : isUnlocked ? "ready" : "locked",
    statusLabel: isClaimed ? "今日已领取" : isUnlocked ? "可领取" : "宝箱未解锁",
    hintText: isClaimed
      ? "今天的宝箱已经打开啦，明天做完小任务再来。"
      : isUnlocked
        ? "3 个今日小任务都完成了，快打开宝箱吧。"
        : `再完成 ${remainingCount} 个今日小任务，就能打开宝箱。`,
    actionLabel: "领取今日宝箱",
    // 领取成功后的一次性提示，只在这一天真的领到时出现。
    stampText: "获得 1 枚探险印章",
    showStampReward: Boolean(justClaimed) && isClaimed,
    stampCount
  };
}

// ---------------------------------------------------------------------------
// 首页成长口径：某一章的星星 / 收藏 / 成就，全部从“这一个章节”的 progress 算出来。
//
// 关键点：只认传进来的 chapterProgress（通常来自 homeAdventureChapterProgress），
// 不读 challengeRuntime 当前选中的章节。否则首页档案是二年级、挑战页停在三年级时，
// 会出现“二年级星星 + 三年级收藏/成就”的混口径。
// ---------------------------------------------------------------------------
export function buildChapterGrowthSource({
  chapterProgress = {},
  stageIds = [],
  totalStageCount = 0
} = {}) {
  const resolvedStageIds = Array.isArray(stageIds) ? stageIds : [];
  // 关卡数兜底到真实关卡数，不要退化成 0：
  // 0 会让 route-unlocked 这类“解锁数 >= 关卡数”的判定在空进度下误判为已达成。
  const resolvedTotalStageCount =
    toNonNegativeInteger(totalStageCount) || resolvedStageIds.length || CHALLENGE_STAGES.length;

  return {
    totalStars: Object.values(chapterProgress?.bestResults ?? {}).reduce(
      (total, result) => total + Number(result?.starCount || 0),
      0
    ),
    starTotal: resolvedTotalStageCount * 3,
    rewardCount: countChapterRewards(chapterProgress, resolvedStageIds),
    rewardTotal: resolvedTotalStageCount,
    achievements: evaluateChapterAchievements(chapterProgress, {
      totalStageCount: resolvedTotalStageCount
    })
  };
}

// ---------------------------------------------------------------------------
// 自由探索：把原来平铺的功能入口压成轻量入口。
// ---------------------------------------------------------------------------

export function buildExploreItems({ knowledgeSummary = "", weakPointContext = null, wrongBookSummary = "" } = {}) {
  return [
    {
      id: "knowledge-study",
      icon: "📚",
      title: "知识小讲堂",
      hint: normalizeText(knowledgeSummary, 30) || "看动画讲解，再做这一站的题",
      target: "knowledge-study"
    },
    {
      id: "weak-point",
      icon: "🎯",
      title: "专项强化",
      hint: weakPointContext?.note || "只练一个薄弱点",
      target: "weak-point"
    },
    {
      id: "free-practice",
      icon: "🎒",
      title: "自由练习",
      hint: "按年级、按学科，或者随便练",
      target: "free-practice"
    },
    {
      id: "wrong-review",
      icon: "📝",
      title: "错题本",
      hint: normalizeText(wrongBookSummary, 30) || "答错的题会自动收进来",
      target: "wrong-review"
    }
  ];
}

function isSemesterGrade(grade) {
  return ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"].includes(normalizeText(grade, 16));
}

// 原来的“按年级练 / 按学科练 / 随便练”三个大按钮收进自由探索里的一个小面板，
// 但三种进入方式一个都不少，只是不再同时抢首页视觉。
export function buildPracticeScope({
  gradePracticeGrade = "",
  gradePracticeSemester = "",
  subjectPracticeSubject = "",
  subjectPracticeGrade = "",
  subjectPracticeSemester = ""
} = {}) {
  const gradeLabel = [normalizeText(gradePracticeGrade, 16), normalizeText(gradePracticeSemester, 16)].filter(Boolean).join(" · ");
  const subjectSegments = [normalizeText(subjectPracticeSubject, 16), normalizeText(subjectPracticeGrade, 16)].filter(Boolean);

  if (isSemesterGrade(subjectPracticeGrade)) {
    const semester = normalizeText(subjectPracticeSemester, 16);

    if (semester) {
      subjectSegments.push(semester);
    }
  }

  return [
    {
      id: "grade-practice",
      label: "按年级练",
      meta: gradeLabel || "按年级选题目",
      ariaLabel: `按年级练，当前 ${gradeLabel || "未选择"}`
    },
    {
      id: "subject-practice",
      label: "按学科练",
      meta: subjectSegments.join(" · ") || "按学科选题目",
      ariaLabel: `按学科练，当前 ${subjectSegments.join(" · ") || "未选择"}`
    },
    {
      id: "free-practice",
      label: "随便练",
      meta: "不限年级学科",
      ariaLabel: "随便练，不限年级学科"
    }
  ];
}

export function buildHomeDashboard({
  dateKey = "",
  welcome = {},
  grade = "",
  semester = "",
  reviewDueCount = 0,
  dailyTasks = {},
  growthProgress = {},
  justClaimedDailyChest = false,
  knowledgeSummary = "",
  wrongBookSummary = "",
  resume = null,
  weakPointKnowledgeTag = "",
  weakPointKnowledgeLessonId = "",
  practiceScope = [],
  adventureSource = {},
  growthSource = {},
  achievements = []
} = {}) {
  const gradeLabel = [normalizeText(grade, 16), normalizeText(semester, 16)].filter(Boolean).join(" · ");
  // 专项强化只跟档案年级：不走章节年级 fallback，避免三年级看到二年级专项。
  const weakPointContext = {
    ...resolveWeakPointContext({ preferredGrade: grade }),
    knowledgeTag: normalizeText(weakPointKnowledgeTag, 24),
    lessonId: normalizeText(weakPointKnowledgeLessonId, 60)
  };
  const adventure = buildHomeAdventure(adventureSource);
  // 今日宝箱和今日小任务共用同一份任务判定结果，避免两处口径漂移。
  const dailyTaskItems = buildDailyTasks({ tasks: dailyTasks });
  const normalizedDateKey = normalizeText(dateKey, 20);
  const growth = buildHomeGrowth({
    ...growthSource,
    stampCount: getExplorerStampCount(growthProgress),
    achievements
  });
  // 行动建议由确定性规则给出（AI 欢迎文案不参与决策）；
  // 但欢迎区只展示 review / study / weak-point 这三类“更该先做的事”，
  // 主线相关的 challenge / explore 交给「今天的探险」主卡，避免首屏重复指挥。
  const advice = buildHomeAdvice({
    reviewDueCount,
    resume,
    weakPointContext,
    adventure
  });
  const welcomeSummary = buildHomeWelcomeSummary(advice);

  return {
    dateKey: normalizedDateKey,
    greeting: {
      eyebrow: normalizeText(welcome.eyebrow, 20) || "欢迎回来",
      title: normalizeText(welcome.title, 40) || "今天想去哪座岛看看？",
      profileChip: normalizeText(welcome.profileChip, 24) || gradeLabel,
      gradeLabel,
      themeTone: normalizeText(welcome.themeTone, 16) || "morning",
      summary: welcomeSummary,
      summarySource: welcomeSummary ? "advice" : ""
    },
    advice,
    adventure,
    growth,
    // 成长纪念册的首页入口：只给文案，不含计数——首页本轮不从服务端取足迹。
    growthBookEntry: buildHomeGrowthBookEntry(),
    // 想一起做的首页入口：同样只有文案，没有「还剩几件」这种压力。
    growthPlansEntry: buildHomeGrowthPlansEntry(),
    dailyTasks: dailyTaskItems,
    dailyChest: buildHomeDailyChest({
      tasks: dailyTaskItems,
      growthProgress,
      dateKey: normalizedDateKey,
      justClaimed: justClaimedDailyChest
    }),
    teacherTips: buildTeacherTips({
      reviewDueCount,
      weakPointContext,
      resume
    }),
    exploreItems: buildExploreItems({
      knowledgeSummary,
      weakPointContext,
      wrongBookSummary
    }),
    practiceScope:
      Array.isArray(practiceScope) && practiceScope.length > 0 ? practiceScope : buildPracticeScope(),
    weakPoint: weakPointContext
  };
}
