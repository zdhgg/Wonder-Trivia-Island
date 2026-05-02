import { computed, ref, watch } from "vue";
import { useSettingsStore } from "../stores/useSettingsStore";

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `wonder-trivia-island-backup-${timestamp}.json`;
}

export function useSettingsCenter(app) {
  const settingsStore = useSettingsStore();
  settingsStore.hydrate();

  const lastSettingsSourceView = ref(app.currentView.value);
  const isBackupBusy = ref(false);
  const backupStatusMessage = ref("");
  const hasPendingSettingsChanges = ref(false);

  const isSettingsActive = computed(() => app.currentView.value === app.VIEW_MODE.SETTINGS);
  const settingsReturnLabel = computed(() => getSettingsViewLabel(lastSettingsSourceView.value, app.VIEW_MODE));

  const backupStats = computed(() => [
    {
      label: "今日到期",
      value: app.wrongBookOverview.value?.stats?.[0]?.value || "0"
    },
    {
      label: "已回稳",
      value: app.wrongBookOverview.value?.stats?.[3]?.value || "0"
    },
    {
      label: "航海册",
      value: app.challengeRewardProgressLabel.value
    },
    {
      label: "成就",
      value: app.challengeAchievementProgressLabel.value
    }
  ]);

  watch(
    app.currentView,
    (nextView) => {
      if (nextView !== app.VIEW_MODE.SETTINGS) {
        lastSettingsSourceView.value = nextView;
        hasPendingSettingsChanges.value = false;
      }
    },
    { immediate: true }
  );

  function openSettingsView(sectionId = "") {
    if (app.currentView.value !== app.VIEW_MODE.SETTINGS) {
      lastSettingsSourceView.value = app.currentView.value;
    }

    if (sectionId) {
      app.activeSettingsSectionId.value = app.normalizeSettingsSectionId(sectionId);
    }

    app.currentView.value = app.VIEW_MODE.SETTINGS;
  }

  function closeSettingsView() {
    if (!confirmLeaveSettings({ targetLabel: settingsReturnLabel.value })) {
      return;
    }

    const targetView =
      lastSettingsSourceView.value && lastSettingsSourceView.value !== app.VIEW_MODE.SETTINGS
        ? lastSettingsSourceView.value
        : app.VIEW_MODE.HOME;

    if (targetView === app.VIEW_MODE.CATALOG) {
      app.openCatalogView();
      return;
    }

    if (targetView === app.VIEW_MODE.IMPORT) {
      app.openImportView();
      return;
    }

    app.currentView.value = targetView;
  }

  function handleSettingsPendingStateChange(hasPending = false) {
    hasPendingSettingsChanges.value = Boolean(hasPending);
  }

  function confirmLeaveSettings({ targetLabel = "其他页面" } = {}) {
    if (!isSettingsActive.value || !hasPendingSettingsChanges.value || typeof window === "undefined") {
      return true;
    }

    const shouldLeave = window.confirm(
      `当前还有未保存的设置改动。离开设置页并前往${targetLabel}后，这些改动会丢失，是否继续？`
    );

    if (shouldLeave) {
      hasPendingSettingsChanges.value = false;
    }

    return shouldLeave;
  }

  function handleProfileSaved({ profile, applyToHome } = {}) {
    if (applyToHome) {
      app.applyProfileDefaultsToHome(profile);
    }

    app.queueHomeWelcomeMascotSpeech();
  }

  function buildBackupPayload() {
    return {
      app: "wonder-trivia-island",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settingsCenter: settingsStore.backupSnapshot,
      audioPreferences: app.audioStore.preferenceSnapshot,
      quizSettings: app.normalizeQuizSettings({
        selectedSubject: app.selectedSubject.value,
        selectedGrade: app.selectedGrade.value,
        selectedSemester: app.selectedSemester.value,
        selectedQuestionCount: app.selectedQuestionCount.value,
        selectedDifficulty: app.selectedDifficulty.value,
        selectedTimeLimitSeconds: app.selectedTimeLimitSeconds.value,
        selectedPointsPerCorrect: app.selectedPointsPerCorrect.value
      }),
      challengeProgressBook: app.normalizeChallengeProgressBook(app.challengeProgressBook.value),
      studyRecordBook: app.studyRecordBook.value
    };
  }

  function exportBackup() {
    isBackupBusy.value = true;

    try {
      const payload = buildBackupPayload();
      downloadJsonFile(normalizeBackupFilename(), payload);
      backupStatusMessage.value = "备份已导出到本地 JSON 文件。";
      settingsStore.appendActivityLog({
        scope: "backup",
        title: "数据备份已导出",
        detail: "已包含学习档案、声音、出题设置和学习记录"
      });
    } finally {
      isBackupBusy.value = false;
    }
  }

  async function importBackup(file) {
    if (!file) {
      return;
    }

    isBackupBusy.value = true;
    backupStatusMessage.value = "正在恢复备份，请稍候。";

    try {
      const rawText = await file.text();
      const parsedPayload = JSON.parse(rawText);
      const importedScopes = [];
      const settingsSnapshot = parsedPayload?.settingsCenter ?? parsedPayload?.settings ?? null;

      if (settingsSnapshot && typeof settingsSnapshot === "object") {
        settingsStore.importSnapshot(settingsSnapshot);
        app.applyProfileDefaultsToHome(settingsStore.profile);
        importedScopes.push("学习档案");
      }

      if (parsedPayload?.audioPreferences && typeof parsedPayload.audioPreferences === "object") {
        app.audioStore.replacePreferences(parsedPayload.audioPreferences);
        importedScopes.push("声音偏好");
      }

      if (parsedPayload?.quizSettings && typeof parsedPayload.quizSettings === "object") {
        app.applyQuizSettings(app.normalizeQuizSettings(parsedPayload.quizSettings));
        app.syncDraftQuizSettings();
        app.persistQuizSettings();
        importedScopes.push("出题设置");
      }

      if (parsedPayload?.challengeProgressBook && typeof parsedPayload.challengeProgressBook === "object") {
        await app.restoreChallengeProgressBook(parsedPayload.challengeProgressBook);
        importedScopes.push("闯关进度");
      }

      if (parsedPayload?.studyRecordBook && typeof parsedPayload.studyRecordBook === "object") {
        await app.restoreStudyRecordBook(parsedPayload.studyRecordBook);
        importedScopes.push("学习记录");
      }

      if (!importedScopes.length) {
        throw new Error("备份文件里没有可恢复的数据段。");
      }

      settingsStore.appendActivityLog({
        scope: "backup",
        title: "数据备份已恢复",
        detail: importedScopes.join("、")
      });
      backupStatusMessage.value = `备份恢复完成：${importedScopes.join("、")}。`;
    } catch (error) {
      backupStatusMessage.value = error?.message ? `恢复失败：${error.message}` : "恢复失败：备份文件格式不正确。";
    } finally {
      isBackupBusy.value = false;
    }
  }

  return {
    isSettingsActive,
    settingsReturnLabel,
    hasPendingSettingsChanges,
    isBackupBusy,
    backupStatusMessage,
    backupStats,
    openSettingsView,
    closeSettingsView,
    handleSettingsPendingStateChange,
    confirmLeaveSettings,
    handleProfileSaved,
    exportBackup,
    importBackup
  };
}

function getSettingsViewLabel(viewMode, VIEW_MODE) {
  switch (viewMode) {
    case VIEW_MODE.QUIZ:
      return "练习台";
    case VIEW_MODE.CHALLENGE:
      return "闯关地图";
    case VIEW_MODE.TOOLS:
      return "工具台";
    case VIEW_MODE.CATALOG:
      return "题库";
    case VIEW_MODE.IMPORT:
      return "导入";
    case VIEW_MODE.STUDY:
      return "知识学习";
    case VIEW_MODE.WRONG_BOOK:
      return "错题温习";
    case VIEW_MODE.HOME:
    default:
      return "首页";
  }
}
