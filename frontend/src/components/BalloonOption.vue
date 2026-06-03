<script setup>
import { computed, ref, watch } from 'vue';

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
    default: 'pink' // 'pink', 'blue', 'green', 'yellow'
  }
});

const emit = defineEmits(['select']);

const isPopping = ref(false);

watch(() => props.isCorrect, (newVal) => {
  if (newVal && props.isSelected) {
    isPopping.value = true;
    // Animation duration is handled by CSS, we just need the class to trigger it
  } else if (!newVal) {
    isPopping.value = false;
  }
});

function handleClick() {
  if (!props.disabled && !props.isSubmitting && !isPopping.value) {
    emit('select', props.option.key);
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
        'is-wrong': isSelected && isSubmitting && !isCorrect && !isPopping,
        'is-popping': isPopping,
        'is-disabled': disabled || isSubmitting
      }
    ]"
    :disabled="disabled || isSubmitting"
    @click="handleClick"
  >
    <div class="balloon-option__svg-wrapper">
      <!-- Balloon Body SVG -->
      <svg v-if="!isPopping" class="balloon-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Highlights for 3D effect -->
          <radialGradient :id="`highlight-${colorTheme}`" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stop-color="white" stop-opacity="0.8" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </radialGradient>
        </defs>
        <!-- Balloon string -->
        <path d="M50 105 Q 45 115, 55 120" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5" />
        <!-- Balloon knot -->
        <path d="M46 100 L54 100 L52 106 L48 106 Z" class="balloon-fill balloon-knot" />
        <!-- Balloon main body -->
        <path d="M10 50 C 10 15, 90 15, 90 50 C 90 85, 65 100, 50 100 C 35 100, 10 85, 10 50 Z" class="balloon-fill" />
        <!-- Highlight -->
        <path d="M10 50 C 10 15, 90 15, 90 50 C 90 85, 65 100, 50 100 C 35 100, 10 85, 10 50 Z" :fill="`url(#highlight-${colorTheme})`" />
      </svg>

      <!-- Pop effect (only shows when popping) -->
      <svg v-if="isPopping" class="balloon-pop-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <!-- Burst particles -->
        <g class="burst-particles">
          <circle cx="50" cy="50" r="4" class="particle particle-1" />
          <circle cx="50" cy="50" r="3" class="particle particle-2" />
          <circle cx="50" cy="50" r="5" class="particle particle-3" />
          <circle cx="50" cy="50" r="2.5" class="particle particle-4" />
          <circle cx="50" cy="50" r="4.5" class="particle particle-5" />
          <circle cx="50" cy="50" r="3.5" class="particle particle-6" />
        </g>
        <!-- Confetti pieces -->
        <g class="confetti">
          <path d="M48 48 L52 48 L52 52 L48 52 Z" class="confetti-piece confetti-1" />
          <path d="M49 49 L51 49 L51 51 L49 51 Z" class="confetti-piece confetti-2" />
          <path d="M47 47 L53 47 L53 49 L47 49 Z" class="confetti-piece confetti-3" />
        </g>
      </svg>
    </div>

    <div class="balloon-option__content" v-if="!isPopping">
      <span class="balloon-option__text">{{ option.text }}</span>
      <span v-if="isSelected && isSubmitting && !isCorrect" class="balloon-option__pending">判题中...</span>
    </div>
  </button>
</template>

<style scoped>
.balloon-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  outline: none;
  width: 100%;
  max-width: 180px;
  min-height: 140px;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.balloon-option:hover:not(.is-disabled) {
  transform: translateY(-8px) scale(1.02);
}

.balloon-option:active:not(.is-disabled) {
  transform: translateY(2px) scale(0.95);
}

.balloon-option.is-selected:not(.is-popping) {
  transform: scale(1.05);
  z-index: 2;
}

.balloon-option.is-disabled {
  cursor: default;
}

/* SVG Wrapper */
.balloon-option__svg-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
}

.balloon-svg, .balloon-pop-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 8px 12px rgba(0,0,0,0.08));
}

.balloon-option.is-selected .balloon-svg {
  filter: drop-shadow(0 12px 20px rgba(0,0,0,0.15));
}

.balloon-option.is-wrong .balloon-svg {
  filter: grayscale(0.4) drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}

/* Balloon Themes */
.balloon-option--pink .balloon-fill {
  fill: #ffe0e9;
  stroke: #ffb3c6;
  stroke-width: 2;
}
.balloon-option--pink .balloon-knot { stroke-width: 1; }
.balloon-option--pink .particle { fill: #ff8fab; }
.balloon-option--pink .confetti-piece { fill: #ffb3c6; }

.balloon-option--blue .balloon-fill {
  fill: #e0f2fe;
  stroke: #bae6fd;
  stroke-width: 2;
}
.balloon-option--blue .balloon-knot { stroke-width: 1; }
.balloon-option--blue .particle { fill: #7dd3fc; }
.balloon-option--blue .confetti-piece { fill: #38bdf8; }

.balloon-option--green .balloon-fill {
  fill: #dcfce7;
  stroke: #bbf7d0;
  stroke-width: 2;
}
.balloon-option--green .balloon-knot { stroke-width: 1; }
.balloon-option--green .particle { fill: #86efac; }
.balloon-option--green .confetti-piece { fill: #4ade80; }

.balloon-option--yellow .balloon-fill {
  fill: #fef9c3;
  stroke: #fef08a;
  stroke-width: 2;
}
.balloon-option--yellow .balloon-knot { stroke-width: 1; }
.balloon-option--yellow .particle { fill: #fde047; }
.balloon-option--yellow .confetti-piece { fill: #facc15; }

/* Content */
.balloon-option__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 20px 20px 20px; /* offset for balloon shape */
  text-align: center;
}

.balloon-option__text {
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.6rem;
  color: #334155;
  font-weight: 600;
  line-height: 1.2;
}

.balloon-option__pending {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 4px;
  font-weight: bold;
}

/* Float animation for idle state */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.balloon-option:not(.is-selected):not(.is-disabled) .balloon-svg {
  animation: float 4s ease-in-out infinite;
}

/* Different animation delays to make it look organic */
.balloon-option--pink .balloon-svg { animation-delay: 0s; }
.balloon-option--blue .balloon-svg { animation-delay: -1s; }
.balloon-option--green .balloon-svg { animation-delay: -2s; }
.balloon-option--yellow .balloon-svg { animation-delay: -3s; }

/* Popping Animation */
.is-popping {
  animation: vanish 0.6s forwards;
}

@keyframes vanish {
  0% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

.particle {
  transform-origin: 50px 50px;
}

.particle-1 { animation: shoot 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: -30deg; --dist: 45px; }
.particle-2 { animation: shoot 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: 30deg; --dist: 50px; }
.particle-3 { animation: shoot 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: 90deg; --dist: 40px; }
.particle-4 { animation: shoot 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: 150deg; --dist: 55px; }
.particle-5 { animation: shoot 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: 210deg; --dist: 45px; }
.particle-6 { animation: shoot 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: 270deg; --dist: 60px; }

.confetti-piece {
  transform-origin: 50px 50px;
}

.confetti-1 { animation: scatter 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: -60deg; --dist: 40px; --rot: 360deg; }
.confetti-2 { animation: scatter 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: 180deg; --dist: 35px; --rot: -360deg; }
.confetti-3 { animation: scatter 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; --angle: 120deg; --dist: 45px; --rot: 180deg; }

@keyframes shoot {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(cos(var(--angle)) * var(--dist)), calc(sin(var(--angle)) * var(--dist))) scale(0);
    opacity: 0;
  }
}

@keyframes scatter {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(cos(var(--angle)) * var(--dist)), calc(sin(var(--angle)) * var(--dist))) rotate(var(--rot)) scale(0);
    opacity: 0;
  }
}
</style>
