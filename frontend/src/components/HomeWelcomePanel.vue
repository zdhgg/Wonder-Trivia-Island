<script setup>
import { computed } from "vue";

const props = defineProps({
  eyebrow: {
    type: String,
    default: "欢迎回来"
  },
  title: {
    type: String,
    default: "今天想去哪座岛看看？"
  },
  profileChip: {
    type: String,
    default: ""
  },
  themeTone: {
    type: String,
    default: "morning"
  },
  // 行动建议：由首页聚合层的确定性规则给出（homeDashboard.advice.text）。
  // 旧的 AI 欢迎文案不再参与“今天先做什么”的决策，可以之后再作为陪伴文案复用。
  summary: {
    type: String,
    default: ""
  },
  summarySource: {
    type: String,
    default: ""
  }
});

const panelClass = computed(() => [
  "home-welcome",
  `home-welcome--${["morning", "noon", "afternoon", "evening", "night"].includes(props.themeTone) ? props.themeTone : "morning"}`
]);
const hasSummary = computed(() => Boolean(String(props.summary || "").trim()));
const summarySourceLabel = computed(() => (props.summarySource === "ai" ? "猫头鹰说" : "今日建议"));
</script>

<template>
  <section :class="panelClass" aria-label="首页欢迎区">
    <div class="home-welcome__copy">
      <div class="home-welcome__intro">
        <div class="home-welcome__head">
          <span class="home-welcome__eyebrow">{{ eyebrow }}</span>
          <span v-if="profileChip" class="home-welcome__chip">{{ profileChip }}</span>
        </div>

        <h1 class="home-welcome__title">{{ title }}</h1>
      </div>

      <p v-if="hasSummary" class="home-welcome__summary">
        <span class="home-welcome__summary-tag">{{ summarySourceLabel }}</span>
        <span class="home-welcome__summary-text">{{ summary }}</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.home-welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 28px;
  padding: 4px 2px;
}

.home-welcome__copy {
  display: contents;
}

.home-welcome__intro {
  display: grid;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.home-welcome__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.home-welcome__eyebrow, .home-welcome__chip {
  color: var(--color-ink-soft);
  font-size: .78rem;
  font-weight: 600;
}

.home-welcome__chip {
  padding-left: 10px;
  border-left: 1px solid #ccdcd8;
}

.home-welcome__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.5rem;
  line-height: 1.35;
}

.home-welcome__summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  max-width: 48%;
  margin: 0;
  font-size: .8rem;
  line-height: 1.6;
  color: var(--color-ink-soft);
}

.home-welcome__summary-tag {
  flex-shrink: 0;
  color: #427466;
  font-weight: 700;
}

@media (max-width: 720px) {
  .home-welcome {
    display: grid;
    gap: 8px;
  }
  .home-welcome__title {
    font-size: 1.2rem;
  }
  .home-welcome__summary {
    max-width: 100%;
    font-size: .76rem;
  }
}
</style>
