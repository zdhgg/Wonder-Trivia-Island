import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useQuizAudio } from "../composables/useQuizAudio";
import { createQuizAiReview } from "../composables/quiz/useQuizAiReview";
import { createQuizTimer } from "../composables/quiz/useQuizTimer";
import { submitQuestionAnswer } from "../services/questionsApi";
import { useAudioStore } from "../stores/useAudioStore";
import { ANSWER_STATUS, useQuizStore } from "../stores/useQuizStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { evaluateStageMission, getEffectiveChallengeTimeLimitSeconds } from "../utils/challengeStageRules";

export function useQuizView(props, emit) {
  const quizStore = useQuizStore();

  const quizAudio = useQuizAudio();
  const audioStore = useAudioStore();
  const settingsStore = useSettingsStore();
  settingsStore.hydrate();

  const { answerState, currentQuestionIndex, currentScore } = storeToRefs(quizStore);
  const { masterVolume, sfxVolume } = storeToRefs(audioStore);
  const { coachingPreferences } = storeToRefs(settingsStore);

  let autoAdvanceTimer = null;

  let submitController = null;

  const isSubmitting = ref(false);

  const selectedOptionKey = ref(null);

  const showExplanation = ref(false);

  const feedback = ref(null);

  const submitErrorMessage = ref("");

  const correctCount = ref(0);

  const wrongCount = ref(0);

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
  const shouldAutoPlayAiReviewOnWrong = computed(() => Boolean(coachingPreferences.value?.autoPlayAiReviewOnWrong));
  const shouldAutoPlayAiReviewOnCorrect = computed(() => Boolean(coachingPreferences.value?.autoPlayAiReviewOnCorrect));
  const isCompanionAutoVoiceEnabled = computed(
    () => shouldAutoPlayAiReviewOnWrong.value || shouldAutoPlayAiReviewOnCorrect.value
  );
  const companionAutoVoiceLabel = computed(() =>
    isCompanionAutoVoiceEnabled.value ? "自动播报已开启" : "自动播报已关闭"
  );
  const companionAutoVoiceTone = computed(() => (isCompanionAutoVoiceEnabled.value ? "success" : "idle"));
  const effectiveAutoAdvanceDelay = computed(() =>
    Number.isFinite(Number(coachingPreferences.value?.autoAdvanceDelayMs))
      ? Number(coachingPreferences.value.autoAdvanceDelayMs)
      : props.autoAdvanceDelay
  );

  const canAnswer = computed(
    () => Boolean(currentQuestion.value) && answerState.value === ANSWER_STATUS.WAITING && !isSubmitting.value
  );

  const answeredCount = computed(() => correctCount.value + wrongCount.value);

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

  const challengeMission = computed(() =>
    isChallengeMode.value && props.challengeStage
      ? evaluateStageMission(props.challengeStage, {
          answeredCount: answeredCount.value,
          correctCount: correctCount.value,
          wrongCount: wrongCount.value,
          totalQuestions: props.questions.length,
          questionResults: questionResults.value,
          isPassed: props.challengeResult?.isPassed ?? false
        })
      : null
  );

  const challengeMissionLabel = computed(() => challengeMission.value?.label || "");

  const challengeMissionProgress = computed(() => challengeMission.value?.progressText || "");

  const challengeMissionTone = computed(() => challengeMission.value?.tone || "neutral");

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

    return currentQuestion.value.options.find((option) => option.key === feedback.value.correctAnswer) ?? null;
  });

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

    return "咕咕老师正在核对答案，马上就能继续前进。";
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

  const feedbackNextStep = computed(() => {
    if (!showExplanation.value || !feedback.value) {
      return "";
    }

    if (isLastQuestion.value) {
      return isChallengeMode.value ? "看完这题就进入关卡结算。" : "看完这题就进入成绩结算。";
    }

    return "看完这题就继续下一题。";
  });

  const continueButtonLabel = computed(() => (isLastQuestion.value ? "查看成绩" : "继续下一题"));
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
      : "猫头鹰老师已按本轮答题记录整理，可作为复盘参考。"
  );
  const companionPersonaName = computed(() => "猫头鹰老师");
  const companionShortReviewLine = computed(() => {
    if (!showExplanation.value || !feedback.value) {
      return "";
    }

    if (aiReviewStatus.value === "loading") {
      return "猫头鹰老师正在整理一句更贴近这题的提醒。";
    }

    if (aiReviewStatus.value === "error") {
      return normalizeCompanionLine(aiReviewErrorMessage.value, 48) || "猫头鹰老师这会儿没整理出提醒。";
    }

    if (!aiReview.value) {
      return normalizeCompanionLine(feedbackNextStep.value, 48);
    }

    if (aiReview.value.bubbleText) {
      return normalizeCompanionLine(aiReview.value.bubbleText, 48);
    }

    if (answerState.value === ANSWER_STATUS.CORRECT) {
      return pickFirstCompanionLine(aiReview.value.encouragement, aiReview.value.nextStep, aiReview.value.speechText);
    }

    return pickFirstCompanionLine(aiReview.value.nextStep, aiReview.value.diagnosis, aiReview.value.encouragement, aiReview.value.speechText);
  });
  const companionShortSummaryLine = computed(() => {
    if (!isFinished.value) {
      return "";
    }

    if (quizSummaryStatus.value === "loading" || quizSummaryStatus.value === "idle") {
      return "猫头鹰老师正在整理这轮最值得先复盘的一点。";
    }

    if (quizSummaryStatus.value === "error") {
      return normalizeCompanionLine(quizSummaryErrorMessage.value, 48) || "猫头鹰老师这会儿没把总结整理出来。";
    }

    if (!quizSummary.value) {
      return "";
    }

    if (quizSummary.value.bubbleText) {
      return normalizeCompanionLine(quizSummary.value.bubbleText, 48);
    }

    return pickFirstCompanionLine(quizSummary.value.focusPoint, quizSummary.value.nextPlan, quizSummary.value.overview, quizSummary.value.speechText);
  });
  const showCompanionVoiceButton = computed(() => {
    if (isFinished.value) {
      return showQuizSummaryVoiceButton.value;
    }

    if (showExplanation.value && feedback.value) {
      return showAiReviewVoiceButton.value;
    }

    return false;
  });
  const companionVoiceButtonLabel = computed(() => {
    if (isFinished.value) {
      return quizSummaryButtonLabel.value;
    }

    return aiReviewButtonLabel.value;
  });
  const companionVoiceErrorMessage = computed(() => {
    if (isFinished.value) {
      return quizSummarySpeechErrorMessage.value;
    }

    if (showExplanation.value && feedback.value) {
      return aiSpeechErrorMessage.value;
    }

    return "";
  });

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

    return "这一轮探险已经结束";
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

    return "下面是这轮练习的完整成绩卡，可以直接查看、复制和继续下一步。";
  });

  const companionTone = computed(() => {
    if (
      isSubmitting.value ||
      aiReviewStatus.value === "loading" ||
      aiSpeechStatus.value === "loading" ||
      aiSpeechStatus.value === "playing" ||
      quizSummaryStatus.value === "loading" ||
      quizSummarySpeechStatus.value === "loading" ||
      quizSummarySpeechStatus.value === "playing"
    ) {
      return "info";
    }

    if (isFinished.value || answerState.value === ANSWER_STATUS.CORRECT) {
      return "success";
    }

    if (answerState.value === ANSWER_STATUS.WRONG) {
      return "error";
    }

    return "idle";
  });

  const companionStateLabel = computed(() => {
    if (isFinished.value) {
      if (quizSummarySpeechStatus.value === "playing") {
        return "正在总结";
      }

      return isChallengeMode.value ? "关卡完成" : "本轮完成";
    }

    if (aiSpeechStatus.value === "playing") {
      return "正在讲解";
    }

    if (isSubmitting.value) {
      return "正在判题";
    }

    if (aiReviewStatus.value === "loading") {
      return "正在整理";
    }

    if (answerState.value === ANSWER_STATUS.CORRECT) {
      return "答对啦";
    }

    if (answerState.value === ANSWER_STATUS.WRONG) {
      return timedOut.value ? "超时判错" : "先看解析";
    }

    return isChallengeMode.value ? "挑战进行中" : "自由练习";
  });

  const companionTitle = computed(() => {
    if (isFinished.value) {
      if (quizSummarySpeechStatus.value === "playing") {
        return "猫头鹰正在总结";
      }

      if (quizSummaryStatus.value === "loading" || quizSummaryStatus.value === "idle") {
        return "猫头鹰正在整理";
      }

      if (quizSummary.value || quizSummaryStatus.value === "error") {
        return "猫头鹰总结";
      }

      return isChallengeMode.value ? "这关成绩已经整理好了" : "这轮练习已经顺利收官";
    }

    if (showExplanation.value && feedback.value) {
      if (aiSpeechStatus.value === "playing") {
        return "猫头鹰正在讲";
      }

      if (aiReviewStatus.value === "loading") {
        return "猫头鹰正在想";
      }

      if (aiReview.value || aiReviewStatus.value === "error") {
        return "猫头鹰提醒";
      }
    }

    if (isSubmitting.value) {
      return "这题马上就见分晓";
    }

    if (answerState.value === ANSWER_STATUS.CORRECT) {
      return isLastQuestion.value ? "最后一题稳稳拿下" : "答得不错，继续保持节奏";
    }

    if (answerState.value === ANSWER_STATUS.WRONG) {
      return timedOut.value ? "时间到了，先补回这一题" : "别急，先把这题吃透";
    }

    return isChallengeMode.value ? "稳住节奏，继续闯关" : "慢慢读题，继续探索";
  });

  const companionDialogTag = computed(() => {
    if (isFinished.value) {
      if (quizSummarySpeechStatus.value === "playing") {
        return "正在总结";
      }

      if (quizSummaryStatus.value === "loading" || quizSummaryStatus.value === "idle") {
        return "整理中";
      }

      return "猫头鹰总结";
    }

    if (showExplanation.value && feedback.value) {
      if (aiSpeechStatus.value === "playing") {
        return "正在讲";
      }

      if (aiReviewStatus.value === "loading") {
        return "整理中";
      }

      return "猫头鹰提醒";
    }

    return "猫头鹰老师";
  });

  const companionFocusLabel = computed(() => {
    if (isFinished.value) {
      return quizSummary.value ? "下一步安排" : "本轮总结";
    }

    if (showExplanation.value && aiReview.value) {
      return "这题关键";
    }

    if (showExplanation.value && feedback.value) {
      return "下一步";
    }

    if (isSubmitting.value || showCountdown.value) {
      return "当前节奏";
    }

    if (isChallengeMode.value && challengeMission.value) {
      return "本关任务";
    }

    return "答题规则";
  });

  const companionFocusText = computed(() => {
    if (isFinished.value) {
      if (quizSummary.value?.nextPlan) {
        return quizSummary.value.nextPlan;
      }

      if (isChallengeMode.value && props.challengeResult?.rewardUnlocked) {
        return `共完成 ${answeredCount.value} 题，正确率 ${accuracyPercent.value}%，还收下了 ${props.challengeResult.rewardName}。`;
      }

      return `共完成 ${answeredCount.value} 题，正确率 ${accuracyPercent.value}%，当前总得分 ${currentScore.value} 分。`;
    }

    if (showExplanation.value && aiReview.value) {
      return aiReview.value.nextStep || aiReview.value.diagnosis || feedbackNextStep.value;
    }

    if (showExplanation.value && feedback.value) {
      return isLastQuestion.value ? "看完这题解析就进入成绩结算。" : "看完解析后继续下一题，节奏不要断。";
    }

    if (isSubmitting.value) {
      return isLastQuestion.value ? "最后一题正在判题，结束后会直接切到结算卡。" : "答案已经提交，判题完成后会自动进入下一题。";
    }

    if (showCountdown.value) {
      return `本题还有 ${timeRemainingSeconds.value} 秒，先选最有把握的答案。`;
    }

    if (isChallengeMode.value && challengeMission.value && props.challengeStage?.reward) {
      return `${challengeMission.value.progressText}，完成后可获得 ${props.challengeStage.reward.glyph} ${props.challengeStage.reward.name}。`;
    }

    return ruleSummary.value;
  });

  const companionStats = computed(() => {
    if (isFinished.value) {
      return [
        { label: "总得分", value: `${currentScore.value} 分` },
        { label: "正确率", value: `${accuracyPercent.value}%` },
        { label: "完成题数", value: `${answeredCount.value} / ${props.questions.length}` }
      ];
    }

    return [
      { label: "当前进度", value: `${answeredCount.value} / ${props.questions.length}` },
      { label: "当前得分", value: `${currentScore.value} 分` },
      {
        label: "答题节奏",
        value: showCountdown.value ? (isSubmitting.value ? "判题中" : `${timeRemainingSeconds.value} 秒`) : "不限时"
      }
    ];
  });

  const mascotStatus = computed(() => {
    if (aiSpeechStatus.value === "playing" || quizSummarySpeechStatus.value === "playing") {
      return "speaking";
    }

    if (isFinished.value || answerState.value === ANSWER_STATUS.CORRECT) {
      return "success";
    }

    if (answerState.value === ANSWER_STATUS.WRONG) {
      return "error";
    }

    return "idle";
  });

  const mascotHint = computed(() => {
    if (!hasQuestions.value) {
      return "等题目准备好，我们就从海边码头出发。";
    }

    if (isFinished.value) {
      if (companionShortSummaryLine.value) {
        return companionShortSummaryLine.value;
      }

      return isChallengeMode.value ? "这关已经结算，看看你拿到了几颗星。" : "这轮探险结束啦，要不要再去岛上找一组新题？";
    }

    if (showExplanation.value && feedback.value && companionShortReviewLine.value) {
      return companionShortReviewLine.value;
    }

    if (isSubmitting.value) {
      return "猫头鹰老师正在认真核对答案...";
    }

    if (answerState.value === ANSWER_STATUS.CORRECT) {
      return "答对啦，下一颗星就在前面。";
    }

    if (answerState.value === ANSWER_STATUS.WRONG) {
      if (timedOut.value) {
        return "时间到了，这题先记下来，看完解析再继续。";
      }

      return "别急，看完解析再继续闯关。";
    }

    return "先读题，再挑一个你最有把握的答案。";
  });

  function handlePlayCompanionVoice() {
    if (isFinished.value) {
      void handlePlayQuizSummary();
      return;
    }

    if (showExplanation.value && feedback.value) {
      void handlePlayAiReview();
    }
  }

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
    clearCountdownTimer();
    clearSubmitController();
    selectedOptionKey.value = null;
    showExplanation.value = false;
    feedback.value = null;
    submitErrorMessage.value = "";
    correctCount.value = 0;
    wrongCount.value = 0;
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
    clearCountdownTimer();
    clearSubmitController();
    selectedOptionKey.value = null;
    showExplanation.value = false;
    feedback.value = null;
    submitErrorMessage.value = "";
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
      quizStore.submitAnswer(result.correct, props.pointsPerCorrect);
      showExplanation.value = true;
      const shouldAutoPlayReview =
        result.correct ? shouldAutoPlayAiReviewOnCorrect.value : shouldAutoPlayAiReviewOnWrong.value;
      const shouldAdvanceAfterSpeech = result.correct && shouldAutoAdvanceOnCorrect.value && shouldAutoPlayReview;
      const shouldLoadAiReview =
        !result.correct || !shouldAutoAdvanceOnCorrect.value || shouldAutoPlayReview;

      if (shouldLoadAiReview) {
        void loadAiReview({
          questionId: currentQuestion.value.id,
          selectedOption,
          autoPlaySpeech: shouldAutoPlayReview,
          advanceAfterSpeech: shouldAdvanceAfterSpeech
        });
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
        if (shouldAutoAdvanceOnCorrect.value && !shouldAdvanceAfterSpeech) {
          scheduleNextQuestion();
        }
        return;
      }

      timedOut.value = isTimeout;
      wrongCount.value += 1;
      quizAudio.playError();
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
    disposeQuizTimer();
    clearSubmitController();
    disposeQuizAiReview();
  });

  return {
    quizStore,
    quizAudio,
    answerState,
    currentQuestionIndex,
    currentScore,
    autoAdvanceTimer,
    submitController,
    isSubmitting,
    selectedOptionKey,
    showExplanation,
    feedback,
    submitErrorMessage,
    correctCount,
    wrongCount,
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
    resultTitle,
    resultText,
    finishKnowledgeTag,
    showKnowledgeFollowupAction,
    knowledgeFollowupButtonLabel,
    showWrongReviewAction,
    ruleSummary,
    challengeMission,
    challengeMissionLabel,
    challengeMissionProgress,
    challengeMissionTone,
    challengeRewardLabel,
    correctOption,
    isLastQuestion,
    submissionStatusLabel,
    submissionStatusText,
    feedbackBadge,
    feedbackTitle,
    feedbackNextStep,
    continueButtonLabel,
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
    companionPersonaName,
    companionAutoVoiceLabel,
    companionAutoVoiceTone,
    showCompanionVoiceButton,
    companionVoiceButtonLabel,
    companionVoiceErrorMessage,
    finishEyebrow,
    finishHeading,
    finishSupportText,
    companionTone,
    companionStateLabel,
    companionTitle,
    companionDialogTag,
    companionFocusLabel,
    companionFocusText,
    companionStats,
    mascotStatus,
    mascotHint,
    clearAutoAdvanceTimer,
    clearCountdownTimer,
    startCountdown,
    pauseCountdown,
    syncQuestionTimer,
    clearSubmitController,
    resetViewState,
    goToNextQuestion,
    scheduleNextQuestion,
    submitCurrentAnswer,
    loadAiReview,
    loadQuizSummary,
    handlePlayAiReview,
    toggleAiReviewExpanded,
    handlePlayQuizSummary,
    handlePlayCompanionVoice,
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
