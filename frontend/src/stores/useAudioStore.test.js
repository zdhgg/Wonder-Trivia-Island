import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEFAULT_AUDIO_PREFERENCES } from "../audio/audioConfig";
import { useAudioStore } from "./useAudioStore";

describe("audio store mute memory", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("restores the volume the user had before muting instead of jumping to full", () => {
    const store = useAudioStore();

    store.setMasterVolume(0.4);
    store.muteAll();

    expect(store.masterVolume).toBe(0);
    expect(store.musicEnabled).toBe(false);
    expect(store.sfxEnabled).toBe(false);

    store.unmuteAll();

    expect(store.masterVolume).toBe(0.4);
    expect(store.musicEnabled).toBe(true);
    expect(store.sfxEnabled).toBe(true);
  });

  it("falls back to the default volume when nothing audible was ever set", () => {
    const store = useAudioStore();

    store.setMasterVolume(0);
    store.unmuteAll();

    expect(store.masterVolume).toBe(DEFAULT_AUDIO_PREFERENCES.masterVolume);
  });

  it("keeps the last audible volume while the user drags the slider to silence", () => {
    const store = useAudioStore();

    store.setMasterVolume(0.55);
    store.setMasterVolume(0);
    store.setMasterVolume(0.2);
    store.setMasterVolume(0);

    expect(store.lastAudibleVolume).toBe(0.2);

    store.unmuteAll();

    expect(store.masterVolume).toBe(0.2);
  });

  it("clamps out-of-range volume input", () => {
    const store = useAudioStore();

    store.setMasterVolume("150");
    expect(store.masterVolume).toBe(1);

    store.setMasterVolume(-4);
    expect(store.masterVolume).toBe(0);
  });
});

describe("audio store island ambience preference", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // localStorage 在 node 环境下不存在，这里放一个最小的替身：
  // 我们只想验证"记住开关用的是既有的那一个 key、没有另起一套存储"。
  function installLocalStorageStub() {
    const storage = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (key) => (storage.has(key) ? storage.get(key) : null),
        setItem: (key, value) => storage.set(key, value)
      }
    };

    return storage;
  }

  afterEach(() => {
    delete globalThis.window;
  });

  it("defaults to off so the island page never makes sound on its own", () => {
    const store = useAudioStore();

    expect(store.islandAmbienceEnabled).toBe(DEFAULT_AUDIO_PREFERENCES.islandAmbienceEnabled);
    expect(store.islandAmbienceEnabled).toBe(false);
  });

  it("remembers the toggle in the existing audio preferences key", () => {
    const storage = installLocalStorageStub();
    const store = useAudioStore();

    store.hydratePreferences();
    store.setIslandAmbienceEnabled(true);

    // 写在既有的那个 key 里：和音量、背景音乐、答题音效同一份偏好。
    expect(storage.size).toBe(1);
    const [storageKey, rawSnapshot] = [...storage.entries()][0];
    expect(JSON.parse(rawSnapshot).islandAmbienceEnabled).toBe(true);
    expect(JSON.parse(rawSnapshot).musicEnabled).toBe(true);

    // 换一个 store 实例重新读回来，偏好还在。
    setActivePinia(createPinia());
    const restoredStore = useAudioStore();
    restoredStore.hydratePreferences();

    expect(restoredStore.islandAmbienceEnabled).toBe(true);
  });

  it("does not touch music or sfx state when only the ambience toggle changes", () => {
    const store = useAudioStore();

    store.setMasterVolume(0.4);
    store.setIslandAmbienceEnabled(true);

    expect(store.masterVolume).toBe(0.4);
    expect(store.musicEnabled).toBe(DEFAULT_AUDIO_PREFERENCES.musicEnabled);
    expect(store.sfxEnabled).toBe(DEFAULT_AUDIO_PREFERENCES.sfxEnabled);
    expect(store.islandAmbienceEnabled).toBe(true);
  });

  it("falls back to the default when a saved snapshot has no ambience field", () => {
    installLocalStorageStub();
    const store = useAudioStore();

    window.localStorage.setItem(
      "wonder-trivia-island.audio.preferences",
      JSON.stringify({ masterVolume: 0.5, musicEnabled: false, sfxEnabled: true })
    );
    store.hydratePreferences();

    // 老版本的偏好快照里没有这个字段 → 按默认值（关）处理，不当成打开。
    expect(store.masterVolume).toBe(0.5);
    expect(store.musicEnabled).toBe(false);
    expect(store.islandAmbienceEnabled).toBe(false);
  });
});
