<script setup>
import { computed } from "vue";

const props = defineProps({
  sections: {
    type: Array,
    default: () => []
  },
  activeSectionId: {
    type: String,
    default: ""
  },
  adminModeLabel: {
    type: String,
    default: "本机模式"
  },
  catalogContextLabel: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["section-select"]);

const toolCards = computed(() => props.sections.filter((section) => section.id !== "tools-overview"));
</script>

<template>
  <section class="tools-overview">
    <article class="tools-overview__hero">
      <div class="tools-overview__copy">
        <p class="tools-overview__eyebrow">Workspace Overview</p>
        <h2 class="tools-overview__title">工具台把题库、导入和讲堂缓存收在同一套工作区里。</h2>
        <p class="tools-overview__summary">
          当前访问方式：{{ adminModeLabel }}<span v-if="catalogContextLabel"> · {{ catalogContextLabel }}</span>
        </p>
      </div>

      <div class="tools-overview__chips" aria-label="工具台摘要">
        <span class="tools-overview__chip">统一左栏切换</span>
        <span class="tools-overview__chip">右侧单模块工作区</span>
        <span class="tools-overview__chip">保留现有题库与导入能力</span>
      </div>
    </article>

    <div class="tools-overview__grid">
      <article
        v-for="section in toolCards"
        :key="section.id"
        :class="['tools-overview__card', { 'tools-overview__card--active': activeSectionId === section.id }]"
      >
        <div class="tools-overview__card-copy">
          <p class="tools-overview__card-eyebrow">{{ section.sectionTitle }}</p>
          <h3 class="tools-overview__card-title">{{ section.navLabel }}</h3>
          <p class="tools-overview__card-text">{{ section.description }}</p>
        </div>

        <button class="tools-overview__card-action" type="button" @click="emit('section-select', section.id)">
          进入{{ section.navLabel }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.tools-overview {
  display: grid;
  gap: 18px;
}

.tools-overview__hero,
.tools-overview__card {
  display: grid;
  gap: 14px;
  padding: 22px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(251, 254, 255, 0.94) 0%, rgba(247, 251, 254, 0.9) 100%);
  box-shadow: 0 18px 30px -30px rgba(36, 50, 74, 0.32);
}

.tools-overview__hero {
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.18) 0%, rgba(173, 235, 255, 0) 34%),
    linear-gradient(180deg, rgba(251, 254, 255, 0.96) 0%, rgba(246, 250, 253, 0.92) 100%);
}

.tools-overview__copy {
  display: grid;
  gap: 8px;
}

.tools-overview__eyebrow,
.tools-overview__card-eyebrow {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tools-overview__title,
.tools-overview__card-title {
  margin: 0;
  color: var(--color-ink, #24324a);
  line-height: 1.25;
}

.tools-overview__title {
  font-size: clamp(1.28rem, 2.2vw, 1.68rem);
}

.tools-overview__summary,
.tools-overview__card-text {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  line-height: 1.6;
}

.tools-overview__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tools-overview__chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink, #24324a);
  font-size: 0.84rem;
  font-weight: 700;
}

.tools-overview__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.tools-overview__card-copy {
  display: grid;
  gap: 8px;
}

.tools-overview__card--active {
  border-color: rgba(124, 216, 184, 0.34);
  box-shadow:
    0 18px 30px -30px rgba(36, 50, 74, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.tools-overview__card-action {
  min-height: 40px;
  padding: 9px 14px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 14px;
  background: rgba(248, 251, 253, 0.9);
  color: var(--color-ink, #24324a);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.tools-overview__card-action:hover,
.tools-overview__card-action:focus-visible {
  border-color: rgba(124, 216, 184, 0.36);
  background: rgba(244, 252, 248, 0.96);
  box-shadow: 0 14px 24px -24px rgba(36, 50, 74, 0.34);
  outline: none;
  transform: translateY(-1px);
}

@media (max-width: 1120px) {
  .tools-overview__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .tools-overview__hero,
  .tools-overview__card {
    padding: 18px;
    border-radius: 20px;
  }

  .tools-overview__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
