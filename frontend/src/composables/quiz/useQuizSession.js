import { computed, ref } from "vue";

export function createQuizSession({
  PLAY_MODE,
  QUIZ_PRACTICE_SOURCE,
  QUIZ_SESSION_STORAGE_KEY,
  CHALLENGE_STAGES,
  getNormalizedChallengeActiveChapterId,
  quizRouteName,
  getCurrentRouteName,
  getCurrentRouteQuery,
  selectedChallengeChapterId,
  selectedStageId,
  challengeProgress,
  setSelectedChallengeChapter,
  getSelectedSubjectValue,
  getSelectedGradeValue,
  getSelectedSemesterValue,
  getActiveKnowledgeTagFilter,
  getActiveQuestionCountValue,
  getActiveDifficultyValue,
  getPendingWrongQuestionIds,
  resolveWrongBookQuestionSnapshots,
  fetchRandomQuestions,
  clearChallengeOutcome,
  resetQuiz
}) {
  function normalizeQuizPracticeContext(context = {}) {
    const normalizedSource = Object.values(QUIZ_PRACTICE_SOURCE).includes(String(context?.source || "").trim())
      ? String(context.source).trim()
      : QUIZ_PRACTICE_SOURCE.GENERAL;

    return {
      source: normalizedSource,
      knowledgeTag: String(context?.knowledgeTag || "").trim(),
      questionIds: Array.isArray(context?.questionIds)
        ? context.questionIds
            .map((questionId) => Number.parseInt(String(questionId ?? ""), 10))
            .filter((questionId) => Number.isInteger(questionId) && questionId > 0)
        : []
    };
  }

  function normalizeQuizSessionSnapshot(snapshot = {}) {
    const normalizedPlayMode = Object.values(PLAY_MODE).includes(String(snapshot?.playMode || "").trim())
      ? String(snapshot.playMode).trim()
      : PLAY_MODE.FREE;
    const normalizedStageId = CHALLENGE_STAGES.some((stage) => stage.id === String(snapshot?.selectedStageId || "").trim())
      ? String(snapshot.selectedStageId).trim()
      : CHALLENGE_STAGES[0].id;

    return {
      playMode: normalizedPlayMode,
      selectedChallengeChapterId: getNormalizedChallengeActiveChapterId(snapshot?.selectedChallengeChapterId),
      selectedStageId: normalizedStageId,
      quizPracticeContext: normalizeQuizPracticeContext(snapshot?.quizPracticeContext)
    };
  }

  const questions = ref([]);
  const isLoading = ref(false);
  const errorMessage = ref("");
  const playMode = ref(PLAY_MODE.FREE);
  const quizPracticeContext = ref(normalizeQuizPracticeContext());
  const isRestoringQuizSession = ref(false);
  const isQuizSessionPersistenceEnabled = ref(false);

  const isChallengeMode = computed(() => playMode.value === PLAY_MODE.CHALLENGE);
  const isKnowledgePractice = computed(() => quizPracticeContext.value.source === QUIZ_PRACTICE_SOURCE.KNOWLEDGE);
  const isWrongBookPractice = computed(() => quizPracticeContext.value.source === QUIZ_PRACTICE_SOURCE.WRONG_BOOK);

  let currentController = null;

  function persistQuizSession() {
    if (typeof window === "undefined" || !isQuizSessionPersistenceEnabled.value || isRestoringQuizSession.value) {
      return;
    }

    try {
      window.localStorage.setItem(
        QUIZ_SESSION_STORAGE_KEY,
        JSON.stringify(
          normalizeQuizSessionSnapshot({
            playMode: playMode.value,
            selectedChallengeChapterId: selectedChallengeChapterId.value,
            selectedStageId: selectedStageId.value,
            quizPracticeContext: quizPracticeContext.value
          })
        )
      );
    } catch {
      // Ignore storage write failures and keep runtime state usable.
    }
  }

  function hydrateQuizSession() {
    if (typeof window === "undefined") {
      return normalizeQuizSessionSnapshot();
    }

    try {
      const savedSession = window.localStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
      return savedSession ? normalizeQuizSessionSnapshot(JSON.parse(savedSession)) : normalizeQuizSessionSnapshot();
    } catch {
      return normalizeQuizSessionSnapshot();
    }
  }

  function resolveRouteQuizSessionSnapshot() {
    const routeQuery = typeof getCurrentRouteQuery === "function" ? getCurrentRouteQuery() : null;
    const routeMode = String(routeQuery?.mode || "").trim();

    if (routeMode !== PLAY_MODE.CHALLENGE) {
      return null;
    }

    return normalizeQuizSessionSnapshot({
      playMode: PLAY_MODE.CHALLENGE,
      selectedChallengeChapterId: routeQuery?.chapter,
      selectedStageId: routeQuery?.stage
    });
  }

  function setQuizPracticeContext({
    source = QUIZ_PRACTICE_SOURCE.GENERAL,
    knowledgeTag = "",
    questionIds = []
  } = {}) {
    quizPracticeContext.value = normalizeQuizPracticeContext({
      source,
      knowledgeTag,
      questionIds
    });
  }

  function resetQuizPracticeContext() {
    setQuizPracticeContext();
  }

  function resolveWrongBookQuestions(questionIds = quizPracticeContext.value.questionIds) {
    const ids = Array.isArray(questionIds) && questionIds.length > 0 ? questionIds : getPendingWrongQuestionIds();
    return resolveWrongBookQuestionSnapshots(ids);
  }

  function decoratePlayableQuestions(rows = []) {
    const forcedKnowledgeTag = isKnowledgePractice.value ? String(getActiveKnowledgeTagFilter() || "").trim() : "";

    return rows.map((question) => {
      const fallbackKnowledgeTag = String(question?.knowledgeTag || "").trim() || String(question?.type || "").trim();
      const resolvedKnowledgeTag = forcedKnowledgeTag || fallbackKnowledgeTag;

      if (!resolvedKnowledgeTag || resolvedKnowledgeTag === question?.knowledgeTag) {
        return question;
      }

      return {
        ...question,
        knowledgeTag: resolvedKnowledgeTag
      };
    });
  }

  async function loadQuestions() {
    clearChallengeOutcome();
    currentController?.abort();

    const controller = new AbortController();
    currentController = controller;
    isLoading.value = true;
    errorMessage.value = "";

    try {
      if (isWrongBookPractice.value) {
        const localQuestions = resolveWrongBookQuestions();

        questions.value = localQuestions;
        resetQuiz();

        if (!localQuestions.length) {
          errorMessage.value = "错题本里暂时没有可温习的题目。";
        }

        return;
      }

      const semester = getSelectedSemesterValue();
      const data = await fetchRandomQuestions({
        subject: getSelectedSubjectValue(),
        grade: getSelectedGradeValue(),
        semester,
        knowledgeTag: getActiveKnowledgeTagFilter(),
        count: getActiveQuestionCountValue(),
        difficulty: getActiveDifficultyValue(),
        allowSemesterFallback: !isChallengeMode.value && Boolean(semester),
        signal: controller.signal
      });

      if (currentController !== controller) {
        return;
      }

      questions.value = decoratePlayableQuestions(data);
      resetQuiz();
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      if (currentController !== controller) {
        return;
      }

      questions.value = [];
      errorMessage.value = error?.message || "题目加载失败，请稍后重试。";
    } finally {
      if (currentController === controller) {
        currentController = null;
        isLoading.value = false;
      }
    }
  }

  async function restoreQuizSessionForCurrentRoute() {
    if (getCurrentRouteName() !== quizRouteName) {
      return;
    }

    isRestoringQuizSession.value = true;

    try {
      const sessionSnapshot = resolveRouteQuizSessionSnapshot() ?? hydrateQuizSession();

      setQuizPracticeContext(sessionSnapshot.quizPracticeContext);

      if (sessionSnapshot.playMode === PLAY_MODE.CHALLENGE) {
        playMode.value = PLAY_MODE.CHALLENGE;
        setSelectedChallengeChapter(sessionSnapshot.selectedChallengeChapterId);

        const unlockedStageIds = challengeProgress.value.unlockedStageIds;
        selectedStageId.value = unlockedStageIds.includes(sessionSnapshot.selectedStageId)
          ? sessionSnapshot.selectedStageId
          : unlockedStageIds[0] ?? CHALLENGE_STAGES[0].id;
      } else {
        playMode.value = PLAY_MODE.FREE;
      }

      await loadQuestions();
    } finally {
      isRestoringQuizSession.value = false;
    }
  }

  function enableQuizSessionPersistence() {
    isQuizSessionPersistenceEnabled.value = true;
    persistQuizSession();
  }

  function disposeQuizSession() {
    currentController?.abort();
    currentController = null;
  }

  return {
    normalizeQuizPracticeContext,
    normalizeQuizSessionSnapshot,
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
    hydrateQuizSession,
    setQuizPracticeContext,
    resetQuizPracticeContext,
    restoreQuizSessionForCurrentRoute,
    loadQuestions,
    disposeQuizSession
  };
}
