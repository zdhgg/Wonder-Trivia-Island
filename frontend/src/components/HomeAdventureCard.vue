<script setup>
import { computed } from "vue";

// 首页最醒目的一张卡：今天的主线探险。
// 只展示真实数据（当前关卡、本章星数、下一目标），不编假进度。
const props = defineProps({
  adventure: {
    type: Object,
    required: true
  },
  isDisabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["continue"]);

const stageProgressPercent = computed(() => {
  const stageCount = Number(props.adventure?.stageCount || 0);
  const stageOrder = Number(props.adventure?.stageOrder || 0);

  // 整章通关后进度条就是满的，不再停在最后一关的比例上。
  if (props.adventure?.isChapterComplete) {
    return 100;
  }

  if (stageCount <= 0 || stageOrder <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((stageOrder / stageCount) * 100));
});

const starProgressPercent = computed(() => {
  const totalStars = Number(props.adventure?.totalStars || 0);

  if (totalStars <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((Number(props.adventure?.starsEarned || 0) / totalStars) * 100));
});

// 关卡进度和星星进度都画出来，孩子一眼能看到“走到哪里了”。
const stars = computed(() =>
  Array.from({ length: Math.max(0, Number(props.adventure?.totalStars || 0)) }, (_, index) => ({
    id: index + 1,
    filled: index < Number(props.adventure?.starsEarned || 0)
  }))
);

const ariaLabel = computed(() => {
  const adventure = props.adventure || {};

  return [
    "今天的探险",
    adventure.title,
    adventure.stageLabel,
    `本章节星星 ${adventure.starText}`,
    adventure.goalText
  ]
    .filter(Boolean)
    .join("，");
});

function handleContinue() {
  if (props.isDisabled) {
    return;
  }

  emit("continue");
}
</script>

<template>
  <section class="adventure-card" aria-label="今天的探险">
    <div class="adventure-card__glow" aria-hidden="true"></div>

    <header class="adventure-card__head">
      <span class="adventure-card__badge">今天的探险</span>
      <span v-if="adventure.grade" class="adventure-card__grade">
        {{ adventure.grade }}<template v-if="adventure.semester"> · {{ adventure.semester }}</template>
      </span>
    </header>

    <div class="adventure-card__body">
      <div class="adventure-card__copy">
        <h2 class="adventure-card__title">
          <span class="adventure-card__emoji" aria-hidden="true">{{ adventure.emoji }}</span>
          <span class="adventure-card__title-text">{{ adventure.title }}</span>
        </h2>
        <p v-if="adventure.subtitle" class="adventure-card__subtitle">{{ adventure.subtitle }}</p>

        <div class="adventure-card__stage">
          <span class="adventure-card__stage-index">
            {{ adventure.stageOrder ? `第 ${adventure.stageOrder} 关` : "全部通关" }}
          </span>
          <strong class="adventure-card__stage-title">{{ adventure.stageTitle || "这一章已经全部通关" }}</strong>
        </div>

        <div class="adventure-card__stage-track" aria-hidden="true">
          <span class="adventure-card__stage-fill" :style="{ width: `${stageProgressPercent}%` }"></span>
        </div>

        <div class="adventure-card__stars">
          <span class="adventure-card__stars-row" aria-hidden="true">
            <span
              v-for="star in stars"
              :key="star.id"
              :class="['adventure-card__star', { 'adventure-card__star--filled': star.filled }]"
            >
              {{ star.filled ? "★" : "☆" }}
            </span>
          </span>
          <span class="adventure-card__stars-text">本章节已获得 {{ adventure.starText }} 星</span>
        </div>
      </div>

      <div class="adventure-card__goal">
        <span class="adventure-card__goal-label">下一目标</span>
        <p class="adventure-card__goal-text">{{ adventure.goalText }}</p>
        <div class="adventure-card__goal-track" aria-hidden="true">
          <span class="adventure-card__goal-fill" :style="{ width: `${Math.max(6, starProgressPercent)}%` }"></span>
        </div>
        <span class="adventure-card__goal-note">{{ adventure.goalAction }}</span>
      </div>
    </div>

    <footer class="adventure-card__foot">
      <button
        class="adventure-card__cta"
        type="button"
        :aria-label="ariaLabel"
        :disabled="isDisabled"
        @click="handleContinue"
      >
        {{ adventure.goLabel }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.adventure-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border: 2px solid rgba(255, 174, 0, 0.28);
  border-radius: 28px;
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 190, 130, 0.42) 0%, rgba(255, 190, 130, 0) 44%),
    linear-gradient(150deg, rgba(255, 250, 240, 0.98) 0%, rgba(255, 242, 232, 0.94) 100%);
  box-shadow:
    0 8px 0 rgba(230, 120, 40, 0.14),
    0 26px 44px -30px rgba(36, 50, 74, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.94);
}

.adventure-card__glow {
  position: absolute;
  top: -60px;
  right: -40px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 206, 130, 0.5) 0%, rgba(255, 206, 130, 0) 68%);
  pointer-events: none;
}

.adventure-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.adventure-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 174, 66, 0.96) 0%, rgba(255, 138, 76, 0.96) 100%);
  color: #fffaf2;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  box-shadow: 0 8px 16px -12px rgba(230, 120, 40, 0.8);
}

.adventure-card__grade {
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 800;
}

.adventure-card__body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.58fr);
  gap: 18px;
  align-items: center;
}

.adventure-card__copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.adventure-card__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.9rem, 3.4vw, 2.7rem);
  line-height: 1.05;
}

.adventure-card__emoji {
  font-size: 1.9rem;
  line-height: 1;
  filter: drop-shadow(0 10px 18px rgba(36, 50, 74, 0.16));
}

.adventure-card__subtitle {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  font-weight: 700;
}

.adventure-card__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-top: 2px;
}

.adventure-card__stage-index {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: rgba(176, 84, 22, 0.98);
  font-size: 0.78rem;
  font-weight: 900;
}

.adventure-card__stage-title {
  color: var(--color-ink);
  font-size: 1.12rem;
  font-weight: 900;
}

.adventure-card__stage-track,
.adventure-card__goal-track {
  position: relative;
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: rgba(36, 50, 74, 0.1);
  box-shadow: inset 0 1px 2px rgba(36, 50, 74, 0.12);
}

.adventure-card__stage-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 196, 96, 0.96) 0%, rgba(255, 138, 76, 0.96) 100%);
}

.adventure-card__stars {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}

.adventure-card__stars-row {
  display: inline-flex;
  gap: 3px;
}

.adventure-card__star {
  color: rgba(36, 50, 74, 0.16);
  font-size: 1.16rem;
  line-height: 1;
}

.adventure-card__star--filled {
  color: #f59e0b;
  text-shadow: 0 2px 6px rgba(245, 158, 11, 0.34);
}

.adventure-card__stars-text {
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 800;
}

.adventure-card__goal {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 174, 66, 0.3);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.adventure-card__goal-label {
  color: rgba(176, 84, 22, 0.98);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.adventure-card__goal-text {
  margin: 0;
  color: var(--color-ink);
  font-size: 0.96rem;
  font-weight: 800;
  line-height: 1.45;
}

.adventure-card__goal-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 214, 128, 0.96) 0%, rgba(255, 170, 90, 0.96) 100%);
}

.adventure-card__goal-note {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
}

.adventure-card__foot {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-start;
}

.adventure-card__cta {
  appearance: none;
  min-height: 54px;
  padding: 12px 30px;
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 174, 66, 0.98) 0%, rgba(255, 122, 88, 0.98) 100%);
  color: #fffdf8;
  font-family: inherit;
  font-size: 1.16rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow:
    0 6px 0 rgba(198, 84, 34, 0.42),
    0 20px 32px -22px rgba(198, 84, 34, 0.8);
  transition:
    transform 170ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 170ms ease,
    filter 170ms ease;
}

.adventure-card__cta:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: saturate(1.06);
  box-shadow:
    0 8px 0 rgba(198, 84, 34, 0.42),
    0 26px 38px -22px rgba(198, 84, 34, 0.86);
}

.adventure-card__cta:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow:
    0 2px 0 rgba(198, 84, 34, 0.42),
    0 10px 18px -16px rgba(198, 84, 34, 0.7);
}

.adventure-card__cta:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 4px rgba(255, 174, 66, 0.34),
    0 6px 0 rgba(198, 84, 34, 0.42);
}

.adventure-card__cta:disabled {
  cursor: progress;
  opacity: 0.7;
}

@media (max-width: 900px) {
  .adventure-card__body {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .adventure-card {
    padding: 16px;
    border-radius: 24px;
  }

  .adventure-card__title {
    font-size: clamp(1.6rem, 8vw, 2.1rem);
  }

  .adventure-card__cta {
    width: 100%;
    min-height: 50px;
    font-size: 1.06rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .adventure-card__cta,
  .adventure-card__cta:hover:not(:disabled),
  .adventure-card__cta:active:not(:disabled) {
    transition: none;
    transform: none;
  }
}
</style>
