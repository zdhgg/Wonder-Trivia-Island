<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  overview: {
    type: Object,
    default: () => ({
      title: "错题温习",
      description: "",
      stats: []
    })
  },
  wrongQuestions: {
    type: Array,
    default: () => []
  },
  focusKnowledgeTag: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["start-review", "review-question", "practice-knowledge"]);

const activeStatus = ref("due");
const activeKnowledgeTag = ref("");

const statusOptions = [
  { value: "due", label: "今天到期" },
  { value: "scheduled", label: "已排队" },
  { value: "mastered", label: "已回稳" },
  { value: "all", label: "全部" }
];

const knowledgeTagOptions = computed(() => {
  const labelSet = new Set();

  for (const item of props.wrongQuestions) {
    const label = String(item?.knowledgeTag || "").trim();

    if (label) {
      labelSet.add(label);
    }
  }

  return Array.from(labelSet);
});

const filteredQuestions = computed(() =>
  props.wrongQuestions.filter((item) => {
    const matchesStatus =
      activeStatus.value === "all"
        ? true
        : activeStatus.value === "due"
          ? item.isReviewDue
          : activeStatus.value === "scheduled"
            ? item.isReviewScheduled
        : activeStatus.value === "mastered"
          ? item.reviewStatus === "mastered"
          : item.reviewStatus !== "mastered";
    const matchesKnowledgeTag = activeKnowledgeTag.value ? item.knowledgeTag === activeKnowledgeTag.value : true;

    return matchesStatus && matchesKnowledgeTag;
  })
);

const reviewQuestionIds = computed(() =>
  filteredQuestions.value
    .filter((item) => item.reviewStatus !== "mastered")
    .map((item) => item.questionId)
);

watch(
  () => props.focusKnowledgeTag,
  (nextTag) => {
    activeKnowledgeTag.value = String(nextTag || "").trim();
  },
  { immediate: true }
);

function emitBatchReview() {
  if (!reviewQuestionIds.value.length) {
    return;
  }

  emit("start-review", reviewQuestionIds.value);
}
</script>

<template>
  <section class="wrong-hub">
    <header class="wrong-hero">
      <div class="wrong-hero__copy">
        <p class="wrong-hero__eyebrow">Review Queue</p>
        <h2 class="wrong-hero__title">{{ props.overview.title }}</h2>
        <p class="wrong-hero__text">{{ props.overview.description }}</p>
      </div>

      <div class="wrong-hero__stats" aria-label="错题概览">
        <article v-for="item in props.overview.stats" :key="item.label" class="wrong-stat">
          <span class="wrong-stat__label">{{ item.label }}</span>
          <strong class="wrong-stat__value">{{ item.value }}</strong>
        </article>
      </div>
    </header>

    <section class="wrong-toolbar" aria-label="错题筛选">
      <div class="wrong-toolbar__group">
        <button
          v-for="item in statusOptions"
          :key="item.value"
          :class="['wrong-filter', { 'wrong-filter--active': activeStatus === item.value }]"
          type="button"
          @click="activeStatus = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="knowledgeTagOptions.length" class="wrong-toolbar__group wrong-toolbar__group--tags">
        <button
          :class="['wrong-filter', { 'wrong-filter--active': !activeKnowledgeTag }]"
          type="button"
          @click="activeKnowledgeTag = ''"
        >
          全部知识点
        </button>
        <button
          v-for="item in knowledgeTagOptions"
          :key="item"
          :class="['wrong-filter', { 'wrong-filter--active': activeKnowledgeTag === item }]"
          type="button"
          @click="activeKnowledgeTag = item"
        >
          {{ item }}
        </button>
      </div>

      <button class="btn-cartoon btn-cartoon--yellow wrong-toolbar__action" type="button" :disabled="!reviewQuestionIds.length" @click="emitBatchReview">
        {{ reviewQuestionIds.length ? `开始温习 ${reviewQuestionIds.length} 题` : "暂无可温习题目" }}
      </button>
    </section>

    <section v-if="filteredQuestions.length" class="wrong-list" aria-label="错题记录">
      <article v-for="item in filteredQuestions" :key="item.questionId" class="wrong-card">
        <div class="wrong-card__head">
          <div class="wrong-card__chips">
            <span class="wrong-card__chip">{{ item.subject }}</span>
            <span v-if="item.grade" class="wrong-card__chip">{{ item.grade }}</span>
            <span v-if="item.semester && item.semester !== '通用'" class="wrong-card__chip">{{ item.semester }}</span>
            <span class="wrong-card__chip wrong-card__chip--knowledge">{{ item.knowledgeTag }}</span>
          </div>
          <span :class="['wrong-card__badge', `wrong-card__badge--${item.reviewTone}`]">
            {{ item.reviewStatusLabel }}
          </span>
        </div>

        <div class="wrong-card__copy">
          <h3 class="wrong-card__title">{{ item.content }}</h3>
          <p class="wrong-card__meta">
            上次作答：{{ item.lastSelectedLabel }} · 正确答案：{{ item.correctAnswerLabel }}
          </p>
          <p class="wrong-card__text">{{ item.explanation }}</p>
        </div>

        <div class="wrong-card__stats" aria-label="错题状态">
          <div class="wrong-card__stat">
            <span class="wrong-card__stat-label">累计错题</span>
            <strong class="wrong-card__stat-value">{{ item.wrongCount }}</strong>
          </div>
          <div class="wrong-card__stat">
            <span class="wrong-card__stat-label">回温连对</span>
            <strong class="wrong-card__stat-value">{{ item.reviewCorrectStreak }}</strong>
          </div>
          <div class="wrong-card__stat">
            <span class="wrong-card__stat-label">掌握度</span>
            <strong class="wrong-card__stat-value">{{ item.masteryPercent }}%</strong>
          </div>
          <div class="wrong-card__stat">
            <span class="wrong-card__stat-label">下次温习</span>
            <strong class="wrong-card__stat-value">{{ item.reviewScheduleLabel }}</strong>
          </div>
        </div>

        <div class="wrong-card__actions">
          <button class="btn-cartoon btn-cartoon--mint" type="button" @click="$emit('review-question', item.questionId)">
            再练这题
          </button>
          <button class="wrong-card__link" type="button" @click="$emit('practice-knowledge', item.knowledgeTag)">
            练同知识点
          </button>
        </div>
      </article>
    </section>

    <section v-else class="wrong-empty">
      <p class="wrong-empty__eyebrow">Review Ready</p>
      <h3 class="wrong-empty__title">当前筛选下没有错题</h3>
      <p class="wrong-empty__text">可以切换状态或知识点筛选，也可以先回去做一轮练习，新的错题会自动收进来。</p>
    </section>
  </section>
</template>

<style scoped>
.wrong-hub {
  display: grid;
  gap: 18px;
}

.wrong-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
  padding: 26px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 195, 218, 0.24), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.82) 100%);
  box-shadow: 0 28px 48px -38px rgba(36, 50, 74, 0.38);
  backdrop-filter: blur(12px);
}

.wrong-hero__copy,
.wrong-empty {
  display: grid;
  gap: 10px;
}

.wrong-hero__eyebrow,
.wrong-empty__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wrong-hero__title,
.wrong-empty__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.wrong-hero__text,
.wrong-empty__text {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.7;
}

.wrong-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.wrong-stat {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
}

.wrong-stat__label {
  color: var(--color-ink-soft);
  font-size: 0.82rem;
}

.wrong-stat__value {
  font-size: 1.2rem;
  color: var(--color-ink);
}

.wrong-toolbar {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.68);
}

.wrong-toolbar__group,
.wrong-toolbar__group--tags,
.wrong-card__chips,
.wrong-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wrong-toolbar__action {
  justify-self: start;
}

.wrong-filter,
.wrong-card__chip,
.wrong-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--color-ink-soft);
  cursor: pointer;
}

.wrong-filter {
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.wrong-filter:hover,
.wrong-filter--active {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.44);
  background: rgba(184, 242, 223, 0.62);
  color: var(--color-ink);
}

.wrong-list {
  display: grid;
  gap: 16px;
}

.wrong-card {
  display: grid;
  gap: 16px;
  padding: 22px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.18), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 253, 248, 0.84) 100%);
  box-shadow: 0 24px 42px -38px rgba(36, 50, 74, 0.32);
}

.wrong-card__head,
.wrong-card__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.wrong-card__chip,
.wrong-card__badge {
  cursor: default;
}

.wrong-card__chip--knowledge {
  background: rgba(219, 234, 254, 0.72);
  color: var(--color-ink);
}

.wrong-card__badge--alert {
  background: rgba(255, 231, 156, 0.84);
  color: #7c4d00;
}

.wrong-card__badge--warm {
  background: rgba(255, 195, 218, 0.72);
  color: #8b3b5a;
}

.wrong-card__badge--planned {
  background: rgba(219, 234, 254, 0.78);
  color: #285ea8;
}

.wrong-card__badge--calm {
  background: rgba(184, 242, 223, 0.72);
  color: #0f766e;
}

.wrong-card__copy {
  display: grid;
  gap: 8px;
}

.wrong-card__title {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.45;
}

.wrong-card__meta,
.wrong-card__text {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.7;
}

.wrong-card__stats {
  align-items: stretch;
}

.wrong-card__stat {
  flex: 1;
  display: grid;
  gap: 6px;
  padding: 14px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
}

.wrong-card__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
}

.wrong-card__stat-value {
  font-size: 1rem;
  color: var(--color-ink);
}

.wrong-card__link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
}

.wrong-card__link:hover,
.wrong-card__link:focus-visible {
  color: #0f766e;
}

.wrong-empty {
  padding: 22px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.82);
}

@media (max-width: 980px) {
  .wrong-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .wrong-hero,
  .wrong-card,
  .wrong-empty {
    padding: 20px;
    border-radius: 24px;
  }

  .wrong-hero__stats,
  .wrong-card__stats {
    grid-template-columns: 1fr;
  }

  .wrong-card__stats {
    display: grid;
  }
}
</style>
