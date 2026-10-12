import { DEFAULT_AUDIO_PREFERENCES } from "./audioConfig";
import { isAudioEngineUnlocked } from "./audioEngine";
import { getKnowledgeIslandStageIndexById } from "../utils/knowledgeIslandGrowth";
import { getIslandAudioFocus, reserveIslandAccent, subscribeIslandAudioFocus } from "./islandAudioFocus";

const WIND_LEVEL_BY_STAGE = [0, 0.5, 0.7, 0.85, 0.9, 1];

export function resolveIslandSoundscape(stageId, prosperityLevel = 0) {
  const stage = Math.max(0, getKnowledgeIslandStageIndexById(stageId));
  return {
    windLevel: WIND_LEVEL_BY_STAGE[stage] ?? 0,
    bellEnabled: stage >= 3,
    foghornEnabled: stage >= 5,
    // A richer island gets more varied calls, without shortening the quiet gaps.
    gullVariationCount: Number(prosperityLevel) > 0 ? 3 : 2
  };
}

const VOLUME = { wind: 0.1, bell: 0.10, foghorn: 0.12 };
const SCHEDULES = {
  bell: { min: 60000, max: 110000 },
  foghorn: { min: 85000, max: 140000 }
};
const state = {
  context: null, master: null, wind: null, unavailable: false, running: false,
  settings: { ...DEFAULT_AUDIO_PREFERENCES },
  scene: resolveIslandSoundscape("", 0),
  timers: new Map(), accents: new Set()
};

function canPlay() {
  return state.running && !state.unavailable && isAudioEngineUnlocked() &&
    (typeof document === "undefined" || !document.hidden) &&
    state.settings.sfxEnabled && state.settings.masterVolume > 0 && state.settings.sfxVolume > 0;
}

function setGain(param, value, seconds = 0.6) {
  const now = state.context.currentTime;
  param.cancelScheduledValues(now);
  if (seconds > 0) param.setTargetAtTime(value, now, seconds / 3);
  else param.setValueAtTime(value, now);
}

function ensureGraph() {
  if (state.context) return true;
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context || state.unavailable) return false;
  try {
    state.context = new Context();
    state.master = state.context.createGain();
    state.master.gain.value = 0;
    state.master.connect(state.context.destination);
    return true;
  } catch {
    state.unavailable = true;
    return false;
  }
}

function stopWind() {
  if (!state.wind) return;
  const { source, filter, gain, lfo, depth } = state.wind;
  source.stop();
  lfo.stop();
  for (const node of [source, filter, gain, lfo, depth]) node.disconnect();
  state.wind = null;
}

function syncWind() {
  if (!canPlay() || state.scene.windLevel <= 0) {
    stopWind();
    return;
  }
  const context = state.context;
  if (!state.wind) {
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 0.4;
    const gain = context.createGain();
    gain.gain.value = 0;
    const lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.067;
    const depth = context.createGain();
    depth.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(state.master);
    lfo.connect(depth);
    depth.connect(gain.gain);
    source.start();
    lfo.start();
    state.wind = { source, filter, gain, lfo, depth };
  }
  const level = state.scene.windLevel * VOLUME.wind * getIslandAudioFocus().backgroundGain;
  setGain(state.wind.gain.gain, level, 1.8);
  // Modulation is relative to the wind level, never an independent source of
  // gain. A zero stage or stop also destroys both sources, including the LFO.
  setGain(state.wind.depth.gain, level * 0.22, 1.8);
}

function clearTimers() {
  for (const timer of state.timers.values()) clearTimeout(timer);
  state.timers.clear();
}

function stopAccents() {
  for (const voice of [...state.accents]) {
    voice.oscillator.stop();
    voice.oscillator.disconnect();
    voice.gain.disconnect();
    state.accents.delete(voice);
  }
}

function playAccent(kind) {
  const context = state.context;
  const start = context.currentTime + 0.02;
  const notes = kind === "bell" ? [[660, 1], [990, 0.5]] : [[110, 1], [146.83, 0.7]];
  for (const [frequency, ratio] of notes) {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const gain = context.createGain();
    const peak = VOLUME[kind] * ratio;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + (kind === "bell" ? 0.012 : 0.35));
    if (kind === "foghorn") gain.gain.setValueAtTime(peak, start + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
    oscillator.connect(gain);
    gain.connect(state.master);
    const voice = { oscillator, gain };
    state.accents.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      state.accents.delete(voice);
    };
    oscillator.start(start);
    oscillator.stop(start + 1.7);
  }
}

function scheduleAccent(kind) {
  if (state.timers.has(kind) || !canPlay() || !state.scene[kind + "Enabled"] ||
      !getIslandAudioFocus().accentsAllowed) return;
  const { min, max } = SCHEDULES[kind];
  const timer = setTimeout(() => {
    state.timers.delete(kind);
    if (!canPlay() || !state.scene[kind + "Enabled"] || !getIslandAudioFocus().accentsAllowed) return;
    if (reserveIslandAccent({ durationMs: 1750 })) playAccent(kind);
    scheduleAccent(kind);
  }, min + Math.random() * (max - min));
  state.timers.set(kind, timer);
}

function stopPlayback() {
  clearTimers();
  stopAccents();
  stopWind();
  if (state.master) setGain(state.master.gain, 0, 0);
}

function syncPlayback() {
  if (!canPlay()) {
    stopPlayback();
    return false;
  }
  if (!ensureGraph()) return false;
  state.context.resume?.()?.catch?.(() => {});
  // Master/SFX gain is applied exactly once.
  setGain(state.master.gain, state.settings.masterVolume * state.settings.sfxVolume);
  syncWind();
  scheduleAccent("bell");
  scheduleAccent("foghorn");
  return true;
}

export function startIslandSoundscape() {
  state.running = true;
  return syncPlayback();
}

export function stopIslandSoundscape() {
  state.running = false;
  stopPlayback();
}

export function syncIslandSoundscapePreferences(preferences = {}) {
  for (const key of ["masterVolume", "sfxVolume"]) {
    if (preferences[key] === undefined) continue;
    const value = Number(preferences[key]);
    if (Number.isFinite(value)) state.settings[key] = Math.max(0, Math.min(1, value));
  }
  if (typeof preferences.sfxEnabled === "boolean") state.settings.sfxEnabled = preferences.sfxEnabled;
  syncPlayback();
}

export function syncIslandSoundscapeScene(scene = {}) {
  state.scene = resolveIslandSoundscape(scene.stageId, scene.prosperityLevel);
  clearTimers();
  stopAccents();
  if (state.running) syncPlayback();
}

export function getPendingSoundscapeAccentCount() {
  return state.timers.size;
}

subscribeIslandAudioFocus(focus => {
  if (!state.running) return;
  if (!focus.accentsAllowed || focus.manualAccent) {
    clearTimers();
    stopAccents();
  }
  if (state.context) syncPlayback();
});
