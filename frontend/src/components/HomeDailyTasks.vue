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
  <section id="today-tasks" class="daily-tasks" aria-label="今日小任务">
    <header>
      <div class="daily-tasks__head-copy">
        <h2 class="daily-tasks__title">今日小任务</h2>
        <span class="daily-tasks__hint">慢慢来，一件一件完成</span>
      </div>
    </header>

    <!-- 今日宝箱的紧凑奖励状态条：由首页放在任务列表上方，
         读起来是“做完这三个任务之后的奖励状态”，不是第二张主卡。 -->
    <div v-if="$slots.chest" class="daily-tasks__chest">
      <slot name="chest" />
    </div>

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
            <span v-if="task.hint" class="daily-tasks__recommendation">{{ task.hint }}</span>
            <span class="daily-tasks__progress">{{ task.progressText }}</span>
          </span>
          <span class="daily-tasks__state" aria-hidden="true">{{ task.done ? "✓" : "›" }}</span>
          <span class="daily-tasks__sr">
            {{ task.label }}，已完成 {{ task.progressText }}<template v-if="task.hint">，{{ task.hint }}</template><template v-if="task.done">，今天的小目标完成了</template>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.daily-tasks {
  display: grid;
  gap: 12px;
  align-content: start;
  height: 100%;
  padding: 20px;
  border: 1px solid #e0e9e5;
  border-radius: 22px;
  background: rgba(255,255,255,.9);
}

.daily-tasks__head-copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.daily-tasks__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.15rem;
  line-height: 1.4;
}

.daily-tasks__hint {
  color: var(--color-ink-soft);
  font-size: .75rem;
  font-weight: 500;
}

.daily-tasks__list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.daily-tasks__item + .daily-tasks__item {
  border-top: 1px solid #edf1ef;
}

.daily-tasks__button {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  width: 100%;
  min-height: 50px;
  padding: 6px 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 150ms ease;
}

.daily-tasks__button:hover {
  background: #f3f8f5;
}

.daily-tasks__button:focus-visible {
  outline: 3px solid #6aad9b;
  outline-offset: 2px;
}

.daily-tasks__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: #f0f6f2;
  font-size: 1.15rem;
}

.daily-tasks__item--done .daily-tasks__icon {
  background: #e4f4eb;
}

.daily-tasks__copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.daily-tasks__label {
  font-size: .92rem;
  font-weight: 700;
}

.daily-tasks__progress {
  grid-column: 2;
  grid-row: 1 / span 2;
  color: var(--color-ink-soft);
  font-size: .8rem;
  font-weight: 600;
}

.daily-tasks__recommendation {
  grid-column: 1;
  overflow: hidden;
  color: #427466;
  font-size: .74rem;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.daily-tasks__state {
  flex-shrink: 0;
  width: 15px;
  color: #7b948c;
  font-size: 1.1rem;
}

.daily-tasks__item--done .daily-tasks__progress, .daily-tasks__item--done .daily-tasks__state {
  color: #286d50;
}

.daily-tasks__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .daily-tasks {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .daily-tasks__button {
    transition: none;
  }
}
</style>
