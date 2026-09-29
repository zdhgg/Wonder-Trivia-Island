<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAudioStore } from "../stores/useAudioStore";
import SettingsAudioSection from "./settings/SettingsAudioSection.vue";
import SettingsBackupSection from "./settings/SettingsBackupSection.vue";
import SettingsCoachingSection from "./settings/SettingsCoachingSection.vue";
import SettingsLogsSection from "./settings/SettingsLogsSection.vue";
import SettingsAboutSection from "./settings/SettingsAboutSection.vue";
import SettingsProfileSection from "./settings/SettingsProfileSection.vue";
import { getSettingsSectionById, SETTINGS_SECTION_IDS } from "./settings/settingsSections";
import { AUTO_ADVANCE_DELAY_OPTIONS, PROFILE_GENDER_OPTIONS, useSettingsStore } from "../stores/useSettingsStore";

const props = defineProps({
  activeSectionId: {
    type: String,
    default: "settings-profile"
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

const emit = defineEmits(["profile-saved", "export-backup", "import-backup", "dirty-state-change"]);

const settingsStore = useSettingsStore();
const audioStore = useAudioStore();
settingsStore.hydrate();
audioStore.hydratePreferences();

const activeSectionShellRef = ref(null);
const shouldApplyProfileDefaults = ref(true);
let sectionFocusFrame = 0;

const { profile, coachingPreferences, activityLogs } = storeToRefs(settingsStore);
const { isSupported, masterVolume, musicEnabled, sfxEnabled } = storeToRefs(audioStore);
const SECTION_COMPONENTS = Object.freeze({
  "settings-profile": SettingsProfileSection,
  "settings-coaching": SettingsCoachingSection,
  "settings-audio": SettingsAudioSection,
  "settings-backup": SettingsBackupSection,
  "settings-logs": SettingsLogsSection,
  "settings-about": SettingsAboutSection
});

const profileDraft = ref({
  displayName: "",
  gender: PROFILE_GENDER_OPTIONS[0],
  grade: "",
  semester: "上册"
});

const coachingDraft = ref({
  autoAdvanceOnCorrect: false,
  autoAdvanceDelayMs: 1500
});

const gradeOptions = Object.freeze(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);
const semesterOptions = Object.freeze(["上册", "下册"]);

const normalizedActiveSectionId = computed(() =>
  SETTINGS_SECTION_IDS.includes(String(props.activeSectionId || "").trim()) ? String(props.activeSectionId).trim() : "settings-profile"
);
const activityLogItems = computed(() => activityLogs.value.slice(0, 12));
const profileUpdatedLabel = computed(() => formatTimestamp(profile.value.updatedAt));
const coachingUpdatedLabel = computed(() => formatTimestamp(coachingPreferences.value.updatedAt));
const profileDirty = computed(
  () =>
    profileDraft.value.displayName !== profile.value.displayName ||
    profileDraft.value.gender !== profile.value.gender ||
    profileDraft.value.grade !== profile.value.grade ||
    profileDraft.value.semester !== profile.value.semester
);
const coachingDirty = computed(
  () =>
    coachingDraft.value.autoAdvanceOnCorrect !== coachingPreferences.value.autoAdvanceOnCorrect ||
    coachingDraft.value.autoAdvanceDelayMs !== coachingPreferences.value.autoAdvanceDelayMs
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
const SECTION_SAVE_CONFIG = Object.freeze({
  "settings-profile": {
    title: "学习档案",
    detailWhenDirty: "当前分区有未保存改动。",
    detailWhenClean: "当前分区已经保存到本机。",
    cleanActionLabel: "档案已保存",
    dirtyActionLabel: "保存档案"
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

  if (coachingDirty.value) {
    sections.push("settings-coaching");
  }

  return sections;
});
const currentSaveSectionConfig = computed(() => SECTION_SAVE_CONFIG[normalizedActiveSectionId.value] || null);
const currentSectionIsDirty = computed(() => {
  if (normalizedActiveSectionId.value === "settings-profile") {
    return profileDirty.value;
  }

  if (normalizedActiveSectionId.value === "settings-coaching") {
    return coachingDirty.value;
  }

  return false;
});
const showStickyActionBar = computed(() => true);
const stickyBarTitle = computed(() => currentSaveSectionConfig.value?.title || "当前分区");
const stickyBarDetail = computed(() => {
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

  if (normalizedActiveSectionId.value === "settings-about") {
    return "状态刷新和版本信息都会即时生效，无需保存。";
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

  if (!showCurrentSectionSaveAction.value) {
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
  () => SECTION_COMPONENTS[normalizedActiveSectionId.value] || SECTION_COMPONENTS["settings-profile"]
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
    case "settings-coaching":
      return {
        coachingDraft: coachingDraft.value,
        coachingDirty: coachingDirty.value,
        coachingUpdatedLabel: coachingUpdatedLabel.value,
        autoAdvanceDelayOptions: AUTO_ADVANCE_DELAY_OPTIONS
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
    case "settings-about":
      return {};
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
  coachingPreferences,
  (nextPreferences) => {
    coachingDraft.value = {
      autoAdvanceOnCorrect: nextPreferences.autoAdvanceOnCorrect,
      autoAdvanceDelayMs: nextPreferences.autoAdvanceDelayMs
    };
  },
  { deep: true, immediate: true }
);

watch(
  [profileDirty, coachingDirty],
  ([nextProfileDirty, nextCoachingDirty]) => {
    emit("dirty-state-change", {
      profile: nextProfileDirty,
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

function handleSaveCoachingPreferences() {
  settingsStore.saveCoachingPreferences(coachingDraft.value);
}

function handleSaveCurrentSection() {
  if (normalizedActiveSectionId.value === "settings-profile") {
    handleSaveProfile();
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

  if (coachingDirty.value) {
    handleSaveCoachingPreferences();
  }
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

.settings-stage,
.settings-card {
  min-width: 0;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 252, 255, 0.88) 100%);
  box-shadow: 0 18px 30px -28px rgba(36, 50, 74, 0.34);
}

.settings-stage__intro {
  display: grid;
  gap: 10px;
}

.settings-card__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-card__title,
.settings-stage__title {
  margin: 0;
  color: var(--color-ink);
  font-size: 1.22rem;
  line-height: 1.35;
}

.settings-card__note,
.settings-status,
.settings-log__detail,
.settings-stage__text {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.92rem;
  line-height: 1.6;
}

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

.settings-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

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
