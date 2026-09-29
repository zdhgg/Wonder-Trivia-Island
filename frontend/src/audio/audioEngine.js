import { AUDIO_ASSETS, AUDIO_ASSET_VOLUME } from "./audioAssets";
import { AUDIO_CUES, DEFAULT_AUDIO_PREFERENCES, ISLAND_BGM_TRACK } from "./audioConfig";

const SILENCE_LEVEL = 0.0001;
const GAIN_RAMP_SECONDS = 0.08;
const MUSIC_LOOP_LEAD_SECONDS = 0.03;

const audioState = {
  context: null,
  compressor: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  musicLoopTimer: null,
  musicLoopActive: false,
  backgroundAudio: null,
  backgroundAudioPrimed: false,
  // 页面级「临时借用」：知识岛页面进入时会把系统背景音乐让出来。
  // 下面两个字段只描述"借"这件事本身，不碰用户任何偏好：
  //   suppressed   —— 借出期间为 true，syncBackgroundAudio() 会一直保持暂停；
  //   wasPlaying   —— 借出之前背景音乐到底在不在播，离开时按它原样恢复。
  backgroundSuppressed: false,
  backgroundWasPlaying: false,
  activeCueAudios: new Set(),
  settings: { ...DEFAULT_AUDIO_PREFERENCES },
  unlocked: false
};

function clampVolume(value, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numericValue));
}

function hasWebAudioSupport() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.AudioContext || window.webkitAudioContext);
}

function hasElementAudioSupport() {
  return typeof Audio !== "undefined";
}

export function hasAudioSupport() {
  return hasWebAudioSupport() || hasElementAudioSupport();
}

function getAudioContextCtor() {
  if (!hasWebAudioSupport()) {
    return null;
  }

  return window.AudioContext || window.webkitAudioContext;
}

function normalizeSettings(nextSettings = {}) {
  return {
    masterVolume: clampVolume(nextSettings.masterVolume, DEFAULT_AUDIO_PREFERENCES.masterVolume),
    musicVolume: clampVolume(nextSettings.musicVolume, DEFAULT_AUDIO_PREFERENCES.musicVolume),
    sfxVolume: clampVolume(nextSettings.sfxVolume, DEFAULT_AUDIO_PREFERENCES.sfxVolume),
    musicEnabled:
      typeof nextSettings.musicEnabled === "boolean"
        ? nextSettings.musicEnabled
        : DEFAULT_AUDIO_PREFERENCES.musicEnabled,
    sfxEnabled:
      typeof nextSettings.sfxEnabled === "boolean" ? nextSettings.sfxEnabled : DEFAULT_AUDIO_PREFERENCES.sfxEnabled
  };
}

function getMusicOutputVolume() {
  return clampVolume(audioState.settings.masterVolume * audioState.settings.musicVolume, 0);
}

function getCueOutputVolume(cueName) {
  const cueMultiplier = AUDIO_ASSET_VOLUME[cueName] ?? 1;

  return clampVolume(audioState.settings.masterVolume * audioState.settings.sfxVolume * cueMultiplier, 0);
}

function setGainValue(gainNode, nextValue, referenceTime) {
  if (!gainNode) {
    return;
  }

  const safeValue = Math.max(SILENCE_LEVEL, nextValue);

  gainNode.gain.cancelScheduledValues(referenceTime);
  gainNode.gain.setValueAtTime(Math.max(SILENCE_LEVEL, gainNode.gain.value), referenceTime);
  gainNode.gain.linearRampToValueAtTime(safeValue, referenceTime + GAIN_RAMP_SECONDS);
}

function syncGainNodes(referenceTime) {
  if (!audioState.masterGain || !audioState.musicGain || !audioState.sfxGain) {
    return;
  }

  setGainValue(audioState.masterGain, audioState.settings.masterVolume, referenceTime);
  setGainValue(
    audioState.musicGain,
    audioState.settings.musicEnabled ? audioState.settings.musicVolume : 0,
    referenceTime
  );
  setGainValue(audioState.sfxGain, audioState.settings.sfxEnabled ? audioState.settings.sfxVolume : 0, referenceTime);
}

function createAudioGraph() {
  const AudioContextCtor = getAudioContextCtor();

  if (!AudioContextCtor) {
    return null;
  }

  if (audioState.context && audioState.context.state !== "closed") {
    return audioState.context;
  }

  const context = new AudioContextCtor();
  const compressor = context.createDynamicsCompressor();
  const masterGain = context.createGain();
  const musicGain = context.createGain();
  const sfxGain = context.createGain();

  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.18;

  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(compressor);
  compressor.connect(context.destination);

  audioState.context = context;
  audioState.compressor = compressor;
  audioState.masterGain = masterGain;
  audioState.musicGain = musicGain;
  audioState.sfxGain = sfxGain;

  syncGainNodes(context.currentTime);

  return context;
}

function createBackgroundAudio() {
  if (!hasElementAudioSupport()) {
    return null;
  }

  if (!audioState.backgroundAudio) {
    const backgroundAudio = new Audio(AUDIO_ASSETS.music.islandLoop);
    backgroundAudio.loop = true;
    backgroundAudio.preload = "auto";
    backgroundAudio.playsInline = true;
    audioState.backgroundAudio = backgroundAudio;
  }

  return audioState.backgroundAudio;
}

function scheduleSequence(sequence, outputNode, anchorTime) {
  const context = audioState.context;

  if (!context || !outputNode) {
    return;
  }

  for (const note of sequence) {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    const startTime = anchorTime + note.start;
    const attackTime = Math.min(startTime + 0.02, startTime + note.duration * 0.35);
    const endTime = startTime + note.duration;

    oscillator.type = note.type || "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, startTime);

    noteGain.gain.setValueAtTime(SILENCE_LEVEL, startTime);
    noteGain.gain.exponentialRampToValueAtTime(Math.max(SILENCE_LEVEL, note.volume || 0.1), attackTime);
    noteGain.gain.exponentialRampToValueAtTime(SILENCE_LEVEL, endTime);

    oscillator.connect(noteGain);
    noteGain.connect(outputNode);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.04);
  }
}

function stopMusicLoop() {
  if (audioState.musicLoopTimer && typeof window !== "undefined") {
    window.clearTimeout(audioState.musicLoopTimer);
  }

  audioState.musicLoopTimer = null;
  audioState.musicLoopActive = false;
}

function scheduleMusicLoop(delaySeconds = MUSIC_LOOP_LEAD_SECONDS) {
  const context = audioState.context;

  if (
    !context ||
    context.state !== "running" ||
    !audioState.settings.musicEnabled ||
    audioState.settings.masterVolume <= 0 ||
    audioState.settings.musicVolume <= 0
  ) {
    stopMusicLoop();
    return;
  }

  const anchorTime = context.currentTime + delaySeconds;

  for (const layer of ISLAND_BGM_TRACK.layers) {
    scheduleSequence(layer, audioState.musicGain, anchorTime);
  }

  if (typeof window !== "undefined") {
    audioState.musicLoopTimer = window.setTimeout(() => {
      audioState.musicLoopTimer = null;
      scheduleMusicLoop(MUSIC_LOOP_LEAD_SECONDS);
    }, Math.max(800, (ISLAND_BGM_TRACK.loopDuration - MUSIC_LOOP_LEAD_SECONDS) * 1000));
  }
}

function syncFallbackMusicLoop() {
  const context = audioState.context;

  if (
    !context ||
    context.state !== "running" ||
    !audioState.settings.musicEnabled ||
    audioState.settings.masterVolume <= 0 ||
    audioState.settings.musicVolume <= 0
  ) {
    stopMusicLoop();
    return;
  }

  if (audioState.musicLoopActive) {
    return;
  }

  audioState.musicLoopActive = true;
  scheduleMusicLoop();
}

function syncCueAssetVolumes() {
  for (const cueAudio of audioState.activeCueAudios) {
    cueAudio.volume = getCueOutputVolume(cueAudio.dataset.cue || "");
  }
}

function syncBackgroundAudio() {
  const backgroundAudio = createBackgroundAudio();

  if (!backgroundAudio) {
    syncFallbackMusicLoop();
    return;
  }

  stopMusicLoop();
  backgroundAudio.volume = getMusicOutputVolume();

  if (
    audioState.backgroundSuppressed ||
    !audioState.unlocked ||
    !audioState.settings.musicEnabled ||
    audioState.settings.masterVolume <= 0 ||
    audioState.settings.musicVolume <= 0
  ) {
    backgroundAudio.pause();
    return;
  }

  const playPromise = backgroundAudio.play();

  if (playPromise?.catch) {
    playPromise.catch(() => {
      syncFallbackMusicLoop();
    });
  }
}

async function primeBackgroundAudio() {
  const backgroundAudio = createBackgroundAudio();

  if (!backgroundAudio || audioState.backgroundAudioPrimed) {
    return Boolean(backgroundAudio);
  }

  backgroundAudio.volume = 0;
  backgroundAudio.muted = true;

  try {
    await backgroundAudio.play();
    backgroundAudio.pause();
    backgroundAudio.currentTime = 0;
    audioState.backgroundAudioPrimed = true;
    return true;
  } catch {
    return false;
  } finally {
    backgroundAudio.muted = false;
    backgroundAudio.volume = getMusicOutputVolume();
  }
}

function playFallbackCue(cueName) {
  const context = createAudioGraph();
  const sequence = AUDIO_CUES[cueName];

  if (
    !context ||
    !sequence ||
    context.state !== "running" ||
    !audioState.settings.sfxEnabled ||
    audioState.settings.masterVolume <= 0 ||
    audioState.settings.sfxVolume <= 0
  ) {
    return false;
  }

  scheduleSequence(sequence, audioState.sfxGain, context.currentTime + 0.01);

  return true;
}

function playAssetCue(cueName) {
  if (
    !hasElementAudioSupport() ||
    !audioState.unlocked ||
    !audioState.settings.sfxEnabled ||
    audioState.settings.masterVolume <= 0 ||
    audioState.settings.sfxVolume <= 0
  ) {
    return false;
  }

  const cueUrl = AUDIO_ASSETS.cues[cueName];

  if (!cueUrl) {
    return false;
  }

  const cueAudio = new Audio(cueUrl);
  cueAudio.dataset.cue = cueName;
  cueAudio.preload = "auto";
  cueAudio.playsInline = true;
  cueAudio.volume = getCueOutputVolume(cueName);
  audioState.activeCueAudios.add(cueAudio);

  const cleanup = () => {
    audioState.activeCueAudios.delete(cueAudio);
  };

  cueAudio.addEventListener("ended", cleanup, { once: true });
  cueAudio.addEventListener("error", cleanup, { once: true });

  const playPromise = cueAudio.play();

  if (playPromise?.catch) {
    playPromise.catch(() => {
      cleanup();
      playFallbackCue(cueName);
    });
  }

  return true;
}

export function syncAudioSettings(nextSettings) {
  audioState.settings = normalizeSettings({
    ...audioState.settings,
    ...nextSettings
  });

  if (audioState.context) {
    syncGainNodes(audioState.context.currentTime);
  }

  syncCueAssetVolumes();
  syncBackgroundAudio();
}

export async function unlockAudioEngine() {
  const context = createAudioGraph();
  let webAudioReady = false;
  let assetAudioReady = false;

  if (context) {
    if (context.state === "suspended") {
      await context.resume();
    }

    syncGainNodes(context.currentTime);
    webAudioReady = context.state === "running";
  }

  if (hasElementAudioSupport()) {
    assetAudioReady = await primeBackgroundAudio();
  }

  audioState.unlocked = webAudioReady || assetAudioReady;
  syncBackgroundAudio();

  if (!audioState.unlocked && context) {
    syncFallbackMusicLoop();
    audioState.unlocked = context.state === "running";
  }

  return audioState.unlocked;
}

export function playAudioCue(cueName) {
  if (playAssetCue(cueName)) {
    return true;
  }

  return playFallbackCue(cueName);
}

// 这个页面之前有没有发生过真实的用户交互（点过"启用音频"、答过题、点过热点……）。
// 知识岛环境声读它来决定"能不能开始播"：
// 浏览器不允许在用户还没交互时自动出声，所以没解锁之前一律不播。
export function isAudioEngineUnlocked() {
  return audioState.unlocked;
}

// ---------------------------------------------------------------------------
// 系统背景音乐的「临时借用」
// ---------------------------------------------------------------------------
// 知识岛有自己的一整套声音（海浪 + 偶尔一声海鸥）。让系统的循环 BGM 和它一起响
// 会显得繁杂，所以进入知识岛时把 BGM 让出来，离开时原样还回去。
//
// 这里刻意只做「暂停 / 恢复」这一个动作，绝不碰用户的偏好：
//   - 不改 musicEnabled、不改 musicVolume、不写任何持久状态；
//   - 进入前 BGM 本来就没在播（还没解锁、被静音、用户自己关过），
//     离开时就绝不会被擅自打开 —— 这由 backgroundWasPlaying 记住；
//   - 恢复时走正常的 syncBackgroundAudio()，所以全局静音仍然是最高优先级。
// 反复进出不会叠加：suspend 是幂等的 —— 重复调用不会覆盖「进入前在不在播」
// （那会让第二次进入把 true 记成 false，结果离开时 BGM 再也回不来），
// resume 之后状态归零，所以下一次进入会重新记一次当时的状态。
export function suspendBackgroundMusic() {
  const backgroundAudio = audioState.backgroundAudio;

  // 只在第一次借出时记状态。已经借出过的话，音频此刻是我们自己暂停的，
  // 再读一次 !paused 只会得到 false。
  if (!audioState.backgroundSuppressed) {
    // 只看已经存在的那个元素，不去新建：
    // 新建会带上 preload="auto"，等于凭空多拉一次背景音乐的请求。
    audioState.backgroundWasPlaying = Boolean(backgroundAudio) && !backgroundAudio.paused;
  }

  audioState.backgroundSuppressed = true;

  if (backgroundAudio && !backgroundAudio.paused) {
    backgroundAudio.pause();
  }

  return audioState.backgroundWasPlaying;
}

export function resumeBackgroundMusic() {
  const shouldResume = audioState.backgroundWasPlaying;

  audioState.backgroundSuppressed = false;
  audioState.backgroundWasPlaying = false;

  // 进入前没在播 → 现在也不擅自打开。
  if (shouldResume) {
    syncBackgroundAudio();
  }

  return shouldResume;
}

// 测试与界面用的只读探针：背景音乐此刻是不是真的在响。
// 被知识岛借出期间返回 false。
export function isBackgroundMusicPlaying() {
  const backgroundAudio = audioState.backgroundAudio;

  return Boolean(backgroundAudio) && !backgroundAudio.paused;
}

// 背景音乐此刻是不是被知识岛借走了。
export function isBackgroundMusicSuppressed() {
  return audioState.backgroundSuppressed;
}
