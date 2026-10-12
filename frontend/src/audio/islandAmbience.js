import { AUDIO_ASSETS } from "./audioAssets";
import { DEFAULT_AUDIO_PREFERENCES, ISLAND_AMBIENCE_VOLUME, ISLAND_GULL_CRY_SCHEDULE } from "./audioConfig";
import { isAudioEngineUnlocked } from "./audioEngine";
import { cancelAudioFade, fadeAudioVolume } from "./audioFades";
import { getIslandAudioFocus, reserveIslandAccent, subscribeIslandAudioFocus } from "./islandAudioFocus";

// One wave player and one gull player, regardless of visits or sample variants.
// Page ownership, the user's SFX preferences, and audio unlock are all required.
const state = {
  waves: null, gull: null, failedWaves: false, failedGulls: new Set(),
  settings: { ...DEFAULT_AUDIO_PREFERENCES },
  running: false, gullTimer: null, hasPlayedGull: false,
  lastGullAt: -Infinity, lastVariant: -1, variantCount: 3, manualGull: false,
  wavePlayId: 0, gullPlayId: 0
};

function clamp(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function canPlay() {
  return state.running && typeof Audio !== "undefined" &&
    (typeof document === "undefined" || !document.hidden) &&
    isAudioEngineUnlocked() && state.settings.sfxEnabled &&
    state.settings.masterVolume > 0 && state.settings.sfxVolume > 0;
}

function volume(kind) {
  const mix = kind === "islandWaves" ? getIslandAudioFocus().backgroundGain : 1;
  const level = kind === "islandGullCry" && state.manualGull
    ? ISLAND_AMBIENCE_VOLUME.islandGullResponse : ISLAND_AMBIENCE_VOLUME[kind];
  return clamp(state.settings.masterVolume * state.settings.sfxVolume * level * mix, 0);
}

function clearGullTimer() {
  clearTimeout(state.gullTimer);
  state.gullTimer = null;
}

function stopGull() {
  state.gullPlayId += 1;
  clearGullTimer();
  if (state.gull) {
    state.gull.pause();
    state.gull.currentTime = 0;
  }
}

function stopPlayback() {
  state.wavePlayId += 1;
  stopGull();
  if (state.waves) {
    cancelAudioFade(state.waves);
    state.waves.volume = 0;
    state.waves.pause();
    state.waves.currentTime = 0;
  }
}

function playWaves() {
  if (!canPlay() || state.failedWaves) return false;
  if (!state.waves) {
    const waves = new Audio(AUDIO_ASSETS.ambience.islandWaves);
    waves.loop = true;
    waves.preload = "auto";
    waves.playsInline = true;
    waves.volume = 0;
    waves.addEventListener("error", () => {
      state.failedWaves = true;
      stopPlayback();
    });
    state.waves = waves;
  }
  const waves = state.waves;
  if (waves.paused) {
    const playId = ++state.wavePlayId;
    waves.volume = 0;
    waves.play()?.catch?.(() => {
      if (playId !== state.wavePlayId) return;
      cancelAudioFade(waves);
      waves.pause();
      clearGullTimer();
    });
    fadeAudioVolume(waves, volume("islandWaves"), 2000);
  } else {
    fadeAudioVolume(waves, volume("islandWaves"), 700);
  }
  return true;
}

function randomDelay(first = false) {
  const schedule = ISLAND_GULL_CRY_SCHEDULE;
  const min = first ? schedule.firstMinDelayMs : schedule.minDelayMs;
  const max = first ? schedule.firstMaxDelayMs : schedule.maxDelayMs;
  return min + Math.random() * (max - min);
}

function scheduleGull() {
  if (state.gullTimer !== null || !canPlay() || !isIslandAmbiencePlaying() ||
      !getIslandAudioFocus().accentsAllowed || (state.gull && !state.gull.paused)) return;
  if (chooseAvailableVariants().length === 0) return;
  state.gullTimer = setTimeout(() => {
    state.gullTimer = null;
    if (!playGull(false)) scheduleGull();
  }, randomDelay(!state.hasPlayedGull));
}

function chooseAvailableVariants() {
  return AUDIO_ASSETS.ambience.islandGullCries.map((_, index) => index)
    .filter(index => index < state.variantCount && !state.failedGulls.has(index));
}

function chooseVariant() {
  const available = chooseAvailableVariants();
  const alternatives = available.filter(index => index !== state.lastVariant);
  const pool = alternatives.length ? alternatives : available;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
}

function playGull(manual) {
  if (!canPlay() || !getIslandAudioFocus().accentsAllowed ||
      Date.now() - state.lastGullAt < ISLAND_GULL_CRY_SCHEDULE.clickCooldownMs ||
      (state.gull && !state.gull.paused)) return false;
  const variant = chooseVariant();
  if (variant < 0 || !reserveIslandAccent({ manual, durationMs: 1500 })) return false;

  // A click replaces the old schedule. The next delay starts at the ended event.
  clearGullTimer();
  const url = AUDIO_ASSETS.ambience.islandGullCries[variant];
  if (!state.gull) {
    state.gull = new Audio(url);
    state.gull.loop = false;
    state.gull.preload = "auto";
    state.gull.playsInline = true;
    state.gull.addEventListener("ended", scheduleGull);
    state.gull.addEventListener("error", () => {
      state.failedGulls.add(state.lastVariant);
      state.gull.pause();
      scheduleGull();
    });
  } else if (variant !== state.lastVariant) {
    state.gull.src = url;
  }
  state.lastVariant = variant;
  state.manualGull = manual;
  state.lastGullAt = Date.now();
  state.hasPlayedGull = true;
  state.gull.currentTime = 0;
  state.gull.volume = volume("islandGullCry");
  const playId = ++state.gullPlayId;
  state.gull.play()?.catch?.(() => {
    if (playId !== state.gullPlayId) return;
    state.gull.pause();
    scheduleGull();
  });
  return true;
}

export function playIslandGullCryOnce() {
  return playGull(true);
}

export function startIslandAmbience() {
  state.running = true;
  const started = playWaves();
  if (started) scheduleGull();
  return started;
}

export function stopIslandAmbience() {
  state.running = false;
  state.hasPlayedGull = false;
  stopPlayback();
}

export function syncIslandAmbiencePreferences(preferences = {}) {
  for (const key of ["masterVolume", "sfxVolume"]) {
    if (preferences[key] !== undefined) state.settings[key] = clamp(preferences[key], state.settings[key]);
  }
  if (typeof preferences.sfxEnabled === "boolean") state.settings.sfxEnabled = preferences.sfxEnabled;
  if (!canPlay()) {
    stopPlayback();
    return;
  }
  if (state.gull) state.gull.volume = volume("islandGullCry");
  if (playWaves()) scheduleGull();
}

export function syncIslandAmbienceScene({ gullVariationCount = 3 } = {}) {
  state.variantCount = Math.min(3, Math.max(1, Number(gullVariationCount) || 3));
}

export function isIslandAmbiencePlaying() {
  return state.running && Boolean(state.waves) && !state.waves.paused;
}

export function getPendingGullCryCount() {
  return state.gullTimer === null ? 0 : 1;
}

subscribeIslandAudioFocus(() => {
  if (!state.running) return;
  if (!getIslandAudioFocus().accentsAllowed) stopGull();
  if (canPlay()) {
    if (state.waves && !state.waves.paused) fadeAudioVolume(state.waves, volume("islandWaves"), 700);
    scheduleGull();
  }
});
