import { AUDIO_ASSETS } from "./audioAssets";

// One decoded recording and one playing source. AudioBufferSourceNode loops
// sample-accurately without an HTML media element's restart at each boundary.
const state = {
  context: null, buffer: null, loading: null, gain: null, source: null,
  offset: 0, startedAt: 0, targetGain: 0, buildCount: 0, startCount: 0
};

export function isRecordedBgmSupported(context) {
  return Boolean(context && typeof context.decodeAudioData === "function" &&
    typeof context.createBufferSource === "function" && typeof fetch === "function");
}

export function prepareRecordedBgm(context) {
  if (state.buffer && state.context === context) return Promise.resolve();
  if (state.loading) return state.loading;
  state.context = context;
  state.loading = (async () => {
    const response = await fetch(AUDIO_ASSETS.music.islandLoop);
    if (!response.ok) throw new Error(`Island music request failed: ${response.status}`);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    if (!buffer.duration) throw new Error("Island music is empty");
    state.buffer = buffer;
    state.gain = context.createGain();
    state.gain.gain.value = 0;
    // Volume already includes master, music preference and scene ducking.
    state.gain.connect(context.destination);
    state.buildCount += 1;
  })().finally(() => { state.loading = null; });
  return state.loading;
}

export function setRecordedBgmVolume(volume, seconds = 0.8) {
  state.targetGain = Math.max(0, Math.min(1, Number(volume) || 0));
  if (!state.gain) return;
  const param = state.gain.gain;
  const now = state.context.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  if (seconds > 0) param.linearRampToValueAtTime(state.targetGain, now + seconds);
  else param.setValueAtTime(state.targetGain, now);
}

export function startRecordedBgm(volume) {
  if (!state.buffer || state.context.state !== "running") return false;
  if (state.source) {
    setRecordedBgmVolume(volume);
    return true;
  }
  const source = state.context.createBufferSource();
  source.buffer = state.buffer;
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = state.buffer.duration;
  source.connect(state.gain);
  state.gain.gain.setValueAtTime(0, state.context.currentTime);
  source.start(0, state.offset % state.buffer.duration);
  state.source = source;
  state.startedAt = state.context.currentTime;
  state.startCount += 1;
  setRecordedBgmVolume(volume, 1.8);
  return true;
}

export function stopRecordedBgm() {
  // Cancel the entrance ramp too: mute/leave must not let it rise again later.
  setRecordedBgmVolume(0, 0);
  if (!state.source) return;
  state.offset = (state.offset + state.context.currentTime - state.startedAt) % state.buffer.duration;
  state.source.stop();
  state.source.disconnect();
  state.source = null;
}

export function getRecordedBgmSnapshot() {
  return {
    ready: Boolean(state.buffer), playing: Boolean(state.source) && state.context?.state === "running",
    buildCount: state.buildCount, startCount: state.startCount,
    asset: AUDIO_ASSETS.music.islandLoop, loop: true, loopEnd: state.buffer?.duration ?? 0,
    targetGain: state.targetGain,
    busDecibels: state.targetGain > 0 ? 20 * Math.log10(state.targetGain) : -Infinity,
    contextState: state.context?.state ?? null, contextIsReal: Boolean(state.context)
  };
}
