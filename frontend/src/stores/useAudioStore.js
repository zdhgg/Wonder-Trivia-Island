import { defineStore } from "pinia";
import { DEFAULT_AUDIO_PREFERENCES } from "../audio/audioConfig";

const STORAGE_KEY = "wonder-trivia-island.audio.preferences";

function clampVolume(value, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numericValue));
}

function getAudioSupportState() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.AudioContext || window.webkitAudioContext || window.Audio);
}

function normalizePreferences(savedPreferences = {}) {
  return {
    masterVolume: clampVolume(savedPreferences.masterVolume, DEFAULT_AUDIO_PREFERENCES.masterVolume),
    musicVolume: clampVolume(savedPreferences.musicVolume, DEFAULT_AUDIO_PREFERENCES.musicVolume),
    sfxVolume: clampVolume(savedPreferences.sfxVolume, DEFAULT_AUDIO_PREFERENCES.sfxVolume),
    musicEnabled:
      typeof savedPreferences.musicEnabled === "boolean"
        ? savedPreferences.musicEnabled
        : DEFAULT_AUDIO_PREFERENCES.musicEnabled,
    sfxEnabled:
      typeof savedPreferences.sfxEnabled === "boolean"
        ? savedPreferences.sfxEnabled
        : DEFAULT_AUDIO_PREFERENCES.sfxEnabled
  };
}

export const useAudioStore = defineStore("audio", {
  state: () => ({
    ...DEFAULT_AUDIO_PREFERENCES,
    // 记住静音前的主音量，重新开声时还原回去，而不是直接跳到 100%
    lastAudibleVolume: DEFAULT_AUDIO_PREFERENCES.masterVolume,
    audioReady: false,
    isSupported: false,
    hasHydrated: false
  }),

  getters: {
    preferenceSnapshot: (state) => ({
      masterVolume: state.masterVolume,
      musicVolume: state.musicVolume,
      sfxVolume: state.sfxVolume,
      musicEnabled: state.musicEnabled,
      sfxEnabled: state.sfxEnabled
    })
  },

  actions: {
    hydratePreferences() {
      if (this.hasHydrated) {
        return;
      }

      this.isSupported = getAudioSupportState();
      this.audioReady = false;

      if (typeof window !== "undefined") {
        try {
          const savedPreferences = window.localStorage.getItem(STORAGE_KEY);

          if (savedPreferences) {
            Object.assign(this, normalizePreferences(JSON.parse(savedPreferences)));
          }
        } catch {
          Object.assign(this, DEFAULT_AUDIO_PREFERENCES);
        }
      }

      this.rememberAudibleVolume();
      this.hasHydrated = true;
    },

    rememberAudibleVolume() {
      if (this.masterVolume > 0) {
        this.lastAudibleVolume = this.masterVolume;
      }
    },

    persistPreferences() {
      if (typeof window === "undefined") {
        return;
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferenceSnapshot));
      } catch {
        // Ignore storage write failures and keep runtime state usable.
      }
    },

    setAudioReady(nextValue) {
      this.audioReady = Boolean(nextValue) && this.isSupported;
    },

    setMasterVolume(nextValue) {
      const clampedVolume = clampVolume(nextValue, this.masterVolume);

      if (clampedVolume > 0) {
        this.lastAudibleVolume = clampedVolume;
      }

      this.masterVolume = clampedVolume;
      this.persistPreferences();
    },

    setMusicVolume(nextValue) {
      this.musicVolume = clampVolume(nextValue, this.musicVolume);
      this.persistPreferences();
    },

    setSfxVolume(nextValue) {
      this.sfxVolume = clampVolume(nextValue, this.sfxVolume);
      this.persistPreferences();
    },

    setMusicEnabled(nextValue) {
      this.musicEnabled = Boolean(nextValue);
      this.persistPreferences();
    },

    setSfxEnabled(nextValue) {
      this.sfxEnabled = Boolean(nextValue);
      this.persistPreferences();
    },

    replacePreferences(nextPreferences = {}) {
      Object.assign(this, normalizePreferences(nextPreferences));
      this.rememberAudibleVolume();
      this.persistPreferences();
    },

    muteAll() {
      this.setMasterVolume(0);
      this.setMusicEnabled(false);
      this.setSfxEnabled(false);
    },

    unmuteAll() {
      this.setMasterVolume(this.lastAudibleVolume || DEFAULT_AUDIO_PREFERENCES.masterVolume);
      this.setMusicEnabled(true);
      this.setSfxEnabled(true);
    }
  }
});
