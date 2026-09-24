const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { test, expect } = require("@playwright/test");
const { E2E_DB_PATH } = require("../e2e-environment");
const {
  HOME_ISLAND_ROW_LABEL,
  KNOWLEDGE_ISLAND_FIGURE,
  KNOWLEDGE_ISLAND_FILL,
  KNOWLEDGE_ISLAND_REGION,
  KNOWLEDGE_ISLAND_TRACK,
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
const READY_BUTTON = /宝箱可以打开啦/;
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

// 真实领取路径：点首页「宝箱可以打开啦」（若需要先滚进视野）→ 点「领取今日宝箱」。
async function claimTodayChestFromHome(page) {
  const readyButton = page.getByRole("button", { name: READY_BUTTON });

  if (await readyButton.count()) {
    await readyButton.click();
  }

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

async function readIslandFigure(page, dialog) {
  return islandSection(dialog).locator(KNOWLEDGE_ISLAND_FIGURE).evaluate((figure) => ({
    // evaluate() 只回传序列化后的数据，所以显式读属性，不依赖 dataset 对象。
    stage: figure.getAttribute("data-stage"),
    box: figure.getBoundingClientRect().toJSON(),
    visibleChildren: [...figure.querySelectorAll("*")].filter((child) => child.getBoundingClientRect().width > 0).length
  }));
}

// 390 窄屏也不许出现横向溢出：整页、弹窗、知识岛卡片三层都量一遍。
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
  test("A. 0 枚：收藏册有「我的知识岛」，第一阶段正确，0 枚印章也不是空白", async ({ page }) => {
    await openHomeWithStampCount(page, 0);

    const expectation = await readIslandExpectation(page, 0);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toBeVisible();
    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText(sectionCountText(0));
    await expect(island).toContainText(islandStampText(0));
    // 下一阶段提示必须在。
    await expect(island).toContainText(expectation.nextText);
    await expect(expectation.nextText).toContain("再攒 3 枚");

    // 岛不是空白：画面真的画出来了，而且已经有岛上元素。
    const figure = await readIslandFigure(page, dialog);

    expect(figure.stage).toBe(expectation.stageId);
    expect(figure.box.width).toBeGreaterThan(120);
    expect(figure.box.height).toBeGreaterThan(40);
    expect(figure.visibleChildren).toBeGreaterThan(0);

    // 0 枚时进度条在起点，没有充值出来的假进度。
    const track = island.locator(KNOWLEDGE_ISLAND_TRACK);

    await expect(track).toHaveAttribute("aria-valuenow", "0");
    await expect(track).toHaveAttribute("aria-valuemax", "3");
    await expect(island.locator(KNOWLEDGE_ISLAND_FILL)).toHaveCSS("width", "0px");

    // 还没有印章：不显示任何领取日期，但仍然给出儿童化的空状态说明。
    await expect(island.locator(".collection-book__stamp")).toHaveCount(0);
    await expect(island).toContainText("还没有探险印章");
    // 第一阶段是一座朴素的小岛：后面的阶段元素都还没出现。
    await expect(island.locator(".knowledge-island__sprout")).toHaveCount(0);
    await expect(island.locator(".knowledge-island__palm")).toHaveCount(0);
    await expect(island.locator(".knowledge-island__dock")).toHaveCount(0);
    await expect(island.locator(".knowledge-island__lighthouse")).toHaveCount(0);
  });

  test("B. 3 枚：阶段切换，对应新视觉元素出现", async ({ page }) => {
    await openHomeWithStampCount(page, 3);

    const firstStageExpectation = await readIslandExpectation(page, 0);
    const expectation = await readIslandExpectation(page, 3);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    // 3 枚已经不在第一阶段了。
    expect(expectation.stageId).not.toBe(firstStageExpectation.stageId);
    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText(sectionCountText(3));
    // 这一阶段刚重新开始：0 / 4。
    await expect(island).toContainText(expectation.progressText);
    await expect(island).toContainText("再攒 4 枚印章");

    const figure = await readIslandFigure(page, dialog);

    expect(figure.stage).toBe(expectation.stageId);
    // 新阶段才有嫩芽和小草丛：0 枚时没有，3 枚时有。
    await expect(island.locator(".knowledge-island__sprout")).toHaveCount(1);
    await expect(island.locator(".knowledge-island__grass")).toHaveCount(1);
    await expect(island.locator(".knowledge-island__palm")).toHaveCount(0);
  });

  test("C. 7 枚：进入下一阶段，首页摘要与收藏册阶段一致", async ({ page }) => {
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

    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText(sectionCountText(7));

    const figure = await readIslandFigure(page, dialog);

    expect(figure.stage).toBe(expectation.stageId);
    await expect(island.locator(".knowledge-island__palm")).toHaveCount(1);
    await expect(island.locator(".knowledge-island__dock")).toHaveCount(0);
  });

  test("D. 15 枚：进入探险码头，出现小码头与小船", async ({ page }) => {
    await openHomeWithStampCount(page, 15);

    const expectation = await readIslandExpectation(page, 15);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText(sectionCountText(15));
    await expect(island).toContainText("再攒 15 枚印章");

    const figure = await readIslandFigure(page, dialog);

    expect(figure.stage).toBe(expectation.stageId);
    await expect(island.locator(".knowledge-island__dock")).toHaveCount(1);
    await expect(island.locator(".knowledge-island__boat")).toHaveCount(1);
    await expect(island.locator(".knowledge-island__lighthouse")).toHaveCount(0);
  });

  test("E. 30 枚：最高阶段，不再显示「再攒 X 枚」，进度不出现错误值", async ({ page }) => {
    await openHomeWithStampCount(page, 30);

    const expectation = await readIslandExpectation(page, 30);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    expect(expectation.isMaxStage).toBe(true);
    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText(sectionCountText(30));
    await expect(island).toContainText("现在的小岛已经非常热闹啦");
    await expect(island).not.toContainText("再攒");
    // 最高阶段不说“满级”。
    await expect(island).not.toContainText("满级");
    // 没有下一阶段就不画进度条，避免出现 0 / 0 这种错误进度。
    await expect(island.locator(KNOWLEDGE_ISLAND_TRACK)).toHaveCount(0);

    const figure = await readIslandFigure(page, dialog);

    expect(figure.stage).toBe(expectation.stageId);
    await expect(island.locator(".knowledge-island__lighthouse")).toHaveCount(1);

    // 首页摘要同样不再说“再攒”。
    const islandRow = page.getByRole("region", { name: "我的成长" }).getByRole("button", { name: HOME_ISLAND_ROW_LABEL });

    await expect(islandRow).toContainText("现在的小岛已经非常热闹啦");
    await expect(islandRow).not.toContainText("再攒");
  });

  test("F. 首页入口打开现有收藏册，看到同一个阶段；不新增 route", async ({ page }) => {
    await openHomeWithStampCount(page, 15);

    const expectation = await readIslandExpectation(page, 15);
    const growth = page.getByRole("region", { name: "我的成长" });
    const islandRow = growth.getByRole("button", { name: HOME_ISLAND_ROW_LABEL });

    await expect(islandRow).toBeVisible();
    await expect(islandRow).toContainText(expectation.stageName);
    await islandRow.click();

    // 打开的仍然是原来的收藏册弹窗，路由不变、没有新的知识岛页面。
    const dialog = collectionBookDialog(page);

    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/#\/$/);
    await expect(islandSection(dialog)).toContainText(`当前：${expectation.stageName}`);

    // 首页三个本章指标一个都没少。
    await expect(growth).toContainText("本章星星");
    await expect(growth).toContainText("航海收藏");
    await expect(growth).toContainText("成就");
  });

  test("G. 390 窄屏：知识岛卡片不横向溢出，进度条完整，最近领取可读", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomeWithStampCount(page, 7);

    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);
    const overflow = await readHorizontalOverflow(page);

    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);
    expect(overflow.cardRight).toBeLessThanOrEqual(overflow.viewportWidth);
    expect(overflow.islandRight).toBeLessThanOrEqual(overflow.viewportWidth);

    // 岛屿画面完整（不是被压成 0 宽），进度条完整（宽度不是 0）。
    const figure = await readIslandFigure(page, dialog);

    expect(figure.box.width).toBeGreaterThan(120);
    await expect(island.locator(KNOWLEDGE_ISLAND_TRACK)).toBeVisible();

    const trackWidth = await island
      .locator(KNOWLEDGE_ISLAND_TRACK)
      .evaluate((track) => Math.round(track.getBoundingClientRect().width));

    expect(trackWidth).toBeGreaterThan(60);

    // 阶段文字 / 下一变化 / 最近领取都还在，而且没有被裁掉。
    await expect(island).toContainText("当前：");
    await expect(island).toContainText("再攒");
    await expect(island.locator(".collection-book__stamp").first()).toBeVisible();

    const clipped = await island.evaluate((section) =>
      [...section.querySelectorAll(".knowledge-island__stage-name, .knowledge-island__stamps, .knowledge-island__next")]
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
          islandStage: text(".knowledge-island__stage-name"),
          islandStampText: text(".knowledge-island__stamps"),
          islandNextText: text(".knowledge-island__next"),
          islandProgressText: text(".knowledge-island__progress-text"),
          islandFigureStage: document.querySelector(".knowledge-island__figure")?.getAttribute("data-stage") || "",
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

    expect(bookA.islandFigureStage).toBe(expectation.stageId);
    expect(bookA.rewardsText).toBe(2);
    expect(bookA.achievementsText).toBe(2);
    expect(bookA.islandScopeNote).toBe(expectation.scopeText);
    await dialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();

    // 切到章节 B：闯关页 → 世界大地图 → 五年级上册。
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

    // 知识岛：跨章节，逐字段与章节 A 完全一致。
    expect(bookB.islandStage).toBe(bookA.islandStage);
    expect(bookB.islandStampText).toBe(bookA.islandStampText);
    expect(bookB.islandNextText).toBe(bookA.islandNextText);
    expect(bookB.islandProgressText).toBe(bookA.islandProgressText);
    expect(bookB.islandFigureStage).toBe(bookA.islandFigureStage);
    expect(bookB.islandScopeNote).toBe(bookA.islandScopeNote);
    expect(bookB.recentStampDates).toEqual(bookA.recentStampDates);
    expect(bookB.islandStampText).toBe(expectation.stampText);
    expect(bookB.islandNextText).toBe(expectation.nextText);
    await expect(islandSection(dialog)).toContainText(expectation.scopeText);

    // 本章两块：随章节变化，顶部作用域也跟着换。
    expect(bookB.scopeLabel).not.toBe(bookA.scopeLabel);
    expect(bookB.scopeLabel).toContain("五年级 · 上册");
    expect(bookA.scopeLabel).toContain("五年级 · 下册");
    expect(bookB.rewardsText).toBe(5);
    expect(bookB.achievementsText).toBe(3);
    expect(bookB.rewardsText).not.toBe(bookA.rewardsText);
    expect(bookB.achievementsText).not.toBe(bookA.achievementsText);
    // 下面两块仍然明确写着“本章”。
    await expect(dialog.getByRole("region", { name: "本章航海收藏" })).toBeVisible();
    await expect(dialog.getByRole("region", { name: "本章成就" })).toBeVisible();
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

  test("「去看看我的知识岛」：先关反馈层，再打开现有收藏册，显示同一个新阶段", async ({ page }) => {
    await openHomeReadyToClaim(page, 2);

    const expectation = await readIslandExpectation(page, 3);

    await claimTodayChestFromHome(page);
    await expect(celebrationDialog(page)).toBeVisible();

    await celebrationDialog(page).getByRole("button", { name: "去看看我的知识岛" }).click();

    // 反馈层关掉，收藏册打开，仍然是首页 route（没有新页面 / 新 route）。
    await expect(celebrationDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/#\/$/);
    const dialog = collectionBookDialog(page);

    await expect(dialog).toBeVisible();
    // 同一时刻只有一个 overlay。
    await expect(page.locator(".island-celebration-overlay")).toHaveCount(0);

    const island = islandSection(dialog);

    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText(sectionCountText(3));
    await expect(island.locator(KNOWLEDGE_ISLAND_FIGURE)).toHaveAttribute("data-stage", "sprout-coast");
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

  test("刷新不重放：关掉反馈后 reload，不再出现庆祝，但收藏册仍是新阶段", async ({ page }) => {
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

    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText(sectionCountText(3));
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

    // 收藏册同样如实显示 3 枚 / 萌芽海岸（不是 4 枚）。
    const expectation = await readIslandExpectation(page, 3);
    const dialog = await openCollectionBookFromHome(page);
    const island = islandSection(dialog);

    await expect(island).toContainText(`当前：${expectation.stageName}`);
    await expect(island).toContainText("已经攒了 3 枚探险印章");
    await expect(island).not.toContainText("已经攒了 4 枚探险印章");
    await expect(island.locator(KNOWLEDGE_ISLAND_FIGURE)).toHaveAttribute("data-stage", "sprout-coast");
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
    await expect(collectionBookDialog(page)).toBeVisible();

    const collectionWidth = await page.evaluate(() => document.documentElement.scrollWidth);

    expect(collectionWidth).toBeLessThanOrEqual(390);
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
