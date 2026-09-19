<script setup>
import { computed } from "vue";
import OwlMascot from "./OwlMascot.vue";

const props = defineProps({
  eyebrow: {
    type: String,
    default: "欢迎回来"
  },
  title: {
    type: String,
    default: "今天想去哪座岛看看？"
  },
  profileChip: {
    type: String,
    default: ""
  },
  themeTone: {
    type: String,
    default: "morning"
  },
  // 行动建议：由首页聚合层的确定性规则给出（homeDashboard.advice.text）。
  // 旧的 AI 欢迎文案不再参与“今天先做什么”的决策，可以之后再作为陪伴文案复用。
  summary: {
    type: String,
    default: ""
  },
  summarySource: {
    type: String,
    default: ""
  }
});

const panelClass = computed(() => [
  "home-welcome",
  `home-welcome--${["morning", "noon", "afternoon", "evening", "night"].includes(props.themeTone) ? props.themeTone : "morning"}`
]);
const hasSummary = computed(() => Boolean(String(props.summary || "").trim()));
const summarySourceLabel = computed(() => (props.summarySource === "ai" ? "猫头鹰说" : "今日建议"));
</script>

<template>
  <section :class="panelClass" aria-label="首页欢迎区">
    <div class="home-welcome__copy">
      <div class="home-welcome__head">
        <span class="home-welcome__eyebrow">{{ eyebrow }}</span>
        <span v-if="profileChip" class="home-welcome__chip">{{ profileChip }}</span>
      </div>

      <h1 class="home-welcome__title">{{ title }}</h1>

      <p v-if="hasSummary" class="home-welcome__summary">
        <span class="home-welcome__summary-tag">{{ summarySourceLabel }}</span>
        <span class="home-welcome__summary-text">{{ summary }}</span>
      </p>
    </div>

    <div class="home-welcome__mascot">
      <OwlMascot status="idle" />
    </div>
  </section>
</template>

<style scoped>
.home-welcome {
  --welcome-tint: rgba(239, 250, 255, 0.86);
  --welcome-chip-bg: rgba(255, 255, 255, 0.82);
  --welcome-chip-border: rgba(36, 50, 74, 0.08);
  --welcome-chip-text: var(--color-ink-soft);
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 14px;
  align-items: center;
  overflow: hidden;
  padding: 14px 20px;
  border: 1px solid rgba(36, 50, 74, 0.09);
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, var(--welcome-tint) 100%);
  box-shadow:
    0 14px 28px -26px rgba(36, 50, 74, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  transition:
    background 180ms ease,
    border-color 180ms ease;
}

.home-welcome--morning {
  --welcome-tint: rgba(238, 252, 247, 0.88);
}

.home-welcome--noon {
  --welcome-tint: rgba(255, 251, 235, 0.86);
  --welcome-chip-bg: rgba(255, 255, 255, 0.88);
}

.home-welcome--afternoon {
  --welcome-tint: rgba(255, 246, 238, 0.84);
}

.home-welcome--evening {
  --welcome-tint: rgba(244, 244, 255, 0.88);
}

.home-welcome--night {
  --welcome-tint: rgba(238, 244, 255, 0.9);
}

.home-welcome::before,
.home-welcome::after {
  display: none;
}

.home-welcome__copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  min-width: 0;
}

.home-welcome__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}


.home-welcome__eyebrow {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0;
}

.home-welcome__chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid var(--welcome-chip-border);
  border-radius: 999px;
  background: var(--welcome-chip-bg);
  color: var(--welcome-chip-text);
  font-size: 0.8rem;
  font-weight: 800;
}

.home-welcome__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.7rem;
  line-height: 1.12;
  letter-spacing: 0;
  max-width: 22ch;
  text-wrap: balance;
}

/* 行动提示：欢迎区不再只是问候，而是告诉孩子“今天先做什么”。 */
.home-welcome__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: 4px 0 0;
  padding: 8px 12px;
  width: fit-content;
  max-width: 100%;
  border: 1px solid rgba(255, 174, 66, 0.28);
  border-radius: 16px;
  background: rgba(255, 246, 207, 0.66);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.home-welcome__summary-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: rgba(150, 95, 20, 0.98);
  font-size: 0.72rem;
  font-weight: 900;
  white-space: nowrap;
}

.home-welcome__summary-text {
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.45;
}







.home-welcome__mascot {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  align-self: center;
}

.home-welcome__mascot :deep(.owl-mascot) {
  width: min(100%, 132px);
}

.home-welcome__mascot :deep(.owl-mascot__stage) {
  min-height: 84px;
  padding: 0;
}

.home-welcome__mascot :deep(.owl-mascot__backdrop),
.home-welcome__mascot :deep(.owl-mascot__mist),
.home-welcome__mascot :deep(.owl-mascot__halo),
.home-welcome__mascot :deep(.owl-mascot__cloud),
.home-welcome__mascot :deep(.owl-mascot__voice) {
  display: none;
}

.home-welcome__mascot :deep(.owl-mascot__figure) {
  width: 72px;
  min-height: 68px;
  transform: translateY(-4px);
}

.home-welcome__mascot :deep(.owl-mascot__asset) {
  font-size: 2.9rem;
}

.home-welcome__mascot :deep(.owl-mascot__perch) {
  bottom: 8px;
  width: 68px;
  height: 13px;
}

/* 只用非常轻微的上下浮动，避免首页一直在晃。 */
.home-welcome__mascot :deep(.owl-mascot--idle .owl-mascot__figure) {
  animation: home-owl-idle 4.5s ease-in-out infinite;
}

.home-welcome__mascot :deep(.owl-mascot--idle .owl-mascot__perch) {
  animation: home-owl-perch 4.5s ease-in-out infinite;
}

@keyframes home-owl-idle {
  0%,
  100% {
    transform: translateY(-4px);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes home-owl-perch {
  0%,
  100% {
    transform: scaleX(1);
  }

  50% {
    transform: scaleX(0.98);
  }
}

@media (max-width: 900px) {
  .home-welcome {
    grid-template-columns: minmax(0, 1fr) 118px;
    gap: 12px;
  }

  .home-welcome__mascot {
    justify-content: flex-end;
  }
}

@media (max-width: 720px) {
  .home-welcome {
    grid-template-columns: minmax(0, 1fr) 84px;
    gap: 10px;
    padding: 13px 14px;
    border-radius: 18px;
  }

  .home-welcome__title {
    font-size: 1.45rem;
    max-width: 20ch;
  }

  .home-welcome__summary {
    padding: 7px 10px;
  }

  .home-welcome__summary-text {
    font-size: 0.88rem;
  }

  .home-welcome__mascot :deep(.owl-mascot) {
    width: min(100%, 84px);
  }

  .home-welcome__mascot :deep(.owl-mascot__stage) {
    min-height: 80px;
  }

  .home-welcome__mascot :deep(.owl-mascot__figure) {
    width: 64px;
    min-height: 60px;
  }

  .home-welcome__mascot :deep(.owl-mascot__asset) {
    font-size: 2.5rem;
  }

  .home-welcome__mascot :deep(.owl-mascot__perch) {
    bottom: 10px;
    width: 62px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-welcome__mascot :deep(.owl-mascot--idle .owl-mascot__figure),
  .home-welcome__mascot :deep(.owl-mascot--idle .owl-mascot__perch) {
    animation: none !important;
    transform: translateY(-4px);
  }
}
</style>
