<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div :class="['study-anim', 'study-anim--keep', { 'is-active': active }]">
    <svg class="study-anim__svg" viewBox="0 0 320 232" role="presentation" aria-hidden="true" focusable="false">
      <rect class="keep__backdrop" x="46" y="46" width="228" height="168" rx="34" />

      <g class="keep__card">
        <rect class="keep__card-body" x="84" y="86" width="152" height="104" rx="22" />
        <circle class="keep__card-eye" cx="136" cy="126" r="5.4" />
        <circle class="keep__card-eye" cx="184" cy="126" r="5.4" />
        <circle class="keep__card-cheek" cx="122" cy="144" r="5" />
        <circle class="keep__card-cheek" cx="198" cy="144" r="5" />
        <path class="keep__card-smile" d="M148 142 Q160 154 172 142" />
        <rect class="keep__card-line keep__card-line--one" x="106" y="166" width="108" height="8" rx="4" />
      </g>

      <g class="keep__lid">
        <rect class="keep__lid-body" x="62" y="52" width="196" height="34" rx="17" />
        <rect class="keep__lid-grip" x="142" y="38" width="36" height="16" rx="8" />
      </g>

      <g class="keep__heart">
        <path
          class="keep__heart-shape"
          d="M160 36 C152 20 128 20 123 36 C118 52 142 68 160 82 C178 68 202 52 197 36 C192 20 168 20 160 36 Z"
        />
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

.keep__backdrop {
  fill: var(--study-anim-surface);
  fill-opacity: 0.62;
  stroke: var(--study-anim-line);
  stroke-width: 2;
}

.keep__card {
  transform-box: view-box;
  transform-origin: 160px 190px;
}

.keep__card-body {
  fill: rgba(255, 255, 255, 0.88);
  stroke: var(--study-anim-accent);
  stroke-width: 3;
}

.keep__card-eye {
  fill: var(--study-anim-ink);
}

.keep__card-cheek {
  fill: rgba(255, 148, 168, 0.62);
}

.keep__card-smile {
  fill: none;
  stroke: var(--study-anim-ink);
  stroke-width: 2.6;
  stroke-linecap: round;
}

.keep__card-line {
  fill: var(--study-anim-accent);
  opacity: 0.5;
}

.keep__lid {
  transform-box: view-box;
  transform-origin: 258px 69px;
}

.keep__lid-body {
  fill: var(--study-anim-accent);
}

.keep__lid-grip {
  fill: var(--study-anim-ink);
}

.keep__heart {
  transform-box: view-box;
  transform-origin: 160px 52px;
  opacity: 1;
}

.keep__heart-shape {
  fill: var(--study-anim-warm);
  stroke: var(--study-anim-ink);
  stroke-width: 2.4;
  stroke-linejoin: round;
}

.is-active .keep__lid {
  animation: keep-lid 4.4s ease-in-out infinite;
}

.is-active .keep__card {
  animation: keep-card 4.4s ease-in-out infinite;
}

.is-active .keep__card-line {
  animation: keep-line 4.4s ease-in-out infinite;
}

.is-active .keep__heart {
  animation: keep-heart 4.4s ease-in-out infinite;
}

@keyframes keep-lid {
  0%,
  10% {
    transform: rotate(0deg);
  }

  32%,
  72% {
    transform: rotate(-28deg);
  }

  94%,
  100% {
    transform: rotate(0deg);
  }
}

@keyframes keep-card {
  0%,
  28% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }

  50% {
    transform: translateY(-30px) scale(0.9);
    opacity: 0;
  }

  56%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes keep-line {
  0%,
  30% {
    opacity: 0;
  }

  48%,
  100% {
    opacity: 0.5;
  }
}

@keyframes keep-heart {
  0%,
  74% {
    opacity: 0;
    transform: scale(0.4) translateY(10px);
  }

  88% {
    opacity: 1;
    transform: scale(1.16) translateY(0);
  }

  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-active .keep__lid,
  .is-active .keep__card,
  .is-active .keep__card-line,
  .is-active .keep__heart {
    animation: none;
  }
}
</style>
