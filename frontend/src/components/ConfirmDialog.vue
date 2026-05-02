<script setup>
import { computed } from "vue";
import ModalDialog from "./ModalDialog.vue";

const BUTTON_TONE_CLASS_MAP = {
  neutral: "",
  accent: "btn-cartoon--mint",
  warning: "btn-cartoon--yellow",
  danger: "btn-cartoon--pink"
};
const SEMANTIC_TONE_PRESET_MAP = {
  neutral: {
    confirmTone: "neutral",
    statusTone: "neutral"
  },
  warning: {
    confirmTone: "warning",
    statusTone: "warning"
  },
  danger: {
    confirmTone: "danger",
    statusTone: "error"
  },
  success: {
    confirmTone: "accent",
    statusTone: "success"
  }
};

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
    default: "关闭确认弹窗"
  },
  semanticTone: {
    type: String,
    default: "neutral"
  },
  panelClass: {
    type: [String, Array, Object],
    default: ""
  },
  noticeText: {
    type: String,
    default: ""
  },
  metaText: {
    type: String,
    default: ""
  },
  previewLabel: {
    type: String,
    default: ""
  },
  previewText: {
    type: String,
    default: ""
  },
  chips: {
    type: Array,
    default: () => []
  },
  cancelText: {
    type: String,
    default: "取消"
  },
  cancelTone: {
    type: String,
    default: "neutral"
  },
  cancelButtonClass: {
    type: [String, Array, Object],
    default: ""
  },
  confirmText: {
    type: String,
    default: "确认"
  },
  confirmTone: {
    type: String,
    default: "auto"
  },
  confirmLoadingText: {
    type: String,
    default: ""
  },
  confirmButtonClass: {
    type: [String, Array, Object],
    default: ""
  },
  confirmDisabled: {
    type: Boolean,
    default: false
  },
  confirmLoading: {
    type: Boolean,
    default: false
  },
  cancelDisabled: {
    type: Boolean,
    default: false
  },
  statusText: {
    type: String,
    default: ""
  },
  statusTone: {
    type: String,
    default: "auto"
  },
  initialFocusSelector: {
    type: String,
    default: "[data-confirm-cancel]"
  }
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const normalizedChips = computed(() =>
  props.chips
    .map((chip) => (typeof chip === "string" ? { text: chip } : chip))
    .filter((chip) => chip?.text)
);
const resolvedSemanticTone = computed(() =>
  Object.prototype.hasOwnProperty.call(SEMANTIC_TONE_PRESET_MAP, props.semanticTone)
    ? props.semanticTone
    : "neutral"
);
const resolvedSemanticPreset = computed(() => SEMANTIC_TONE_PRESET_MAP[resolvedSemanticTone.value]);
const resolvedConfirmText = computed(() =>
  props.confirmLoading && props.confirmLoadingText ? props.confirmLoadingText : props.confirmText
);
const resolvedCancelDisabled = computed(() => props.cancelDisabled || props.confirmLoading);
const resolvedConfirmDisabled = computed(() => props.confirmDisabled || props.confirmLoading);
const resolvedConfirmTone = computed(() =>
  props.confirmTone === "auto" ? resolvedSemanticPreset.value.confirmTone : props.confirmTone
);
const resolvedStatusTone = computed(() =>
  props.statusTone === "auto" ? resolvedSemanticPreset.value.statusTone : props.statusTone
);
const resolvedPanelClass = computed(() => [
  "confirm-dialog__panel",
  `confirm-dialog__panel--${resolvedSemanticTone.value}`,
  props.panelClass
]);
const statusClasses = computed(() => [
  "confirm-dialog__status",
  `confirm-dialog__status--${resolvedStatusTone.value}`
]);
const cancelButtonClasses = computed(() => [
  "btn-cartoon",
  BUTTON_TONE_CLASS_MAP[props.cancelTone] || "",
  props.cancelButtonClass
]);
const confirmButtonClasses = computed(() => [
  "btn-cartoon",
  BUTTON_TONE_CLASS_MAP[resolvedConfirmTone.value] || "",
  props.confirmButtonClass,
  props.confirmLoading ? "btn-cartoon--loading" : ""
]);

function handleDialogVisibilityChange(value) {
  if (!value) {
    emit("cancel");
  }

  emit("update:modelValue", value);
}

function handleCancel() {
  if (resolvedCancelDisabled.value) {
    return;
  }

  emit("cancel");
  emit("update:modelValue", false);
}

function handleConfirm() {
  if (resolvedConfirmDisabled.value) {
    return;
  }

  emit("confirm");
}
</script>

<template>
  <ModalDialog
    :model-value="modelValue"
    :title-id="titleId"
    :heading-eyebrow="headingEyebrow"
    :heading-title="headingTitle"
    :heading-description="headingDescription"
    :close-label="closeLabel"
    :panel-class="resolvedPanelClass"
    :disable-close="confirmLoading || cancelDisabled"
    :initial-focus-selector="initialFocusSelector"
    @update:model-value="handleDialogVisibilityChange"
  >
    <div class="confirm-dialog">
      <div class="confirm-dialog__body">
        <p v-if="noticeText" class="confirm-dialog__warning">{{ noticeText }}</p>
        <p v-if="metaText" class="confirm-dialog__meta">{{ metaText }}</p>

        <div v-if="previewText" class="confirm-dialog__preview">
          <span v-if="previewLabel" class="confirm-dialog__preview-label">{{ previewLabel }}</span>
          <p class="confirm-dialog__preview-text">{{ previewText }}</p>
        </div>

        <div v-if="normalizedChips.length" class="confirm-dialog__chips">
          <span v-for="chip in normalizedChips" :key="chip.text" class="confirm-dialog__chip">
            {{ chip.text }}
          </span>
        </div>

        <p v-if="statusText" :class="statusClasses">{{ statusText }}</p>

        <slot />
      </div>

      <div class="confirm-dialog__footer">
        <slot
          name="actions"
          :handleCancel="handleCancel"
          :handleConfirm="handleConfirm"
          :cancelText="cancelText"
          :confirmText="resolvedConfirmText"
          :cancelDisabled="resolvedCancelDisabled"
          :confirmDisabled="resolvedConfirmDisabled"
          :confirmLoading="confirmLoading"
          :cancelButtonClasses="cancelButtonClasses"
          :confirmButtonClasses="confirmButtonClasses"
        >
          <div class="confirm-dialog__actions">
            <button
              :class="cancelButtonClasses"
              type="button"
              data-confirm-cancel
              :disabled="resolvedCancelDisabled"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button :class="confirmButtonClasses" type="button" :disabled="resolvedConfirmDisabled" @click="handleConfirm">
              {{ resolvedConfirmText }}
            </button>
          </div>
        </slot>
      </div>
    </div>
  </ModalDialog>
</template>

<style scoped>
:deep(.confirm-dialog__panel) {
  --confirm-dialog-title-color: var(--color-ink);
  --confirm-dialog-eyebrow-color: var(--color-ink-soft);
  --confirm-dialog-panel-border: rgba(36, 50, 74, 0.16);
  --confirm-dialog-body-bg: linear-gradient(180deg, rgba(255, 251, 230, 0.9) 0%, rgba(255, 255, 255, 0.86) 100%);
  --confirm-dialog-preview-bg: rgba(255, 255, 255, 0.84);
  --confirm-dialog-chip-bg: rgba(255, 255, 255, 0.82);
  --confirm-dialog-chip-border: rgba(36, 50, 74, 0.12);
  --confirm-dialog-warning-bg: rgba(255, 255, 255, 0.82);
  --confirm-dialog-warning-border: rgba(36, 50, 74, 0.12);
  --confirm-dialog-warning-color: var(--color-ink);
  --confirm-dialog-footer-bg: rgba(255, 255, 255, 0.72);
}

:deep(.confirm-dialog__panel .modal-dialog__title) {
  color: var(--confirm-dialog-title-color);
}

:deep(.confirm-dialog__panel .modal-dialog__eyebrow) {
  color: var(--confirm-dialog-eyebrow-color);
}

:deep(.confirm-dialog__panel.modal-dialog__panel) {
  border-color: var(--confirm-dialog-panel-border);
}

:deep(.confirm-dialog__panel--warning) {
  --confirm-dialog-title-color: #8a5b00;
  --confirm-dialog-eyebrow-color: #8a5b00;
  --confirm-dialog-panel-border: rgba(255, 208, 104, 0.48);
  --confirm-dialog-body-bg:
    linear-gradient(180deg, rgba(255, 245, 214, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
  --confirm-dialog-preview-bg: rgba(255, 250, 232, 0.92);
  --confirm-dialog-chip-bg: rgba(255, 247, 220, 0.94);
  --confirm-dialog-chip-border: rgba(255, 208, 104, 0.42);
  --confirm-dialog-warning-bg: rgba(255, 248, 227, 0.96);
  --confirm-dialog-warning-border: rgba(255, 208, 104, 0.42);
  --confirm-dialog-warning-color: #8a5b00;
  --confirm-dialog-footer-bg: rgba(255, 250, 232, 0.78);
}

:deep(.confirm-dialog__panel--danger) {
  --confirm-dialog-title-color: #a23b56;
  --confirm-dialog-eyebrow-color: #a23b56;
  --confirm-dialog-panel-border: rgba(226, 118, 147, 0.42);
  --confirm-dialog-body-bg:
    linear-gradient(180deg, rgba(255, 238, 243, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
  --confirm-dialog-preview-bg: rgba(255, 244, 247, 0.92);
  --confirm-dialog-chip-bg: rgba(255, 238, 243, 0.9);
  --confirm-dialog-chip-border: rgba(226, 118, 147, 0.34);
  --confirm-dialog-warning-bg: rgba(255, 241, 245, 0.96);
  --confirm-dialog-warning-border: rgba(226, 118, 147, 0.34);
  --confirm-dialog-warning-color: #a23b56;
  --confirm-dialog-footer-bg: rgba(255, 244, 247, 0.78);
}

:deep(.confirm-dialog__panel--success) {
  --confirm-dialog-title-color: #1f6b51;
  --confirm-dialog-eyebrow-color: #1f6b51;
  --confirm-dialog-panel-border: rgba(124, 216, 184, 0.42);
  --confirm-dialog-body-bg:
    linear-gradient(180deg, rgba(232, 252, 243, 0.96) 0%, rgba(255, 255, 255, 0.9) 100%);
  --confirm-dialog-preview-bg: rgba(242, 253, 249, 0.94);
  --confirm-dialog-chip-bg: rgba(232, 252, 243, 0.92);
  --confirm-dialog-chip-border: rgba(124, 216, 184, 0.36);
  --confirm-dialog-warning-bg: rgba(242, 253, 249, 0.96);
  --confirm-dialog-warning-border: rgba(124, 216, 184, 0.36);
  --confirm-dialog-warning-color: #1f6b51;
  --confirm-dialog-footer-bg: rgba(242, 253, 249, 0.74);
}

.confirm-dialog {
  display: grid;
  gap: 14px;
}

.confirm-dialog__body {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background: var(--confirm-dialog-body-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.confirm-dialog__warning,
.confirm-dialog__meta,
.confirm-dialog__preview-text {
  margin: 0;
  line-height: 1.65;
}

.confirm-dialog__warning {
  padding: 14px 16px;
  border: 1.5px solid var(--confirm-dialog-warning-border);
  border-radius: 18px;
  background: var(--confirm-dialog-warning-bg);
  color: var(--confirm-dialog-warning-color);
}

.confirm-dialog__meta,
.confirm-dialog__preview-text {
  color: var(--color-ink-soft);
}

.confirm-dialog__meta {
  font-size: 0.94rem;
}

.confirm-dialog__preview {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: var(--confirm-dialog-preview-bg);
}

.confirm-dialog__preview-label {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.confirm-dialog__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.confirm-dialog__chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 12px;
  border: 1.5px solid var(--confirm-dialog-chip-border);
  border-radius: 999px;
  background: var(--confirm-dialog-chip-bg);
  color: var(--color-ink);
  font-size: 0.9rem;
}

.confirm-dialog__status {
  margin: 0;
  padding: 14px 16px;
  border: 1.5px solid transparent;
  border-radius: 18px;
  line-height: 1.6;
}

.confirm-dialog__status--error {
  color: #a23b56;
  background: rgba(255, 228, 236, 0.82);
  border-color: rgba(226, 118, 147, 0.26);
}

.confirm-dialog__status--warning {
  color: #8a5b00;
  background: rgba(255, 245, 214, 0.94);
  border-color: rgba(255, 208, 104, 0.26);
}

.confirm-dialog__status--success {
  color: #1f6b51;
  background: rgba(232, 252, 243, 0.92);
  border-color: rgba(124, 216, 184, 0.24);
}

.confirm-dialog__status--neutral {
  color: var(--color-ink-soft);
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(36, 50, 74, 0.08);
}

.confirm-dialog__footer {
  padding: 16px 18px 0;
  border-top: 1px solid rgba(36, 50, 74, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--confirm-dialog-footer-bg) 100%);
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-dialog__actions .btn-cartoon {
  min-width: 132px;
}

.confirm-dialog__actions .btn-cartoon:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

@media (max-width: 720px) {
  .confirm-dialog__footer {
    padding-top: 14px;
  }

  .confirm-dialog__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
