import { STUDY_NARRATION_ASSET_INDEX } from "./studyNarrationAssetIndex";
import { getPrefetchedStudyNarrationSrcByStem } from "./studyNarrationPackManager";

const studyNarrationSrcCache = new Map();

function normalizeAssetStem(assetStem) {
  return String(assetStem ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
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

export function hasStudyNarrationAsset(assetStem) {
  const normalizedAssetStem = normalizeAssetStem(assetStem);
  return Boolean(normalizedAssetStem && STUDY_NARRATION_ASSET_INDEX[normalizedAssetStem]);
}

export async function loadStudyNarrationSrc(assetStem) {
  const normalizedAssetStem = normalizeAssetStem(assetStem);

  if (!normalizedAssetStem) {
    return "";
  }

  const prefetchedSrc = getPrefetchedStudyNarrationSrcByStem(normalizedAssetStem);

  if (prefetchedSrc) {
    return prefetchedSrc;
  }

  if (studyNarrationSrcCache.has(normalizedAssetStem)) {
    return studyNarrationSrcCache.get(normalizedAssetStem) || "";
  }

  const resolvedSrc = buildStudyNarrationPublicUrl(STUDY_NARRATION_ASSET_INDEX[normalizedAssetStem]);
  studyNarrationSrcCache.set(normalizedAssetStem, resolvedSrc);
  return resolvedSrc;
}

export function clearStudyNarrationSrcCache() {
  studyNarrationSrcCache.clear();
}
