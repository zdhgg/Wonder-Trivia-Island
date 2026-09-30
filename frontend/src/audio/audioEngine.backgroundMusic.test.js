// 系统背景音乐被知识岛「临时借用」的行为约束（纯逻辑，不碰真实音频）。
//
// 知识岛要的是「专属环境声」：进页面把系统 BGM 让出来，走的时候原样还回去。
// 这里锁住的是那件事的边界 —— 借还必须是页面生命周期内的临时 pause/resume，
// 而不是一个偷偷改掉用户偏好的开关。
//
// 覆盖的五条：
//   1) 进入知识岛 → BGM 真的暂停，并且记住「进入前在不在播」；
//   2) 离开知识岛 → 按进入前的状态原样恢复；
//   3) 进入前本来就没播 → 离开时绝不擅自启动；
//   4) suspend 幂等：连续借两次不会把「在播」记丢（否则 BGM 再也回不来）；
//   5) 恢复要四个条件同时成立：进入前在播 + musicEnabled 仍开着 +
//      没有全局静音 + 音量够听。用户在岛上期间改了其中任何一项，
//      离开时都必须尊重，绝不能擅自把 BGM 打开。
//
// 测试环境没有 window，所以 WebAudio 那条路整个走不通（createAudioGraph 返回 null），
// 只剩 <audio> 元素这一条分支 —— 正好就是被借用的那一条。
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

// 走完一次解锁：这时系统 BGM 正在播，正是「知识岛页面被打开」的那一刻之前的状态。
async function unlockWithMusicPlaying() {
  engine = await loadEngine();
  await engine.unlockAudioEngine();
  expect(engine.isBackgroundMusicPlaying()).toBe(true);
}

describe("知识岛借走系统背景音乐", () => {
  it("进入知识岛：BGM 暂停，并且记住进入前是在播的", async () => {
    await unlockWithMusicPlaying();
    const music = backgroundAudio();

    const wasPlaying = engine.suspendBackgroundMusic();

    expect(wasPlaying).toBe(true);
    expect(engine.isBackgroundMusicSuppressed()).toBe(true);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(music.paused).toBe(true);
  });

  it("离开知识岛：按进入前的状态把 BGM 还回去", async () => {
    await unlockWithMusicPlaying();
    const music = backgroundAudio();
    const playCallsBefore = music.playCalls;

    engine.suspendBackgroundMusic();
    const resumed = engine.resumeBackgroundMusic();

    expect(resumed).toBe(true);
    expect(engine.isBackgroundMusicSuppressed()).toBe(false);
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(music.playCalls).toBe(playCallsBefore + 1);
  });

  it("进入前 BGM 本来就没播：离开时绝不擅自启动", async () => {
    engine = await loadEngine();
    // 还没解锁 —— 用户的 BGM 此刻就是静默的。
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    const wasPlaying = engine.suspendBackgroundMusic();
    expect(wasPlaying).toBe(false);

    const resumed = engine.resumeBackgroundMusic();
    expect(resumed).toBe(false);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    // 借用不该凭空把那个 7MB 循环拉下来。
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("连续借两次不会把「本来在播」记丢，BGM 回得来", async () => {
    await unlockWithMusicPlaying();
    const music = backgroundAudio();
    // 解锁流程里 primeBackgroundAudio() 也会暂停一次，所以从当前值开始比。
    const pauseCallsBefore = music.pauseCalls;

    engine.suspendBackgroundMusic();
    // 幂等：第二次进入时音频已经被我们自己暂停了，
    // 如果照着 !paused 重新记一次，就会永远记成 false。
    engine.suspendBackgroundMusic();
    engine.suspendBackgroundMusic();
    expect(music.pauseCalls - pauseCallsBefore).toBe(1);

    engine.resumeBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("反复进出 5 次：只暂停/恢复玩家自己的那一条，不新建元素", async () => {
    await unlockWithMusicPlaying();
    const music = backgroundAudio();
    const instanceCount = FakeAudio.instances.length;

    for (let round = 0; round < 5; round += 1) {
      engine.suspendBackgroundMusic();
      expect(engine.isBackgroundMusicPlaying()).toBe(false);
      engine.resumeBackgroundMusic();
      expect(engine.isBackgroundMusicPlaying()).toBe(true);
    }

    expect(FakeAudio.instances).toHaveLength(instanceCount);
    expect(FakeAudio.instances[0]).toBe(music);
  });

  it("在知识岛上才第一次打开声音：离开时 BGM 必须还回来", async () => {
    engine = await loadEngine();
    // 这一次文档里从来没交互过：进岛时引擎还没解锁，BGM 也没在播。
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    engine.suspendBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 用户在知识岛这一页点了右上角「取消静音」—— 那一下把引擎解锁了。
    // BGM 之所以还没响，唯一原因就是被我们借出期间按住了。
    await engine.unlockAudioEngine();
    // 借出期间 unlockAudioEngine 也不能把 BGM 抢着播起来。
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    const resumed = engine.resumeBackgroundMusic();

    expect(resumed).toBe(true);
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("在知识岛上打开声音之后又静音：离开时仍然不擅自打开", async () => {
    engine = await loadEngine();
    engine.suspendBackgroundMusic();
    await engine.unlockAudioEngine();
    // muteAll()：主音量归零 + 两个通道都关掉。
    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });

    engine.resumeBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
  });

  it("知识岛期间关掉背景音乐：离开时绝不擅自重新打开", async () => {
    await unlockWithMusicPlaying();
    const music = backgroundAudio();

    engine.suspendBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 知识岛页面上没有自己的声音开关了，所以"关掉音乐"只能发生在全局设置里。
    // 孩子在那期间把背景音乐关了 —— 离开时必须尊重这个选择。
    engine.syncAudioSettings({ musicEnabled: false });
    const playCallsWhileSuppressed = music.playCalls;
    const resumed = engine.resumeBackgroundMusic();

    // 返回值仍然诚实地报告"进入前是在播的"，但真实播放状态是静音。
    expect(resumed).toBe(true);
    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(music.playCalls).toBe(playCallsWhileSuppressed);
  });

  it("知识岛期间全局静音：离开时同样不恢复", async () => {
    await unlockWithMusicPlaying();
    const music = backgroundAudio();

    engine.suspendBackgroundMusic();
    // muteAll() 在 store 里做的事：主音量归零 + 两个通道都关掉。
    engine.syncAudioSettings({ masterVolume: 0, musicEnabled: false, sfxEnabled: false });
    engine.resumeBackgroundMusic();

    expect(engine.isBackgroundMusicPlaying()).toBe(false);
    expect(music.volume).toBe(0);
  });

  it("知识岛期间把音乐音量拉到 0：离开时不恢复；拉回来之后才会响", async () => {
    await unlockWithMusicPlaying();

    engine.suspendBackgroundMusic();
    engine.syncAudioSettings({ musicVolume: 0 });
    engine.resumeBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    // 用户后来又把音乐音量调回来了 —— 这时恢复 BGM 是顺着用户的意愿，不算擅自打开。
    engine.syncAudioSettings({ musicVolume: 0.42 });
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
  });

  it("全局静音优先：借出期间不会被偏好同步拉起来，还回来之后仍然是静音", async () => {
    await unlockWithMusicPlaying();
    const music = backgroundAudio();

    engine.suspendBackgroundMusic();

    // 借出期间用户改了设置：也不能把 BGM 顺手播起来。
    engine.syncAudioSettings({ masterVolume: 0.5, musicEnabled: true });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    engine.resumeBackgroundMusic();
    expect(engine.isBackgroundMusicPlaying()).toBe(true);

    // 真正静音时优先级最高：还回来也不会响。
    engine.syncAudioSettings({ masterVolume: 0 });
    expect(engine.isBackgroundMusicPlaying()).toBe(false);

    engine.syncAudioSettings({ masterVolume: 0.72 });
    expect(engine.isBackgroundMusicPlaying()).toBe(true);
    expect(music.volume).toBeGreaterThan(0);
  });
});
