<script setup>
import { toRef } from "vue";

const props = defineProps({
  item: {
    type: Object,
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
  }
});

const emit = defineEmits(["start-practice"]);

const item = toRef(props, "item");
const {
  isLessonExpanded,
  toggleLessonExpanded,
  getVisibleKnowledgePoints,
  getKnowledgePointToggleLabel
} = props;

function startPractice(payload) {
  emit("start-practice", payload);
}
</script>

<template>
  <section v-if="item.knowledgePointCards?.length" class="lesson-card__detail">
    <div class="lesson-card__detail-intro">
      <div class="lesson-card__detail-copy">
        <span class="lesson-card__detail-eyebrow">站内学习顺序</span>
        <p class="lesson-card__detail-summary">{{ item.knowledgePathSummary }}</p>
      </div>

      <div v-if="item.knowledgePathChips?.length" class="lesson-card__detail-chips" aria-label="建议顺序">
        <span
          v-for="chip in item.knowledgePathChips"
          :key="`${item.id || item.label}-${chip}`"
          class="lesson-card__detail-chip"
        >
          {{ chip }}
        </span>
      </div>
    </div>

    <button
      v-if="item.knowledgePointCards.length > 1"
      class="lesson-card__detail-toggle"
      type="button"
      @click="toggleLessonExpanded(item)"
    >
      {{ getKnowledgePointToggleLabel(item) }}
    </button>

    <p v-if="item.isSystematic && item.knowledgePointCards.length > 1" class="lesson-card__detail-note">
      {{
        isLessonExpanded(item)
          ? "这一站的小点已经全部打开啦，可以顺着从上往下看。"
          : "现在先露出系统推荐的 1 个小点，觉得顺了再把其他小点一起展开。"
      }}
    </p>

    <div class="lesson-card__detail-grid" aria-label="站内知识点">
      <article
        v-for="point in getVisibleKnowledgePoints(item)"
        :key="point.id"
        class="knowledge-point-card"
      >
        <div class="knowledge-point-card__head">
          <div class="knowledge-point-card__title-wrap">
            <span class="knowledge-point-card__order">第 {{ point.orderIndex }} 个</span>
            <strong class="knowledge-point-card__title">{{ point.label }}</strong>
          </div>

          <div class="knowledge-point-card__badge-stack">
            <span class="knowledge-point-card__route">{{ point.routeBadge }}</span>
            <span :class="['knowledge-point-card__badge', `knowledge-point-card__badge--${point.statusTone}`]">
              {{ point.statusLabel }}
            </span>
          </div>
        </div>

        <p v-if="point.teacherLead" class="knowledge-point-card__lead">{{ point.teacherLead }}</p>

        <section class="knowledge-point-card__section">
          <span class="knowledge-point-card__label">老师一句话</span>
          <p class="knowledge-point-card__text">{{ point.learnText || point.hintText }}</p>
        </section>

        <section class="knowledge-point-card__section">
          <span class="knowledge-point-card__label">试试看</span>
          <p class="knowledge-point-card__text">{{ point.tryText }}</p>
        </section>

        <span v-if="point.pocketText" class="knowledge-point-card__tip">{{ point.pocketText }}</span>
        <span v-if="point.isRecommendedNext" class="knowledge-point-card__next">这一站建议先学它</span>
        <p class="knowledge-point-card__meta">{{ point.progressText }}</p>
        <p class="knowledge-point-card__meta">{{ point.dueText }}</p>

        <button class="knowledge-point-card__action" type="button" @click="startPractice(point)">
          {{ point.actionLabel }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.lesson-card__detail {
  display: grid;
  gap: 14px;
}

.lesson-card__detail-intro,
.lesson-card__detail-copy,
.knowledge-point-card__title-wrap,
.knowledge-point-card__badge-stack,
.knowledge-point-card__section {
  display: grid;
  gap: 6px;
}

.lesson-card__detail-eyebrow,
.knowledge-point-card__label,
.knowledge-point-card__order {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.lesson-card__detail-summary,
.knowledge-point-card__lead,
.knowledge-point-card__text,
.knowledge-point-card__meta {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  line-height: 1.6;
}

.lesson-card__detail-summary,
.knowledge-point-card__lead {
  font-size: 0.95rem;
}

.lesson-card__detail-note {
  margin: 0;
  padding: 12px 14px;
  border: 1px dashed rgba(87, 125, 167, 0.22);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.92rem;
  line-height: 1.6;
}

.lesson-card__detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lesson-card__detail-chip {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(173, 235, 255, 0.24);
  color: var(--color-ink);
  font-size: 0.8rem;
  font-weight: 700;
}

.lesson-card__detail-toggle {
  justify-self: start;
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

.lesson-card__detail-toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
  box-shadow: 0 14px 22px -22px rgba(36, 50, 74, 0.34);
}

.lesson-card__detail-toggle:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.14);
}

.lesson-card__detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.knowledge-point-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background:
    radial-gradient(circle at top right, rgba(255, 240, 188, 0.18), transparent 34%),
    rgba(255, 255, 255, 0.86);
}

.knowledge-point-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.knowledge-point-card__title {
  color: var(--color-ink);
  font-size: 1rem;
  line-height: 1.5;
}

.knowledge-point-card__badge {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}

.knowledge-point-card__route {
  justify-self: end;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 231, 156, 0.34);
  color: var(--color-ink);
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
}

.knowledge-point-card__badge--planned {
  background: rgba(173, 235, 255, 0.28);
  color: var(--color-ink);
}

.knowledge-point-card__badge--calm {
  background: rgba(184, 242, 223, 0.36);
  color: var(--color-ink);
}

.knowledge-point-card__badge--alert {
  background: rgba(255, 214, 179, 0.46);
  color: var(--color-ink);
}

.knowledge-point-card__tip,
.knowledge-point-card__next {
  justify-self: start;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
}

.knowledge-point-card__tip {
  background: rgba(184, 242, 223, 0.36);
  color: var(--color-ink);
}

.knowledge-point-card__next {
  background: rgba(255, 214, 179, 0.42);
  color: var(--color-ink);
}

.knowledge-point-card__action {
  justify-self: start;
  min-height: 40px;
  padding: 9px 12px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(124, 216, 184, 0.95), rgba(86, 173, 255, 0.92));
  color: #143044;
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 1120px) {
  .lesson-card__detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .lesson-card__detail-grid {
    grid-template-columns: 1fr;
  }

  .knowledge-point-card__head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
