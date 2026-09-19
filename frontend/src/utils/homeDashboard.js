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
// 专项强化年级：必须跟随真实档案，不再固定落在二年级。
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

export function resolveWeakPointContext({ preferredGrade = "", fallbackGrades = [] } = {}) {
  const normalizedPreferredGrade = normalizeText(preferredGrade, 16);
  const candidates = [normalizedPreferredGrade, ...fallbackGrades, ...WEAK_POINT_GRADE_OPTIONS]
    .map((grade) => normalizeText(grade, 16))
    .filter((grade, index, list) => grade && list.indexOf(grade) === index);

  for (const grade of candidates) {
    const weakPointCount = countWeakPointsForGrade(grade);

    if (weakPointCount > 0) {
      return {
        grade,
        weakPointCount,
        isPreferredGrade: Boolean(normalizedPreferredGrade) && grade === normalizedPreferredGrade,
        status: grade === normalizedPreferredGrade || !normalizedPreferredGrade ? "ready" : "preparing",
        note:
          grade === normalizedPreferredGrade || !normalizedPreferredGrade
            ? `${grade} · 共 ${weakPointCount} 个知识点`
            : "专项内容准备中"
      };
    }
  }

  return {
    grade: "",
    weakPointCount: 0,
    isPreferredGrade: false,
    status: "unavailable",
    note: "专项内容准备中"
  };
}

// ---------------------------------------------------------------------------
// 成就：首页只做摘要，完整列表仍留在“我的探险背包”。
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
  rewardCount = 0,
  rewardTotal = 0,
  achievements = []
} = {}) {
  const achievementList = Array.isArray(achievements) ? achievements : [];
  const unlockedCount = achievementList.filter((achievement) => achievement?.isUnlocked).length;
  const nextAchievement = selectNextAchievement(achievementList);

  return {
    totalStars: toNonNegativeInteger(totalStars),
    rewardCount: toNonNegativeInteger(rewardCount),
    rewardTotal: toNonNegativeInteger(rewardTotal),
    rewardText: `${toNonNegativeInteger(rewardCount)} / ${toNonNegativeInteger(rewardTotal)}`,
    achievementCount: unlockedCount,
    achievementTotal: achievementList.length,
    achievementText: `${unlockedCount} / ${achievementList.length}`,
    nextAchievement,
    allAchievementsDone: achievementList.length > 0 && unlockedCount >= achievementList.length
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
  stageCount = 0
} = {}) {
  const resolvedStage = nextStage || currentStage || null;
  const totalStars = toNonNegativeInteger(chapterTotalStars);
  const rawStarsEarned = toNonNegativeInteger(chapterStarsEarned);
  const starsEarned = totalStars > 0 ? Math.min(rawStarsEarned, totalStars) : rawStarsEarned;

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
    stageLabel: resolvedStage
      ? `第 ${toNonNegativeInteger(resolvedStage.order) || 1} 关 · ${normalizeText(resolvedStage.title, 24)}`
      : "这条路线已经走完啦",
    starsEarned,
    totalStars,
    starText: `${starsEarned} / ${totalStars}`,
    goLabel: resolvedStage ? `继续第 ${toNonNegativeInteger(resolvedStage.order) || 1} 关` : "回到大地图看看",
    goalText: resolvedStage
      ? `再获得 1 颗星，就离下一站更近啦`
      : "这一章已经全部通关，可以去别的岛看看",
    goalAction: resolvedStage ? "再拿 1 颗星" : "换一座岛"
  };
}

// ---------------------------------------------------------------------------
// 欢迎区行动建议：复用 existing 的 reviewDueCount / resume / 薄弱点数据。
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

  return {
    id: "explore",
    contextKey: "explore",
    icon: "🧭",
    text: "今天的路线都准备好了，先闯一关试试看吧。"
  };
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
// 今日小任务：目标固定，进度来自本地日进度 + 今日真实记录。
// ---------------------------------------------------------------------------

export function buildDailyTasks({ tasks = {}, reviewedTodayCount = 0 } = {}) {
  const storedReviewedCount = (Array.isArray(tasks?.reviewedQuestionIds)
    ? tasks.reviewedQuestionIds.length
    : 0);
  const reviewedCount = Math.max(storedReviewedCount, toNonNegativeInteger(reviewedTodayCount));
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
  reviewedTodayCount = 0,
  dailyTasks = {},
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
  const weakPointContext = {
    ...resolveWeakPointContext({
      preferredGrade: grade,
      fallbackGrades: [adventureSource?.chapter?.grade]
    }),
    knowledgeTag: normalizeText(weakPointKnowledgeTag, 24),
    lessonId: normalizeText(weakPointKnowledgeLessonId, 60)
  };
  const adventure = buildHomeAdventure(adventureSource);
  const growth = buildHomeGrowth({
    ...growthSource,
    achievements
  });

  return {
    dateKey: normalizeText(dateKey, 20),
    greeting: {
      eyebrow: normalizeText(welcome.eyebrow, 20) || "欢迎回来",
      title: normalizeText(welcome.title, 40) || "今天想去哪座岛看看？",
      profileChip: normalizeText(welcome.profileChip, 24) || gradeLabel,
      gradeLabel,
      themeTone: normalizeText(welcome.themeTone, 16) || "morning",
      summary: normalizeText(welcome.summary, 60),
      summarySource: normalizeText(welcome.summarySource, 16)
    },
    advice: buildHomeAdvice({
      reviewDueCount,
      resume,
      weakPointContext,
      adventure
    }),
    adventure,
    growth,
    dailyTasks: buildDailyTasks({
      tasks: dailyTasks,
      reviewedTodayCount
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
