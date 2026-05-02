<script setup>
import { computed, reactive, watch } from "vue";
import { hasStudyNarrationAsset } from "../audio/studyNarrationRegistry";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import StudyLessonCard from "../components/StudyLessonCard.vue";
import { useStudyLessonPlayer } from "../composables/useStudyLessonPlayer";
import { buildStudyLessonPlayback } from "../utils/studyLessonPlayer";

const props = defineProps({
  lesson: {
    type: Object,
    default: null
  },
  nextLesson: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["close", "complete"]);

const playbackLesson = computed(() => buildStudyLessonPlayback(props.lesson));
const player = reactive(useStudyLessonPlayer(playbackLesson));
const nextLessonTitle = computed(() => props.nextLesson?.label || props.nextLesson?.title || "");
const nextLessonScopeLabel = computed(() => {
  const next = props.nextLesson;

  if (!next) {
    return "";
  }

  return [next.primaryGrade, next.primarySemester, next.primarySubject].filter(Boolean).join(" · ");
});
const lessonScopeText = computed(() =>
  [playbackLesson.value?.grade, playbackLesson.value?.semester, playbackLesson.value?.subject].filter(Boolean).join(" · ")
);
const lessonNarrationMeta = computed(() => {
  const cards = playbackLesson.value?.cards || [];
  const totalCardCount = cards.length;
  const readyCardCount = cards.reduce(
    (count, card) => count + (Boolean(card?.audioSrc) || Boolean(card?.audioAssetStem && hasStudyNarrationAsset(card.audioAssetStem)) ? 1 : 0),
    0
  );

  if (readyCardCount <= 0 || totalCardCount <= 0) {
    return {
      tone: "text",
      note: "当前这站还没配讲解语音，会按图文顺序带着学。"
    };
  }

  if (readyCardCount < totalCardCount) {
    return {
      tone: "mixed",
      note: `当前已配 ${readyCardCount}/${totalCardCount} 段讲解语音，其余内容会按图文顺序继续。`
    };
  }

  return {
    tone: "audio",
    note: `当前已配 ${readyCardCount}/${totalCardCount} 段讲解语音，可直接顺着听完。`
  };
});

watch(
  () => player.shouldAutoComplete,
  (shouldAutoComplete) => {
    if (!shouldAutoComplete) {
      return;
    }

    emit("complete", player.completionPayload);
  }
);

function handleCloseConfirm() {
  player.confirmExit();
  emit("close");
}

function handleReturnToHall() {
  player.cancelAutoComplete();
  emit("close");
}
</script>

<template>
  <section v-if="playbackLesson" class="study-player">
    <header class="study-player__header">
      <button class="study-player__exit" type="button" @click="player.requestExit">
        退出
      </button>

      <div class="study-player__intro">
        <p class="study-player__eyebrow">知识讲堂</p>
        <h1 class="study-player__title">{{ playbackLesson.title }}</h1>
        <p class="study-player__summary">
          {{ playbackLesson.summaryText }}
        </p>
      </div>

      <div class="study-player__progress-card" aria-label="讲解进度">
        <span class="study-player__progress-chip">{{ player.progressLabel }}</span>
        <strong class="study-player__progress-label">{{ lessonScopeText || "当前小站" }}</strong>
        <p :class="['study-player__progress-note', 'study-player__progress-note--availability', `study-player__progress-note--${lessonNarrationMeta.tone}`]">
          {{ lessonNarrationMeta.note }}
        </p>
        <p v-if="player.lessonPrefetchSummary" class="study-player__progress-note study-player__progress-note--prefetch">
          {{ player.lessonPrefetchSummary }}
        </p>
        <p v-if="player.narrationNotice" class="study-player__progress-note">{{ player.narrationNotice }}</p>
        <div class="study-player__progress-track" aria-hidden="true">
          <span class="study-player__progress-fill" :style="{ width: `${player.progressPercent}%` }"></span>
        </div>
      </div>
    </header>

    <main class="study-player__stage">
      <Transition name="study-card-swap" mode="out-in">
        <StudyLessonCard
          v-if="player.currentCard"
          :key="player.currentCard.id"
          :lesson-title="playbackLesson.title"
          :card="player.currentCard"
          :progress-label="player.progressLabel"
          :status-text="player.cardStatusText"
          :is-narrating="player.narrationStatus === 'playing'"
        />
      </Transition>

      <Transition name="study-celebration">
        <div v-if="player.isCelebrating" class="study-player__celebration" aria-live="polite">
          <span class="study-player__celebration-badge">这一站听完啦</span>
          <h2 class="study-player__celebration-title">收下一颗 {{ playbackLesson.rewardLabel }}</h2>
          <p v-if="nextLesson" class="study-player__celebration-text">
            马上接着听下一站：<strong>{{ nextLessonTitle }}</strong>
            <span v-if="nextLessonScopeLabel" class="study-player__celebration-scope">
              {{ nextLessonScopeLabel }}
            </span>
          </p>
          <p v-else class="study-player__celebration-text">
            {{ playbackLesson.title }} 已经听完啦，这一门这册到这里告一段落，回讲堂看看整体地图。
          </p>
          <button
            class="study-player__celebration-escape"
            type="button"
            @click="handleReturnToHall"
          >
            {{ nextLesson ? "先回讲堂看地图" : "回讲堂看地图" }}
          </button>
        </div>
      </Transition>
    </main>

    <footer class="study-player__controls">
      <button
        class="study-player__secondary"
        type="button"
        :disabled="player.isCelebrating || !player.currentCard"
        @click="player.replayCurrentCard"
      >
        {{ player.secondaryActionLabel }}
      </button>

      <button
        :class="['btn-cartoon', 'btn-cartoon--yellow', 'study-player__primary', { 'study-player__primary--ready': player.canGoNext }]"
        type="button"
        :disabled="!player.canGoNext || player.isCelebrating"
        @click="player.goNext"
      >
        {{ player.isLastCard ? "收下这一站" : "下一步" }}
      </button>
    </footer>

    <ConfirmDialog
      title-id="study-player-exit-title"
      :model-value="player.isExitDialogOpen"
      heading-eyebrow="暂时离开"
      heading-title="这一站还没听完"
      heading-description="现在退出会回到讲堂大厅，这一轮讲解会从头重新开始。"
      notice-text="建议先把这一站听完，再切去别的小站。"
      preview-label="当前小站"
      :preview-text="playbackLesson.title"
      cancel-text="继续听"
      confirm-text="退出"
      semantic-tone="warning"
      @update:model-value="player.setExitDialogOpen"
      @cancel="player.cancelExit"
      @confirm="handleCloseConfirm"
    />
  </section>

  <section v-else class="study-player study-player--empty">
    <div class="study-player__empty">
      <p class="study-player__eyebrow">还没选中小站</p>
      <h2 class="study-player__empty-title">先回讲堂大厅选一个学习站</h2>
      <button class="btn-cartoon btn-cartoon--yellow" type="button" @click="$emit('close')">
        返回讲堂
      </button>
    </div>
  </section>
</template>

<style scoped>
.study-player {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 24px;
  min-height: 100vh;
  padding: 28px;
}

.study-player--empty {
  place-items: center;
}

.study-player__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(260px, 0.66fr);
  gap: 18px;
  align-items: start;
}

.study-player__exit,
.study-player__secondary {
  min-height: 48px;
  padding: 10px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.study-player__exit:hover,
.study-player__secondary:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.42);
  box-shadow: 0 18px 28px -28px rgba(36, 50, 74, 0.42);
}

.study-player__exit:focus-visible,
.study-player__secondary:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.82);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.study-player__exit:disabled,
.study-player__secondary:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.study-player__intro,
.study-player__progress-card,
.study-player__celebration,
.study-player__empty {
  padding: 22px 24px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(180deg, rgba(255, 253, 248, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow:
    0 28px 48px -40px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.study-player__intro {
  display: grid;
  gap: 10px;
}

.study-player__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-player__title,
.study-player__empty-title,
.study-player__celebration-title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  color: var(--color-ink);
}

.study-player__title {
  font-size: clamp(2rem, 3.6vw, 2.7rem);
  line-height: 1.06;
}

.study-player__summary,
.study-player__celebration-text {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.65;
}

.study-player__progress-card {
  display: grid;
  gap: 12px;
  align-content: start;
  min-width: 0;
}

.study-player__progress-chip,
.study-player__celebration-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(36, 50, 74, 0.08);
  color: var(--color-ink);
  font-size: 0.82rem;
  font-weight: 800;
}

.study-player__progress-label {
  color: var(--color-ink);
  font-size: 1rem;
}

.study-player__progress-note {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.55;
  font-size: 0.92rem;
}

.study-player__progress-note--availability {
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(36, 50, 74, 0.08);
}

.study-player__progress-note--audio {
  color: rgba(35, 90, 70, 0.96);
  background: rgba(235, 251, 243, 0.92);
  border-color: rgba(124, 216, 184, 0.3);
}

.study-player__progress-note--mixed {
  color: rgba(122, 88, 22, 0.98);
  background: rgba(255, 248, 226, 0.94);
  border-color: rgba(255, 216, 102, 0.34);
}

.study-player__progress-note--text {
  color: rgba(42, 78, 118, 0.96);
  background: rgba(242, 249, 255, 0.94);
  border-color: rgba(86, 173, 255, 0.24);
}

.study-player__progress-note--prefetch {
  color: rgba(35, 73, 90, 0.9);
}

.study-player__progress-track {
  overflow: hidden;
  height: 12px;
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.72);
}

.study-player__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(124, 216, 184, 0.94) 0%, rgba(86, 173, 255, 0.92) 100%);
}

.study-player__stage {
  position: relative;
  display: grid;
  min-height: 0;
}

.study-player__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.study-player__primary {
  width: auto;
  min-width: 208px;
}

.study-player__primary--ready {
  animation: study-player-pulse 1300ms ease-in-out infinite;
}

.study-player__celebration,
.study-player__empty {
  display: grid;
  gap: 12px;
  align-content: center;
  justify-items: start;
}

.study-player__celebration {
  position: absolute;
  inset: 0;
  place-self: center;
  width: min(560px, 100%);
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.3) 0%, rgba(255, 255, 255, 0) 38%),
    linear-gradient(180deg, rgba(255, 251, 230, 0.96) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.study-player__celebration-text {
  max-width: 32rem;
}

.study-player__celebration-scope {
  display: inline-flex;
  margin-left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(36, 50, 74, 0.1);
  color: var(--color-ink-soft);
  font-size: 0.82rem;
}

.study-player__celebration-escape {
  margin-top: 6px;
  min-height: 40px;
  padding: 8px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.study-player__celebration-escape:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.5);
  box-shadow: 0 14px 24px -24px rgba(36, 50, 74, 0.42);
}

.study-player__celebration-escape:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.82);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.2);
}

.study-player__empty {
  width: min(560px, 100%);
}

.study-card-swap-enter-active,
.study-card-swap-leave-active,
.study-celebration-enter-active,
.study-celebration-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.study-card-swap-enter-from,
.study-card-swap-leave-to,
.study-celebration-enter-from,
.study-celebration-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes study-player-pulse {
  0%,
  100% {
    transform: translateY(0);
    box-shadow: 4px 4px 0px var(--color-shadow);
  }

  50% {
    transform: translateY(-1px);
    box-shadow:
      0 18px 28px -24px rgba(36, 50, 74, 0.36),
      4px 4px 0px var(--color-shadow);
  }
}

@media (max-width: 980px) {
  .study-player {
    padding: 20px;
  }

  .study-player__header {
    grid-template-columns: 1fr;
  }

  .study-player__progress-card {
    order: 3;
  }
}

@media (max-width: 640px) {
  .study-player {
    padding: 14px;
    gap: 16px;
  }

  .study-player__intro,
  .study-player__progress-card,
  .study-player__celebration,
  .study-player__empty {
    padding: 18px;
    border-radius: 24px;
  }

  .study-player__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .study-player__primary {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .study-card-swap-enter-active,
  .study-card-swap-leave-active,
  .study-celebration-enter-active,
  .study-celebration-leave-active,
  .study-player__primary--ready {
    transition: none;
    animation: none;
  }
}
</style>
