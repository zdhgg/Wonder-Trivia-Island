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
  const selectedStudyLessonId = ref("");
  const activeToolSectionId = ref(TOOL_DEFAULT_SECTION_ID);
  const activeSettingsSectionId = ref(SETTINGS_DEFAULT_SECTION_ID);

  let isApplyingRouteState = false;

  function normalizeToolSectionId(sectionId = "") {
    const normalizedSectionId = String(sectionId || "").trim();

    if (TOOL_SECTION_IDS.includes(normalizedSectionId)) {
      return normalizedSectionId;
    }

    return TOOL_SECTION_IDS[0];
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
      case VIEW_MODE.CHALLENGE:
        return { name: APP_ROUTE_NAME.CHALLENGE };
      case VIEW_MODE.QUIZ:
        return { name: APP_ROUTE_NAME.QUIZ };
      case VIEW_MODE.STUDY:
        return { name: APP_ROUTE_NAME.STUDY };
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

  function showStudyLessonPlayerView(lessonId) {
    selectedStudyLessonId.value = String(lessonId || "").trim();
    currentView.value = VIEW_MODE.STUDY_PLAYER;
  }

  function closeStudyLessonPlayerView() {
    currentView.value = VIEW_MODE.STUDY;
  }

  function showWrongBookView() {
    currentView.value = VIEW_MODE.WRONG_BOOK;
  }

  function showToolsView(sectionId = "") {
    activeToolSectionId.value = normalizeToolSectionId(
      sectionId || (currentView.value === VIEW_MODE.TOOLS ? activeToolSectionId.value : TOOL_SECTION_IDS[0])
    );
    currentView.value = VIEW_MODE.TOOLS;
  }

  function showSettingsView(sectionId = "") {
    if (sectionId) {
      activeSettingsSectionId.value = normalizeSettingsSectionId(sectionId);
    }

    currentView.value = VIEW_MODE.SETTINGS;
  }

  watch(
    () => [route.name, route.params.section, route.params.lessonId],
    ([routeName, routeSection, routeLessonId]) => {
      isApplyingRouteState = true;

      switch (routeName) {
        case APP_ROUTE_NAME.CHALLENGE:
          currentView.value = VIEW_MODE.CHALLENGE;
          break;
        case APP_ROUTE_NAME.QUIZ:
          currentView.value = VIEW_MODE.QUIZ;
          break;
        case APP_ROUTE_NAME.STUDY:
          currentView.value = VIEW_MODE.STUDY;
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

      Promise.resolve().then(() => {
        isApplyingRouteState = false;
      });
    },
    { immediate: true }
  );

  watch(
    [currentView, activeToolSectionId, activeSettingsSectionId, selectedStudyLessonId],
    async () => {
      if (isApplyingRouteState) {
        return;
      }

      const targetLocation = buildRouteLocationForCurrentView();

      if (isSameRouteLocation(targetLocation, route)) {
        return;
      }

      const navigationMethod = String(targetLocation.name || "") === String(route.name || "") ? "replace" : "push";
      await router[navigationMethod](targetLocation);
    },
    { immediate: true }
  );

  return {
    currentView,
    studyInitialGradeFilter,
    selectedStudyLessonId,
    activeToolSectionId,
    activeSettingsSectionId,
    normalizeToolSectionId,
    normalizeSettingsSectionId,
    buildRouteLocationForCurrentView,
    isSameRouteLocation,
    showHomeView,
    showChallengeView,
    showQuizView,
    showStudyView,
    showStudyLessonPlayerView,
    closeStudyLessonPlayerView,
    showWrongBookView,
    showToolsView,
    showSettingsView
  };
}
