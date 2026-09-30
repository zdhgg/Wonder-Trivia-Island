// 知识岛「专属环境声」的行为约束（纯逻辑，不碰真实音频）。
//
// 这一层现在没有自己的开关了：它完全跟随全站的声音状态。
// 所以这里锁住的是六条硬性约束：
//   1) 全局静音时这一页保持安静（主音量 0，或音乐与音效两个通道都关掉）；
//   2) 这一份文档里没有用户交互之前不出声（深链直接打开知识岛也是安静的）——
//      判断依据是音频引擎有没有被解锁，这一层绝不自己解锁、也不自己制造手势；
//   3) 全局只有一个 Audio 实例，重复 start 不会叠播；
//   4) stop 之后真的暂停并归零，再进来按全局状态恢复；
//   5) 海鸥是克制的点缀：几十秒一声，任意时刻最多一声；
//   6) 页面不在位就绝不起播：sync 只在知识岛页面挂载期间允许起播 / 恢复 ——
//      离开之后无论全局状态怎么变都保持安静，静音按钮在任何页面都管得住这一层。
//
// 这个模块是单例，所以每个用例都用 vi.resetModules() + 动态 import 拿一份全新的
// 模块状态，免得用例之间互相继承"已经创建过 Audio / 已经解锁"这类残留。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ISLAND_GULL_CRY_SCHEDULE } from "./audioConfig";

// audioEngine 只被用到 isAudioEngineUnlocked()，这里用假的替换掉，
// 免得为了测"没交互过就不播"而去真的构造 WebAudio。
// unlockAudioEngine 也一并打桩：它绝不该出现在这一层的调用路径里 ——
// 点右上角那颗静音按钮去解锁整台应用，和"知识岛自己偷偷解锁"是两回事。
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

// 全局声音状态。默认就是"没静音、两个通道都开着"。
function preferences(overrides = {}) {
  return {
    masterVolume: DEFAULT_MASTER_VOLUME,
    musicEnabled: true,
    sfxEnabled: true,
    ...overrides
  };
}

// muteAll() 在 store 里做的事：主音量归零 + 两个通道都关掉。
function mutedPreferences(overrides = {}) {
  return { masterVolume: 0, musicEnabled: false, sfxEnabled: false, ...overrides };
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

describe("知识岛环境声跟随全局声音控制", () => {
  it("全局没静音且已经解锁：进页面就播海浪，而且只有一层", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();

    expect(ambience.isIslandAmbiencePlaying()).toBe(true);
    expect(FakeAudio.instances).toHaveLength(1);
    const waves = FakeAudio.instances[0];

    expect(waves.loop).toBe(true);
    expect(waves.paused).toBe(false);
    // 音量必须明显低于总音量：它只是垫在下面的海声，不能盖住学习页面。
    expect(waves.volume).toBeCloseTo(DEFAULT_MASTER_VOLUME * ISLAND_WAVES_VOLUME, 5);
  });

  it("全局静音：海浪和海鸥都不响", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(mutedPreferences());
    ambience.startIslandAmbience();

    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
    // 静音时连海鸥的排程都不该发生。
    expect(ambience.getPendingGullCryCount()).toBe(0);
  });

  it("这一份文档还没交互过：即使全局没静音也保持安静", async () => {
    // 模拟"刷新之后的新文档"：用户还没在这一次会话里点过任何东西。
    engineState.unlocked = false;
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();

    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
    // 连 Audio 元素都不建 —— 浏览器不允许在用户交互前出声。
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("这一层绝不自己去解锁音频引擎", async () => {
    engineState.unlocked = false;
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    ambience.stopIslandAmbience();

    // 解锁只能由既有的全局音频机制（设置页「启用音频」或右上角静音按钮）触发。
    expect(engineState.unlockCalls).toBe(0);
  });

  it("全局取消静音后已经解锁：立刻按全局状态恢复，不需要页面再做任何事", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(mutedPreferences());
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);

    ambience.syncIslandAmbiencePreferences(preferences());
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);
  });

  it("正在响的时候把全局音量拉到 0：立刻停，而且不会自己回来", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);

    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0 }));
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
    expect(FakeAudio.instances[0].paused).toBe(true);

    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
  });

  it("总音量调小：正在响的那一路要立刻跟着变小", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();

    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0.1 }));
    expect(FakeAudio.instances[0].volume).toBeCloseTo(0.1 * ISLAND_WAVES_VOLUME, 5);
  });

  it("两个通道都关掉 = 全站静音（和右上角那颗按钮同一个判定）", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0.5 }));
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);

    ambience.syncIslandAmbiencePreferences(preferences({ musicEnabled: false, sfxEnabled: false }));
    expect(ambience.isIslandAmbiencePlaying()).toBe(false);

    // 只关掉其中一个通道不叫静音：全站声音还开着，这一页就继续跟着响。
    ambience.syncIslandAmbiencePreferences(preferences({ musicEnabled: false }));
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);
  });

  it("单例：反复 start / stop 都不会叠出第二个 audio 实例", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    ambience.startIslandAmbience();
    ambience.stopIslandAmbience();
    ambience.startIslandAmbience();
    ambience.startIslandAmbience();

    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].paused).toBe(false);
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

  it("页面不在位时，全局状态再怎么同步也不会把海浪拉起来", async () => {
    ambience = await loadAmbienceModule();

    // 没有知识岛页面挂载（没调用 start）：全站没静音、引擎已解锁，
    // sync 也只更新设置，绝不起播 —— 这就是"首页被状态同步拉起海浪"那类
    // 泄漏的闸门：起播只能发生在知识岛页面在位的时候。
    ambience.syncIslandAmbiencePreferences(preferences());

    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(ambience.getPendingGullCryCount()).toBe(0);
  });

  it("离开页面之后，sync 再怎么同步也不会让海浪复活", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    expect(ambience.isIslandAmbiencePlaying()).toBe(true);

    ambience.stopIslandAmbience();

    // 离开之后在别的页面上发生的每一次全局状态同步（改音量、切开关）
    // 都必须保持安静 —— 「页面在位」一旦撤掉就不回来，只能重新进页面。
    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.syncIslandAmbiencePreferences(preferences({ masterVolume: 0.5 }));

    expect(ambience.isIslandAmbiencePlaying()).toBe(false);
  });

  it("兜底：海浪万一还在响而页面已经不在，全局静音必须能按住它", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    ambience.stopIslandAmbience();

    // 模拟某种异常残留：人已经离开知识岛，海浪元素却还在响。
    const waves = FakeAudio.instances[0];
    waves.play();
    expect(waves.paused).toBe(false);

    // 右上角静音（全局状态变化 → sync）：必须真的把它按住，海鸥定时器也一并清掉。
    ambience.syncIslandAmbiencePreferences(mutedPreferences());

    expect(waves.paused).toBe(true);
    expect(ambience.getPendingGullCryCount()).toBe(0);
  });

  it("素材加载失败后不再重试，避免每次进出页面都打一条失败请求", async () => {
    ambience = await loadAmbienceModule();

    ambience.syncIslandAmbiencePreferences(preferences());
    ambience.startIslandAmbience();
    FakeAudio.instances[0].emit("error");

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

    // 随机间隔 = min + 0.5 × (max - min)；它和首声那个旋钮不是同一个。
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
    // 如果调度闸门看的是那个事件驱动的播放标志，用户点开声音的那一刻
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

  it("全局静音时海鸥也不会被排上", async () => {
    ambience = await loadAmbienceModule();
    ambience.syncIslandAmbiencePreferences(mutedPreferences());
    ambience.startIslandAmbience();

    expect(ambience.getPendingGullCryCount()).toBe(0);

    // 取消静音后，调度才重新开始。
    ambience.syncIslandAmbiencePreferences(preferences());
    expect(ambience.getPendingGullCryCount()).toBe(1);
  });

  it("反复进出 5 次：海浪与海鸥各自仍然只有一个实例", async () => {
    ambience = await loadAmbienceModule();

    for (let round = 0; round < 5; round += 1) {
      startWithWaves();
      ambience.stopIslandAmbience();
    }

    expect(ambience.getPendingGullCryCount()).toBe(0);
    // 5 轮里只有海浪一个实例（海鸥还没到点就被清掉了）。
    expect(FakeAudio.instances).toHaveLength(1);
  });
});
