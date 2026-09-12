import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useQuizAudio } from "../composables/useQuizAudio";
import { createQuizAiReview } from "../composables/quiz/useQuizAiReview";
import { createQuizTimer } from "../composables/quiz/useQuizTimer";
import { submitQuestionAnswer } from "../services/questionsApi";
import { useAudioStore } from "../stores/useAudioStore";
import { ANSWER_STATUS, useQuizStore } from "../stores/useQuizStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { getEffectiveChallengeTimeLimitSeconds } from "../utils/challengeStageRules";
import {
  PLAY_STRATEGY_MODE,
  getGradePlayGoalState,
  getGradePlayRewardConfig,
  getQuizCorrectReward,
  getQuizWrongPenalty,
  isBalloonOptionGrade,
  isStrategyGrade,
  isVoyageOptionGrade
} from "../utils/quizPlayRewards";

const DEFAULT_GRADE_THEME = Object.freeze({
  key: "harbor",
  sceneLabel: "知识小岛",
  promptHint: "看清题目，再挑一个答案。",
  visualHint: "先看图里的线索，再选答案。",
  actionLabel: "挑一个答案",
  companionName: "猫头鹰老师",
  readyLine: "慢慢读题",
  idleTitle: "稳稳看题，准备出发",
  startLine: "先读题，再挑一个你最有把握的答案。",
  winLine: "答对啦，下一颗星就在前面。",
  retryLine: "别急，看完提示再继续。",
  timeoutLine: "时间到了，这题先记下来。",
  finishLine: "这一轮结束啦，去看看你的成绩卡。",
  playfulGrid: false,
  colors: Object.freeze({
    accent: "#7cd8b8",
    accentSoft: "rgba(124, 216, 184, 0.22)",
    accentCloud: "rgba(173, 235, 255, 0.24)",
    accentWarm: "#ffd870",
    accentWarmSoft: "rgba(255, 231, 156, 0.24)",
    panelStart: "rgba(255, 255, 255, 0.98)",
    panelEnd: "rgba(244, 249, 252, 0.92)",
    optionStart: "rgba(255, 255, 255, 0.96)",
    optionEnd: "rgba(248, 251, 253, 0.9)"
  })
});

const GRADE_THEME_MAP = Object.freeze({
  一年级: {
    key: "g1",
    sceneLabel: "气球乐园",
    promptHint: "看一看，点出对的那个。",
    visualHint: "先看图，再点一颗对的气球。",
    actionLabel: "点一颗气球",
    companionName: "咕咕队长",
    readyLine: "出发找答案",
    idleTitle: "跟着气球去找答案",
    startLine: "先读题，再点一个你觉得对的气球。",
    winLine: "答对啦，我们继续去收星星。",
    retryLine: "别急，先看提示，再试一次。",
    timeoutLine: "时间到了，这题先放进复习袋。",
    finishLine: "这一轮闯完啦，去看看你的星星卡。",
    playfulGrid: true,
    colors: {
      accent: "#66d9b5",
      accentSoft: "rgba(102, 217, 181, 0.24)",
      accentCloud: "rgba(255, 193, 214, 0.24)",
      accentWarm: "#ffcf6a",
      accentWarmSoft: "rgba(255, 221, 137, 0.28)",
      panelStart: "rgba(255, 255, 255, 0.99)",
      panelEnd: "rgba(255, 248, 239, 0.95)",
      optionStart: "rgba(255, 255, 255, 0.98)",
      optionEnd: "rgba(255, 244, 222, 0.94)"
    }
  },
  二年级: {
    key: "g2",
    sceneLabel: "彩桥探险站",
    promptHint: "先观察，再选答案。",
    visualHint: "看清图片里的线索，再作答。",
    actionLabel: "挑一块彩石",
    companionName: "咕咕伙伴",
    readyLine: "跟上彩桥节奏",
    idleTitle: "先观察，再往前走",
    startLine: "先把题意看明白，再挑一个答案。",
    winLine: "这块彩石拿稳了，继续往前。",
    retryLine: "先看提示，把这一步补稳。",
    timeoutLine: "时间到了，这题先放进回看包。",
    finishLine: "这一站走完啦，看看你点亮了多少桥灯。",
    playfulGrid: true,
    colors: {
      accent: "#56c8e8",
      accentSoft: "rgba(86, 200, 232, 0.22)",
      accentCloud: "rgba(147, 232, 193, 0.24)",
      accentWarm: "#ffd36c",
      accentWarmSoft: "rgba(255, 225, 133, 0.24)",
      panelStart: "rgba(255, 255, 255, 0.99)",
      panelEnd: "rgba(241, 251, 255, 0.95)",
      optionStart: "rgba(255, 255, 255, 0.98)",
      optionEnd: "rgba(237, 249, 255, 0.94)"
    }
  },
  三年级: {
    key: "g3",
    sceneLabel: "远航码头",
    promptHint: "抓住线索，选最合适的答案。",
    visualHint: "先看图里的关键信息，再作答。",
    actionLabel: "选一张航海卡",
    companionName: "领航猫头鹰",
    readyLine: "准备扬帆",
    idleTitle: "看清线索，再稳稳出发",
    startLine: "先观察，再选最合适的答案。",
    winLine: "方向找对了，继续往前航行。",
    retryLine: "先把这道题想透，再继续。",
    timeoutLine: "这题先记下来，回头补稳。",
    finishLine: "这轮远航结束啦，去看看你的航海记录。",
    playfulGrid: true,
    colors: {
      accent: "#45c6c8",
      accentSoft: "rgba(69, 198, 200, 0.22)",
      accentCloud: "rgba(104, 176, 235, 0.22)",
      accentWarm: "#ffcb75",
      accentWarmSoft: "rgba(255, 220, 160, 0.22)",
      panelStart: "rgba(255, 255, 255, 0.98)",
      panelEnd: "rgba(241, 250, 253, 0.94)",
      optionStart: "rgba(255, 255, 255, 0.97)",
      optionEnd: "rgba(240, 251, 250, 0.93)"
    }
  },
  四年级: {
    key: "g4",
    sceneLabel: "山径训练营",
    promptHint: "先找题眼，再稳稳作答。",
    visualHint: "看清图示和条件，再作答。",
    actionLabel: "锁定答案",
    companionName: "猫头鹰教练",
    readyLine: "找准题眼",
    idleTitle: "抓住题眼，再往前走",
    startLine: "先看清条件，再选答案。",
    winLine: "这一步走得很稳，继续。",
    retryLine: "把关键条件再对一遍。",
    timeoutLine: "时间到了，这题先做个记号。",
    finishLine: "训练营这一轮结束了，去看你的成绩记录。",
    playfulGrid: false,
    colors: {
      accent: "#6fc48d",
      accentSoft: "rgba(111, 196, 141, 0.2)",
      accentCloud: "rgba(196, 225, 151, 0.24)",
      accentWarm: "#f4c15c",
      accentWarmSoft: "rgba(244, 193, 92, 0.2)",
      panelStart: "rgba(255, 255, 255, 0.98)",
      panelEnd: "rgba(246, 249, 241, 0.94)",
      optionStart: "rgba(255, 255, 255, 0.97)",
      optionEnd: "rgba(245, 250, 244, 0.93)"
    }
  },
  五年级: {
    key: "g5",
    sceneLabel: "思维工坊",
    promptHint: "看关键信息，再落点作答。",
    visualHint: "先看清图示关系，再作答。",
    actionLabel: "确定答案",
    companionName: "猫头鹰导师",
    readyLine: "先判断再作答",
    idleTitle: "先理清条件，再出手",
    startLine: "看关键信息，再做判断。",
    winLine: "判断很稳，继续推进。",
    retryLine: "先把关键一步补回来。",
    timeoutLine: "这题先做记号，稍后补回。",
    finishLine: "这一轮工坊训练结束了，去看你的整理卡。",
    playfulGrid: false,
    colors: {
      accent: "#e0a14c",
      accentSoft: "rgba(224, 161, 76, 0.2)",
      accentCloud: "rgba(118, 192, 210, 0.22)",
      accentWarm: "#ffd88a",
      accentWarmSoft: "rgba(255, 216, 138, 0.2)",
      panelStart: "rgba(255, 255, 255, 0.98)",
      panelEnd: "rgba(250, 247, 241, 0.94)",
      optionStart: "rgba(255, 255, 255, 0.97)",
      optionEnd: "rgba(252, 248, 240, 0.93)"
    }
  },
  六年级: {
    key: "g6",
    sceneLabel: "星港冲刺营",
    promptHint: "锁定关键条件，直接作答。",
    visualHint: "先抓住图示里的关键条件，再作答。",
    actionLabel: "直接作答",
    companionName: "猫头鹰老师",
    readyLine: "锁定关键条件",
    idleTitle: "关键信息先看准",
    startLine: "先锁定关键条件，再直接作答。",
    winLine: "这题处理得很干净，继续。",
    retryLine: "把条件再核对一遍，这题能补回来。",
    timeoutLine: "这题先留痕，回头补稳。",
    finishLine: "这一轮冲刺结束了，去看完整成绩卡。",
    playfulGrid: false,
    colors: {
      accent: "#5d83e7",
      accentSoft: "rgba(93, 131, 231, 0.22)",
      accentCloud: "rgba(129, 207, 255, 0.22)",
      accentWarm: "#ffd36b",
      accentWarmSoft: "rgba(255, 211, 107, 0.2)",
      panelStart: "rgba(255, 255, 255, 0.98)",
      panelEnd: "rgba(242, 247, 255, 0.94)",
      optionStart: "rgba(255, 255, 255, 0.97)",
      optionEnd: "rgba(241, 246, 255, 0.93)"
    }
  }
});

const DEFAULT_PROMPT_SCENE_META = Object.freeze({
  badge: "观察小舞台",
  note: "先看看图里的线索，再作答。"
});

const GRADE_PROMPT_SCENE_META = Object.freeze({
  一年级: {
    badge: "气球小舞台",
    note: "看图找一找，再点出对的答案。"
  },
  二年级: {
    badge: "贴纸观察台",
    note: "先看清图里的小线索，再作答。"
  },
  三年级: {
    badge: "线索小码头",
    note: "先观察，再选最合适的答案。"
  },
  四年级: {
    badge: "观察台",
    note: "先看图示和条件，再判断。"
  },
  五年级: {
    badge: "信息板",
    note: "先整理关键信息，再作答。"
  },
  六年级: {
    badge: "条件示意区",
    note: "先抓住关键条件，再直接作答。"
  }
});

function resolveGradeTheme(gradeLabel) {
  const normalizedGrade = String(gradeLabel || "").trim();

  if (!normalizedGrade) {
    return DEFAULT_GRADE_THEME;
  }

  const matchedTheme = GRADE_THEME_MAP[normalizedGrade];

  if (!matchedTheme) {
    return DEFAULT_GRADE_THEME;
  }

  return Object.freeze({
    ...DEFAULT_GRADE_THEME,
    ...matchedTheme,
    colors: {
      ...DEFAULT_GRADE_THEME.colors,
      ...matchedTheme.colors
    }
  });
}

function buildQuizThemeStyle(theme) {
  return {
    "--quiz-theme-accent": theme.colors.accent,
    "--quiz-theme-accent-soft": theme.colors.accentSoft,
    "--quiz-theme-accent-cloud": theme.colors.accentCloud,
    "--quiz-theme-accent-warm": theme.colors.accentWarm,
    "--quiz-theme-accent-warm-soft": theme.colors.accentWarmSoft,
    "--quiz-theme-panel-start": theme.colors.panelStart,
    "--quiz-theme-panel-end": theme.colors.panelEnd,
    "--quiz-theme-option-start": theme.colors.optionStart,
    "--quiz-theme-option-end": theme.colors.optionEnd
  };
}

function resolvePromptSceneMeta(gradeLabel) {
  return GRADE_PROMPT_SCENE_META[String(gradeLabel || "").trim()] || DEFAULT_PROMPT_SCENE_META;
}

function buildGradeSemesterLabel(gradeLabel, semesterLabel) {
  const normalizedGrade = String(gradeLabel || "").trim();
  const normalizedSemester = String(semesterLabel || "").trim();

  if (!normalizedGrade && !normalizedSemester) {
    return "";
  }

  if (!normalizedSemester || normalizedSemester === "通用") {
    return normalizedGrade || normalizedSemester;
  }

  return [normalizedGrade, normalizedSemester].filter(Boolean).join(" · ");
}

function normalizeQuestionContent(content) {
  return String(content || "").replace(/\s+/g, " ").trim();
}

function stripQuestionTailPunctuation(content) {
  return normalizeQuestionContent(content).replace(/[。！？!?]+$/u, "").trim();
}

function buildLowerGradeQuestionLead(content) {
  const original = stripQuestionTailPunctuation(content);

  if (!original) {
    return "";
  }

  const pairMatch = original.match(/和([“"'《][^”"'》]{1,12}[”"'》]|[^，。！？]{1,8})相对的是(?:哪一个|哪个)?词$/u);
  if (pairMatch) {
    return `找和${pairMatch[1]}相对的词`;
  }

  const pronunciationMatch = original.match(
    /([“"'《][^”"'》]{1,12}[”"'》])(?:的)?(?:正确)?读音是(?:哪一个|哪个|什么)?$/u
  );
  if (pronunciationMatch) {
    return `找${pronunciationMatch[1]}的读音`;
  }

  const readingMatch = original.match(/([“"'《][^”"'》]{1,12}[”"'》])怎么读$/u);
  if (readingMatch) {
    return `找${readingMatch[1]}的读音`;
  }

  const meaningMatch = original.match(/([“"'《][^”"'》]{1,12}[”"'》])是什么意思$/u);
  if (meaningMatch) {
    return `找${meaningMatch[1]}的意思`;
  }

  const contextStripped = original
    .replace(/^在[《“"'][^，。！？]{1,20}[》”"']?(?:里|中|课文里|句子里)?，?/u, "")
    .replace(/^(?:请(?:你|同学)?|请选出|选出|请选择|下面|下列)+/u, "")
    .replace(/^[，、\s]+/u, "")
    .trim();

  if (contextStripped && contextStripped.length <= Math.max(original.length - 3, 8)) {
    return contextStripped;
  }

  return original;
}

function getOptionByKey(question, optionKey) {
  if (!question || !optionKey || !Array.isArray(question.options)) {
    return null;
  }

  return question.options.find((option) => option?.key === optionKey) ?? null;
}

export function useQuizView(props, emit) {
  const quizStore = useQuizStore();

  const quizAudio = useQuizAudio();
  const audioStore = useAudioStore();
  const settingsStore = useSettingsStore();
  settingsStore.hydrate();

  const { answerState, consecutiveCorrectCount, currentQuestionIndex, currentScore } = storeToRefs(quizStore);
  const { masterVolume, sfxVolume } = storeToRefs(audioStore);
  const { coachingPreferences } = storeToRefs(settingsStore);

  let autoAdvanceTimer = null;

  let submitController = null;

  const isSubmitting = ref(false);

  const selectedOptionKey = ref(null);

  const showExplanation = ref(false);

  const showResultModal = ref(false);
  const showCorrectStarAnimation = ref(false);

  const resultAutoAdvanceTimer = ref(4);

  const selectedStrategyMode = ref(PLAY_STRATEGY_MODE.STEADY);

  let resultAutoAdvanceInterval = null;
  let correctAutoAdvanceTimer = null;

  function clearResultAutoAdvanceTimer() {
    if (resultAutoAdvanceInterval) {
      clearInterval(resultAutoAdvanceInterval);
      resultAutoAdvanceInterval = null;
    }

    if (correctAutoAdvanceTimer) {
      clearTimeout(correctAutoAdvanceTimer);
      correctAutoAdvanceTimer = null;
    }
  }

  function handleModalAdvance() {
    clearResultAutoAdvanceTimer();
    showResultModal.value = false;
    showCorrectStarAnimation.value = false;
    showExplanation.value = false;
    goToNextQuestion();
  }

  function startAutoAdvance(isCorrect = false) {
    clearResultAutoAdvanceTimer();

    if (isCorrect) {
      showCorrectStarAnimation.value = true;
      correctAutoAdvanceTimer = setTimeout(() => {
        correctAutoAdvanceTimer = null;
        showCorrectStarAnimation.value = false;
        goToNextQuestion();
      }, correctFeedbackDelay.value);
    } else {
      resultAutoAdvanceTimer.value = wrongFeedbackDelaySeconds.value;
      showResultModal.value = true;
      showExplanation.value = true;
      resultAutoAdvanceInterval = setInterval(() => {
        resultAutoAdvanceTimer.value -= 1;
        if (resultAutoAdvanceTimer.value <= 0) {
          handleModalAdvance();
        }
      }, 1000);
    }
  }

  const feedback = ref(null);

  const submitErrorMessage = ref("");

  const correctCount = ref(0);

  const wrongCount = ref(0);

  const bestCorrectStreak = ref(0);

  const lastPointsEarned = ref(0);

  const sessionRewardCount = ref(0);

  const sprintAttemptCount = ref(0);

  const sprintSuccessCount = ref(0);

  const lastMilestoneUnlocked = ref(false);

  const lastRewardLabel = ref("");

  const lastWrongPenalty = ref(0);

  const questionResults = ref([]);
  const questionAttempts = ref([]);

  const hasReportedFinish = ref(false);

  const hasPlayedChallengeFinish = ref(false);

  const hasQuestions = computed(() => props.questions.length > 0);

  const currentQuestion = computed(() => props.questions[currentQuestionIndex.value] ?? null);

  const isFinished = computed(() => hasQuestions.value && !currentQuestion.value);

  const isChallengeMode = computed(() => props.playMode === "challenge");

  const effectiveQuestionTimeLimitSeconds = computed(() =>
    isChallengeMode.value
      ? getEffectiveChallengeTimeLimitSeconds(
          props.challengeStage,
          props.questionTimeLimitSeconds,
          currentQuestionIndex.value,
          props.questions.length
        )
      : props.questionTimeLimitSeconds
  );

  const aiSpeechVolume = computed(() =>
    Math.max(0, Math.min(1, Number(masterVolume.value || 0) * Number(sfxVolume.value || 0)))
  );
  const effectiveTtsVoice = computed(() => {
    const runtimeVoice = String(settingsStore.effectiveTtsRuntimeConfig?.ttsVoice || "").trim();

    return runtimeVoice || coachingPreferences.value?.aiReviewVoice || "coral";
  });
  const effectiveTtsAudioFormat = computed(() => {
    const runtimeFormat = String(settingsStore.effectiveTtsRuntimeConfig?.ttsAudioFormat || "").trim().toLowerCase();

    if (["mp3", "wav", "pcm16"].includes(runtimeFormat)) {
      return runtimeFormat;
    }

    return "mp3";
  });
  const quizTimer = createQuizTimer({
    ANSWER_STATUS,
    currentQuestion,
    answerState,
    isSubmitting,
    effectiveQuestionTimeLimitSeconds,
    onTimeExpired: handleTimeExpired
  });
  const {
    timeRemainingMs,
    timedOut,
    hasTimeLimit,
    timeLimitMs,
    timeRemainingSeconds,
    timerPercent,
    timerTone,
    showCountdown,
    clearCountdownTimer,
    startCountdown,
    pauseCountdown,
    syncQuestionTimer,
    disposeQuizTimer
  } = quizTimer;
  const quizAiReview = createQuizAiReview({
    coachingPreferences,
    settingsStore,
    unlockAudio: () => quizAudio.unlockAudio(),
    aiSpeechVolume,
    effectiveTtsVoice,
    effectiveTtsAudioFormat,
    scheduleNextQuestion,
    getAttempts: () => questionAttempts.value.filter(Boolean),
    getCurrentScore: () => currentScore.value,
    getCorrectCount: () => correctCount.value,
    getWrongCount: () => wrongCount.value,
    getTotalQuestions: () => props.questions.length,
    getAccuracyPercent: () => accuracyPercent.value,
    getPlayMode: () => props.playMode,
    getStageTitle: () => props.stageTitle
  });
  const {
    aiReview,
    aiReviewStatus,
    aiReviewErrorMessage,
    isAiReviewExpanded,
    hasExpandedAiReviewOnce,
    aiSpeechStatus,
    aiSpeechErrorMessage,
    quizSummary,
    quizSummaryMeta,
    quizSummaryStatus,
    quizSummaryErrorMessage,
    quizSummarySpeechStatus,
    quizSummarySpeechErrorMessage,
    resetAiReviewState,
    toggleAiReviewExpanded: toggleAiReviewExpandedState,
    resetQuizSummaryState,
    loadAiReview,
    handlePlayAiReview,
    loadQuizSummary,
    handlePlayQuizSummary,
    stopAiReviewSpeech,
    stopQuizSummarySpeech,
    disposeQuizAiReview
  } = quizAiReview;

  function normalizeCompanionLine(value, maxLength = 42) {
    const normalizedValue = String(value || "").replace(/\s+/g, " ").trim();

    if (!normalizedValue) {
      return "";
    }

    const firstSentence = normalizedValue.split(/[。！？!?]/)[0]?.trim() || normalizedValue;
    const candidate = firstSentence || normalizedValue;

    if (candidate.length <= maxLength) {
      return candidate;
    }

    return `${candidate.slice(0, maxLength).trim()}…`;
  }

  function pickFirstCompanionLine(...values) {
    for (const value of values) {
      const candidate = normalizeCompanionLine(value);

      if (candidate) {
        return candidate;
      }
    }

    return "";
  }

  const shouldAutoAdvanceOnCorrect = computed(() => Boolean(coachingPreferences.value?.autoAdvanceOnCorrect));
  const effectiveAutoAdvanceDelay = computed(() =>
    Number.isFinite(Number(coachingPreferences.value?.autoAdvanceDelayMs))
      ? Number(coachingPreferences.value.autoAdvanceDelayMs)
      : props.autoAdvanceDelay
  );

  const canAnswer = computed(
    () => Boolean(currentQuestion.value) && answerState.value === ANSWER_STATUS.WAITING && !isSubmitting.value
  );

  const answeredCount = computed(() => correctCount.value + wrongCount.value);

  const activeGradeLabel = computed(() => {
    const currentGrade = String(currentQuestion.value?.grade || "").trim();

    if (currentGrade) {
      return currentGrade;
    }

    const firstQuestionGrade = props.questions
      .map((question) => String(question?.grade || "").trim())
      .find(Boolean);

    if (firstQuestionGrade) {
      return firstQuestionGrade;
    }

    return String(props.challengeStage?.grade || "").trim();
  });

  const activeSemesterLabel = computed(() => {
    const currentSemester = String(currentQuestion.value?.semester || "").trim();

    if (currentSemester) {
      return currentSemester;
    }

    const firstQuestionSemester = props.questions
      .map((question) => String(question?.semester || "").trim())
      .find(Boolean);

    if (firstQuestionSemester) {
      return firstQuestionSemester;
    }

    return String(props.challengeStage?.semester || "").trim();
  });

  const activeGradeSemesterLabel = computed(() =>
    buildGradeSemesterLabel(activeGradeLabel.value, activeSemesterLabel.value)
  );

  const useBalloonOptions = computed(() => isBalloonOptionGrade(activeGradeLabel.value));
  const useVoyageOptions = computed(() => isVoyageOptionGrade(activeGradeLabel.value));
  const useStrategyOptions = computed(() => isStrategyGrade(activeGradeLabel.value));
  const answerOptionVariant = computed(() => (useVoyageOptions.value ? "voyage" : "strategy"));
  const playRewardConfig = computed(() => getGradePlayRewardConfig(activeGradeLabel.value));
  const playGoalState = computed(() =>
    getGradePlayGoalState({
      grade: activeGradeLabel.value,
      correctCount: correctCount.value,
      streakCount: consecutiveCorrectCount.value,
      rewardCount: sessionRewardCount.value,
      showCompletedMilestone: lastMilestoneUnlocked.value
    })
  );
  const playGoalProgressNodes = computed(() =>
    Array.from({ length: playGoalState.value?.target || 0 }, (_, index) => ({
      id: index + 1,
      filled: index < (playGoalState.value?.progress || 0)
    }))
  );
  const playGoalLabel = computed(() => {
    if (!playGoalState.value) {
      return "";
    }

    if (playGoalState.value.remaining === 0 && sessionRewardCount.value > 0) {
      return `${playGoalState.value.rewardLabel}到手`;
    }

    const action = playGoalState.value.metric === "streak" ? "连续答对" : "再答对";
    return `${action} ${playGoalState.value.remaining} 题得${playGoalState.value.rewardLabel}`;
  });
  const playGoalCountLabel = computed(() =>
    playGoalState.value ? `${playGoalState.value.countLabel} × ${sessionRewardCount.value}` : ""
  );
  const strategyOptions = computed(() => {
    const basePoints = Math.max(0, Number(props.pointsPerCorrect) || 0);

    return [
      {
        value: PLAY_STRATEGY_MODE.STEADY,
        label: "稳答",
        detail: `答对 +${basePoints} 分`
      },
      {
        value: PLAY_STRATEGY_MODE.SPRINT,
        label: "冲刺",
        detail: `答对 +${basePoints + 5} 分，答错 -5 分`
      }
    ];
  });
  const correctFeedbackDelay = computed(() => {
    if (activeGradeLabel.value === "一年级") return 1200;
    if (activeGradeLabel.value === "二年级") return 1050;
    if (activeGradeLabel.value === "三年级") return 850;
    return 650;
  });
  const wrongFeedbackDelaySeconds = computed(() =>
    useBalloonOptions.value ? 4 : 3
  );

  const quizTheme = computed(() => resolveGradeTheme(activeGradeLabel.value));

  const quizThemeClass = computed(() => `quiz-view--${quizTheme.value.key}`);

  const quizThemeStyle = computed(() => buildQuizThemeStyle(quizTheme.value));

  const progressPercent = computed(() => {
    if (!props.questions.length) {
      return 0;
    }

    return Math.min(100, Math.round((answeredCount.value / props.questions.length) * 100));
  });

  const accuracyPercent = computed(() => {
    if (!answeredCount.value) {
      return 0;
    }

    return Math.round((correctCount.value / answeredCount.value) * 100);
  });

  const resultTitle = computed(() => {
    if (isChallengeMode.value) {
      return props.challengeResult?.title || "正在结算本关";
    }

    if (accuracyPercent.value >= 100) {
      return "完美通关";
    }

    if (accuracyPercent.value >= 67) {
      return "闯关成功";
    }

    return "继续加油";
  });

  const resultText = computed(() => {
    if (isChallengeMode.value) {
      return props.challengeResult?.summary || "咕咕老师正在整理本关成绩。";
    }

    if (accuracyPercent.value >= 100) {
      return "这轮答题全对，猫头鹰已经把你认作知识岛小队长了。";
    }

    if (accuracyPercent.value >= 67) {
      return "整体表现很稳，再练一轮就有机会拿满分。";
    }

    return "已经完成整轮练习，回看趣味解析再来一轮会更稳。";
  });

  const finishKnowledgeTag = computed(() => {
    const tagCounter = new Map();

    for (const question of props.questions) {
      const knowledgeTag = String(question?.knowledgeTag || "").trim();

      if (!knowledgeTag) {
        continue;
      }

      tagCounter.set(knowledgeTag, (tagCounter.get(knowledgeTag) || 0) + 1);
    }

    return Array.from(tagCounter.entries()).sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0]?.[0] || "";
  });

  const showKnowledgeFollowupAction = computed(() => Boolean(finishKnowledgeTag.value));

  const knowledgeFollowupButtonLabel = computed(() =>
    finishKnowledgeTag.value ? `继续练 ${finishKnowledgeTag.value}` : "去知识点学习"
  );

  const showWrongReviewAction = computed(() => wrongCount.value > 0);

  const ruleSummary = computed(() =>
    hasTimeLimit.value
      ? `答对 +${props.pointsPerCorrect} 分 · 每题限时 ${effectiveQuestionTimeLimitSeconds.value} 秒`
      : `答对 +${props.pointsPerCorrect} 分 · 本轮不限时`
  );

  const journeyHeading = computed(() => {
    const questionNumberLabel = `第 ${currentQuestionIndex.value + 1} 题`;

    // 关卡名只在顶部冒险条出现，题卡内不再重复。
    if (isChallengeMode.value) {
      return questionNumberLabel;
    }

    return `${questionNumberLabel} · ${quizTheme.value.readyLine}`;
  });

  const promptStageLabel = computed(() => {
    return quizTheme.value.sceneLabel || activeGradeLabel.value || "当前题目";
  });

  const promptHint = computed(() => {
    if (showExplanation.value && feedback.value) {
      return answerState.value === ANSWER_STATUS.CORRECT ? quizTheme.value.winLine : quizTheme.value.retryLine;
    }

    return currentQuestion.value?.imageUrl ? quizTheme.value.visualHint : quizTheme.value.promptHint;
  });

  const useCompactQuestionLead = computed(
    () => activeGradeLabel.value === "一年级" || activeGradeLabel.value === "二年级"
  );

  const questionOriginalText = computed(() => normalizeQuestionContent(currentQuestion.value?.content));

  const questionLeadText = computed(() => {
    if (!questionOriginalText.value) {
      return "";
    }

    if (!useCompactQuestionLead.value) {
      return questionOriginalText.value;
    }

    return buildLowerGradeQuestionLead(questionOriginalText.value) || questionOriginalText.value;
  });

  const showQuestionOriginalSupport = computed(
    () => useCompactQuestionLead.value && Boolean(questionOriginalText.value) && questionLeadText.value !== questionOriginalText.value
  );

  const questionLeadBadge = computed(() => {
    if (!useCompactQuestionLead.value) {
      return "";
    }

    return activeGradeLabel.value === "一年级" ? "小任务" : "题目要点";
  });

  const showPromptScene = computed(() => Boolean(currentQuestion.value?.imageUrl));

  const promptSceneMeta = computed(() => resolvePromptSceneMeta(activeGradeLabel.value));

  const promptSceneBadge = computed(() => {
    if (!showPromptScene.value) {
      return "";
    }

    return promptSceneMeta.value.badge;
  });

  const promptSceneNote = computed(() => {
    if (!showPromptScene.value) {
      return "";
    }

    if (showExplanation.value && feedback.value) {
      return answerState.value === ANSWER_STATUS.CORRECT ? "答对后继续往前走" : "看完提示再继续";
    }

    return promptSceneMeta.value.note;
  });

  const promptMetaChips = computed(() => {
    const chips = [];

    if (activeGradeSemesterLabel.value) {
      chips.push({
        label: activeGradeSemesterLabel.value,
        tone: "grade"
      });
    }

    if (currentQuestion.value?.subject) {
      chips.push({
        label: currentQuestion.value.subject,
        tone: "subject"
      });
    }

    if (currentQuestion.value?.type) {
      chips.push({
        label: currentQuestion.value.type,
        tone: "type"
      });
    }

    return chips.slice(0, 3);
  });

  const questionRuleChips = computed(() => {
    const chips = [
      {
        label: quizTheme.value.actionLabel,
        tone: "action"
      },
      {
        label: `答对 +${props.pointsPerCorrect} 分`,
        tone: "reward"
      },
      {
        label: hasTimeLimit.value ? `${effectiveQuestionTimeLimitSeconds.value} 秒限时` : "不限时",
        tone: hasTimeLimit.value ? "time" : "steady"
      }
    ];

    return chips;
  });

  const usePlayfulOptionLayout = computed(() => {
    if (!quizTheme.value.playfulGrid) {
      return false;
    }

    const optionList = currentQuestion.value?.options;

    if (!Array.isArray(optionList) || optionList.length < 2 || optionList.length > 4) {
      return false;
    }

    return optionList.every((option) => String(option?.text || "").replace(/\s+/g, "").trim().length <= 14);
  });

  const optionKeyDisplayMode = computed(() => {
    if (activeGradeLabel.value === "一年级") {
      return "hidden";
    }

    if (activeGradeLabel.value === "二年级") {
      return "soft";
    }

    return "full";
  });

  const shouldShowOptionKey = computed(() => optionKeyDisplayMode.value !== "hidden");

  const useSoftOptionKey = computed(() => optionKeyDisplayMode.value === "soft");

  const challengeRewardLabel = computed(() => {
    if (!isChallengeMode.value || !props.challengeStage?.reward) {
      return "";
    }

    return `${props.challengeStage.reward.glyph} ${props.challengeStage.reward.name}`;
  });

  const correctOption = computed(() => {
    if (!currentQuestion.value || !feedback.value?.correctAnswer) {
      return null;
    }

    return getOptionByKey(currentQuestion.value, feedback.value.correctAnswer);
  });

  function formatOptionAnswer(option) {
    if (!option) {
      return "";
    }

    const optionKey = String(option.key || "").trim();
    const optionText = String(option.text || "").trim();

    if (!optionText) {
      return optionKey;
    }

    if (optionKeyDisplayMode.value === "hidden") {
      return optionText;
    }

    if (optionKeyDisplayMode.value === "soft") {
      return `${optionText}（${optionKey}）`;
    }

    return `${optionKey} · ${optionText}`;
  }

  const correctAnswerLabel = computed(() => formatOptionAnswer(correctOption.value));

  const isLastQuestion = computed(
    () => Boolean(currentQuestion.value) && currentQuestionIndex.value >= props.questions.length - 1
  );

  const submissionStatusLabel = computed(() => {
    if (!isSubmitting.value) {
      return "";
    }

    return isLastQuestion.value ? "最后一题正在判定" : "答案正在核对";
  });

  const submissionStatusText = computed(() => {
    if (!isSubmitting.value) {
      return "";
    }

    if (isLastQuestion.value) {
      return isChallengeMode.value ? "这一题判完后会直接进入关卡结算。" : "这一题判完后会直接进入本轮结算。";
    }

    return `${quizTheme.value.companionName}正在核对答案，马上就能继续前进。`;
  });

  const feedbackBadge = computed(() => {
    if (answerState.value === ANSWER_STATUS.CORRECT) {
      return "答对啦";
    }

    return timedOut.value ? "超时判错" : "本题解析";
  });

  const feedbackTitle = computed(() => {
    if (!showExplanation.value || !feedback.value) {
      return "";
    }

    if (answerState.value === ANSWER_STATUS.CORRECT) {
      return isLastQuestion.value ? "这题答对了，看完点评就去结算。" : "这题答对了，再看一句点评更稳。";
    }

    return timedOut.value ? "这题因为超时被判错，先看答案再继续。" : "这题先记下来，看完解析再继续。";
  });

  const continueButtonLabel = computed(() => (isLastQuestion.value ? "查看成绩" : "继续下一题"));
  const correctFeedbackIcon = computed(() => {
    if (lastMilestoneUnlocked.value) {
      return playRewardConfig.value?.countLabel || "奖";
    }

    if (useStrategyOptions.value && selectedStrategyMode.value === PLAY_STRATEGY_MODE.SPRINT) {
      return "冲";
    }

    return "★";
  });
  const correctFeedbackTitle = computed(() => {
    if (!showCorrectStarAnimation.value) {
      return "";
    }

    if (lastMilestoneUnlocked.value) {
      return `${lastRewardLabel.value}到手`;
    }

    if (useStrategyOptions.value && selectedStrategyMode.value === PLAY_STRATEGY_MODE.SPRINT) {
      return "冲刺成功";
    }

    if (!useStrategyOptions.value && consecutiveCorrectCount.value >= 2) {
      return `连续答对 ${consecutiveCorrectCount.value} 题`;
    }

    return useStrategyOptions.value ? "判断正确" : "答对啦";
  });
  const correctFeedbackDetail = computed(() => {
    if (!showCorrectStarAnimation.value) {
      return "";
    }

    if (lastMilestoneUnlocked.value) {
      return `本题 +${lastPointsEarned.value} 分，含${lastRewardLabel.value}奖励`;
    }

    if (playGoalState.value) {
      return playGoalLabel.value;
    }

    return `+${lastPointsEarned.value || props.pointsPerCorrect} 分`;
  });
  const wrongFeedbackTitle = computed(() => {
    if (useBalloonOptions.value) {
      return timedOut.value ? "时间到，答案在这里" : "差一点，看看正确气球";
    }

    if (useVoyageOptions.value) {
      return timedOut.value ? "时间到，修正航向" : "航向修正，答案已标出";
    }

    if (lastWrongPenalty.value > 0) {
      return "冲刺失误，答案已标出";
    }

    return timedOut.value ? "时间到，答案已标出" : "再核对一次正确答案";
  });
  const wrongFeedbackDetail = computed(() => {
    const penaltyText = lastWrongPenalty.value > 0 ? `本题扣 ${lastWrongPenalty.value} 分。` : "";
    const followupText = playGoalState.value
      ? playGoalState.value.metric === "streak"
        ? "顺风进度重新开始，已经获得的旗帜会保留。"
        : "收集进度会保留。"
      : "下一题可重新选择稳答或冲刺。";

    return `正确答案是 ${correctAnswerLabel.value}。${penaltyText}${followupText}`;
  });
  const aiReviewButtonLabel = computed(() => {
    if (aiSpeechStatus.value === "loading") {
      return "猫头鹰准备中...";
    }

    if (aiSpeechStatus.value === "playing") {
      return "先停一下";
    }

    return "听猫头鹰讲解";
  });

  const showAiReviewVoiceButton = computed(() => Boolean(aiReview.value?.speechText));
  const showAiReviewPanel = computed(
    () => aiReviewStatus.value !== "idle" || Boolean(aiReview.value) || Boolean(aiReviewErrorMessage.value) || Boolean(aiSpeechErrorMessage.value)
  );
  const isCorrectReviewFeedback = computed(
    () => showExplanation.value && answerState.value === ANSWER_STATUS.CORRECT
  );
  const showAiReviewDisclosure = computed(() => showExplanation.value && feedback.value && showAiReviewPanel.value);
  const showExpandedAiReview = computed(() => showAiReviewDisclosure.value && isAiReviewExpanded.value);
  const shouldRenderExpandedAiReview = computed(
    () => showAiReviewDisclosure.value && (showExpandedAiReview.value || hasExpandedAiReviewOnce.value)
  );
  const aiReviewDisclosureButtonLabel = computed(() => {
    if (isAiReviewExpanded.value) {
      return "收起讲解";
    }

    return isCorrectReviewFeedback.value ? "查看猫头鹰讲解" : "展开讲解";
  });
  const showQuizSummaryCard = computed(() => isFinished.value && questionAttempts.value.length > 0);
  const quizSummaryTone = computed(() => quizSummary.value?.tone || "steady");
  const quizSummaryTitle = computed(() => quizSummary.value?.title || "本轮猫头鹰总结");
  const quizSummaryButtonLabel = computed(() => {
    if (quizSummarySpeechStatus.value === "loading") {
      return "猫头鹰准备中...";
    }

    if (quizSummarySpeechStatus.value === "playing") {
      return "先停一下";
    }

    return "听猫头鹰总结";
  });
  const showQuizSummaryVoiceButton = computed(() => Boolean(quizSummary.value?.speechText));
  const quizSummaryFootnote = computed(() =>
    quizSummaryMeta.value?.source === "fallback"
      ? "已按本轮答题记录自动整理，可作为复盘参考。"
      : `${quizTheme.value.companionName}已按本轮答题记录整理，可作为复盘参考。`
  );

  const finishEyebrow = computed(() => {
    if (!isFinished.value) {
      return "";
    }

    if (isChallengeMode.value) {
      return props.challengeResult ? "本关结算" : "成绩整理中";
    }

    return "本轮成绩";
  });

  const finishHeading = computed(() => {
    if (!isFinished.value) {
      return "";
    }

    if (isChallengeMode.value) {
      if (!props.challengeResult) {
        return props.stageTitle ? `${props.stageTitle} 正在生成结算卡` : "挑战成绩正在生成";
      }

      return props.stageTitle ? `${props.stageTitle} 结算完成` : "挑战成绩已生成";
    }

    return `${quizTheme.value.sceneLabel}这一轮结束啦`;
  });

  const finishSupportText = computed(() => {
    if (!isFinished.value) {
      return "";
    }

    if (isChallengeMode.value) {
      if (!props.challengeResult) {
        return "关卡成绩正在同步，整理完成后会显示完整的成绩卡。";
      }

      if (props.challengeResult.isPassed && props.challengeResult.nextStageTitle) {
        return "下面是这一关的完整成绩卡，可以重玩本关，或继续下一关。";
      }

      return "下面是这一关的完整成绩卡，可以回看成绩后重玩本关。";
    }

    return "下面是这轮练习的完整成绩卡，先看结果，再决定下一步。";
  });

  function clearAutoAdvanceTimer() {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  }

  function clearSubmitController() {
    if (submitController) {
      submitController.abort();
      submitController = null;
    }

    isSubmitting.value = false;
  }

  function resetViewState() {
    clearAutoAdvanceTimer();
    clearResultAutoAdvanceTimer();
    clearCountdownTimer();
    clearSubmitController();
    selectedOptionKey.value = null;
    showExplanation.value = false;
    showResultModal.value = false;
    showCorrectStarAnimation.value = false;
    feedback.value = null;
    submitErrorMessage.value = "";
    correctCount.value = 0;
    wrongCount.value = 0;
    bestCorrectStreak.value = 0;
    lastPointsEarned.value = 0;
    sessionRewardCount.value = 0;
    sprintAttemptCount.value = 0;
    sprintSuccessCount.value = 0;
    lastMilestoneUnlocked.value = false;
    lastRewardLabel.value = "";
    lastWrongPenalty.value = 0;
    selectedStrategyMode.value = PLAY_STRATEGY_MODE.STEADY;
    questionResults.value = [];
    questionAttempts.value = [];
    timedOut.value = false;
    hasReportedFinish.value = false;
    hasPlayedChallengeFinish.value = false;
    resetAiReviewState();
    resetQuizSummaryState();
    quizStore.resetQuiz();
    syncQuestionTimer();
  }

  function goToNextQuestion() {
    clearAutoAdvanceTimer();
    clearResultAutoAdvanceTimer();
    clearCountdownTimer();
    clearSubmitController();
    selectedOptionKey.value = null;
    showExplanation.value = false;
    showResultModal.value = false;
    showCorrectStarAnimation.value = false;
    feedback.value = null;
    submitErrorMessage.value = "";
    lastPointsEarned.value = 0;
    lastMilestoneUnlocked.value = false;
    lastRewardLabel.value = "";
    lastWrongPenalty.value = 0;
    selectedStrategyMode.value = PLAY_STRATEGY_MODE.STEADY;
    timedOut.value = false;
    resetAiReviewState();
    quizStore.nextQuestion();
    syncQuestionTimer();
  }

  function scheduleNextQuestion() {
    clearAutoAdvanceTimer();
    autoAdvanceTimer = setTimeout(() => {
      goToNextQuestion();
    }, effectiveAutoAdvanceDelay.value);
  }

  function selectAnswerStrategy(mode) {
    if (!useStrategyOptions.value || !canAnswer.value) {
      return;
    }

    if (![PLAY_STRATEGY_MODE.STEADY, PLAY_STRATEGY_MODE.SPRINT].includes(mode)) {
      return;
    }

    selectedStrategyMode.value = mode;
  }

  function toggleAiReviewExpanded() {
    if (!showAiReviewDisclosure.value) {
      return;
    }

    toggleAiReviewExpandedState();
  }

  function createQuestionSnapshot(question = currentQuestion.value) {
    if (!question) {
      return null;
    }

    return {
      id: question.id,
      subject: String(question.subject || "").trim(),
      grade: String(question.grade || "").trim(),
      semester: String(question.semester || "").trim(),
      knowledgeTag: String(question.knowledgeTag || "").trim(),
      type: String(question.type || "").trim(),
      content: String(question.content || "").trim(),
      imageUrl: String(question.imageUrl || "").trim(),
      difficulty: String(question.difficulty || "").trim(),
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({
            key: String(option?.key || "").trim(),
            text: String(option?.text || "").trim()
          }))
        : []
    };
  }

  async function submitCurrentAnswer(selectedOption, { isTimeout = false } = {}) {
    if (!currentQuestion.value || answerState.value !== ANSWER_STATUS.WAITING || isSubmitting.value) {
      return;
    }

    pauseCountdown();
    selectedOptionKey.value = isTimeout ? null : selectedOption;
    submitErrorMessage.value = "";
    feedback.value = null;
    showExplanation.value = false;
    timedOut.value = false;
    resetAiReviewState();
    submitController = new AbortController();
    isSubmitting.value = true;

    try {
      const result = await submitQuestionAnswer({
        questionId: currentQuestion.value.id,
        selectedOption,
        signal: submitController.signal
      });
      const answeredAt = new Date().toISOString();
      const questionSnapshot = createQuestionSnapshot();

      feedback.value = result;
      questionResults.value[currentQuestionIndex.value] = result.correct ? "correct" : isTimeout ? "timeout" : "wrong";
      questionAttempts.value[currentQuestionIndex.value] = {
        question: questionSnapshot,
        selectedOption,
        isCorrect: result.correct,
        isTimeout,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation
      };
      const answerReward = result.correct
        ? getQuizCorrectReward({
            grade: activeGradeLabel.value,
            correctCountBefore: correctCount.value,
            consecutiveCorrectBefore: consecutiveCorrectCount.value,
            basePoints: props.pointsPerCorrect,
            strategyMode: selectedStrategyMode.value
          })
        : null;
      const wrongPenalty = result.correct
        ? 0
        : getQuizWrongPenalty({
            grade: activeGradeLabel.value,
            strategyMode: selectedStrategyMode.value
          });

      quizStore.submitAnswer(result.correct, answerReward?.pointsEarned ?? props.pointsPerCorrect, wrongPenalty);
      lastPointsEarned.value = answerReward?.pointsEarned ?? 0;
      lastMilestoneUnlocked.value = Boolean(answerReward?.rewardUnlocked);
      lastRewardLabel.value = String(answerReward?.rewardLabel || "");
      lastWrongPenalty.value = wrongPenalty;

      if (answerReward?.rewardUnlocked) {
        sessionRewardCount.value += 1;
      }

      if (useStrategyOptions.value && selectedStrategyMode.value === PLAY_STRATEGY_MODE.SPRINT) {
        sprintAttemptCount.value += 1;

        if (result.correct) {
          sprintSuccessCount.value += 1;
        }
      }

      emit("question-resolved", {
        question: questionSnapshot,
        questionIndex: currentQuestionIndex.value,
        selectedOption,
        isCorrect: result.correct,
        isTimeout,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
        answeredAt
      });

      if (result.correct) {
        timedOut.value = false;
        correctCount.value += 1;
        bestCorrectStreak.value = Math.max(bestCorrectStreak.value, consecutiveCorrectCount.value);
        if (currentQuestionIndex.value >= props.questions.length - 1) {
          if (isChallengeMode.value) {
            quizAudio.playSuccess();
          } else {
            quizAudio.playFinish();
          }
        } else {
          quizAudio.playSuccess();
        }
        submitController = null;
        startAutoAdvance(true);
        return;
      }

      timedOut.value = isTimeout;
      wrongCount.value += 1;
      quizAudio.playError();
      submitController = null;
      startAutoAdvance(false);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      selectedOptionKey.value = null;
      timedOut.value = false;
      submitErrorMessage.value = error.message || "提交答案失败，请重试。";

      if (!isTimeout && hasTimeLimit.value && currentQuestion.value && timeRemainingMs.value > 0) {
        startCountdown(timeRemainingMs.value);
      }
    } finally {
      submitController = null;
      isSubmitting.value = false;
    }
  }

  async function handleOptionSelect(optionKey) {
    if (!canAnswer.value || !currentQuestion.value) {
      return;
    }

    await quizAudio.unlockAudio();
    await submitCurrentAnswer(optionKey);
  }

  async function handleTimeExpired() {
    if (!currentQuestion.value || answerState.value !== ANSWER_STATUS.WAITING || isSubmitting.value) {
      return;
    }

    await submitCurrentAnswer("__timeout__", { isTimeout: true });
  }

  function getOptionClass(optionKey) {
    const classes = ["quiz-view__option", "btn-cartoon"];

    if (selectedOptionKey.value === optionKey && answerState.value === ANSWER_STATUS.CORRECT) {
      classes.push("quiz-view__option--correct");
    }

    if (answerState.value === ANSWER_STATUS.WRONG && feedback.value?.correctAnswer === optionKey) {
      classes.push("quiz-view__option--correct");
    }

    if (
      answerState.value === ANSWER_STATUS.WRONG &&
      selectedOptionKey.value === optionKey &&
      feedback.value?.correctAnswer !== optionKey
    ) {
      classes.push("quiz-view__option--wrong");
    }

    return classes;
  }

  function getProgressStarClass(index) {
    const classes = ["quiz-card__star"];
    const result = questionResults.value[index];

    if (result === "correct") {
      classes.push("quiz-card__star--lit");
      return classes;
    }

    if (result === "wrong") {
      classes.push("quiz-card__star--wrong");
      return classes;
    }

    if (result === "timeout") {
      classes.push("quiz-card__star--timeout");
      return classes;
    }

    if (currentQuestion.value && index === currentQuestionIndex.value) {
      classes.push("quiz-card__star--current");
    }

    return classes;
  }

  function handleReplay() {
    emit("restart");
    resetViewState();
  }

  function handleNextStage() {
    stopQuizSummarySpeech();
    emit("next-stage");
  }

  function handleOpenWrongReview() {
    stopQuizSummarySpeech();
    emit("open-wrong-review");
  }

  function handlePracticeKnowledge() {
    if (!finishKnowledgeTag.value) {
      return;
    }

    stopQuizSummarySpeech();
    emit("practice-knowledge", finishKnowledgeTag.value);
  }

  watch(isFinished, (nextIsFinished) => {
    if (!nextIsFinished) {
      hasReportedFinish.value = false;
      return;
    }

    if (quizSummaryStatus.value === "idle") {
      void loadQuizSummary();
    }

    if (hasReportedFinish.value) {
      return;
    }

    hasReportedFinish.value = true;
    emit("finished", {
      score: currentScore.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      totalQuestions: props.questions.length,
      accuracyPercent: accuracyPercent.value,
      bestCorrectStreak: bestCorrectStreak.value,
      sessionRewardCount: sessionRewardCount.value,
      sessionRewardLabel: playRewardConfig.value?.rewardLabel || "",
      sprintAttemptCount: sprintAttemptCount.value,
      sprintSuccessCount: sprintSuccessCount.value,
      questionResults: [...questionResults.value]
    });
  });

  watch(
    () => props.challengeResult,
    (nextResult) => {
      if (!isChallengeMode.value || !nextResult?.isPassed || hasPlayedChallengeFinish.value) {
        return;
      }

      quizAudio.playFinish();
      hasPlayedChallengeFinish.value = true;
    },
    { deep: true }
  );

  watch(
    () => [props.questions, props.questionTimeLimitSeconds, props.pointsPerCorrect, props.challengeStage?.id],
    () => {
      resetViewState();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    clearAutoAdvanceTimer();
    clearResultAutoAdvanceTimer();
    disposeQuizTimer();
    clearSubmitController();
    disposeQuizAiReview();
  });

  return {
    quizStore,
    quizAudio,
    answerState,
    consecutiveCorrectCount,
    currentQuestionIndex,
    currentScore,
    autoAdvanceTimer,
    submitController,
    isSubmitting,
    selectedOptionKey,
    showExplanation,
    showResultModal,
    showCorrectStarAnimation,
    resultAutoAdvanceTimer,
    handleModalAdvance,
    feedback,
    submitErrorMessage,
    correctCount,
    wrongCount,
    bestCorrectStreak,
    lastPointsEarned,
    sessionRewardCount,
    sprintAttemptCount,
    sprintSuccessCount,
    lastMilestoneUnlocked,
    lastRewardLabel,
    lastWrongPenalty,
    selectedStrategyMode,
    questionResults,
    questionAttempts,
    timeRemainingMs,
    timedOut,
    hasReportedFinish,
    hasPlayedChallengeFinish,
    hasQuestions,
    currentQuestion,
    isFinished,
    isChallengeMode,
    canAnswer,
    hasTimeLimit,
    timeLimitMs,
    effectiveQuestionTimeLimitSeconds,
    timeRemainingSeconds,
    timerPercent,
    timerTone,
    showCountdown,
    answeredCount,
    progressPercent,
    accuracyPercent,
    activeGradeLabel,
    activeSemesterLabel,
    activeGradeSemesterLabel,
    useBalloonOptions,
    useVoyageOptions,
    useStrategyOptions,
    answerOptionVariant,
    playRewardConfig,
    playGoalState,
    playGoalProgressNodes,
    playGoalLabel,
    playGoalCountLabel,
    strategyOptions,
    correctFeedbackDelay,
    quizTheme,
    quizThemeClass,
    quizThemeStyle,
    resultTitle,
    resultText,
    finishKnowledgeTag,
    showKnowledgeFollowupAction,
    knowledgeFollowupButtonLabel,
    showWrongReviewAction,
    ruleSummary,
    journeyHeading,
    promptStageLabel,
    promptHint,
    useCompactQuestionLead,
    questionLeadText,
    showQuestionOriginalSupport,
    questionOriginalText,
    questionLeadBadge,
    showPromptScene,
    promptSceneBadge,
    promptSceneNote,
    promptMetaChips,
    questionRuleChips,
    usePlayfulOptionLayout,
    optionKeyDisplayMode,
    shouldShowOptionKey,
    useSoftOptionKey,
    challengeRewardLabel,
    correctOption,
    correctAnswerLabel,
    isLastQuestion,
    submissionStatusLabel,
    submissionStatusText,
    feedbackBadge,
    feedbackTitle,
    continueButtonLabel,
    correctFeedbackIcon,
    correctFeedbackTitle,
    correctFeedbackDetail,
    wrongFeedbackTitle,
    wrongFeedbackDetail,
    aiReview,
    aiReviewStatus,
    aiReviewErrorMessage,
    aiSpeechStatus,
    aiSpeechErrorMessage,
    aiReviewButtonLabel,
    showAiReviewVoiceButton,
    showAiReviewPanel,
    isCorrectReviewFeedback,
    showAiReviewDisclosure,
    showExpandedAiReview,
    shouldRenderExpandedAiReview,
    aiReviewDisclosureButtonLabel,
    showQuizSummaryCard,
    quizSummary,
    quizSummaryMeta,
    quizSummaryStatus,
    quizSummaryErrorMessage,
    quizSummarySpeechStatus,
    quizSummarySpeechErrorMessage,
    quizSummaryTone,
    quizSummaryTitle,
    quizSummaryButtonLabel,
    showQuizSummaryVoiceButton,
    quizSummaryFootnote,
    finishEyebrow,
    finishHeading,
    finishSupportText,

    clearAutoAdvanceTimer,
    clearCountdownTimer,
    startCountdown,
    pauseCountdown,
    syncQuestionTimer,
    clearSubmitController,
    resetViewState,
    goToNextQuestion,
    scheduleNextQuestion,
    selectAnswerStrategy,
    submitCurrentAnswer,
    loadAiReview,
    loadQuizSummary,
    handlePlayAiReview,
    toggleAiReviewExpanded,
    handlePlayQuizSummary,
    stopAiReviewSpeech,
    stopQuizSummarySpeech,
    handleOptionSelect,
    handleTimeExpired,
    getOptionClass,
    getProgressStarClass,
    handleReplay,
    handleNextStage,
    handleOpenWrongReview,
    handlePracticeKnowledge,
  };
}
