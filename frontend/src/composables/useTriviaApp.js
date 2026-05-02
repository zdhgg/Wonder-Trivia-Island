import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { playStudyNarration, stopStudyNarration } from "../audio/studyNarrationEngine";
import { playAudioCue, syncAudioSettings, unlockAudioEngine } from "../audio/audioEngine";
import { APP_ROUTE_NAME } from "../router";
import {
  fetchQuestionCoverage,
  fetchQuestionStats,
  fetchRandomQuestions,
  generateHomeWelcomeMessage,
  generateQuestionReviewSpeech
} from "../services/questionsApi";
import { SETTINGS_DEFAULT_SECTION_ID, SETTINGS_SECTION_IDS, getSettingsSectionById, getSettingsSectionByRouteSlug } from "../components/settings/settingsSections";
import { TOOL_DEFAULT_SECTION_ID, TOOL_SECTION_IDS, getToolSectionById, getToolSectionByRouteSlug } from "../components/tools/toolSections";
import { useAudioStore } from "../stores/useAudioStore";
import { useQuizStore } from "../stores/useQuizStore";
import { DEFAULT_PROFILE, HOME_WELCOME_VOICE_MODE, useSettingsStore } from "../stores/useSettingsStore";
import {
  buildHomeWelcomeEyebrow,
  buildHomeWelcomeContextHash,
  buildHomeWelcomeFallbackLine,
  buildHomeWelcomeFallbackSpeechText,
  buildHomeWelcomeTemporalContext,
  buildHomeWelcomeTitle,
  buildHomeWelcomeVoiceButtonLabel,
  getHomeWelcomeDateKey,
  markHomeWelcomeVisited,
  normalizeHomeWelcomeLine,
  normalizeHomeWelcomeSpeechText,
  readHomeWelcomeAutoSpeechDate,
  readHomeWelcomeCache,
  readHomeWelcomeVisitDate,
  markHomeWelcomeAutoSpeechPlayed,
  writeHomeWelcomeCache
} from "../utils/homeWelcomeMessage";
import { createAppRouting } from "./app/useAppRouting";
import { createHomeSelections } from "./app/useHomeSelections";
import { createStudyRecordRuntime } from "./app/useStudyRecordRuntime";
import { createChallengeRuntime } from "./challenge/useChallengeRuntime";
import { createQuizSession } from "./quiz/useQuizSession";
import { createQuizSettings } from "./quiz/useQuizSettings";
import {
  CHALLENGE_STAGES,
  CHALLENGE_CHAPTERS,
  DEFAULT_CHALLENGE_CHAPTER_ID,
  getChallengeStage,
  getChallengeChapter,
  getChallengeStageConfig,
  getChallengeStageList,
  supportsChallengeSemester,
  getNormalizedChallengeActiveChapterId,
  getChallengeChapterBySelection,
  getStageStarCount,
  getStageStarText,
  normalizeChallengeProgress,
  mergeChallengeProgress,
  isChallengeProgressEqual,
  normalizeChallengeProgressBook,
  getChallengeChapterProgress,
  mergeChallengeProgressBooks,
  isChallengeProgressBookEqual,
  buildChallengeOutcome
} from "./challenge/challengeConfig";
import {
  CHALLENGE_ACHIEVEMENTS,
  evaluateChallengeAchievements,
  mergeChallengeAchievementStates,
  normalizeChallengeAchievementStates
} from "../utils/challengeAchievements";
import { evaluateStageMission } from "../utils/challengeStageRules";
import {
  STUDY_RECORD_BOOK_STORAGE_KEY,
  buildKnowledgeSummaryList,
  createStudyRecordBook,
  getKnowledgeTagLabel,
  getPendingReviewQuestionIds,
  getQuestionMasteryPercent,
  getQuestionReviewSchedule,
  getQuestionReviewStatus,
  isStudyRecordBookEqual,
  listQuestionSnapshotsByIds,
  listWrongStudyQuestionRecords,
  mergeStudyRecordBooks,
  normalizeStudyRecordBook,
  recordStudyAttempt
} from "../utils/studyRecordBook";

export function useTriviaApp() {
  const router = useRouter();
  const route = useRoute();
  const VIEW_MODE = Object.freeze({
    HOME: "home",
    CHALLENGE: "challenge",
    QUIZ: "quiz",
    STUDY: "study",
    STUDY_PLAYER: "study-player",
    WRONG_BOOK: "wrong-book",
    TOOLS: "tools",
    CATALOG: "catalog",
    IMPORT: "import",
    SETTINGS: "settings"
  });

  const PLAY_MODE = Object.freeze({
    FREE: "free",
    CHALLENGE: "challenge"
  });

  const QUIZ_PRACTICE_SOURCE = Object.freeze({
    GENERAL: "general",
    KNOWLEDGE: "knowledge",
    WRONG_BOOK: "wrong-book"
  });

  const SUBJECT_OPTIONS = Object.freeze(["全部学科", "语文", "数学", "英语"]);

  const GRADE_OPTIONS = Object.freeze(["全部年级", "一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);

  const SEMESTER_OPTIONS = Object.freeze(["全部学期", "上册", "下册"]);

  const QUESTION_COUNT_OPTIONS = Object.freeze([
    { label: "3 题", value: "3" },
    { label: "5 题", value: "5" },
    { label: "10 题", value: "10" }
  ]);

  const DIFFICULTY_OPTIONS = Object.freeze([
    { label: "全部难度", value: "" },
    { label: "1 星难度", value: "1" },
    { label: "2 星难度", value: "2" },
    { label: "3 星难度", value: "3" }
  ]);

  const TIME_LIMIT_OPTIONS = Object.freeze([
    { label: "不限时", value: "0" },
    { label: "15 秒", value: "15" },
    { label: "30 秒", value: "30" },
    { label: "45 秒", value: "45" },
    { label: "60 秒", value: "60" }
  ]);

  const SCORE_OPTIONS = Object.freeze([
    { label: "5 分", value: "5" },
    { label: "10 分", value: "10" },
    { label: "20 分", value: "20" }
  ]);

  const DEFAULT_QUIZ_SETTINGS = Object.freeze({
    selectedSubject: "全部学科",
    selectedGrade: "全部年级",
    selectedSemester: "全部学期",
    selectedQuestionCount: "3",
    selectedDifficulty: "",
    selectedTimeLimitSeconds: "0",
    selectedPointsPerCorrect: "10"
  });

  const QUIZ_SETTINGS_STORAGE_KEY = "wonder-trivia-island.quiz.settings";
  const QUIZ_SESSION_STORAGE_KEY = "wonder-trivia-island.quiz.session";

  const CHALLENGE_PROGRESS_STORAGE_KEY = "wonder-trivia-island.challenge.progress";

  const CHALLENGE_PERSISTENCE_STATE = Object.freeze({
    SYNCING: "syncing",
    SYNCED: "synced",
    LOCAL: "local"
  });

  const CHALLENGE_COVERAGE_STATUS = Object.freeze({
    IDLE: "idle",
    LOADING: "loading",
    READY: "ready",
    ERROR: "error"
  });

  const WRONG_REVIEW_SESSION_LIMIT = 10;

  const DEFAULT_QUESTION_STATS = Object.freeze({
    topKnowledgeTags: []
  });

  const knowledgeStudyRuntime = shallowRef(null);
  let knowledgeStudyRuntimePromise = null;

  async function ensureKnowledgeStudyRuntime() {
    if (knowledgeStudyRuntime.value) {
      return knowledgeStudyRuntime.value;
    }

    if (!knowledgeStudyRuntimePromise) {
      knowledgeStudyRuntimePromise = import("../utils/knowledgeStudy.js")
        .then((module) => {
          knowledgeStudyRuntime.value = Object.freeze({
            buildSystematicKnowledgeCards: module.buildSystematicKnowledgeCards,
            buildSystematicKnowledgeSections: module.buildSystematicKnowledgeSections
          });
          return knowledgeStudyRuntime.value;
        })
        .catch((error) => {
          knowledgeStudyRuntimePromise = null;
          throw error;
        });
    }

    return knowledgeStudyRuntimePromise;
  }

  function formatRecentDateLabel(value) {
    if (!value) {
      return "刚刚更新";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "最近更新";
    }

    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays <= 0) {
      return "今天";
    }

    if (diffDays === 1) {
      return "昨天";
    }

    if (diffDays < 7) {
      return `${diffDays} 天前`;
    }

    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }

  function formatKnowledgeRouteGradeLabel(sections = []) {
    const grades = [...new Set(sections.map((section) => String(section?.grade || "").trim()).filter(Boolean))];

    if (!grades.length) {
      return "知识路线";
    }

    if (grades.length === 1) {
      return grades[0];
    }

    const first = grades[0].replace("年级", "");
    const last = grades[grades.length - 1].replace("年级", "");
    return `${first}到${last}年级`;
  }

  function buildHomeKnowledgeHighlightMeta(item) {
    return [item?.primaryGrade, item?.primarySemester, item?.primarySubject].filter(Boolean).join(" · ");
  }

  function compareHomeKnowledgeHighlights(left, right) {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    if (left.priority === 0 && left.dueCount !== right.dueCount) {
      return right.dueCount - left.dueCount;
    }

    if (left.priority === 2 && left.masteryPercent !== right.masteryPercent) {
      return left.masteryPercent - right.masteryPercent;
    }

    if (left.priority === 1 && left.matchedCount !== right.matchedCount) {
      return left.matchedCount - right.matchedCount;
    }

    return left.index - right.index;
  }

  function buildHomeKnowledgeHighlights(items = [], limit = 2) {
    return items
      .map((item, index) => ({
        id: item.id || `${item.label}-${index}`,
        label: item.label,
        meta: buildHomeKnowledgeHighlightMeta(item),
        badge: buildHomeKnowledgeHighlightBadge(item),
        tone: item.stageTone || "planned",
        priority: getHomeKnowledgeHighlightPriority(item),
        dueCount: Number(item.dueCount || 0),
        matchedCount: Number(item.matchedCount || 0),
        masteryPercent: Number(item.masteryPercent || 0),
        index
      }))
      .sort(compareHomeKnowledgeHighlights)
      .slice(0, limit)
      .map(({ id, label, meta, badge, tone }) => ({
        id,
        label,
        meta,
        badge,
        tone
      }));
  }

  function getHomeKnowledgeHighlightPriority(item) {
    if ((item?.dueCount || 0) > 0) {
      return 0;
    }

    if ((item?.matchedCount || 0) === 0) {
      return 1;
    }

    return 2;
  }

  function buildHomeKnowledgeHighlightBadge(item) {
    if ((item?.dueCount || 0) > 0) {
      return `回看 ${item.dueCount} 题`;
    }

    if ((item?.matchedCount || 0) === 0) {
      return "现在开始";
    }

    return "继续学习";
  }

  function buildHomeKnowledgeGradeNote({ dueModuleCount, subjectLabel, lessonCount }) {
    if (dueModuleCount > 0) {
      return `${dueModuleCount} 站待回看`;
    }

    if (subjectLabel) {
      return subjectLabel;
    }

    if (lessonCount > 0) {
      return "现在开始";
    }

    return "进入路线";
  }

  const KNOWLEDGE_GRADE_ORDER = Object.freeze(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);

  function getHomeKnowledgeGradeCover(grade) {
    if (grade === "一年级") {
      return {
        glyph: "芽",
        coverLabel: "启蒙小岛",
        tagline: "先把识字、拼音和数感种进小脑袋",
        theme: "sprout"
      };
    }

    if (grade === "二年级") {
      return {
        glyph: "桥",
        coverLabel: "进阶小桥",
        tagline: "把会的本领连起来，越学越顺手",
        theme: "bridge"
      };
    }

    if (grade === "三年级") {
      return {
        glyph: "帆",
        coverLabel: "远航码头",
        tagline: "开始独立学新本领，敢做更长的小任务",
        theme: "voyage"
      };
    }

    if (grade === "四年级") {
      return {
        glyph: "峰",
        coverLabel: "探索山径",
        tagline: "先从阅读、乘除笔算和英语场景这些第一批小站开始往前走。",
        theme: "summit"
      };
    }

    if (grade === "五年级") {
      return {
        glyph: "塔",
        coverLabel: "思维塔楼",
        tagline: "先从小数、分数、阅读概括和英语短文这些主线继续往上搭。",
        theme: "tower"
      };
    }

    if (grade === "六年级") {
      return {
        glyph: "星",
        coverLabel: "毕业星港",
        tagline: "把百分数、圆和综合阅读这些毕业前的小本领稳稳接好。",
        theme: "starport"
      };
    }

    return {
      glyph: "书",
      coverLabel: "知识路线",
      tagline: "挑一个年级，顺着路线慢慢学",
      theme: "library"
    };
  }

  function getQuestionOptionText(question, optionKey) {
    if (!optionKey) {
      return "";
    }

    const matchedOption = Array.isArray(question?.options)
      ? question.options.find((option) => option?.key === optionKey)
      : null;

    return matchedOption?.text || "";
  }

  const quizStore = useQuizStore();

  const audioStore = useAudioStore();
  const settingsStore = useSettingsStore();

  audioStore.hydratePreferences();
  settingsStore.hydrate();

  const quizSettings = createQuizSettings({
    SUBJECT_OPTIONS,
    GRADE_OPTIONS,
    SEMESTER_OPTIONS,
    QUESTION_COUNT_OPTIONS,
    DIFFICULTY_OPTIONS,
    TIME_LIMIT_OPTIONS,
    SCORE_OPTIONS,
    QUIZ_SETTINGS_STORAGE_KEY,
    DEFAULT_QUIZ_SETTINGS
  });
  const {
    normalizeSelectValue,
    supportsSemesterSelection,
    normalizeQuizSettings,
    getDifficultyLabel,
    selectedSubject,
    selectedGrade,
    selectedSemester,
    selectedQuestionCount,
    selectedDifficulty,
    selectedTimeLimitSeconds,
    selectedPointsPerCorrect,
    draftSelectedSubject,
    draftSelectedGrade,
    draftSelectedSemester,
    draftSelectedQuestionCount,
    draftSelectedDifficulty,
    draftSelectedTimeLimitSeconds,
    draftSelectedPointsPerCorrect,
    selectedSubjectValue,
    selectedGradeValue,
    shouldShowSemesterFilter,
    selectedQuestionCountValue,
    selectedDifficultyValue,
    selectedDifficultyLabel,
    selectedTimeLimitSecondsValue,
    selectedPointsPerCorrectValue,
    draftShouldShowSemesterFilter,
    applyQuizSettings,
    syncDraftQuizSettings,
    hydrateQuizSettings,
    persistQuizSettings,
    handleDraftGradeChange
  } = quizSettings;

  const isQuizSettingsOpen = ref(false);

  const isAudioSettingsOpen = ref(false);

  const adminKey = ref("");

  const questionStats = ref(DEFAULT_QUESTION_STATS);

  const wrongBookFocusTag = ref("");

  const catalogPrefill = ref(null);
  const appRouting = createAppRouting({
    router,
    route,
    VIEW_MODE,
    APP_ROUTE_NAME,
    TOOL_SECTION_IDS,
    TOOL_DEFAULT_SECTION_ID,
    SETTINGS_SECTION_IDS,
    SETTINGS_DEFAULT_SECTION_ID,
    getToolSectionById,
    getToolSectionByRouteSlug,
    getSettingsSectionById,
    getSettingsSectionByRouteSlug
  });
  const {
    currentView,
    studyInitialGradeFilter,
    selectedStudyLessonId,
    activeToolSectionId,
    activeSettingsSectionId,
    normalizeToolSectionId,
    normalizeSettingsSectionId,
    showHomeView,
    showChallengeView,
    showQuizView,
    showStudyView,
    showStudyLessonPlayerView,
    closeStudyLessonPlayerView,
    showWrongBookView,
    showToolsView
  } = appRouting;
  const challengeRuntime = createChallengeRuntime({
    CHALLENGE_PERSISTENCE_STATE,
    CHALLENGE_STAGES,
    CHALLENGE_CHAPTERS,
    DEFAULT_CHALLENGE_CHAPTER_ID,
    normalizeChallengeProgress,
    normalizeChallengeProgressBook,
    mergeChallengeProgressBooks,
    isChallengeProgressBookEqual,
    getChallengeChapter,
    getChallengeStageConfig,
    getChallengeStageList,
    getChallengeChapterProgress,
    getNormalizedChallengeActiveChapterId,
    getDifficultyLabel,
    CHALLENGE_ACHIEVEMENTS,
    evaluateChallengeAchievements,
    selectedSubjectValue,
    CHALLENGE_COVERAGE_STATUS,
    fetchQuestionCoverage,
    CHALLENGE_PROGRESS_STORAGE_KEY
  });
  const {
    selectedChallengeChapterId,
    selectedStageId,
    challengeProgressBook,
    challengeProgress,
    latestChallengeOutcome,
    challengeCoverage,
    challengePersistenceState,
    currentChallengeChapter,
    currentChallengeChapterLabel,
    currentChallengeRouteTitle,
    currentChallengeRouteFocus,
    currentStage,
    currentStageIndex,
    currentStageLabel,
    currentStageBestResult,
    challengeRewardCount,
    challengeRewardProgressLabel,
    challengeAchievements,
    challengeAchievementCount,
    challengeAchievementProgressLabel,
    isChallengeCoverageLoading,
    clearChallengeOutcome,
    setSelectedChallengeChapter,
    applyChallengeProgress,
    applyChallengeProgressBook,
    hydrateChallengeProgress,
    persistChallengeProgressCache,
    syncChallengeProgressFromServer,
    persistChallengeProgress,
    restoreChallengeProgressBook,
    loadChallengeCoverage,
    disposeChallengeRuntime
  } = challengeRuntime;
  const quizSession = createQuizSession({
    PLAY_MODE,
    QUIZ_PRACTICE_SOURCE,
    QUIZ_SESSION_STORAGE_KEY,
    CHALLENGE_STAGES,
    getNormalizedChallengeActiveChapterId,
    quizRouteName: APP_ROUTE_NAME.QUIZ,
    getCurrentRouteName: () => route.name,
    getCurrentRouteQuery: () => route.query,
    selectedChallengeChapterId,
    selectedStageId,
    challengeProgress,
    setSelectedChallengeChapter,
    getSelectedSubjectValue: () => selectedSubjectValue.value,
    getSelectedGradeValue: () => selectedGradeValue.value,
    getSelectedSemesterValue: () => selectedSemesterValue.value,
    getActiveKnowledgeTagFilter: () => activeKnowledgeTagFilter.value,
    getActiveQuestionCountValue: () => activeQuestionCountValue.value,
    getActiveDifficultyValue: () => activeDifficultyValue.value,
    getPendingWrongQuestionIds: () => pendingWrongQuestionIds.value,
    resolveWrongBookQuestionSnapshots: (questionIds) => listQuestionSnapshotsByIds(studyRecordBook.value, questionIds),
    fetchRandomQuestions,
    clearChallengeOutcome,
    resetQuiz: () => quizStore.resetQuiz()
  });
  const {
    questions,
    isLoading,
    errorMessage,
    playMode,
    quizPracticeContext,
    isChallengeMode,
    isKnowledgePractice,
    isWrongBookPractice,
    enableQuizSessionPersistence,
    persistQuizSession,
    setQuizPracticeContext,
    resetQuizPracticeContext,
    restoreQuizSessionForCurrentRoute,
    loadQuestions,
    disposeQuizSession
  } = quizSession;

  const { audioReady, isSupported: isAudioSupported, masterVolume, musicEnabled, musicVolume, sfxEnabled, sfxVolume } =
    storeToRefs(audioStore);

  const refreshButtonClass = computed(() => [
    "btn-cartoon",
    "btn-cartoon--mint",
    { "btn-cartoon--loading": isLoading.value }
  ]);

  const isQuizView = computed(() => currentView.value === VIEW_MODE.QUIZ);

  const activeKnowledgeTagFilter = computed(() =>
    isChallengeMode.value
      ? currentStage.value.knowledgeTag || ""
      : isKnowledgePractice.value
        ? quizPracticeContext.value.knowledgeTag
        : ""
  );

  const selectedSemesterValue = computed(() => {
    if (isChallengeMode.value) {
      return getChallengeChapter(selectedChallengeChapterId.value).semester || "";
    }

    return shouldShowSemesterFilter.value && selectedSemester.value !== "全部学期" ? selectedSemester.value : "";
  });

  const homeGradeOptions = computed(() => GRADE_OPTIONS.filter((grade) => grade !== DEFAULT_QUIZ_SETTINGS.selectedGrade));

  const homeSubjectOptions = computed(() => SUBJECT_OPTIONS.filter((subject) => subject !== DEFAULT_QUIZ_SETTINGS.selectedSubject));

  const homeSemesterOptions = computed(() =>
    SEMESTER_OPTIONS.filter((semester) => semester !== DEFAULT_QUIZ_SETTINGS.selectedSemester)
  );
  const homeSelections = createHomeSelections({
    GRADE_OPTIONS,
    DEFAULT_QUIZ_SETTINGS,
    selectedSubject,
    selectedGrade,
    selectedSemester,
    selectedChallengeChapterId,
    getChallengeChapter,
    supportsSemesterSelection,
    supportsChallengeSemester,
    homeSemesterOptions,
    defaultChallengeChapterId: DEFAULT_CHALLENGE_CHAPTER_ID,
    getProfileSettings: () => settingsStore.profile
  });
  const {
    homeGradePracticeGrade,
    homeGradePracticeSemester,
    homeChallengeGrade,
    homeChallengeSemester,
    homeSubjectPracticeSubject,
    homeSubjectPracticeGrade,
    homeSubjectPracticeSemester,
    hydrateHomePracticeSelections,
    applyProfileDefaultsToHome
  } = homeSelections;
  const studyRecordRuntime = createStudyRecordRuntime({
    STUDY_RECORD_BOOK_STORAGE_KEY,
    createStudyRecordBook,
    normalizeStudyRecordBook,
    mergeStudyRecordBooks,
    isStudyRecordBookEqual,
    recordStudyAttempt
  });
  const {
    studyRecordBook,
    hydrateStudyRecordBook,
    persistStudyRecordBook,
    syncStudyRecordBookFromServer,
    persistStudyRecordBookToServer,
    restoreStudyRecordBook,
    handleQuizQuestionResolved,
    disposeStudyRecordRuntime
  } = studyRecordRuntime;

  const challengeChapterOptions = computed(() => CHALLENGE_CHAPTERS);

  const homeSubjectPracticeGradeOptions = computed(() => {
    const gradeOptions = [DEFAULT_QUIZ_SETTINGS.selectedGrade, ...homeGradeOptions.value];

    if (homeSubjectPracticeSubject.value === "英语") {
      return gradeOptions.filter((grade) => grade !== "一年级");
    }

    return gradeOptions;
  });

  const selectedScopeLabel = computed(() => {
    const segments = [];

    if (isWrongBookPractice.value) {
      segments.push("错题温习");
    } else {
      segments.push(selectedSubject.value, selectedGrade.value);
    }

    if (!isWrongBookPractice.value && selectedSemesterValue.value) {
      segments.push(selectedSemesterValue.value);
    }

    if (activeKnowledgeTagFilter.value) {
      segments.push(`知识点 ${activeKnowledgeTagFilter.value}`);
    }

    return segments.join(" · ");
  });
  const HOME_WELCOME_SPEAK_DURATION_MS = 2400;
  const homeWelcomeMascotStatus = ref("idle");
  const hasPendingHomeWelcomeSpeech = ref(false);
  const homeWelcomeNow = ref(new Date());
  const homeWelcomeVisitedDate = ref(readHomeWelcomeVisitDate());
  const homeWelcomeAutoSpeechDate = ref(readHomeWelcomeAutoSpeechDate());
  const homeWelcomeVariantIndex = ref(0);
  const homeWelcomeFallbackLine = ref("");
  const homeWelcomeFallbackSpeechText = ref("");
  const homeWelcomeDynamicLine = ref("");
  const homeWelcomeDynamicSpeechText = ref("");
  const isHomeWelcomeProfileJustSaved = ref(false);
  const homeWelcomeLastFailedContextKey = ref("");
  const homeWelcomeSpeechStatus = ref("idle");
  const homeWelcomeSpeechErrorMessage = ref("");
  let homeWelcomeSpeechTimer = 0;
  let homeWelcomeRequestController = null;
  let homeWelcomeSpeechController = null;
  let activeHomeWelcomeSpeechUrl = "";
  let homeWelcomeSpeechUtterance = null;
  const homeWelcomeDisplayName = computed(() => {
    const normalizedName = String(settingsStore.profile.displayName || "").trim();
    return normalizedName || DEFAULT_PROFILE.displayName;
  });
  const isUsingCustomHomeWelcomeName = computed(
    () => homeWelcomeDisplayName.value !== DEFAULT_PROFILE.displayName
  );
  const homeWelcomeProfileChip = computed(() => {
    const grade = String(settingsStore.profile.grade || "").trim();
    const semester = String(settingsStore.profile.semester || "").trim();
    return [grade, semester].filter(Boolean).join(" · ");
  });
  const homeWelcomeVoiceMode = computed(
    () => String(settingsStore.coachingPreferences?.homeWelcomeVoiceMode || HOME_WELCOME_VOICE_MODE.MANUAL).trim() || HOME_WELCOME_VOICE_MODE.MANUAL
  );
  const shouldShowHomeWelcomeVoiceButton = computed(
    () => homeWelcomeVoiceMode.value !== HOME_WELCOME_VOICE_MODE.OFF
  );
  const homeWelcomeSpeechVolume = computed(() =>
    Math.max(0, Math.min(1, Number(masterVolume.value || 0) * Number(sfxVolume.value || 0)))
  );
  const effectiveHomeWelcomeTtsVoice = computed(() => {
    const runtimeVoice = String(settingsStore.effectiveTtsRuntimeConfig?.ttsVoice || "").trim();
    return runtimeVoice || settingsStore.coachingPreferences?.aiReviewVoice || "coral";
  });
  const effectiveHomeWelcomeTtsAudioFormat = computed(() => {
    const runtimeFormat = String(settingsStore.effectiveTtsRuntimeConfig?.ttsAudioFormat || "").trim().toLowerCase();

    if (["mp3", "wav", "pcm16"].includes(runtimeFormat)) {
      return runtimeFormat;
    }

    return "mp3";
  });

  const studyKnowledgeSummaries = computed(() => buildKnowledgeSummaryList(studyRecordBook.value));
  const isKnowledgeRoutesLoading = computed(() => !knowledgeStudyRuntime.value);
  const knowledgeSystematicSections = computed(() =>
    knowledgeStudyRuntime.value
      ? knowledgeStudyRuntime.value.buildSystematicKnowledgeSections(studyKnowledgeSummaries.value)
      : []
  );
  const knowledgeStudyItems = computed(() =>
    knowledgeStudyRuntime.value ? knowledgeStudyRuntime.value.buildSystematicKnowledgeCards(studyKnowledgeSummaries.value) : []
  );
  const selectedStudyLesson = computed(
    () => knowledgeStudyItems.value.find((item) => item.id === selectedStudyLessonId.value) || null
  );
  const nextStudyLesson = computed(() => {
    const currentId = selectedStudyLessonId.value;

    if (!currentId) {
      return null;
    }

    const items = knowledgeStudyItems.value;
    const currentIndex = items.findIndex((item) => item.id === currentId);

    if (currentIndex < 0 || currentIndex >= items.length - 1) {
      return null;
    }

    const current = items[currentIndex];
    const next = items[currentIndex + 1];

    if (
      next.primaryGrade === current.primaryGrade &&
      next.primarySemester === current.primarySemester &&
      next.primarySubject === current.primarySubject
    ) {
      return next;
    }

    return null;
  });

  const wrongQuestionItems = computed(() =>
    listWrongStudyQuestionRecords(studyRecordBook.value).map((record) => {
      const reviewStatus = getQuestionReviewStatus(record);
      const reviewSchedule = getQuestionReviewSchedule(record);
      const masteryPercent = getQuestionMasteryPercent(record);
      const correctOptionText = getQuestionOptionText(record.snapshot, record.correctAnswer);
      const lastSelectedOptionText = getQuestionOptionText(record.snapshot, record.lastSelectedOption);

      return {
        questionId: record.questionId,
        content: record.snapshot.content,
        subject: record.snapshot.subject || "综合",
        grade: record.snapshot.grade || "",
        semester: record.snapshot.semester || "",
        knowledgeTag: getKnowledgeTagLabel(record.snapshot),
        explanation: record.explanation || "继续温习后，这里会保留最新解析。",
        reviewStatus,
        reviewStage: reviewSchedule.stage,
        reviewStatusLabel:
          reviewSchedule.stage === "due"
            ? reviewSchedule.label
            : reviewStatus === "mastered"
              ? "已回稳"
              : reviewStatus === "reviewing"
                ? "回温中"
                : "待温习",
        reviewTone: reviewSchedule.tone,
        reviewScheduleLabel: reviewSchedule.label,
        reviewScheduleShortLabel: reviewSchedule.shortLabel,
        nextReviewAt: reviewSchedule.nextReviewAt,
        isReviewDue: reviewSchedule.isDue,
        isReviewScheduled: reviewSchedule.isScheduled,
        masteryPercent,
        wrongCount: record.wrongCount + record.timeoutCount,
        reviewCorrectStreak: record.reviewCorrectStreak,
        lastAnsweredAt: record.lastAnsweredAt,
        lastAnsweredLabel: formatRecentDateLabel(record.lastAnsweredAt),
        correctAnswerLabel: correctOptionText
          ? `${record.correctAnswer} · ${correctOptionText}`
          : record.correctAnswer || "未记录",
        lastSelectedLabel:
          record.lastSelectedOption === "__timeout__"
            ? "超时未作答"
            : record.lastSelectedOption
              ? `${record.lastSelectedOption}${lastSelectedOptionText ? ` · ${lastSelectedOptionText}` : ""}`
              : "未记录",
        question: record.snapshot
      };
    })
  );

  const pendingWrongQuestionIds = computed(() => getPendingReviewQuestionIds(studyRecordBook.value, WRONG_REVIEW_SESSION_LIMIT));

  const dueWrongQuestionCount = computed(() =>
    wrongQuestionItems.value.filter((item) => item.isReviewDue).length
  );

  const dueKnowledgeTagCount = computed(() =>
    studyKnowledgeSummaries.value.filter((summary) => summary.dueCount > 0).length
  );

  const linkedKnowledgeModuleCount = computed(() =>
    knowledgeStudyItems.value.filter((item) => item.matchedCount > 0).length
  );
  const knowledgeRouteGradeLabel = computed(() =>
    isKnowledgeRoutesLoading.value ? "知识路线" : formatKnowledgeRouteGradeLabel(knowledgeSystematicSections.value)
  );
  const knowledgeRouteSemesterLabel = computed(() =>
    isKnowledgeRoutesLoading.value
      ? "加载中"
      : knowledgeSystematicSections.value.length
        ? `${knowledgeSystematicSections.value.length} 册路线`
        : "知识路线"
  );
  const homeKnowledgeGradeEntries = computed(() => {
    if (isKnowledgeRoutesLoading.value) {
      return [];
    }

    return KNOWLEDGE_GRADE_ORDER.map((grade) => {
      const gradeItems = knowledgeStudyItems.value.filter((item) => item.isSystematic && item.primaryGrade === grade);
      const subjectLabel = [...new Set(gradeItems.map((item) => item.primarySubject).filter(Boolean))].slice(0, 3).join(" · ");
      const dueModuleCount = gradeItems.filter((item) => Number(item.dueCount || 0) > 0).length;
      const litModuleCount = gradeItems.filter((item) => Number(item.matchedCount || 0) > 0).length;
      const lessonCount = gradeItems.length;
      const hasRouteContent = lessonCount > 0;
      const cover = getHomeKnowledgeGradeCover(grade);

      return {
        id: grade,
        label: grade,
        meta: hasRouteContent ? `${lessonCount} 站` : "筹备中",
        note: buildHomeKnowledgeGradeNote({ dueModuleCount, subjectLabel, lessonCount }),
        tone: dueModuleCount > 0 ? "alert" : litModuleCount > 0 ? "calm" : "planned",
        glyph: cover.glyph,
        coverLabel: cover.coverLabel,
        tagline: cover.tagline,
        theme: cover.theme,
        previewHighlights: buildHomeKnowledgeHighlights(gradeItems),
        hasRouteContent
      };
    });
  });
  const openKnowledgeGradeCount = computed(
    () => homeKnowledgeGradeEntries.value.filter((entry) => entry.hasRouteContent).length
  );
  const plannedKnowledgeGradeCount = computed(
    () => homeKnowledgeGradeEntries.value.filter((entry) => !entry.hasRouteContent).length
  );
  const homeKnowledgeHighlights = computed(() =>
    isKnowledgeRoutesLoading.value ? [] : buildHomeKnowledgeHighlights(knowledgeStudyItems.value)
  );

  const pendingWrongQuestionCount = computed(() =>
    wrongQuestionItems.value.filter((item) => item.reviewStatus !== "mastered").length
  );

  const scheduledWrongQuestionCount = computed(() =>
    wrongQuestionItems.value.filter((item) => item.isReviewScheduled).length
  );

  const reviewingWrongQuestionCount = computed(() =>
    wrongQuestionItems.value.filter((item) => item.reviewStatus === "reviewing").length
  );

  const masteredWrongQuestionCount = computed(() =>
    wrongQuestionItems.value.filter((item) => item.reviewStatus === "mastered").length
  );

  const homeKnowledgeSpotlight = computed(() => ({
    eyebrow: "",
    title: "知识小讲堂",
    summary: isKnowledgeRoutesLoading.value
      ? "知识路线加载中，马上就好。"
      : knowledgeSystematicSections.value.length
        ? plannedKnowledgeGradeCount.value
          ? `${openKnowledgeGradeCount.value} 个年级已开放，其余年级路线筹备中。`
          : "全部年级已开放，选年级后进入路线。"
        : "知识路线准备中。",
    primaryValue: isKnowledgeRoutesLoading.value ? "..." : `${openKnowledgeGradeCount.value}`,
    primaryLabel: isKnowledgeRoutesLoading.value ? "加载中" : "已开",
    secondaryValue: isKnowledgeRoutesLoading.value
      ? "..."
      : `${plannedKnowledgeGradeCount.value > 0 ? plannedKnowledgeGradeCount.value : dueKnowledgeTagCount.value}`,
    secondaryLabel: isKnowledgeRoutesLoading.value ? "请稍候" : plannedKnowledgeGradeCount.value > 0 ? "筹备中" : "待补强",
    gradeEntries: homeKnowledgeGradeEntries.value,
    highlights: homeKnowledgeHighlights.value,
    chips: isKnowledgeRoutesLoading.value ? [] : knowledgeSystematicSections.value.slice(0, 3).map((section) => section.title),
    queueTitle: isKnowledgeRoutesLoading.value ? "准备中" : "推荐",
    isLoading: isKnowledgeRoutesLoading.value
  }));

  const homeWrongBookSpotlight = computed(() => ({
    eyebrow: "",
    title: "错题温习",
    summary: wrongQuestionItems.value.length
      ? "今天到期的题会排在最前面。"
      : "答错后会自动收进错题本。",
    primaryValue: `${dueWrongQuestionCount.value}`,
    primaryLabel: "今日到期",
    secondaryValue: `${scheduledWrongQuestionCount.value}`,
    secondaryLabel: "已排队",
    chips: (
      wrongQuestionItems.value.length
        ? wrongQuestionItems.value.map((item) => item.knowledgeTag)
        : knowledgeStudyItems.value.map((item) => item.label)
    ).slice(0, 3)
  }));

  const knowledgeStudyOverview = computed(() => ({
    title: "知识小讲堂",
    description: isKnowledgeRoutesLoading.value
      ? "整册路线和讲堂卡片正在加载，马上就好。"
      : linkedKnowledgeModuleCount.value
        ? `这里先按${knowledgeRouteGradeLabel.value}直接排出学习小站，再把你做过的题慢慢挂到对应模块上。`
        : "这里先放整册路线和学习小站，不用等刷题后才看到讲解。",
    stats: isKnowledgeRoutesLoading.value
      ? [
          { label: "系统路线", value: "加载中" },
          { label: "学习小站", value: "..." },
          { label: "已连模块", value: "..." },
          { label: "待补强", value: "..." }
        ]
      : [
          { label: "系统路线", value: knowledgeRouteSemesterLabel.value },
          { label: "学习小站", value: `${knowledgeStudyItems.value.length}` },
          { label: "已连模块", value: `${linkedKnowledgeModuleCount.value}` },
          { label: "待补强", value: `${dueKnowledgeTagCount.value}` }
        ]
  }));

  const wrongBookOverview = computed(() => ({
    title: "错题温习",
    description: wrongQuestionItems.value.length
      ? "答错后会立即进入今天队列，回温答对一次会排到明天，再答对一次会转成已回稳。"
      : "答错的题会自动进入这里，后面可以按题或按知识点重新温习。",
    stats: [
      { label: "今日到期", value: `${dueWrongQuestionCount.value}` },
      { label: "已排队", value: `${scheduledWrongQuestionCount.value}` },
      { label: "回温中", value: `${reviewingWrongQuestionCount.value}` },
      { label: "已回稳", value: `${masteredWrongQuestionCount.value}` }
    ]
  }));

  const homeChallengeChapter = computed(() =>
    getChallengeChapterBySelection(homeChallengeGrade.value, homeChallengeSemester.value)
  );

  const homeChallengeLabel = computed(() => homeChallengeChapter.value.label);
  const homeChallengeRouteTitle = computed(() => homeChallengeChapter.value.routeTitle || "挑战路线");

  const homeChallengeStageLabel = computed(() => {
    const chapterProgress = getChallengeChapterProgress(challengeProgressBook.value, homeChallengeChapter.value.id);
    const nextStageId = chapterProgress.unlockedStageIds[chapterProgress.unlockedStageIds.length - 1] ?? CHALLENGE_STAGES[0].id;
    const nextStage = getChallengeStageConfig(nextStageId, homeChallengeChapter.value.id);
    const nextStageIndex = CHALLENGE_STAGES.findIndex((stage) => stage.id === nextStage.id);

    return `第 ${nextStageIndex + 1} 关 · ${nextStage.title}`;
  });

  const currentChallengeHomeLabel = computed(
    () => `${homeChallengeLabel.value} · ${homeChallengeRouteTitle.value} · ${homeChallengeStageLabel.value}`
  );
  const homeWelcomeContext = computed(() => ({
    displayName: homeWelcomeDisplayName.value,
    grade: String(settingsStore.profile.grade || "").trim(),
    semester: String(settingsStore.profile.semester || "").trim(),
    recommendedMode: dueWrongQuestionCount.value > 0 ? "review" : "challenge",
    challengeStageLabel: homeChallengeStageLabel.value,
    reviewDueCount: dueWrongQuestionCount.value,
    reviewingCount: reviewingWrongQuestionCount.value,
    variantIndex: homeWelcomeVariantIndex.value,
    isProfileJustSaved: isHomeWelcomeProfileJustSaved.value,
    isFirstHomeVisitToday: homeWelcomeVisitedDate.value !== getHomeWelcomeDateKey(homeWelcomeNow.value),
    ...buildHomeWelcomeTemporalContext(homeWelcomeNow.value)
  }));
  const homeWelcomeEyebrow = computed(() => buildHomeWelcomeEyebrow(homeWelcomeContext.value));
  const homeWelcomeTitle = computed(() =>
    buildHomeWelcomeTitle(homeWelcomeContext.value, {
      displayName: homeWelcomeDisplayName.value,
      useCustomName: isUsingCustomHomeWelcomeName.value
    })
  );
  const homeWelcomeSummary = computed(() =>
    homeWelcomeDynamicLine.value ||
    homeWelcomeFallbackLine.value ||
    buildHomeWelcomeFallbackLine(homeWelcomeContext.value)
  );
  const homeWelcomeSpeechText = computed(() =>
    homeWelcomeDynamicSpeechText.value ||
    homeWelcomeFallbackSpeechText.value ||
    normalizeHomeWelcomeSpeechText(homeWelcomeSummary.value)
  );
  const homeWelcomeVoiceButtonLabel = computed(() => {
    return buildHomeWelcomeVoiceButtonLabel(homeWelcomeContext.value, {
      status: homeWelcomeSpeechStatus.value
    });
  });
  const homeWelcomePanel = computed(() => ({
    eyebrow: homeWelcomeEyebrow.value,
    title: homeWelcomeTitle.value,
    summary: homeWelcomeSummary.value,
    profileChip: homeWelcomeProfileChip.value,
    mascotStatus: homeWelcomeMascotStatus.value,
    themeTone: homeWelcomeContext.value.timeBand,
    showVoiceButton: shouldShowHomeWelcomeVoiceButton.value,
    voiceButtonLabel: homeWelcomeVoiceButtonLabel.value,
    voiceStatus: homeWelcomeSpeechStatus.value,
    voiceErrorMessage: homeWelcomeSpeechErrorMessage.value
  }));

  const activeQuestionCountValue = computed(() =>
    isChallengeMode.value ? currentStage.value.questionCount : selectedQuestionCountValue.value
  );

  const activeDifficultyValue = computed(() =>
    isChallengeMode.value ? currentStage.value.difficulty : selectedDifficultyValue.value
  );

  const activeDifficultyLabel = computed(() =>
    isChallengeMode.value ? getDifficultyLabel(currentStage.value.difficulty) : selectedDifficultyLabel.value
  );

  const activeTimeLimitSecondsValue = computed(() =>
    isChallengeMode.value ? currentStage.value.timeLimitSeconds : selectedTimeLimitSecondsValue.value
  );

  const activeTimeLimitLabel = computed(() =>
    activeTimeLimitSecondsValue.value > 0 ? `每题 ${activeTimeLimitSecondsValue.value} 秒` : "不限时"
  );

  const activePointsPerCorrectValue = computed(() =>
    isChallengeMode.value ? currentStage.value.pointsPerCorrect : selectedPointsPerCorrectValue.value
  );

  const quizSummaryLead = computed(() =>
    isChallengeMode.value
      ? `当前是 ${currentChallengeChapterLabel.value} 挑战章节，正在走 ${currentChallengeRouteTitle.value}，题数、难度、限时和年级都会锁定。`
      : isWrongBookPractice.value
        ? "当前是错题温习，会优先读取你本地错题本里的题目快照。"
        : isKnowledgePractice.value
          ? `当前会围绕知识点 ${activeKnowledgeTagFilter.value} 出题，你仍然可以调整题量、难度和限时。`
          : "自由练习可以随时调整题库范围、题量、难度和限时。"
  );

  const hasPendingQuizSettingsChanges = computed(
    () =>
      draftSelectedSubject.value !== selectedSubject.value ||
      draftSelectedGrade.value !== selectedGrade.value ||
      draftSelectedSemester.value !== selectedSemester.value ||
      draftSelectedQuestionCount.value !== selectedQuestionCount.value ||
      draftSelectedDifficulty.value !== selectedDifficulty.value ||
      draftSelectedTimeLimitSeconds.value !== selectedTimeLimitSeconds.value ||
      draftSelectedPointsPerCorrect.value !== selectedPointsPerCorrect.value
  );

  const isUsingDefaultDraftQuizSettings = computed(
    () =>
      draftSelectedSubject.value === DEFAULT_QUIZ_SETTINGS.selectedSubject &&
      draftSelectedGrade.value === DEFAULT_QUIZ_SETTINGS.selectedGrade &&
      draftSelectedSemester.value === DEFAULT_QUIZ_SETTINGS.selectedSemester &&
      draftSelectedQuestionCount.value === DEFAULT_QUIZ_SETTINGS.selectedQuestionCount &&
      draftSelectedDifficulty.value === DEFAULT_QUIZ_SETTINGS.selectedDifficulty &&
      draftSelectedTimeLimitSeconds.value === DEFAULT_QUIZ_SETTINGS.selectedTimeLimitSeconds &&
      draftSelectedPointsPerCorrect.value === DEFAULT_QUIZ_SETTINGS.selectedPointsPerCorrect
  );

  const quizSettingsHeadingDescription = computed(() =>
    isChallengeMode.value
      ? `当前是 ${currentChallengeChapterLabel.value} 挑战章节，当前路线是 ${currentChallengeRouteTitle.value}；关卡会锁定年级、题数、难度、限时和分值。`
      : "调整条件后点“应用设置”即可生效，系统会自动记住你上次选择。"
  );

  const shouldShowQuizSettingsButton = computed(() => !isWrongBookPractice.value);

  const settingsButtonText = computed(() => (isChallengeMode.value ? "改题库范围" : "改出题条件"));

  const challengeLaunchLabel = computed(() =>
    currentStageBestResult.value ? `继续 ${currentStage.value.title}` : `开始 ${currentStage.value.title}`
  );

  const freePracticeRuleLabel = computed(() => {
    const segments = [`${selectedQuestionCountValue.value} 题`, selectedDifficultyLabel.value];

    segments.push(selectedTimeLimitSecondsValue.value > 0 ? `每题 ${selectedTimeLimitSecondsValue.value} 秒` : "不限时");
    segments.push(`每题 ${selectedPointsPerCorrectValue.value} 分`);

    return segments.join(" · ");
  });

  const refreshButtonText = computed(() => {
    if (isLoading.value) {
      return "抽题中...";
    }

    return isChallengeMode.value ? "重开本关" : "重新抽题";
  });

  const loadingStateText = computed(() =>
    isChallengeMode.value
      ? `正在为 ${currentStageLabel.value} 准备 ${activeQuestionCountValue.value} 道题。`
      : isWrongBookPractice.value
        ? `正在整理错题本里的 ${quizPracticeContext.value.questionIds.length || pendingWrongQuestionIds.value.length} 道题。`
        : isKnowledgePractice.value
          ? `正在围绕知识点 ${activeKnowledgeTagFilter.value} 挑选 ${activeQuestionCountValue.value} 道题。`
          : `正在从奇妙知识岛题库里挑选 ${activeQuestionCountValue.value} 道题。`
  );

  const hasQuestions = computed(() => questions.value.length > 0);

  const showQuizStateCard = computed(
    () => isLoading.value || Boolean(errorMessage.value) || !hasQuestions.value
  );

  const quizStateTone = computed(() => {
    if (isLoading.value) {
      return "loading";
    }

    if (errorMessage.value) {
      return "error";
    }

    return "empty";
  });

  const quizStateEyebrow = computed(() => {
    if (isLoading.value) {
      return "Loading Quiz";
    }

    if (errorMessage.value) {
      return "Load Review";
    }

    return "Question Supply";
  });

  const quizStateLabel = computed(() => {
    if (isLoading.value) {
      return isChallengeMode.value ? "正在备题" : "正在抽题";
    }

    if (errorMessage.value) {
      return "需要重试";
    }

    if (isChallengeMode.value) {
      return "本关暂无题目";
    }

    return isWrongBookPractice.value ? "错题本暂无题目" : "当前没有可用题目";
  });

  const quizStateTitle = computed(() => {
    if (isLoading.value) {
      return "猫头鹰正在整理题目";
    }

    if (errorMessage.value) {
      return "题目暂时没取回来";
    }

    if (isChallengeMode.value) {
      return "这关的题目还没准备好";
    }

    return isWrongBookPractice.value ? "当前还没有待温习的错题" : "这一轮暂时抽不到题目";
  });

  const quizStateText = computed(() => {
    if (isLoading.value) {
      return loadingStateText.value;
    }

    if (errorMessage.value) {
      return `${errorMessage.value} 当前题库范围是 ${selectedScopeLabel.value}，可以稍后重试，或先调整范围后再抽题。`;
    }

    if (isChallengeMode.value) {
      return `当前题库范围 ${selectedScopeLabel.value} 还没有足够的题目支持 ${currentStageLabel.value}。先改题库范围，或去导入新题后再回来闯关。`;
    }

    if (isWrongBookPractice.value) {
      return "当前错题本里还没有可温习的题目。先去做一轮练习，答错的题会自动沉淀到这里。";
    }

    return `当前题库范围 ${selectedScopeLabel.value} 暂时抽不出 ${activeQuestionCountValue.value} 道题。可以放宽条件，或者先去导入和整理题库。`;
  });

  const quizStateStats = computed(() => {
    if (isChallengeMode.value) {
      return [
        { label: "当前模式", value: "挑战闯关" },
        { label: "题库范围", value: selectedScopeLabel.value },
        { label: "本关目标", value: `${activeQuestionCountValue.value} 题 · 过关线 ${currentStage.value.passAccuracy}%` }
      ];
    }

    if (isWrongBookPractice.value) {
      return [
        { label: "当前模式", value: "错题温习" },
        { label: "温习题数", value: `${questions.value.length || quizPracticeContext.value.questionIds.length} 题` },
        { label: "待温习", value: `${pendingWrongQuestionCount.value} 题` }
      ];
    }

    if (isKnowledgePractice.value) {
      return [
        { label: "当前模式", value: "知识点学习" },
        { label: "知识点", value: activeKnowledgeTagFilter.value },
        { label: "练习目标", value: `${activeQuestionCountValue.value} 题 · ${activeDifficultyLabel.value}` }
      ];
    }

    return [
      { label: "当前模式", value: "自由练习" },
      { label: "题库范围", value: selectedScopeLabel.value },
      { label: "抽题目标", value: `${activeQuestionCountValue.value} 题 · ${activeDifficultyLabel.value}` }
    ];
  });

  const quizStateHint = computed(() => {
    if (isLoading.value) {
      return "题目准备完成后会自动进入答题区。";
    }

    if (errorMessage.value) {
      return "先重试一次，如果还是失败，再切到题库或导入区检查数据。";
    }

    if (isWrongBookPractice.value) {
      return "先去做一轮练习，答错的题会自动进入这里。";
    }

    if (isKnowledgePractice.value) {
      return "可以先回到知识点页，换一个标签继续练。";
    }

    return "优先调整题库范围；如果题库本身不够，再去导入新题。";
  });

  const challengeToast = computed(() => {
    if (!isChallengeMode.value || !latestChallengeOutcome.value) {
      return null;
    }

    const achievementNames = (latestChallengeOutcome.value.newAchievements ?? []).map((achievement) => achievement.name);
    const achievementSuffix = achievementNames.length > 0 ? ` 新成就：${achievementNames.join("、")}。` : "";

    if (latestChallengeOutcome.value.unlockedNextStage) {
      return {
        tone: "success",
        title: `${latestChallengeOutcome.value.nextStageTitle} 已解锁`,
        text: latestChallengeOutcome.value.rewardUnlocked
          ? `${latestChallengeOutcome.value.rewardName} 已收下，也可以先回头刷新当前关的星级。${achievementSuffix}`
          : `可以直接点“前往下一关”，也可以继续冲 ${latestChallengeOutcome.value.rewardName}。${achievementSuffix}`
      };
    }

    if (latestChallengeOutcome.value.isPassed && latestChallengeOutcome.value.nextStageTitle) {
      return {
        tone: "calm",
        title: `${latestChallengeOutcome.value.stageTitle} 已通过`,
        text: latestChallengeOutcome.value.rewardUnlocked
          ? `${latestChallengeOutcome.value.rewardName} 已收下，下一关 ${latestChallengeOutcome.value.nextStageTitle} 也能继续挑战。${achievementSuffix}`
          : `下一关 ${latestChallengeOutcome.value.nextStageTitle} 已经可以挑战，别忘了回头收 ${latestChallengeOutcome.value.rewardName}。${achievementSuffix}`
      };
    }

    if (!latestChallengeOutcome.value.isPassed) {
      return {
        tone: "retry",
        title: `${latestChallengeOutcome.value.stageTitle} 还差一点`,
        text: `先把正确率提到 ${currentStage.value.passAccuracy}% 过关，再试着完成 ${latestChallengeOutcome.value.missionLabel}。${achievementSuffix}`
      };
    }

    return {
      tone: "success",
      title: `${latestChallengeOutcome.value.stageTitle} 全部完成`,
      text: latestChallengeOutcome.value.rewardUnlocked
        ? `${latestChallengeOutcome.value.rewardName} 已收下，这条挑战路线已经走通了。${achievementSuffix}`
        : `这条挑战路线已经走通了。${achievementSuffix}`
    };
  });

  const challengeStages = computed(() =>
    getChallengeStageList(selectedChallengeChapterId.value).map((stage, index) => {
      const bestResult = challengeProgress.value.bestResults[stage.id] ?? null;
      const bestStarCount = bestResult?.starCount ?? 0;
      const rewardEarned = Boolean(bestResult?.rewardEarned);
      const previewStars = Array.from({ length: 3 }, (_, previewIndex) => ({
        id: previewIndex + 1,
        filled: previewIndex < bestStarCount
      }));
      const isUnlocked = challengeProgress.value.unlockedStageIds.includes(stage.id);
      const isCurrent = selectedStageId.value === stage.id;
      let stateLabel = "已解锁";
      let stateTone = "ready";

      if (!isUnlocked) {
        stateLabel = "待解锁";
        stateTone = "locked";
      } else if (bestStarCount >= 3) {
        stateLabel = "满星";
        stateTone = "perfect";
      } else if (bestStarCount > 0) {
        stateLabel = "已过关";
        stateTone = "cleared";
      } else if (isCurrent) {
        stateLabel = "当前关";
        stateTone = "current";
      }

      const coverageCount = Math.max(0, Number(challengeCoverage.value.countsByStageId?.[stage.id] || 0));
      const coverageRequiredCount = Math.max(1, Number(stage.questionCount || 0));
      const coverageReplayTarget = coverageRequiredCount * 2;
      let coverageTone = "loading";
      let coverageLabel = "盘点中";
      let coverageShortLabel = "盘点中";
      let coverageHint = "正在盘点这一关的专属标签题量。";

      if (challengeCoverage.value.status === CHALLENGE_COVERAGE_STATUS.ERROR) {
        coverageLabel = "暂不可用";
        coverageShortLabel = "暂不可用";
        coverageHint = "当前题量盘点暂时没取回来，稍后再试一次。";
      } else if (challengeCoverage.value.status === CHALLENGE_COVERAGE_STATUS.READY) {
        if (coverageCount >= coverageReplayTarget) {
          coverageTone = "strong";
          coverageLabel = "题量充足";
          coverageShortLabel = "充足";
          coverageHint = `标签题 ${coverageCount}/${coverageRequiredCount}，这一关已经有足够的专属题可重复挑战。`;
        } else if (coverageCount >= coverageRequiredCount) {
          coverageTone = "ready";
          coverageLabel = "可以开打";
          coverageShortLabel = "达标";
          coverageHint = `标签题 ${coverageCount}/${coverageRequiredCount}，这一关已经能按标签稳定开打。`;
        } else if (coverageCount > 0) {
          coverageTone = "low";
          coverageLabel = "题量偏少";
          coverageShortLabel = "偏少";
          coverageHint = `标签题 ${coverageCount}/${coverageRequiredCount}，本关会回退到同年级题库补足题量。`;
        } else {
          coverageTone = "empty";
          coverageLabel = "待补标签题";
          coverageShortLabel = "待补";
          coverageHint = `标签题 0/${coverageRequiredCount}，这关还没有专属题，当前只能回退到同年级题库。`;
        }
      }

      return {
        ...stage,
        order: index + 1,
        isUnlocked,
        isCurrent,
        difficultyLabel: getDifficultyLabel(stage.difficulty),
        timeLimitLabel: stage.timeLimitSeconds > 0 ? `${stage.timeLimitSeconds} 秒/题` : "不限时",
        bestResult,
        bestStarCount,
        rewardEarned,
        routeOffset: index % 2 === 0 ? "0px" : "34px",
        metaSummary: `${stage.questionCount} 题 · ${getDifficultyLabel(stage.difficulty)} · ${stage.timeLimitSeconds > 0 ? `${stage.timeLimitSeconds} 秒/题` : "不限时"}`,
        missionLabel: stage.mission?.label || "完成本关",
        rewardLabel: stage.reward?.name || "",
        rewardGlyph: stage.reward?.glyph || "",
        previewStars,
        stateLabel,
        stateTone,
        coverageCount,
        coverageRequiredCount,
        coverageTone,
        coverageLabel,
        coverageShortLabel,
        coverageHint,
        hasCoverageReady:
          challengeCoverage.value.status === CHALLENGE_COVERAGE_STATUS.READY && coverageCount >= coverageRequiredCount
      };
    })
  );

  const currentChallengeStage = computed(() =>
    challengeStages.value.find((stage) => stage.id === selectedStageId.value) ?? challengeStages.value[0] ?? null
  );

  const challengeCoverageReadyStageCount = computed(
    () => challengeStages.value.filter((stage) => stage.hasCoverageReady).length
  );

  const challengeCoverageSummaryLabel = computed(() => {
    if (isChallengeCoverageLoading.value) {
      return "专属题盘点中";
    }

    if (challengeCoverage.value.status === CHALLENGE_COVERAGE_STATUS.ERROR) {
      return "专属题暂不可用";
    }

    return `专属题达标 ${challengeCoverageReadyStageCount.value} / ${CHALLENGE_STAGES.length} 站`;
  });

  const shouldShowChallengeCatalogShortcut = computed(() =>
    ["low", "empty"].includes(currentChallengeStage.value?.coverageTone || "")
  );

  const challengeRouteProgressStyle = computed(() => {
    const unlockedCount = challengeProgress.value.unlockedStageIds.length;
    const progressPercent =
      CHALLENGE_STAGES.length <= 1 ? 100 : ((Math.max(1, unlockedCount) - 1) / (CHALLENGE_STAGES.length - 1)) * 100;

    return {
      "--challenge-route-progress": `${Math.max(0, Math.min(100, progressPercent))}%`
    };
  });

  const isAudioMuted = computed(
    () => masterVolume.value <= 0 || ((!musicEnabled.value || musicVolume.value <= 0) && (!sfxEnabled.value || sfxVolume.value <= 0))
  );

  const audioStatusLabel = computed(() => {
    if (!isAudioSupported.value) {
      return "不可用";
    }

    if (!audioReady.value) {
      return "待启用";
    }

    if (isAudioMuted.value) {
      return "已静音";
    }

    return "运行中";
  });

  const audioStatusClass = computed(() => [
    "audio-console__status",
    {
      "audio-console__status--live": isAudioSupported.value && audioReady.value && !isAudioMuted.value,
      "audio-console__status--pending": isAudioSupported.value && !audioReady.value,
      "audio-console__status--muted": isAudioSupported.value && audioReady.value && isAudioMuted.value,
      "audio-console__status--unsupported": !isAudioSupported.value
    }
  ]);

  const audioHint = computed(() => {
    if (!isAudioSupported.value) {
      return "当前设备不支持音频播放，不能播放背景音乐和提示音。";
    }

    if (!audioReady.value) {
      return "点“启用音频”或第一次答题后，会解锁背景音乐和提示音。";
    }

    if (isAudioMuted.value) {
      return "设置已经保存，这台设备当前不会发声。";
    }

    if (!musicEnabled.value || musicVolume.value <= 0) {
      return "当前只保留答题提示音。";
    }

    if (!sfxEnabled.value || sfxVolume.value <= 0) {
      return "当前只保留背景音乐。";
    }

    return "背景音乐和答题提示音都已启用，设置会自动记住。";
  });

  const masterVolumeText = computed(() => `${Math.round(masterVolume.value * 100)}%`);

  const musicVolumeText = computed(() => `${Math.round(musicVolume.value * 100)}%`);

  const sfxVolumeText = computed(() => `${Math.round(sfxVolume.value * 100)}%`);

  const audioEntryHint = computed(() => {
    if (!isAudioSupported.value) {
      return "当前设备不支持音频";
    }

    if (!audioReady.value) {
      return "点击后开启背景音乐和提示音";
    }

    if (isAudioMuted.value) {
      return `已静音 · ${masterVolumeText.value}`;
    }

    const enabledChannels = [];

    if (musicEnabled.value && musicVolume.value > 0) {
      enabledChannels.push("背景音乐");
    }

    if (sfxEnabled.value && sfxVolume.value > 0) {
      enabledChannels.push("音效");
    }

    return `${enabledChannels.join(" + ") || "音频已关闭"} · ${masterVolumeText.value}`;
  });

  watch(
    [masterVolume, musicEnabled, musicVolume, sfxEnabled, sfxVolume],
    ([nextMasterVolume, nextMusicEnabled, nextMusicVolume, nextSfxEnabled, nextSfxVolume]) => {
      syncAudioSettings({
        masterVolume: nextMasterVolume,
        musicEnabled: nextMusicEnabled,
        musicVolume: nextMusicVolume,
        sfxEnabled: nextSfxEnabled,
        sfxVolume: nextSfxVolume
      });

      if (
        (homeWelcomeSpeechStatus.value === "loading" || homeWelcomeSpeechStatus.value === "playing") &&
        (nextMasterVolume <= 0 || !nextSfxEnabled || nextSfxVolume <= 0)
      ) {
        stopHomeWelcomeSpeech();
      }
    },
    { immediate: true }
  );

  watch(homeWelcomeVoiceMode, (nextMode) => {
    if (nextMode === HOME_WELCOME_VOICE_MODE.OFF) {
      stopHomeWelcomeSpeech();
      homeWelcomeSpeechErrorMessage.value = "";
    }
  });

  async function loadQuestionStatsSummary() {
    try {
      const payload = await fetchQuestionStats();
      questionStats.value = {
        ...DEFAULT_QUESTION_STATS,
        topKnowledgeTags: Array.isArray(payload?.topKnowledgeTags) ? payload.topKnowledgeTags : []
      };
    } catch {
      questionStats.value = DEFAULT_QUESTION_STATS;
    }
  }

  function getViewTabClass(viewMode) {
    return [
      "view-switch__button",
      { "view-switch__button--active": currentView.value === viewMode }
    ];
  }

  function getChallengeStageClass(stage) {
    return [
      "challenge-node",
      `challenge-node--${stage.themeClass}`,
      {
        "challenge-node--current": stage.isCurrent,
        "challenge-node--locked": !stage.isUnlocked,
        "challenge-node--completed": stage.bestStarCount > 0,
        "challenge-node--perfect": stage.bestStarCount >= 3
      }
    ];
  }

  function openHomeView() {
    closeQuizSettings();
    closeAudioSettings();
    wrongBookFocusTag.value = "";
    resetQuizPracticeContext();
    showHomeView();
  }

  function clearHomeWelcomeSpeechTimer() {
    if (homeWelcomeSpeechTimer) {
      clearTimeout(homeWelcomeSpeechTimer);
      homeWelcomeSpeechTimer = 0;
    }
  }

  function revokeHomeWelcomeSpeechUrl() {
    if (!activeHomeWelcomeSpeechUrl) {
      return;
    }

    URL.revokeObjectURL(activeHomeWelcomeSpeechUrl);
    activeHomeWelcomeSpeechUrl = "";
  }

  function cancelHomeWelcomeBrowserSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      homeWelcomeSpeechUtterance = null;
      return;
    }

    if (homeWelcomeSpeechUtterance) {
      window.speechSynthesis.cancel();
      homeWelcomeSpeechUtterance = null;
    }
  }

  function finishHomeWelcomeSpeech({ status = "idle", errorMessage = "" } = {}) {
    revokeHomeWelcomeSpeechUrl();
    homeWelcomeSpeechStatus.value = status;
    homeWelcomeSpeechErrorMessage.value = errorMessage;

    if (currentView.value === VIEW_MODE.HOME && status !== "playing") {
      homeWelcomeMascotStatus.value = "idle";
    }
  }

  function stopHomeWelcomeSpeech({ clearError = true } = {}) {
    if (homeWelcomeSpeechController) {
      homeWelcomeSpeechController.abort();
      homeWelcomeSpeechController = null;
    }

    clearHomeWelcomeSpeechTimer();
    stopStudyNarration();
    cancelHomeWelcomeBrowserSpeech();
    finishHomeWelcomeSpeech({
      status: "idle",
      errorMessage: clearError ? "" : homeWelcomeSpeechErrorMessage.value
    });
  }

  function isBrowserHomeWelcomeSpeechSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
  }

  function tryPlayHomeWelcomeWithBrowserSpeech(text, { suppressError = false } = {}) {
    const narrationText = normalizeHomeWelcomeSpeechText(text);

    if (!narrationText || !isBrowserHomeWelcomeSpeechSupported()) {
      return false;
    }

    clearHomeWelcomeSpeechTimer();
    stopStudyNarration();
    cancelHomeWelcomeBrowserSpeech();

    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.lang = "zh-CN";
    utterance.rate = Math.max(0.85, Math.min(1.2, Number(settingsStore.coachingPreferences?.aiReviewSpeed || 1)));
    utterance.pitch = 1;
    utterance.volume = homeWelcomeSpeechVolume.value > 0 ? homeWelcomeSpeechVolume.value : 1;

    homeWelcomeSpeechUtterance = utterance;
    homeWelcomeMascotStatus.value = "speaking";
    homeWelcomeSpeechStatus.value = "playing";
    homeWelcomeSpeechErrorMessage.value = "";

    utterance.onend = () => {
      if (homeWelcomeSpeechUtterance !== utterance) {
        return;
      }

      homeWelcomeSpeechUtterance = null;
      finishHomeWelcomeSpeech();
    };

    utterance.onerror = () => {
      if (homeWelcomeSpeechUtterance !== utterance) {
        return;
      }

      homeWelcomeSpeechUtterance = null;
      finishHomeWelcomeSpeech({
        status: suppressError ? "idle" : "error",
        errorMessage: suppressError ? "" : "浏览器这次没把欢迎语读出来。"
      });
    };

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      homeWelcomeSpeechUtterance = null;

      if (!suppressError) {
        finishHomeWelcomeSpeech({
          status: "error",
          errorMessage: "浏览器这次没把欢迎语读出来。"
        });
      } else {
        finishHomeWelcomeSpeech();
      }

      return false;
    }
  }

  function triggerHomeWelcomeMascotSpeech(durationMs = HOME_WELCOME_SPEAK_DURATION_MS) {
    clearHomeWelcomeSpeechTimer();
    homeWelcomeMascotStatus.value = "speaking";
    homeWelcomeSpeechTimer = setTimeout(() => {
      homeWelcomeMascotStatus.value = "idle";
      homeWelcomeSpeechTimer = 0;
    }, durationMs);
  }

  function queueHomeWelcomeMascotSpeech() {
    isHomeWelcomeProfileJustSaved.value = true;

    if (currentView.value === VIEW_MODE.HOME) {
      advanceHomeWelcomeVariant();
      void refreshHomeWelcomeCopy({ force: true });
      return;
    }

    hasPendingHomeWelcomeSpeech.value = true;
  }

  function clearHomeWelcomeRequest() {
    if (homeWelcomeRequestController) {
      homeWelcomeRequestController.abort();
      homeWelcomeRequestController = null;
    }
  }

  function markHomeWelcomeVisitedToday() {
    homeWelcomeVisitedDate.value = markHomeWelcomeVisited();
  }

  function markHomeWelcomeAutoSpeechPlayedToday() {
    homeWelcomeAutoSpeechDate.value = markHomeWelcomeAutoSpeechPlayed();
  }

  function advanceHomeWelcomeVariant() {
    homeWelcomeVariantIndex.value += 1;
  }

  function refreshHomeWelcomeTemporalContext() {
    homeWelcomeNow.value = new Date();
  }

  async function handlePlayHomeWelcomeVoice({ triggeredByAuto = false } = {}) {
    if (homeWelcomeVoiceMode.value === HOME_WELCOME_VOICE_MODE.OFF) {
      return;
    }

    if (homeWelcomeSpeechStatus.value === "loading" || homeWelcomeSpeechStatus.value === "playing") {
      if (!triggeredByAuto) {
        stopHomeWelcomeSpeech();
      }

      return;
    }

    if (homeWelcomeSpeechVolume.value <= 0 || !sfxEnabled.value) {
      if (!triggeredByAuto) {
        homeWelcomeSpeechErrorMessage.value = "当前欢迎语音跟随音效通道，请先打开音效和音量。";
      }

      return;
    }

    const narrationText = normalizeHomeWelcomeSpeechText(homeWelcomeSpeechText.value);

    if (!narrationText) {
      return;
    }

    if (triggeredByAuto) {
      markHomeWelcomeAutoSpeechPlayedToday();
    }

    stopHomeWelcomeSpeech();
    clearHomeWelcomeSpeechTimer();
    homeWelcomeSpeechErrorMessage.value = "";
    homeWelcomeSpeechStatus.value = "loading";
    homeWelcomeMascotStatus.value = "speaking";

    const speechController = new AbortController();
    homeWelcomeSpeechController = speechController;

    try {
      if (!triggeredByAuto) {
        await ensureAudioReady();
      }

      const blob = await generateQuestionReviewSpeech({
        text: narrationText,
        model: settingsStore.effectiveTtsModel || "",
        voice: effectiveHomeWelcomeTtsVoice.value,
        speed: settingsStore.coachingPreferences?.aiReviewSpeed || 1,
        audioFormat: effectiveHomeWelcomeTtsAudioFormat.value,
        aiRuntime: settingsStore.effectiveTtsRuntimeConfig,
        signal: speechController.signal
      });

      if (speechController.signal.aborted || homeWelcomeSpeechController !== speechController) {
        return;
      }

      activeHomeWelcomeSpeechUrl = URL.createObjectURL(blob);
      const playback = await playStudyNarration(activeHomeWelcomeSpeechUrl, {
        volume: homeWelcomeSpeechVolume.value,
        onEnded: () => {
          finishHomeWelcomeSpeech();
        },
        onError: ({ reason }) => {
          const fallbackStarted = tryPlayHomeWelcomeWithBrowserSpeech(narrationText, {
            suppressError: triggeredByAuto
          });

          if (fallbackStarted) {
            return;
          }

          finishHomeWelcomeSpeech({
            status: triggeredByAuto ? "idle" : "error",
            errorMessage:
              triggeredByAuto
                ? ""
                : reason === "play-blocked"
                  ? "浏览器拦住了欢迎语音，点一下按钮再试一次。"
                  : "猫头鹰这次没把欢迎词说出来。"
          });
        }
      });

      if (!playback.started) {
        const fallbackStarted = tryPlayHomeWelcomeWithBrowserSpeech(narrationText, {
          suppressError: triggeredByAuto
        });

        if (fallbackStarted) {
          return;
        }

        finishHomeWelcomeSpeech({
          status: triggeredByAuto ? "idle" : "error",
          errorMessage:
            triggeredByAuto
              ? ""
              : playback.reason === "play-blocked"
                ? "浏览器拦住了欢迎语音，点一下按钮再试一次。"
                : "猫头鹰这次没把欢迎词说出来。"
        });
        return;
      }

      homeWelcomeSpeechStatus.value = "playing";
    } catch (error) {
      if (error?.name === "AbortError" || speechController.signal.aborted) {
        return;
      }

      const fallbackStarted = tryPlayHomeWelcomeWithBrowserSpeech(narrationText, {
        suppressError: triggeredByAuto
      });

      if (fallbackStarted) {
        return;
      }

      finishHomeWelcomeSpeech({
        status: triggeredByAuto ? "idle" : "error",
        errorMessage: triggeredByAuto ? "" : error?.message || "猫头鹰这次没把欢迎词说出来。"
      });
    } finally {
      if (homeWelcomeSpeechController === speechController) {
        homeWelcomeSpeechController = null;
      }
    }
  }

  async function refreshHomeWelcomeCopy({ force = false } = {}) {
    refreshHomeWelcomeTemporalContext();
    const context = homeWelcomeContext.value;
    const contextKey = `${getHomeWelcomeDateKey(homeWelcomeNow.value)}|${buildHomeWelcomeContextHash(context)}`;
    const shouldSpeakOnRefresh = currentView.value === VIEW_MODE.HOME && (force || context.isFirstHomeVisitToday);
    const shouldAutoPlayVoice =
      currentView.value === VIEW_MODE.HOME &&
      homeWelcomeVoiceMode.value === HOME_WELCOME_VOICE_MODE.DAILY_AUTO &&
      context.isFirstHomeVisitToday &&
      homeWelcomeAutoSpeechDate.value !== getHomeWelcomeDateKey(homeWelcomeNow.value);

    homeWelcomeDynamicLine.value = "";
    homeWelcomeDynamicSpeechText.value = "";
    homeWelcomeFallbackLine.value = buildHomeWelcomeFallbackLine(context);
    homeWelcomeFallbackSpeechText.value = buildHomeWelcomeFallbackSpeechText(context);
    homeWelcomeSpeechErrorMessage.value = "";

    if (shouldSpeakOnRefresh && homeWelcomeMascotStatus.value !== "speaking") {
      triggerHomeWelcomeMascotSpeech();
    }

    if (shouldAutoPlayVoice) {
      void handlePlayHomeWelcomeVoice({ triggeredByAuto: true });
    }

    if (!force && homeWelcomeLastFailedContextKey.value === contextKey) {
      markHomeWelcomeVisitedToday();
      isHomeWelcomeProfileJustSaved.value = false;
      return;
    }

    const cachedLine = !force ? readHomeWelcomeCache(context) : null;

    if (cachedLine?.text) {
      homeWelcomeDynamicLine.value = cachedLine.text;
      homeWelcomeDynamicSpeechText.value = normalizeHomeWelcomeSpeechText(cachedLine.speechText || cachedLine.text);
      homeWelcomeLastFailedContextKey.value = "";
      markHomeWelcomeVisitedToday();
      isHomeWelcomeProfileJustSaved.value = false;
      return;
    }

    clearHomeWelcomeRequest();
    const requestController = new AbortController();
    homeWelcomeRequestController = requestController;

    try {
      const payload = await generateHomeWelcomeMessage({
        context,
        model: settingsStore.effectiveReviewModel || "",
        aiRuntime: settingsStore.effectiveReviewRuntimeConfig,
        signal: requestController.signal
      });
      const resolvedLine = normalizeHomeWelcomeLine(payload?.data?.bubbleText || payload?.data?.speechText);
      const resolvedSpeechText = normalizeHomeWelcomeSpeechText(payload?.data?.speechText || payload?.data?.bubbleText);

      if (resolvedLine) {
        homeWelcomeDynamicLine.value = resolvedLine;
        homeWelcomeDynamicSpeechText.value = resolvedSpeechText || resolvedLine;
        homeWelcomeLastFailedContextKey.value = "";
        writeHomeWelcomeCache(context, resolvedLine, {
          speechText: resolvedSpeechText || resolvedLine,
          source: payload?.meta?.source || payload?.meta?.api || "ai"
        });
      }
    } catch (error) {
      if (error?.name === "AbortError" || requestController.signal.aborted) {
        return;
      }

      homeWelcomeLastFailedContextKey.value = contextKey;
    } finally {
      if (homeWelcomeRequestController !== requestController) {
        return;
      }

      homeWelcomeRequestController = null;
      markHomeWelcomeVisitedToday();
      isHomeWelcomeProfileJustSaved.value = false;
    }
  }

  function openChallengeView({
    nextStageId = selectedStageId.value,
    nextChallengeChapterId = selectedChallengeChapterId.value,
    preserveOutcome = false
  } = {}) {
    setSelectedChallengeChapter(nextChallengeChapterId);
    const firstUnlockedStageId = challengeProgress.value.unlockedStageIds[0] ?? CHALLENGE_STAGES[0].id;

    closeQuizSettings();
    closeAudioSettings();
    wrongBookFocusTag.value = "";
    resetQuizPracticeContext();
    playMode.value = PLAY_MODE.CHALLENGE;
    selectedStageId.value = challengeProgress.value.unlockedStageIds.includes(nextStageId) ? nextStageId : firstUnlockedStageId;
    showChallengeView();

    if (!preserveOutcome) {
      clearChallengeOutcome();
    }
  }

  async function openQuizView() {
    const shouldReload =
      currentView.value !== VIEW_MODE.QUIZ || !hasQuestions.value || Boolean(errorMessage.value);

    closeAudioSettings();
    showQuizView();

    if (shouldReload) {
      await loadQuestions();
    }
  }

  function openCatalogView() {
    catalogPrefill.value = null;
    wrongBookFocusTag.value = "";
    openToolsView(TOOL_SECTION_IDS[1]);
  }

  function openStudyView({ gradeFilter = "" } = {}) {
    closeQuizSettings();
    closeAudioSettings();
    void ensureKnowledgeStudyRuntime();
    showStudyView({ gradeFilter });
  }

  async function openStudyLessonPlayer(itemOrId) {
    const lessonId = String(typeof itemOrId === "string" ? itemOrId : itemOrId?.id || "").trim();

    if (!lessonId) {
      return;
    }

    await ensureKnowledgeStudyRuntime();
    closeQuizSettings();
    closeAudioSettings();
    showStudyLessonPlayerView(lessonId);
  }

  function closeStudyLessonPlayer() {
    closeStudyLessonPlayerView();
  }

  function completeStudyLesson() {
    playAudioCue("finish");

    const next = nextStudyLesson.value;

    if (next) {
      showStudyLessonPlayerView(next.id);
      return;
    }

    closeStudyLessonPlayerView();
  }

  function openWrongBookView({ focusKnowledgeTag = "" } = {}) {
    closeQuizSettings();
    closeAudioSettings();
    wrongBookFocusTag.value = String(focusKnowledgeTag || "").trim();
    showWrongBookView();
  }

  function buildCatalogPrefillForStage(stage = currentChallengeStage.value) {
    if (!stage) {
      return null;
    }

    return {
      requestKey: `${selectedChallengeChapterId.value}:${stage.id}:${Date.now()}`,
      subject: selectedSubjectValue.value || "全部",
      grade: currentChallengeChapter.value.grade || "全部年级",
      semester: currentChallengeChapter.value.semester || "全部学期",
      knowledgeTag: stage.knowledgeTag || "",
      difficulty: String(stage.difficulty || ""),
      sourceLabel: `${currentChallengeChapterLabel.value} · 第 ${stage.order} 站 · ${stage.title}`
    };
  }

  function openToolsView(sectionId = "") {
    closeQuizSettings();
    closeAudioSettings();

    showToolsView(sectionId);
  }

  function openCatalogForCurrentChallengeStage() {
    const nextPrefill = buildCatalogPrefillForStage();

    if (!nextPrefill) {
      return;
    }

    catalogPrefill.value = nextPrefill;
    openToolsView(TOOL_SECTION_IDS[1]);
  }

  function openImportView() {
    wrongBookFocusTag.value = "";
    openToolsView(TOOL_SECTION_IDS[2]);
  }

  function openQuizSettings() {
    if (isWrongBookPractice.value) {
      return;
    }

    isAudioSettingsOpen.value = false;
    syncDraftQuizSettings();
    isQuizSettingsOpen.value = true;
  }

  function closeQuizSettings() {
    isQuizSettingsOpen.value = false;
  }

  function openAudioSettings() {
    isQuizSettingsOpen.value = false;
    isAudioSettingsOpen.value = true;
  }

  function closeAudioSettings() {
    isAudioSettingsOpen.value = false;
  }

  function restoreChallengeWorkspaceForCurrentRoute() {
    if (route.name !== APP_ROUTE_NAME.CHALLENGE) {
      return;
    }

    playMode.value = PLAY_MODE.CHALLENGE;
    resetQuizPracticeContext();
  }

  function buildQuizRouteQuery() {
    if (!isChallengeMode.value) {
      return {};
    }

    return {
      mode: PLAY_MODE.CHALLENGE,
      chapter: selectedChallengeChapterId.value,
      stage: selectedStageId.value
    };
  }

  function isSameQuizRouteQuery(nextQuery = {}) {
    const normalizedCurrentMode = String(route.query.mode || "").trim();
    const normalizedCurrentChapter = String(route.query.chapter || "").trim();
    const normalizedCurrentStage = String(route.query.stage || "").trim();
    const normalizedNextMode = String(nextQuery.mode || "").trim();
    const normalizedNextChapter = String(nextQuery.chapter || "").trim();
    const normalizedNextStage = String(nextQuery.stage || "").trim();

    return (
      normalizedCurrentMode === normalizedNextMode &&
      normalizedCurrentChapter === normalizedNextChapter &&
      normalizedCurrentStage === normalizedNextStage
    );
  }

  async function syncQuizRouteQuery() {
    if (currentView.value !== VIEW_MODE.QUIZ || route.name !== APP_ROUTE_NAME.QUIZ) {
      return;
    }

    const nextQuery = buildQuizRouteQuery();

    if (isSameQuizRouteQuery(nextQuery)) {
      return;
    }

    try {
      await router.replace({
        name: APP_ROUTE_NAME.QUIZ,
        query: nextQuery
      });
    } catch {
      // Ignore route sync failures and keep in-memory state usable.
    }
  }

  async function enterQuizWorkspace({
    nextPlayMode = playMode.value,
    nextSettings = null,
    nextStageId = selectedStageId.value,
    nextChallengeChapterId = selectedChallengeChapterId.value
  } = {}) {
    if (nextSettings) {
      applyQuizSettings({
        selectedSubject: selectedSubject.value,
        selectedGrade: selectedGrade.value,
        selectedSemester: selectedSemester.value,
        selectedQuestionCount: selectedQuestionCount.value,
        selectedDifficulty: selectedDifficulty.value,
        selectedTimeLimitSeconds: selectedTimeLimitSeconds.value,
        selectedPointsPerCorrect: selectedPointsPerCorrect.value,
        ...nextSettings
      });
      syncDraftQuizSettings();
    }

    if (nextPlayMode === PLAY_MODE.CHALLENGE) {
      setSelectedChallengeChapter(nextChallengeChapterId);
      const firstUnlockedStageId = challengeProgress.value.unlockedStageIds[0] ?? CHALLENGE_STAGES[0].id;
      selectedStageId.value = challengeProgress.value.unlockedStageIds.includes(nextStageId) ? nextStageId : firstUnlockedStageId;
    }

    playMode.value = nextPlayMode;
    closeAudioSettings();

    if (nextPlayMode === PLAY_MODE.CHALLENGE) {
      openChallengeView({
        nextStageId,
        nextChallengeChapterId,
        preserveOutcome: false
      });
      return;
    }

    currentView.value = VIEW_MODE.QUIZ;
    await loadQuestions();
  }

  async function startHomeChallenge() {
    wrongBookFocusTag.value = "";
    const nextChapter = getChallengeChapterBySelection(homeChallengeGrade.value, homeChallengeSemester.value);
    const nextProgress = getChallengeChapterProgress(challengeProgressBook.value, nextChapter.id);

    await enterQuizWorkspace({
      nextPlayMode: PLAY_MODE.CHALLENGE,
      nextChallengeChapterId: nextChapter.id,
      nextStageId: nextProgress.unlockedStageIds[nextProgress.unlockedStageIds.length - 1] ?? CHALLENGE_STAGES[0].id,
      nextSettings: {
        selectedSubject: DEFAULT_QUIZ_SETTINGS.selectedSubject,
        selectedGrade: nextChapter.grade,
        selectedSemester: nextChapter.semester || DEFAULT_QUIZ_SETTINGS.selectedSemester
      }
    });
  }

  async function startHomeGradePractice() {
    wrongBookFocusTag.value = "";
    resetQuizPracticeContext();
    await enterQuizWorkspace({
      nextPlayMode: PLAY_MODE.FREE,
      nextSettings: {
        selectedSubject: DEFAULT_QUIZ_SETTINGS.selectedSubject,
        selectedGrade: homeGradePracticeGrade.value,
        selectedSemester: supportsSemesterSelection(homeGradePracticeGrade.value)
          ? homeGradePracticeSemester.value
          : DEFAULT_QUIZ_SETTINGS.selectedSemester
      }
    });
  }

  async function startHomeSubjectPractice() {
    wrongBookFocusTag.value = "";
    resetQuizPracticeContext();
    await enterQuizWorkspace({
      nextPlayMode: PLAY_MODE.FREE,
      nextSettings: {
        selectedSubject: homeSubjectPracticeSubject.value,
        selectedGrade: homeSubjectPracticeGrade.value,
        selectedSemester: supportsSemesterSelection(homeSubjectPracticeGrade.value)
          ? homeSubjectPracticeSemester.value
          : DEFAULT_QUIZ_SETTINGS.selectedSemester
      }
    });
  }

  async function startHomeFreePractice() {
    wrongBookFocusTag.value = "";
    resetQuizPracticeContext();
    await enterQuizWorkspace({
      nextPlayMode: PLAY_MODE.FREE
    });
  }

  async function startKnowledgeTagPractice(itemOrLabel) {
    const knowledgeLabel = String(
      typeof itemOrLabel === "string"
        ? itemOrLabel
        : itemOrLabel?.practiceKnowledgeTag || itemOrLabel?.knowledgeTag || itemOrLabel?.label || ""
    ).trim();
    const preferredQuestionCount =
      typeof itemOrLabel === "string"
        ? ""
        : QUESTION_COUNT_OPTIONS.some((option) => option.value === String(itemOrLabel?.preferredQuestionCount || "").trim())
          ? String(itemOrLabel?.preferredQuestionCount || "").trim()
          : "";

    if (!knowledgeLabel) {
      return;
    }

    const knowledgeSummary = studyKnowledgeSummaries.value.find((item) => item.label === knowledgeLabel) ?? null;
    const nextSubject =
      (typeof itemOrLabel === "string" ? "" : itemOrLabel?.primarySubject || "") ||
      knowledgeSummary?.subjects?.[0] ||
      DEFAULT_QUIZ_SETTINGS.selectedSubject;
    const nextGrade =
      (typeof itemOrLabel === "string" ? "" : itemOrLabel?.primaryGrade || "") ||
      knowledgeSummary?.grades?.[0] ||
      DEFAULT_QUIZ_SETTINGS.selectedGrade;
    const nextSemester =
      (typeof itemOrLabel === "string" ? "" : itemOrLabel?.primarySemester || "") ||
      knowledgeSummary?.semesters?.[0] ||
      "";

    wrongBookFocusTag.value = "";
    setQuizPracticeContext({
      source: QUIZ_PRACTICE_SOURCE.KNOWLEDGE,
      knowledgeTag: knowledgeLabel
    });

    await enterQuizWorkspace({
      nextPlayMode: PLAY_MODE.FREE,
      nextSettings: {
        selectedSubject: nextSubject,
        selectedGrade: nextGrade,
        selectedSemester: supportsSemesterSelection(nextGrade) ? nextSemester || "上册" : DEFAULT_QUIZ_SETTINGS.selectedSemester,
        ...(preferredQuestionCount ? { selectedQuestionCount: preferredQuestionCount } : {})
      }
    });
  }

  async function startWrongQuestionReview(questionIds = pendingWrongQuestionIds.value) {
    const ids = Array.isArray(questionIds)
      ? questionIds
          .map((questionId) => Number.parseInt(String(questionId ?? ""), 10))
          .filter((questionId) => Number.isInteger(questionId) && questionId > 0)
      : [];
    const reviewQuestionIds = ids.length > 0 ? ids : pendingWrongQuestionIds.value;

    wrongBookFocusTag.value = "";
    setQuizPracticeContext({
      source: QUIZ_PRACTICE_SOURCE.WRONG_BOOK,
      questionIds: reviewQuestionIds
    });
    playMode.value = PLAY_MODE.FREE;
    closeQuizSettings();
    closeAudioSettings();
    currentView.value = VIEW_MODE.QUIZ;
    await loadQuestions();
  }

  async function startSingleWrongQuestionReview(questionId) {
    if (!questionId) {
      return;
    }

    await startWrongQuestionReview([questionId]);
  }

  onMounted(() => {
    hydrateQuizSettings();
    hydrateChallengeProgress();
    hydrateStudyRecordBook();
    hydrateHomePracticeSelections();
    advanceHomeWelcomeVariant();
    void refreshHomeWelcomeCopy();
    void ensureKnowledgeStudyRuntime();
    void loadChallengeCoverage();
    void loadQuestionStatsSummary();

    void (async () => {
      await syncChallengeProgressFromServer();
    })();

    void (async () => {
      await syncStudyRecordBookFromServer();
    })();

    void (async () => {
      restoreChallengeWorkspaceForCurrentRoute();
      await restoreQuizSessionForCurrentRoute();
      enableQuizSessionPersistence();
      await syncQuizRouteQuery();
    })();
  });

  watch(homeGradePracticeGrade, (nextGrade) => {
    if (!supportsSemesterSelection(nextGrade)) {
      homeGradePracticeSemester.value = homeSemesterOptions.value[0];
    }
  });

  watch(homeChallengeGrade, (nextGrade) => {
    if (!supportsChallengeSemester(nextGrade)) {
      homeChallengeSemester.value = homeSemesterOptions.value[0];
    }
  });

  watch(homeSubjectPracticeSubject, (nextSubject) => {
    if (nextSubject === "英语" && homeSubjectPracticeGrade.value === "一年级") {
      homeSubjectPracticeGrade.value = DEFAULT_QUIZ_SETTINGS.selectedGrade;
    }
  });

  watch(selectedChallengeChapterId, (nextChapterId) => {
    const nextChapter = getChallengeChapter(nextChapterId);
    homeChallengeGrade.value = nextChapter.grade;
    homeChallengeSemester.value = nextChapter.semester || homeSemesterOptions.value[0];
  });

  watch([selectedChallengeChapterId, selectedSubjectValue], () => {
    void loadChallengeCoverage();
  });

  watch(
    [playMode, selectedChallengeChapterId, selectedStageId, quizPracticeContext],
    () => {
      persistQuizSession();
    },
    { deep: true }
  );

  watch(homeSubjectPracticeGrade, (nextGrade) => {
    if (!supportsSemesterSelection(nextGrade)) {
      homeSubjectPracticeSemester.value = homeSemesterOptions.value[0];
    }
  });

  watch(
    [
      selectedSubject,
      selectedGrade,
      selectedSemester,
      selectedQuestionCount,
      selectedDifficulty,
      selectedTimeLimitSeconds,
      selectedPointsPerCorrect
    ],
    () => {
      persistQuizSettings();
    }
  );

  watch(currentView, (nextView) => {
    if (nextView !== VIEW_MODE.QUIZ) {
      closeQuizSettings();
    }
  });

  watch(currentView, (nextView) => {
    if (nextView !== VIEW_MODE.HOME) {
      clearHomeWelcomeRequest();
      stopHomeWelcomeSpeech();
    }

    if (nextView !== VIEW_MODE.HOME || !hasPendingHomeWelcomeSpeech.value) {
      if (nextView === VIEW_MODE.HOME) {
        advanceHomeWelcomeVariant();
        void refreshHomeWelcomeCopy({
          force: isHomeWelcomeProfileJustSaved.value
        });
      }

      return;
    }

    hasPendingHomeWelcomeSpeech.value = false;
    advanceHomeWelcomeVariant();
    void refreshHomeWelcomeCopy({
      force: isHomeWelcomeProfileJustSaved.value
    });
  });

  watch(
    [currentView, () => route.name, playMode, selectedChallengeChapterId, selectedStageId],
    () => {
      void syncQuizRouteQuery();
    }
  );

  watch(
    () => route.name,
    (routeName) => {
      if (routeName === APP_ROUTE_NAME.QUIZ) {
        void restoreQuizSessionForCurrentRoute();
        return;
      }

      if (routeName === APP_ROUTE_NAME.CHALLENGE) {
        restoreChallengeWorkspaceForCurrentRoute();
      }
    }
  );

  onBeforeUnmount(() => {
    clearHomeWelcomeRequest();
    stopHomeWelcomeSpeech();
    clearHomeWelcomeSpeechTimer();
    disposeQuizSession();
    disposeChallengeRuntime();
    disposeStudyRecordRuntime();
  });

  function handleImportFinished() {
    void loadChallengeCoverage();

    if (isQuizView.value) {
      void loadQuestions();
    }
  }

  async function ensureAudioReady() {
    if (!isAudioSupported.value) {
      return false;
    }

    const isReady = await unlockAudioEngine();

    if (isReady) {
      audioStore.setAudioReady(true);
    }

    return isReady;
  }

  async function handleEnableAudio() {
    const isReady = await ensureAudioReady();

    if (isReady) {
      playAudioCue("toggle");
    }
  }

  function applyDraftQuizSettings() {
    const nextSettings = normalizeQuizSettings({
      selectedSubject: draftSelectedSubject.value,
      selectedGrade: draftSelectedGrade.value,
      selectedSemester: draftSelectedSemester.value,
      selectedQuestionCount: draftSelectedQuestionCount.value,
      selectedDifficulty: draftSelectedDifficulty.value,
      selectedTimeLimitSeconds: draftSelectedTimeLimitSeconds.value,
      selectedPointsPerCorrect: draftSelectedPointsPerCorrect.value
    });
    const shouldReloadQuestions =
      nextSettings.selectedSubject !== selectedSubject.value ||
      nextSettings.selectedGrade !== selectedGrade.value ||
      nextSettings.selectedSemester !== selectedSemester.value ||
      (!isChallengeMode.value &&
        (nextSettings.selectedQuestionCount !== selectedQuestionCount.value ||
          nextSettings.selectedDifficulty !== selectedDifficulty.value));

    applyQuizSettings(nextSettings);
    closeQuizSettings();

    if (isQuizView.value && shouldReloadQuestions) {
      loadQuestions();
    }
  }

  function resetDraftQuizSettings() {
    const normalizedDefaults = normalizeQuizSettings(DEFAULT_QUIZ_SETTINGS);

    draftSelectedSubject.value = normalizedDefaults.selectedSubject;
    draftSelectedGrade.value = normalizedDefaults.selectedGrade;
    draftSelectedSemester.value = normalizedDefaults.selectedSemester;
    draftSelectedQuestionCount.value = normalizedDefaults.selectedQuestionCount;
    draftSelectedDifficulty.value = normalizedDefaults.selectedDifficulty;
    draftSelectedTimeLimitSeconds.value = normalizedDefaults.selectedTimeLimitSeconds;
    draftSelectedPointsPerCorrect.value = normalizedDefaults.selectedPointsPerCorrect;
  }

  async function handleMusicToggle() {
    const nextValue = !musicEnabled.value;

    if (nextValue) {
      await ensureAudioReady();
    }

    audioStore.setMusicEnabled(nextValue);
  }

  async function handleSfxToggle() {
    const nextValue = !sfxEnabled.value;

    if (nextValue) {
      const isReady = await ensureAudioReady();
      audioStore.setSfxEnabled(true);

      if (isReady) {
        playAudioCue("toggle");
      }

      return;
    }

    audioStore.setSfxEnabled(false);
  }

  function handleMasterVolumeInput(event) {
    audioStore.setMasterVolume(event.target.value);
  }

  function handleMusicVolumeInput(event) {
    audioStore.setMusicVolume(event.target.value);
  }

  function handleSfxVolumeInput(event) {
    audioStore.setSfxVolume(event.target.value);
  }

  function selectChallengeStage(stageId) {
    if (!challengeProgress.value.unlockedStageIds.includes(stageId)) {
      return;
    }

    selectedStageId.value = stageId;
    clearChallengeOutcome();

    if (isQuizView.value && isChallengeMode.value) {
      loadQuestions();
    }
  }

  function handleQuizFinished(result) {
    if (!isChallengeMode.value) {
      clearChallengeOutcome();
      return;
    }

    const stage = currentStage.value;
    const nextStageBase = CHALLENGE_STAGES[currentStageIndex.value + 1] ?? null;
    const nextStage = nextStageBase ? getChallengeStageConfig(nextStageBase.id, selectedChallengeChapterId.value) : null;
    const starCount = getStageStarCount(result.accuracyPercent, stage.passAccuracy);
    const isPassed = starCount > 0;
    const missionResult = evaluateStageMission(stage, {
      ...result,
      isPassed
    });
    const previousStageResult = challengeProgress.value.bestResults[stage.id] ?? {
      starCount: 0,
      bestAccuracy: 0,
      attempts: 0,
      bestScore: 0,
      rewardEarned: false
    };
    const rewardAlreadyOwned = Boolean(previousStageResult.rewardEarned);
    const rewardCompletedThisRun = isPassed && Boolean(missionResult.completed);
    const rewardUnlocked = rewardCompletedThisRun && !rewardAlreadyOwned;
    const nextProgress = {
      unlockedStageIds: [...challengeProgress.value.unlockedStageIds],
      bestResults: {
        ...challengeProgress.value.bestResults,
        [stage.id]: {
          starCount: Math.max(previousStageResult.starCount, starCount),
          bestAccuracy: Math.max(previousStageResult.bestAccuracy, result.accuracyPercent),
          attempts: previousStageResult.attempts + 1,
          bestScore: Math.max(previousStageResult.bestScore, result.score),
          rewardEarned: rewardAlreadyOwned || rewardCompletedThisRun
        }
      }
    };

    let unlockedNextStage = false;

    if (isPassed && nextStage && !nextProgress.unlockedStageIds.includes(nextStage.id)) {
      nextProgress.unlockedStageIds = CHALLENGE_STAGES.map((challengeStage) => challengeStage.id).filter(
        (challengeStageId) => nextProgress.unlockedStageIds.includes(challengeStageId) || challengeStageId === nextStage.id
      );
      unlockedNextStage = true;
    }

    const achievementEvaluation = evaluateChallengeAchievements(
      {
        ...nextProgress,
        achievements: challengeProgress.value.achievements
      },
      {
        stage,
        result,
        isPassed,
        missionResult,
        questionResults: result.questionResults
      },
      { totalStageCount: CHALLENGE_STAGES.length }
    );
    const resolvedProgress = {
      ...nextProgress,
      achievements: achievementEvaluation.achievementStates
    };

    applyChallengeProgress(resolvedProgress);
    void persistChallengeProgress(resolvedProgress);
    latestChallengeOutcome.value = buildChallengeOutcome({
      stage,
      result,
      starCount,
      isPassed,
      nextStage,
      unlockedNextStage,
      missionResult,
      rewardUnlocked,
      rewardAlreadyOwned,
      newAchievements: achievementEvaluation.achievements.filter((achievement) => achievement.fresh),
      routeTitle: currentChallengeRouteTitle.value
    });
  }

  function handleQuizRestart() {
    clearChallengeOutcome();
  }

  function handleNextStage() {
    const nextStageId = latestChallengeOutcome.value?.nextStageId;

    if (!nextStageId) {
      return;
    }

    openChallengeView({
      nextStageId,
      preserveOutcome: true
    });
  }

  return {
    VIEW_MODE,
    PLAY_MODE,
    SUBJECT_OPTIONS,
    GRADE_OPTIONS,
    SEMESTER_OPTIONS,
    QUESTION_COUNT_OPTIONS,
    DIFFICULTY_OPTIONS,
    TIME_LIMIT_OPTIONS,
    SCORE_OPTIONS,
    QUIZ_SETTINGS_STORAGE_KEY,
    CHALLENGE_PROGRESS_STORAGE_KEY,
    CHALLENGE_PERSISTENCE_STATE,
    CHALLENGE_STAGES,
    CHALLENGE_CHAPTERS,
    DEFAULT_QUIZ_SETTINGS,
    normalizeSelectValue,
    getDifficultyLabel,
    getChallengeStage,
    getChallengeChapter,
    getStageStarCount,
    getStageStarText,
    normalizeChallengeProgress,
    normalizeChallengeProgressBook,
    mergeChallengeProgress,
    mergeChallengeProgressBooks,
    isChallengeProgressEqual,
    isChallengeProgressBookEqual,
    buildChallengeOutcome,
    normalizeQuizSettings,
    quizStore,
    audioStore,
    questions,
    isLoading,
    errorMessage,
    currentView,
    playMode,
    selectedSubject,
    selectedGrade,
    selectedSemester,
    selectedQuestionCount,
    selectedDifficulty,
    selectedTimeLimitSeconds,
    selectedPointsPerCorrect,
    draftSelectedSubject,
    draftSelectedGrade,
    draftSelectedSemester,
    draftSelectedQuestionCount,
    draftSelectedDifficulty,
    draftSelectedTimeLimitSeconds,
    draftSelectedPointsPerCorrect,
    homeChallengeGrade,
    homeChallengeSemester,
    homeGradePracticeGrade,
    homeGradePracticeSemester,
    homeSubjectPracticeSubject,
    homeSubjectPracticeGrade,
    homeSubjectPracticeSemester,
    homeWelcomePanel,
    isQuizSettingsOpen,
    isAudioSettingsOpen,
    adminKey,
    activeToolSectionId,
    activeSettingsSectionId,
    studyRecordBook,
    questionStats,
    wrongBookFocusTag,
    quizPracticeContext,
    catalogPrefill,
    selectedChallengeChapterId,
    selectedStageId,
    challengeProgressBook,
    challengeProgress,
    latestChallengeOutcome,
    challengePersistenceState,
    audioReady,
    isAudioSupported,
    masterVolume,
    musicEnabled,
    musicVolume,
    sfxEnabled,
    sfxVolume,
    refreshButtonClass,
    isQuizView,
    isChallengeMode,
    selectedSubjectValue,
    selectedGradeValue,
    shouldShowSemesterFilter,
    selectedSemesterValue,
    selectedQuestionCountValue,
    selectedDifficultyValue,
    selectedDifficultyLabel,
    selectedTimeLimitSecondsValue,
    selectedPointsPerCorrectValue,
    draftShouldShowSemesterFilter,
    challengeChapterOptions,
    homeGradeOptions,
    homeSubjectOptions,
    homeSemesterOptions,
    homeSubjectPracticeGradeOptions,
    studyInitialGradeFilter,
    selectedStudyLessonId,
    selectedScopeLabel,
    knowledgeSystematicSections,
    knowledgeStudyItems,
    isKnowledgeRoutesLoading,
    selectedStudyLesson,
    nextStudyLesson,
    wrongQuestionItems,
    homeKnowledgeSpotlight,
    homeWrongBookSpotlight,
    knowledgeStudyOverview,
    wrongBookOverview,
    currentChallengeChapter,
    currentChallengeChapterLabel,
    currentChallengeRouteTitle,
    currentChallengeRouteFocus,
    homeChallengeChapter,
    homeChallengeLabel,
    homeChallengeRouteTitle,
    currentStage,
    currentStageIndex,
    currentStageLabel,
    currentChallengeHomeLabel,
    challengeRewardCount,
    challengeRewardProgressLabel,
    challengeAchievements,
    challengeAchievementCount,
    challengeAchievementProgressLabel,
    challengeCoverageSummaryLabel,
    shouldShowChallengeCatalogShortcut,
    activeQuestionCountValue,
    activeDifficultyValue,
    activeDifficultyLabel,
    activeTimeLimitSecondsValue,
    activeTimeLimitLabel,
    activePointsPerCorrectValue,
    quizSummaryLead,
    hasPendingQuizSettingsChanges,
    isUsingDefaultDraftQuizSettings,
    quizSettingsHeadingDescription,
    shouldShowQuizSettingsButton,
    settingsButtonText,
    challengeLaunchLabel,
    freePracticeRuleLabel,
    refreshButtonText,
    loadingStateText,
    hasQuestions,
    showQuizStateCard,
    quizStateTone,
    quizStateEyebrow,
    quizStateLabel,
    quizStateTitle,
    quizStateText,
    quizStateStats,
    quizStateHint,
    challengeToast,
    challengeStages,
    currentChallengeStage,
    challengeRouteProgressStyle,
    isAudioMuted,
    audioStatusLabel,
    audioStatusClass,
    audioHint,
    masterVolumeText,
    musicVolumeText,
    sfxVolumeText,
    audioEntryHint,
    applyQuizSettings,
    syncDraftQuizSettings,
    hydrateQuizSettings,
    hydrateStudyRecordBook,
    hydrateHomePracticeSelections,
    persistQuizSettings,
    persistStudyRecordBook,
    persistStudyRecordBookToServer,
    applyChallengeProgress,
    applyChallengeProgressBook,
    hydrateChallengeProgress,
    persistChallengeProgressCache,
    syncChallengeProgressFromServer,
    persistChallengeProgress,
    restoreChallengeProgressBook,
    restoreStudyRecordBook,
    applyProfileDefaultsToHome,
    queueHomeWelcomeMascotSpeech,
    handlePlayHomeWelcomeVoice,
    getViewTabClass,
    getChallengeStageClass,
    clearChallengeOutcome,
    openHomeView,
    openChallengeView,
    openQuizView,
    openStudyView,
    openStudyLessonPlayer,
    closeStudyLessonPlayer,
    completeStudyLesson,
    openWrongBookView,
    openToolsView,
    openCatalogView,
    openCatalogForCurrentChallengeStage,
    openImportView,
    normalizeSettingsSectionId,
    openQuizSettings,
    closeQuizSettings,
    openAudioSettings,
    closeAudioSettings,
    loadQuestions,
    enterQuizWorkspace,
    startHomeChallenge,
    startHomeGradePractice,
    startHomeSubjectPractice,
    startHomeFreePractice,
    startKnowledgeTagPractice,
    startWrongQuestionReview,
    startSingleWrongQuestionReview,
    handleImportFinished,
    ensureAudioReady,
    handleEnableAudio,
    handleDraftGradeChange,
    applyDraftQuizSettings,
    resetDraftQuizSettings,
    handleMusicToggle,
    handleSfxToggle,
    handleMasterVolumeInput,
    handleMusicVolumeInput,
    handleSfxVolumeInput,
    selectChallengeStage,
    handleQuizQuestionResolved,
    handleQuizFinished,
    handleQuizRestart,
    handleNextStage,
  };
}
