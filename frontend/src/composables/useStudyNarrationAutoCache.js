import { onBeforeUnmount, watch } from "vue";
import {
  canUsePersistentStudyNarrationCache,
  downloadStudyNarrationPack,
  listStudyNarrationPacks
} from "../audio/studyNarrationPackManager";

const GRADE_KEY_BY_LABEL = Object.freeze({
  "一年级": "grade1",
  "二年级": "grade2",
  "三年级": "grade3",
  "四年级": "grade4",
  "五年级": "grade5",
  "六年级": "grade6"
});

const LESSON_PACK_DELAY_MS = 1200;
const GRADE_PACK_DELAY_MS = 12000;
const IDLE_CALLBACK_TIMEOUT_MS = 2500;

let studyNarrationPacksPromise = null;

function isAbortError(error) {
  return error?.name === "AbortError";
}

function createAbortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

function normalizeGradeLabel(value) {
  return String(value || "").trim();
}

function normalizeLessonId(value) {
  return String(value || "").trim();
}

async function loadStudyNarrationPacks() {
  if (!studyNarrationPacksPromise) {
    studyNarrationPacksPromise = listStudyNarrationPacks().catch((error) => {
      studyNarrationPacksPromise = null;
      throw error;
    });
  }

  return studyNarrationPacksPromise;
}

function resolveLessonPriorityPack(packs, lessonId) {
  const normalizedLessonId = normalizeLessonId(lessonId);

  if (!normalizedLessonId) {
    return null;
  }

  return (
    [...packs]
      .filter(
        (pack) =>
          pack?.kind === "priority" &&
          Number(pack.audioClipCount || 0) > 0 &&
          Array.isArray(pack.lessonIds) &&
          pack.lessonIds.includes(normalizedLessonId)
      )
      .sort((left, right) => {
        const leftIsEditorial = left.key.includes("editorial") ? 1 : 0;
        const rightIsEditorial = right.key.includes("editorial") ? 1 : 0;

        if (leftIsEditorial !== rightIsEditorial) {
          return leftIsEditorial - rightIsEditorial;
        }

        const leftClipCount = Number(left.audioClipCount || 0);
        const rightClipCount = Number(right.audioClipCount || 0);

        if (leftClipCount !== rightClipCount) {
          return leftClipCount - rightClipCount;
        }

        const leftTotalBytes = Number(left.totalBytes || 0);
        const rightTotalBytes = Number(right.totalBytes || 0);

        if (leftTotalBytes !== rightTotalBytes) {
          return leftTotalBytes - rightTotalBytes;
        }

        return String(left.key || "").localeCompare(String(right.key || ""), "zh-CN");
      })[0] || null
  );
}

function resolveGradePack(packs, gradeLabel) {
  const packKey = GRADE_KEY_BY_LABEL[normalizeGradeLabel(gradeLabel)] || "";
  return packKey ? packs.find((pack) => pack?.kind === "grade" && pack.key === packKey) || null : null;
}

function waitForDelay(delayMs, signal) {
  const normalizedDelayMs = Math.max(0, Number(delayMs) || 0);

  if (!normalizedDelayMs) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, normalizedDelayMs);

    function handleAbort() {
      window.clearTimeout(timeoutId);
      reject(createAbortError());
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function waitForIdle(signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if (typeof window.requestIdleCallback !== "function") {
      const timeoutId = window.setTimeout(() => {
        signal?.removeEventListener("abort", handleAbort);
        resolve();
      }, 0);

      function handleAbort() {
        window.clearTimeout(timeoutId);
        reject(createAbortError());
      }

      signal?.addEventListener("abort", handleAbort, { once: true });
      return;
    }

    const idleId = window.requestIdleCallback(
      () => {
        signal?.removeEventListener("abort", handleAbort);
        resolve();
      },
      { timeout: IDLE_CALLBACK_TIMEOUT_MS }
    );

    function handleAbort() {
      window.cancelIdleCallback(idleId);
      reject(createAbortError());
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function waitForAutoCacheTurn(delayMs, signal) {
  await waitForDelay(delayMs, signal);
  await waitForIdle(signal);
}

export function useStudyNarrationAutoCache(selectedGradeRef, selectedLessonIdRef) {
  let activeFlowController = null;

  function stopAutoCacheFlow() {
    if (!activeFlowController) {
      return;
    }

    activeFlowController.abort();
    activeFlowController = null;
  }

  async function runAutoCacheFlow({ gradeLabel, lessonId, signal }) {
    const startedAt = Date.now();
    const packs = await loadStudyNarrationPacks();
    const lessonPack = resolveLessonPriorityPack(packs, lessonId);
    const gradePack = resolveGradePack(packs, gradeLabel);

    if (!lessonPack && !gradePack) {
      return;
    }

    if (lessonPack) {
      await waitForAutoCacheTurn(LESSON_PACK_DELAY_MS, signal);
      const lessonReport = await downloadStudyNarrationPack(lessonPack.key, {
        concurrency: 2,
        signal
      });

      if (lessonReport.failedCount > 0 || lessonReport.unsupportedCount > 0) {
        return;
      }
    }

    if (!gradePack) {
      return;
    }

    const remainingDelayMs = Math.max(0, GRADE_PACK_DELAY_MS - (Date.now() - startedAt));
    await waitForAutoCacheTurn(remainingDelayMs, signal);
    await downloadStudyNarrationPack(gradePack.key, {
      concurrency: 1,
      signal
    });
  }

  watch(
    [selectedGradeRef, selectedLessonIdRef],
    ([nextGradeLabel, nextLessonId]) => {
      stopAutoCacheFlow();

      if (!canUsePersistentStudyNarrationCache()) {
        return;
      }

      const normalizedGradeLabel = normalizeGradeLabel(nextGradeLabel);
      const normalizedLessonId = normalizeLessonId(nextLessonId);

      if (!normalizedGradeLabel && !normalizedLessonId) {
        return;
      }

      activeFlowController = new AbortController();
      const currentController = activeFlowController;

      void runAutoCacheFlow({
        gradeLabel: normalizedGradeLabel,
        lessonId: normalizedLessonId,
        signal: currentController.signal
      }).catch((error) => {
        if (!isAbortError(error)) {
          // Swallow background auto-cache errors so they never interrupt study flow.
        }
      });
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    stopAutoCacheFlow();
  });
}
