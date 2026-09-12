<script setup>
import { computed, ref } from "vue";
import HomeWelcomePanel from "../components/HomeWelcomePanel.vue";
import WeakPointPickerDialog from "../components/study/WeakPointPickerDialog.vue";
import { STUDY_WEAK_POINT_LIBRARY } from "../utils/studyWeakPoints";

const gradePracticeGrade = defineModel("gradePracticeGrade", { default: "三年级" });
const gradePracticeSemester = defineModel("gradePracticeSemester", { default: "上册" });
const challengeGrade = defineModel("challengeGrade", { default: "三年级" });
const challengeSemester = defineModel("challengeSemester", { default: "上册" });
const subjectPracticeSubject = defineModel("subjectPracticeSubject", { default: "数学" });
const subjectPracticeGrade = defineModel("subjectPracticeGrade", { default: "全部年级" });
const subjectPracticeSemester = defineModel("subjectPracticeSemester", { default: "上册" });

const props = defineProps({
  challengeCurrentStageLabel: {
    type: String,
    default: ""
  },
  challengeStageShortLabel: {
    type: String,
    default: ""
  },
  challengeRouteTitle: {
    type: String,
    default: ""
  },
  gradeOptions: {
    type: Array,
    default: () => []
  },
  subjectOptions: {
    type: Array,
    default: () => []
  },
  semesterOptions: {
    type: Array,
    default: () => []
  },
  subjectGradeOptions: {
    type: Array,
    default: () => []
  },
  knowledgeSpotlight: {
    type: Object,
    default: () => ({
      eyebrow: "",
      title: "知识点学习",
      summary: "",
      primaryValue: "0",
      primaryLabel: "",
      secondaryValue: "0",
      secondaryLabel: "",
      gradeEntries: [],
      highlights: [],
      chips: [],
      queueTitle: "",
      isLoading: false
    })
  },
  wrongBookSpotlight: {
    type: Object,
    default: () => ({
      eyebrow: "",
      title: "错题温习",
      summary: "",
      primaryValue: "0",
      primaryLabel: "",
      secondaryValue: "0",
      secondaryLabel: "",
      chips: []
    })
  },
  welcomePanel: {
    type: Object,
    default: () => ({
      eyebrow: "欢迎回来",
      title: "今天想去哪座岛看看？",
      profileChip: "",
      themeTone: "morning"
    })
  }
});

const emit = defineEmits([
  "start-challenge",
  "start-grade-practice",
  "start-subject-practice",
  "start-free-practice",
  "open-knowledge-study",
  "open-wrong-review",
  "start-weak-point-practice"
]);

const semesterEnabledGrades = new Set(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);

const shouldShowChallengeSemester = computed(() => semesterEnabledGrades.has(challengeGrade.value));
const shouldShowGradePracticeSemester = computed(() => semesterEnabledGrades.has(gradePracticeGrade.value));
const shouldShowSubjectPracticeSemester = computed(() => semesterEnabledGrades.has(subjectPracticeGrade.value));
const challengeSelectionLabel = computed(() =>
  shouldShowChallengeSemester.value ? `${challengeGrade.value} · ${challengeSemester.value}` : challengeGrade.value
);
const challengeTileMeta = computed(() =>
  props.challengeRouteTitle ? `${challengeSelectionLabel.value} · ${props.challengeRouteTitle}` : challengeSelectionLabel.value
);
const challengeTileHint = computed(() =>
  props.challengeStageShortLabel ? `从 ${props.challengeStageShortLabel} 继续` : "从主线闯关开始"
);
const gradeSelectionLabel = computed(() =>
  shouldShowGradePracticeSemester.value ? `${gradePracticeGrade.value} · ${gradePracticeSemester.value}` : gradePracticeGrade.value
);
const subjectSelectionLabel = computed(() => {
  const segments = [subjectPracticeSubject.value, subjectPracticeGrade.value];

  if (shouldShowSubjectPracticeSemester.value) {
    segments.push(subjectPracticeSemester.value);
  }

  return segments.join(" · ");
});
const isWeakPointPickerOpen = ref(false);
// 专项强化目录目前只铺了二年级，默认落在这个年级，避免家长先看到空列表。
const weakPointDefaultGrade = "二年级";
const weakPointCount = Object.values(STUDY_WEAK_POINT_LIBRARY[weakPointDefaultGrade] || {}).reduce(
  (total, entries) => total + entries.length,
  0
);
const knowledgeOverviewText = computed(() => {
  const segments = [];

  if (props.knowledgeSpotlight.primaryLabel) {
    segments.push(`${props.knowledgeSpotlight.primaryValue} ${props.knowledgeSpotlight.primaryLabel}`);
  }

  if (props.knowledgeSpotlight.secondaryLabel) {
    segments.push(`${props.knowledgeSpotlight.secondaryValue} ${props.knowledgeSpotlight.secondaryLabel}`);
  }

  return segments.join(" · ");
});

// 有学习历史时，卡片直接续学；没有历史则进讲堂大厅
const knowledgeActionText = computed(() =>
  props.knowledgeSpotlight.resume
    ? `从「${props.knowledgeSpotlight.resume.lessonTitle}」继续`
    : "先看动画讲解，再做这一站的题"
);

function handleKnowledgeCardClick() {
  if (props.knowledgeSpotlight.isLoading) {
    return;
  }

  // 进入讲堂大厅：整册地图会自动展开，从地图上的“继续上次”按钮续学
  emit("open-knowledge-study");
}

const wrongBookOverviewText = computed(() => {
  const segments = [];

  if (props.wrongBookSpotlight.primaryLabel) {
    segments.push(`${props.wrongBookSpotlight.primaryValue} ${props.wrongBookSpotlight.primaryLabel}`);
  }

  if (props.wrongBookSpotlight.secondaryLabel) {
    segments.push(`${props.wrongBookSpotlight.secondaryValue} ${props.wrongBookSpotlight.secondaryLabel}`);
  }

  return segments.join(" · ");
});

function handleWeakPointPractice(payload) {
  emit("start-weak-point-practice", payload);
}

function openChallengePicker() {
  emit("start-challenge");
}

function openGradePicker() {
  emit("start-grade-practice");
}

function openSubjectPicker() {
  emit("start-subject-practice");
}
</script>

<template>
  <section class="mode-board">
    <HomeWelcomePanel
      :eyebrow="props.welcomePanel.eyebrow"
      :title="props.welcomePanel.title"
      :profile-chip="props.welcomePanel.profileChip"
      :theme-tone="props.welcomePanel.themeTone"
    />

    <header class="mode-board__group-head">
      <h2 class="mode-board__group-title">答题闯关</h2>
    </header>

    <div class="mode-board__grid">
      <button
        class="mode-tile mode-tile--challenge"
        type="button"
        :aria-label="challengeCurrentStageLabel ? `火山闯关，${challengeTileMeta}，${challengeCurrentStageLabel}` : `火山闯关，${challengeTileMeta}`"
        :title="challengeCurrentStageLabel ? `${challengeTileMeta} · ${challengeCurrentStageLabel}` : challengeTileMeta"
        @click="openChallengePicker"
      >
        <span class="mode-tile__art" aria-hidden="true">
          <span class="mode-tile__halo"></span>
          <span class="mode-tile__emoji">🌋</span>
        </span>
        <div class="mode-tile__copy mode-tile__copy--challenge">
          <span class="mode-tile__badge">主线任务</span>
          <span class="mode-tile__title">火山闯关</span>
          <span class="mode-tile__hint mode-tile__hint--challenge">{{ challengeTileHint }}</span>
        </div>
        <span class="mode-tile__enter" aria-hidden="true"></span>
      </button>

      <article class="practice-entry">
        <div class="practice-entry__copy">
          <div class="practice-entry__head">
            <span class="practice-entry__title">开始练习</span>
          </div>

          <div class="practice-entry__options">
            <button
              class="practice-entry__option"
              type="button"
              :aria-label="`按年级练，当前 ${gradeSelectionLabel}`"
              @click="openGradePicker"
            >
              <span class="practice-entry__option-label">按年级练</span>
              <span class="practice-entry__option-meta">{{ gradeSelectionLabel }}</span>
            </button>

            <button
              class="practice-entry__option"
              type="button"
              :aria-label="`按学科练，当前 ${subjectSelectionLabel}`"
              @click="openSubjectPicker"
            >
              <span class="practice-entry__option-label">按学科练</span>
              <span class="practice-entry__option-meta">{{ subjectSelectionLabel }}</span>
            </button>

            <button
              class="practice-entry__option"
              type="button"
              aria-label="随便练，不限制年级和学科"
              @click="$emit('start-free-practice')"
            >
              <span class="practice-entry__option-label">随便练</span>
              <span class="practice-entry__option-meta">不限年级学科</span>
            </button>
          </div>
        </div>

        <span class="practice-entry__art" aria-hidden="true">
          <span class="practice-entry__halo"></span>
          <span class="practice-entry__emoji">🎒</span>
        </span>
      </article>
    </div>

    <header class="mode-board__group-head mode-board__group-head--study">
      <h2 class="mode-board__group-title">学习与复习</h2>
    </header>

    <div class="mode-board__spotlights">
      <button class="mode-spotlight mode-spotlight--knowledge mode-spotlight--entry" type="button" @click="handleKnowledgeCardClick">
        <div class="mode-spotlight__copy">
          <div class="mode-spotlight__head">
            <div class="mode-spotlight__headline">
              <strong class="mode-spotlight__title">{{ props.knowledgeSpotlight.title }}</strong>
              <span class="mode-spotlight__action">{{ knowledgeActionText }}</span>
              <span v-if="knowledgeOverviewText" class="mode-spotlight__overview">{{ knowledgeOverviewText }}</span>
            </div>
          </div>
        </div>

        <span class="mode-spotlight__art mode-spotlight__art--knowledge" aria-hidden="true">
          <span class="mode-spotlight__halo"></span>
          <span class="mode-spotlight__emoji">📚</span>
        </span>
      </button>

      <button class="mode-spotlight mode-spotlight--review mode-spotlight--entry" type="button" @click="$emit('open-wrong-review')">
        <div class="mode-spotlight__copy">
          <div class="mode-spotlight__head">
            <div class="mode-spotlight__headline">
              <strong class="mode-spotlight__title">{{ props.wrongBookSpotlight.title }}</strong>
              <span class="mode-spotlight__action">重做错的题，到期会提醒复习</span>
              <span v-if="wrongBookOverviewText" class="mode-spotlight__overview">{{ wrongBookOverviewText }}</span>
            </div>
          </div>
        </div>

        <span class="mode-spotlight__art mode-spotlight__art--review" aria-hidden="true">
          <span class="mode-spotlight__halo"></span>
          <span class="mode-spotlight__emoji">📝</span>
        </span>
      </button>

      <button class="mode-spotlight mode-spotlight--weak-point mode-spotlight--entry" type="button" @click="isWeakPointPickerOpen = true">
        <div class="mode-spotlight__copy">
          <div class="mode-spotlight__head">
            <div class="mode-spotlight__headline">
              <strong class="mode-spotlight__title">专项强化</strong>
              <span class="mode-spotlight__action">只练老师指出的那一个薄弱点</span>
              <span class="mode-spotlight__overview">二年级 · 数学语文共 {{ weakPointCount }} 个知识点</span>
            </div>
          </div>
        </div>

        <span class="mode-spotlight__art mode-spotlight__art--weak-point" aria-hidden="true">
          <span class="mode-spotlight__halo"></span>
          <span class="mode-spotlight__emoji">🎯</span>
        </span>
      </button>
    </div>
  </section>

  <WeakPointPickerDialog
    v-model="isWeakPointPickerOpen"
    :default-grade="weakPointDefaultGrade"
    @start-practice="handleWeakPointPractice"
  />
</template>

<style scoped>
:deep(.weak-point-modal) {
  width: min(760px, 100%);
}

:deep(.weak-point-modal) {
  width: min(760px, 100%);
}

/* 三张学习入口卡（讲堂 / 错题 / 专项强化）在宽屏下并排，
   窄屏退化成两列再退成一列。 */
@media (max-width: 1180px) {
  .mode-board__spotlights {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.mode-board {
  display: grid;
  /* 撑满导航以下的视口高度，剩余空间均匀变为区块间距 */
  min-height: calc(100dvh - 120px);
  gap: 14px;
  align-content: space-evenly;
}

.mode-board__grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
  perspective: 1200px;
}

/* 分组标题：把“答题闯关”和“学习与复习”分成两个视觉区块，
   让家长一眼看出这是两类不同性质的事。 */
.mode-board__group-head {
  display: grid;
  gap: 3px;
  margin: 2px 0 0;
}

.mode-board__group-head--study {
  margin-top: 8px;
}

.mode-board__group-title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.3rem;
  line-height: 1.2;
}

.mode-board__spotlights {
  display: grid;
  gap: 12px;
  margin-top: 0;
  align-items: start;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mode-tile {
  --tile-accent: rgba(255, 216, 102, 1);
  --tile-accent-strong: rgba(255, 174, 0, 0.9);
  --tile-surface: rgba(255, 253, 248, 0.96);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  appearance: none;
  width: 100%;
  min-height: clamp(230px, 26vh, 330px);
  padding: 24px;
  border: 2px solid rgba(36, 50, 74, 0.14);
  border-radius: 30px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.96) 0%, var(--tile-surface) 100%);
  box-shadow:
    0px 6px 0px color-mix(in srgb, var(--tile-accent-strong) 24%, rgba(36, 50, 74, 0.12)),
    0px 16px 32px -16px rgba(36, 50, 74, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  display: grid;
  align-items: center;
  transition:
    transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 200ms ease,
    background-color 200ms ease,
    box-shadow 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
    color 200ms ease,
    filter 200ms ease;
}

.mode-tile:hover,
.mode-tile:focus-visible {
  transform: translateY(-4px);
  border-color: rgba(36, 50, 74, 0.2);
  box-shadow:
    0px 10px 0px color-mix(in srgb, var(--tile-accent-strong) 28%, rgba(36, 50, 74, 0.16)),
    0px 24px 36px -16px rgba(36, 50, 74, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.mode-tile:active {
  transform: translateY(4px);
  box-shadow:
    0px 2px 0px color-mix(in srgb, var(--tile-accent-strong) 24%, rgba(36, 50, 74, 0.12)),
    0px 4px 8px -4px rgba(36, 50, 74, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

/* 火山闯关和开始练习在宽屏并排（7/5 分栏），避免两张全宽卡把首页撑出一屏。 */
.mode-tile--challenge {
  grid-column: span 7;
}

/* 合并后的练习入口：一个模块，三种进入方式。
   原先森林/矿洞/海滩三张卡走的是同一条代码路径，只是预填条件不同，
   并排放在首页只会互相稀释，所以收成一张卡 + 三个直达按钮。
   宽屏与火山闯关并排成窄卡，插画退成右上角的小装饰。 */
.practice-entry {
  grid-column: span 5;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-content: center;
  padding: 20px 22px;
  border: 2px solid rgba(36, 50, 74, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.28) 0%, rgba(184, 242, 223, 0) 40%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.96) 0%, rgba(244, 252, 250, 0.92) 100%);
  box-shadow:
    0px 5px 0px rgba(36, 50, 74, 0.06),
    0px 14px 28px -18px rgba(36, 50, 74, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.practice-entry__copy {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.practice-entry__head {
  display: grid;
  gap: 5px;
}

.practice-entry__title {
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.6rem, 2.8vw, 2.1rem);
  line-height: 1.05;
}

.practice-entry__options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.practice-entry__option {
  display: grid;
  gap: 3px;
  align-content: center;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 58px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  transition:
    transform 170ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 170ms ease,
    box-shadow 170ms ease;
}

.practice-entry__option:hover,
.practice-entry__option:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(124, 216, 184, 0.52);
  box-shadow: 0 16px 26px -24px rgba(36, 50, 74, 0.36);
}

.practice-entry__option:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(86, 173, 255, 0.18),
    0 16px 26px -24px rgba(36, 50, 74, 0.36);
}

.practice-entry__option-label {
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.2;
}

.practice-entry__option-meta {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.practice-entry__art {
  position: absolute;
  top: 12px;
  right: 18px;
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  pointer-events: none;
}

.practice-entry__halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0.72;
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(160deg, rgba(184, 242, 223, 0.92) 0%, rgba(173, 235, 255, 0.82) 100%);
}

.practice-entry__emoji {
  position: relative;
  font-size: 1.9rem;
  line-height: 1;
  filter: drop-shadow(0 10px 18px rgba(36, 50, 74, 0.18));
  animation: float-emoji 3.5s ease-in-out infinite;
}

.mode-tile::before,
.mode-tile::after {
  content: "";
  position: absolute;
  inset: auto;
  pointer-events: none;
}

.mode-tile::before {
  top: 16px;
  right: 16px;
  width: 82px;
  height: 82px;
  border-radius: 24px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.12) 100%);
  border: 1px solid rgba(255, 255, 255, 0.56);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.74);
  transform: rotate(16deg);
  opacity: 0.7;
}

.mode-tile::after {
  left: -18%;
  right: -18%;
  bottom: -30%;
  height: 54%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0) 72%);
  opacity: 0.72;
}

.mode-tile--challenge {
  --tile-accent: rgba(255, 120, 80, 1);
  --tile-accent-strong: rgba(230, 50, 20, 0.94);
  --tile-surface: rgba(255, 242, 235, 0.96);
  background:
    radial-gradient(circle at top right, rgba(255, 180, 150, 0.46) 0%, rgba(255, 180, 150, 0) 42%),
    linear-gradient(180deg, rgba(255, 244, 235, 0.98) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.mode-tile__copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  width: 100%;
  max-width: calc(100% - 160px);
  min-width: 0;
}

.mode-tile__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: color-mix(in srgb, var(--tile-accent-strong) 72%, var(--color-ink));
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.mode-tile__art {
  position: absolute;
  inset: 20px 20px auto auto;
  width: 110px;
  height: 110px;
  pointer-events: none;
}

.mode-tile__halo,
.mode-tile__emoji {
  position: absolute;
  top: 24px;
  right: 28px;
  font-size: 3.6rem;
  filter: drop-shadow(0 12px 24px rgba(36, 50, 74, 0.16));
  transition: transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  user-select: none;
}

.mode-tile--challenge .mode-tile__emoji {
  animation: float-emoji 3.8s ease-in-out infinite;
}

@keyframes float-emoji {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-6px) rotate(3deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
}

.mode-tile__enter {
  position: absolute;
  display: block;
}

.mode-tile__halo {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tile-accent) 42%, white) 0%, rgba(255, 255, 255, 0) 70%);
  filter: blur(4px);
  opacity: 0.8;
  pointer-events: none;
}

.mode-tile__enter {
  right: 22px;
  bottom: 22px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, color-mix(in srgb, var(--tile-accent) 42%, white) 100%);
  box-shadow:
    0 16px 24px -20px rgba(36, 50, 74, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.mode-tile__enter::before,
.mode-tile__enter::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 2.5px;
  border-radius: 999px;
  background: var(--color-ink);
  transform-origin: calc(100% - 1px) 50%;
}

.mode-tile__enter::before {
  transform: translate(-50%, -50%) rotate(40deg);
}

.mode-tile__enter::after {
  transform: translate(-50%, -50%) rotate(-40deg);
}

.mode-tile__title {
  margin: 0;
  display: block;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.02;
  width: fit-content;
  max-width: 100%;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  text-shadow: 0 8px 24px rgba(255, 255, 255, 0.36);
}

/* 当前筛选是辅助信息，比功能说明弱一层，不抢注意力。 */
.mode-tile__hint {
  color: color-mix(in srgb, var(--color-ink-soft) 90%, white);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  max-width: 30ch;
  opacity: 0.82;
}

.mode-tile:hover {
  transform: translateY(-3px) scale(1.005);
  border-color: color-mix(in srgb, var(--tile-accent-strong) 34%, white);
  box-shadow:
    0 36px 54px -38px rgba(36, 50, 74, 0.4),
    0 18px 26px -26px color-mix(in srgb, var(--tile-accent-strong) 44%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.94);
  filter: saturate(1.04);
}

.mode-tile:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.82);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.mode-tile:hover .mode-tile__emoji,
.mode-tile:focus-visible .mode-tile__emoji {
  animation-play-state: paused !important;
  transform: translateY(-6px) scale(1.1) rotate(8deg);
}

.mode-tile:hover .mode-tile__enter,
.mode-tile:focus-visible .mode-tile__enter {
  transform: translateX(3px);
}

.mode-tile__art,
.mode-tile__enter {
  transition: transform 180ms ease;
}

.mode-spotlight {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 253, 248, 0.82) 100%);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
  box-shadow: 0 16px 28px -30px rgba(36, 50, 74, 0.24);
}

.mode-spotlight--entry {
  appearance: none;
  width: 100%;
  min-height: clamp(160px, 19vh, 240px);
  box-shadow: 0 10px 20px -24px rgba(36, 50, 74, 0.18);
}

/* 讲堂和错题这两张卡原先只有文字，视觉上被上方带插画的模式卡压住。
   这里补上同款插画语言，让学习入口和闯关入口处在同一视觉量级。 */
.mode-spotlight--entry {
  align-items: center;
  gap: 18px;
}

.mode-spotlight__art {
  position: relative;
  display: grid;
  place-items: center;
  width: 108px;
  height: 108px;
  flex-shrink: 0;
  pointer-events: none;
}

.mode-spotlight__halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0.72;
}

.mode-spotlight__emoji {
  position: relative;
  font-size: 3.3rem;
  line-height: 1;
  filter: drop-shadow(0 12px 22px rgba(36, 50, 74, 0.18));
  animation: float-emoji 3.6s ease-in-out infinite;
}

.mode-spotlight__art--knowledge .mode-spotlight__halo {
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(160deg, rgba(184, 242, 223, 0.92) 0%, rgba(173, 235, 255, 0.82) 100%);
}

.mode-spotlight__art--review .mode-spotlight__halo {
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(160deg, rgba(255, 195, 218, 0.86) 0%, rgba(255, 231, 156, 0.84) 100%);
}

.mode-spotlight--weak-point {
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.24), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 253, 248, 0.82) 100%);
}

.mode-spotlight__art--weak-point .mode-spotlight__halo {
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(160deg, rgba(173, 235, 255, 0.9) 0%, rgba(184, 242, 223, 0.84) 100%);
}

.mode-spotlight__art--review .mode-spotlight__emoji {
  animation-delay: 0.7s;
}

.mode-spotlight__art--weak-point .mode-spotlight__emoji {
  animation-delay: 1.2s;
}

.mode-spotlight--panel {
  cursor: default;
}

.mode-spotlight--knowledge.mode-spotlight--panel {
  grid-template-columns: 1fr;
  gap: 0;
}

.mode-spotlight--knowledge {
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.24), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 253, 248, 0.82) 100%);
}

.mode-spotlight--review {
  background:
    radial-gradient(circle at top right, rgba(255, 195, 218, 0.18), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 253, 248, 0.82) 100%);
  align-self: start;
}

.mode-spotlight:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.28);
  box-shadow: 0 18px 30px -30px rgba(36, 50, 74, 0.28);
}

.mode-spotlight--entry:hover {
  box-shadow: 0 14px 24px -28px rgba(36, 50, 74, 0.2);
}

.mode-spotlight--panel:hover {
  transform: none;
  border-color: rgba(36, 50, 74, 0.08);
  box-shadow: 0 16px 28px -30px rgba(36, 50, 74, 0.24);
}

.mode-spotlight:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.78);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.mode-spotlight__copy {
  display: grid;
  gap: 8px;
  align-content: start;
}

.mode-spotlight__head {
  display: grid;
  gap: 4px;
}

.mode-spotlight__headline {
  display: grid;
  gap: 5px;
}

.mode-spotlight__title {
  font-size: clamp(1.35rem, 2.3vw, 1.8rem);
  line-height: 1.1;
}

.mode-spotlight--entry .mode-spotlight__title {
  font-size: clamp(1.18rem, 1.7vw, 1.42rem);
}

/* 功能说明行：回答“点进去做什么”。 */
.mode-spotlight__action {
  color: var(--color-ink);
  font-size: 0.94rem;
  font-weight: 800;
  line-height: 1.4;
}

.mode-spotlight--entry .mode-spotlight__action {
  font-size: 0.9rem;
}

.mode-spotlight__overview {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4;
}

.mode-spotlight--entry .mode-spotlight__overview {
  font-size: 0.76rem;
}

.mode-spotlight__subhead {
  color: var(--color-ink);
  font-size: 0.85rem;
  font-weight: 800;
}

.mode-spotlight__queue {
  display: grid;
  gap: 10px;
}

.mode-spotlight__queue-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 12px 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.mode-spotlight__queue-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.mode-spotlight__queue-title {
  color: var(--color-ink);
  font-size: 0.92rem;
  line-height: 1.4;
}

.mode-spotlight__queue-meta {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  line-height: 1.4;
}

.mode-spotlight__queue-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  white-space: nowrap;
}

.mode-spotlight__queue-badge--alert {
  background: rgba(255, 214, 179, 0.54);
  color: var(--color-ink);
}

.mode-spotlight__queue-badge--calm {
  background: rgba(184, 242, 223, 0.46);
  color: var(--color-ink);
}

.mode-spotlight__queue-badge--planned {
  background: rgba(219, 234, 254, 0.7);
  color: var(--color-ink);
}

.mode-spotlight__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-spotlight__chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--color-ink-soft);
  font-size: 0.8rem;
}

.mode-spotlight__stats {
  display: grid;
  gap: 10px;
  min-width: 112px;
  align-content: start;
}

.mode-spotlight__stat {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.mode-spotlight__stat-value {
  font-size: 1.25rem;
}

.mode-spotlight__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
}

.mode-spotlight__cta:focus-visible {
  outline: none;
  box-shadow:
    0 18px 24px -24px rgba(36, 50, 74, 0.34),
    0 0 0 3px rgba(86, 173, 255, 0.18);
}

@media (max-width: 1040px) {
  .mode-board__grid {
    grid-template-columns: 1fr;
  }

  .mode-tile--challenge {
    grid-column: auto;
    min-height: 188px;
  }

  .practice-entry {
    grid-column: auto;
  }

  .mode-board__spotlights {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .mode-board {
    min-height: auto;
  }

  .mode-tile {
    min-height: 178px;
    padding: 18px;
    border-radius: 24px;
  }

  .practice-entry {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 18px;
    border-radius: 24px;
  }

  .practice-entry__options {
    flex-direction: column;
  }

  .practice-entry__option {
    width: 100%;
    min-width: 0;
  }

  /* 小屏卡片较窄，右上角装饰容易压到文字，直接隐藏 */
  .practice-entry__art {
    display: none;
  }

  .mode-tile__art {
    width: 96px;
    height: 96px;
    inset: 16px 16px auto auto;
  }

  .mode-tile__halo {
    width: 74px;
    height: 74px;
  }

  .mode-tile__title {
    font-size: clamp(1.8rem, 8vw, 2.45rem);
  }

  .mode-tile--challenge .mode-tile__title {
    font-size: clamp(1.8rem, 8vw, 2.45rem);
  }

  .mode-tile__copy {
    max-width: calc(100% - 112px);
  }

  .mode-tile__hint {
    font-size: 0.78rem;
    max-width: 22ch;
  }

  .mode-spotlight {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 14px;
    border-radius: 22px;
  }

  /* 单列时插画会另起一行占高度，小屏直接隐藏，只留文字入口 */
  .mode-spotlight__art {
    display: none;
  }

  .mode-spotlight__head {
    gap: 6px;
  }

  .mode-spotlight__queue-item {
    align-items: flex-start;
  }

  .mode-spotlight__stats {
    grid-template-columns: 1fr 1fr;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-tile,
  .mode-tile:hover,
  .practice-entry__option,
  .practice-entry__option:hover {
    transition: none;
    transform: none;
    filter: none;
  }

  .mode-tile__art,
  .mode-tile__enter,
  .mode-spotlight,
  .mode-spotlight:hover,
  .mode-tile:hover .mode-tile__art,
  .mode-tile:focus-visible .mode-tile__art,
  .mode-tile:hover .mode-tile__enter,
  .mode-tile:focus-visible .mode-tile__enter,
  .practice-entry__emoji {
    transition: none;
    transform: none;
    animation: none;
  }
}
</style>
