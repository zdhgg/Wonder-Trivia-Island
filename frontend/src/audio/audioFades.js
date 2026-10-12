// Cancellable element fades: stopping/muting a player must cancel its ramp too.
const fades = new WeakMap();

export function cancelAudioFade(audio) {
  clearTimeout(fades.get(audio));
  fades.delete(audio);
}

export function fadeAudioVolume(audio, target, durationMs = 600) {
  cancelAudioFade(audio);
  const volume = Math.max(0, Math.min(1, target));
  if (durationMs <= 0 || audio.volume === volume) {
    audio.volume = volume;
    return;
  }
  const from = audio.volume;
  const startedAt = Date.now();
  function tick() {
    const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
    // Smoothstep avoids a sudden change of slope at either end.
    const eased = progress * progress * (3 - 2 * progress);
    audio.volume = from + (volume - from) * eased;
    if (progress < 1) fades.set(audio, setTimeout(tick, 40));
    else fades.delete(audio);
  }
  fades.set(audio, setTimeout(tick, 40));
}
