<script setup>
import { computed, ref, watch } from "vue";
import ModalDialog from "./ModalDialog.vue";

// 「自由练习」的选择弹窗：和专项强化的弹窗同一个模式。
// 三种练法里，按年级 / 按学科可以展开先选好范围再开始（选项列表由首页透传，
// 与答题页的出题设置共用同一组常量）；随便练没有范围可调，点了直接进。
// 年级 / 学期 / 学科的约束（英语不开放一年级、非具体年级不选学期）
// 由 useTriviaApp 里的 watch 统一兜底，这里只负责展示和上报选择。
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  options: {
    type: Array,
    default: () => []
  },
  gradeOptions: {
    type: Array,
    default: () => []
  },
  semesterOptions: {
    type: Array,
    default: () => []
  },
  subjectOptions: {
    type: Array,
    default: () => []
  },
  subjectGradeOptions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["update:modelValue", "start"]);

const gradePracticeGrade = defineModel("gradePracticeGrade", { default: "三年级" });
const gradePracticeSemester = defineModel("gradePracticeSemester", { default: "上册" });
const subjectPracticeSubject = defineModel("subjectPracticeSubject", { default: "数学" });
const subjectPracticeGrade = defineModel("subjectPracticeGrade", { default: "全部年级" });
const subjectPracticeSemester = defineModel("subjectPracticeSemester", { default: "上册" });

const EXPANDABLE_OPTIONS = new Set(["grade-practice", "subject-practice"]);
const expandedOption = ref("");

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      return;
    }

    expandedOption.value = "";
  }
);

const isGradeSemesterVisible = computed(() => props.gradeOptions.includes(gradePracticeGrade.value));
const isSubjectSemesterVisible = computed(() => props.gradeOptions.includes(subjectPracticeGrade.value));
const gradePracticeStartLabel = computed(() => {
  const segments = [gradePracticeGrade.value];

  if (isGradeSemesterVisible.value) {
    segments.push(gradePracticeSemester.value);
  }

  return `用 ${segments.join(" · ")} 开始练习`;
});
const subjectPracticeStartLabel = computed(() => {
  const segments = [subjectPracticeSubject.value, subjectPracticeGrade.value];

  if (isSubjectSemesterVisible.value) {
    segments.push(subjectPracticeSemester.value);
  }

  return `用 ${segments.join(" · ")} 开始练习`;
});

function isExpanded(optionId) {
  return expandedOption.value === optionId;
}

function handleToggle(option) {
  if (!EXPANDABLE_OPTIONS.has(option?.id)) {
    startPractice(option?.id);
    return;
  }

  expandedOption.value = isExpanded(option.id) ? "" : option.id;
}

function startPractice(optionId) {
  if (!optionId) {
    return;
  }

  emit("start", optionId);
  emit("update:modelValue", false);
}
</script>

<template>
  <ModalDialog
    :model-value="modelValue"
    title-id="practice-scope-title"
    heading-eyebrow="自由练习"
    heading-title="今天想怎么练？"
    heading-description="按年级、按学科可以先选好范围再开始；随便练点了就直接进答题，进去之后还能随时调整题量、难度和限时。"
    close-label="关闭自由练习选择"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="practice-scope">
      <div
        v-for="(option, index) in options"
        :key="option.id"
        :class="['practice-scope__option', { 'practice-scope__option--open': isExpanded(option.id) }]"
      >
        <button
          class="practice-scope__toggle"
          type="button"
          :data-modal-primary="index === 0 ? 'true' : null"
          :aria-expanded="EXPANDABLE_OPTIONS.has(option.id) ? isExpanded(option.id) : null"
          :aria-label="option.ariaLabel"
          @click="handleToggle(option)"
        >
          <span class="practice-scope__copy">
            <strong class="practice-scope__label">{{ option.label }}</strong>
            <span class="practice-scope__meta">{{ option.meta }}</span>
          </span>
          <span class="practice-scope__arrow" aria-hidden="true">{{ EXPANDABLE_OPTIONS.has(option.id) ? "▾" : "→" }}</span>
        </button>

        <div v-if="isExpanded(option.id)" class="practice-scope__picker">
          <div v-if="option.id === 'grade-practice'" class="practice-scope__picker-body">
            <div class="practice-scope__filter">
              <span class="practice-scope__filter-label">年级</span>
              <div class="practice-scope__chips">
                <button
                  v-for="grade in gradeOptions"
                  :key="`scope-grade-${grade}`"
                  :class="['practice-scope__chip', { 'practice-scope__chip--active': grade === gradePracticeGrade }]"
                  type="button"
                  :aria-pressed="grade === gradePracticeGrade"
                  @click="gradePracticeGrade = grade"
                >
                  {{ grade }}
                </button>
              </div>
            </div>

            <div class="practice-scope__filter">
              <span class="practice-scope__filter-label">学期</span>
              <div class="practice-scope__chips">
                <button
                  v-for="semester in semesterOptions"
                  :key="`scope-grade-semester-${semester}`"
                  :class="['practice-scope__chip', { 'practice-scope__chip--active': semester === gradePracticeSemester }]"
                  type="button"
                  :aria-pressed="semester === gradePracticeSemester"
                  @click="gradePracticeSemester = semester"
                >
                  {{ semester }}
                </button>
              </div>
            </div>

            <button class="btn-cartoon btn-cartoon--mint practice-scope__start" type="button" @click="startPractice('grade-practice')">
              {{ gradePracticeStartLabel }}
            </button>
          </div>

          <div v-else-if="option.id === 'subject-practice'" class="practice-scope__picker-body">
            <div class="practice-scope__filter">
              <span class="practice-scope__filter-label">学科</span>
              <div class="practice-scope__chips">
                <button
                  v-for="subject in subjectOptions"
                  :key="`scope-subject-${subject}`"
                  :class="['practice-scope__chip', { 'practice-scope__chip--active': subject === subjectPracticeSubject }]"
                  type="button"
                  :aria-pressed="subject === subjectPracticeSubject"
                  @click="subjectPracticeSubject = subject"
                >
                  {{ subject }}
                </button>
              </div>
            </div>

            <div class="practice-scope__filter">
              <span class="practice-scope__filter-label">年级</span>
              <div class="practice-scope__chips">
                <button
                  v-for="grade in subjectGradeOptions"
                  :key="`scope-subject-grade-${grade}`"
                  :class="['practice-scope__chip', { 'practice-scope__chip--active': grade === subjectPracticeGrade }]"
                  type="button"
                  :aria-pressed="grade === subjectPracticeGrade"
                  @click="subjectPracticeGrade = grade"
                >
                  {{ grade }}
                </button>
              </div>
            </div>

            <div v-if="isSubjectSemesterVisible" class="practice-scope__filter">
              <span class="practice-scope__filter-label">学期</span>
              <div class="practice-scope__chips">
                <button
                  v-for="semester in semesterOptions"
                  :key="`scope-subject-semester-${semester}`"
                  :class="['practice-scope__chip', { 'practice-scope__chip--active': semester === subjectPracticeSemester }]"
                  type="button"
                  :aria-pressed="semester === subjectPracticeSemester"
                  @click="subjectPracticeSemester = semester"
                >
                  {{ semester }}
                </button>
              </div>
            </div>

            <button class="btn-cartoon btn-cartoon--mint practice-scope__start" type="button" @click="startPractice('subject-practice')">
              {{ subjectPracticeStartLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalDialog>
</template>

<style scoped>
.practice-scope {
  display: grid;
  gap: 12px;
}

.practice-scope__option {
  overflow: hidden;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.16), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(252, 254, 255, 0.9) 100%);
  transition:
    border-color 170ms ease,
    box-shadow 170ms ease;
}

.practice-scope__option--open {
  border-color: rgba(124, 216, 184, 0.55);
  box-shadow: 0 20px 30px -28px rgba(36, 50, 74, 0.4);
}

.practice-scope__toggle {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 68px;
  padding: 14px 18px;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.practice-scope__toggle:focus-visible {
  outline: none;
}

.practice-scope__option:has(.practice-scope__toggle:focus-visible) {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.16);
}

.practice-scope__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.practice-scope__label {
  font-size: 1rem;
  font-weight: 900;
}

.practice-scope__meta {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
}

.practice-scope__arrow {
  flex-shrink: 0;
  color: var(--color-ink-soft);
  font-size: 1.05rem;
  font-weight: 900;
  transition: transform 170ms ease;
}

.practice-scope__option--open .practice-scope__arrow {
  transform: rotate(180deg);
}

.practice-scope__picker {
  padding: 0 18px 16px;
}

.practice-scope__picker-body {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1.5px dashed rgba(36, 50, 74, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.practice-scope__filter {
  display: grid;
  gap: 8px;
}

.practice-scope__filter-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.practice-scope__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.practice-scope__chip {
  appearance: none;
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
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.practice-scope__chip:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
}

.practice-scope__chip:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.7);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.16);
}

.practice-scope__chip--active {
  border-color: rgba(124, 216, 184, 0.6);
  background: linear-gradient(135deg, rgba(184, 242, 223, 0.92), rgba(173, 235, 255, 0.86));
}

.practice-scope__start {
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .practice-scope__option,
  .practice-scope__arrow,
  .practice-scope__chip,
  .practice-scope__chip:hover {
    transition: none;
    transform: none;
  }
}
</style>
