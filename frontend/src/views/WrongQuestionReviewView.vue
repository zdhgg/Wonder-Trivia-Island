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
const activeGrade = ref("");

const GRADE_ORDER = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];

function gradeRank(grade) {
  const index = GRADE_ORDER.indexOf(grade);

  return index === -1 ? GRADE_ORDER.length : index;
}

const statusOptions = computed(() => [
  { value: "due", label: "今天到期", count: props.wrongQuestions.filter((item) => item.isReviewDue).length },
  { value: "scheduled", label: "已排队", count: props.wrongQuestions.filter((item) => item.isReviewScheduled).length },
  { value: "reviewing", label: "回温中", count: props.wrongQuestions.filter((item) => item.reviewStatus === "reviewing").length },
  { value: "mastered", label: "已回稳", count: props.wrongQuestions.filter((item) => item.reviewStatus === "mastered").length },
  { value: "all", label: "全部", count: props.wrongQuestions.length }
]);

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

const gradeOptions = computed(() => {
  const counts = new Map();

  for (const item of props.wrongQuestions) {
    const grade = String(item?.grade || "").trim();

    if (grade) {
      counts.set(grade, (counts.get(grade) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => gradeRank(a[0]) - gradeRank(b[0]))
    .map(([grade, count]) => ({ value: grade, label: `${grade}（${count} 题）` }));
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
            : item.reviewStatus === activeStatus.value;
    const matchesKnowledgeTag = activeKnowledgeTag.value ? item.knowledgeTag === activeKnowledgeTag.value : true;
    const matchesGrade = activeGrade.value ? item.grade === activeGrade.value : true;

    return matchesStatus && matchesKnowledgeTag && matchesGrade;
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

// 错题记录会被服务端合并等流程改写，选中的年级可能不再存在，此时回落到「全部年级」。
watch(gradeOptions, (options) => {
  if (activeGrade.value && !options.some((option) => option.value === activeGrade.value)) {
    activeGrade.value = "";
  }
});

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
      <p class="wrong-hero__eyebrow">Review Queue</p>
      <h2 class="wrong-hero__title">{{ props.overview.title }}</h2>
      <p class="wrong-hero__text">{{ props.overview.description }}</p>
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
          <span class="wrong-filter__count">{{ item.count }}</span>
        </button>
      </div>

      <div v-if="wrongQuestions.length" class="wrong-toolbar__row">
        <div class="wrong-toolbar__selects">
          <label class="wrong-toolbar__select">
            <span class="wrong-toolbar__select-label">按年级</span>
            <select v-model="activeGrade" class="wrong-toolbar__select-control" aria-label="按年级筛选错题">
              <option value="">全部年级</option>
              <option v-for="item in gradeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label v-if="knowledgeTagOptions.length" class="wrong-toolbar__select">
            <span class="wrong-toolbar__select-label">按知识点</span>
            <select v-model="activeKnowledgeTag" class="wrong-toolbar__select-control" aria-label="按知识点筛选错题">
              <option value="">全部知识点</option>
              <option v-for="item in knowledgeTagOptions" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
        </div>

        <button class="btn-cartoon btn-cartoon--yellow" type="button" :disabled="!reviewQuestionIds.length" @click="emitBatchReview">
          {{ reviewQuestionIds.length ? `开始温习 ${reviewQuestionIds.length} 题` : "暂无可温习题目" }}
        </button>
      </div>
    </section>

    <section v-if="filteredQuestions.length" class="wrong-list" aria-label="错题记录">
      <article v-for="item in filteredQuestions" :key="item.questionId" class="wrong-card">
        <div class="wrong-card__head">
          <div class="wrong-card__chips">
            <span class="wrong-card__chip">{{ item.subject }}</span>
            <span v-if="item.grade" class="wrong-card__chip">{{ item.grade }}</span>
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
          <p class="wrong-card__footnote">
            错 {{ item.wrongCount }} 次 · 连对 {{ item.reviewCorrectStreak }} · 掌握 {{ item.masteryPercent }}% · 下次温习：{{ item.reviewScheduleLabel }}
          </p>
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
      <p class="wrong-empty__text">可以切换状态、年级或知识点筛选，也可以先回去做一轮练习，新的错题会自动收进来。</p>
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
  gap: 10px;
  padding: 26px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 195, 218, 0.24), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.82) 100%);
  box-shadow: 0 28px 48px -38px rgba(36, 50, 74, 0.38);
  backdrop-filter: blur(12px);
}

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

.wrong-toolbar {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.68);
}

.wrong-toolbar__group,
.wrong-toolbar__selects,
.wrong-toolbar__row,
.wrong-card__chips,
.wrong-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.wrong-toolbar__row {
  justify-content: space-between;
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
  gap: 6px;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.wrong-filter__count {
  font-size: 0.82rem;
  opacity: 0.72;
}

.wrong-filter:hover,
.wrong-filter--active {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.44);
  background: rgba(184, 242, 223, 0.62);
  color: var(--color-ink);
}

.wrong-toolbar__select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.wrong-toolbar__select-label {
  color: var(--color-ink-soft);
  font-size: 0.86rem;
}

.wrong-toolbar__select-control {
  max-width: 240px;
  min-height: 36px;
  padding: 4px 12px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font: inherit;
  cursor: pointer;
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

.wrong-card__head {
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

.wrong-card__footnote {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.86rem;
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

@media (max-width: 720px) {
  .wrong-hero,
  .wrong-card,
  .wrong-empty {
    padding: 20px;
    border-radius: 24px;
  }

  .wrong-toolbar__row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
