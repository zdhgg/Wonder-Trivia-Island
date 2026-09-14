const { test, expect } = require("@playwright/test");
const {
  startPracticeAndCaptureQuestions,
  resolveDisplayedQuestion,
  waitForQuestionDisplayed,
  fetchCorrectAnswer,
  pickWrongOptionKey,
  clickOptionByKey,
  progressMeter
} = require("../support/quiz-flow");

// 场景 3：错题闭环 —— 练习 → 答错 → 学习记录 → 错题温习 → 重新开练。
// 选择错题而不是讲堂，是因为这条链路横跨 quiz / 学习记录 / 错题页 / 复习入口四个模块，
// 而且下面这些断言都以「最终稳定状态」为准，不依赖题目内容或用户历史数据。
test.describe("答题后的错题闭环", () => {
  test("答错一题后进入错题温习并能重新开练", async ({ page }) => {
    await page.goto("/");

    const questions = await startPracticeAndCaptureQuestions(page, () =>
      page.getByRole("button", { name: /^随便练/ }).click()
    );

    await expect(page).toHaveURL(/#\/quiz$/);

    const question = await resolveDisplayedQuestion(page, questions, 0);
    const correctAnswer = await fetchCorrectAnswer(page, question.id);
    const wrongAnswer = pickWrongOptionKey(correctAnswer);

    // 故意答错
    await clickOptionByKey(page, question, wrongAnswer);

    // 反馈状态：判题后页面把正确答案标在选项上。
    // 注意：这条反馈是短时状态（答错后会倒计时自动继续），所以紧随点击之后断言。
    await expect(page.getByRole("button", { name: /正确答案/ })).toBeVisible();
    await expect(progressMeter(page)).toHaveAttribute(
      "aria-label",
      `答题进度 已答 1 / ${questions.length} 题`
    );

    // 回到首页，再进入错题温习
    await page.getByRole("button", { name: /返回首页/ }).click();
    await expect(page).toHaveURL(/#\/$/);

    await page.getByRole("button", { name: /^错题温习/ }).click();
    await expect(page).toHaveURL(/#\/wrong-book$/);

    // 刚答错的那道题被收了进来，并且进入「今天到期」队列（默认筛选）
    await expect(page.getByRole("heading", { name: question.content })).toBeVisible();

    const startReviewButton = page.getByRole("button", { name: /^开始温习/ });
    await expect(startReviewButton).toBeEnabled();
    await startReviewButton.click();

    // 重新开练：回到答题流程，并且显示的就是同一道错题
    await expect(page).toHaveURL(/#\/quiz$/);
    await waitForQuestionDisplayed(page, question);
  });
});
