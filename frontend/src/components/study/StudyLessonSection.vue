<script setup>
import { toRef } from "vue";
import StudyLessonCard from "./StudyLessonCard.vue";

const props = defineProps({
  section: {
    type: Object,
    required: true
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
  },
  toggleSection: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["start-practice", "open-wrong-review", "open-study-lesson"]);

const section = toRef(props, "section");
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
  getMiniLessonGuideText,
  toggleSection
} = props;
</script>

<template>
  <section :class="['study-section', `study-section--${section.id}`]">
    <div v-if="section.id !== 'systematic-lessons'" class="study-section__head">
      <div class="study-section__copy">
        <p class="study-section__eyebrow">{{ section.eyebrow }}</p>
        <h3 class="study-section__title">{{ section.title }}</h3>
        <p class="study-section__text">{{ section.description }}</p>
      </div>

      <button
        v-if="section.collapsible"
        class="study-section__toggle"
        type="button"
        @click="toggleSection(section.id)"
      >
        {{ section.expanded ? "先收起" : "展开看看" }}
      </button>
    </div>

    <p v-if="section.collapsible && !section.expanded" class="study-section__collapsed-text">
      {{ section.collapsedText }}
    </p>

    <div v-if="!section.collapsible || section.expanded" class="lesson-stack">
      <StudyLessonCard
        v-for="item in section.items"
        :key="`${section.id}-${item.label}`"
        :item="item"
        :section-id="section.id"
        :get-lesson-narration-meta="getLessonNarrationMeta"
        :is-lesson-expanded="isLessonExpanded"
        :toggle-lesson-expanded="toggleLessonExpanded"
        :get-visible-knowledge-points="getVisibleKnowledgePoints"
        :get-knowledge-point-toggle-label="getKnowledgePointToggleLabel"
        :is-lesson-content-open="isLessonContentOpen"
        :get-lesson-content-stage="getLessonContentStage"
        :advance-lesson-content-stage="advanceLessonContentStage"
        :get-mini-lesson-tone="getMiniLessonTone"
        :get-mini-lesson-state-label="getMiniLessonStateLabel"
        :should-reveal-mini-lesson-body="shouldRevealMiniLessonBody"
        :get-mini-lesson-guide-text="getMiniLessonGuideText"
        @start-practice="$emit('start-practice', $event)"
        @open-wrong-review="$emit('open-wrong-review', $event)"
        @open-study-lesson="$emit('open-study-lesson', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.study-section {
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
  padding: 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.2) 0%, rgba(255, 231, 156, 0) 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.86) 100%);
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.study-section--systematic-lessons {
  order: 2;
  background:
    radial-gradient(circle at top left, rgba(184, 242, 223, 0.18), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(250, 253, 255, 0.9) 100%);
}

.study-section--recorded {
  order: 7;
}

.study-section--recommended {
  order: 8;
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.22) 0%, rgba(173, 235, 255, 0) 30%),
    linear-gradient(180deg, rgba(250, 253, 255, 0.92) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 18px;
}

.study-section__copy {
  display: grid;
  gap: 8px;
}

.study-section__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-section__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.45rem;
  line-height: 1.04;
}

.study-section__text {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.65;
}

.study-section__toggle {
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.study-section__toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.38);
  box-shadow: 0 14px 22px -22px rgba(36, 50, 74, 0.3);
}

.study-section__toggle:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.14);
}

.study-section__collapsed-text {
  margin: 0;
  padding: 14px 16px;
  border: 1px dashed rgba(87, 125, 167, 0.24);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-ink-soft);
  line-height: 1.65;
}

.lesson-stack {
  display: grid;
  gap: 16px;
}

@media (max-width: 720px) {
  .study-section {
    padding: 18px;
    border-radius: 26px;
  }

  .study-section__head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
