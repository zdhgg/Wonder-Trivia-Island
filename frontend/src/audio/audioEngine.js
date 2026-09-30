import { AUDIO_ASSETS, AUDIO_ASSET_VOLUME } from "./audioAssets";
import { AUDIO_CUES, DEFAULT_AUDIO_PREFERENCES, ISLAND_BGM_TRACK } from "./audioConfig";
import {
  disposeToneBgm,
  getToneBgmRuntimeSnapshot,
  isToneBgmPlaying,
  isToneBgmSupported,
  setToneBgmVolume,
  shouldToneBgmPlay,
  startToneBgm,
  stopToneBgm,
  unlockToneBgmContext
} from "./toneBgm";

const SILENCE_LEVEL = 0.0001;
const GAIN_RAMP_SECONDS = 0.08;
const MUSIC_LOOP_LEAD_SECONDS = 0.03;

// BGM 现在有两条路径，而且**互斥、绝不叠播**：
//
//   1) Tone.js 主路径（toneBgm.js）—— 默认。Transport 负责节拍与段落调度，
//      28 小节循环，音色更亮、段落变化更自然，循环点没有文件边界所以没有接缝。
//   2) WAV 降级路径（下面 createBackgroundAudio()）—— 只有在 Tone 不可用
//      时才启用，比如环境里根本没有 Tone，或者 Tone 初始化失败。
//
// 哪一条在响由 `backgroundActiveSource` 记录。任何一次 sync 都先按记录把另一条
// 停掉，所以不可能出现"两份 BGM 同时响"。音量语义两条完全一致：
// 都是 masterVolume * musicVolume（见 getMusicOutputVolume()）。
//
// 除 BGM 以外的声音 —— 答题音效、海浪、海鸥、讲解音频 —— 一律不走 Tone，
// 仍然走原来的 WebAudio / <audio> 路径。
const BGM_SOURCE_NONE = "none";
const BGM_SOURCE_TONE = "tone";
const BGM_SOURCE_WAV = "wav";

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
  // WAV 降级路径真正 play() 过的次数。和 Tone 的 startCount 语义一致：
  // 只在"从静到响"时 +1，用来断言"借出/归还没有顺手多播一次"。
  wavStartCount: 0,
  // 此刻到底是哪条 BGM 路径在响（"none" / "tone" / "wav"）。
  // 这是"绝不叠播"的唯一依据：换路径之前一定先把上一条停掉。
  backgroundActiveSource: BGM_SOURCE_NONE,
  // Tone 路径是否可用。不可用时才允许退到 WAV 降级路径。
  toneBgmAvailable: true,
  // 一旦 Tone 被判定不可用（启动失败 / 强制降级），就不再自动翻回可用。
  toneDisabled: false,
  // 当前是不是正处在知识岛这一页。
  // 持续 BGM 只在这一页存在：普通页面为 false，所以任何普通页面的解锁
  // 都只会解锁引擎，不会顺手起播音乐。这是"首页不放持续音乐"的唯一开关。
  islandBgmActive: false,
  // 旧模型（"全站 BGM + 知识岛借走"）留下的三个字段已整体删除。
  // 它们描述的是"离开时要按进入前的样子还回去"这种需要回忆旧状态的设计，
  // 而现在 BGM 只属于知识岛：离开就是停，进入就是（按当前设置）起播，
  // 唯一的页面状态是 islandBgmActive，幂等天然成立，也就没有可记错的东西。
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

/** 把当前响着的那条 BGM 停掉，并清干净另一条可能残留的状态。 */
function stopActiveBackgroundSource() {
  if (audioState.backgroundActiveSource === BGM_SOURCE_TONE) {
    stopToneBgm();
  }

  if (audioState.backgroundActiveSource === BGM_SOURCE_WAV) {
    const backgroundAudio = audioState.backgroundAudio;

    if (backgroundAudio) {
      backgroundAudio.pause();
    }
  }

  audioState.backgroundActiveSource = BGM_SOURCE_NONE;

  // 停掉之后还必须把 Tone 总线压到 -Infinity。
  // stopToneBgm() 自己也会做，这里再兜一层是因为：上面那个 if 只在
  // "记录中的活跃音源确实是 tone" 时才走到；一旦状态对不上（比如中途被
  // 强制降级过），总线就会停在原来的电平上，静音不彻底。
  setToneBgmVolume(0, { rampSeconds: 0 });
}

/**
 * BGM 此刻允许发声吗。
 *
 * 五条缺一不可，所以"进任意一个页面就自动有持续音乐"在结构上就不可能发生：
 *   1) 当前正在知识岛这一页（islandBgmActive）；
 *   2) 音频引擎已经被既有手势解锁；
 *   3) musicEnabled 为 true；
 *   4) masterVolume > 0（没被全局静音）；
 *   5) musicVolume > 0。
 */
function shouldBackgroundAudioPlay() {
  return (
    audioState.islandBgmActive &&
    audioState.unlocked &&
    shouldToneBgmPlay(audioState.settings)
  );
}

function startToneBackgroundMusic() {
  // 已经在走 Tone 路径了，就不要每次 sync 都重新 start 一次。
  // （真 Tone 的 Transport.start() 本身幂等，但依赖"底层碰巧没副作用"
  //   是不对的：这里在引擎这一层就把"不需要重启"判掉。）
  if (audioState.backgroundActiveSource === BGM_SOURCE_TONE) {
    // 已经在响：只跟着最新的音量走（用户拖滑块就靠这里），
    // 不重新 start，也不碰 Transport。
    setToneBgmVolume(getMusicOutputVolume());
    return true;
  }

  // 先把 WAV 降级路径彻底停掉：两条路径永远互斥。
  if (audioState.backgroundAudio && !audioState.backgroundAudio.paused) {
    audioState.backgroundAudio.pause();
  }

  // WebAudio 兜底旋律也不该和 Tone 一起响。
  stopMusicLoop();

  // 必须先告诉 runtime "用户当前应有的音量"（setToneBgmVolume 会写 runtime.targetGain），
  // startToneBgm() 才知道该从 -Infinity 淡入到多少。顺序反了就会静默起播。
  setToneBgmVolume(getMusicOutputVolume(), { rampSeconds: 0 });

  const started = startToneBgm();

  if (!started) {
    // Tone 起不来（环境不支持 / 初始化失败）：标记不可用，本次就退到 WAV。
    // 同时把 toneDisabled 锁上，免得下一次 sync 又去试一遍、
    // 然后又被 primeBackgroundAudio 悄悄翻回"可用"。
    audioState.toneBgmAvailable = false;
    audioState.toneDisabled = true;
    setToneBgmVolume(0, { rampSeconds: 0 });
    return false;
  }

  audioState.backgroundActiveSource = BGM_SOURCE_TONE;

  return true;
}

function startWavBackgroundMusic() {
  const backgroundAudio = createBackgroundAudio();

  if (!backgroundAudio) {
    syncFallbackMusicLoop();
    return false;
  }

  stopMusicLoop();
  backgroundAudio.volume = getMusicOutputVolume();

  if (!shouldBackgroundAudioPlay()) {
    backgroundAudio.pause();
    return false;
  }

  // 已经在播就不要再 play() 一次：用户拖音量滑块时 sync 会被调很多次，
  // 每次都重播会让 BGM 一顿一顿的。
  if (!backgroundAudio.paused) {
    audioState.backgroundActiveSource = BGM_SOURCE_WAV;
    return true;
  }

  const playPromise = backgroundAudio.play();

  audioState.wavStartCount += 1;

  if (playPromise?.catch) {
    playPromise.catch(() => {
      // WAV 播不起来是最后的情况：交给 WebAudio 兜底旋律。
      audioState.backgroundActiveSource = BGM_SOURCE_NONE;
      syncFallbackMusicLoop();
    });
  }

  audioState.backgroundActiveSource = BGM_SOURCE_WAV;

  return true;
}

function syncBackgroundAudio() {
  if (!shouldBackgroundAudioPlay()) {
    // 该安静：把两条路径都停干净，知识岛借出 / 静音 / 音乐关闭都走这一条。
    stopActiveBackgroundSource();
    stopMusicLoop();

    // 已经存在的 WAV 元素仍然要把音量更新到当前值（静音时就是 0）。
    // 这里只改音量、不新建元素 —— 新建会带上 preload="auto"，
    // 等于凭空多拉一次背景音乐的请求（借出前从没播过就不该有这个请求）。
    if (audioState.backgroundAudio) {
      audioState.backgroundAudio.volume = getMusicOutputVolume();
    }

    return;
  }

  // Tone 是主路径；只有它明确不可用时才退到 WAV 降级。
  if (audioState.toneBgmAvailable && isToneBgmSupported()) {
    if (startToneBackgroundMusic()) {
      return;
    }
  }

  audioState.toneBgmAvailable = false;
  startWavBackgroundMusic();
}


async function primeBackgroundAudio() {
  // Tone 主路径不需要"预热 WAV 元素"：Transport 随时可以起播，
  // 真正需要预热的是 WebAudio 上下文，那条已经由 unlockAudioEngine() 负责。
  // 所以这里只在 Tone 真的不可用、确实要走 WAV 降级时才建 <audio> 元素。
  //
  // 注意判断的是 isToneBgmSupported()（真实 AudioContext）而不是那个缓存标志：
  // 首次解锁时缓存标志还没被 syncBackgroundAudio() 刷过，用它会误判。
  // 但一旦被明确判定为不可用（启动失败、或测试/排障强制降级），
  // 就不再被这里悄悄翻回可用 —— 否则"降级"会自己失效。
  if (!audioState.toneDisabled && isToneBgmSupported()) {
    audioState.toneBgmAvailable = true;
    return false;
  }

  audioState.toneBgmAvailable = false;

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

  // 全部的 BGM 决策都收敛到这一处：起播、静音、恢复都在它内部完成，
  // 所以这里不需要（也不允许）再补一条"顺便更新 Tone 音量"的旁路 ——
  // 那种旁路正是以前"点了静音声音还在"的一类成因。
  syncBackgroundAudio();
}

export async function unlockAudioEngine() {
  const context = createAudioGraph();
  let webAudioReady = false;
  let assetAudioReady = false;
  let toneBgmReady = false;

  if (context) {
    if (context.state === "suspended") {
      await context.resume();
    }

    syncGainNodes(context.currentTime);
    webAudioReady = context.state === "running";
  }

  // Tone 有自己的 AudioContext。它必须跟着同一次用户手势一起恢复，
  // 否则 Transport 在跑但上下文是 suspended，等于一点声音都没有。
  //
  // 注意这里没有"绕过解锁"的后门：这一行只会在既有的全局解锁流程被调用时执行，
  // 也就是说 autoplay 仍然只能由既有的全局音频解锁机制触发。
  toneBgmReady = await unlockToneBgmContext();

  // WAV 降级路径的预热：只有 Tone 不可用时才需要。
  if (hasElementAudioSupport()) {
    assetAudioReady = await primeBackgroundAudio();
  }

  audioState.unlocked = webAudioReady || assetAudioReady || toneBgmReady;
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
// 背景音乐的作用范围：只有知识岛那一页
// ---------------------------------------------------------------------------
//
// 这一节的模型是反过来的，请注意：
// 迁移之前，BGM 是"全站循环 + 进知识岛时借走"；
// 现在按用户的要求改成"**只有知识岛持续播放 BGM**，其他页面一律不放持续音乐"。
// 所以这两个函数的含义是：
//   suspendBackgroundMusic() —— 知识岛进入：把持续音乐的所有权交给知识岛；
//   resumeBackgroundMusic()  —— 知识岛离开：把持续音乐彻底收走。
//
// 换来的是三条结构性保证：
//   1) 普通页面解锁音频只解锁引擎，不会顺手起播 BGM（islandBgmActive 为 false）；
//   2) 离开知识岛一定会停 —— 因为"停"是 resume 的无条件动作，不再依赖
//      「进入前到底在不在播」这种需要回忆的旧状态；
//   3) 反复进出不会叠加 —— 状态只有一个布尔量，幂等天然成立。
//
// 仍然绝不碰用户偏好：musicEnabled / musicVolume 一个字都不改。
// 起不起播一律由下面的 shouldBackgroundAudioPlay() 现算：
//   知识岛在场 + 引擎已解锁 + musicEnabled + 主音量 > 0 + 音乐音量 > 0。
export function suspendBackgroundMusic() {
  audioState.islandBgmActive = true;

  // 幂等：重复进入只是把同一个布尔再置一次，不会新建 runtime / Transport。
  syncBackgroundAudio();

  return audioState.islandBgmActive;
}

export function resumeBackgroundMusic() {
  audioState.islandBgmActive = false;

  // 无条件走一次 sync：它会把 Tone 停掉并把音乐总线压到 -Infinity，
  // 这一步就是"离开知识岛后声音彻底消失"的保证。
  syncBackgroundAudio();

  return false;
}

// 测试与界面用的只读探针：背景音乐此刻是不是真的在响。
// 两条路径都要看：Tone 主路径在响就返回 true，WAV 降级路径在响也返回 true。
export function isBackgroundMusicPlaying() {
  if (isToneBgmPlaying()) {
    return true;
  }

  const backgroundAudio = audioState.backgroundAudio;

  return Boolean(backgroundAudio) && !backgroundAudio.paused;
}

/**
 * 背景音乐此刻是不是处于「被抑制」状态 —— 也就是"明明该有音乐，但现在不该响"。
 *
 * 语义随页面范围一起改了：持续 BGM 只属于知识岛，所以
 *   - 任何普通页面（首页、答题、设置…）恒为 true：BGM 在这些页面上根本不存在；
 *   - 知识岛 + 引擎已解锁 + 有可听音量 → false；
 *   - 知识岛上被静音 / 音乐关掉 / 还没解锁 → true。
 *
 * 名字和签名都是既有公共接口，调用方（KnowledgeIslandView / E2E）不用改。
 */
export function isBackgroundMusicSuppressed() {
  return !shouldBackgroundAudioPlay();
}

// ---------------------------------------------------------------------------
// 以下是排障 / 测试用的只读探针。都不改变任何播放行为。
// ---------------------------------------------------------------------------

/** 此刻是哪条 BGM 路径在响："none" / "tone" / "wav"。 */
export function getActiveBackgroundSource() {
  return audioState.backgroundActiveSource;
}

/** Tone 主路径是否可用。false 时才会退到 WAV 降级路径。 */
export function isToneBackgroundMusicAvailable() {
  return audioState.toneBgmAvailable;
}

/**
 * BGM 一共建过几个实例。
 *
 * 两条路径语义一致：Tone 走 runtime 的单例构建计数，WAV 走 <audio> 元素是否已建。
 * 「反复进出知识岛不重复创建」这条性质就是拿它断言的。
 *
 * 之所以在这里透传、而不是让外部直接读 toneBgm.js：打包器 / dev server 下
 * 同一个源文件可能以不同 URL 被 import 成多个模块实例，外部单独 import
 * toneBgm.js 拿到的未必是引擎正在用的那一个，计数会永远是 0 —— 那种"假通过"
 * 比失败更糟。引擎自己的引用一定是真的。
 */
export function getBackgroundMusicBuildCount() {
  if (audioState.backgroundActiveSource === BGM_SOURCE_WAV || !isToneBgmSupported()) {
    return audioState.backgroundAudio ? 1 : 0;
  }

  return getToneBgmRuntimeSnapshot().buildCount;
}

/**
 * BGM 真正从静到响、起播过几次。
 *
 * 和"实例数"配套：实例只建一次，但"借出→归还"每次都会真的重新起播一次，
 * 所以"知识岛借用不该顺手多播一次"这类断言要看这个计数。
 */
export function getBackgroundMusicStartCount() {
  if (audioState.backgroundActiveSource === BGM_SOURCE_WAV || !isToneBgmSupported()) {
    return audioState.wavStartCount;
  }

  return getToneBgmRuntimeSnapshot().startCount;
}

/**
 * Tone 主路径的结构快照：节拍、循环范围、音色层数、已排程音符数。
 *
 * 同样从引擎自己的引用读，理由同 getBackgroundMusicBuildCount()：
 * 让"单一 Transport""28 小节循环""BPM 落在目标区间"这些断言作用在
 * 真正被播放的那一套 Tone 对象上。
 */
export function getBackgroundMusicStructure() {
  const snapshot = getToneBgmRuntimeSnapshot();

  return {
    ready: snapshot.ready,
    hasTransport: snapshot.hasTransport,
    bpm: snapshot.bpm,
    loop: snapshot.transportLoop,
    loopEnd: snapshot.transportLoopEnd,
    instrumentCount: snapshot.instrumentCount,
    scheduledNoteCount: snapshot.scheduledNoteCount,
    // 音乐总线当前电平：静音后必须是 -Infinity。
    // 这是"点一下静音就立刻听不见"最直接的读数，必须透传出来。
    busDecibels: snapshot.busDecibels,
    targetGain: snapshot.targetGain,
    contextState: snapshot.contextState,
    contextIsReal: snapshot.contextIsReal
  };
}

/**
 * 强制把 Tone 标记为不可用 —— 只给测试和排障用。
 * 用来验证"主路径真的起不来时，WAV 降级路径能接手，而且不会叠播"。
 */
export function __setToneBackgroundMusicUnavailableForTests(unavailable) {
  const shouldDisable = Boolean(unavailable);

  // 参数是「是否不可用」，标志是「是否可用」——两者相反，别写反。
  audioState.toneBgmAvailable = !shouldDisable;
  audioState.toneDisabled = shouldDisable;

  if (!shouldDisable) {
    return;
  }

  // 已经响着的 Tone 立刻停掉，免得和随后的 WAV 叠在一起。
  if (audioState.backgroundActiveSource === BGM_SOURCE_TONE) {
    stopToneBgm();
    audioState.backgroundActiveSource = BGM_SOURCE_NONE;
  }
}

/** 释放 Tone BGM runtime。只给测试用，正常生命周期不销毁。 */
export function __disposeToneBgmForTests() {
  stopToneBgm();
  disposeToneBgm();
  audioState.backgroundActiveSource = BGM_SOURCE_NONE;
}
