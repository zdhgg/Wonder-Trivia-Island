import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEFAULT_AUDIO_PREFERENCES, isGlobalAudioAudible } from "../audio/audioConfig";
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

describe("audio store 全站声音状态（已删掉知识岛局部开关）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // localStorage 在 node 环境下不存在，这里放一个最小的替身：
  // 我们想验证的是"偏好还是写在既有的那一个 key 里、没有另起一套存储"。
  function installLocalStorageStub(seed = null) {
    const storage = new Map();

    if (seed) {
      storage.set(seed.key, seed.value);
    }

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

  const STORAGE_KEY = "wonder-trivia-island.audio.preferences";

  it("不再有知识岛专用的声音开关：全站只有一颗全局静音按钮", () => {
    const store = useAudioStore();

    // 局部按钮删掉之后，store 里不该还留着一个没人消费的字段。
    expect(store.islandAmbienceEnabled).toBeUndefined();
    expect(store.setIslandAmbienceEnabled).toBeUndefined();
    expect(DEFAULT_AUDIO_PREFERENCES.islandAmbienceEnabled).toBeUndefined();
  });

  it("旧快照里残留的那个键被安静忽略，不需要任何迁移代码", () => {
    installLocalStorageStub({
      key: STORAGE_KEY,
      value: JSON.stringify({ masterVolume: 0.5, musicEnabled: false, sfxEnabled: true, islandAmbienceEnabled: true })
    });

    const store = useAudioStore();

    store.hydratePreferences();

    // 老版本把「海岛声音」记成开着，但那颗按钮已经不存在了，
    // 所以这个键直接被丢掉 —— 既不报错，也不需要写迁移代码去清它。
    expect(store.masterVolume).toBe(0.5);
    expect(store.musicEnabled).toBe(false);
    expect(store.islandAmbienceEnabled).toBeUndefined();

    store.setMasterVolume(0.6);
  });

  it("写回偏好时不再产生那个键，形状收敛到只剩五个全局通道", () => {
    const storage = installLocalStorageStub();
    const store = useAudioStore();

    store.hydratePreferences();
    store.setMusicEnabled(false);
    store.setSfxVolume(0.5);

    expect(storage.size).toBe(1);
    const [storageKey, rawSnapshot] = [...storage.entries()][0];

    expect(storageKey).toBe(STORAGE_KEY);
    expect(Object.keys(JSON.parse(rawSnapshot)).sort()).toEqual([
      "masterVolume",
      "musicEnabled",
      "musicVolume",
      "sfxEnabled",
      "sfxVolume"
    ]);
  });

  it("isGlobalAudioAudible 与右上角那颗静音按钮是同一个判定", () => {
    // 主音量为 0 = 静音。
    expect(isGlobalAudioAudible({ masterVolume: 0, musicEnabled: true, sfxEnabled: true })).toBe(false);

    // 两个通道都关掉 = 静音（App.vue 里 isMuted 的第二个条件）。
    expect(isGlobalAudioAudible({ masterVolume: 0.6, musicEnabled: false, sfxEnabled: false })).toBe(false);

    // 只关掉一个通道不算静音。
    expect(isGlobalAudioAudible({ masterVolume: 0.6, musicEnabled: false, sfxEnabled: true })).toBe(true);
    expect(isGlobalAudioAudible({ masterVolume: 0.6, musicEnabled: true, sfxEnabled: false })).toBe(true);

    // 正常状态：可听。
    expect(isGlobalAudioAudible(DEFAULT_AUDIO_PREFERENCES)).toBe(true);

    // 缺字段 / 非法值一律按"不响"处理，绝不因为读不到就擅自出声。
    expect(isGlobalAudioAudible({})).toBe(false);
    expect(isGlobalAudioAudible({ masterVolume: Number.NaN })).toBe(false);
  });

  it("muteAll 之后全站判定为静音，unmuteAll 之后恢复可听", () => {
    const store = useAudioStore();

    store.setMasterVolume(0.4);
    store.muteAll();
    expect(isGlobalAudioAudible(store.preferenceSnapshot)).toBe(false);

    store.unmuteAll();
    expect(isGlobalAudioAudible(store.preferenceSnapshot)).toBe(true);
  });
});
