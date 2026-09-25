const { test, expect } = require("@playwright/test");

// 场景 10：纪念册照片（Phase 2D-C1）。
//
// 覆盖用户真正会走的完整路径：
//   完成一件事时放一张照片 → 纪念册里能看到文字和照片 → reload 后照片还在 →
//   编辑这条记录时能看到原照片（并且能再加一张、删掉一张）→ 删掉整条记录后一切正常。
//
// 数据只走真实接口（/api/growth-footprints 与 /api/growth-plans），
// 照片文件落在 E2E 隔离库里配套的临时目录（见 backend/src/routes/growthFootprintPhotos.js）。

const path = require("node:path");
const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "三年级", semester: "上册" });
const PLANS_ENTRY_LABEL = "打开下次我们一起做什么";
const PLAN_TITLE = "一起去看一次海";
const PHOTO_FIXTURE = path.join(__dirname, "..", "fixtures", "tiny-photo.jpg");

async function seedHomeProfile(page) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: SETTINGS_STORAGE_KEY, profileSnapshot: HOME_PROFILE }
  );
}

async function photoCountOf(page, title) {
  return page.locator(".growth-book__entry", { hasText: title }).locator(".growth-book__entry-photo").count();
}

test.describe("纪念册照片", () => {
  test("完成一件事时放照片，纪念册里能看到，编辑时还能调整", async ({ page }) => {
    await seedHomeProfile(page);

    // 进入「下次我们一起做什么」，自己写一件想做的事。
    await page.goto("/");
    await page.getByRole("button", { name: PLANS_ENTRY_LABEL }).click();
    await expect(page).toHaveURL(/#\/growth-plans/);

    await page.getByRole("button", { name: "我想做一件别的事" }).click();
    await page.getByLabel("想一起做什么").fill(PLAN_TITLE);
    await page.getByRole("button", { name: "放进想一起做" }).click();
    await expect(page.locator(".growth-plans__plan", { hasText: PLAN_TITLE })).toBeVisible();

    // 完成它：补一句记录 + 放一张照片。
    await page.locator(".growth-plans__plan", { hasText: PLAN_TITLE }).getByRole("button", { name: "完成啦" }).click();
    await expect(page.getByRole("heading", { name: PLAN_TITLE })).toBeVisible();

    await page.getByLabel("一句记录").fill("风很大，海浪打在脚上。");

    // 隐藏的 file input 就是「放几张照片」按钮背后的真实入口。
    await page.locator(".footprint-photos__input").setInputFiles(PHOTO_FIXTURE);
    await expect(page.locator(".footprint-photos__item")).toHaveCount(1);

    await page.getByRole("button", { name: "收进成长纪念册" }).click();

    // 清单里没有了，并且提示去哪儿找。
    await expect(page.locator(".growth-plans__plan", { hasText: PLAN_TITLE })).toHaveCount(0);
    await expect(page.locator(".growth-plans__done")).toContainText("已经收进成长纪念册了");

    // 纪念册里能看到这条记录、那句话和那张照片。
    await page.locator(".growth-plans__hero").getByRole("button", { name: /成长纪念册/ }).click();
    await expect(page).toHaveURL(/#\/growth-book/);

    const entry = page.locator(".growth-book__entry", { hasText: PLAN_TITLE });

    await expect(entry).toBeVisible();
    await expect(entry).toContainText("风很大，海浪打在脚上。");
    await expect(entry.locator(".growth-book__entry-photo-image")).toBeVisible();
    expect(await photoCountOf(page, PLAN_TITLE)).toBe(1);

    // 照片真的能加载出来（不是破图）：naturalWidth > 0。
    const loadedWidth = await page
      .locator(".growth-book__entry", { hasText: PLAN_TITLE })
      .locator(".growth-book__entry-photo-image")
      .evaluate((image) => image.naturalWidth);

    expect(loadedWidth).toBeGreaterThan(0);

    // 手机上不横向溢出。
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".growth-book__entry-photo-image")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });

    // reload 后照片还在。
    await page.reload();
    await expect(page.locator(".growth-book__entry", { hasText: PLAN_TITLE })).toBeVisible();
    expect(await photoCountOf(page, PLAN_TITLE)).toBe(1);

    // 编辑这条记录：原照片还在，再加一张，然后删掉一张。
    await page.locator(".growth-book__entry", { hasText: PLAN_TITLE }).getByRole("button", { name: "改一改" }).click();
    await expect(page.locator(".footprint-photos__item")).toHaveCount(1);

    await page.locator(".footprint-photos__input").setInputFiles(PHOTO_FIXTURE);
    await expect(page.locator(".footprint-photos__item")).toHaveCount(2);

    await page.locator(".footprint-photos__item").first().getByRole("button").click();
    await expect(page.locator(".footprint-photos__item")).toHaveCount(1);

    await page.getByRole("button", { name: "保存修改" }).click();
    expect(await photoCountOf(page, PLAN_TITLE)).toBe(1);

    // 删掉整条记录：纪念册回到空状态，照片接口也没有留下坏引用。
    await page.locator(".growth-book__entry", { hasText: PLAN_TITLE }).getByRole("button", { name: "删掉" }).click();
    await page.getByRole("button", { name: "删掉这条" }).click();
    await expect(page.getByRole("heading", { name: "纪念册还是空的" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "纪念册还是空的" })).toBeVisible();
    await expect(page.locator(".growth-book__entry-photo-image")).toHaveCount(0);
  });
});
