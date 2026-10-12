import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./audioEngine", () => ({ isAudioEngineUnlocked: () => true }));

class Param {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  stopped = false;
  disconnected = false;
  connect() {}
  disconnect() { this.disconnected = true; }
  start() {}
  stop(at) { if (at === undefined) this.stopped = true; }
}

class Context {
  static last;
  currentTime = 0;
  sampleRate = 8;
  gains = [];
  sources = [];
  destination = new Node();
  constructor() { Context.last = this; }
  createGain() { const node = new Node(); this.gains.push(node); return node; }
  createBuffer(_, size) { return { getChannelData: () => new Float32Array(size) }; }
  createBufferSource() { const node = new Node(); this.sources.push(node); return node; }
  createOscillator() { return this.createBufferSource(); }
  createBiquadFilter() { return new Node(); }
  resume() { return Promise.resolve(); }
}

let soundscape;
let focus;
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.stubGlobal("AudioContext", Context);
  soundscape = await import("./islandSoundscape");
  focus = await import("./islandAudioFocus");
});

afterEach(() => {
  soundscape.stopIslandSoundscape();
  focus.resetIslandAudioFocus();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("island soundscape playback cleanup", () => {
  it("the first island never creates a wind or modulation source", () => {
    soundscape.syncIslandSoundscapeScene({ stageId: "first-sight" });
    soundscape.startIslandSoundscape();
    expect(Context.last.sources).toHaveLength(0);
  });

  it("wind modulation follows its level, and stopping destroys both sources", () => {
    soundscape.syncIslandSoundscapeScene({ stageId: "palm-camp" });
    soundscape.startIslandSoundscape();
    const context = Context.last;
    expect(context.sources).toHaveLength(2);
    expect(context.gains[0].gain.value).toBeCloseTo(0.72 * 0.9);
    expect(context.gains[2].gain.value).toBeCloseTo(context.gains[1].gain.value * 0.22);
    soundscape.stopIslandSoundscape();
    expect(context.sources.every(source => source.stopped && source.disconnected)).toBe(true);
    expect(context.gains[0].gain.value).toBe(0);
    expect(soundscape.getPendingSoundscapeAccentCount()).toBe(0);
  });

  it("disabling SFX stops wind and accents even while music remains enabled", () => {
    soundscape.syncIslandSoundscapeScene({ stageId: "knowledge-lighthouse" });
    soundscape.startIslandSoundscape();
    vi.advanceTimersByTime(60000);
    soundscape.syncIslandSoundscapePreferences({ musicEnabled: true, sfxEnabled: false });
    expect(Context.last.sources.every(source => source.stopped && source.disconnected)).toBe(true);
    expect(Context.last.gains[0].gain.value).toBe(0);
    expect(soundscape.getPendingSoundscapeAccentCount()).toBe(0);
  });

  it("reading stops active accents; closing starts fresh timers", () => {
    soundscape.syncIslandSoundscapeScene({ stageId: "knowledge-lighthouse" });
    soundscape.startIslandSoundscape();
    vi.advanceTimersByTime(60000);
    const bellSources = Context.last.sources.slice(2);
    expect(bellSources).toHaveLength(2);
    focus.setIslandReading(true);
    expect(bellSources.every(source => source.stopped && source.disconnected)).toBe(true);
    expect(soundscape.getPendingSoundscapeAccentCount()).toBe(0);
    vi.advanceTimersByTime(180000);
    focus.setIslandReading(false);
    vi.advanceTimersByTime(59999);
    expect(Context.last.sources).toHaveLength(4);
    vi.advanceTimersByTime(1);
    expect(Context.last.sources).toHaveLength(6);
  });

  it("manual gull feedback interrupts an active bell", () => {
    soundscape.syncIslandSoundscapeScene({ stageId: "explorer-dock" });
    soundscape.startIslandSoundscape();
    vi.advanceTimersByTime(60000);
    const bells = Context.last.sources.slice(2);
    expect(focus.reserveIslandAccent({ manual: true })).toBe(true);
    expect(bells.every(source => source.stopped)).toBe(true);
  });
});
