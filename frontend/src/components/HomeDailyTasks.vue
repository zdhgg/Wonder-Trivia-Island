<script setup>
// 今日小任务：只展示“今天能做的小目标”，进度来自本地日进度 + 今日真实记录，
// 判断不出完成状态时不伪造。
defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["select-task"]);
</script>

<template>
  <section class="daily-tasks" aria-label="今日小任务">
    <header class="daily-tasks__head">
      <h2 class="daily-tasks__title">今日小任务</h2>
      <span class="daily-tasks__hint">今天慢慢来，一件一件做完就好</span>
    </header>

    <ul class="daily-tasks__list">
      <li
        v-for="task in tasks"
        :key="task.id"
        :class="['daily-tasks__item', `daily-tasks__item--${task.accent}`, { 'daily-tasks__item--done': task.done }]"
      >
        <button class="daily-tasks__button" type="button" @click="emit('select-task', task)">
          <span class="daily-tasks__icon" aria-hidden="true">{{ task.icon }}</span>
          <span class="daily-tasks__copy">
            <span class="daily-tasks__label">{{ task.label }}</span>
            <span class="daily-tasks__progress">{{ task.progressText }}</span>
          </span>
          <span class="daily-tasks__state" aria-hidden="true">{{ task.done ? "✓" : "›" }}</span>
          <span class="daily-tasks__sr">
            {{ task.label }}，已完成 {{ task.progressText }}<template v-if="task.done">，今天的小目标完成了</template>
          </span>
        </button>
        <div class="daily-tasks__track" aria-hidden="true">
          <span
            class="daily-tasks__fill"
            :style="{ width: `${Math.min(100, Math.round((task.value / Math.max(1, task.target)) * 100))}%` }"
          ></span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.daily-tasks {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(184, 242, 223, 0.28), transparent 44%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 254, 251, 0.88) 100%);
  box-shadow:
    0 10px 22px -28px rgba(36, 50, 74, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.daily-tasks__head {
  display: grid;
  gap: 2px;
}

.daily-tasks__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
  line-height: 1.2;
}

.daily-tasks__hint {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
}

.daily-tasks__list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.daily-tasks__item {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid rgba(36, 50, 74, 0.07);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.daily-tasks__item--done {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(238, 252, 246, 0.9);
}

.daily-tasks__button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.daily-tasks__button:focus-visible {
  outline: none;
  border-radius: 12px;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.24);
}

.daily-tasks__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.daily-tasks__copy {
  display: flex;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.daily-tasks__label {
  font-size: 0.94rem;
  font-weight: 800;
}

.daily-tasks__progress {
  color: var(--color-ink-soft);
  font-size: 0.84rem;
  font-weight: 800;
}

.daily-tasks__item--done .daily-tasks__progress {
  color: #1f6b51;
}

.daily-tasks__state {
  flex-shrink: 0;
  color: var(--color-ink-soft);
  font-size: 1rem;
  font-weight: 900;
}

.daily-tasks__item--done .daily-tasks__state {
  color: #1f6b51;
}

.daily-tasks__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.daily-tasks__track {
  position: relative;
  overflow: hidden;
  height: 7px;
  border-radius: 999px;
  background: rgba(36, 50, 74, 0.09);
}

.daily-tasks__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(184, 242, 223, 0.96) 0%, rgba(124, 216, 184, 0.96) 100%);
  transition: width 260ms ease;
}

.daily-tasks__item--done .daily-tasks__fill {
  background: linear-gradient(90deg, rgba(124, 216, 184, 0.98) 0%, rgba(86, 190, 150, 0.98) 100%);
}

@media (prefers-reduced-motion: reduce) {
  .daily-tasks__item,
  .daily-tasks__fill {
    transition: none;
  }
}
</style>
