<script setup>
import { computed, ref, watch } from "vue";
import StudyMapSheet from "./StudyMapSheet.vue";

const props = defineProps({
  gradeGroup: {
    type: Object,
    required: true
  },
  studyResume: {
    type: Object,
    default: null
  },
  selectedLessonId: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["back", "back-to-map", "open-lesson", "continue-lesson"]);

function sectionHoldsLesson(section, lessonId) {
  if (!lessonId) {
    return false;
  }

  return (section.subjects || []).some((subject) =>
    (subject.modules || []).some((module) => module.id === lessonId)
  );
}

// 一册只展示当前选中的学期，默认跟上次学到的那一册对齐
const semesters = computed(() => [...new Set((props.gradeGroup.sections || []).map((section) => section.semester))]);
const activeSemester = ref("");

function resolveDefaultSemester() {
  const sections = props.gradeGroup.sections || [];
  const resumeSection = sections.find((section) => sectionHoldsLesson(section, props.studyResume?.lessonId));

  return resumeSection?.semester || sections[0]?.semester || "";
}

watch(
  () => props.gradeGroup.grade,
  () => {
    activeSemester.value = resolveDefaultSemester();
  },
  { immediate: true }
);

const visibleSections = computed(() =>
  (props.gradeGroup.sections || []).filter((section) => section.semester === activeSemester.value)
);

const gradeResume = computed(() => {
  const lessonId = String(props.studyResume?.lessonId || "").trim();

  if (!lessonId) {
    return null;
  }

  const inGrade = (props.gradeGroup.sections || []).some((section) => sectionHoldsLesson(section, lessonId));

  if (!inGrade) {
    return null;
  }

  return {
    lessonId,
    label: `继续上次「${props.studyResume.lessonTitle}」`,
    hint: "接着上次的进度往下学"
  };
});

const panelContinueCta = computed(() => {
  if (gradeResume.value) {
    return gradeResume.value;
  }

  const firstModule = visibleSections.value[0]?.subjects?.[0]?.modules?.[0];

  if (!firstModule) {
    return null;
  }

  return {
    lessonId: firstModule.id,
    label: `从第一站「${firstModule.title}」开始`,
    hint: `${activeSemester.value}的起点，顺着路线一站一站学`
  };
});
</script>

<template>
  <section class="grade-panel">
    <nav class="grade-panel__crumbs" aria-label="整册地图位置">
      <button class="grade-panel__crumb" type="button" @click="emit('back-to-map')">整册地图</button>
      <span class="grade-panel__crumb-separator" aria-hidden="true">›</span>
      <span class="grade-panel__crumb-current" aria-current="page">{{ gradeGroup.grade }}</span>

      <button class="grade-panel__back" type="button" @click="emit('back')">返回讲堂</button>
    </nav>

    <header class="grade-panel__head">
      <div class="grade-panel__identity">
        <span class="grade-panel__glyph" aria-hidden="true">{{ gradeGroup.glyph }}</span>
        <div class="grade-panel__copy">
          <p class="grade-panel__eyebrow">{{ gradeGroup.grade }}专区</p>
          <h1 class="grade-panel__title">{{ gradeGroup.grade }} · {{ gradeGroup.coverTitle }}</h1>
          <p v-if="gradeGroup.tagline" class="grade-panel__tagline">{{ gradeGroup.tagline }}</p>
        </div>
      </div>

      <div class="grade-panel__stats" aria-label="年级概况">
        <span class="grade-panel__stat">{{ gradeGroup.sections.length }} 册</span>
        <span class="grade-panel__stat">{{ gradeGroup.stationCount }} 站</span>
        <span v-if="gradeGroup.dueStationCount" class="grade-panel__stat grade-panel__stat--alert">
          {{ gradeGroup.dueStationCount }} 站待回看
        </span>
      </div>
    </header>

    <button
      v-if="panelContinueCta"
      class="map-continue"
      type="button"
      :data-modal-primary="'true'"
      @click="emit('continue-lesson', panelContinueCta.lessonId)"
    >
      <span class="map-continue__play" aria-hidden="true">▶</span>
      <span class="map-continue__copy">
        <strong class="map-continue__label">{{ panelContinueCta.label }}</strong>
        <span class="map-continue__hint">{{ panelContinueCta.hint }}</span>
      </span>
    </button>

    <div v-if="semesters.length > 1" class="map-semester-tabs" role="tablist" aria-label="选择册别">
      <button
        v-for="semester in semesters"
        :key="semester"
        :class="['map-semester-tab', { 'map-semester-tab--active': semester === activeSemester }]"
        type="button"
        role="tab"
        :aria-selected="semester === activeSemester"
        @click="activeSemester = semester"
      >
        {{ gradeGroup.grade }}{{ semester }}
      </button>
    </div>

    <div class="grade-panel__sheets">
      <StudyMapSheet
        v-for="section in visibleSections"
        :key="section.id"
        :section="section"
        :selected-lesson-id="selectedLessonId"
        :resume-lesson-id="String(studyResume?.lessonId || '')"
        @open-lesson="emit('open-lesson', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.grade-panel {
  display: grid;
  gap: 16px;
}

.grade-panel__crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.grade-panel__crumb,
.grade-panel__back {
  min-height: 40px;
  padding: 8px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
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

.grade-panel__crumb:hover,
.grade-panel__back:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.5);
  box-shadow: 0 16px 24px -22px rgba(36, 50, 74, 0.36);
}

.grade-panel__crumb:focus-visible,
.grade-panel__back:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.82);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.grade-panel__crumb-separator {
  color: var(--color-ink-soft);
  font-weight: 800;
}

.grade-panel__crumb-current {
  color: var(--color-ink);
  font-weight: 900;
}

.grade-panel__back {
  margin-left: auto;
}

.grade-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 18px;
  padding: 20px 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(190, 240, 255, 0.24) 0%, transparent 34%),
    linear-gradient(180deg, rgba(250, 253, 255, 0.92) 0%, rgba(255, 255, 255, 0.86) 100%);
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.grade-panel__identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.grade-panel__glyph {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.84);
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.35rem;
  font-weight: 900;
}

.grade-panel__copy {
  display: grid;
  gap: 4px;
}

.grade-panel__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.grade-panel__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.5rem, 2.6vw, 1.95rem);
  line-height: 1.08;
}

.grade-panel__tagline {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  line-height: 1.5;
}

.grade-panel__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.grade-panel__stat {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font-size: 0.8rem;
  font-weight: 800;
}

.grade-panel__stat--alert {
  background: rgba(255, 231, 156, 0.82);
}

/* 续学大按钮 */
.map-continue {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border: 2px solid rgba(255, 174, 0, 0.5);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.55) 0%, transparent 42%),
    linear-gradient(135deg, rgba(255, 244, 214, 0.96), rgba(255, 231, 156, 0.88));
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  box-shadow: 0 18px 26px -24px rgba(36, 50, 74, 0.34);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.map-continue:hover {
  transform: translateY(-1px);
  box-shadow: 0 24px 32px -24px rgba(36, 50, 74, 0.4);
}

.map-continue:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.8);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.2);
}

.map-continue__play {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(124, 216, 184, 0.96), rgba(86, 173, 255, 0.92));
  color: #143044;
  font-size: 0.95rem;
  font-weight: 900;
}

.map-continue__copy {
  display: grid;
  gap: 2px;
}

.map-continue__label {
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.15rem;
  line-height: 1.2;
}

.map-continue__hint {
  color: var(--color-ink-soft);
  font-size: 0.84rem;
  font-weight: 700;
}

/* 上/下册切换 */
.map-semester-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px;
  border-radius: 20px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.7);
}

.map-semester-tab {
  flex: 1 1 160px;
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--color-ink-soft);
  font-weight: 800;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.map-semester-tab--active {
  background: linear-gradient(135deg, rgba(124, 216, 184, 0.94), rgba(86, 173, 255, 0.9));
  color: #143044;
  box-shadow: 0 14px 22px -20px rgba(36, 50, 74, 0.42);
}

.map-semester-tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.24);
}

.grade-panel__sheets {
  display: grid;
  gap: 14px;
}

@media (max-width: 720px) {
  .grade-panel__head {
    padding: 16px;
    border-radius: 26px;
  }

  .grade-panel__back {
    margin-left: 0;
  }
}
</style>
