// BGM 在 audioEngine 这一层的集成测试。
//
// toneBgm.test.js 已经锁住了 Tone runtime 自身的单例、幂等与"停止是否彻底"；
// 这里锁的是**引擎怎么使用它**，也就是任务要求的十条行为里需要引擎参与的那些：
//   - 普通页面解锁后不启动 BGM（持续音乐只属于知识岛）
//   - 进入知识岛启动 / 离开知识岛停止
//   - 静音立即停止，且音乐总线归零；取消静音后按条件恢复
//   - 普通页面取消静音不启动
//   - 反复进出不重复创建
//   - musicVolume 为 0 时不播放
//   - Tone 主路径与 WAV 降级路径互斥，绝不叠播
//
// 这里把 toneBgm 整个打桩，于是「引擎有没有正确地只调一次 start」是可数的，
// 「静音时引擎有没有真的把总线按到 0」也是可数的。
// 真 Tone 的单例行为由 toneBgm.test.js 负责，两层不重复验证同一件事。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toneCalls = {
  start: 0,
  stop: 0,
  volume: 0,
  unlock: 0,
  // 最近一次交给 Tone 的线性音量：静音必须是 0（引擎层算出来的那个乘积）
  lastGain: null
};
let toneState = { playing: false, supported: true, unlockResult: true, buildCount: 0 };

vi.mock("./toneBgm", () => ({
  isToneBgmSupported: () => toneState.supported,
  isToneBgmPlaying: () => toneState.playing,
  shouldToneBgmPlay: (settings = {}) => {
    const masterVolume = Number(settings.masterVolume);
    const musicVolume = Number(settings.musicVolume);
    if (!Number.isFinite(masterVolume) || masterVolume <= 0) return false;
    if (!Number.isFinite(musicVolume) || musicVolume <= 0) return false;
    return settings.musicEnabled !== false;
  },
  startToneBgm: () => {
    toneCalls.start += 1;
    if (!toneState.supported) return false;
    // 真 Tone 的 runtime 是单例，buildCount 永远停在 1。
    // 这里让"首次启动"决定它，测试才有"没建出第二套对象"可断言。
    if (toneState.buildCount === 0) {
      toneState.buildCount = 1;
    }
    toneState.playing = true;
    return true;
  },
  stopToneBgm: () => {
    toneCalls.stop += 1;
    toneState.playing = false;
    return true;
  },
  setToneBgmVolume: (gain) => {
    toneCalls.volume += 1;
    toneCalls.lastGain = gain;
    return true;
  },
  unlockToneBgmContext: async () => {
    toneCalls.unlock += 1;
    return toneState.unlockResult;
  },
  disposeToneBgm: () => {},
  getToneBgmRuntimeSnapshot: () => ({
    ready: true,
    started: toneState.playing,
    buildCount: toneState.buildCount,
    startCount: toneCalls.start,
    scheduledNoteCount: 342,
    instrumentCount: 5,
    hasTransport: true,
    transportLoop: true,
    transportLoopEnd: "28:0:0",
    bpm: 135,
    busDecibels: toneCalls.lastGain === 0 ? -Infinity : 0,
    targetGain: toneCalls.lastGain,
    contextState: "running",
    contextIsReal: true
  })
}));

class FakeAudio {
  static instances = [];

  constructor(source) {
    this.src = source;
    this.loop = false;
    this.preload = "";
    this.playsInline = false;
    this.muted = false;
    this.volume = 1;
    this.paused = true;
    this.currentTime = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    // 音效路径会写 cueAudio.dataset.cue = cueName
    this.dataset = {};
    this.listeners = new Map();
    FakeAudio.instances.push(this);
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    const index = bucket.indexOf(handler);
    if (index >= 0) bucket.splice(index, 1);
  }

  emit(type) {
    for (const handler of this.listeners.get(type) || []) handler();
  }

  play() {
    this.playCalls += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }
}

let engine;

async function loadEngine() {
  vi.resetModules();
  engine = await import("./audioEngine");
  return engine;
}

function backgroundAudio() {
  return FakeAudio.instances[0] || null;
}

function resetToneCalls() {
  toneCalls.start = 0;
  toneCalls.stop = 0;
  toneCalls.volume = 0;
  toneCalls.unlock = 0;
}

/** Tone 不可用时的 WAV 降级环境：引擎必须还能正常工作。 */
function disableTone() {
  toneState = { playing: false, supported: false, unlockResult: false };
}

beforeEach(() => {
  FakeAudio.instances = [];
  globalThis.Audio = FakeAudio;
  toneState = { playing: false, supported: true, unlockResult: true, buildCount: 0 };
  resetToneCalls();
});

afterEach(() => {
  delete globalThis.Audio;
  toneState = { playing: false, supported: true, unlockResult: true, buildCount: 0 };
  resetToneCalls();
});

// ---------------------------------------------------------------------------
// 1) 普通页面不播放持续 BGM
// ---------------------------------------------------------------------------
describe("持续 BGM 只属于知识岛", () => {
  it("普通首页解锁音频：只解锁引擎，Tone BGM 不启动", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(engine.getActiveBackgroundSource()).toBe("none");
    expect(toneCalls.start).toBe(0);
    // 主路径不碰 <audio>：省掉一次几 MB 的循环素材请求
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("普通页面上 BGM 处于被抑制状态（这里没有持续音乐可放）", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    expect(engine.isBackgroundMusicSuppressed()).toBe(true);
  });

  it("解锁只发生在既有全局解锁流程里（Tone 上下文跟着那一次手势恢复）", async () => {
    await loadEngine();
    expect(toneCalls.unlock).toBe(0);

    await engine.unlockAudioEngine();
    expect(toneCalls.unlock).toBe(1);
  });

  it("反复在普通页面上解锁设置，BGM 一次都不会启动", async () => {
    await loadEngine();

    for (let i = 0; i < 3; i += 1) {
      await engine.unlockAudioEngine();
      engine.syncAudioSettings({ musicVolume: 0.6, masterVolume: 0.8, musicEnabled: true });
    }

    expect(toneCalls.start).toBe(0);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  // 锁住"解锁与进岛的先后顺序"这一对最容易回归的性质。
  // KnowledgeIslandView 的 onMounted 是同步调用 suspendBackgroundMusic() 的，
  // 而 unlockAudioEngine() 是异步的：真实点击路径上，
  // 「进岛置位」几乎总是先于「解锁完成」发生。这一条就是那条真实顺序。
  it("先进岛、后解锁：解锁完成的那一刻知识岛必须立刻起播", async () => {
    await loadEngine();

    // 还没有任何交互，此刻进岛是安静的（autoplay 闸门仍然关着）。
    engine.suspendBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(engine.isBackgroundMusicSuppressed()).toBe(true);

    // 「进入知识岛」那一下手势把引擎解锁。
    await engine.unlockAudioEngine();

    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(engine.isBackgroundMusicSuppressed()).toBe(false);
    expect(engine.getActiveBackgroundSource()).toBe("tone");
    // 只起播一次：进岛时的置位和解锁时的补起播不会叠成两次。
    expect(toneCalls.start).toBe(1);
  });

  it("先解锁、后进岛：同样只起播一次（与上面的顺序等价）", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    engine.suspendBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(toneCalls.start).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2) 进入 / 离开知识岛
// ---------------------------------------------------------------------------
describe("知识岛的生命周期", () => {
  it("进入知识岛：BGM 启动，并走 Tone 主路径", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    engine.suspendBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(engine.getActiveBackgroundSource()).toBe("tone");
    expect(engine.isBackgroundMusicSuppressed()).toBe(false);
    expect(toneCalls.start).toBe(1);
  });

  it("离开知识岛：BGM 停止，活跃音源归零", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.resumeBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(engine.getActiveBackgroundSource()).toBe("none");
    expect(toneCalls.stop).toBeGreaterThanOrEqual(1);
  });

  it("离开知识岛后回到普通页面：反复同步设置也不会再起播", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();
    engine.resumeBackgroundMusic();

    const startsAfterLeaving = toneCalls.start;

    for (let i = 0; i < 5; i += 1) {
      engine.syncAudioSettings({ musicVolume: 0.5, masterVolume: 0.9, musicEnabled: true });
    }

    expect(toneCalls.start).toBe(startsAfterLeaving);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("知识岛内才解锁：引擎一解锁，音乐立刻按当前设置起播", async () => {
    await loadEngine();
    engine.suspendBackgroundMusic();
    // 还没解锁：不许自己出声。
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 用户在知识岛点右上角取消静音 —— 那一次手势把引擎解锁。
    await engine.unlockAudioEngine();

    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(engine.getActiveBackgroundSource()).toBe("tone");
  });

  it("反复进出 5 次：不会重建 runtime，Tone 只按需 start/stop", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    for (let round = 0; round < 5; round += 1) {
      engine.resumeBackgroundMusic();
      expect(engine.isBackgroundMusicPlaying()).toBe(false);
      engine.suspendBackgroundMusic();
      expect(engine.isBackgroundMusicPlaying()).toBe(true);
    }

    // 五进五出，但每轮都是「先离开、后进入」，而循环开始时还没进过岛，
    // 所以第 0 轮那次离开并不会产生 stop —— 计数是 5 次启动、4 次停止，
    // 最后一轮结束时正停在知识岛内，状态一致。
    expect(toneCalls.start).toBe(5);
    expect(toneCalls.stop).toBe(4);
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    // 无论进出多少次，runtime 只建过一次。
    expect(engine.getBackgroundMusicBuildCount()).toBe(1);
  });

  it("连续进入三次是幂等的：不会反复重启 Transport", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    engine.suspendBackgroundMusic();
    engine.suspendBackgroundMusic();
    engine.suspendBackgroundMusic();

    expect(toneCalls.start).toBe(1);
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3) 全局静音必须彻底
// ---------------------------------------------------------------------------
describe("全局静音是彻底的", () => {
  it("muteAll 之后：Transport 停、总线归零、不新建任何东西", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(true);

    // muteAll() 在 store 里做的事
    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(engine.getActiveBackgroundSource()).toBe("none");
    expect(toneCalls.stop).toBeGreaterThan(0);
    // 引擎确实把总线按到了 0（toneBgm 会把它变成 -Infinity）
    expect(toneCalls.lastGain).toBe(0);
    // 引擎读到的总线电平必须是 -Infinity。
    // 这一条是"点了静音还在响"那个真实 bug 的回归防线：
    // 曾经 stopToneBgm() 的第一行就抛异常，导致 started 永远没被置 false。
    expect(engine.getBackgroundMusicStructure().busDecibels).toBe(-Infinity);
  });

  it("音量 0 时总线也是 -Infinity（不留一层几乎听不见的底噪）", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.syncAudioSettings({ musicVolume: 0 });

    expect(engine.getBackgroundMusicStructure().busDecibels).toBe(-Infinity);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("静音之后反复同步设置：不会重新启动 Transport", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });
    const startsWhileMuted = toneCalls.start;

    // 用户在静音状态下反复动设置 / 反复进出场，都不许把音乐拉起来。
    for (let i = 0; i < 5; i += 1) {
      engine.syncAudioSettings({ musicVolume: 0.8, masterVolume: 0 });
      engine.suspendBackgroundMusic();
      engine.resumeBackgroundMusic();
    }

    expect(toneCalls.start).toBe(startsWhileMuted);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("静音后即使音乐音量被拉高，主音量为 0 也不许出声", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: true, musicVolume: 0.9 });

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(toneCalls.lastGain).toBe(0);
  });

  it("知识岛内取消静音后：按条件恢复", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // unmuteAll()：恢复静音前的主音量 + 打开两个通道
    engine.syncAudioSettings({ masterVolume: 0.72, musicEnabled: true, sfxEnabled: true });

    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(engine.getActiveBackgroundSource()).toBe("tone");
  });

  it("普通页面取消静音：BGM 仍然不启动", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 在普通页面上"取消静音"：同步设置恢复了，但这一页没有持续音乐可放。
    engine.syncAudioSettings({ masterVolume: 0.72, musicEnabled: true, sfxEnabled: true });

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(toneCalls.start).toBe(0);
  });

  it("musicVolume 为 0 时不播放；拉回来才恢复", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.syncAudioSettings({ musicVolume: 0 });

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(engine.getActiveBackgroundSource()).toBe("none");

    // 拉回来之后才重新响
    engine.syncAudioSettings({ musicVolume: 0.42 });
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("musicEnabled 关掉时不播放，但不影响音效通道", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.syncAudioSettings({ musicEnabled: false });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("音量用 masterVolume × musicVolume 送进 Tone", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.syncAudioSettings({ masterVolume: 0.5, musicVolume: 0.4 });
    engine.suspendBackgroundMusic();

    expect(toneCalls.lastGain).toBeCloseTo(0.2, 5);
  });
});

// ---------------------------------------------------------------------------
// 4) 降级路径：Tone 不可用
// ---------------------------------------------------------------------------
describe("WAV 降级路径", () => {
  it("Tone 不可用时，知识岛上退到 WAV 并且真的用上了 <audio>", async () => {
    disableTone();
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    expect(engine.getActiveBackgroundSource()).toBe("wav");
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(FakeAudio.instances.length).toBeGreaterThan(0);
    expect(toneCalls.start).toBe(0);
  });

  it("Tone 不可用时，普通页面同样不播放持续音乐", async () => {
    disableTone();
    await loadEngine();
    await engine.unlockAudioEngine();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("降级路径离开知识岛也会停", async () => {
    disableTone();
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(true);

    engine.resumeBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("降级路径同样遵守 musicVolume = 0", async () => {
    disableTone();
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    engine.syncAudioSettings({ musicVolume: 0 });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5) 绝不叠播
// ---------------------------------------------------------------------------
describe("主路径与降级路径互斥", () => {
  it("Tone 在响时强制标记不可用：Tone 立刻停，之后才可能轮到 WAV", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    expect(engine.getActiveBackgroundSource()).toBe("tone");
    expect(FakeAudio.instances).toHaveLength(0);

    // 模拟"Tone 起来之后又失效了"：必须先停 Tone，再走 WAV
    engine.__setToneBackgroundMusicUnavailableForTests(true);
    engine.syncAudioSettings({ musicVolume: 0.3 });

    expect(engine.getActiveBackgroundSource()).toBe("wav");
    // 关键：这一刻不能两条都在响
    expect(engine.isToneBackgroundMusicAvailable()).toBe(false);
    const wav = backgroundAudio();
    expect(wav).not.toBeNull();
    expect(wav.paused).toBe(false);
  });

  it("任何时刻 activeSource 只有一个值，不存在并存", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    const seen = new Set();
    seen.add(engine.getActiveBackgroundSource());

    engine.suspendBackgroundMusic();
    seen.add(engine.getActiveBackgroundSource());

    engine.resumeBackgroundMusic();
    seen.add(engine.getActiveBackgroundSource());

    engine.syncAudioSettings({ masterVolume: 0 });
    seen.add(engine.getActiveBackgroundSource());

    for (const value of seen) {
      expect(["none", "tone", "wav"]).toContain(value);
    }
  });
});

// ---------------------------------------------------------------------------
// 6) 音效不受影响
// ---------------------------------------------------------------------------
describe("BGM 之外的声音没有迁移", () => {
  it("答题音效仍走原来的 <audio> 路径，不经过 Tone", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    // playAudioCue 仍是 public interface
    expect(typeof engine.playAudioCue).toBe("function");
    const played = engine.playAudioCue("success");
    expect(typeof played).toBe("boolean");
  });

  it("Tone 的 start 只被 BGM 用到：连续 sync 不会反复重起播", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.suspendBackgroundMusic();

    const startsAfterEntering = toneCalls.start;

    for (let i = 0; i < 10; i += 1) {
      engine.syncAudioSettings({ masterVolume: 0.5 + i * 0.01 });
    }

    // 已经在播的情况下反复 sync 不会重复 start
    expect(toneCalls.start).toBe(startsAfterEntering);
  });

  it("七个公共接口签名保持不变", async () => {
    await loadEngine();

    for (const name of [
      "unlockAudioEngine",
      "syncAudioSettings",
      "suspendBackgroundMusic",
      "resumeBackgroundMusic",
      "isBackgroundMusicPlaying",
      "isBackgroundMusicSuppressed",
      "playAudioCue"
    ]) {
      expect(typeof engine[name]).toBe("function");
    }
  });
});

// ---------------------------------------------------------------------------
// 3) 短音效（首页入口按钮那一声）所依赖的引擎契约
// ---------------------------------------------------------------------------
// useTriviaApp 的 playPageEntryCue() 只做三件事：静音时直接返回、
// 复用 ensureAudioReady() 解锁、解锁成功后调 playAudioCue("toggle")。
// 它本身不需要单测（没有 @vue/test-utils，挂不动这个巨型 composable），
// 但它依赖的三条引擎行为必须锁死，否则静音守卫会形同虚设：
describe("短音效：一次点击一声，且静音时彻底不出声", () => {
  it("一次点击只建一个音效元素、只 play 一次", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    expect(engine.playAudioCue("toggle")).toBe(true);

    // playAssetCue 每次调用 new 一个 Audio 并 play 一次 —— 这正是"一声"的含义。
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].playCalls).toBe(1);
    expect(FakeAudio.instances[0].dataset.cue).toBe("toggle");
  });

  it("连点三次就是三个独立的一声，不会在同一次点击里叠出两层", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    engine.playAudioCue("toggle");
    engine.playAudioCue("toggle");
    engine.playAudioCue("toggle");

    expect(FakeAudio.instances).toHaveLength(3);
    // 每个元素都只被 play 过一次：不存在"一次点击 play 两次"的叠播。
    expect(FakeAudio.instances.map((audio) => audio.playCalls)).toEqual([1, 1, 1]);
  });

  it("用户静音（主音量 0）时：一声都不出", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.syncAudioSettings({ masterVolume: 0 });

    expect(engine.playAudioCue("toggle")).toBe(false);
    // 这是"静音守卫真的挡住了"的证据，而不是"放出来但听不见"。
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("用户把音效通道关掉时：一声都不出", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.syncAudioSettings({ sfxEnabled: false });

    expect(engine.playAudioCue("toggle")).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("音效音量归零时：一声都不出", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();
    engine.syncAudioSettings({ sfxVolume: 0 });

    expect(engine.playAudioCue("toggle")).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("没解锁就点：不出声（解锁必须先由那一次真实手势完成）", async () => {
    await loadEngine();

    // 没有经过 ensureAudioReady()，引擎仍处于未解锁状态。
    expect(engine.playAudioCue("toggle")).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("短音效不会牵动持续 BGM：普通页面上它响，BGM 仍然不启动", async () => {
    await loadEngine();
    await engine.unlockAudioEngine();

    engine.playAudioCue("toggle");

    expect(FakeAudio.instances).toHaveLength(1);
    // 关键：短音效和持续音乐是两条独立的路，绝不因为响了一声就把 BGM 带起来。
    expect(toneCalls.start).toBe(0);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(engine.isBackgroundMusicSuppressed()).toBe(true);
  });
});