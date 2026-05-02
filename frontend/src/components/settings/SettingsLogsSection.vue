<script setup>
defineProps({
  activityLogItems: {
    type: Array,
    default: () => []
  },
  formatTimestamp: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["clear-logs"]);
</script>

<template>
  <section id="settings-logs" class="settings-card settings-card--stage settings-section-anchor">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">Activity Log</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>操作日志</h4>
      </div>
      <button class="settings-link-button" type="button" @click="emit('clear-logs')">
        清空
      </button>
    </div>

    <div v-if="activityLogItems.length" class="settings-log">
      <article v-for="item in activityLogItems" :key="item.id" class="settings-log__item">
        <div class="settings-log__topline">
          <strong class="settings-log__title">{{ item.title }}</strong>
          <span class="settings-log__time">{{ formatTimestamp(item.createdAt) }}</span>
        </div>
        <p v-if="item.detail" class="settings-log__detail">{{ item.detail }}</p>
      </article>
    </div>
    <p v-else class="settings-card__note">这里会记录档案保存、AI 配置、声音开关和备份恢复等关键操作。</p>
  </section>
</template>
