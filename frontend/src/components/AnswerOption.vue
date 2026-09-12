<script setup>
import { computed } from "vue";

const props = defineProps({
  option: {
    type: Object,
    required: true
  },
  variant: {
    type: String,
    default: "strategy"
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
  showOptionKey: {
    type: Boolean,
    default: true
  },
  softOptionKey: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["select"]);

const feedbackLabel = computed(() => {
  if (props.isCorrect) {
    return props.isSelected ? "回答正确" : "正确答案";
  }

  if (props.isWrong) {
    return "本次选择";
  }

  if (props.isSubmitting && props.isSelected) {
    return "正在核对";
  }

  return "";
});

const accessibleLabel = computed(() =>
  [props.showOptionKey ? props.option?.key : "", props.option?.text, feedbackLabel.value]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("，")
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
    :class="[
      'answer-option',
      `answer-option--${variant}`,
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
    <span
      v-if="showOptionKey"
      :class="['answer-option__key', { 'answer-option__key--soft': softOptionKey }]"
      aria-hidden="true"
    >
      {{ option.key }}
    </span>
    <span class="answer-option__text">{{ option.text }}</span>
    <span v-if="feedbackLabel" class="answer-option__feedback" aria-live="polite">
      <span aria-hidden="true">{{ isCorrect ? "✓" : isWrong ? "×" : "…" }}</span>
      {{ feedbackLabel }}
    </span>
  </button>
</template>

<style scoped>
.answer-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 72px;
  padding: 13px 15px;
  border: 1px solid rgba(36, 50, 74, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #24324a;
  cursor: pointer;
  text-align: left;
  transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 120ms ease;
}

.answer-option:hover:not(.is-disabled) {
  border-color: rgba(51, 111, 177, 0.42);
  background: #f8fbff;
}

.answer-option:active:not(.is-disabled) {
  transform: scale(0.99);
}

.answer-option:focus-visible {
  outline: 3px solid rgba(45, 126, 247, 0.42);
  outline-offset: 3px;
}

.answer-option.is-selected:not(.is-correct):not(.is-wrong) {
  border-color: #4d86c6;
  background: #f1f7ff;
  box-shadow: 0 0 0 2px rgba(77, 134, 198, 0.12);
}

.answer-option.is-correct {
  border-color: #36936d;
  background: #eefaf4;
}

.answer-option.is-wrong {
  border-color: #c76678;
  background: #fff3f5;
}

.answer-option.is-disabled:not(.is-selected):not(.is-correct) {
  opacity: 0.64;
}

.answer-option--voyage {
  border-left: 4px solid #57bfc1;
  background: rgba(250, 254, 255, 0.94);
}

.answer-option--voyage:hover:not(.is-disabled) {
  border-color: #4aaeb1;
  background: #f2fbfb;
}

.answer-option--strategy {
  min-height: 66px;
  background: rgba(255, 255, 255, 0.96);
}

.answer-option__key {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid rgba(36, 50, 74, 0.14);
  border-radius: 7px;
  background: #f5f7fa;
  color: #46536a;
  font-size: 0.9rem;
  font-weight: 900;
}

.answer-option--voyage .answer-option__key {
  border-color: rgba(52, 155, 157, 0.24);
  background: #eaf8f8;
  color: #21787a;
}

.answer-option__key--soft {
  color: #68768d;
  font-weight: 700;
}

.answer-option.is-correct .answer-option__key {
  border-color: #36936d;
  background: #d9f3e6;
  color: #236b50;
}

.answer-option.is-wrong .answer-option__key {
  border-color: #c76678;
  background: #ffe1e6;
  color: #963d51;
}

.answer-option__text {
  min-width: 0;
  font-size: 1.02rem;
  font-weight: 750;
  line-height: 1.42;
  overflow-wrap: anywhere;
}

.answer-option--voyage .answer-option__text {
  font-size: 1.08rem;
}

.answer-option__feedback {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 26px;
  padding: 4px 8px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.76);
  color: #256c51;
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
}

.answer-option.is-wrong .answer-option__feedback {
  color: #963d51;
}

@media (max-width: 640px) {
  .answer-option {
    grid-template-columns: auto minmax(0, 1fr);
    min-height: 64px;
    padding: 11px 12px;
  }

  .answer-option__feedback {
    grid-column: 2;
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .answer-option {
    transition: none;
  }
}
</style>
