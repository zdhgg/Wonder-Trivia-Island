<script setup>
import { computed } from "vue";
import ModalDialog from "../ModalDialog.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  curriculumRouteTitle: { type: String, default: "" },
  systematicSectionsAvailable: { type: Boolean, default: false },
  mapSectionOptions: { type: Array, default: () => [] },
  activeMapSection: { type: Object, default: null },
  activeMapSectionOption: { type: Object, default: null },
  selectedLessonId: { type: String, default: "" },
  selectedMapSectionId: { type: String, default: "" },
  getSubjectTheme: { type: Function, required: true },
  getSubjectGlyph: { type: Function, required: true },
  getMapModuleStatus: { type: Function, required: true }
});

const emit = defineEmits(["update:modelValue", "update:selectedMapSectionId", "open-lesson"]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});
</script>

<template>
  <ModalDialog
    v-model="isOpen"
    title-id="study-map-title"
    heading-title="整册地图"
    :heading-description="curriculumRouteTitle"
    close-label="关闭整册地图"
    panel-class="study-map-modal"
    initial-focus-selector="[data-modal-primary]"
  >
    <section v-if="systematicSectionsAvailable" class="curriculum-board curriculum-board--map">
      <div class="curriculum-board__toolbar">
        <p class="curriculum-board__hint">点模块直接进入讲解。</p>

        <div
          v-if="mapSectionOptions.length > 1"
          class="map-section-tabs"
          role="tablist"
          aria-label="选择整册路线"
        >
          <button
            v-for="section in mapSectionOptions"
            :key="section.id"
            type="button"
            :class="['map-section-tabs__item', { 'map-section-tabs__item--active': section.id === activeMapSection?.id }]"
            :aria-selected="section.id === activeMapSection?.id"
            :data-modal-primary="section.id === activeMapSection?.id ? 'true' : null"
            @click="$emit('update:selectedMapSectionId', section.id)"
          >
            <span class="map-section-tabs__label">{{ section.label }}</span>
            <span class="map-section-tabs__meta">{{ section.statusText }}</span>
          </button>
        </div>
      </div>

      <article v-if="activeMapSection" class="map-sheet">
        <div class="map-sheet__head">
          <div class="map-sheet__copy">
            <p class="map-sheet__eyebrow">{{ activeMapSection.grade }} · {{ activeMapSection.semester }}</p>
            <h3 class="map-sheet__title">{{ activeMapSection.title }}</h3>
          </div>

          <div v-if="activeMapSectionOption" class="map-sheet__stats" aria-label="当前整册概况">
            <span class="map-sheet__stat">{{ activeMapSectionOption.subjectCount }} 科</span>
            <span class="map-sheet__stat">{{ activeMapSectionOption.moduleCount }} 站</span>
            <span v-if="activeMapSectionOption.dueModuleCount" class="map-sheet__stat map-sheet__stat--alert">
              {{ activeMapSectionOption.dueModuleCount }} 站待回看
            </span>
          </div>
        </div>

        <div class="map-subjects">
          <section
            v-for="subjectSection in activeMapSection.subjects"
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
                :class="['map-trail__stop', `map-trail__stop--${getMapModuleStatus(module).tone}`]"
              >
                <button
                  type="button"
                  :class="['map-station', { 'map-station--active': selectedLessonId === module.id }]"
                  :data-modal-primary="selectedLessonId === module.id ? 'true' : null"
                  @click="$emit('open-lesson', module.id)"
                >
                  <span class="map-station__marker" aria-hidden="true">
                    <span class="map-station__marker-number">{{ moduleIndex + 1 }}</span>
                  </span>

                  <span class="map-station__body">
                    <span class="map-station__header">
                      <strong class="map-station__title">{{ module.title }}</strong>
                      <span :class="['map-station__badge', `map-station__badge--${getMapModuleStatus(module).tone}`]">
                        {{ getMapModuleStatus(module).label }}
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
    </section>
  </ModalDialog>
</template>

<style scoped>
:deep(.study-map-modal) {
  width: min(1040px, 100%);
}

.curriculum-board {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.2) 0%, rgba(255, 231, 156, 0) 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.86) 100%);
}

.curriculum-board--map {
  gap: 16px;
}

.curriculum-board__toolbar,
.map-sheet,
.map-sheet__copy,
.map-subjects,
.map-subject,
.map-subject__copy {
  display: grid;
  gap: 8px;
}

.curriculum-board__hint {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.55;
}

.map-section-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.map-section-tabs__item {
  display: grid;
  gap: 4px;
  min-width: 150px;
  padding: 13px 15px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
}

.map-section-tabs__item--active {
  border-color: rgba(86, 173, 255, 0.34);
  background:
    radial-gradient(circle at top left, rgba(190, 240, 255, 0.24) 0%, rgba(190, 240, 255, 0) 40%),
    linear-gradient(180deg, rgba(246, 252, 255, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.map-section-tabs__label {
  color: var(--color-ink);
  font-weight: 900;
}

.map-section-tabs__meta {
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  line-height: 1.45;
}

.map-sheet {
  position: relative;
  overflow: hidden;
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
  background:
    radial-gradient(circle at top right, rgba(var(--map-accent-rgb), 0.2) 0%, rgba(var(--map-accent-rgb), 0) 40%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 255, 250, 0.9) 100%);
}

@media (max-width: 720px) {
  .curriculum-board {
    padding: 20px;
    border-radius: 28px;
  }

  .map-sheet__head,
  .map-subject__head {
    flex-direction: column;
    align-items: stretch;
  }

  .map-trail__stop {
    padding-bottom: 18px;
  }

  .map-trail__stop::before {
    left: 17px;
    top: 32px;
  }

  .map-station__marker {
    width: 36px;
    height: 36px;
  }

  .map-station__body {
    padding: 12px 14px;
  }

  .map-station__header {
    flex-direction: column;
  }
}
</style>
