import { computed, onBeforeUnmount, ref, watch } from "vue";
import { hasStudyNarrationAsset, loadStudyNarrationSrc } from "../audio/studyNarrationRegistry";
import { prefetchStudyNarrationAssetStems, releaseStudyNarrationAssetStems } from "../audio/studyNarrationPackManager";
import { playStudyNarration, stopStudyNarration } from "../audio/studyNarrationEngine";
import { useAudioStore } from "../stores/useAudioStore";

const COMPLETION_CELEBRATION_MS = 2200;

function clearTimer(timerRef) {
  if (timerRef.value) {
    window.clearTimeout(timerRef.value);
    timerRef.value = 0;
  }
}

function areAssetStemListsEqual(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function useStudyLessonPlayer(lessonRef) {
  const audioStore = useAudioStore();
  const cardIndex = ref(0);
  const narrationStatus = ref("idle");
  const canGoNext = ref(false);
  const isExitDialogOpen = ref(false);
  const isCelebrating = ref(false);
  const shouldAutoComplete = ref(false);
  const narrationNotice = ref("");
  const needsManualStart = ref(false);
  const lessonPrefetchStatus = ref("idle");
  const lessonPrefetchReadyCount = ref(0);
  const lessonPrefetchRequestedCount = ref(0);

  const cardUnlockTimerId = ref(0);
  const completionTimerId = ref(0);
  const narrationRequestId = ref(0);
  const lessonPrefetchRequestId = ref(0);
  const prefetchedLessonAssetStems = ref([]);

  const cards = computed(() => lessonRef.value?.cards || []);
  const currentCard = computed(() => cards.value[cardIndex.value] || null);
  const hasNarration = computed(
    () =>
      Boolean(currentCard.value?.audioSrc) ||
      Boolean(currentCard.value?.audioAssetStem && hasStudyNarrationAsset(currentCard.value.audioAssetStem))
  );
  const isLastCard = computed(() => cardIndex.value >= Math.max(cards.value.length - 1, 0));
  const progressLabel = computed(() => (cards.value.length ? `${cardIndex.value + 1}/${cards.value.length}` : "0/0"));
  const progressPercent = computed(() => (cards.value.length ? ((cardIndex.value + 1) / cards.value.length) * 100 : 0));
  const secondaryActionLabel = computed(() => {
    if (needsManualStart.value) {
      return "点我开讲";
    }

    return hasNarration.value ? "重听一遍" : "再看一遍";
  });
  const cardStatusText = computed(() => {
    if (!currentCard.value) {
      return "";
    }

    if (narrationStatus.value === "playing") {
      return "老师正在带着讲";
    }

    if (narrationStatus.value === "blocked") {
      return "点一下“点我开讲”再继续";
    }

    if (narrationStatus.value === "fallback") {
      return hasNarration.value ? "语音暂时没播出来，先按节奏看卡片" : "这张先用图文讲解";
    }

    if (canGoNext.value) {
      return isLastCard.value ? "这一张听完就能收下这一站" : "这一张已经可以继续了";
    }

    return "准备开讲";
  });
  const completionPayload = computed(() => ({
    lessonId: lessonRef.value?.id || "",
    lessonTitle: lessonRef.value?.title || "",
    rewardLabel: lessonRef.value?.rewardLabel || "知识之星",
    cardCount: cards.value.length
  }));
  const lessonPrefetchSummary = computed(() => {
    if (lessonPrefetchRequestedCount.value <= 0) {
      return "";
    }

    if (lessonPrefetchStatus.value === "loading") {
      return `正在自动备好本课语音 ${lessonPrefetchReadyCount.value}/${lessonPrefetchRequestedCount.value}`;
    }

    if (lessonPrefetchStatus.value === "ready") {
      return `本课语音已自动存好 ${lessonPrefetchReadyCount.value}/${lessonPrefetchRequestedCount.value}`;
    }

    if (lessonPrefetchStatus.value === "partial") {
      return `本课语音已自动存好 ${lessonPrefetchReadyCount.value}/${lessonPrefetchRequestedCount.value}`;
    }

    if (lessonPrefetchStatus.value === "unsupported") {
      return "当前环境不支持自动缓存，会直接按静态音频播放。";
    }

    if (lessonPrefetchStatus.value === "error") {
      return "本课语音自动缓存失败，仍会直接尝试播放。";
    }

    return "";
  });

  function createNarrationRequest() {
    narrationRequestId.value += 1;
    return narrationRequestId.value;
  }

  function invalidateNarrationRequest() {
    narrationRequestId.value += 1;
  }

  function isNarrationRequestCurrent(requestId) {
    return narrationRequestId.value === requestId;
  }

  function getNarrationVolume() {
    const masterVolume = Number(audioStore.masterVolume);

    if (!Number.isFinite(masterVolume)) {
      return 1;
    }

    return Math.min(1, Math.max(0, masterVolume));
  }

  function createLessonPrefetchRequest() {
    lessonPrefetchRequestId.value += 1;
    return lessonPrefetchRequestId.value;
  }

  function invalidateLessonPrefetchRequest() {
    lessonPrefetchRequestId.value += 1;
  }

  function isLessonPrefetchRequestCurrent(requestId) {
    return lessonPrefetchRequestId.value === requestId;
  }

  function collectLessonAudioAssetStems() {
    const seenAssetStems = new Set();
    const lessonAudioAssetStems = [];

    for (const card of cards.value) {
      const assetStem = String(card?.audioAssetStem ?? "").trim();

      if (!assetStem || seenAssetStems.has(assetStem) || !hasStudyNarrationAsset(assetStem)) {
        continue;
      }

      seenAssetStems.add(assetStem);
      lessonAudioAssetStems.push(assetStem);
    }

    return lessonAudioAssetStems;
  }

  function releasePrefetchedLessonAssets() {
    if (!prefetchedLessonAssetStems.value.length) {
      return;
    }

    releaseStudyNarrationAssetStems(prefetchedLessonAssetStems.value);
    prefetchedLessonAssetStems.value = [];
  }

  function syncLessonPrefetch() {
    const nextLessonAssetStems = collectLessonAudioAssetStems();
    const requestId = createLessonPrefetchRequest();

    if (areAssetStemListsEqual(nextLessonAssetStems, prefetchedLessonAssetStems.value)) {
      lessonPrefetchRequestedCount.value = nextLessonAssetStems.length;
      lessonPrefetchReadyCount.value = nextLessonAssetStems.length;
      lessonPrefetchStatus.value = nextLessonAssetStems.length ? "ready" : "idle";
      return;
    }

    releasePrefetchedLessonAssets();
    prefetchedLessonAssetStems.value = nextLessonAssetStems;
    lessonPrefetchRequestedCount.value = nextLessonAssetStems.length;
    lessonPrefetchReadyCount.value = 0;

    if (!nextLessonAssetStems.length) {
      lessonPrefetchStatus.value = "idle";
      return;
    }

    lessonPrefetchStatus.value = "loading";
    prefetchStudyNarrationAssetStems(nextLessonAssetStems, {
      persistResponse: true
    })
      .then((report) => {
        if (!isLessonPrefetchRequestCurrent(requestId)) {
          return;
        }

        lessonPrefetchReadyCount.value = report.readyCount;
        lessonPrefetchRequestedCount.value = report.requestedCount;

        if (report.unsupportedCount > 0) {
          lessonPrefetchStatus.value = "unsupported";
          return;
        }

        if (report.failedCount > 0) {
          lessonPrefetchStatus.value = "error";
          return;
        }

        lessonPrefetchStatus.value = report.readyCount >= report.requestedCount ? "ready" : "partial";
      })
      .catch(() => {
        if (!isLessonPrefetchRequestCurrent(requestId)) {
          return;
        }

        lessonPrefetchStatus.value = "error";
      });
  }

  function finishNarration(options = {}) {
    const { clearNotice = true } = options;

    clearTimer(cardUnlockTimerId);
    needsManualStart.value = false;

    if (clearNotice) {
      narrationNotice.value = "";
    }

    narrationStatus.value = "ended";
    canGoNext.value = true;
  }

  function setBlockedNotice() {
    narrationStatus.value = "blocked";
    canGoNext.value = false;
    needsManualStart.value = true;
    narrationNotice.value = "浏览器拦住了自动开讲，点一下“点我开讲”就能继续。";
  }

  function startFallbackTimer(message) {
    clearTimer(cardUnlockTimerId);
    stopStudyNarration();
    needsManualStart.value = false;
    narrationStatus.value = "fallback";
    canGoNext.value = false;
    narrationNotice.value = message;

    if (!currentCard.value) {
      narrationStatus.value = "idle";
      return;
    }

    cardUnlockTimerId.value = window.setTimeout(() => {
      cardUnlockTimerId.value = 0;
      finishNarration({ clearNotice: false });
    }, currentCard.value.minDurationMs);
  }

  async function startCurrentCard() {
    clearTimer(cardUnlockTimerId);
    stopStudyNarration();
    needsManualStart.value = false;
    canGoNext.value = false;
    shouldAutoComplete.value = false;

    if (!currentCard.value) {
      narrationStatus.value = "idle";
      narrationNotice.value = "";
      return;
    }

    const requestId = createNarrationRequest();
    const narrationSrc =
      currentCard.value.audioSrc || (await loadStudyNarrationSrc(currentCard.value.audioAssetStem || ""));

    if (!isNarrationRequestCurrent(requestId)) {
      return;
    }

    if (!narrationSrc) {
      startFallbackTimer("这张还没配讲解语音，先按节奏看图文讲解。");
      return;
    }

    narrationStatus.value = "playing";
    narrationNotice.value = "";
    let handledByError = false;

    const playbackResult = await playStudyNarration(narrationSrc, {
      volume: getNarrationVolume(),
      onEnded: () => {
        if (!isNarrationRequestCurrent(requestId)) {
          return;
        }

        finishNarration();
      },
      onError: ({ reason }) => {
        if (!isNarrationRequestCurrent(requestId)) {
          return;
        }

        handledByError = true;

        if (reason === "play-blocked") {
          setBlockedNotice();
          return;
        }

        startFallbackTimer("这张语音暂时没播出来，先按节奏看图文讲解。");
      }
    });

    if (!isNarrationRequestCurrent(requestId) || handledByError) {
      return;
    }

    if (playbackResult.started) {
      return;
    }

    if (playbackResult.reason === "play-blocked") {
      setBlockedNotice();
      return;
    }

    startFallbackTimer("这张语音暂时没播出来，先按节奏看图文讲解。");
  }

  function reset() {
    clearTimer(cardUnlockTimerId);
    clearTimer(completionTimerId);
    invalidateNarrationRequest();
    invalidateLessonPrefetchRequest();
    stopStudyNarration();
    cardIndex.value = 0;
    narrationStatus.value = "idle";
    canGoNext.value = false;
    isExitDialogOpen.value = false;
    isCelebrating.value = false;
    shouldAutoComplete.value = false;
    narrationNotice.value = "";
    needsManualStart.value = false;
    lessonPrefetchStatus.value = "idle";
    lessonPrefetchReadyCount.value = 0;
    lessonPrefetchRequestedCount.value = 0;
    syncLessonPrefetch();

    if (cards.value.length) {
      startCurrentCard();
    }
  }

  function stop() {
    clearTimer(cardUnlockTimerId);
    clearTimer(completionTimerId);
    invalidateNarrationRequest();
    invalidateLessonPrefetchRequest();
    stopStudyNarration();
    narrationStatus.value = "idle";
    canGoNext.value = false;
    isCelebrating.value = false;
    shouldAutoComplete.value = false;
    narrationNotice.value = "";
    needsManualStart.value = false;
    lessonPrefetchStatus.value = "idle";
    lessonPrefetchReadyCount.value = 0;
    lessonPrefetchRequestedCount.value = 0;
    releasePrefetchedLessonAssets();
  }

  function replayCurrentCard() {
    if (!currentCard.value || isCelebrating.value) {
      return;
    }

    startCurrentCard();
  }

  function goNext() {
    if (!canGoNext.value || isCelebrating.value || !currentCard.value) {
      return;
    }

    if (!isLastCard.value) {
      cardIndex.value += 1;
      startCurrentCard();
      return;
    }

    clearTimer(cardUnlockTimerId);
    invalidateNarrationRequest();
    stopStudyNarration();
    canGoNext.value = false;
    narrationStatus.value = "idle";
    isCelebrating.value = true;
    completionTimerId.value = window.setTimeout(() => {
      completionTimerId.value = 0;
      shouldAutoComplete.value = true;
    }, COMPLETION_CELEBRATION_MS);
  }

  function requestExit() {
    if (isCelebrating.value) {
      return;
    }

    isExitDialogOpen.value = true;
  }

  function setExitDialogOpen(nextValue) {
    isExitDialogOpen.value = Boolean(nextValue);
  }

  function cancelExit() {
    isExitDialogOpen.value = false;
  }

  function confirmExit() {
    isExitDialogOpen.value = false;
    stop();
  }

  function cancelAutoComplete() {
    clearTimer(completionTimerId);
    shouldAutoComplete.value = false;
    isCelebrating.value = false;
  }

  watch(
    () => lessonRef.value?.id || "",
    () => {
      reset();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    stop();
  });

  return {
    cardIndex,
    currentCard,
    narrationStatus,
    narrationNotice,
    hasNarration,
    needsManualStart,
    canGoNext,
    isExitDialogOpen,
    isCelebrating,
    isLastCard,
    progressLabel,
    progressPercent,
    secondaryActionLabel,
    cardStatusText,
    completionPayload,
    lessonPrefetchSummary,
    shouldAutoComplete,
    replayCurrentCard,
    startCurrentCard,
    goNext,
    requestExit,
    setExitDialogOpen,
    cancelExit,
    confirmExit,
    cancelAutoComplete,
    reset,
    stop
  };
}
