import { ref } from "vue";
import { generateQuizSessionSummary } from "../../services/questionsApi";

// 整轮学习总结（Phase C1）：只调用后端本地确定性规则（/review/summary），
// 不包含任何模型调用或语音播报能力。
export function createQuizSessionSummary({
  getAttempts,
  getCurrentScore,
  getCorrectCount,
  getWrongCount,
  getTotalQuestions,
  getAccuracyPercent,
  getPlayMode,
  getStageTitle
}) {
  let quizSummaryController = null;

  const quizSummary = ref(null);
  const quizSummaryMeta = ref(null);
  const quizSummaryStatus = ref("idle");
  const quizSummaryErrorMessage = ref("");

  function clearQuizSummaryController() {
    if (quizSummaryController) {
      quizSummaryController.abort();
      quizSummaryController = null;
    }
  }

  function resetQuizSummaryState() {
    clearQuizSummaryController();
    quizSummary.value = null;
    quizSummaryMeta.value = null;
    quizSummaryStatus.value = "idle";
    quizSummaryErrorMessage.value = "";
  }

  async function loadQuizSummary() {
    const attempts = getAttempts();

    if (!attempts.length) {
      return;
    }

    clearQuizSummaryController();
    quizSummary.value = null;
    quizSummaryMeta.value = null;
    quizSummaryErrorMessage.value = "";
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

  function disposeQuizSessionSummary() {
    clearQuizSummaryController();
  }

  return {
    quizSummary,
    quizSummaryMeta,
    quizSummaryStatus,
    quizSummaryErrorMessage,
    resetQuizSummaryState,
    loadQuizSummary,
    disposeQuizSessionSummary
  };
}
