// 知识岛页面的「专属环境声」：一条循环海浪 + 偶尔一声海鸥。
//
// 这一层刻意做得很薄：它不是第二个音频引擎，只是"一个循环 + 偶尔一声点缀 + 一个开关"：
//   - 不碰 WebAudio 图，不新增任何音频引擎；
//   - 只有知识岛页面在挂载时调用 startIslandAmbience()、卸载时调用 stopIslandAmbience()；
//   - 播放状态由 useAudioStore 里的 islandAmbienceEnabled 决定，记住的地方仍然是
//     既有那个 localStorage key（wonder-trivia-island.audio.preferences），
//     不新增 DB、不新增 API、不新增第二套偏好机制。
//
// 五条硬性约束，实现上都必须成立（改这个文件时务必保留）：
//   1) 永不自动播放：没有发生过用户交互之前，startIslandAmbience() 只会记住意图，不会出声。
//      两种"算交互过"：用户在这个文档里点过这个开关（gestureUnlocked），
//      或者音频引擎已经因为别处的交互被解锁（isAudioEngineUnlocked）。
//      默认偏好也是关闭的。
//   2) 每种素材全局只有一个 Audio 实例：ambienceState 里按名字各存一个，
//      重复 start 不会新建第二个元素，所以快速进出页面也不会叠出两层海浪。
//   3) 离开页面必须真的停：海浪 pause 并归零，海鸥的定时器全部清掉、叫声也停。
//   4) 海鸥只是点缀：几十秒才一声，随机间隔，任意时刻最多一声，
//      不会自己跟自己叠成一串。
//   5) 全局静音优先：音量一律乘在 masterVolume 上，总音量归零就完全没有声音。
//
// 刻意不做的一件事：这个开关不调用 audioEngine.unlockAudioEngine()。
// 那样会把整台应用的音频一起叫醒，而这一页的声音由页面自己暂停/恢复系统 BGM
// （见 suspendBackgroundMusic / resumeBackgroundMusic），不靠那个入口。
import { AUDIO_ASSETS } from "./audioAssets";
import {
  DEFAULT_AUDIO_PREFERENCES,
  ISLAND_AMBIENCE_VOLUME,
  ISLAND_GULL_CRY_SCHEDULE
} from "./audioConfig";
import { isAudioEngineUnlocked } from "./audioEngine";

const WAVES_NAME = "islandWaves";
const GULL_CRY_NAME = "islandGullCry";

const ambienceState = {
  // 按素材名字存实例：海浪一个、海鸥叫声一个，都只创建一次。
  audios: {},
  // 用户想不想听（来自偏好，可能是 true 但此刻还没到能播的时候）。
  enabled: Boolean(DEFAULT_AUDIO_PREFERENCES.islandAmbienceEnabled),
  // 当前是否真的在播。控件上的 data-playing 读的就是它，而不是 enabled：
  // 「想听」和「正在响」是两件事，界面不该把没解锁说成已经在放。
  playing: false,
  // 用户在这个文档里点过这个开关。点一下本身就是一次真实的用户手势，
  // 浏览器允许它直接起播，所以这里不需要唤醒整台应用的音频引擎。
  gestureUnlocked: false,
  // 素材加载失败时不再反复重试，避免每次进出页面都打一条失败请求。
  failed: new Set(),
  settings: {
    masterVolume: DEFAULT_AUDIO_PREFERENCES.masterVolume
  },
  // 海鸥的调度定时器。任何时刻最多只有一个待触发的。
  gullTimer: 0,
  // 是否已经叫过：决定下一次用「首声延迟」还是「随机间隔」。
  // 进这一页的第一声刻意固定得短一些（先只听一会儿海），之后就交给随机间隔，
  // 所以听不出规律。
  hasPlayedGullCry: false,
  // 定时器句柄也要能被统一清掉，所以登记进来。
  activeTimers: new Set(),
  listeners: new Set()
};

function clamp01(value, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numericValue));
}

function notifyListeners() {
  for (const listener of ambienceState.listeners) {
    listener(isIslandAmbiencePlaying());
  }
}

function setPlaying(nextPlaying) {
  if (ambienceState.playing === nextPlaying) {
    return;
  }

  ambienceState.playing = nextPlaying;
  notifyListeners();
}

// 每条素材的实际音量：总音量 × 这一层自己的系数。
// 所以设置里的总音量与「全部静音」对它们同样生效；
// 但「背景音乐」开关不管它们 —— 系统 BGM 是另一条声音，
// 知识岛进入时会自己把它让出来（见 audioEngine 的 suspendBackgroundMusic）。
function resolveAmbienceVolume(name) {
  const masterVolume = clamp01(ambienceState.settings.masterVolume, 0);
  const channelMultiplier = ISLAND_AMBIENCE_VOLUME[name] ?? 1;

  return clamp01(masterVolume * channelMultiplier, 0);
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

  if (name === WAVES_NAME) {
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
  }

  audio.addEventListener("ended", () => {
    // 海鸥叫只有 0.78 秒，播完就彻底安静（顺带把下一声排上）。
    if (name !== WAVES_NAME) {
      scheduleGullCry();
    }
  });

  // 素材打不开就记下来：控件会回到"没在响"，也不会每次进来都重试一遍。
  audio.addEventListener("error", () => {
    ambienceState.failed.add(name);
    if (name === WAVES_NAME) {
      setPlaying(false);
    }
  });

  ambienceState.audios[name] = audio;

  return audio;
}

// 允许播放的条件：想听 + 发生过用户交互 + 素材可用 + 当前有可听音量。
function canPlayAmbience() {
  return (
    ambienceState.enabled &&
    !ambienceState.failed.has(WAVES_NAME) &&
    (ambienceState.gestureUnlocked || isAudioEngineUnlocked()) &&
    resolveAmbienceVolume(WAVES_NAME) > 0
  );
}

// 「这一页此刻真的在放声音吗」——直接看海浪那个元素，不看 playing 标志。
// 原因很实在：play() 会同步把 paused 翻成 false，但 "play" 事件是异步派发的。
// 如果拿 playing 标志当闸门，用户刚点开开关的那一刻它还是 false，
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
  audio.play()?.catch?.(() => setPlaying(false));

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

export function isIslandAmbiencePlaying() {
  return ambienceState.playing;
}

export function isIslandAmbienceEnabled() {
  return ambienceState.enabled;
}

// 知识岛页面挂载时调用：只在"用户已经在这个会话里交互过"的前提下按偏好恢复声音。
// 没有任何一次交互时，这里什么都不做——所以深链直接打开知识岛也是安静的。
export function startIslandAmbience() {
  if (!canPlayAmbience()) {
    setPlaying(false);
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
  setPlaying(false);
}

// 用户点了这个开关。那一下点击本身就是一次真实的用户手势，
// 浏览器允许它直接起播 —— 所以只放开这一条通道，不去解锁整台应用的音频。
export function unlockIslandAmbience() {
  ambienceState.gestureUnlocked = true;
}

// 偏好（开关 / 总音量）变化时调用。
// 如果此刻还没有任何用户交互，就只记住意图，等真的交互过之后
// 由 startIslandAmbience() 接手——绝不因为偏好是开的就自动出声。
export function syncIslandAmbiencePreferences(nextPreferences = {}) {
  ambienceState.enabled =
    typeof nextPreferences.islandAmbienceEnabled === "boolean"
      ? nextPreferences.islandAmbienceEnabled
      : ambienceState.enabled;
  ambienceState.settings = {
    masterVolume: clamp01(nextPreferences.masterVolume, ambienceState.settings.masterVolume)
  };

  // 总音量变了：正在响的两条都立刻跟着变（包括还没播的海鸥）。
  for (const [name, audio] of Object.entries(ambienceState.audios)) {
    audio.volume = resolveAmbienceVolume(name);
  }

  if (!ambienceState.enabled || resolveAmbienceVolume(WAVES_NAME) <= 0) {
    stopIslandAmbience();
    return;
  }

  if (canPlayAmbience()) {
    playWaves();

    if (!ambienceState.gullTimer) {
      scheduleGullCry();
    }
  }
}

// 让页面上的控件能显示真实的播放状态（而不是只显示"用户想不想听"）。
// 返回取消订阅函数，组件卸载时调用。
export function subscribeIslandAmbience(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  ambienceState.listeners.add(listener);

  return () => {
    ambienceState.listeners.delete(listener);
  };
}

// 测试用的只读探针：海鸥调度器此刻有没有挂着待触发的定时器。
// 离页清理干净时它必须是 0。
export function getPendingGullCryCount() {
  return ambienceState.activeTimers.size;
}
