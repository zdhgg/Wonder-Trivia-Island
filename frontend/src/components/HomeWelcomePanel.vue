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
  }
});

const panelClass = computed(() => [
  "home-welcome",
  `home-welcome--${["morning", "noon", "afternoon", "evening", "night"].includes(props.themeTone) ? props.themeTone : "morning"}`
]);
</script>

<template>
  <section :class="panelClass" aria-label="首页欢迎区">
    <div class="home-welcome__copy">
      <div class="home-welcome__head">
        <span class="home-welcome__eyebrow">{{ eyebrow }}</span>
        <span v-if="profileChip" class="home-welcome__chip">{{ profileChip }}</span>
      </div>

      <h1 class="home-welcome__title">{{ title }}</h1>
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
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 12px;
  align-items: center;
  overflow: hidden;
  padding: 12px 18px;
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
  max-width: 18ch;
  text-wrap: balance;
}







.home-welcome__mascot {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  align-self: end;
}

.home-welcome__mascot :deep(.owl-mascot) {
  width: min(100%, 104px);
}

.home-welcome__mascot :deep(.owl-mascot__stage) {
  min-height: 70px;
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
  width: 58px;
  min-height: 54px;
  transform: translateY(-4px);
}

.home-welcome__mascot :deep(.owl-mascot__asset) {
  font-size: 2.1rem;
}

.home-welcome__mascot :deep(.owl-mascot__perch) {
  bottom: 10px;
  width: 56px;
}

.home-welcome__mascot :deep(.owl-mascot--idle .owl-mascot__figure) {
  animation: none;
  transform: translateY(-4px);
}

@media (max-width: 900px) {
  .home-welcome {
    grid-template-columns: minmax(0, 1fr) 104px;
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
    font-size: 1.5rem;
    max-width: 14ch;
  }

  .home-welcome__mascot :deep(.owl-mascot) {
    width: min(100%, 80px);
  }

  .home-welcome__mascot :deep(.owl-mascot__stage) {
    min-height: 76px;
  }

  .home-welcome__mascot :deep(.owl-mascot__figure) {
    width: 58px;
    min-height: 52px;
  }

  .home-welcome__mascot :deep(.owl-mascot__asset) {
    font-size: 2rem;
  }

  .home-welcome__mascot :deep(.owl-mascot__perch) {
    bottom: 12px;
    width: 54px;
  }
}
</style>
