<script setup>
defineProps({
  // waiting = 语音还没开讲（小方块还在小窝里）；active = 跟着讲解走时间轴；done = 讲完定格
  phase: {
    type: String,
    default: "waiting"
  }
});
</script>

<template>
  <div :class="['study-anim', 'study-anim--try', `is-${phase}`]">
    <svg class="study-anim__svg" viewBox="0 0 320 232" role="presentation" aria-hidden="true" focusable="false">
      <rect class="try__backdrop" x="20" y="28" width="280" height="178" rx="38" />
      <rect class="try__floor" x="46" y="172" width="228" height="12" rx="6" />

      <g class="try__nest">
        <rect class="try__nest-body" x="38" y="104" width="76" height="68" rx="24" />
        <circle class="try__nest-eye" cx="60" cy="132" r="5.4" />
        <circle class="try__nest-eye" cx="88" cy="132" r="5.4" />
        <path class="try__nest-smile" d="M66 148 Q74 156 82 148" />
      </g>

      <g class="try__slot-guide">
        <rect class="try__slot-frame" x="206" y="62" width="88" height="106" rx="28" />
        <rect class="try__slot" x="222" y="112" width="56" height="16" rx="8" />
      </g>

      <g class="try__token-x">
        <g class="try__token-y">
          <g class="try__token-spin">
            <circle class="try__token" cx="76" cy="94" r="25" />
            <circle class="try__token-eye" cx="69" cy="90" r="4" />
            <circle class="try__token-eye" cx="85" cy="90" r="4" />
            <path class="try__token-smile" d="M71 102 Q77 108 83 102" />
          </g>
        </g>
      </g>

      <g class="try__progress">
        <circle class="try__pip try__pip--one" cx="128" cy="196" r="8" />
        <circle class="try__pip try__pip--two" cx="160" cy="196" r="8" />
        <circle class="try__pip try__pip--three" cx="192" cy="196" r="8" />
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

.try__backdrop {
  fill: var(--study-anim-surface);
  fill-opacity: 0.62;
  stroke: var(--study-anim-line);
  stroke-width: 2;
}

.try__floor {
  fill: var(--study-anim-line);
}

.try__nest-body {
  fill: var(--study-anim-soft);
  stroke: var(--study-anim-accent);
  stroke-width: 3;
}

.try__nest-eye {
  fill: var(--study-anim-ink);
}

.try__nest-smile {
  fill: none;
  stroke: var(--study-anim-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.try__slot-frame {
  fill: none;
  stroke: var(--study-anim-line);
  stroke-width: 3.4;
  stroke-dasharray: 10 10;
}

.try__slot {
  fill: var(--study-anim-line);
}

/* 静止态 = 做完的姿势：小方块已经落进槽位、三个进度点亮起。 */
.try__token-x {
  transform-box: view-box;
  transform-origin: 0 0;
  transform: translate(174px, 0);
}

.try__token-y {
  transform-box: view-box;
  transform-origin: 0 0;
  transform: translate(0, 30px);
}

.try__token-spin {
  transform-box: view-box;
  transform-origin: 76px 94px;
}

.try__token {
  fill: var(--study-anim-warm);
  stroke: var(--study-anim-ink);
  stroke-width: 3;
}

.try__token-eye {
  fill: var(--study-anim-ink);
}

.try__token-smile {
  fill: none;
  stroke: var(--study-anim-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.try__pip {
  fill: var(--study-anim-accent);
  opacity: 1;
}

/* 讲解时间轴：所有元素共享总时长（语音时长），各自在百分比窗口里出演一次 */
.is-active .try__token-x,
.is-active .try__token-y,
.is-active .try__token-spin,
.is-active .try__pip--one,
.is-active .try__pip--two,
.is-active .try__pip--three {
  animation-duration: var(--study-anim-duration, 12s);
  animation-timing-function: ease-in-out;
  animation-iteration-count: var(--study-anim-iteration, 1);
  animation-fill-mode: var(--study-anim-fill, forwards);
}

.is-active .try__token-x {
  animation-name: try-travel-x;
}

.is-active .try__token-y {
  animation-name: try-travel-y;
}

.is-active .try__token-spin {
  animation-name: try-token-spin;
}

.is-active .try__pip--one {
  animation-name: try-pip-one;
}

.is-active .try__pip--two {
  animation-name: try-pip-two;
}

.is-active .try__pip--three {
  animation-name: try-pip-three;
}

/* waiting 态回退到开场：小方块还在小窝里，进度点也没亮 */
.is-waiting .try__token-x,
.is-waiting .try__token-y {
  transform: translate(0, 0);
}

.is-waiting .try__pip {
  opacity: 0.3;
}

@keyframes try-travel-x {
  0%,
  12% {
    transform: translate(0, 0);
  }

  26% {
    transform: translate(44px, 0);
  }

  50% {
    transform: translate(174px, 0);
  }

  64%,
  100% {
    transform: translate(174px, 0);
  }
}

@keyframes try-travel-y {
  0%,
  12% {
    transform: translate(0, 0);
  }

  26% {
    transform: translate(0, -40px);
  }

  50% {
    transform: translate(0, -46px);
  }

  64%,
  100% {
    transform: translate(0, 30px);
  }
}

@keyframes try-token-spin {
  0%,
  50% {
    transform: rotate(0deg);
  }

  64% {
    transform: rotate(280deg);
  }

  76%,
  100% {
    transform: rotate(360deg);
  }
}

@keyframes try-pip-one {
  0%,
  12% {
    opacity: 0.3;
  }

  26%,
  100% {
    opacity: 1;
  }
}

@keyframes try-pip-two {
  0%,
  44% {
    opacity: 0.3;
  }

  58%,
  100% {
    opacity: 1;
  }
}

@keyframes try-pip-three {
  0%,
  74% {
    opacity: 0.3;
  }

  88%,
  100% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-active .try__token-x,
  .is-active .try__token-y,
  .is-active .try__token-spin,
  .is-active .try__pip--one,
  .is-active .try__pip--two,
  .is-active .try__pip--three {
    animation: none;
  }

  /* 减少动态偏好下不播时间轴，直接呈现讲完的教学姿态 */
  .is-waiting .try__token-x {
    transform: translate(174px, 0);
  }

  .is-waiting .try__token-y {
    transform: translate(0, 30px);
  }

  .is-waiting .try__pip {
    opacity: 1;
  }
}
</style>
