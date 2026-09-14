<script setup>
defineProps({
  // waiting = 语音还没开讲（积木还没落下来）；active = 跟着讲解走时间轴；done = 讲完定格
  phase: {
    type: String,
    default: "waiting"
  }
});
</script>

<template>
  <div :class="['study-anim', 'study-anim--build', `is-${phase}`]">
    <svg class="study-anim__svg" viewBox="0 0 320 232" role="presentation" aria-hidden="true" focusable="false">
      <rect class="build__backdrop" x="20" y="34" width="280" height="172" rx="38" />
      <rect class="build__floor" x="58" y="170" width="204" height="12" rx="6" />

      <g class="build__block build__block--one">
        <rect class="build__block-body" x="78" y="112" width="54" height="58" rx="18" />
        <circle class="build__eye" cx="94" cy="136" r="5" />
        <circle class="build__eye" cx="116" cy="136" r="5" />
        <path class="build__smile" d="M99 150 Q105 156 111 150" />
      </g>

      <g class="build__block build__block--two">
        <rect class="build__block-body" x="134" y="112" width="54" height="58" rx="18" />
        <circle class="build__eye" cx="150" cy="136" r="5" />
        <circle class="build__eye" cx="172" cy="136" r="5" />
        <path class="build__smile" d="M155 150 Q161 156 167 150" />
      </g>

      <g class="build__block build__block--three">
        <rect class="build__block-body" x="190" y="112" width="54" height="58" rx="18" />
        <circle class="build__eye" cx="206" cy="136" r="5" />
        <circle class="build__eye" cx="228" cy="136" r="5" />
        <path class="build__smile" d="M211 150 Q217 156 223 150" />
      </g>

      <g class="build__crown">
        <path class="build__crown-shape" d="M160 30 L168 52 L190 60 L168 68 L160 90 L152 68 L130 60 L152 52 Z" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.study-anim {
  display: grid;
  place-items: center;
  width: min(100%, 320px);
}

.study-anim__svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

.build__backdrop {
  fill: var(--study-anim-surface);
  fill-opacity: 0.62;
  stroke: var(--study-anim-line);
  stroke-width: 2;
}

.build__floor {
  fill: var(--study-anim-line);
}

.build__block {
  transform-box: view-box;
  opacity: 1;
}

.build__block--one {
  transform-origin: 105px 170px;
}

.build__block--two {
  transform-origin: 161px 170px;
}

.build__block--three {
  transform-origin: 217px 170px;
}

.build__block-body {
  fill: var(--study-anim-soft);
  stroke: var(--study-anim-accent);
  stroke-width: 3;
}

.build__eye {
  fill: var(--study-anim-ink);
}

.build__smile {
  fill: none;
  stroke: var(--study-anim-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

/* 静止态 = 搭好的姿势：三块积木都落到位、小皇冠亮着。 */
.build__crown {
  transform-box: view-box;
  transform-origin: 160px 60px;
  opacity: 1;
}

.build__crown-shape {
  fill: var(--study-anim-warm);
  stroke: var(--study-anim-ink);
  stroke-width: 2.4;
  stroke-linejoin: round;
}

/* 讲解时间轴：所有元素共享总时长（语音时长），各自在百分比窗口里出演一次 */
.is-active .build__block--one,
.is-active .build__block--two,
.is-active .build__block--three,
.is-active .build__crown {
  animation-duration: var(--study-anim-duration, 12s);
  animation-timing-function: ease-in-out;
  animation-iteration-count: var(--study-anim-iteration, 1);
  animation-fill-mode: var(--study-anim-fill, forwards);
}

.is-active .build__block--one {
  animation-name: build-drop-one;
}

.is-active .build__block--two {
  animation-name: build-drop-two;
}

.is-active .build__block--three {
  animation-name: build-drop-three;
}

.is-active .build__crown {
  animation-name: build-crown;
}

/* waiting 态回退到开场：积木还悬在上方没落下来，皇冠也还没出来 */
.is-waiting .build__block {
  opacity: 0;
  transform: translateY(-52px) scale(0.9);
}

.is-waiting .build__crown {
  opacity: 0;
  transform: scale(0.4) rotate(-18deg);
}

@keyframes build-drop-one {
  0% {
    opacity: 0;
    transform: translateY(-52px) scale(0.9);
  }

  16% {
    opacity: 1;
    transform: translateY(0) scale(1.08);
  }

  24%,
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes build-drop-two {
  0%,
  16% {
    opacity: 0;
    transform: translateY(-52px) scale(0.9);
  }

  32% {
    opacity: 1;
    transform: translateY(0) scale(1.08);
  }

  40%,
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes build-drop-three {
  0%,
  32% {
    opacity: 0;
    transform: translateY(-52px) scale(0.9);
  }

  48% {
    opacity: 1;
    transform: translateY(0) scale(1.08);
  }

  56%,
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes build-crown {
  0%,
  64% {
    opacity: 0;
    transform: scale(0.4) rotate(-18deg);
  }

  80% {
    opacity: 1;
    transform: scale(1.16) rotate(8deg);
  }

  92%,
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-active .build__block--one,
  .is-active .build__block--two,
  .is-active .build__block--three,
  .is-active .build__crown {
    animation: none;
  }

  /* 减少动态偏好下不播时间轴，直接呈现讲完的教学姿态 */
  .is-waiting .build__block,
  .is-waiting .build__crown {
    opacity: 1;
    transform: none;
  }
}
</style>
