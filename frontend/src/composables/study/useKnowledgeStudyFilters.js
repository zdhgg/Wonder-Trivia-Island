import { computed, ref, watch } from "vue";
import { getMapModuleStatus, getSubjectTheme, getSubjectGlyph } from "../../utils/knowledgeStudy";

function buildUniqueOptions(values = [], allLabel) {
  const normalized = [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
  return [allLabel, ...normalized];
}

export function getStudyGradeCoverConfig(grade) {
  if (grade === "一年级") {
    return {
      theme: "sprout",
      coverLabel: "一年级专区",
      title: "启蒙小岛",
      glyph: "芽",
      tagline: "从识字、拼音和数感出发，把第一批学习小本领慢慢种稳。",
      scene: "拼音 · 识字 · 数感"
    };
  }

  if (grade === "二年级") {
    return {
      theme: "bridge",
      coverLabel: "二年级专区",
      title: "进阶小桥",
      glyph: "桥",
      tagline: "把会的本领连起来，开始学会更顺地读、算、表达。",
      scene: "词句连接 · 运算进阶"
    };
  }

  if (grade === "三年级") {
    return {
      theme: "voyage",
      coverLabel: "三年级专区",
      title: "远航码头",
      glyph: "帆",
      tagline: "开始独立学更完整的小任务，把理解、计算和表达继续往前推。",
      scene: "阅读理解 · 运算应用 · 英语起步"
    };
  }

  if (grade === "四年级") {
    return {
      theme: "summit",
      coverLabel: "四年级专区",
      title: "探索山径",
      glyph: "峰",
      tagline: "先从阅读概括、乘除笔算和英语场景理解这些第一批小站开始往前走。",
      scene: "阅读概括 · 乘除笔算 · 日常英语"
    };
  }

  if (grade === "五年级") {
    return {
      theme: "tower",
      coverLabel: "五年级专区",
      title: "思维塔楼",
      glyph: "塔",
      tagline: "先从小数分数、体积统计和英语短文理解这些主线继续往上搭。",
      scene: "小数分数 · 体积统计 · 英语短文"
    };
  }

  if (grade === "六年级") {
    return {
      theme: "starport",
      coverLabel: "六年级专区",
      title: "毕业星港",
      glyph: "星",
      tagline: "把百分数、圆、综合阅读和英语理解这些毕业前主线稳稳接好，再往衔接阶段走。",
      scene: "综合阅读 · 百分数圆比 · 英语综合"
    };
  }

  return {
    theme: "atlas",
    coverLabel: "知识小讲堂",
    title: "知识总地图",
    glyph: "书",
    tagline: "先选一个年级，再顺着这张路线慢慢学，不用一口气看完整张图。",
    scene: "一年级到六年级"
  };
}

const PRIMARY_GRADE_OPTIONS = Object.freeze(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);
export function useKnowledgeStudyFilters(props) {
  const selectedGradeFilter = ref("");
  const selectedSemesterFilter = ref("全部学期");
  const selectedSubjectFilter = ref("全部学科");
  const selectedLessonId = ref("");

  function resolvePreferredGradeFilter(options = []) {
    const requestedGrade = String(props.initialGradeFilter || "").trim();

    if (requestedGrade && options.includes(requestedGrade)) {
      return requestedGrade;
    }

    return options.find((option) => option !== "全部年级") || options[0] || "全部年级";
  }

  const gradeFilterOptions = computed(() => ["全部年级", ...PRIMARY_GRADE_OPTIONS]);

  const semesterFilterOptions = computed(() =>
    buildUniqueOptions(
      [
        ...props.systematicSections.map((section) => section.semester),
        ...props.knowledgeItems.map((item) => item.primarySemester)
      ],
      "全部学期"
    )
  );

  const subjectFilterOptions = computed(() =>
    buildUniqueOptions(
      [
        ...props.systematicSections.flatMap((section) => section.subjects?.map((subject) => subject.subject) || []),
        ...props.knowledgeItems.map((item) => item.primarySubject)
      ],
      "全部学科"
    )
  );

  watch(
    gradeFilterOptions,
    (options) => {
      if (!options.length) {
        selectedGradeFilter.value = "全部年级";
        return;
      }

      if (!options.includes(selectedGradeFilter.value)) {
        selectedGradeFilter.value = resolvePreferredGradeFilter(options);
      }
    },
    { immediate: true }
  );

  watch(
    () => props.initialGradeFilter,
    (nextGrade) => {
      const requestedGrade = String(nextGrade || "").trim();

      if (requestedGrade && gradeFilterOptions.value.includes(requestedGrade)) {
        selectedGradeFilter.value = requestedGrade;
        return;
      }

      if (!requestedGrade) {
        selectedGradeFilter.value = resolvePreferredGradeFilter(gradeFilterOptions.value);
      }
    }
  );

  watch(
    semesterFilterOptions,
    (options) => {
      if (!options.includes(selectedSemesterFilter.value)) {
        selectedSemesterFilter.value = options.includes("全部学期") ? "全部学期" : options[0] || "全部学期";
      }
    },
    { immediate: true }
  );

  watch(
    subjectFilterOptions,
    (options) => {
      if (!options.includes(selectedSubjectFilter.value)) {
        selectedSubjectFilter.value = options.includes("全部学科") ? "全部学科" : options[0] || "全部学科";
      }
    },
    { immediate: true }
  );

  function matchesSelectedGrade(value) {
    return selectedGradeFilter.value === "全部年级" || String(value || "").trim() === selectedGradeFilter.value;
  }

  function matchesSelectedSemester(value) {
    return selectedSemesterFilter.value === "全部学期" || String(value || "").trim() === selectedSemesterFilter.value;
  }

  function matchesSelectedSubject(value) {
    return selectedSubjectFilter.value === "全部学科" || String(value || "").trim() === selectedSubjectFilter.value;
  }

  function matchesKnowledgeItem(item) {
    return (
      matchesSelectedGrade(item.primaryGrade) &&
      matchesSelectedSemester(item.primarySemester) &&
      matchesSelectedSubject(item.primarySubject)
    );
  }

  const filteredSystematicSections = computed(() =>
    props.systematicSections
      .filter((section) => matchesSelectedGrade(section.grade) && matchesSelectedSemester(section.semester))
      .map((section) => ({
        ...section,
        subjects: (section.subjects || []).filter((subject) => matchesSelectedSubject(subject.subject))
      }))
      .filter((section) => section.subjects.length > 0)
  );

  const filteredSystematicKnowledgeItems = computed(() =>
    props.knowledgeItems.filter((item) => item.isSystematic && matchesKnowledgeItem(item))
  );

  const systematicSectionsAvailable = computed(() => filteredSystematicSections.value.length > 0);
  const selectedGradeHasSystematicRoute = computed(() =>
    selectedGradeFilter.value === "全部年级"
      ? true
      : props.systematicSections.some((section) => String(section?.grade || "").trim() === selectedGradeFilter.value)
  );
  const selectedGradeIsPreparing = computed(
    () => !props.isLoading && selectedGradeFilter.value !== "全部年级" && !selectedGradeHasSystematicRoute.value
  );
  const activeFilterSummary = computed(() => {
    const segments = [selectedGradeFilter.value, selectedSemesterFilter.value, selectedSubjectFilter.value].filter(
      (value) => !value.startsWith("全部")
    );

    return segments.length ? segments.join(" · ") : "全部内容";
  });
  const filterResultSummary = computed(() =>
    selectedGradeIsPreparing.value
      ? `${selectedGradeFilter.value} · 路线筹备中`
      : filteredSystematicKnowledgeItems.value.length
        ? `${activeFilterSummary.value} · ${filteredSystematicKnowledgeItems.value.length} 个学习小站`
        : `${activeFilterSummary.value} · 暂时没有对应小站`
  );

  const selectedSystematicKnowledgeItem = computed(
    () =>
      filteredSystematicKnowledgeItems.value.find((item) => item.id === selectedLessonId.value) ||
      filteredSystematicKnowledgeItems.value[0] ||
      null
  );

  const currentGradeCover = computed(() => {
    const activeGrade = selectedGradeFilter.value !== "全部年级" ? selectedGradeFilter.value : "";
    const cover = getStudyGradeCoverConfig(activeGrade);

    return {
      ...cover,
      heading: activeGrade ? `${activeGrade} · ${cover.title}` : cover.title
    };
  });

  const heroOverviewStats = computed(() => {
    if (props.isLoading) {
      return [
        { label: "路线状态", value: "加载中" },
        { label: "当前范围", value: selectedGradeFilter.value },
        { label: "学习小站", value: "..." },
        { label: "已开放", value: "..." }
      ];
    }

    if (!selectedGradeIsPreparing.value) {
      return props.overview.stats;
    }

    return [
      { label: "路线状态", value: "筹备中" },
      { label: "当前年级", value: selectedGradeFilter.value },
      { label: "学习小站", value: "0" },
      { label: "已开放", value: "1-6 年级" }
    ];
  });

  // 当前筛选范围内有待补强题的小站与总题数，供页面底部快捷条直达错题本
  const dueStations = computed(() =>
    props.knowledgeItems.filter((item) => matchesKnowledgeItem(item) && Number(item.dueCount || 0) > 0)
  );
  const dueQuestionCount = computed(() =>
    dueStations.value.reduce((sum, item) => sum + Number(item.dueCount || 0), 0)
  );

  // 当前小站所在那一册的学科分组小站列表，供页面右侧切换栏直接换站
  const stationRailGroups = computed(() => {
    const activeSection =
      filteredSystematicSections.value.find((section) =>
        (section.subjects || []).some((subject) =>
          (subject.modules || []).some((module) => module.id === selectedLessonId.value)
        )
      ) || filteredSystematicSections.value[0];

    if (!activeSection) {
      return [];
    }

    return [
      {
        id: activeSection.id,
        title: activeSection.title,
        subjects: (activeSection.subjects || []).map((subject) => ({
          id: subject.id,
          subject: subject.subject,
          theme: getSubjectTheme(subject.subject),
          glyph: getSubjectGlyph(subject.subject),
          stations: (subject.modules || []).map((module) => ({
            id: module.id,
            title: module.title,
            status: getMapModuleStatus(module, selectedLessonId.value)
          }))
        }))
      }
    ];
  });

  watch(
    filteredSystematicKnowledgeItems,
    (items) => {
      const requestedLessonId = String(props.initialLessonId || "").trim();

      if (requestedLessonId && items.some((item) => item.id === requestedLessonId)) {
        selectedLessonId.value = requestedLessonId;
        return;
      }

      if (!items.length) {
        selectedLessonId.value = "";
        return;
      }

      if (!items.some((item) => item.id === selectedLessonId.value)) {
        selectedLessonId.value = items[0].id || "";
      }
    },
    { immediate: true }
  );

  const emptyStateTitle = computed(() =>
    props.isLoading
      ? "知识路线加载中"
      : selectedGradeIsPreparing.value
        ? `${selectedGradeFilter.value}路线正在整理`
        : props.systematicSections.length
          ? "这个分类下还没有排出学习小站"
          : "小讲堂还没开课"
  );

  const emptyStateText = computed(() =>
    props.isLoading
      ? "整册路线和讲堂卡片正在装载，马上就能进入。"
      : selectedGradeIsPreparing.value
        ? `现在已经预留了${selectedGradeFilter.value}入口，后面会先补主线小站和讲解卡。想先开始，可以先看看一年级到六年级的已开放内容。`
        : props.systematicSections.length
          ? `先换一个年级、学期或学科看看，现在筛选的是 ${activeFilterSummary.value}。`
          : "先做几道题，系统就会慢慢帮你整理出知识路线和个人小卡。"
  );

  return {
    selectedGradeFilter,
    selectedSemesterFilter,
    selectedSubjectFilter,
    selectedLessonId,
    filteredSystematicSections,
    filteredSystematicKnowledgeItems,
    systematicSectionsAvailable,
    selectedGradeHasSystematicRoute,
    selectedGradeIsPreparing,
    activeFilterSummary,
    selectedSystematicKnowledgeItem,
    currentGradeCover,
    heroOverviewStats,
    stationRailGroups,
    dueStations,
    dueQuestionCount,
    emptyStateTitle,
    emptyStateText
  };
}
