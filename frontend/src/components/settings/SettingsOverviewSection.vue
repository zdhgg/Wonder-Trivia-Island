<script setup>
defineProps({
  cards: {
    type: Array,
    default: () => []
  },
  pendingSaveCards: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["open-section"]);
</script>

<template>
  <section id="settings-overview" class="settings-stage settings-stage--overview settings-section-anchor">
    <div class="settings-stage__intro">
      <p class="settings-card__eyebrow">Overview</p>
      <h3 class="settings-stage__title" tabindex="-1" data-settings-section-focus>从左侧选一个分区，右侧只处理这一类设置。</h3>
      <p class="settings-stage__text">
        这样每个设置块都更独立，后续要加更多说明、状态和操作，也不会把整个页面继续拉长。
      </p>
    </div>

    <div v-if="pendingSaveCards.length" class="settings-overview__pending">
      <div class="settings-overview__pending-copy">
        <strong class="settings-overview__pending-title">这些分区还有未保存改动</strong>
        <p class="settings-overview__pending-text">先点进去保存对应分区，或直接用底部的“保存全部改动”。</p>
      </div>
      <div class="settings-overview__pending-chips">
        <button
          v-for="item in pendingSaveCards"
          :key="item.id"
          class="settings-overview__pending-chip"
          type="button"
          @click="emit('open-section', item.id)"
        >
          <span class="settings-overview__pending-chip-title">{{ item.title }}</span>
          <span class="settings-overview__pending-chip-action">{{ item.actionLabel }}</span>
        </button>
      </div>
    </div>

    <div class="settings-overview-grid">
      <button
        v-for="card in cards"
        :key="card.id"
        :class="[
          'settings-overview-card',
          `settings-overview-card--${card.tone}`,
          card.size ? `settings-overview-card--${card.size}` : ''
        ]"
        type="button"
        @click="emit('open-section', card.id)"
      >
        <div class="settings-overview-card__topline">
          <span class="settings-overview-card__eyebrow">{{ card.eyebrow }}</span>
          <span v-if="card.tone === 'warning'" class="settings-overview-card__badge">未保存</span>
        </div>
        <strong class="settings-overview-card__title">{{ card.title }}</strong>
        <p class="settings-overview-card__summary">{{ card.summary }}</p>
        <p class="settings-overview-card__detail">{{ card.detail }}</p>
        <span class="settings-overview-card__action">进入当前分区</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.settings-overview__pending {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 186, 82, 0.24);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 251, 241, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.settings-overview__pending-copy {
  display: grid;
  gap: 4px;
}

.settings-overview__pending-title {
  color: var(--color-ink, #24324a);
  font-size: 0.96rem;
  line-height: 1.35;
}

.settings-overview__pending-text {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.88rem;
  line-height: 1.55;
}

.settings-overview__pending-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-overview__pending-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 186, 82, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--color-ink, #24324a);
  font: inherit;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.settings-overview__pending-chip:hover,
.settings-overview__pending-chip:focus-visible {
  border-color: rgba(255, 186, 82, 0.34);
  background: rgba(255, 252, 241, 0.96);
  outline: none;
  transform: translateY(-1px);
}

.settings-overview__pending-chip-title {
  font-weight: 800;
}

.settings-overview__pending-chip-action {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.82rem;
  font-weight: 700;
}

.settings-overview-card--wide {
  grid-column: 1 / -1;
}
</style>
