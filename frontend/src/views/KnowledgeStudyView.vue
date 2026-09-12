<script setup>
import { computed } from "vue";
import StudyHeroPanel from "../components/study/StudyHeroPanel.vue";
import StudyLessonCard from "../components/study/StudyLessonCard.vue";
import StudyStationRail from "../components/study/StudyStationRail.vue";
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

const emit = defineEmits(["start-practice", "open-wrong-review", "open-study-lesson", "open-study-map"]);

const {
  selectedGradeFilter,
  selectedLessonId,
  systematicSectionsAvailable,
  selectedSystematicKnowledgeItem,
  currentGradeCover,
  heroOverviewStats,
  stationRailGroups,
  dueStations,
  dueQuestionCount,
  emptyStateTitle,
  emptyStateText
} = useKnowledgeStudyFilters(props);

const { getLessonNarrationMeta } = useStudyLessonNarrationMeta({
  knowledgeItems: computed(() => props.knowledgeItems),
  selectedGradeFilter: computed(() => props.initialGradeFilter),
  selectedSystematicKnowledgeItem
});

function openStudyLesson(item) {
  emit("open-study-lesson", item);
}
</script>

<template>
  <section class="study-hub">
    <StudyHeroPanel
      :current-grade-cover="currentGradeCover"
      :hero-overview-stats="heroOverviewStats"
      :systematic-sections-available="systematicSectionsAvailable"
      @open-map="$emit('open-study-map')"
    />

    <div class="study-hub__main">
      <div v-if="selectedSystematicKnowledgeItem" class="study-hub__columns">
        <div class="study-hub__left">
          <StudyLessonCard
            :item="selectedSystematicKnowledgeItem"
            :get-lesson-narration-meta="getLessonNarrationMeta"
            @start-practice="$emit('start-practice', $event)"
            @open-wrong-review="$emit('open-wrong-review', $event)"
            @open-study-lesson="openStudyLesson"
          />

          <section v-if="dueQuestionCount > 0" class="study-due-strip">
            <p class="study-due-strip__text">
              这条路线还有 <strong>{{ dueStations.length }}</strong> 个小站、共
              <strong>{{ dueQuestionCount }}</strong> 题待补强
            </p>
            <button class="btn-cartoon btn-cartoon--yellow" type="button" @click="$emit('open-wrong-review')">
              去看待补强题
            </button>
          </section>
        </div>

        <StudyStationRail
          :rail-groups="stationRailGroups"
          :current-lesson-id="selectedLessonId"
          @select-lesson="selectedLessonId = $event"
        />
      </div>

      <section v-else class="study-empty">
        <p class="study-empty__eyebrow">Ready To Learn</p>
        <h3 class="study-empty__title">{{ emptyStateTitle }}</h3>
        <p class="study-empty__text">{{ emptyStateText }}</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
/* 一屏布局：Hero 横条在顶部，当前小站卡在剩余空间里垂直居中 */
.study-hub {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100dvh - 120px);
}

.study-hub__main {
  flex: 1;
  display: grid;
  align-items: center;
}

/* 双栏：左主卡（+待补强快捷条）+ 右“本册小站”切换栏，填实横向留白 */
.study-hub__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(264px, 316px);
  gap: 16px;
  align-items: start;
  width: 100%;
}

.study-hub__left {
  display: grid;
  align-content: start;
  gap: 14px;
}

.study-due-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 18px;
  border: 1.5px dashed rgba(255, 174, 0, 0.38);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.42) 0%, transparent 40%),
    linear-gradient(180deg, rgba(255, 253, 248, 0.94) 0%, rgba(255, 249, 235, 0.9) 100%);
  box-shadow: 0 18px 30px -30px rgba(36, 50, 74, 0.3);
}

.study-due-strip__text {
  margin: 0;
  color: var(--color-ink);
  font-size: 0.94rem;
  line-height: 1.55;
}

.study-due-strip__text strong {
  font-weight: 900;
}

.study-due-strip .btn-cartoon {
  width: auto;
}

.study-empty {
  width: 100%;
  max-width: 1080px;
  margin-inline: auto;
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

@media (max-width: 1080px) {
  .study-hub__columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .study-hub {
    gap: 14px;
  }

  .study-empty {
    padding: 18px;
    border-radius: 26px;
  }
}
</style>
