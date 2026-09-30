// ---------------------------------------------------------------------------
// 系统背景音乐（Tone.js 主路径）
// ---------------------------------------------------------------------------
// 这是**唯一**给 BGM 用的 Tone runtime。它刻意做得很窄：
//   - 只管 BGM。答题音效、海浪、海鸥、讲解音频都还在原来的 WebAudio /
//     <audio> 路径上，一个都没有被搬进来。
//   - 全局只有一个实例：ensureToneBgmRuntime() 幂等。反复 sync、反复进出
//     知识岛都不会新建第二套 Tone 对象，也不会开第二个 Transport。
//   - 没有自己的用户偏好。musicEnabled / musicVolume / masterVolume 的语义
//     完全由 audioEngine.js 决定，这里只接收「该不该响」和「该响多响」。
//   - 唯一的手势入口仍然是 audioEngine.js 里既有的全局解锁流程。这个模块
//     绝不自己判断「用户是不是想听」，也绝不自己制造手势。
//
// 音色方向（面向小学生长时间学习）：明亮、轻快、柔和。
//   pad   —— 长包络和弦床，温和的底色
//   bass  —— soft mallet 短音，**不做每拍强击**
//   pluck —— 短促明亮的颗粒，"清脆"的主要来源
//   lead  —— 最轻但最清楚的旋律
//   bell  —— 高八度稀疏点缀，空气感
// 全部经过音乐专用的轻 EQ + 轻压缩 + 淡入淡出。
//
// 循环：7 段共 28 小节，交给 Transport.loop 首尾相接。没有文件边界，
// 所以不存在接缝，也不存在"循环点的空洞"。

import * as ToneImplementation from "tone";
import { BGM_SECTIONS, BGM_TEMPO_BPM, BGM_TOTAL_BARS, BGM_RHYTHM } from "./toneBgmConfig";

/**
 * Tone 实现。默认是真正的 tone 包。
 * 留一个替换口是因为无头环境（vitest）里 Tone 只有 DummyContext，
 * 造不出真正的 AudioParam 节点 —— 测试用假实现验证这里的单例与幂等逻辑，
 * 而真实浏览器里用的始终是真 Tone。
 */
let tone = ToneImplementation;

export function __setToneForTests(fakeTone) {
  tone = fakeTone;
}

export function __resetToneForTests() {
  tone = ToneImplementation;
}

const runtime = {
  ready: false,
  started: false,
  transport: null,
  channel: null,
  output: null,
  instrument: null,
  context: null,
  // 用户当前应有的音乐总线音量（线性）。stopToneBgm() 会把总线压到 -Infinity，
  // 重新起播时要靠它拉回来，否则"停一次之后再也听不到"。
  targetGain: 0,
  // 只读探针：用来在测试里证明「没有叠出第二套 Tone 对象」。
  buildCount: 0,
  startCount: 0,
  scheduledNoteCount: 0
};

/**
 * Tone 此刻是不是真的能出声。
 *
 * 只检查 "tone 包在不在" 是不够的：在没有真实 AudioContext 的环境里
 * （vitest、SSR、旧浏览器）Tone 会装上一个 DummyContext，
 * 后面 new Channel() 会直接抛 "param must be an AudioParam"。
 *
 * 所以这里看的是 Tone 背后的 rawContext 到底是不是一个真 AudioContext：
 * 真浏览器里有 createGain 和 'suspended'/'running' 这样的 state 字符串。
 * 这也是「主路径不可用就退到 WAV 降级」这个判断的依据。
 */
function hasRealAudioContext() {
  const raw = tone?.getContext?.()?.rawContext;

  return Boolean(raw && typeof raw.createGain === "function" && typeof raw.state === "string");
}

/**
 * Tone.Transport 可用吗。
 *
 * 注意 Transport 是一个**实例对象**，不是构造函数，所以不能用
 * `typeof Transport === "function"` 判断（那样永远为 false，会让整条
 * Tone 主路径在浏览器里被静默跳过）。真正的判据是它有没有 start / bpm。
 * 真浏览器里两样都有；只有 DummyContext 的无头环境里才拿不到。
 */
function hasUsableTransport() {
  const transport = tone?.Transport;

  return Boolean(
    transport &&
      typeof transport === "object" &&
      typeof transport.start === "function" &&
      typeof transport.pause === "function" &&
      transport.bpm
  );
}

/**
 * 建立（并复用）唯一的 Tone BGM runtime。
 *
 * 幂等：第一次真正建对象，之后一律返回同一个 runtime。
 * buildCount 只在第一次 +1，这是「单一 BGM 实例和单一 Transport」的可测证据。
 */
export function ensureToneBgmRuntime() {
  if (runtime.ready) {
    return runtime;
  }

  if (!tone || !hasUsableTransport() || !hasRealAudioContext()) {
    return null;
  }

  const { Transport } = tone;

  Transport.bpm.value = BGM_TEMPO_BPM;
  Transport.timeSignature = BGM_RHYTHM.beatsPerBar;

  // 音乐专用总线：轻 EQ（抬高频补中低频）+ 轻压缩（兜住段落峰值）。
  const channel = new tone.Channel({ volume: 0, channelCount: 2 });
  const air = new tone.Filter({ type: "highshelf", frequency: 3200, gain: 3 });
  const warmth = new tone.Filter({ type: "lowshelf", frequency: 320, gain: 1.5 });
  const compressor = new tone.Compressor({
    threshold: -26,
    ratio: 3,
    attack: 0.02,
    release: 0.25
  });
  const output = new tone.Volume(0);

  channel.chain(warmth, air, compressor, output, tone.getDestination());

  // 每一层都用 PolySynth 而不是 Synth，这一点是硬要求：
  // Tone 的 Synth 是**单声部**（Monophonic），前一个音的 release 还没走完时再触发一个音，
  // 底层会直接抛 "Start time must be strictly greater than previous start time"，
  // 而这个异常发生在 ensureToneBgmRuntime() 里，会连带把 unlockAudioEngine() 打断
  // —— 症状是「AudioContext 已经 running，但 BGM 永远不起播」。
  // 这里的 pad 是跨小节长音、pluck/lead 在同一小节内就有多个音，必然重叠，
  // 所以每层都必须给足复音。
  const instrument = {
    pad: new tone.PolySynth(tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.9, decay: 0.4, sustain: 0.7, release: 2.4 },
      volume: -18
    }).connect(channel),
    bass: new tone.PolySynth(tone.Synth, {
      // soft mallet：短、有起音但不尖锐，明确不是低频重击
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.5, sustain: 0.12, release: 0.9 },
      volume: -20
    }).connect(channel),
    pluck: new tone.PolySynth(tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.004, decay: 0.32, sustain: 0.05, release: 0.6 },
      volume: -17
    }).connect(channel),
    lead: new tone.PolySynth(tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.03, decay: 0.25, sustain: 0.55, release: 0.8 },
      volume: -14
    }).connect(channel),
    bell: new tone.PolySynth(tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.006, decay: 0.5, sustain: 0.06, release: 1.6 },
      volume: -22
    }).connect(channel)
  };

  scheduleSections(instrument);

  runtime.transport = Transport;
  runtime.channel = channel;
  runtime.output = output;
  runtime.instrument = instrument;
  runtime.context = tone.getContext?.() ?? null;
  runtime.ready = true;
  runtime.buildCount += 1;

  return runtime;
}

/** 把 7 个段落排到 Transport 上，然后打开 28 小节的循环。 */
function scheduleSections(instrument) {
  const { Transport } = tone;
  const { beatsPerBar, quarterNote } = BGM_RHYTHM;
  let cursor = 0;

  for (const section of BGM_SECTIONS) {
    const { gain, padLength } = section;

    for (let bar = 0; bar < section.bars; bar += 1) {
      const barStart = cursor + bar * beatsPerBar;
      const chord = section.chords[bar % section.chords.length];

      // pad：每小节一个长和弦
      for (const note of chord) {
        scheduleNote(
          instrument.pad,
          note,
          beatsPerBar * quarterNote * padLength,
          `${barStart}:0:0`,
          gain * 0.5
        );
      }

      // bass：软 mallet，每小节 1-2 个短音
      section.bass.forEach((bassNote, index) => {
        scheduleNote(
          instrument.bass,
          bassNote,
          quarterNote * 0.9,
          `${barStart + index * (beatsPerBar / section.bass.length)}:0:0`,
          gain * 0.9
        );
      });

      // pluck：这一段的颗粒密度，随段落变化
      section.pluck.forEach((pluckNote, index) => {
        scheduleNote(
          instrument.pluck,
          pluckNote,
          quarterNote * 0.5,
          `${barStart}:${section.pluckTiming[index % section.pluckTiming.length]}:0`,
          gain * 0.8
        );
      });

      // lead：旋律
      section.lead.forEach((leadNote, index) => {
        scheduleNote(
          instrument.lead,
          leadNote,
          quarterNote * section.leadLengths[index % section.leadLengths.length],
          `${barStart}:${section.leadTiming[index % section.leadTiming.length]}:0`,
          gain
        );
      });

      // bell：每两小节一个高八度点缀
      if (section.bell && bar % 2 === 0) {
        const bellNote = section.bell[(bar / 2) % section.bell.length];
        scheduleNote(instrument.bell, bellNote, quarterNote * 1.2, `${barStart}:2:0`, gain * 0.55);
      }
    }

    cursor += section.bars * beatsPerBar;
  }

  Transport.loop = true;
  Transport.loopStart = 0;
  Transport.loopEnd = `${BGM_TOTAL_BARS}:0:0`;
}

/**
 * 把一个音符挂到 Transport 上，而不是直接调 triggerAttackRelease。
 *
 * 这一条是"全局静音必须真的立刻没声"的关键：
 * 直接 triggerAttackRelease(note, duration, 绝对时间) 会**当场**把这个音写进
 * WebAudio 的时间线，之后 Transport.pause() 完全管不到它 —— 到了那个时间点它照样响，
 * 而且时长在排程那刻就定死了，想撤销也撤销不掉。
 * 于是出现过"点了静音还能听见 pad 的长音和 bell 的尾音"。
 *
 * 交给 Transport.scheduleOnce 排程之后：
 *   - Transport.pause()  不再触发未来的音；
 *   - Transport.cancel()  能把已经排队的每一个音一次性清空；
 *   - 真正在响的音由 releaseAll() 立刻释放。
 * 三件事合起来才是"立刻安静"，而总线 -Infinity 是最后一道兜底。
 */
function scheduleNote(instrument, note, duration, time, velocity) {
  const { Transport } = tone;

  Transport.scheduleOnce((at) => {
    instrument.triggerAttackRelease(note, duration, at, velocity);
  }, time);

  runtime.scheduledNoteCount += 1;
}

/**
 * 起播。幂等：已经在播就直接返回，不会第二次 start。
 * 只有 audioEngine.js 确认「已解锁 + 没静音 + 没被知识岛借走」之后才会调它。
 */
export function startToneBgm() {
  const active = ensureToneBgmRuntime();

  if (!active) {
    return false;
  }

  if (runtime.started) {
    return true;
  }

  // stopToneBgm() 把总线压到了 -Infinity。起播时必须先按"用户当前应有的音量"
  // 把它拉回来，否则停过一次之后，再进知识岛就是全程无声。
  // 先静音极短再淡入：既不会有静默起播的突兀感，也不会有 0.35s 的裸响。
  // 目标值要**先取出来**再用 —— applyToneBusGain 不会改 targetGain，
  // 但顺序写反（先写 0 再读）会把目标值读成 0。
  const target = runtime.targetGain;

  if (target > 0) {
    applyToneBusGain(0, 0);
    applyToneBusGain(target, 0.35);
  }

  runtime.transport.start();
  runtime.started = true;
  runtime.startCount += 1;

  return true;
}

/** 把每一个音色的所有发声声部立刻释放（含尾音）。 */
function releaseAllVoices() {
  if (!runtime.instrument) {
    return;
  }

  for (const instrument of Object.values(runtime.instrument)) {
    if (typeof instrument?.releaseAll === "function") {
      // 传 0 表示"就在此刻释放"，不等 release 曲线自然走完。
      try {
        instrument.releaseAll(0);
      } catch {
        // 个别实现可能不接受时间参数，退回无参形式。
        instrument.releaseAll();
      }
    }
  }
}

/**
 * 停播。幂等：已经停了也安全。
 *
 * "停下来"在这里是四件事，不是一件事 —— 只 pause 是不够的：
 *   1) 总线先掉到 -Infinity：这一步保证"此刻起就已经听不见"，哪怕下面几步
 *      有任何一个没生效（比如 releaseAll 在某些 PolySynth 上是异步的）。
 *   2) Transport.pause()：不再触发未来的音。
 *   3) Transport.cancel()：把已经排进队列的音一次性清空，不给它们到点的机会。
 *   4) releaseAll()：把正在响的声部立刻释放，掐掉 pad 的长音和 bell 的尾音。
 */
export function stopToneBgm() {
  // 顺序不能调换：先断输出，再停调度，最后清发声。
  //
  // 这里用 applyToneBusGain 而不是 setToneBgmVolume：后者的语义是"用户此刻要这个音量"，
  // 它会把 runtime.targetGain 一起改掉。停止只是暂时静音，不是改变用户的选择 ——
  // 抹掉 targetGain 会导致下一次 startToneBgm() 无从恢复，静音一次之后再也不响。
  applyToneBgmGainSafely(0);

  // 每一步都必须各自兜住异常。停播是"必须成功"的操作：
  // 任何一步抛出去，后面的步骤都执行不到，Transport 会继续跑，
  // 用户看到的就是"点了静音还在响"。所以这里宁可吞掉异常也必须把四步走完。
  if (runtime.ready && runtime.transport) {
    try {
      if (typeof runtime.transport.pause === "function") {
        runtime.transport.pause();
      }
    } catch {
      // 继续往下走。
    }

    try {
      if (typeof runtime.transport.cancel === "function") {
        runtime.transport.cancel(0);
      }
    } catch {
      // 继续往下走。
    }
  }

  try {
    releaseAllVoices();
  } catch {
    // 继续往下走。
  }

  runtime.started = false;

  return true;
}

/** 调总线电平，但绝不让异常冒出去打断停播流程。 */
function applyToneBgmGainSafely(linearGain) {
  try {
    applyToneBusGain(linearGain, 0);
  } catch {
    // 忽略：这一层已经兜过一次，这里只是再加一道保险。
  }
}

/**
 * BGM 此刻「应该」在响吗。
 * 与 audioEngine 的判断完全一致：musicEnabled / masterVolume / musicVolume
 * 任何一个归零都不该有声音（要求 7、要求 3 里的 musicVolume=0 场景）。
 */
export function shouldToneBgmPlay(settings = {}) {
  const masterVolume = Number(settings.masterVolume);
  const musicVolume = Number(settings.musicVolume);

  if (!Number.isFinite(masterVolume) || masterVolume <= 0) {
    return false;
  }

  if (!Number.isFinite(musicVolume) || musicVolume <= 0) {
    return false;
  }

  return settings.musicEnabled !== false;
}

/**
 * 只把总线电平落到节点上，不改 runtime.targetGain。
 *
 * 分出来是因为"起播前先压到 -Infinity"这一步不能把目标音量一起抹掉：
 * 一旦先写 0，再读 targetGain 读到的就已经是 0，起播会变成全程无声。
 */
function applyToneBusGain(linearGain, rampSeconds) {
  if (!runtime.ready || !runtime.output) {
    return false;
  }

  const safeGain = Math.max(0, Number(linearGain) || 0);

  // Tone.Volume 用 dB。0 映射到 -Infinity（真静音），
  // 免得"静音"时还剩一层几乎听不见但确实在响的底噪。
  const decibels = safeGain <= 0.0001 ? -Infinity : 20 * Math.log10(safeGain);
  const volume = runtime.output.volume;

  try {
    // 立即路径必须走 value 直接赋值，不能用 setValueAtTime：
    // Tone 的 setValueAtTime 在值为 -Infinity 时会抛
    // "Invalid argument(s) to setValueAtTime"，而这个调用在 stopToneBgm() 的第一行，
    // 一抛异常后面的 pause / cancel / releaseAll / started=false 全都执行不到 ——
    // 结果就是"点了静音，BGM 永远停不下来"。
    // Param.value = -Infinity 是 Tone 官方支持的真静音写法。
    if (!(Number(rampSeconds) > 0) || decibels === -Infinity) {
      volume.value = decibels;
      return true;
    }

    volume.rampTo(decibels, rampSeconds);
  } catch {
    // 兜底：总线怎么调都必须成功，否则"静音"可能退化成"没静音"。
    // 退一步用最小增益，至少不会抛出去把停播流程打断。
    try {
      volume.value = decibels === -Infinity ? -Infinity : decibels;
    } catch {
      // 连兜底都失败就只能放弃这一步，让调用方继续把 Transport 停掉。
    }
  }

  return true;
}

/**
 * 音量。audioEngine 已经算好 masterVolume * musicVolume 送进来，
 * 这里只把它接到音乐总线，并做淡入淡出。
 * 注意这与 WAV 降级路径的 `element.volume` 是同一个数字、同一个含义。
 *
 * rampSeconds 传 0 表示"立刻"，静音时必须这么用：淡到 0 的这 0.35 秒里
 * 声音还在，达不到"点一下静音就立刻安静"。
 */
export function setToneBgmVolume(linearGain, { rampSeconds = 0.35 } = {}) {
  if (!runtime.ready || !runtime.output) {
    return false;
  }

  const safeGain = Math.max(0, Number(linearGain) || 0);

  // 记住"用户想要的音量"，startToneBgm() 要靠它把总线从 -Infinity 拉回来，
  // 否则停过一次之后再进知识岛会是全程无声。
  runtime.targetGain = safeGain;

  return applyToneBusGain(safeGain, rampSeconds);
}

/** 当前是否在播。audioEngine 的 isBackgroundMusicPlaying() 会读它。 */
export function isToneBgmPlaying() {
  return runtime.started && runtime.transport?.state === "started";
}

/** 释放全部 Tone 节点。目前只有测试用；正常生命周期不销毁 runtime。 */
export function disposeToneBgm() {
  stopToneBgm();

  if (runtime.instrument) {
    Object.values(runtime.instrument).forEach((node) => node.dispose?.());
  }

  runtime.channel?.dispose?.();
  runtime.transport?.stop?.();
  runtime.transport = null;
  runtime.channel = null;
  runtime.output = null;
  runtime.instrument = null;
  runtime.ready = false;
  runtime.started = false;
  runtime.buildCount = 0;
  runtime.startCount = 0;
  runtime.scheduledNoteCount = 0;
}

/**
 * 恢复 Tone 自己的 AudioContext。
 *
 * 只由 audioEngine.unlockAudioEngine() 在既有全局解锁流程里调用，
 * 所以 autoplay 仍然只能由那个既有机制触发 —— 这里不判断"用户想不想听"，
 * 也不提供任何绕过解锁的入口。Tone 不可用时返回 false，audioEngine 据此
 * 决定要不要退到 WAV 降级路径。
 */
export async function unlockToneBgmContext() {
  if (!tone || typeof tone.getContext !== "function" || !hasRealAudioContext()) {
    return false;
  }

  try {
    const context = tone.getContext();

    if (context?.state === "suspended") {
      await context.resume();
    }

    return context?.state === "running";
  } catch {
    return false;
  }
}

/** Tone 包本身是否可用（用于自检与排障）。 */
export function isToneBgmSupported() {
  return Boolean(tone && typeof tone.getContext === "function" && hasUsableTransport() && hasRealAudioContext());
}

/** 当前 Tone 版本字符串，测试用来说明"用的确实是 tone 包"。 */
export function getToneBgmVersion() {
  return tone?.version ?? null;
}

/** 读音乐总线此刻实际输出的电平（dB）；runtime 没建好时返回 null。 */
function readBusDecibels() {
  const volume = runtime.output?.volume;

  if (!volume) {
    return null;
  }

  try {
    if (typeof volume.getValueAtTime === "function") {
      const now = Number(runtime.context?.now);

      if (Number.isFinite(now)) {
        return volume.getValueAtTime(now);
      }
    }
  } catch {
    // 读不到就退回 value。
  }

  return volume.value;
}

/** 测试探针：runtime 快照，用来断言单例与幂等。 */
export function getToneBgmRuntimeSnapshot() {
  return {
    ready: runtime.ready,
    started: runtime.started,
    buildCount: runtime.buildCount,
    startCount: runtime.startCount,
    scheduledNoteCount: runtime.scheduledNoteCount,
    instrumentCount: runtime.instrument ? Object.keys(runtime.instrument).length : 0,
    hasTransport: Boolean(runtime.transport),
    transportLoop: runtime.transport?.loop ?? null,
    transportLoopEnd: runtime.transport?.loopEnd ?? null,
    bpm: runtime.transport?.bpm?.value ?? null,
    // 音乐总线当前电平（dB）。静音后必须是 -Infinity，
    // 这就是"点一下静音就立刻听不见"的直接证据。
    // 用 getValueAtTime(now) 而不是 value：Tone 的 Param.value 在 ramp 过程中
    // 并不等于"此刻实际输出的增益"，只有 getValueAtTime 才是。
    busDecibels: readBusDecibels(),
    targetGain: runtime.targetGain,
    // 真实浏览器里用于确认 AudioContext 已被既有手势解锁（unlock 前应为 "suspended"）。
    contextState: tone?.getContext?.()?.rawContext?.state ?? null,
    contextIsReal: hasRealAudioContext()
  };
}
