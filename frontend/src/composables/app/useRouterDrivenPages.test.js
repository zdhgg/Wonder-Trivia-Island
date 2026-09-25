import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { camelize, computed, reactive, ref, toHandlerKey } from "vue";
import { TOOL_DEFAULT_SECTION_ID, TOOL_SECTION_ID } from "../../components/tools/toolSections";
import { APP_ROUTE_NAME } from "../../router/routes";
import { createRouterDrivenPages } from "./useRouterDrivenPages";

// 直接从 .vue 源码里读出页面声明的 props / emits，
// 这样 props 映射表写错名字时测试会失败，而不是在浏览器里静默传错。
function readViewSource(fileName) {
  return readFileSync(new URL(`../../views/${fileName}`, import.meta.url), "utf8");
}

function extractBalanced(source, openIndex, openChar, closeChar) {
  let depth = 0;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;

      if (depth === 0) {
        return source.slice(openIndex, index + 1);
      }
    }
  }

  throw new Error("括号不匹配");
}

function readDeclaredProps(fileName) {
  const source = readViewSource(fileName);
  const callIndex = source.indexOf("defineProps({");

  if (callIndex === -1) {
    throw new Error(`${fileName} 里没有 defineProps`);
  }

  const block = extractBalanced(source, callIndex + "defineProps(".length, "{", "}");

  return Array.from(block.matchAll(/^ {2}([A-Za-z_$][\w$]*):/gm), (match) => match[1]);
}

function readDeclaredEmits(fileName) {
  const source = readViewSource(fileName);
  const callIndex = source.indexOf("defineEmits([");

  if (callIndex === -1) {
    throw new Error(`${fileName} 里没有 defineEmits`);
  }

  const block = extractBalanced(source, callIndex + "defineEmits(".length, "[", "]");

  return Array.from(block.matchAll(/"([^"]+)"/g), (match) => match[1]);
}

function createFakeShell() {
  return {
    app: {
      adminKey: ref(""),
      activeToolSectionId: ref(TOOL_DEFAULT_SECTION_ID),
      activeSettingsSectionId: ref("settings-profile"),
      catalogPrefill: ref(null),
      handleImportFinished: vi.fn()
    },
    settingsCenter: {
      backupStatusMessage: ref(""),
      isBackupBusy: ref(false),
      backupStats: ref([]),
      handleSettingsPendingStateChange: vi.fn(),
      handleProfileSaved: vi.fn(),
      exportBackup: vi.fn(),
      importBackup: vi.fn()
    },
    toolsCenter: {
      toolsReturnLabel: computed(() => "首页"),
      closeToolsView: vi.fn()
    }
  };
}

function createPages(routeName, shell = createFakeShell()) {
  const route = reactive({ name: routeName, params: {} });

  return {
    shell,
    route,
    pages: createRouterDrivenPages({ route, ...shell })
  };
}

describe("router driven pages · 路由页面判定", () => {
  it("只把已迁移的路由当作路由驱动页面", () => {
    expect(createPages(APP_ROUTE_NAME.TOOLS).pages.isRouterDrivenPageActive.value).toBe(true);
    expect(createPages(APP_ROUTE_NAME.SETTINGS).pages.isRouterDrivenPageActive.value).toBe(true);
    expect(createPages(APP_ROUTE_NAME.GROWTH_BOOK).pages.isRouterDrivenPageActive.value).toBe(true);

    for (const otherRouteName of [
      APP_ROUTE_NAME.HOME,
      APP_ROUTE_NAME.QUIZ,
      APP_ROUTE_NAME.STUDY,
      APP_ROUTE_NAME.STUDY_MAP,
      APP_ROUTE_NAME.STUDY_PLAYER,
      APP_ROUTE_NAME.WRONG_BOOK,
      APP_ROUTE_NAME.CHALLENGE,
      APP_ROUTE_NAME.CHALLENGE_WORLD
    ]) {
      expect(createPages(otherRouteName).pages.isRouterDrivenPageActive.value).toBe(false);
    }
  });

  it("路由还没解析出 name 时不参与路由渲染", () => {
    const { pages } = createPages(undefined);

    expect(pages.isRouterDrivenPageActive.value).toBe(false);
    expect(pages.routerDrivenPageProps.value).toEqual({});
    expect(pages.routerDrivenPageListeners.value).toEqual({});
  });

  it("非试点页面不提供任何 props / 事件，避免误渲染", () => {
    const { pages } = createPages(APP_ROUTE_NAME.HOME);

    expect(pages.routerDrivenPageProps.value).toEqual({});
    expect(pages.routerDrivenPageListeners.value).toEqual({});
  });

  it("成长纪念册自己取数，不需要任何 props / 事件映射", () => {
    const { pages } = createPages(APP_ROUTE_NAME.GROWTH_BOOK);

    expect(pages.routerDrivenPageProps.value).toEqual({});
    expect(pages.routerDrivenPageListeners.value).toEqual({});
  });
});

describe("router driven pages · props 与页面声明对齐", () => {
  it("工具台的 props 键与 ToolsView 声明的 props 完全一致", () => {
    const { pages } = createPages(APP_ROUTE_NAME.TOOLS);

    expect(Object.keys(pages.routerDrivenPageProps.value).sort()).toEqual(
      readDeclaredProps("ToolsView.vue").sort()
    );
  });

  it("设置页的 props 键与 SettingsView 声明的 props 完全一致", () => {
    const { pages } = createPages(APP_ROUTE_NAME.SETTINGS);

    expect(Object.keys(pages.routerDrivenPageProps.value).sort()).toEqual(
      readDeclaredProps("SettingsView.vue").sort()
    );
  });

  it("工具台的 props 值来自应用状态", () => {
    const { pages, shell } = createPages(APP_ROUTE_NAME.TOOLS);

    shell.app.adminKey.value = "secret";
    shell.app.activeToolSectionId.value = TOOL_SECTION_ID.IMPORT;
    shell.app.catalogPrefill.value = { sourceLabel: "某个关卡" };

    expect(pages.routerDrivenPageProps.value).toEqual({
      adminKey: "secret",
      activeSectionId: TOOL_SECTION_ID.IMPORT,
      catalogPrefill: { sourceLabel: "某个关卡" },
      returnLabel: "首页"
    });
  });

  it("设置页的 props 值来自设置中心状态", () => {
    const { pages, shell } = createPages(APP_ROUTE_NAME.SETTINGS);

    shell.settingsCenter.backupStatusMessage.value = "正在恢复";
    shell.settingsCenter.isBackupBusy.value = true;
    shell.settingsCenter.backupStats.value = [{ label: "今日到期", value: "3" }];

    expect(pages.routerDrivenPageProps.value).toEqual({
      activeSectionId: "settings-profile",
      backupStatusMessage: "正在恢复",
      isBackupBusy: true,
      backupStats: [{ label: "今日到期", value: "3" }]
    });
  });

  it("应用状态变化后 props 跟随更新", () => {
    const { pages, shell } = createPages(APP_ROUTE_NAME.TOOLS);

    shell.app.activeToolSectionId.value = TOOL_SECTION_ID.CACHE;

    expect(pages.routerDrivenPageProps.value.activeSectionId).toBe(TOOL_SECTION_ID.CACHE);
  });
});

describe("router driven pages · 事件与页面声明对齐", () => {
  it("工具台的事件键与 ToolsView 声明的 emits 完全一致", () => {
    const { pages } = createPages(APP_ROUTE_NAME.TOOLS);
    const expectedKeys = readDeclaredEmits("ToolsView.vue")
      .map((eventName) => toHandlerKey(camelize(eventName)))
      .sort();

    expect(Object.keys(pages.routerDrivenPageListeners.value).sort()).toEqual(expectedKeys);
  });

  it("设置页的事件键与 SettingsView 声明的 emits 完全一致", () => {
    const { pages } = createPages(APP_ROUTE_NAME.SETTINGS);
    const expectedKeys = readDeclaredEmits("SettingsView.vue")
      .map((eventName) => toHandlerKey(camelize(eventName)))
      .sort();

    expect(Object.keys(pages.routerDrivenPageListeners.value).sort()).toEqual(expectedKeys);
  });

  it("工具台的 v-model 事件会写回应用状态", () => {
    const { pages, shell } = createPages(APP_ROUTE_NAME.TOOLS);
    const listeners = pages.routerDrivenPageListeners.value;

    listeners["onUpdate:adminKey"]("token");
    listeners["onUpdate:activeSectionId"](TOOL_SECTION_ID.IMPORT);

    expect(shell.app.adminKey.value).toBe("token");
    expect(shell.app.activeToolSectionId.value).toBe(TOOL_SECTION_ID.IMPORT);
  });

  it("设置页的 v-model 事件会写回设置中心状态", () => {
    const { pages, shell } = createPages(APP_ROUTE_NAME.SETTINGS);
    const listeners = pages.routerDrivenPageListeners.value;

    listeners["onUpdate:activeSectionId"]("settings-audio");

    expect(shell.app.activeSettingsSectionId.value).toBe("settings-audio");
  });

  it("工具台的返回与导入完成事件被转发", () => {
    const { pages, shell } = createPages(APP_ROUTE_NAME.TOOLS);
    const listeners = pages.routerDrivenPageListeners.value;

    listeners.onBack();
    listeners.onImported({ imported: 3 });

    expect(shell.toolsCenter.closeToolsView).toHaveBeenCalledTimes(1);
    expect(shell.app.handleImportFinished).toHaveBeenCalledWith({ imported: 3 });
  });

  it("设置页的事件被转发到设置中心", () => {
    const { pages, shell } = createPages(APP_ROUTE_NAME.SETTINGS);
    const listeners = pages.routerDrivenPageListeners.value;

    listeners.onPendingStateChange(true);
    listeners.onProfileSaved({ profile: { grade: "三年级" }, applyToHome: true });
    listeners.onExportBackup();
    listeners.onImportBackup("file-payload");

    expect(shell.settingsCenter.handleSettingsPendingStateChange).toHaveBeenCalledWith(true);
    expect(shell.settingsCenter.handleProfileSaved).toHaveBeenCalledWith({
      profile: { grade: "三年级" },
      applyToHome: true
    });
    expect(shell.settingsCenter.exportBackup).toHaveBeenCalledTimes(1);
    expect(shell.settingsCenter.importBackup).toHaveBeenCalledWith("file-payload");
  });
});

describe("router driven pages · 绑定对象形状", () => {
  it("合并后的绑定对象同时包含 props 与事件监听", () => {
    const { pages } = createPages(APP_ROUTE_NAME.TOOLS);
    const bindings = pages.routerDrivenPageBindings.value;
    const props = pages.routerDrivenPageProps.value;
    const listeners = pages.routerDrivenPageListeners.value;

    expect(Object.keys(bindings).sort()).toEqual(
      [...Object.keys(props), ...Object.keys(listeners)].sort()
    );

    for (const key of Object.keys(listeners)) {
      expect(bindings[key]).toBe(listeners[key]);
    }
  });

  it("事件键保持 emit 查找用的 on 前缀，不能再被叠一层 on", () => {
    // 回归保护：App.vue 用 v-bind 绑定监听器。若改回 v-on，Vue 会编译成 toHandlers()
    // 并把每个 key 再套一层 on 前缀，监听器会静默失效（页面上表现为点击毫无反应）。
    for (const routeName of [APP_ROUTE_NAME.TOOLS, APP_ROUTE_NAME.SETTINGS]) {
      const listeners = createPages(routeName).pages.routerDrivenPageListeners.value;

      for (const key of Object.keys(listeners)) {
        expect(key, `${routeName} 的事件键 ${key} 缺少 on 前缀`).toMatch(/^on[^a-z]/);
        expect(key, `${routeName} 的事件键 ${key} 被重复加了 on 前缀`).not.toMatch(/^onOn/);
        expect(typeof listeners[key]).toBe("function");
      }
    }
  });
});
