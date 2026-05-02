import Papa from "papaparse";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  commitQuestionImport,
  fetchQuestionStats,
  generateQuestionDraft,
  previewQuestionImport
} from "../../services/questionsApi";
import { useSettingsStore } from "../../stores/useSettingsStore";

const TEMPLATE_ROWS = [
  ["学科", "年级", "学期", "题型", "题目", "选项A", "选项B", "选项C", "选项D", "答案", "解析", "难度"],
  [
    "语文",
    "一年级",
    "上册",
    "脑筋急转弯",
    "大家看到哪个字，最容易一不小心就“读错”了？",
    "错",
    "正",
    "念",
    "字",
    "A",
    "脑筋急转弯的关键就在“读错”两个字。",
    "1"
  ],
  [
    "数学",
    "三年级",
    "通用",
    "情景计算",
    "小明有10颗糖，先送给妹妹2颗，又自己吃掉1颗，还剩几颗？",
    "7颗",
    "8颗",
    "9颗",
    "6颗",
    "A",
    "10 - 2 - 1 = 7。",
    "1"
  ]
];

const AI_SUBJECT_OPTIONS = ["语文", "数学", "英语"];
const AI_GRADE_OPTIONS = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];
const AI_SEMESTER_OPTIONS = ["上册", "下册", "通用"];
const AI_DIFFICULTY_OPTIONS = ["1", "2", "3"];
const AI_COUNT_OPTIONS = ["3", "5", "10"];

export function useQuestionImportRuntime({ props, emit }) {
  const settingsStore = useSettingsStore();
  settingsStore.hydrate();

  const fileInputRef = ref(null);
  const importMode = ref("append");
  const selectedFileName = ref("");
  const parsedRows = ref([]);
  const parseMessage = ref("");
  const previewResult = ref(null);
  const commitResult = ref(null);
  const statsErrorMessage = ref("");
  const currentQuestionCount = ref(0);
  const isDragging = ref(false);
  const isStatsLoading = ref(false);
  const isPreviewLoading = ref(false);
  const isCommitLoading = ref(false);
  const isReplaceImportConfirmOpen = ref(false);
  const replaceImportErrorMessage = ref("");
  const aiImportSubject = ref("语文");
  const aiImportGrade = ref("三年级");
  const aiImportSemester = ref("通用");
  const aiImportDifficulty = ref("1");
  const aiImportCount = ref("5");
  const aiImportTopic = ref("");
  const aiImportGuidance = ref("");
  const aiImportReferenceText = ref("");
  const isAiGenerating = ref(false);
  const aiGenerationStatusMessage = ref("");
  const aiGenerationErrorMessage = ref("");

  let statsController = null;
  let previewController = null;
  let commitController = null;
  let readExcelFileLoader = null;

  const adminKeyModel = computed({
    get: () => props.adminKey,
    set: (value) => emit("update:adminKey", value)
  });
  const hasParsedRows = computed(() => parsedRows.value.length > 0);
  const parsedRowCount = computed(() => parsedRows.value.length);
  const hasPreviewErrors = computed(() => (previewResult.value?.summary?.errorRows || 0) > 0);
  const hasPreviewWarnings = computed(() => (previewResult.value?.summary?.warningRows || 0) > 0);
  const previewRows = computed(() => previewResult.value?.rows || []);
  const previewRowsToShow = computed(() => previewRows.value.slice(0, 12));
  const importModeLabel = computed(() => (importMode.value === "replace" ? "覆盖导入" : "追加导入"));
  const currentQuestionCountLabel = computed(() =>
    isStatsLoading.value ? "加载中..." : `${currentQuestionCount.value} 题`
  );
  const selectedFileSummary = computed(() => {
    if (!selectedFileName.value) {
      return "还没有选择文件";
    }

    return hasParsedRows.value ? `${selectedFileName.value} · 已解析 ${parsedRowCount.value} 行` : selectedFileName.value;
  });
  const canCommit = computed(
    () =>
      !isCommitLoading.value &&
      !isPreviewLoading.value &&
      Boolean(previewResult.value?.validQuestions?.length) &&
      !hasPreviewErrors.value
  );

  function clearPreviewState() {
    previewResult.value = null;
    commitResult.value = null;
    parseMessage.value = "";
  }

  function resetFileState() {
    selectedFileName.value = "";
    parsedRows.value = [];
    clearPreviewState();
    clearAiGenerationMessages();
  }

  function abortControllers() {
    statsController?.abort();
    previewController?.abort();
    commitController?.abort();
  }

  async function loadStats() {
    statsController?.abort();
    statsController = new AbortController();
    isStatsLoading.value = true;
    statsErrorMessage.value = "";

    try {
      const payload = await fetchQuestionStats(statsController.signal);
      currentQuestionCount.value = payload.total;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      statsErrorMessage.value = error.message || "题库数量加载失败。";
    } finally {
      isStatsLoading.value = false;
      statsController = null;
    }
  }

  function openFileDialog() {
    fileInputRef.value?.click();
  }

  function formatParserIssues(errors) {
    if (!Array.isArray(errors) || errors.length === 0) {
      return "";
    }

    return errors
      .slice(0, 3)
      .map((error) => `第 ${error.row + 1} 行：${error.message}`)
      .join("；");
  }

  function clearAiGenerationMessages() {
    aiGenerationStatusMessage.value = "";
    aiGenerationErrorMessage.value = "";
  }

  function convertQuestionDraftToImportRow(question) {
    const optionMap = Object.fromEntries(
      Array.isArray(question?.options) ? question.options.map((option) => [option.key, option.text]) : []
    );

    return {
      学科: question?.subject || "",
      年级: question?.grade || "",
      学期: question?.semester || "",
      题型: question?.type || "",
      题目: question?.content || "",
      选项A: optionMap.A || "",
      选项B: optionMap.B || "",
      选项C: optionMap.C || "",
      选项D: optionMap.D || "",
      答案: question?.answer || "",
      解析: question?.explanation || "",
      难度: String(question?.difficulty ?? "")
    };
  }

  function buildAiBatchLabel(draftCount) {
    const topicLabel = String(aiImportTopic.value || "").trim();

    if (topicLabel) {
      return `AI 草稿 · ${topicLabel} · ${draftCount} 题`;
    }

    return `AI 草稿批次 · ${draftCount} 题`;
  }

  function handleParsedFile(file, parserResult) {
    const rows = Array.isArray(parserResult?.data)
      ? parserResult.data.filter((row) => Object.values(row || {}).some((value) => String(value || "").trim()))
      : [];
    const parserIssues = formatParserIssues(parserResult?.errors);

    clearAiGenerationMessages();
    selectedFileName.value = file.name;
    parsedRows.value = rows;
    previewResult.value = null;
    commitResult.value = null;
    parseMessage.value = parserIssues;

    if (rows.length === 0) {
      parseMessage.value = parserIssues || "文件里没有解析出有效题目。";
    }
  }

  function parseCsvFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete(result) {
        handleParsedFile(file, result);
      },
      error(error) {
        resetFileState();
        parseMessage.value = error.message || "CSV 解析失败。";
      }
    });
  }

  async function getReadExcelFile() {
    if (!readExcelFileLoader) {
      readExcelFileLoader = import("read-excel-file/browser").then((module) => module.readSheet);
    }

    return readExcelFileLoader;
  }

  async function parseWorkbookFile(file) {
    try {
      const readExcelFile = await getReadExcelFile();
      const rows = await readExcelFile(file);

      if (!Array.isArray(rows) || rows.length === 0) {
        resetFileState();
        parseMessage.value = "Excel 文件里没有解析出有效内容。";
        return;
      }

      const [headerRow = [], ...dataRows] = rows;
      const headers = headerRow.map((value) => String(value ?? "").trim());

      if (headers.every((header) => !header)) {
        resetFileState();
        parseMessage.value = "Excel 的第一行必须是表头。";
        return;
      }

      const normalizedRows = dataRows.map((row) =>
        headers.reduce((record, header, index) => {
          if (!header) {
            return record;
          }

          record[header] = row[index] ?? "";
          return record;
        }, {})
      );

      handleParsedFile(file, { data: normalizedRows, errors: [] });
    } catch (error) {
      resetFileState();
      parseMessage.value = error.message || "Excel 解析失败。";
    }
  }

  function getFileType(file) {
    const fileName = String(file?.name || "").toLowerCase();

    if (/\.csv$/i.test(fileName)) {
      return "csv";
    }

    if (/\.xlsx$/i.test(fileName)) {
      return "excel";
    }

    return "unsupported";
  }

  function parseSelectedFile(file) {
    if (!file) {
      return;
    }

    const fileType = getFileType(file);

    if (fileType === "csv") {
      parseCsvFile(file);
      return;
    }

    if (fileType === "excel") {
      parseWorkbookFile(file);
      return;
    }

    resetFileState();
    parseMessage.value = "当前支持 CSV 和 XLSX 文件。";
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    parseSelectedFile(file);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    isDragging.value = false;
    parseSelectedFile(event.dataTransfer?.files?.[0]);
  }

  function handleDragOver(event) {
    event.preventDefault();
    isDragging.value = true;
  }

  function handleDragLeave() {
    isDragging.value = false;
  }

  async function runPreviewForRows(rows) {
    previewController?.abort();
    previewController = new AbortController();
    isPreviewLoading.value = true;
    previewResult.value = null;
    commitResult.value = null;
    parseMessage.value = "";

    try {
      const payload = await previewQuestionImport({
        rows,
        mode: importMode.value,
        adminKey: adminKeyModel.value,
        signal: previewController.signal
      });

      previewResult.value = payload;
      currentQuestionCount.value = payload.summary.currentQuestionCount;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      parseMessage.value = error.message || "题库预检失败。";
    } finally {
      isPreviewLoading.value = false;
      previewController = null;
    }
  }

  async function handlePreview() {
    if (!hasParsedRows.value) {
      parseMessage.value = "请先选择一个 CSV 或 XLSX 文件。";
      return;
    }

    await runPreviewForRows(parsedRows.value);
  }

  async function handleGenerateAiBatch() {
    clearAiGenerationMessages();
    parseMessage.value = "";
    previewResult.value = null;
    commitResult.value = null;
    isAiGenerating.value = true;

    try {
      const payload = await generateQuestionDraft({
        request: {
          subject: aiImportSubject.value,
          grade: aiImportGrade.value,
          semester: aiImportSemester.value,
          difficulty: aiImportDifficulty.value,
          count: aiImportCount.value,
          topic: aiImportTopic.value,
          guidance: aiImportGuidance.value,
          referenceText: aiImportReferenceText.value,
          ...(settingsStore.effectiveQuestionModel ? { model: settingsStore.effectiveQuestionModel } : {}),
          ...(settingsStore.effectiveQuestionRuntimeConfig ? { aiRuntime: settingsStore.effectiveQuestionRuntimeConfig } : {})
        },
        adminKey: adminKeyModel.value
      });
      const rows = payload.drafts.map(convertQuestionDraftToImportRow);

      selectedFileName.value = buildAiBatchLabel(rows.length);
      parsedRows.value = rows;

      await runPreviewForRows(rows);

      aiGenerationStatusMessage.value =
        payload.meta?.sourceMode === "reference"
          ? `AI 已依据参考材料生成 ${rows.length} 题，并完成预检。`
          : `AI 已生成 ${rows.length} 题，并完成预检。`;
    } catch (error) {
      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      aiGenerationErrorMessage.value = `${error.message || "AI 批量生成失败。"}${details}`;
    } finally {
      isAiGenerating.value = false;
    }
  }

  async function commitQuestions() {
    commitController?.abort();
    commitController = new AbortController();
    isCommitLoading.value = true;
    commitResult.value = null;
    parseMessage.value = "";
    replaceImportErrorMessage.value = "";

    try {
      const payload = await commitQuestionImport({
        questions: previewResult.value.validQuestions,
        mode: importMode.value,
        adminKey: adminKeyModel.value,
        signal: commitController.signal
      });

      commitResult.value = payload;
      currentQuestionCount.value = payload.totalQuestionCount;
      emit("imported", payload);
      return true;
    } catch (error) {
      if (error.name === "AbortError") {
        return false;
      }

      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      const message = `${error.message || "题库导入失败。"}${details}`;
      parseMessage.value = message;
      replaceImportErrorMessage.value = message;
      return false;
    } finally {
      isCommitLoading.value = false;
      commitController = null;
    }
  }

  function closeReplaceImportConfirm() {
    if (isCommitLoading.value) {
      return;
    }

    replaceImportErrorMessage.value = "";
    isReplaceImportConfirmOpen.value = false;
  }

  async function handleConfirmReplaceImport() {
    if (!canCommit.value || importMode.value !== "replace") {
      closeReplaceImportConfirm();
      return;
    }

    const wasCommitted = await commitQuestions();

    if (wasCommitted) {
      closeReplaceImportConfirm();
    }
  }

  async function handleCommit() {
    if (!canCommit.value) {
      return;
    }

    if (importMode.value === "replace") {
      replaceImportErrorMessage.value = "";
      isReplaceImportConfirmOpen.value = true;
      return;
    }

    await commitQuestions();
  }

  function serializeCsvField(value) {
    const normalized = String(value ?? "");

    if (!/[",\r\n]/.test(normalized)) {
      return normalized;
    }

    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }

  function downloadCsvTemplate() {
    const csvContent = `\uFEFF${TEMPLATE_ROWS.map((row) => row.map(serializeCsvField).join(",")).join("\r\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "wonder-trivia-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  onMounted(() => {
    loadStats();
  });

  onBeforeUnmount(() => {
    abortControllers();
  });

  return {
    AI_SUBJECT_OPTIONS,
    AI_GRADE_OPTIONS,
    AI_SEMESTER_OPTIONS,
    AI_DIFFICULTY_OPTIONS,
    AI_COUNT_OPTIONS,
    fileInputRef,
    importMode,
    selectedFileName,
    parsedRows,
    parseMessage,
    previewResult,
    commitResult,
    statsErrorMessage,
    currentQuestionCount,
    isDragging,
    isStatsLoading,
    isPreviewLoading,
    isCommitLoading,
    isReplaceImportConfirmOpen,
    replaceImportErrorMessage,
    aiImportSubject,
    aiImportGrade,
    aiImportSemester,
    aiImportDifficulty,
    aiImportCount,
    aiImportTopic,
    aiImportGuidance,
    aiImportReferenceText,
    isAiGenerating,
    aiGenerationStatusMessage,
    aiGenerationErrorMessage,
    adminKeyModel,
    hasParsedRows,
    parsedRowCount,
    hasPreviewErrors,
    hasPreviewWarnings,
    previewRows,
    previewRowsToShow,
    importModeLabel,
    currentQuestionCountLabel,
    selectedFileSummary,
    canCommit,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handlePreview,
    handleGenerateAiBatch,
    handleCommit,
    closeReplaceImportConfirm,
    handleConfirmReplaceImport,
    openFileDialog,
    downloadCsvTemplate
  };
}
