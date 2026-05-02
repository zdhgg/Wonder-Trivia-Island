<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  titleId: {
    type: String,
    required: true
  },
  headingEyebrow: {
    type: String,
    default: ""
  },
  headingTitle: {
    type: String,
    required: true
  },
  headingDescription: {
    type: String,
    default: ""
  },
  closeLabel: {
    type: String,
    default: "关闭弹窗"
  },
  closeButtonText: {
    type: String,
    default: "关闭"
  },
  panelClass: {
    type: [String, Array, Object],
    default: ""
  },
  disableClose: {
    type: Boolean,
    default: false
  },
  initialFocusSelector: {
    type: String,
    default: '[data-modal-primary]'
  }
});

const emit = defineEmits(["update:modelValue"]);

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const BODY_MODAL_COUNT_KEY = "modalOpenCount";

function setBodyScrollLock(isLocked) {
  if (typeof document === "undefined") {
    return;
  }

  const currentLockCount = Number.parseInt(document.body.dataset[BODY_MODAL_COUNT_KEY] || "0", 10) || 0;
  const nextLockCount = isLocked ? currentLockCount + 1 : Math.max(0, currentLockCount - 1);

  document.body.dataset[BODY_MODAL_COUNT_KEY] = String(nextLockCount);
  document.body.classList.toggle("body--modal-open", nextLockCount > 0);

  if (nextLockCount === 0) {
    delete document.body.dataset[BODY_MODAL_COUNT_KEY];
  }
}

const panelRef = ref(null);
const dialogClasses = computed(() => ["modal-dialog__panel", props.panelClass]);

let triggerElement = null;
let bodyLocked = false;
let keydownListenerAttached = false;

function closeModal() {
  if (props.disableClose) {
    return;
  }

  emit("update:modelValue", false);
}

function rememberTriggerElement() {
  if (typeof document === "undefined") {
    triggerElement = null;
    return;
  }

  triggerElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function restoreTriggerFocus() {
  if (triggerElement instanceof HTMLElement && triggerElement.isConnected) {
    triggerElement.focus();
  }

  triggerElement = null;
}

function getFocusableElements() {
  if (!panelRef.value) {
    return [];
  }

  return Array.from(panelRef.value.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.hasAttribute("hidden")) {
      return false;
    }

    const styles = window.getComputedStyle(element);
    return styles.display !== "none" && styles.visibility !== "hidden";
  });
}

function focusInitialElement() {
  if (!panelRef.value) {
    return;
  }

  const primaryElement = props.initialFocusSelector
    ? panelRef.value.querySelector(props.initialFocusSelector)
    : null;

  if (primaryElement instanceof HTMLElement) {
    primaryElement.focus();
    return;
  }

  const [firstFocusableElement] = getFocusableElements();

  if (firstFocusableElement instanceof HTMLElement) {
    firstFocusableElement.focus();
    return;
  }

  panelRef.value.focus();
}

function trapFocus(event) {
  const focusableElements = getFocusableElements();

  if (!focusableElements.length) {
    event.preventDefault();
    panelRef.value?.focus();
    return;
  }

  const firstFocusableElement = focusableElements[0];
  const lastFocusableElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;
  const focusInsideDialog = activeElement instanceof HTMLElement && panelRef.value?.contains(activeElement);

  if (!focusInsideDialog) {
    event.preventDefault();
    (event.shiftKey ? lastFocusableElement : firstFocusableElement).focus();
    return;
  }

  if (event.shiftKey && activeElement === firstFocusableElement) {
    event.preventDefault();
    lastFocusableElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastFocusableElement) {
    event.preventDefault();
    firstFocusableElement.focus();
  }
}

function handleWindowKeydown(event) {
  if (!props.modelValue) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }

  if (event.key === "Tab") {
    trapFocus(event);
  }
}

function attachKeydownListener() {
  if (keydownListenerAttached || typeof window === "undefined") {
    return;
  }

  window.addEventListener("keydown", handleWindowKeydown);
  keydownListenerAttached = true;
}

function detachKeydownListener() {
  if (!keydownListenerAttached || typeof window === "undefined") {
    return;
  }

  window.removeEventListener("keydown", handleWindowKeydown);
  keydownListenerAttached = false;
}

watch(
  () => props.modelValue,
  async (isOpen, wasOpen) => {
    if (isOpen) {
      rememberTriggerElement();

      if (!bodyLocked) {
        setBodyScrollLock(true);
        bodyLocked = true;
      }

      attachKeydownListener();
      await nextTick();
      focusInitialElement();
      return;
    }

    detachKeydownListener();

    if (bodyLocked) {
      setBodyScrollLock(false);
      bodyLocked = false;
    }

    if (wasOpen) {
      await nextTick();
      restoreTriggerFocus();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  detachKeydownListener();

  if (bodyLocked) {
    setBodyScrollLock(false);
    bodyLocked = false;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-dialog">
        <button
          class="modal-dialog__backdrop"
          type="button"
          :aria-label="closeLabel"
          :disabled="disableClose"
          @click="closeModal"
        ></button>

        <div
          ref="panelRef"
          :class="dialogClasses"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <div class="modal-dialog__header">
            <div class="modal-dialog__copy">
              <p v-if="headingEyebrow" class="modal-dialog__eyebrow">{{ headingEyebrow }}</p>
              <h2 :id="titleId" class="modal-dialog__title">{{ headingTitle }}</h2>
              <p v-if="headingDescription" class="modal-dialog__text">{{ headingDescription }}</p>
            </div>

            <button class="modal-dialog__close" type="button" :disabled="disableClose" @click="closeModal">
              {{ closeButtonText }}
            </button>
          </div>

          <div class="modal-dialog__content">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-dialog {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal-dialog__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 38%),
    rgba(36, 50, 74, 0.56);
  backdrop-filter: blur(6px);
  cursor: pointer;
}

.modal-dialog__backdrop:disabled {
  cursor: progress;
}

.modal-dialog__panel {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(760px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1.5px solid rgba(36, 50, 74, 0.16);
  border-radius: 34px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
  box-shadow:
    0 32px 64px -38px rgba(36, 50, 74, 0.58),
    0 12px 24px -20px rgba(36, 50, 74, 0.26);
  outline: none;
}

.modal-dialog__panel::before {
  content: "";
  position: absolute;
  top: -48px;
  right: -44px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 231, 156, 0.26) 0%, rgba(255, 231, 156, 0) 70%);
  pointer-events: none;
}

.modal-dialog__header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid rgba(36, 50, 74, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0) 100%);
}

.modal-dialog__copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.modal-dialog__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.modal-dialog__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.8rem;
  line-height: 1.05;
}

.modal-dialog__text {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
  line-height: 1.55;
}

.modal-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 10px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font: inherit;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.modal-dialog__close:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.5);
  box-shadow: 0 14px 24px -24px rgba(36, 50, 74, 0.42);
}

.modal-dialog__close:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.8);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.2);
}

.modal-dialog__close:disabled {
  cursor: progress;
  opacity: 0.7;
}

.modal-dialog__content {
  min-height: 0;
  overflow: auto;
  padding: 18px 22px 22px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 220ms ease;
}

.modal-fade-enter-active .modal-dialog__backdrop,
.modal-fade-leave-active .modal-dialog__backdrop,
.modal-fade-enter-active .modal-dialog__panel,
.modal-fade-leave-active .modal-dialog__panel {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-dialog__backdrop,
.modal-fade-leave-to .modal-dialog__backdrop {
  opacity: 0;
}

.modal-fade-enter-from .modal-dialog__panel,
.modal-fade-leave-to .modal-dialog__panel {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}

@media (max-width: 680px) {
  .modal-dialog {
    padding: 14px;
  }

  .modal-dialog__panel {
    max-height: calc(100vh - 28px);
  }

  .modal-dialog__header {
    display: grid;
    padding: 18px 18px 16px;
  }

  .modal-dialog__close {
    width: 100%;
  }

  .modal-dialog__content {
    padding: 16px 18px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active,
  .modal-fade-enter-active .modal-dialog__backdrop,
  .modal-fade-leave-active .modal-dialog__backdrop,
  .modal-fade-enter-active .modal-dialog__panel,
  .modal-fade-leave-active .modal-dialog__panel {
    transition: none;
    transform: none;
  }

  .modal-dialog__close,
  .modal-dialog__close:hover {
    transition: none;
    transform: none;
  }
}
</style>
