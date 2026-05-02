import { computed, ref } from "vue";
import { fetchChallengeProgress, saveChallengeProgress } from "../../services/challengeProgressApi";

export function createChallengeRuntime({
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
}) {
  const selectedChallengeChapterId = ref(DEFAULT_CHALLENGE_CHAPTER_ID);
  const selectedStageId = ref(CHALLENGE_STAGES[0].id);
  const challengeProgressBook = ref(
    normalizeChallengeProgressBook({
      activeChapterId: DEFAULT_CHALLENGE_CHAPTER_ID
    })
  );
  const challengeProgress = ref(normalizeChallengeProgress());
  const latestChallengeOutcome = ref(null);
  const challengeCoverage = ref({
    status: CHALLENGE_COVERAGE_STATUS.IDLE,
    countsByStageId: {}
  });
  const challengePersistenceState = ref(CHALLENGE_PERSISTENCE_STATE.LOCAL);

  let challengeCoverageController = null;

  const currentChallengeChapter = computed(() => getChallengeChapter(selectedChallengeChapterId.value));
  const currentChallengeChapterLabel = computed(() => currentChallengeChapter.value.label);
  const currentChallengeRouteTitle = computed(() => currentChallengeChapter.value.routeTitle || "挑战路线");
  const currentChallengeRouteFocus = computed(() => currentChallengeChapter.value.routeFocus || "");
  const currentStage = computed(() => getChallengeStageConfig(selectedStageId.value, selectedChallengeChapterId.value));
  const currentStageIndex = computed(() =>
    CHALLENGE_STAGES.findIndex((stage) => stage.id === currentStage.value.id)
  );
  const currentStageLabel = computed(() => `第 ${currentStageIndex.value + 1} 关 · ${currentStage.value.title}`);
  const currentStageBestResult = computed(() => challengeProgress.value.bestResults[currentStage.value.id] ?? null);

  const challengeRewardCount = computed(
    () => CHALLENGE_STAGES.filter((stage) => Boolean(challengeProgress.value.bestResults[stage.id]?.rewardEarned)).length
  );
  const challengeRewardProgressLabel = computed(() => `航海册 ${challengeRewardCount.value} / ${CHALLENGE_STAGES.length}`);
  const challengeAchievements = computed(() => {
    const freshAchievementIds = new Set(
      (latestChallengeOutcome.value?.newAchievements ?? []).map((achievement) => achievement.id)
    );
    const achievementEvaluation = evaluateChallengeAchievements(challengeProgress.value, {}, { totalStageCount: CHALLENGE_STAGES.length });

    return achievementEvaluation.achievements.map((achievement) => ({
      ...achievement,
      fresh: freshAchievementIds.has(achievement.id)
    }));
  });
  const challengeAchievementCount = computed(
    () => challengeAchievements.value.filter((achievement) => achievement.isUnlocked).length
  );
  const challengeAchievementProgressLabel = computed(
    () => `成就 ${challengeAchievementCount.value} / ${CHALLENGE_ACHIEVEMENTS.length}`
  );
  const isChallengeCoverageLoading = computed(() => challengeCoverage.value.status === CHALLENGE_COVERAGE_STATUS.LOADING);

  function clearChallengeOutcome() {
    latestChallengeOutcome.value = null;
  }

  function syncActiveChallengeProgress() {
    const activeProgress = getChallengeChapterProgress(challengeProgressBook.value, selectedChallengeChapterId.value);

    challengeProgress.value = activeProgress;

    if (!activeProgress.unlockedStageIds.includes(selectedStageId.value)) {
      selectedStageId.value = activeProgress.unlockedStageIds[0] ?? CHALLENGE_STAGES[0].id;
    }

    return activeProgress;
  }

  function setSelectedChallengeChapter(chapterId) {
    const nextChapter = getChallengeChapter(chapterId);
    selectedChallengeChapterId.value = nextChapter.id;
    challengeProgressBook.value = normalizeChallengeProgressBook({
      ...challengeProgressBook.value,
      activeChapterId: nextChapter.id
    });
    persistChallengeProgressCache(challengeProgressBook.value);
    return syncActiveChallengeProgress();
  }

  function applyChallengeProgress(progress, { chapterId = selectedChallengeChapterId.value } = {}) {
    const normalizedProgress = normalizeChallengeProgress(progress);
    const normalizedBook = normalizeChallengeProgressBook({
      ...challengeProgressBook.value,
      activeChapterId: chapterId,
      chapters: {
        ...challengeProgressBook.value.chapters,
        [chapterId]: normalizedProgress
      }
    });

    challengeProgressBook.value = normalizedBook;

    if (selectedChallengeChapterId.value === chapterId) {
      challengeProgress.value = normalizedProgress;

      if (!normalizedProgress.unlockedStageIds.includes(selectedStageId.value)) {
        selectedStageId.value = normalizedProgress.unlockedStageIds[0] ?? CHALLENGE_STAGES[0].id;
      }
    }

    return normalizedProgress;
  }

  function applyChallengeProgressBook(progressBook, { activeChapterId } = {}) {
    const normalizedBook = normalizeChallengeProgressBook(progressBook);
    const resolvedActiveChapterId = getNormalizedChallengeActiveChapterId(
      activeChapterId ?? normalizedBook.activeChapterId
    );

    challengeProgressBook.value = normalizeChallengeProgressBook({
      ...normalizedBook,
      activeChapterId: resolvedActiveChapterId
    });
    return setSelectedChallengeChapter(resolvedActiveChapterId);
  }

  function hydrateChallengeProgress() {
    challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.LOCAL;

    if (typeof window === "undefined") {
      return applyChallengeProgressBook(
        normalizeChallengeProgressBook({
          activeChapterId: DEFAULT_CHALLENGE_CHAPTER_ID
        })
      );
    }

    try {
      const savedProgress = window.localStorage.getItem(CHALLENGE_PROGRESS_STORAGE_KEY);
      return applyChallengeProgressBook(
        savedProgress
          ? normalizeChallengeProgressBook(JSON.parse(savedProgress))
          : normalizeChallengeProgressBook({
              activeChapterId: DEFAULT_CHALLENGE_CHAPTER_ID
            })
      );
    } catch {
      return applyChallengeProgressBook(
        normalizeChallengeProgressBook({
          activeChapterId: DEFAULT_CHALLENGE_CHAPTER_ID
        })
      );
    }
  }

  function persistChallengeProgressCache(progressBook = challengeProgressBook.value) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(CHALLENGE_PROGRESS_STORAGE_KEY, JSON.stringify(normalizeChallengeProgressBook(progressBook)));
    } catch {
      // Ignore storage write failures and keep runtime state usable.
    }
  }

  async function syncChallengeProgressFromServer() {
    challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.SYNCING;

    try {
      const payload = await fetchChallengeProgress();
      const serverProgressBook = normalizeChallengeProgressBook(payload.progressBook ?? payload.progress ?? payload);
      const mergedProgressBook = mergeChallengeProgressBooks(challengeProgressBook.value, serverProgressBook);

      applyChallengeProgressBook(mergedProgressBook, {
        activeChapterId: mergedProgressBook.activeChapterId
      });
      persistChallengeProgressCache(mergedProgressBook);

      if (!isChallengeProgressBookEqual(serverProgressBook, mergedProgressBook)) {
        const savedPayload = await saveChallengeProgress({
          progressBook: mergedProgressBook
        });
        const serverMergedProgressBook = mergeChallengeProgressBooks(
          mergedProgressBook,
          savedPayload.progressBook ?? savedPayload.progress ?? savedPayload
        );

        applyChallengeProgressBook(serverMergedProgressBook, {
          activeChapterId: serverMergedProgressBook.activeChapterId
        });
        persistChallengeProgressCache(serverMergedProgressBook);
      }

      challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.SYNCED;
    } catch {
      challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.LOCAL;
    }
  }

  async function persistChallengeProgress(progress = challengeProgress.value) {
    const normalizedProgress = applyChallengeProgress(progress);
    const normalizedProgressBook = normalizeChallengeProgressBook(challengeProgressBook.value);

    persistChallengeProgressCache(normalizedProgressBook);
    challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.SYNCING;

    try {
      const payload = await saveChallengeProgress({
        progressBook: normalizedProgressBook
      });
      const mergedProgressBook = mergeChallengeProgressBooks(
        normalizedProgressBook,
        payload.progressBook ?? payload.progress ?? payload
      );

      applyChallengeProgressBook(mergedProgressBook, {
        activeChapterId: mergedProgressBook.activeChapterId
      });
      persistChallengeProgressCache(mergedProgressBook);
      challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.SYNCED;
      return normalizedProgress;
    } catch {
      challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.LOCAL;
      return normalizedProgress;
    }
  }

  async function restoreChallengeProgressBook(nextProgressBook) {
    const normalizedProgressBook = normalizeChallengeProgressBook(nextProgressBook);
    const activeChapterId = getNormalizedChallengeActiveChapterId(normalizedProgressBook.activeChapterId);

    applyChallengeProgressBook(normalizedProgressBook, {
      activeChapterId
    });
    persistChallengeProgressCache(challengeProgressBook.value);
    challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.SYNCING;

    try {
      const payload = await saveChallengeProgress({
        progressBook: challengeProgressBook.value
      });
      const mergedProgressBook = mergeChallengeProgressBooks(
        challengeProgressBook.value,
        payload.progressBook ?? payload.progress ?? payload
      );

      applyChallengeProgressBook(mergedProgressBook, {
        activeChapterId: mergedProgressBook.activeChapterId
      });
      persistChallengeProgressCache(mergedProgressBook);
      challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.SYNCED;
      return mergedProgressBook;
    } catch {
      challengePersistenceState.value = CHALLENGE_PERSISTENCE_STATE.LOCAL;
      return challengeProgressBook.value;
    }
  }

  async function loadChallengeCoverage() {
    challengeCoverageController?.abort();
    const controller = new AbortController();
    challengeCoverageController = controller;
    challengeCoverage.value = {
      status: CHALLENGE_COVERAGE_STATUS.LOADING,
      countsByStageId: challengeCoverage.value.countsByStageId
    };

    try {
      const chapter = getChallengeChapter(selectedChallengeChapterId.value);
      const targets = getChallengeStageList(chapter.id).map((stage) => ({
        key: stage.id,
        subject: selectedSubjectValue.value,
        grade: chapter.grade,
        semester: chapter.semester || "",
        knowledgeTag: stage.knowledgeTag || "",
        difficulty: stage.difficulty
      }));
      const payload = await fetchQuestionCoverage({
        targets,
        signal: controller.signal
      });
      const countsByStageId = Object.fromEntries(
        payload.data.map((item) => [String(item?.key || ""), Math.max(0, Number(item?.count || 0))])
      );

      challengeCoverage.value = {
        status: CHALLENGE_COVERAGE_STATUS.READY,
        countsByStageId
      };
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      challengeCoverage.value = {
        status: CHALLENGE_COVERAGE_STATUS.ERROR,
        countsByStageId: {}
      };
    } finally {
      if (challengeCoverageController === controller) {
        challengeCoverageController = null;
      }
    }
  }

  function disposeChallengeRuntime() {
    if (challengeCoverageController) {
      challengeCoverageController.abort();
      challengeCoverageController = null;
    }
  }

  return {
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
  };
}
