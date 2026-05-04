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
    default: "欢迎来到奇妙知识岛"
  },
  summary: {
    type: String,
    default: "学习档案已准备好。今天想从哪一站开始？"
  },
  profileChip: {
    type: String,
    default: ""
  },
  mascotStatus: {
    type: String,
    default: "idle"
  },
  themeTone: {
    type: String,
    default: "morning"
  },
  showVoiceButton: {
    type: Boolean,
    default: false
  },
  voiceButtonLabel: {
    type: String,
    default: "听猫头鹰说"
  },
  voiceStatus: {
    type: String,
    default: "idle"
  },
  voiceErrorMessage: {
    type: String,
    default: ""
  }
});

defineEmits(["play-voice"]);

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
      <p class="home-welcome__summary">{{ summary }}</p>

      <div v-if="showVoiceButton || voiceErrorMessage" class="home-welcome__actions">
        <button
          v-if="showVoiceButton"
          :class="[
            'home-welcome__voice-button',
            { 'home-welcome__voice-button--active': voiceStatus === 'playing' || voiceStatus === 'loading' }
          ]"
          type="button"
          @click="$emit('play-voice')"
        >
          <span class="home-welcome__voice-button-label">{{ voiceButtonLabel }}</span>
        </button>
        <p v-if="voiceErrorMessage" class="home-welcome__voice-error">{{ voiceErrorMessage }}</p>
      </div>
    </div>

    <div class="home-welcome__mascot">
      <OwlMascot :status="mascotStatus" />
    </div>
  </section>
</template>

<style scoped>
.home-welcome {
  --welcome-glow-a: rgba(173, 235, 255, 0.3);
  --welcome-glow-b: rgba(184, 242, 223, 0.26);
  --welcome-glow-c: rgba(255, 231, 156, 0.28);
  --welcome-shell-a: rgba(255, 255, 255, 0.97);
  --welcome-shell-b: rgba(246, 252, 255, 0.94);
  --welcome-shell-c: rgba(251, 255, 252, 0.92);
  --welcome-orb: rgba(255, 255, 255, 0.84);
  --welcome-glass-border: rgba(255, 255, 255, 0.58);
  --welcome-glass-a: rgba(255, 255, 255, 0.58);
  --welcome-glass-b: rgba(255, 255, 255, 0.12);
  --welcome-chip-bg: rgba(255, 255, 255, 0.82);
  --welcome-chip-border: rgba(36, 50, 74, 0.08);
  --welcome-chip-text: var(--color-ink-soft);
  --welcome-button-accent: rgba(86, 173, 255, 0.18);
  --welcome-button-active-accent: rgba(86, 173, 255, 0.42);
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(180px, 240px);
  gap: 18px;
  align-items: center;
  overflow: hidden;
  padding: 24px 28px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, var(--welcome-glow-a) 0%, rgba(173, 235, 255, 0) 34%),
    radial-gradient(circle at right center, var(--welcome-glow-b) 0%, rgba(184, 242, 223, 0) 30%),
    radial-gradient(circle at bottom right, var(--welcome-glow-c) 0%, rgba(255, 231, 156, 0) 28%),
    linear-gradient(145deg, var(--welcome-shell-a) 0%, var(--welcome-shell-b) 45%, var(--welcome-shell-c) 100%);
  box-shadow:
    0 24px 42px -34px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  transition:
    background 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
}

.home-welcome--morning {
  --welcome-glow-a: rgba(181, 240, 255, 0.34);
  --welcome-glow-b: rgba(198, 247, 221, 0.28);
  --welcome-glow-c: rgba(255, 234, 170, 0.24);
  --welcome-shell-a: rgba(255, 255, 255, 0.98);
  --welcome-shell-b: rgba(245, 252, 255, 0.95);
  --welcome-shell-c: rgba(249, 255, 251, 0.93);
}

.home-welcome--noon {
  --welcome-glow-a: rgba(196, 234, 255, 0.24);
  --welcome-glow-b: rgba(255, 244, 191, 0.28);
  --welcome-glow-c: rgba(255, 221, 159, 0.22);
  --welcome-shell-a: rgba(255, 255, 255, 0.985);
  --welcome-shell-b: rgba(250, 252, 255, 0.955);
  --welcome-shell-c: rgba(255, 252, 246, 0.93);
  --welcome-chip-bg: rgba(255, 255, 255, 0.88);
}

.home-welcome--afternoon {
  --welcome-glow-a: rgba(170, 227, 255, 0.24);
  --welcome-glow-b: rgba(255, 229, 181, 0.24);
  --welcome-glow-c: rgba(255, 202, 171, 0.24);
  --welcome-shell-a: rgba(255, 255, 255, 0.97);
  --welcome-shell-b: rgba(248, 251, 255, 0.945);
  --welcome-shell-c: rgba(255, 248, 242, 0.92);
  --welcome-button-accent: rgba(243, 162, 92, 0.22);
  --welcome-button-active-accent: rgba(243, 162, 92, 0.4);
}

.home-welcome--evening {
  --welcome-glow-a: rgba(163, 209, 255, 0.22);
  --welcome-glow-b: rgba(226, 204, 255, 0.18);
  --welcome-glow-c: rgba(255, 197, 210, 0.22);
  --welcome-shell-a: rgba(255, 255, 255, 0.975);
  --welcome-shell-b: rgba(243, 247, 255, 0.945);
  --welcome-shell-c: rgba(248, 244, 255, 0.92);
  --welcome-orb: rgba(247, 245, 255, 0.9);
  --welcome-button-accent: rgba(132, 141, 241, 0.2);
  --welcome-button-active-accent: rgba(132, 141, 241, 0.38);
}

.home-welcome--night {
  --welcome-glow-a: rgba(123, 170, 242, 0.2);
  --welcome-glow-b: rgba(168, 215, 255, 0.14);
  --welcome-glow-c: rgba(255, 194, 184, 0.16);
  --welcome-shell-a: rgba(248, 251, 255, 0.975);
  --welcome-shell-b: rgba(239, 246, 255, 0.945);
  --welcome-shell-c: rgba(244, 242, 255, 0.93);
  --welcome-orb: rgba(243, 245, 255, 0.92);
  --welcome-glass-border: rgba(232, 238, 255, 0.7);
  --welcome-glass-a: rgba(248, 250, 255, 0.68);
  --welcome-glass-b: rgba(236, 242, 255, 0.18);
  --welcome-button-accent: rgba(106, 170, 236, 0.22);
  --welcome-button-active-accent: rgba(106, 170, 236, 0.4);
}

.home-welcome::before,
.home-welcome::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.home-welcome::before {
  inset: auto auto -58px -24px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--welcome-orb) 0%, rgba(255, 255, 255, 0) 72%);
  opacity: 0.66;
}

.home-welcome::after {
  top: 16px;
  right: 112px;
  width: 84px;
  height: 84px;
  border-radius: 24px;
  transform: rotate(18deg);
  border: 1px solid var(--welcome-glass-border);
  background: linear-gradient(145deg, var(--welcome-glass-a) 0%, var(--welcome-glass-b) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
  opacity: 0.72;
}

.home-welcome__copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  min-width: 0;
}

.home-welcome__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
}

.home-welcome__eyebrow {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-welcome__chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 12px;
  border: 1px solid var(--welcome-chip-border);
  border-radius: 999px;
  background: var(--welcome-chip-bg);
  color: var(--welcome-chip-text);
  font-size: 0.8rem;
  font-weight: 800;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.home-welcome__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  line-height: 1.06;
  max-width: 14ch;
  text-wrap: balance;
}

.home-welcome__summary {
  margin: 0;
  max-width: 40ch;
  color: color-mix(in srgb, var(--color-ink-soft) 92%, white);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.56;
}

.home-welcome__actions {
  display: grid;
  gap: 8px;
  width: fit-content;
  max-width: 34ch;
}

.home-welcome__voice-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 14px;
  border: 1px solid var(--welcome-button-accent);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.home-welcome__voice-button:hover,
.home-welcome__voice-button:focus-visible {
  border-color: color-mix(in srgb, var(--welcome-button-active-accent) 82%, white);
  background: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 16px 24px -24px rgba(36, 50, 74, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  outline: none;
  transform: translateY(-1px);
}

.home-welcome__voice-button--active {
  border-color: var(--welcome-button-active-accent);
  background: linear-gradient(180deg, rgba(236, 247, 255, 0.96) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.home-welcome__voice-button-label {
  line-height: 1;
}

.home-welcome__voice-error {
  margin: 0;
  color: #7b5a28;
  font-size: 0.78rem;
  line-height: 1.45;
}

.home-welcome__mascot {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  align-self: end;
}

.home-welcome__mascot :deep(.owl-mascot) {
  width: min(100%, 220px);
}

.home-welcome__mascot :deep(.owl-mascot__stage) {
  min-height: 196px;
  padding: 2px 0 8px;
}

.home-welcome__mascot :deep(.owl-mascot__backdrop) {
  inset: 20px 14px 36px;
}

.home-welcome__mascot :deep(.owl-mascot__halo) {
  width: 188px;
  height: 152px;
}

.home-welcome__mascot :deep(.owl-mascot__figure) {
  width: 128px;
  min-height: 118px;
  transform: translateY(-14px);
}

.home-welcome__mascot :deep(.owl-mascot__asset) {
  font-size: 4.15rem;
}

.home-welcome__mascot :deep(.owl-mascot__perch) {
  bottom: 36px;
  width: 122px;
}

.home-welcome__mascot :deep(.owl-mascot__cloud--left) {
  left: 18px;
}

.home-welcome__mascot :deep(.owl-mascot__cloud--right) {
  right: 18px;
}

@media (max-width: 900px) {
  .home-welcome {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .home-welcome__mascot {
    justify-content: center;
  }
}

@media (max-width: 720px) {
  .home-welcome {
    padding: 20px 18px 14px;
    border-radius: 26px;
  }

  .home-welcome::after {
    top: 18px;
    right: 22px;
    width: 72px;
    height: 72px;
  }

  .home-welcome__title {
    font-size: clamp(1.65rem, 8vw, 2.12rem);
    max-width: 12ch;
  }

  .home-welcome__summary {
    max-width: 34ch;
    font-size: 0.92rem;
  }

  .home-welcome__mascot :deep(.owl-mascot) {
    width: min(100%, 188px);
  }

  .home-welcome__mascot :deep(.owl-mascot__stage) {
    min-height: 170px;
  }

  .home-welcome__mascot :deep(.owl-mascot__halo) {
    width: 162px;
    height: 132px;
  }

  .home-welcome__mascot :deep(.owl-mascot__figure) {
    width: 112px;
    min-height: 104px;
    transform: translateY(-12px);
  }

  .home-welcome__mascot :deep(.owl-mascot__asset) {
    font-size: 3.6rem;
  }

  .home-welcome__mascot :deep(.owl-mascot__perch) {
    bottom: 32px;
    width: 108px;
  }
}
</style>
