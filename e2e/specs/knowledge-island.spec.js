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
const STAGE_IDS = Object.freeze(["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"]);

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

// 真实账本形状：totalDailyChests 就是累计印章数，dailyClaims 保留最近几天。
function buildGrowthProgressJson(stampCount) {
  const dailyClaims = {};
  const claimDays = Math.min(stampCount, 5);

  for (let index = 0; index < claimDays; index += 1) {
    const day = `${index + 1}`.padStart(2, "0");

    dailyClaims[`2026-09-${day}`] = { claimedAt: `2026-09-${day}T08:00:00.000Z` };
  }

  return JSON.stringify({
    version: 1,
    totalDailyChests: stampCount,
    dailyClaims
  });
}

// 只写 E2E 隔离库；e2e/e2e-environment.js 已经保证这个路径不会是真库。
function seedStoredStampCount(profileId, stampCount) {
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
    ).run(profileId, buildGrowthProgressJson(stampCount), new Date().toISOString());
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
