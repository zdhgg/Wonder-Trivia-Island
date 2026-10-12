<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true }
});
const emit = defineEmits(["close"]);
const dialog = ref(null);
const titleId = useId();
let previousFocus = null;

watch(() => props.open, async (open) => {
  await nextTick();
  if (!dialog.value || props.open !== open) return;
  if (open && !dialog.value.open) {
    previousFocus = document.activeElement;
    dialog.value.showModal();
  } else if (!open && dialog.value.open) {
    dialog.value.close();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
}, { immediate: true });

function onBackdrop(event) {
  if (event.target !== dialog.value) return;
  const rect = dialog.value.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) emit("close");
}
onBeforeUnmount(() => dialog.value?.close());
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="island-dialog" :aria-labelledby="titleId" @cancel.prevent="emit('close')" @click="onBackdrop">
      <header class="island-dialog__head">
        <h2 :id="titleId">{{ title }}</h2>
        <button type="button" aria-label="关闭" autofocus @click="emit('close')">×</button>
      </header>
      <div class="island-dialog__body"><slot /></div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.island-dialog {
  width: min(600px, calc(100% - 32px));
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  border: 1px solid #dce8e8;
  border-radius: 24px;
  color: #263f49;
  background: #fff;
  box-shadow: 0 24px 80px #153b4e30;
  overflow: auto;
  overscroll-behavior: contain;
}

.island-dialog::backdrop {
  background: #163b4e80;
}

.island-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 8px;
}

.island-dialog__head h2 {
  margin: 0;
  font-size: 1.15rem;
}

.island-dialog__head button {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: #f1f6f6;
  color: #46606b;
  font: inherit;
  font-size: 1.6rem;
  cursor: pointer;
}

.island-dialog__head button:hover {
  background: #e3eeed;
}

.island-dialog__head button:focus-visible {
  outline: 3px solid #278879;
  outline-offset: 3px;
}

.island-dialog__body {
  padding: 12px 22px 24px;
}

@media (max-width: 600px) {
  .island-dialog {
    width: 100%;
    max-width: 100%;
    max-height: 88dvh;
    margin: auto 0 0;
    border-radius: 24px 24px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>
