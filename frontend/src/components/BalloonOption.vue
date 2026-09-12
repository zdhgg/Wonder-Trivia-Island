<script setup>
import { computed } from "vue";

const props = defineProps({
  option: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  isWrong: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  colorTheme: {
    type: String,
    default: "pink"
  }
});

const emit = defineEmits(["select"]);

const feedbackLabel = computed(() => {
  if (props.isCorrect) {
    return props.isSelected ? "答对啦" : "正确答案";
  }

  if (props.isWrong) {
    return "再看看";
  }

  if (props.isSubmitting && props.isSelected) {
    return "正在看看";
  }

  return "";
});

const accessibleLabel = computed(() =>
  [String(props.option?.text || "").trim(), feedbackLabel.value].filter(Boolean).join("，")
);

function handleClick() {
  if (!props.disabled && !props.isSubmitting) {
    emit("select", props.option.key);
  }
}
</script>

<template>
  <button
    type="button"
    class="balloon-option"
    :class="[
      `balloon-option--${colorTheme}`,
      {
        'is-selected': isSelected,
        'is-correct': isCorrect,
        'is-wrong': isWrong,
        'is-submitting': isSubmitting && isSelected,
        'is-disabled': disabled || isSubmitting
      }
    ]"
    :disabled="disabled || isSubmitting"
    :aria-label="accessibleLabel"
    @click="handleClick"
  >
    <div class="balloon-option__shape" aria-hidden="true">
      <svg class="balloon-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient :id="`highlight-${colorTheme}-${option.key}`" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stop-color="white" stop-opacity="0.78" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </radialGradient>
        </defs>
        <path d="M50 105 Q 45 115, 55 120" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5" />
        <path d="M46 100 L54 100 L52 106 L48 106 Z" class="balloon-fill balloon-knot" />
        <path d="M10 50 C 10 15, 90 15, 90 50 C 90 85, 65 100, 50 100 C 35 100, 10 85, 10 50 Z" class="balloon-fill" />
        <path
          d="M10 50 C 10 15, 90 15, 90 50 C 90 85, 65 100, 50 100 C 35 100, 10 85, 10 50 Z"
          :fill="`url(#highlight-${colorTheme}-${option.key})`"
        />
      </svg>
    </div>

    <div class="balloon-option__content">
      <span class="balloon-option__text">{{ option.text }}</span>
      <span v-if="feedbackLabel" class="balloon-option__feedback" aria-live="polite">
        <span aria-hidden="true">{{ isCorrect ? "✓" : isWrong ? "×" : "…" }}</span>
        {{ feedbackLabel }}
      </span>
    </div>
  </button>
</template>

<style scoped>
.balloon-option {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  max-width: 180px;
  min-height: 140px;
  padding: 0;
  margin: 0;
  overflow: visible;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: transform 150ms ease, opacity 150ms ease;
}

.balloon-option:hover:not(.is-disabled) {
  transform: translateY(-3px);
}

.balloon-option:active:not(.is-disabled) {
  transform: translateY(1px) scale(0.97);
}

.balloon-option:focus-visible {
  outline: 3px solid rgba(45, 126, 247, 0.48);
  outline-offset: 3px;
  border-radius: 28px;
}

.balloon-option.is-selected {
  z-index: 2;
}

.balloon-option.is-disabled:not(.is-correct):not(.is-wrong):not(.is-selected) {
  opacity: 0.58;
}

.balloon-option__shape {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.balloon-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 7px 10px rgba(36, 50, 74, 0.09));
  transition: filter 160ms ease, transform 160ms ease;
}

.balloon-option.is-selected .balloon-svg {
  filter: drop-shadow(0 9px 12px rgba(36, 50, 74, 0.13));
  transform: scale(1.02);
}

.balloon-option.is-correct .balloon-svg {
  filter: drop-shadow(0 8px 12px rgba(35, 146, 103, 0.22));
  animation: answer-confirm 280ms ease-out both;
}

.balloon-option.is-wrong .balloon-svg {
  filter: grayscale(0.2) drop-shadow(0 5px 8px rgba(170, 66, 85, 0.14));
}

.balloon-option--pink .balloon-fill {
  fill: #ffe0e9;
  stroke: #ff9fb9;
  stroke-width: 2;
}

.balloon-option--blue .balloon-fill {
  fill: #e0f2fe;
  stroke: #83cff4;
  stroke-width: 2;
}

.balloon-option--green .balloon-fill {
  fill: #dcfce7;
  stroke: #7ed89f;
  stroke-width: 2;
}

.balloon-option--yellow .balloon-fill {
  fill: #fef9c3;
  stroke: #efd84f;
  stroke-width: 2;
}

.balloon-option.is-correct .balloon-fill {
  fill: #d8f7e7;
  stroke: #27976b;
  stroke-width: 3;
}

.balloon-option.is-wrong .balloon-fill {
  fill: #fff0f2;
  stroke: #d4687a;
  stroke-width: 3;
}

.balloon-knot {
  stroke-width: 1;
}

.balloon-option__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 10px 18px 20px;
  text-align: center;
  pointer-events: none;
}

.balloon-option__text {
  max-width: 100%;
  color: #334155;
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.balloon-option__feedback {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #236b51;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 2px 5px rgba(36, 50, 74, 0.08);
}

.balloon-option.is-wrong .balloon-option__feedback {
  color: #a13f56;
}

.balloon-option.is-submitting .balloon-option__feedback {
  color: #526079;
}

.balloon-option:not(.is-selected):not(.is-disabled) .balloon-svg {
  animation: balloon-idle 3.8s ease-in-out infinite;
}

.balloon-option--blue .balloon-svg {
  animation-delay: -0.9s;
}

.balloon-option--green .balloon-svg {
  animation-delay: -1.8s;
}

.balloon-option--yellow .balloon-svg {
  animation-delay: -2.7s;
}

@keyframes balloon-idle {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}

@keyframes answer-confirm {
  0% {
    transform: scale(0.96);
  }

  65% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .balloon-option,
  .balloon-svg {
    animation: none !important;
    transition: none !important;
  }
}
</style>
