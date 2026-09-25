import { computed } from "vue";
import { APP_ROUTE_NAME, isRouterDrivenPageRoute } from "../../router/routes";

// 已迁入 RouterView 的页面需要把「路由渲染」与「应用状态」重新接上：
// 路由负责决定渲染哪个页面组件，这个文件负责把页面需要的 props / 事件映射回应用状态。
// 尚未迁移的页面不走这里，App.vue 仍按 currentView 渲染。
export function createRouterDrivenPages({ route, app, settingsCenter, toolsCenter }) {
  const isRouterDrivenPageActive = computed(() => isRouterDrivenPageRoute(route.name));

  const routerDrivenPageProps = computed(() => {
    switch (String(route.name || "")) {
      case APP_ROUTE_NAME.TOOLS:
        return {
          adminKey: app.adminKey.value,
          activeSectionId: app.activeToolSectionId.value,
          catalogPrefill: app.catalogPrefill.value,
          returnLabel: toolsCenter.toolsReturnLabel.value
        };
      case APP_ROUTE_NAME.SETTINGS:
        return {
          activeSectionId: app.activeSettingsSectionId.value,
          backupStatusMessage: settingsCenter.backupStatusMessage.value,
          isBackupBusy: settingsCenter.isBackupBusy.value,
          backupStats: settingsCenter.backupStats.value
        };
      // 成长纪念册 / 想一起做都自己取数、自己管表单，不依赖应用状态，所以没有 props 要映射。
      case APP_ROUTE_NAME.GROWTH_BOOK:
      case APP_ROUTE_NAME.GROWTH_PLANS:
      default:
        return {};
    }
  });

  const routerDrivenPageListeners = computed(() => {
    switch (String(route.name || "")) {
      case APP_ROUTE_NAME.TOOLS:
        return {
          onBack: toolsCenter.closeToolsView,
          onImported: app.handleImportFinished,
          "onUpdate:adminKey": (value) => {
            app.adminKey.value = value;
          },
          "onUpdate:activeSectionId": (value) => {
            app.activeToolSectionId.value = value;
          }
        };
      case APP_ROUTE_NAME.SETTINGS:
        return {
          "onUpdate:activeSectionId": (value) => {
            app.activeSettingsSectionId.value = value;
          },
          onPendingStateChange: settingsCenter.handleSettingsPendingStateChange,
          onProfileSaved: settingsCenter.handleProfileSaved,
          onExportBackup: settingsCenter.exportBackup,
          onImportBackup: settingsCenter.importBackup
        };
      case APP_ROUTE_NAME.GROWTH_BOOK:
      case APP_ROUTE_NAME.GROWTH_PLANS:
      default:
        return {};
    }
  });

  // 事件监听必须走 v-bind 而不是 v-on：
  // v-on="obj" 会被编译成 toHandlers(obj)，把每个 key 再套一层 on 前缀
  // （onUpdate:activeSectionId → onOnUpdate:activeSectionId），监听器会静默失效。
  // v-bind 不处理 key，emit 才能按 on + Capitalize(eventName) 找到它们。
  const routerDrivenPageBindings = computed(() => ({
    ...routerDrivenPageProps.value,
    ...routerDrivenPageListeners.value
  }));

  return {
    isRouterDrivenPageActive,
    routerDrivenPageProps,
    routerDrivenPageListeners,
    routerDrivenPageBindings
  };
}
