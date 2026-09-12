<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false
  },
  // waiting = 语音还没开讲（摆开前的初始状态）；active = 跟着讲解走时间轴；done = 讲完定格
  phase: {
    type: String,
    default: "waiting"
  }
});
</script>

<template>
  <div :class="['study-anim', 'study-anim--groups-of', `is-${phase}`]">
    <svg class="study-anim__svg" viewBox="0 0 320 232" role="presentation" aria-hidden="true" focusable="false">
      <rect class="groups-of__backdrop" x="22" y="26" width="276" height="196" rx="30" />
      <rect class="groups-of__floor" x="54" y="162" width="212" height="10" rx="5" />

      <!-- 三个盘子：静止态是合拢后的样子，开场先摆到分散位置 -->
      <g class="groups-of__plate groups-of__plate--one">
        <ellipse class="groups-of__ring" cx="92" cy="130" rx="46" ry="42" />
        <g class="groups-of__badge">
          <rect x="70" y="58" width="44" height="24" rx="12" />
          <text class="groups-of__badge-text" x="92" y="75">1 份</text>
        </g>
        <g class="groups-of__apple groups-of__apple--a">
          <circle class="groups-of__apple-body" cx="68" cy="132" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="71" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--b">
          <circle class="groups-of__apple-body" cx="84" cy="134" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="87" cy="123" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--c">
          <circle class="groups-of__apple-body" cx="100" cy="132" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="103" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--d">
          <circle class="groups-of__apple-body" cx="116" cy="134" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="119" cy="123" rx="5" ry="2.6" />
        </g>
        <ellipse class="groups-of__dish" cx="92" cy="150" rx="36" ry="10" />
        <text class="groups-of__count" x="92" y="186">4 个</text>
      </g>

      <g class="groups-of__plate groups-of__plate--two">
        <ellipse class="groups-of__ring" cx="160" cy="130" rx="46" ry="42" />
        <g class="groups-of__badge">
          <rect x="138" y="58" width="44" height="24" rx="12" />
          <text class="groups-of__badge-text" x="160" y="75">2 份</text>
        </g>
        <g class="groups-of__apple groups-of__apple--a">
          <circle class="groups-of__apple-body" cx="136" cy="132" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="139" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--b">
          <circle class="groups-of__apple-body" cx="152" cy="134" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="155" cy="123" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--c">
          <circle class="groups-of__apple-body" cx="168" cy="132" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="171" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--d">
          <circle class="groups-of__apple-body" cx="184" cy="134" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="187" cy="123" rx="5" ry="2.6" />
        </g>
        <ellipse class="groups-of__dish" cx="160" cy="150" rx="36" ry="10" />
        <text class="groups-of__count" x="160" y="186">4 个</text>
      </g>

      <g class="groups-of__plate groups-of__plate--three">
        <ellipse class="groups-of__ring" cx="228" cy="130" rx="46" ry="42" />
        <g class="groups-of__badge">
          <rect x="206" y="58" width="44" height="24" rx="12" />
          <text class="groups-of__badge-text" x="228" y="75">3 份</text>
        </g>
        <g class="groups-of__apple groups-of__apple--a">
          <circle class="groups-of__apple-body" cx="204" cy="132" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="207" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--b">
          <circle class="groups-of__apple-body" cx="220" cy="134" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="223" cy="123" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--c">
          <circle class="groups-of__apple-body" cx="236" cy="132" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="239" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="groups-of__apple groups-of__apple--d">
          <circle class="groups-of__apple-body" cx="252" cy="134" r="9" />
          <ellipse class="groups-of__apple-leaf" cx="255" cy="123" rx="5" ry="2.6" />
        </g>
        <ellipse class="groups-of__dish" cx="228" cy="150" rx="36" ry="10" />
        <text class="groups-of__count" x="228" y="186">4 个</text>
      </g>

      <g class="groups-of__callout">
        <rect x="118" y="28" width="84" height="32" rx="16" />
        <text class="groups-of__callout-text" x="160" y="50">3 个 4</text>
        <path class="groups-of__callout-spark" d="M212 24 L216 34 L226 38 L216 42 L212 52 L208 42 L198 38 L208 34 Z" />
      </g>

      <g class="groups-of__equation">
        <text class="groups-of__equation-text" x="160" y="212">3 × 4 = 12</text>
        <rect class="groups-of__equation-line" x="106" y="218" width="108" height="5" rx="2.5" />
        <path class="groups-of__equation-spark" d="M236 196 L240 205 L249 208 L240 211 L236 220 L232 211 L223 208 L232 205 Z" />
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

.groups-of__backdrop {
  fill: var(--study-anim-surface);
  fill-opacity: 0.62;
  stroke: var(--study-anim-line);
  stroke-width: 2;
}

.groups-of__floor {
  fill: var(--study-anim-line);
}

.groups-of__dish {
  fill: rgba(255, 255, 255, 0.8);
  stroke: var(--study-anim-accent);
  stroke-width: 2.5;
}

.groups-of__apple-body {
  fill: #f4796b;
  stroke: #d95f4f;
  stroke-width: 1.6;
}

.groups-of__apple-leaf {
  fill: #58b87c;
  transform-box: fill-box;
  transform-origin: center;
}

.groups-of__ring {
  fill: rgba(255, 255, 255, 0.16);
  stroke: var(--study-anim-accent);
  stroke-width: 3;
  stroke-dasharray: 6 7;
  opacity: 0;
}

.groups-of__badge {
  opacity: 0;
}

.groups-of__badge rect {
  fill: var(--study-anim-soft);
  stroke: var(--study-anim-accent);
  stroke-width: 1.6;
}

.groups-of__badge-text {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 13px;
  font-weight: 800;
  text-anchor: middle;
}

.groups-of__count {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 14px;
  font-weight: 800;
  text-anchor: middle;
  opacity: 0;
}

.groups-of__callout {
  opacity: 0;
}

.groups-of__callout rect {
  fill: var(--study-anim-warm);
}

.groups-of__callout-text {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 19px;
  font-weight: 900;
  text-anchor: middle;
}

.groups-of__callout-spark {
  fill: var(--study-anim-warm);
  opacity: 0;
}

.groups-of__equation-text {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 23px;
  font-weight: 900;
  text-anchor: middle;
}

.groups-of__equation-line {
  fill: var(--study-anim-warm);
}

.groups-of__equation-spark {
  fill: var(--study-anim-warm);
}

/* 静止态（done）就是最终姿态：三盘合拢、算式亮出。
   waiting 态回退到开场：盘子分开、苹果还没放、算式没出现。 */
.is-waiting .groups-of__plate--one {
  transform: translateX(-28px);
}

.is-waiting .groups-of__plate--three {
  transform: translateX(28px);
}

.is-waiting .groups-of__apple {
  opacity: 0;
}

.is-waiting .groups-of__equation {
  opacity: 0;
}

/* 讲解时间轴：所有元素共享总时长（语音时长），各自在百分比窗口里出演 */
.is-active .groups-of__plate--one,
.is-active .groups-of__plate--three,
.is-active .groups-of__apple,
.is-active .groups-of__ring,
.is-active .groups-of__badge,
.is-active .groups-of__badge-text,
.is-active .groups-of__count,
.is-active .groups-of__callout,
.is-active .groups-of__equation,
.is-active .groups-of__callout-spark,
.is-active .groups-of__equation-spark {
  animation-duration: var(--study-anim-duration, 12s);
  animation-timing-function: ease-in-out;
  animation-iteration-count: var(--study-anim-iteration, infinite);
  animation-fill-mode: var(--study-anim-fill, none);
}

.is-active .groups-of__plate--one {
  animation-name: groups-of-plate-one;
}

.is-active .groups-of__plate--three {
  animation-name: groups-of-plate-three;
}

/* 一份一批：每个盘子的 4 个苹果同批落下，对应“一份一份放” */
.is-active .groups-of__plate--one .groups-of__apple {
  animation-name: groups-of-apple-wave-one;
}

.is-active .groups-of__plate--two .groups-of__apple {
  animation-name: groups-of-apple-wave-two;
}

.is-active .groups-of__plate--three .groups-of__apple {
  animation-name: groups-of-apple-wave-three;
}

.is-active .groups-of__ring {
  animation-name: groups-of-ring;
}

.is-active .groups-of__badge,
.is-active .groups-of__badge-text {
  animation-name: groups-of-badge;
}

.is-active .groups-of__count {
  animation-name: groups-of-count;
}

.is-active .groups-of__callout {
  animation-name: groups-of-callout;
}

.is-active .groups-of__equation {
  animation-name: groups-of-equation;
}

.is-active .groups-of__callout-spark {
  animation-name: groups-of-callout-spark;
}

.is-active .groups-of__equation-spark {
  animation-name: groups-of-equation-spark;
}

@keyframes groups-of-plate-one {
  0%,
  5%,
  86% {
    transform: translateX(-28px);
  }

  94%,
  100% {
    transform: translateX(0);
  }
}

@keyframes groups-of-plate-three {
  0%,
  5%,
  86% {
    transform: translateX(28px);
  }

  94%,
  100% {
    transform: translateX(0);
  }
}

/* 第一份：开场后先往第 1 个盘子里放 */
@keyframes groups-of-apple-wave-one {
  0%,
  6% {
    transform: translateY(-150px);
    opacity: 0;
  }

  9% {
    opacity: 1;
  }

  12% {
    transform: translateY(0);
    opacity: 1;
  }

  15% {
    transform: translateY(-7px);
  }

  18%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 第二份 */
@keyframes groups-of-apple-wave-two {
  0%,
  17% {
    transform: translateY(-150px);
    opacity: 0;
  }

  20% {
    opacity: 1;
  }

  23% {
    transform: translateY(0);
    opacity: 1;
  }

  26% {
    transform: translateY(-7px);
  }

  29%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 第三份：放完以后每份都一样多 */
@keyframes groups-of-apple-wave-three {
  0%,
  28% {
    transform: translateY(-150px);
    opacity: 0;
  }

  31% {
    opacity: 1;
  }

  34% {
    transform: translateY(0);
    opacity: 1;
  }

  37% {
    transform: translateY(-7px);
  }

  40%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes groups-of-ring {
  0%,
  40% {
    opacity: 0;
    transform: scale(0.72);
  }

  46% {
    opacity: 1;
    transform: scale(1.05);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }

  84% {
    opacity: 1;
    transform: scale(1);
  }

  90%,
  100% {
    opacity: 0;
    transform: scale(1);
  }
}

@keyframes groups-of-badge {
  0%,
  47% {
    opacity: 0;
    transform: scale(0.6);
  }

  51% {
    opacity: 1;
    transform: scale(1.08);
  }

  54%,
  84% {
    opacity: 1;
    transform: scale(1);
  }

  90%,
  100% {
    opacity: 0;
    transform: scale(1);
  }
}

@keyframes groups-of-count {
  0%,
  42% {
    opacity: 0;
    transform: translateY(5px);
  }

  48%,
  84% {
    opacity: 1;
    transform: translateY(0);
  }

  90%,
  100% {
    opacity: 0;
    transform: translateY(0);
  }
}

/* 数完份数和每份个数，中间弹出“3 个 4” */
@keyframes groups-of-callout {
  0%,
  66% {
    opacity: 0;
    transform: scale(0.55);
  }

  72% {
    opacity: 1;
    transform: scale(1.12);
  }

  76%,
  84% {
    opacity: 1;
    transform: scale(1);
  }

  90%,
  100% {
    opacity: 0;
    transform: scale(0.9);
  }
}

@keyframes groups-of-callout-spark {
  0%,
  70% {
    opacity: 0;
    transform: scale(0.4) rotate(-16deg);
  }

  76% {
    opacity: 1;
    transform: scale(1.15) rotate(8deg);
  }

  82%,
  100% {
    opacity: 0;
    transform: scale(0.9) rotate(0deg);
  }
}

/* 最后一句话把“几个几”接成乘法算式，星星跟着算式一起亮 */
@keyframes groups-of-equation-spark {
  0%,
  92% {
    opacity: 0;
    transform: scale(0.4) rotate(-16deg);
  }

  97% {
    opacity: 1;
    transform: scale(1.15) rotate(8deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* 盘子合拢，最后一句话把“几个几”接成乘法算式 */
@keyframes groups-of-equation {
  0%,
  88% {
    opacity: 0;
    transform: translateY(8px) scale(0.6);
  }

  94% {
    opacity: 1;
    transform: translateY(0) scale(1.08);
  }

  98%,
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-active .groups-of__plate--one,
  .is-active .groups-of__plate--three,
  .is-active .groups-of__apple,
  .is-active .groups-of__ring,
  .is-active .groups-of__badge,
  .is-active .groups-of__badge-text,
  .is-active .groups-of__count,
  .is-active .groups-of__callout,
  .is-active .groups-of__equation,
  .is-active .groups-of__callout-spark,
  .is-active .groups-of__equation-spark {
    animation: none;
  }

  /* 减少动态偏好下不播时间轴，直接呈现最终教学姿态 */
  .is-waiting .groups-of__plate--one,
  .is-waiting .groups-of__plate--three {
    transform: none;
  }

  .is-waiting .groups-of__apple {
    opacity: 1;
  }

  .is-waiting .groups-of__equation {
    opacity: 1;
  }
}
</style>
