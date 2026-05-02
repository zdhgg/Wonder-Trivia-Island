<script setup>
import { computed } from "vue";
import ModalDialog from "../ModalDialog.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  studyNavigatorSummary: { type: String, default: "" },
  filterResultSummary: { type: String, default: "" },
  gradeFilterOptions: { type: Array, default: () => [] },
  selectedGradeFilter: { type: String, default: "全部年级" },
  semesterFilterOptions: { type: Array, default: () => [] },
  selectedSemesterFilter: { type: String, default: "全部学期" },
  subjectFilterOptions: { type: Array, default: () => [] },
  selectedSubjectFilter: { type: String, default: "全部学科" },
  semesterCoverEntries: { type: Array, default: () => [] },
  selectedSystematicKnowledgeItem: { type: Object, default: null },
  lessonPickerGroups: { type: Array, default: () => [] }
});

const emit = defineEmits([
  "update:modelValue",
  "update:selectedGradeFilter",
  "update:selectedSemesterFilter",
  "update:selectedSubjectFilter",
  "reset-filters",
  "select-lesson"
]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});

function selectLesson(lessonId) {
  emit("select-lesson", lessonId);
}
</script>

<template>
  <ModalDialog
    v-model="isOpen"
    title-id="study-navigator-title"
    heading-title="切换内容"
    :heading-description="studyNavigatorSummary"
    close-label="关闭知识讲解切换"
    panel-class="study-navigator-modal"
    initial-focus-selector="[data-modal-primary]"
  >
    <div class="study-navigator">
      <section class="study-filters" aria-label="知识路线筛选">
        <div class="study-filters__head">
          <div class="study-filters__copy">
            <h3 class="study-filters__title">范围</h3>
            <p class="study-filters__text">{{ filterResultSummary }}</p>
          </div>

          <button class="study-filters__reset" type="button" @click="$emit('reset-filters')">
            回到默认看法
          </button>
        </div>

        <div class="study-filters__grid">
          <div class="study-filter-group">
            <span class="study-filter-group__label">年级</span>
            <div class="study-filter-group__chips">
              <button
                v-for="option in gradeFilterOptions"
                :key="option"
                type="button"
                :class="['study-filter-chip', { 'study-filter-chip--active': selectedGradeFilter === option }]"
                :data-modal-primary="option === selectedGradeFilter ? 'true' : null"
                @click="$emit('update:selectedGradeFilter', option)"
              >
                {{ option }}
              </button>
            </div>
          </div>

          <div class="study-filter-group">
            <span class="study-filter-group__label">学期</span>
            <div class="study-filter-group__chips">
              <button
                v-for="option in semesterFilterOptions"
                :key="option"
                type="button"
                :class="['study-filter-chip', { 'study-filter-chip--active': selectedSemesterFilter === option }]"
                @click="$emit('update:selectedSemesterFilter', option)"
              >
                {{ option }}
              </button>
            </div>
          </div>

          <div class="study-filter-group">
            <span class="study-filter-group__label">学科</span>
            <div class="study-filter-group__chips">
              <button
                v-for="option in subjectFilterOptions"
                :key="option"
                type="button"
                :class="['study-filter-chip', { 'study-filter-chip--active': selectedSubjectFilter === option }]"
                @click="$emit('update:selectedSubjectFilter', option)"
              >
                {{ option }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="semesterCoverEntries.length" class="study-semesters" aria-label="学期选择">
        <div class="study-semesters__head">
          <div class="study-semesters__copy">
            <h3 class="study-semesters__title">学期</h3>
            <p class="study-semesters__text">
              {{
                selectedSemesterFilter === "全部学期"
                  ? `先看 ${selectedGradeFilter} 整年路线，也可以直接点上册或下册。`
                  : `${selectedGradeFilter} · ${selectedSemesterFilter} 已选好，后面的小站都会跟着这一册走。`
              }}
            </p>
          </div>

          <button
            v-if="selectedSemesterFilter !== '全部学期'"
            class="study-semesters__reset"
            type="button"
            @click="$emit('update:selectedSemesterFilter', '全部学期')"
          >
            看整年总览
          </button>
        </div>

        <div class="study-semesters__grid">
          <button
            v-for="entry in semesterCoverEntries"
            :key="entry.id"
            :class="[
              'study-semester-card',
              `study-semester-card--${entry.theme}`,
              { 'study-semester-card--active': entry.isActive }
            ]"
            type="button"
            @click="$emit('update:selectedSemesterFilter', entry.semester)"
          >
            <div class="study-semester-card__top">
              <span class="study-semester-card__mark" aria-hidden="true">{{ entry.glyph }}</span>

              <div class="study-semester-card__copy">
                <span class="study-semester-card__eyebrow">{{ entry.coverLabel }}</span>
                <strong class="study-semester-card__title">{{ entry.title }}</strong>
              </div>
            </div>

            <p class="study-semester-card__prompt">{{ entry.prompt }}</p>

            <div class="study-semester-card__bottom">
              <span class="study-semester-card__meta">{{ entry.subjectLabel }}</span>
              <span class="study-semester-card__status">{{ entry.statusText }}</span>
            </div>
          </button>
        </div>
      </section>

      <section v-if="selectedSystematicKnowledgeItem" class="study-focus" aria-label="当前学习站">
        <div class="study-focus__head">
          <div class="study-focus__copy">
            <h3 class="study-focus__title">小站</h3>
            <p class="study-focus__text">当前是「{{ selectedSystematicKnowledgeItem.label }}」</p>
          </div>
        </div>

        <div class="study-focus__groups">
          <article v-for="sectionGroup in lessonPickerGroups" :key="sectionGroup.id" class="study-focus__group">
            <div class="study-focus__group-copy">
              <strong class="study-focus__group-title">{{ sectionGroup.title }}</strong>
            </div>

            <div class="study-focus__subject-stack">
              <section v-for="subjectGroup in sectionGroup.groups" :key="subjectGroup.id" class="study-focus__subject">
                <span class="study-focus__subject-label">{{ subjectGroup.title }}</span>
                <div class="study-focus__chips">
                  <button
                    v-for="lesson in subjectGroup.lessons"
                    :key="lesson.id"
                    type="button"
                    :class="['study-focus__chip', { 'study-focus__chip--active': selectedSystematicKnowledgeItem?.id === lesson.id }]"
                    @click="selectLesson(lesson.id)"
                  >
                    {{ lesson.label }}
                  </button>
                </div>
              </section>
            </div>
          </article>
        </div>
      </section>
    </div>
  </ModalDialog>
</template>

<style scoped>
:deep(.study-navigator-modal) {
  width: min(980px, 100%);
}

.study-navigator,
.study-filters,
.study-semesters,
.study-focus {
  display: grid;
  gap: 16px;
}

.study-filters,
.study-semesters,
.study-focus {
  position: relative;
  overflow: hidden;
  padding: 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.study-filters {
  background:
    radial-gradient(circle at top left, rgba(190, 240, 255, 0.22) 0%, rgba(190, 240, 255, 0) 32%),
    linear-gradient(180deg, rgba(250, 253, 255, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-semesters {
  background:
    radial-gradient(circle at top left, rgba(255, 231, 156, 0.18) 0%, rgba(255, 231, 156, 0) 34%),
    radial-gradient(circle at bottom right, rgba(190, 240, 255, 0.16) 0%, rgba(190, 240, 255, 0) 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(250, 253, 255, 0.9) 100%);
}

.study-focus {
  background:
    radial-gradient(circle at top left, rgba(184, 242, 223, 0.22) 0%, rgba(184, 242, 223, 0) 34%),
    radial-gradient(circle at bottom right, rgba(190, 240, 255, 0.18) 0%, rgba(190, 240, 255, 0) 32%),
    linear-gradient(180deg, rgba(251, 255, 253, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.study-filters__head,
.study-semesters__head,
.study-focus__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 18px;
}

.study-filters__copy,
.study-semesters__copy,
.study-focus__copy {
  display: grid;
  gap: 4px;
  max-width: 760px;
}

.study-filters__title,
.study-semesters__title,
.study-focus__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  line-height: 1.04;
  font-size: 1.45rem;
}

.study-filters__text,
.study-semesters__text,
.study-focus__text {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  line-height: 1.55;
}

.study-filters__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.study-filters__reset,
.study-semesters__reset {
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

.study-filters__reset:hover,
.study-semesters__reset:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.38);
  box-shadow: 0 14px 22px -22px rgba(36, 50, 74, 0.3);
}

.study-filter-group {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.study-filter-group__label {
  color: var(--color-ink);
  font-size: 0.94rem;
  font-weight: 800;
}

.study-filter-group__chips,
.study-focus__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.study-filter-chip {
  min-height: 38px;
  padding: 8px 13px;
  border: 1.5px solid rgba(87, 125, 167, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: rgba(52, 74, 98, 0.92);
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.study-filter-chip:hover,
.study-focus__chip:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
  box-shadow: 0 14px 22px -24px rgba(36, 50, 74, 0.3);
}

.study-filter-chip--active,
.study-focus__chip--active {
  border-color: rgba(86, 173, 255, 0.68);
  background: linear-gradient(135deg, rgba(184, 242, 223, 0.95), rgba(190, 240, 255, 0.9));
  color: #17384b;
  box-shadow: 0 18px 24px -26px rgba(36, 50, 74, 0.34);
}

.study-semesters__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.study-semester-card {
  display: grid;
  gap: 10px;
  min-height: 156px;
  padding: 16px;
  border: 1.5px solid rgba(87, 125, 167, 0.14);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(250, 253, 255, 0.84) 100%);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  box-shadow:
    0 18px 26px -28px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.study-semester-card--active {
  border-color: rgba(86, 173, 255, 0.58);
}

.study-semester-card--upper {
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.34), transparent 40%),
    radial-gradient(circle at bottom left, rgba(190, 240, 255, 0.18), transparent 32%),
    linear-gradient(180deg, rgba(255, 252, 244, 0.92) 0%, rgba(255, 255, 255, 0.84) 100%);
}

.study-semester-card--lower {
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.34), transparent 40%),
    radial-gradient(circle at bottom left, rgba(184, 242, 223, 0.18), transparent 32%),
    linear-gradient(180deg, rgba(247, 253, 255, 0.92) 0%, rgba(255, 255, 255, 0.84) 100%);
}

.study-semester-card--all {
  background:
    radial-gradient(circle at top right, rgba(219, 234, 254, 0.28), transparent 40%),
    linear-gradient(180deg, rgba(249, 252, 255, 0.92) 0%, rgba(255, 255, 255, 0.84) 100%);
}

.study-semester-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.study-semester-card__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.8);
  color: var(--color-ink);
  font-size: 1.02rem;
  font-weight: 900;
}

.study-semester-card__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.study-semester-card__eyebrow {
  color: var(--color-ink-soft);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-semester-card__title {
  color: var(--color-ink);
  font-size: 1.04rem;
  line-height: 1.35;
}

.study-semester-card__prompt {
  margin: 0;
  color: var(--color-ink);
  font-size: 0.9rem;
  line-height: 1.6;
  font-weight: 700;
}

.study-semester-card__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
  margin-top: auto;
}

.study-semester-card__meta {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
}

.study-semester-card__status {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(36, 50, 74, 0.08);
  color: var(--color-ink);
  font-size: 0.78rem;
  font-weight: 800;
}

.study-focus__groups {
  display: grid;
  gap: 14px;
}

.study-focus__group {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
}

.study-focus__group-copy {
  display: grid;
  gap: 4px;
}

.study-focus__group-title {
  color: var(--color-ink);
  font-size: 1rem;
}

.study-focus__subject-stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.study-focus__subject {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(87, 125, 167, 0.1);
  background:
    radial-gradient(circle at top right, rgba(190, 240, 255, 0.16), transparent 36%),
    rgba(255, 255, 255, 0.86);
}

.study-focus__subject-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.study-focus__chip {
  min-height: 42px;
  padding: 9px 14px;
  border: 1.5px solid rgba(87, 125, 167, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--color-ink);
  font-size: 0.9rem;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

@media (max-width: 1120px) {
  .study-filters__grid,
  .study-focus__subject-stack,
  .study-semesters__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .study-filters,
  .study-semesters,
  .study-focus {
    padding: 20px;
    border-radius: 28px;
  }

  .study-filters__head,
  .study-semesters__head,
  .study-focus__head {
    flex-direction: column;
    align-items: stretch;
  }

  .study-filters__reset,
  .study-semesters__reset {
    width: 100%;
  }
}
</style>
