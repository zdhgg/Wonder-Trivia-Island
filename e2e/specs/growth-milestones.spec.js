const { test, expect } = require("@playwright/test");
const path = require("node:path");

// 场景 11：「她的成长」（Phase 2D-D1）——纪念册的第二条记录线。
//
// 覆盖用户真正会走的路径：
//   首页「她的成长」入口 → 直接落在纪念册的「她的成长」这一页 → 新增一条（含照片）→
//   reload 后还在 → 编辑（保留照片）→ 切换回「我们一起」确认两条线不串 →
//   再切回来 → 删掉 → 一切正常。
//
// 数据只走真实接口 /api/growth-milestones；照片与「我们一起」共用同一套存储。

const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "三年级", semester: "上册" });
const MILESTONE_ENTRY_LABEL = "打开她的成长";
const MILESTONE_TITLE = "第一次自己举手回答问题";
const PHOTO_FIXTURE = path.join(__dirname, "..", "fixtures", "tiny-photo.jpg");

async function seedHomeProfile(page) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: SETTINGS_STORAGE_KEY, profileSnapshot: HOME_PROFILE }
  );
}

function milestoneEntries(page) {
  return page.locator(".milestones__entry", { hasText: MILESTONE_TITLE });
}

test.describe("她的成长", () => {
  test("首页进得来、能记一条带照片的成长记录，并且和「我们一起」分得清楚", async ({ page }) => {
    await seedHomeProfile(page);

    // 首页入口：说的是她自己的成长瞬间，不带任何数字。
    await page.goto("/");
    const homeEntry = page.getByRole("button", { name: MILESTONE_ENTRY_LABEL });

    await expect(homeEntry).toBeVisible();
    await expect(page.locator(".growth-summary__entry", { hasText: "她的成长" })).toContainText("她自己的成长瞬间");

    await homeEntry.click();
    await expect(page).toHaveURL(/#\/growth-book\?tab=milestones/);
    await expect(page.getByRole("heading", { name: "我们的成长纪念册" })).toBeVisible();

    // 直接落在「她的成长」这一页（tab 已选中）。
    await expect(page.getByRole("tab", { name: /她的成长/ })).toHaveAttribute("aria-selected", "true");

    // 空状态 + 「记下第一个瞬间」。
    await expect(page.getByRole("heading", { name: "这一页还是空的" })).toBeVisible();

    await page.getByRole("button", { name: "记下第一个瞬间" }).click();
    await expect(page.getByRole("heading", { name: "记下她的一个成长瞬间" })).toBeVisible();

    // 标题必填。
    await page.getByRole("button", { name: "收进成长纪念册" }).click();
    await expect(page.getByText("给这件事写一个标题吧。")).toBeVisible();

    // 补类别 / 标题 / 记录 / 照片。
    await page.getByRole("radio", { name: /学习课堂/ }).check({ force: true });
    await page.getByLabel("这件事的标题").fill(MILESTONE_TITLE);
    await page.getByLabel("那天发生了什么").fill("举了三次才被叫到，坐下的时候脸都红了。");
    await page.locator(".footprint-photos__input").setInputFiles(PHOTO_FIXTURE);
    await expect(page.locator(".footprint-photos__item")).toHaveCount(1);

    await page.getByRole("button", { name: "收进成长纪念册" }).click();

    await expect(milestoneEntries(page)).toBeVisible();
    await expect(milestoneEntries(page)).toContainText("📚 学习课堂");
    await expect(milestoneEntries(page)).toContainText("举了三次才被叫到");
    await expect(milestoneEntries(page).locator(".milestones__entry-photo-image")).toBeVisible();

    // 照片真的能加载（不是破图）。
    expect(
      await milestoneEntries(page).locator(".milestones__entry-photo-image").evaluate((image) => image.naturalWidth)
    ).toBeGreaterThan(0);

    // 手机上不横向溢出。
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });

    // reload 后：还停在「她的成长」这一页，记录和照片都在。
    await page.reload();
    await expect(page.getByRole("tab", { name: /她的成长/ })).toHaveAttribute("aria-selected", "true");
    await expect(milestoneEntries(page)).toBeVisible();
    await expect(milestoneEntries(page).locator(".milestones__entry-photo-image")).toHaveCount(1);

    // 切到「我们一起」：这里没有她的成长记录（两条线分得清楚），也没有「我们一起」的记录。
    await page.getByRole("tab", { name: /我们一起/ }).click();
    await expect(page).not.toHaveURL(/tab=milestones/);
    await expect(page.locator(".growth-book__entry", { hasText: MILESTONE_TITLE })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "纪念册还是空的" })).toBeVisible();

    // 切回来：记录还在（没有因为切页丢掉）。
    await page.getByRole("tab", { name: /她的成长/ }).click();
    await expect(page).toHaveURL(/tab=milestones/);
    await expect(milestoneEntries(page)).toBeVisible();

    // 编辑：原照片还在，标题改成新的。
    await milestoneEntries(page).getByRole("button", { name: "改一改" }).click();
    await expect(page.getByRole("heading", { name: "修改这条成长记录" })).toBeVisible();
    await expect(page.locator(".footprint-photos__item")).toHaveCount(1);

    await page.getByLabel("这件事的标题").fill("第一次自己举手回答问题（后来常举手了）");
    await page.getByRole("button", { name: "保存修改" }).click();

    const updatedEntry = page.locator(".milestones__entry", { hasText: "后来常举手了" });

    await expect(updatedEntry).toBeVisible();
    await expect(updatedEntry.locator(".milestones__entry-photo-image")).toHaveCount(1);

    await page.reload();
    await expect(page.locator(".milestones__entry", { hasText: "后来常举手了" })).toBeVisible();

    // 删掉：回到空状态，reload 后仍然空。
    await page.locator(".milestones__entry", { hasText: "后来常举手了" }).getByRole("button", { name: "删掉" }).click();
    await expect(page.getByRole("heading", { name: "要把这条成长记录删掉吗？" })).toBeVisible();
    await page.getByRole("button", { name: "删掉这条" }).click();
    await expect(page.getByRole("heading", { name: "这一页还是空的" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "这一页还是空的" })).toBeVisible();
    await expect(page.locator(".milestones__entry-photo-image")).toHaveCount(0);
  });
});
