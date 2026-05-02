<script setup>
import { ref } from "vue";

defineProps({
  isBackupBusy: {
    type: Boolean,
    default: false
  },
  backupStatusMessage: {
    type: String,
    default: ""
  },
  backupStats: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["export-backup", "import-backup"]);
const fileInputRef = ref(null);

function handleOpenImport() {
  fileInputRef.value?.click();
}

function handleFileChange(event) {
  const file = event.target?.files?.[0];

  if (file) {
    if (typeof window !== "undefined") {
      const shouldImport = window.confirm("恢复备份会覆盖当前本机的学习档案、声音偏好和练习设置，是否继续？");

      if (!shouldImport) {
        if (event?.target) {
          event.target.value = "";
        }
        return;
      }
    }

    emit("import-backup", file);
  }

  if (event?.target) {
    event.target.value = "";
  }
}
</script>

<template>
  <section id="settings-backup" class="settings-card settings-card--stage settings-section-anchor">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">Backup</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>数据备份</h4>
      </div>
      <span class="settings-card__meta">{{ isBackupBusy ? "处理中" : "本机 JSON" }}</span>
    </div>

    <p class="settings-card__note">会打包当前学习档案、闯关进度、出题设置、声音偏好和操作日志。</p>

    <div v-if="backupStats.length" class="settings-stats" aria-label="数据概览">
      <article v-for="item in backupStats" :key="item.label" class="settings-stat">
        <span class="settings-stat__label">{{ item.label }}</span>
        <strong class="settings-stat__value">{{ item.value }}</strong>
      </article>
    </div>

    <p v-if="backupStatusMessage" class="settings-status">{{ backupStatusMessage }}</p>

    <div class="settings-card__actions settings-card__actions--dual">
      <button class="btn-cartoon btn-cartoon--yellow" type="button" :disabled="isBackupBusy" @click="emit('export-backup')">
        导出备份
      </button>
      <button class="btn-cartoon" type="button" :disabled="isBackupBusy" @click="handleOpenImport">
        恢复备份
      </button>
    </div>

    <input ref="fileInputRef" class="settings-file-input" type="file" accept=".json,application/json" @change="handleFileChange" />
  </section>
</template>
