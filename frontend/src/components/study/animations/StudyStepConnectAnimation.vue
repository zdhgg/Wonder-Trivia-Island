<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div :class="['study-anim', 'study-anim--connect', { 'is-active': active }]">
    <svg class="study-anim__svg" viewBox="0 0 320 232" role="presentation" aria-hidden="true" focusable="false">
      <rect class="connect__backdrop" x="20" y="30" width="280" height="176" rx="38" />
      <rect class="connect__floor" x="52" y="172" width="216" height="12" rx="6" />

      <g class="connect__buddy connect__buddy--left">
        <rect class="connect__buddy-body" x="50" y="82" width="72" height="90" rx="26" />
        <circle class="connect__eye" cx="72" cy="118" r="5.6" />
        <circle class="connect__eye" cx="98" cy="118" r="5.6" />
        <circle class="connect__cheek" cx="62" cy="136" r="5" />
        <circle class="connect__cheek" cx="108" cy="136" r="5" />
        <path class="connect__smile" d="M78 136 Q85 144 92 136" />
      </g>

      <g class="connect__buddy connect__buddy--right">
        <rect class="connect__buddy-body" x="198" y="82" width="72" height="90" rx="26" />
        <circle class="connect__eye" cx="220" cy="118" r="5.6" />
        <circle class="connect__eye" cx="246" cy="118" r="5.6" />
        <circle class="connect__cheek" cx="210" cy="136" r="5" />
        <circle class="connect__cheek" cx="256" cy="136" r="5" />
        <path class="connect__smile" d="M226 136 Q233 144 240 136" />
      </g>

      <path class="connect__link" d="M122 112 C146 104 174 140 198 132" />
      <path class="connect__link connect__link--second" d="M122 148 C146 156 174 120 198 128" />

      <g class="connect__knot">
        <circle class="connect__knot-halo" cx="160" cy="126" r="27" />
        <circle class="connect__knot-core" cx="160" cy="126" r="17" />
        <path class="connect__knot-mark" d="M153 126 L158 132 L168 120" />
      </g>

      <g class="connect__spark">
        <path class="connect__spark-shape" d="M44 46 L48 58 L60 62 L48 66 L44 78 L40 66 L28 62 L40 58 Z" />
        <path class="connect__spark-shape" d="M276 168 L279 177 L288 180 L279 183 L276 192 L273 183 L264 180 L273 177 Z" />
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

.connect__backdrop {
  fill: var(--study-anim-surface);
  fill-opacity: 0.62;
  stroke: var(--study-anim-line);
  stroke-width: 2;
}

.connect__floor {
  fill: var(--study-anim-line);
}

/* 静止态 = 连好的姿势：两个小家伙已经靠到一起。 */
.connect__buddy {
  transform-box: view-box;
}

.connect__buddy--left {
  transform-origin: 86px 172px;
  transform: translate(9px, 0) rotate(3deg);
}

.connect__buddy--right {
  transform-origin: 234px 172px;
  transform: translate(-9px, 0) rotate(-3deg);
}

.connect__buddy-body {
  fill: var(--study-anim-soft);
  stroke: var(--study-anim-accent);
  stroke-width: 3;
}

.connect__eye {
  fill: var(--study-anim-ink);
}

.connect__cheek {
  fill: rgba(255, 148, 168, 0.62);
}

.connect__smile {
  fill: none;
  stroke: var(--study-anim-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.connect__link {
  fill: none;
  stroke: var(--study-anim-accent);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-dasharray: 130;
  stroke-dashoffset: 0;
}

.connect__link--second {
  stroke: var(--study-anim-accent-soft);
  stroke-width: 6;
}

.connect__knot {
  transform-box: view-box;
  transform-origin: 160px 126px;
  opacity: 1;
}

.connect__knot-halo {
  fill: var(--study-anim-warm);
  fill-opacity: 0.36;
}

.connect__knot-core {
  fill: var(--study-anim-warm);
  stroke: var(--study-anim-ink);
  stroke-width: 2.6;
}

.connect__knot-mark {
  fill: none;
  stroke: var(--study-anim-ink);
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.connect__spark {
  transform-box: view-box;
  transform-origin: 160px 126px;
  opacity: 1;
}

.connect__spark-shape {
  fill: var(--study-anim-warm);
}

.is-active .connect__link {
  animation: connect-draw 4.4s ease-in-out infinite;
}

.is-active .connect__link--second {
  animation-delay: 320ms;
}

.is-active .connect__knot {
  animation: connect-knot 4.4s ease-in-out infinite;
}

.is-active .connect__buddy--left {
  animation: connect-nudge-left 4.4s ease-in-out infinite;
}

.is-active .connect__buddy--right {
  animation: connect-nudge-right 4.4s ease-in-out infinite;
}

.is-active .connect__spark {
  animation: connect-spark 4.4s ease-in-out infinite;
}

@keyframes connect-draw {
  0% {
    stroke-dashoffset: 130;
  }

  50%,
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes connect-knot {
  0%,
  44% {
    opacity: 0;
    transform: scale(0.4);
  }

  64% {
    opacity: 1;
    transform: scale(1.16);
  }

  78%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes connect-nudge-left {
  0%,
  30% {
    transform: translate(0, 0) rotate(0deg);
  }

  58%,
  100% {
    transform: translate(9px, 0) rotate(3deg);
  }
}

@keyframes connect-nudge-right {
  0%,
  30% {
    transform: translate(0, 0) rotate(0deg);
  }

  58%,
  100% {
    transform: translate(-9px, 0) rotate(-3deg);
  }
}

@keyframes connect-spark {
  0%,
  74% {
    opacity: 0;
    transform: scale(0.6);
  }

  88% {
    opacity: 1;
    transform: scale(1.12);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-active .connect__link,
  .is-active .connect__link--second,
  .is-active .connect__knot,
  .is-active .connect__buddy--left,
  .is-active .connect__buddy--right,
  .is-active .connect__spark {
    animation: none;
  }
}
</style>
