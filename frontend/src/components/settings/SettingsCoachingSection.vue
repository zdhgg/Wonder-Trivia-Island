<script setup>
defineProps({
  coachingDraft: {
    type: Object,
    required: true
  },
  coachingDirty: {
    type: Boolean,
    default: false
  },
  coachingUpdatedLabel: {
    type: String,
    default: ""
  },
  autoAdvanceDelayOptions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["save"]);
</script>

<template>
  <section id="settings-coaching" class="settings-card settings-card--stage settings-section-anchor">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">Study Coach</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>学习陪练</h4>
      </div>
      <div class="settings-card__meta-group">
        <span v-if="coachingDirty" class="settings-card__badge">未保存</span>
        <span class="settings-card__meta">{{ coachingUpdatedLabel }}</span>
      </div>
    </div>

    <p class="settings-card__note">控制答题后的节奏。开启自动继续后，答对题会按当前节奏自动跳到下一题。</p>

    <div class="settings-form settings-form--single">
      <label class="settings-switch-card">
        <input v-model="coachingDraft.autoAdvanceOnCorrect" type="checkbox" />
        <span class="settings-switch-card__copy">
          <strong class="settings-switch-card__title">答对后自动继续</strong>
          <span class="settings-switch-card__note">开启后，答对题会按当前节奏自动跳到下一题。</span>
        </span>
      </label>
    </div>

    <div class="settings-form">
      <label class="settings-field">
        <span class="settings-field__label">自动继续延时</span>
        <select v-model="coachingDraft.autoAdvanceDelayMs" class="quiz-toolbar__select">
          <option v-for="option in autoAdvanceDelayOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
  </section>
</template>
