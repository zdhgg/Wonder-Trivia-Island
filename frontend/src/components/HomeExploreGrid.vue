<script setup>
// 自由探索：原来的功能入口不再全部作为首页一级大卡，
// 收成 4 个轻量入口。“按年级 / 按学科 / 随便练”不再在这里展开小面板，
// 而是和专项强化一样弹模态框（PracticeScopeDialog，由 PracticeHomeView 持有），
// 这里只负责把点击原样往上抛。
defineProps({
  items: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["select-item"]);

function handleSelect(item) {
  emit("select-item", item);
}
</script>

<template>
  <section class="explore" aria-label="自由探索">
    <header class="explore__head">
      <h2 class="explore__title">自由探索</h2>
      <span class="explore__hint">换个方式，发现新知识</span>
    </header>

    <div class="explore__grid">
      <button
        v-for="item in items"
        :key="item.id"
        class="explore__item"
        type="button"
        :aria-label="`${item.title}，${item.hint}`"
        @click="handleSelect(item)"
      >
        <span class="explore__item-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="explore__item-copy">
          <strong class="explore__item-title">{{ item.title }}</strong>
          <span v-if="item.target === 'weak-point'" class="explore__item-hint">{{ item.hint }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.explore {
  display: grid;
  gap: 10px;
}

.explore__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
}

.explore__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.08rem;
  line-height: 1.2;
}

.explore__hint {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 700;
}

.explore__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.explore__item {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 60px;
  padding: 12px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.07);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.explore__item:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.44);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 24px -26px rgba(36, 50, 74, 0.34);
}

.explore__item:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.7);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.22);
}

.explore__item-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 14px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.96) 0%, rgba(232, 248, 255, 0.86) 100%);
  font-size: 1.1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.explore__item-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.explore__item-title {
  color: var(--color-ink);
  font-size: 0.94rem;
  font-weight: 900;
  line-height: 1.25;
}

.explore__item-hint {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.35;
}

@media (max-width: 1040px) {
  .explore__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .explore__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .explore__item { gap: 8px; padding: 10px; }
  .explore__item-icon { width: 28px; height: 30px; }
  .explore__item-title { font-size: .86rem; }
}

@media (prefers-reduced-motion: reduce) {
  .explore__item,
  .explore__item:hover {
    transition: none;
    transform: none;
  }
}
</style>
