// 知识岛页面的环境声（目前只有一条：轻柔海浪）。
//
// 这一层刻意做得很薄：它不是第二个音频引擎，只是"一个循环 + 一个开关"：
//   - 不碰 WebAudio 图、不碰背景音乐那条路，也不新增任何音频引擎；
//   - 只有知识岛页面在挂载时调用 startIslandAmbience()、卸载时调用 stopIslandAmbience()；
//   - 播放状态由 useAudioStore 里的 islandAmbienceEnabled 决定，记住的地方仍然是
//     既有那个 localStorage key（wonder-trivia-island.audio.preferences），
//     不新增 DB、不新增 API、不新增第二套偏好机制。
//
// 三条硬性约束，实现上都必须成立（改这个文件时务必保留）：
//   1) 永不自动播放：没有发生过用户交互之前，startIslandAmbience() 只会记住意图，不会出声。
//      两种"算交互过"：用户在这个文档里点过这个开关（gestureUnlocked），
//      或者音频引擎已经因为别处的交互被解锁（isAudioEngineUnlocked）。
//      默认偏好也是关闭的。
//   2) 全局只有一个 Audio 实例：ambienceState.audio 只创建一次，
//      重复 start 不会新建第二个元素，所以快速进出页面也不会叠出两层海浪。
//   3) 离开页面必须真的停：stopIslandAmbience() 会 pause 并把进度归零，
//      下次进来按偏好重新开始，而不是继续停在离开时那一秒。
//
// 刻意不做的一件事：这个开关不调用 audioEngine.unlockAudioEngine()。
// 那样会把整台应用的背景音乐也一起叫醒，而这一页只该有一片海的声音。
import { AUDIO_ASSETS } from "./audioAssets";
import { DEFAULT_AUDIO_PREFERENCES, ISLAND_AMBIENCE_VOLUME } from "./audioConfig";
import { isAudioEngineUnlocked } from "./audioEngine";

const AMBIENCE_NAME = "islandWaves";

const ambienceState = {
  audio: null,
  // 用户想不想听（来自偏好，可能是 true 但此刻还没到能播的时候）。
  enabled: Boolean(DEFAULT_AUDIO_PREFERENCES.islandAmbienceEnabled),
  // 当前是否真的在播。控件上的 data-playing 读的就是它，而不是 enabled：
  // 「想听」和「正在响」是两件事，界面不该把没解锁说成已经在放。
  playing: false,
  // 用户在这个文档里点过这个开关。点一下本身就是一次真实的用户手势，
  // 浏览器允许它直接起播，所以这里不需要唤醒整台应用的音频引擎。
  gestureUnlocked: false,
  // 素材加载失败时不再反复重试，避免每次进出页面都打一条失败请求。
  failed: false,
  settings: {
    masterVolume: DEFAULT_AUDIO_PREFERENCES.masterVolume
  },
  listeners: new Set()
};

function clampVolume(value, fallback) {
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

// 环境声的实际音量：总音量 × 这一层自己的低系数。
// 所以设置里的总音量与"全部静音"（它会把总音量归零）对海浪同样生效；
// 但「背景音乐」开关不管海浪 —— 那是另一条声音，岛上这一页有自己的 🔊。
function resolveAmbienceVolume() {
  const masterVolume = clampVolume(ambienceState.settings.masterVolume, 0);
  const channelMultiplier = ISLAND_AMBIENCE_VOLUME[AMBIENCE_NAME] ?? 1;

  return clampVolume(masterVolume * channelMultiplier, 0);
}

// 只有一个实例：这里不会 new 第二个 Audio。
function getAmbienceAudio() {
  if (ambienceState.audio || ambienceState.failed || typeof Audio === "undefined") {
    return ambienceState.audio;
  }

  const sourceUrl = AUDIO_ASSETS.ambience?.[AMBIENCE_NAME];

  if (!sourceUrl) {
    ambienceState.failed = true;
    return null;
  }

  const audio = new Audio(sourceUrl);

  audio.loop = true;
  audio.preload = "auto";
  audio.playsInline = true;
  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("ended", () => setPlaying(false));
  // 素材打不开就记下来：控件会回到"没在响"，也不会每次进来都重试一遍。
  audio.addEventListener("error", () => {
    ambienceState.failed = true;
    setPlaying(false);
  });

  ambienceState.audio = audio;

  return audio;
}

// 允许播放的条件：想听 + 发生过用户交互 + 有素材 + 当前有可听音量。
function canPlayAmbience() {
  return (
    ambienceState.enabled &&
    !ambienceState.failed &&
    (ambienceState.gestureUnlocked || isAudioEngineUnlocked()) &&
    resolveAmbienceVolume() > 0
  );
}

function playAmbience() {
  const audio = getAmbienceAudio();

  if (!audio) {
    return false;
  }

  // 已经在响就直接返回：这是"不允许多个实例叠加"之外的第二道保险。
  if (!audio.paused) {
    return true;
  }

  audio.volume = resolveAmbienceVolume();

  const playPromise = audio.play();

  if (playPromise?.catch) {
    // 浏览器仍然可能拒绝（自动播放策略、标签页在后台……）：安静地退回"没在响"。
    playPromise.catch(() => setPlaying(false));
  }

  return true;
}

function pauseAmbience() {
  if (!ambienceState.audio) {
    return;
  }

  ambienceState.audio.pause();
  // 归零：下次进来从浪头开始，而不是从上次离开的那一秒接上。
  ambienceState.audio.currentTime = 0;
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

  return playAmbience();
}

// 知识岛页面卸载时调用：真正暂停并归零。
export function stopIslandAmbience() {
  pauseAmbience();
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
    masterVolume: clampVolume(nextPreferences.masterVolume, ambienceState.settings.masterVolume)
  };

  if (ambienceState.audio) {
    ambienceState.audio.volume = resolveAmbienceVolume();
  }

  if (!ambienceState.enabled || resolveAmbienceVolume() <= 0) {
    stopIslandAmbience();
    return;
  }

  if (canPlayAmbience()) {
    playAmbience();
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
