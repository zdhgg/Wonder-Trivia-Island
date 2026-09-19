<script setup>
// 老师的小提醒：系统有明确推荐时才出现，最多两条，避免首页又变成“入口平铺”。
defineProps({
  tips: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["select-tip"]);
</script>

<template>
  <section v-if="tips.length" class="teacher-tips" aria-label="老师的小提醒">
    <h2 class="teacher-tips__title">老师的小提醒</h2>

    <ul class="teacher-tips__list">
      <li v-for="tip in tips" :key="tip.id" class="teacher-tips__item">
        <div class="teacher-tips__copy">
          <span class="teacher-tips__icon" aria-hidden="true">{{ tip.icon }}</span>
          <span class="teacher-tips__text">{{ tip.title }}</span>
        </div>
        <button
          class="teacher-tips__action"
          type="button"
          :aria-label="`${tip.title}，${tip.actionLabel}`"
          @click="emit('select-tip', tip)"
        >
          {{ tip.actionLabel }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.teacher-tips {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1.5px dashed rgba(36, 50, 74, 0.14);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
}

.teacher-tips__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.08rem;
  line-height: 1.2;
}

.teacher-tips__list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-tips__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.teacher-tips__copy {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.teacher-tips__icon {
  font-size: 1.06rem;
  line-height: 1;
}

.teacher-tips__text {
  color: var(--color-ink);
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.4;
}

.teacher-tips__action {
  appearance: none;
  flex-shrink: 0;
  min-height: 34px;
  padding: 6px 14px;
  border: 1.5px solid rgba(124, 216, 184, 0.5);
  border-radius: 999px;
  background: rgba(184, 242, 223, 0.42);
  color: var(--color-ink);
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.teacher-tips__action:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.78);
  background: rgba(184, 242, 223, 0.62);
}

.teacher-tips__action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .teacher-tips__action,
  .teacher-tips__action:hover {
    transition: none;
    transform: none;
  }
}
</style>
