<script setup>
import { computed, ref, watch } from "vue";
import ModalDialog from "../ModalDialog.vue";
import { testAiRuntimeConnection } from "../../services/questionsApi";
import { resolveModelLibraryEntryLabel } from "../../stores/useSettingsStore";

const props = defineProps({
  aiDraft: {
    type: Object,
    required: true
  },
  aiDirty: {
    type: Boolean,
    default: false
  },
  aiUpdatedLabel: {
    type: String,
    default: ""
  },
  aiModelLibraryTypeOptions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["back-to-ai"]);

const isCreateModalOpen = ref(false);
const searchQuery = ref("");
const activeTypeFilter = ref("all");
const activeProviderFilter = ref("all");
const createDraft = ref(createEmptyModelDraft());
const editingModelId = ref("");
const modelTestStatusById = ref({});
const draftTestStatus = ref(createEmptyTestState());
const showCreateApiKey = ref(false);
const draftNotice = ref("");
const activeCreateField = ref("");

const MODEL_TYPE_LABELS = Object.freeze({
  text: "文本模型",
  tts: "语音模型"
});
const MODEL_DRAFT_MEMORY_KEY = "wonder-trivia-island.settings.model-library-draft-memory";
const MODEL_FIELD_HISTORY_LIMIT = 4;
const TEXT_API_MODE_OPTIONS = Object.freeze([
  { value: "auto", label: "自动兼容" },
  { value: "responses", label: "强制 Responses" },
  { value: "chat-completions", label: "强制 Chat Completions" }
]);
const OPENAI_TTS_VOICE_OPTIONS = Object.freeze(["alloy", "coral", "sage", "verse", "marin", "cedar"]);
const MIMO_TTS_VOICE_OPTIONS = Object.freeze(["Chloe", "冰糖", "茉莉", "苏打", "白桦", "Mia", "Milo", "Dean"]);
const TTS_AUDIO_FORMAT_OPTIONS = Object.freeze([
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "pcm16", label: "PCM16" }
]);
const MODEL_NAME_EXAMPLES = Object.freeze({
  text: ["gpt-5.4-mini", "gpt-4.1-mini", "mimo-v2.5-pro"],
  tts: ["gpt-4o-mini-tts", "mimo-v2.5-tts"]
});
const NOTE_SUGGESTIONS = Object.freeze([
  "适合出题",
  "中文稳定",
  "点评自然",
  "语音更顺",
  "延迟低",
  "适合课堂讲解"
]);
const PROVIDER_FILTER_EMPTY = "__empty__";
const PROVIDER_TEMPLATES = Object.freeze([
  {
    key: "openai",
    label: "OpenAI 官方",
    providerLabel: "OpenAI",
    baseUrl: "https://api.openai.com/v1"
  },
  {
    key: "openrouter",
    label: "OpenRouter",
    providerLabel: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1"
  },
  {
    key: "xiaomi-mimo",
    label: "Xiaomi MiMo",
    providerLabel: "Xiaomi_mimo",
    baseUrl: "https://api.xiaomimimo.com/v1",
    textApiMode: "chat-completions",
    ttsVoice: "Chloe",
    ttsAudioFormat: "wav"
  },
  {
    key: "custom",
    label: "自建兼容网关",
    providerLabel: "",
    baseUrl: ""
  }
]);
const draftMemory = ref(loadDraftMemory());

function createEmptyModelDraft() {
  return {
    name: "",
    type: "text",
    textApiMode: "auto",
    providerLabel: "",
    baseUrl: "",
    apiKey: "",
    ttsVoice: "Chloe",
    ttsAudioFormat: "mp3",
    note: ""
  };
}

function createEmptyTestState() {
  return {
    status: "idle",
    message: "",
    details: ""
  };
}

function normalizeMemoryText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeMemoryList(values = [], maxLength = 120) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => normalizeMemoryText(value, maxLength)).filter(Boolean))].slice(
    0,
    MODEL_FIELD_HISTORY_LIMIT
  );
}

function createEmptyDraftMemory() {
  return {
    defaults: {
      type: "text",
      textApiMode: "auto",
      providerLabel: "",
      baseUrl: "",
      ttsVoice: "Chloe",
      ttsAudioFormat: "wav"
    },
    recentNames: [],
    recentProviders: [],
    recentBaseUrls: [],
    recentTtsVoices: [],
    recentNotes: []
  };
}

function normalizeDraftMemory(candidate = {}) {
  const defaults = candidate && typeof candidate === "object" ? candidate.defaults || {} : {};
  const type = String(defaults.type || "text").trim() === "tts" ? "tts" : "text";
  const textApiMode = TEXT_API_MODE_OPTIONS.some((option) => option.value === String(defaults.textApiMode || "").trim())
    ? String(defaults.textApiMode).trim()
    : "auto";
  const ttsAudioFormat = TTS_AUDIO_FORMAT_OPTIONS.some((option) => option.value === String(defaults.ttsAudioFormat || "").trim())
    ? String(defaults.ttsAudioFormat).trim()
    : "wav";

  return {
    defaults: {
      type,
      textApiMode,
      providerLabel: normalizeMemoryText(defaults.providerLabel, 40),
      baseUrl: normalizeMemoryText(defaults.baseUrl, 240),
      ttsVoice: normalizeMemoryText(defaults.ttsVoice, 40) || "Chloe",
      ttsAudioFormat
    },
    recentNames: normalizeMemoryList(candidate?.recentNames, 120),
    recentProviders: normalizeMemoryList(candidate?.recentProviders, 40),
    recentBaseUrls: normalizeMemoryList(candidate?.recentBaseUrls, 240),
    recentTtsVoices: normalizeMemoryList(candidate?.recentTtsVoices, 40),
    recentNotes: normalizeMemoryList(candidate?.recentNotes, 120)
  };
}

function loadDraftMemory() {
  if (typeof window === "undefined") {
    return createEmptyDraftMemory();
  }

  try {
    const rawValue = window.localStorage.getItem(MODEL_DRAFT_MEMORY_KEY);

    if (!rawValue) {
      return createEmptyDraftMemory();
    }

    return normalizeDraftMemory(JSON.parse(rawValue));
  } catch {
    return createEmptyDraftMemory();
  }
}

function saveDraftMemory(memory) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MODEL_DRAFT_MEMORY_KEY, JSON.stringify(normalizeDraftMemory(memory)));
  } catch {
    // Ignore local persistence failures and keep the form usable.
  }
}

function pushHistoryValue(history = [], value = "", maxLength = 120) {
  const normalizedValue = normalizeMemoryText(value, maxLength);

  if (!normalizedValue) {
    return normalizeMemoryList(history, maxLength);
  }

  return normalizeMemoryList([normalizedValue, ...history], maxLength);
}

function buildCreateDraftFromMemory() {
  const memoryDefaults = draftMemory.value.defaults || {};

  return {
    ...createEmptyModelDraft(),
    type: String(memoryDefaults.type || "text").trim() === "tts" ? "tts" : "text",
    textApiMode: normalizeMemoryText(memoryDefaults.textApiMode, 32) || "auto",
    providerLabel: normalizeMemoryText(memoryDefaults.providerLabel, 40),
    baseUrl: normalizeMemoryText(memoryDefaults.baseUrl, 240),
    ttsVoice: normalizeMemoryText(memoryDefaults.ttsVoice, 40) || "Chloe",
    ttsAudioFormat: normalizeMemoryText(memoryDefaults.ttsAudioFormat, 20) || "wav"
  };
}

function rememberDraftUsage(entry = {}) {
  const nextMemory = normalizeDraftMemory({
    defaults: {
      type: String(entry.type || "text").trim() === "tts" ? "tts" : "text",
      textApiMode: normalizeMemoryText(entry.textApiMode, 32) || "auto",
      providerLabel: normalizeMemoryText(entry.providerLabel, 40),
      baseUrl: normalizeMemoryText(entry.baseUrl, 240),
      ttsVoice: normalizeMemoryText(entry.ttsVoice, 40) || "Chloe",
      ttsAudioFormat: normalizeMemoryText(entry.ttsAudioFormat, 20) || "wav"
    },
    recentNames: pushHistoryValue(draftMemory.value.recentNames, entry.name, 120),
    recentProviders: pushHistoryValue(draftMemory.value.recentProviders, entry.providerLabel, 40),
    recentBaseUrls: pushHistoryValue(draftMemory.value.recentBaseUrls, entry.baseUrl, 240),
    recentTtsVoices: entry.type === "tts" ? pushHistoryValue(draftMemory.value.recentTtsVoices, entry.ttsVoice, 40) : draftMemory.value.recentTtsVoices,
    recentNotes: pushHistoryValue(draftMemory.value.recentNotes, entry.note, 120)
  });

  draftMemory.value = nextMemory;
  saveDraftMemory(nextMemory);
}

function dedupeSuggestionItems(items = [], maxLength = 120, limit = MODEL_FIELD_HISTORY_LIMIT) {
  const seen = new Set();

  return items
    .map((item) => {
      if (typeof item === "string") {
        const value = normalizeMemoryText(item, maxLength);
        return value ? { value, label: value } : null;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const value = normalizeMemoryText(item.value, maxLength);

      if (!value) {
        return null;
      }

      return {
        value,
        label: normalizeMemoryText(item.label || value, maxLength) || value,
        emphasis: Boolean(item.emphasis)
      };
    })
    .filter((item) => {
      if (!item || seen.has(item.value)) {
        return false;
      }

      seen.add(item.value);
      return true;
    })
    .slice(0, limit);
}

function createSuggestionGroup(title = "", items = [], maxLength = 120, limit = MODEL_FIELD_HISTORY_LIMIT) {
  const normalizedItems = dedupeSuggestionItems(items, maxLength, limit);

  if (!normalizedItems.length) {
    return null;
  }

  return {
    title,
    items: normalizedItems
  };
}

const modelLibrary = computed(() =>
  (Array.isArray(props.aiDraft.customModelLibrary) ? props.aiDraft.customModelLibrary : [])
    .map((item) => ({
      id: String(item?.id || "").trim(),
      name: String(item?.name || "").trim(),
      type: String(item?.type || "text").trim() || "text",
      textApiMode: String(item?.textApiMode || "auto").trim() || "auto",
      providerLabel: String(item?.providerLabel || "").trim(),
      baseUrl: String(item?.baseUrl || "").trim(),
      apiKey: String(item?.apiKey || "").trim(),
      ttsVoice: String(item?.ttsVoice || "").trim(),
      ttsAudioFormat: String(item?.ttsAudioFormat || "mp3").trim() || "mp3",
      note: String(item?.note || "").trim()
    }))
    .filter((item) => item.name)
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type.localeCompare(right.type, "zh-CN");
      }

      if (left.name !== right.name) {
        return left.name.localeCompare(right.name, "zh-CN");
      }

      if (left.providerLabel !== right.providerLabel) {
        return left.providerLabel.localeCompare(right.providerLabel, "zh-CN");
      }

      return left.id.localeCompare(right.id, "zh-CN");
    })
);
const modelLibraryCount = computed(() => modelLibrary.value.length);
const textModelCount = computed(() => modelLibrary.value.filter((item) => item.type === "text").length);
const ttsModelCount = computed(() => modelLibrary.value.filter((item) => item.type === "tts").length);
const providerFilterOptions = computed(() =>
  [...new Set(modelLibrary.value.map((item) => String(item.providerLabel || "").trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  )
);
const normalizedSearchQuery = computed(() => String(searchQuery.value || "").trim().toLowerCase());
const visibleLibrary = computed(() =>
  modelLibrary.value.filter((item) => {
    if (activeTypeFilter.value !== "all" && item.type !== activeTypeFilter.value) {
      return false;
    }

    if (activeProviderFilter.value !== "all") {
      if (activeProviderFilter.value === PROVIDER_FILTER_EMPTY) {
        if (item.providerLabel) {
          return false;
        }
      } else if (item.providerLabel !== activeProviderFilter.value) {
        return false;
      }
    }

    if (!normalizedSearchQuery.value) {
      return true;
    }

    const haystack = [
      item.name,
      item.providerLabel,
      item.baseUrl,
      item.note,
      resolveModelTypeLabel(item.type),
      item.type === "text" ? resolveTextApiModeLabel(item.textApiMode) : ""
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedSearchQuery.value);
  })
);
const filterSummary = computed(() => {
  if (!modelLibraryCount.value) {
    return "还没有登记模型";
  }

  if (!normalizedSearchQuery.value && activeTypeFilter.value === "all") {
    return `共 ${modelLibraryCount.value} 条模型资产，当前展示全部`;
  }

  return `当前显示 ${visibleLibrary.value.length} / ${modelLibraryCount.value} 条结果`;
});
const normalizedCreateName = computed(() => String(createDraft.value.name || "").trim().slice(0, 120));
const isEditingModel = computed(() => Boolean(String(editingModelId.value || "").trim()));
const createSubmitBlockReason = computed(() => {
  if (!normalizedCreateName.value && activeCreateField.value === "name") {
    return "先填模型名。";
  }

  return "";
});
const canSubmitCreate = computed(() => Boolean(normalizedCreateName.value));
const showRememberedDefaults = computed(
  () =>
    !isEditingModel.value &&
    Boolean(
      draftMemory.value.defaults?.providerLabel ||
        draftMemory.value.defaults?.baseUrl ||
        draftMemory.value.defaults?.type === "tts"
    )
);
const rememberedDraftSummary = computed(() => {
  const defaults = draftMemory.value.defaults || {};
  const parts = [];

  if (defaults.providerLabel) {
    parts.push(defaults.providerLabel);
  }

  if (defaults.baseUrl) {
    parts.push(defaults.baseUrl);
  }

  if (String(defaults.type || "text").trim() === "tts") {
    parts.push(`默认语音 ${defaults.ttsVoice || "Chloe"} / ${String(defaults.ttsAudioFormat || "wav").toUpperCase()}`);
  } else if (defaults.textApiMode && defaults.textApiMode !== "auto") {
    parts.push(resolveTextApiModeLabel(defaults.textApiMode));
  }

  return parts.join(" · ");
});
const preferredTemplate = computed(() => {
  const normalizedProvider = String(createDraft.value.providerLabel || "").trim().toLowerCase();
  const normalizedBaseUrl = String(createDraft.value.baseUrl || "").trim().toLowerCase();

  return (
    PROVIDER_TEMPLATES.find((template) => {
      const providerLabel = String(template.providerLabel || "").trim().toLowerCase();
      const baseUrl = String(template.baseUrl || "").trim().toLowerCase();

      return (providerLabel && providerLabel === normalizedProvider) || (baseUrl && baseUrl === normalizedBaseUrl);
    }) || null
  );
});
const visibleProviderTemplates = computed(() => PROVIDER_TEMPLATES.filter((template) => template.key !== "custom"));
const showCreateProviderTemplates = computed(
  () =>
    !String(createDraft.value.providerLabel || "").trim() &&
    !String(createDraft.value.baseUrl || "").trim() &&
    !String(createDraft.value.apiKey || "").trim()
);
const createModalInlineNote = computed(() =>
  isEditingModel.value ? "当前绑定仍会指向这条模型资产。" : "Base URL 需和 API Key 一起填写。"
);
const createModelNamePlaceholder = computed(() =>
  String(createDraft.value.type || "text") === "tts" ? "例如 gpt-4o-mini-tts / mimo-v2.5-tts" : "例如 gpt-5.4-mini / deepseek-v4-flash"
);
const activeTtsVoiceProvider = computed(() => {
  const normalizedProvider = String(createDraft.value.providerLabel || "").trim().toLowerCase();
  const normalizedBaseUrl = String(createDraft.value.baseUrl || "").trim().toLowerCase();
  const normalizedModelName = String(createDraft.value.name || "").trim().toLowerCase();

  if (
    normalizedProvider.includes("mimo") ||
    normalizedProvider.includes("xiaomi") ||
    normalizedBaseUrl.includes("xiaomimimo.com") ||
    (normalizedModelName.includes("mimo") && normalizedModelName.includes("tts"))
  ) {
    return "mimo";
  }

  if (
    normalizedProvider.includes("openai") ||
    normalizedProvider.includes("openrouter") ||
    normalizedBaseUrl.includes("api.openai.com") ||
    normalizedBaseUrl.includes("openrouter.ai") ||
    normalizedModelName.includes("gpt-4o-mini-tts")
  ) {
    return "openai-compatible";
  }

  return "";
});
const modelNameSuggestionGroups = computed(() =>
  [
    createSuggestionGroup(
      createDraft.value.type === "tts" ? "常见语音模型" : "常见文本模型",
      (MODEL_NAME_EXAMPLES[String(createDraft.value.type || "text")] || []).map((value) => ({ value, label: value, emphasis: true })),
      120,
      2
    ),
    createSuggestionGroup("最近填写", draftMemory.value.recentNames, 120, 3)
  ].filter(Boolean)
);
const providerSuggestionGroups = computed(() =>
  (() => {
    if (String(createDraft.value.providerLabel || "").trim()) {
      return [];
    }

    return [
      createSuggestionGroup(
        "常见 Provider",
        PROVIDER_TEMPLATES.map((template) => ({
          value: template.providerLabel,
          label: template.label,
          emphasis: false
        })).filter((item) => item.value),
        40,
        2
      ),
      createSuggestionGroup("最近填写", draftMemory.value.recentProviders, 40, 1)
    ].filter(Boolean);
  })()
);
const baseUrlSuggestionGroups = computed(() =>
  (() => {
    const normalizedBaseUrl = String(createDraft.value.baseUrl || "").trim().toLowerCase();

    if (!normalizedBaseUrl) {
      return [
        createSuggestionGroup(
          "常见地址",
          PROVIDER_TEMPLATES.map((template) => ({
            value: template.baseUrl,
            label: template.baseUrl ? `${template.label} · ${template.baseUrl}` : "",
            emphasis: false
          })).filter((item) => item.value),
          240,
          2
        ),
        createSuggestionGroup("最近填写", draftMemory.value.recentBaseUrls, 240, 1)
      ].filter(Boolean);
    }

    return [];
  })()
);
const noteSuggestionGroups = computed(() =>
  [
    createSuggestionGroup("常用备注", NOTE_SUGGESTIONS.map((value) => ({ value, label: value, emphasis: true })), 120, 2),
    createSuggestionGroup("最近填写", draftMemory.value.recentNotes, 120, 2),
    createSuggestionGroup("已有模型备注", modelLibrary.value.map((item) => item.note).filter(Boolean), 120, 2)
  ].filter(Boolean)
);
const ttsVoiceSuggestionGroups = computed(() => {
  if (createDraft.value.type !== "tts") {
    return [];
  }

  const groups = [];

  if (activeTtsVoiceProvider.value === "mimo") {
    groups.push(
      createSuggestionGroup(
        "Xiaomi MiMo 常见音色",
        MIMO_TTS_VOICE_OPTIONS.map((value) => ({ value, label: value, emphasis: value === "Chloe" })),
        40,
        4
      )
    );
  } else if (activeTtsVoiceProvider.value === "openai-compatible") {
    groups.push(
      createSuggestionGroup(
        "OpenAI 兼容常见音色",
        OPENAI_TTS_VOICE_OPTIONS.map((value) => ({ value, label: value, emphasis: value === "alloy" || value === "coral" })),
        40,
        4
      )
    );
  } else {
    groups.push(
      createSuggestionGroup(
        "OpenAI 兼容常见音色",
        OPENAI_TTS_VOICE_OPTIONS.map((value) => ({ value, label: value, emphasis: value === "alloy" || value === "coral" })),
        40,
        4
      )
    );
    groups.push(
      createSuggestionGroup(
        "Xiaomi MiMo 常见音色",
        MIMO_TTS_VOICE_OPTIONS.map((value) => ({ value, label: value, emphasis: value === "Chloe" })),
        40,
        4
      )
    );
  }

  groups.push(createSuggestionGroup("最近填写", draftMemory.value.recentTtsVoices, 40, 3));
  groups.push(createSuggestionGroup("已有模型音色", modelLibrary.value.filter((item) => item.type === "tts").map((item) => item.ttsVoice).filter(Boolean), 40, 3));

  return groups.filter(Boolean);
});
function resolveModelTypeLabel(type = "text") {
  return MODEL_TYPE_LABELS[String(type || "text")] || "文本模型";
}

function clearFilters() {
  searchQuery.value = "";
  activeTypeFilter.value = "all";
  activeProviderFilter.value = "all";
}

function createLocalModelLibraryId() {
  return `wti-model-asset-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveModelEntryKey(modelEntry = {}) {
  return String(modelEntry?.id || modelEntry?.name || "").trim();
}

function resolveModelEntryDisplayLabel(modelEntry = {}) {
  return resolveModelLibraryEntryLabel(modelEntry) || String(modelEntry?.name || "").trim();
}

function selectionReferencesModelEntry(selection = {}, modelEntry = {}) {
  const currentReference = String(selection?.customModel || "").trim();

  if (!currentReference) {
    return false;
  }

  const modelEntryId = resolveModelEntryKey(modelEntry);
  const modelEntryName = String(modelEntry?.name || "").trim();

  return currentReference === modelEntryId || currentReference === modelEntryName;
}

function openCreateModal() {
  editingModelId.value = "";
  createDraft.value = createEmptyModelDraft();
  draftTestStatus.value = createEmptyTestState();
  showCreateApiKey.value = false;
  activeCreateField.value = "";
  isCreateModalOpen.value = true;
}

function openEditModal(modelEntry = {}) {
  editingModelId.value = resolveModelEntryKey(modelEntry);
  createDraft.value = {
    name: String(modelEntry?.name || "").trim(),
    type: String(modelEntry?.type || "text").trim() || "text",
    textApiMode: String(modelEntry?.textApiMode || "auto").trim() || "auto",
    providerLabel: String(modelEntry?.providerLabel || "").trim(),
    baseUrl: String(modelEntry?.baseUrl || "").trim(),
    apiKey: String(modelEntry?.apiKey || "").trim(),
    ttsVoice: String(modelEntry?.ttsVoice || "Chloe").trim() || "Chloe",
    ttsAudioFormat: String(modelEntry?.ttsAudioFormat || "mp3").trim() || "mp3",
    note: String(modelEntry?.note || "").trim()
  };
  draftTestStatus.value = createEmptyTestState();
  showCreateApiKey.value = false;
  activeCreateField.value = "";
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  isCreateModalOpen.value = false;
  editingModelId.value = "";
  draftTestStatus.value = createEmptyTestState();
  activeCreateField.value = "";
}


function commitCreateModel() {
  if (!canSubmitCreate.value) {
    return;
  }

  const previousEntry = isEditingModel.value
    ? modelLibrary.value.find((item) => item.id === editingModelId.value) || null
    : null;

  const nextEntry = {
    id: isEditingModel.value ? editingModelId.value : createLocalModelLibraryId(),
    name: normalizedCreateName.value,
    type: String(createDraft.value.type || "text"),
    textApiMode: String(createDraft.value.type || "text") === "text" ? String(createDraft.value.textApiMode || "auto").trim() || "auto" : "auto",
    providerLabel: String(createDraft.value.providerLabel || "").trim().slice(0, 40),
    baseUrl: String(createDraft.value.baseUrl || "").trim().slice(0, 240),
    apiKey: String(createDraft.value.apiKey || "").trim().slice(0, 240),
    ttsVoice: String(createDraft.value.type || "text") === "tts" ? String(createDraft.value.ttsVoice || "Chloe").trim().slice(0, 40) : "",
    ttsAudioFormat: String(createDraft.value.type || "text") === "tts" ? String(createDraft.value.ttsAudioFormat || "mp3").trim().slice(0, 20) : "mp3",
    note: String(createDraft.value.note || "").trim().slice(0, 120)
  };

  if (isEditingModel.value) {
    props.aiDraft.customModelLibrary = modelLibrary.value.map((item) =>
      item.id === editingModelId.value
        ? nextEntry
        : item
    );
    [props.aiDraft.questionModel, props.aiDraft.reviewModel, props.aiDraft.ttsModel].forEach((selection) => {
      if (selectionReferencesModelEntry(selection, previousEntry || {})) {
        selection.customModel = nextEntry.id;
      }
    });
    draftNotice.value = `模型资产「${resolveModelEntryDisplayLabel(nextEntry)}」已更新到当前草稿，记得点击“保存 AI 配置”后才会真正保存到本机。`;
  } else {
    props.aiDraft.customModelLibrary = [...modelLibrary.value, nextEntry];
    draftNotice.value = `模型资产「${resolveModelEntryDisplayLabel(nextEntry)}」已加入当前草稿，记得点击“保存 AI 配置”后才会真正保存到本机。`;
  }

  rememberDraftUsage(nextEntry);
  closeCreateModal();
}

function removeModelUsage(selection, modelEntry = {}) {
  if (!selectionReferencesModelEntry(selection, modelEntry)) {
    return;
  }

  selection.customModel = "";

  if (selection.mode === "custom") {
    selection.mode = "service-default";
  }
}

function handleRemoveModel(modelEntry = {}) {
  const targetId = resolveModelEntryKey(modelEntry);
  const targetLabel = resolveModelEntryDisplayLabel(modelEntry);

  if (!targetId) {
    return;
  }

  if (typeof window !== "undefined") {
    const shouldRemove = window.confirm(`移除模型资产「${targetLabel}」后，当前引用它的自定义绑定会回退为跟随服务端默认。是否继续？`);

    if (!shouldRemove) {
      return;
    }
  }

  props.aiDraft.customModelLibrary = modelLibrary.value.filter((item) => item.id !== targetId);
  removeModelUsage(props.aiDraft.questionModel, modelEntry);
  removeModelUsage(props.aiDraft.reviewModel, modelEntry);
  removeModelUsage(props.aiDraft.ttsModel, modelEntry);
  draftNotice.value = `模型资产「${targetLabel}」已从当前草稿移除，记得点击“保存 AI 配置”后才会真正保存到本机。`;
  const nextTestStatusById = { ...modelTestStatusById.value };
  delete nextTestStatusById[targetId];
  modelTestStatusById.value = nextTestStatusById;
}

function applyCreateProviderTemplate(template) {
  createDraft.value.providerLabel = template.providerLabel;
  createDraft.value.baseUrl = template.baseUrl;

  if (template.textApiMode && createDraft.value.type === "text") {
    createDraft.value.textApiMode = template.textApiMode;
  }

  if (template.ttsVoice && createDraft.value.type === "tts") {
    createDraft.value.ttsVoice = template.ttsVoice;
  }

  if (template.ttsAudioFormat && createDraft.value.type === "tts") {
    createDraft.value.ttsAudioFormat = template.ttsAudioFormat;
  }
}

function toggleCreateApiKeyVisibility() {
  showCreateApiKey.value = !showCreateApiKey.value;
}

function setActiveCreateField(fieldName = "") {
  activeCreateField.value = String(fieldName || "").trim();
}

function applyDraftSuggestion(fieldName = "", value = "") {
  const normalizedFieldName = String(fieldName || "").trim();

  if (!normalizedFieldName || !(normalizedFieldName in createDraft.value)) {
    return;
  }

  createDraft.value[normalizedFieldName] = value;
  activeCreateField.value = normalizedFieldName;
}

function resolveActiveFieldHint(fieldName = "") {
  switch (String(fieldName || "").trim()) {
    case "name":
      return "填供应商给出的完整模型 ID；同名模型可以按不同 Provider 分开登记。";
    case "type":
      return "文本用于出题和点评，语音用于播报。";
    case "providerLabel":
      return "建议填供应商名，后面筛选更清楚。";
    case "textApiMode":
      return "一般先用自动；MiMo 这类可固定到 Chat Completions。";
    case "baseUrl":
      return "填到 /v1 即可，不要带具体接口路径。";
    case "ttsVoice":
      return "优先填官方音色名；MiMo 可先用 Chloe。";
    case "ttsAudioFormat":
      return "网页默认优先 WAV。";
    case "apiKey":
      return "只在本地保存，不会进入建议列表。";
    case "note":
      return "写一句用途即可。";
    default:
      return "";
  }
}

function resolveFieldDisplayName(fieldName = "") {
  switch (String(fieldName || "").trim()) {
    case "name":
      return "模型名";
    case "type":
      return "模型类型";
    case "providerLabel":
      return "Provider";
    case "textApiMode":
      return "文本接口模式";
    case "baseUrl":
      return "Base URL";
    case "ttsVoice":
      return "语音音色";
    case "ttsAudioFormat":
      return "输出格式";
    case "apiKey":
      return "API Key";
    case "note":
      return "备注";
    default:
      return "";
  }
}

function resolveFieldSuggestions(fieldName = "") {
  switch (String(fieldName || "").trim()) {
    case "name":
      return modelNameSuggestionGroups.value;
    case "providerLabel":
      return providerSuggestionGroups.value;
    case "baseUrl":
      return baseUrlSuggestionGroups.value;
    case "ttsVoice":
      return ttsVoiceSuggestionGroups.value;
    case "note":
      return noteSuggestionGroups.value;
    default:
      return [];
  }
}

async function handleTestCreateDraft() {
  const modelName = String(createDraft.value.name || "").trim();

  if (!modelName) {
    draftTestStatus.value = {
      status: "error",
      message: "请先填写模型名",
      details: "测试前需要先提供要验证的模型名。"
    };
    return;
  }

  draftTestStatus.value = {
    status: "loading",
    message: "测试中...",
    details: ""
  };

  try {
    const runtimeConfig = buildRuntimeConfigForTest(createDraft.value);

    if (runtimeConfig.hasBaseUrlWithoutApiKey) {
      draftTestStatus.value = {
        status: "error",
        message: "草稿测试失败",
        details: "Base URL 需要和 API Key 一起填写后才会生效。"
      };
      return;
    }

    const payload = await testAiRuntimeConnection({
      questionModel: createDraft.value.type === "text" ? modelName : "",
      reviewModel: createDraft.value.type === "text" ? modelName : "",
      ttsModel: createDraft.value.type === "tts" ? modelName : "",
      aiRuntime: runtimeConfig.runtime
    });

    const matchedResult =
      payload?.data?.tests?.find((item) => {
        if (createDraft.value.type === "tts") {
          return item.key === "ttsModel";
        }

        return item.key === "questionModel";
      }) || null;

    draftTestStatus.value = {
      status: matchedResult?.ok ? "success" : "error",
      message: matchedResult?.ok ? "草稿测试通过" : "草稿测试失败",
      details: matchedResult?.detail || ""
    };
  } catch (error) {
    draftTestStatus.value = {
      status: "error",
      message: "草稿测试失败",
      details: error?.message || "连接测试失败。"
    };
  }
}

function getModelTestState(modelEntry = {}) {
  return modelTestStatusById.value[resolveModelEntryKey(modelEntry)] || {
    status: "idle",
    message: "",
    details: ""
  };
}

function resolveTextApiModeLabel(value = "auto") {
  return TEXT_API_MODE_OPTIONS.find((item) => item.value === String(value || "").trim())?.label || "自动兼容";
}

function buildRuntimeConfigForTest(entry = {}) {
  const providerLabel = String(entry.providerLabel || "").trim();
  const apiKey = String(entry.apiKey || "").trim();
  const baseUrl = apiKey ? String(entry.baseUrl || "").trim() : "";
  const hasBaseUrlWithoutApiKey = Boolean(String(entry.baseUrl || "").trim()) && !apiKey;
  const runtime = providerLabel || baseUrl || apiKey
    ? {
        providerLabel,
        baseUrl,
        apiKey,
        textApiMode: String(entry.type || "text") === "text" ? String(entry.textApiMode || "auto").trim() || "auto" : "auto",
        ttsVoice: String(entry.type || "text") === "tts" ? String(entry.ttsVoice || "Chloe").trim() || "Chloe" : "",
        ttsAudioFormat: String(entry.type || "text") === "tts" ? String(entry.ttsAudioFormat || "mp3").trim() || "mp3" : "mp3"
      }
    : null;

  return {
    runtime,
    hasBaseUrlWithoutApiKey
  };
}

async function handleTestModel(modelEntry = {}) {
  const modelName = String(modelEntry?.name || "").trim();
  const modelEntryKey = resolveModelEntryKey(modelEntry);

  if (!modelName || !modelEntryKey) {
    return;
  }

  modelTestStatusById.value = {
    ...modelTestStatusById.value,
    [modelEntryKey]: {
      status: "loading",
      message: "测试中...",
      details: ""
    }
  };

  try {
    const runtimeConfig = buildRuntimeConfigForTest(modelEntry);

    if (runtimeConfig.hasBaseUrlWithoutApiKey) {
      modelTestStatusById.value = {
        ...modelTestStatusById.value,
        [modelEntryKey]: {
          status: "error",
          message: "测试失败",
          details: "Base URL 需要和 API Key 一起填写后才会生效。"
        }
      };
      return;
    }

    const payload = await testAiRuntimeConnection({
      questionModel: modelEntry.type === "text" ? modelName : "",
      reviewModel: modelEntry.type === "text" ? modelName : "",
      ttsModel: modelEntry.type === "tts" ? modelName : "",
      aiRuntime: runtimeConfig.runtime
    });

    const matchedResult =
      payload?.data?.tests?.find((item) => {
        if (modelEntry.type === "tts") {
          return item.key === "ttsModel";
        }

        return item.key === "questionModel";
      }) || null;

    modelTestStatusById.value = {
      ...modelTestStatusById.value,
      [modelEntryKey]: {
        status: matchedResult?.ok ? "success" : "error",
        message: matchedResult?.ok ? "测试通过" : "测试失败",
        details: matchedResult?.detail || ""
      }
    };
  } catch (error) {
    modelTestStatusById.value = {
      ...modelTestStatusById.value,
      [modelEntryKey]: {
        status: "error",
        message: "测试失败",
        details: error?.message || "连接测试失败。"
      }
    };
  }
}

watch(
  createDraft,
  () => {
    if (draftTestStatus.value.status !== "idle") {
      draftTestStatus.value = createEmptyTestState();
    }
  },
  { deep: true }
);

watch(
  () => props.aiDirty,
  (nextValue, previousValue) => {
    if (previousValue && !nextValue) {
      draftNotice.value = "";
    }
  }
);
</script>

<template>
  <section id="settings-model-library" class="settings-card settings-card--stage settings-section-anchor settings-model-library">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">Model Library</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>模型管理</h4>
      </div>
      <div class="settings-card__meta-group">
        <span v-if="aiDirty" class="settings-card__badge">未保存</span>
        <span class="settings-card__meta">{{ aiUpdatedLabel }}</span>
      </div>
    </div>

    <p class="settings-card__note">
      这里专门维护可复用的模型资产。服务绑定关系仍然在 AI 配置主页面处理；模型库的增删改会跟 AI 配置一起保存。
    </p>

    <div class="settings-model-library__save-notice">
      <strong class="settings-model-library__save-notice-title">录入模型后还要再保存一次</strong>
      <p class="settings-model-library__save-notice-text">
        `添加模型 / 编辑模型 / 移除模型` 只会先写入当前 AI 草稿。只有点击页面底部的 `保存 AI 配置`，这些模型资产才会真正保存到本机。
      </p>
    </div>

    <p v-if="draftNotice" class="settings-model-library__draft-notice">
      {{ draftNotice }}
    </p>

    <div class="settings-model-library__hero">
      <div class="settings-model-library__summary-wrap">
        <div class="settings-model-library__summary">
          <span class="settings-inline-summary">共 {{ modelLibraryCount }} 个模型</span>
          <span class="settings-inline-summary">文本 {{ textModelCount }}</span>
          <span class="settings-inline-summary">语音 {{ ttsModelCount }}</span>
        </div>
        <p class="settings-model-library__summary-text">{{ filterSummary }}</p>
      </div>
      <div class="settings-model-library__hero-actions">
        <button class="btn-cartoon" type="button" @click="emit('back-to-ai')">返回 AI 配置</button>
        <button class="btn-cartoon btn-cartoon--mint" type="button" @click="openCreateModal">添加模型</button>
      </div>
    </div>

    <div class="settings-form settings-model-library__filters">
      <label class="settings-field settings-field--span">
        <span class="settings-field__label">搜索模型</span>
        <input v-model.trim="searchQuery" class="settings-input" type="text" maxlength="120" placeholder="按模型名、Provider、兼容模式或备注筛选" />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">类型筛选</span>
        <select v-model="activeTypeFilter" class="quiz-toolbar__select">
          <option value="all">全部类型</option>
          <option v-for="option in aiModelLibraryTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">Provider 筛选</span>
        <select v-model="activeProviderFilter" class="quiz-toolbar__select">
          <option value="all">全部 Provider</option>
          <option :value="PROVIDER_FILTER_EMPTY">未填写 Provider</option>
          <option v-for="provider in providerFilterOptions" :key="provider" :value="provider">
            {{ provider }}
          </option>
        </select>
      </label>

      <div class="settings-field settings-field--span settings-model-library__filter-actions">
        <button
          class="settings-model-library__action"
          type="button"
          :disabled="!searchQuery && activeTypeFilter === 'all' && activeProviderFilter === 'all'"
          @click="clearFilters"
        >
          清空筛选
        </button>
      </div>
    </div>

    <div v-if="visibleLibrary.length" class="settings-model-library__list">
      <article v-for="modelEntry in visibleLibrary" :key="resolveModelEntryKey(modelEntry)" class="settings-model-library__item">
        <div class="settings-model-library__item-copy">
          <div class="settings-model-library__item-topline">
            <strong class="settings-model-library__item-title">{{ modelEntry.name }}</strong>
            <div class="settings-model-library__item-tags">
              <span class="settings-model-library__tag">{{ resolveModelTypeLabel(modelEntry.type) }}</span>
              <span v-if="modelEntry.providerLabel" class="settings-model-library__tag">{{ modelEntry.providerLabel }}</span>
              <span v-if="modelEntry.type === 'text'" class="settings-model-library__tag">{{ resolveTextApiModeLabel(modelEntry.textApiMode) }}</span>
              <span v-if="modelEntry.type === 'tts' && modelEntry.ttsVoice" class="settings-model-library__tag">音色 {{ modelEntry.ttsVoice }}</span>
              <span v-if="modelEntry.type === 'tts' && modelEntry.ttsAudioFormat" class="settings-model-library__tag">{{ String(modelEntry.ttsAudioFormat).toUpperCase() }}</span>
              <span
                v-if="modelEntry.baseUrl"
                class="settings-model-library__tag"
              >
                {{ modelEntry.apiKey ? "已带 Base URL" : "Base URL 待配 Key" }}
              </span>
              <span v-if="modelEntry.apiKey" class="settings-model-library__tag">已带 API Key</span>
            </div>
          </div>
          <p v-if="modelEntry.baseUrl" class="settings-model-library__item-note">{{ modelEntry.baseUrl }}</p>
          <p v-if="modelEntry.note" class="settings-model-library__item-note">{{ modelEntry.note }}</p>
          <p
            v-if="getModelTestState(modelEntry).status !== 'idle'"
            :class="[
              'settings-model-library__test-status',
              `settings-model-library__test-status--${getModelTestState(modelEntry).status}`
            ]"
          >
            {{ getModelTestState(modelEntry).message }}
            <span v-if="getModelTestState(modelEntry).details"> · {{ getModelTestState(modelEntry).details }}</span>
          </p>
        </div>
        <div class="settings-model-library__item-actions">
          <button class="settings-model-library__action" type="button" @click="handleTestModel(modelEntry)">
            {{ getModelTestState(modelEntry).status === "loading" ? "测试中..." : "测试模型" }}
          </button>
          <button class="settings-model-library__action" type="button" @click="openEditModal(modelEntry)">编辑</button>
          <button class="settings-model-library__remove" type="button" @click="handleRemoveModel(modelEntry)">移除</button>
        </div>
      </article>
    </div>
    <div v-else class="settings-model-library__empty">
      <strong class="settings-model-library__empty-title">{{ modelLibrary.length ? "没有匹配的模型" : "当前还没有登记模型" }}</strong>
      <p class="settings-model-library__empty-text">
        {{ modelLibrary.length ? "换个关键词，或者切换类型筛选试试。" : "先添加一个常用模型，后面在 AI 配置页分配时就可以快速复用；添加后别忘了再点一次“保存 AI 配置”。" }}
      </p>
      <div class="settings-model-library__empty-actions">
        <button v-if="modelLibrary.length" class="settings-model-library__action" type="button" @click="clearFilters">恢复全部模型</button>
        <button v-else class="btn-cartoon btn-cartoon--mint" type="button" @click="openCreateModal">添加第一个模型</button>
      </div>
    </div>

    <ModalDialog
      v-model="isCreateModalOpen"
      title-id="settings-model-library-create-title"
      :heading-eyebrow="isEditingModel ? 'Edit Model' : 'Add Model'"
      :heading-title="isEditingModel ? '编辑模型' : '添加模型'"
      :close-label="isEditingModel ? '关闭编辑模型弹窗' : '关闭添加模型弹窗'"
      close-button-text="取消"
      panel-class="settings-model-library__dialog"
      initial-focus-selector="[data-modal-primary='true']"
    >
      <div class="settings-model-library__modal-body">
        <p class="settings-model-library__inline-banner">{{ createModalInlineNote }}</p>

        <section v-if="showRememberedDefaults" class="settings-model-library__memory-banner">
          <p class="settings-model-library__memory-inline">
            <span class="settings-model-library__memory-eyebrow">上次配置</span>
            <span class="settings-model-library__memory-text">{{ rememberedDraftSummary }}</span>
          </p>
          <button class="settings-model-library__action settings-model-library__memory-action" type="button" @click="createDraft = buildCreateDraftFromMemory()">
            带入上次配置
          </button>
        </section>

        <div class="settings-model-library__dialog-main">
            <section class="settings-model-library__group">
              <div class="settings-model-library__group-head">
                <div>
                  <p class="settings-model-library__group-eyebrow">Basic</p>
                  <h5 class="settings-model-library__group-title">基础信息</h5>
                </div>
                <p class="settings-model-library__group-note">先填模型名和类型。</p>
              </div>

              <div class="settings-form settings-model-library__dialog-form">
                <label class="settings-field settings-field--span settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">模型名</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--required">必填</span>
                  </span>
                  <input
                    v-model.trim="createDraft.name"
                    class="settings-input"
                    type="text"
                    maxlength="120"
                    :placeholder="createModelNamePlaceholder"
                    @focus="setActiveCreateField('name')"
                    @click="setActiveCreateField('name')"
                    @keyup.enter="commitCreateModel"
                  />
                  <p
                    v-if="createSubmitBlockReason"
                    class="settings-model-library__field-help"
                  >
                    {{ createSubmitBlockReason }}
                  </p>
                  <div v-if="activeCreateField === 'name' && resolveFieldSuggestions('name').length" class="settings-model-library__suggestions">
                    <div
                      v-for="group in resolveFieldSuggestions('name')"
                      :key="`name-group-${group.title}`"
                      class="settings-model-library__suggestion-group"
                    >
                      <span class="settings-model-library__suggestion-group-title">{{ group.title }}</span>
                      <div class="settings-model-library__suggestion-group-items">
                        <button
                          v-for="suggestion in group.items"
                          :key="`name-${suggestion.value}`"
                          :class="[
                            'settings-model-library__suggestion-chip',
                            suggestion.emphasis ? 'settings-model-library__suggestion-chip--emphasis' : ''
                          ]"
                          type="button"
                          @click="applyDraftSuggestion('name', suggestion.value)"
                        >
                          {{ suggestion.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </label>

                <label class="settings-field settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">模型类型</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--required">必填</span>
                  </span>
                  <select
                    v-model="createDraft.type"
                    class="quiz-toolbar__select"
                    @focus="setActiveCreateField('type')"
                    @click="setActiveCreateField('type')"
                  >
                    <option v-for="option in aiModelLibraryTypeOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label class="settings-field settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">Provider</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">选填</span>
                  </span>
                  <input
                    v-model.trim="createDraft.providerLabel"
                    class="settings-input"
                    type="text"
                    maxlength="40"
                    placeholder="例如 OpenAI / OpenRouter / Xiaomi_mimo"
                    @focus="setActiveCreateField('providerLabel')"
                    @click="setActiveCreateField('providerLabel')"
                  />
                  <div
                    v-if="activeCreateField === 'providerLabel' && resolveFieldSuggestions('providerLabel').length"
                    class="settings-model-library__suggestions"
                  >
                    <div
                      v-for="group in resolveFieldSuggestions('providerLabel')"
                      :key="`provider-group-${group.title}`"
                      class="settings-model-library__suggestion-group"
                    >
                      <span class="settings-model-library__suggestion-group-title">{{ group.title }}</span>
                      <div class="settings-model-library__suggestion-group-items">
                        <button
                          v-for="suggestion in group.items"
                          :key="`provider-${suggestion.value}`"
                          :class="[
                            'settings-model-library__suggestion-chip',
                            suggestion.emphasis ? 'settings-model-library__suggestion-chip--emphasis' : ''
                          ]"
                          type="button"
                          @click="applyDraftSuggestion('providerLabel', suggestion.value)"
                        >
                          {{ suggestion.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <section class="settings-model-library__group">
              <div class="settings-model-library__group-head">
                <div>
                  <p class="settings-model-library__group-eyebrow">Runtime</p>
                  <h5 class="settings-model-library__group-title">连接设置</h5>
                </div>
                <p class="settings-model-library__group-note">独立网关时，URL 和 Key 一起填。</p>
              </div>

              <div class="settings-form settings-model-library__dialog-form">
                <div v-if="showCreateProviderTemplates" class="settings-field settings-field--span settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">模板</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">可选</span>
                  </span>
                  <div class="settings-model-library__template-list">
                    <button
                      v-for="template in visibleProviderTemplates"
                      :key="`create-${template.key}`"
                      class="settings-model-library__template-chip"
                      type="button"
                      @click="applyCreateProviderTemplate(template)"
                    >
                      {{ template.label }}
                    </button>
                  </div>
                </div>

                <label class="settings-field settings-field--span settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">Base URL</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">选填</span>
                  </span>
                  <input
                    v-model.trim="createDraft.baseUrl"
                    class="settings-input"
                    type="url"
                    maxlength="240"
                    placeholder="例如 https://api.openai.com/v1"
                    @focus="setActiveCreateField('baseUrl')"
                    @click="setActiveCreateField('baseUrl')"
                  />
                  <div
                    v-if="activeCreateField === 'baseUrl' && resolveFieldSuggestions('baseUrl').length"
                    class="settings-model-library__suggestions"
                  >
                    <div
                      v-for="group in resolveFieldSuggestions('baseUrl')"
                      :key="`base-url-group-${group.title}`"
                      class="settings-model-library__suggestion-group"
                    >
                      <span class="settings-model-library__suggestion-group-title">{{ group.title }}</span>
                      <div class="settings-model-library__suggestion-group-items">
                        <button
                          v-for="suggestion in group.items"
                          :key="`base-url-${suggestion.value}`"
                          :class="[
                            'settings-model-library__suggestion-chip',
                            suggestion.emphasis ? 'settings-model-library__suggestion-chip--emphasis' : ''
                          ]"
                          type="button"
                          @click="applyDraftSuggestion('baseUrl', suggestion.value)"
                        >
                          {{ suggestion.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </label>

                <label class="settings-field settings-field--span settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">API Key</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">选填</span>
                  </span>
                  <div class="settings-model-library__secret-row">
                    <input
                      v-model.trim="createDraft.apiKey"
                      class="settings-input"
                      :type="showCreateApiKey ? 'text' : 'password'"
                      maxlength="240"
                      placeholder="可选；填了 Base URL 建议一起填"
                      @focus="setActiveCreateField('apiKey')"
                      @click="setActiveCreateField('apiKey')"
                    />
                    <button class="settings-model-library__template-chip" type="button" @click="toggleCreateApiKeyVisibility">
                      {{ showCreateApiKey ? "隐藏" : "显示" }}
                    </button>
                  </div>
                  <p v-if="activeCreateField === 'apiKey'" class="settings-model-library__field-help">
                    {{ resolveActiveFieldHint('apiKey') }}
                  </p>
                </label>
              </div>
            </section>

            <section class="settings-model-library__group">
              <div class="settings-model-library__group-head">
                <div>
                  <p class="settings-model-library__group-eyebrow">Behavior</p>
                  <h5 class="settings-model-library__group-title">能力选项</h5>
                </div>
                <p class="settings-model-library__group-note">
                  {{ createDraft.type === "text" ? "文本模型可选接口模式。" : "语音模型可选音色和格式。"}}
                </p>
              </div>

              <div
                :class="[
                  'settings-form',
                  'settings-model-library__dialog-form',
                  createDraft.type === 'tts' ? 'settings-model-library__dialog-form--tts' : ''
                ]"
              >
                <label v-if="createDraft.type === 'text'" class="settings-field settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">文本接口模式</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">建议确认</span>
                  </span>
                  <select
                    v-model="createDraft.textApiMode"
                    class="quiz-toolbar__select"
                    @focus="setActiveCreateField('textApiMode')"
                    @click="setActiveCreateField('textApiMode')"
                  >
                    <option v-for="option in TEXT_API_MODE_OPTIONS" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label v-if="createDraft.type === 'tts'" class="settings-field settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">语音音色</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">建议填写</span>
                  </span>
                  <input
                    v-model.trim="createDraft.ttsVoice"
                    class="settings-input"
                    type="text"
                    maxlength="40"
                    placeholder="例如 Chloe / 冰糖 / alloy"
                    @focus="setActiveCreateField('ttsVoice')"
                    @click="setActiveCreateField('ttsVoice')"
                  />
                  <div
                    v-if="activeCreateField === 'ttsVoice' && resolveFieldSuggestions('ttsVoice').length"
                    class="settings-model-library__suggestions"
                  >
                    <div
                      v-for="group in resolveFieldSuggestions('ttsVoice')"
                      :key="`tts-voice-group-${group.title}`"
                      class="settings-model-library__suggestion-group"
                    >
                      <span class="settings-model-library__suggestion-group-title">{{ group.title }}</span>
                      <div class="settings-model-library__suggestion-group-items">
                        <button
                          v-for="suggestion in group.items"
                          :key="`tts-voice-${group.title}-${suggestion.value}`"
                          :class="[
                            'settings-model-library__suggestion-chip',
                            suggestion.emphasis ? 'settings-model-library__suggestion-chip--emphasis' : ''
                          ]"
                          type="button"
                          @click="applyDraftSuggestion('ttsVoice', suggestion.value)"
                        >
                          {{ suggestion.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </label>

                <label v-if="createDraft.type === 'tts'" class="settings-field settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">输出格式</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">建议填写</span>
                  </span>
                  <select
                    v-model="createDraft.ttsAudioFormat"
                    class="quiz-toolbar__select"
                    @focus="setActiveCreateField('ttsAudioFormat')"
                    @click="setActiveCreateField('ttsAudioFormat')"
                  >
                    <option v-for="option in TTS_AUDIO_FORMAT_OPTIONS" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <div v-if="createDraft.type === 'text'" class="settings-field settings-field--span settings-model-library__inline-note">
                  <p class="settings-model-library__field-help">
                    `自动兼容` 会先试 `Responses`，不通再回退到 `Chat Completions`；像 Xiaomi MiMo 这类只兼容后者的服务，可以直接选 `强制 Chat Completions`。
                  </p>
                </div>

                <div v-if="createDraft.type === 'tts'" class="settings-field settings-field--span settings-model-library__inline-note">
                  <p class="settings-model-library__field-help">
                    Xiaomi MiMo 走 `chat/completions + audio`；这里支持直接手填官方音色名，网页默认播放建议优先选 `WAV`。
                  </p>
                </div>
              </div>
            </section>

            <section class="settings-model-library__group">
              <div class="settings-model-library__group-head">
                <div>
                  <p class="settings-model-library__group-eyebrow">Notes</p>
                  <h5 class="settings-model-library__group-title">备注</h5>
                </div>
                <p class="settings-model-library__group-note">可选，写一句用途即可。</p>
              </div>

              <div class="settings-form settings-model-library__dialog-form">
                <label class="settings-field settings-field--span settings-model-library__dialog-field">
                  <span class="settings-model-library__field-head">
                    <span class="settings-field__label">备注</span>
                    <span class="settings-model-library__field-badge settings-model-library__field-badge--optional">选填</span>
                  </span>
                  <input
                    v-model.trim="createDraft.note"
                    class="settings-input"
                    type="text"
                    maxlength="120"
                    placeholder="例如 适合出题、延迟低、中文稳定"
                    @focus="setActiveCreateField('note')"
                    @click="setActiveCreateField('note')"
                  />
                  <div
                    v-if="activeCreateField === 'note' && resolveFieldSuggestions('note').length"
                    class="settings-model-library__suggestions"
                  >
                    <div
                      v-for="group in resolveFieldSuggestions('note')"
                      :key="`note-group-${group.title}`"
                      class="settings-model-library__suggestion-group"
                    >
                      <span class="settings-model-library__suggestion-group-title">{{ group.title }}</span>
                      <div class="settings-model-library__suggestion-group-items">
                        <button
                          v-for="suggestion in group.items"
                          :key="`note-${suggestion.value}`"
                          :class="[
                            'settings-model-library__suggestion-chip',
                            suggestion.emphasis ? 'settings-model-library__suggestion-chip--emphasis' : ''
                          ]"
                          type="button"
                          @click="applyDraftSuggestion('note', suggestion.value)"
                        >
                          {{ suggestion.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </section>
        </div>

        <p
          v-if="draftTestStatus.status !== 'idle'"
          :class="[
            'settings-model-library__test-status',
            'settings-model-library__draft-test-status',
            `settings-model-library__test-status--${draftTestStatus.status}`
          ]"
        >
          {{ draftTestStatus.message }}
          <span v-if="draftTestStatus.details"> · {{ draftTestStatus.details }}</span>
        </p>

        <div class="settings-model-library__modal-actions">
          <button class="settings-model-library__action" type="button" :disabled="draftTestStatus.status === 'loading'" @click="handleTestCreateDraft">
            {{ draftTestStatus.status === "loading" ? "测试中..." : "先测试这条模型" }}
          </button>
          <button
            class="btn-cartoon btn-cartoon--mint"
            type="button"
            data-modal-primary="true"
            :disabled="!canSubmitCreate"
            :title="createSubmitBlockReason || (isEditingModel ? '保存这条模型' : '把这条模型加入当前草稿')"
            @click="commitCreateModel"
          >
            {{ isEditingModel ? "保存模型" : "添加模型" }}
          </button>
          <button class="btn-cartoon settings-model-library__modal-cancel" type="button" @click="closeCreateModal">取消</button>
        </div>
      </div>
    </ModalDialog>
  </section>
</template>

<style>
.settings-model-library {
  display: grid;
  gap: 18px;
}

.settings-model-library__hero,
.settings-model-library__save-notice,
.settings-model-library__item,
.settings-model-library__empty {
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(251, 254, 255, 0.94) 0%, rgba(247, 251, 254, 0.9) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    0 16px 26px -28px rgba(36, 50, 74, 0.32);
}

.settings-model-library__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.settings-model-library__save-notice {
  display: grid;
  gap: 8px;
  border-color: rgba(255, 186, 82, 0.24);
  background: linear-gradient(180deg, rgba(255, 251, 240, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.settings-model-library__summary-wrap,
.settings-model-library__summary,
.settings-model-library__hero-actions,
.settings-model-library__item-tags,
.settings-model-library__template-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-model-library__summary-wrap {
  flex-direction: column;
  align-items: flex-start;
}

.settings-model-library__summary-text {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.92rem;
  line-height: 1.6;
}

.settings-model-library__save-notice-title,
.settings-model-library__draft-notice {
  color: var(--color-ink, #24324a);
  font-weight: 800;
}

.settings-model-library__save-notice-text,
.settings-model-library__draft-notice {
  margin: 0;
  line-height: 1.6;
}

.settings-model-library__save-notice-text {
  color: var(--color-ink-soft, #5b6984);
}

.settings-model-library__draft-notice {
  padding: 12px 14px;
  border: 1px solid rgba(124, 216, 184, 0.26);
  border-radius: 16px;
  background: rgba(244, 252, 248, 0.94);
}

.settings-model-library__filters {
  align-items: end;
}

.settings-model-library__filter-actions {
  display: flex;
  justify-content: flex-end;
}

.settings-model-library__draft-test-status {
  padding: 12px 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(247, 251, 255, 0.92) 0%, rgba(242, 247, 252, 0.88) 100%);
}

.settings-model-library__list {
  display: grid;
  gap: 12px;
}

.settings-model-library__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.settings-model-library__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-model-library__item-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.settings-model-library__item-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.settings-model-library__item-title,
.settings-model-library__empty-title {
  color: var(--color-ink, #24324a);
  font-size: 1rem;
  line-height: 1.4;
}

.settings-model-library__item-note,
.settings-model-library__empty-text {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  line-height: 1.6;
}

.settings-model-library__test-status {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.88rem;
  line-height: 1.55;
}

.settings-model-library__test-status--success {
  color: #2c7a62;
}

.settings-model-library__test-status--error {
  color: #a14b61;
}

.settings-model-library__tag,
.settings-model-library__action,
.settings-model-library__remove,
.settings-model-library__template-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(247, 251, 255, 0.88);
  color: var(--color-ink-soft, #5b6984);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
}

.settings-model-library__action,
.settings-model-library__remove {
  color: var(--color-ink, #24324a);
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.settings-model-library__action:hover,
.settings-model-library__action:focus-visible,
.settings-model-library__remove:hover,
.settings-model-library__remove:focus-visible {
  border-color: rgba(124, 216, 184, 0.34);
  background: rgba(244, 252, 248, 0.96);
  outline: none;
  transform: translateY(-1px);
}

.settings-model-library__provider-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-model-library__field-help,
.settings-model-library__empty {
  margin: 0;
}

.settings-model-library__field-help,
.settings-model-library__empty-text {
  color: var(--color-ink-soft, #5b6984);
  line-height: 1.6;
}

.settings-model-library__secret-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
}

.settings-model-library__empty {
  display: grid;
  gap: 8px;
}

.settings-model-library__empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-model-library__dialog {
  width: min(1120px, calc(100vw - 40px));
  border: 1px solid rgba(36, 50, 74, 0.14);
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.985) 0%, rgba(241, 246, 252, 0.96) 100%);
  box-shadow:
    0 34px 72px -42px rgba(18, 29, 48, 0.58),
    0 18px 32px -28px rgba(18, 29, 48, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.settings-model-library__dialog::before {
  top: -72px;
  right: -64px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(173, 225, 211, 0.18) 0%, rgba(173, 225, 211, 0) 72%);
}

.settings-model-library__dialog .modal-dialog__header {
  padding: 24px 24px 18px;
  border-bottom: 1px solid rgba(36, 50, 74, 0.07);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.08) 100%);
}

.settings-model-library__dialog .modal-dialog__copy {
  gap: 10px;
}

.settings-model-library__dialog .modal-dialog__eyebrow {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.settings-model-library__dialog .modal-dialog__title {
  font-size: 1.92rem;
  line-height: 1.02;
}

.settings-model-library__dialog .modal-dialog__close {
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.8);
}

.settings-model-library__dialog .modal-dialog__close:hover:not(:disabled) {
  border-color: rgba(124, 216, 184, 0.44);
  background: rgba(248, 252, 250, 0.92);
  box-shadow: 0 14px 24px -24px rgba(36, 50, 74, 0.34);
}

.settings-model-library__dialog .modal-dialog__content {
  padding: 18px 24px 24px;
}

.settings-model-library__modal-body {
  display: grid;
  gap: 12px;
}

.settings-model-library__inline-banner {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(248, 251, 253, 0.94) 0%, rgba(244, 248, 251, 0.9) 100%);
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.86rem;
  line-height: 1.5;
}

.settings-model-library__group {
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.07);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(250, 252, 255, 0.98) 0%, rgba(246, 249, 252, 0.94) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 12px 20px -30px rgba(36, 50, 74, 0.22);
}

.settings-model-library__memory-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(124, 216, 184, 0.18);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(246, 251, 249, 0.96) 0%, rgba(250, 253, 252, 0.92) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.76),
    0 10px 18px -28px rgba(36, 50, 74, 0.22);
}

.settings-model-library__memory-inline {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
  margin: 0;
}

.settings-model-library__memory-eyebrow,
.settings-model-library__group-eyebrow,
.settings-model-library__focus-eyebrow {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings-model-library__memory-text,
.settings-model-library__group-note,
.settings-model-library__focus-text,
.settings-model-library__focus-list {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  line-height: 1.55;
}

.settings-model-library__memory-text {
  min-width: 0;
  font-size: 0.88rem;
}

.settings-model-library__dialog-main {
  display: grid;
  gap: 10px;
}

.settings-model-library__group {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.settings-model-library__group-head {
  display: grid;
  gap: 4px;
}

.settings-model-library__group-title {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-size: 0.95rem;
  line-height: 1.25;
}

.settings-model-library__group-note,
.settings-model-library__field-help {
  font-size: 0.84rem;
}

.settings-model-library__dialog-form {
  gap: 10px 12px;
  align-items: start;
}

.settings-model-library__dialog-form--tts {
  grid-template-columns: minmax(0, 1.55fr) minmax(180px, 0.82fr);
}

.settings-model-library__dialog-field {
  display: grid;
  gap: 8px;
  min-width: 0;
  align-content: start;
}

.settings-model-library__field-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.settings-model-library__field-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.settings-model-library__field-badge--required {
  background: rgba(245, 195, 89, 0.18);
  color: #a26d19;
}

.settings-model-library__field-badge--optional {
  background: rgba(91, 105, 132, 0.1);
  color: var(--color-ink-soft, #5b6984);
}

.settings-model-library__dialog-field > .settings-input,
.settings-model-library__dialog-field > .quiz-toolbar__select,
.settings-model-library__secret-row > .settings-input {
  width: 100%;
  min-width: 0;
  align-self: start;
}

.settings-model-library__dialog-field > .settings-input,
.settings-model-library__secret-row > .settings-input {
  min-height: 46px;
  border-color: rgba(36, 50, 74, 0.12);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.settings-model-library__dialog-field > .quiz-toolbar__select {
  min-height: 46px;
  min-width: 0;
  padding: 10px 40px 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 16px;
  background:
    linear-gradient(45deg, transparent 50%, rgba(36, 50, 74, 0.55) 50%),
    linear-gradient(135deg, rgba(36, 50, 74, 0.55) 50%, transparent 50%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 249, 252, 0.96) 100%);
  background-position:
    calc(100% - 18px) calc(50% - 2px),
    calc(100% - 12px) calc(50% - 2px),
    0 0;
  background-size: 6px 6px, 6px 6px, 100% 100%;
  background-repeat: no-repeat;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.settings-model-library__inline-note {
  padding: 12px 14px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(247, 250, 253, 0.9) 0%, rgba(255, 255, 255, 0.84) 100%);
}

.settings-model-library__suggestions {
  display: grid;
  gap: 10px;
  padding-top: 0;
}

.settings-model-library__suggestion-group {
  display: grid;
  gap: 5px;
}

.settings-model-library__suggestion-group-title {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.settings-model-library__suggestion-group-items {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.settings-model-library__suggestion-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 11px;
  border: 1px solid rgba(124, 216, 184, 0.2);
  border-radius: 999px;
  background: rgba(243, 250, 247, 0.94);
  color: var(--color-ink, #24324a);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.settings-model-library__suggestion-chip:hover,
.settings-model-library__suggestion-chip:focus-visible {
  border-color: rgba(124, 216, 184, 0.48);
  background: rgba(236, 249, 243, 0.98);
  outline: none;
  transform: translateY(-1px);
}

.settings-model-library__suggestion-chip--emphasis {
  border-color: rgba(124, 216, 184, 0.36);
  background: rgba(236, 249, 243, 0.96);
  color: var(--color-ink, #24324a);
}

@media (max-width: 900px) {
  .settings-model-library__dialog-form--tts {
    grid-template-columns: minmax(0, 1fr);
  }
}

.settings-model-library__modal-actions {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 0 2px;
  border-top: 1px solid rgba(36, 50, 74, 0.06);
  background: linear-gradient(180deg, rgba(246, 249, 252, 0) 0%, rgba(246, 249, 252, 0.88) 20%, rgba(246, 249, 252, 0.96) 100%);
  backdrop-filter: blur(4px);
}

.settings-model-library__modal-actions .settings-model-library__action:first-child {
  margin-right: auto;
}

.settings-model-library__modal-actions .btn-cartoon,
.settings-model-library__modal-actions .settings-model-library__action {
  min-height: 40px;
}

.settings-model-library__modal-actions .settings-model-library__action {
  min-height: 34px;
  padding: 6px 12px;
  border-color: rgba(36, 50, 74, 0.08);
  background: rgba(248, 251, 255, 0.72);
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.78rem;
  font-weight: 700;
}

.settings-model-library__modal-actions .btn-cartoon:disabled {
  opacity: 0.58;
  box-shadow: 2px 2px 0px rgba(36, 50, 74, 0.18);
}

.settings-model-library__modal-cancel {
  border-color: rgba(36, 50, 74, 0.1);
  background: rgba(255, 255, 255, 0.78);
  color: var(--color-ink-soft, #5b6984);
  box-shadow: 2px 2px 0px rgba(36, 50, 74, 0.16);
}

.settings-model-library__modal-cancel:hover {
  background: rgba(250, 252, 255, 0.9);
}

.settings-model-library__modal-actions .btn-cartoon--mint {
  box-shadow: 3px 3px 0px rgba(36, 50, 74, 0.2);
}

.settings-model-library__template-list {
  gap: 8px;
}

.settings-model-library__template-chip {
  background: rgba(250, 252, 255, 0.92);
}

.settings-model-library__memory-banner .settings-model-library__action {
  background: rgba(248, 251, 255, 0.96);
}

@media (max-width: 720px) {
  .settings-model-library__dialog {
    width: min(100%, calc(100vw - 24px));
  }

  .settings-model-library__dialog .modal-dialog__header {
    padding: 20px 18px 16px;
  }

  .settings-model-library__dialog .modal-dialog__title {
    font-size: 1.64rem;
  }

  .settings-model-library__dialog .modal-dialog__content {
    padding: 16px 18px 18px;
  }

  .settings-model-library__hero,
  .settings-model-library__item,
  .settings-model-library__item-topline {
    align-items: flex-start;
  }

  .settings-model-library__hero,
  .settings-model-library__item {
    flex-direction: column;
  }

  .settings-model-library__filter-actions {
    justify-content: flex-start;
  }

  .settings-model-library__secret-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-model-library__memory-banner,
  .settings-model-library__dialog-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-model-library__memory-banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .settings-model-library__modal-actions {
    justify-content: stretch;
  }

  .settings-model-library__modal-actions .settings-model-library__action:first-child {
    margin-right: 0;
  }

  .settings-model-library__modal-actions .btn-cartoon,
  .settings-model-library__modal-actions .settings-model-library__action {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
