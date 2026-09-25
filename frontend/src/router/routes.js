// 纯路由表：不触碰 window / history，便于在 node 环境下被测试直接引用。
// 路由实例（含 history 与 scrollBehavior）保留在 ./index.js。
export const APP_ROUTE_NAME = Object.freeze({
  HOME: "home",
  CHALLENGE_WORLD: "challenge-world",
  CHALLENGE: "challenge",
  QUIZ: "quiz",
  STUDY: "study",
  STUDY_MAP: "study-map",
  STUDY_PLAYER: "study-player",
  WRONG_BOOK: "wrong-book",
  GROWTH_BOOK: "growth-book",
  GROWTH_PLANS: "growth-plans",
  TOOLS: "tools",
  SETTINGS: "settings"
});

// 已迁入 RouterView 的页面：路由本身负责渲染页面组件
export const ROUTER_DRIVEN_PAGE_ROUTE_NAMES = Object.freeze([
  APP_ROUTE_NAME.TOOLS,
  APP_ROUTE_NAME.SETTINGS,
  APP_ROUTE_NAME.GROWTH_BOOK,
  APP_ROUTE_NAME.GROWTH_PLANS
]);

export function isRouterDrivenPageRoute(routeName) {
  return ROUTER_DRIVEN_PAGE_ROUTE_NAMES.includes(String(routeName || ""));
}

// 成长纪念册里的两条记录线：共同经历（足迹）与她自己的成长。
// 放在路由常量旁边，因为首页入口和页面内切换都要用同一个名字。
export const GROWTH_BOOK_TAB = Object.freeze({
  TOGETHER: "together",
  MILESTONES: "milestones"
});

// 尚未迁移的页面：App.vue 仍按 currentView 用 v-if 渲染，这里只登记 URL
const RoutePlaceholder = {
  name: "RoutePlaceholder",
  render() {
    return null;
  }
};

export const APP_ROUTES = Object.freeze([
  {
    path: "/",
    name: APP_ROUTE_NAME.HOME,
    component: RoutePlaceholder
  },
  {
    path: "/challenge/world",
    name: APP_ROUTE_NAME.CHALLENGE_WORLD,
    component: RoutePlaceholder
  },
  {
    path: "/challenge",
    name: APP_ROUTE_NAME.CHALLENGE,
    component: RoutePlaceholder
  },
  {
    path: "/quiz",
    name: APP_ROUTE_NAME.QUIZ,
    component: RoutePlaceholder
  },
  {
    path: "/study",
    name: APP_ROUTE_NAME.STUDY,
    component: RoutePlaceholder
  },
  {
    path: "/study/map/:grade?",
    name: APP_ROUTE_NAME.STUDY_MAP,
    component: RoutePlaceholder
  },
  {
    path: "/study/player/:lessonId?",
    name: APP_ROUTE_NAME.STUDY_PLAYER,
    component: RoutePlaceholder
  },
  {
    path: "/wrong-book",
    name: APP_ROUTE_NAME.WRONG_BOOK,
    component: RoutePlaceholder
  },
  {
    path: "/growth-book",
    name: APP_ROUTE_NAME.GROWTH_BOOK,
    component: () => import("../views/GrowthBookView.vue")
  },
  {
    path: "/growth-plans",
    name: APP_ROUTE_NAME.GROWTH_PLANS,
    component: () => import("../views/GrowthPlansView.vue")
  },
  {
    path: "/tools/:section?",
    name: APP_ROUTE_NAME.TOOLS,
    component: () => import("../views/ToolsView.vue")
  },
  {
    path: "/settings/:section?",
    name: APP_ROUTE_NAME.SETTINGS,
    component: () => import("../views/SettingsView.vue")
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: { name: APP_ROUTE_NAME.HOME }
  }
]);
