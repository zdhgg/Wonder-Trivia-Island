const { test, expect } = require("@playwright/test");
const { KNOWLEDGE_ISLAND_REGION } = require("../support/knowledge-island");

// 场景 5：探险收藏册（Phase 2B）——把已有成长数据收藏化展示。
//
// 覆盖两条容易串台的路径：
//   1. 首页入口 → 必须用首页成长区对应的那一章；
//   2. 闯关地图入口 → 必须用当前选中的那一章。
// 另外验证探险印章（Phase 2A 的持久化账本）在收藏册第一块「我的知识岛」里可见
// （Phase 2C-A 把原来的“探险印章”块升级成知识岛成长），且没有印章时是儿童化空状态。
//
// 关于首页章节：app 里 watch(selectedChallengeChapterId) 会把首页挑战章节同步为选中章节，
// 所以“首页那一章”= 档案年级 + 当前选中章节。测试里两者显式保持一致，避免互相打架。

const CHALLENGE_PROGRESS_STORAGE_KEY = "wonder-trivia-island.challenge.progress";
const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const STAGE_IDS = Object.freeze(["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"]);
// 档案五年级下册 → 首页那一章是 chapter-grade-5-lower；
// 默认章节 chapter-grade-3-upper 故意放一份不同的数据当“串台探测器”。
const HOME_CHAPTER_ID = "chapter-grade-5-lower";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "五年级", semester: "下册" });
const DEFAULT_CHAPTER_ID = "chapter-grade-3-upper";
const OTHER_CHAPTER_ID = "chapter-grade-4-upper";
const COLLECTION_BOOK_BUTTON = /我的探险收藏册/;

function getTodayDateKey() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function getTodayStampLabel() {
  const now = new Date();

  return `${now.getMonth() + 1} 月 ${now.getDate()} 日`;
}

// 一章节的真实 progress 形状：starCount > 0 表示过关，rewardEarned 表示收下航海收藏。
function buildChapterEntry({ clearedStageCount = 0, earnedRewardCount = 0 } = {}) {
  const unlockedStageIds = STAGE_IDS.slice(0, Math.max(1, clearedStageCount));
  const bestResults = {};

  STAGE_IDS.forEach((stageId, index) => {
    const isCleared = index < clearedStageCount;

    bestResults[stageId] = {
      starCount: isCleared ? 3 : 0,
      bestAccuracy: isCleared ? 100 : 0,
      attempts: isCleared ? 1 : 0,
      bestScore: isCleared ? 100 : 0,
      rewardEarned: index < earnedRewardCount
    };
  });

  return { unlockedStageIds, bestResults };
}

async function seedStorage(page, { profile = HOME_PROFILE, activeChapterId = HOME_CHAPTER_ID, chapters = {} } = {}) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot, progressKey, activeId, chapterEntries }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
      window.localStorage.setItem(
        progressKey,
        JSON.stringify({ activeChapterId: activeId, chapters: chapterEntries })
      );
    },
    {
      settingsKey: SETTINGS_STORAGE_KEY,
      profileSnapshot: profile,
      progressKey: CHALLENGE_PROGRESS_STORAGE_KEY,
      activeId: activeChapterId,
      chapterEntries: chapters
    }
  );
}

// 用应用自己的配置解析“首页那一章”，避免测试里手写年级 → 章节的映射。
async function readHomeChapter(page) {
  return page.evaluate(async ({ settingsKey }) => {
    const profile = JSON.parse(window.localStorage.getItem(settingsKey) || "{}")?.profile || {};
    const { getChallengeChapterBySelection } = await import("/src/composables/challenge/challengeConfig.js");
    const chapter = getChallengeChapterBySelection(profile.grade, profile.semester);

    return {
      id: chapter.id,
      grade: chapter.grade,
      semester: chapter.semester,
      routeTitle: chapter.routeTitle,
      scopeLabel: `${chapter.grade} · ${chapter.semester} · ${chapter.routeTitle}`
    };
  }, { settingsKey: SETTINGS_STORAGE_KEY });
}

function collectionBookDialog(page) {
  return page.getByRole("dialog", { name: "我的探险收藏册" });
}

// 首页成长卡现在有两个收藏册入口（右上角按钮 + 印章摘要行），
// 这里固定走右上角那个，避免选择器歧义；两个入口打开的是同一个收藏册。
const GROWTH_BOOK_BUTTON_LABEL = "打开我的探险收藏册，查看印章、航海收藏和成就";

async function openCollectionBookFromHome(page) {
  await page.getByRole("button", { name: GROWTH_BOOK_BUTTON_LABEL }).click();

  const dialog = collectionBookDialog(page);

  await expect(dialog).toBeVisible();
  return dialog;
}

async function claimTodayChestThroughApi(page) {
  return page.evaluate(async (dateKey) => {
    const response = await fetch("/api/growth-progress/daily-chest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey })
    });

    return response.json();
  }, getTodayDateKey());
}

test.describe("探险收藏册", () => {
  test("首页能打开收藏册，且展示的是首页成长区对应的那一章", async ({ page }) => {
    await page.goto("/");

    // 首页那一章 2 件收藏；默认章节（也是三年级）故意给 5 件，串台就会露馅。
    await seedStorage(page, {
      chapters: {
        [HOME_CHAPTER_ID]: buildChapterEntry({ clearedStageCount: 2, earnedRewardCount: 2 }),
        [DEFAULT_CHAPTER_ID]: buildChapterEntry({ clearedStageCount: 5, earnedRewardCount: 5 })
      }
    });
    await page.reload();

    const homeChapter = await readHomeChapter(page);

    expect(homeChapter.id).toBe(HOME_CHAPTER_ID);

    const growth = page.getByRole("region", { name: "我的成长" });

    // 首页成长区的航海收藏口径 = 2 / 7。
    await expect(growth).toContainText("2 / 7");

    const dialog = await openCollectionBookFromHome(page);

    // 作用域 = 首页那一章（五年级下册），不是默认章节、也不是别的章。
    await expect(dialog).toContainText(homeChapter.scopeLabel);
    await expect(dialog).not.toContainText("三年级");
    await expect(dialog).not.toContainText("5 / 7");

    // 三块内容都在，且收藏数与首页成长区完全一致（同一个章节口径）。
    await expect(dialog.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION })).toBeVisible();
    await expect(dialog.getByRole("region", { name: "本章航海收藏" })).toContainText("2 / 7");
    await expect(dialog.getByRole("region", { name: "本章成就" })).toBeVisible();
    await expect(growth).toContainText("2 / 7");

    // 已获得 / 未获得在界面上区分得出来：2 件已获得，5 件锁定。
    const rewardList = dialog.getByRole("region", { name: "本章航海收藏" });

    await expect(rewardList.locator(".collection-book__reward--earned")).toHaveCount(2);
    await expect(rewardList.locator(".collection-book__reward:not(.collection-book__reward--earned)")).toHaveCount(5);
    await expect(rewardList).toContainText("已获得");
    await expect(rewardList).toContainText("未获得");

    // 成就区复用现有判定：有已达成，也有进行中。
    const achievementList = dialog.getByRole("region", { name: "本章成就" });

    await expect(achievementList.locator(".challenge-achievement-card--unlocked").first()).toBeVisible();
    await expect(achievementList).toContainText("进行中");

    // 关闭后弹窗消失（它挂在根层级，不属于某个视图）。
    await dialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();
    await expect(collectionBookDialog(page)).toHaveCount(0);
  });

  test("闯关地图打开收藏册时使用当前选中的章节", async ({ page }) => {
    await page.goto("/");

    // 首页那一章全部通关 → 首页 CTA 变成“回到大地图看看”。
    await seedStorage(page, {
      chapters: {
        [HOME_CHAPTER_ID]: buildChapterEntry({ clearedStageCount: 7, earnedRewardCount: 7 }),
        [OTHER_CHAPTER_ID]: buildChapterEntry({ clearedStageCount: 5, earnedRewardCount: 5 })
      }
    });
    await page.reload();

    // 先在首页打开一次（五年级下册 · 7 / 7），后面切章后要确认不会看到这份旧数据。
    const homeDialog = await openCollectionBookFromHome(page);

    await expect(homeDialog).toContainText("五年级 · 下册");
    await expect(homeDialog).toContainText("7 / 7");
    await homeDialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();
    await expect(collectionBookDialog(page)).toHaveCount(0);

    await page.getByRole("region", { name: "今天的探险" }).getByRole("button").click();
    await expect(page.getByRole("heading", { name: "奇妙世界大地图" })).toBeVisible();

    // 切到四年级上册那一章。
    await page.locator(".challenge-world-card").filter({ hasText: "四年级 · 上册" }).click();
    await expect(page).toHaveURL(/#\/challenge$/);

    await page.getByRole("button", { name: COLLECTION_BOOK_BUTTON }).click();

    const dialog = collectionBookDialog(page);

    await expect(dialog).toBeVisible();
    // 作用域 = 当前选中的四年级上册，不是首页原来的五年级下册，也不带上一章的旧数字。
    await expect(dialog).toContainText("四年级 · 上册");
    await expect(dialog).toContainText("5 / 7");
    await expect(dialog).not.toContainText("五年级");
    await expect(dialog).not.toContainText("7 / 7");
  });

  test("Phase 2A 领取的探险印章在收藏册可见，刷新后仍然在", async ({ page }) => {
    await page.goto("/");

    // 直接走真实接口领取今天的宝箱（前端只在 3/3 时才调用，这里只验证数据展示）。
    const claimPayload = await claimTodayChestThroughApi(page);

    expect(claimPayload.alreadyClaimed).toBe(false);
    expect(claimPayload.growthProgress.totalDailyChests).toBe(1);

    await page.reload();

    let dialog = await openCollectionBookFromHome(page);
    let islandSection = dialog.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION });

    await expect(islandSection).toContainText("累计 1 枚探险印章");
    await expect(islandSection).toContainText("已经攒了 1 枚探险印章");
    await expect(islandSection).toContainText(getTodayStampLabel());

    // 再刷新一次：印章来自服务端账本，不该丢。
    await page.reload();

    dialog = await openCollectionBookFromHome(page);
    islandSection = dialog.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION });

    await expect(islandSection).toContainText("累计 1 枚探险印章");
    await expect(islandSection).toContainText(getTodayStampLabel());
  });

  test("还没有印章时收藏册给出儿童化空状态", async ({ page }) => {
    await page.goto("/");

    const dialog = await openCollectionBookFromHome(page);
    const islandSection = dialog.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION });

    await expect(islandSection).toContainText("累计 0 枚探险印章");
    await expect(islandSection).toContainText("还没有探险印章");
    await expect(islandSection).toContainText("今日宝箱");

    // 没有印章时不出现任何领取日期。
    await expect(islandSection.locator(".collection-book__stamp")).toHaveCount(0);
  });

  test("收藏册打开时浏览器后退，弹窗不会残留在新页面上", async ({ page }) => {
    await page.goto("/");

    await seedStorage(page, {
      chapters: {
        [HOME_CHAPTER_ID]: buildChapterEntry({ clearedStageCount: 7, earnedRewardCount: 7 }),
        [OTHER_CHAPTER_ID]: buildChapterEntry({ clearedStageCount: 5, earnedRewardCount: 5 })
      }
    });
    await page.reload();

    // 首页 → 大地图 → 四年级挑战，留下可后退的历史。
    await page.getByRole("region", { name: "今天的探险" }).getByRole("button").click();
    await expect(page.getByRole("heading", { name: "奇妙世界大地图" })).toBeVisible();
    await page.locator(".challenge-world-card").filter({ hasText: "四年级 · 上册" }).click();
    await expect(page).toHaveURL(/#\/challenge$/);

    await page.getByRole("button", { name: COLLECTION_BOOK_BUTTON }).click();
    await expect(collectionBookDialog(page)).toBeVisible();

    // 浏览器后退回到大地图：收藏册必须跟着关掉，不能盖在新页面上。
    await page.goBack();

    await expect(page).toHaveURL(/#\/challenge\/world$/);
    await expect(page.getByRole("heading", { name: "奇妙世界大地图" })).toBeVisible();
    await expect(collectionBookDialog(page)).toHaveCount(0);
  });
});
