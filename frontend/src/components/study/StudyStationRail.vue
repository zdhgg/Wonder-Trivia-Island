<script setup>
defineProps({
  railGroups: {
    type: Array,
    default: () => []
  },
  currentLessonId: {
    type: String,
    default: ""
  }
});

defineEmits(["select-lesson"]);
</script>

<template>
  <aside class="station-rail" aria-label="本册小站">
    <div class="station-rail__head">
      <strong class="station-rail__title">本册小站</strong>
      <span class="station-rail__hint">点一下直接换</span>
    </div>

    <div v-for="group in railGroups" :key="group.id" class="station-rail__group">
      <div v-for="subjectGroup in group.subjects" :key="subjectGroup.id" class="station-rail__subject">
        <div class="station-rail__subject-head">
          <span
            :class="['station-rail__subject-mark', `station-rail__subject-mark--${subjectGroup.theme}`]"
            aria-hidden="true"
          >
            {{ subjectGroup.glyph }}
          </span>
          <strong class="station-rail__subject-name">{{ subjectGroup.subject }}</strong>
        </div>

        <button
          v-for="station in subjectGroup.stations"
          :key="station.id"
          :class="['station-rail__station', { 'station-rail__station--current': station.id === currentLessonId }]"
          type="button"
          @click="$emit('select-lesson', station.id)"
        >
          <span class="station-rail__station-title">{{ station.title }}</span>
          <span
            v-if="station.status.tone !== 'planned'"
            :class="['station-rail__station-badge', `station-rail__station-badge--${station.status.tone}`]"
          >
            {{ station.status.label }}
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.station-rail {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 16px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.22) 0%, transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.86) 100%);
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  /* 三年级及以上小站较多，超高一屏时栏内滚动，页面整体保持一屏 */
  max-height: calc(100dvh - 290px);
  overflow-y: auto;
}

.station-rail__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.station-rail__title {
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.08rem;
  line-height: 1.2;
}

.station-rail__hint {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  white-space: nowrap;
}

.station-rail__group {
  display: grid;
  gap: 12px;
}

.station-rail__subject {
  display: grid;
  gap: 6px;
}

.station-rail__subject-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.station-rail__subject-mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 900;
}

.station-rail__subject-mark--chinese {
  background: rgba(255, 195, 218, 0.66);
  color: #5c2e3d;
}

.station-rail__subject-mark--math {
  background: rgba(190, 240, 255, 0.62);
  color: #17384b;
}

.station-rail__subject-mark--english {
  background: rgba(219, 234, 254, 0.8);
  color: #27355c;
}

.station-rail__subject-mark--science {
  background: rgba(184, 242, 223, 0.6);
  color: #214539;
}

.station-rail__subject-mark--civic {
  background: rgba(255, 231, 156, 0.6);
  color: #4a3a12;
}

.station-rail__subject-mark--general {
  background: rgba(36, 50, 74, 0.08);
  color: var(--color-ink);
}

.station-rail__subject-name {
  color: var(--color-ink);
  font-size: 0.92rem;
}

.station-rail__station {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 7px 10px 7px 12px;
  border: 1px solid rgba(87, 125, 167, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.station-rail__station:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
  background: rgba(248, 253, 255, 0.95);
}

.station-rail__station:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.14);
}

.station-rail__station--current {
  border-color: rgba(86, 173, 255, 0.3);
  background:
    radial-gradient(circle at top left, rgba(190, 240, 255, 0.3) 0%, transparent 40%),
    linear-gradient(135deg, rgba(190, 240, 255, 0.5), rgba(184, 242, 223, 0.46));
}

.station-rail__station-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.station-rail__station-badge {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
}

.station-rail__station-badge--current {
  background: rgba(86, 173, 255, 0.24);
  color: #17384b;
}

.station-rail__station-badge--alert {
  background: rgba(255, 231, 156, 0.86);
  color: var(--color-ink);
}

.station-rail__station-badge--calm {
  background: rgba(184, 242, 223, 0.66);
  color: #214539;
}

@media (max-width: 1080px) {
  .station-rail {
    border-radius: 24px;
  }
}
</style>
