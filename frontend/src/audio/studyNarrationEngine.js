let activeAudio = null;
let activeSource = "";

function cleanupIfCurrent(audio) {
  if (activeAudio === audio) {
    activeAudio = null;
    activeSource = "";
  }
}

function classifyPlayFailure(error) {
  if (error?.name === "NotAllowedError") {
    return "play-blocked";
  }

  return "play-failed";
}

export async function playStudyNarration(src, options = {}) {
  const { volume = 1, onEnded, onError, onStarted } = options;

  stopStudyNarration();

  if (!src) {
    return { started: false, reason: "missing-src" };
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = Math.min(1, Math.max(0, Number(volume) || 0));

  audio.addEventListener(
    "ended",
    () => {
      cleanupIfCurrent(audio);
      onEnded?.();
    },
    { once: true }
  );

  audio.addEventListener(
    "error",
    (error) => {
      cleanupIfCurrent(audio);
      onError?.({ reason: "audio-error", error });
    },
    { once: true }
  );

  activeAudio = audio;
  activeSource = src;

  // 开讲时把语音时长报给调用方，供动画时间轴与讲解节奏对齐
  const reportStarted = () => {
    if (activeAudio !== audio) {
      return;
    }

    const durationMs =
      Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration * 1000) : 0;

    onStarted?.({ durationMs });
  };

  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    reportStarted();
  } else {
    audio.addEventListener("loadedmetadata", reportStarted, { once: true });
  }

  try {
    await audio.play();
    return { started: true };
  } catch (error) {
    cleanupIfCurrent(audio);
    const reason = classifyPlayFailure(error);
    onError?.({ reason, error });
    return { started: false, reason, error };
  }
}

export function stopStudyNarration() {
  if (!activeAudio) {
    return;
  }

  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
  activeSource = "";
}

export function hasActiveStudyNarration() {
  return Boolean(activeAudio && activeSource);
}
