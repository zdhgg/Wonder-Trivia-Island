<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { getMapModuleStatus, getSubjectTheme, getSubjectGlyph } from "../utils/knowledgeStudy";
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
  }
});

const emit = defineEmits(["continue-lesson", "open-lesson", "back"]);

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
      sections,
      stationCount: modules.length,
      dueStationCount: modules.filter((module) => Number(module.dueCount || 0) > 0).length,
      isCurrentGrade: grade === currentGradeName.value
    };
  });
});

const currentGradeName = computed(() => {
  if (props.studyResume?.scopeText) {
    const grade = props.studyResume.scopeText.split(" · ")[0];
    if (grade) {
      return grade;
    }
  }

  return props.profileGrade;
});

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

function sectionStats(section) {
  const modules = section.subjects.flatMap((subject) => subject.modules);

  return {
    subjectCount: section.subjects.length,
    moduleCount: modules.length,
    dueModuleCount: modules.filter((module) => Number(module.dueCount || 0) > 0).length
  };
}

const currentGradeElement = ref(null);

function setCurrentGradeElement(el) {
  currentGradeElement.value = el;
}

onMounted(() => {
  nextTick(() => {
    currentGradeElement.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
</script>

<template>
  <section class="study-map-page">
    <header class="study-map-page__hero">
      <div class="study-map-page__copy">
        <p class="study-map-page__eyebrow">知识小讲堂</p>
        <h1 class="study-map-page__title">整册地图</h1>
        <p class="study-map-page__summary">
          一到六年级的学习路线都在这张图上，点任意一站直接进入讲解。
        </p>
      </div>

      <button class="study-map-page__back" type="button" @click="$emit('back')">返回讲堂</button>
    </header>

    <button
      v-if="continueCta"
      class="map-continue"
      type="button"
      :data-modal-primary="'true'"
      @click="$emit('continue-lesson', continueCta.lessonId)"
    >
      <span class="map-continue__play" aria-hidden="true">▶</span>
      <span class="map-continue__copy">
        <strong class="map-continue__label">{{ continueCta.label }}</strong>
        <span class="map-continue__hint">{{ continueCta.hint }}</span>
      </span>
    </button>

    <p v-if="isLoading" class="study-map-page__loading">学习路线加载中，马上就好。</p>

    <section
      v-for="gradeGroup in gradeGroups"
      :key="gradeGroup.grade"
      :ref="gradeGroup.isCurrentGrade ? setCurrentGradeElement : null"
      :class="['study-map-grade', { 'study-map-grade--current': gradeGroup.isCurrentGrade }]"
    >
      <header class="study-map-grade__head">
        <div class="study-map-grade__identity">
          <span class="study-map-grade__glyph" aria-hidden="true">{{ gradeGroup.glyph }}</span>
          <div class="study-map-grade__copy">
            <p class="study-map-grade__eyebrow">{{ gradeGroup.grade }}专区</p>
            <h2 class="study-map-grade__title">{{ gradeGroup.grade }} · {{ gradeGroup.coverTitle }}</h2>
          </div>
        </div>

        <div class="study-map-grade__stats" aria-label="年级概况">
          <span class="study-map-grade__stat">{{ gradeGroup.sections.length }} 册</span>
          <span class="study-map-grade__stat">{{ gradeGroup.stationCount }} 站</span>
          <span v-if="gradeGroup.dueStationCount" class="study-map-grade__stat study-map-grade__stat--alert">
            {{ gradeGroup.dueStationCount }} 站待回看
          </span>
        </div>
      </header>

      <div class="study-map-grade__sections">
        <article v-for="section in gradeGroup.sections" :key="section.id" class="map-sheet">
          <div class="map-sheet__head">
            <div class="map-sheet__copy">
              <p class="map-sheet__eyebrow">{{ section.grade }} · {{ section.semester }}</p>
              <h3 class="map-sheet__title">{{ section.title }}</h3>
            </div>

            <div class="map-sheet__stats" aria-label="本册概况">
              <span class="map-sheet__stat">{{ sectionStats(section).subjectCount }} 科</span>
              <span class="map-sheet__stat">{{ sectionStats(section).moduleCount }} 站</span>
              <span v-if="sectionStats(section).dueModuleCount" class="map-sheet__stat map-sheet__stat--alert">
                {{ sectionStats(section).dueModuleCount }} 站待回看
              </span>
            </div>
          </div>

          <div class="map-subjects">
            <section
              v-for="subjectSection in section.subjects"
              :key="subjectSection.id"
              :class="['map-subject', `map-subject--${getSubjectTheme(subjectSection.subject)}`]"
            >
              <div class="map-subject__head">
                <div class="map-subject__identity">
                  <span class="map-subject__glyph" aria-hidden="true">
                    {{ getSubjectGlyph(subjectSection.subject) }}
                  </span>

                  <div class="map-subject__copy">
                    <h4 class="map-subject__title">{{ subjectSection.subject }}</h4>
                    <p v-if="subjectSection.summary" class="map-subject__tagline">
                      {{ subjectSection.summary }}
                    </p>
                  </div>
                </div>

                <span class="map-subject__count">{{ subjectSection.modules.length }} 站</span>
              </div>

              <ol class="map-trail">
                <li
                  v-for="(module, moduleIndex) in subjectSection.modules"
                  :key="module.id"
                  :class="['map-trail__stop', `map-trail__stop--${getMapModuleStatus(module, selectedLessonId).tone}`]"
                >
                  <button
                    type="button"
                    :class="['map-station', { 'map-station--active': selectedLessonId === module.id }]"
                    @click="$emit('open-lesson', module.id)"
                  >
                    <span class="map-station__marker" aria-hidden="true">
                      <span class="map-station__marker-number">{{ moduleIndex + 1 }}</span>
                    </span>

                    <span class="map-station__body">
                      <span class="map-station__header">
                        <strong class="map-station__title">{{ module.title }}</strong>
                        <span
                          :class="[
                            'map-station__badge',
                            `map-station__badge--${getMapModuleStatus(module, selectedLessonId).tone}`
                          ]"
                        >
                          {{ getMapModuleStatus(module, selectedLessonId).label }}
                        </span>
                      </span>

                      <span v-if="module.summary" class="map-station__text">
                        {{ module.summary }}
                      </span>

                      <span class="map-station__meta">
                        <span class="map-station__chip">{{ module.knowledgeTagCount }} 个小点</span>
                        <span v-if="Number(module.dueCount || 0) > 0" class="map-station__chip map-station__chip--alert">
                          今天回看 {{ module.dueCount }}
                        </span>
                        <span
                          v-else-if="Number(module.matchedCount || 0) > 0"
                          class="map-station__chip map-station__chip--calm"
                        >
                          已连 {{ module.matchedCount }} 点
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              </ol>
            </section>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.study-map-page {
  display: grid;
  gap: 16px;
}

.study-map-page__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 18px;
  padding: 22px 24px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.3) 0%, transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.86) 100%);
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.study-map-page__copy {
  display: grid;
  gap: 6px;
}

.study-map-page__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-map-page__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.9rem, 3.4vw, 2.5rem);
  line-height: 1.06;
}

.study-map-page__summary {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.94rem;
  line-height: 1.6;
}

.study-map-page__back {
  min-height: 46px;
  padding: 10px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.study-map-page__back:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.5);
  box-shadow: 0 16px 24px -22px rgba(36, 50, 74, 0.36);
}

.study-map-page__back:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.82);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.study-map-page__loading {
  margin: 0;
  padding: 22px;
  border: 1.5px dashed rgba(87, 125, 167, 0.24);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--color-ink-soft);
  line-height: 1.6;
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

/* 年级分区 */
.study-map-grade {
  display: grid;
  gap: 14px;
  padding: 20px 22px 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.14) 0%, transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 253, 248, 0.84) 100%);
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  scroll-margin-top: 16px;
}

.study-map-grade--current {
  border-color: rgba(86, 173, 255, 0.34);
  background:
    radial-gradient(circle at top right, rgba(190, 240, 255, 0.24) 0%, transparent 34%),
    linear-gradient(180deg, rgba(250, 253, 255, 0.92) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.study-map-grade__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
}

.study-map-grade__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.study-map-grade__glyph {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.84);
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
}

.study-map-grade__copy {
  display: grid;
  gap: 2px;
}

.study-map-grade__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-map-grade__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.45rem;
  line-height: 1.08;
}

.study-map-grade__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.study-map-grade__stat {
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

.study-map-grade__stat--alert {
  background: rgba(255, 231, 156, 0.82);
}

.study-map-grade__sections {
  display: grid;
  gap: 14px;
}

/* 以下为整册地图卡片样式（沿用原整册地图弹窗的视觉） */
.map-sheet {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(190, 240, 255, 0.2) 0%, rgba(190, 240, 255, 0) 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 251, 253, 0.88) 100%);
}

.map-sheet__head,
.map-subject__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
}

.map-sheet__copy,
.map-subjects {
  display: grid;
  gap: 8px;
}

.map-sheet__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.map-sheet__title,
.map-subject__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
}

.map-sheet__title {
  font-size: 1.45rem;
  line-height: 1.08;
}

.map-subject__title {
  font-size: 1rem;
  line-height: 1.1;
}

.map-sheet__stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.map-sheet__stat,
.map-subject__count {
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

.map-sheet__stat--alert {
  background: rgba(255, 231, 156, 0.82);
}

.map-subject {
  --map-accent-rgb: 124, 216, 184;
  --map-accent-strong-rgb: 31, 107, 81;
  gap: 0;
  padding: 16px 16px 0;
  border-radius: 20px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.16) 0%, rgba(184, 242, 223, 0) 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(251, 255, 253, 0.88) 100%);
}

.map-subject--chinese { --map-accent-rgb: 255, 154, 158; --map-accent-strong-rgb: 171, 79, 83; }
.map-subject--math { --map-accent-rgb: 161, 196, 253; --map-accent-strong-rgb: 69, 117, 191; }
.map-subject--english { --map-accent-rgb: 253, 203, 241; --map-accent-strong-rgb: 161, 104, 148; }

.map-subject__head {
  gap: 12px;
}

.map-subject__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.map-subject__glyph {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  color: #fff;
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.1rem;
  background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
}

.map-subject--chinese .map-subject__glyph {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.map-subject--math .map-subject__glyph {
  background: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
}

.map-subject--english .map-subject__glyph {
  background: linear-gradient(120deg, #fdcbf1 0%, #e6dee9 100%);
  color: rgba(120, 80, 110, 0.9);
}

.map-subject__copy {
  display: grid;
  gap: 4px;
}

.map-subject__tagline {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.86rem;
  line-height: 1.45;
}

.map-trail {
  list-style: none;
  margin: 0;
  padding: 16px 8px 8px;
  display: grid;
  gap: 0;
}

.map-trail__stop {
  position: relative;
  padding-bottom: 24px;
}

.map-trail__stop:last-child {
  padding-bottom: 0;
}

.map-trail__stop::before {
  content: "";
  position: absolute;
  top: 36px;
  bottom: -12px;
  left: 21px;
  width: 2px;
  background: repeating-linear-gradient(to bottom, rgba(36, 50, 74, 0.12) 0, rgba(36, 50, 74, 0.12) 6px, transparent 6px, transparent 12px);
}

.map-trail__stop:last-child::before {
  display: none;
}

.map-trail__stop--alert::before {
  background: repeating-linear-gradient(to bottom, rgba(255, 208, 104, 0.5) 0, rgba(255, 208, 104, 0.5) 6px, transparent 6px, transparent 12px);
}

.map-trail__stop--calm::before,
.map-trail__stop--current::before {
  background: linear-gradient(to bottom, rgba(124, 216, 184, 0.6), rgba(124, 216, 184, 0.6));
}

.map-station {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.map-station__marker {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(var(--map-accent-rgb), 0.34);
}

.map-station__marker-number {
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.1rem;
  color: var(--color-ink-soft);
}

.map-station__body {
  display: grid;
  gap: 8px;
  padding: 14px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
}

.map-station__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.map-station__title {
  color: var(--color-ink);
  font-size: 1.05rem;
  line-height: 1.35;
  font-weight: 800;
}

.map-station__text {
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  line-height: 1.5;
}

.map-station__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.map-station__chip,
.map-station__badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
}

.map-station__chip {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(36, 50, 74, 0.06);
  color: var(--color-ink-soft);
}

.map-station__chip--alert {
  background: rgba(255, 248, 226, 0.8);
  border-color: rgba(255, 208, 104, 0.3);
  color: #8a5b00;
}

.map-station__chip--calm {
  background: rgba(235, 251, 243, 0.8);
  border-color: rgba(124, 216, 184, 0.3);
  color: #1f6b51;
}

.map-station__badge {
  height: 26px;
  padding: 0 10px;
  white-space: nowrap;
}

.map-station__badge--alert { background: rgba(255, 231, 156, 0.82); color: #8a5b00; }
.map-station__badge--calm { background: rgba(184, 242, 223, 0.82); color: #1f6b51; }
.map-station__badge--planned { background: rgba(219, 234, 254, 0.82); color: var(--color-ink-soft); }
.map-station__badge--current { background: rgba(173, 235, 255, 0.84); color: #17384b; }

.map-station--active .map-station__marker {
  border-color: rgba(var(--map-accent-rgb), 0.92);
  background: rgba(var(--map-accent-strong-rgb), 0.96);
}

.map-station--active .map-station__marker-number {
  color: #fff;
}

.map-station--active .map-station__body {
  border-color: rgba(var(--map-accent-rgb), 0.52);
  background: rgba(255, 255, 255, 0.92);
}

@media (max-width: 720px) {
  .study-map-page__hero {
    padding: 18px;
    border-radius: 26px;
  }

  .study-map-grade {
    padding: 16px;
    border-radius: 26px;
  }

  .map-sheet {
    padding: 14px;
    border-radius: 22px;
  }

  .map-station__body {
    padding: 12px 14px;
  }
}
</style>
