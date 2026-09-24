const { test, expect } = require("@playwright/test");

// 场景 6：首页奖励闭环优化（Phase 2B.5）。
//
// 覆盖体验审计的 5 条 P1 在浏览器里的真实行为：
//   1. 3/3 时「宝箱可以打开啦」可点，点一下把宝箱滚进视野（不自动领取）
//   2. 领取后 ready 提示消失
//   3. 领取成功的一次性奖励提示可以点开收藏册（不重复领取）
//   4. 我的成长印章摘要整行可点，打开同一个收藏册
//   5. 欢迎区不再出现与「今天的探险」重复的主线建议
//   6. 1024×800 保持双列；390 单列且 ready 提示可正常点击
//
// 横向溢出：整页在 390 / 720 / 1024 / 1440 都必须 scrollWidth <= innerWidth，
// 这里不再给任何组件豁免（装饰气泡的出血已在 .page-shell 上裁掉，
// 21 颗星在窄屏自然换行而不是被卡片裁掉）。

const CHALLENGE_KEY = "wonder-trivia-island.challenge.progress";
const TASKS_KEY = "wonder-trivia-island.home.daily-tasks";
const STUDY_BOOK_KEY = "wonder-trivia-island.study.record-book";
const LAST_LESSON_KEY = "wonder-trivia-island.study.last-lesson-id";
const STAGE_IDS = Object.freeze(["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"]);
const READY_BUTTON = /宝箱可以打开啦/;
const CLAIM_BUTTON = "领取今日宝箱";
const COLLECTION_ENTRY = /放进收藏册/;
const COLLECTION_DIALOG = "我的探险收藏册";

function nowIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

function todayDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

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

function buildProgress({ clearedStageCount = 0, earnedRewardCount = 0, chapterComplete = false } = {}) {
  return {
    activeChapterId: "chapter-grade-3-upper",
    chapters: {
      "chapter-grade-3-upper": buildChapterEntry({
        clearedStageCount: chapterComplete ? 7 : clearedStageCount,
        earnedRewardCount: chapterComplete ? 7 : earnedRewardCount
      })
    }
  };
}

function buildTasks(completedCount) {
  return {
    version: 1,
    dateKey: todayDateKey(),
    tasks: {
      stagesCleared: completedCount >= 1 ? 1 : 0,
      reviewedQuestionIds: completedCount >= 2 ? ["101", "102", "103"] : [],
      completedLessonIds: completedCount >= 3 ? ["lesson-1"] : []
    },
    updatedAt: new Date().toISOString()
  };
}

// 一道“今天到期”的错题：让首页建议落到 review（比继续主线更值得先处理）。
function buildDueWrongBook() {
  return {
    questionRecords: {
      "101": {
        questionId: 101,
        snapshot: {
          id: 101,
          subject: "数学",
          grade: "三年级",
          semester: "上册",
          knowledgeTag: "表内乘法",
          type: "单项选择",
          content: "6 × 7 等于多少？",
          difficulty: "1",
          options: [
            { key: "A", text: "42" },
            { key: "B", text: "48" }
          ]
        },
        correctAnswer: "A",
        explanation: "六七四十二。",
        attempts: 1,
        correctCount: 0,
        wrongCount: 1,
        timeoutCount: 0,
        reviewCorrectStreak: 0,
        lastResult: "wrong",
        lastSelectedOption: "B",
        lastAnsweredAt: nowIso(-2),
        firstWrongAt: nowIso(-2),
        lastWrongAt: nowIso(-2),
        nextReviewAt: nowIso(-1)
      }
    },
    updatedAt: nowIso(-1)
  };
}

async function seedStorage(page, entries) {
  await page.addInitScript((storageEntries) => {
    for (const [key, value] of Object.entries(storageEntries)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
}

async function gotoHome(page) {
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });
}

async function readClaimedStampCount(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/growth-progress");
    const payload = await response.json();
    return payload.growthProgress.totalDailyChests;
  });
}

async function readLayout(page) {
  return page.evaluate(() => {
    const round = (value) => Math.round(value);
    const support = document.querySelector(".home-board__support");
    const columns = window.getComputedStyle(support).gridTemplateColumns.split(" ").filter(Boolean);
    const taskCard = document.querySelector(".daily-tasks").getBoundingClientRect();
    const growthCard = document.querySelector(".growth-summary").getBoundingClientRect();
    const clipped = [
      ...document.querySelectorAll(
        ".growth-summary__stat-value, .growth-summary__stat-label, .growth-summary__stamps-text, .daily-tasks__chest-ready, .daily-chest__action"
      )
    ].filter((el) => el.scrollWidth > el.clientWidth + 1).length;
    const root = document.documentElement;
    // 整页横向溢出：不做任何豁免，scrollWidth 不允许超过视口。
    const pageOverflowPx = root.scrollWidth - window.innerWidth;
    const scrollProbeBefore = window.scrollX;

    window.scrollTo(200, 0);

    const scrollProbeAfter = window.scrollX;

    window.scrollTo(scrollProbeBefore, window.scrollY);

    return {
      viewportWidth: window.innerWidth,
      columnCount: columns.length,
      sameRow: Math.abs(taskCard.y - growthCard.y) < 4,
      supportRight: round(support.getBoundingClientRect().right),
      supportOverflow: support.scrollWidth > support.clientWidth + 1,
      clippedTextCount: clipped,
      pageOverflowPx,
      canScrollHorizontally: scrollProbeAfter !== scrollProbeBefore,
      documentWidth: root.scrollWidth
    };
  });
}

test.describe("首页奖励闭环", () => {
  test("3/3 且未领取：出现「宝箱可以打开啦」，点击把宝箱滚进视野且不自动领取", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 2, earnedRewardCount: 2 }), [TASKS_KEY]: buildTasks(3) });
    await gotoHome(page);

    const readyButton = page.getByRole("button", { name: READY_BUTTON });
    const claimButton = page.getByRole("button", { name: CLAIM_BUTTON });
    const chest = page.getByRole("region", { name: "今日宝箱" });

    await expect(readyButton).toBeVisible();
    await expect(chest).toContainText("可领取");

    // 1440×900 下领取按钮本来就在首屏之外 —— 这正是要修的问题。
    const beforeBox = await claimButton.boundingBox();

    expect(beforeBox.y).toBeGreaterThan(900);

    await readyButton.click();

    // 点了之后宝箱进入视野（平滑滚动），路由不变，也没有自动领取。
    await expect(chest).toBeInViewport();
    await expect(page).toHaveURL(/#\/$/);
    await expect(claimButton).toBeVisible();
    await expect(chest).toContainText("可领取");
    expect(await readClaimedStampCount(page)).toBe(0);
  });

  test("reduced motion 下点击 ready 提示同样能把宝箱带进视野", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto("/");
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 2, earnedRewardCount: 2 }), [TASKS_KEY]: buildTasks(3) });
    await gotoHome(page);

    await page.getByRole("button", { name: READY_BUTTON }).click();
    await expect(page.getByRole("region", { name: "今日宝箱" })).toBeInViewport();

    await context.close();
  });

  test("领取成功后 ready 提示消失，一次性奖励提示可以点开收藏册", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 3, earnedRewardCount: 3 }), [TASKS_KEY]: buildTasks(3) });
    await gotoHome(page);

    await page.getByRole("button", { name: READY_BUTTON }).click();
    await page.getByRole("button", { name: CLAIM_BUTTON }).click();

    const chest = page.getByRole("region", { name: "今日宝箱" });

    // 领取后：状态与一次性奖励提示
    await expect(chest).toContainText("今日已领取");
    await expect(page.getByRole("button", { name: READY_BUTTON })).toHaveCount(0);
    await expect(chest).toContainText("获得 1 枚探险印章");

    // 奖励提示本身是入口，点开的是同一个收藏册
    const collectionEntry = page.getByRole("button", { name: COLLECTION_ENTRY });

    await expect(collectionEntry).toBeVisible();
    await collectionEntry.click();

    const dialog = page.getByRole("dialog", { name: COLLECTION_DIALOG });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("region", { name: "我的知识岛" })).toContainText("累计 1 枚探险印章");
    // 只打开收藏册，不会因为点它而重复领取
    expect(await readClaimedStampCount(page)).toBe(1);
  });

  test("我的成长知识岛摘要整行可点，打开同一个收藏册", async ({ page }) => {
    await page.goto("/");
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 2, earnedRewardCount: 2 }), [TASKS_KEY]: buildTasks(0) });

    // 先走真实接口拿一枚印章，再看长期入口。
    await page.evaluate(async (dateKey) => {
      await fetch("/api/growth-progress/daily-chest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey })
      });
    }, todayDateKey());
    await gotoHome(page);

    const growth = page.getByRole("region", { name: "我的成长" });
    const islandRow = growth.getByRole("button", { name: /打开我的探险收藏册，查看我的知识岛/ });

    await expect(islandRow).toBeVisible();
    await expect(growth).toContainText("我的知识岛");
    await expect(growth).toContainText("已经攒了 1 枚探险印章");
    // 只累计、不消费：印章数不会被花掉，也不会出现第二套成长数字。
    await expect(growth).not.toContainText("等级");
    await expect(growth).not.toContainText("经验值");
    // 旧的报表腔文案不再出现
    await expect(growth).not.toContainText("累计开启");

    await islandRow.click();

    const dialog = page.getByRole("dialog", { name: COLLECTION_DIALOG });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("region", { name: "我的知识岛" })).toContainText("累计 1 枚探险印章");
    // 首页摘要与收藏册是同一个阶段（都来自同一个纯函数）。
    const homeStage = await page.evaluate(async () => {
      const { buildKnowledgeIslandGrowth } = await import("/src/utils/knowledgeIslandGrowth.js");

      return buildKnowledgeIslandGrowth(1).currentStage.name;
    });

    await expect(islandRow).toContainText(homeStage);
    await expect(dialog.getByRole("region", { name: "我的知识岛" })).toContainText(homeStage);

    // 关闭后右上角的入口仍然在，两个入口指向同一个收藏册
    await dialog.getByRole("button", { name: "关闭我的探险收藏册" }).click();
    await growth.getByRole("button", { name: "打开我的探险收藏册，查看印章、航海收藏和成就" }).click();
    await expect(page.getByRole("dialog", { name: COLLECTION_DIALOG })).toBeVisible();
  });

  test("欢迎区不再重复主线建议：review/study 显示，challenge/chapter-complete/explore 不显示", async ({ page }) => {
    // challenge：默认状态就是“继续主线”，欢迎区不该再说一次
    await page.goto("/");
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 2, earnedRewardCount: 2 }), [TASKS_KEY]: buildTasks(0) });
    await gotoHome(page);

    const welcome = page.getByRole("region", { name: "首页欢迎区" });
    const adventure = page.getByRole("region", { name: "今天的探险" });

    await expect(adventure).toContainText("继续第");
    await expect(welcome).not.toContainText("今日建议");

    // chapter-complete：整章通关后“回大地图”由主卡承担，欢迎区同样不说
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ chapterComplete: true }), [TASKS_KEY]: buildTasks(0) });
    await page.reload();
    await expect(page.getByRole("region", { name: "今天的探险" })).toContainText("回到大地图看看");
    await expect(page.getByRole("region", { name: "首页欢迎区" })).not.toContainText("今日建议");

    // review：有今天到期的错题 → 欢迎区给出“更该先做”的建议
    await seedStorage(page, {
      [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 2, earnedRewardCount: 2 }),
      [TASKS_KEY]: buildTasks(0),
      [STUDY_BOOK_KEY]: buildDueWrongBook()
    });
    await page.reload();
    await expect(page.getByRole("region", { name: "首页欢迎区" })).toContainText("今日建议");
    await expect(page.getByRole("region", { name: "首页欢迎区" })).toContainText("温习");
  });

  test("1024×800：今日任务/宝箱在左、我的成长在右，保持双列且无横向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 5, earnedRewardCount: 5 }), [TASKS_KEY]: buildTasks(3) });
    await gotoHome(page);

    const layout = await readLayout(page);

    expect(layout.columnCount).toBe(2);
    expect(layout.sameRow).toBe(true);
    expect(layout.supportRight).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.supportOverflow).toBe(false);
    expect(layout.clippedTextCount).toBe(0);
    // 整页不允许横向溢出，也不允许横向滚动
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.pageOverflowPx).toBeLessThanOrEqual(0);
    expect(layout.canScrollHorizontally).toBe(false);

    // 左列在右列左边（今日任务 + 宝箱左、我的成长右）
    const taskX = await page.locator(".daily-tasks").evaluate((el) => Math.round(el.getBoundingClientRect().x));
    const growthX = await page.locator(".growth-summary").evaluate((el) => Math.round(el.getBoundingClientRect().x));

    expect(taskX).toBeLessThan(growthX);
  });

  test("390 窄屏：单列、ready 提示可点、星星完整换行、整页无横向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await seedStorage(page, { [CHALLENGE_KEY]: buildProgress({ clearedStageCount: 5, earnedRewardCount: 5 }), [TASKS_KEY]: buildTasks(3) });
    await gotoHome(page);

    const layout = await readLayout(page);

    expect(layout.columnCount).toBe(1);
    expect(layout.supportOverflow).toBe(false);
    expect(layout.clippedTextCount).toBe(0);
    // 整页不允许横向溢出，也不允许横向滚动（原来会多出 26px）
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.pageOverflowPx).toBeLessThanOrEqual(0);
    expect(layout.canScrollHorizontally).toBe(false);

    // 21 颗星一颗都不少：只允许自然换行，不允许被卡片裁掉
    const stars = await page.evaluate(() => {
      const starNodes = [...document.querySelectorAll(".adventure-card__star")];
      const cardRight = document.querySelector(".adventure-card").getBoundingClientRect().right;

      return {
        count: starNodes.length,
        lines: new Set(starNodes.map((star) => Math.round(star.getBoundingClientRect().top))).size,
        clipped: starNodes.filter((star) => star.getBoundingClientRect().right > cardRight + 0.5).length,
        text: document.querySelector(".adventure-card__stars-text").innerText.trim()
      };
    });

    expect(stars.count).toBe(21);
    expect(stars.clipped).toBe(0);
    expect(stars.lines).toBeGreaterThanOrEqual(2);
    expect(stars.text).toContain("21");

    // ready 提示在视口宽度内，可以正常点击，点击后宝箱进入视野
    const readyButton = page.getByRole("button", { name: READY_BUTTON });
    const readyBox = await readyButton.boundingBox();

    expect(readyBox.x).toBeGreaterThanOrEqual(0);
    expect(readyBox.x + readyBox.width).toBeLessThanOrEqual(390);

    await readyButton.click();
    await expect(page.getByRole("region", { name: "今日宝箱" })).toBeInViewport();
  });
});
