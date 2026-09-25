import { describe, expect, it } from "vitest";
import {
  APP_ROUTES,
  APP_ROUTE_NAME,
  GROWTH_BOOK_TAB,
  ROUTER_DRIVEN_PAGE_ROUTE_NAMES,
  isRouterDrivenPageRoute
} from "./routes";

function findRoute(routeName) {
  return APP_ROUTES.find((route) => route.name === routeName);
}

describe("app routes", () => {
  it("路由 name 与 path 都不重复", () => {
    const paths = APP_ROUTES.map((route) => route.path);
    const names = APP_ROUTES.map((route) => route.name).filter(Boolean);

    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("APP_ROUTE_NAME 的每个取值都能在路由表里找到", () => {
    for (const routeName of Object.values(APP_ROUTE_NAME)) {
      expect(findRoute(routeName), `缺少路由 ${routeName}`).toBeDefined();
    }
  });

  it("兜底路由重定向回首页", () => {
    const catchAllRoute = APP_ROUTES.find((route) => route.path.includes("pathMatch"));

    expect(catchAllRoute.redirect).toEqual({ name: APP_ROUTE_NAME.HOME });
  });

  it("已迁入 RouterView 的页面（工具台 / 设置 / 纪念册 / 想一起做）挂的是真实组件，而不是占位组件", () => {
    for (const routeName of ROUTER_DRIVEN_PAGE_ROUTE_NAMES) {
      const route = findRoute(routeName);

      expect(typeof route.component, `${routeName} 仍然是占位组件`).toBe("function");
    }
  });

  it("未迁移的页面暂时保留占位组件", () => {
    const placeholderRouteNames = [
      APP_ROUTE_NAME.HOME,
      APP_ROUTE_NAME.CHALLENGE_WORLD,
      APP_ROUTE_NAME.CHALLENGE,
      APP_ROUTE_NAME.QUIZ,
      APP_ROUTE_NAME.STUDY,
      APP_ROUTE_NAME.STUDY_MAP,
      APP_ROUTE_NAME.STUDY_PLAYER,
      APP_ROUTE_NAME.WRONG_BOOK
    ];

    for (const routeName of placeholderRouteNames) {
      expect(typeof findRoute(routeName).component, `${routeName} 不应提前迁移`).toBe("object");
    }
  });

  it("试点页面的 section 参数都是可选的", () => {
    expect(findRoute(APP_ROUTE_NAME.TOOLS).path).toBe("/tools/:section?");
    expect(findRoute(APP_ROUTE_NAME.SETTINGS).path).toBe("/settings/:section?");
  });

  it("成长纪念册是独立页面，路径不带参数", () => {
    expect(findRoute(APP_ROUTE_NAME.GROWTH_BOOK).path).toBe("/growth-book");
  });

  it("纪念册的两条记录线有稳定的名字（页面与首页入口共用）", () => {
    expect(GROWTH_BOOK_TAB).toEqual({ TOGETHER: "together", MILESTONES: "milestones" });
  });

  it("想一起做也是独立页面，路径不带参数", () => {
    expect(findRoute(APP_ROUTE_NAME.GROWTH_PLANS).path).toBe("/growth-plans");
  });

  it("isRouterDrivenPageRoute 只认得已迁移的页面", () => {
    expect(isRouterDrivenPageRoute(APP_ROUTE_NAME.TOOLS)).toBe(true);
    expect(isRouterDrivenPageRoute(APP_ROUTE_NAME.SETTINGS)).toBe(true);
    expect(isRouterDrivenPageRoute(APP_ROUTE_NAME.GROWTH_BOOK)).toBe(true);
    expect(isRouterDrivenPageRoute(APP_ROUTE_NAME.GROWTH_PLANS)).toBe(true);
    expect(isRouterDrivenPageRoute(APP_ROUTE_NAME.WRONG_BOOK)).toBe(false);
    expect(isRouterDrivenPageRoute(undefined)).toBe(false);
    expect(isRouterDrivenPageRoute("")).toBe(false);
  });
});
