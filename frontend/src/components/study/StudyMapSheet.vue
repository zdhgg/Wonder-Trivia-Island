<script setup>
import { computed, ref, watch } from "vue";
import { getMapModuleStatus, getSubjectGlyph, getSubjectThemeStyle } from "../../utils/knowledgeStudy";

const props = defineProps({
  section: {
    type: Object,
    required: true
  },
  selectedLessonId: {
    type: String,
    default: ""
  },
  // 上次学到的小站，用来决定默认展开哪个学科
  resumeLessonId: {
    type: String,
    default: ""
  }
});

defineEmits(["open-lesson"]);

// 学科配色、小站状态与学科进度都在这里算好，模板不再重复取值
const subjectRows = computed(() =>
  (props.section.subjects || []).map((subjectSection) => {
    const modules = subjectSection.modules || [];

    return {
      id: subjectSection.id,
      subject: subjectSection.subject,
      summary: subjectSection.summary,
      glyph: getSubjectGlyph(subjectSection.subject),
      themeStyle: getSubjectThemeStyle(subjectSection.subject),
      panelId: `${props.section.id}-${subjectSection.id}-trail`,
      stationCount: modules.length,
      dueCount: modules.filter((module) => Number(module.dueCount || 0) > 0).length,
      stations: modules.map((module, index) => ({
        module,
        index,
        status: getMapModuleStatus(module, props.selectedLessonId)
      }))
    };
  })
);

const stats = computed(() => {
  const modules = (props.section.subjects || []).flatMap((subject) => subject.modules || []);

  return {
    subjectCount: (props.section.subjects || []).length,
    moduleCount: modules.length,
    dueModuleCount: modules.filter((module) => Number(module.dueCount || 0) > 0).length
  };
});

function findSubjectIdForLesson(lessonId) {
  const normalizedId = String(lessonId || "").trim();

  if (!normalizedId) {
    return "";
  }

  const matched = subjectRows.value.find((subject) =>
    subject.stations.some((station) => station.module.id === normalizedId)
  );

  return matched?.id || "";
}

// 默认展开：正在看/上次学的小站所在学科 → 有待回看站的学科 → 第一科
const preferredSubjectId = computed(() => {
  const forSelected = findSubjectIdForLesson(props.selectedLessonId);

  if (forSelected) {
    return forSelected;
  }

  const forResume = findSubjectIdForLesson(props.resumeLessonId);

  if (forResume) {
    return forResume;
  }

  const withDue = subjectRows.value.find((subject) => subject.dueCount > 0);

  return withDue?.id || subjectRows.value[0]?.id || "";
});

const expandedSubjectIds = ref([]);

watch(
  preferredSubjectId,
  (subjectId) => {
    expandedSubjectIds.value = subjectId ? [subjectId] : [];
  },
  { immediate: true }
);

function isSubjectExpanded(subjectId) {
  return expandedSubjectIds.value.includes(subjectId);
}

function toggleSubject(subjectId) {
  expandedSubjectIds.value = isSubjectExpanded(subjectId)
    ? expandedSubjectIds.value.filter((id) => id !== subjectId)
    : [...expandedSubjectIds.value, subjectId];
}
</script>

<template>
  <article class="map-sheet">
    <div class="map-sheet__head">
      <div class="map-sheet__copy">
        <p class="map-sheet__eyebrow">{{ section.grade }} · {{ section.semester }}</p>
        <h3 class="map-sheet__title">{{ section.title }}</h3>
      </div>

      <div class="map-sheet__stats" aria-label="本册概况">
        <span class="map-sheet__stat">{{ stats.subjectCount }} 科</span>
        <span class="map-sheet__stat">{{ stats.moduleCount }} 站</span>
        <span v-if="stats.dueModuleCount" class="map-sheet__stat map-sheet__stat--alert">
          {{ stats.dueModuleCount }} 站待回看
        </span>
      </div>
    </div>

    <div class="map-subjects">
      <section v-for="subject in subjectRows" :key="subject.id" class="map-subject" :style="subject.themeStyle">
        <h4 class="map-subject__heading">
          <button
            class="map-subject__toggle"
            type="button"
            :aria-expanded="isSubjectExpanded(subject.id)"
            :aria-controls="subject.panelId"
            @click="toggleSubject(subject.id)"
          >
            <span class="map-subject__identity">
              <span class="map-subject__glyph" aria-hidden="true">{{ subject.glyph }}</span>

              <span class="map-subject__copy">
                <span class="map-subject__title-row">
                  <strong class="map-subject__title">{{ subject.subject }}</strong>
                  <span class="map-subject__count">{{ subject.stationCount }} 站</span>
                  <span v-if="subject.dueCount" class="map-subject__due">{{ subject.dueCount }} 站待回看</span>
                </span>
                <span v-if="subject.summary" class="map-subject__tagline">{{ subject.summary }}</span>
              </span>
            </span>

            <span
              :class="['map-subject__chevron', { 'map-subject__chevron--open': isSubjectExpanded(subject.id) }]"
              aria-hidden="true"
            ></span>
          </button>
        </h4>

        <div v-show="isSubjectExpanded(subject.id)" :id="subject.panelId" class="map-subject__panel">
          <div class="map-subject__panel-inner">
            <ol class="map-trail">
              <li
                v-for="station in subject.stations"
                :key="station.module.id"
                :class="['map-trail__stop', `map-trail__stop--${station.status.tone}`]"
              >
                <button
                  type="button"
                  :class="['map-station', { 'map-station--active': selectedLessonId === station.module.id }]"
                  @click="$emit('open-lesson', station.module.id)"
                >
                  <span class="map-station__marker" aria-hidden="true">
                    <span class="map-station__marker-number">{{ station.index + 1 }}</span>
                  </span>

                  <span class="map-station__body">
                    <span class="map-station__header">
                      <strong class="map-station__title">{{ station.module.title }}</strong>
                      <span :class="['map-station__badge', `map-station__badge--${station.status.tone}`]">
                        {{ station.status.label }}
                      </span>
                    </span>

                    <span v-if="station.module.summary" class="map-station__text">
                      {{ station.module.summary }}
                    </span>

                    <span class="map-station__meta">
                      <span class="map-station__chip">{{ station.module.knowledgeTagCount }} 个小点</span>
                      <span v-if="Number(station.module.dueCount || 0) > 0" class="map-station__chip map-station__chip--alert">
                        今天回看 {{ station.module.dueCount }}
                      </span>
                      <span
                        v-else-if="Number(station.module.matchedCount || 0) > 0"
                        class="map-station__chip map-station__chip--calm"
                      >
                        已连 {{ station.module.matchedCount }} 点
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<style scoped>
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

.map-sheet__head {
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

.map-sheet__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.45rem;
  line-height: 1.08;
}

.map-sheet__stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.map-sheet__stat {
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

/* 学科折叠模块 */
.map-subject {
  --map-accent-rgb: 124, 216, 184;
  --map-accent-strong-rgb: 31, 107, 81;
  padding: 4px 14px;
  border-radius: 20px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.16) 0%, rgba(184, 242, 223, 0) 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(251, 255, 253, 0.88) 100%);
}

.map-subject__heading {
  margin: 0;
}

.map-subject__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 2px;
  border: none;
  border-radius: 16px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.map-subject__toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--map-accent-rgb), 0.32);
}

.map-subject__identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.map-subject__glyph {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  color: var(--map-glyph-ink, #fff);
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.1rem;
  background: var(--map-glyph-background, linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%));
}

.map-subject__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.map-subject__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.map-subject__title {
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1rem;
  line-height: 1.1;
}

.map-subject__count,
.map-subject__due {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font-size: 0.76rem;
  font-weight: 800;
}

.map-subject__due {
  background: rgba(255, 231, 156, 0.82);
}

.map-subject__tagline {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.86rem;
  line-height: 1.45;
}

.map-subject__chevron {
  flex: none;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-right: 2px solid var(--color-ink-soft);
  border-bottom: 2px solid var(--color-ink-soft);
  transform: rotate(45deg);
  transition: transform 220ms ease;
}

.map-subject__chevron--open {
  transform: rotate(-135deg);
}

/* 折叠用小站面板的显隐控制，收起时不占位也不参与键盘与读屏 */
.map-subject__panel {
  display: block;
}

.map-subject__panel-inner {
  overflow: hidden;
}

.map-trail {
  list-style: none;
  margin: 0;
  padding: 8px 8px 10px;
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
  .map-sheet {
    padding: 14px;
    border-radius: 22px;
  }

  .map-subject {
    padding: 4px 12px;
  }

  .map-station__body {
    padding: 12px 14px;
  }
}
</style>
