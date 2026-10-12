<script setup>
import { ref } from "vue";
const props = defineProps({ label: { type: String, required: true }, count: { type: Number, default: 0 }, countLabel: { type: String, default: "" }, defaultOpen: Boolean });
const detailsRef = ref(null);
const initiallyOpen = props.defaultOpen;
// 原生 details 保留手动展开状态；仅在定位保存的记录时主动展开。
defineExpose({ open: () => { if (detailsRef.value) detailsRef.value.open = true; } });
</script>
<template>
  <details ref="detailsRef" class="book-month" :open="initiallyOpen">
    <summary class="book-month__summary">
      <span class="book-month__chevron" aria-hidden="true">›</span>
      <span class="book-month__label">{{ label }}</span>
      <span class="book-month__count">{{ countLabel || `${count} 件事` }}</span>
    </summary>
    <slot />
  </details>
</template>
<style scoped>
.book-month__summary { display: flex; align-items: center; gap: 10px; padding: 14px 2px; cursor: pointer; list-style: none; color: var(--color-ink); }
.book-month__summary::-webkit-details-marker { display: none; }
.book-month__chevron { display: inline-block; font-size: 1.5rem; line-height: 1; width: 16px; text-align: center; color: #647966; }
.book-month[open] > summary .book-month__chevron { transform: rotate(90deg); }
.book-month__label { font-size: 1rem; font-weight: 700; }
.book-month__count { margin-left: auto; font-size: .85rem; color: var(--color-ink-soft); }
.book-month__summary:focus-visible { outline: 3px solid #77b596; outline-offset: 3px; border-radius: 6px; }
</style>
