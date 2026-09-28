<script setup>
defineProps({
  spec: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="comparison-demo">
    <header class="comparison-demo__header">
      <div>
        <p class="comparison-demo__eyebrow">对比演示</p>
        <h4 class="comparison-demo__title">{{ spec.title }}</h4>
      </div>
      <span class="comparison-demo__template">comparison_demo</span>
    </header>

    <p class="comparison-demo__summary">{{ spec.summary }}</p>

    <div class="comparison-demo__scene" aria-label="两个表达方式对比">
      <article class="comparison-demo__side comparison-demo__side--left">
        <span class="comparison-demo__side-label">{{ spec.scene.left.label }}</span>
        <strong class="comparison-demo__value">{{ spec.scene.left.value }}</strong>
        <p>{{ spec.scene.left.description }}</p>
      </article>
      <div class="comparison-demo__connector" aria-hidden="true">相关</div>
      <article class="comparison-demo__side comparison-demo__side--right">
        <span class="comparison-demo__side-label">{{ spec.scene.right.label }}</span>
        <strong class="comparison-demo__value">{{ spec.scene.right.value }}</strong>
        <p>{{ spec.scene.right.description }}</p>
      </article>
    </div>

    <ol class="comparison-demo__steps" aria-label="演示步骤">
      <li v-for="(step, index) in spec.steps" :key="`${step.title}-${index}`">
        <span class="comparison-demo__step-number">{{ index + 1 }}</span>
        <span>
          <strong>{{ step.title }}</strong>
          <small>{{ step.text }}</small>
        </span>
      </li>
    </ol>

    <div class="comparison-demo__takeaway">
      <span>记住</span>
      <p>{{ spec.takeaway }}</p>
    </div>
    <p v-if="spec.question" class="comparison-demo__question">{{ spec.question }}</p>
  </div>
</template>

<style scoped>
.comparison-demo {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(75, 105, 129, 0.16);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(248, 253, 255, 0.98), rgba(238, 248, 247, 0.9));
}

.comparison-demo__header,
.comparison-demo__scene,
.comparison-demo__takeaway {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.comparison-demo__header {
  align-items: center;
  justify-content: space-between;
}

.comparison-demo__eyebrow {
  margin: 0 0 3px;
  color: #5b6984;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.comparison-demo__title {
  margin: 0;
  color: #24324a;
  font-size: 1rem;
}

.comparison-demo__template {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #5b6984;
  font-family: "Cascadia Code", Consolas, monospace;
  font-size: 0.67rem;
}

.comparison-demo__summary,
.comparison-demo__side p,
.comparison-demo__takeaway p,
.comparison-demo__question {
  margin: 0;
  color: #4d6075;
  font-size: 0.84rem;
  line-height: 1.58;
}

.comparison-demo__scene {
  align-items: stretch;
}

.comparison-demo__side {
  display: grid;
  flex: 1;
  gap: 7px;
  min-width: 0;
  padding: 13px;
  border: 1px solid rgba(75, 105, 129, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.76);
}

.comparison-demo__side--left {
  border-color: rgba(125, 190, 226, 0.55);
}

.comparison-demo__side--right {
  border-color: rgba(243, 191, 127, 0.6);
}

.comparison-demo__side-label {
  color: #5b6984;
  font-size: 0.76rem;
  font-weight: 900;
}

.comparison-demo__value {
  color: #24324a;
  font-size: clamp(1.15rem, 3vw, 1.55rem);
  letter-spacing: 0.03em;
}

.comparison-demo__connector {
  display: grid;
  place-items: center;
  align-self: center;
  flex: 0 0 auto;
  min-width: 34px;
  min-height: 28px;
  border-radius: 999px;
  background: rgba(226, 239, 235, 0.92);
  color: #39715f;
  font-size: 0.72rem;
  font-weight: 900;
}

.comparison-demo__steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comparison-demo__steps li {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  color: #4d6075;
  font-size: 0.8rem;
  line-height: 1.5;
}

.comparison-demo__steps li > span:last-child {
  display: grid;
  gap: 2px;
}

.comparison-demo__steps strong {
  color: #24324a;
}

.comparison-demo__steps small {
  font-size: inherit;
}

.comparison-demo__step-number {
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

.comparison-demo__takeaway {
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 244, 209, 0.74);
}

.comparison-demo__takeaway > span {
  flex: 0 0 auto;
  color: #8b6514;
  font-size: 0.76rem;
  font-weight: 900;
}

.comparison-demo__question {
  padding-top: 2px;
  color: #24324a;
  font-weight: 800;
}

@media (max-width: 560px) {
  .comparison-demo__scene {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .comparison-demo__connector {
    justify-self: center;
    transform: rotate(90deg);
  }
}
</style>
