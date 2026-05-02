<script setup>
import { computed } from "vue";
import CurriculumMapDialog from "../components/study/CurriculumMapDialog.vue";
import StudyHeroPanel from "../components/study/StudyHeroPanel.vue";
import StudyLessonSection from "../components/study/StudyLessonSection.vue";
import StudyNavigatorDialog from "../components/study/StudyNavigatorDialog.vue";
import { useKnowledgeLessonCards } from "../composables/study/useKnowledgeLessonCards";
import { useKnowledgeStudyFilters } from "../composables/study/useKnowledgeStudyFilters";
import { useStudyLessonNarrationMeta } from "../composables/study/useStudyLessonNarrationMeta";

const props = defineProps({
  overview: {
    type: Object,
    default: () => ({
      title: "知识小讲堂",
      description: "",
      stats: []
    })
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  systematicSections: {
    type: Array,
    default: () => []
  },
  initialGradeFilter: {
    type: String,
    default: ""
  },
  initialLessonId: {
    type: String,
    default: ""
  },
  knowledgeItems: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["start-practice", "open-wrong-review", "open-study-lesson"]);
const {
  expandedLessonIds,
  lessonContentStageById,
  selectedGradeFilter,
  selectedSemesterFilter,
  selectedSubjectFilter,
  selectedLessonId,
  expandedLessonContentIds,
  showRecordedCards,
  showRecommendedCards,
  isStudyNavigatorOpen,
  isCurriculumMapOpen,
  selectedMapSectionId,
  gradeFilterOptions,
  semesterFilterOptions,
  subjectFilterOptions,
  mapSectionOptions,
  systematicSectionsAvailable,
  curriculumRouteTitle,
  filterResultSummary,
  studyNavigatorSummary,
  activeMapSection,
  activeMapSectionOption,
  selectedSystematicKnowledgeItem,
  currentGradeCover,
  heroOverviewStats,
  semesterCoverEntries,
  lessonPickerGroups,
  knowledgeSections,
  emptyStateTitle,
  emptyStateText,
  resetFilters,
  selectLessonFromNavigator,
  getMapModuleStatus,
  getSubjectTheme,
  getSubjectGlyph
} = useKnowledgeStudyFilters(props);

const { getLessonNarrationMeta } = useStudyLessonNarrationMeta({
  knowledgeItems: computed(() => props.knowledgeItems),
  selectedGradeFilter,
  selectedSystematicKnowledgeItem
});

const {
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
} = useKnowledgeLessonCards({
  expandedLessonIds,
  lessonContentStageById,
  expandedLessonContentIds,
  showRecordedCards,
  showRecommendedCards,
  getLessonNarrationMeta
});

function openLessonFromMap(lessonId) {
  selectedLessonId.value = lessonId;
  isCurriculumMapOpen.value = false;
  emit("open-study-lesson", lessonId);
}

function openStudyLesson(item) {
  emit("open-study-lesson", item);
}
</script>

<template>
  <section class="study-hub">
    <StudyHeroPanel
      :current-grade-cover="currentGradeCover"
      :study-navigator-summary="studyNavigatorSummary"
      :hero-overview-stats="heroOverviewStats"
      :systematic-sections-available="systematicSectionsAvailable"
      @open-navigator="isStudyNavigatorOpen = true"
      @open-map="isCurriculumMapOpen = true"
    />

    <StudyLessonSection
      v-for="section in knowledgeSections"
      :key="section.id"
      :section="section"
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
      :toggle-section="toggleSection"
      @start-practice="$emit('start-practice', $event)"
      @open-wrong-review="$emit('open-wrong-review', $event)"
      @open-study-lesson="openStudyLesson"
    />

    <section v-if="!knowledgeSections.length && !systematicSectionsAvailable" class="study-empty">
      <p class="study-empty__eyebrow">Ready To Learn</p>
      <h3 class="study-empty__title">{{ emptyStateTitle }}</h3>
      <p class="study-empty__text">{{ emptyStateText }}</p>
    </section>

    <StudyNavigatorDialog
      v-model="isStudyNavigatorOpen"
      :study-navigator-summary="studyNavigatorSummary"
      :filter-result-summary="filterResultSummary"
      :grade-filter-options="gradeFilterOptions"
      :selected-grade-filter="selectedGradeFilter"
      :semester-filter-options="semesterFilterOptions"
      :selected-semester-filter="selectedSemesterFilter"
      :subject-filter-options="subjectFilterOptions"
      :selected-subject-filter="selectedSubjectFilter"
      :semester-cover-entries="semesterCoverEntries"
      :selected-systematic-knowledge-item="selectedSystematicKnowledgeItem"
      :lesson-picker-groups="lessonPickerGroups"
      @update:selected-grade-filter="selectedGradeFilter = $event"
      @update:selected-semester-filter="selectedSemesterFilter = $event"
      @update:selected-subject-filter="selectedSubjectFilter = $event"
      @reset-filters="resetFilters"
      @select-lesson="selectLessonFromNavigator"
    />

    <CurriculumMapDialog
      v-model="isCurriculumMapOpen"
      :curriculum-route-title="curriculumRouteTitle"
      :systematic-sections-available="systematicSectionsAvailable"
      :map-section-options="mapSectionOptions"
      :active-map-section="activeMapSection"
      :active-map-section-option="activeMapSectionOption"
      :selected-lesson-id="selectedLessonId"
      :selected-map-section-id="selectedMapSectionId"
      :get-subject-theme="getSubjectTheme"
      :get-subject-glyph="getSubjectGlyph"
      :get-map-module-status="getMapModuleStatus"
      @update:selected-map-section-id="selectedMapSectionId = $event"
      @open-lesson="openLessonFromMap"
    />
  </section>
</template>

<style scoped>
:deep(.study-navigator-modal) {
  width: min(980px, 100%);
}

:deep(.study-map-modal) {
  width: min(1040px, 100%);
}

.study-hub {
  display: grid;
  gap: 22px;
}

.study-empty {
  position: relative;
  order: 9;
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

.study-empty__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-empty__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.45rem;
  line-height: 1.04;
}

.study-empty__text {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.65;
}

@media (max-width: 720px) {
  .study-empty {
    padding: 18px;
    border-radius: 26px;
  }
}
</style>
