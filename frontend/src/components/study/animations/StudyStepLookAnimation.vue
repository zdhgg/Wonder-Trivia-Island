<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div :class="['study-anim', 'study-anim--look', { 'is-active': active }]">
    <svg class="study-anim__svg" viewBox="0 0 320 232" role="presentation" aria-hidden="true" focusable="false">
      <rect class="look__backdrop" x="22" y="30" width="276" height="176" rx="38" />
      <rect class="look__floor" x="54" y="170" width="212" height="12" rx="6" />

      <g class="look__pal look__pal--one">
        <rect class="look__pal-body" x="62" y="96" width="56" height="72" rx="20" />
        <circle class="look__eye" cx="80" cy="126" r="5.4" />
        <circle class="look__eye" cx="100" cy="126" r="5.4" />
        <circle class="look__cheek" cx="72" cy="142" r="5" />
        <circle class="look__cheek" cx="108" cy="142" r="5" />
        <path class="look__smile" d="M84 142 Q90 148 96 142" />
      </g>

      <g class="look__pal look__pal--two">
        <rect class="look__pal-body" x="132" y="96" width="56" height="72" rx="20" />
        <circle class="look__eye" cx="150" cy="126" r="5.4" />
        <circle class="look__eye" cx="170" cy="126" r="5.4" />
        <circle class="look__cheek" cx="142" cy="142" r="5" />
        <circle class="look__cheek" cx="178" cy="142" r="5" />
        <path class="look__smile" d="M154 142 Q160 148 166 142" />
      </g>

      <g class="look__pal look__pal--three">
        <rect class="look__pal-body" x="202" y="96" width="56" height="72" rx="20" />
        <circle class="look__eye" cx="220" cy="126" r="5.4" />
        <circle class="look__eye" cx="240" cy="126" r="5.4" />
        <circle class="look__cheek" cx="212" cy="142" r="5" />
        <circle class="look__cheek" cx="248" cy="142" r="5" />
        <path class="look__smile" d="M224 142 Q230 148 236 142" />
      </g>

      <g class="look__glass">
        <line class="look__glass-handle" x1="110" y1="44" x2="132" y2="22" />
        <circle class="look__glass-ring" cx="90" cy="66" r="27" />
        <circle class="look__glass-gleam" cx="79" cy="55" r="5" />
      </g>

      <g class="look__spark">
        <path class="look__spark-shape" d="M262 46 L268 62 L284 68 L268 74 L262 90 L256 74 L240 68 L256 62 Z" />
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

.look__backdrop {
  fill: var(--study-anim-surface);
  fill-opacity: 0.62;
  stroke: var(--study-anim-line);
  stroke-width: 2;
}

.look__floor {
  fill: var(--study-anim-line);
}

.look__pal {
  transform-box: view-box;
  opacity: 0.82;
}

.look__pal--one {
  transform-origin: 90px 168px;
}

.look__pal--two {
  transform-origin: 160px 168px;
}

.look__pal--three {
  transform-origin: 230px 168px;
  /* 静止态里被看完的那一个保持高亮 */
  transform: scale(1.1);
  opacity: 1;
}

.look__pal-body {
  fill: var(--study-anim-soft);
  stroke: var(--study-anim-accent);
  stroke-width: 3;
}

.look__eye {
  fill: var(--study-anim-ink);
}

.look__cheek {
  fill: rgba(255, 148, 168, 0.62);
}

.look__smile {
  fill: none;
  stroke: var(--study-anim-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

/* 静止态 = 看完的姿势：放大镜停在第 3 个小家伙身上。 */
.look__glass {
  transform-box: view-box;
  transform-origin: 0 0;
  transform: translate(140px, 0);
}

.look__glass-ring {
  fill: rgba(255, 255, 255, 0.34);
  stroke: var(--study-anim-ink);
  stroke-width: 7;
  stroke-linecap: round;
}

.look__glass-handle {
  stroke: var(--study-anim-ink);
  stroke-width: 11;
  stroke-linecap: round;
}

.look__glass-gleam {
  fill: rgba(255, 255, 255, 0.9);
}

.look__spark {
  transform-box: view-box;
  transform-origin: 262px 68px;
  opacity: 1;
}

.look__spark-shape {
  fill: var(--study-anim-warm);
}

.is-active .look__glass {
  animation: look-sweep 4.6s ease-in-out infinite;
}

.is-active .look__pal--one {
  animation: look-pop-one 4.6s ease-in-out infinite;
}

.is-active .look__pal--two {
  animation: look-pop-two 4.6s ease-in-out infinite;
}

.is-active .look__pal--three {
  animation: look-pop-three 4.6s ease-in-out infinite;
}

.is-active .look__spark {
  animation: look-spark 4.6s ease-in-out infinite;
}

@keyframes look-sweep {
  0%,
  18% {
    transform: translate(0, 0);
  }

  40%,
  56% {
    transform: translate(70px, 0);
  }

  78%,
  100% {
    transform: translate(140px, 0);
  }
}

@keyframes look-pop-one {
  0% {
    transform: scale(1.1);
    opacity: 1;
  }

  26%,
  100% {
    transform: scale(1);
    opacity: 0.82;
  }
}

@keyframes look-pop-two {
  0%,
  24% {
    transform: scale(1);
    opacity: 0.82;
  }

  44% {
    transform: scale(1.1);
    opacity: 1;
  }

  62%,
  100% {
    transform: scale(1);
    opacity: 0.82;
  }
}

@keyframes look-pop-three {
  0%,
  62% {
    transform: scale(1);
    opacity: 0.82;
  }

  82%,
  100% {
    transform: scale(1.1);
    opacity: 1;
  }
}

@keyframes look-spark {
  0%,
  78% {
    opacity: 0;
    transform: scale(0.5) rotate(-14deg);
  }

  90% {
    opacity: 1;
    transform: scale(1.12) rotate(8deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-active .look__glass,
  .is-active .look__pal--one,
  .is-active .look__pal--two,
  .is-active .look__pal--three,
  .is-active .look__spark {
    animation: none;
  }
}
</style>
