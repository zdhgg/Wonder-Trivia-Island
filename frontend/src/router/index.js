import { createRouter, createWebHashHistory } from "vue-router";

const RoutePlaceholder = {
  name: "RoutePlaceholder",
  render() {
    return null;
  }
};

export const APP_ROUTE_NAME = Object.freeze({
  HOME: "home",
  CHALLENGE: "challenge",
  QUIZ: "quiz",
  STUDY: "study",
  STUDY_PLAYER: "study-player",
  WRONG_BOOK: "wrong-book",
  TOOLS: "tools",
  SETTINGS: "settings"
});

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: APP_ROUTE_NAME.HOME,
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
      path: "/tools/:section?",
      name: APP_ROUTE_NAME.TOOLS,
      component: RoutePlaceholder
    },
    {
      path: "/settings/:section?",
      name: APP_ROUTE_NAME.SETTINGS,
      component: RoutePlaceholder
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: APP_ROUTE_NAME.HOME }
    }
  ]
});

export default router;
