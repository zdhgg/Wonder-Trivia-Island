// 背景音乐的作用范围（纯逻辑，不碰真实音频）。
//
// 这一份锁住的是**页面范围**：
//   持续 BGM 只属于知识岛这一页。首页、答题、设置等普通页面一律不放持续音乐；
//   进入知识岛才起播，离开知识岛必定停。
//
// 覆盖的八条：
//   1) 普通页面解锁音频：只解锁引擎，BGM 不启动，也不新建 <audio>；
//   2) 进入知识岛 → BGM 起播；
//   3) 离开知识岛 → BGM 停止，且此后在普通页面上也不会自己回来；
//   4) suspend 幂等：连续进入不会新建第二个元素；
//   5) 反复进出 N 次：元素总数不变（不叠出第二个实例）；
//   6) 知识岛上才解锁声音：那一次手势之后音乐就响；
//   7) 知识岛期间关掉音乐 / 全局静音 / 音乐音量拉到 0 → 都不响，也不擅自重开；
//   8) 取消静音后，只有"仍在知识岛且各项允许"才恢复 —— 普通页面取消静音不启动。
//
// 测试环境没有 window，所以 WebAudio 那条路整个走不通（createAudioGraph 返回 null），
// 剩下 <audio> 元素这一条分支 —— 也就是 WAV 降级路径。
// Tone 主路径由 audioEngine.toneBgm.test.js 用假 Tone 单独覆盖。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    FakeAudio.instances.push(this);
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
  return import("./audioEngine");
}

function backgroundAudio() {
  return FakeAudio.instances[0] || null;
}

beforeEach(() => {
  FakeAudio.instances = [];
  globalThis.Audio = FakeAudio;
});

afterEach(() => {
  delete globalThis.Audio;
});

// 走完一次解锁，但**当前不在知识岛**。
// 这正是"首页点一次启用音频"的真实状态：引擎解锁了，音乐不该起。
async function unlockOnNormalPage() {
  engine = await loadEngine();
  await engine.unlockAudioEngine();
  return engine;
}

// 解锁 + 进入知识岛：这时音乐才应该响。
async function unlockOnIsland() {
  engine = await loadEngine();
  await engine.unlockAudioEngine();
  engine.suspendBackgroundMusic();
  return engine;
}

describe("背景音乐只属于知识岛", () => {
  it("普通页面解锁音频：只解锁引擎，背景音乐不启动", async () => {
    await unlockOnNormalPage();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    // 「不应持续播放」不等于「什么都不许准备」：解锁闸门仍然要放行音效，
    // 所以 <audio> 元素可能存在，但绝不能处于播放状态。
    const music = backgroundAudio();

    if (music) {
      expect(music.paused).toBe(true);
    }
  });

  it("普通页面解锁时也不该凭空多拉一个背景音乐元素", async () => {
    await unlockOnNormalPage();

    // 没有音乐就没有 <audio>；有的话也不该在播。
    const playing = FakeAudio.instances.filter((audio) => !audio.paused);

    expect(playing).toHaveLength(0);
  });

  it("进入知识岛：背景音乐起播", async () => {
    await unlockOnNormalPage();

    engine.suspendBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(backgroundAudio()?.paused).toBe(false);
  });

  it("离开知识岛：背景音乐停止", async () => {
    await unlockOnIsland();
    expect(engine.isBackgroundMusicPlaying()).toBe(true);

    engine.resumeBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(backgroundAudio()?.paused).toBe(true);
  });

  it("离开知识岛之后即使继续改设置，音乐也不会在普通页面上自己回来", async () => {
    await unlockOnIsland();
    engine.resumeBackgroundMusic();

    // 改音量、改开关都不会把普通页面的音乐拉起来。
    engine.syncAudioSettings({ musicVolume: 0.42, musicEnabled: true, masterVolume: 0.72 });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    engine.syncAudioSettings({ masterVolume: 0 });
    engine.syncAudioSettings({ masterVolume: 0.72 });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("连续进入三次是幂等的：不会新建第二个元素", async () => {
    await unlockOnNormalPage();
    const instanceCount = FakeAudio.instances.length;

    engine.suspendBackgroundMusic();
    engine.suspendBackgroundMusic();
    engine.suspendBackgroundMusic();

    expect(FakeAudio.instances).toHaveLength(instanceCount);
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("反复进出 5 次：只暂停/恢复玩家自己的那一条，不新建元素", async () => {
    await unlockOnIsland();
    const music = backgroundAudio();
    const instanceCount = FakeAudio.instances.length;

    for (let round = 0; round < 5; round += 1) {
      engine.resumeBackgroundMusic();
      expect(engine.isBackgroundMusicPlaying()).toBe(false);
      engine.suspendBackgroundMusic();
      expect(engine.isBackgroundMusicPlaying()).toBe(true);
    }

    expect(FakeAudio.instances).toHaveLength(instanceCount);
    expect(FakeAudio.instances[0]).toBe(music);
  });

  it("在知识岛上才第一次打开声音：那一次手势之后音乐就响", async () => {
    engine = await loadEngine();
    // 这一次文档里从来没交互过：进岛时引擎还没解锁，音乐也没响。
    engine.suspendBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 用户在知识岛这一页点了右上角「取消静音」—— 那一下把引擎解锁了。
    await engine.unlockAudioEngine();

    // 引擎一解锁，syncBackgroundAudio() 立刻按当前设置决定要不要起播。
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("普通页面取消静音（解锁）不会启动背景音乐", async () => {
    engine = await loadEngine();

    // 这就是普通页面上点右上角「取消静音」：unlockAudioEngine() 会解锁引擎。
    await engine.unlockAudioEngine();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("知识岛期间关掉背景音乐：立刻停，且不会擅自重开", async () => {
    await unlockOnIsland();
    const music = backgroundAudio();

    engine.syncAudioSettings({ musicEnabled: false });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    const playCallsWhileOff = music.playCalls;
    engine.syncAudioSettings({ musicEnabled: true });
    expect(music.playCalls).toBe(playCallsWhileOff + 1);
  });

  it("知识岛期间全局静音：立刻停", async () => {
    await unlockOnIsland();
    const music = backgroundAudio();

    // muteAll() 在 store 里做的事：主音量归零 + 两个通道都关掉。
    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(music.volume).toBe(0);
  });

  it("知识岛期间把音乐音量拉到 0：不响；拉回来之后才会响", async () => {
    await unlockOnIsland();

    engine.syncAudioSettings({ musicVolume: 0 });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 用户后来又把音乐音量调回来了 —— 这时恢复是顺着用户的意愿，不算擅自打开。
    engine.syncAudioSettings({ musicVolume: 0.42 });
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("全局静音优先：静音期间不会被偏好同步拉起来", async () => {
    await unlockOnIsland();

    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 只改音乐音量、保持主音量为 0：仍然是静音优先，不许借机出声。
    engine.syncAudioSettings({ musicVolume: 0.9, musicEnabled: true });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 主音量回来才恢复。
    engine.syncAudioSettings({ masterVolume: 0.72 });
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("静音状态会一直保持：连续同步设置不会自己重新起播", async () => {
    await unlockOnIsland();

    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });

    for (let i = 0; i < 5; i += 1) {
      engine.syncAudioSettings({ musicVolume: 0.5, masterVolume: 0.72 });
      engine.syncAudioSettings({ masterVolume: 0 });
    }

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });
});
