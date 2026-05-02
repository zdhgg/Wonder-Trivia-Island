function isProgressShapeValid(progress) {
  return Boolean(progress) && Array.isArray(progress.unlockedStageIds) && typeof progress.bestResults === "object";
}

function isProgressBookShapeValid(progressBook) {
  return Boolean(progressBook) && typeof progressBook.chapters === "object";
}

function assertChallengeProgressPayload(payload) {
  if (isProgressBookShapeValid(payload?.progressBook) || isProgressShapeValid(payload?.progress)) {
    return;
  }

  throw new Error("闯关存档格式不正确。");
}

export async function fetchChallengeProgress(signal) {
  const response = await fetch("/api/challenge-progress", {
    method: "GET",
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `加载闯关存档失败：${response.status}`);
  }

  assertChallengeProgressPayload(payload);
  return payload;
}

export async function saveChallengeProgress({ progressBook, progress, signal } = {}) {
  const payloadBody = progressBook ?? progress;

  if (!payloadBody || typeof payloadBody !== "object") {
    throw new Error("闯关进度不能为空。");
  }

  const response = await fetch("/api/challenge-progress", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      progressBook: progressBook ?? undefined,
      progress: progress ?? undefined
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `保存闯关存档失败：${response.status}`);
  }

  assertChallengeProgressPayload(payload);
  return payload;
}
