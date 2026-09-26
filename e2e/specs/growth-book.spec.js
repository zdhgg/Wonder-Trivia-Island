const { test, expect } = require("@playwright/test");

// 场景 8：我们的成长纪念册（Phase 2D-A2 / A3）。
//
// 覆盖两件事，都是「真的用一遍」而不是读状态：
//   1. 首页「我的成长」里的纪念册入口能进页面、能回首页；
//   2. 纪念册里的新增 / 编辑 / 删除在 reload 之后仍然成立。
//
// 数据只走真实接口 /api/growth-footprints：服务端按 cookie 里的 profile 归属，
// 所以每个测试自己的 browser context 就是一份独立数据，不需要额外清理。

const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "三年级", semester: "上册" });
const HOME_ENTRY_LABEL = "我们的成长纪念册";
const BOOK_TITLE = "我们的成长纪念册";

async function seedHomeProfile(page) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: SETTINGS_STORAGE_KEY, profileSnapshot: HOME_PROFILE }
  );
}

async function openBookFromHome(page) {
  await page.goto("/");
  await page.getByRole("button", { name: HOME_ENTRY_LABEL }).click();
  await expect(page).toHaveURL(/#\/growth-book/);
  await expect(page.getByRole("heading", { name: BOOK_TITLE })).toBeVisible();
  // 纪念册默认停在「全部」，这条用例覆盖的是「我们一起」那条线，所以先切过去。
  await page.getByRole("tab", { name: /我们一起/ }).click();
}

async function fillFootprintForm(page, { title, note }) {
  await page.getByLabel("这件事的标题").fill(title);

  if (note !== undefined) {
    await page.getByLabel("那天发生了什么").fill(note);
  }
}

test.describe("成长纪念册", () => {
  test("首页入口进得去、回得来，记下的事在刷新后还在，也能改和删", async ({ page }) => {
    await seedHomeProfile(page);

    // 入口在「我的成长」卡里，文案固定、不含任何进度数字。
    // 注意：按钮有 aria-label，可读文本断言要落在里面的文案节点上。
    await page.goto("/");
    const homeEntry = page.getByRole("button", { name: HOME_ENTRY_LABEL });

    await expect(homeEntry).toBeVisible();
    await expect(
      page.locator(".growth-summary__entry", { hasText: "我们的成长纪念册" }).locator(".growth-summary__entry-hint")
    ).toHaveText("还没有一起经历的故事，找个时间一起做点什么吧。");

    await homeEntry.click();
    await expect(page).toHaveURL(/#\/growth-book/);
    await expect(page.getByRole("heading", { name: BOOK_TITLE })).toBeVisible();

    // 纪念册默认停在「全部」；这条用例覆盖的是「我们一起」那条线，先切过去。
    await page.getByRole("tab", { name: /我们一起/ }).click();

    // 第一次进来是空的：空状态 + 「记下第一件事」。
    await expect(page.getByRole("heading", { name: "纪念册还是空的" })).toBeVisible();

    // 新增：共用表单，标题为空时不给保存（逐字段提示）。
    await page.getByRole("button", { name: "记下第一件事" }).click();
    await expect(page.getByRole("heading", { name: "记下一件一起做的事" })).toBeVisible();

    await page.getByRole("button", { name: "收进纪念册" }).click();
    await expect(page.getByText("给这件事写一个标题吧。")).toBeVisible();

    // 类别是视觉上由外层 label 承担的隐藏单选框，直接点它（force）等价于用户点标签。
    await page.getByRole("radio", { name: /一起探索/ }).check({ force: true });
    await fillFootprintForm(page, { title: "第一次一起做火山实验", note: "小苏打加醋，喷得到处都是。" });
    await page.getByRole("button", { name: /一起合作/ }).click();
    await page.getByRole("button", { name: "收进纪念册" }).click();

    const entryTitle = page.locator(".growth-book__entry-title").first();

    await expect(entryTitle).toHaveText("第一次一起做火山实验");
    // 月份分组标题跟着发生的那一天走（月份组由 BookMonthSection 渲染）。
    await expect(page.locator(".book-month__label").first()).toContainText("月");
    await expect(page.locator(".growth-book__entry-tag")).toHaveCount(1);

    // 刷新后仍在（服务端持久化，不靠内存）。
    await page.reload();
    await expect(page.locator(".growth-book__entry-title").first()).toHaveText("第一次一起做火山实验");

    // 编辑：同一套表单，标题变成「修改这条记录」。
    await page.getByRole("button", { name: "改一改" }).first().click();
    await expect(page.getByRole("heading", { name: "修改这条记录" })).toBeVisible();
    await fillFootprintForm(page, { title: "一起做火山实验（第二次）" });
    await page.getByRole("button", { name: "保存修改" }).click();
    await expect(page.locator(".growth-book__entry-title").first()).toHaveText("一起做火山实验（第二次）");

    await page.reload();
    await expect(page.locator(".growth-book__entry-title").first()).toHaveText("一起做火山实验（第二次）");

    // 删除：一句确认，确认后记录消失且刷新不回来。
    await page.getByRole("button", { name: "删掉" }).first().click();
    await expect(page.getByRole("heading", { name: "要把这条记录删掉吗？" })).toBeVisible();
    await page.getByRole("button", { name: "删掉这条" }).click();
    await expect(page.getByRole("heading", { name: "纪念册还是空的" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "纪念册还是空的" })).toBeVisible();

    // 回首页：路由回到 /，并且还能再进去。
    // 注意「返回首页」在纪念册和想一起做两个页面里都存在，这里限定在纪念册的页头里点。
    await page.locator(".growth-book__hero").getByRole("button", { name: "返回首页" }).click();
    await expect(page).not.toHaveURL(/#\/growth-book/);
    await expect(page.getByRole("button", { name: HOME_ENTRY_LABEL })).toBeVisible();

    await openBookFromHome(page);
  });
});
