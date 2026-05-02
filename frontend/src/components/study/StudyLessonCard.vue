<script setup>
import { toRef } from "vue";
import StudyLessonFlow from "./StudyLessonFlow.vue";

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  sectionId: {
    type: String,
    default: ""
  },
  getLessonNarrationMeta: {
    type: Function,
    required: true
  },
  isLessonExpanded: {
    type: Function,
    required: true
  },
  toggleLessonExpanded: {
    type: Function,
    required: true
  },
  getVisibleKnowledgePoints: {
    type: Function,
    required: true
  },
  getKnowledgePointToggleLabel: {
    type: Function,
    required: true
  },
  isLessonContentOpen: {
    type: Function,
    required: true
  },
  getLessonContentStage: {
    type: Function,
    required: true
  },
  advanceLessonContentStage: {
    type: Function,
    required: true
  },
  getMiniLessonTone: {
    type: Function,
    required: true
  },
  getMiniLessonStateLabel: {
    type: Function,
    required: true
  },
  shouldRevealMiniLessonBody: {
    type: Function,
    required: true
  },
  getMiniLessonGuideText: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["start-practice", "open-wrong-review", "open-study-lesson"]);

const item = toRef(props, "item");
const sectionId = toRef(props, "sectionId");
const {
  getLessonNarrationMeta,
  isLessonExpanded,
  toggleLessonExpanded,
  getVisibleKnowledgePoints,
  getKnowledgePointToggleLabel,
  isLessonContentOpen,
  getLessonContentStage,
  advanceLessonContentStage,
  getMiniLessonTone,
  getMiniLessonStateLabel,
  shouldRevealMiniLessonBody,
  getMiniLessonGuideText
} = props;

function openStudyLesson() {
  emit("open-study-lesson", item.value);
}

function startPractice(payload) {
  emit("start-practice", payload);
}

function openWrongReview() {
  emit("open-wrong-review", {
    focusKnowledgeTag: item.value.reviewKnowledgeTag || item.value.practiceKnowledgeTag || item.value.label
  });
}
</script>

<template>
  <article
    :class="[
      'lesson-card',
      {
        'lesson-card--recommended': item.isRecommended,
        'lesson-card--systematic-section': sectionId === 'systematic-lessons'
      }
    ]"
  >
    <div class="lesson-card__masthead">
      <div class="lesson-card__copy">
        <span class="lesson-card__eyebrow">{{ item.contextTag }}</span>
        <h4 class="lesson-card__title">{{ item.label }}</h4>
        <p v-if="item.teacherLead" class="lesson-card__lead">{{ item.teacherLead }}</p>
      </div>

      <div class="lesson-card__statusbox">
        <span :class="['lesson-card__badge', `lesson-card__badge--${item.stageTone || 'calm'}`]">
          {{ item.stageLabel }}
        </span>
        <p class="lesson-card__status-text">{{ item.stageSummary }}</p>
      </div>
    </div>

    <div class="lesson-card__metrics" aria-label="学习卡指标">
      <div v-for="metric in item.metrics" :key="`${item.label}-${metric.label}`" class="lesson-card__metric">
        <span class="lesson-card__metric-label">{{ metric.label }}</span>
        <strong class="lesson-card__metric-value">{{ metric.value }}</strong>
      </div>
    </div>

    <div v-if="!item.isRecommended && item.showProgress !== false" class="lesson-card__progress" aria-label="理解度">
      <div class="lesson-card__progress-head">
        <span class="lesson-card__progress-label">已经学会多少啦</span>
        <strong class="lesson-card__progress-value">{{ item.masteryPercent }}%</strong>
      </div>
      <div class="lesson-card__progress-track" aria-hidden="true">
        <span class="lesson-card__progress-fill" :style="{ width: `${item.masteryPercent}%` }"></span>
      </div>
    </div>

    <section v-if="item.miniLessons?.length" class="lesson-card__path" aria-label="学习小步">
      <div class="lesson-card__path-head">
        <span class="lesson-card__path-eyebrow">老师带着学</span>
        <strong class="lesson-card__path-title">跟着顺序，一步一步来</strong>
      </div>

      <div class="lesson-card__path-grid">
        <article
          v-for="(miniLesson, miniIndex) in item.miniLessons"
          :key="miniLesson.id"
          :class="['lesson-mini-card', `lesson-mini-card--${getMiniLessonTone(item, miniIndex)}`]"
        >
          <div class="lesson-mini-card__top">
            <span class="lesson-mini-card__step">第 {{ miniIndex + 1 }} 步</span>
            <span v-if="item.isSystematic" class="lesson-mini-card__state">
              {{ getMiniLessonStateLabel(item, miniIndex) }}
            </span>
          </div>
          <span class="lesson-mini-card__title">{{ miniLesson.title }}</span>
          <template v-if="shouldRevealMiniLessonBody(item, miniIndex)">
            <p class="lesson-mini-card__text">{{ miniLesson.text }}</p>
            <span v-if="miniLesson.badge" class="lesson-mini-card__badge">{{ miniLesson.badge }}</span>
          </template>
        </article>
      </div>

      <div v-if="item.isSystematic" class="lesson-card__path-actions">
        <div class="lesson-card__path-copy">
          <span :class="['lesson-card__audio-pill', `lesson-card__audio-pill--${getLessonNarrationMeta(item).tone}`]">
            {{ getLessonNarrationMeta(item).badgeText }}
          </span>
          <p class="lesson-card__path-note">{{ getMiniLessonGuideText(item) }}</p>
        </div>

        <button
          v-if="!isLessonContentOpen(item)"
          class="lesson-card__path-toggle"
          type="button"
          :title="getLessonNarrationMeta(item).buttonTitle"
          @click="openStudyLesson"
        >
          {{ getLessonNarrationMeta(item).entryLabel }}
        </button>
      </div>
    </section>

    <StudyLessonFlow
      v-if="!item.isSystematic || isLessonContentOpen(item)"
      :item="item"
      :get-lesson-content-stage="getLessonContentStage"
      :advance-lesson-content-stage="advanceLessonContentStage"
      :is-lesson-expanded="isLessonExpanded"
      :toggle-lesson-expanded="toggleLessonExpanded"
      :get-visible-knowledge-points="getVisibleKnowledgePoints"
      :get-knowledge-point-toggle-label="getKnowledgePointToggleLabel"
      @start-practice="startPractice"
    />

    <footer class="lesson-card__footer">
      <div class="lesson-card__footer-copy">
        <div v-if="item.footerChips?.length" class="lesson-card__chips" aria-label="学习提示">
          <span v-for="chip in item.footerChips" :key="`${item.label}-${chip}`" class="lesson-card__chip">
            {{ chip }}
          </span>
        </div>
        <p class="lesson-card__audio-note">{{ getLessonNarrationMeta(item).summaryText }}</p>
      </div>

      <div class="lesson-card__actions">
        <button
          class="btn-cartoon btn-cartoon--yellow"
          type="button"
          :title="getLessonNarrationMeta(item).buttonTitle"
          @click="openStudyLesson"
        >
          {{ getLessonNarrationMeta(item).entryLabel }}
        </button>
        <button class="lesson-card__link" type="button" @click="startPractice(item)">
          {{ item.practiceActionLabel }}
        </button>
        <button
          v-if="item.pendingCount > 0"
          class="lesson-card__link"
          type="button"
          @click="openWrongReview"
        >
          {{ item.dueCount > 0 ? "去看待补强题" : "去看相关错题" }}
        </button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.lesson-card {
  display: grid;
  gap: 16px;
  padding: 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.74), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 251, 253, 0.86) 100%);
  box-shadow:
    0 24px 40px -38px rgba(36, 50, 74, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.lesson-card--systematic-section {
  border-color: rgba(86, 173, 255, 0.14);
  box-shadow:
    0 28px 42px -40px rgba(36, 50, 74, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.lesson-card--recommended {
  background:
    radial-gradient(circle at top left, rgba(173, 235, 255, 0.18), transparent 32%),
    linear-gradient(180deg, rgba(249, 252, 255, 0.96) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.lesson-card__masthead {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.84fr);
  gap: 16px;
  align-items: start;
}

.lesson-card__copy {
  display: grid;
  gap: 8px;
}

.lesson-card__eyebrow,
.lesson-card__metric-label,
.lesson-card__progress-label {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lesson-card__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.55rem, 3vw, 2rem);
  line-height: 1.04;
}

.lesson-card__lead {
  margin: 6px 0 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.96rem;
  line-height: 1.65;
}

.lesson-card__statusbox {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
}

.lesson-card__status-text {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.65;
}

.lesson-card__badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--color-ink);
}

.lesson-card__badge--alert {
  background: rgba(255, 231, 156, 0.86);
}

.lesson-card__badge--warm {
  background: rgba(255, 195, 218, 0.78);
}

.lesson-card__badge--planned {
  background: rgba(219, 234, 254, 0.86);
}

.lesson-card__badge--calm {
  background: rgba(184, 242, 223, 0.82);
  color: var(--color-ink);
}

.lesson-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.lesson-card__metric {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.lesson-card__metric-value,
.lesson-card__progress-value {
  color: var(--color-ink);
  font-size: 1.05rem;
}

.lesson-card__progress {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
}

.lesson-card__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lesson-card__progress-track {
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.66);
}

.lesson-card__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(124, 216, 184, 0.94) 0%, rgba(86, 173, 255, 0.92) 100%);
}

.lesson-card__path {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 24px;
  border: 1.5px solid rgba(87, 125, 167, 0.14);
  background:
    radial-gradient(circle at top left, rgba(190, 240, 255, 0.26) 0%, rgba(190, 240, 255, 0) 36%),
    linear-gradient(180deg, rgba(250, 253, 255, 0.96) 0%, rgba(245, 251, 255, 0.9) 100%);
}

.lesson-card__path-head {
  display: grid;
  gap: 4px;
}

.lesson-card__path-eyebrow {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lesson-card__path-title {
  color: var(--color-ink);
  font-size: 1rem;
}

.lesson-card__path-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.lesson-mini-card {
  display: grid;
  gap: 10px;
  min-height: 0;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(87, 125, 167, 0.12);
  background: rgba(255, 255, 255, 0.82);
}

.lesson-mini-card__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lesson-mini-card__step {
  justify-self: start;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(190, 240, 255, 0.28);
  color: var(--color-ink);
  font-size: 0.76rem;
  font-weight: 800;
}

.lesson-mini-card__state {
  justify-self: start;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(87, 125, 167, 0.12);
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  font-weight: 800;
}

.lesson-mini-card__title {
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 700;
}

.lesson-mini-card__text {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.93rem;
  line-height: 1.65;
}

.lesson-mini-card__badge {
  justify-self: start;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 222, 140, 0.35);
  color: var(--color-ink);
  font-size: 0.8rem;
  font-weight: 700;
}

.lesson-mini-card--current {
  border-color: rgba(86, 173, 255, 0.26);
  background:
    radial-gradient(circle at top left, rgba(190, 240, 255, 0.22) 0%, rgba(190, 240, 255, 0) 36%),
    linear-gradient(180deg, rgba(248, 253, 255, 0.96) 0%, rgba(255, 255, 255, 0.9) 100%);
  box-shadow: 0 18px 26px -26px rgba(36, 50, 74, 0.26);
}

.lesson-mini-card--current .lesson-mini-card__step,
.lesson-mini-card--current .lesson-mini-card__state {
  background: rgba(190, 240, 255, 0.52);
  color: #17384b;
}

.lesson-mini-card--done {
  border-color: rgba(124, 216, 184, 0.26);
  background:
    radial-gradient(circle at top left, rgba(184, 242, 223, 0.22) 0%, rgba(184, 242, 223, 0) 36%),
    linear-gradient(180deg, rgba(248, 255, 252, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.lesson-mini-card--done .lesson-mini-card__step,
.lesson-mini-card--done .lesson-mini-card__state {
  background: rgba(184, 242, 223, 0.5);
  color: #214539;
}

.lesson-mini-card--waiting {
  gap: 6px;
  padding-top: 12px;
  padding-bottom: 12px;
  opacity: 0.82;
  background: rgba(255, 255, 255, 0.72);
}

.lesson-mini-card--waiting .lesson-mini-card__step,
.lesson-mini-card--waiting .lesson-mini-card__state {
  background: rgba(255, 255, 255, 0.88);
}

.lesson-card__path-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 14px 16px;
  border: 1px dashed rgba(87, 125, 167, 0.2);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
}

.lesson-card__path-copy {
  display: grid;
  gap: 8px;
  flex: 1 1 320px;
  min-width: 0;
}

.lesson-card__audio-pill {
  justify-self: start;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}

.lesson-card__audio-pill--audio {
  background: rgba(184, 242, 223, 0.42);
  color: var(--color-ink);
}

.lesson-card__audio-pill--mixed {
  background: rgba(255, 231, 156, 0.4);
  color: var(--color-ink);
}

.lesson-card__audio-pill--text {
  background: rgba(173, 235, 255, 0.3);
  color: var(--color-ink);
}

.lesson-card__path-note,
.lesson-card__audio-note {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.92rem;
  line-height: 1.6;
}

.lesson-card__path-toggle {
  min-height: 42px;
  padding: 9px 16px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(124, 216, 184, 0.96), rgba(86, 173, 255, 0.92));
  color: #143044;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

.lesson-card__path-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 24px -24px rgba(36, 50, 74, 0.34);
  filter: saturate(1.04);
}

.lesson-card__path-toggle:focus-visible {
  outline: none;
  box-shadow:
    0 18px 24px -24px rgba(36, 50, 74, 0.34),
    0 0 0 3px rgba(86, 173, 255, 0.18);
}

.lesson-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lesson-card__chip {
  justify-self: start;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(36, 50, 74, 0.08);
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
}

.lesson-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
}

.lesson-card__footer-copy {
  display: grid;
  gap: 8px;
  flex: 1 1 320px;
  min-width: 0;
}

.lesson-card__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.lesson-card__actions .btn-cartoon {
  width: auto;
}

.lesson-card__link {
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid rgba(87, 125, 167, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.lesson-card__link:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
  box-shadow: 0 14px 22px -22px rgba(36, 50, 74, 0.34);
}

.lesson-card__link:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.14);
}

@media (max-width: 1120px) {
  .lesson-card__masthead {
    grid-template-columns: 1fr;
  }

  .lesson-card__path-grid,
  .lesson-card__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .lesson-card {
    padding: 18px;
    border-radius: 26px;
  }

  .lesson-card__metrics,
  .lesson-card__path-grid {
    grid-template-columns: 1fr;
  }

  .lesson-card__footer,
  .lesson-card__path-actions,
  .lesson-card__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .lesson-card__path-toggle,
  .lesson-card__actions .btn-cartoon,
  .lesson-card__link {
    width: 100%;
  }
}
</style>
