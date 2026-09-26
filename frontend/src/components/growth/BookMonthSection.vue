<script setup>
// 纪念册里的一个月（Phase 2D-E1）。
//
// 为什么要单独拆一个组件：`<details>` 的 open 是**浏览器自己的状态**，
// 而 `:open` 是响应式绑定——每次 patch 都会按表达式重写 DOM。
// 两者一起用就会出现「用户刚收起，又被 Vue 弹开」或者「自动展开了又被关上」。
//
// 所以这里的规矩很简单：**open 只在挂载时设一次**，之后完全交给浏览器和用户。
// 组件重挂载意味着换了一个月份组（或换了页签），那时重新按规则决定是否展开。
import { ref } from "vue";

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  // 挂载时是否展开（只有最新那个月是 true）。
  defaultOpen: {
    type: Boolean,
    default: false
  },
  // 一句「多少件事」的文案；不传就按 count 拼。
  countLabel: {
    type: String,
    default: ""
  }
});

// 初值只取一次：之后的 open 变化由浏览器负责，不再受 props 影响。
const isOpen = ref(props.defaultOpen);
const resolvedCountLabel = () => props.countLabel || `${props.count} 件事`;
</script>

<template>
  <details class="book-month" :open="isOpen">
    <summary class="book-month__summary">
      <span class="book-month__label">{{ label }}</span>
      <span class="book-month__count">{{ resolvedCountLabel() }}</span>
    </summary>

    <slot />
  </details>
</template>

<style scoped>
.book-month {
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow: 0 20px 30px -36px rgba(36, 50, 74, 0.28);
  overflow: hidden;
}

.book-month__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 18px;
  cursor: pointer;
  list-style: none;
}

.book-month__summary::-webkit-details-marker {
  display: none;
}

.book-month__summary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

.book-month__label {
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.1rem;
}

.book-month__count {
  color: var(--color-ink-soft);
  font-size: 0.85rem;
  font-weight: 700;
}
</style>
