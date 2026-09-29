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
import { ISLAND_GULL_CRY_SCHEDULE } from "./audioConfig";

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
const FIRST_DELAY_MS = ISLAND_GULL_CRY_SCHEDULE.firstDelayMs;
const GULL_MIN_MS = ISLAND_GULL_CRY_SCHEDULE.minDelayMs;
const GULL_MAX_MS = ISLAND_GULL_CRY_SCHEDULE.maxDelayMs;

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

describe("知识岛海鸥叫的调度", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 固定随机源：间隔必须是可预测的，测试才锁得住。
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function startWithWaves() {
    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
  }

  it("进页面后先只听一会儿海，第一声不急着来", async () => {
    ambience = await loadAmbienceModule();
    startWithWaves();

    // 只挂了一个待触发的定时器（不会攒出一串）。
    expect(ambience.getPendingGullCryCount()).toBe(1);

    // 第一声之前，海鸥一个实例都还没建出来。
    expect(FakeAudio.instances).toHaveLength(1);

    // 走完首声延迟之前仍然不叫。
    vi.advanceTimersByTime(FIRST_DELAY_MS - 1);
    expect(FakeAudio.instances).toHaveLength(1);

    // 到点了才叫。
    vi.advanceTimersByTime(1);
    expect(FakeAudio.instances).toHaveLength(2);
  });

  it("叫完之后换成随机间隔，而不是固定节拍", async () => {
    ambience = await loadAmbienceModule();
    startWithWaves();

    vi.advanceTimersByTime(FIRST_DELAY_MS);
    expect(FakeAudio.instances).toHaveLength(2);

    // 同一个海鸥实例复用：不会每叫一声就新建一个。
    const cryAudio = FakeAudio.instances[1];
    expect(cryAudio.playCalls).toBe(1);
    // 叫声很短、不循环。
    expect(cryAudio.loop).toBe(false);
    // 正在叫的时候不排下一声：下一声要等它真的播完（ended）。
    expect(ambience.getPendingGullCryCount()).toBe(0);

    // 模拟这一声播完（真实浏览器里由 ended 事件驱动，不是掐着秒表）。
    cryAudio.paused = true;
    cryAudio.emit("ended");

    // 播完才排下一次，而且只排一个。
    expect(ambience.getPendingGullCryCount()).toBe(1);

    // 随机间隔 = min + 0.5 × (max - min)；它和首声延迟不是同一个旋钮。
    const expectedGapMs = GULL_MIN_MS + 0.5 * (GULL_MAX_MS - GULL_MIN_MS);
    expect(expectedGapMs).toBeGreaterThan(FIRST_DELAY_MS);

    vi.advanceTimersByTime(expectedGapMs - 1);
    expect(cryAudio.playCalls).toBe(1);

    vi.advanceTimersByTime(1);
    // 还是同一个实例，只是又叫了一次。
    expect(FakeAudio.instances).toHaveLength(2);
    expect(cryAudio.playCalls).toBe(2);
  });

  it("上一声还没结束就不接着叫，不会叠成一串", async () => {
    ambience = await loadAmbienceModule();
    startWithWaves();

    vi.advanceTimersByTime(FIRST_DELAY_MS);
    const cryAudio = FakeAudio.instances[1];
    expect(cryAudio.playCalls).toBe(1);

    // 偏好被反复同步也不会攒出一串待触发的叫声。
    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.syncIslandAmbiencePreferences(preferences());
    expect(ambience.getPendingGullCryCount()).toBe(1);

    // FakeAudio 不会自己结束（paused 一直是 false），所以这里手工再触发一次调度：
    // 真实场景是"定时器到点时上一声还在响"，这里验证的正是那道闸门。
    vi.advanceTimersByTime(GULL_MIN_MS + 0.5 * (GULL_MAX_MS - GULL_MIN_MS));

    // 一声都没有叠上去，也没多建实例。
    expect(cryAudio.playCalls).toBe(1);
    expect(FakeAudio.instances).toHaveLength(2);
  });

  it("play 事件晚到一步（真实浏览器就是这样）：海鸥仍然会被排上", async () => {
    // 浏览器里 play() 会同步把 paused 翻成 false，但 "play" 事件是稍后才派发的。
    // 如果调度闸门看的是那个事件驱动的播放标志，用户点开开关的那一瞬间
    // 标志还是 false —— 于是第一次排程就被跳过，海鸥永远不叫。
    // 这里把事件推迟到下一个宏任务，复现这个真实时序。
    const nativePlay = FakeAudio.prototype.play;

    FakeAudio.prototype.play = function play() {
      this.playCalls += 1;
      this.paused = false;
      globalThis.setTimeout(() => this.emit("play"), 0);
      return Promise.resolve();
    };

    try {
      ambience = await loadAmbienceModule();
      startWithWaves();

      expect(FakeAudio.instances[0].paused).toBe(false);
      expect(ambience.getPendingGullCryCount()).toBe(1);
    } finally {
      FakeAudio.prototype.play = nativePlay;
    }
  });

  it("离开页面：定时器全部清掉，海鸥也停", async () => {
    ambience = await loadAmbienceModule();
    startWithWaves();
    vi.advanceTimersByTime(FIRST_DELAY_MS);

    const cryAudio = FakeAudio.instances[1];
    cryAudio.pauseCalls = 0;

    ambience.stopIslandAmbience();

    // 彻底清理：没有任何待触发的定时器，海鸥被暂停并归零。
    expect(ambience.getPendingGullCryCount()).toBe(0);

    if (cryAudio) {
      expect(cryAudio.paused).toBe(true);
      expect(cryAudio.currentTime).toBe(0);
    }

    // 离开之后再怎么走时间，也不会再叫。
    const instanceCount = FakeAudio.instances.length;
    vi.advanceTimersByTime(GULL_MAX_MS * 2);
    expect(FakeAudio.instances).toHaveLength(instanceCount);
  });

  it("反复进出 5 次：海浪与海鸥各自仍然只有一个实例", async () => {
    ambience = await loadAmbienceModule();

    for (let round = 0; round < 5; round += 1) {
      ambience.unlockIslandAmbience();
      startWithWaves();
      ambience.stopIslandAmbience();
    }

    expect(ambience.getPendingGullCryCount()).toBe(0);
    // 5 轮里只有海浪一个实例（海鸥还没到点就被清掉了）。
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it("全局静音时海鸥也不会被排上", async () => {
    ambience = await loadAmbienceModule();
    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0 }));
    ambience.startIslandAmbience();

    expect(ambience.getPendingGullCryCount()).toBe(0);

    // 恢复音量并起播后，调度才重新开始。
    ambience.syncIslandAmbiencePreferences(preferences());
    expect(ambience.getPendingGullCryCount()).toBe(1);
  });
});
