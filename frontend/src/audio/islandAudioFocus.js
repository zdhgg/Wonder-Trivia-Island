// Shared mixing and spacing for the island's independent audio layers.
// This module never unlocks audio or starts a player.
const listeners = new Set();
let reading = false;
let rewarding = false;
let rewardTimer = null;
let accentAvailableAt = 0;

export function getIslandAudioFocus() {
  return {
    backgroundGain: rewarding ? 0.28 : reading ? 0.5 : 1,
    accentsAllowed: !reading && !rewarding
  };
}

function notify(extra = {}) {
  for (const listener of listeners) listener({ ...getIslandAudioFocus(), ...extra });
}

export function subscribeIslandAudioFocus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setIslandReading(active) {
  if (reading === Boolean(active)) return;
  reading = Boolean(active);
  notify();
}

export function duckIslandForReward(durationMs = 2200) {
  clearTimeout(rewardTimer);
  rewarding = true;
  notify();
  rewardTimer = setTimeout(() => {
    rewardTimer = null;
    rewarding = false;
    notify();
  }, durationMs);
}

// All automatic accents share an eight-second breathing space. A click can
// respond immediately, but still postpones the next background accent.
export function reserveIslandAccent({ manual = false, durationMs = 1500 } = {}) {
  if (!getIslandAudioFocus().accentsAllowed) return false;
  const now = Date.now();
  if (!manual && now < accentAvailableAt) return false;
  accentAvailableAt = now + durationMs + 8000;
  if (manual) notify({ manualAccent: true });
  return true;
}

export function resetIslandAudioFocus() {
  clearTimeout(rewardTimer);
  rewardTimer = null;
  reading = false;
  rewarding = false;
  accentAvailableAt = 0;
  notify();
}
