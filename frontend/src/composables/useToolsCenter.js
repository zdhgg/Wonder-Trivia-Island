import { computed, ref } from "vue";

export function useToolsCenter(app) {
  const lastToolsSourceView = ref(app.currentView.value);

  const isToolsActive = computed(() =>
    [app.VIEW_MODE.TOOLS, app.VIEW_MODE.CATALOG, app.VIEW_MODE.IMPORT].includes(app.currentView.value)
  );
  const toolsReturnLabel = computed(() => getToolsViewLabel(lastToolsSourceView.value, app.VIEW_MODE));

  function openToolsWorkspace(sectionId = "") {
    if (!isToolsActive.value) {
      lastToolsSourceView.value = app.currentView.value;
    }

    app.openToolsView(sectionId);
  }

  function closeToolsView() {
    const targetView =
      lastToolsSourceView.value && !isToolsActiveView(lastToolsSourceView.value, app.VIEW_MODE)
        ? lastToolsSourceView.value
        : app.VIEW_MODE.HOME;

    app.currentView.value = targetView;
  }

  return {
    isToolsActive,
    toolsReturnLabel,
    openToolsWorkspace,
    closeToolsView
  };
}

function isToolsActiveView(viewMode, VIEW_MODE) {
  return [VIEW_MODE.TOOLS, VIEW_MODE.CATALOG, VIEW_MODE.IMPORT].includes(viewMode);
}

function getToolsViewLabel(viewMode, VIEW_MODE) {
  switch (viewMode) {
    case VIEW_MODE.SETTINGS:
      return "设置";
    case VIEW_MODE.QUIZ:
      return "练习台";
    case VIEW_MODE.CHALLENGE:
      return "闯关地图";
    case VIEW_MODE.STUDY:
      return "知识学习";
    case VIEW_MODE.WRONG_BOOK:
      return "错题温习";
    case VIEW_MODE.HOME:
    default:
      return "首页";
  }
}
