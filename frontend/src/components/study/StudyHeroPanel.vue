<script setup>
defineProps({
  currentGradeCover: {
    type: Object,
    required: true
  },
  studyNavigatorSummary: {
    type: String,
    default: ""
  },
  heroOverviewStats: {
    type: Array,
    default: () => []
  },
  systematicSectionsAvailable: {
    type: Boolean,
    default: false
  }
});

defineEmits(["open-navigator", "open-map"]);
</script>

<template>
  <header class="study-hero">
    <div :class="['study-hero__copy', `study-hero__copy--${currentGradeCover.theme}`]">
      <div class="study-hero__topline">
        <div class="study-hero__identity">
          <p class="study-hero__eyebrow">{{ currentGradeCover.coverLabel }}</p>
          <h2 class="study-hero__title">{{ currentGradeCover.heading }}</h2>
        </div>

        <div class="study-hero__actions">
          <button class="study-hero__open-navigator" type="button" @click="$emit('open-navigator')">
            切换内容
          </button>
          <button
            v-if="systematicSectionsAvailable"
            class="study-hero__open-navigator study-hero__open-navigator--map"
            type="button"
            @click="$emit('open-map')"
          >
            整册地图
          </button>
        </div>
      </div>

      <p class="study-hero__summary-text">{{ studyNavigatorSummary }}</p>

      <div class="study-hero__metrics" aria-label="学习概览">
        <article v-for="item in heroOverviewStats" :key="item.label" class="study-hero__metric">
          <span class="study-hero__metric-label">{{ item.label }}</span>
          <strong class="study-hero__metric-value">{{ item.value }}</strong>
        </article>
      </div>
    </div>
  </header>
</template>

<style scoped>
.study-hero {
  order: 1;
}

.study-hero__copy {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 14px;
  padding: 26px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.32) 0%, rgba(184, 242, 223, 0) 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.86) 100%);
}

.study-hero__copy--sprout {
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.34) 0%, rgba(184, 242, 223, 0) 36%),
    radial-gradient(circle at bottom left, rgba(255, 231, 156, 0.22) 0%, rgba(255, 231, 156, 0) 32%),
    linear-gradient(180deg, rgba(247, 255, 250, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-hero__copy--bridge {
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.34) 0%, rgba(173, 235, 255, 0) 36%),
    radial-gradient(circle at bottom left, rgba(219, 234, 254, 0.2) 0%, rgba(219, 234, 254, 0) 32%),
    linear-gradient(180deg, rgba(247, 252, 255, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-hero__copy--voyage {
  background:
    radial-gradient(circle at top right, rgba(255, 214, 179, 0.32) 0%, rgba(255, 214, 179, 0) 34%),
    radial-gradient(circle at bottom left, rgba(190, 240, 255, 0.22) 0%, rgba(190, 240, 255, 0) 30%),
    linear-gradient(180deg, rgba(255, 250, 246, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-hero__copy--summit {
  background:
    radial-gradient(circle at top right, rgba(217, 223, 255, 0.34) 0%, rgba(217, 223, 255, 0) 36%),
    radial-gradient(circle at bottom left, rgba(208, 245, 255, 0.18) 0%, rgba(208, 245, 255, 0) 30%),
    linear-gradient(180deg, rgba(247, 248, 255, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-hero__copy--tower {
  background:
    radial-gradient(circle at top right, rgba(255, 220, 229, 0.34) 0%, rgba(255, 220, 229, 0) 36%),
    radial-gradient(circle at bottom left, rgba(255, 236, 206, 0.18) 0%, rgba(255, 236, 206, 0) 30%),
    linear-gradient(180deg, rgba(255, 248, 250, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-hero__copy--starport {
  background:
    radial-gradient(circle at top right, rgba(193, 229, 255, 0.36) 0%, rgba(193, 229, 255, 0) 36%),
    radial-gradient(circle at bottom left, rgba(255, 232, 173, 0.24) 0%, rgba(255, 232, 173, 0) 30%),
    linear-gradient(180deg, rgba(248, 252, 255, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-hero__copy--atlas {
  background:
    radial-gradient(circle at top right, rgba(219, 234, 254, 0.28) 0%, rgba(219, 234, 254, 0) 34%),
    linear-gradient(180deg, rgba(249, 252, 255, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.study-hero__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-hero__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  line-height: 1.04;
  font-size: clamp(2rem, 4vw, 2.9rem);
}

.study-hero__topline {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 18px;
}

.study-hero__identity {
  display: grid;
  gap: 4px;
}

.study-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.study-hero__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(144px, 1fr));
  gap: 12px;
}

.study-hero__summary-text {
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.92rem;
  line-height: 1.55;
  max-width: 880px;
}

.study-hero__open-navigator {
  min-height: 44px;
  padding: 10px 16px;
  border: 1.5px solid rgba(87, 125, 167, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.study-hero__open-navigator:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.32);
}

.study-hero__open-navigator:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.14);
}

.study-hero__open-navigator--map {
  background: rgba(248, 252, 255, 0.9);
}

.study-hero__metric {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.study-hero__metric-label {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.study-hero__metric-value {
  color: var(--color-ink);
  font-size: 1.05rem;
}

@media (max-width: 720px) {
  .study-hero__copy {
    padding: 20px;
    border-radius: 28px;
  }

  .study-hero__metrics {
    grid-template-columns: 1fr 1fr;
  }

  .study-hero__topline {
    flex-direction: column;
    align-items: stretch;
  }

  .study-hero__open-navigator {
    width: 100%;
    justify-content: center;
  }
}
</style>
