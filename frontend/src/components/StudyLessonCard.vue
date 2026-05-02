<script setup>
const props = defineProps({
  lessonTitle: {
    type: String,
    default: ""
  },
  card: {
    type: Object,
    required: true
  },
  progressLabel: {
    type: String,
    default: ""
  },
  statusText: {
    type: String,
    default: ""
  },
  isNarrating: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <article :class="['study-lesson-card', `study-lesson-card--${card.visualTone || 'general'}`]">
    <div class="study-lesson-card__copy">
      <div class="study-lesson-card__topline">
        <div class="study-lesson-card__identity">
          <p v-if="card.eyebrow" class="study-lesson-card__eyebrow">{{ card.eyebrow }}</p>
          <h2 class="study-lesson-card__title">{{ card.title }}</h2>
        </div>

        <span v-if="progressLabel" class="study-lesson-card__progress">{{ progressLabel }}</span>
      </div>

      <p class="study-lesson-card__body">{{ card.body }}</p>
      <p v-if="card.detail" class="study-lesson-card__detail">{{ card.detail }}</p>

      <div class="study-lesson-card__meta">
        <span v-if="card.badge" class="study-lesson-card__badge">{{ card.badge }}</span>
        <span class="study-lesson-card__status">
          {{ props.statusText || (isNarrating ? "老师正在带着讲" : "这一张已经可以继续了") }}
        </span>
      </div>

      <div v-if="card.chips?.length" class="study-lesson-card__chips" aria-label="这一张的小提醒">
        <span v-for="chip in card.chips" :key="`${card.id}-${chip}`" class="study-lesson-card__chip">
          {{ chip }}
        </span>
      </div>

      <p v-if="lessonTitle" class="study-lesson-card__footnote">
        当前小站：{{ lessonTitle }}
      </p>
    </div>

    <div class="study-lesson-card__visual" aria-hidden="true">
      <div class="study-lesson-card__orb">
        <span class="study-lesson-card__glyph">{{ card.visualGlyph }}</span>
      </div>

      <div class="study-lesson-card__trail">
        <span class="study-lesson-card__trail-pill"></span>
        <span class="study-lesson-card__trail-pill"></span>
        <span class="study-lesson-card__trail-pill"></span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.study-lesson-card {
  --study-card-surface:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(251, 253, 255, 0.88) 100%);
  --study-card-glow: rgba(173, 235, 255, 0.18);
  --study-card-badge: rgba(255, 255, 255, 0.86);
  --study-card-chip: rgba(255, 255, 255, 0.82);
  --study-card-visual: linear-gradient(160deg, rgba(190, 240, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.78fr);
  gap: 24px;
  align-items: stretch;
  min-height: 0;
  padding: 30px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 38px;
  background:
    radial-gradient(circle at top right, var(--study-card-glow) 0%, rgba(255, 255, 255, 0) 34%),
    var(--study-card-surface);
  box-shadow:
    0 34px 56px -42px rgba(36, 50, 74, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.study-lesson-card--chinese {
  --study-card-glow: rgba(255, 214, 179, 0.24);
  --study-card-visual: linear-gradient(160deg, rgba(255, 231, 156, 0.92) 0%, rgba(255, 255, 255, 0.82) 100%);
}

.study-lesson-card--math {
  --study-card-glow: rgba(173, 235, 255, 0.26);
  --study-card-visual: linear-gradient(160deg, rgba(173, 235, 255, 0.92) 0%, rgba(255, 255, 255, 0.82) 100%);
}

.study-lesson-card--english {
  --study-card-glow: rgba(184, 242, 223, 0.28);
  --study-card-visual: linear-gradient(160deg, rgba(184, 242, 223, 0.94) 0%, rgba(255, 255, 255, 0.82) 100%);
}

.study-lesson-card__copy,
.study-lesson-card__visual {
  min-width: 0;
}

.study-lesson-card__copy {
  display: grid;
  gap: 16px;
  align-content: center;
}

.study-lesson-card__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.study-lesson-card__identity {
  display: grid;
  gap: 10px;
}

.study-lesson-card__eyebrow,
.study-lesson-card__footnote {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.84rem;
}

.study-lesson-card__eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-lesson-card__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(2rem, 3.6vw, 2.75rem);
  line-height: 1.06;
  color: var(--color-ink);
}

.study-lesson-card__progress,
.study-lesson-card__badge,
.study-lesson-card__status,
.study-lesson-card__chip {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 999px;
  background: var(--study-card-badge);
  color: var(--color-ink);
  font-size: 0.82rem;
  font-weight: 800;
}

.study-lesson-card__body,
.study-lesson-card__detail {
  margin: 0;
  color: var(--color-ink);
  line-height: 1.75;
}

.study-lesson-card__body {
  font-size: 1.12rem;
}

.study-lesson-card__detail {
  color: var(--color-ink-soft);
  font-size: 0.96rem;
}

.study-lesson-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.study-lesson-card__status {
  background: rgba(255, 255, 255, 0.74);
  color: var(--color-ink-soft);
}

.study-lesson-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.study-lesson-card__chip {
  background: var(--study-card-chip);
}

.study-lesson-card__visual {
  position: relative;
  display: grid;
  gap: 18px;
  align-content: center;
  justify-items: center;
  padding: 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 32px;
  background:
    radial-gradient(circle at 32% 22%, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0) 32%),
    var(--study-card-visual);
  overflow: hidden;
}

.study-lesson-card__visual::before,
.study-lesson-card__visual::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.study-lesson-card__visual::before {
  top: -30px;
  right: -18px;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 70%);
}

.study-lesson-card__visual::after {
  left: -28px;
  bottom: -32px;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0) 74%);
}

.study-lesson-card__orb {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: min(200px, 72%);
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0) 34%),
    rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 24px 42px -32px rgba(36, 50, 74, 0.34);
}

.study-lesson-card__glyph {
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(3rem, 6vw, 4.8rem);
  line-height: 1;
}

.study-lesson-card__trail {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
}

.study-lesson-card__trail-pill {
  width: 34px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
}

@media (max-width: 920px) {
  .study-lesson-card {
    grid-template-columns: 1fr;
    padding: 22px;
  }

  .study-lesson-card__visual {
    min-height: 240px;
  }
}

@media (max-width: 640px) {
  .study-lesson-card__topline {
    flex-direction: column;
    align-items: flex-start;
  }

  .study-lesson-card__body {
    font-size: 1rem;
  }
}
</style>
