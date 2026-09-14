import { beforeEach, describe, expect, it } from "vitest";
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
