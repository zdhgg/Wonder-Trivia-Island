<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { testAiRuntimeConnection } from "../services/questionsApi";
import { useAudioStore } from "../stores/useAudioStore";
import SettingsAiSection from "./settings/SettingsAiSection.vue";
import SettingsAudioSection from "./settings/SettingsAudioSection.vue";
import SettingsBackupSection from "./settings/SettingsBackupSection.vue";
import SettingsCoachingSection from "./settings/SettingsCoachingSection.vue";
import SettingsLogsSection from "./settings/SettingsLogsSection.vue";
import SettingsModelLibrarySection from "./settings/SettingsModelLibrarySection.vue";
import SettingsOverviewSection from "./settings/SettingsOverviewSection.vue";
import SettingsProfileSection from "./settings/SettingsProfileSection.vue";
import { getSettingsSectionById, SETTINGS_SECTION_IDS } from "./settings/settingsSections";
import {
  AI_MODEL_LIBRARY_TYPE_OPTIONS,
  AI_REVIEW_LENGTH_OPTIONS,
  AI_REVIEW_SPEED_OPTIONS,
  AI_REVIEW_VOICE_OPTIONS,
  AI_MODEL_MODE,
  AUTO_ADVANCE_DELAY_OPTIONS,
  HOME_WELCOME_VOICE_MODE_OPTIONS,
  PROFILE_GENDER_OPTIONS,
  resolveAiRuntimeConfigForSelection,
  resolveAiRuntimeLabelForSelection,
  useSettingsStore
} from "../stores/useSettingsStore";

const props = defineProps({
  activeSectionId: {
    type: String,
    default: "settings-overview"
  },
  showHero: {
    type: Boolean,
    default: true
  },
  backupStatusMessage: {
    type: String,
    default: ""
  },
  isBackupBusy: {
    type: Boolean,
    default: false
  },
  backupStats: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["profile-saved", "export-backup", "import-backup", "dirty-state-change", "section-select"]);

const settingsStore = useSettingsStore();
const audioStore = useAudioStore();
settingsStore.hydrate();
audioStore.hydratePreferences();

const activeSectionShellRef = ref(null);
const shouldApplyProfileDefaults = ref(true);
const aiConnectionTestStatus = ref("idle");
const aiConnectionTestResult = ref(null);
const aiConnectionTestErrorMessage = ref("");
let sectionFocusFrame = 0;
let aiConnectionTestController = null;

const { profile, aiPreferences, coachingPreferences, activityLogs } = storeToRefs(settingsStore);
const { isSupported, masterVolume, musicEnabled, sfxEnabled } = storeToRefs(audioStore);
const SECTION_COMPONENTS = Object.freeze({
  "settings-overview": SettingsOverviewSection,
  "settings-profile": SettingsProfileSection,
  "settings-ai": SettingsAiSection,
  "settings-model-library": SettingsModelLibrarySection,
  "settings-coaching": SettingsCoachingSection,
  "settings-audio": SettingsAudioSection,
  "settings-backup": SettingsBackupSection,
  "settings-logs": SettingsLogsSection
});

const profileDraft = ref({
  displayName: "",
  gender: PROFILE_GENDER_OPTIONS[0],
  grade: "",
  semester: "上册"
});

const aiDraft = ref(createAiPreferencesDraft());

const coachingDraft = ref({
  autoAdvanceOnCorrect: false,
  autoPlayAiReviewOnWrong: false,
  autoPlayAiReviewOnCorrect: false,
  homeWelcomeVoiceMode: "manual",
  autoAdvanceDelayMs: 1500,
  aiReviewVoice: "coral",
  aiReviewSpeed: 1,
  aiReviewLength: "standard"
});

const gradeOptions = Object.freeze(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);
const semesterOptions = Object.freeze(["上册", "下册"]);

function createAiModelDraft(defaultPresetModel = "") {
  return {
    mode: AI_MODEL_MODE.SERVICE_DEFAULT,
    presetModel: defaultPresetModel,
    customModel: ""
  };
}

function createAiPreferencesDraft() {
  return {
    questionModel: createAiModelDraft("gpt-5.4-mini"),
    reviewModel: createAiModelDraft("gpt-5.4-mini"),
    ttsModel: createAiModelDraft("gpt-4o-mini-tts"),
    customModelLibrary: []
  };
}

function cloneAiPreferencesDraft(source = {}) {
  return {
    questionModel: {
      ...createAiModelDraft("gpt-5.4-mini"),
      ...(source.questionModel || {})
    },
    reviewModel: {
      ...createAiModelDraft("gpt-5.4-mini"),
      ...(source.reviewModel || {})
    },
    ttsModel: {
      ...createAiModelDraft("gpt-4o-mini-tts"),
      ...(source.ttsModel || {})
    },
    customModelLibrary: Array.isArray(source.customModelLibrary)
      ? source.customModelLibrary.map((item) => (item && typeof item === "object" ? { ...item } : item))
      : []
  };
}

function isAiModelSelectionDirty(draftSelection = {}, savedSelection = {}) {
  return (
    draftSelection.mode !== savedSelection.mode ||
    draftSelection.presetModel !== savedSelection.presetModel ||
    draftSelection.customModel !== savedSelection.customModel
  );
}

function resolveDraftAiSelectionModel(selection = {}) {
  if (selection.mode === AI_MODEL_MODE.CUSTOM) {
    return String(selection.customModel || "").trim();
  }

  if (selection.mode === AI_MODEL_MODE.PRESET) {
    return String(selection.presetModel || "").trim();
  }

  return "";
}

function buildDraftServiceProbeConfig() {
  return [
    {
      key: "questionModel",
      label: "出题模型",
      model: resolveDraftAiSelectionModel(aiDraft.value.questionModel),
      runtime: resolveAiRuntimeConfigForSelection(aiDraft.value.questionModel, aiDraft.value.customModelLibrary),
      runtimeLabel: resolveAiRuntimeLabelForSelection(aiDraft.value.questionModel, aiDraft.value.customModelLibrary),
      payload: {
        questionModel: resolveDraftAiSelectionModel(aiDraft.value.questionModel)
      }
    },
    {
      key: "reviewModel",
      label: "点评模型",
      model: resolveDraftAiSelectionModel(aiDraft.value.reviewModel),
      runtime: resolveAiRuntimeConfigForSelection(aiDraft.value.reviewModel, aiDraft.value.customModelLibrary),
      runtimeLabel: resolveAiRuntimeLabelForSelection(aiDraft.value.reviewModel, aiDraft.value.customModelLibrary),
      payload: {
        reviewModel: resolveDraftAiSelectionModel(aiDraft.value.reviewModel)
      }
    },
    {
      key: "ttsModel",
      label: "语音模型",
      model: resolveDraftAiSelectionModel(aiDraft.value.ttsModel),
      runtime: resolveAiRuntimeConfigForSelection(aiDraft.value.ttsModel, aiDraft.value.customModelLibrary),
      runtimeLabel: resolveAiRuntimeLabelForSelection(aiDraft.value.ttsModel, aiDraft.value.customModelLibrary),
      payload: {
        ttsModel: resolveDraftAiSelectionModel(aiDraft.value.ttsModel)
      }
    }
  ];
}

function resetAiConnectionTestState() {
  aiConnectionTestStatus.value = "idle";
  aiConnectionTestResult.value = null;
  aiConnectionTestErrorMessage.value = "";
}

const normalizedActiveSectionId = computed(() =>
  SETTINGS_SECTION_IDS.includes(String(props.activeSectionId || "").trim()) ? String(props.activeSectionId).trim() : "settings-overview"
);
const activityLogItems = computed(() => activityLogs.value.slice(0, 12));
const accountSummary = computed(() => `${profile.value.displayName} · ${profile.value.grade} · ${profile.value.semester}`);
const profileUpdatedLabel = computed(() => formatTimestamp(profile.value.updatedAt));
const aiUpdatedLabel = computed(() => formatTimestamp(aiPreferences.value.updatedAt));
const coachingUpdatedLabel = computed(() => formatTimestamp(coachingPreferences.value.updatedAt));
const profileDirty = computed(
  () =>
    profileDraft.value.displayName !== profile.value.displayName ||
    profileDraft.value.gender !== profile.value.gender ||
    profileDraft.value.grade !== profile.value.grade ||
    profileDraft.value.semester !== profile.value.semester
);
const aiDirty = computed(
  () =>
    isAiModelSelectionDirty(aiDraft.value.questionModel, aiPreferences.value.questionModel) ||
    isAiModelSelectionDirty(aiDraft.value.reviewModel, aiPreferences.value.reviewModel) ||
    isAiModelSelectionDirty(aiDraft.value.ttsModel, aiPreferences.value.ttsModel) ||
    JSON.stringify(aiDraft.value.customModelLibrary) !== JSON.stringify(aiPreferences.value.customModelLibrary)
);
const coachingDirty = computed(
  () =>
    coachingDraft.value.autoAdvanceOnCorrect !== coachingPreferences.value.autoAdvanceOnCorrect ||
    coachingDraft.value.autoPlayAiReviewOnWrong !== coachingPreferences.value.autoPlayAiReviewOnWrong ||
    coachingDraft.value.autoPlayAiReviewOnCorrect !== coachingPreferences.value.autoPlayAiReviewOnCorrect ||
    coachingDraft.value.homeWelcomeVoiceMode !== coachingPreferences.value.homeWelcomeVoiceMode ||
    coachingDraft.value.autoAdvanceDelayMs !== coachingPreferences.value.autoAdvanceDelayMs ||
    coachingDraft.value.aiReviewVoice !== coachingPreferences.value.aiReviewVoice ||
    coachingDraft.value.aiReviewSpeed !== coachingPreferences.value.aiReviewSpeed ||
    coachingDraft.value.aiReviewLength !== coachingPreferences.value.aiReviewLength
);
const audioSectionSummary = computed(() => {
  if (!isSupported.value) {
    return "当前设备不支持音频输出。";
  }

  if (masterVolume.value <= 0 || (!musicEnabled.value && !sfxEnabled.value)) {
    return "当前音频处于静音或通道关闭状态。";
  }

  return `主音量 ${Math.round(masterVolume.value * 100)}% · ${musicEnabled.value ? "背景音乐开启" : "背景音乐关闭"} · ${sfxEnabled.value ? "答题音效开启" : "答题音效关闭"}`;
});
const backupSectionSummary = computed(() =>
  props.backupStatusMessage || (props.backupStats.length ? `当前可查看 ${props.backupStats.length} 项本机摘要。` : "可导出或恢复本机 JSON 备份。")
);
const logsSectionSummary = computed(() =>
  activityLogItems.value.length > 0 ? `最近记录 ${activityLogItems.value.length} 条关键操作。` : "当前还没有记录到关键操作。"
);
const overviewCards = computed(() => [
  {
    id: "settings-profile",
    eyebrow: "Profile",
    title: getSettingsSectionById("settings-profile").sectionTitle,
    summary: accountSummary.value,
    detail: profileDirty.value ? "当前有未保存的档案改动。" : `最近更新 ${profileUpdatedLabel.value}`,
    tone: profileDirty.value ? "warning" : "neutral"
  },
  {
    id: "settings-ai",
    eyebrow: "AI Setup",
    title: getSettingsSectionById("settings-ai").sectionTitle,
    summary: settingsStore.aiConfigurationSummary,
    detail: aiDirty.value ? "当前有未保存的模型配置改动。" : `最近更新 ${aiUpdatedLabel.value}`,
    tone: aiDirty.value ? "warning" : "neutral"
  },
  {
    id: "settings-coaching",
    eyebrow: "Study Coach",
    title: getSettingsSectionById("settings-coaching").sectionTitle,
    summary: [
      coachingDraft.value.autoAdvanceOnCorrect ? "答对自动继续" : "答对停留看反馈",
      coachingDraft.value.autoPlayAiReviewOnWrong ? "答错自动播报" : "答错手动播报"
    ].join(" · "),
    detail: coachingDirty.value ? "当前有未保存的陪练偏好改动。" : `最近更新 ${coachingUpdatedLabel.value}`,
    tone: coachingDirty.value ? "warning" : "neutral"
  },
  {
    id: "settings-audio",
    eyebrow: "Audio",
    title: getSettingsSectionById("settings-audio").sectionTitle,
    summary: audioSectionSummary.value,
    detail: "音量和通道开关会即时生效，并自动保存在本机。",
    tone: "neutral"
  },
  {
    id: "settings-backup",
    eyebrow: "Backup",
    title: getSettingsSectionById("settings-backup").sectionTitle,
    summary: backupSectionSummary.value,
    detail: "支持导出当前学习环境，或从 JSON 恢复本机数据。",
    tone: props.isBackupBusy ? "info" : "neutral"
  },
  {
    id: "settings-logs",
    eyebrow: "Activity Log",
    title: getSettingsSectionById("settings-logs").sectionTitle,
    summary: logsSectionSummary.value,
    detail: "可查看最近关键操作，并按需清空本机记录。",
    tone: "neutral"
  }
]);
const SECTION_SAVE_CONFIG = Object.freeze({
  "settings-profile": {
    title: "学习档案",
    detailWhenDirty: "当前分区有未保存改动。",
    detailWhenClean: "当前分区已经保存到本机。",
    cleanActionLabel: "档案已保存",
    dirtyActionLabel: "保存档案"
  },
  "settings-ai": {
    title: "AI 配置",
    detailWhenDirty: "当前分区有未保存改动。",
    detailWhenClean: "当前分区已经保存到本机。",
    cleanActionLabel: "AI 已保存",
    dirtyActionLabel: "保存 AI 配置"
  },
  "settings-model-library": {
    title: "模型管理",
    detailWhenDirty: "模型资产改动会和 AI 配置一起保存。",
    detailWhenClean: "当前模型资产已经保存到本机。",
    cleanActionLabel: "AI 已保存",
    dirtyActionLabel: "保存 AI 配置"
  },
  "settings-coaching": {
    title: "学习陪练",
    detailWhenDirty: "当前分区有未保存改动。",
    detailWhenClean: "当前分区已经保存到本机。",
    cleanActionLabel: "陪练已保存",
    dirtyActionLabel: "保存陪练偏好"
  }
});
const pendingSaveSections = computed(() => {
  const sections = [];

  if (profileDirty.value) {
    sections.push("settings-profile");
  }

  if (aiDirty.value) {
    sections.push("settings-ai");
  }

  if (coachingDirty.value) {
    sections.push("settings-coaching");
  }

  return sections;
});
const pendingSaveOverviewItems = computed(() =>
  pendingSaveSections.value.map((sectionId) => ({
    id: sectionId,
    title: getSettingsSectionById(sectionId).sectionTitle,
    actionLabel: SECTION_SAVE_CONFIG[sectionId]?.dirtyActionLabel || "保存当前分区"
  }))
);
const currentSaveSectionConfig = computed(() => SECTION_SAVE_CONFIG[normalizedActiveSectionId.value] || null);
const currentSectionIsDirty = computed(() => {
  if (normalizedActiveSectionId.value === "settings-profile") {
    return profileDirty.value;
  }

  if (normalizedActiveSectionId.value === "settings-ai") {
    return aiDirty.value;
  }

  if (normalizedActiveSectionId.value === "settings-model-library") {
    return aiDirty.value;
  }

  if (normalizedActiveSectionId.value === "settings-coaching") {
    return coachingDirty.value;
  }

  return false;
});
const showStickyActionBar = computed(
  () => normalizedActiveSectionId.value !== "settings-overview" || pendingSaveSections.value.length > 0
);
const stickyBarTitle = computed(() => {
  if (normalizedActiveSectionId.value === "settings-overview") {
    return pendingSaveSections.value.length > 0 ? "还有改动未保存" : "当前已同步";
  }

  return currentSaveSectionConfig.value?.title || overviewCards.value.find((card) => card.id === normalizedActiveSectionId.value)?.title || "当前分区";
});
const stickyBarDetail = computed(() => {
  if (normalizedActiveSectionId.value === "settings-overview") {
    const pendingTitles = pendingSaveOverviewItems.value.map((item) => item.title);

    return pendingSaveSections.value.length > 0
      ? `${pendingTitles.join("、")} 还没保存。`
      : "没有待保存改动。";
  }

  if (currentSaveSectionConfig.value) {
    return currentSectionIsDirty.value
      ? "有未保存改动。"
      : "已保存到本机。";
  }

  if (normalizedActiveSectionId.value === "settings-audio") {
    return "即改即生效，无需保存。";
  }

  if (normalizedActiveSectionId.value === "settings-backup") {
    return "即时操作，确认后直接执行。";
  }

  if (normalizedActiveSectionId.value === "settings-logs") {
    return "查看和清理都会即时生效。";
  }

  return "当前分区可单独处理。";
});
const showCurrentSectionSaveAction = computed(() => Boolean(currentSaveSectionConfig.value));
const currentSectionSaveLabel = computed(() => {
  if (!currentSaveSectionConfig.value) {
    return "";
  }

  return currentSectionIsDirty.value
    ? currentSaveSectionConfig.value.dirtyActionLabel
    : currentSaveSectionConfig.value.cleanActionLabel;
});
const showSaveAllAction = computed(() => {
  if (pendingSaveSections.value.length <= 1) {
    return false;
  }

  if (normalizedActiveSectionId.value === "settings-overview" || !showCurrentSectionSaveAction.value) {
    return true;
  }

  if (!currentSectionIsDirty.value) {
    return true;
  }

  return true;
});
const saveAllActionLabel = computed(
  () => (pendingSaveSections.value.length > 1 ? `保存全部 ${pendingSaveSections.value.length} 项改动` : "保存全部改动")
);
const activeSectionComponent = computed(
  () => SECTION_COMPONENTS[normalizedActiveSectionId.value] || SettingsOverviewSection
);
const activeSectionProps = computed(() => {
  switch (normalizedActiveSectionId.value) {
    case "settings-profile":
      return {
        profileDraft: profileDraft.value,
        profileDirty: profileDirty.value,
        profileUpdatedLabel: profileUpdatedLabel.value,
        genderOptions: PROFILE_GENDER_OPTIONS,
        gradeOptions,
        semesterOptions,
        shouldApplyProfileDefaults: shouldApplyProfileDefaults.value
      };
    case "settings-ai":
      return {
        aiDraft: aiDraft.value,
        aiDirty: aiDirty.value,
        aiUpdatedLabel: aiUpdatedLabel.value,
        aiModelMode: AI_MODEL_MODE,
        aiConnectionTestStatus: aiConnectionTestStatus.value,
        aiConnectionTestResult: aiConnectionTestResult.value,
        aiConnectionTestErrorMessage: aiConnectionTestErrorMessage.value,
        effectiveQuestionModelLabel: settingsStore.effectiveQuestionModelLabel,
        effectiveReviewModelLabel: settingsStore.effectiveReviewModelLabel,
        effectiveTtsModelLabel: settingsStore.effectiveTtsModelLabel
      };
    case "settings-model-library":
      return {
        aiDraft: aiDraft.value,
        aiDirty: aiDirty.value,
        aiUpdatedLabel: aiUpdatedLabel.value,
        aiModelLibraryTypeOptions: AI_MODEL_LIBRARY_TYPE_OPTIONS
      };
    case "settings-coaching":
      return {
        coachingDraft: coachingDraft.value,
        coachingDirty: coachingDirty.value,
        coachingUpdatedLabel: coachingUpdatedLabel.value,
        autoAdvanceDelayOptions: AUTO_ADVANCE_DELAY_OPTIONS,
        aiReviewVoiceOptions: AI_REVIEW_VOICE_OPTIONS,
        aiReviewSpeedOptions: AI_REVIEW_SPEED_OPTIONS,
        aiReviewLengthOptions: AI_REVIEW_LENGTH_OPTIONS,
        homeWelcomeVoiceModeOptions: HOME_WELCOME_VOICE_MODE_OPTIONS
      };
    case "settings-backup":
      return {
        isBackupBusy: props.isBackupBusy,
        backupStatusMessage: props.backupStatusMessage,
        backupStats: props.backupStats
      };
    case "settings-logs":
      return {
        activityLogItems: activityLogItems.value,
        formatTimestamp
      };
    case "settings-overview":
      return {
        cards: overviewCards.value,
        pendingSaveCards: pendingSaveOverviewItems.value
      };
    case "settings-audio":
    default:
      return {};
  }
});
const activeSectionListeners = computed(() => {
  switch (normalizedActiveSectionId.value) {
    case "settings-profile":
      return {
        "update:should-apply-profile-defaults": (value) => {
          shouldApplyProfileDefaults.value = value;
        }
      };
    case "settings-ai":
      return {
        save: handleSaveAiPreferences,
        "test-connection": handleTestAiConnection,
        "open-model-manager": () => handleSectionOpen("settings-model-library")
      };
    case "settings-model-library":
      return {
        "back-to-ai": () => handleSectionOpen("settings-ai")
      };
    case "settings-coaching":
      return {
        save: handleSaveCoachingPreferences
      };
    case "settings-backup":
      return {
        "export-backup": () => emit("export-backup"),
        "import-backup": (file) => emit("import-backup", file)
      };
    case "settings-logs":
      return {
        "clear-logs": handleClearActivityLogs
      };
    case "settings-overview":
      return {
        "open-section": handleSectionOpen
      };
    default:
      return {};
  }
});

watch(
  profile,
  (nextProfile) => {
    profileDraft.value = {
      displayName: nextProfile.displayName,
      gender: nextProfile.gender,
      grade: nextProfile.grade,
      semester: nextProfile.semester
    };
  },
  { deep: true, immediate: true }
);

watch(
  aiPreferences,
  (nextPreferences) => {
    aiDraft.value = cloneAiPreferencesDraft(nextPreferences);
  },
  { deep: true, immediate: true }
);

watch(
  aiDraft,
  () => {
    if (aiConnectionTestStatus.value !== "idle") {
      resetAiConnectionTestState();
    }
  },
  { deep: true }
);

watch(
  coachingPreferences,
  (nextPreferences) => {
    coachingDraft.value = {
      autoAdvanceOnCorrect: nextPreferences.autoAdvanceOnCorrect,
      autoPlayAiReviewOnWrong: nextPreferences.autoPlayAiReviewOnWrong,
      autoPlayAiReviewOnCorrect: nextPreferences.autoPlayAiReviewOnCorrect,
      homeWelcomeVoiceMode: nextPreferences.homeWelcomeVoiceMode,
      autoAdvanceDelayMs: nextPreferences.autoAdvanceDelayMs,
      aiReviewVoice: nextPreferences.aiReviewVoice,
      aiReviewSpeed: nextPreferences.aiReviewSpeed,
      aiReviewLength: nextPreferences.aiReviewLength
    };
  },
  { deep: true, immediate: true }
);

watch(
  [profileDirty, aiDirty, coachingDirty],
  ([nextProfileDirty, nextAiDirty, nextCoachingDirty]) => {
    emit("dirty-state-change", {
      profile: nextProfileDirty,
      ai: nextAiDirty,
      coaching: nextCoachingDirty
    });
  },
  { immediate: true }
);

function formatTimestamp(value) {
  if (!value) {
    return "刚刚更新";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "最近更新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function handleSaveProfile() {
  const savedProfile = settingsStore.saveProfile(profileDraft.value);
  emit("profile-saved", {
    profile: savedProfile,
    applyToHome: shouldApplyProfileDefaults.value
  });
}

function handleSaveAiPreferences() {
  settingsStore.saveAiPreferences(aiDraft.value);
}

async function handleTestAiConnection() {
  aiConnectionTestController?.abort();
  aiConnectionTestController = new AbortController();
  aiConnectionTestStatus.value = "loading";
  aiConnectionTestResult.value = null;
  aiConnectionTestErrorMessage.value = "";

  try {
    const probeConfigs = buildDraftServiceProbeConfig();
    const probeResults = await Promise.all(
      probeConfigs.map(async (probeConfig) => {
        try {
          const payload = await testAiRuntimeConnection({
            ...probeConfig.payload,
            ...(probeConfig.runtime ? { aiRuntime: probeConfig.runtime } : {}),
            signal: aiConnectionTestController.signal
          });
          const matchedTest = payload?.data?.tests?.find((item) => item.key === probeConfig.key) || null;

          return {
            key: probeConfig.key,
            label: probeConfig.label,
            runtimeLabel: probeConfig.runtimeLabel,
            checkedAt: payload?.data?.checkedAt || "",
            providerLabel: payload?.data?.provider?.label || probeConfig.runtimeLabel,
            test: matchedTest || {
              key: probeConfig.key,
              label: probeConfig.label,
              ok: false,
              model: probeConfig.model || "跟随服务端默认",
              detail: "测试结果缺失。"
            }
          };
        } catch (error) {
          if (error?.name === "AbortError") {
            throw error;
          }

          return {
            key: probeConfig.key,
            label: probeConfig.label,
            runtimeLabel: probeConfig.runtimeLabel,
            checkedAt: new Date().toISOString(),
            providerLabel: probeConfig.runtimeLabel,
            test: {
              key: probeConfig.key,
              label: probeConfig.label,
              ok: false,
              model: probeConfig.model || "跟随服务端默认",
              detail: error?.message || "连接测试失败。"
            }
          };
        }
      })
    );

    aiConnectionTestResult.value = {
      checkedAt: probeResults.reduce((latest, item) => (!latest || item.checkedAt > latest ? item.checkedAt : latest), ""),
      provider: {
        label: "按模型设置自动选择"
      },
      allPassed: probeResults.every((item) => item.test.ok),
      tests: probeResults.map((item) => ({
        ...item.test,
        runtimeLabel: item.runtimeLabel,
        providerLabel: item.providerLabel
      }))
    };
    aiConnectionTestStatus.value = "ready";
    settingsStore.appendActivityLog({
      scope: "ai",
      title: "AI 连接测试已完成",
      detail: aiConnectionTestResult.value.allPassed ? "全部模型通过" : "部分模型不可用"
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    aiConnectionTestStatus.value = "error";
    aiConnectionTestErrorMessage.value = error?.message || "AI 连接测试失败。";
  } finally {
    aiConnectionTestController = null;
  }
}

function handleSaveCoachingPreferences() {
  settingsStore.saveCoachingPreferences(coachingDraft.value);
}

function handleSaveCurrentSection() {
  if (normalizedActiveSectionId.value === "settings-profile") {
    handleSaveProfile();
    return;
  }

  if (normalizedActiveSectionId.value === "settings-ai") {
    handleSaveAiPreferences();
    return;
  }

  if (normalizedActiveSectionId.value === "settings-model-library") {
    handleSaveAiPreferences();
    return;
  }

  if (normalizedActiveSectionId.value === "settings-coaching") {
    handleSaveCoachingPreferences();
  }
}

function handleSaveAllDirtySections() {
  if (profileDirty.value) {
    handleSaveProfile();
  }

  if (aiDirty.value) {
    handleSaveAiPreferences();
  }

  if (coachingDirty.value) {
    handleSaveCoachingPreferences();
  }
}

function handleSectionOpen(sectionId) {
  emit("section-select", sectionId);
}

function handleClearActivityLogs() {
  if (typeof window !== "undefined") {
    const shouldClear = window.confirm("清空后当前设备上的设置操作记录会被移除，是否继续？");

    if (!shouldClear) {
      return;
    }
  }

  settingsStore.clearActivityLogs();
}

function focusActiveSectionHeading() {
  if (typeof window === "undefined") {
    return;
  }

  nextTick(() => {
    if (sectionFocusFrame) {
      window.cancelAnimationFrame(sectionFocusFrame);
    }

    sectionFocusFrame = window.requestAnimationFrame(() => {
      sectionFocusFrame = 0;
      const headingElement = activeSectionShellRef.value?.querySelector("[data-settings-section-focus]");

      if (headingElement && typeof headingElement.focus === "function") {
        headingElement.focus({ preventScroll: true });
      }
    });
  });
}

watch(
  normalizedActiveSectionId,
  (nextSectionId, previousSectionId) => {
    if (!previousSectionId || nextSectionId === previousSectionId) {
      return;
    }

    focusActiveSectionHeading();
  }
);
</script>

<template>
  <div class="settings-center">
    <section v-if="showHero" id="settings-overview" class="settings-center__hero settings-section-anchor">
      <div class="settings-center__hero-copy">
        <p class="settings-center__eyebrow">Settings Center</p>
        <h3 class="settings-center__title">学习档案、AI 配置和本机数据都在这里统一管理。</h3>
        <p class="settings-center__text">
          当前以单一学习档案运行，不需要登录；改动会优先保存在本机，并在可用时同步学习记录。
        </p>
      </div>

      <div class="settings-center__hero-chips" aria-label="设置概览">
        <span class="settings-center__hero-chip">{{ accountSummary }}</span>
        <span class="settings-center__hero-chip">AI：{{ settingsStore.aiConfigurationSummary }}</span>
        <span class="settings-center__hero-chip">档案更新：{{ profileUpdatedLabel }}</span>
      </div>
    </section>

    <Transition name="settings-panel-swap" mode="out-in">
      <div :key="normalizedActiveSectionId" ref="activeSectionShellRef" class="settings-panel-shell">
        <component :is="activeSectionComponent" v-bind="activeSectionProps" v-on="activeSectionListeners" />
      </div>
    </Transition>

    <section v-if="showStickyActionBar" class="settings-action-bar" aria-label="当前分区操作">
      <div class="settings-action-bar__copy">
        <strong class="settings-action-bar__title">{{ stickyBarTitle }}</strong>
        <p class="settings-action-bar__text">{{ stickyBarDetail }}</p>
      </div>

      <div class="settings-action-bar__actions">
        <button
          v-if="showCurrentSectionSaveAction"
          class="btn-cartoon btn-cartoon--mint"
          type="button"
          :disabled="!currentSectionIsDirty"
          @click="handleSaveCurrentSection"
        >
          {{ currentSectionSaveLabel }}
        </button>
        <button
          v-if="showSaveAllAction"
          class="btn-cartoon btn-cartoon--yellow"
          type="button"
          @click="handleSaveAllDirtySections"
        >
          {{ saveAllActionLabel }}
        </button>
        <button
          v-if="normalizedActiveSectionId !== 'settings-overview'"
          class="settings-action-bar__link"
          type="button"
          @click="handleSectionOpen('settings-overview')"
        >
          返回概览
        </button>
      </div>
    </section>
  </div>
</template>

<style>
.settings-center {
  display: grid;
  gap: 18px;
  color: var(--color-ink);
}

.settings-center__hero,
.settings-stage,
.settings-card {
  min-width: 0;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 252, 255, 0.88) 100%);
  box-shadow: 0 18px 30px -28px rgba(36, 50, 74, 0.34);
}

.settings-center__hero {
  display: grid;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(180deg, rgba(245, 251, 255, 0.92) 0%, rgba(255, 252, 244, 0.86) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.68);
}

.settings-center__hero-copy,
.settings-stage__intro {
  display: grid;
  gap: 10px;
}

.settings-center__eyebrow,
.settings-card__eyebrow,
.settings-overview-card__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-center__title,
.settings-card__title,
.settings-stage__title {
  margin: 0;
  color: var(--color-ink);
  font-size: 1.22rem;
  line-height: 1.35;
}

.settings-center__text,
.settings-card__note,
.settings-status,
.settings-log__detail,
.settings-stage__text,
.settings-overview-card__summary,
.settings-overview-card__detail {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.92rem;
  line-height: 1.6;
}

.settings-center__hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-center__hero-chip,
.settings-inline-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  font-size: 0.86rem;
  font-weight: 700;
}

.settings-stage,
.settings-card {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.settings-panel-shell {
  display: grid;
}

.settings-card--stage {
  min-height: 420px;
  align-content: start;
}

.settings-stage--overview {
  gap: 18px;
}

.settings-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.settings-overview-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(247, 251, 255, 0.86) 100%);
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.settings-overview-card:hover,
.settings-overview-card:focus-visible {
  border-color: rgba(124, 216, 184, 0.42);
  box-shadow: 0 18px 24px -24px rgba(36, 50, 74, 0.36);
  outline: none;
  transform: translateY(-1px);
}

.settings-overview-card--warning {
  border-color: rgba(255, 186, 82, 0.26);
  background: linear-gradient(180deg, rgba(255, 251, 241, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.settings-overview-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.settings-overview-card__badge,
.settings-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 186, 82, 0.34);
  border-radius: 999px;
  background: rgba(255, 247, 225, 0.92);
  color: #9b641d;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.settings-overview-card__title {
  color: var(--color-ink);
  font-size: 1.02rem;
  line-height: 1.35;
}

.settings-overview-card__action {
  color: var(--color-ink);
  font-size: 0.88rem;
  font-weight: 800;
}

.settings-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.settings-card__meta,
.settings-log__time,
.settings-inline-summary__label,
.settings-stat__label {
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
}

.settings-card__meta-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.settings-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.settings-form--single {
  grid-template-columns: minmax(0, 1fr);
}

.settings-field {
  display: grid;
  gap: 6px;
}

.settings-field--span {
  grid-column: 1 / -1;
}

.settings-field__label {
  color: var(--color-ink-soft);
  font-size: 0.84rem;
  font-weight: 800;
}

.settings-field__hint {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  line-height: 1.45;
}

.settings-input {
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--color-ink);
  font: inherit;
}

.settings-input:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.78);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.settings-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  font-weight: 700;
}

.settings-checkbox input {
  width: 16px;
  height: 16px;
}

.settings-switch-card {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 14px 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(247, 251, 255, 0.82);
}

.settings-switch-card input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
}

.settings-switch-card__copy {
  display: grid;
  gap: 4px;
}

.settings-switch-card__title {
  color: var(--color-ink);
  font-size: 0.94rem;
  line-height: 1.4;
}

.settings-switch-card__note {
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  line-height: 1.5;
}

.settings-inline-summary__value,
.settings-stat__value {
  font-size: 0.92rem;
  color: var(--color-ink);
}

.settings-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-card__actions--dual > * {
  flex: 1 1 180px;
}

.settings-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settings-stat {
  display: grid;
  gap: 4px;
  min-height: 84px;
  padding: 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(247, 251, 255, 0.82);
}

.settings-status {
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 248, 225, 0.8);
}

.settings-file-input {
  display: none;
}

.settings-link-button {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
}

.settings-log {
  display: grid;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.settings-log__item {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(248, 250, 255, 0.84);
}

.settings-log__topline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.settings-log__title {
  font-size: 0.92rem;
}

.settings-action-bar {
  position: sticky;
  bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  box-shadow:
    0 16px 28px -28px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.settings-action-bar__copy {
  display: grid;
  gap: 3px;
  min-width: min(100%, 280px);
}

.settings-action-bar__title {
  color: var(--color-ink);
  font-size: 0.92rem;
  line-height: 1.35;
}

.settings-action-bar__text {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  line-height: 1.42;
}

.settings-action-bar__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.settings-action-bar__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--color-ink-soft);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    color 160ms ease,
    opacity 160ms ease;
}

.settings-action-bar__link:hover,
.settings-action-bar__link:focus-visible {
  color: var(--color-ink);
  opacity: 0.88;
  outline: none;
}

.settings-panel-swap-enter-active,
.settings-panel-swap-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease,
    filter 220ms ease;
}

.settings-panel-swap-enter-from,
.settings-panel-swap-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.992);
  filter: blur(4px);
}

[data-settings-section-focus] {
  outline: none;
}

[data-settings-section-focus]:focus-visible {
  border-radius: 12px;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.2);
}

.settings-section-anchor {
  scroll-margin-top: 108px;
}

@media (max-width: 900px) {
  .settings-overview-grid,
  .settings-form,
  .settings-stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-action-bar {
    bottom: 12px;
  }
}

@media (max-width: 720px) {
  .settings-action-bar {
    padding: 14px;
    border-radius: 20px;
  }

  .settings-action-bar__actions {
    width: 100%;
    justify-content: stretch;
  }

  .settings-action-bar__actions > * {
    flex: 1 1 100%;
  }
}
</style>
