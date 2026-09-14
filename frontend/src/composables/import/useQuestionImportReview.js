import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  confirmPendingImport,
  discardPendingImportBatch,
  fetchPendingImportBatch,
  fetchQuestionStats
} from "../../services/questionsApi";

const POLL_INTERVAL_MS = 20000;
const PREVIEW_ROW_LIMIT = 12;
const STALE_BATCH_CODE = "IMPORT_STALE_BATCH";
const MISSING_BATCH_CODE = "IMPORT_BATCH_MISSING";

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatClock(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 导入页现在只做"审核台"：不解析文件、不决定导入模式，
 * 只读取 harness 暂存的批次、展示预检结果，并把人的确认/丢弃回传。
 */
export function useQuestionImportReview({ props, emit }) {
  const pendingBatch = ref(null);
  const commitResult = ref(null);
  const errorMessage = ref("");
  const confirmErrorMessage = ref("");
  const currentQuestionCount = ref(0);
  const isLoadingBatch = ref(false);
  const isLoadingStats = ref(false);
  const isConfirming = ref(false);
  const isDiscarding = ref(false);
  const isReplaceConfirmOpen = ref(false);
  const lastRefreshedAt = ref(null);

  let batchController = null;
  let confirmController = null;
  let pollTimer = null;

  const adminKeyModel = computed({
    get: () => props.adminKey,
    set: (value) => emit("update:adminKey", value)
  });

  const hasBatch = computed(() => Boolean(pendingBatch.value));
  const batchMode = computed(() => pendingBatch.value?.mode || "append");
  const batchModeLabel = computed(() => (batchMode.value === "replace" ? "覆盖导入" : "追加导入"));
  const batchSummary = computed(() => pendingBatch.value?.summary || null);
  const previewRows = computed(() => pendingBatch.value?.rows || []);
  const previewRowsToShow = computed(() => previewRows.value.slice(0, PREVIEW_ROW_LIMIT));
  const warningRows = computed(() => previewRows.value.filter((row) => row.status === "warning"));
  const errorRows = computed(() => previewRows.value.filter((row) => row.status === "error"));
  const hasBlockingErrors = computed(() => errorRows.value.length > 0);
  const hasWarnings = computed(() => warningRows.value.length > 0);
  const canConfirm = computed(
    () => hasBatch.value && !hasBlockingErrors.value && !isConfirming.value && !isDiscarding.value
  );
  const canDiscard = computed(() => hasBatch.value && !isConfirming.value && !isDiscarding.value);
  const currentQuestionCountLabel = computed(() =>
    isLoadingStats.value ? "加载中..." : `${currentQuestionCount.value} 题`
  );
  const batchCountLabel = computed(() => (hasBatch.value ? `${pendingBatch.value.rowCount} 题` : "—"));
  const batchSourceLabel = computed(() => pendingBatch.value?.source || "—");
  const batchCreatedAtLabel = computed(() => formatDateTime(pendingBatch.value?.createdAt));
  const lastRefreshedLabel = computed(() =>
    lastRefreshedAt.value ? formatClock(lastRefreshedAt.value) : "—"
  );
  const warningCountLabel = computed(() =>
    hasWarnings.value ? `${warningRows.value.length} 行待判断` : "无警告"
  );

  const reviewStatusTone = computed(() => {
    if (hasBlockingErrors.value) {
      return "error";
    }

    if (hasWarnings.value) {
      return "warning";
    }

    return "success";
  });

  const reviewStatusText = computed(() => {
    if (hasBlockingErrors.value) {
      return "这批数据没有通过预检，请回到数据源修正后重新提交。";
    }

    if (hasWarnings.value) {
      return "预检通过，但有重复题或相似题需要你先判断是否保留。";
    }

    return "预检通过，核对无误后即可确认写入题库。";
  });

  const replaceConfirmDescription = computed(() => {
    const validRowCount = batchSummary.value?.validRows || 0;

    return `当前覆盖导入将用 ${validRowCount} 道通过预检的新题替换现有题库，并在开始前自动备份旧数据。`;
  });

  const resultTone = computed(() => {
    if (isConfirming.value) {
      return "pending";
    }

    if (commitResult.value) {
      return "success";
    }

    if (errorMessage.value || confirmErrorMessage.value || hasBlockingErrors.value) {
      return "error";
    }

    if (hasWarnings.value) {
      return "warning";
    }

    if (hasBatch.value) {
      return "ready";
    }

    return "idle";
  });

  const resultEyebrow = computed(() => {
    if (isConfirming.value) {
      return "Import Running";
    }

    if (commitResult.value) {
      return "Import Done";
    }

    if (hasBatch.value) {
      return "Import Review";
    }

    return "Import Result";
  });

  const resultStatusLabel = computed(() => {
    if (isConfirming.value) {
      return "写入中";
    }

    if (commitResult.value) {
      return "已完成";
    }

    if (errorMessage.value || confirmErrorMessage.value || hasBlockingErrors.value) {
      return "需处理";
    }

    if (hasBatch.value) {
      return "待确认";
    }

    return "等待中";
  });

  const resultTitle = computed(() => {
    if (isConfirming.value) {
      return "正在把新题写入题库";
    }

    if (commitResult.value) {
      return "题库已经更新";
    }

    if (confirmErrorMessage.value || errorMessage.value) {
      return "这次确认没有完成";
    }

    if (hasBlockingErrors.value) {
      return "这批数据还不能导入";
    }

    if (hasWarnings.value) {
      return "预检通过，但建议先看一眼警告";
    }

    if (hasBatch.value) {
      return "预检已经通过，可以确认导入";
    }

    return "等待 harness 提交批次";
  });

  const resultText = computed(() => {
    if (isConfirming.value) {
      return "正在写入通过预检的题目，完成后这里会更新最新题库数量和备份信息。";
    }

    if (commitResult.value) {
      return `本次导入 ${commitResult.value.importedCount} 题，题库总数现在是 ${commitResult.value.totalQuestionCount} 题。`;
    }

    if (confirmErrorMessage.value) {
      return confirmErrorMessage.value;
    }

    if (errorMessage.value) {
      return errorMessage.value;
    }

    if (hasBatch.value) {
      return reviewStatusText.value;
    }

    return "外部 harness 提交批次后，这里会显示待确认的预检结果。";
  });

  // 待确认/空闲时的数字已经在页面顶部摘要条和批次卡片里，结果面板只报告"这一次导入"的结果。
  const resultStats = computed(() => {
    if (!commitResult.value) {
      return [];
    }

    return [
      { label: "本次导入", value: `${commitResult.value.importedCount} 题` },
      { label: "最新总量", value: `${commitResult.value.totalQuestionCount} 题` },
      { label: "备份状态", value: commitResult.value.backupPath ? "已生成备份" : "无需备份" }
    ];
  });

  const resultHint = computed(() => {
    if (isConfirming.value) {
      return "写入完成后，这里会立即显示最新题库数量。";
    }

    if (commitResult.value) {
      return commitResult.value.backupPath
        ? "覆盖导入已经自动备份旧数据库，路径见下方。"
        : "可以继续等待下一个批次，或切回题库检查导入结果。";
    }

    if (confirmErrorMessage.value || errorMessage.value) {
      return "可以先刷新批次，确认当前队列状态后再决定。";
    }

    if (hasWarnings.value) {
      return "如果确认重复题或相似题仍要保留，可以直接继续导入。";
    }

    if (hasBatch.value) {
      return batchMode.value === "replace"
        ? "覆盖导入会在开始前自动备份旧数据。"
        : "追加导入会把通过预检的新题追加进现有题库。";
    }

    return "运行 npm run questions:import <文件> --stage 即可提交一个新批次。";
  });

  function clearMessages() {
    errorMessage.value = "";
    confirmErrorMessage.value = "";
  }

  async function loadStats() {
    isLoadingStats.value = true;

    try {
      const payload = await fetchQuestionStats();
      currentQuestionCount.value = payload.total;
    } catch {
      // 统计只是辅助信息，失败时保留上一次的数值。
    } finally {
      isLoadingStats.value = false;
    }
  }

  async function refreshPendingBatch({ silent = false } = {}) {
    if (isConfirming.value || isDiscarding.value) {
      return;
    }

    batchController?.abort();
    batchController = new AbortController();

    if (!silent) {
      isLoadingBatch.value = true;
    }

    try {
      const batch = await fetchPendingImportBatch({
        adminKey: adminKeyModel.value,
        signal: batchController.signal
      });

      pendingBatch.value = batch;
      lastRefreshedAt.value = new Date();

      if (batch) {
        errorMessage.value = "";
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      errorMessage.value = error.message || "读取待确认批次失败。";
    } finally {
      isLoadingBatch.value = false;
      batchController = null;
    }
  }

  async function submitConfirmation({ allowStale = false } = {}) {
    if (!canConfirm.value) {
      return false;
    }

    confirmController?.abort();
    confirmController = new AbortController();
    isConfirming.value = true;
    commitResult.value = null;
    clearMessages();

    try {
      const payload = await confirmPendingImport({
        batchId: pendingBatch.value.batchId,
        allowStale,
        adminKey: adminKeyModel.value,
        signal: confirmController.signal
      });

      commitResult.value = payload;
      currentQuestionCount.value = payload.totalQuestionCount;
      pendingBatch.value = null;
      lastRefreshedAt.value = new Date();
      emit("imported", payload);
      return true;
    } catch (error) {
      if (error.name === "AbortError") {
        return false;
      }

      confirmErrorMessage.value = error.message || "确认导入失败。";

      // 批次过期或已消失时，刷新一次让页面回到真实状态。
      if (error.code === STALE_BATCH_CODE || error.code === MISSING_BATCH_CODE) {
        await refreshPendingBatch({ silent: true });
      }

      return false;
    } finally {
      isConfirming.value = false;
      confirmController = null;
    }
  }

  async function handleConfirm() {
    if (!canConfirm.value) {
      return;
    }

    if (batchMode.value === "replace") {
      confirmErrorMessage.value = "";
      isReplaceConfirmOpen.value = true;
      return;
    }

    await submitConfirmation();
  }

  function closeReplaceConfirm() {
    if (isConfirming.value) {
      return;
    }

    confirmErrorMessage.value = "";
    isReplaceConfirmOpen.value = false;
  }

  async function handleConfirmReplace() {
    const wasConfirmed = await submitConfirmation();

    if (wasConfirmed) {
      isReplaceConfirmOpen.value = false;
    }
  }

  async function handleDiscard() {
    if (!canDiscard.value) {
      return;
    }

    isDiscarding.value = true;
    commitResult.value = null;
    clearMessages();

    try {
      await discardPendingImportBatch({
        batchId: pendingBatch.value.batchId,
        adminKey: adminKeyModel.value
      });

      pendingBatch.value = null;
      lastRefreshedAt.value = new Date();
    } catch (error) {
      errorMessage.value = error.message || "丢弃待确认批次失败。";
    } finally {
      isDiscarding.value = false;
    }
  }

  onMounted(() => {
    loadStats();
    refreshPendingBatch();
    // harness 可能随时提交新批次，保持一个低频轮询即可。
    pollTimer = setInterval(() => refreshPendingBatch({ silent: true }), POLL_INTERVAL_MS);
  });

  onBeforeUnmount(() => {
    batchController?.abort();
    confirmController?.abort();

    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  });

  return {
    pendingBatch,
    commitResult,
    errorMessage,
    confirmErrorMessage,
    currentQuestionCount,
    isLoadingBatch,
    isConfirming,
    isDiscarding,
    isReplaceConfirmOpen,
    lastRefreshedLabel,
    adminKeyModel,
    hasBatch,
    batchMode,
    batchModeLabel,
    batchSummary,
    batchCountLabel,
    batchSourceLabel,
    batchCreatedAtLabel,
    previewRows,
    previewRowsToShow,
    warningCountLabel,
    hasBlockingErrors,
    hasWarnings,
    canConfirm,
    canDiscard,
    currentQuestionCountLabel,
    reviewStatusTone,
    reviewStatusText,
    replaceConfirmDescription,
    resultTone,
    resultEyebrow,
    resultStatusLabel,
    resultTitle,
    resultText,
    resultStats,
    resultHint,
    refreshPendingBatch,
    handleConfirm,
    handleConfirmReplace,
    closeReplaceConfirm,
    handleDiscard
  };
}
