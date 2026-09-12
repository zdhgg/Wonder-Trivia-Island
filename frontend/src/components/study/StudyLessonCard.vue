<script setup>
import { computed } from "vue";

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  getLessonNarrationMeta: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["start-practice", "open-wrong-review", "open-study-lesson"]);

// 第三张指标常与状态徽章重复（如“现在状态：新站开讲”），仅在内容不同时展示
const visibleMetrics = computed(() =>
  (Array.isArray(props.item.metrics) ? props.item.metrics : []).filter(
    (metric, index) => index < 2 || metric.value !== props.item.stageLabel
  )
);

// miniLessons 标题自带“第 N 步”前缀，序号交给胶囊展示，避免重复
function getStepTitle(miniLesson, miniIndex) {
  const stripped = String(miniLesson?.title || "")
    .replace(/^第\s*\d+\s*步\s*/, "")
    .trim();
  return stripped || miniLesson?.title || `第 ${miniIndex + 1} 步`;
}

function openStudyLesson() {
  emit("open-study-lesson", props.item);
}

function startPractice(payload) {
  emit("start-practice", payload);
}

function openWrongReview() {
  emit("open-wrong-review", {
    focusKnowledgeTag: props.item.reviewKnowledgeTag || props.item.practiceKnowledgeTag || props.item.label
  });
}
</script>

<template>
  <article class="lesson-card">
    <div class="lesson-card__masthead">
      <div class="lesson-card__copy">
        <span class="lesson-card__eyebrow">{{ item.contextTag }}</span>
        <h4 class="lesson-card__title">{{ item.label }}</h4>
        <p v-if="item.teacherLead" class="lesson-card__lead">{{ item.teacherLead }}</p>
      </div>

      <span :class="['lesson-card__badge', `lesson-card__badge--${item.stageTone || 'calm'}`]">
        {{ item.stageLabel }}
      </span>
    </div>

    <div v-if="visibleMetrics.length" class="lesson-card__meta" aria-label="本站信息">
      <span v-for="metric in visibleMetrics" :key="`${item.label}-${metric.label}`" class="lesson-card__meta-item">
        <span class="lesson-card__meta-label">{{ metric.label }}</span>
        <strong class="lesson-card__meta-value">{{ metric.value }}</strong>
      </span>
    </div>

    <div v-if="item.showProgress" class="lesson-card__progress" aria-label="理解度">
      <div class="lesson-card__progress-head">
        <span class="lesson-card__progress-label">已经学会多少啦</span>
        <strong class="lesson-card__progress-value">{{ item.masteryPercent }}%</strong>
      </div>
      <div class="lesson-card__progress-track" aria-hidden="true">
        <span class="lesson-card__progress-fill" :style="{ width: `${item.masteryPercent}%` }"></span>
      </div>
    </div>

    <div v-if="item.miniLessons?.length" class="lesson-card__steps" aria-label="学习顺序">
      <span v-for="(miniLesson, miniIndex) in item.miniLessons" :key="miniLesson.id" class="lesson-card__step">
        <span class="lesson-card__step-index" aria-hidden="true">{{ miniIndex + 1 }}</span>
        {{ getStepTitle(miniLesson, miniIndex) }}
      </span>
    </div>

    <p v-if="item.knowledgePathSummary" class="lesson-card__path-note">{{ item.knowledgePathSummary }}</p>

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
      <button v-if="item.pendingCount > 0" class="lesson-card__link" type="button" @click="openWrongReview">
        {{ item.dueCount > 0 ? "去看待补强题" : "去看相关错题" }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.lesson-card {
  display: grid;
  gap: 14px;
  padding: 24px 26px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.74), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 251, 253, 0.86) 100%);
  box-shadow:
    0 24px 40px -38px rgba(36, 50, 74, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.lesson-card__masthead {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 18px;
}

.lesson-card__copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.lesson-card__eyebrow,
.lesson-card__meta-label,
.lesson-card__progress-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lesson-card__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.5rem, 2.8vw, 1.9rem);
  line-height: 1.08;
}

.lesson-card__lead {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.94rem;
  line-height: 1.6;
}

.lesson-card__badge {
  display: inline-flex;
  align-items: center;
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
}

.lesson-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 20px;
}

.lesson-card__meta-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.lesson-card__meta-value {
  color: var(--color-ink);
  font-size: 0.96rem;
}

.lesson-card__progress {
  display: grid;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
}

.lesson-card__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lesson-card__progress-value {
  color: var(--color-ink);
  font-size: 0.98rem;
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

.lesson-card__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.lesson-card__step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 7px;
  border: 1px solid rgba(87, 125, 167, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink);
  font-size: 0.9rem;
  font-weight: 700;
}

.lesson-card__step-index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(190, 240, 255, 0.92), rgba(184, 242, 223, 0.88));
  color: #17384b;
  font-size: 0.78rem;
  font-weight: 900;
}

.lesson-card__path-note {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.92rem;
  line-height: 1.6;
}

.lesson-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
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

@media (max-width: 720px) {
  .lesson-card {
    padding: 18px;
    border-radius: 26px;
  }

  .lesson-card__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .lesson-card__actions .btn-cartoon,
  .lesson-card__link {
    width: 100%;
  }
}
</style>
