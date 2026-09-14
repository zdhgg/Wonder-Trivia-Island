import { createRouter, createWebHashHistory } from "vue-router";
import { APP_ROUTES, APP_ROUTE_NAME } from "./routes";

export { APP_ROUTE_NAME };

const router = createRouter({
  history: createWebHashHistory(),
  routes: APP_ROUTES,
  // 地图页从年级总览进入单年级时是同一路由换参数，必须回到顶部，否则会停在上一级的滚动位置
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    return { top: 0 };
  }
});

export default router;
