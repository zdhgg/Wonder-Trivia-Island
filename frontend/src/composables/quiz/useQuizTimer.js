import { computed, ref } from "vue";

export function createQuizTimer({
  ANSWER_STATUS,
  currentQuestion,
  answerState,
  isSubmitting,
  effectiveQuestionTimeLimitSeconds,
  onTimeExpired
}) {
  let countdownTimer = null;

  const timeRemainingMs = ref(0);
  const timedOut = ref(false);

  const hasTimeLimit = computed(
    () =>
      Number.isFinite(effectiveQuestionTimeLimitSeconds.value) &&
      effectiveQuestionTimeLimitSeconds.value > 0
  );

  const timeLimitMs = computed(() =>
    hasTimeLimit.value ? effectiveQuestionTimeLimitSeconds.value * 1000 : 0
  );

  const timeRemainingSeconds = computed(() =>
    hasTimeLimit.value ? Math.max(0, Math.ceil(timeRemainingMs.value / 1000)) : 0
  );

  const timerPercent = computed(() => {
    if (!hasTimeLimit.value || timeLimitMs.value <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((timeRemainingMs.value / timeLimitMs.value) * 100)));
  });

  const timerTone = computed(() => {
    if (!hasTimeLimit.value) {
      return "normal";
    }

    if (timeRemainingSeconds.value <= 5) {
      return "danger";
    }

    if (timeRemainingSeconds.value <= 10) {
      return "warning";
    }

    return "normal";
  });

  const showCountdown = computed(
    () =>
      hasTimeLimit.value &&
      Boolean(currentQuestion.value) &&
      (answerState.value === ANSWER_STATUS.WAITING || isSubmitting.value)
  );

  function clearCountdownTimer() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown(durationMs = timeLimitMs.value) {
    clearCountdownTimer();

    if (!hasTimeLimit.value || !currentQuestion.value || answerState.value !== ANSWER_STATUS.WAITING) {
      timeRemainingMs.value = 0;
      return;
    }

    const initialDuration = Math.max(0, Number(durationMs) || 0);
    timeRemainingMs.value = initialDuration;

    if (initialDuration === 0) {
      void onTimeExpired();
      return;
    }

    const deadline = Date.now() + initialDuration;

    countdownTimer = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      timeRemainingMs.value = remaining;

      if (remaining === 0) {
        clearCountdownTimer();
        void onTimeExpired();
      }
    }, 100);
  }

  function pauseCountdown() {
    clearCountdownTimer();
  }

  function syncQuestionTimer() {
    clearCountdownTimer();
    timedOut.value = false;

    if (hasTimeLimit.value && currentQuestion.value && answerState.value === ANSWER_STATUS.WAITING) {
      startCountdown();
      return;
    }

    timeRemainingMs.value = 0;
  }

  function disposeQuizTimer() {
    clearCountdownTimer();
  }

  return {
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
  };
}
