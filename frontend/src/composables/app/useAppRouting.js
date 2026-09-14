import { ref, watch } from "vue";

export function createAppRouting({
  router,
  route,
  VIEW_MODE,
  APP_ROUTE_NAME,
  TOOL_SECTION_IDS,
  TOOL_DEFAULT_SECTION_ID,
  SETTINGS_SECTION_IDS,
  SETTINGS_DEFAULT_SECTION_ID,
  getToolSectionById,
  getToolSectionByRouteSlug,
  getSettingsSectionById,
  getSettingsSectionByRouteSlug
}) {
  const currentView = ref(VIEW_MODE.HOME);
  const studyInitialGradeFilter = ref("");
  // 整册地图当前展开的年级，空串代表停在年级总览
  const studyMapGrade = ref("");
  // 进入讲解播放器时记下的来路，关闭后回到原处
  const studyPlayerReturn = ref(null);
  const selectedStudyLessonId = ref("");
  // 最后学习的小站：进入讲堂播放器时写入 localStorage，供首页“继续学习”恢复
  const STUDY_LAST_LESSON_STORAGE_KEY = "wonder-trivia-island.study.last-lesson-id";
  const lastStudyLessonId = ref(readLastStudyLessonId());
  const activeToolSectionId = ref(TOOL_DEFAULT_SECTION_ID);
  const activeSettingsSectionId = ref(SETTINGS_DEFAULT_SECTION_ID);

  function readLastStudyLessonId() {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      return String(window.localStorage.getItem(STUDY_LAST_LESSON_STORAGE_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function persistLastStudyLessonId(lessonId) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (lessonId) {
        window.localStorage.setItem(STUDY_LAST_LESSON_STORAGE_KEY, lessonId);
      }
    } catch {
      // 存储失败不影响主流程，仅失去“继续学习”记忆
    }

    lastStudyLessonId.value = lessonId;
  }

  let isApplyingRouteState = false;

  function normalizeToolSectionId(sectionId = "") {
    const normalizedSectionId = String(sectionId || "").trim();

    if (TOOL_SECTION_IDS.includes(normalizedSectionId)) {
      return normalizedSectionId;
    }

    return TOOL_DEFAULT_SECTION_ID;
  }

  function normalizeSettingsSectionId(sectionId = "") {
    const normalizedSectionId = String(sectionId || "").trim();

    if (SETTINGS_SECTION_IDS.includes(normalizedSectionId)) {
      return normalizedSectionId;
    }

    return SETTINGS_DEFAULT_SECTION_ID;
  }

  function resolveToolRouteSection(sectionId = "") {
    return getToolSectionById(normalizeToolSectionId(sectionId));
  }

  function resolveSettingsRouteSection(sectionId = "") {
    return getSettingsSectionById(normalizeSettingsSectionId(sectionId));
  }

  function buildRouteLocationForCurrentView() {
    switch (currentView.value) {
      case VIEW_MODE.CHALLENGE_WORLD:
        return { name: APP_ROUTE_NAME.CHALLENGE_WORLD };
      case VIEW_MODE.CHALLENGE:
        return { name: APP_ROUTE_NAME.CHALLENGE };
      case VIEW_MODE.QUIZ:
        return { name: APP_ROUTE_NAME.QUIZ };
      case VIEW_MODE.STUDY:
        return { name: APP_ROUTE_NAME.STUDY };
      case VIEW_MODE.STUDY_MAP:
        return {
          name: APP_ROUTE_NAME.STUDY_MAP,
          params: {
            grade: String(studyMapGrade.value || "").trim() || undefined
          }
        };
      case VIEW_MODE.STUDY_PLAYER:
        return {
          name: APP_ROUTE_NAME.STUDY_PLAYER,
          params: {
            lessonId: String(selectedStudyLessonId.value || "").trim() || undefined
          }
        };
      case VIEW_MODE.WRONG_BOOK:
        return { name: APP_ROUTE_NAME.WRONG_BOOK };
      case VIEW_MODE.TOOLS: {
        const targetSection = resolveToolRouteSection(activeToolSectionId.value);
        return {
          name: APP_ROUTE_NAME.TOOLS,
          params: {
            section: targetSection.routeSlug || undefined
          }
        };
      }
      case VIEW_MODE.SETTINGS: {
        const targetSection = resolveSettingsRouteSection(activeSettingsSectionId.value);
        return {
          name: APP_ROUTE_NAME.SETTINGS,
          params: {
            section: targetSection.routeSlug || undefined
          }
        };
      }
      case VIEW_MODE.HOME:
      default:
        return { name: APP_ROUTE_NAME.HOME };
    }
  }

  function isSameRouteLocation(targetLocation, currentRoute) {
    if (!targetLocation || !currentRoute) {
      return false;
    }

    if (String(targetLocation.name || "") !== String(currentRoute.name || "")) {
      return false;
    }

    const targetParams = targetLocation.params || {};
    const currentParams = currentRoute.params || {};
    const paramKeys = new Set([...Object.keys(targetParams), ...Object.keys(currentParams)]);

    for (const key of paramKeys) {
      if (String(targetParams[key] || "") !== String(currentParams[key] || "")) {
        return false;
      }
    }

    return true;
  }

  function showHomeView() {
    currentView.value = VIEW_MODE.HOME;
  }

  function showChallengeWorldView() {
    currentView.value = VIEW_MODE.CHALLENGE_WORLD;
  }

  function showChallengeView() {
    currentView.value = VIEW_MODE.CHALLENGE;
  }

  function showQuizView() {
    currentView.value = VIEW_MODE.QUIZ;
  }

  function showStudyView({ gradeFilter = "" } = {}) {
    studyInitialGradeFilter.value = String(gradeFilter || "").trim();
    currentView.value = VIEW_MODE.STUDY;
  }

  function showStudyMapView({ grade = "" } = {}) {
    studyMapGrade.value = String(grade || "").trim();
    currentView.value = VIEW_MODE.STUDY_MAP;
  }

  function showStudyLessonPlayerView(lessonId) {
    const normalizedLessonId = String(lessonId || "").trim();
    selectedStudyLessonId.value = normalizedLessonId;
    persistLastStudyLessonId(normalizedLessonId);

    // 只在第一次进入播放器时记来路；站内切下一站不覆盖
    if (currentView.value !== VIEW_MODE.STUDY_PLAYER) {
      studyPlayerReturn.value = {
        view: currentView.value,
        mapGrade: String(studyMapGrade.value || "").trim()
      };
    }

    currentView.value = VIEW_MODE.STUDY_PLAYER;
  }

  function closeStudyLessonPlayerView() {
    const returnTarget = studyPlayerReturn.value;
    studyPlayerReturn.value = null;

    if (returnTarget?.view === VIEW_MODE.STUDY_MAP) {
      showStudyMapView({ grade: returnTarget.mapGrade });
      return;
    }

    currentView.value = VIEW_MODE.STUDY;
  }

  function showWrongBookView() {
    currentView.value = VIEW_MODE.WRONG_BOOK;
  }

  function showToolsView(sectionId = "") {
    activeToolSectionId.value = normalizeToolSectionId(
      sectionId || (currentView.value === VIEW_MODE.TOOLS ? activeToolSectionId.value : TOOL_DEFAULT_SECTION_ID)
    );
    currentView.value = VIEW_MODE.TOOLS;
  }

  function showSettingsView(sectionId = "") {
    if (sectionId) {
      activeSettingsSectionId.value = normalizeSettingsSectionId(sectionId);
    }

    currentView.value = VIEW_MODE.SETTINGS;
  }

  // /tools/xxx 与 /settings/xxx 里出现未登记的 section 时，业务状态已回落到默认分栏，
  // 这里把 URL 也收敛到规范值，避免地址栏与 activeSectionId 长期不一致（例如 /tools/nope）。
  function canonicalizeSectionRoute(routeName, routeSection) {
    const isSectionRoute =
      routeName === APP_ROUTE_NAME.TOOLS || routeName === APP_ROUTE_NAME.SETTINGS;
    const normalizedRouteSection = String(routeSection || "").trim();

    if (!isSectionRoute || !normalizedRouteSection) {
      return;
    }

    const canonicalLocation = buildRouteLocationForCurrentView();
    const canonicalSection = String((canonicalLocation.params || {}).section || "").trim();

    if (canonicalSection === normalizedRouteSection) {
      return;
    }

    void router.replace(canonicalLocation);
  }

  watch(
    () => [route.name, route.params.section, route.params.lessonId, route.params.grade],
    ([routeName, routeSection, routeLessonId, routeGrade]) => {
      isApplyingRouteState = true;

      switch (routeName) {
        case APP_ROUTE_NAME.CHALLENGE_WORLD:
          currentView.value = VIEW_MODE.CHALLENGE_WORLD;
          break;
        case APP_ROUTE_NAME.CHALLENGE:
          currentView.value = VIEW_MODE.CHALLENGE;
          break;
        case APP_ROUTE_NAME.QUIZ:
          currentView.value = VIEW_MODE.QUIZ;
          break;
        case APP_ROUTE_NAME.STUDY:
          currentView.value = VIEW_MODE.STUDY;
          break;
        case APP_ROUTE_NAME.STUDY_MAP:
          studyMapGrade.value = String(routeGrade || "").trim();
          currentView.value = VIEW_MODE.STUDY_MAP;
          break;
        case APP_ROUTE_NAME.STUDY_PLAYER:
          selectedStudyLessonId.value = String(routeLessonId || "").trim();
          currentView.value = VIEW_MODE.STUDY_PLAYER;
          break;
        case APP_ROUTE_NAME.WRONG_BOOK:
          currentView.value = VIEW_MODE.WRONG_BOOK;
          break;
        case APP_ROUTE_NAME.TOOLS:
          activeToolSectionId.value = getToolSectionByRouteSlug(routeSection).id;
          currentView.value = VIEW_MODE.TOOLS;
          break;
        case APP_ROUTE_NAME.SETTINGS:
          activeSettingsSectionId.value = getSettingsSectionByRouteSlug(routeSection).id;
          currentView.value = VIEW_MODE.SETTINGS;
          break;
        case APP_ROUTE_NAME.HOME:
        default:
          currentView.value = VIEW_MODE.HOME;
          break;
      }

      canonicalizeSectionRoute(routeName, routeSection);

      Promise.resolve().then(() => {
        isApplyingRouteState = false;
      });
    },
    { immediate: true }
  );

  watch(
    [currentView, activeToolSectionId, activeSettingsSectionId, selectedStudyLessonId, studyMapGrade],
    async () => {
      if (isApplyingRouteState) {
        return;
      }

      const targetLocation = buildRouteLocationForCurrentView();

      if (isSameRouteLocation(targetLocation, route)) {
        return;
      }

      // 地图页换年级走 push，让浏览器后退能回到上一级，而不是直接离开地图
      const isStudyMapGradeChange =
        String(targetLocation.name || "") === APP_ROUTE_NAME.STUDY_MAP &&
        String(route.name || "") === APP_ROUTE_NAME.STUDY_MAP;
      const navigationMethod =
        String(targetLocation.name || "") === String(route.name || "") && !isStudyMapGradeChange
          ? "replace"
          : "push";

      await router[navigationMethod](targetLocation);
    },
    { immediate: true }
  );

  return {
    currentView,
    studyInitialGradeFilter,
    studyMapGrade,
    studyPlayerReturn,
    selectedStudyLessonId,
    lastStudyLessonId,
    activeToolSectionId,
    activeSettingsSectionId,
    normalizeToolSectionId,
    normalizeSettingsSectionId,
    buildRouteLocationForCurrentView,
    isSameRouteLocation,
    showHomeView,
    showChallengeWorldView,
    showChallengeView,
    showQuizView,
    showStudyView,
    showStudyMapView,
    showStudyLessonPlayerView,
    closeStudyLessonPlayerView,
    showWrongBookView,
    showToolsView,
    showSettingsView
  };
}
