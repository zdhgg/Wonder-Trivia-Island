<script setup>
defineProps({
  currentGradeCover: {
    type: Object,
    required: true
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

defineEmits(["open-map"]);
</script>

<template>
  <header :class="['study-hero', `study-hero--${currentGradeCover.theme}`]">
    <div class="study-hero__topline">
      <div class="study-hero__identity">
        <p class="study-hero__eyebrow">
          <span class="study-hero__glyph" aria-hidden="true">{{ currentGradeCover.glyph }}</span>
          {{ currentGradeCover.coverLabel }}
        </p>
        <h2 class="study-hero__title">{{ currentGradeCover.heading }}</h2>
      </div>

      <div class="study-hero__actions">
        <button
          v-if="systematicSectionsAvailable"
          class="study-hero__button"
          type="button"
          @click="$emit('open-map')"
        >
          整册地图
        </button>
      </div>
    </div>

    <div class="study-hero__footline">
      <div v-if="heroOverviewStats.length" class="study-hero__stats" aria-label="学习概览">
        <span v-for="item in heroOverviewStats" :key="item.label" class="study-hero__stat">
          <span class="study-hero__stat-label">{{ item.label }}</span>
          <strong class="study-hero__stat-value">{{ item.value }}</strong>
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.study-hero {
  overflow: hidden;
  display: grid;
  gap: 12px;
  padding: 16px 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  box-shadow:
    0 26px 44px -38px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  background:
    radial-gradient(circle at top right, var(--hero-accent, rgba(184, 242, 223, 0.34)) 0%, transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 253, 248, 0.86) 100%);
}

.study-hero--sprout {
  --hero-accent: rgba(184, 242, 223, 0.42);
  --hero-accent-ink: #214539;
}

.study-hero--bridge {
  --hero-accent: rgba(173, 235, 255, 0.42);
  --hero-accent-ink: #17384b;
}

.study-hero--voyage {
  --hero-accent: rgba(255, 214, 179, 0.4);
  --hero-accent-ink: #4a2f1d;
}

.study-hero--summit {
  --hero-accent: rgba(217, 223, 255, 0.42);
  --hero-accent-ink: #2c3160;
}

.study-hero--tower {
  --hero-accent: rgba(255, 220, 229, 0.44);
  --hero-accent-ink: #5c2e3d;
}

.study-hero--starport {
  --hero-accent: rgba(193, 229, 255, 0.44);
  --hero-accent-ink: #1d3c55;
}

.study-hero--atlas {
  --hero-accent: rgba(219, 234, 254, 0.38);
  --hero-accent-ink: #27355c;
}

.study-hero__topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 18px;
}

.study-hero__identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.study-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-hero__glyph {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  background: var(--hero-accent, rgba(184, 242, 223, 0.42));
  color: var(--hero-accent-ink, #214539);
  font-size: 0.86rem;
  font-weight: 900;
  letter-spacing: 0;
}

.study-hero__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  line-height: 1.1;
  font-size: clamp(1.35rem, 2.4vw, 1.7rem);
}

.study-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.study-hero__button {
  min-height: 42px;
  padding: 9px 16px;
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

.study-hero__button:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.42);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.32);
}

.study-hero__button:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.14);
}

.study-hero__button--map {
  background: rgba(248, 252, 255, 0.9);
}

.study-hero__footline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 18px;
}

.study-hero__summary {
  flex: 1 1 320px;
  min-width: 0;
  margin: 0;
  color: rgba(52, 74, 98, 0.9);
  font-size: 0.9rem;
  line-height: 1.5;
}

.study-hero__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
}

.study-hero__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
}

.study-hero__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
}

.study-hero__stat-value {
  color: var(--color-ink);
  font-size: 0.92rem;
}

@media (max-width: 720px) {
  .study-hero {
    padding: 14px 16px;
    border-radius: 24px;
  }

  .study-hero__topline {
    flex-direction: column;
    align-items: stretch;
  }

  .study-hero__button {
    flex: 1;
  }

  .study-hero__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 14px;
  }
}
</style>
