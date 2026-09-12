<script setup>
import { computed, ref, watch } from "vue";
import ModalDialog from "../ModalDialog.vue";
import { fetchQuestionCoverage } from "../../services/questionsApi";
import {
  WEAK_POINT_THIN_POOL_THRESHOLD,
  getWeakPointSubjects,
  getWeakPoints,
  matchWeakPoints
} from "../../utils/studyWeakPoints";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  defaultGrade: {
    type: String,
    default: "二年级"
  }
});

const emit = defineEmits(["update:modelValue", "start-practice"]);

const activeGrade = ref(props.defaultGrade);
const activeSubject = ref("");
const searchKeyword = ref("");
const coverageByTag = ref({});
const isLoadingCoverage = ref(false);

const gradeOptions = computed(() => [props.defaultGrade]);
const subjectOptions = computed(() => getWeakPointSubjects(activeGrade.value));
const allWeakPoints = computed(() => getWeakPoints(activeGrade.value, activeSubject.value));
const visibleWeakPoints = computed(() => matchWeakPoints(allWeakPoints.value, searchKeyword.value));

const hasNoSubjectSelected = computed(() => !activeSubject.value);

// 打开面板时默认落到第一个学科，避免出现空白面板。
watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      return;
    }

    if (!subjectOptions.value.includes(activeSubject.value)) {
      activeSubject.value = subjectOptions.value[0] || "";
    }

    void loadCoverage();
  }
);

watch(activeSubject, () => {
  if (props.modelValue) {
    void loadCoverage();
  }
});

async function loadCoverage() {
  const targets = allWeakPoints.value.map((weakPoint) => ({
    key: weakPoint.id,
    subject: activeSubject.value,
    grade: activeGrade.value,
    knowledgeTag: weakPoint.knowledgeTag
  }));

  if (!targets.length) {
    coverageByTag.value = {};
    return;
  }

  isLoadingCoverage.value = true;

  try {
    const payload = await fetchQuestionCoverage({ targets });
    const nextCoverage = {};

    for (const entry of payload.data) {
      nextCoverage[entry.key] = Number(entry.count || 0);
    }

    coverageByTag.value = nextCoverage;
  } catch {
    // 题量只是辅助信息，取不到时不影响选择，按“未知”展示。
    coverageByTag.value = {};
  } finally {
    isLoadingCoverage.value = false;
  }
}

function getQuestionCount(weakPoint) {
  const count = coverageByTag.value[weakPoint.id];
  return Number.isFinite(count) ? count : null;
}

function formatQuestionCount(weakPoint) {
  if (isLoadingCoverage.value && getQuestionCount(weakPoint) === null) {
    return "统计中…";
  }

  const count = getQuestionCount(weakPoint);

  if (count === null) {
    return "题量未知";
  }

  if (count === 0) {
    return "暂无题目";
  }

  return `${count} 道题`;
}

function isThinPool(weakPoint) {
  const count = getQuestionCount(weakPoint);
  return count !== null && count > 0 && count < WEAK_POINT_THIN_POOL_THRESHOLD;
}

function isUnavailable(weakPoint) {
  return getQuestionCount(weakPoint) === 0;
}

function selectSubject(subject) {
  activeSubject.value = subject;
  searchKeyword.value = "";
}

function startPractice(weakPoint) {
  if (isUnavailable(weakPoint)) {
    return;
  }

  emit("start-practice", {
    weakPoint,
    grade: activeGrade.value,
    subject: activeSubject.value
  });
  emit("update:modelValue", false);
}

function close() {
  emit("update:modelValue", false);
}
</script>

<template>
  <ModalDialog
    :model-value="modelValue"
    title-id="weak-point-picker-title"
    heading-eyebrow="专项强化"
    heading-title="今天想加强哪一点"
    heading-description="选一个老师说到的薄弱点，只练这一类题，不掺别的内容。"
    close-label="关闭专项强化选择"
    panel-class="weak-point-modal"
    initial-focus-selector="[data-modal-primary]"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="weak-point">
      <div class="weak-point__filters">
        <div class="weak-point__filter-group">
          <span class="weak-point__filter-label">年级</span>
          <div class="weak-point__chip-row">
            <span
              v-for="grade in gradeOptions"
              :key="`weak-grade-${grade}`"
              class="weak-point__chip weak-point__chip--active"
            >
              {{ grade }}
            </span>
          </div>
        </div>

        <div class="weak-point__filter-group">
          <span class="weak-point__filter-label">学科</span>
          <div class="weak-point__chip-row">
            <button
              v-for="subject in subjectOptions"
              :key="`weak-subject-${subject}`"
              :class="['weak-point__chip', 'weak-point__chip--button', { 'weak-point__chip--active': subject === activeSubject }]"
              type="button"
              :data-modal-primary="subject === activeSubject ? 'true' : null"
              @click="selectSubject(subject)"
            >
              {{ subject }}
            </button>
          </div>
        </div>

        <label class="weak-point__search">
          <span class="weak-point__filter-label">按老师的说法搜</span>
          <input
            v-model="searchKeyword"
            class="weak-point__search-input"
            type="search"
            placeholder="例如：乘数位置关系 / 几个几 / 平均分"
          />
        </label>
      </div>

      <div v-if="hasNoSubjectSelected" class="weak-point__empty">
        <p>先选一个学科，就能看到可以加强的知识点。</p>
      </div>

      <div v-else-if="!visibleWeakPoints.length" class="weak-point__empty">
        <p>没有匹配“{{ searchKeyword }}”的专项。</p>
        <button class="weak-point__reset" type="button" @click="searchKeyword = ''">
          清空搜索
        </button>
      </div>

      <div v-else class="weak-point__grid">
        <button
          v-for="weakPoint in visibleWeakPoints"
          :key="weakPoint.id"
          :class="['weak-point__card', { 'weak-point__card--unavailable': isUnavailable(weakPoint) }]"
          type="button"
          :disabled="isUnavailable(weakPoint)"
          @click="startPractice(weakPoint)"
        >
          <div class="weak-point__card-head">
            <strong class="weak-point__card-title">{{ weakPoint.label }}</strong>
            <span
              :class="[
                'weak-point__count',
                { 'weak-point__count--thin': isThinPool(weakPoint) },
                { 'weak-point__count--empty': isUnavailable(weakPoint) }
              ]"
            >
              {{ formatQuestionCount(weakPoint) }}
            </span>
          </div>

          <p class="weak-point__hint">{{ weakPoint.hint }}</p>

          <span v-if="isThinPool(weakPoint)" class="weak-point__thin-note">
            题目偏少，可以多练几轮加深印象
          </span>
          <span v-else-if="isUnavailable(weakPoint)" class="weak-point__thin-note">
            这一类暂时还没有题目
          </span>
        </button>
      </div>

      <div class="weak-point__footer">
        <button class="weak-point__cancel" type="button" @click="close">
          先不练
        </button>
      </div>
    </div>
  </ModalDialog>
</template>

<style scoped>
.weak-point {
  display: grid;
  gap: 18px;
}

.weak-point__filters {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
}

.weak-point__filter-group,
.weak-point__search {
  display: grid;
  gap: 8px;
}

.weak-point__filter-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.weak-point__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weak-point__chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 6px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
}

.weak-point__chip--button {
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.weak-point__chip--button:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
}

.weak-point__chip--active {
  border-color: rgba(124, 216, 184, 0.6);
  background: linear-gradient(135deg, rgba(184, 242, 223, 0.92), rgba(173, 235, 255, 0.86));
}

.weak-point__search-input {
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--color-ink);
  font: inherit;
}

.weak-point__search-input:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.7);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.16);
}

.weak-point__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.weak-point__card {
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.2), transparent 40%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(252, 254, 255, 0.9) 100%);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  transition:
    transform 170ms ease,
    border-color 170ms ease,
    box-shadow 170ms ease;
}

.weak-point__card:hover {
  transform: translateY(-2px);
  border-color: rgba(124, 216, 184, 0.5);
  box-shadow: 0 20px 30px -28px rgba(36, 50, 74, 0.4);
}

.weak-point__card:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.16);
}

.weak-point__card--unavailable {
  cursor: not-allowed;
  opacity: 0.62;
}

.weak-point__card--unavailable:hover {
  transform: none;
  border-color: rgba(36, 50, 74, 0.1);
  box-shadow: none;
}

.weak-point__card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.weak-point__card-title {
  font-size: 1.02rem;
  line-height: 1.3;
}

.weak-point__count {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(184, 242, 223, 0.5);
  color: var(--color-ink);
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}

.weak-point__count--thin {
  background: rgba(255, 231, 156, 0.62);
}

.weak-point__count--empty {
  background: rgba(219, 234, 254, 0.7);
}

.weak-point__hint {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  line-height: 1.55;
}

.weak-point__thin-note {
  color: rgba(122, 88, 22, 0.92);
  font-size: 0.8rem;
  font-weight: 700;
}

.weak-point__empty {
  display: grid;
  gap: 10px;
  justify-items: start;
  padding: 20px;
  border: 1.5px dashed rgba(36, 50, 74, 0.16);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.7);
}

.weak-point__empty p {
  margin: 0;
  color: var(--color-ink-soft);
}

.weak-point__reset,
.weak-point__cancel {
  min-height: 42px;
  padding: 9px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.weak-point__footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .weak-point__grid {
    grid-template-columns: 1fr;
  }
}
</style>
