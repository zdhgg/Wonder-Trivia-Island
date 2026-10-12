import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fallback = vi.hoisted(() => ({ playing: false, start: vi.fn() }));
vi.mock("./toneBgm", () => ({
  disposeToneBgm: vi.fn(), isToneBgmSupported: () => true,
  isToneBgmPlaying: () => fallback.playing,
  shouldToneBgmPlay: s => s.musicEnabled && s.masterVolume > 0 && s.musicVolume > 0,
  setToneBgmVolume: vi.fn(), unlockToneBgmContext: async () => true,
  startToneBgm: () => { fallback.start(); fallback.playing = true; return true; },
  stopToneBgm: () => { fallback.playing = false; },
  getToneBgmRuntimeSnapshot: () => ({ buildCount: 1, startCount: fallback.start.mock.calls.length })
}));

function param() {
  return {
    value: 0, cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(function (v) { this.value = v; }),
    linearRampToValueAtTime: vi.fn(function (v) { this.value = v; })
  };
}

let context, engine, fetchMock;
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  fallback.playing = false;
  fallback.start.mockClear();
  context = {
    state: "running", currentTime: 0, destination: {}, sources: [],
    createGain: () => ({ gain: param(), connect: vi.fn(), disconnect: vi.fn() }),
    createDynamicsCompressor: () => ({
      threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect: vi.fn()
    }),
    decodeAudioData: vi.fn(async () => ({ duration: 57 })),
    createBufferSource() {
      const source = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      this.sources.push(source);
      return source;
    }
  };
  vi.stubGlobal("window", { AudioContext: function () { return context; } });
  vi.stubGlobal("document", { hidden: false });
  fetchMock = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
  vi.stubGlobal("fetch", fetchMock);
  engine = await import("./audioEngine");
  await engine.unlockAudioEngine();
});

afterEach(() => {
  engine.resumeBackgroundMusic();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Steps on Sand island playback", () => {
  it("loads the selected recording only after island entrance and loops the decoded audio", async () => {
    expect(fetchMock).not.toHaveBeenCalled();
    engine.suspendBackgroundMusic({ delayMs: 1200 });
    vi.advanceTimersByTime(1199);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await settle();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("steps-on-sand-loop.mp3"));
    expect(engine.getActiveBackgroundSource()).toBe("recording");
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(context.sources[0]).toMatchObject({ loop: true, loopStart: 0, loopEnd: 57 });
    expect(fallback.start).not.toHaveBeenCalled();
  });

  it.each(["leave", "mute", "hide"])("does not start after a pending download when we %s", async action => {
    let finish;
    fetchMock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    engine.suspendBackgroundMusic();
    if (action === "leave") engine.resumeBackgroundMusic();
    if (action === "mute") engine.syncAudioSettings({ masterVolume: 0 });
    if (action === "hide") document.hidden = true;
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    await settle();
    expect(context.sources).toHaveLength(0);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(fallback.start).not.toHaveBeenCalled();
  });

  it("cancels playback and the volume ramp immediately on mute, then resumes the same recording", async () => {
    engine.suspendBackgroundMusic();
    await settle();
    context.currentTime = 12;
    engine.syncAudioSettings({ masterVolume: 0 });
    expect(context.sources[0].stop).toHaveBeenCalledTimes(1);
    expect(context.sources[0].disconnect).toHaveBeenCalledTimes(1);
    expect(engine.getBackgroundMusicStructure().busDecibels).toBe(-Infinity);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    engine.syncAudioSettings({ masterVolume: 0.72 });
    expect(context.sources[1].start).toHaveBeenCalledWith(0, 12);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(context.decodeAudioData).toHaveBeenCalledTimes(1);
  });

  it("ducks for reading and rewards without restarting or stacking sources", async () => {
    engine.suspendBackgroundMusic();
    engine.suspendBackgroundMusic();
    await settle();
    const focus = await import("./islandAudioFocus");
    const normalGain = 0.72 * 0.42;
    focus.setIslandReading(true);
    expect(engine.getBackgroundMusicStructure().targetGain).toBeCloseTo(normalGain * 0.5);
    focus.duckIslandForReward(2200);
    expect(engine.getBackgroundMusicStructure().targetGain).toBeCloseTo(normalGain * 0.28);
    vi.advanceTimersByTime(2200);
    focus.setIslandReading(false);
    expect(engine.getBackgroundMusicStructure().targetGain).toBeCloseTo(normalGain);
    expect(context.sources).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      engine.resumeBackgroundMusic();
      expect(engine.isBackgroundMusicPlaying()).toBe(false);
      engine.suspendBackgroundMusic();
    }
    expect(engine.getBackgroundMusicBuildCount()).toBe(1);
    expect(engine.getBackgroundMusicStartCount()).toBe(4);
    expect(context.sources.filter(s => s.stop.mock.calls.length === 0)).toHaveLength(1);
  });

  it.each(["request", "decode"])("uses the existing fallback after a %s failure", async failure => {
    if (failure === "request") fetchMock.mockResolvedValue({ ok: false, status: 404 });
    else context.decodeAudioData.mockRejectedValue(new Error("unsupported data"));
    engine.suspendBackgroundMusic();
    await settle();
    expect(engine.getActiveBackgroundSource()).toBe("tone");
    expect(fallback.start).toHaveBeenCalledTimes(1);
    expect(context.sources).toHaveLength(0);
    engine.syncAudioSettings({ musicVolume: 0.2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
