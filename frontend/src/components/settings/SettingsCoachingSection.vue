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
  },
  aiReviewVoiceOptions: {
    type: Array,
    default: () => []
  },
  aiReviewSpeedOptions: {
    type: Array,
    default: () => []
  },
  aiReviewLengthOptions: {
    type: Array,
    default: () => []
  },
  homeWelcomeVoiceModeOptions: {
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

    <p class="settings-card__note">控制答题后的节奏、首页欢迎语音，以及猫头鹰讲解的音色和提醒密度。低年级会更短更口语，高年级会更稳一些。</p>

    <div class="settings-form settings-form--single">
      <label class="settings-switch-card">
        <input v-model="coachingDraft.autoAdvanceOnCorrect" type="checkbox" />
        <span class="settings-switch-card__copy">
          <strong class="settings-switch-card__title">答对后自动继续</strong>
          <span class="settings-switch-card__note">开启后，答对题会按当前节奏自动跳到下一题。</span>
        </span>
      </label>

      <label class="settings-switch-card">
        <input v-model="coachingDraft.autoPlayAiReviewOnWrong" type="checkbox" />
        <span class="settings-switch-card__copy">
          <strong class="settings-switch-card__title">答错后自动播报猫头鹰点评</strong>
          <span class="settings-switch-card__note">开启后，答错或超时题会自动尝试播放猫头鹰讲解。</span>
        </span>
      </label>

      <label class="settings-switch-card">
        <input v-model="coachingDraft.autoPlayAiReviewOnCorrect" type="checkbox" />
        <span class="settings-switch-card__copy">
          <strong class="settings-switch-card__title">答对后自动播报猫头鹰点评</strong>
          <span class="settings-switch-card__note">开启后，答对题也会自动播报一句提醒；若同时开启自动继续，会等播报结束后再切题。</span>
        </span>
      </label>
    </div>

    <div class="settings-form">
      <label class="settings-field settings-field--span">
        <span class="settings-field__label">首页欢迎语音</span>
        <select v-model="coachingDraft.homeWelcomeVoiceMode" class="quiz-toolbar__select">
          <option v-for="option in homeWelcomeVoiceModeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <span class="settings-field__hint">默认点按播放；如果开启自动播报，也只在当天首次进入首页时尝试一次。</span>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">自动继续延时</span>
        <select v-model="coachingDraft.autoAdvanceDelayMs" class="quiz-toolbar__select">
          <option v-for="option in autoAdvanceDelayOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">猫头鹰音色</span>
        <select v-model="coachingDraft.aiReviewVoice" class="quiz-toolbar__select">
          <option v-for="option in aiReviewVoiceOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">猫头鹰语速</span>
        <select v-model="coachingDraft.aiReviewSpeed" class="quiz-toolbar__select">
          <option v-for="option in aiReviewSpeedOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">讲解长度</span>
        <select v-model="coachingDraft.aiReviewLength" class="quiz-toolbar__select">
          <option v-for="option in aiReviewLengthOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
  </section>
</template>
