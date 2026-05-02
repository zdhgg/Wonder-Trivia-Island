import { computed, ref, watch } from "vue";

function formatCurriculumGradeRange(sections = []) {
  const grades = [...new Set(sections.map((section) => String(section?.grade || "").trim()).filter(Boolean))];

  if (!grades.length) {
    return "学习路线";
  }

  if (grades.length === 1) {
    return `${grades[0]}学习路线`;
  }

  const first = grades[0].replace("年级", "");
  const last = grades[grades.length - 1].replace("年级", "");
  return `${first}到${last}年级学习路线`;
}

function buildUniqueOptions(values = [], allLabel) {
  const normalized = [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
  return [allLabel, ...normalized];
}

function getStudyGradeCoverConfig(grade) {
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

function getStudySemesterCoverConfig(semester) {
  if (semester === "上册") {
    return {
      theme: "upper",
      glyph: "上",
      coverLabel: "上册封面",
      prompt: "先把这一册前半程的主线学顺"
    };
  }

  if (semester === "下册") {
    return {
      theme: "lower",
      glyph: "下",
      coverLabel: "下册封面",
      prompt: "继续把后半程的主线稳稳接上"
    };
  }

  return {
    theme: "all",
    glyph: "册",
    coverLabel: "整年总览",
    prompt: "先看整年，再决定先走哪一册"
  };
}

const PRIMARY_GRADE_OPTIONS = Object.freeze(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);
const SUBJECT_THEME_MAP = Object.freeze({
  语文: { theme: "chinese", glyph: "文" },
  数学: { theme: "math", glyph: "数" },
  英语: { theme: "english", glyph: "E" },
  科学: { theme: "science", glyph: "科" },
  道德与法治: { theme: "civic", glyph: "品" }
});

export function useKnowledgeStudyFilters(props) {
  const expandedLessonIds = ref([]);
  const lessonContentStageById = ref({});
  const selectedGradeFilter = ref("");
  const selectedSemesterFilter = ref("全部学期");
  const selectedSubjectFilter = ref("全部学科");
  const selectedLessonId = ref("");
  const expandedLessonContentIds = ref([]);
  const showRecordedCards = ref(false);
  const showRecommendedCards = ref(false);
  const isStudyNavigatorOpen = ref(false);
  const isCurriculumMapOpen = ref(false);
  const selectedMapSectionId = ref("");

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

  watch([selectedGradeFilter, selectedSemesterFilter, selectedSubjectFilter], () => {
    expandedLessonIds.value = [];
    expandedLessonContentIds.value = [];
    lessonContentStageById.value = {};
    showRecordedCards.value = false;
    showRecommendedCards.value = false;
  });

  watch(selectedLessonId, () => {
    expandedLessonIds.value = [];
    expandedLessonContentIds.value = [];
    lessonContentStageById.value = {};
  });

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

  const mapSectionOptions = computed(() =>
    filteredSystematicSections.value.map((section) => {
      const modules = (section.subjects || []).flatMap((subject) => subject.modules || []);
      const dueModuleCount = modules.filter((module) => Number(module.dueCount || 0) > 0).length;

      return {
        id: section.id,
        label: `${section.grade} · ${section.semester}`,
        subjectCount: section.subjects.length,
        moduleCount: modules.length,
        dueModuleCount,
        statusText: dueModuleCount > 0 ? `${dueModuleCount} 站待回看` : `${modules.length} 站`
      };
    })
  );

  const recordedKnowledgeItems = computed(() =>
    props.knowledgeItems.filter((item) => !item.isRecommended && !item.isSystematic && matchesKnowledgeItem(item))
  );

  const recommendedKnowledgeItems = computed(() =>
    props.knowledgeItems.filter((item) => item.isRecommended && matchesKnowledgeItem(item))
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
  const curriculumRouteTitle = computed(() => formatCurriculumGradeRange(filteredSystematicSections.value));
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

  const studyNavigatorSummary = computed(() => {
    if (selectedSystematicKnowledgeItem.value) {
      const scope = activeFilterSummary.value === "全部内容" ? "" : `${activeFilterSummary.value} · `;
      return `${scope}当前小站 ${selectedSystematicKnowledgeItem.value.label}`;
    }

    return filterResultSummary.value;
  });

  const activeMapSection = computed(
    () =>
      filteredSystematicSections.value.find((section) => section.id === selectedMapSectionId.value) ||
      filteredSystematicSections.value[0] ||
      null
  );
  const activeMapSectionOption = computed(
    () => mapSectionOptions.value.find((option) => option.id === activeMapSection.value?.id) || null
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

  const semesterCoverEntries = computed(() => {
    if (selectedGradeFilter.value === "全部年级") {
      return [];
    }

    return props.systematicSections
      .filter((section) => section.grade === selectedGradeFilter.value)
      .map((section) => {
        const subjectSections = (section.subjects || []).filter((subject) => matchesSelectedSubject(subject.subject));
        const lessonCount = props.knowledgeItems.filter(
          (item) =>
            item.isSystematic &&
            item.primaryGrade === section.grade &&
            item.primarySemester === section.semester &&
            matchesSelectedSubject(item.primarySubject)
        ).length;
        const dueModuleCount = props.knowledgeItems.filter(
          (item) =>
            item.isSystematic &&
            item.primaryGrade === section.grade &&
            item.primarySemester === section.semester &&
            matchesSelectedSubject(item.primarySubject) &&
            Number(item.dueCount || 0) > 0
        ).length;
        const subjects = [...new Set(subjectSections.map((subject) => subject.subject).filter(Boolean))];
        const cover = getStudySemesterCoverConfig(section.semester);

        return {
          id: section.id,
          semester: section.semester,
          title: section.title,
          summary: section.summary,
          subjectLabel: subjects.join("、") || "本册主线",
          lessonCount,
          dueModuleCount,
          isActive: selectedSemesterFilter.value === section.semester,
          statusText:
            selectedSemesterFilter.value === section.semester
              ? "当前在看"
              : dueModuleCount > 0
                ? `今天回看 ${dueModuleCount} 站`
                : lessonCount > 0
                  ? `${lessonCount} 个学习站`
                  : "先看这一册",
          ...cover
        };
      })
      .filter((entry) => entry.lessonCount > 0);
  });

  const semesterCoverSummary = computed(() => {
    if (!semesterCoverEntries.value.length) {
      return "";
    }

    if (selectedSemesterFilter.value === "全部学期") {
      return `先看 ${selectedGradeFilter.value} 整年路线，也可以直接点上册或下册。`;
    }

    return `${selectedGradeFilter.value} · ${selectedSemesterFilter.value} 已选好，后面的小站都会跟着这一册走。`;
  });

  const lessonPickerGroups = computed(() =>
    filteredSystematicSections.value.map((section) => ({
      id: section.id,
      title: section.title,
      groups: (section.subjects || []).map((subject) => ({
        id: subject.id,
        title: subject.subject,
        lessons: (subject.modules || [])
          .map((module) => filteredSystematicKnowledgeItems.value.find((item) => item.id === module.id))
          .filter(Boolean)
      }))
    }))
  );

  function findMapSectionIdByLesson(lessonId) {
    return (
      filteredSystematicSections.value.find((section) =>
        (section.subjects || []).some((subject) => (subject.modules || []).some((module) => module.id === lessonId))
      )?.id || ""
    );
  }

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

  watch(
    mapSectionOptions,
    (options) => {
      const optionIds = options.map((option) => option.id);

      if (!optionIds.length) {
        selectedMapSectionId.value = "";
        return;
      }

      if (!optionIds.includes(selectedMapSectionId.value)) {
        selectedMapSectionId.value = findMapSectionIdByLesson(selectedLessonId.value) || optionIds[0];
      }
    },
    { immediate: true }
  );

  watch(isCurriculumMapOpen, (isOpen) => {
    if (!isOpen) {
      return;
    }

    const preferredSectionId = findMapSectionIdByLesson(selectedLessonId.value);

    if (preferredSectionId) {
      selectedMapSectionId.value = preferredSectionId;
    }
  });

  const knowledgeSections = computed(() => {
    const sections = [];

    if (selectedSystematicKnowledgeItem.value) {
      sections.push({
        id: "systematic-lessons",
        eyebrow: "路线小卡",
        title: "今天先学这一站",
        description: `先把「${selectedSystematicKnowledgeItem.value.label}」学顺，再决定要不要继续往后看。`,
        items: [selectedSystematicKnowledgeItem.value]
      });
    }

    if (recordedKnowledgeItems.value.length) {
      sections.push({
        id: "recorded",
        eyebrow: "我的小卡",
        title: "我的知识小卡",
        description: "这些小卡已经连上做题记录，适合回看巩固。",
        items: recordedKnowledgeItems.value,
        collapsible: true,
        expanded: showRecordedCards.value,
        collapsedText: `这里还有 ${recordedKnowledgeItems.value.length} 张个人小卡，想看时再展开。`
      });
    }

    if (recommendedKnowledgeItems.value.length) {
      sections.push({
        id: "recommended",
        eyebrow: "起步小卡",
        title: recordedKnowledgeItems.value.length ? "还能先学这些" : "可以先从这些开始",
        description: "这些还没挂上个人进度，也可以先听讲入门。",
        items: recommendedKnowledgeItems.value,
        collapsible: true,
        expanded: showRecommendedCards.value,
        collapsedText: `这里还有 ${recommendedKnowledgeItems.value.length} 张起步小卡，想继续时再打开。`
      });
    }

    return sections;
  });

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

  function resetFilters() {
    selectedGradeFilter.value = gradeFilterOptions.value.find((option) => option !== "全部年级") || "全部年级";
    selectedSemesterFilter.value = "全部学期";
    selectedSubjectFilter.value = "全部学科";
    selectedLessonId.value = "";
    expandedLessonIds.value = [];
    expandedLessonContentIds.value = [];
    lessonContentStageById.value = {};
    showRecordedCards.value = false;
    showRecommendedCards.value = false;
  }

  function selectLessonFromNavigator(lessonId) {
    selectedLessonId.value = lessonId;
    isStudyNavigatorOpen.value = false;
  }

  function getMapModuleStatus(module) {
    if (selectedLessonId.value === module.id) {
      return { label: "当前在看", tone: "current" };
    }

    if (Number(module.dueCount || 0) > 0) {
      return { label: `回看 ${module.dueCount}`, tone: "alert" };
    }

    if (Number(module.matchedCount || 0) > 0) {
      return { label: `已连 ${module.matchedCount}`, tone: "calm" };
    }

    return { label: "新站", tone: "planned" };
  }

  function getSubjectTheme(subject) {
    return SUBJECT_THEME_MAP[subject]?.theme || "general";
  }

  function getSubjectGlyph(subject) {
    return SUBJECT_THEME_MAP[subject]?.glyph || "学";
  }

  return {
    expandedLessonIds,
    lessonContentStageById,
    selectedGradeFilter,
    selectedSemesterFilter,
    selectedSubjectFilter,
    selectedLessonId,
    expandedLessonContentIds,
    showRecordedCards,
    showRecommendedCards,
    isStudyNavigatorOpen,
    isCurriculumMapOpen,
    selectedMapSectionId,
    gradeFilterOptions,
    semesterFilterOptions,
    subjectFilterOptions,
    filteredSystematicSections,
    filteredSystematicKnowledgeItems,
    mapSectionOptions,
    recordedKnowledgeItems,
    recommendedKnowledgeItems,
    systematicSectionsAvailable,
    selectedGradeHasSystematicRoute,
    selectedGradeIsPreparing,
    curriculumRouteTitle,
    activeFilterSummary,
    filterResultSummary,
    studyNavigatorSummary,
    activeMapSection,
    activeMapSectionOption,
    selectedSystematicKnowledgeItem,
    currentGradeCover,
    heroOverviewStats,
    semesterCoverEntries,
    semesterCoverSummary,
    lessonPickerGroups,
    knowledgeSections,
    emptyStateTitle,
    emptyStateText,
    resetFilters,
    selectLessonFromNavigator,
    getMapModuleStatus,
    getSubjectTheme,
    getSubjectGlyph
  };
}
