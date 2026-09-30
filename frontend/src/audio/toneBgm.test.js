// BGM 的 Tone.js 主路径专项测试。
//
// 这一层用假的 Tone 实现驱动真实的 toneBgm.js：无头环境里真 Tone 只有
// DummyContext，造不出真 AudioParam 节点，所以单例、幂等、循环这些**逻辑**
// 必须能被独立验证 —— 而浏览器里跑的是同一份代码、真的 Tone。
//
// 锁住的八条边界：
//   1) Tone runtime 是单例：反复 ensure 只建一次，永远只有一个 Transport；
//   2) start / stop 幂等：重复调用不会叠出第二套、也不会重复 start；
//   3) 解锁之前不播放；
//   4) 静音立刻停止；
//   5) 取消静音后按原状态恢复；
//   6) 知识岛借出与归还；
//   7) 反复进出不重复创建；
//   8) musicVolume 为 0 时不播放。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BGM_SECTIONS,
  BGM_TEMPO_BPM,
  BGM_TOTAL_BARS,
  BGM_RHYTHM
} from "./toneBgmConfig";

// ---------------------------------------------------------------------------
// 假的 Tone：只实现 toneBgm.js 真正用到的那几个东西，并且**记账**，
// 所以"有没有叠出第二个 runtime / 第二个 Transport"可以被直接断言。
// ---------------------------------------------------------------------------
function createFakeTone() {
  const counters = {
    transportStart: 0,
    transportPause: 0,
    transportCancel: 0,
    transportSchedule: 0,
    releaseAll: 0,
    channel: 0,
    filter: 0,
    compressor: 0,
    volumeNode: 0,
    synth: 0,
    destination: 0
  };
  const scheduled = [];
  const ramped = [];
  // Transport 上排队的音事件。cancel() 会把它清空 —— 静音彻底与否就看这个数组。
  const scheduledTransportEvents = [];

  function makeParam(initial = 1) {
    return {
      value: initial,
      rampTo: vi.fn(function rampTo(value) {
        ramped.push(value);
        // 真 Tone 的 ramp 走完之后 value 就是目标值；这里照做，
        // 快照里的 busDecibels 才反映得出"总线现在到底在哪"。
        this.value = value;
      }),
      // 真 Tone 的 Param 有 getValueAtTime。快照读它而不是 value，
      // 因为 value 在 ramp 过程中不等于实际输出。
      getValueAtTime: vi.fn(function getValueAtTime() {
        return this.value;
      })
    };
  }

  const context = {
    state: "running",
    now: 0,
    rawContext: {
      createGain: () => ({}),
      state: "running"
    },
    resume: vi.fn(async function resume() {
      context.state = "running";
    })
  };

  const Transport = {
    bpm: { value: 0 },
    timeSignature: 4,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    state: "stopped",
    // scheduleOnce：真实 Tone 里音符是由 Transport 排程的，cancel() 才能清空它们。
    // 这里如实记账（回调存下来、触发时调用），因为"排队了多少、取消了没有"
    // 正是静音彻底与否的关键。
    scheduleOnce(callback, time) {
      counters.transportSchedule += 1;
      scheduledTransportEvents.push({ callback, time });
      return scheduledTransportEvents.length;
    },
    cancel() {
      counters.transportCancel += 1;
      const cleared = scheduledTransportEvents.length;
      scheduledTransportEvents.length = 0;
      return cleared;
    },
    start() {
      counters.transportStart += 1;
      this.state = "started";
      for (const event of scheduledTransportEvents) {
        event.callback(0);
      }
    },
    pause() {
      counters.transportPause += 1;
      this.state = "paused";
    },
    stop() {
      this.state = "stopped";
    }
  };

  const tone = {
    version: "15.1.22-fake",
    Transport,
    getContext: () => context,
    getDestination: () => {
      counters.destination += 1;
      return { connect: vi.fn() };
    },
    Channel: class {
      constructor() {
        counters.channel += 1;
        this.chain = vi.fn();
      }
      dispose = vi.fn();
    },
    Filter: class {
      constructor() {
        counters.filter += 1;
      }
      dispose = vi.fn();
    },
    Compressor: class {
      constructor() {
        counters.compressor += 1;
      }
      dispose = vi.fn();
    },
    Volume: class {
      constructor() {
        counters.volumeNode += 1;
        this.volume = makeParam(0);
      }
      dispose = vi.fn();
    },
    // 必须返回真正带 connect() 的对象：toneBgm.js 里每个音色都会
    // new Tone.Synth({...}).connect(channel)，返回别的东西就接不上。
    // 真 Tone 的 PolySynth 签名是 new Tone.PolySynth(Tone.Synth, options)，
    // 复音需求就是它存在的理由（单声部 Synth 遇到重叠音符会直接抛异常）。
    // 这里保持同样的调用形状，并照样计入 counters.synth，让"5 个音色层"这条断言照旧成立。
    // releaseAll 是"静音必须彻底"的关键：正在响的声部要立刻释放，尾音不能留。
    PolySynth: class {
      constructor(_voice, _options) {
        counters.synth += 1;
        this.connect = vi.fn(() => this);
        this.dispose = vi.fn();
        this.releaseAll = vi.fn(() => {
          counters.releaseAll += 1;
        });
        this.triggerAttackRelease = vi.fn((note, duration, time, velocity) => {
          scheduled.push({ note, duration, time, velocity });
        });
      }
    },
    Synth: class {
      constructor() {
        counters.synth += 1;
        // 真 Tone 的 connect() 返回 this，链式调用靠的就是这个。
        this.connect = vi.fn(() => this);
        this.dispose = vi.fn();
        this.triggerAttackRelease = vi.fn((note, duration, time, velocity) => {
          scheduled.push({ note, duration, time, velocity });
        });
      }
    }
  };

  return { tone, counters, scheduled, ramped, context, Transport, scheduledTransportEvents };
}

let fake;

async function loadToneBgm() {
  vi.resetModules();
  const module = await import("./toneBgm");
  module.__setToneForTests(fake.tone);
  return module;
}

beforeEach(() => {
  fake = createFakeTone();
});

afterEach(() => {
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// 1) 单例
// ---------------------------------------------------------------------------
describe("Tone BGM runtime 单例", () => {
  it("反复 ensure 只建一次：只有一个 Channel、一个 Transport", async () => {
    const engine = await loadToneBgm();

    engine.ensureToneBgmRuntime();
    engine.ensureToneBgmRuntime();
    engine.ensureToneBgmRuntime();

    const snapshot = engine.getToneBgmRuntimeSnapshot();
    expect(snapshot.ready).toBe(true);
    expect(snapshot.buildCount).toBe(1);
    expect(fake.counters.channel).toBe(1);
    expect(snapshot.hasTransport).toBe(true);
    expect(snapshot.instrumentCount).toBe(5);
  });

  it("反复 start / stop 之后仍然只有同一套节点", async () => {
    const engine = await loadToneBgm();

    for (let round = 0; round < 5; round += 1) {
      engine.startToneBgm();
      engine.stopToneBgm();
    }

    const snapshot = engine.getToneBgmRuntimeSnapshot();
    expect(snapshot.buildCount).toBe(1);
    expect(fake.counters.channel).toBe(1);
    expect(fake.counters.synth).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 2) start / stop 幂等
// ---------------------------------------------------------------------------
describe("start / stop 幂等", () => {
  it("连续 start 只让 Transport 真正跑起来一次", async () => {
    const engine = await loadToneBgm();

    expect(engine.startToneBgm()).toBe(true);
    expect(engine.startToneBgm()).toBe(true);
    expect(engine.startToneBgm()).toBe(true);

    expect(fake.counters.transportStart).toBe(1);
    expect(engine.isToneBgmPlaying()).toBe(true);
  });

  it("连续 stop 之后仍然是停止状态；停完之后再 start 仍然能用", async () => {
    const engine = await loadToneBgm();

    engine.startToneBgm();
    engine.stopToneBgm();
    engine.stopToneBgm();

    // 重复 stop 会再次把总线压到 -Infinity、再次清队列 —— 这是有意的：
    // 「静音必须彻底」不能因为"看起来已经停了"就跳过清理。
    // 幂等指的是**结果**幂等（不会重新起播、不会被重新拉起来），不是记账只发生一次。
    expect(engine.isToneBgmPlaying()).toBe(false);
    expect(fake.counters.transportCancel).toBe(2);
    expect(fake.scheduledTransportEvents).toHaveLength(0);

    engine.startToneBgm();
    expect(fake.counters.transportStart).toBe(2);
    expect(engine.isToneBgmPlaying()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4) 静音必须彻底：停播要一次做四件事
// ---------------------------------------------------------------------------
describe("停止是彻底的", () => {
  it("stop 会同时：总线归零、暂停 Transport、清空队列、释放所有声部", async () => {
    const engine = await loadToneBgm();
    engine.ensureToneBgmRuntime();
    engine.setToneBgmVolume(0.5);
    engine.startToneBgm();

    expect(fake.scheduledTransportEvents.length).toBeGreaterThan(0);
    expect(fake.scheduled.length).toBeGreaterThan(0);

    engine.stopToneBgm();

    // 1) 音乐总线掉到 -Infinity（真静音，不是"很小声"）
    expect(engine.getToneBgmRuntimeSnapshot().busDecibels).toBe(-Infinity);
    // 2) Transport 停了
    expect(fake.counters.transportPause).toBeGreaterThanOrEqual(1);
    expect(engine.isToneBgmPlaying()).toBe(false);
    // 3) 已经排队的音一个不剩 —— 不给它们到点发声的机会
    expect(fake.scheduledTransportEvents).toHaveLength(0);
    // 4) 五个声部都立刻释放（掐掉 pad 长音和 bell 尾音）
    expect(fake.counters.releaseAll).toBe(5);
  });

  it("总线的目标音量被记住：停过一次再起播不会静默", async () => {
    const engine = await loadToneBgm();
    engine.ensureToneBgmRuntime();
    engine.setToneBgmVolume(0.42);
    engine.startToneBgm();
    engine.stopToneBgm();

    expect(engine.getToneBgmRuntimeSnapshot().busDecibels).toBe(-Infinity);

    engine.startToneBgm();

    // 重新起播时总线要按记录的目标音量拉回来，而不是停在 -Infinity。
    const snapshot = engine.getToneBgmRuntimeSnapshot();
    expect(snapshot.targetGain).toBeCloseTo(0.42, 5);
    expect(snapshot.busDecibels).toBeGreaterThan(-Infinity);
  });

  it("音量 0 映射成 -Infinity 而不是某个很小的数", async () => {
    const engine = await loadToneBgm();
    engine.ensureToneBgmRuntime();

    engine.setToneBgmVolume(0);

    expect(engine.getToneBgmRuntimeSnapshot().busDecibels).toBe(-Infinity);
  });

  it("立即静音（rampSeconds=0）不经过任何淡出", async () => {
    const engine = await loadToneBgm();
    engine.ensureToneBgmRuntime();
    engine.setToneBgmVolume(0.6);
    fake.ramped.length = 0;

    engine.setToneBgmVolume(0, { rampSeconds: 0 });

    // 淡出的那 0.35 秒里声音还在，"点一下就立刻安静"必须走立即设置。
    expect(fake.ramped).toHaveLength(0);
    expect(engine.getToneBgmRuntimeSnapshot().busDecibels).toBe(-Infinity);
  });
});

// ---------------------------------------------------------------------------
// 音乐本身的硬性要求：节奏、段落、循环、音色分层
// ---------------------------------------------------------------------------
describe("音乐内容", () => {
  it("默认节奏在 132–138 BPM 之间", () => {
    expect(BGM_TEMPO_BPM).toBeGreaterThanOrEqual(132);
    expect(BGM_TEMPO_BPM).toBeLessThanOrEqual(138);
  });

  it("Transport 真的按这个速度跑，并且开了循环", async () => {
    const engine = await loadToneBgm();
    engine.ensureToneBgmRuntime();

    const snapshot = engine.getToneBgmRuntimeSnapshot();
    expect(snapshot.bpm).toBe(BGM_TEMPO_BPM);
    expect(snapshot.transportLoop).toBe(true);
    expect(snapshot.transportLoopEnd).toBe(`${BGM_TOTAL_BARS}:0:0`);
  });

  it("6–9 个有明显差异的段落，总长 28 小节", () => {
    expect(BGM_SECTIONS.length).toBeGreaterThanOrEqual(6);
    expect(BGM_SECTIONS.length).toBeLessThanOrEqual(9);
    expect(BGM_TOTAL_BARS).toBe(28);
  });

  it("每个段落都有和声、低音、pluck、旋律，而且调性不重样", () => {
    const seen = new Set();

    for (const section of BGM_SECTIONS) {
      expect(section.chords.length).toBeGreaterThan(0);
      expect(section.bass.length).toBeGreaterThan(0);
      expect(section.pluck.length).toBeGreaterThan(0);
      expect(section.lead.length).toBeGreaterThan(0);
      expect(section.bell.length).toBeGreaterThan(0);

      // 开头的根音 + 和弦构成决定调性，用它做去重键
      const key = `${section.chords[0][0]}/${section.chords.map((c) => c.join("")).join("|")}`;
      seen.add(key);
    }

    // 7 段应该是 7 种不同的和声走向
    expect(seen.size).toBe(BGM_SECTIONS.length);
  });

  it("pluck 密度随段落变化：不是每段都一个样", () => {
    const densities = new Set(BGM_SECTIONS.map((section) => section.pluck.length));
    expect(densities.size).toBeGreaterThanOrEqual(3);
  });

  it("力度有起伏：各段 gain 不全相同（段落有呼吸而不是一个平台）", () => {
    const gains = new Set(BGM_SECTIONS.map((section) => section.gain));
    expect(gains.size).toBeGreaterThanOrEqual(4);
  });

  it("低音是 soft mallet：每小节最多两个音，不是每拍强击", () => {
    for (const section of BGM_SECTIONS) {
      // 每小节的 bass 音符数（区间用两拍，所以 <=2 就不再是每拍一击）
      expect(section.bass.length).toBeLessThanOrEqual(2);
    }
  });

  it("确实把音符排到了 Transport 上：五层都有声音", async () => {
    const engine = await loadToneBgm();
    engine.ensureToneBgmRuntime();

    const snapshot = engine.getToneBgmRuntimeSnapshot();
    expect(snapshot.scheduledNoteCount).toBeGreaterThan(100);

    // 音符是**排给 Transport**的（不是当场写进 WebAudio 时间线），
    // 所以在 start() 之前它们还不会真的发声。
    // 这样 Transport.cancel() 才清得掉它们 —— 静音要彻底就靠这一点。
    expect(fake.scheduledTransportEvents).toHaveLength(snapshot.scheduledNoteCount);
    expect(fake.scheduled).toHaveLength(0);

    engine.startToneBgm();

    // Transport 一跑，排好的音才逐个被触发。
    expect(fake.scheduled.length).toBe(snapshot.scheduledNoteCount);

    // 每层都排到了音：pad / pluck / lead / bass / bell
    const notes = fake.scheduled.map((entry) => entry.note);
    expect(notes.length).toBe(fake.scheduled.length);
    expect(new Set(notes).size).toBeGreaterThan(3);
  });

  it("没有用到任何鼓点音色：五层都是弦乐/合成垫类", async () => {
    const engine = await loadToneBgm();
    engine.ensureToneBgmRuntime();

    // 音色数量固定为 5（pad/bass/pluck/lead/bell），没有 percussion
    expect(engine.getToneBgmRuntimeSnapshot().instrumentCount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 音量语义：必须和 WAV 降级路径完全一致
// ---------------------------------------------------------------------------
describe("音量", () => {
  it("linear 增益换算成 dB；0 映射到真静音而不是「很轻」", async () => {
    const engine = await loadToneBgm();
    engine.startToneBgm();

    engine.setToneBgmVolume(0.5);
    expect(fake.ramped.at(-1)).toBeCloseTo(20 * Math.log10(0.5), 5);

    // 0 → -Infinity。刻意不走 rampTo：Tone 的 rampTo(-Infinity) 不可靠，
    // 曾经就是它把 stopToneBgm() 打断，导致"点了静音还在响"。
    engine.setToneBgmVolume(0);
    expect(engine.getToneBgmRuntimeSnapshot().busDecibels).toBe(-Infinity);
  });

  it("默认音量语义：masterVolume × musicVolume，和 WAV 路径同义", async () => {
    const engine = await loadToneBgm();
    engine.startToneBgm();

    // 与 audioConfig 的默认值一致：0.72 × 0.42
    const gain = 0.72 * 0.42;
    engine.setToneBgmVolume(gain);
    expect(fake.ramped.at(-1)).toBeCloseTo(20 * Math.log10(gain), 5);
  });
});

// ---------------------------------------------------------------------------
// 3) 解锁之前不播放
// ---------------------------------------------------------------------------
describe("解锁边界", () => {
  it("Tone 不可用时（没有真 AudioContext）ensure 返回 null，不硬造节点", async () => {
    const engine = await loadToneBgm();
    // 换成没有真 AudioContext 的 Tone（模拟无头环境 / 不支持的浏览器）
    engine.__setToneForTests({ ...fake.tone, getContext: () => ({ state: {}, rawContext: {} }) });

    expect(engine.ensureToneBgmRuntime()).toBeNull();
    expect(engine.isToneBgmPlaying()).toBe(false);
    expect(fake.counters.synth).toBe(0);
  });

  it("Tone 可用但上下文还 suspended 时，unlock 之前 Transport 不该自己跑", async () => {
    const engine = await loadToneBgm();
    fake.context.state = "suspended";
    fake.context.rawContext.state = "suspended";

    // 仅仅 import / ensure 不等于起播
    engine.ensureToneBgmRuntime();
    expect(fake.counters.transportStart).toBe(0);
    expect(engine.isToneBgmPlaying()).toBe(false);
  });

  it("unlockToneBgmContext 把 suspended 上下文恢复成 running", async () => {
    const engine = await loadToneBgm();
    fake.context.state = "suspended";
    fake.context.rawContext.state = "suspended";

    const ready = await engine.unlockToneBgmContext();

    expect(ready).toBe(true);
    expect(fake.context.resume).toHaveBeenCalled();
    expect(fake.context.state).toBe("running");
  });
});

// ---------------------------------------------------------------------------
// 4) 5) 8) 音量与开关的判定（audioEngine 会拿它做闸门）
// ---------------------------------------------------------------------------
describe("该不该响的判定", () => {
  const base = { masterVolume: 0.72, musicVolume: 0.42, musicEnabled: true };

  it("正常偏好下应该响", async () => {
    const engine = await loadToneBgm();
    expect(engine.shouldToneBgmPlay(base)).toBe(true);
  });

  it("musicEnabled=false：不响", async () => {
    const engine = await loadToneBgm();
    expect(engine.shouldToneBgmPlay({ ...base, musicEnabled: false })).toBe(false);
  });

  it("masterVolume=0（全局静音）：不响", async () => {
    const engine = await loadToneBgm();
    expect(engine.shouldToneBgmPlay({ ...base, masterVolume: 0 })).toBe(false);
  });

  it("musicVolume=0：不响", async () => {
    const engine = await loadToneBgm();
    expect(engine.shouldToneBgmPlay({ ...base, musicVolume: 0 })).toBe(false);
  });

  it("偏好缺失或非法：按不响处理，绝不擅自出声", async () => {
    const engine = await loadToneBgm();
    expect(engine.shouldToneBgmPlay({})).toBe(false);
    expect(engine.shouldToneBgmPlay({ masterVolume: Number.NaN, musicVolume: 0.42 })).toBe(false);
    expect(engine.shouldToneBgmPlay({ masterVolume: 0.72, musicVolume: Number.NaN })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6) 7) 借出 / 归还 / 反复进出 —— 在 toneBgm 这一层的语义
// ---------------------------------------------------------------------------
describe("知识岛借还", () => {
  it("借出 = stop：Transport 真的停了，isToneBgmPlaying() 变 false", async () => {
    const engine = await loadToneBgm();

    engine.startToneBgm();
    expect(engine.isToneBgmPlaying()).toBe(true);

    engine.stopToneBgm();
    expect(engine.isToneBgmPlaying()).toBe(false);
    expect(fake.counters.transportPause).toBe(1);
  });

  it("反复借还 5 次：不重建 runtime、不叠出第二套节点", async () => {
    const engine = await loadToneBgm();

    engine.startToneBgm();
    for (let round = 0; round < 5; round += 1) {
      engine.stopToneBgm();
      engine.startToneBgm();
    }

    const snapshot = engine.getToneBgmRuntimeSnapshot();
    expect(snapshot.buildCount).toBe(1);
    expect(fake.counters.channel).toBe(1);
    expect(fake.counters.synth).toBe(5);
    // start/stop 各自按次数发生，但 build 始终只有一次
    expect(snapshot.startCount).toBe(6);
  });

  it("归还后从同一个 Transport 继续，不会重头新建", async () => {
    const engine = await loadToneBgm();

    engine.startToneBgm();
    engine.stopToneBgm();
    engine.startToneBgm();

    expect(engine.getToneBgmRuntimeSnapshot().buildCount).toBe(1);
    expect(engine.isToneBgmPlaying()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dispose 只给测试用，但也要确认它真的能清干净
// ---------------------------------------------------------------------------
describe("释放", () => {
  it("dispose 之后 runtime 归零，下次能重新建", async () => {
    const engine = await loadToneBgm();

    engine.startToneBgm();
    engine.disposeToneBgm();

    const cleared = engine.getToneBgmRuntimeSnapshot();
    expect(cleared.ready).toBe(false);
    expect(cleared.started).toBe(false);
    expect(cleared.hasTransport).toBe(false);
    expect(cleared.instrumentCount).toBe(0);

    engine.ensureToneBgmRuntime();
    expect(engine.getToneBgmRuntimeSnapshot().ready).toBe(true);
  });

  it("BGM_RHYTHM 是四四拍，节拍换算与段落排程一致", () => {
    expect(BGM_RHYTHM.beatsPerBar).toBe(4);
    expect(BGM_TOTAL_BARS * BGM_RHYTHM.beatsPerBar).toBe(112);
  });
});
