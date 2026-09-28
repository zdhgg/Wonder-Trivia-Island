<script setup>
import { computed } from "vue";

const props = defineProps({
  spec: {
    type: Object,
    required: true
  }
});

const groupIndices = computed(() => {
  const count = Math.max(1, Math.min(6, Number(props.spec?.scene?.groupCount) || 1));
  return Array.from({ length: count }, (_, index) => index);
});

const itemIndices = computed(() => {
  const count = Math.max(1, Math.min(8, Number(props.spec?.scene?.itemsPerGroup) || 1));
  return Array.from({ length: count }, (_, index) => index);
});
</script>

<template>
  <div class="micro-animation">
    <header class="micro-animation__header">
      <div>
        <p class="micro-animation__eyebrow">动态关系演示</p>
        <h4 class="micro-animation__title">{{ spec.title }}</h4>
      </div>
      <span class="micro-animation__template">micro_animation</span>
    </header>

    <p class="micro-animation__summary">{{ spec.summary }}</p>

    <div class="micro-animation__stage">
      <svg class="micro-animation__svg" viewBox="0 0 620 230" role="img" :aria-label="spec.scene.expression">
        <g v-for="groupIndex in groupIndices" :key="groupIndex" class="micro-animation__group" :style="{ '--group-index': groupIndex }" :transform="`translate(${28 + groupIndex * (560 / Math.max(groupIndices.length, 1))}, 24)`">
          <rect class="micro-animation__group-box" x="0" y="24" width="72" height="112" rx="18" />
          <text class="micro-animation__group-label" x="36" y="16" text-anchor="middle">{{ spec.scene.groupLabel }}{{ groupIndex + 1 }}</text>
          <g v-for="itemIndex in itemIndices" :key="itemIndex" class="micro-animation__item" :style="{ '--item-index': itemIndex }">
            <circle class="micro-animation__item-dot" :cx="22 + (itemIndex % 4) * 16" :cy="52 + Math.floor(itemIndex / 4) * 28" r="6" />
          </g>
          <text class="micro-animation__item-label" x="36" y="160" text-anchor="middle">{{ spec.scene.itemsPerGroup }}{{ spec.scene.itemLabel }}</text>
        </g>
        <path class="micro-animation__arrow" d="M64 194 H556" />
        <text class="micro-animation__expression" x="310" y="220" text-anchor="middle">{{ spec.scene.expression }}</text>
      </svg>
    </div>

    <div class="micro-animation__legend">
      <span>{{ spec.scene.perGroupLabel }}</span>
      <span>{{ spec.scene.groupCountLabel }}</span>
      <strong>{{ spec.scene.totalLabel }}</strong>
    </div>

    <ol class="micro-animation__steps" aria-label="演示步骤">
      <li v-for="(step, index) in spec.steps" :key="`${step.title}-${index}`">
        <span class="micro-animation__step-number">{{ index + 1 }}</span>
        <span>
          <strong>{{ step.title }}</strong>
          <small>{{ step.text }}</small>
        </span>
      </li>
    </ol>

    <p class="micro-animation__takeaway">{{ spec.takeaway }}</p>
    <p v-if="spec.question" class="micro-animation__question">{{ spec.question }}</p>
  </div>
</template>

<style scoped>
.micro-animation {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(75, 105, 129, 0.16);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(248, 253, 255, 0.98), rgba(239, 248, 244, 0.9));
}

.micro-animation__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.micro-animation__eyebrow {
  margin: 0 0 3px;
  color: #5b6984;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.micro-animation__title {
  margin: 0;
  color: #24324a;
  font-size: 1rem;
}

.micro-animation__template {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #5b6984;
  font-family: "Cascadia Code", Consolas, monospace;
  font-size: 0.67rem;
}

.micro-animation__summary,
.micro-animation__takeaway,
.micro-animation__question {
  margin: 0;
  color: #4d6075;
  font-size: 0.84rem;
  line-height: 1.58;
}

.micro-animation__stage {
  overflow: hidden;
  padding: 8px 4px 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
}

.micro-animation__svg {
  display: block;
  width: 100%;
  min-width: 460px;
  height: auto;
}

.micro-animation__group-box {
  fill: rgba(220, 243, 235, 0.8);
  stroke: #77b9a1;
  stroke-width: 2;
}

.micro-animation__group-label,
.micro-animation__item-label,
.micro-animation__expression {
  fill: #24324a;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-weight: 800;
}

.micro-animation__group-label {
  font-size: 12px;
}

.micro-animation__item-label {
  font-size: 11px;
}

.micro-animation__expression {
  font-size: 17px;
  font-weight: 900;
}

.micro-animation__item-dot {
  fill: #f4796b;
  stroke: #d95f4f;
  stroke-width: 1.5;
  animation: micro-item-pulse 3.6s ease-in-out infinite;
  animation-delay: calc((var(--group-index) * 0.16s) + (var(--item-index) * 0.08s));
}

.micro-animation__arrow {
  fill: none;
  stroke: #e4ad5a;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 8 8;
}

.micro-animation__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.micro-animation__legend span,
.micro-animation__legend strong {
  padding: 6px 9px;
  border-radius: 10px;
  background: rgba(255, 244, 209, 0.74);
  color: #6e5a2a;
  font-size: 0.75rem;
}

.micro-animation__legend strong {
  background: rgba(220, 243, 235, 0.9);
  color: #39715f;
}

.micro-animation__steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.micro-animation__steps li {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  color: #4d6075;
  font-size: 0.8rem;
  line-height: 1.5;
}

.micro-animation__steps li > span:last-child {
  display: grid;
  gap: 2px;
}

.micro-animation__steps strong {
  color: #24324a;
}

.micro-animation__steps small {
  font-size: inherit;
}

.micro-animation__step-number {
  display: grid;
  place-items: center;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #dff2ed;
  color: #39715f;
  font-size: 0.72rem;
  font-weight: 900;
}

.micro-animation__question {
  color: #24324a;
  font-weight: 800;
}

@keyframes micro-item-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.88;
  }

  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .micro-animation__item-dot {
    animation: none;
  }
}

@media (max-width: 560px) {
  .micro-animation__stage {
    overflow-x: auto;
  }
}
</style>
