import { defineStore } from "pinia";

export const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
export const SETTINGS_LOG_LIMIT = 60;

export const PROFILE_GENDER_OPTIONS = Object.freeze(["未设置", "女孩", "男孩"]);

export const AI_MODEL_MODE = Object.freeze({
  SERVICE_DEFAULT: "service-default",
  PRESET: "preset",
  CUSTOM: "custom"
});

export const AI_MODEL_LIBRARY_TYPES = Object.freeze({
  TEXT: "text",
  TTS: "tts"
});

export const AI_TEXT_API_MODE = Object.freeze({
  AUTO: "auto",
  RESPONSES: "responses",
  CHAT_COMPLETIONS: "chat-completions"
});

export const AI_MODEL_LIBRARY_TYPE_OPTIONS = Object.freeze([
  { label: "文本模型", value: AI_MODEL_LIBRARY_TYPES.TEXT },
  { label: "语音模型", value: AI_MODEL_LIBRARY_TYPES.TTS }
]);

export const AI_TEXT_MODEL_PRESET_OPTIONS = Object.freeze([
  { label: "跟随服务端默认", value: AI_MODEL_MODE.SERVICE_DEFAULT },
  { label: "gpt-5.4-mini", value: "gpt-5.4-mini" },
  { label: "gpt-5.4", value: "gpt-5.4" },
  { label: "gpt-5.3-codex", value: "gpt-5.3-codex" }
]);

export const AI_TTS_MODEL_PRESET_OPTIONS = Object.freeze([
  { label: "跟随服务端默认", value: AI_MODEL_MODE.SERVICE_DEFAULT },
  { label: "gpt-4o-mini-tts", value: "gpt-4o-mini-tts" }
]);

export const AI_MODEL_PRESET_OPTIONS = AI_TEXT_MODEL_PRESET_OPTIONS;

export const AI_REVIEW_VOICE_OPTIONS = Object.freeze([
  { label: "Coral 温和老师", value: "coral" },
  { label: "Sage 沉稳老师", value: "sage" },
  { label: "Alloy 中性清晰", value: "alloy" },
  { label: "Verse 明亮活泼", value: "verse" },
  { label: "Marin 轻柔陪伴", value: "marin" },
  { label: "Cedar 清楚讲解", value: "cedar" }
]);

export const AI_REVIEW_SPEED_OPTIONS = Object.freeze([
  { label: "慢一些 0.9x", value: 0.9 },
  { label: "标准 1.0x", value: 1 },
  { label: "稍快 1.1x", value: 1.1 },
  { label: "更快 1.2x", value: 1.2 }
]);

export const AUTO_ADVANCE_DELAY_OPTIONS = Object.freeze([
  { label: "1.5 秒", value: 1500 },
  { label: "2.5 秒", value: 2500 },
  { label: "3.5 秒", value: 3500 }
]);

export const AI_REVIEW_LENGTH_OPTIONS = Object.freeze([
  { label: "简短", value: "short" },
  { label: "标准", value: "standard" },
  { label: "详细", value: "detailed" }
]);

export const HOME_WELCOME_VOICE_MODE = Object.freeze({
  OFF: "off",
  MANUAL: "manual",
  DAILY_AUTO: "daily-auto"
});

export const HOME_WELCOME_VOICE_MODE_OPTIONS = Object.freeze([
  { label: "关闭", value: HOME_WELCOME_VOICE_MODE.OFF },
  { label: "点按播放", value: HOME_WELCOME_VOICE_MODE.MANUAL },
  { label: "每天首次自动播报", value: HOME_WELCOME_VOICE_MODE.DAILY_AUTO }
]);

export const DEFAULT_PROFILE = Object.freeze({
  displayName: "小岛同学",
  gender: "未设置",
  grade: "三年级",
  semester: "上册",
  updatedAt: ""
});

const DEFAULT_AI_PREFERENCES = Object.freeze({
  questionModel: Object.freeze({
    mode: AI_MODEL_MODE.SERVICE_DEFAULT,
    presetModel: "gpt-5.4-mini",
    customModel: ""
  }),
  reviewModel: Object.freeze({
    mode: AI_MODEL_MODE.SERVICE_DEFAULT,
    presetModel: "gpt-5.4-mini",
    customModel: ""
  }),
  ttsModel: Object.freeze({
    mode: AI_MODEL_MODE.SERVICE_DEFAULT,
    presetModel: "gpt-4o-mini-tts",
    customModel: ""
  }),
  customModelLibrary: Object.freeze([]),
  updatedAt: ""
});

const DEFAULT_COACHING_PREFERENCES = Object.freeze({
  autoAdvanceOnCorrect: false,
  autoPlayAiReviewOnWrong: false,
  autoPlayAiReviewOnCorrect: false,
  homeWelcomeVoiceMode: HOME_WELCOME_VOICE_MODE.MANUAL,
  autoAdvanceDelayMs: 1500,
  aiReviewVoice: "coral",
  aiReviewSpeed: 1,
  aiReviewLength: "standard",
  updatedAt: ""
});

const MODEL_NAME_PATTERN = /^[\w./:-]{1,120}$/;
const MODEL_LIBRARY_ID_PREFIX = "wti-model-asset-";
const MODEL_LIBRARY_ID_PATTERN = /^[a-z0-9_-]{1,120}$/i;
const MAX_CUSTOM_MODEL_LIBRARY_ITEMS = 12;
const API_KEY_PATTERN = /^[^\s]{1,240}$/;
const MODEL_LIBRARY_NOTE_MAX_LENGTH = 120;
const TTS_AUDIO_FORMATS = new Set(["mp3", "wav", "pcm16"]);

function normalizeText(value, fallback = "", maxLength = 60) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function normalizeProfile(savedProfile = {}) {
  const gender = PROFILE_GENDER_OPTIONS.includes(String(savedProfile.gender || "").trim())
    ? String(savedProfile.gender).trim()
    : DEFAULT_PROFILE.gender;
  const grade = normalizeText(savedProfile.grade, DEFAULT_PROFILE.grade, 20);
  const semester = ["上册", "下册"].includes(String(savedProfile.semester || "").trim())
    ? String(savedProfile.semester).trim()
    : DEFAULT_PROFILE.semester;

  return {
    displayName: normalizeText(savedProfile.displayName, DEFAULT_PROFILE.displayName, 20),
    gender,
    grade,
    semester,
    updatedAt: normalizeText(savedProfile.updatedAt, "", 40)
  };
}

function normalizeModelName(value, fallback = "") {
  const normalizedValue = normalizeText(value, fallback, 120);

  if (!normalizedValue) {
    return fallback;
  }

  return MODEL_NAME_PATTERN.test(normalizedValue) ? normalizedValue : fallback;
}

function normalizeModelLibraryId(value, fallback = "") {
  const normalizedValue = normalizeText(value, fallback, 120);

  if (!normalizedValue) {
    return fallback;
  }

  return MODEL_LIBRARY_ID_PATTERN.test(normalizedValue) ? normalizedValue : fallback;
}

function isGeneratedModelLibraryId(value = "") {
  return normalizeModelLibraryId(value, "").startsWith(MODEL_LIBRARY_ID_PREFIX);
}

function hashString(value = "") {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function normalizeProviderUrl(value, fallback = "") {
  const normalizedValue = normalizeText(value, fallback, 240);

  if (!normalizedValue) {
    return fallback;
  }

  try {
    const normalizedUrl = new URL(normalizedValue);

    if (!["http:", "https:"].includes(normalizedUrl.protocol)) {
      return fallback;
    }

    return normalizedUrl.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function normalizeProviderApiKey(value) {
  const normalizedValue = normalizeText(value, "", 240);

  if (!normalizedValue) {
    return "";
  }

  return API_KEY_PATTERN.test(normalizedValue) ? normalizedValue : "";
}

function inferModelLibraryType(value = "", fallback = AI_MODEL_LIBRARY_TYPES.TEXT) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  if (normalizedValue.includes("tts")) {
    return AI_MODEL_LIBRARY_TYPES.TTS;
  }

  return fallback;
}

function normalizeModelLibraryType(value, fallback = AI_MODEL_LIBRARY_TYPES.TEXT) {
  const normalizedValue = String(value || "").trim();

  if (Object.values(AI_MODEL_LIBRARY_TYPES).includes(normalizedValue)) {
    return normalizedValue;
  }

  return fallback;
}

function buildModelLibraryFingerprint(entry = {}) {
  const type = normalizeModelLibraryType(entry.type, AI_MODEL_LIBRARY_TYPES.TEXT);

  return [
    normalizeModelName(entry.name, ""),
    type,
    normalizeText(entry.providerLabel, "", 40).toLowerCase(),
    normalizeProviderUrl(entry.baseUrl, "").toLowerCase(),
    type === AI_MODEL_LIBRARY_TYPES.TEXT ? String(entry.textApiMode || AI_TEXT_API_MODE.AUTO).trim() : "",
    type === AI_MODEL_LIBRARY_TYPES.TTS ? normalizeText(entry.ttsVoice, "", 40).toLowerCase() : "",
    type === AI_MODEL_LIBRARY_TYPES.TTS ? String(entry.ttsAudioFormat || "mp3").trim().toLowerCase() : ""
  ].join("|");
}

function buildGeneratedModelLibraryId(entry = {}, occurrenceIndex = 0) {
  const baseValue = buildModelLibraryFingerprint(entry) || normalizeModelName(entry.name, "") || "custom-model";
  const occurrenceSuffix = occurrenceIndex > 0 ? `-${occurrenceIndex + 1}` : "";

  return `${MODEL_LIBRARY_ID_PREFIX}${hashString(baseValue)}${occurrenceSuffix}`;
}

function createUniqueModelLibraryId(entry = {}, usedIds = new Set(), fingerprintCounts = new Map()) {
  const requestedId = normalizeModelLibraryId(entry.id, "");

  if (requestedId && !usedIds.has(requestedId)) {
    usedIds.add(requestedId);
    return requestedId;
  }

  const fingerprint = buildModelLibraryFingerprint(entry);
  let occurrenceIndex = fingerprintCounts.get(fingerprint) || 0;
  let nextId = buildGeneratedModelLibraryId(entry, occurrenceIndex);

  while (usedIds.has(nextId)) {
    occurrenceIndex += 1;
    nextId = buildGeneratedModelLibraryId(entry, occurrenceIndex);
  }

  fingerprintCounts.set(fingerprint, occurrenceIndex + 1);
  usedIds.add(nextId);
  return nextId;
}

function normalizeModelLibraryEntry(candidate, fallbackType = AI_MODEL_LIBRARY_TYPES.TEXT, fallbackId = "") {
  const isObjectCandidate = candidate && typeof candidate === "object" && !Array.isArray(candidate);
  const name = normalizeModelName(
    isObjectCandidate ? candidate.name || candidate.modelName || candidate.value || candidate.label : candidate,
    ""
  );

  if (!name) {
    return null;
  }

  const type = normalizeModelLibraryType(
    isObjectCandidate ? candidate.type : "",
    inferModelLibraryType(name, fallbackType)
  );
  const textApiMode = Object.values(AI_TEXT_API_MODE).includes(String(isObjectCandidate ? candidate.textApiMode : "").trim())
    ? String(candidate.textApiMode).trim()
    : AI_TEXT_API_MODE.AUTO;

  return {
    id: normalizeModelLibraryId(isObjectCandidate ? candidate.id || candidate.assetId || candidate.modelId : "", fallbackId),
    name,
    type,
    textApiMode: type === AI_MODEL_LIBRARY_TYPES.TEXT ? textApiMode : AI_TEXT_API_MODE.AUTO,
    providerLabel: normalizeText(isObjectCandidate ? candidate.providerLabel || candidate.provider : "", "", 40),
    baseUrl: normalizeProviderUrl(isObjectCandidate ? candidate.baseUrl : "", ""),
    apiKey: normalizeProviderApiKey(isObjectCandidate ? candidate.apiKey : ""),
    ttsVoice: type === AI_MODEL_LIBRARY_TYPES.TTS ? normalizeText(isObjectCandidate ? candidate.ttsVoice || candidate.voice : "", "", 40) : "",
    ttsAudioFormat:
      type === AI_MODEL_LIBRARY_TYPES.TTS && TTS_AUDIO_FORMATS.has(String(isObjectCandidate ? candidate.ttsAudioFormat || candidate.audioFormat : "").trim().toLowerCase())
        ? String(candidate.ttsAudioFormat || candidate.audioFormat).trim().toLowerCase()
        : "mp3",
    note: normalizeText(isObjectCandidate ? candidate.note : "", "", MODEL_LIBRARY_NOTE_MAX_LENGTH)
  };
}

function normalizeCustomModelLibrary(savedLibrary = [], extraCandidates = []) {
  const normalizedLibrary = [];
  const usedIds = new Set();
  const fingerprintCounts = new Map();
  const seenExtraCandidates = new Set();

  if (Array.isArray(savedLibrary)) {
    savedLibrary.forEach((candidate) => {
      const fallbackType =
        candidate && typeof candidate === "object" && !Array.isArray(candidate)
          ? normalizeModelLibraryType(candidate.type, AI_MODEL_LIBRARY_TYPES.TEXT)
          : AI_MODEL_LIBRARY_TYPES.TEXT;
      const normalizedCandidate = normalizeModelLibraryEntry(candidate, fallbackType);

      if (!normalizedCandidate) {
        return;
      }

      normalizedLibrary.push({
        ...normalizedCandidate,
        id: createUniqueModelLibraryId(normalizedCandidate, usedIds, fingerprintCounts)
      });
    });
  }

  if (Array.isArray(extraCandidates)) {
    extraCandidates.forEach((candidate) => {
      const fallbackType =
        candidate && typeof candidate === "object" && !Array.isArray(candidate)
          ? normalizeModelLibraryType(candidate.type, AI_MODEL_LIBRARY_TYPES.TEXT)
          : AI_MODEL_LIBRARY_TYPES.TEXT;
      const normalizedCandidate = normalizeModelLibraryEntry(candidate, fallbackType);

      if (!normalizedCandidate) {
        return;
      }

      const extraCandidateKey = `${normalizedCandidate.type}::${normalizedCandidate.name.toLowerCase()}`;

      if (seenExtraCandidates.has(extraCandidateKey)) {
        return;
      }

      seenExtraCandidates.add(extraCandidateKey);

      if (
        normalizedLibrary.some(
          (item) =>
            item.type === normalizedCandidate.type &&
            String(item.name || "").trim().toLowerCase() === normalizedCandidate.name.toLowerCase()
        )
      ) {
        return;
      }

      normalizedLibrary.push({
        ...normalizedCandidate,
        id: createUniqueModelLibraryId(normalizedCandidate, usedIds, fingerprintCounts)
      });
    });
  }

  return normalizedLibrary.slice(0, MAX_CUSTOM_MODEL_LIBRARY_ITEMS);
}

function normalizeAiModelSelection(savedSelection = {}, defaultPresetModel = "") {
  const mode = Object.values(AI_MODEL_MODE).includes(String(savedSelection.mode || "").trim())
    ? String(savedSelection.mode).trim()
    : AI_MODEL_MODE.SERVICE_DEFAULT;
  const presetModel = normalizeModelName(savedSelection.presetModel, defaultPresetModel);
  const customModel = normalizeModelName(savedSelection.customModel, "");

  return {
    mode,
    presetModel,
    customModel
  };
}

function normalizeAiModelSelectionReference(selection = {}, customModelLibrary = []) {
  const matchedEntry = findModelLibraryEntry(customModelLibrary, selection.customModel);

  return {
    ...selection,
    customModel: matchedEntry?.id || normalizeModelName(selection.customModel, "")
  };
}

function resolveAiSelectionModel(selection = {}, customModelLibrary = []) {
  if (selection.mode === AI_MODEL_MODE.CUSTOM) {
    const matchedEntry = findModelLibraryEntry(customModelLibrary, selection.customModel);

    if (matchedEntry) {
      return normalizeModelName(matchedEntry.name, "");
    }

    return isGeneratedModelLibraryId(selection.customModel) ? "" : selection.customModel || "";
  }

  if (selection.mode === AI_MODEL_MODE.PRESET) {
    return selection.presetModel || "";
  }

  return "";
}

function findModelLibraryEntriesByName(customModelLibrary = [], modelName = "") {
  const normalizedName = normalizeModelName(modelName, "");

  if (!normalizedName || !Array.isArray(customModelLibrary)) {
    return [];
  }

  return customModelLibrary.filter((item) => normalizeModelName(item?.name, "") === normalizedName);
}

export function findModelLibraryEntry(customModelLibrary = [], modelRef = "") {
  const normalizedRef = normalizeText(modelRef, "", 120);

  if (!normalizedRef || !Array.isArray(customModelLibrary)) {
    return null;
  }

  const matchedById =
    customModelLibrary.find((item) => normalizeModelLibraryId(item?.id, "") === normalizedRef) || null;

  if (matchedById) {
    return matchedById;
  }

  const matchedByName = findModelLibraryEntriesByName(customModelLibrary, normalizedRef);
  return matchedByName.length === 1 ? matchedByName[0] : null;
}

function resolveModelLibraryEntryDescriptor(entry = {}) {
  const providerLabel = normalizeText(entry?.providerLabel, "", 40);

  if (providerLabel) {
    return providerLabel;
  }

  const baseUrl = normalizeProviderUrl(entry?.baseUrl, "");

  if (baseUrl) {
    try {
      return new URL(baseUrl).host;
    } catch {
      return baseUrl;
    }
  }

  const note = normalizeText(entry?.note, "", MODEL_LIBRARY_NOTE_MAX_LENGTH);

  if (note) {
    return note;
  }

  const entryId = normalizeModelLibraryId(entry?.id, "");
  return entryId ? `资产 ${entryId.slice(-6)}` : "";
}

export function resolveModelLibraryEntryLabel(entry = {}) {
  const modelName = normalizeModelName(entry?.name, "");

  if (!modelName) {
    return "";
  }

  const descriptor = resolveModelLibraryEntryDescriptor(entry);
  return descriptor ? `${modelName} · ${descriptor}` : modelName;
}

export function resolveAiSelectionLabel(selection = {}, customModelLibrary = []) {
  if (selection?.mode === AI_MODEL_MODE.CUSTOM) {
    const matchedEntry = findModelLibraryEntry(customModelLibrary, selection.customModel);

    if (matchedEntry) {
      return resolveModelLibraryEntryLabel(matchedEntry);
    }

    return isGeneratedModelLibraryId(selection?.customModel) ? "" : normalizeModelName(selection?.customModel, "");
  }

  if (selection?.mode === AI_MODEL_MODE.PRESET) {
    return normalizeModelName(selection?.presetModel, "");
  }

  return "";
}

export function resolveAiModelNameForSelection(selection = {}, customModelLibrary = []) {
  return resolveAiSelectionModel(selection, customModelLibrary);
}

export function resolveAiRuntimeConfigForSelection(selection = {}, customModelLibrary = []) {
  if (selection?.mode !== AI_MODEL_MODE.CUSTOM) {
    return null;
  }

  const matchedEntry = findModelLibraryEntry(customModelLibrary, selection.customModel);

  if (!matchedEntry) {
    return null;
  }

  const providerLabel = normalizeText(matchedEntry.providerLabel, "", 40);
  const apiKey = normalizeProviderApiKey(matchedEntry.apiKey);
  const baseUrl = apiKey ? normalizeProviderUrl(matchedEntry.baseUrl, "") : "";
  const textApiMode =
    matchedEntry.type === AI_MODEL_LIBRARY_TYPES.TEXT &&
    Object.values(AI_TEXT_API_MODE).includes(String(matchedEntry.textApiMode || "").trim())
      ? String(matchedEntry.textApiMode).trim()
      : AI_TEXT_API_MODE.AUTO;

  if (!providerLabel && !baseUrl && !apiKey) {
    return null;
  }

  return {
    providerLabel,
    baseUrl,
    apiKey,
    ...(matchedEntry.type === AI_MODEL_LIBRARY_TYPES.TEXT ? { textApiMode } : {}),
    ...(matchedEntry.type === AI_MODEL_LIBRARY_TYPES.TTS
      ? {
          ttsVoice: normalizeText(matchedEntry.ttsVoice, "", 40),
          ttsAudioFormat: TTS_AUDIO_FORMATS.has(String(matchedEntry.ttsAudioFormat || "").trim().toLowerCase())
            ? String(matchedEntry.ttsAudioFormat).trim().toLowerCase()
            : "mp3"
        }
      : {})
  };
}

export function resolveAiRuntimeLabelForSelection(selection = {}, customModelLibrary = []) {
  const matchedEntry = findModelLibraryEntry(customModelLibrary, selection?.customModel);
  const rawProviderLabel = normalizeText(matchedEntry?.providerLabel, "", 40);
  const rawBaseUrl = normalizeProviderUrl(matchedEntry?.baseUrl, "");
  const rawApiKey = normalizeProviderApiKey(matchedEntry?.apiKey);

  if (rawBaseUrl && !rawApiKey) {
    return rawProviderLabel ? `${rawProviderLabel}（需补 API Key）` : "Base URL 需配合 API Key";
  }

  const runtimeConfig = resolveAiRuntimeConfigForSelection(selection, customModelLibrary);

  if (runtimeConfig?.providerLabel) {
    return runtimeConfig.providerLabel;
  }

  if (runtimeConfig?.baseUrl) {
    return runtimeConfig.baseUrl;
  }

  if (runtimeConfig?.apiKey) {
    return "模型自带 API Key";
  }

  if (selection?.mode === AI_MODEL_MODE.CUSTOM && resolveAiSelectionModel(selection, customModelLibrary)) {
    return "未登记，走服务器默认";
  }

  return "跟随服务端默认";
}

function normalizeAiPreferences(savedPreferences = {}) {
  const hasLegacyShape =
    typeof savedPreferences === "object" &&
    savedPreferences !== null &&
    ("mode" in savedPreferences || "presetModel" in savedPreferences || "customModel" in savedPreferences);
  const legacySelection = hasLegacyShape
    ? {
        mode: savedPreferences.mode,
        presetModel: savedPreferences.presetModel,
        customModel: savedPreferences.customModel
      }
    : null;
  const questionSelection = normalizeAiModelSelection(
    savedPreferences.questionModel || legacySelection || {},
    DEFAULT_AI_PREFERENCES.questionModel.presetModel
  );
  const reviewSelection = normalizeAiModelSelection(
    savedPreferences.reviewModel || legacySelection || {},
    DEFAULT_AI_PREFERENCES.reviewModel.presetModel
  );
  const ttsSelection = normalizeAiModelSelection(
    savedPreferences.ttsModel || {},
    DEFAULT_AI_PREFERENCES.ttsModel.presetModel
  );
  const customModelLibrary = normalizeCustomModelLibrary(savedPreferences.customModelLibrary, [
    questionSelection.mode === AI_MODEL_MODE.CUSTOM &&
    questionSelection.customModel &&
    !findModelLibraryEntry(savedPreferences.customModelLibrary, questionSelection.customModel) &&
    !isGeneratedModelLibraryId(questionSelection.customModel)
      ? { name: questionSelection.customModel, type: AI_MODEL_LIBRARY_TYPES.TEXT }
      : null,
    reviewSelection.mode === AI_MODEL_MODE.CUSTOM &&
    reviewSelection.customModel &&
    !findModelLibraryEntry(savedPreferences.customModelLibrary, reviewSelection.customModel) &&
    !isGeneratedModelLibraryId(reviewSelection.customModel)
      ? { name: reviewSelection.customModel, type: AI_MODEL_LIBRARY_TYPES.TEXT }
      : null,
    ttsSelection.mode === AI_MODEL_MODE.CUSTOM &&
    ttsSelection.customModel &&
    !findModelLibraryEntry(savedPreferences.customModelLibrary, ttsSelection.customModel) &&
    !isGeneratedModelLibraryId(ttsSelection.customModel)
      ? { name: ttsSelection.customModel, type: AI_MODEL_LIBRARY_TYPES.TTS }
      : null
  ]);

  return {
    questionModel: normalizeAiModelSelectionReference(questionSelection, customModelLibrary),
    reviewModel: normalizeAiModelSelectionReference(reviewSelection, customModelLibrary),
    ttsModel: normalizeAiModelSelectionReference(ttsSelection, customModelLibrary),
    customModelLibrary,
    updatedAt: normalizeText(savedPreferences.updatedAt, "", 40)
  };
}

function normalizeCoachingPreferences(savedPreferences = {}) {
  const autoAdvanceDelayMs = AUTO_ADVANCE_DELAY_OPTIONS.some(
    (option) => option.value === Number(savedPreferences.autoAdvanceDelayMs)
  )
    ? Number(savedPreferences.autoAdvanceDelayMs)
    : DEFAULT_COACHING_PREFERENCES.autoAdvanceDelayMs;
  const aiReviewVoice = AI_REVIEW_VOICE_OPTIONS.some((option) => option.value === String(savedPreferences.aiReviewVoice || "").trim())
    ? String(savedPreferences.aiReviewVoice).trim()
    : DEFAULT_COACHING_PREFERENCES.aiReviewVoice;
  const aiReviewSpeed = AI_REVIEW_SPEED_OPTIONS.some((option) => option.value === Number(savedPreferences.aiReviewSpeed))
    ? Number(savedPreferences.aiReviewSpeed)
    : DEFAULT_COACHING_PREFERENCES.aiReviewSpeed;
  const aiReviewLength = AI_REVIEW_LENGTH_OPTIONS.some((option) => option.value === String(savedPreferences.aiReviewLength || "").trim())
    ? String(savedPreferences.aiReviewLength).trim()
    : DEFAULT_COACHING_PREFERENCES.aiReviewLength;
  const homeWelcomeVoiceMode = HOME_WELCOME_VOICE_MODE_OPTIONS.some(
    (option) => option.value === String(savedPreferences.homeWelcomeVoiceMode || "").trim()
  )
    ? String(savedPreferences.homeWelcomeVoiceMode).trim()
    : DEFAULT_COACHING_PREFERENCES.homeWelcomeVoiceMode;

  return {
    autoAdvanceOnCorrect:
      typeof savedPreferences.autoAdvanceOnCorrect === "boolean"
        ? savedPreferences.autoAdvanceOnCorrect
        : DEFAULT_COACHING_PREFERENCES.autoAdvanceOnCorrect,
    autoPlayAiReviewOnWrong:
      typeof savedPreferences.autoPlayAiReviewOnWrong === "boolean"
        ? savedPreferences.autoPlayAiReviewOnWrong
        : DEFAULT_COACHING_PREFERENCES.autoPlayAiReviewOnWrong,
    autoPlayAiReviewOnCorrect:
      typeof savedPreferences.autoPlayAiReviewOnCorrect === "boolean"
        ? savedPreferences.autoPlayAiReviewOnCorrect
        : DEFAULT_COACHING_PREFERENCES.autoPlayAiReviewOnCorrect,
    homeWelcomeVoiceMode,
    autoAdvanceDelayMs,
    aiReviewVoice,
    aiReviewSpeed,
    aiReviewLength,
    updatedAt: normalizeText(savedPreferences.updatedAt, "", 40)
  };
}

function normalizeLogEntry(entry = {}) {
  return {
    id: normalizeText(entry.id, `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, 40),
    scope: normalizeText(entry.scope, "system", 24),
    title: normalizeText(entry.title, "设置已更新", 60),
    detail: normalizeText(entry.detail, "", 120),
    createdAt: normalizeText(entry.createdAt, new Date().toISOString(), 40)
  };
}

function normalizeActivityLogs(entries = []) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => normalizeLogEntry(entry))
    .slice(0, SETTINGS_LOG_LIMIT);
}

function sanitizeAiPreferencesForExport(aiPreferences = {}) {
  const normalizedPreferences = normalizeAiPreferences(aiPreferences);

  return {
    ...normalizedPreferences,
    customModelLibrary: normalizedPreferences.customModelLibrary.map((item) => ({
      ...item,
      apiKey: ""
    }))
  };
}

function buildPersistedSnapshot(state) {
  return {
    profile: normalizeProfile(state.profile),
    aiPreferences: normalizeAiPreferences(state.aiPreferences),
    coachingPreferences: normalizeCoachingPreferences(state.coachingPreferences),
    activityLogs: normalizeActivityLogs(state.activityLogs)
  };
}

function buildPortableSnapshot(state) {
  return {
    profile: normalizeProfile(state.profile),
    aiPreferences: sanitizeAiPreferencesForExport(state.aiPreferences),
    coachingPreferences: normalizeCoachingPreferences(state.coachingPreferences),
    activityLogs: normalizeActivityLogs(state.activityLogs)
  };
}

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    profile: { ...DEFAULT_PROFILE },
    aiPreferences: normalizeAiPreferences(DEFAULT_AI_PREFERENCES),
    coachingPreferences: { ...DEFAULT_COACHING_PREFERENCES },
    activityLogs: [],
    hasHydrated: false
  }),

  getters: {
    effectiveQuestionModel(state) {
      return resolveAiSelectionModel(state.aiPreferences.questionModel, state.aiPreferences.customModelLibrary);
    },

    effectiveQuestionModelLabel(state) {
      return resolveAiSelectionLabel(state.aiPreferences.questionModel, state.aiPreferences.customModelLibrary) || "跟随服务端默认";
    },

    effectiveReviewModel(state) {
      return resolveAiSelectionModel(state.aiPreferences.reviewModel, state.aiPreferences.customModelLibrary);
    },

    effectiveReviewModelLabel(state) {
      return resolveAiSelectionLabel(state.aiPreferences.reviewModel, state.aiPreferences.customModelLibrary) || "跟随服务端默认";
    },

    effectiveTtsModel(state) {
      return resolveAiSelectionModel(state.aiPreferences.ttsModel, state.aiPreferences.customModelLibrary);
    },

    effectiveQuestionRuntimeConfig(state) {
      return resolveAiRuntimeConfigForSelection(state.aiPreferences.questionModel, state.aiPreferences.customModelLibrary);
    },

    effectiveReviewRuntimeConfig(state) {
      return resolveAiRuntimeConfigForSelection(state.aiPreferences.reviewModel, state.aiPreferences.customModelLibrary);
    },

    effectiveTtsRuntimeConfig(state) {
      return resolveAiRuntimeConfigForSelection(state.aiPreferences.ttsModel, state.aiPreferences.customModelLibrary);
    },

    effectiveTtsModelLabel(state) {
      return resolveAiSelectionLabel(state.aiPreferences.ttsModel, state.aiPreferences.customModelLibrary) || "跟随服务端默认";
    },

    effectiveAiModel(state) {
      return resolveAiSelectionModel(state.aiPreferences.questionModel, state.aiPreferences.customModelLibrary);
    },

    effectiveAiModelLabel() {
      return this.effectiveQuestionModelLabel;
    },

    aiConfigurationSummary() {
      return [
        `出题 ${this.effectiveQuestionModelLabel}`,
        `点评 ${this.effectiveReviewModelLabel}`,
        `语音 ${this.effectiveTtsModelLabel}`
      ].join(" · ");
    },

    persistedSnapshot(state) {
      return buildPersistedSnapshot(state);
    },

    backupSnapshot(state) {
      return buildPortableSnapshot(state);
    }
  },

  actions: {
    hydrate() {
      if (this.hasHydrated) {
        return;
      }

      if (typeof window !== "undefined") {
        try {
          const savedSnapshot = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

          if (savedSnapshot) {
            const parsedSnapshot = JSON.parse(savedSnapshot);
            this.profile = normalizeProfile(parsedSnapshot.profile);
            this.aiPreferences = normalizeAiPreferences(parsedSnapshot.aiPreferences);
            this.coachingPreferences = normalizeCoachingPreferences(parsedSnapshot.coachingPreferences);
            this.activityLogs = normalizeActivityLogs(parsedSnapshot.activityLogs);
          }
        } catch {
          this.profile = { ...DEFAULT_PROFILE };
          this.aiPreferences = normalizeAiPreferences(DEFAULT_AI_PREFERENCES);
          this.coachingPreferences = { ...DEFAULT_COACHING_PREFERENCES };
          this.activityLogs = [];
        }
      }

      this.hasHydrated = true;
    },

    persist() {
      if (typeof window === "undefined") {
        return;
      }

      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.persistedSnapshot));
      } catch {
        // Ignore storage write failures and keep runtime state usable.
      }
    },

    appendActivityLog(entry = {}) {
      this.activityLogs = [normalizeLogEntry(entry), ...normalizeActivityLogs(this.activityLogs)].slice(0, SETTINGS_LOG_LIMIT);
      this.persist();
    },

    clearActivityLogs() {
      this.activityLogs = [];
      this.persist();
    },

    saveProfile(nextProfile = {}) {
      this.profile = normalizeProfile({
        ...this.profile,
        ...nextProfile,
        updatedAt: new Date().toISOString()
      });
      this.persist();
      this.appendActivityLog({
        scope: "profile",
        title: "学习档案已保存",
        detail: `${this.profile.displayName} · ${this.profile.grade} · ${this.profile.semester}`
      });
      return this.profile;
    },

    saveAiPreferences(nextPreferences = {}) {
      this.aiPreferences = normalizeAiPreferences({
        ...this.aiPreferences,
        ...nextPreferences,
        updatedAt: new Date().toISOString()
      });
      this.persist();
      this.appendActivityLog({
        scope: "ai",
        title: "AI 模型配置已更新",
        detail: this.aiConfigurationSummary
      });
      return this.aiPreferences;
    },

    saveCoachingPreferences(nextPreferences = {}) {
      this.coachingPreferences = normalizeCoachingPreferences({
        ...this.coachingPreferences,
        ...nextPreferences,
        updatedAt: new Date().toISOString()
      });
      this.persist();
      this.appendActivityLog({
        scope: "coach",
        title: "学习陪练偏好已更新",
        detail: [
          this.coachingPreferences.autoAdvanceOnCorrect ? "答对自动继续" : "答对停留看反馈",
          this.coachingPreferences.autoPlayAiReviewOnWrong ? "答错自动播报点评" : "答错手动播放点评",
          this.coachingPreferences.autoPlayAiReviewOnCorrect ? "答对自动播报点评" : "答对手动播放点评",
          this.coachingPreferences.homeWelcomeVoiceMode === HOME_WELCOME_VOICE_MODE.OFF
            ? "首页欢迎语音关闭"
            : this.coachingPreferences.homeWelcomeVoiceMode === HOME_WELCOME_VOICE_MODE.DAILY_AUTO
              ? "首页欢迎语音每天首次自动播报"
              : "首页欢迎语音点按播放",
          `${this.coachingPreferences.autoAdvanceDelayMs}ms`,
          `${this.coachingPreferences.aiReviewVoice} · ${this.coachingPreferences.aiReviewSpeed}x`,
          `点评${this.coachingPreferences.aiReviewLength}`
        ].join(" · ")
      });
      return this.coachingPreferences;
    },

    importSnapshot(snapshot = {}) {
      this.profile = normalizeProfile(snapshot.profile);
      this.aiPreferences = normalizeAiPreferences(snapshot.aiPreferences);
      this.coachingPreferences = normalizeCoachingPreferences(snapshot.coachingPreferences);
      this.activityLogs = normalizeActivityLogs(snapshot.activityLogs);
      this.persist();
    }
  }
});
