<script setup>
import { ref } from "vue";

// 自由探索：原来的功能入口不再全部作为首页一级大卡，
// 收成 4 个轻量入口；“按年级 / 按学科 / 随便练”放进一个小面板里，能力一个不少。
defineProps({
  items: {
    type: Array,
    default: () => []
  },
  practiceScope: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  "select-item",
  "start-grade-practice",
  "start-subject-practice",
  "start-free-practice"
]);

const isPracticePanelOpen = ref(false);

function handleSelect(item) {
  if (item?.target === "free-practice") {
    isPracticePanelOpen.value = !isPracticePanelOpen.value;
    return;
  }

  isPracticePanelOpen.value = false;
  emit("select-item", item);
}

function handlePracticeOption(optionId) {
  isPracticePanelOpen.value = false;

  if (optionId === "grade-practice") {
    emit("start-grade-practice");
    return;
  }

  if (optionId === "subject-practice") {
    emit("start-subject-practice");
    return;
  }

  emit("start-free-practice");
}
</script>

<template>
  <section class="explore" aria-label="自由探索">
    <header class="explore__head">
      <h2 class="explore__title">自由探索</h2>
      <span class="explore__hint">主线做完了，也可以来这里逛逛</span>
    </header>

    <div class="explore__grid">
      <button
        v-for="item in items"
        :key="item.id"
        class="explore__item"
        type="button"
        :aria-expanded="item.target === 'free-practice' ? isPracticePanelOpen : null"
        :aria-label="`${item.title}，${item.hint}`"
        @click="handleSelect(item)"
      >
        <span class="explore__item-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="explore__item-copy">
          <strong class="explore__item-title">{{ item.title }}</strong>
          <span class="explore__item-hint">{{ item.hint }}</span>
        </span>
      </button>
    </div>

    <div v-if="isPracticePanelOpen" class="explore__panel" aria-label="选择练习方式">
      <button
        v-for="option in practiceScope"
        :key="option.id"
        class="explore__panel-option"
        type="button"
        :aria-label="option.ariaLabel"
        @click="handlePracticeOption(option.id)"
      >
        <span class="explore__panel-label">{{ option.label }}</span>
        <span class="explore__panel-meta">{{ option.meta }}</span>
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
  min-height: 66px;
  padding: 12px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.07);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 18px -24px rgba(36, 50, 74, 0.26);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.explore__item:hover {
  transform: translateY(-2px);
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

.explore__panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  border: 1.5px dashed rgba(36, 50, 74, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  animation: explore-panel-in 180ms ease both;
}

.explore__panel-option {
  appearance: none;
  display: grid;
  gap: 3px;
  align-content: center;
  min-height: 54px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.09);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease;
}

.explore__panel-option:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.5);
}

.explore__panel-option:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.22);
}

.explore__panel-label {
  font-size: 0.92rem;
  font-weight: 900;
}

.explore__panel-meta {
  color: var(--color-ink-soft);
  font-size: 0.74rem;
  font-weight: 700;
}

@keyframes explore-panel-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1040px) {
  .explore__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .explore__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .explore__panel {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .explore__item,
  .explore__item:hover,
  .explore__panel,
  .explore__panel-option,
  .explore__panel-option:hover {
    transition: none;
    transform: none;
    animation: none;
  }
}
</style>
