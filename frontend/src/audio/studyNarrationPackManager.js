import { STUDY_NARRATION_ASSET_INDEX } from "./studyNarrationAssetIndex";

const STUDY_NARRATION_CACHE_PREFIX = "wonder-trivia-island-study-narration";
const studyNarrationRuntimeEntries = new Map();
let studyNarrationPackModulePromise = null;
let studyNarrationPersistentCacheDescriptorPromise = null;

function normalizeAssetStem(assetStem) {
  return String(assetStem ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
}

function normalizePackKey(packKey) {
  return String(packKey ?? "").trim();
}

function buildStudyNarrationPublicUrl(assetRelativePath) {
  const normalizedAssetRelativePath = String(assetRelativePath ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

  if (!normalizedAssetRelativePath) {
    return "";
  }

  const baseUrl = String(import.meta.env.BASE_URL || "/");
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return `${normalizedBaseUrl}${normalizedAssetRelativePath}`;
}

function resolveStudyNarrationAssetRelativePath(assetStem) {
  const normalizedAssetStem = normalizeAssetStem(assetStem);
  return normalizedAssetStem ? STUDY_NARRATION_ASSET_INDEX[normalizedAssetStem] || "" : "";
}

function uniqueAssetStems(assetStems = []) {
  const seen = new Set();
  const normalizedAssetStems = [];

  for (const assetStem of assetStems) {
    const normalizedAssetStem = normalizeAssetStem(assetStem);

    if (!normalizedAssetStem || seen.has(normalizedAssetStem)) {
      continue;
    }

    seen.add(normalizedAssetStem);
    normalizedAssetStems.push(normalizedAssetStem);
  }

  return normalizedAssetStems;
}

function getFetchImplementation() {
  return typeof fetch === "function" ? fetch.bind(globalThis) : null;
}

function getCacheStorageImplementation() {
  return typeof caches !== "undefined" ? caches : null;
}

function canCreateObjectUrl() {
  return typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
}

function createEmptyDownloadReport(overrides = {}) {
  return {
    pack: null,
    requestedCount: 0,
    readyCount: 0,
    cachedCount: 0,
    downloadedCount: 0,
    deletedCount: 0,
    missingCount: 0,
    failedCount: 0,
    unsupportedCount: 0,
    results: [],
    ...overrides
  };
}

function buildPersistentCacheName(cacheVersion) {
  const normalizedCacheVersion = String(cacheVersion || "default")
    .replace(/[^a-z0-9_-]/gi, "-")
    .toLowerCase();

  return `${STUDY_NARRATION_CACHE_PREFIX}-${normalizedCacheVersion}`;
}

async function loadStudyNarrationPackModule() {
  if (!studyNarrationPackModulePromise) {
    studyNarrationPackModulePromise = import("./studyNarrationPackIndex.js").catch((error) => {
      studyNarrationPackModulePromise = null;
      throw error;
    });
  }

  return studyNarrationPackModulePromise;
}

async function loadStudyNarrationPackIndex() {
  const module = await loadStudyNarrationPackModule();
  return module.STUDY_NARRATION_PACK_INDEX || {};
}

async function loadStudyNarrationPackIndexMeta() {
  const module = await loadStudyNarrationPackModule();
  return module.STUDY_NARRATION_PACK_INDEX_META || {};
}

async function ensureStudyNarrationPersistentCacheDescriptor() {
  if (studyNarrationPersistentCacheDescriptorPromise) {
    return studyNarrationPersistentCacheDescriptorPromise;
  }

  studyNarrationPersistentCacheDescriptorPromise = (async () => {
    const cacheStorage = getCacheStorageImplementation();

    if (!cacheStorage) {
      return null;
    }

    const meta = await loadStudyNarrationPackIndexMeta().catch(() => ({}));
    const cacheName = buildPersistentCacheName(meta.cacheVersion);
    const existingCacheNames = await cacheStorage.keys();

    await Promise.all(
      existingCacheNames
        .filter((existingCacheName) => existingCacheName.startsWith(STUDY_NARRATION_CACHE_PREFIX) && existingCacheName !== cacheName)
        .map((staleCacheName) => cacheStorage.delete(staleCacheName))
    );

    return {
      cacheName,
      cache: await cacheStorage.open(cacheName),
      meta
    };
  })().catch((error) => {
    studyNarrationPersistentCacheDescriptorPromise = null;
    throw error;
  });

  return studyNarrationPersistentCacheDescriptorPromise;
}

async function matchStudyNarrationCachedResponseByRelativePath(assetRelativePath) {
  const publicUrl = buildStudyNarrationPublicUrl(assetRelativePath);

  if (!publicUrl) {
    return null;
  }

  const cacheDescriptor = await ensureStudyNarrationPersistentCacheDescriptor();

  if (!cacheDescriptor) {
    return null;
  }

  return cacheDescriptor.cache.match(publicUrl);
}

async function putStudyNarrationCachedResponse(assetRelativePath, response) {
  const publicUrl = buildStudyNarrationPublicUrl(assetRelativePath);

  if (!publicUrl) {
    return false;
  }

  const cacheDescriptor = await ensureStudyNarrationPersistentCacheDescriptor();

  if (!cacheDescriptor) {
    return false;
  }

  await cacheDescriptor.cache.put(publicUrl, response);
  return true;
}

function revokeStudyNarrationRuntimeEntry(entry) {
  if (entry?.controller) {
    entry.controller.abort();
    entry.controller = null;
  }

  if (entry?.objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(entry.objectUrl);
  }

  if (entry) {
    entry.objectUrl = "";
  }
}

async function ensureRuntimeStudyNarrationAssetStem(assetStem, options = {}) {
  const {
    retain = true,
    allowPersistentCache = true,
    persistResponse = false
  } = options;
  const normalizedAssetStem = normalizeAssetStem(assetStem);
  const assetRelativePath = resolveStudyNarrationAssetRelativePath(normalizedAssetStem);

  if (!normalizedAssetStem) {
    return { assetStem: "", status: "invalid", src: "" };
  }

  if (!assetRelativePath) {
    return { assetStem: normalizedAssetStem, status: "missing", src: "" };
  }

  let entry = studyNarrationRuntimeEntries.get(normalizedAssetStem);

  if (entry) {
    if (retain) {
      entry.refCount += 1;
    }

    if (entry.objectUrl) {
      return { assetStem: normalizedAssetStem, status: "ready", src: entry.objectUrl };
    }

    if (entry.promise) {
      await entry.promise;
      return {
        assetStem: normalizedAssetStem,
        status: entry.objectUrl ? "ready" : entry.error ? "failed" : "missing",
        src: entry.objectUrl || ""
      };
    }

    if (entry.error) {
      revokeStudyNarrationRuntimeEntry(entry);
      studyNarrationRuntimeEntries.delete(normalizedAssetStem);
      entry = null;
    }
  }

  if (!entry) {
    const fetchImpl = getFetchImplementation();

    if (!fetchImpl || !canCreateObjectUrl()) {
      return { assetStem: normalizedAssetStem, status: "unsupported", src: "" };
    }

    entry = {
      assetStem: normalizedAssetStem,
      refCount: retain ? 1 : 0,
      objectUrl: "",
      controller: typeof AbortController === "function" ? new AbortController() : null,
      promise: null,
      error: null
    };
    studyNarrationRuntimeEntries.set(normalizedAssetStem, entry);

    entry.promise = (async () => {
      const cachedResponse =
        allowPersistentCache && getCacheStorageImplementation()
          ? await matchStudyNarrationCachedResponseByRelativePath(assetRelativePath)
          : null;

      if (cachedResponse) {
        const cachedBlob = await cachedResponse.blob();

        if (entry.refCount <= 0 || !canCreateObjectUrl()) {
          return "";
        }

        entry.objectUrl = URL.createObjectURL(cachedBlob);
        return entry.objectUrl;
      }

      const publicUrl = buildStudyNarrationPublicUrl(assetRelativePath);
      const requestOptions = entry.controller ? { signal: entry.controller.signal } : undefined;
      const response = await fetchImpl(publicUrl, requestOptions);

      if (!response.ok) {
        throw new Error(`Failed to fetch study narration asset: ${response.status}`);
      }

      if (persistResponse && getCacheStorageImplementation()) {
        await putStudyNarrationCachedResponse(assetRelativePath, response.clone());
      }

      const blob = await response.blob();

      if (entry.refCount <= 0 || !canCreateObjectUrl()) {
        return "";
      }

      entry.objectUrl = URL.createObjectURL(blob);
      return entry.objectUrl;
    })()
      .catch((error) => {
        if (error?.name === "AbortError") {
          return "";
        }

        entry.error = error;
        return "";
      })
      .finally(() => {
        entry.promise = null;
        entry.controller = null;

        if (entry.refCount <= 0 && !entry.objectUrl) {
          studyNarrationRuntimeEntries.delete(normalizedAssetStem);
        }
      });
  }

  if (entry.promise) {
    await entry.promise;
  }

  return {
    assetStem: normalizedAssetStem,
    status: entry.objectUrl ? "ready" : entry.error ? "failed" : "missing",
    src: entry.objectUrl || ""
  };
}

async function mapWithConcurrency(items, concurrency, iteratee, options = {}) {
  const results = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  const signal = options.signal;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        throwIfAborted(signal);
        const currentIndex = cursor;
        cursor += 1;
        results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
      }
    })
  );

  return results;
}

async function buildCachedUrlSet() {
  const cacheDescriptor = await ensureStudyNarrationPersistentCacheDescriptor();

  if (!cacheDescriptor) {
    return null;
  }

  const requests = await cacheDescriptor.cache.keys();
  return new Set(requests.map((request) => String(request.url || "")));
}

function buildPackDownloadReport(pack, cachedUrlSet) {
  const assetStems = uniqueAssetStems(pack?.assetStems || []);
  const requestedCount = assetStems.length;

  if (cachedUrlSet === null) {
    return createEmptyDownloadReport({
      pack,
      requestedCount,
      unsupportedCount: requestedCount,
      results: assetStems.map((assetStem) => ({ assetStem, status: "unsupported" }))
    });
  }

  const results = assetStems.map((assetStem) => {
    const assetRelativePath = resolveStudyNarrationAssetRelativePath(assetStem);
    const publicUrl = buildStudyNarrationPublicUrl(assetRelativePath);

    if (!assetRelativePath || !publicUrl) {
      return { assetStem, status: "missing" };
    }

    return { assetStem, status: cachedUrlSet.has(publicUrl) ? "cached" : "missing" };
  });
  const cachedCount = results.filter((result) => result.status === "cached").length;

  return createEmptyDownloadReport({
    pack,
    requestedCount,
    readyCount: cachedCount,
    cachedCount,
    missingCount: requestedCount - cachedCount,
    results
  });
}

function normalizeDownloadConcurrency(value, fallback) {
  const requestedConcurrency = Number(value);
  return Number.isFinite(requestedConcurrency) ? Math.min(6, Math.max(1, requestedConcurrency)) : fallback;
}

export function canUsePersistentStudyNarrationCache() {
  return Boolean(getCacheStorageImplementation() && getFetchImplementation());
}

export function getPrefetchedStudyNarrationSrcByStem(assetStem) {
  const normalizedAssetStem = normalizeAssetStem(assetStem);
  return studyNarrationRuntimeEntries.get(normalizedAssetStem)?.objectUrl || "";
}

export async function prefetchStudyNarrationAssetStems(assetStems, options = {}) {
  const normalizedAssetStems = uniqueAssetStems(assetStems);

  if (!normalizedAssetStems.length) {
    return createEmptyDownloadReport({ results: [] });
  }

  const concurrency = normalizeDownloadConcurrency(options.concurrency, 4);
  const results = await mapWithConcurrency(normalizedAssetStems, concurrency, (assetStem) =>
    ensureRuntimeStudyNarrationAssetStem(assetStem, {
      retain: options.retain !== false,
      allowPersistentCache: options.allowPersistentCache !== false,
      persistResponse: options.persistResponse === true
    })
  );

  return createEmptyDownloadReport({
    requestedCount: normalizedAssetStems.length,
    readyCount: results.filter((result) => result.status === "ready").length,
    missingCount: results.filter((result) => result.status === "missing").length,
    failedCount: results.filter((result) => result.status === "failed").length,
    unsupportedCount: results.filter((result) => result.status === "unsupported").length,
    results
  });
}

export function releaseStudyNarrationAssetStems(assetStems) {
  const normalizedAssetStems = uniqueAssetStems(assetStems);

  for (const assetStem of normalizedAssetStems) {
    const entry = studyNarrationRuntimeEntries.get(assetStem);

    if (!entry) {
      continue;
    }

    entry.refCount = Math.max(0, entry.refCount - 1);

    if (entry.refCount > 0) {
      continue;
    }

    revokeStudyNarrationRuntimeEntry(entry);

    if (!entry.promise) {
      studyNarrationRuntimeEntries.delete(assetStem);
    }
  }
}

export async function getStudyNarrationPack(packKey) {
  const normalizedPackKey = normalizePackKey(packKey);

  if (!normalizedPackKey) {
    return null;
  }

  const packIndex = await loadStudyNarrationPackIndex();
  return packIndex[normalizedPackKey] || null;
}

export async function listStudyNarrationPacks() {
  const packIndex = await loadStudyNarrationPackIndex();
  return Object.values(packIndex);
}

export async function inspectStudyNarrationPackDownloadState(packKey) {
  const pack = await getStudyNarrationPack(packKey);

  if (!pack) {
    return createEmptyDownloadReport();
  }

  const cachedUrlSet = canUsePersistentStudyNarrationCache() ? await buildCachedUrlSet() : null;
  return buildPackDownloadReport(pack, cachedUrlSet);
}

export async function inspectAllStudyNarrationPackDownloadStates(packs = null) {
  const resolvedPacks = Array.isArray(packs) && packs.length ? packs : await listStudyNarrationPacks();
  const cachedUrlSet = canUsePersistentStudyNarrationCache() ? await buildCachedUrlSet() : null;

  return Object.fromEntries(
    resolvedPacks.map((pack) => [pack.key, buildPackDownloadReport(pack, cachedUrlSet)])
  );
}

export async function inspectPersistentStudyNarrationCacheSummary() {
  const cacheDescriptor = await ensureStudyNarrationPersistentCacheDescriptor();

  if (!cacheDescriptor) {
    return {
      cachedAssetCount: 0,
      totalBytes: 0,
      supported: false
    };
  }

  const requests = await cacheDescriptor.cache.keys();
  let totalBytes = 0;

  for (const request of requests) {
    const response = await cacheDescriptor.cache.match(request);

    if (!response) {
      continue;
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    totalBytes += Number.isFinite(contentLength) && contentLength > 0 ? contentLength : (await response.blob()).size;
  }

  return {
    cachedAssetCount: requests.length,
    totalBytes,
    supported: true
  };
}

export async function clearPersistentStudyNarrationCache() {
  const cacheDescriptor = await ensureStudyNarrationPersistentCacheDescriptor();

  if (!cacheDescriptor) {
    return {
      deletedCount: 0,
      supported: false
    };
  }

  const requests = await cacheDescriptor.cache.keys();

  for (const request of requests) {
    await cacheDescriptor.cache.delete(request);
  }

  for (const [assetStem, entry] of studyNarrationRuntimeEntries.entries()) {
    if (entry.refCount > 0) {
      continue;
    }

    revokeStudyNarrationRuntimeEntry(entry);
    studyNarrationRuntimeEntries.delete(assetStem);
  }

  return {
    deletedCount: requests.length,
    supported: true
  };
}

export async function downloadStudyNarrationPack(packKey, options = {}) {
  const pack = await getStudyNarrationPack(packKey);
  const signal = options.signal ?? null;

  if (!pack) {
    return createEmptyDownloadReport();
  }

  const fetchImpl = getFetchImplementation();

  if (!canUsePersistentStudyNarrationCache() || !fetchImpl) {
    return buildPackDownloadReport(pack, null);
  }

  throwIfAborted(signal);
  const cacheDescriptor = await ensureStudyNarrationPersistentCacheDescriptor();
  const assetStems = uniqueAssetStems(pack.assetStems);
  const concurrency = normalizeDownloadConcurrency(options.concurrency, 3);
  const results = await mapWithConcurrency(
    assetStems,
    concurrency,
    async (assetStem) => {
      throwIfAborted(signal);
      const assetRelativePath = resolveStudyNarrationAssetRelativePath(assetStem);
      const publicUrl = buildStudyNarrationPublicUrl(assetRelativePath);

      if (!assetRelativePath || !publicUrl) {
        return { assetStem, status: "missing" };
      }

      const cachedResponse = await cacheDescriptor.cache.match(publicUrl);

      if (cachedResponse) {
        return { assetStem, status: "cached" };
      }

      try {
        throwIfAborted(signal);
        const response = await fetchImpl(publicUrl, signal ? { signal } : undefined);

        if (!response.ok) {
          throw new Error(`Failed to download study narration asset: ${response.status}`);
        }

        throwIfAborted(signal);
        await cacheDescriptor.cache.put(publicUrl, response.clone());
        return { assetStem, status: "downloaded" };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return {
          assetStem,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "讲堂音频下载失败。"
        };
      }
    },
    { signal }
  );
  const cachedCount = results.filter((result) => result.status === "cached").length;
  const downloadedCount = results.filter((result) => result.status === "downloaded").length;
  const readyCount = cachedCount + downloadedCount;

  return createEmptyDownloadReport({
    pack,
    requestedCount: assetStems.length,
    readyCount,
    cachedCount,
    downloadedCount,
    missingCount: results.filter((result) => result.status === "missing").length,
    failedCount: results.filter((result) => result.status === "failed").length,
    results
  });
}

export async function deleteStudyNarrationPack(packKey) {
  const pack = await getStudyNarrationPack(packKey);

  if (!pack) {
    return createEmptyDownloadReport();
  }

  const cacheDescriptor = await ensureStudyNarrationPersistentCacheDescriptor();

  if (!cacheDescriptor) {
    return buildPackDownloadReport(pack, null);
  }

  const assetStems = uniqueAssetStems(pack.assetStems);
  const results = [];
  let deletedCount = 0;

  for (const assetStem of assetStems) {
    const assetRelativePath = resolveStudyNarrationAssetRelativePath(assetStem);
    const publicUrl = buildStudyNarrationPublicUrl(assetRelativePath);

    if (!assetRelativePath || !publicUrl) {
      results.push({ assetStem, status: "missing" });
      continue;
    }

    const deleted = await cacheDescriptor.cache.delete(publicUrl);

    if (deleted) {
      deletedCount += 1;
    }

    const runtimeEntry = studyNarrationRuntimeEntries.get(assetStem);

    if (runtimeEntry && runtimeEntry.refCount <= 0) {
      revokeStudyNarrationRuntimeEntry(runtimeEntry);
      studyNarrationRuntimeEntries.delete(assetStem);
    }

    results.push({ assetStem, status: deleted ? "deleted" : "missing" });
  }

  return createEmptyDownloadReport({
    pack,
    requestedCount: assetStems.length,
    deletedCount,
    missingCount: results.filter((result) => result.status === "missing").length,
    results
  });
}

export async function prefetchStudyNarrationPack(packKey, options = {}) {
  return downloadStudyNarrationPack(packKey, options);
}
