const { test, expect } = require("@playwright/test");
const { choosePracticeEntry } = require("../support/home-entry");
const {
  startPracticeAndCaptureQuestions,
  resolveDisplayedQuestion,
  waitForQuestionDisplayed,
  fetchCorrectAnswer,
  clickOptionByKey,
  progressMeter
} = require("../support/quiz-flow");

// 场景 2：孩子真实使用路径上的核心练习流程。
// 只做「进入答题 → 真实作答 → 页面进入下一状态」，不假设具体题目内容，
// 题目来自 E2E 种子库，正确答案通过项目自身的判题接口取得。
test.describe("核心练习流程", () => {
  // 每次从干净的本地进度开始，避免上一次跑测试留下的“今日小任务”进度影响首页状态。
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
  });

  test("从首页进入自由练习并真实完成一道题", async ({ page }) => {
    await page.goto("/");

    const questions = await startPracticeAndCaptureQuestions(page, () =>
      choosePracticeEntry(page, "随便练，不限年级学科")
    );

    await expect(page).toHaveURL(/#\/quiz$/);

    // 题目与选项真实渲染，且与接口返回的第一道题一致
    const question = await resolveDisplayedQuestion(page, questions, 0);
    await expect(progressMeter(page)).toHaveAttribute(
      "aria-label",
      `答题进度 已答 0 / ${questions.length} 题`
    );

    // 判题接口是无副作用的判题入口，用它确定正确答案后真实点选
    const correctAnswer = await fetchCorrectAnswer(page, question.id);
    await clickOptionByKey(page, question, correctAnswer);

    // 提交真实发生：答题进度前进
    await expect(progressMeter(page)).toHaveAttribute(
      "aria-label",
      `答题进度 已答 1 / ${questions.length} 题`
    );

    // 页面进入下一状态：切到下一道题
    const secondQuestion = questions[1];

    if (secondQuestion) {
      await waitForQuestionDisplayed(page, secondQuestion);
    }
  });
});
