<script setup>
import { toRef } from "vue";
import StudyKnowledgePointDetail from "./StudyKnowledgePointDetail.vue";

const props = defineProps({
  item: {
    type: Object,
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
  getLessonContentStage,
  advanceLessonContentStage,
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
  <div class="lesson-card__lesson-flow">
    <div v-if="item.isSystematic" class="lesson-card__stage-progress" aria-label="详细讲解顺序">
      <span
        :class="[
          'lesson-card__stage-pill',
          {
            'lesson-card__stage-pill--active': getLessonContentStage(item) === 1,
            'lesson-card__stage-pill--done': getLessonContentStage(item) > 1
          }
        ]"
      >
        1. 老师先说
      </span>
      <span
        :class="[
          'lesson-card__stage-pill',
          {
            'lesson-card__stage-pill--active': getLessonContentStage(item) === 2,
            'lesson-card__stage-pill--done': getLessonContentStage(item) > 2
          }
        ]"
      >
        2. 看个例子
      </span>
      <span
        :class="[
          'lesson-card__stage-pill',
          { 'lesson-card__stage-pill--active': getLessonContentStage(item) === 3 }
        ]"
      >
        3. 看易错点
      </span>
    </div>

    <section class="lesson-card__stage">
      <div v-if="item.isSystematic" class="lesson-card__stage-head">
        <span class="lesson-card__stage-eyebrow">第 1 步</span>
        <strong class="lesson-card__stage-title">先听老师一句话</strong>
        <p class="lesson-card__stage-text">先知道这站在讲什么，再看为什么要学它。</p>
      </div>

      <div class="lesson-card__grid lesson-card__grid--intro">
        <section class="lesson-card__panel">
          <span class="lesson-card__panel-label">{{ item.conceptLabel || "这块讲啥" }}</span>
          <p class="lesson-card__panel-text">{{ item.conceptText }}</p>
        </section>

        <section class="lesson-card__panel">
          <span class="lesson-card__panel-label">{{ item.whyLabel || "为什么要会" }}</span>
          <p class="lesson-card__panel-text">{{ item.whyText }}</p>
        </section>
      </div>

      <div v-if="item.isSystematic && getLessonContentStage(item) === 1" class="lesson-card__stage-actions">
        <p class="lesson-card__stage-note">这两块看懂了，再往下看一个小例子，会更轻松。</p>
        <button class="lesson-card__stage-button" type="button" @click="advanceLessonContentStage(item)">
          继续看小例子
        </button>
      </div>
    </section>

    <section v-if="!item.isSystematic || getLessonContentStage(item) >= 2" class="lesson-card__stage">
      <div v-if="item.isSystematic" class="lesson-card__stage-head">
        <span class="lesson-card__stage-eyebrow">第 2 步</span>
        <strong class="lesson-card__stage-title">再看一个小例子</strong>
        <p class="lesson-card__stage-text">先用一个具体小情景，把刚才的讲解接到题目里。</p>
      </div>

      <div class="lesson-card__grid lesson-card__grid--example">
        <section class="lesson-card__panel lesson-card__panel--wide lesson-card__panel--example">
          <span class="lesson-card__panel-label">{{ item.exampleLabel }}</span>
          <strong class="lesson-card__example-question">{{ item.examplePrompt }}</strong>
          <p class="lesson-card__panel-text">{{ item.exampleExplanation }}</p>
        </section>
      </div>

      <div v-if="item.isSystematic && getLessonContentStage(item) === 2" class="lesson-card__stage-actions">
        <p class="lesson-card__stage-note">例子看完了，最后再看易错点和这站的小点顺序。</p>
        <button class="lesson-card__stage-button" type="button" @click="advanceLessonContentStage(item)">
          继续看易错点
        </button>
      </div>
    </section>

    <section v-if="!item.isSystematic || getLessonContentStage(item) >= 3" class="lesson-card__stage">
      <div v-if="item.isSystematic" class="lesson-card__stage-head">
        <span class="lesson-card__stage-eyebrow">第 3 步</span>
        <strong class="lesson-card__stage-title">最后看易错点和站内小点</strong>
        <p class="lesson-card__stage-text">最后再把容易绊住的地方和这站的小顺序看清楚。</p>
      </div>

      <div class="lesson-card__grid lesson-card__grid--final">
        <section class="lesson-card__panel lesson-card__panel--list">
          <span class="lesson-card__panel-label">{{ item.pitfallLabel || "别踩坑" }}</span>
          <ul class="lesson-card__list">
            <li v-for="pitfall in item.pitfalls" :key="`${item.label}-${pitfall}`" class="lesson-card__list-item">
              {{ pitfall }}
            </li>
          </ul>
        </section>

        <section class="lesson-card__panel lesson-card__panel--memory">
          <span class="lesson-card__panel-label">{{ item.memoryLabel || "记一记" }}</span>
          <p class="lesson-card__panel-text">{{ item.memoryText }}</p>
          <div class="lesson-card__memory-steps" aria-label="记忆顺序">
            <span
              v-for="memoryStep in item.memorySequence"
              :key="`${item.label}-${memoryStep}`"
              class="lesson-card__memory-step"
            >
              {{ memoryStep }}
            </span>
          </div>
        </section>
      </div>

      <StudyKnowledgePointDetail
        :item="item"
        :is-lesson-expanded="isLessonExpanded"
        :toggle-lesson-expanded="toggleLessonExpanded"
        :get-visible-knowledge-points="getVisibleKnowledgePoints"
        :get-knowledge-point-toggle-label="getKnowledgePointToggleLabel"
        @start-practice="startPractice"
      />
    </section>
  </div>
</template>

<style scoped>
.lesson-card__lesson-flow,
.lesson-card__stage {
  display: grid;
  gap: 14px;
}

.lesson-card__lesson-flow {
  gap: 16px;
}

.lesson-card__stage-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.lesson-card__stage-pill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid rgba(87, 125, 167, 0.12);
  background: rgba(255, 255, 255, 0.76);
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
}

.lesson-card__stage-pill--active {
  border-color: rgba(86, 173, 255, 0.42);
  background: linear-gradient(135deg, rgba(190, 240, 255, 0.92), rgba(184, 242, 223, 0.88));
  color: #17384b;
}

.lesson-card__stage-pill--done {
  border-color: rgba(124, 216, 184, 0.34);
  background: rgba(184, 242, 223, 0.42);
  color: var(--color-ink);
}

.lesson-card__stage-head {
  display: grid;
  gap: 6px;
}

.lesson-card__stage-eyebrow,
.lesson-card__panel-label {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lesson-card__stage-title {
  color: var(--color-ink);
  font-size: 1rem;
}

.lesson-card__stage-text,
.lesson-card__panel-text {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  line-height: 1.65;
}

.lesson-card__stage-text {
  font-size: 0.92rem;
}

.lesson-card__stage-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 14px 16px;
  border: 1px dashed rgba(87, 125, 167, 0.22);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.76);
}

.lesson-card__stage-note {
  flex: 1 1 280px;
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.92rem;
  line-height: 1.6;
}

.lesson-card__stage-button {
  min-height: 42px;
  padding: 9px 14px;
  border: 1.5px solid rgba(87, 125, 167, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.lesson-card__stage-button:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
  box-shadow: 0 14px 22px -22px rgba(36, 50, 74, 0.34);
}

.lesson-card__stage-button:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.14);
}

.lesson-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.lesson-card__panel {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
}

.lesson-card__panel--wide {
  grid-column: 1 / -1;
}

.lesson-card__panel--example {
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.22), transparent 38%),
    rgba(255, 255, 255, 0.82);
}

.lesson-card__example-question {
  color: var(--color-ink);
  font-size: 1rem;
  line-height: 1.55;
}

.lesson-card__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
  color: var(--color-ink-soft);
}

.lesson-card__list-item {
  line-height: 1.6;
}

.lesson-card__memory-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lesson-card__memory-step {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(184, 242, 223, 0.82);
  color: var(--color-ink);
  font-size: 0.8rem;
  font-weight: 800;
}

@media (max-width: 1120px) {
  .lesson-card__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .lesson-card__grid {
    grid-template-columns: 1fr;
  }

  .lesson-card__stage-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .lesson-card__stage-button {
    width: 100%;
  }
}
</style>
