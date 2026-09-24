const { test, expect } = require("@playwright/test");

// 场景 4：今日任务 → 每日宝箱 → 长期成长的最小闭环。
//
// 预置「今天 3 项任务全部完成」→ 首页领取宝箱 → 显示探险印章 → reload
// → 仍然显示今日已领取 → 再领也不会让累计数 +1。
//
// 任务进度是前端本地日进度，直接写应用自己的 localStorage key；
// 领取结果落在后端独立的 growth_progress 表（同一个 profile cookie）。

const HOME_DAILY_TASKS_STORAGE_KEY = "wonder-trivia-island.home.daily-tasks";
const CHALLENGE_PROGRESS_STORAGE_KEY = "wonder-trivia-island.challenge.progress";
const STUDY_RECORD_BOOK_STORAGE_KEY = "wonder-trivia-island.study.record-book";
const GROWTH_PROGRESS_STORAGE_KEY = "wonder-trivia-island.growth.progress";

function getTodayDateKey() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

// 三项任务分别是：今日闯关 1 次、错题温习 3 道、学习知识 1 节。
function buildCompletedTodayTasks(dateKey = getTodayDateKey()) {
  return {
    version: 1,
    dateKey,
    tasks: {
      stagesCleared: 1,
      reviewedQuestionIds: ["101", "102", "103"],
      completedLessonIds: ["grade-three-math-lesson-1"]
    },
    updatedAt: new Date().toISOString()
  };
}

async function seedHomeStorage(page, { tasks, challengeProgress, studyRecordBook }) {
  await page.addInitScript(
    ({ tasksKey, tasksValue, challengeKey, challengeValue, studyKey, studyValue }) => {
      if (tasksValue) {
        window.localStorage.setItem(tasksKey, JSON.stringify(tasksValue));
      }

      if (challengeValue) {
        window.localStorage.setItem(challengeKey, JSON.stringify(challengeValue));
      }

      if (studyValue) {
        window.localStorage.setItem(studyKey, JSON.stringify(studyValue));
      }
    },
    {
      tasksKey: HOME_DAILY_TASKS_STORAGE_KEY,
      tasksValue: tasks,
      challengeKey: CHALLENGE_PROGRESS_STORAGE_KEY,
      challengeValue: challengeProgress,
      studyKey: STUDY_RECORD_BOOK_STORAGE_KEY,
      studyValue: studyRecordBook
    }
  );
}

async function readGrowthProgressFromApi(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/growth-progress");

    return response.json();
  });
}

async function claimDailyChestThroughApi(page, dateKey) {
  return page.evaluate(async (key) => {
    const response = await fetch("/api/growth-progress/daily-chest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey: key })
    });

    return response.json();
  }, dateKey);
}

test.describe("今日任务 → 今日宝箱 → 长期成长", () => {
  test("3 / 3 完成后可以领取宝箱，reload 后仍是今日已领取且不会重复增加", async ({ page }) => {
    const dateKey = getTodayDateKey();
    // 既有的挑战 / 错题本数据：整条链路走完必须一字不动。
    const challengeProgress = {
      activeChapterId: "chapter-grade-3-upper",
      chapters: {
        "chapter-grade-3-upper": {
          unlockedStageIds: ["stage-1", "stage-2"],
          bestResults: { "stage-1": { starCount: 3, bestAccuracy: 100, attempts: 1, bestScore: 100, rewardEarned: true } }
        }
      }
    };
    const studyRecordBook = {
      questionRecords: {
        "101": {
          questionId: 101,
          snapshot: { id: 101, content: "预置的错题快照" },
          attempts: 2,
          correctCount: 0,
          wrongCount: 2
        }
      },
      updatedAt: "2026-09-22T08:00:00.000Z"
    };

    await page.goto("/");
    await seedHomeStorage(page, { tasks: buildCompletedTodayTasks(dateKey), challengeProgress, studyRecordBook });

    // 既有数据的标记位：领取宝箱这件事只能写 growth progress，不能动这两路。
    // 只断言关键标记（而不是整份 JSON），避免被既有的规范化 / 合并写回干扰。
    const readSeededMarkers = () =>
      page.evaluate(
        ({ challengeKey, studyKey }) => {
          const challenge = JSON.parse(window.localStorage.getItem(challengeKey) || "null");
          const study = JSON.parse(window.localStorage.getItem(studyKey) || "null");

          return {
            challengeChapter: challenge?.activeChapterId || "",
            challengeStarCount:
              challenge?.chapters?.["chapter-grade-3-upper"]?.bestResults?.["stage-1"]?.starCount ?? 0,
            studyAttempts: study?.questionRecords?.["101"]?.attempts ?? 0
          };
        },
        { challengeKey: CHALLENGE_PROGRESS_STORAGE_KEY, studyKey: STUDY_RECORD_BOOK_STORAGE_KEY }
      );

    // 让预置数据先落到 localStorage，再刷新一次让首页读到。
    await page.reload();

    const dailyTasks = page.getByRole("region", { name: "今日小任务" });
    await expect(dailyTasks).toBeVisible();
    await expect(dailyTasks).toContainText("3 / 3");

    const chest = page.getByRole("region", { name: "今日宝箱" });
    await expect(chest).toBeVisible();
    await expect(chest).toContainText("3 / 3");
    await expect(chest).toContainText("可领取");

    const seededMarkersBeforeClaim = await readSeededMarkers();

    expect(seededMarkersBeforeClaim.challengeStarCount).toBe(3);
    expect(seededMarkersBeforeClaim.studyAttempts).toBe(2);

    const claimButton = chest.getByRole("button", { name: "领取今日宝箱" });
    await expect(claimButton).toBeEnabled();
    await claimButton.click();

    // 领取成功：一次性提示“获得 1 枚探险印章”，状态变成今日已领取。
    await expect(chest.getByText("获得 1 枚探险印章")).toBeVisible();
    await expect(chest).toContainText("今日已领取");
    await expect(chest.getByRole("button", { name: "领取今日宝箱" })).toHaveCount(0);

    // 首页成长区出现一条轻量累计信息，且没有变成第四个大指标卡。
    const growth = page.getByRole("region", { name: "我的成长" });
    await expect(growth).toContainText("已经攒了 1 枚探险印章");
    await expect(growth.locator(".growth-summary__stat")).toHaveCount(3);

    // 领取之后（还没刷新）既有数据就一字未动。
    expect(await readSeededMarkers()).toEqual(seededMarkersBeforeClaim);

    // 刷新页面：已领取状态来自后端独立账本，必须还在。
    await page.reload();

    const reloadedChest = page.getByRole("region", { name: "今日宝箱" });
    await expect(reloadedChest).toBeVisible();
    await expect(reloadedChest).toContainText("今日已领取");
    await expect(reloadedChest.getByRole("button", { name: "领取今日宝箱" })).toHaveCount(0);
    // reload 后不再重复播放“获得印章”的一次性提示，但累计数保持 1。
    await expect(page.getByRole("region", { name: "我的成长" })).toContainText("已经攒了 1 枚探险印章");

    // 服务端账本也只记了 1 次。
    const afterReloadPayload = await readGrowthProgressFromApi(page);

    expect(afterReloadPayload.growthProgress.totalDailyChests).toBe(1);
    expect(Object.keys(afterReloadPayload.growthProgress.dailyClaims)).toEqual([dateKey]);

    // 绕过 UI 再领同一天（模拟重复请求 / 另一个标签页）：幂等，累计数不变。
    const duplicatePayload = await claimDailyChestThroughApi(page, dateKey);

    expect(duplicatePayload.alreadyClaimed).toBe(true);
    expect(duplicatePayload.growthProgress.totalDailyChests).toBe(1);

    await page.reload();
    await expect(page.getByRole("region", { name: "今日宝箱" })).toContainText("今日已领取");
    await expect(page.getByRole("region", { name: "我的成长" })).toContainText("已经攒了 1 枚探险印章");

    // 服务端才是长期账本的唯一来源：把本地镜像整个删掉，刷新后状态与累计数仍然在。
    // （本地缓存只用于服务端取不回来时的展示兜底，永远不会自己加印章。）
    await page.evaluate((key) => window.localStorage.removeItem(key), GROWTH_PROGRESS_STORAGE_KEY);
    await page.reload();

    await expect(page.getByRole("region", { name: "今日宝箱" })).toContainText("今日已领取");
    await expect(page.getByRole("region", { name: "今日宝箱" })).not.toContainText("可领取");
    await expect(page.getByRole("region", { name: "我的成长" })).toContainText("已经攒了 1 枚探险印章");

    // 既有挑战 / 错题本本地数据一字未动。
    expect(await readSeededMarkers()).toEqual(seededMarkersBeforeClaim);
  });

  test("只完成 2 / 3 时宝箱不解锁，也没有领取按钮", async ({ page }) => {
    const dateKey = getTodayDateKey();

    await page.goto("/");
    await seedHomeStorage(page, {
      tasks: {
        ...buildCompletedTodayTasks(dateKey),
        // 今日闯关 + 错题温习 3 道已完成，知识学习还没开始 → 2 / 3。
        tasks: {
          stagesCleared: 1,
          reviewedQuestionIds: ["101", "102", "103"],
          completedLessonIds: []
        }
      }
    });
    await page.reload();

    const chest = page.getByRole("region", { name: "今日宝箱" });

    await expect(chest).toContainText("2 / 3");
    await expect(chest).toContainText("宝箱未解锁");
    await expect(chest.getByRole("button", { name: "领取今日宝箱" })).toHaveCount(0);

    // 没有真的发出过领取请求，服务端账本仍是空的。
    const payload = await readGrowthProgressFromApi(page);

    expect(payload.growthProgress.totalDailyChests).toBe(0);
    expect(payload.growthProgress.dailyClaims).toEqual({});
  });
});
