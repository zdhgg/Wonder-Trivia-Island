<script setup>
defineProps({
  gradeGroups: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  continueCta: {
    type: Object,
    default: null
  }
});

defineEmits(["select-grade", "continue-lesson", "back"]);
</script>

<template>
  <section class="grade-overview">
    <header class="grade-overview__hero">
      <div class="grade-overview__copy">
        <p class="grade-overview__eyebrow">知识小讲堂</p>
        <h1 class="grade-overview__title">整册地图</h1>
        <p class="grade-overview__summary">
          先选一个年级，再进入那一级的整册路线，一次只看一个年级，不用一口气翻完六个年级。
        </p>
      </div>

      <button class="grade-overview__back" type="button" @click="$emit('back')">返回讲堂</button>
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

    <p v-if="isLoading && !gradeGroups.length" class="grade-overview__state">学习路线加载中，马上就好。</p>

    <section v-else-if="gradeGroups.length" class="grade-overview__grid" aria-label="年级列表">
      <button
        v-for="gradeGroup in gradeGroups"
        :key="gradeGroup.grade"
        :class="['grade-card', { 'grade-card--current': gradeGroup.isCurrentGrade }]"
        type="button"
        @click="$emit('select-grade', gradeGroup.grade)"
      >
        <span class="grade-card__top">
          <span class="grade-card__glyph" aria-hidden="true">{{ gradeGroup.glyph }}</span>
          <span class="grade-card__eyebrow">{{ gradeGroup.grade }}专区</span>
          <span v-if="gradeGroup.isCurrentGrade" class="grade-card__now">当前年级</span>
        </span>

        <strong class="grade-card__title">{{ gradeGroup.grade }} · {{ gradeGroup.coverTitle }}</strong>
        <span v-if="gradeGroup.tagline" class="grade-card__tagline">{{ gradeGroup.tagline }}</span>

        <span class="grade-card__stats">
          <span class="grade-card__stat">{{ gradeGroup.sections.length }} 册</span>
          <span class="grade-card__stat">{{ gradeGroup.stationCount }} 站</span>
          <span v-if="gradeGroup.dueStationCount" class="grade-card__stat grade-card__stat--alert">
            {{ gradeGroup.dueStationCount }} 站待回看
          </span>
        </span>

        <span class="grade-card__enter">进入路线 →</span>
      </button>
    </section>

    <p v-else class="grade-overview__state">小讲堂还没开课，先做几道题，系统就会慢慢整理出知识路线。</p>
  </section>
</template>

<style scoped>
.grade-overview {
  display: grid;
  gap: 16px;
}

.grade-overview__hero {
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

.grade-overview__copy {
  display: grid;
  gap: 6px;
}

.grade-overview__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.grade-overview__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.9rem, 3.4vw, 2.5rem);
  line-height: 1.06;
}

.grade-overview__summary {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.94rem;
  line-height: 1.6;
}

.grade-overview__back {
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

.grade-overview__back:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.5);
  box-shadow: 0 16px 24px -22px rgba(36, 50, 74, 0.36);
}

.grade-overview__back:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.82);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.grade-overview__state {
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

/* 年级模块卡 */
.grade-overview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.grade-card {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.14) 0%, transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.86) 100%);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  box-shadow: 0 26px 44px -38px rgba(36, 50, 74, 0.34);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.grade-card:hover {
  transform: translateY(-2px);
  border-color: rgba(124, 216, 184, 0.5);
  box-shadow: 0 28px 40px -34px rgba(36, 50, 74, 0.42);
}

.grade-card:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.82);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.grade-card--current {
  border-color: rgba(86, 173, 255, 0.34);
  background:
    radial-gradient(circle at top right, rgba(190, 240, 255, 0.24) 0%, transparent 34%),
    linear-gradient(180deg, rgba(250, 253, 255, 0.92) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.grade-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.grade-card__glyph {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.84);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
}

.grade-card__eyebrow {
  color: var(--color-ink-soft);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.grade-card__now {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(173, 235, 255, 0.84);
  color: #17384b;
  font-size: 0.74rem;
  font-weight: 800;
  white-space: nowrap;
}

.grade-card__title {
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.35rem;
  line-height: 1.1;
}

.grade-card__tagline {
  color: var(--color-ink-soft);
  font-size: 0.86rem;
  line-height: 1.5;
}

.grade-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.grade-card__stat {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.86);
  font-size: 0.8rem;
  font-weight: 800;
}

.grade-card__stat--alert {
  background: rgba(255, 231, 156, 0.82);
}

.grade-card__enter {
  color: #1f6b51;
  font-size: 0.84rem;
  font-weight: 800;
}

@media (max-width: 720px) {
  .grade-overview__hero {
    padding: 18px;
    border-radius: 26px;
  }

  .grade-overview__grid {
    grid-template-columns: 1fr;
  }

  .grade-card {
    padding: 16px;
    border-radius: 24px;
  }
}
</style>
