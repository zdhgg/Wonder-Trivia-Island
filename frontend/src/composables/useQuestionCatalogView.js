import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  createQuestion,
  deleteQuestion,
  deleteQuestionsBatch,
  fetchQuestionCatalog,
  fetchQuestionStats,
  generateQuestionDraft,
  updateQuestion,
  updateQuestionsBatch
} from "../services/questionsApi";
import { useSettingsStore } from "../stores/useSettingsStore";

export function useQuestionCatalogView(props, emit) {
  const settingsStore = useSettingsStore();
  settingsStore.hydrate();

  const QUESTION_PAGE_SIZE = 6;

  const SUBJECT_OPTIONS = ["全部", "语文", "数学", "英语"];

  const EDIT_SUBJECT_OPTIONS = SUBJECT_OPTIONS.filter((subject) => subject !== "全部");

  const GRADE_OPTIONS = ["全部年级", "一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];

  const EDIT_GRADE_OPTIONS = GRADE_OPTIONS.filter((grade) => grade !== "全部年级");

  const SEMESTER_OPTIONS = ["全部学期", "上册", "下册", "通用"];

  const EDIT_SEMESTER_OPTIONS = SEMESTER_OPTIONS.filter((semester) => semester !== "全部学期");

  const FILTER_DIFFICULTY_OPTIONS = ["全部难度", "1", "2", "3"];

  const EDIT_DIFFICULTY_OPTIONS = ["1", "2", "3"];

  const BATCH_SUBJECT_OPTIONS = ["保持不变", ...EDIT_SUBJECT_OPTIONS];

  const BATCH_GRADE_OPTIONS = ["保持不变", ...EDIT_GRADE_OPTIONS];

  const BATCH_SEMESTER_OPTIONS = ["保持不变", ...EDIT_SEMESTER_OPTIONS];

  const BATCH_DIFFICULTY_OPTIONS = ["保持不变", ...EDIT_DIFFICULTY_OPTIONS];

  const ANSWER_OPTIONS = ["A", "B", "C", "D"];

  const questionSearchText = ref("");

  const questionSubject = ref("全部");

  const questionGrade = ref("全部年级");

  const questionSemester = ref("全部学期");

  const questionKnowledgeTag = ref("");

  const questionDifficulty = ref("全部难度");

  const questionList = ref([]);

  const questionListPagination = ref({
    page: 1,
    pageSize: QUESTION_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasPrevious: false,
    hasNext: false
  });

  const questionListErrorMessage = ref("");

  const statsErrorMessage = ref("");

  const currentQuestionCount = ref(0);

  const questionStats = ref({
    bySubject: {},
    byGrade: {},
    bySemester: {},
    topKnowledgeTags: []
  });

  const isStatsLoading = ref(false);

  const isQuestionListLoading = ref(false);

  const selectedQuestionIds = ref([]);

  const batchDraft = ref({
    subject: "保持不变",
    grade: "保持不变",
    semester: "保持不变",
    difficulty: "保持不变",
    knowledgeTag: "",
    clearKnowledgeTag: false
  });

  const editingQuestionId = ref(null);

  const editingDraft = ref(null);

  const isCreatePanelOpen = ref(false);

  const createDraft = ref(null);

  const aiDraft = ref(null);

  const createErrorMessage = ref("");

  const aiGenerationErrorMessage = ref("");

  const aiGenerationStatusMessage = ref("");

  const editorErrorMessage = ref("");

  const actionFeedback = ref({
    type: "",
    text: ""
  });

  const activeMutation = ref({
    questionId: null,
    type: ""
  });

  const isDeleteConfirmOpen = ref(false);

  const deleteConfirmMode = ref("");

  const deleteConfirmQuestion = ref(null);

  const deleteConfirmErrorMessage = ref("");

  let statsController = null;

  let questionListController = null;

  let actionController = null;

  const adminKeyModel = computed({
    get: () => props.adminKey,
    set: (value) => emit("update:adminKey", value)
  });

  const hasQuestionList = computed(() => questionList.value.length > 0);

  const selectedQuestionCount = computed(() => selectedQuestionIds.value.length);

  const hasSelectedQuestions = computed(() => selectedQuestionCount.value > 0);

  const visibleQuestionIds = computed(() => questionList.value.map((question) => question.id));

  const visibleQuestionCount = computed(() => questionList.value.length);

  const isAllVisibleSelected = computed(() => {
    if (visibleQuestionIds.value.length === 0) {
      return false;
    }

    return visibleQuestionIds.value.every((id) => selectedQuestionIds.value.includes(id));
  });

  const selectedCatalogGrade = computed(() => (questionGrade.value === "全部年级" ? "" : questionGrade.value));

  const selectedCatalogSemester = computed(() => (questionSemester.value === "全部学期" ? "" : questionSemester.value));

  const selectedCatalogKnowledgeTag = computed(() => String(questionKnowledgeTag.value || "").trim().replace(/\s+/g, " "));

  const selectedCatalogDifficulty = computed(() => (questionDifficulty.value === "全部难度" ? "" : questionDifficulty.value));

  const hasActiveFilters = computed(
    () =>
      Boolean(questionSearchText.value) ||
      questionSubject.value !== "全部" ||
      questionGrade.value !== "全部年级" ||
      questionSemester.value !== "全部学期" ||
      Boolean(selectedCatalogKnowledgeTag.value) ||
      questionDifficulty.value !== "全部难度"
  );

  const catalogPageLabel = computed(() => {
    const { page, totalPages, total } = questionListPagination.value;

    if (total === 0) {
      return "暂无匹配题目";
    }

    return `第 ${page} / ${Math.max(totalPages, 1)} 页 · 共 ${total} 题`;
  });

  const filterSummary = computed(() => {
    const subjectLabel = questionSubject.value === "全部" ? "全部学科" : questionSubject.value;
    const gradeLabel = questionGrade.value === "全部年级" ? "全部年级" : questionGrade.value;
    const semesterLabel = questionSemester.value === "全部学期" ? "全部学期" : questionSemester.value;
    const difficultyLabel = questionDifficulty.value === "全部难度" ? "全部难度" : `${questionDifficulty.value} 星`;
    const knowledgeTagLabel = selectedCatalogKnowledgeTag.value ? `标签 ${selectedCatalogKnowledgeTag.value}` : "";

    return [subjectLabel, gradeLabel, semesterLabel, difficultyLabel, knowledgeTagLabel].filter(Boolean).join(" · ");
  });

  const activeFilterCount = computed(
    () =>
      [
        Boolean(questionSearchText.value),
        questionSubject.value !== "全部",
        questionGrade.value !== "全部年级",
        questionSemester.value !== "全部学期",
        Boolean(selectedCatalogKnowledgeTag.value),
        questionDifficulty.value !== "全部难度"
      ].filter(Boolean).length
  );

  const hasActionFeedback = computed(() => Boolean(actionFeedback.value.text));

  const isBatchMutating = computed(
    () => activeMutation.value.type === "batch-update" || activeMutation.value.type === "batch-delete"
  );

  const batchActionSummary = computed(() => {
    if (!hasSelectedQuestions.value) {
      return "未选择";
    }

    if (batchDraft.value.clearKnowledgeTag) {
      return `已选 ${selectedQuestionCount.value} 题 · 准备清空标签`;
    }

    if (String(batchDraft.value.knowledgeTag || "").trim()) {
      return `已选 ${selectedQuestionCount.value} 题 · 标签 -> ${String(batchDraft.value.knowledgeTag).trim()}`;
    }

    return `已选 ${selectedQuestionCount.value} 题`;
  });

  const knowledgeTagSuggestions = computed(() => {
    const suggestionSet = new Set();

    for (const item of questionStats.value.topKnowledgeTags || []) {
      const label = String(item?.label || "").trim();

      if (label) {
        suggestionSet.add(label);
      }
    }

    for (const question of questionList.value) {
      const label = String(question?.knowledgeTag || "").trim();

      if (label) {
        suggestionSet.add(label);
      }
    }

    return Array.from(suggestionSet).slice(0, 18);
  });

  const deleteConfirmTitle = computed(() =>
    deleteConfirmMode.value === "batch" ? "确认批量删除题目" : "确认删除题目"
  );

  const deleteConfirmDescription = computed(() => {
    if (deleteConfirmMode.value === "batch") {
      return `当前已选择 ${selectedQuestionCount.value} 道题，删除后将无法恢复。`;
    }

    if (deleteConfirmQuestion.value) {
      return `题目 #${deleteConfirmQuestion.value.id} 删除后将无法恢复，请再次确认。`;
    }

    return "删除后将无法恢复，请再次确认。";
  });

  const deleteConfirmPreview = computed(() =>
    deleteConfirmQuestion.value ? deleteConfirmQuestion.value.content : ""
  );

  const deleteConfirmMetaText = computed(() => {
    if (deleteConfirmMode.value === "batch") {
      return `本次将删除 ${selectedQuestionCount.value} 道已选题目，删除完成后会重新整理当前列表。`;
    }

    if (deleteConfirmQuestion.value) {
      return `题号 #${deleteConfirmQuestion.value.id} · ${deleteConfirmQuestion.value.grade} · ${deleteConfirmQuestion.value.semester || "通用"}`;
    }

    return "";
  });

  const deleteConfirmChips = computed(() => {
    if (deleteConfirmMode.value === "batch") {
      return [`已选 ${selectedQuestionCount.value} 题`, filterSummary.value];
    }

    if (deleteConfirmQuestion.value) {
      return [
        deleteConfirmQuestion.value.subject,
        deleteConfirmQuestion.value.grade,
        deleteConfirmQuestion.value.semester || "通用",
        `难度 ${deleteConfirmQuestion.value.difficulty}`
      ];
    }

    return [];
  });

  const isDeleteConfirmLoading = computed(() => {
    if (deleteConfirmMode.value === "batch") {
      return activeMutation.value.type === "batch-delete";
    }

    if (deleteConfirmMode.value === "single" && deleteConfirmQuestion.value) {
      return isMutatingQuestion(deleteConfirmQuestion.value.id, "delete");
    }

    return false;
  });

  function buildGroupedStatItems(labels, sourceMap) {
    return labels.map((label) => {
      const count = Number(sourceMap?.[label] || 0);
      const share = currentQuestionCount.value > 0 ? Math.max(0, Math.round((count / currentQuestionCount.value) * 100)) : 0;

      return {
        label,
        count,
        share
      };
    });
  }

  const groupedStats = computed(() => [
    {
      key: "subject",
      label: "学科分布",
      caption: "按题目所属学科查看当前覆盖。",
      items: buildGroupedStatItems(
        SUBJECT_OPTIONS.filter((subject) => subject !== "全部"),
        questionStats.value.bySubject
      )
    },
    {
      key: "grade",
      label: "年级分布",
      caption: "看题库在不同年级的分布密度。",
      items: buildGroupedStatItems(
        GRADE_OPTIONS.filter((grade) => grade !== "全部年级"),
        questionStats.value.byGrade
      )
    },
    {
      key: "semester",
      label: "学期分布",
      caption: "确认上册、下册和通用题目的比例。",
      items: buildGroupedStatItems(
        SEMESTER_OPTIONS.filter((semester) => semester !== "全部学期"),
        questionStats.value.bySemester
      )
    }
  ]);

  const catalogHeroMetrics = computed(() => {
    const listValue = isQuestionListLoading.value
      ? "更新中"
      : questionListErrorMessage.value
        ? "暂不可用"
        : hasQuestionList.value
          ? `${visibleQuestionCount.value} 题可见`
          : currentQuestionCount.value === 0
            ? "题库为空"
            : hasActiveFilters.value
              ? "暂无匹配"
              : "暂无列表";

    return [
      {
        key: "total",
        label: "题库总量",
        value: isStatsLoading.value ? "整理中" : `${currentQuestionCount.value} 题`,
        note: statsErrorMessage.value || "按学科、年级和学期自动汇总",
        tone: isStatsLoading.value ? "calm" : "default"
      },
      {
        key: "list",
        label: "当前列表",
        value: listValue,
        note: questionListErrorMessage.value
          ? "请刷新列表，或稍后重试。"
          : hasSelectedQuestions.value
            ? `${catalogPageLabel.value} · 已选 ${selectedQuestionCount.value} 题`
            : catalogPageLabel.value,
        tone: questionListErrorMessage.value ? "error" : hasQuestionList.value ? "default" : "warning"
      },
      {
        key: "filters",
        label: "筛选状态",
        value: hasActiveFilters.value ? `已启用 ${activeFilterCount.value} 项` : "全部题目",
        note: hasActiveFilters.value ? filterSummary.value : "当前未限制学科、年级、学期、标签或难度",
        tone: hasActiveFilters.value ? "accent" : "default"
      }
    ];
  });

  const shouldShowCatalogEmptyState = computed(() => !hasQuestionList.value);

  const catalogEmptyStateTone = computed(() => {
    if (isQuestionListLoading.value) {
      return "loading";
    }

    if (questionListErrorMessage.value) {
      return "error";
    }

    if (hasActiveFilters.value) {
      return "filtered";
    }

    return "idle";
  });

  const catalogEmptyStateEyebrow = computed(() => {
    if (isQuestionListLoading.value) {
      return "Archive Loading";
    }

    if (questionListErrorMessage.value) {
      return "Archive Review";
    }

    if (currentQuestionCount.value === 0) {
      return "Archive Setup";
    }

    return "Filter Review";
  });

  const catalogEmptyStateLabel = computed(() => {
    if (isQuestionListLoading.value) {
      return "正在整理";
    }

    if (questionListErrorMessage.value) {
      return "需要重试";
    }

    if (currentQuestionCount.value === 0) {
      return "题库为空";
    }

    return hasActiveFilters.value ? "暂无匹配" : "当前无题";
  });

  const catalogEmptyStateTitle = computed(() => {
    if (isQuestionListLoading.value) {
      return "题库正在整理中";
    }

    if (questionListErrorMessage.value) {
      return "题库暂时没打开";
    }

    if (currentQuestionCount.value === 0) {
      return "题库里还没有任何题目";
    }

    if (hasActiveFilters.value) {
      return "没有找到匹配题目";
    }

    return "当前列表暂时没有题目";
  });

  const catalogEmptyStateText = computed(() => {
    if (isQuestionListLoading.value) {
      return "正在读取当前筛选结果和分页信息，整理完成后会自动显示列表。";
    }

    if (questionListErrorMessage.value) {
      return `${questionListErrorMessage.value} 可以先重试一次，如果仍然失败，再检查口令或稍后刷新。`;
    }

    if (currentQuestionCount.value === 0) {
      return "这座题库档案室还是空的。先新增题目，或先去导入一批新题，再回来继续整理。";
    }

    if (hasActiveFilters.value) {
      return `当前条件是 ${filterSummary.value}。先放宽筛选，通常就能重新看到题目。`;
    }

    return "列表当前没有可展示的题目。可以刷新列表，或先新增题目再继续整理。";
  });

  const catalogEmptyStateStats = computed(() => [
    {
      label: "当前题库",
      value: isStatsLoading.value ? "整理中" : `${currentQuestionCount.value} 题`
    },
    {
      label: "筛选状态",
      value: hasActiveFilters.value ? `已启用 ${activeFilterCount.value} 项` : "全部题目"
    },
    {
      label: "访问方式",
      value: adminKeyModel.value ? "已填口令" : "本机访问"
    }
  ]);

  const catalogEmptyStateHint = computed(() => {
    if (isQuestionListLoading.value) {
      return "列表准备完成后会自动显示，不需要额外操作。";
    }

    if (questionListErrorMessage.value) {
      return "优先重试；如果还是失败，再切回题库导入或检查后端状态。";
    }

    if (currentQuestionCount.value === 0) {
      return "建议先新增一题试跑流程，或者直接导入一批题目。";
    }

    if (hasActiveFilters.value) {
      return "先清空筛选，再判断题库是否真的缺题。";
    }

    return "可以刷新列表，或先新增题目补上内容。";
  });

  const isCreatingQuestion = computed(() => activeMutation.value.type === "create");

  const isGeneratingQuestionDraft = computed(() => activeMutation.value.type === "generate-draft");

  const catalogChallengeAssist = computed(() => normalizeExternalFilters(props.initialFilters));

  const catalogChallengeAssistChips = computed(() => {
    if (!catalogChallengeAssist.value) {
      return [];
    }

    const chips = [];

    if (catalogChallengeAssist.value.subject && catalogChallengeAssist.value.subject !== "全部") {
      chips.push(catalogChallengeAssist.value.subject);
    }

    if (catalogChallengeAssist.value.grade && catalogChallengeAssist.value.grade !== "全部年级") {
      chips.push(catalogChallengeAssist.value.grade);
    }

    if (catalogChallengeAssist.value.semester && catalogChallengeAssist.value.semester !== "全部学期") {
      chips.push(catalogChallengeAssist.value.semester);
    }

    if (catalogChallengeAssist.value.difficulty && catalogChallengeAssist.value.difficulty !== "全部难度") {
      chips.push(`${catalogChallengeAssist.value.difficulty} 星`);
    }

    if (catalogChallengeAssist.value.knowledgeTag) {
      chips.push(`标签 ${catalogChallengeAssist.value.knowledgeTag}`);
    }

    return chips;
  });

  function normalizeExternalFilters(rawFilters) {
    if (!rawFilters || typeof rawFilters !== "object") {
      return null;
    }

    const normalizedSubject = SUBJECT_OPTIONS.includes(rawFilters.subject) ? rawFilters.subject : "全部";
    const normalizedGrade = GRADE_OPTIONS.includes(rawFilters.grade) ? rawFilters.grade : "全部年级";
    const normalizedSemester = SEMESTER_OPTIONS.includes(rawFilters.semester) ? rawFilters.semester : "全部学期";
    const normalizedDifficulty = FILTER_DIFFICULTY_OPTIONS.includes(String(rawFilters.difficulty || ""))
      ? String(rawFilters.difficulty || "")
      : "全部难度";
    const normalizedKnowledgeTag = String(rawFilters.knowledgeTag || "").trim().replace(/\s+/g, " ");
    const normalizedQuery = String(rawFilters.query || "").trim();
    const normalizedSourceLabel = String(rawFilters.sourceLabel || "").trim();

    return {
      subject: normalizedSubject,
      grade: normalizedGrade,
      semester: normalizedSemester,
      difficulty: normalizedDifficulty,
      knowledgeTag: normalizedKnowledgeTag,
      query: normalizedQuery,
      sourceLabel: normalizedSourceLabel
    };
  }

  function applyExternalFilters(filters, { shouldLoad = true } = {}) {
    const normalizedFilters = normalizeExternalFilters(filters);

    if (!normalizedFilters) {
      return;
    }

    questionSearchText.value = normalizedFilters.query;
    questionSubject.value = normalizedFilters.subject;
    questionGrade.value = normalizedFilters.grade;
    questionSemester.value = normalizedFilters.semester;
    questionKnowledgeTag.value = normalizedFilters.knowledgeTag;
    questionDifficulty.value = normalizedFilters.difficulty;
    clearSelection();
    resetBatchDraft();
    clearEditingState();

    if (normalizedFilters.sourceLabel) {
      setActionFeedback("success", `已定位到 ${normalizedFilters.sourceLabel} 的补题范围。`);
    }

    if (shouldLoad) {
      loadQuestionCatalog({ resetPage: true });
    }
  }

  function fillBatchTagFromChallengeAssist() {
    if (!catalogChallengeAssist.value?.knowledgeTag) {
      return;
    }

    applyBatchKnowledgeTag(catalogChallengeAssist.value.knowledgeTag);
    setActionFeedback("success", `已把 ${catalogChallengeAssist.value.knowledgeTag} 填入批量标签栏。`);
  }

  function selectVisibleQuestionsAndFillChallengeTag() {
    if (!catalogChallengeAssist.value?.knowledgeTag || visibleQuestionIds.value.length === 0) {
      return;
    }

    selectedQuestionIds.value = [...new Set([...selectedQuestionIds.value, ...visibleQuestionIds.value])];
    applyBatchKnowledgeTag(catalogChallengeAssist.value.knowledgeTag);
    setActionFeedback("success", `已全选本页，并填入 ${catalogChallengeAssist.value.knowledgeTag} 标签。下一步点“批量修改”。`);
  }

  function createEmptyQuestionDraft() {
    return {
      subject: "语文",
      grade: "三年级",
      semester: "通用",
      knowledgeTag: "",
      type: "",
      content: "",
      imageUrl: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      answer: "A",
      explanation: "",
      difficulty: "1"
    };
  }

  function createEmptyAiDraft() {
    return {
      topic: "",
      guidance: "",
      referenceText: ""
    };
  }

  function createEditingDraft(question) {
    const optionMap = Object.fromEntries(question.options.map((option) => [option.key, option.text]));

    return {
      subject: question.subject,
      grade: question.grade,
      semester: question.semester || "通用",
      knowledgeTag: question.knowledgeTag || "",
      type: question.type,
      content: question.content,
      imageUrl: question.imageUrl || "",
      optionA: optionMap.A || "",
      optionB: optionMap.B || "",
      optionC: optionMap.C || "",
      optionD: optionMap.D || "",
      answer: question.answer,
      explanation: question.explanation,
      difficulty: String(question.difficulty)
    };
  }

  function buildQuestionPayloadFromDraft(draft) {
    return {
      subject: draft.subject,
      grade: draft.grade,
      semester: draft.semester,
      knowledgeTag: draft.knowledgeTag,
      type: draft.type,
      content: draft.content,
      imageUrl: draft.imageUrl,
      options: ANSWER_OPTIONS.map((key) => ({
        key,
        text: draft[`option${key}`]
      })),
      answer: draft.answer,
      explanation: draft.explanation,
      difficulty: Number.parseInt(draft.difficulty, 10)
    };
  }

  function setActionFeedback(type, text) {
    actionFeedback.value = { type, text };
  }

  function clearActionFeedback() {
    actionFeedback.value = { type: "", text: "" };
  }

  function resetQuestionListState() {
    questionList.value = [];
    questionListPagination.value = {
      page: 1,
      pageSize: QUESTION_PAGE_SIZE,
      total: 0,
      totalPages: 0,
      hasPrevious: false,
      hasNext: false
    };
  }

  function clearEditingState() {
    editingQuestionId.value = null;
    editingDraft.value = null;
    editorErrorMessage.value = "";
  }

  function closeCreatePanel() {
    isCreatePanelOpen.value = false;
    createDraft.value = null;
    aiDraft.value = null;
    createErrorMessage.value = "";
    aiGenerationErrorMessage.value = "";
    aiGenerationStatusMessage.value = "";
  }

  function resetBatchDraft() {
    batchDraft.value = {
      subject: "保持不变",
      grade: "保持不变",
      semester: "保持不变",
      difficulty: "保持不变",
      knowledgeTag: "",
      clearKnowledgeTag: false
    };
  }

  function handleBatchKnowledgeTagInput() {
    if (batchDraft.value.clearKnowledgeTag) {
      batchDraft.value.clearKnowledgeTag = false;
    }
  }

  function toggleBatchKnowledgeTagClear() {
    const nextValue = !batchDraft.value.clearKnowledgeTag;
    batchDraft.value.clearKnowledgeTag = nextValue;

    if (nextValue) {
      batchDraft.value.knowledgeTag = "";
    }
  }

  function applyKnowledgeTagFilter(tag) {
    const normalizedTag = String(tag || "").trim();

    if (!normalizedTag) {
      return;
    }

    questionKnowledgeTag.value = normalizedTag;
    handleQuestionListSearch();
  }

  function applyBatchKnowledgeTag(tag) {
    const normalizedTag = String(tag || "").trim();

    if (!normalizedTag) {
      return;
    }

    batchDraft.value.knowledgeTag = normalizedTag;
    batchDraft.value.clearKnowledgeTag = false;
  }

  function clearSelection() {
    selectedQuestionIds.value = [];
  }

  function abortControllers() {
    statsController?.abort();
    questionListController?.abort();
    actionController?.abort();
  }

  function beginMutation(questionId, type) {
    actionController?.abort();
    actionController = new AbortController();
    activeMutation.value = { questionId, type };
    return actionController;
  }

  function endMutation() {
    actionController = null;
    activeMutation.value = { questionId: null, type: "" };
  }

  function isMutatingQuestion(questionId, type) {
    return activeMutation.value.questionId === questionId && activeMutation.value.type === type;
  }

  function isQuestionSelected(questionId) {
    return selectedQuestionIds.value.includes(questionId);
  }

  function toggleQuestionSelection(questionId) {
    if (isQuestionSelected(questionId)) {
      selectedQuestionIds.value = selectedQuestionIds.value.filter((id) => id !== questionId);
      return;
    }

    selectedQuestionIds.value = [...selectedQuestionIds.value, questionId];
  }

  function toggleVisibleSelection() {
    if (isAllVisibleSelected.value) {
      const visibleIdSet = new Set(visibleQuestionIds.value);
      selectedQuestionIds.value = selectedQuestionIds.value.filter((id) => !visibleIdSet.has(id));
      return;
    }

    selectedQuestionIds.value = [...new Set([...selectedQuestionIds.value, ...visibleQuestionIds.value])];
  }

  function buildBatchChanges() {
    const changes = {};

    if (batchDraft.value.subject !== "保持不变") {
      changes.subject = batchDraft.value.subject;
    }

    if (batchDraft.value.grade !== "保持不变") {
      changes.grade = batchDraft.value.grade;
    }

    if (batchDraft.value.semester !== "保持不变") {
      changes.semester = batchDraft.value.semester;
    }

    if (batchDraft.value.difficulty !== "保持不变") {
      changes.difficulty = batchDraft.value.difficulty;
    }

    if (batchDraft.value.clearKnowledgeTag) {
      changes.knowledgeTag = "";
    } else {
      const normalizedKnowledgeTag = String(batchDraft.value.knowledgeTag || "").trim().replace(/\s+/g, " ");

      if (normalizedKnowledgeTag) {
        changes.knowledgeTag = normalizedKnowledgeTag;
      }
    }

    return changes;
  }

  async function loadStats() {
    statsController?.abort();
    statsController = new AbortController();
    isStatsLoading.value = true;
    statsErrorMessage.value = "";

    try {
      const payload = await fetchQuestionStats(statsController.signal);
      currentQuestionCount.value = payload.total;
      questionStats.value = {
        bySubject: payload.bySubject || {},
        byGrade: payload.byGrade || {},
        bySemester: payload.bySemester || {},
        topKnowledgeTags: Array.isArray(payload.topKnowledgeTags) ? payload.topKnowledgeTags : []
      };
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      statsErrorMessage.value = error.message || "题库数量加载失败。";
      questionStats.value = {
        bySubject: {},
        byGrade: {},
        bySemester: {},
        topKnowledgeTags: []
      };
    } finally {
      isStatsLoading.value = false;
      statsController = null;
    }
  }

  async function loadQuestionCatalog({ page = 1, resetPage = false } = {}) {
    questionListController?.abort();
    questionListController = new AbortController();
    isQuestionListLoading.value = true;
    questionListErrorMessage.value = "";

    try {
      const payload = await fetchQuestionCatalog({
        page: resetPage ? 1 : page,
        pageSize: questionListPagination.value.pageSize,
        subject: questionSubject.value === "全部" ? "" : questionSubject.value,
        grade: selectedCatalogGrade.value,
        semester: selectedCatalogSemester.value,
        knowledgeTag: selectedCatalogKnowledgeTag.value,
        difficulty: selectedCatalogDifficulty.value,
        query: questionSearchText.value,
        adminKey: adminKeyModel.value,
        signal: questionListController.signal
      });

      questionList.value = payload.data;
      questionListPagination.value = payload.pagination;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      resetQuestionListState();
      questionListErrorMessage.value = error.message || "题库列表加载失败。";
    } finally {
      isQuestionListLoading.value = false;
      questionListController = null;
    }
  }

  function handleQuestionListSearch() {
    clearActionFeedback();
    clearSelection();
    resetBatchDraft();
    loadQuestionCatalog({ resetPage: true });
  }

  function clearCatalogFilters() {
    questionSearchText.value = "";
    questionSubject.value = "全部";
    questionGrade.value = "全部年级";
    questionSemester.value = "全部学期";
    questionKnowledgeTag.value = "";
    questionDifficulty.value = "全部难度";
    handleQuestionListSearch();
  }

  function handleQuestionListPageChange(page) {
    if (isQuestionListLoading.value) {
      return;
    }

    clearActionFeedback();
    loadQuestionCatalog({ page });
  }

  function handleRefresh() {
    clearActionFeedback();
    loadStats();
    loadQuestionCatalog({ page: questionListPagination.value.page });
  }

  function openCreatePanel() {
    clearActionFeedback();
    clearEditingState();
    isCreatePanelOpen.value = true;
    const nextDraft = createEmptyQuestionDraft();

    if (catalogChallengeAssist.value) {
      if (catalogChallengeAssist.value.subject && catalogChallengeAssist.value.subject !== "全部") {
        nextDraft.subject = catalogChallengeAssist.value.subject;
      }

      if (catalogChallengeAssist.value.grade && catalogChallengeAssist.value.grade !== "全部年级") {
        nextDraft.grade = catalogChallengeAssist.value.grade;
      }

      if (catalogChallengeAssist.value.semester && catalogChallengeAssist.value.semester !== "全部学期") {
        nextDraft.semester = catalogChallengeAssist.value.semester;
      }

      if (catalogChallengeAssist.value.knowledgeTag) {
        nextDraft.knowledgeTag = catalogChallengeAssist.value.knowledgeTag;
      }

      if (catalogChallengeAssist.value.difficulty && catalogChallengeAssist.value.difficulty !== "全部难度") {
        nextDraft.difficulty = catalogChallengeAssist.value.difficulty;
      }
    }

    createDraft.value = nextDraft;
    aiDraft.value = createEmptyAiDraft();
    createErrorMessage.value = "";
    aiGenerationErrorMessage.value = "";
    aiGenerationStatusMessage.value = "";
  }

  function handleEditStart(question) {
    clearActionFeedback();
    closeCreatePanel();
    editingQuestionId.value = question.id;
    editingDraft.value = createEditingDraft(question);
    editorErrorMessage.value = "";
  }

  function handleEditCancel() {
    clearEditingState();
  }

  async function handleBatchUpdate() {
    if (!hasSelectedQuestions.value) {
      return;
    }

    const changes = buildBatchChanges();

    if (Object.keys(changes).length === 0) {
      setActionFeedback("error", "请先选择至少一个要批量修改的字段。");
      return;
    }

    clearActionFeedback();
    const controller = beginMutation(0, "batch-update");

    try {
      await updateQuestionsBatch({
        ids: selectedQuestionIds.value,
        changes,
        adminKey: adminKeyModel.value,
        signal: controller.signal
      });

      clearEditingState();
      clearSelection();
      resetBatchDraft();
      await loadQuestionCatalog({ page: questionListPagination.value.page });
      setActionFeedback("success", "批量更新完成。");
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      setActionFeedback("error", `${error.message || "批量更新失败。"}${details}`);
    } finally {
      endMutation();
    }
  }

  function openBatchDeleteConfirm() {
    if (!hasSelectedQuestions.value) {
      return;
    }

    deleteConfirmErrorMessage.value = "";
    deleteConfirmMode.value = "batch";
    deleteConfirmQuestion.value = null;
    isDeleteConfirmOpen.value = true;
  }

  function openDeleteQuestionConfirm(question) {
    deleteConfirmErrorMessage.value = "";
    deleteConfirmMode.value = "single";
    deleteConfirmQuestion.value = question;
    isDeleteConfirmOpen.value = true;
  }

  function closeDeleteConfirm() {
    if (isDeleteConfirmLoading.value) {
      return;
    }

    deleteConfirmErrorMessage.value = "";
    isDeleteConfirmOpen.value = false;
    deleteConfirmMode.value = "";
    deleteConfirmQuestion.value = null;
  }

  async function performBatchDelete() {
    if (!hasSelectedQuestions.value) {
      return false;
    }

    clearActionFeedback();
    deleteConfirmErrorMessage.value = "";
    const controller = beginMutation(0, "batch-delete");

    try {
      await deleteQuestionsBatch({
        ids: selectedQuestionIds.value,
        adminKey: adminKeyModel.value,
        signal: controller.signal
      });

      clearEditingState();
      clearSelection();
      resetBatchDraft();
      await Promise.all([loadStats(), loadQuestionCatalog({ page: questionListPagination.value.page })]);
      setActionFeedback("success", "批量删除完成。");
      return true;
    } catch (error) {
      if (error.name === "AbortError") {
        return false;
      }

      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      const message = `${error.message || "批量删除失败。"}${details}`;
      deleteConfirmErrorMessage.value = message;
      setActionFeedback("error", message);
      return false;
    } finally {
      endMutation();
    }
  }

  async function handleSaveQuestion(questionId) {
    if (!editingDraft.value || editingQuestionId.value !== questionId) {
      return;
    }

    clearActionFeedback();
    editorErrorMessage.value = "";
    const controller = beginMutation(questionId, "save");

    try {
      await updateQuestion({
        questionId,
        question: buildQuestionPayloadFromDraft(editingDraft.value),
        adminKey: adminKeyModel.value,
        signal: controller.signal
      });

      clearEditingState();
      await loadQuestionCatalog({ page: questionListPagination.value.page });
      setActionFeedback("success", "题目已更新。");
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      editorErrorMessage.value = `${error.message || "更新题目失败。"}${details}`;
    } finally {
      endMutation();
    }
  }

  async function handleCreateQuestion() {
    if (!createDraft.value) {
      return;
    }

    clearActionFeedback();
    createErrorMessage.value = "";
    const controller = beginMutation(0, "create");

    try {
      await createQuestion({
        question: buildQuestionPayloadFromDraft(createDraft.value),
        adminKey: adminKeyModel.value,
        signal: controller.signal
      });

      closeCreatePanel();
      clearSelection();
      await Promise.all([loadStats(), loadQuestionCatalog({ page: 1 })]);
      setActionFeedback("success", "题目已新增。");
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      createErrorMessage.value = `${error.message || "新增题目失败。"}${details}`;
    } finally {
      endMutation();
    }
  }

  async function handleGenerateQuestionDraft() {
    if (!createDraft.value) {
      return;
    }

    clearActionFeedback();
    createErrorMessage.value = "";
    aiGenerationErrorMessage.value = "";
    aiGenerationStatusMessage.value = "";
    const controller = beginMutation(0, "generate-draft");

    try {
      const payload = await generateQuestionDraft({
        request: {
          subject: createDraft.value.subject,
          grade: createDraft.value.grade,
          semester: createDraft.value.semester,
          knowledgeTag: createDraft.value.knowledgeTag,
          difficulty: createDraft.value.difficulty,
          count: 1,
          topic: aiDraft.value?.topic || "",
          guidance: aiDraft.value?.guidance || "",
          referenceText: aiDraft.value?.referenceText || "",
          ...(settingsStore.effectiveQuestionModel ? { model: settingsStore.effectiveQuestionModel } : {}),
          ...(settingsStore.effectiveQuestionRuntimeConfig ? { aiRuntime: settingsStore.effectiveQuestionRuntimeConfig } : {})
        },
        adminKey: adminKeyModel.value,
        signal: controller.signal
      });

      const preservedKnowledgeTag = createDraft.value.knowledgeTag;

      createDraft.value = createEditingDraft(payload.data);
      createDraft.value.knowledgeTag = createDraft.value.knowledgeTag || preservedKnowledgeTag;
      aiGenerationStatusMessage.value =
        payload.meta?.sourceMode === "reference"
          ? "AI 已根据参考材料生成草稿，请继续人工确认。"
          : "AI 草稿已填入表单，请继续人工确认。";
      setActionFeedback("success", "AI 草稿已生成。");
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      aiGenerationErrorMessage.value = `${error.message || "AI 出题失败。"}${details}`;
    } finally {
      endMutation();
    }
  }

  async function performDeleteQuestion(question) {
    if (!question) {
      return false;
    }

    clearActionFeedback();
    deleteConfirmErrorMessage.value = "";
    const controller = beginMutation(question.id, "delete");

    try {
      await deleteQuestion({
        questionId: question.id,
        adminKey: adminKeyModel.value,
        signal: controller.signal
      });

      if (editingQuestionId.value === question.id) {
        clearEditingState();
      }

      selectedQuestionIds.value = selectedQuestionIds.value.filter((id) => id !== question.id);

      await Promise.all([loadStats(), loadQuestionCatalog({ page: questionListPagination.value.page })]);
      setActionFeedback("success", `题目 #${question.id} 已删除。`);
      return true;
    } catch (error) {
      if (error.name === "AbortError") {
        return false;
      }

      const details = Array.isArray(error.details) && error.details.length > 0 ? ` ${error.details[0]}` : "";
      const message = `${error.message || "删除题目失败。"}${details}`;
      deleteConfirmErrorMessage.value = message;
      setActionFeedback("error", message);
      return false;
    } finally {
      endMutation();
    }
  }

  async function handleDeleteConfirm() {
    const currentMode = deleteConfirmMode.value;
    const currentQuestion = deleteConfirmQuestion.value;
    let wasDeleted = false;

    if (currentMode === "batch") {
      wasDeleted = await performBatchDelete();
    } else if (currentMode === "single" && currentQuestion) {
      wasDeleted = await performDeleteQuestion(currentQuestion);
    }

    if (wasDeleted) {
      closeDeleteConfirm();
    }
  }

  onMounted(() => {
    loadStats();
    if (props.initialFilters) {
      applyExternalFilters(props.initialFilters);
      return;
    }

    loadQuestionCatalog();
  });

  watch(
    () => props.initialFilters?.requestKey,
    (nextRequestKey, previousRequestKey) => {
      if (!nextRequestKey || nextRequestKey === previousRequestKey) {
        return;
      }

      applyExternalFilters(props.initialFilters);
    }
  );

  onBeforeUnmount(() => {
    abortControllers();
  });

  return {
    QUESTION_PAGE_SIZE,
    SUBJECT_OPTIONS,
    EDIT_SUBJECT_OPTIONS,
    GRADE_OPTIONS,
    EDIT_GRADE_OPTIONS,
    SEMESTER_OPTIONS,
    EDIT_SEMESTER_OPTIONS,
    FILTER_DIFFICULTY_OPTIONS,
    EDIT_DIFFICULTY_OPTIONS,
    BATCH_SUBJECT_OPTIONS,
    BATCH_GRADE_OPTIONS,
    BATCH_SEMESTER_OPTIONS,
    BATCH_DIFFICULTY_OPTIONS,
    ANSWER_OPTIONS,
    questionSearchText,
    questionSubject,
    questionGrade,
    questionSemester,
    questionKnowledgeTag,
    questionDifficulty,
    questionList,
    questionListPagination,
    questionListErrorMessage,
    statsErrorMessage,
    currentQuestionCount,
    questionStats,
    isStatsLoading,
    isQuestionListLoading,
    selectedQuestionIds,
    batchDraft,
    editingQuestionId,
    editingDraft,
    isCreatePanelOpen,
    createDraft,
    aiDraft,
    createErrorMessage,
    aiGenerationErrorMessage,
    aiGenerationStatusMessage,
    editorErrorMessage,
    actionFeedback,
    activeMutation,
    isDeleteConfirmOpen,
    deleteConfirmMode,
    deleteConfirmQuestion,
    deleteConfirmErrorMessage,
    statsController,
    questionListController,
    actionController,
    adminKeyModel,
    hasQuestionList,
    selectedQuestionCount,
    hasSelectedQuestions,
    visibleQuestionIds,
    visibleQuestionCount,
    isAllVisibleSelected,
    selectedCatalogGrade,
    selectedCatalogSemester,
    selectedCatalogKnowledgeTag,
    selectedCatalogDifficulty,
    hasActiveFilters,
    activeFilterCount,
    catalogPageLabel,
    filterSummary,
    hasActionFeedback,
    isBatchMutating,
    batchActionSummary,
    knowledgeTagSuggestions,
    catalogChallengeAssist,
    catalogChallengeAssistChips,
    deleteConfirmTitle,
    deleteConfirmDescription,
    deleteConfirmPreview,
    deleteConfirmMetaText,
    deleteConfirmChips,
    isDeleteConfirmLoading,
    groupedStats,
    catalogHeroMetrics,
    shouldShowCatalogEmptyState,
    catalogEmptyStateTone,
    catalogEmptyStateEyebrow,
    catalogEmptyStateLabel,
    catalogEmptyStateTitle,
    catalogEmptyStateText,
    catalogEmptyStateStats,
    catalogEmptyStateHint,
    isCreatingQuestion,
    isGeneratingQuestionDraft,
    createEmptyQuestionDraft,
    createEmptyAiDraft,
    createEditingDraft,
    buildQuestionPayloadFromDraft,
    setActionFeedback,
    clearActionFeedback,
    resetQuestionListState,
    clearEditingState,
    closeCreatePanel,
    resetBatchDraft,
    clearSelection,
    handleBatchKnowledgeTagInput,
    toggleBatchKnowledgeTagClear,
    applyKnowledgeTagFilter,
    applyBatchKnowledgeTag,
    fillBatchTagFromChallengeAssist,
    selectVisibleQuestionsAndFillChallengeTag,
    abortControllers,
    beginMutation,
    endMutation,
    isMutatingQuestion,
    isQuestionSelected,
    toggleQuestionSelection,
    toggleVisibleSelection,
    buildBatchChanges,
    loadStats,
    loadQuestionCatalog,
    handleQuestionListSearch,
    clearCatalogFilters,
    handleQuestionListPageChange,
    handleRefresh,
    openCreatePanel,
    handleEditStart,
    handleEditCancel,
    handleBatchUpdate,
    openBatchDeleteConfirm,
    openDeleteQuestionConfirm,
    closeDeleteConfirm,
    performBatchDelete,
    handleSaveQuestion,
    handleCreateQuestion,
    handleGenerateQuestionDraft,
    performDeleteQuestion,
    handleDeleteConfirm,
  };
}
