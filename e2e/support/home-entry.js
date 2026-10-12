const { expect } = require("@playwright/test");

// 首页练习入口现在收在“自由探索 → 自由练习”弹窗里：
// 先点开自由练习模态框，再选按年级练 / 按学科练 / 随便练。
// 抽成辅助函数，避免以后再调整首页层级时到处改选择器。
async function choosePracticeEntry(page, optionName) {
  await page.getByRole("button", { name: /^自由练习/ }).click();

  const dialog = page.getByRole("dialog", { name: "今天想怎么练？" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: optionName }).click();
}

module.exports = { choosePracticeEntry };
