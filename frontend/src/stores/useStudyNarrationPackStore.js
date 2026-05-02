import { defineStore } from "pinia";
import {
  canUsePersistentStudyNarrationCache,
  deleteStudyNarrationPack,
  downloadStudyNarrationPack,
  inspectAllStudyNarrationPackDownloadStates,
  inspectStudyNarrationPackDownloadState,
  listStudyNarrationPacks
} from "../audio/studyNarrationPackManager";

function createDefaultPackRuntimeState() {
  return {
    status: "idle",
    requestedCount: 0,
    readyCount: 0,
    cachedCount: 0,
    downloadedCount: 0,
    deletedCount: 0,
    missingCount: 0,
    failedCount: 0,
    unsupportedCount: 0,
    errorMessage: "",
    lastFinishedAt: "",
    requestId: 0
  };
}

function normalizePackList(packs = []) {
  return Array.isArray(packs)
    ? packs
        .filter((pack) => pack && typeof pack === "object" && String(pack.key || "").trim())
        .map((pack) => ({
          key: String(pack.key || "").trim(),
          kind: String(pack.kind || "").trim() || "priority",
          label: String(pack.label || "").trim(),
          description: String(pack.description || "").trim(),
          lessonIds: Array.isArray(pack.lessonIds) ? [...pack.lessonIds] : [],
          assetStems: Array.isArray(pack.assetStems) ? [...pack.assetStems] : [],
          clipCount: Number(pack.clipCount || 0),
          audioClipCount: Number(pack.audioClipCount || 0),
          audioCoveragePercent: Number(pack.audioCoveragePercent || 0),
          totalBytes: Number(pack.totalBytes || 0)
        }))
    : [];
}

function buildPersistentPackRuntimeState(report = {}, requestId = 0, fallbackStatus = "") {
  const requestedCount = Number(report.requestedCount || 0);
  const readyCount = Number(report.readyCount || 0);
  const cachedCount = Number(report.cachedCount || 0);
  const downloadedCount = Number(report.downloadedCount || 0);
  const deletedCount = Number(report.deletedCount || 0);
  const missingCount = Number(report.missingCount || 0);
  const failedCount = Number(report.failedCount || 0);
  const unsupportedCount = Number(report.unsupportedCount || 0);

  let status = fallbackStatus || "downloaded";

  if (!fallbackStatus) {
    if (unsupportedCount > 0) {
      status = "unsupported";
    } else if (failedCount > 0) {
      status = "error";
    } else if (readyCount <= 0) {
      status = "idle";
    } else if (readyCount < requestedCount) {
      status = "partial";
    } else {
      status = "downloaded";
    }
  }

  return {
    status,
    requestedCount,
    readyCount,
    cachedCount,
    downloadedCount,
    deletedCount,
    missingCount,
    failedCount,
    unsupportedCount,
    errorMessage: "",
    lastFinishedAt: new Date().toISOString(),
    requestId
  };
}

export const useStudyNarrationPackStore = defineStore("studyNarrationPacks", {
  state: () => ({
    packs: [],
    hasLoadedIndex: false,
    isLoadingIndex: false,
    loadError: "",
    packRuntimeByKey: {},
    persistentCacheSupported: canUsePersistentStudyNarrationCache()
  }),

  getters: {
    packsByKind: (state) =>
      state.packs.reduce(
        (groupedPacks, pack) => {
          const kind = pack.kind === "grade" ? "grade" : "priority";
          groupedPacks[kind].push(pack);
          return groupedPacks;
        },
        { grade: [], priority: [] }
      ),

    getPackByKey: (state) => (packKey) => state.packs.find((pack) => pack.key === packKey) || null,

    getPackRuntimeState: (state) => (packKey) => state.packRuntimeByKey[packKey] || createDefaultPackRuntimeState()
  },

  actions: {
    async refreshPackRuntimeStates(packKeys = []) {
      if (!this.hasLoadedIndex) {
        return {};
      }

      const targetPacks = packKeys.length
        ? this.packs.filter((pack) => packKeys.includes(pack.key))
        : this.packs;
      const reportsByKey = packKeys.length
        ? Object.fromEntries(
            await Promise.all(
              targetPacks.map(async (pack) => [pack.key, await inspectStudyNarrationPackDownloadState(pack.key)])
            )
          )
        : await inspectAllStudyNarrationPackDownloadStates(targetPacks);

      this.packRuntimeByKey = {
        ...this.packRuntimeByKey,
        ...Object.fromEntries(
          Object.entries(reportsByKey).map(([packKey, report]) => [
            packKey,
            buildPersistentPackRuntimeState(report, this.packRuntimeByKey[packKey]?.requestId || 0)
          ])
        )
      };

      return reportsByKey;
    },

    async hydratePackIndex(force = false) {
      if (this.isLoadingIndex) {
        return this.packs;
      }

      if (this.hasLoadedIndex && !force) {
        return this.packs;
      }

      this.isLoadingIndex = true;
      this.loadError = "";
      this.persistentCacheSupported = canUsePersistentStudyNarrationCache();

      try {
        this.packs = normalizePackList(await listStudyNarrationPacks());
        this.hasLoadedIndex = true;
        await this.refreshPackRuntimeStates();
        return this.packs;
      } catch (error) {
        this.loadError = error instanceof Error ? error.message : "讲堂音频包索引加载失败。";
        throw error;
      } finally {
        this.isLoadingIndex = false;
      }
    },

    async downloadPack(packKey) {
      const normalizedPackKey = String(packKey || "").trim();

      if (!normalizedPackKey) {
        return null;
      }

      if (!this.hasLoadedIndex) {
        await this.hydratePackIndex();
      }

      const targetPack = this.getPackByKey(normalizedPackKey);

      if (!targetPack) {
        return null;
      }

      const requestId = Date.now();
      this.packRuntimeByKey = {
        ...this.packRuntimeByKey,
        [normalizedPackKey]: {
          ...createDefaultPackRuntimeState(),
          status: "downloading",
          requestedCount: targetPack.audioClipCount,
          readyCount: this.getPackRuntimeState(normalizedPackKey).readyCount,
          requestId
        }
      };

      try {
        const report = await downloadStudyNarrationPack(normalizedPackKey);

        if (this.packRuntimeByKey[normalizedPackKey]?.requestId !== requestId) {
          return report;
        }

        this.packRuntimeByKey = {
          ...this.packRuntimeByKey,
          [normalizedPackKey]: buildPersistentPackRuntimeState(report, requestId)
        };

        return report;
      } catch (error) {
        if (this.packRuntimeByKey[normalizedPackKey]?.requestId !== requestId) {
          throw error;
        }

        this.packRuntimeByKey = {
          ...this.packRuntimeByKey,
          [normalizedPackKey]: {
            ...createDefaultPackRuntimeState(),
            status: "error",
            requestedCount: targetPack.audioClipCount,
            errorMessage: error instanceof Error ? error.message : "讲堂音频包下载失败。",
            lastFinishedAt: new Date().toISOString(),
            requestId
          }
        };

        throw error;
      }
    },

    async deletePack(packKey) {
      const normalizedPackKey = String(packKey || "").trim();

      if (!normalizedPackKey) {
        return null;
      }

      if (!this.hasLoadedIndex) {
        await this.hydratePackIndex();
      }

      const targetPack = this.getPackByKey(normalizedPackKey);

      if (!targetPack) {
        return null;
      }

      const requestId = Date.now();
      const currentRuntimeState = this.getPackRuntimeState(normalizedPackKey);
      this.packRuntimeByKey = {
        ...this.packRuntimeByKey,
        [normalizedPackKey]: {
          ...currentRuntimeState,
          status: "deleting",
          requestId
        }
      };

      try {
        const report = await deleteStudyNarrationPack(normalizedPackKey);

        if (this.packRuntimeByKey[normalizedPackKey]?.requestId !== requestId) {
          return report;
        }

        this.packRuntimeByKey = {
          ...this.packRuntimeByKey,
          [normalizedPackKey]: buildPersistentPackRuntimeState(report, requestId)
        };

        return report;
      } catch (error) {
        if (this.packRuntimeByKey[normalizedPackKey]?.requestId !== requestId) {
          throw error;
        }

        this.packRuntimeByKey = {
          ...this.packRuntimeByKey,
          [normalizedPackKey]: {
            ...currentRuntimeState,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "讲堂音频包删除失败。",
            lastFinishedAt: new Date().toISOString(),
            requestId
          }
        };

        throw error;
      }
    }
  }
});
