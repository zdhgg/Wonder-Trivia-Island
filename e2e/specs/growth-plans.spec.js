const { test, expect } = require("@playwright/test");

// 场景 9：「下次我们一起做什么」（Phase 2D-B1）。
//
// 覆盖一条完整的真实路径：
//   首页入口 → 挑一条推荐加入 → 自己新增一件 → reload 后还在 →
//   完成其中一件（补日期 / 类别 / 标签 / 一句记录）→ 它从清单消失 →
//   reload 后清单里不再有它，纪念册里能看到它。
//
// 数据只走真实接口 /api/growth-plans：完成时由服务端在一个事务里写足迹 + 删想做，
// 所以「清单里没了 / 纪念册里有了」两件事在同一个请求里成立。

const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "三年级", semester: "上册" });
const HOME_ENTRY_LABEL = "打开下次我们一起做什么";
const CUSTOM_PLAN_TITLE = "一起去看一次海";

async function seedHomeProfile(page) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: SETTINGS_STORAGE_KEY, profileSnapshot: HOME_PROFILE }
  );
}

async function openPlansFromHome(page) {
  await page.goto("/");
  await page.getByRole("button", { name: HOME_ENTRY_LABEL }).click();
  await expect(page).toHaveURL(/#\/growth-plans/);
  await expect(page.getByRole("heading", { name: "下次我们一起做什么" })).toBeVisible();
}

test.describe("下次我们一起做什么", () => {
  test("挑推荐、自己新增、完成一件并变成纪念册里的一条记录", async ({ page }) => {
    await seedHomeProfile(page);

    // 首页入口：文案是「想一起做点什么」的语气，不报条数。
    await page.goto("/");
    const homeEntry = page.getByRole("button", { name: HOME_ENTRY_LABEL });

    await expect(homeEntry).toBeVisible();
    await expect(page.locator(".growth-summary__entry", { hasText: "下次我们一起做什么" })).toContainText(
      "想一起做点什么"
    );

    await homeEntry.click();
    await expect(page).toHaveURL(/#\/growth-plans/);
    await expect(page.getByRole("heading", { name: "下次我们一起做什么" })).toBeVisible();

    // 一开始清单是空的，但推荐已经看得见。
    await expect(page.getByText("还没有想好下次一起做什么")).toBeVisible();
    await expect(page.getByRole("tab", { name: /一起探索/ })).toBeVisible();
    await expect(page.locator(".growth-plans__activity").first()).toBeVisible();

    // 六个分组都能切换，每组都有自己的推荐。
    for (const groupLabel of ["一起动手", "一起出门", "一起生活", "一起聊天", "一起学点东西"]) {
      await page.getByRole("tab", { name: new RegExp(groupLabel) }).click();
      await expect(page.locator(".growth-plans__activity").first()).toBeVisible();
    }

    // 手机屏幕能正常用（这一页在 390 下不横向溢出）。
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("tab", { name: /一起探索/ })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });

    // 加入一条推荐：按钮变成「已经在想一起做里」，清单里出现这条。
    await page.getByRole("tab", { name: /一起探索/ }).click();
    await page.locator(".growth-plans__activity", { hasText: "一起看星星" }).getByRole("button").click();
    await expect(page.locator(".growth-plans__plan", { hasText: "一起看星星" })).toBeVisible();
    await expect(page.locator(".growth-plans__activity", { hasText: "一起看星星" }).getByRole("button")).toHaveText(
      "已经在想一起做里"
    );

    // 自己新增一件：只写名字就能放进去。
    await page.getByRole("button", { name: "我想做一件别的事" }).click();
    await page.getByRole("button", { name: "放进想一起做" }).click();
    await expect(page.getByText("给这件事写一个标题吧。")).toBeVisible();

    await page.getByLabel("想一起做什么").fill(CUSTOM_PLAN_TITLE);
    await page.getByRole("button", { name: "放进想一起做" }).click();
    await expect(page.locator(".growth-plans__plan", { hasText: CUSTOM_PLAN_TITLE })).toBeVisible();

    // reload 后两件都还在。
    await page.reload();
    await expect(page.locator(".growth-plans__plan", { hasText: "一起看星星" })).toBeVisible();
    await expect(page.locator(".growth-plans__plan", { hasText: CUSTOM_PLAN_TITLE })).toBeVisible();

    // 完成自己新增的那件：补日期（默认今天就好）、类别、标签、一句记录。
    await page.locator(".growth-plans__plan", { hasText: CUSTOM_PLAN_TITLE }).getByRole("button", { name: "完成啦" }).click();
    await expect(page.getByRole("heading", { name: CUSTOM_PLAN_TITLE })).toBeVisible();

    await page.getByRole("radio", { name: /一起出门/ }).check({ force: true });
    await page.getByRole("button", { name: /第一次/ }).click();
    await page.getByLabel("一句记录").fill("风很大，海浪打在脚上。");
    await page.getByRole("button", { name: "收进成长纪念册" }).click();

    // 收进纪念册后立刻从清单里消失，并给出「去哪儿找它」的提示。
    await expect(page.locator(".growth-plans__plan", { hasText: CUSTOM_PLAN_TITLE })).toHaveCount(0);
    await expect(page.locator(".growth-plans__done")).toContainText("已经收进成长纪念册了");
    await expect(page.locator(".growth-plans__plan", { hasText: "一起看星星" })).toBeVisible();

    // reload：清单里不再有它，但「一起看星星」还在。
    await page.reload();
    await expect(page.locator(".growth-plans__plan", { hasText: CUSTOM_PLAN_TITLE })).toHaveCount(0);
    await expect(page.locator(".growth-plans__plan", { hasText: "一起看星星" })).toBeVisible();

    // 纪念册里能看到它，而且带着刚才补的标签和记录。
    await page.locator(".growth-plans__hero").getByRole("button", { name: /成长纪念册/ }).click();
    await expect(page).toHaveURL(/#\/growth-book/);

    const footprintEntry = page.locator(".growth-book__entry", { hasText: CUSTOM_PLAN_TITLE });

    await expect(footprintEntry).toBeVisible();
    await expect(footprintEntry).toContainText("风很大，海浪打在脚上。");
    await expect(footprintEntry).toContainText("🌳 一起出门");
    await expect(footprintEntry).toContainText("✨ 第一次");

    // 最后：不做了也能直接从清单里拿掉（不写纪念册）。
    await page.locator(".growth-book__hero").getByRole("button", { name: "返回首页" }).click();
    await page.getByRole("button", { name: HOME_ENTRY_LABEL }).click();
    await expect(page.locator(".growth-plans__plan", { hasText: "一起看星星" })).toBeVisible();
    await page.locator(".growth-plans__plan", { hasText: "一起看星星" }).getByRole("button", { name: "不做了" }).click();
    await expect(page.getByText("还没有想好下次一起做什么")).toBeVisible();
  });
});
