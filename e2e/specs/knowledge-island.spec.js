const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { test, expect } = require("@playwright/test");
const { E2E_DB_PATH } = require("../e2e-environment");
const {
  HOME_ISLAND_ROW_LABEL,
  KNOWLEDGE_ISLAND_FIGURE,
  KNOWLEDGE_ISLAND_FILL,
  KNOWLEDGE_ISLAND_PAGE_NEXT,
  KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT,
  KNOWLEDGE_ISLAND_PAGE_STAR_COUNT,
  KNOWLEDGE_ISLAND_PAGE_TITLE,
  KNOWLEDGE_ISLAND_PAGE_URL,
  KNOWLEDGE_ISLAND_REGION,
  KNOWLEDGE_ISLAND_TRACK,
  KNOWLEDGE_ISLAND_TERRAIN,
  KNOWLEDGE_ISLAND_NEXT_TERRAIN,
  KNOWLEDGE_ISLAND_GRASSLAND,
  KNOWLEDGE_ISLAND_HIGHLAND,
  KNOWLEDGE_ISLAND_BEAM,
  KNOWLEDGE_ISLAND_ZONES,
  COLLECTION_ISLAND_ENTRY,
  COLLECTION_ISLAND_ENTRY_LABEL,
  collectionIslandMetaText,
  collectionIslandStageText,
  homeIslandText,
  islandStampText,
  sectionCountText
} = require("../support/knowledge-island");

// 场景 7：知识岛成长（Phase 2C-A）。
//
// 覆盖：累计探险印章 → 知识岛阶段 → 视觉变化 → 下一阶段目标，
// 以及首页摘要与收藏册必须永远是同一个阶段。
//
// 关于“怎么造出 3 / 7 / 15 / 30 枚印章”：
// 服务端只允许领「真实的今天」，所以不可能在测试里刷出 30 枚。
// 这里直接往 E2E 隔离库的 growth_progress 表写一份真实形状的账本
// （仍然是同一个字段 totalDailyChests），前端两条路径都只读这一个数字，
// 不新增任何测试专用业务入口、也不新增 API。

const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "三年级", semester: "上册" });
const GROWTH_PROGRESS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS growth_progress (
    profile_id TEXT PRIMARY KEY,
    progress_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
const CHALLENGE_PROGRESS_STORAGE_KEY = "wonder-trivia-island.challenge.progress";
const HOME_DAILY_TASKS_STORAGE_KEY = "wonder-trivia-island.home.daily-tasks";
const STAGE_IDS = Object.freeze(["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"]);
const CELEBRATION_TITLE = "小岛有新变化啦！";
const CELEBRATION_DIALOG = "小岛有新变化啦！";
const CLAIM_BUTTON = "领取今日宝箱";
// 种子账本最多写几条 dailyClaims（与生产端 MAX_DAILY_CLAIMS 同一量级，测试不需要写满）。
const MAX_SEEDED_DAILY_CLAIMS = 5;

function getTodayDateKey() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

// 今日 3 个小任务全部完成 → 首页宝箱可领取。
function buildCompletedTodayTasks() {
  return {
    version: 1,
    dateKey: getTodayDateKey(),
    tasks: {
      stagesCleared: 1,
      reviewedQuestionIds: ["101", "102", "103"],
      completedLessonIds: ["grade-three-math-lesson-1"]
    },
    updatedAt: new Date().toISOString()
  };
}

// 一章节的真实 progress 形状：starCount > 0 表示过关，rewardEarned 表示收下航海收藏。
function buildChapterEntry({ clearedStageCount = 0, earnedRewardCount = 0 } = {}) {
  const bestResults = {};

  STAGE_IDS.forEach((stageId, index) => {
    const cleared = index < clearedStageCount;

    bestResults[stageId] = {
      starCount: cleared ? 3 : 0,
      bestAccuracy: cleared ? 100 : 0,
      attempts: cleared ? 1 : 0,
      bestScore: cleared ? 100 : 0,
      rewardEarned: index < earnedRewardCount
    };
  });

  return { unlockedStageIds: STAGE_IDS.slice(0, Math.max(1, clearedStageCount)), bestResults };
}

// 直接问应用自己的纯函数要阶段名 / 文案，测试里不写第二份期望值。
async function readIslandExpectation(page, stampCount) {
  return page.evaluate(async (count) => {
    const { buildKnowledgeIslandGrowth } = await import("/src/utils/knowledgeIslandGrowth.js");
    const growth = buildKnowledgeIslandGrowth(count);

    return {
      stageName: growth.currentStage.name,
      stageGlyph: growth.currentStage.glyph,
      stageId: growth.currentStage.id,
      stampText: growth.stampText,
      nextText: growth.nextText,
      progressText: growth.progressText,
      progressPercent: growth.progressPercent,
      isMaxStage: growth.isMaxStage,
      // 下一阶段是谁同样只认这一个纯函数：满级时是 null。
      nextStageId: growth.nextStage ? growth.nextStage.id : null,
      // 块内作用域提示的文案也从应用自己的纯函数取。
      scopeText: growth.islandScopeText
    };
  }, stampCount);
}

// 真实账本形状：totalDailyChests 就是累计印章数，dailyClaims 是它的明细。
// includeTodayClaim 用来造“今天服务端已经领过”的既成事实（服务端会回 alreadyClaimed）。
//
// 关键约束：dailyClaims 的条数必须和 totalDailyChests 一致，不能自相矛盾。
// 因为生产代码 normalizeGrowthProgress() 会取 max(totalDailyChests, dailyClaims.length)，
// 如果 fixture 写成 totalDailyChests = 3 却塞了 4 条 claim，服务端会把它规范化成 4 枚——
// 测试就会在“声称 3 枚”的情况下实际跑 4 枚，边界用例会静默失效。
function buildGrowthProgressJson(stampCount, { includeTodayClaim = false } = {}) {
  const dailyClaims = {};
  // stampCount = 0 时不凭空造一条“今天已领取”。
  const todayClaimCount = includeTodayClaim && stampCount > 0 ? 1 : 0;
  // 上限 5 条是 dailyClaims 的总条数（生产端 MAX_DAILY_CLAIMS 的量级），
  // 所以要先把今天那一条算进去，历史条数只是剩下的余量。
  const totalClaimCount = Math.min(stampCount, MAX_SEEDED_DAILY_CLAIMS);
  const historicalClaimCount = Math.max(0, totalClaimCount - todayClaimCount);
  const todayDateKey = getTodayDateKey();

  for (const dateKey of listHistoricalClaimDateKeys(historicalClaimCount, todayDateKey)) {
    dailyClaims[dateKey] = { claimedAt: `${dateKey}T08:00:00.000Z` };
  }

  if (todayClaimCount > 0) {
    dailyClaims[todayDateKey] = { claimedAt: new Date().toISOString() };
  }

  return JSON.stringify({
    version: 1,
    totalDailyChests: stampCount,
    dailyClaims
  });
}

// 历史 claim 日期只用来占位：从 1 号往后取，但明确排除今天。
// 如果固定日期刚好撞上运行日期，跳过它并继续往后取，保证条数仍然准确
// （不依赖“今天大概率不是 1~5 号”）。
function listHistoricalClaimDateKeys(claimCount, todayDateKey) {
  const dateKeys = [];

  for (let day = 1; dateKeys.length < claimCount && day <= 30; day += 1) {
    const dateKey = `2026-09-${`${day}`.padStart(2, "0")}`;

    if (dateKey === todayDateKey) {
      continue;
    }

    dateKeys.push(dateKey);
  }

  return dateKeys;
}

// fixture 自身的守卫：账本必须自洽，否则测试会在“声称 N 枚”时实际跑成别的数字。
function expectConsistentGrowthFixture(rawProgressJson, stampCount) {
  const parsed = JSON.parse(rawProgressJson);
  const dateKeys = Object.keys(parsed.dailyClaims);

  expect(parsed.totalDailyChests).toBe(stampCount);
  expect(parsed.version).toBe(1);
  // 生产代码取 max(totalDailyChests, dailyClaims.length)，所以条数永远不能超过声称的印章数。
  expect(dateKeys.length).toBeLessThanOrEqual(stampCount);

  return { parsed, dateKeys };
}

// 只写 E2E 隔离库；e2e/e2e-environment.js 已经保证这个路径不会是真库。
function seedStoredStampCount(profileId, stampCount, options = {}) {
  const db = new DatabaseSync(E2E_DB_PATH);

  try {
    db.exec(GROWTH_PROGRESS_TABLE_SQL);
    db.prepare(
      `
        INSERT INTO growth_progress (profile_id, progress_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(profile_id) DO UPDATE SET
          progress_json = excluded.progress_json,
          updated_at = excluded.updated_at
      `
    ).run(profileId, buildGrowthProgressJson(stampCount, options), new Date().toISOString());
  } finally {
    db.close();
  }
}

async function seedHomeStorage(page, profile = HOME_PROFILE) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: SETTINGS_STORAGE_KEY, profileSnapshot: profile }
  );
}

// 今日小任务进度是前端本地日进度，直接写应用自己的 key。
async function seedHomeDailyTasks(page) {
  await page.addInitScript(
    ({ tasksKey, tasksValue }) => {
      window.localStorage.setItem(tasksKey, JSON.stringify(tasksValue));
    },
    { tasksKey: HOME_DAILY_TASKS_STORAGE_KEY, tasksValue: buildCompletedTodayTasks() }
  );
}

// 真实领取路径：直接点击首页“今日宝箱”状态条上的领取按钮。
async function claimTodayChestFromHome(page) {
  await page.getByRole("button", { name: CLAIM_BUTTON }).click();
  await expect(page.getByRole("region", { name: "今日宝箱" })).toContainText("今日已领取");
}

function celebrationDialog(page) {
  return page.getByRole("dialog", { name: CELEBRATION_DIALOG });
}

// 弹层里“新出现”的元素名，按显示顺序读出来。
async function readCelebrationFeatureNames(page) {
  return celebrationDialog(page)
    .locator(".island-celebration__feature-name")
    .allInnerTexts()
    .then((names) => names.map((name) => name.trim()));
}

// 每一轮都用一个新的 profile id：印章来自服务端账本，必须让这一轮自己说了算。
async function openHomeWithStampCount(page, stampCount) {
  const profileId = randomUUID();

  await seedHomeStorage(page);
  await page.context().addCookies([
    {
      name: PROFILE_COOKIE_NAME,
      value: profileId,
      url: "http://127.0.0.1:3101",
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
  seedStoredStampCount(profileId, stampCount);
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

  return profileId;
}

// 阶段反馈场景：固定起始印章数 + 今日任务 3/3（宝箱可领取），宝箱本身还没领过。
async function openHomeReadyToClaim(page, stampCount) {
  const profileId = randomUUID();

  await seedHomeStorage(page);
  await seedHomeDailyTasks(page);
  await page.context().addCookies([
    {
      name: PROFILE_COOKIE_NAME,
      value: profileId,
      url: "http://127.0.0.1:3101",
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
  seedStoredStampCount(profileId, stampCount);
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

  return profileId;
}

// 已经领过今天：账本里同时记下今天的 claim，服务端会回 alreadyClaimed = true。
async function openHomeAlreadyClaimedToday(page, stampCount) {
  const profileId = randomUUID();

  await seedHomeStorage(page);
  await seedHomeDailyTasks(page);
  await page.context().addCookies([
    {
      name: PROFILE_COOKIE_NAME,
      value: profileId,
      url: "http://127.0.0.1:3101",
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
  seedStoredStampCount(profileId, stampCount, { includeTodayClaim: true });
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

  return profileId;
}

function collectionBookDialog(page) {
  return page.getByRole("dialog", { name: "我的探险收藏册" });
}

async function openCollectionBookFromHome(page) {
  await page.getByRole("button", { name: "打开我的探险收藏册，查看印章、航海收藏和成就" }).click();

  const dialog = collectionBookDialog(page);

  await expect(dialog).toBeVisible();
  return dialog;
}

function islandSection(dialog) {
  return dialog.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION });
}

// 知识岛独立页面：深链直接打开，页面本身就是一块 role=region「我的知识岛」。
async function openKnowledgeIslandPage(page) {
  // 从 /#/ 到 /#/knowledge-island 只改 hash，浏览器不会重载应用，
  // 所以可能还开着的收藏册弹窗会跟着留到这一页。先把它收掉，
  // 保证这里量到的就是这个页面本身（真实使用里 openKnowledgeIslandView 也会顺手关掉它）。
  const closeButton = page.getByRole("button", { name: "关闭我的探险收藏册" });

  if (await closeButton.isVisible()) {
    await closeButton.click();
  }

  await page.goto(KNOWLEDGE_ISLAND_PAGE_URL);
  await page
    .getByRole("region", { name: KNOWLEDGE_ISLAND_REGION })
    .waitFor({ state: "visible", timeout: 15_000 });

  return page.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION });
}

// 页面上的「当前阶段 / 印章 / 繁荣度 / 累计星星 / 下一枚印章」逐项读出来。
async function readIslandPageSummary(page) {
  return page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.innerText.trim() || "";

    return {
      stageName: text(".island-page__hero-stage strong"),
      prosperityLabel: text(".island-page__hero-prosperity"),
      stampCount: text('[data-role="island-page-stamp-count"]'),
      starCount: text('[data-role="island-page-star-count"]'),
      nextText: text('[data-role="island-page-next"]'),
      figureStage: document.querySelector('[data-role="knowledge-island-figure"]')?.getAttribute("data-stage") || "",
      figureProsperity:
        document.querySelector('[data-role="knowledge-island-figure"]')?.getAttribute("data-prosperity") || ""
    };
  });
}

async function readIslandFigure(page, container) {
  return container.locator(KNOWLEDGE_ISLAND_FIGURE).evaluate((figure) => ({
    // evaluate() 只回传序列化后的数据，所以显式读属性，不依赖 dataset 对象。
    stage: figure.getAttribute("data-stage"),
    box: figure.getBoundingClientRect().toJSON(),
    visibleChildren: [...figure.querySelectorAll("*")].filter((child) => child.getBoundingClientRect().width > 0).length
  }));
}

// 390 窄屏也不许出现横向溢出：整页、弹窗、入口卡三层都量一遍。
async function readHorizontalOverflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const card = document.querySelector(".adventure-modal-card--collection");
    const island = document.querySelector(".knowledge-island");
    const viewportWidth = window.innerWidth;

    return {
      viewportWidth,
      documentWidth: root.scrollWidth,
      cardRight: card ? Math.round(card.getBoundingClientRect().right) : 0,
      islandRight: island ? Math.round(island.getBoundingClientRect().right) : 0,
      islandWidth: island ? Math.round(island.getBoundingClientRect().width) : 0
    };
  });
}

test.describe("知识岛成长", () => {
  test("A. 0 枚：收藏册留一张入口卡，独立页面是完整的第一阶段小岛", async ({ page }) => {
    await openHomeWithStampCount(page, 0);

    const expectation = await readIslandExpectation(page, 0);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    // 收藏册：只留入口卡。阶段、繁荣度、印章数都还在，但不再塞整幅大画面。
    await expect(island).toBeVisible();
    await expect(island).toContainText(sectionCountText(0));
    await expect(island).toContainText(collectionIslandStageText(expectation.stageName, "基础"));
    await expect(island).toContainText(collectionIslandMetaText(0, 0));
    await expect(island).toContainText(expectation.scopeText);
    await expect(island.locator(COLLECTION_ISLAND_ENTRY)).toBeVisible();
    await expect(island.locator(KNOWLEDGE_ISLAND_FIGURE)).toHaveCount(0);

    // 还没有印章：不显示任何领取日期，但仍然给出儿童化空状态说明。
    await expect(island.locator(".collection-book__stamp")).toHaveCount(0);
    await expect(island).toContainText("还没有探险印章");

    // 独立页面：岛不是空白，画面真的画出来了，而且已经有岛上元素。
    const islandPage = await openKnowledgeIslandPage(page);

    await expect(islandPage.getByRole("heading", { name: KNOWLEDGE_ISLAND_PAGE_TITLE })).toBeVisible();
    const figure = await readIslandFigure(page, islandPage);

    expect(figure.stage).toBe(expectation.stageId);
    // hero 尺寸：这一页上画面必须真的比收藏册里那一小块大得多。
    expect(figure.box.width).toBeGreaterThan(400);
    expect(figure.box.height).toBeGreaterThan(200);
    expect(figure.visibleChildren).toBeGreaterThan(0);

    const summary = await readIslandPageSummary(page);

    expect(summary.figureStage).toBe(expectation.stageId);
    expect(summary.stampCount).toBe("0 枚");
    // 0 枚时没有假进度：仍然明说还要再攒 3 枚。
    expect(summary.nextText).toBe(expectation.nextText);
    await expect(summary.nextText).toContain("再攒 3 枚");

    // 第一阶段是一座朴素的小岛：后面的阶段元素都还没出现。
    await expect(islandPage.locator(".knowledge-island__sprout")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__palm")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__dock")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__lighthouse")).toHaveCount(0);
  });

  test("B. 3 枚：阶段切换，对应新视觉元素出现", async ({ page }) => {
    await openHomeWithStampCount(page, 3);

    const firstStageExpectation = await readIslandExpectation(page, 0);
    const expectation = await readIslandExpectation(page, 3);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    // 3 枚已经不在第一阶段了。
    expect(expectation.stageId).not.toBe(firstStageExpectation.stageId);
    await expect(island).toContainText(sectionCountText(3));
    await expect(island).toContainText(collectionIslandStageText(expectation.stageName, "基础"));

    const islandPage = await openKnowledgeIslandPage(page);
    const figure = await readIslandFigure(page, islandPage);

    expect(figure.stage).toBe(expectation.stageId);

    const summary = await readIslandPageSummary(page);

    expect(summary.figureStage).toBe(expectation.stageId);
    expect(summary.stageName).toContain(expectation.stageName);
    expect(summary.stampCount).toBe("3 枚");
    // 这一阶段刚重新开始：0 / 4。
    await expect(islandPage).toContainText(expectation.progressText);
    expect(summary.nextText).toBe(expectation.nextText);
    await expect(summary.nextText).toContain("再攒 4 枚印章");

    // 新阶段才有嫩芽和小草丛：0 枚时没有，3 枚时有。
    await expect(islandPage.locator(".knowledge-island__sprout")).toHaveCount(1);
    await expect(islandPage.locator(".knowledge-island__grass")).toHaveCount(1);
    await expect(islandPage.locator(".knowledge-island__palm")).toHaveCount(0);
  });

  test("C. 7 枚：进入下一阶段，首页摘要、收藏册入口卡与独立页面完全一致", async ({ page }) => {
    await openHomeWithStampCount(page, 7);

    const expectation = await readIslandExpectation(page, 7);
    const growth = page.getByRole("region", { name: "我的成长" });
    const islandRow = growth.getByRole("button", { name: HOME_ISLAND_ROW_LABEL });

    // 首页摘要：轻量一行，写的是同一个阶段 + 同一个印章数 + 同一句下一变化。
    await expect(islandRow).toBeVisible();
    await expect(islandRow).toContainText(homeIslandText(7, expectation.stageName));
    await expect(islandRow).toContainText(expectation.nextText);

    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(sectionCountText(7));
    await expect(island).toContainText(collectionIslandStageText(expectation.stageName, "基础"));

    const islandPage = await openKnowledgeIslandPage(page);
    const figure = await readIslandFigure(page, islandPage);

    expect(figure.stage).toBe(expectation.stageId);
    await expect(islandPage.locator(".knowledge-island__palm")).toHaveCount(1);
    await expect(islandPage.locator(".knowledge-island__dock")).toHaveCount(0);

    const summary = await readIslandPageSummary(page);

    expect(summary.stampCount).toBe("7 枚");
    expect(summary.starCount).toBe("0 颗");
    expect(summary.nextText).toBe(expectation.nextText);
  });

  test("D. 15 枚：进入探险码头，出现小码头与小船", async ({ page }) => {
    await openHomeWithStampCount(page, 15);

    const expectation = await readIslandExpectation(page, 15);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(sectionCountText(15));

    const islandPage = await openKnowledgeIslandPage(page);
    const figure = await readIslandFigure(page, islandPage);

    expect(figure.stage).toBe(expectation.stageId);
    await expect(islandPage.locator(".knowledge-island__dock")).toHaveCount(1);
    await expect(islandPage.locator(".knowledge-island__boat")).toHaveCount(1);
    await expect(islandPage.locator(".knowledge-island__lighthouse")).toHaveCount(0);

    const summary = await readIslandPageSummary(page);

    expect(summary.stampCount).toBe("15 枚");
    await expect(summary.nextText).toContain("再攒 15 枚印章");
  });

  test("E. 30 枚：最高阶段，不再显示「再攒 X 枚」，进度不出现错误值", async ({ page }) => {
    await openHomeWithStampCount(page, 30);

    const expectation = await readIslandExpectation(page, 30);

    // 首页摘要同样不再说“再攒”（先在首页断言，再离开首页）。
    const islandRow = page.getByRole("region", { name: "我的成长" }).getByRole("button", { name: HOME_ISLAND_ROW_LABEL });

    await expect(islandRow).toContainText("现在的小岛已经非常热闹啦");
    await expect(islandRow).not.toContainText("再攒");

    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    expect(expectation.isMaxStage).toBe(true);
    await expect(island).toContainText(sectionCountText(30));
    await expect(island).toContainText(collectionIslandStageText(expectation.stageName, "基础"));
    // 最高阶段不说“满级”。
    await expect(island).not.toContainText("满级");

    const islandPage = await openKnowledgeIslandPage(page);
    const figure = await readIslandFigure(page, islandPage);

    expect(figure.stage).toBe(expectation.stageId);
    await expect(islandPage.locator(".knowledge-island__lighthouse")).toHaveCount(1);

    const summary = await readIslandPageSummary(page);

    await expect(summary.nextText).toContain("现在的小岛已经非常热闹啦");
    expect(summary.nextText).not.toContain("再攒");
    // 没有下一阶段就不画进度条，避免出现 0 / 0 这种错误进度。
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_TRACK)).toHaveCount(0);
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_PAGE_NEXT)).toContainText("现在的小岛已经非常热闹啦");
  });

  test("F. 首页那一行进入知识岛独立页面；收藏册入口卡也进同一页", async ({ page }) => {
    await openHomeWithStampCount(page, 15);

    const expectation = await readIslandExpectation(page, 15);
    const growth = page.getByRole("region", { name: "我的成长" });
    const islandRow = growth.getByRole("button", { name: HOME_ISLAND_ROW_LABEL });

    await expect(islandRow).toBeVisible();
    await expect(islandRow).toContainText(expectation.stageName);

    // 首页三个本章指标一个都没少。
    await expect(growth).toContainText("本章星星");
    await expect(growth).toContainText("航海收藏");
    await expect(growth).toContainText("成就");

    await islandRow.click();

    // 首页那一行直接进知识岛自己的页面，不再绕收藏册弹窗。
    await expect(page).toHaveURL(/#\/knowledge-island$/);
    await expect(page.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION })).toBeVisible();
    await expect(page.getByRole("heading", { name: KNOWLEDGE_ISLAND_PAGE_TITLE })).toBeVisible();
    await expect(page.locator(KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT)).toHaveText("15 枚");

    // 页面上的「返回首页」能回到首页。
    await page.getByRole("button", { name: "返回首页" }).first().click();
    await expect(page).toHaveURL(/#\/$/);

    // 收藏册里的入口卡指向同一个页面。
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(collectionIslandStageText(expectation.stageName, "基础"));
    await island.locator(COLLECTION_ISLAND_ENTRY).click();
    await expect(page).toHaveURL(/#\/knowledge-island$/);
    // 打开页面时收藏册弹窗顺带收掉，不会盖在页面上。
    await expect(collectionBookDialog(page)).toHaveCount(0);
    await expect(page.locator(KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT)).toHaveText("15 枚");
  });

  test("G. 390 窄屏：知识岛页面与收藏册入口卡都不横向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomeWithStampCount(page, 7);

    // 收藏册弹窗：入口卡不溢出，入口按钮与最近领取都还在。
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);
    const dialogOverflow = await readHorizontalOverflow(page);

    expect(dialogOverflow.documentWidth).toBeLessThanOrEqual(dialogOverflow.viewportWidth);
    expect(dialogOverflow.cardRight).toBeLessThanOrEqual(dialogOverflow.viewportWidth);
    await expect(island.locator(COLLECTION_ISLAND_ENTRY)).toBeVisible();
    await expect(island.locator(".collection-book__stamp").first()).toBeVisible();

    // 知识岛独立页面：整页不横向溢出，画面与文字都完整。
    const islandPage = await openKnowledgeIslandPage(page);
    const pageOverflow = await readHorizontalOverflow(page);

    expect(pageOverflow.documentWidth).toBeLessThanOrEqual(pageOverflow.viewportWidth);
    expect(pageOverflow.islandRight).toBeLessThanOrEqual(pageOverflow.viewportWidth);
    // 390 窄屏上画面仍然完整（不是被压成 0 宽）。
    expect(pageOverflow.islandWidth).toBeGreaterThan(300);

    const figure = await readIslandFigure(page, islandPage);

    expect(figure.box.width).toBeGreaterThan(240);
    expect(figure.box.height).toBeGreaterThan(120);

    const clipped = await islandPage.evaluate((section) =>
      [...section.querySelectorAll(".island-page__stat-value, .island-page__stat-label, .island-page__lead")]
        .filter((element) => element.scrollWidth > element.clientWidth + 1).length
    );

    expect(clipped).toBe(0);
  });

  test("H. 1024 首页保持双列，知识岛摘要没有改变布局", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await openHomeWithStampCount(page, 3);

    const layout = await page.evaluate(() => {
      const support = document.querySelector(".home-board__support");
      const columns = window.getComputedStyle(support).gridTemplateColumns.split(" ").filter(Boolean);
      const taskCard = document.querySelector(".daily-tasks").getBoundingClientRect();
      const growthCard = document.querySelector(".growth-summary").getBoundingClientRect();

      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        columnCount: columns.length,
        sameRow: Math.abs(taskCard.y - growthCard.y) < 4
      };
    });

    expect(layout.columnCount).toBe(2);
    expect(layout.sameRow).toBe(true);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  });

  test("I. 切换章节 A → B：知识岛逐字段不变，本章收藏 / 成就跟着换章", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const profileId = randomUUID();

    // 首页那一章 = 档案年级 + 学期（五年级下册）；另一章 = 五年级上册。
    await page.addInitScript(
      ({ settingsKey, profileSnapshot, progressKey, chapterEntries }) => {
        window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
        window.localStorage.setItem(progressKey, JSON.stringify(chapterEntries));
      },
      {
        settingsKey: SETTINGS_STORAGE_KEY,
        profileSnapshot: { displayName: "小探险家", grade: "五年级", semester: "下册" },
        progressKey: CHALLENGE_PROGRESS_STORAGE_KEY,
        chapterEntries: {
          activeChapterId: "chapter-grade-5-lower",
          chapters: {
            // 章节 A：2 件收藏 / 2 个成就。
            "chapter-grade-5-lower": buildChapterEntry({ clearedStageCount: 2, earnedRewardCount: 2 }),
            // 章节 B：5 件收藏 / 3 个成就。
            "chapter-grade-5-upper": buildChapterEntry({ clearedStageCount: 5, earnedRewardCount: 5 })
          }
        }
      }
    );
    await page.context().addCookies([
      { name: PROFILE_COOKIE_NAME, value: profileId, url: "http://127.0.0.1:3101", httpOnly: true, sameSite: "Lax" }
    ]);
    seedStoredStampCount(profileId, 7);
    await page.goto("/");
    await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

    // 知识岛需要孩子能看懂“它是长期的”：块内要有一处作用域提示。
    const expectation = await readIslandExpectation(page, 7);

    const readBook = () =>
      page.evaluate(() => {
        const text = (selector) => document.querySelector(selector)?.innerText.trim() || "";

        return {
          scopeLabel: text(".collection-book__scope"),
          islandCardStage: text(".collection-book__island-stage"),
          islandCardMeta: text(".collection-book__island-meta"),
          islandScopeNote: text(".collection-book__scope-note"),
          recentStampDates: [...document.querySelectorAll(".collection-book__stamp-date")].map((el) => el.innerText.trim()),
          rewardsText: document.querySelectorAll(".collection-book__reward--earned").length,
          achievementsText: document.querySelectorAll(".challenge-achievement-card--unlocked").length
        };
      });

    // 章节 A：首页那一章。
    let dialog = await openCollectionBookFromHome(page);
    const islandA = islandSection(dialog);

    await expect(islandA).toContainText("当前：");
    // 块内作用域提示：这是长期跨章节的成长，不受顶部章节作用域限制。
    await expect(islandA).toContainText(expectation.scopeText);
    const bookA = await readBook();

    expect(bookA.islandCardStage).toContain(expectation.stageName);
    expect(bookA.rewardsText).toBe(2);
    expect(bookA.achievementsText).toBe(2);
    expect(bookA.islandScopeNote).toBe(expectation.scopeText);
    await dialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();

    // 知识岛独立页面在章节 A 时的样子（页面与收藏册入口卡是同一座岛）。
    const islandPageA = await openKnowledgeIslandPage(page);
    const pageA = await readIslandPageSummary(page);

    expect(pageA.figureStage).toBe(expectation.stageId);
    expect(pageA.stampCount).toBe("7 枚");
    await expect(islandPageA.locator(KNOWLEDGE_ISLAND_PAGE_STAR_COUNT)).toBeVisible();

    // 切到章节 B：闯关页 → 世界大地图 → 五年级上册。
    await page.goto("/");
    await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("region", { name: "今天的探险" }).getByRole("button").click();
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();
    await page.getByRole("button", { name: "🗺️ 世界大地图" }).click();
    await expect(page.getByRole("heading", { name: "奇妙世界大地图" })).toBeVisible();
    await page.locator(".challenge-world-card").filter({ hasText: "五年级 · 上册" }).click();
    await expect(page).toHaveURL(/#\/challenge$/);

    await page.getByRole("button", { name: /我的探险收藏册/ }).click();
    dialog = collectionBookDialog(page);
    await expect(dialog).toBeVisible();

    const bookB = await readBook();

    // 知识岛：跨章节，入口卡与章节 A 完全一致。
    expect(bookB.islandCardStage).toBe(bookA.islandCardStage);
    expect(bookB.islandCardMeta).toBe(bookA.islandCardMeta);
    expect(bookB.islandScopeNote).toBe(bookA.islandScopeNote);
    expect(bookB.recentStampDates).toEqual(bookA.recentStampDates);
    expect(bookB.islandCardMeta).toContain("7 枚探险印章");
    await expect(islandSection(dialog)).toContainText(expectation.scopeText);
    await dialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();

    // 切章之后知识岛独立页面同样逐字段不变：阶段、印章、繁荣度、累计星星、下一阶段。
    await openKnowledgeIslandPage(page);
    const pageB = await readIslandPageSummary(page);

    expect(pageB.figureStage).toBe(pageA.figureStage);
    expect(pageB.stageName).toBe(pageA.stageName);
    expect(pageB.prosperityLabel).toBe(pageA.prosperityLabel);
    expect(pageB.stampCount).toBe(pageA.stampCount);
    expect(pageB.starCount).toBe(pageA.starCount);
    expect(pageB.nextText).toBe(pageA.nextText);
    expect(pageB.figureProsperity).toBe(pageA.figureProsperity);
    expect(pageB.nextText).toBe(expectation.nextText);
    // 切的是章节，不是知识岛：换章不会顺手改掉 lifetime prosperity。
    expect(pageB.figureProsperity).toBe(pageA.figureProsperity);

    // 本章两块：随章节变化，顶部作用域也跟着换。
    expect(bookB.scopeLabel).not.toBe(bookA.scopeLabel);
    expect(bookB.scopeLabel).toContain("五年级 · 上册");
    expect(bookA.scopeLabel).toContain("五年级 · 下册");
    expect(bookB.rewardsText).toBe(5);
    expect(bookB.achievementsText).toBe(3);
    expect(bookB.rewardsText).not.toBe(bookA.rewardsText);
    expect(bookB.achievementsText).not.toBe(bookA.achievementsText);
    // 下面两块仍然明确写着“本章”。
    await page.goto("/#/challenge");
    await page.getByRole("button", { name: /我的探险收藏册/ }).click();
    dialog = collectionBookDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("region", { name: "本章航海收藏" })).toBeVisible();
    await expect(dialog.getByRole("region", { name: "本章成就" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 场景 7.5：知识岛独立页面（长期成长的主场景）
//
// 这一组只做三件事：独立页面能深链打开、页面与收藏册/首页是同一份数据、
// 以及宽屏 / 窄屏都不横向溢出。成长规则本身不在这里重测。
// ---------------------------------------------------------------------------

// 带星星的账本：每一关 3 星，清通 n 关 = 3n 颗跨章节累计星星。
async function openHomeWithStampAndStars(page, { stampCount, clearedStageCount = 0 }) {  const profileId = randomUUID();

  await seedHomeStorage(page);
  await page.addInitScript(
    ({ progressKey, chapterEntries }) => {
      window.localStorage.setItem(progressKey, JSON.stringify(chapterEntries));
    },
    {
      progressKey: CHALLENGE_PROGRESS_STORAGE_KEY,
      chapterEntries: {
        activeChapterId: "chapter-grade-3-upper",
        chapters: {
          "chapter-grade-3-upper": buildChapterEntry({ clearedStageCount, earnedRewardCount: clearedStageCount })
        }
      }
    }
  );
  await page.context().addCookies([
    { name: PROFILE_COOKIE_NAME, value: profileId, url: "http://127.0.0.1:3101", httpOnly: true, sameSite: "Lax" }
  ]);
  seedStoredStampCount(profileId, stampCount);
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

  seedStoredStampCount(profileId, stampCount);
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

  return profileId;
}

// ---------------------------------------------------------------------------
// 地形成长（Phase 3）：这一组只测「画得像不像一座会长大的岛」。
//
// 分工必须在这里守住：阶段仍然只由 knowledgeIslandGrowth 决定（阈值 0/3/7/15/30 一律没动），
// knowledgeIslandTerrain 只负责回答「这一阶段的岛身有多大、岸线长什么样」，
// 繁荣度只负责回答「这些已解锁的东西有多丰富」，两者都不许改阶段。
//
// 所以下面的断言全部是"量画面"：量岛身盒子、量街区、量建筑落在哪个街区里，
// 而不是去断言任何业务数字。
// ---------------------------------------------------------------------------

// 真实章节 id：非法 id 会被进度账本整章丢掉，星数就永远是 0，测不出繁荣档。
const REAL_CHAPTER_IDS = Object.freeze([
  "chapter-grade-3-upper",
  "chapter-grade-3-lower",
  "chapter-grade-4-upper",
  "chapter-grade-4-lower",
  "chapter-grade-5-upper",
  "chapter-grade-5-lower"
]);

// 一关 3 星、一章 7 关 = 一章 21 星；按 starCount 需要铺几章真实章节。
async function openHomeWithStampAndStarCount(page, { stampCount, starCount }) {
  const profileId = randomUUID();
  const chapterCount = starCount > 0 ? Math.ceil(starCount / 21) : 0;

  await seedHomeStorage(page);
  await page.addInitScript(
    ({ progressKey, chapterEntries }) => {
      window.localStorage.setItem(progressKey, JSON.stringify(chapterEntries));
    },
    {
      progressKey: CHALLENGE_PROGRESS_STORAGE_KEY,
      chapterEntries: {
        activeChapterId: REAL_CHAPTER_IDS[0],
        chapters: Object.fromEntries(
          REAL_CHAPTER_IDS.slice(0, chapterCount).map((chapterId) => [
            chapterId,
            buildChapterEntry({ clearedStageCount: 7, earnedRewardCount: 7 })
          ])
        )
      }
    }
  );
  await page.context().addCookies([
    { name: PROFILE_COOKIE_NAME, value: profileId, url: "http://127.0.0.1:3101", httpOnly: true, sameSite: "Lax" }
  ]);
  seedStoredStampCount(profileId, stampCount);
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

  return profileId;
}

// 把这一幅画里所有「和地形有关」的量一次性读出来：岛身盒子、预告轮廓、街区、建筑。
function readIslandTerrainState(container) {
  return container.evaluate((section) => {
    const box = (element) => (element ? element.getBoundingClientRect().toJSON() : null);
    const visible = (element) => Boolean(element) && element.getBoundingClientRect().width > 0;
    const figure = section.querySelector('[data-role="knowledge-island-figure"]');
    const terrain = section.querySelector('[data-role="knowledge-island-terrain"]');
    const next = section.querySelector('[data-role="knowledge-island-next-terrain"]');
    const zoneOf = (name) => box(section.querySelector(`[data-role="knowledge-island-zone-${name}"]`));

    return {
      stage: figure?.getAttribute("data-stage") || "",
      prosperity: figure?.getAttribute("data-prosperity") || "",
      terrainStage: terrain?.getAttribute("data-terrain-stage") || "",
      figure: box(figure),
      terrain: box(terrain),
      // 预告：有没有、大小、落在画布的哪个位置。
      next: next
        ? {
            box: next.getBoundingClientRect().toJSON(),
            points: next.querySelector(".knowledge-island__next-outline")?.getAttribute("points") || ""
          }
        : null,
      hasGrassland: visible(section.querySelector(".knowledge-island__grassland")),
      hasHighland: visible(section.querySelector(".knowledge-island__highland")),
      hasBeam: visible(section.querySelector(".knowledge-island__beam")),
      zones: {
        westShore: zoneOf("west-shore"),
        green: zoneOf("green"),
        camp: zoneOf("camp"),
        harbor: zoneOf("harbor"),
        highland: zoneOf("highland")
      },
      // 建筑盒子，用来断言"它确实站在自己的街区里"。
      centers: {
        palm: box(section.querySelector(".knowledge-island__palm")),
        camp: box(section.querySelector(".knowledge-island__camp")),
        dock: box(section.querySelector(".knowledge-island__dock")),
        boat: box(section.querySelector(".knowledge-island__boat")),
        lighthouse: box(section.querySelector(".knowledge-island__lighthouse")),
        beam: box(section.querySelector(".knowledge-island__beam")),
        shell: box(section.querySelector(".knowledge-island__shell")),
        rock: box(section.querySelector(".knowledge-island__rock"))
      }
    };
  });
}

function centerOf(box) {
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function isInside(inner, outer, tolerance = 12) {
  const point = centerOf(inner);

  return (
    point.x >= outer.left - tolerance &&
    point.x <= outer.right + tolerance &&
    point.y >= outer.top - tolerance &&
    point.y <= outer.bottom + tolerance
  );
}

test.describe("知识岛地形随阶段长大", () => {
  // 阈值仍然是 0 / 3 / 7 / 15 / 30，这一组把它们当"取样点"用，不是在重新定义阈值。
  const STAMP_SAMPLES = Object.freeze([0, 3, 7, 15, 30]);
  const STAGE_IDS = Object.freeze(["first-sight", "sprout-coast", "palm-camp", "explorer-dock", "knowledge-lighthouse"]);

  test("0 / 3 / 7 / 15 / 30：岛身面积逐阶段明显递增", async ({ page }) => {
    const samples = [];

    for (const stampCount of STAMP_SAMPLES) {
      await openHomeWithStampCount(page, stampCount);

      const islandPage = await openKnowledgeIslandPage(page);
      const state = await readIslandTerrainState(islandPage);

      expect(state.stage, `${stampCount} 枚的阶段不对`).toBe(STAGE_IDS[STAMP_SAMPLES.indexOf(stampCount)]);
      // 地形盒子带的阶段 id 必须和业务阶段一致：地形不许自己另判一次阶段。
      expect(state.terrainStage).toBe(state.stage);

      samples.push({ stampCount, area: state.terrain.width * state.terrain.height, width: state.terrain.width });
    }

    for (let index = 1; index < samples.length; index += 1) {
      expect(
        samples[index].area,
        `${samples[index].stampCount} 枚的岛没有比 ${samples[index - 1].stampCount} 枚更大`
      ).toBeGreaterThan(samples[index - 1].area);
      expect(samples[index].width).toBeGreaterThan(samples[index - 1].width);
    }

    // 0 枚必须是一块明显的小沙洲：最大阶段至少是它的三倍面积。
    const first = samples[0];
    const last = samples[samples.length - 1];

    expect(last.area / first.area).toBeGreaterThan(3);
    expect(first.width).toBeLessThan(last.width * 0.5);
  });

  test("0 枚：明显的小沙洲，画面上没有任何绿色", async ({ page }) => {
    await openHomeWithStampCount(page, 0);

    const islandPage = await openKnowledgeIslandPage(page);
    const state = await readIslandTerrainState(islandPage);

    // 地形层：绿地和高地都不存在。
    expect(state.hasGrassland).toBe(false);
    expect(state.hasHighland).toBe(false);
    // 岛屿本身的绿色元素也不存在。
    await expect(islandPage.locator(".knowledge-island__sprout")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__grass")).toHaveCount(0);
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_GRASSLAND)).toHaveCount(0);
    // 0 枚也没有任何核心建筑。
    await expect(islandPage.locator(".knowledge-island__palm")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__camp")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__dock")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__lighthouse")).toHaveCount(0);
    // 西侧海岸的贝壳 / 石头从第一阶段就存在，所以是有的（它们不属于后续阶段的建筑）。
    expect(state.centers.shell).not.toBeNull();
    expect(state.centers.rock).not.toBeNull();
  });

  test("星星再多也不会把地形或建筑往上解锁一级", async ({ page }) => {
    const basics = [];

    for (const starCount of [0, 21, 70]) {
      await openHomeWithStampAndStarCount(page, { stampCount: 0, starCount });

      const islandPage = await openKnowledgeIslandPage(page);
      const state = await readIslandTerrainState(islandPage);

      expect(state.stage, `${starCount} 颗星把阶段顶到了后面`).toBe("first-sight");
      expect(state.hasGrassland).toBe(false);
      // 繁荣度确实跟着星数走了（证明种子生效），但地形一动不动。
      basics.push({ starCount, terrain: state.terrain, prosperity: state.prosperity });
    }

    expect(new Set(basics.map((item) => item.prosperity))).toEqual(new Set(["basic", "lush", "flourishing"]));
    // 岛身盒子三档星星下尺寸相同。
    for (const item of basics) {
      expect(Math.round(item.terrain.width)).toBe(Math.round(basics[0].terrain.width));
      expect(Math.round(item.terrain.height)).toBe(Math.round(basics[0].terrain.height));
    }
  });

  test("7 枚同一阶段下，基础 / 丰盛 / 繁荣：岛一样大，但细节明显不同", async ({ page }) => {
    const tiers = [];

    for (const starCount of [0, 21, 70]) {
      await openHomeWithStampAndStarCount(page, { stampCount: 7, starCount });

      const islandPage = await openKnowledgeIslandPage(page);
      const state = await readIslandTerrainState(islandPage);

      expect(state.stage).toBe("palm-camp");
      tiers.push({ starCount, state });
    }

    // 同一阶段 = 同一座岛：地形盒子必须完全一样，繁荣度只改细节。
    for (const tier of tiers) {
      expect(Math.round(tier.state.terrain.width)).toBe(Math.round(tiers[0].state.terrain.width));
      expect(Math.round(tier.state.terrain.height)).toBe(Math.round(tiers[0].state.terrain.height));
    }
    expect(tiers.map((tier) => tier.state.prosperity)).toEqual(["basic", "lush", "flourishing"]);

    // 丰盛比基础多出"被使用过"的东西（旗子 / 木箱 / 索具），细节肉眼可见地变多。
    const detailCounts = [];

    for (const starCount of [0, 21, 70]) {
      await openHomeWithStampAndStarCount(page, { stampCount: 7, starCount });

      const islandPage = await openKnowledgeIslandPage(page);
      detailCounts.push(
        await islandPage.evaluate(
          (section) => [...section.querySelectorAll(".knowledge-island__terrain *")].filter((el) => el.getBoundingClientRect().width > 0).length
        )
      );
    }

    expect(detailCounts[1]).toBeGreaterThan(detailCounts[0]);
    expect(detailCounts[2]).toBeGreaterThan(detailCounts[1]);
  });
});

test.describe("知识岛建筑落在自己的街区里", () => {
  test("30 枚：灯塔 / 码头 / 营地 / 西岸贝壳都在对应街区，灯塔光束锚在灯塔上", async ({ page }) => {
    await openHomeWithStampCount(page, 30);

    const islandPage = await openKnowledgeIslandPage(page);
    const state = await readIslandTerrainState(islandPage);

    expect(state.stage).toBe("knowledge-lighthouse");
    expect(state.hasHighland).toBe(true);
    expect(state.hasBeam).toBe(true);

    // 每一栋建筑都站在自己的街区里。
    expect(isInside(state.centers.palm, state.zones.camp), "椰树不在营地区").toBe(true);
    expect(isInside(state.centers.camp, state.zones.camp), "帐篷不在营地区").toBe(true);
    expect(isInside(state.centers.dock, state.zones.harbor), "码头不在东侧港口").toBe(true);
    expect(isInside(state.centers.lighthouse, state.zones.highland), "灯塔不在高地区").toBe(true);
    expect(isInside(state.centers.shell, state.zones.westShore), "贝壳不在西侧海岸").toBe(true);
    // 小船停在码头外侧的海面上，所以允许落在港口街区的右边缘之外一点。
    expect(isInside(state.centers.boat, state.zones.harbor, 40), "小船离港口太远").toBe(true);

    // 光束必须从灯塔射出去：起点贴在灯塔的右边缘，而不是画布的某个绝对位置。
    const lighthouseRight = state.centers.lighthouse.left + state.centers.lighthouse.width;
    const beamStart = state.centers.beam.left;
    const gap = Math.abs(beamStart - lighthouseRight);

    expect(gap, "灯塔光束没有锚在灯塔上").toBeLessThan(24);
    // 光束是灯塔的子元素（不是各自独立的画布绝对定位）。
    expect(await islandPage.locator(".knowledge-island__lighthouse .knowledge-island__beam").count()).toBe(1);
  });

  test("15 枚还没有灯塔，也没有灯塔光束", async ({ page }) => {
    await openHomeWithStampCount(page, 15);

    const islandPage = await openKnowledgeIslandPage(page);
    const state = await readIslandTerrainState(islandPage);

    expect(state.stage).toBe("explorer-dock");
    expect(state.hasBeam).toBe(false);
    // 高地属于最高阶段的地形，15 枚时还没有。
    expect(state.hasHighland).toBe(false);
    await expect(islandPage.locator(".knowledge-island__lighthouse")).toHaveCount(0);
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_BEAM)).toHaveCount(0);
    // 但码头和小船已经在了，而且都落在港口街区。
    expect(isInside(state.centers.dock, state.zones.harbor), "码头不在东侧港口").toBe(true);
  });
});

test.describe("知识岛下一阶段预告", () => {
  test("0 / 3 / 7 / 15 枚：只预告紧邻的下一阶段，且那一圈一定更大", async ({ page }) => {
    const pairs = [
      { stampCount: 0, current: "first-sight", next: "sprout-coast" },
      { stampCount: 3, current: "sprout-coast", next: "palm-camp" },
      { stampCount: 7, current: "palm-camp", next: "explorer-dock" },
      { stampCount: 15, current: "explorer-dock", next: "knowledge-lighthouse" }
    ];

    for (const pair of pairs) {
      await openHomeWithStampCount(page, pair.stampCount);

      const islandPage = await openKnowledgeIslandPage(page);
      const state = await readIslandTerrainState(islandPage);
      const expectation = await readIslandExpectation(page, pair.stampCount);

      expect(state.stage).toBe(pair.current);
      // 「下一阶段是谁」仍然来自 knowledgeIslandGrowth。
      expect(expectation.nextStageId).toBe(pair.next);
      expect(state.next, `${pair.current} 没有预告`).not.toBeNull();
      // 预告一定比当前岛更大，否则就不成其为「扩张预告」。
      expect(state.next.box.width).toBeGreaterThan(state.terrain.width);
      expect(state.next.box.height).toBeGreaterThan(state.terrain.height);
      // 预告画在画布之内，绝不会跑到画面外面。
      expect(state.next.box.right).toBeLessThanOrEqual(state.figure.right + 1);
      expect(state.next.box.left).toBeGreaterThanOrEqual(state.figure.left - 1);
      // 预告只画岸线。
      expect(state.next.points.length).toBeGreaterThan(0);
      await expect(
        islandPage.locator(`${KNOWLEDGE_ISLAND_NEXT_TERRAIN} .knowledge-island__next-outline`)
      ).toHaveCount(1);
    }
  });

  test("预告里没有任何建筑：只说岛会变大，不说会盖房子", async ({ page }) => {
    await openHomeWithStampCount(page, 0);

    const islandPage = await openKnowledgeIslandPage(page);
    const preview = islandPage.locator(KNOWLEDGE_ISLAND_NEXT_TERRAIN);

    await expect(preview).toHaveCount(1);
    // 预告盒子里只有两条同形的 polygon（填充 + 虚线），没有任何建筑元素。
    expect(await preview.locator("polygon").count()).toBe(2);
    expect(
      await preview
        .locator(".knowledge-island__lighthouse, .knowledge-island__dock, .knowledge-island__palm, .knowledge-island__camp")
        .count()
    ).toBe(0);
  });

  test("30 枚（满级）：不显示预告", async ({ page }) => {
    await openHomeWithStampCount(page, 30);

    const islandPage = await openKnowledgeIslandPage(page);

    await expect(islandPage.locator(KNOWLEDGE_ISLAND_NEXT_TERRAIN)).toHaveCount(0);
  });

  test("减少动态偏好下：预告不呼吸，但轮廓仍然看得见", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHomeWithStampCount(page, 7);

    const islandPage = await openKnowledgeIslandPage(page);
    const preview = islandPage.locator(KNOWLEDGE_ISLAND_NEXT_TERRAIN);

    await expect(preview).toHaveCount(1);
    const motion = await preview.evaluate((element) => ({
      animationName: window.getComputedStyle(element).animationName,
      opacity: Number(window.getComputedStyle(element).opacity)
    }));

    expect(motion.animationName).toBe("none");
    // 静态强度仍然要看得见，不能因为关掉动画就淡成透明。
    expect(motion.opacity).toBeGreaterThan(0.4);
  });
});

test.describe("知识岛世界坐标不漂移", () => {
  test("390 / 820 / 1440：同一座岛等比缩放，不横向溢出，建筑都在画面内", async ({ page }) => {
    await openHomeWithStampAndStarCount(page, { stampCount: 30, starCount: 70 });

    const ratios = [];

    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });

      const islandPage = await openKnowledgeIslandPage(page);
      const state = await readIslandTerrainState(islandPage);
      const layout = await page.evaluate(() => ({
        docWidth: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        islandRight: Math.round(document.querySelector(".knowledge-island").getBoundingClientRect().right)
      }));

      expect(layout.docWidth, `${width} 宽出现横向溢出`).toBeLessThanOrEqual(layout.viewport);
      expect(layout.islandRight, `${width} 宽知识岛卡片超出视口`).toBeLessThanOrEqual(layout.viewport);

      // 岛身盒子完全落在画面盒子里。
      expect(state.terrain.left).toBeGreaterThanOrEqual(state.figure.left - 1);
      expect(state.terrain.right).toBeLessThanOrEqual(state.figure.right + 1);
      expect(state.terrain.top).toBeGreaterThanOrEqual(state.figure.top - 1);
      expect(state.terrain.bottom).toBeLessThanOrEqual(state.figure.bottom + 1);

      // 街区是岛屿自身的相对坐标，所以街区之间、以及建筑与街区的相对关系在各宽度下保持一致。
      ratios.push({
        width,
        terrainToFigure: state.terrain.width / state.figure.width,
        lighthouseToHighland: state.centers.lighthouse.width / state.zones.highland.width,
        campToTerrain: (state.centers.camp.left - state.terrain.left) / state.terrain.width
      });
    }

    for (const ratio of ratios) {
      expect(Math.abs(ratio.terrainToFigure - ratios[0].terrainToFigure), `${ratio.width} 宽岛身比例变了`).toBeLessThan(0.01);
      expect(Math.abs(ratio.lighthouseToHighland - ratios[0].lighthouseToHighland), `${ratio.width} 宽灯塔比例变了`).toBeLessThan(0.02);
      expect(Math.abs(ratio.campToTerrain - ratios[0].campToTerrain), `${ratio.width} 宽营地位置漂了`).toBeLessThan(0.02);
    }
  });
});

test.describe("知识岛独立页面", () => {
  test("深链可以直接打开，刷新后仍然是同一座岛", async ({ page }) => {
    await openHomeWithStampCount(page, 7);

    const islandPage = await openKnowledgeIslandPage(page);

    await expect(islandPage.getByRole("heading", { name: KNOWLEDGE_ISLAND_PAGE_TITLE })).toBeVisible();
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_FIGURE)).toBeVisible();
    const before = await readIslandPageSummary(page);

    await page.reload();
    await page.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION }).waitFor({ state: "visible", timeout: 15_000 });

    expect((await readIslandPageSummary(page)).figureStage).toBe(before.figureStage);
  });

  test("页面把阶段、印章、繁荣度、累计星星、下一枚印章都说清楚", async ({ page }) => {
    // 7 枚印章 + 7 关全通 = 21 颗累计星星 → 繁荣度进入「丰盛」。
    await openHomeWithStampAndStars(page, { stampCount: 7, clearedStageCount: 7 });

    const expectation = await readIslandExpectation(page, 7);
    const islandPage = await openKnowledgeIslandPage(page);
    const summary = await readIslandPageSummary(page);

    expect(summary.stageName).toContain(expectation.stageName);
    expect(summary.stampCount).toBe("7 枚");
    expect(summary.prosperityLabel).toBe("丰盛");
    expect(summary.starCount).toBe("21 颗");
    expect(summary.figureProsperity).toBe("lush");
    expect(summary.nextText).toBe(expectation.nextText);

    // 页面固定的那一句说明也在。
    await expect(islandPage).toContainText("印章让小岛成长，星星让小岛更加繁荣。");
  });

  test("0 枚印章 + 高星：繁荣度到顶也不会提前长出后续建筑", async ({ page }) => {
    // 7 关全通 = 21 颗星（丰盛档），但一枚印章都没有。
    await openHomeWithStampAndStars(page, { stampCount: 0, clearedStageCount: 7 });

    const islandPage = await openKnowledgeIslandPage(page);
    const summary = await readIslandPageSummary(page);

    // 阶段仍然停在第一阶段。
    expect(summary.figureStage).toBe("first-sight");
    expect(summary.stampCount).toBe("0 枚");
    expect(summary.starCount).toBe("21 颗");
    expect(summary.prosperityLabel).toBe("丰盛");

    // 后续阶段的建筑一个都不许出现。
    await expect(islandPage.locator(".knowledge-island__sprout")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__grass")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__palm")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__camp")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__dock")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__boat")).toHaveCount(0);
    await expect(islandPage.locator(".knowledge-island__lighthouse")).toHaveCount(0);
  });

  test("1440 / 820 / 390：岛屿是页面视觉中心，且都不横向溢出", async ({ page }) => {
    await openHomeWithStampAndStars(page, { stampCount: 30, clearedStageCount: 7 });

    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });

      const islandPage = await openKnowledgeIslandPage(page);
      const metrics = await page.evaluate(() => {
        const figure = document.querySelector('[data-role="knowledge-island-figure"]');
        const figureBox = figure.getBoundingClientRect();

        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          figureWidth: Math.round(figureBox.width),
          figureHeight: Math.round(figureBox.height),
          // 岛屿在页面里占多宽：证明它是视觉主体，而不是角落里的一小块。
          figureShare: Math.round((figureBox.width / window.innerWidth) * 100),
          islandRight: Math.round(document.querySelector(".knowledge-island").getBoundingClientRect().right)
        };
      });

      expect(metrics.documentWidth, `${width} 宽出现横向溢出`).toBeLessThanOrEqual(metrics.viewportWidth);
      expect(metrics.islandRight, `${width} 宽知识岛卡片超出视口`).toBeLessThanOrEqual(metrics.viewportWidth);
      expect(metrics.figureHeight, `${width} 宽画面被压扁`).toBeGreaterThan(120);
      // 宽屏上画面必须明显是主体；390 上也要占满大部分宽度。
      expect(metrics.figureShare).toBeGreaterThanOrEqual(width === 390 ? 80 : 70);
      await expect(islandPage.locator(KNOWLEDGE_ISLAND_FIGURE)).toBeVisible();
      await expect(islandPage.locator(".knowledge-island__lighthouse")).toHaveCount(1);
    }
  });
});

// ---------------------------------------------------------------------------
// 场景 8：知识岛阶段变化反馈（Phase 2C-B）
//
// 只有“真实领取成功（alreadyClaimed === false）并且这一枚刚好跨过阶段阈值”才弹一次。
// 起始印章数直接写进 E2E 隔离库，本次 +1 一定走真实的首页领取按钮 + 真实服务端接口，
// 不新增任何测试专用业务 API。
// ---------------------------------------------------------------------------
test.describe("知识岛阶段变化反馈", () => {
  test("普通领取（没跨阶段）不弹知识岛反馈，只保留宝箱原有的获得印章提示", async ({ page }) => {
    await openHomeReadyToClaim(page, 1);

    await claimTodayChestFromHome(page);

    // Phase 2B.5 的宝箱反馈必须原样保留。
    await expect(page.getByRole("region", { name: "今日宝箱" })).toContainText("获得 1 枚探险印章");
    // 1 → 2 没到任何阈值：不弹。
    await expect(celebrationDialog(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: CELEBRATION_TITLE })).toHaveCount(0);

    // 印章数是真的 +1，跟收藏册一致。
    const growth = page.getByRole("region", { name: "我的成长" });
    const expectation = await readIslandExpectation(page, 2);

    await expect(growth).toContainText("已经攒了 2 枚探险印章");
    await expect(growth).toContainText(expectation.stageName);
  });

  // 四个阈值：2→3、6→7、14→15、29→30。参数化，避免复制四份几乎一样的用例。
  const THRESHOLD_CASES = Object.freeze([
    { from: 2, to: 3, stageId: "sprout-coast", stageName: "萌芽海岸", newFeatures: ["嫩芽", "小草丛"], nextText: "再攒 4 枚印章" },
    { from: 6, to: 7, stageId: "palm-camp", stageName: "椰林营地", newFeatures: ["椰子树", "小帐篷"], nextText: "再攒 8 枚印章" },
    { from: 14, to: 15, stageId: "explorer-dock", stageName: "探险码头", newFeatures: ["小码头", "泊岸小船"], nextText: "再攒 15 枚印章" },
    { from: 29, to: 30, stageId: "knowledge-lighthouse", stageName: "知识灯塔", newFeatures: ["灯塔", "灯光"], nextText: "" }
  ]);

  for (const thresholdCase of THRESHOLD_CASES) {
    test(`真实领取跨过阈值 ${thresholdCase.from} → ${thresholdCase.to}：弹出「${thresholdCase.stageName}」反馈`, async ({ page }) => {
      await openHomeReadyToClaim(page, thresholdCase.from);

      const expectation = await readIslandExpectation(page, thresholdCase.to);

      await claimTodayChestFromHome(page);

      const dialog = celebrationDialog(page);

      await expect(dialog).toBeVisible();
      // 标题 / 阶段名 / 说明文案都对。
      await expect(page.getByRole("heading", { name: CELEBRATION_TITLE })).toBeVisible();
      await expect(dialog).toContainText(thresholdCase.stageName);
      // 最高阶段用儿童化的完成表达，其余阶段说明“刚刚这一枚带来的变化”。
      await expect(dialog).toContainText(
        expectation.isMaxStage ? "现在的小岛已经非常热闹啦" : "让知识岛有了新的变化"
      );
      expect(expectation.stageName).toBe(thresholdCase.stageName);
      // 不出现等级 / XP 这类系统词。
      for (const forbidden of ["满级", "等级", "Level", "XP", "经验值", "升级"]) {
        await expect(dialog).not.toContainText(forbidden);
      }

      // 新出现的元素与阶段配置的差集一致。
      expect(await readCelebrationFeatureNames(page)).toEqual(thresholdCase.newFeatures);

      // 弹层里那座岛就是新阶段：data-stage / 阶段名 / 印章数都一致。
      const island = dialog.locator(".knowledge-island");

      await expect(island).toHaveAttribute("data-stage", thresholdCase.stageId);
      await expect(island).toContainText(`当前：${thresholdCase.stageName}`);
      await expect(island).toContainText(`已经攒了 ${thresholdCase.to} 枚探险印章`);
      await expect(island.locator(KNOWLEDGE_ISLAND_FIGURE)).toBeVisible();

      // 最高阶段：不再说“再攒 X 枚”，进度满。
      if (expectation.isMaxStage) {
        await expect(island).not.toContainText("再攒");
        await expect(island).toContainText("现在的小岛已经非常热闹啦");
        await expect(island.locator(KNOWLEDGE_ISLAND_TRACK)).toHaveCount(0);
      } else {
        await expect(island).toContainText(thresholdCase.nextText);
      }

      // 关闭后宝箱原有的获得印章提示仍在。
      await dialog.getByRole("button", { name: "知道啦" }).click();
      await expect(celebrationDialog(page)).toHaveCount(0);
      await expect(page.getByRole("region", { name: "今日宝箱" })).toContainText("获得 1 枚探险印章");
    });
  }

  test("「去看看我的知识岛」：先关反馈层，再打开知识岛独立页面，显示同一个新阶段", async ({ page }) => {
    await openHomeReadyToClaim(page, 2);

    const expectation = await readIslandExpectation(page, 3);

    await claimTodayChestFromHome(page);
    await expect(celebrationDialog(page)).toBeVisible();

    await celebrationDialog(page).getByRole("button", { name: "去看看我的知识岛" }).click();

    // 反馈层关掉，直接进知识岛页面（不再绕收藏册弹窗）。
    await expect(celebrationDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/#\/knowledge-island$/);
    // 同一时刻只有一个 overlay。
    await expect(page.locator(".island-celebration-overlay")).toHaveCount(0);

    const islandPage = page.getByRole("region", { name: KNOWLEDGE_ISLAND_REGION });

    await expect(islandPage).toContainText(`当前：${expectation.stageName}`);
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT)).toHaveText("3 枚");
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_FIGURE)).toHaveAttribute("data-stage", "sprout-coast");
  });

  test("点遮罩可以关闭反馈层，不会误开收藏册", async ({ page }) => {
    await openHomeReadyToClaim(page, 2);

    await claimTodayChestFromHome(page);
    await expect(celebrationDialog(page)).toBeVisible();

    // 点遮罩自身（不是卡片内部）。
    await page.locator(".island-celebration-overlay").click({ position: { x: 8, y: 8 } });

    await expect(celebrationDialog(page)).toHaveCount(0);
    await expect(collectionBookDialog(page)).toHaveCount(0);
  });

  test("刷新不重放：关掉反馈后 reload，不再出现庆祝，但知识岛仍是新阶段", async ({ page }) => {
    await openHomeReadyToClaim(page, 2);

    const expectation = await readIslandExpectation(page, 3);

    await claimTodayChestFromHome(page);
    await expect(celebrationDialog(page)).toBeVisible();
    await celebrationDialog(page).getByRole("button", { name: "知道啦" }).click();
    await expect(celebrationDialog(page)).toHaveCount(0);

    await page.reload();
    await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

    // 同步来的 3 枚印章不会补一次历史庆祝。
    await expect(celebrationDialog(page)).toHaveCount(0);
    await expect(page.getByRole("region", { name: "今日宝箱" })).toContainText("今日已领取");

    // 收藏册入口卡如实显示 3 枚 / 新阶段。
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(collectionIslandStageText(expectation.stageName, "基础"));
    await expect(island).toContainText(sectionCountText(3));
    await dialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();

    // 知识岛独立页面同样是新阶段。
    const islandPage = await openKnowledgeIslandPage(page);

    await expect(islandPage).toContainText(`当前：${expectation.stageName}`);
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT)).toHaveText("3 枚");
  });

  test("服务端 alreadyClaimed：今天已领过时不产生任何反馈，印章数也不会被顶高", async ({ page }) => {
    // 账本里已经有今天这条 claim，总数 3（恰好是一个阈值）。
    // fixture 要么正好 3 条 dailyClaims，要么服务端会把它规范化成 4 枚——这里是防回归的关键。
    const fixture = expectConsistentGrowthFixture(buildGrowthProgressJson(3, { includeTodayClaim: true }), 3);

    expect(fixture.dateKeys).toHaveLength(3);
    expect(fixture.dateKeys).toContain(getTodayDateKey());

    await openHomeAlreadyClaimedToday(page, 3);

    const growth = page.getByRole("region", { name: "我的成长" });

    // 页面启动同步到 3 枚（不是 4 枚），不庆祝。
    await expect(celebrationDialog(page)).toHaveCount(0);
    await expect(page.getByRole("region", { name: "今日宝箱" })).toContainText("今日已领取");
    await expect(page.getByRole("button", { name: CLAIM_BUTTON })).toHaveCount(0);
    await expect(growth).toContainText("已经攒了 3 枚探险印章");
    await expect(growth).not.toContainText("已经攒了 4 枚探险印章");

    // 再同步 / 刷新一次：仍然是 3 枚，也不庆祝。
    await page.reload();
    await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });
    await expect(celebrationDialog(page)).toHaveCount(0);
    await expect(page.getByRole("region", { name: "我的成长" })).toContainText("已经攒了 3 枚探险印章");
    await expect(page.getByRole("region", { name: "我的成长" })).not.toContainText("已经攒了 4 枚探险印章");

    // 收藏册入口卡与知识岛页面同样如实显示 3 枚 / 萌芽海岸（不是 4 枚）。
    const expectation = await readIslandExpectation(page, 3);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(collectionIslandStageText(expectation.stageName, "基础"));
    await expect(island).toContainText(collectionIslandMetaText(3, 0));
    await expect(island).not.toContainText("4 枚探险印章");
    await dialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();

    const islandPage = await openKnowledgeIslandPage(page);

    await expect(islandPage.locator(KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT)).toHaveText("3 枚");
    await expect(islandPage.locator(KNOWLEDGE_ISLAND_FIGURE)).toHaveAttribute("data-stage", "sprout-coast");
  });

  test("390 窄屏：反馈层不横向溢出、按钮完整可点、岛屿完整", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomeReadyToClaim(page, 6);

    await claimTodayChestFromHome(page);

    const dialog = celebrationDialog(page);

    await expect(dialog).toBeVisible();

    const metrics = await page.evaluate(() => {
      const overlay = document.querySelector(".island-celebration-overlay");
      const card = document.querySelector(".island-celebration");
      const island = document.querySelector(".knowledge-island");
      const figure = document.querySelector(".knowledge-island__figure");
      const primary = document.querySelector(".island-celebration__primary");
      const closeButton = document.querySelector(".island-celebration__close");
      const box = (element) => (element ? element.getBoundingClientRect().toJSON() : null);

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        overlay: box(overlay),
        card: box(card),
        islandWidth: island ? Math.round(island.getBoundingClientRect().width) : 0,
        figure: box(figure),
        primary: box(primary),
        closeButton: box(closeButton)
      };
    });

    // 整页不横向溢出，弹层也不超出屏幕。
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.card.left).toBeGreaterThanOrEqual(0);
    expect(metrics.card.right).toBeLessThanOrEqual(metrics.viewportWidth);
    // 内容较高时靠自身纵向滚动兜住，不超出视口。
    expect(metrics.card.height).toBeLessThanOrEqual(metrics.viewportHeight);

    // 岛屿视觉完整、主按钮与关闭按钮都完整可点。
    expect(metrics.islandWidth).toBeGreaterThan(120);
    expect(metrics.figure.width).toBeGreaterThan(120);
    expect(metrics.primary.left).toBeGreaterThanOrEqual(0);
    expect(metrics.primary.right).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.closeButton.right).toBeLessThanOrEqual(metrics.viewportWidth);

    await expect(dialog).toContainText("椰林营地");
    expect(await readCelebrationFeatureNames(page)).toEqual(["椰子树", "小帐篷"]);

    await dialog.getByRole("button", { name: "去看看我的知识岛" }).click();
    // 反馈层里的这个入口现在直接进知识岛独立页面。
    await expect(page).toHaveURL(/#\/knowledge-island$/);
    await expect(page.locator(KNOWLEDGE_ISLAND_FIGURE)).toBeVisible();

    const islandPageWidth = await page.evaluate(() => document.documentElement.scrollWidth);

    expect(islandPageWidth).toBeLessThanOrEqual(390);
  });
});

// ---------------------------------------------------------------------------
// 测试数据自洽性：种子账本必须“声称几枚就有几条 claim”。
//
// 生产代码 normalizeGrowthProgress() 取 max(totalDailyChests, dailyClaims.length)，
// 所以 fixture 一旦多塞 claim，服务端返回的印章数就会比测试声称的高 1，
// 阈值边界用例会静默失效。这里把 fixture 本身钉住。
// ---------------------------------------------------------------------------
test.describe("知识岛测试账本 fixture 自洽性", () => {
  test("历史 claim 条数不超过声称的印章数，且不重复今天", () => {
    const todayDateKey = getTodayDateKey();

    for (const stampCount of [0, 1, 2, 3, 4, 7, 14, 15, 29, 30]) {
      const { dateKeys } = expectConsistentGrowthFixture(buildGrowthProgressJson(stampCount), stampCount);

      // 历史占位日期不允许出现今天（否则和“今天已领取”那条会互相覆盖）。
      expect(dateKeys).not.toContain(todayDateKey);
      // 历史条数 = min(stampCount, 5)，不会多也不会少。
      expect(dateKeys).toHaveLength(Math.min(stampCount, MAX_SEEDED_DAILY_CLAIMS));
    }
  });

  test("includeTodayClaim 时今天那条计入总数：3 枚 = 2 条历史 + 今天", () => {
    const todayDateKey = getTodayDateKey();

    // 0 枚 + includeTodayClaim：不凭空造“今天已领取”。
    const zero = expectConsistentGrowthFixture(buildGrowthProgressJson(0, { includeTodayClaim: true }), 0);

    expect(zero.dateKeys).toHaveLength(0);
    expect(zero.dateKeys).not.toContain(todayDateKey);

    // 1 枚 + includeTodayClaim：只有今天这一条。
    const one = expectConsistentGrowthFixture(buildGrowthProgressJson(1, { includeTodayClaim: true }), 1);

    expect(one.dateKeys).toHaveLength(1);
    expect(one.dateKeys).toEqual([todayDateKey]);
    expect(one.parsed.dailyClaims[todayDateKey]).toBeTruthy();

    // 3 枚 + includeTodayClaim：2 条历史 + 今天 = 3（修复前这里是 3 + 1 = 4）。
    const three = expectConsistentGrowthFixture(buildGrowthProgressJson(3, { includeTodayClaim: true }), 3);

    expect(three.dateKeys).toHaveLength(3);
    expect(three.dateKeys).toContain(todayDateKey);
    expect(three.dateKeys.filter((dateKey) => dateKey !== todayDateKey)).toHaveLength(2);

    // 7 枚 + includeTodayClaim：总数上限 5 条，其中要留出今天这一条。
    const seven = expectConsistentGrowthFixture(buildGrowthProgressJson(7, { includeTodayClaim: true }), 7);

    expect(seven.dateKeys).toHaveLength(MAX_SEEDED_DAILY_CLAIMS);
    expect(seven.dateKeys).toContain(todayDateKey);
    expect(seven.dateKeys.filter((dateKey) => dateKey !== todayDateKey)).toHaveLength(MAX_SEEDED_DAILY_CLAIMS - 1);
  });

  test("历史占位日期明确排除今天：即使今天正好是固定日期也不会少一条", () => {
    // 直接注入一个“和固定历史日期撞车”的今天，证明排除逻辑真的生效，
    // 而不是依赖“运行日期大概率不是 1~5 号”。
    const collidingToday = "2026-09-02";

    expect(listHistoricalClaimDateKeys(5, collidingToday)).not.toContain(collidingToday);
    expect(listHistoricalClaimDateKeys(5, collidingToday)).toEqual([
      "2026-09-01",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06"
    ]);

    // 撞车时条数仍然够：跳过 9-02 之后继续往后取，不会退回 4 条。
    expect(listHistoricalClaimDateKeys(4, collidingToday)).toHaveLength(4);
    expect(listHistoricalClaimDateKeys(4, collidingToday)).not.toContain(collidingToday);
  });

  test("三个真实用到的起始票数都自洽（不含今天 / 含今天）", () => {
    // 阶段反馈用例用到的起始印章数：2 / 6 / 14 / 29；alreadyClaimed 用 3。
    for (const stampCount of [2, 3, 6, 14, 29]) {
      const withoutToday = expectConsistentGrowthFixture(buildGrowthProgressJson(stampCount), stampCount);
      const withToday = expectConsistentGrowthFixture(
        buildGrowthProgressJson(stampCount, { includeTodayClaim: true }),
        stampCount
      );

      expect(withoutToday.dateKeys.length).toBeLessThanOrEqual(stampCount);
      expect(withToday.dateKeys).toHaveLength(Math.min(stampCount, MAX_SEEDED_DAILY_CLAIMS));
      expect(withToday.dateKeys).toContain(getTodayDateKey());
    }
  });
});
