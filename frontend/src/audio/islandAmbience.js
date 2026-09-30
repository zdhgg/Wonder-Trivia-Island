// 知识岛页面的「专属环境声」：一条循环海浪 + 偶尔一声海鸥。
//
// 这一层刻意做得很薄：它不是第二个音频引擎，只是"一个循环 + 偶尔一声点缀"：
//   - 不碰 WebAudio 图，不新增任何音频引擎；
//   - 只有知识岛页面在挂载时调用 startIslandAmbience()、卸载时调用 stopIslandAmbience()；
//   - 没有自己的开关、自己的按钮、自己的偏好 —— 上一轮那颗「海岛声音」
//     已经删掉，现在它完全跟随全站的声音状态（见 audioConfig 的
//     isGlobalAudioAudible）。全站只有右上角那一个声音入口。
//
// 四条硬性约束，实现上都必须成立（改这个文件时务必保留）：
//   1) 永不自动播放：这一份文档里还没发生过用户交互之前，startIslandAmbience()
//     只会记住全局偏好，不会出声。判断依据是音频引擎有没有被解锁 ——
//     而解锁只可能由既有的全局音频机制（设置页「启用音频」、或右上角静音按钮
//     的取消静音）触发。这一层绝不自己制造手势，也不自己解锁引擎。
//   2) 每种素材全局只有一个 Audio 实例：ambienceState 里按名字各存一个，
//      重复 start 不会新建第二个元素，所以快速进出页面也不会叠出两层海浪。
//   3) 离开页面必须真的停：海浪 pause 并归零，海鸥的定时器全部清掉、叫声也停。
//   4) 海鸥只是点缀：几十秒才一声，随机间隔，任意时刻最多一声，
//      不会自己跟自己叠成一串。
//
// 另一条由上层保证、这里也必须配合的约束：全局静音优先。
// 音量一律乘在 masterVolume 上，总音量归零或两个通道都关掉就完全没有声音。
import { AUDIO_ASSETS } from "./audioAssets";
import {
  DEFAULT_AUDIO_PREFERENCES,
  ISLAND_AMBIENCE_VOLUME,
  ISLAND_GULL_CRY_SCHEDULE,
  isGlobalAudioAudible
} from "./audioConfig";
import { isAudioEngineUnlocked } from "./audioEngine";

const WAVES_NAME = "islandWaves";
const GULL_CRY_NAME = "islandGullCry";

const ambienceState = {
  // 按素材名字存实例：海浪一个、海鸥叫声一个，都只创建一次。
  audios: {},
  // 素材加载失败时不再反复重试，避免每次进出页面都打一条失败请求。
  failed: new Set(),
  // 全局声音状态（来自 useAudioStore）。这里只读，不写回。
  settings: {
    masterVolume: DEFAULT_AUDIO_PREFERENCES.masterVolume,
    musicEnabled: DEFAULT_AUDIO_PREFERENCES.musicEnabled,
    sfxEnabled: DEFAULT_AUDIO_PREFERENCES.sfxEnabled
  },
  // 海鸥的调度定时器。任何时刻最多只有一个待触发的。
  gullTimer: 0,
  // 是否已经叫过：决定下一次用「首声延迟」还是「随机间隔」。
  // 进这一页的第一声刻意固定得短一些（先只听一会儿海），之后就交给随机间隔，
  // 所以听不出规律。
  hasPlayedGullCry: false,
  // 定时器句柄也要能被统一清掉，所以登记进来。
  activeTimers: new Set()
};

function clamp01(value, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numericValue));
}

// 每条素材的实际音量：总音量 × 这一层自己的系数。
// 所以设置里的总音量与「全部静音」对它们同样生效。
function resolveAmbienceVolume(name) {
  const masterVolume = clamp01(ambienceState.settings.masterVolume, 0);
  const channelMultiplier = ISLAND_AMBIENCE_VOLUME[name] ?? 1;

  return clamp01(masterVolume * channelMultiplier, 0);
}

// 全站此刻允许出声吗（和右上角那颗静音按钮同一个判定）。
function isAudible() {
  return isGlobalAudioAudible(ambienceState.settings);
}

// 只有一个实例：这里不会为同一份素材 new 第二个 Audio。
function getAmbienceAudio(name, { loop }) {
  if (ambienceState.audios[name] || ambienceState.failed.has(name) || typeof Audio === "undefined") {
    return ambienceState.audios[name] || null;
  }

  const sourceUrl = AUDIO_ASSETS.ambience?.[name];

  if (!sourceUrl) {
    ambienceState.failed.add(name);
    return null;
  }

  const audio = new Audio(sourceUrl);

  audio.loop = loop;
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = resolveAmbienceVolume(name);

  audio.addEventListener("ended", () => {
    // 海鸥叫只有 0.78 秒，播完就彻底安静（顺带把下一声排上）。
    if (name !== WAVES_NAME) {
      scheduleGullCry();
    }
  });

  // 素材打不开就记下来：不会每次进出页面都重试一遍。
  audio.addEventListener("error", () => {
    ambienceState.failed.add(name);
  });

  ambienceState.audios[name] = audio;

  return audio;
}

// 允许播放的条件：全站没静音 + 这一份文档里发生过用户交互 + 素材可用
// + 当前有可听音量。
// 四条缺一不可，所以"进入知识岛就自动出声"这件事在结构上就不可能发生。
function canPlayAmbience() {
  return (
    isAudible() &&
    !ambienceState.failed.has(WAVES_NAME) &&
    isAudioEngineUnlocked() &&
    resolveAmbienceVolume(WAVES_NAME) > 0
  );
}

// 「这一页此刻真的在放声音吗」——直接看海浪那个元素，不看任何自维护的标志。
// 原因很实在：play() 会同步把 paused 翻成 false，但 "play" 事件是异步派发的。
// 如果拿事件驱动的标志当闸门，用户刚点开声音的那一刻它还是 false，
// 于是海鸥会被永远跳过 —— 第一次排程就没有发生，之后再没有第二次。
function isWavesRunning() {
  const waves = ambienceState.audios[WAVES_NAME];

  return Boolean(waves) && !waves.paused;
}

function playWaves() {
  const audio = getAmbienceAudio(WAVES_NAME, { loop: true });

  if (!audio) {
    return false;
  }

  // 已经在响就直接返回：这是"不允许多个实例叠加"之外的第二道保险。
  if (!audio.paused) {
    return true;
  }

  audio.volume = resolveAmbienceVolume(WAVES_NAME);
  audio.play()?.catch?.(() => {});

  return true;
}

// ---------------------------------------------------------------------------
// 海鸥叫：几十秒偶尔一声
// ---------------------------------------------------------------------------
// 定时器统一走 globalThis 而不是 window：浏览器里两者等价，但这样在
// 没有 window 的测试环境里也能被替换成假定时器，调度逻辑才测得准。
function canUseTimers() {
  return typeof globalThis.setTimeout === "function" && typeof globalThis.clearTimeout === "function";
}

function clearTimers() {
  if (canUseTimers()) {
    for (const timer of ambienceState.activeTimers) {
      globalThis.clearTimeout(timer);
    }
  }

  ambienceState.activeTimers.clear();
  ambienceState.gullTimer = 0;
}

function randomDelayMs() {
  const { minDelayMs, maxDelayMs } = ISLAND_GULL_CRY_SCHEDULE;

  return minDelayMs + Math.random() * Math.max(0, maxDelayMs - minDelayMs);
}

function nextGullCryDelayMs() {
  // 第一次走固定的首声延迟（先只听一会儿海，不急着叫）；
  // 之后每一次都是随机间隔，避免"每 N 秒准点叫一声"的机械感。
  // 这个"第一次"是按文档算的：反复进出这一页不会又送回一个 14 秒的首声。
  if (!ambienceState.hasPlayedGullCry) {
    return ISLAND_GULL_CRY_SCHEDULE.firstDelayMs;
  }

  return randomDelayMs();
}

function playGullCry() {
  // 任意时刻最多一声：上一声还没结束就不接着叫。
  const existing = ambienceState.audios[GULL_CRY_NAME];

  if (existing && !existing.paused) {
    return;
  }

  const audio = getAmbienceAudio(GULL_CRY_NAME, { loop: false });

  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.volume = resolveAmbienceVolume(GULL_CRY_NAME);
  ambienceState.hasPlayedGullCry = true;
  audio.play()?.catch?.(() => {});
}

function scheduleGullCry() {
  if (!canUseTimers()) {
    return;
  }

  // 一次只排一声：重复调用不会攒出一串待触发的叫声。
  if (ambienceState.gullTimer) {
    return;
  }

  if (!isWavesRunning() || !canPlayAmbience()) {
    return;
  }

  const timer = globalThis.setTimeout(() => {
    ambienceState.activeTimers.delete(timer);
    ambienceState.gullTimer = 0;

    // 触发时再确认一次：可能中间已经离开页面或被静音了。
    if (isWavesRunning() && canPlayAmbience()) {
      playGullCry();
    }
  }, nextGullCryDelayMs());

  ambienceState.activeTimers.add(timer);
  ambienceState.gullTimer = timer;
}

function stopGullCry() {
  clearTimers();

  const audio = ambienceState.audios[GULL_CRY_NAME];

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

// 测试与排障用的只读探针：海浪此刻是不是在响。
export function isIslandAmbiencePlaying() {
  return isWavesRunning();
}

// 知识岛页面挂载时调用：只在"全站没静音"且"这一份文档里已经发生过用户交互"
// 的前提下起播。什么都没有发生过时这里只是安静地什么都不做。
export function startIslandAmbience() {
  if (!canPlayAmbience()) {
    return false;
  }

  const started = playWaves();

  if (started) {
    // 第一声海鸥不急着来：先只听一会儿海。
    if (!ambienceState.gullTimer) {
      scheduleGullCry();
    }
  }

  return started;
}

// 知识岛页面卸载时调用：真正暂停并归零，同时把海鸥的调度彻底清掉。
export function stopIslandAmbience() {
  const waves = ambienceState.audios[WAVES_NAME];

  if (waves) {
    waves.pause();
    waves.currentTime = 0;
  }

  stopGullCry();
}

// 全局声音状态变化时调用（总音量 / 音乐开关 / 音效开关 / 音频是否已解锁）。
// 这是"右上角那一个按钮控制所有声音"在知识岛这一页的落点：
// 全站静音 → 立刻停；取消静音且已经解锁过 → 立刻按全局状态恢复。
// 这个函数是幂等的，可以随便重复调用。
export function syncIslandAmbiencePreferences(nextPreferences = {}) {
  ambienceState.settings = {
    masterVolume: clamp01(nextPreferences.masterVolume, ambienceState.settings.masterVolume),
    musicEnabled:
      typeof nextPreferences.musicEnabled === "boolean"
        ? nextPreferences.musicEnabled
        : ambienceState.settings.musicEnabled,
    sfxEnabled:
      typeof nextPreferences.sfxEnabled === "boolean"
        ? nextPreferences.sfxEnabled
        : ambienceState.settings.sfxEnabled
  };

  // 总音量变了：正在响的两条都立刻跟着变（包括还没播的海鸥）。
  for (const [name, audio] of Object.entries(ambienceState.audios)) {
    audio.volume = resolveAmbienceVolume(name);
  }

  if (!canPlayAmbience()) {
    // 全站静音 / 还没解锁 / 素材坏了：这一页保持安静，海鸥也不再排程。
    stopIslandAmbience();
    return;
  }

  playWaves();

  if (!ambienceState.gullTimer) {
    scheduleGullCry();
  }
}

// 测试用的只读探针：海鸥调度器此刻有没有挂着待触发的定时器。
// 离页清理干净时它必须是 0。
export function getPendingGullCryCount() {
  return ambienceState.activeTimers.size;
}
