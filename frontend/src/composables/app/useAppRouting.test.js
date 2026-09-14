import { describe, expect, it, vi } from "vitest";
import { shallowReactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import {
  SETTINGS_DEFAULT_SECTION_ID,
  SETTINGS_SECTION_IDS,
  getSettingsSectionById,
  getSettingsSectionByRouteSlug
} from "../../components/settings/settingsSections";
import {
  TOOL_DEFAULT_SECTION_ID,
  TOOL_SECTION_ID,
  TOOL_SECTION_IDS,
  getToolSectionById,
  getToolSectionByRouteSlug
} from "../../components/tools/toolSections";
import { APP_ROUTES, APP_ROUTE_NAME } from "../../router/routes";
import { createAppRouting } from "./useAppRouting";

const VIEW_MODE = Object.freeze({
  HOME: "home",
  CHALLENGE_WORLD: "challenge-world",
  CHALLENGE: "challenge",
  QUIZ: "quiz",
  STUDY: "study",
  STUDY_MAP: "study-map",
  STUDY_PLAYER: "study-player",
  WRONG_BOOK: "wrong-book",
  TOOLS: "tools",
  SETTINGS: "settings"
});

const RoutePlaceholder = { render: () => null };

// 用真实路由表建路由，只把页面组件换成占位组件：路径与 name 与线上保持一致
function buildTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: APP_ROUTES.map((route) =>
      route.redirect
        ? { path: route.path, redirect: route.redirect }
        : { path: route.path, name: route.name, component: RoutePlaceholder }
    )
  });
}

// 复刻 vue-router 的 useRoute()：shallowReactive 的只读转发门面
function createRouteFacade(router) {
  const facade = {};

  for (const key of ["name", "params", "path", "fullPath", "query", "meta"]) {
    Object.defineProperty(facade, key, {
      get: () => router.currentRoute.value[key],
      enumerable: true
    });
  }

  return shallowReactive(facade);
}

function mountRouting(router) {
  return createAppRouting({
    router,
    route: createRouteFacade(router),
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
  });
}

// 等 watch 刷新与 router 导航的微任务全部落定
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("app routing · 试点页面从首页打开", () => {
  it("旧 API showToolsView 会推动路由并同步 section 参数", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.HOME);
    expect(router.currentRoute.value.fullPath).toBe("/");

    routing.showToolsView(TOOL_SECTION_ID.IMPORT);
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.TOOLS);
    expect(routing.activeToolSectionId.value).toBe(TOOL_SECTION_ID.IMPORT);
    expect(router.currentRoute.value.name).toBe(APP_ROUTE_NAME.TOOLS);
    expect(router.currentRoute.value.params.section).toBe("import");
    expect(router.currentRoute.value.fullPath).toBe("/tools/import");
  });

  it("旧 API showSettingsView 会推动路由并同步 section 参数", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showSettingsView("settings-backup");
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.SETTINGS);
    expect(routing.activeSettingsSectionId.value).toBe("settings-backup");
    expect(router.currentRoute.value.fullPath).toBe("/settings/backup");
  });

  it("不带 section 打开工具台时回落到默认分栏", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showToolsView();
    await settle();

    expect(routing.activeToolSectionId.value).toBe(TOOL_DEFAULT_SECTION_ID);
    expect(router.currentRoute.value.fullPath).toBe("/tools/catalog");
  });
});

describe("app routing · 直接进入试点 URL", () => {
  it("深链接 /settings/backup 在初始导航未完成时也能恢复页面状态", async () => {
    const router = buildTestRouter();
    const navigations = [];
    router.afterEach((to) => navigations.push(to.fullPath));

    // 模拟 app.use(router) 启动的首次导航（此刻尚未 await）
    const pendingInitialNavigation = router.push("/settings/backup");
    const routing = mountRouting(router);
    await pendingInitialNavigation;
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.SETTINGS);
    expect(routing.activeSettingsSectionId.value).toBe("settings-backup");
    expect(router.currentRoute.value.fullPath).toBe("/settings/backup");
    // 不允许在初始导航期间再补一次“回首页”，否则刷新后会被改道
    expect(navigations).toEqual(["/settings/backup"]);
  });

  it("深链接 /tools/import 恢复分栏且不追加历史记录", async () => {
    const router = buildTestRouter();
    const navigations = [];
    router.afterEach((to) => navigations.push(to.fullPath));

    const pendingInitialNavigation = router.push("/tools/import");
    const routing = mountRouting(router);
    await pendingInitialNavigation;
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.TOOLS);
    expect(routing.activeToolSectionId.value).toBe(TOOL_SECTION_ID.IMPORT);
    expect(navigations).toEqual(["/tools/import"]);
  });
});

describe("app routing · 浏览器前进后退", () => {
  it("后退回到上一个页面并同步 currentView 与 section", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showToolsView(TOOL_SECTION_ID.IMPORT);
    await settle();
    routing.showSettingsView("settings-audio");
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/settings/audio");

    await router.go(-1);
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/tools/import");
    expect(routing.currentView.value).toBe(VIEW_MODE.TOOLS);
    expect(routing.activeToolSectionId.value).toBe(TOOL_SECTION_ID.IMPORT);

    await router.go(-1);
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/");
    expect(routing.currentView.value).toBe(VIEW_MODE.HOME);
  });

  it("前进回到试点页面时也保持同步", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showToolsView(TOOL_SECTION_ID.CACHE);
    await settle();

    await router.go(-1);
    await settle();
    expect(routing.currentView.value).toBe(VIEW_MODE.HOME);

    await router.go(1);
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/tools/cache");
    expect(routing.currentView.value).toBe(VIEW_MODE.TOOLS);
    expect(routing.activeToolSectionId.value).toBe(TOOL_SECTION_ID.CACHE);
  });
});

describe("app routing · 非法 section 降级", () => {
  it("未登记的工具台 section 回落到默认分栏并收敛 URL", async () => {
    const router = buildTestRouter();
    await router.push("/tools/does-not-exist");
    const routing = mountRouting(router);
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.TOOLS);
    expect(routing.activeToolSectionId.value).toBe(TOOL_DEFAULT_SECTION_ID);
    expect(router.currentRoute.value.fullPath).toBe("/tools/catalog");
  });

  it("未登记的设置 section 回落到默认分栏并收敛 URL", async () => {
    const router = buildTestRouter();
    await router.push("/settings/not-a-section");
    const routing = mountRouting(router);
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.SETTINGS);
    expect(routing.activeSettingsSectionId.value).toBe(SETTINGS_DEFAULT_SECTION_ID);
    expect(router.currentRoute.value.fullPath).toBe("/settings");
  });

  it("设置页默认分栏的 routeSlug 为空串，/settings/profile 也会收敛到 /settings", async () => {
    const router = buildTestRouter();
    await router.push("/settings/profile");
    const routing = mountRouting(router);
    await settle();

    expect(routing.activeSettingsSectionId.value).toBe(SETTINGS_DEFAULT_SECTION_ID);
    expect(router.currentRoute.value.fullPath).toBe("/settings");
  });

  it("完全无法匹配的 URL 由兜底路由重定向回首页", async () => {
    const router = buildTestRouter();
    const routing = mountRouting(router);

    await router.push("/no/such/page");
    await settle();

    expect(router.currentRoute.value.fullPath).toBe("/");
    expect(routing.currentView.value).toBe(VIEW_MODE.HOME);
  });

  it("收敛非法 section 时使用 replace，不额外占用历史记录", async () => {
    const router = buildTestRouter();
    const replaceSpy = vi.spyOn(router, "replace");

    await router.push("/tools/nope");
    const routing = mountRouting(router);
    await settle();

    expect(replaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: APP_ROUTE_NAME.TOOLS, params: { section: "catalog" } })
    );
    expect(router.currentRoute.value.fullPath).toBe("/tools/catalog");

    // 非法链接被就地改写：历史里没有多出一条记录，后退不会有任何变化
    await router.go(-1);
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/tools/catalog");
    expect(routing.currentView.value).toBe(VIEW_MODE.TOOLS);
  });
});

describe("app routing · 旧导航 API 仍然有效", () => {
  it("同路由换分栏使用 replace，不叠加历史记录", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showToolsView(TOOL_SECTION_ID.IMPORT);
    await settle();

    const pushSpy = vi.spyOn(router, "push");
    const replaceSpy = vi.spyOn(router, "replace");

    routing.showToolsView(TOOL_SECTION_ID.CACHE);
    await settle();

    expect(router.currentRoute.value.fullPath).toBe("/tools/cache");
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).not.toHaveBeenCalled();

    await router.go(-1);
    await settle();
    expect(routing.currentView.value).toBe(VIEW_MODE.HOME);
  });

  it("重复设置同一个分栏不会产生多余导航", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showToolsView(TOOL_SECTION_ID.IMPORT);
    await settle();

    const pushSpy = vi.spyOn(router, "push");
    const replaceSpy = vi.spyOn(router, "replace");

    routing.showToolsView(TOOL_SECTION_ID.IMPORT);
    await settle();

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe("/tools/import");
  });

  it("非试点页面的旧导航 API 行为保持不变", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showChallengeWorldView();
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/challenge/world");

    routing.showChallengeView();
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/challenge");

    routing.showQuizView();
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/quiz");

    routing.showStudyView({ gradeFilter: "" });
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/study");

    routing.showWrongBookView();
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/wrong-book");

    routing.showStudyMapView({ grade: "三年级" });
    await settle();
    expect(routing.currentView.value).toBe(VIEW_MODE.STUDY_MAP);
    expect(router.currentRoute.value.params.grade).toBe("三年级");

    routing.showHomeView();
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/");

    expect(routing.currentView.value).toBe(VIEW_MODE.HOME);
  });

  it("讲堂播放器的关闭仍回到进入前的来路", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showStudyMapView({ grade: "三年级" });
    await settle();

    routing.showStudyLessonPlayerView("lesson-1");
    await settle();
    expect(routing.currentView.value).toBe(VIEW_MODE.STUDY_PLAYER);
    expect(router.currentRoute.value.params.lessonId).toBe("lesson-1");

    routing.closeStudyLessonPlayerView();
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.STUDY_MAP);
    expect(router.currentRoute.value.params.grade).toBe("三年级");
  });
});

describe("app routing · route 与业务状态双向同步", () => {
  it("地址栏直接改 section 会写回业务状态", async () => {
    const router = buildTestRouter();
    await router.push("/tools/catalog");
    const routing = mountRouting(router);
    await settle();

    expect(routing.activeToolSectionId.value).toBe(TOOL_SECTION_ID.CATALOG);

    await router.push("/tools/import");
    await settle();

    expect(routing.activeToolSectionId.value).toBe(TOOL_SECTION_ID.IMPORT);
    expect(routing.currentView.value).toBe(VIEW_MODE.TOOLS);
  });

  it("业务状态改 section 会写回地址栏", async () => {
    const router = buildTestRouter();
    await router.push("/tools/catalog");
    const routing = mountRouting(router);
    await settle();

    routing.activeToolSectionId.value = TOOL_SECTION_ID.CACHE;
    await settle();

    expect(router.currentRoute.value.params.section).toBe("cache");
  });

  it("非法 sectionId 归一化后不会写进地址栏", async () => {
    const router = buildTestRouter();
    await router.push("/tools/catalog");
    const routing = mountRouting(router);
    await settle();

    expect(routing.normalizeToolSectionId("nope")).toBe(TOOL_DEFAULT_SECTION_ID);
    expect(routing.normalizeSettingsSectionId("nope")).toBe(SETTINGS_DEFAULT_SECTION_ID);

    routing.activeToolSectionId.value = "nope";
    await settle();

    expect(router.currentRoute.value.params.section).toBe("catalog");
  });
});

describe("app routing · 同步历史的行为边界", () => {
  it("深链接到非试点页面不会被打断", async () => {
    const router = buildTestRouter();
    const navigations = [];
    router.afterEach((to) => navigations.push(to.fullPath));

    const pendingInitialNavigation = router.push("/wrong-book");
    const routing = mountRouting(router);
    await pendingInitialNavigation;
    await settle();

    expect(routing.currentView.value).toBe(VIEW_MODE.WRONG_BOOK);
    expect(navigations).toEqual(["/wrong-book"]);
  });

  it("离开工具台回到首页只产生一次导航", async () => {
    const router = buildTestRouter();
    await router.push("/");
    const routing = mountRouting(router);
    await settle();

    routing.showToolsView(TOOL_SECTION_ID.IMPORT);
    await settle();

    const navigations = [];
    router.afterEach((to) => navigations.push(to.fullPath));

    routing.showHomeView();
    await settle();

    expect(navigations).toEqual(["/"]);
    expect(routing.currentView.value).toBe(VIEW_MODE.HOME);
  });
});
