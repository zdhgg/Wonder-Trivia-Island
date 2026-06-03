<script setup>
import { computed, ref, watch } from "vue";
import HomeWelcomePanel from "../components/HomeWelcomePanel.vue";
import ModalDialog from "../components/ModalDialog.vue";

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
      title: "欢迎来到奇妙知识岛",
      summary: "学习档案已准备好。今天想从哪一站开始？",
      profileChip: "",
      mascotStatus: "idle",
      themeTone: "morning",
      showVoiceButton: false,
      voiceButtonLabel: "听猫头鹰说",
      voiceStatus: "idle",
      voiceErrorMessage: ""
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
  "play-welcome-voice"
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
  props.challengeCurrentStageLabel ? `从 ${props.challengeCurrentStageLabel} 继续` : "从主线闯关开始"
);
const gradeSelectionLabel = computed(() =>
  shouldShowGradePracticeSemester.value ? `${gradePracticeGrade.value} · ${gradePracticeSemester.value}` : gradePracticeGrade.value
);
const gradeTileHint = computed(() =>
  `当前：${gradeSelectionLabel.value} 同步练`
);
const subjectSelectionLabel = computed(() => {
  const segments = [subjectPracticeSubject.value, subjectPracticeGrade.value];

  if (shouldShowSubjectPracticeSemester.value) {
    segments.push(subjectPracticeSemester.value);
  }

  return segments.join(" · ");
});
const subjectTileHint = computed(() =>
  `当前：${subjectSelectionLabel.value} 专项练`
);
const freeTileHint = "不设路线，直接开练";
const isKnowledgePickerOpen = ref(false);
const activeKnowledgeGradeId = ref("");

const defaultKnowledgeGradeId = computed(() => {
  const gradeEntries = props.knowledgeSpotlight.gradeEntries || [];
  const gradeWithPreview = gradeEntries.find((grade) => grade.previewHighlights?.length);
  return gradeWithPreview?.id || gradeEntries[0]?.id || "";
});

const activeKnowledgeGradeEntry = computed(() => {
  const gradeEntries = props.knowledgeSpotlight.gradeEntries || [];
  return gradeEntries.find((grade) => grade.id === activeKnowledgeGradeId.value) || gradeEntries[0] || null;
});

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

const knowledgePickerDescription = computed(() =>
  props.knowledgeSpotlight.isLoading
    ? "知识路线加载中，即将就绪。"
    : props.knowledgeSpotlight.gradeEntries?.length
      ? "先选年级，再进入路线。"
      : "知识路线准备中。"
);

const activeKnowledgeFocusThemeClass = computed(() =>
  `knowledge-picker__focus--${activeKnowledgeGradeEntry.value?.theme || "library"}`
);

const activeKnowledgeRouteName = computed(() => activeKnowledgeGradeEntry.value?.coverLabel || "");

const activeKnowledgeRouteGlyph = computed(() => activeKnowledgeGradeEntry.value?.glyph || "");

const activeKnowledgeRouteSummary = computed(() => {
  const activeGrade = activeKnowledgeGradeEntry.value;

  if (!activeGrade) {
    return "";
  }

  return activeGrade.tagline || activeGrade.note || "";
});

const activeKnowledgeActionLabel = computed(() =>
  props.knowledgeSpotlight.isLoading
    ? "正在加载"
    : activeKnowledgeGradeEntry.value?.label
      ? `进入${activeKnowledgeGradeEntry.value.label}`
      : "进入路线"
);

const knowledgeEntryHint = computed(() =>
  props.knowledgeSpotlight.isLoading ? "路线加载中" : "点击后选择年级"
);
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
const wrongBookEntryHint = computed(() =>
  Number(props.wrongBookSpotlight.primaryValue || 0) > 0 ? "点击后开始今天的温习" : "点击后查看错题本"
);

watch(
  () => props.knowledgeSpotlight.gradeEntries,
  (gradeEntries) => {
    if (!gradeEntries?.length) {
      activeKnowledgeGradeId.value = "";
      return;
    }

    if (!gradeEntries.some((grade) => grade.id === activeKnowledgeGradeId.value)) {
      activeKnowledgeGradeId.value = defaultKnowledgeGradeId.value;
    }
  },
  { immediate: true }
);

function openKnowledgePicker() {
  if (props.knowledgeSpotlight.isLoading) {
    return;
  }

  if (!activeKnowledgeGradeId.value) {
    activeKnowledgeGradeId.value = defaultKnowledgeGradeId.value;
  }

  isKnowledgePickerOpen.value = true;
}

function handleKnowledgePickerConfirm() {
  if (props.knowledgeSpotlight.isLoading) {
    return;
  }

  if (activeKnowledgeGradeEntry.value?.label) {
    emit("open-knowledge-study", { gradeFilter: activeKnowledgeGradeEntry.value.label });
  } else {
    emit("open-knowledge-study");
  }

  isKnowledgePickerOpen.value = false;
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
      :summary="props.welcomePanel.summary"
      :profile-chip="props.welcomePanel.profileChip"
      :mascot-status="props.welcomePanel.mascotStatus"
      :theme-tone="props.welcomePanel.themeTone"
      :show-voice-button="props.welcomePanel.showVoiceButton"
      :voice-button-label="props.welcomePanel.voiceButtonLabel"
      :voice-status="props.welcomePanel.voiceStatus"
      :voice-error-message="props.welcomePanel.voiceErrorMessage"
      @play-voice="$emit('play-welcome-voice')"
    />

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
          <span class="mode-tile__meta">{{ challengeTileMeta }}</span>
        </div>
        <span class="mode-tile__enter" aria-hidden="true"></span>
      </button>

      <button
        class="mode-tile mode-tile--grade"
        type="button"
        :aria-label="`智慧森林，${gradeSelectionLabel}`"
        :title="gradeSelectionLabel"
        @click="openGradePicker"
      >
        <span class="mode-tile__art" aria-hidden="true">
          <span class="mode-tile__halo"></span>
          <span class="mode-tile__emoji">🌲</span>
        </span>
        <div class="mode-tile__copy">
          <span class="mode-tile__title">智慧森林</span>
          <span class="mode-tile__hint">{{ gradeTileHint }}</span>
        </div>
        <span class="mode-tile__enter" aria-hidden="true"></span>
      </button>

      <button
        class="mode-tile mode-tile--subject"
        type="button"
        :aria-label="`宝藏矿洞，${subjectSelectionLabel}`"
        :title="subjectSelectionLabel"
        @click="openSubjectPicker"
      >
        <span class="mode-tile__art" aria-hidden="true">
          <span class="mode-tile__halo"></span>
          <span class="mode-tile__emoji">💎</span>
        </span>
        <div class="mode-tile__copy">
          <span class="mode-tile__title">宝藏矿洞</span>
          <span class="mode-tile__hint">{{ subjectTileHint }}</span>
        </div>
        <span class="mode-tile__enter" aria-hidden="true"></span>
      </button>

      <button class="mode-tile mode-tile--free" type="button" aria-label="漂流海滩" title="漂流海滩" @click="$emit('start-free-practice')">
        <span class="mode-tile__art" aria-hidden="true">
          <span class="mode-tile__halo"></span>
          <span class="mode-tile__emoji">⛵</span>
        </span>
        <div class="mode-tile__copy">
          <span class="mode-tile__title">漂流海滩</span>
          <span class="mode-tile__hint">无拘探索自由练</span>
        </div>
        <span class="mode-tile__enter" aria-hidden="true"></span>
      </button>
    </div>

    <div class="mode-board__spotlights">
      <button class="mode-spotlight mode-spotlight--knowledge mode-spotlight--entry" type="button" @click="openKnowledgePicker">
        <div class="mode-spotlight__copy">
          <div class="mode-spotlight__head">
            <div class="mode-spotlight__headline">
              <span v-if="props.knowledgeSpotlight.eyebrow" class="mode-spotlight__eyebrow">{{ props.knowledgeSpotlight.eyebrow }}</span>
              <strong class="mode-spotlight__title">{{ props.knowledgeSpotlight.title }}</strong>
              <span v-if="knowledgeOverviewText" class="mode-spotlight__overview">{{ knowledgeOverviewText }}</span>
              <p class="mode-spotlight__summary">{{ props.knowledgeSpotlight.summary }}</p>
            </div>
          </div>

          <div class="mode-spotlight__entry-row">
            <span class="mode-spotlight__entry-text">{{ knowledgeEntryHint }}</span>
            <span class="mode-spotlight__inline-cta mode-spotlight__inline-cta--entry" aria-hidden="true">选择年级</span>
          </div>
        </div>
      </button>

      <button class="mode-spotlight mode-spotlight--review mode-spotlight--entry" type="button" @click="$emit('open-wrong-review')">
        <div class="mode-spotlight__copy">
          <div class="mode-spotlight__head">
            <div class="mode-spotlight__headline">
              <span v-if="props.wrongBookSpotlight.eyebrow" class="mode-spotlight__eyebrow">{{ props.wrongBookSpotlight.eyebrow }}</span>
              <strong class="mode-spotlight__title">{{ props.wrongBookSpotlight.title }}</strong>
              <span v-if="wrongBookOverviewText" class="mode-spotlight__overview">{{ wrongBookOverviewText }}</span>
              <p class="mode-spotlight__summary">{{ props.wrongBookSpotlight.summary }}</p>
            </div>
          </div>

          <div class="mode-spotlight__entry-row">
            <span class="mode-spotlight__entry-text">{{ wrongBookEntryHint }}</span>
            <span class="mode-spotlight__inline-cta mode-spotlight__inline-cta--entry" aria-hidden="true">进入温习</span>
          </div>
        </div>
      </button>
    </div>



    <ModalDialog
      v-model="isKnowledgePickerOpen"
      title-id="knowledge-picker-title"
      heading-title="知识小讲堂"
      :heading-description="knowledgePickerDescription"
      close-label="关闭知识小讲堂选择"
      panel-class="knowledge-picker-modal"
      initial-focus-selector="[data-modal-primary]"
    >
      <div class="knowledge-picker">
        <div v-if="props.knowledgeSpotlight.gradeEntries?.length" class="knowledge-picker__section">
          <div class="knowledge-picker__section-head">
            <span class="knowledge-picker__section-title">选择年级</span>
            <span class="knowledge-picker__section-note">进入对应知识路线</span>
          </div>

          <div class="mode-spotlight__grade-grid knowledge-picker__grade-grid">
            <button
              v-for="grade in props.knowledgeSpotlight.gradeEntries"
              :key="`knowledge-picker-${grade.id}`"
              :class="[
                'mode-spotlight__grade-button',
                'knowledge-picker__grade-button',
                { 'mode-spotlight__grade-button--active': grade.id === activeKnowledgeGradeId },
                `mode-spotlight__grade-button--${grade.theme || 'library'}`
              ]"
              type="button"
              :aria-pressed="grade.id === activeKnowledgeGradeId"
              :data-modal-primary="grade.id === activeKnowledgeGradeId ? 'true' : null"
              @click="activeKnowledgeGradeId = grade.id"
            >
              <span class="mode-spotlight__grade-mark" aria-hidden="true">{{ grade.glyph || "书" }}</span>
              <div class="mode-spotlight__grade-copy">
                <div class="mode-spotlight__grade-title-row">
                  <strong class="mode-spotlight__grade-title">{{ grade.label }}</strong>
                  <span class="mode-spotlight__grade-meta">{{ grade.meta }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div v-if="activeKnowledgeGradeEntry" :class="['knowledge-picker__focus', activeKnowledgeFocusThemeClass]">
          <div class="knowledge-picker__focus-copy">
            <span class="knowledge-picker__focus-label">准备出发</span>
            <div class="knowledge-picker__focus-title-row">
              <strong class="knowledge-picker__focus-title">{{ activeKnowledgeGradeEntry.label }}</strong>
              <span v-if="activeKnowledgeGradeEntry.meta" class="knowledge-picker__focus-meta">{{ activeKnowledgeGradeEntry.meta }}</span>
            </div>
            <div v-if="activeKnowledgeRouteName" class="knowledge-picker__focus-destination">
              <span v-if="activeKnowledgeRouteGlyph" class="knowledge-picker__focus-glyph" aria-hidden="true">
                {{ activeKnowledgeRouteGlyph }}
              </span>
              <span class="knowledge-picker__focus-destination-text">先去 {{ activeKnowledgeRouteName }}</span>
            </div>
            <p v-if="activeKnowledgeRouteSummary" class="knowledge-picker__focus-summary">{{ activeKnowledgeRouteSummary }}</p>
          </div>
        </div>

        <div class="knowledge-picker__footer">
          <button class="btn-cartoon btn-cartoon--mint knowledge-picker__confirm" type="button" @click="handleKnowledgePickerConfirm">
            {{ activeKnowledgeActionLabel }}
          </button>
        </div>
      </div>
    </ModalDialog>
  </section>
</template>

<style scoped>
:deep(.practice-picker-modal) {
  width: min(640px, 100%);
}

:deep(.knowledge-picker-modal) {
  width: min(680px, 100%);
}

.mode-board {
  display: grid;
  min-height: min(610px, calc(100vh - 220px));
  gap: 12px;
  align-content: start;
}

.mode-board__grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
  perspective: 1200px;
}

.mode-board__spotlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 0;
  align-items: start;
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
  min-height: 220px;
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
  align-items: end;
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

.mode-tile--challenge {
  grid-column: span 12;
  min-height: 240px;
}

.mode-tile--grade {
  grid-column: span 5;
  min-height: 176px;
  padding: 20px;
  border-radius: 24px;
}

.mode-tile--subject {
  grid-column: span 4;
  min-height: 176px;
  padding: 20px;
  border-radius: 24px;
}

.mode-tile--free {
  grid-column: span 3;
  min-height: 176px;
  padding: 20px;
  border-radius: 24px;
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

.mode-tile--grade {
  --tile-accent: rgba(124, 216, 184, 1);
  --tile-accent-strong: rgba(46, 168, 128, 0.92);
  --tile-surface: rgba(240, 255, 248, 0.96);
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.38) 0%, rgba(184, 242, 223, 0) 42%),
    linear-gradient(180deg, rgba(244, 255, 250, 0.98) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.mode-tile--subject {
  --tile-accent: rgba(180, 160, 255, 1);
  --tile-accent-strong: rgba(120, 90, 240, 0.92);
  --tile-surface: rgba(248, 245, 255, 0.96);
  background:
    radial-gradient(circle at top right, rgba(210, 200, 255, 0.34) 0%, rgba(210, 200, 255, 0) 42%),
    linear-gradient(180deg, rgba(250, 247, 255, 0.98) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.mode-tile--free {
  --tile-accent: rgba(120, 210, 255, 1);
  --tile-accent-strong: rgba(40, 150, 220, 0.9);
  --tile-surface: rgba(242, 250, 255, 0.96);
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.36) 0%, rgba(173, 235, 255, 0) 42%),
    linear-gradient(180deg, rgba(245, 251, 255, 0.98) 0%, rgba(255, 255, 255, 0.9) 100%);
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

.mode-tile--grade .mode-tile__emoji,
.mode-tile--subject .mode-tile__emoji,
.mode-tile--free .mode-tile__emoji {
  top: 18px;
  right: 20px;
  font-size: 2.8rem;
}

.mode-tile--challenge .mode-tile__emoji {
  animation: float-emoji 3.8s ease-in-out infinite;
}

.mode-tile--grade .mode-tile__emoji {
  animation: float-emoji 3.4s ease-in-out infinite 0.3s;
}

.mode-tile--subject .mode-tile__emoji {
  animation: float-emoji 3.6s ease-in-out infinite 0.6s;
}

.mode-tile--free .mode-tile__emoji {
  animation: float-emoji 4.0s ease-in-out infinite 0.9s;
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

.mode-tile__hint {
  color: color-mix(in srgb, var(--color-ink-soft) 90%, white);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.35;
  max-width: 30ch;
}

.mode-tile--challenge .mode-tile__copy {
  gap: 8px;
  max-width: calc(100% - 176px);
}

.mode-tile--challenge .mode-tile__hint {
  max-width: 34ch;
}

.mode-tile--grade .mode-tile__title,
.mode-tile--subject .mode-tile__title,
.mode-tile--free .mode-tile__title {
  font-size: clamp(1.45rem, 2vw, 2rem);
}

.mode-tile--grade .mode-tile__copy,
.mode-tile--subject .mode-tile__copy,
.mode-tile--free .mode-tile__copy {
  gap: 4px;
  max-width: calc(100% - 104px);
}

.mode-tile--grade .mode-tile__hint,
.mode-tile--subject .mode-tile__hint,
.mode-tile--free .mode-tile__hint {
  font-size: 0.76rem;
  max-width: 20ch;
}

.mode-tile__meta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  line-height: 1.35;
  max-width: min(100%, 36ch);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
}

.mode-tile__meta::before {
  content: "当前路线";
  margin-right: 8px;
  padding-right: 8px;
  border-right: 1px solid rgba(36, 50, 74, 0.12);
  color: color-mix(in srgb, var(--color-ink-soft) 82%, white);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.03em;
  flex: none;
}

.mode-tile--grade .mode-tile__art,
.mode-tile--subject .mode-tile__art,
.mode-tile--free .mode-tile__art {
  inset: 16px 16px auto auto;
  width: 84px;
  height: 84px;
}

.mode-tile--grade .mode-tile__halo,
.mode-tile--subject .mode-tile__halo,
.mode-tile--free .mode-tile__halo {
  width: 76px;
  height: 76px;
  top: -6px;
  right: -6px;
}

.mode-tile--grade .mode-tile__enter,
.mode-tile--subject .mode-tile__enter,
.mode-tile--free .mode-tile__enter {
  right: 18px;
  bottom: 18px;
  width: 34px;
  height: 34px;
}

.practice-picker {
  display: grid;
  gap: 14px;
}

.practice-picker__group {
  display: grid;
}

.practice-picker__choices {
  display: grid;
  gap: 10px;
}

.practice-picker__choices--grades {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.practice-picker__choices--subjects {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.practice-picker__choices--compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.practice-picker__choice {
  min-height: 48px;
  padding: 10px 12px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink-soft);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.practice-picker__choice:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.44);
  color: var(--color-ink);
}

.practice-picker__choice:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.78);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.practice-picker__choice--active {
  border-color: rgba(124, 216, 184, 0.84);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.96) 0%, rgba(255, 255, 255, 0.9) 100%);
  color: var(--color-ink);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.38);
}

.practice-picker__footer {
  display: grid;
  margin-top: 4px;
}

.practice-picker__confirm {
  width: 100%;
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
  min-height: 0;
  box-shadow: 0 10px 20px -24px rgba(36, 50, 74, 0.18);
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

.mode-spotlight__eyebrow {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mode-spotlight__title {
  font-size: clamp(1.35rem, 2.3vw, 1.8rem);
  line-height: 1.1;
}

.mode-spotlight--entry .mode-spotlight__title {
  font-size: clamp(1.18rem, 1.7vw, 1.42rem);
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

.mode-spotlight__summary {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.92rem;
  line-height: 1.4;
  max-width: 40ch;
}

.mode-spotlight--entry .mode-spotlight__summary {
  font-size: 0.86rem;
  max-width: 34ch;
}

.mode-spotlight__entry-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 10px;
  padding-top: 4px;
}

.mode-spotlight--entry .mode-spotlight__entry-row {
  padding-top: 6px;
  border-top: 1px solid rgba(36, 50, 74, 0.06);
}

.mode-spotlight__entry-text {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4;
}

.mode-spotlight--entry .mode-spotlight__entry-text {
  font-size: 0.78rem;
}

.mode-spotlight__subhead {
  color: var(--color-ink);
  font-size: 0.85rem;
  font-weight: 800;
}

.mode-spotlight__grade-section {
  display: grid;
  gap: 10px;
}

.mode-spotlight__grade-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mode-spotlight__grade-button {
  --grade-accent: rgba(86, 173, 255, 0.88);
  --grade-wash: rgba(219, 234, 254, 0.22);
  --grade-ring: rgba(86, 173, 255, 0.14);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 12px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, var(--grade-wash) 0%, transparent 48%),
    rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease,
    background 160ms ease;
}

.mode-spotlight__grade-button:hover {
  border-color: color-mix(in srgb, var(--grade-accent) 36%, rgba(36, 50, 74, 0.16));
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--grade-wash) 118%, white) 0%, transparent 50%),
    rgba(255, 255, 255, 0.94);
}

.mode-spotlight__grade-button--active {
  border-color: color-mix(in srgb, var(--grade-accent) 58%, rgba(36, 50, 74, 0.14));
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--grade-wash) 138%, white) 0%, transparent 52%),
    rgba(255, 255, 255, 0.96);
  box-shadow:
    0 0 0 3px var(--grade-ring),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.mode-spotlight__grade-button:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--grade-accent) 74%, rgba(36, 50, 74, 0.12));
  box-shadow: 0 0 0 3px var(--grade-ring);
}

.mode-spotlight__grade-button--sprout {
  --grade-accent: rgba(86, 189, 138, 0.9);
  --grade-wash: rgba(184, 242, 223, 0.26);
  --grade-ring: rgba(86, 189, 138, 0.14);
}

.mode-spotlight__grade-button--bridge {
  --grade-accent: rgba(92, 168, 234, 0.9);
  --grade-wash: rgba(173, 235, 255, 0.24);
  --grade-ring: rgba(92, 168, 234, 0.14);
}

.mode-spotlight__grade-button--voyage {
  --grade-accent: rgba(243, 162, 92, 0.92);
  --grade-wash: rgba(255, 214, 179, 0.24);
  --grade-ring: rgba(243, 162, 92, 0.14);
}

.mode-spotlight__grade-button--summit {
  --grade-accent: rgba(132, 141, 241, 0.9);
  --grade-wash: rgba(217, 223, 255, 0.28);
  --grade-ring: rgba(132, 141, 241, 0.14);
}

.mode-spotlight__grade-button--tower {
  --grade-accent: rgba(220, 118, 146, 0.9);
  --grade-wash: rgba(255, 220, 229, 0.28);
  --grade-ring: rgba(220, 118, 146, 0.14);
}

.mode-spotlight__grade-button--starport {
  --grade-accent: rgba(106, 170, 236, 0.92);
  --grade-wash: rgba(204, 231, 255, 0.3);
  --grade-ring: rgba(106, 170, 236, 0.16);
}

.mode-spotlight__grade-button--library {
  --grade-accent: rgba(123, 154, 255, 0.88);
  --grade-wash: rgba(219, 234, 254, 0.24);
  --grade-ring: rgba(123, 154, 255, 0.14);
}

.mode-spotlight__grade-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, color-mix(in srgb, var(--grade-wash) 150%, white) 100%);
  border: 1px solid color-mix(in srgb, var(--grade-accent) 22%, rgba(36, 50, 74, 0.06));
  color: color-mix(in srgb, var(--grade-accent) 72%, var(--color-ink));
  font-size: 0.92rem;
  font-weight: 900;
  line-height: 1;
}

.mode-spotlight__grade-copy {
  display: block;
  min-width: 0;
}

.mode-spotlight__grade-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 10px;
}

.mode-spotlight__grade-title {
  color: var(--color-ink);
  font-size: 1rem;
  line-height: 1.2;
}

.mode-spotlight__grade-meta {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  line-height: 1.3;
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

.mode-spotlight__inline-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid rgba(86, 173, 255, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--color-ink);
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
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

.mode-spotlight__inline-cta:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.34);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 22px -24px rgba(36, 50, 74, 0.24);
  filter: none;
}

.mode-spotlight__inline-cta--entry {
  pointer-events: none;
  background: rgba(255, 255, 255, 0.66);
}

.mode-spotlight__cta:focus-visible {
  outline: none;
  box-shadow:
    0 18px 24px -24px rgba(36, 50, 74, 0.34),
    0 0 0 3px rgba(86, 173, 255, 0.18);
}

.mode-spotlight__inline-cta:focus-visible {
  outline: none;
  box-shadow:
    0 18px 24px -24px rgba(36, 50, 74, 0.34),
    0 0 0 3px rgba(86, 173, 255, 0.18);
}

.knowledge-picker {
  display: grid;
  gap: 16px;
}

.knowledge-picker__section {
  display: grid;
  gap: 10px;
}

.knowledge-picker__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 10px;
}

.knowledge-picker__section-title {
  color: var(--color-ink);
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.4;
}

.knowledge-picker__section-note {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.4;
}

.knowledge-picker__grade-button {
  min-height: 68px;
}

.knowledge-picker__focus {
  --focus-accent: rgba(123, 154, 255, 0.9);
  --focus-wash: rgba(219, 234, 254, 0.24);
  --focus-chip: rgba(244, 248, 255, 0.96);
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, var(--focus-wash), transparent 44%),
    rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.knowledge-picker__focus--sprout {
  --focus-accent: rgba(86, 189, 138, 0.92);
  --focus-wash: rgba(184, 242, 223, 0.28);
  --focus-chip: rgba(242, 255, 248, 0.96);
}

.knowledge-picker__focus--bridge {
  --focus-accent: rgba(92, 168, 234, 0.92);
  --focus-wash: rgba(173, 235, 255, 0.26);
  --focus-chip: rgba(243, 250, 255, 0.96);
}

.knowledge-picker__focus--voyage {
  --focus-accent: rgba(243, 162, 92, 0.92);
  --focus-wash: rgba(255, 214, 179, 0.28);
  --focus-chip: rgba(255, 248, 243, 0.96);
}

.knowledge-picker__focus--summit {
  --focus-accent: rgba(132, 141, 241, 0.92);
  --focus-wash: rgba(217, 223, 255, 0.3);
  --focus-chip: rgba(245, 246, 255, 0.96);
}

.knowledge-picker__focus--tower {
  --focus-accent: rgba(220, 118, 146, 0.92);
  --focus-wash: rgba(255, 220, 229, 0.3);
  --focus-chip: rgba(255, 245, 248, 0.96);
}

.knowledge-picker__focus--starport {
  --focus-accent: rgba(106, 170, 236, 0.92);
  --focus-wash: rgba(204, 231, 255, 0.32);
  --focus-chip: rgba(245, 250, 255, 0.96);
}

.knowledge-picker__focus--library {
  --focus-accent: rgba(123, 154, 255, 0.9);
  --focus-wash: rgba(219, 234, 254, 0.24);
  --focus-chip: rgba(244, 248, 255, 0.96);
}

.knowledge-picker__focus-copy {
  display: grid;
  gap: 6px;
}

.knowledge-picker__focus-label {
  color: color-mix(in srgb, var(--focus-accent) 62%, var(--color-ink-soft));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.knowledge-picker__focus-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.knowledge-picker__focus-title {
  color: var(--color-ink);
  font-size: 1.05rem;
  line-height: 1.2;
}

.knowledge-picker__focus-meta {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  line-height: 1.35;
}

.knowledge-picker__focus-destination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  min-height: 34px;
  padding: 5px 10px 5px 6px;
  border: 1px solid color-mix(in srgb, var(--focus-accent) 18%, rgba(36, 50, 74, 0.06));
  border-radius: 999px;
  background: var(--focus-chip);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.knowledge-picker__focus-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--focus-wash) 165%, white);
  color: color-mix(in srgb, var(--focus-accent) 72%, var(--color-ink));
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1;
}

.knowledge-picker__focus-destination-text {
  color: var(--color-ink);
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.35;
}

.knowledge-picker__focus-summary {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  line-height: 1.5;
}

.knowledge-picker__footer {
  display: grid;
}

.knowledge-picker__confirm {
  width: 100%;
}

@media (max-width: 1040px) {
  .mode-board__grid {
    grid-template-columns: 1fr;
  }

  .mode-tile--challenge,
  .mode-tile--grade,
  .mode-tile--subject,
  .mode-tile--free {
    grid-column: auto;
    min-height: 188px;
  }

  .mode-board__spotlights {
    grid-template-columns: 1fr;
  }

  .mode-spotlight__grade-grid {
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

  .mode-tile--challenge,
  .mode-tile--grade,
  .mode-tile--subject,
  .mode-tile--free {
    min-height: 178px;
    padding: 18px;
    border-radius: 24px;
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

  .mode-tile__planet {
    top: 16px;
    right: 14px;
    width: 46px;
    height: 46px;
  }

  .mode-tile__trail {
    top: 28px;
    right: 2px;
    width: 74px;
  }

  .mode-tile__title {
    font-size: clamp(1.8rem, 8vw, 2.45rem);
  }

  .mode-tile--challenge .mode-tile__title,
  .mode-tile--grade .mode-tile__title,
  .mode-tile--subject .mode-tile__title,
  .mode-tile--free .mode-tile__title {
    font-size: clamp(1.8rem, 8vw, 2.45rem);
  }

  .mode-tile__copy {
    max-width: calc(100% - 112px);
  }

  .mode-tile--grade .mode-tile__copy,
  .mode-tile--subject .mode-tile__copy,
  .mode-tile--free .mode-tile__copy {
    max-width: calc(100% - 96px);
  }

  .mode-tile__hint,
  .mode-tile--grade .mode-tile__hint,
  .mode-tile--subject .mode-tile__hint,
  .mode-tile--free .mode-tile__hint {
    font-size: 0.78rem;
    max-width: 22ch;
  }

  .mode-spotlight {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 14px;
    border-radius: 22px;
  }

  .mode-spotlight__head {
    gap: 6px;
  }

  .mode-spotlight__inline-cta {
    width: 100%;
  }

  .mode-spotlight__grade-button {
    min-height: 68px;
    padding: 12px;
  }

  .mode-spotlight__grade-mark {
    width: 34px;
    height: 34px;
  }

  .mode-spotlight__queue-item {
    align-items: flex-start;
  }

  .mode-spotlight__stats {
    grid-template-columns: 1fr 1fr;
    min-width: 0;
  }

  .practice-picker__choices--grades,
  .practice-picker__choices--subjects,
  .practice-picker__choices--compact {
    grid-template-columns: 1fr 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-tile,
  .mode-tile:hover,
  .practice-picker__choice,
  .practice-picker__choice:hover {
    transition: none;
    transform: none;
    filter: none;
  }

  .mode-tile__art,
  .mode-tile__enter,
  .mode-spotlight,
  .mode-spotlight:hover,
  .mode-spotlight__grade-button,
  .mode-spotlight__grade-button:hover,
  .mode-spotlight__inline-cta,
  .mode-spotlight__inline-cta:hover,
  .mode-tile:hover .mode-tile__art,
  .mode-tile:focus-visible .mode-tile__art,
  .mode-tile:hover .mode-tile__enter,
  .mode-tile:focus-visible .mode-tile__enter {
    transition: none;
    transform: none;
  }
}
</style>
