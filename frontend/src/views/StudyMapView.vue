<script setup>
import { computed } from "vue";
import StudyGradeOverview from "../components/study/StudyGradeOverview.vue";
import StudyGradeMapPanel from "../components/study/StudyGradeMapPanel.vue";
import { getStudyGradeCoverConfig } from "../composables/study/useKnowledgeStudyFilters";

const props = defineProps({
  sections: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  studyResume: {
    type: Object,
    default: null
  },
  selectedLessonId: {
    type: String,
    default: ""
  },
  profileGrade: {
    type: String,
    default: ""
  },
  // 空串代表停在年级总览，否则只看该年级
  activeGrade: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["continue-lesson", "open-lesson", "select-grade", "back"]);

const currentGradeName = computed(() => {
  if (props.studyResume?.scopeText) {
    const grade = props.studyResume.scopeText.split(" · ")[0];
    if (grade) {
      return grade;
    }
  }

  return props.profileGrade;
});

// 全部六年路线按年级分组，依 1-6 年级顺序铺开
const gradeGroups = computed(() => {
  const byGrade = new Map();

  for (const section of props.sections) {
    const grade = String(section.grade || "").trim();

    if (!grade) {
      continue;
    }

    if (!byGrade.has(grade)) {
      byGrade.set(grade, []);
    }

    byGrade.get(grade).push(section);
  }

  return [...byGrade.entries()].map(([grade, sections]) => {
    const cover = getStudyGradeCoverConfig(grade);
    const modules = sections.flatMap((section) => section.subjects.flatMap((subject) => subject.modules));

    return {
      grade,
      glyph: cover.glyph,
      coverTitle: cover.title,
      tagline: cover.tagline,
      sections,
      stationCount: modules.length,
      dueStationCount: modules.filter((module) => Number(module.dueCount || 0) > 0).length,
      isCurrentGrade: grade === currentGradeName.value
    };
  });
});

const activeGradeGroup = computed(
  () => gradeGroups.value.find((group) => group.grade === String(props.activeGrade || "").trim()) || null
);

const continueCta = computed(() => {
  if (props.studyResume?.lessonId) {
    return {
      lessonId: props.studyResume.lessonId,
      label: `继续上次「${props.studyResume.lessonTitle}」`,
      hint: "接着上次的进度往下学"
    };
  }

  const targetGrade =
    gradeGroups.value.find((group) => group.grade === props.profileGrade) || gradeGroups.value[0] || null;
  const firstModule = targetGrade?.sections?.[0]?.subjects?.[0]?.modules?.[0];

  if (targetGrade && firstModule) {
    return {
      lessonId: firstModule.id,
      label: `从第一站「${firstModule.title}」开始`,
      hint: `${targetGrade.grade}的起点，顺着路线一站一站学`
    };
  }

  return null;
});
</script>

<template>
  <section class="study-map-page">
    <StudyGradeOverview
      v-if="!activeGradeGroup"
      :grade-groups="gradeGroups"
      :is-loading="isLoading"
      :continue-cta="continueCta"
      @select-grade="emit('select-grade', $event)"
      @continue-lesson="emit('continue-lesson', $event)"
      @back="emit('back')"
    />

    <StudyGradeMapPanel
      v-else
      :grade-group="activeGradeGroup"
      :study-resume="studyResume"
      :selected-lesson-id="selectedLessonId"
      @back-to-map="emit('select-grade', '')"
      @back="emit('back')"
      @continue-lesson="emit('continue-lesson', $event)"
      @open-lesson="emit('open-lesson', $event)"
    />
  </section>
</template>

<style scoped>
.study-map-page {
  display: grid;
  gap: 16px;
}
</style>
