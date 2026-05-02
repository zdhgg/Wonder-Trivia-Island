import { computed } from "vue";

export function useQuestionImportDisplay({
  importMode,
  selectedFileName,
  parseMessage,
  previewResult,
  commitResult,
  statsErrorMessage,
  currentQuestionCountLabel,
  isPreviewLoading,
  isCommitLoading,
  isAiGenerating,
  aiImportSubject,
  aiImportGrade,
  aiImportCount,
  hasPreviewErrors,
  hasPreviewWarnings,
  canCommit,
  importModeLabel
}) {
  const previewStatusTone = computed(() => {
    if (!previewResult.value) {
      return "";
    }

    if (hasPreviewErrors.value) {
      return "error";
    }

    if (hasPreviewWarnings.value) {
      return "warning";
    }

    return "success";
  });

  const previewStatusText = computed(() => {
    if (!previewResult.value) {
      return "";
    }

    if (hasPreviewErrors.value) {
      return "预检发现错误，修正表格后再导入。";
    }

    if (hasPreviewWarnings.value) {
      return "预检通过，但有重复题或相似题警告。仍可继续导入。";
    }

    return "预检通过，可以直接导入。";
  });

  const replaceImportDescription = computed(() => {
    const validRowCount = previewResult.value?.summary?.validRows || 0;

    return `当前覆盖导入将用 ${validRowCount} 道通过预检的新题替换现有题库，并在开始前自动备份旧数据。`;
  });

  const importResultTone = computed(() => {
    if (isAiGenerating.value) {
      return "pending";
    }

    if (isCommitLoading.value) {
      return "pending";
    }

    if (commitResult.value) {
      return "success";
    }

    if (parseMessage.value || statsErrorMessage.value || hasPreviewErrors.value) {
      return "error";
    }

    if (previewResult.value && hasPreviewWarnings.value) {
      return "warning";
    }

    if (previewResult.value && canCommit.value) {
      return "ready";
    }

    if (selectedFileName.value) {
      return "progress";
    }

    return "idle";
  });

  const importResultEyebrow = computed(() => {
    if (isAiGenerating.value) {
      return "AI Draft";
    }

    if (isCommitLoading.value) {
      return "Import Running";
    }

    if (commitResult.value) {
      return "Import Done";
    }

    if (previewResult.value) {
      return "Import Review";
    }

    return "Import Result";
  });

  const importResultStatusLabel = computed(() => {
    if (isAiGenerating.value) {
      return "生成中";
    }

    if (isCommitLoading.value) {
      return "写入中";
    }

    if (commitResult.value) {
      return "已完成";
    }

    if (parseMessage.value || statsErrorMessage.value || hasPreviewErrors.value) {
      return "需处理";
    }

    if (previewResult.value && hasPreviewWarnings.value) {
      return "可导入";
    }

    if (previewResult.value && canCommit.value) {
      return "待确认";
    }

    if (selectedFileName.value) {
      return "进行中";
    }

    return "等待中";
  });

  const importResultTitle = computed(() => {
    if (isAiGenerating.value) {
      return "正在生成并整理 AI 草稿";
    }

    if (isCommitLoading.value) {
      return "正在把新题写入题库";
    }

    if (commitResult.value) {
      return "题库已经更新";
    }

    if (parseMessage.value || statsErrorMessage.value || hasPreviewErrors.value) {
      return "这批题目还不能导入";
    }

    if (previewResult.value && hasPreviewWarnings.value) {
      return "预检通过，但建议先看一眼警告";
    }

    if (previewResult.value && canCommit.value) {
      return "预检已经通过，可以确认导入";
    }

    if (selectedFileName.value) {
      return "文件已经就位，下一步先做预检";
    }

    return "导入结果会持续显示在这里";
  });

  const importResultText = computed(() => {
    if (isAiGenerating.value) {
      return "系统会先生成题目，再自动送入下方预检流程。";
    }

    if (isCommitLoading.value) {
      return "正在写入通过预检的题目，完成后这里会更新最新题库数量和备份信息。";
    }

    if (commitResult.value) {
      return `本次导入 ${commitResult.value.importedCount} 题，题库总数现在是 ${commitResult.value.totalQuestionCount} 题。`;
    }

    if (parseMessage.value) {
      return parseMessage.value;
    }

    if (statsErrorMessage.value) {
      return statsErrorMessage.value;
    }

    if (previewResult.value) {
      return previewStatusText.value;
    }

    if (selectedFileName.value) {
      return "上传后先做预检，确认错误、重复项和可导入题数，再决定是否入库。";
    }

    return "先上传 CSV / XLSX 并完成预检，结果面板会按当前阶段持续更新。";
  });

  const importResultStats = computed(() => {
    if (isAiGenerating.value) {
      return [
        { label: "学科范围", value: `${aiImportSubject.value} · ${aiImportGrade.value}` },
        { label: "当前批次", value: `${aiImportCount.value} 题` },
        { label: "导入模式", value: importModeLabel.value }
      ];
    }

    if (commitResult.value) {
      return [
        { label: "本次导入", value: `${commitResult.value.importedCount} 题` },
        { label: "最新总量", value: `${commitResult.value.totalQuestionCount} 题` },
        { label: "备份状态", value: commitResult.value.backupPath ? "已生成备份" : "无需备份" }
      ];
    }

    if (previewResult.value) {
      return [
        { label: "可导入", value: `${previewResult.value.summary.validRows} 行` },
        { label: "错误", value: `${previewResult.value.summary.errorRows} 行` },
        { label: "警告", value: `${previewResult.value.summary.warningRows} 行` }
      ];
    }

    return [
      { label: "当前题库", value: currentQuestionCountLabel.value },
      { label: "当前模式", value: importModeLabel.value },
      { label: "文件状态", value: selectedFileName.value ? "已选择文件" : "等待上传" }
    ];
  });

  const importResultHint = computed(() => {
    if (isAiGenerating.value) {
      return "生成完成后会直接展示预检结果，不会绕过现有校验。";
    }

    if (isCommitLoading.value) {
      return "写入完成后，右侧会立即显示最新题库数量。";
    }

    if (commitResult.value) {
      return commitResult.value.backupPath
        ? "覆盖导入已经自动备份旧数据库，路径见下方。"
        : "可以继续预检下一批题目，或切回题库检查导入结果。";
    }

    if (parseMessage.value || statsErrorMessage.value || hasPreviewErrors.value) {
      return "先修正表格里的错误，再重新预检。";
    }

    if (previewResult.value && hasPreviewWarnings.value) {
      return "如果确认重复题或相似题仍要保留，可以直接继续导入。";
    }

    if (previewResult.value && canCommit.value) {
      return importMode.value === "replace"
        ? "覆盖导入会在开始前自动备份旧数据。"
        : "追加导入会把通过预检的新题追加进现有题库。";
    }

    if (selectedFileName.value) {
      return "建议先点击“开始预检”，不要直接假设表格格式正确。";
    }

    return "字段说明和模板示例在上方，先准备好文件再开始。";
  });

  return {
    previewStatusTone,
    previewStatusText,
    replaceImportDescription,
    importResultTone,
    importResultEyebrow,
    importResultStatusLabel,
    importResultTitle,
    importResultText,
    importResultStats,
    importResultHint
  };
}
