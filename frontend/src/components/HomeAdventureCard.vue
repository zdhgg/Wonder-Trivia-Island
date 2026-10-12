<script setup>
import { computed } from "vue";
import adventureIllustration from "../assets/images/home-owl-island.webp";

const props = defineProps({
  adventure: { type: Object, required: true },
  isDisabled: { type: Boolean, default: false }
});
const emit = defineEmits(["continue"]);
const ariaLabel = computed(() => [
  "今天的探险", props.adventure.title, props.adventure.stageLabel,
  `本章节星星 ${props.adventure.starText}`, props.adventure.goLabel
].filter(Boolean).join("，"));

function handleContinue() {
  if (!props.isDisabled) emit("continue");
}
</script>

<template>
  <section class="adventure-card" aria-label="今天的探险">
    <img class="adventure-card__illustration" :src="adventureIllustration" alt="" width="1942" height="809" fetchpriority="high" />
    <div class="adventure-card__copy">
      <header class="adventure-card__head">
        <span class="adventure-card__badge">今天的探险</span>
        <span v-if="adventure.grade" class="adventure-card__grade">
          {{ adventure.grade }}<template v-if="adventure.semester"> · {{ adventure.semester }}</template>
        </span>
      </header>
      <h2 class="adventure-card__title">{{ adventure.title }}</h2>
      <p v-if="adventure.subtitle" class="adventure-card__subtitle">{{ adventure.subtitle }}</p>
      <div class="adventure-card__progress">
        <span class="adventure-card__stage">
          {{ adventure.isChapterComplete ? "全部通关" : adventure.stageLabel }}
        </span>
        <span class="adventure-card__stars-text" :aria-label="`本章节已获得 ${adventure.starText} 星`">
          <span aria-hidden="true">★</span> {{ adventure.starText }}
        </span>
      </div>
      <button class="adventure-card__cta" type="button" :aria-label="ariaLabel"
        :disabled="isDisabled" @click="handleContinue">
        {{ isDisabled ? "准备出发…" : adventure.goLabel }} <span aria-hidden="true">→</span>
      </button>
      <p class="adventure-card__goal-text">{{ adventure.goalText }}</p>
    </div>
  </section>
</template>

<style scoped>
.adventure-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr);
  align-items: center;
  min-height: clamp(350px, 29vw, 420px);
  border: 1px solid #d2e6e6;
  border-radius: 28px;
  background: #e3f4f8;
}

.adventure-card__illustration {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 25%;
}

.adventure-card::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(244, 252, 251, .96), rgba(244, 252, 251, .86) 28%, rgba(244, 252, 251, .1) 57%, transparent 68%);
}

.adventure-card__copy {
  position: relative;
  z-index: 1;
  padding: 30px 0 30px 34px;
}

.adventure-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.adventure-card__badge {
  color: #286d60;
  font-size: .8rem;
  font-weight: 800;
}

.adventure-card__badge::before {
  content: "";
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 8px;
  border-radius: 50%;
  background: #48a88b;
  vertical-align: 1px;
}

.adventure-card__grade {
  padding-left: 10px;
  border-left: 1px solid #bed9cd;
  color: #617b76;
  font-size: .78rem;
}

.adventure-card__title {
  margin: 0;
  color: #214b46;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(2.2rem, 4vw, 3.2rem);
  line-height: 1.15;
  letter-spacing: .04em;
}

.adventure-card__subtitle {
  margin: 8px 0 0;
  color: #617b76;
  font-size: .95rem;
  font-weight: 600;
  letter-spacing: .1em;
}

.adventure-card__progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 22px;
  font-size: .86rem;
}

.adventure-card__stage {
  color: #365a54;
}

.adventure-card__stars-text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #586f69;
  white-space: nowrap;
}

.adventure-card__stars-text > span {
  color: #c08525;
  font-size: 1.1rem;
}

.adventure-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 50px;
  margin-top: 20px;
  padding: 10px 24px;
  border: 1px solid #b65b23;
  border-radius: 16px;
  background: #ce6b2d;
  color: #fff;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 3px 0 #ab5425;
  transition: background 150ms ease, transform 150ms ease;
}

.adventure-card__cta:hover:not(:disabled) {
  background: #b95c24;
  transform: translateY(-1px);
}

.adventure-card__cta:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: none;
}

.adventure-card__cta:focus-visible {
  outline: 3px solid #286d60;
  outline-offset: 4px;
}

.adventure-card__cta:disabled {
  cursor: progress;
  opacity: .65;
}

.adventure-card__goal-text {
  margin: 14px 0 0;
  color: #657c75;
  font-size: .76rem;
  font-weight: 500;
  line-height: 1.5;
}

@media (min-width: 1200px) {
  .adventure-card__copy {
    padding-left: 42px;
  }
}

@media (max-width: 600px) {
  .adventure-card {
    grid-template-columns: minmax(0, 1fr);
    border-radius: 22px;
    background: #eff9f8;
  }
  .adventure-card__copy {
    grid-row: 1;
    padding: 22px;
  }
  .adventure-card__illustration {
    position: static;
    grid-row: 2;
    height: 185px;
    object-position: right center;
  }
  .adventure-card::after {
    display: none;
  }
  .adventure-card__head {
    margin-bottom: 12px;
  }
  .adventure-card__title {
    font-size: 2.35rem;
  }
  .adventure-card__progress {
    margin-top: 16px;
  }
  .adventure-card__cta {
    width: 100%;
    margin-top: 16px;
  }
  .adventure-card__goal-text {
    font-size: .74rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .adventure-card__cta {
    transition: none;
    transform: none !important;
  }
}
</style>
