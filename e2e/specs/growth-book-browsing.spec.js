const { test, expect } = require("@playwright/test");
const path = require("node:path");

// 场景 12：纪念册的翻看体验（Phase 2D-E1）。
//
// 覆盖两件事：
//   1. 「全部」页签把两条记录线按真实日期混排，并保留各自的来源标记；
//   2. 照片可以点开看大图，同一条记录的多张照片能前后切换。
//
// 数据只走真实接口；照片用一张 1×1 的 JPEG fixture，多放几张来验证翻页。

const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "三年级", semester: "上册" });
const PHOTO_FIXTURE = path.join(__dirname, "..", "fixtures", "tiny-photo.jpg");
const FOOTPRINT_TITLE = "一起去看了一次海";
const MILESTONE_TITLE = "第一次自己举手回答问题";

async function seedHomeProfile(page) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: SETTINGS_STORAGE_KEY, profileSnapshot: HOME_PROFILE }
  );
}

// 用界面各自记一条，保证两条线都有真实数据。
async function seedOneRecordPerLine(page) {
  // 「我们一起」：带两张照片（用于验证大图翻页）。
  await page.getByRole("tab", { name: /我们一起/ }).click();
  await page.getByRole("button", { name: "记一件新的事" }).click();
  await page.getByLabel("这件事的标题").fill(FOOTPRINT_TITLE);
  await page.getByLabel("那天发生了什么").fill("风很大，海浪打在脚上。");
  await page.locator(".footprint-photos__input").setInputFiles([PHOTO_FIXTURE, PHOTO_FIXTURE]);
  await expect(page.locator(".footprint-photos__item")).toHaveCount(2);
  await page.getByRole("button", { name: "收进纪念册" }).click();
  await expect(page.locator(".growth-book__entry", { hasText: FOOTPRINT_TITLE })).toBeVisible();

  // 「她的成长」：带一张照片。
  await page.getByRole("tab", { name: /她的成长/ }).click();
  await page.getByRole("button", { name: /记下第一个瞬间|记一件她的事/ }).first().click();
  await page.getByLabel("这件事的标题").fill(MILESTONE_TITLE);
  await page.getByLabel("那天发生了什么").fill("举了三次才被叫到。");
  await page.locator(".footprint-photos__input").setInputFiles(PHOTO_FIXTURE);
  await expect(page.locator(".footprint-photos__item")).toHaveCount(1);

  const submitButton = page.getByRole("button", { name: "收进成长纪念册" });

  await submitButton.scrollIntoViewIfNeeded();
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await expect(page.locator(".milestones__entry", { hasText: MILESTONE_TITLE })).toBeVisible();
}

test.describe("纪念册翻看", () => {
  test("全部页签把两条线混排，照片能点开看大图并翻页", async ({ page }) => {
    await seedHomeProfile(page);
    await page.goto("/#/growth-book?tab=together");
    await expect(page.getByRole("heading", { name: "我们的成长纪念册" })).toBeVisible();

    await seedOneRecordPerLine(page);

    // 切到「全部」：URL 去掉 tab 参数（默认页签），两条记录按日期混排在同一页。
    await page.getByRole("tab", { name: /全部/ }).click();
    await expect(page).not.toHaveURL(/tab=/);
    await expect(page.getByText("一共留下了 2 个成长瞬间")).toBeVisible();

    const footprintEntry = page.locator(".growth-book__entry", { hasText: FOOTPRINT_TITLE });
    const milestoneEntry = page.locator(".growth-book__entry", { hasText: MILESTONE_TITLE });

    await expect(footprintEntry).toBeVisible();
    await expect(milestoneEntry).toBeVisible();
    // 两种记录看得出区别：来源标记 + 各自的类别文案。
    await expect(footprintEntry).toContainText("👨‍👧 我们一起");
    await expect(milestoneEntry).toContainText("🌱 她的成长");
    await expect(milestoneEntry).toContainText("📚 学习课堂");
    // 正文和照片都照常显示。
    await expect(footprintEntry).toContainText("风很大，海浪打在脚上。");
    await expect(footprintEntry.locator(".growth-book__entry-photo")).toHaveCount(2);
    await expect(milestoneEntry.locator(".growth-book__entry-photo")).toHaveCount(1);

    // 点开大图：显示这条记录的第一张，还能往后翻。
    await footprintEntry.locator(".growth-book__entry-photo-button").first().click();
    const lightbox = page.locator(".photo-lightbox");

    await expect(lightbox).toBeVisible();
    await expect(lightbox).toContainText(FOOTPRINT_TITLE);
    await expect(lightbox.locator(".photo-lightbox__counter")).toHaveText("1 / 2");

    await lightbox.getByRole("button", { name: "看下一张" }).click();
    await expect(lightbox.locator(".photo-lightbox__counter")).toHaveText("2 / 2");

    // 再点一次会绕回第一张（循环浏览）。
    await lightbox.getByRole("button", { name: "看下一张" }).click();
    await expect(lightbox.locator(".photo-lightbox__counter")).toHaveText("1 / 2");

    // 键盘也能翻：→ 到第二张，← 回第一张。
    await page.keyboard.press("ArrowRight");
    await expect(lightbox.locator(".photo-lightbox__counter")).toHaveText("2 / 2");
    await page.keyboard.press("ArrowLeft");
    await expect(lightbox.locator(".photo-lightbox__counter")).toHaveText("1 / 2");

    // Esc 关掉大图，回到纪念册。
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveCount(0);
    await expect(footprintEntry).toBeVisible();

    // 只有一张照片的记录：没有翻页按钮。
    await milestoneEntry.locator(".growth-book__entry-photo-button").first().click();
    await expect(lightbox).toBeVisible();
    await expect(lightbox.locator(".photo-lightbox__counter")).toHaveCount(0);
    await expect(lightbox.getByRole("button", { name: "看下一张" })).toHaveCount(0);
    await lightbox.getByRole("button", { name: "关闭大图" }).click();
    await expect(lightbox).toHaveCount(0);

    // 手机上大图不横向溢出，翻页按钮仍在。
    await page.setViewportSize({ width: 390, height: 844 });
    await footprintEntry.locator(".growth-book__entry-photo-button").first().click();
    await expect(lightbox).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
    await expect(lightbox.getByRole("button", { name: "看下一张" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 900 });

    // 三个页签都在，各自的列表仍然只显示自己那条线。
    await page.getByRole("tab", { name: /我们一起/ }).click();
    await expect(page).toHaveURL(/tab=together/);
    await expect(page.locator(".growth-book__entry", { hasText: MILESTONE_TITLE })).toHaveCount(0);
    await expect(page.locator(".growth-book__entry", { hasText: FOOTPRINT_TITLE })).toBeVisible();

    // 刷新后仍停在同一页签。
    await page.reload();
    await expect(page.getByRole("tab", { name: /我们一起/ })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("tab", { name: /她的成长/ }).click();
    await page.reload();
    await expect(page.getByRole("tab", { name: /她的成长/ })).toHaveAttribute("aria-selected", "true");

    // 「她的成长」自己的列表里照片也能点开看大图。
    await page.locator(".milestones__entry", { hasText: MILESTONE_TITLE }).locator(".milestones__entry-photo-button").click();
    await expect(lightbox).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveCount(0);
  });
});
