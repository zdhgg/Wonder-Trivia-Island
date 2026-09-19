const { test, expect } = require("@playwright/test");

// 首页 1.5 轮验收修正的浏览器级回归：
// 整章通关后 CTA 不再让孩子继续最后一关，而是回大地图。
//
// 进度直接写进应用自己的 localStorage key（前端 progress book 的真实结构），
// 章节 id 用应用自己的 challengeConfig 解析，避免在测试里手写年级 → 章节的映射。

const CHALLENGE_PROGRESS_STORAGE_KEY = "wonder-trivia-island.challenge.progress";
const APP_SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings";
const HOME_ENTRY = /^自由练习/;
const STAGE_IDS = Object.freeze(["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"]);

test.describe("首页验收修正", () => {
  test("整章通关后首页 CTA 不再继续最后一关，而是回大地图", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: HOME_ENTRY })).toBeVisible();

    const chapterId = await page.evaluate(
      async ({ settingsKey }) => {
        const profile = JSON.parse(window.localStorage.getItem(settingsKey) || "{}")?.profile || {};
        const { getChallengeChapterIdBySelection } = await import("/src/composables/challenge/challengeConfig.js");

        return getChallengeChapterIdBySelection(profile.grade, profile.semester);
      },
      { settingsKey: APP_SETTINGS_STORAGE_KEY }
    );

    expect(chapterId, "应该能从档案解析出当前章节").toContain("chapter-grade-");

    // 把这一章写成“7 关全部过关、但没有满星”（17 / 21）。
    await page.addInitScript(
      ({ progressKey, activeChapterId, stageIds }) => {
        const starCounts = [3, 3, 3, 3, 2, 2, 1];
        const bestResults = {};

        stageIds.forEach((stageId, index) => {
          bestResults[stageId] = {
            starCount: starCounts[index],
            bestAccuracy: 90,
            attempts: 1,
            bestScore: 100,
            rewardEarned: true
          };
        });

        window.localStorage.setItem(
          progressKey,
          JSON.stringify({
            activeChapterId,
            chapters: {
              [activeChapterId]: {
                unlockedStageIds: [...stageIds],
                bestResults
              }
            }
          })
        );
      },
      { progressKey: CHALLENGE_PROGRESS_STORAGE_KEY, activeChapterId: chapterId, stageIds: [...STAGE_IDS] }
    );

    await page.reload();

    const adventure = page.getByRole("region", { name: "今天的探险" });
    await expect(adventure).toBeVisible();

    // 通关状态：不再出现“继续第 N 关”，也不再提示“再获得 1 颗星”。
    await expect(adventure).toContainText("全部通关");
    await expect(adventure).toContainText("回到大地图看看");
    await expect(adventure).not.toContainText("继续第");
    await expect(adventure).not.toContainText("再获得 1 颗星");

    // 通关但没满星：星星照常显示 17 / 21，并且仍然知道有星星可以回头补。
    await expect(adventure).toContainText("17 / 21");
    await expect(adventure).toContainText("还有星星可以回头补");

    // 点 CTA 必须真的进大地图，而不是打开第 7 关。
    await adventure.getByRole("button").click();
    await expect(page.getByRole("heading", { name: "奇妙世界大地图" })).toBeVisible();
    await expect(page).not.toHaveURL(/#\/quiz/);
  });
});
