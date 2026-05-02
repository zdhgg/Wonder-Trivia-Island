import { ref } from "vue";
import { playStudyNarration, stopStudyNarration } from "../../audio/studyNarrationEngine";
import {
  generateQuestionReview,
  generateQuestionReviewSpeech,
  generateQuizSessionSummary
} from "../../services/questionsApi";

export function createQuizAiReview({
  coachingPreferences,
  settingsStore,
  unlockAudio,
  aiSpeechVolume,
  effectiveTtsVoice,
  effectiveTtsAudioFormat,
  scheduleNextQuestion,
  getAttempts,
  getCurrentScore,
  getCorrectCount,
  getWrongCount,
  getTotalQuestions,
  getAccuracyPercent,
  getPlayMode,
  getStageTitle
}) {
  let aiReviewController = null;
  let aiSpeechController = null;
  let activeAiSpeechUrl = "";
  let quizSummaryController = null;
  let quizSummarySpeechController = null;
  let activeQuizSummarySpeechUrl = "";
  let activeAiReviewRequestId = 0;
  let shouldAdvanceAfterAiSpeech = false;

  const aiReview = ref(null);
  const aiReviewStatus = ref("idle");
  const aiReviewErrorMessage = ref("");
  const isAiReviewExpanded = ref(false);
  const hasExpandedAiReviewOnce = ref(false);
  const aiSpeechStatus = ref("idle");
  const aiSpeechErrorMessage = ref("");
  const quizSummary = ref(null);
  const quizSummaryMeta = ref(null);
  const quizSummaryStatus = ref("idle");
  const quizSummaryErrorMessage = ref("");
  const quizSummarySpeechStatus = ref("idle");
  const quizSummarySpeechErrorMessage = ref("");

  function revokeAiSpeechUrl() {
    if (!activeAiSpeechUrl) {
      return;
    }

    URL.revokeObjectURL(activeAiSpeechUrl);
    activeAiSpeechUrl = "";
  }

  function revokeQuizSummarySpeechUrl() {
    if (!activeQuizSummarySpeechUrl) {
      return;
    }

    URL.revokeObjectURL(activeQuizSummarySpeechUrl);
    activeQuizSummarySpeechUrl = "";
  }

  function clearPendingAutoAdvanceAfterAiSpeech() {
    shouldAdvanceAfterAiSpeech = false;
  }

  function stopAiReviewSpeech() {
    if (aiSpeechController) {
      aiSpeechController.abort();
      aiSpeechController = null;
    }

    stopStudyNarration();
    revokeAiSpeechUrl();
    aiSpeechStatus.value = "idle";
    clearPendingAutoAdvanceAfterAiSpeech();
  }

  function clearAiReviewController() {
    if (aiReviewController) {
      aiReviewController.abort();
      aiReviewController = null;
    }
  }

  function clearQuizSummaryController() {
    if (quizSummaryController) {
      quizSummaryController.abort();
      quizSummaryController = null;
    }
  }

  function resetAiReviewState() {
    clearAiReviewController();
    stopAiReviewSpeech();
    aiReview.value = null;
    aiReviewStatus.value = "idle";
    aiReviewErrorMessage.value = "";
    aiSpeechErrorMessage.value = "";
    isAiReviewExpanded.value = false;
    hasExpandedAiReviewOnce.value = false;
  }

  function toggleAiReviewExpanded() {
    const nextExpanded = !isAiReviewExpanded.value;
    isAiReviewExpanded.value = nextExpanded;

    if (nextExpanded) {
      hasExpandedAiReviewOnce.value = true;
    }
  }

  function stopQuizSummarySpeech() {
    if (quizSummarySpeechController) {
      quizSummarySpeechController.abort();
      quizSummarySpeechController = null;
    }

    stopStudyNarration();
    revokeQuizSummarySpeechUrl();
    quizSummarySpeechStatus.value = "idle";
  }

  function resetQuizSummaryState() {
    clearQuizSummaryController();
    stopQuizSummarySpeech();
    quizSummary.value = null;
    quizSummaryMeta.value = null;
    quizSummaryStatus.value = "idle";
    quizSummaryErrorMessage.value = "";
    quizSummarySpeechErrorMessage.value = "";
  }

  function triggerAutoAdvanceAfterAiSpeech() {
    if (!shouldAdvanceAfterAiSpeech) {
      return;
    }

    shouldAdvanceAfterAiSpeech = false;
    scheduleNextQuestion();
  }

  async function loadAiReview({
    questionId,
    selectedOption,
    autoPlaySpeech = false,
    advanceAfterSpeech = false
  }) {
    clearAiReviewController();
    aiSpeechErrorMessage.value = "";
    aiReviewErrorMessage.value = "";
    aiReview.value = null;
    aiReviewStatus.value = "loading";
    isAiReviewExpanded.value = false;
    hasExpandedAiReviewOnce.value = false;
    activeAiReviewRequestId += 1;
    const requestId = activeAiReviewRequestId;
    const controller = new AbortController();
    aiReviewController = controller;

    try {
      const payload = await generateQuestionReview({
        questionId,
        selectedOption,
        model: settingsStore.effectiveReviewModel || "",
        reviewLength: coachingPreferences.value?.aiReviewLength || "standard",
        aiRuntime: settingsStore.effectiveReviewRuntimeConfig,
        signal: controller.signal
      });

      if (requestId !== activeAiReviewRequestId) {
        return;
      }

      aiReview.value = payload.data;
      aiReviewStatus.value = "ready";

      if (autoPlaySpeech && (payload.data?.speechText || "").trim()) {
        void handlePlayAiReview({
          advanceAfterPlayback: advanceAfterSpeech
        });
        return;
      }

      if (advanceAfterSpeech) {
        scheduleNextQuestion();
      }
    } catch (error) {
      if (error?.name === "AbortError" || requestId !== activeAiReviewRequestId) {
        return;
      }

      aiReviewStatus.value = "error";
      aiReviewErrorMessage.value = "猫头鹰老师这会儿没整理出提醒。";

      if (advanceAfterSpeech) {
        scheduleNextQuestion();
      }
    } finally {
      if (aiReviewController === controller) {
        aiReviewController = null;
      }
    }
  }

  async function handlePlayAiReview({ advanceAfterPlayback = false } = {}) {
    if (!aiReview.value?.speechText) {
      return;
    }

    if (aiSpeechStatus.value === "playing") {
      const shouldAdvanceNow = shouldAdvanceAfterAiSpeech;
      stopAiReviewSpeech();

      if (shouldAdvanceNow) {
        scheduleNextQuestion();
      }
      return;
    }

    stopAiReviewSpeech();
    aiSpeechErrorMessage.value = "";
    aiSpeechStatus.value = "loading";
    aiSpeechController = new AbortController();
    shouldAdvanceAfterAiSpeech = advanceAfterPlayback;

    try {
      await unlockAudio();
      const blob = await generateQuestionReviewSpeech({
        text: aiReview.value.speechText,
        model: settingsStore.effectiveTtsModel || "",
        voice: effectiveTtsVoice.value,
        speed: coachingPreferences.value?.aiReviewSpeed || 1,
        audioFormat: effectiveTtsAudioFormat.value,
        aiRuntime: settingsStore.effectiveTtsRuntimeConfig,
        signal: aiSpeechController.signal
      });

      activeAiSpeechUrl = URL.createObjectURL(blob);
      const playback = await playStudyNarration(activeAiSpeechUrl, {
        volume: aiSpeechVolume.value,
        onEnded: () => {
          revokeAiSpeechUrl();
          aiSpeechStatus.value = "idle";
          triggerAutoAdvanceAfterAiSpeech();
        },
        onError: ({ reason }) => {
          revokeAiSpeechUrl();
          aiSpeechStatus.value = "error";
          aiSpeechErrorMessage.value =
            reason === "play-blocked"
              ? "浏览器拦住了猫头鹰讲解，请再点一次。"
              : "猫头鹰这次没说出来。";
          triggerAutoAdvanceAfterAiSpeech();
        }
      });

      if (!playback.started) {
        aiSpeechStatus.value = "error";
        aiSpeechErrorMessage.value =
          playback.reason === "play-blocked"
            ? "浏览器拦住了猫头鹰讲解，请再点一次。"
            : "猫头鹰这次没说出来。";
        revokeAiSpeechUrl();
        triggerAutoAdvanceAfterAiSpeech();
        return;
      }

      aiSpeechStatus.value = "playing";
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      aiSpeechStatus.value = "error";
      aiSpeechErrorMessage.value = error.message || "猫头鹰这次没说出来。";
      revokeAiSpeechUrl();
      triggerAutoAdvanceAfterAiSpeech();
    } finally {
      aiSpeechController = null;
    }
  }

  async function loadQuizSummary() {
    const attempts = getAttempts();

    if (!attempts.length) {
      return;
    }

    clearQuizSummaryController();
    stopQuizSummarySpeech();
    quizSummary.value = null;
    quizSummaryMeta.value = null;
    quizSummaryErrorMessage.value = "";
    quizSummarySpeechErrorMessage.value = "";
    quizSummaryStatus.value = "loading";
    const controller = new AbortController();
    quizSummaryController = controller;

    try {
      const payload = await generateQuizSessionSummary({
        attempts,
        score: getCurrentScore(),
        correctCount: getCorrectCount(),
        wrongCount: getWrongCount(),
        totalQuestions: getTotalQuestions(),
        accuracyPercent: getAccuracyPercent(),
        playMode: getPlayMode(),
        stageTitle: getStageTitle(),
        model: settingsStore.effectiveReviewModel || "",
        reviewLength: coachingPreferences.value?.aiReviewLength || "standard",
        aiRuntime: settingsStore.effectiveReviewRuntimeConfig,
        signal: controller.signal
      });

      if (quizSummaryController !== controller) {
        return;
      }

      quizSummary.value = payload.data;
      quizSummaryMeta.value = payload.meta || null;
      quizSummaryStatus.value = "ready";
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      quizSummaryStatus.value = "error";
      quizSummaryErrorMessage.value = "猫头鹰老师这会儿没把总结整理出来。";
    } finally {
      if (quizSummaryController === controller) {
        quizSummaryController = null;
      }
    }
  }

  async function handlePlayQuizSummary() {
    if (!quizSummary.value?.speechText) {
      return;
    }

    if (quizSummarySpeechStatus.value === "playing") {
      stopQuizSummarySpeech();
      return;
    }

    stopQuizSummarySpeech();
    quizSummarySpeechErrorMessage.value = "";
    quizSummarySpeechStatus.value = "loading";
    quizSummarySpeechController = new AbortController();

    try {
      await unlockAudio();
      const blob = await generateQuestionReviewSpeech({
        text: quizSummary.value.speechText,
        model: settingsStore.effectiveTtsModel || "",
        voice: effectiveTtsVoice.value,
        speed: coachingPreferences.value?.aiReviewSpeed || 1,
        audioFormat: effectiveTtsAudioFormat.value,
        aiRuntime: settingsStore.effectiveTtsRuntimeConfig,
        signal: quizSummarySpeechController.signal
      });

      activeQuizSummarySpeechUrl = URL.createObjectURL(blob);
      const playback = await playStudyNarration(activeQuizSummarySpeechUrl, {
        volume: aiSpeechVolume.value,
        onEnded: () => {
          revokeQuizSummarySpeechUrl();
          quizSummarySpeechStatus.value = "idle";
        },
        onError: ({ reason }) => {
          revokeQuizSummarySpeechUrl();
          quizSummarySpeechStatus.value = "error";
          quizSummarySpeechErrorMessage.value =
            reason === "play-blocked"
              ? "浏览器拦住了猫头鹰总结，请再点一次。"
              : "猫头鹰这次没把总结讲出来。";
        }
      });

      if (!playback.started) {
        quizSummarySpeechStatus.value = "error";
        quizSummarySpeechErrorMessage.value =
          playback.reason === "play-blocked"
            ? "浏览器拦住了猫头鹰总结，请再点一次。"
            : "猫头鹰这次没把总结讲出来。";
        revokeQuizSummarySpeechUrl();
        return;
      }

      quizSummarySpeechStatus.value = "playing";
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      quizSummarySpeechStatus.value = "error";
      quizSummarySpeechErrorMessage.value = error.message || "猫头鹰这次没把总结讲出来。";
      revokeQuizSummarySpeechUrl();
    } finally {
      quizSummarySpeechController = null;
    }
  }

  function disposeQuizAiReview() {
    clearAiReviewController();
    stopAiReviewSpeech();
    clearQuizSummaryController();
    stopQuizSummarySpeech();
  }

  return {
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
    toggleAiReviewExpanded,
    resetQuizSummaryState,
    loadAiReview,
    handlePlayAiReview,
    loadQuizSummary,
    handlePlayQuizSummary,
    stopAiReviewSpeech,
    stopQuizSummarySpeech,
    disposeQuizAiReview
  };
}
