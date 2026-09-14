<script setup>
defineProps({
  // waiting = 语音还没开讲（盘子还空着）；active = 跟着讲解走时间轴；done = 讲完定格
  phase: {
    type: String,
    default: "waiting"
  }
});
</script>

<template>
  <div :class="['study-anim', 'study-anim--share', `is-${phase}`]">
    <svg class="study-anim__svg" viewBox="0 0 320 232" role="presentation" aria-hidden="true" focusable="false">
      <rect class="share__backdrop" x="22" y="26" width="276" height="196" rx="30" />
      <rect class="share__floor" x="54" y="162" width="212" height="10" rx="5" />

      <!-- 三只盘子各分到一份，一份一份放，每份一样多 -->
      <g class="share__plate share__plate--one">
        <ellipse class="share__ring" cx="92" cy="130" rx="46" ry="42" />
        <g class="share__badge">
          <rect x="70" y="58" width="44" height="24" rx="12" />
          <text class="share__badge-text" x="92" y="75">1 份</text>
        </g>
        <g class="share__apple share__apple--a">
          <circle class="share__apple-body" cx="68" cy="132" r="9" />
          <ellipse class="share__apple-leaf" cx="71" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--b">
          <circle class="share__apple-body" cx="84" cy="134" r="9" />
          <ellipse class="share__apple-leaf" cx="87" cy="123" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--c">
          <circle class="share__apple-body" cx="100" cy="132" r="9" />
          <ellipse class="share__apple-leaf" cx="103" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--d">
          <circle class="share__apple-body" cx="116" cy="134" r="9" />
          <ellipse class="share__apple-leaf" cx="119" cy="123" rx="5" ry="2.6" />
        </g>
        <ellipse class="share__dish" cx="92" cy="150" rx="36" ry="10" />
        <text class="share__count" x="92" y="186">4 个</text>
      </g>

      <g class="share__plate share__plate--two">
        <ellipse class="share__ring" cx="160" cy="130" rx="46" ry="42" />
        <g class="share__badge">
          <rect x="138" y="58" width="44" height="24" rx="12" />
          <text class="share__badge-text" x="160" y="75">2 份</text>
        </g>
        <g class="share__apple share__apple--a">
          <circle class="share__apple-body" cx="136" cy="132" r="9" />
          <ellipse class="share__apple-leaf" cx="139" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--b">
          <circle class="share__apple-body" cx="152" cy="134" r="9" />
          <ellipse class="share__apple-leaf" cx="155" cy="123" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--c">
          <circle class="share__apple-body" cx="168" cy="132" r="9" />
          <ellipse class="share__apple-leaf" cx="171" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--d">
          <circle class="share__apple-body" cx="184" cy="134" r="9" />
          <ellipse class="share__apple-leaf" cx="187" cy="123" rx="5" ry="2.6" />
        </g>
        <ellipse class="share__dish" cx="160" cy="150" rx="36" ry="10" />
        <text class="share__count" x="160" y="186">4 个</text>
      </g>

      <g class="share__plate share__plate--three">
        <ellipse class="share__ring" cx="228" cy="130" rx="46" ry="42" />
        <g class="share__badge">
          <rect x="206" y="58" width="44" height="24" rx="12" />
          <text class="share__badge-text" x="228" y="75">3 份</text>
        </g>
        <g class="share__apple share__apple--a">
          <circle class="share__apple-body" cx="204" cy="132" r="9" />
          <ellipse class="share__apple-leaf" cx="207" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--b">
          <circle class="share__apple-body" cx="220" cy="134" r="9" />
          <ellipse class="share__apple-leaf" cx="223" cy="123" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--c">
          <circle class="share__apple-body" cx="236" cy="132" r="9" />
          <ellipse class="share__apple-leaf" cx="239" cy="121" rx="5" ry="2.6" />
        </g>
        <g class="share__apple share__apple--d">
          <circle class="share__apple-body" cx="252" cy="134" r="9" />
          <ellipse class="share__apple-leaf" cx="255" cy="123" rx="5" ry="2.6" />
        </g>
        <ellipse class="share__dish" cx="228" cy="150" rx="36" ry="10" />
        <text class="share__count" x="228" y="186">4 个</text>
      </g>

      <!-- 每份都是 4 个，三个“=”就是“平均分”的关键 -->
      <text class="share__equal share__equal--one" x="126" y="186">=</text>
      <text class="share__equal share__equal--two" x="194" y="186">=</text>

      <g class="share__callout">
        <rect x="118" y="28" width="84" height="32" rx="16" />
        <text class="share__callout-text" x="160" y="50">每份一样多</text>
        <path class="share__callout-spark" d="M214 24 L218 34 L228 38 L218 42 L214 52 L210 42 L200 38 L210 34 Z" />
      </g>

      <g class="share__summary">
        <text class="share__summary-text" x="160" y="212">3 份 · 每份 4 个</text>
        <rect class="share__summary-line" x="98" y="218" width="124" height="5" rx="2.5" />
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

.share__backdrop {
  fill: var(--study-anim-surface);
  fill-opacity: 0.62;
  stroke: var(--study-anim-line);
  stroke-width: 2;
}

.share__floor {
  fill: var(--study-anim-line);
}

.share__dish {
  fill: rgba(255, 255, 255, 0.8);
  stroke: var(--study-anim-accent);
  stroke-width: 2.5;
}

.share__apple-body {
  fill: #f4796b;
  stroke: #d95f4f;
  stroke-width: 1.6;
}

.share__apple-leaf {
  fill: #58b87c;
}

/* 静止态（done）就是最终姿态：每份 4 个、三份一样多。
   waiting 态回退到开场：盘子空着，份数和每份几个都还没数出来。 */
.share__ring {
  fill: rgba(255, 255, 255, 0.16);
  stroke: var(--study-anim-accent);
  stroke-width: 3;
  stroke-dasharray: 6 7;
  opacity: 1;
}

.share__badge,
.share__count,
.share__equal,
.share__summary {
  transform-box: fill-box;
  transform-origin: center;
}

.share__badge rect {
  fill: var(--study-anim-soft);
  stroke: var(--study-anim-accent);
  stroke-width: 1.6;
}

.share__badge-text {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 13px;
  font-weight: 800;
  text-anchor: middle;
}

.share__count,
.share__equal {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-weight: 800;
  text-anchor: middle;
}

.share__count {
  font-size: 14px;
}

.share__equal {
  fill: var(--study-anim-accent);
  font-size: 17px;
}

.share__callout {
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
}

.share__callout rect {
  fill: var(--study-anim-warm);
}

.share__callout-text {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 15px;
  font-weight: 900;
  text-anchor: middle;
}

.share__callout-spark {
  fill: var(--study-anim-warm);
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
}

.share__summary-line {
  fill: var(--study-anim-warm);
  transform-box: fill-box;
  transform-origin: center;
}

.share__summary-text {
  fill: var(--study-anim-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 17px;
  font-weight: 900;
  text-anchor: middle;
}

.is-waiting .share__ring,
.is-waiting .share__badge,
.is-waiting .share__count,
.is-waiting .share__equal,
.is-waiting .share__summary,
.is-waiting .share__summary-line {
  opacity: 0;
}

.is-waiting .share__apple {
  opacity: 0;
}

/* 讲解时间轴：所有元素共享总时长（语音时长），各自在百分比窗口里出演一次 */
.is-active .share__ring,
.is-active .share__badge,
.is-active .share__apple,
.is-active .share__count,
.is-active .share__equal,
.is-active .share__callout,
.is-active .share__callout-spark,
.is-active .share__summary,
.is-active .share__summary-line {
  animation-duration: var(--study-anim-duration, 12s);
  animation-timing-function: ease-in-out;
  animation-iteration-count: var(--study-anim-iteration, 1);
  animation-fill-mode: var(--study-anim-fill, forwards);
}

/* 一份一份放：每个盘子的 4 个苹果同批落下 */
.is-active .share__plate--one .share__apple {
  animation-name: share-apple-wave-one;
}

.is-active .share__plate--two .share__apple {
  animation-name: share-apple-wave-two;
}

.is-active .share__plate--three .share__apple {
  animation-name: share-apple-wave-three;
}

.is-active .share__ring {
  animation-name: share-ring;
}

.is-active .share__badge {
  animation-name: share-badge;
}

.is-active .share__count {
  animation-name: share-count;
}

.is-active .share__equal {
  animation-name: share-equal;
}

.is-active .share__callout {
  animation-name: share-callout;
}

.is-active .share__callout-spark {
  animation-name: share-callout-spark;
}

.is-active .share__summary {
  animation-name: share-summary;
}

.is-active .share__summary-line {
  animation-name: share-summary-line;
}

/* 第一份：开场后先往第 1 个盘子里放 */
@keyframes share-apple-wave-one {
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
@keyframes share-apple-wave-two {
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

/* 第三份 */
@keyframes share-apple-wave-three {
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

/* 三份都放好了，把每份圈出来 */
@keyframes share-ring {
  0%,
  38% {
    opacity: 0;
    transform: scale(0.72);
  }

  44% {
    opacity: 1;
    transform: scale(1.05);
  }

  48%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 数每份几个 */
@keyframes share-count {
  0%,
  40% {
    opacity: 0;
    transform: translateY(5px);
  }

  46%,
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 数一共有几份 */
@keyframes share-badge {
  0%,
  46% {
    opacity: 0;
    transform: scale(0.6);
  }

  51% {
    opacity: 1;
    transform: scale(1.08);
  }

  55%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 三个“4 个”串起来，就是“每份一样多” */
@keyframes share-equal {
  0%,
  58% {
    opacity: 0;
    transform: scale(0.6);
  }

  66% {
    opacity: 1;
    transform: scale(1.12);
  }

  72%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes share-callout {
  0%,
  62% {
    opacity: 0;
    transform: scale(0.55);
  }

  68% {
    opacity: 1;
    transform: scale(1.1);
  }

  73%,
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

@keyframes share-callout-spark {
  0%,
  66% {
    opacity: 0;
    transform: scale(0.4) rotate(-16deg);
  }

  72% {
    opacity: 1;
    transform: scale(1.15) rotate(8deg);
  }

  78%,
  100% {
    opacity: 0;
    transform: scale(0.9) rotate(0deg);
  }
}

/* 最后一句把份数和每份几个收成一句话 */
@keyframes share-summary {
  0%,
  86% {
    opacity: 0;
    transform: translateY(8px) scale(0.7);
  }

  94% {
    opacity: 1;
    transform: translateY(0) scale(1.06);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes share-summary-line {
  0%,
  90% {
    opacity: 0;
    transform: scaleX(0.4);
  }

  98%,
  100% {
    opacity: 1;
    transform: scaleX(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-active .share__ring,
  .is-active .share__badge,
  .is-active .share__apple,
  .is-active .share__count,
  .is-active .share__equal,
  .is-active .share__callout,
  .is-active .share__callout-spark,
  .is-active .share__summary,
  .is-active .share__summary-line {
    animation: none;
  }

  /* 减少动态偏好下不播时间轴，直接呈现最终教学姿态 */
  .is-waiting .share__apple,
  .is-waiting .share__ring,
  .is-waiting .share__badge,
  .is-waiting .share__count,
  .is-waiting .share__equal,
  .is-waiting .share__summary,
  .is-waiting .share__summary-line {
    opacity: 1;
  }
}
</style>
