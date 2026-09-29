// 知识岛海浪环境声的行为约束（纯逻辑，不碰真实音频）。
//
// 这个模块是单例，所以每个用例都用 vi.resetModules() + 动态 import 拿一份全新的模块状态，
// 免得用例之间互相继承"已经创建过 Audio / 已经解锁"这类残留。
//
// 这里锁住的是四条硬性约束：
//   1) 默认不出声；
//   2) 没有用户交互之前不出声（深链直接打开知识岛也是安静的）；
//   3) 全局只有一个 Audio 实例，重复 start 不会叠播；
//   4) stop 之后真的暂停并归零，再进来按偏好恢复。
// 另外还锁住一条"克制"：点这个开关不应该把整台应用的背景音乐也叫醒。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// audioEngine 只被用到 isAudioEngineUnlocked()，这里用假的替换掉，
// 免得为了测"没交互过就不播"而去真的构造 WebAudio。
// unlockAudioEngine 也一并打桩：它出现在假对象里，是为了断言
// 「点岛上的开关不会去唤醒整台应用的音频引擎」。
const engineState = vi.hoisted(() => ({ unlocked: false, unlockCalls: 0 }));

vi.mock("../audio/audioEngine", () => ({
  isAudioEngineUnlocked: () => engineState.unlocked,
  unlockAudioEngine: () => {
    engineState.unlockCalls += 1;
    return Promise.resolve(true);
  }
}));

const DEFAULT_MASTER_VOLUME = 0.72;
const ISLAND_WAVES_VOLUME = 0.16;

class FakeAudio {
  static instances = [];

  constructor(source) {
    this.src = source;
    this.loop = false;
    this.preload = "";
    this.playsInline = false;
    this.volume = 1;
    this.paused = true;
    this.currentTime = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.listeners = new Map();
    FakeAudio.instances.push(this);
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  emit(type) {
    for (const handler of this.listeners.get(type) || []) {
      handler();
    }
  }

  play() {
    this.playCalls += 1;
    this.paused = false;
    this.emit("play");
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
    this.emit("pause");
  }
}

let ambience;

async function loadAmbienceModule() {
  vi.resetModules();
  return import("./islandAmbience");
}

// 海浪这一路只跟两件事有关：这个开关，和设置里的总音量。
// 「背景音乐」开关与它无关 —— 那是另一条声音，岛上这一页有自己的 🔊。
function preferences(overrides = {}) {
  return {
    islandAmbienceEnabled: true,
    masterVolume: DEFAULT_MASTER_VOLUME,
    ...overrides
  };
}

beforeEach(() => {
  FakeAudio.instances = [];
  engineState.unlocked = true;
  engineState.unlockCalls = 0;
  globalThis.Audio = FakeAudio;
});

afterEach(() => {
  delete globalThis.Audio;
  engineState.unlocked = false;
});

describe("知识岛海浪环境声", () => {
  it("默认关闭：进入页面不会自己出声，也不会创建 Audio 实例", async () => {
    ambience = await loadAmbienceModule();

    // 默认偏好就是关的（DEFAULT_AUDIO_PREFERENCES.islandAmbienceEnabled === false）。
    expect(ambience.isIslandAmbienceEnabled()).toBe(false);

    ambience.startIslandAmbience();

    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("没有用户交互之前，即使偏好是打开的也不播", async () => {
    ambience = await loadAmbienceModule();
    engineState.unlocked = false;

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();

    // 记住意图了，但没有出声，也没有任何 Audio 实例被建出来。
    expect(ambience.isIslandAmbienceEnabled()).toBe(true);
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("点开关本身就是那次用户交互：不用唤醒整台应用就能放出来", async () => {
    ambience = await loadAmbienceModule();
    // 模拟"刷新之后的新文档"：偏好还在，但这个文档里用户还没交互过。
    engineState.unlocked = false;
    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);

    ambience.unlockIslandAmbience();
    ambience.syncIslandAmbiencePreferences(preferences());

    expect(ambience.isIslandAmbiencePlaying()).toBe(true);
    expect(FakeAudio.instances).toHaveLength(1);
    // 克制：只放海浪这一条通道，没有去解锁整台应用的音频引擎
    // （否则点一下会顺手把全站背景音乐也叫醒）。
    expect(engineState.unlockCalls).toBe(0);
  });

  it("交互之后进入页面：按偏好恢复播放，并且是循环、音量很低", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();

    expect(FakeAudio.instances).toHaveLength(1);
    const [audio] = FakeAudio.instances;

    expect(audio.loop).toBe(true);
    expect(audio.paused).toBe(false);
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);
    // 音量必须明显低于总音量：它只是垫在下面的海声，不能盖住学习页面。
    expect(audio.volume).toBeCloseTo(DEFAULT_MASTER_VOLUME * ISLAND_WAVES_VOLUME, 5);
    expect(audio.volume).toBeLessThan(0.2);
  });

  it("只有一个实例：反复进出页面不会叠出第二个 Audio，也不会重复起播", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    ambience.startIslandAmbience();
    ambience.stopIslandAmbience();
    ambience.startIslandAmbience();
    ambience.startIslandAmbience();

    expect(FakeAudio.instances).toHaveLength(1);
    // 一次起播 + 停一次 + 再起播一次；已经在响时重复 start 不会再 play 一次。
    expect(FakeAudio.instances[0].playCalls).toBe(2);
  });

  it("离开页面会暂停并归零：不会在别的页面上继续响", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    FakeAudio.instances[0].currentTime = 7.5;

    ambience.stopIslandAmbience();

    expect(FakeAudio.instances[0].paused).toBe(true);
    expect(FakeAudio.instances[0].currentTime).toBe(0);
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
  });

  it("关掉开关立刻停，而且不会在重新进入时自己回来", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);

    ambience.syncIslandAmbiencePreferences(preferences({ islandAmbienceEnabled: false }));
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);

    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
  });

  it("全局静音对海浪同样生效：总音量归零就会停", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0 }));
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);

    // 把总音量调小，正在响的那一路要立刻跟着变小（而不是停在旧音量）。
    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0.1 }));
    expect(FakeAudio.instances[0].volume).toBeCloseTo(0.1 * ISLAND_WAVES_VOLUME, 5);

    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0 }));
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
  });

  it("播放状态变化会通知订阅者，控件才能区分「想听」和「正在响」", async () => {
    ambience = await loadAmbienceModule();
    const observed = [];

    const unsubscribe = ambience.subscribeIslandAmbience((playing) => observed.push(playing));

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    ambience.stopIslandAmbience();
    unsubscribe();

    // 订阅取消之后不再收到通知。
    ambience.startIslandAmbience();
    expect(observed).toEqual([true, false]);
  });

  it("素材加载失败后不再重试，避免每次进出页面都打一条失败请求", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    FakeAudio.instances[0].emit("error");
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);

    ambience.startIslandAmbience();
    ambience.startIslandAmbience();

    // 失败之后不再新建实例。
    expect(FakeAudio.instances).toHaveLength(1);
  });
});
