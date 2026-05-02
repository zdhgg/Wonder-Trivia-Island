<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { playAudioCue, unlockAudioEngine } from "../audio/audioEngine";
import { useAudioStore } from "../stores/useAudioStore";
import { useSettingsStore } from "../stores/useSettingsStore";

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
});

const audioStore = useAudioStore();
const settingsStore = useSettingsStore();

const { audioReady, isSupported, masterVolume, musicEnabled, musicVolume, sfxEnabled, sfxVolume } = storeToRefs(audioStore);

const audioStatusTone = computed(() => {
  if (!isSupported.value) {
    return "unsupported";
  }

  if (!audioReady.value) {
    return "pending";
  }

  if (masterVolume.value <= 0 || (!musicEnabled.value && !sfxEnabled.value)) {
    return "muted";
  }

  return "live";
});

const audioStatusClass = computed(() => ["audio-console__status", `audio-console__status--${audioStatusTone.value}`]);

const audioStatusLabel = computed(() => {
  if (!isSupported.value) {
    return "当前设备不支持音频";
  }

  if (!audioReady.value) {
    return "等待启用音频";
  }

  if (masterVolume.value <= 0 || (!musicEnabled.value && !sfxEnabled.value)) {
    return "音频已静音";
  }

  return "音频运行中";
});

const audioHint = computed(() => {
  if (!isSupported.value) {
    return "当前环境不支持 WebAudio 或媒体音频，学习流程仍可正常使用。";
  }

  if (!audioReady.value) {
    return "首次进入时先点一次启用音频，后续设置会自动记住。";
  }

  return "背景音乐、答题音效和音量都会自动记住。";
});

const masterVolumeText = computed(() => `${Math.round(masterVolume.value * 100)}%`);
const musicVolumeText = computed(() => `${Math.round(musicVolume.value * 100)}%`);
const sfxVolumeText = computed(() => `${Math.round(sfxVolume.value * 100)}%`);

async function ensureAudioReady() {
  if (!isSupported.value) {
    return false;
  }

  const ready = await unlockAudioEngine();
  audioStore.setAudioReady(ready);
  return ready;
}

async function handleEnableAudio() {
  const ready = await ensureAudioReady();

  if (!ready) {
    return;
  }

  playAudioCue("toggle");
  settingsStore.appendActivityLog({
    scope: "audio",
    title: "音频已启用",
    detail: "背景音乐与答题音效已进入可用状态"
  });
}

async function handleMusicToggle() {
  const nextValue = !musicEnabled.value;

  if (nextValue) {
    await ensureAudioReady();
  }

  audioStore.setMusicEnabled(nextValue);
  settingsStore.appendActivityLog({
    scope: "audio",
    title: `背景音乐已${nextValue ? "开启" : "关闭"}`,
    detail: `当前音乐音量 ${musicVolumeText.value}`
  });
}

async function handleSfxToggle() {
  const nextValue = !sfxEnabled.value;

  if (nextValue) {
    const ready = await ensureAudioReady();
    audioStore.setSfxEnabled(true);

    if (ready) {
      playAudioCue("toggle");
    }
  } else {
    audioStore.setSfxEnabled(false);
  }

  settingsStore.appendActivityLog({
    scope: "audio",
    title: `答题音效已${nextValue ? "开启" : "关闭"}`,
    detail: `当前音效音量 ${sfxVolumeText.value}`
  });
}

function handleMasterVolumeInput(event) {
  audioStore.setMasterVolume(event.target.value);
}

function handleMusicVolumeInput(event) {
  audioStore.setMusicVolume(event.target.value);
}

function handleSfxVolumeInput(event) {
  audioStore.setSfxVolume(event.target.value);
}

function handleVolumeCommit(channel, valueText) {
  settingsStore.appendActivityLog({
    scope: "audio",
    title: `${channel}已调整`,
    detail: valueText
  });
}
</script>

<template>
  <div :class="['audio-console', { 'audio-console--embedded': embedded }]">
    <div class="audio-console__header">
      <div class="audio-console__copy">
        <p class="audio-console__title">{{ embedded ? "声音设置" : "岛屿音频台" }}</p>
        <p class="audio-console__hint">{{ audioHint }}</p>
      </div>

      <div class="audio-console__actions">
        <span :class="audioStatusClass">
          {{ audioStatusLabel }}
        </span>

        <button
          v-if="isSupported && !audioReady"
          data-modal-primary
          class="btn-cartoon btn-cartoon--yellow audio-console__prime"
          type="button"
          @click="handleEnableAudio"
        >
          启用音频
        </button>
      </div>
    </div>

    <div class="audio-console__board">
      <section class="audio-console__section" aria-label="音频通道">
        <div class="audio-console__section-head">
          <p class="audio-console__section-title">通道开关</p>
          <p class="audio-console__section-note">决定背景音乐和答题提示音是否播放。</p>
        </div>

        <div class="audio-console__toggle-row">
          <button
            :class="['audio-console__toggle', { 'audio-console__toggle--active': musicEnabled }]"
            type="button"
            :aria-pressed="musicEnabled"
            :disabled="!isSupported"
            :data-modal-primary="audioReady ? 'true' : null"
            @click="handleMusicToggle"
          >
            <span class="audio-console__toggle-copy">
              <span class="audio-console__toggle-label">背景音乐</span>
              <span class="audio-console__toggle-note">
                {{ musicEnabled ? "保持环岛背景声" : "当前不播放背景声" }}
              </span>
            </span>
            <strong class="audio-console__toggle-state">{{ musicEnabled ? "开启" : "关闭" }}</strong>
          </button>

          <button
            :class="['audio-console__toggle', { 'audio-console__toggle--active': sfxEnabled }]"
            type="button"
            :aria-pressed="sfxEnabled"
            :disabled="!isSupported"
            @click="handleSfxToggle"
          >
            <span class="audio-console__toggle-copy">
              <span class="audio-console__toggle-label">答题音效</span>
              <span class="audio-console__toggle-note">
                {{ sfxEnabled ? "保留答题反馈声" : "当前不播放提示音" }}
              </span>
            </span>
            <strong class="audio-console__toggle-state">{{ sfxEnabled ? "开启" : "关闭" }}</strong>
          </button>
        </div>
      </section>

      <section class="audio-console__section" aria-label="音量调节">
        <div class="audio-console__section-head">
          <p class="audio-console__section-title">音量平衡</p>
          <p class="audio-console__section-note">主音量控制整体输出，子通道会分别保存。</p>
        </div>

        <div class="audio-console__slider-grid">
          <label class="audio-slider">
            <span class="audio-slider__meta">
              <span class="audio-slider__label">主音量</span>
              <span class="audio-slider__value">{{ masterVolumeText }}</span>
            </span>
            <span class="audio-slider__description">控制整体输出强度</span>
            <input
              class="audio-slider__input"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="masterVolume"
              :disabled="!isSupported"
              @input="handleMasterVolumeInput"
              @change="handleVolumeCommit('主音量', masterVolumeText)"
            >
          </label>

          <label class="audio-slider">
            <span class="audio-slider__meta">
              <span class="audio-slider__label">音乐音量</span>
              <span class="audio-slider__value">{{ musicVolumeText }}</span>
            </span>
            <span class="audio-slider__description">只影响背景音乐</span>
            <input
              class="audio-slider__input"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="musicVolume"
              :disabled="!isSupported || !musicEnabled"
              @input="handleMusicVolumeInput"
              @change="handleVolumeCommit('音乐音量', musicVolumeText)"
            >
          </label>

          <label class="audio-slider">
            <span class="audio-slider__meta">
              <span class="audio-slider__label">音效音量</span>
              <span class="audio-slider__value">{{ sfxVolumeText }}</span>
            </span>
            <span class="audio-slider__description">只影响答题提示音</span>
            <input
              class="audio-slider__input"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="sfxVolume"
              :disabled="!isSupported || !sfxEnabled"
              @input="handleSfxVolumeInput"
              @change="handleVolumeCommit('音效音量', sfxVolumeText)"
            >
          </label>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.audio-console--embedded {
  margin-top: 0;
  padding: 16px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(242, 253, 249, 0.92) 0%, rgba(255, 255, 255, 0.82) 100%);
}
</style>
