// 知识岛的「阶段化声景」：小岛长到哪一步，耳朵里就听得出哪一步。
//
// 与 islandAmbience 的分工：
//   - islandAmbience 管两条素材（海浪循环 + 偶尔一声海鸥），任何阶段都一样；
//   - 本模块管「随阶段与繁荣度变化」的那一层：
//       · 萌芽海岸起，加一层持续的风（程序化噪声，不依赖任何音频文件）；
//       · 探险码头起，远处偶尔传来一声船铃；
//       · 知识灯塔后，海面偶尔响起一声低沉的雾号；
//       · 繁荣度越高，海鸥叫得越勤（间隔收紧，见 islandAmbience 的 gullDelayFactor）。
//
// 这一层继承 islandAmbience 的全部硬约束（改这个文件时务必保留）：
//   1) 永不自动播放：这一份文档里还没发生过用户交互（音频引擎没解锁）时，
//      startIslandSoundscape() 只会记住配置，不会出声；
//   2) 全局静音优先：音量一律乘在 masterVolume 上，总音量归零或两个通道都关就完全没有声音；
//   3) 没有自己的开关、自己的按钮、自己的偏好 —— 完全跟随全站声音状态；
//   4) 离开页面必须真的停：风停掉、铃铛与雾号的定时器全部清掉；
//   5) 点缀音（铃 / 雾号）与海鸥同一套哲学：几十秒才一声、随机间隔、任意时刻最多一声。
//
// 声音全部用 WebAudio 程序化生成：不新增任何音频素材文件，也不需要网络请求。
import { DEFAULT_AUDIO_PREFERENCES, isGlobalAudioAudible } from "./audioConfig";
import { isAudioEngineUnlocked } from "./audioEngine";
import { getKnowledgeIslandStageIndexById } from "../utils/knowledgeIslandGrowth";

// ---------------------------------------------------------------------------
// 纯配置层：阶段 + 繁荣度 → 声景里该有哪些东西。
// 这一层不碰任何音频 API，所以可以单独测。
// ---------------------------------------------------------------------------

// 风的强度按阶段爬升：初见小岛只有海，草长出来以后风里开始有"叶子"的声音。
const WIND_LEVEL_BY_STAGE = Object.freeze([0, 0.5, 0.7, 0.85, 0.9, 1]);

// 海鸥间隔的收紧系数：岛上越热闹，鸥鸣越勤一点（仍然是几十秒量级）。
const GULL_DELAY_FACTOR_BY_PROSPERITY = Object.freeze([1, 0.8, 0.62]);

function clampIndex(value, max) {
  const numeric = Number.parseInt(String(value ?? 0), 10);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }

  return Math.min(numeric, max);
}

// stageId 用 knowledgeIslandGrowth 的阶段索引解释 —— 阶段顺序仍然只有一个来源，
// 本模块不自己维护第二份阶段顺序数组。未知 id（索引 -1）按 0 处理 = 最安静的配置。
export function resolveIslandSoundscape(stageId, prosperityLevel = 0) {
  const stageIndex = clampIndex(getKnowledgeIslandStageIndexById(stageId), WIND_LEVEL_BY_STAGE.length - 1);
  const safeProsperityLevel = clampIndex(prosperityLevel, GULL_DELAY_FACTOR_BY_PROSPERITY.length - 1);

  return {
    // 持续的风：萌芽海岸（第 2 阶段）起才有，强度随阶段爬升。
    windLevel: WIND_LEVEL_BY_STAGE[stageIndex],
    // 船铃：探险码头起，偶尔从码头方向传来一声。
    bellEnabled: stageIndex >= 3,
    // 雾号：知识灯塔后才有，最低沉、最稀疏的一声。
    foghornEnabled: stageIndex >= 5,
    // 鸥鸣间隔系数：交给 islandAmbience 的调度器使用。
    gullDelayFactor: GULL_DELAY_FACTOR_BY_PROSPERITY[safeProsperityLevel]
  };
}

// ---------------------------------------------------------------------------
// 播放层
// ---------------------------------------------------------------------------

// 各声部自己的音量系数（乘在 masterVolume 之上）。
// 风垫在最下面，铃与雾号只是远处的点缀，都不能盖过海浪与 BGM。
const SOUNDSCAPE_VOLUME = Object.freeze({
  wind: 0.1,
  bell: 0.16,
  foghorn: 0.2
});

// 点缀音的调度窗口（毫秒）：随机间隔，避免"每 N 秒准点一声"的机械感。
const BELL_SCHEDULE = Object.freeze({ minDelayMs: 45000, maxDelayMs: 90000 });
const FOGHORN_SCHEDULE = Object.freeze({ minDelayMs: 60000, maxDelayMs: 110000 });

const soundscapeState = {
  context: null,
  masterGain: null,
  // 风：噪声源 + 滤波 + 增益，一套节点只建一次。
  windNodes: null,
  settings: {
    masterVolume: DEFAULT_AUDIO_PREFERENCES.masterVolume,
    musicEnabled: DEFAULT_AUDIO_PREFERENCES.musicEnabled,
    sfxEnabled: DEFAULT_AUDIO_PREFERENCES.sfxEnabled
  },
  scene: resolveIslandSoundscape("", 0),
  running: false,
  bellTimer: 0,
  foghornTimer: 0,
  activeTimers: new Set(),
  // 创建失败（例如老浏览器没有 AudioContext）后不再反复尝试。
  unavailable: false
};

function clamp01(value, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numericValue));
}

function isAudible() {
  return isGlobalAudioAudible(soundscapeState.settings);
}

function masterVolume() {
  return clamp01(soundscapeState.settings.masterVolume, 0);
}

function canPlaySoundscape() {
  return isAudible() && isAudioEngineUnlocked() && masterVolume() > 0 && !soundscapeState.unavailable;
}

function canUseTimers() {
  return typeof globalThis.setTimeout === "function" && typeof globalThis.clearTimeout === "function";
}

function resolveAudioContextConstructor() {
  if (typeof globalThis.AudioContext === "function") {
    return globalThis.AudioContext;
  }

  if (typeof globalThis.webkitAudioContext === "function") {
    return globalThis.webkitAudioContext;
  }

  return null;
}

// 音频图只建一次：一个 master 增益，后面挂所有的风 / 铃 / 雾号。
// 建不出来（没有 AudioContext）就标记 unavailable，之后所有调用安静退化成 no-op。
function ensureAudioGraph() {
  if (soundscapeState.context || soundscapeState.unavailable) {
    return soundscapeState.context;
  }

  const AudioContextConstructor = resolveAudioContextConstructor();

  if (!AudioContextConstructor) {
    soundscapeState.unavailable = true;
    return null;
  }

  try {
    const context = new AudioContextConstructor();
    const masterGain = context.createGain();

    masterGain.gain.value = masterVolume();
    masterGain.connect(context.destination);

    soundscapeState.context = context;
    soundscapeState.masterGain = masterGain;

    return context;
  } catch {
    soundscapeState.unavailable = true;
    return null;
  }
}

// ---------------------------------------------------------------------------
// 风：一段循环噪声 + 低通滤波 + 缓慢呼吸的增益。
// 不用任何音频文件，也听不出循环点（噪声本身就白）。
// ---------------------------------------------------------------------------
function ensureWindNodes() {
  const context = ensureAudioGraph();

  if (!context) {
    return null;
  }

  if (soundscapeState.windNodes) {
    return soundscapeState.windNodes;
  }

  try {
    const noiseLengthSeconds = 2;
    const buffer = context.createBuffer(1, context.sampleRate * noiseLengthSeconds, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 0.4;

    const windGain = context.createGain();
    windGain.gain.value = 0;

    // 呼吸：一个非常慢的正弦 LFO 把风的增益托起又放下，像一阵一阵的海风。
    const lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08;

    const lfoDepth = context.createGain();
    lfoDepth.gain.value = 0.35;

    lfo.connect(lfoDepth);
    lfoDepth.connect(windGain.gain);

    source.connect(filter);
    filter.connect(windGain);
    windGain.connect(soundscapeState.masterGain);

    source.start();
    lfo.start();

    soundscapeState.windNodes = { source, filter, gain: windGain, lfo, lfoDepth };

    return soundscapeState.windNodes;
  } catch {
    soundscapeState.unavailable = true;
    return null;
  }
}

// 风的目标增益：阶段风量 × 自己的系数 × 总音量。LFO 在这个基准上呼吸。
function syncWindLevel() {
  const windNodes = soundscapeState.windNodes;
  const context = soundscapeState.context;

  if (!windNodes || !context) {
    return;
  }

  const targetLevel =
    soundscapeState.running && canPlaySoundscape()
      ? soundscapeState.scene.windLevel * SOUNDSCAPE_VOLUME.wind * masterVolume()
      : 0;

  windNodes.gain.gain.setTargetAtTime(targetLevel, context.currentTime, 1.2);
}

// ---------------------------------------------------------------------------
// 点缀音：船铃 / 雾号。与海鸥同一套调度哲学（随机、稀疏、任意时刻最多一声）。
// ---------------------------------------------------------------------------
function clearTimers() {
  if (canUseTimers()) {
    for (const timer of soundscapeState.activeTimers) {
      globalThis.clearTimeout(timer);
    }
  }

  soundscapeState.activeTimers.clear();
  soundscapeState.bellTimer = 0;
  soundscapeState.foghornTimer = 0;
}

function randomDelayMs({ minDelayMs, maxDelayMs }) {
  return minDelayMs + Math.random() * Math.max(0, maxDelayMs - minDelayMs);
}

// 两个音叠起来的小铃：基音 + 上方五度，指数衰减，像远处敲了一下铜铃。
function playBell() {
  const context = soundscapeState.context;

  if (!context || !soundscapeState.masterGain) {
    return;
  }

  const startAt = context.currentTime + 0.02;
  const volume = SOUNDSCAPE_VOLUME.bell * masterVolume();

  for (const [frequency, ratio] of [[660, 1], [990, 0.5]]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume * ratio, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.6);

    oscillator.connect(gain);
    gain.connect(soundscapeState.masterGain);

    oscillator.start(startAt);
    oscillator.stop(startAt + 1.7);
  }
}

// 雾号：两个低得多的音慢慢托起再放下，是大雾里的灯塔在说话。
function playFoghorn() {
  const context = soundscapeState.context;

  if (!context || !soundscapeState.masterGain) {
    return;
  }

  const startAt = context.currentTime + 0.02;
  const volume = SOUNDSCAPE_VOLUME.foghorn * masterVolume();

  for (const frequency of [110, 146.83]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.35);
    gain.gain.setValueAtTime(volume, startAt + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.6);

    oscillator.connect(gain);
    gain.connect(soundscapeState.masterGain);

    oscillator.start(startAt);
    oscillator.stop(startAt + 1.7);
  }
}

function scheduleAccent(kind) {
  if (!canUseTimers()) {
    return;
  }

  const timerKey = kind === "bell" ? "bellTimer" : "foghornTimer";
  const schedule = kind === "bell" ? BELL_SCHEDULE : FOGHORN_SCHEDULE;
  const play = kind === "bell" ? playBell : playFoghorn;
  const enabled = kind === "bell" ? soundscapeState.scene.bellEnabled : soundscapeState.scene.foghornEnabled;

  // 一次只排一声：重复调用不会攒出一串待触发的声音。
  if (soundscapeState[timerKey]) {
    return;
  }

  if (!enabled || !soundscapeState.running || !canPlaySoundscape()) {
    return;
  }

  const timer = globalThis.setTimeout(() => {
    soundscapeState.activeTimers.delete(timer);
    soundscapeState[timerKey] = 0;

    if (enabled && soundscapeState.running && canPlaySoundscape()) {
      play();
      // 一声放完再排下一声：任意时刻最多一声，不会自己跟自己叠。
      scheduleAccent(kind);
    }
  }, randomDelayMs(schedule));

  soundscapeState.activeTimers.add(timer);
  soundscapeState[timerKey] = timer;
}

function scheduleAccents() {
  scheduleAccent("bell");
  scheduleAccent("foghorn");
}

// ---------------------------------------------------------------------------
// 对外接口（与 islandAmbience 同一套语义：start / stop / syncPreferences / syncScene）
// ---------------------------------------------------------------------------

// 知识岛页面挂载时调用：只在"全站没静音"且"已经发生过用户交互"的前提下起播。
export function startIslandSoundscape() {
  soundscapeState.running = true;

  if (!canPlaySoundscape()) {
    return false;
  }

  if (!ensureWindNodes()) {
    return false;
  }

  // 上下文可能还挂着（浏览器自动播放策略）：能恢复就恢复，恢复不了就安静。
  soundscapeState.context.resume?.()?.catch?.(() => {});
  syncWindLevel();
  scheduleAccents();

  return true;
}

// 知识岛页面卸载时调用：风平掉、点缀音的调度彻底清掉。
export function stopIslandSoundscape() {
  soundscapeState.running = false;
  clearTimers();
  syncWindLevel();
}

// 全局声音状态变化时调用（总音量 / 音乐开关 / 音效开关 / 音频是否已解锁）。幂等。
export function syncIslandSoundscapePreferences(nextPreferences = {}) {
  soundscapeState.settings = {
    masterVolume: clamp01(nextPreferences.masterVolume, soundscapeState.settings.masterVolume),
    musicEnabled:
      typeof nextPreferences.musicEnabled === "boolean"
        ? nextPreferences.musicEnabled
        : soundscapeState.settings.musicEnabled,
    sfxEnabled:
      typeof nextPreferences.sfxEnabled === "boolean"
        ? nextPreferences.sfxEnabled
        : soundscapeState.settings.sfxEnabled
  };

  if (soundscapeState.masterGain && soundscapeState.context) {
    soundscapeState.masterGain.gain.setTargetAtTime(masterVolume(), soundscapeState.context.currentTime, 0.1);
  }

  if (!soundscapeState.running) {
    return;
  }

  if (!canPlaySoundscape()) {
    // 全站静音 / 还没解锁：这一页保持安静，点缀音也不再排程。
    clearTimers();
    syncWindLevel();
    return;
  }

  if (ensureWindNodes()) {
    soundscapeState.context.resume?.()?.catch?.(() => {});
    syncWindLevel();
    scheduleAccents();
  }
}

// 阶段 / 繁荣度变化时调用：风变强变弱、铃与雾号加入或退出。幂等。
export function syncIslandSoundscapeScene(scene = {}) {
  soundscapeState.scene = resolveIslandSoundscape(scene.stageId, scene.prosperityLevel);

  syncWindLevel();

  if (!soundscapeState.running) {
    return;
  }

  // 阶段变化可能让某个点缀音不再属于这一页：清掉旧的，按新配置重排。
  clearTimers();
  scheduleAccents();
}

// 测试用的只读探针：此刻有没有挂着待触发的点缀音定时器。
export function getPendingSoundscapeAccentCount() {
  return soundscapeState.activeTimers.size;
}
