const { test, expect } = require("@playwright/test");

// 场景 1：Router 第一阶段（tools / settings 迁入 RouterView）的回归保护。
// 这些断言正是上一轮只能靠人工浏览器烟测发现的风险点。
const HOME_ENTRY = /^自由练习/;
// 分栏导航的 aria-label 挂在 <aside> 上（role=complementary），里面的 <nav> 本身没有名字。
const TOOLS_NAV_NAME = "工具导航";
const SETTINGS_NAV_NAME = "设置导航";

test.describe("工具台与设置页的路由状态", () => {
  test("从首页进入工具台：切换分栏、刷新恢复、后退返回", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: HOME_ENTRY })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "工具" }).click();

    // 规范路由 + 工具台真实渲染
    await expect(page).toHaveURL(/#\/tools\/catalog$/);
    await expect(page.getByRole("heading", { name: "工具台", exact: true })).toBeVisible();

    const toolsNav = page.getByRole("complementary", { name: TOOLS_NAV_NAME });
    const catalogLink = toolsNav.getByRole("link", { name: /^题库/ });
    const importLink = toolsNav.getByRole("link", { name: /^导入/ });

    await expect(catalogLink).toHaveAttribute("aria-current", "location");

    // 切换分栏：URL 与激活分栏保持同步
    await importLink.click();
    await expect(page).toHaveURL(/#\/tools\/import$/);
    await expect(importLink).toHaveAttribute("aria-current", "location");
    await expect(page.getByRole("heading", { name: "待确认批次", exact: true })).toBeVisible();

    // 刷新后分栏仍然正确恢复（深链接可恢复）
    await page.reload();
    await expect(page).toHaveURL(/#\/tools\/import$/);
    await expect(page.getByRole("heading", { name: "工具台", exact: true })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: TOOLS_NAV_NAME }).getByRole("link", { name: /^导入/ })
    ).toHaveAttribute("aria-current", "location");

    // 后退回到进入工具台之前的页面（首页）
    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("button", { name: HOME_ENTRY })).toBeVisible();
  });

  test("非法工具分栏自动收敛到规范 URL", async ({ page }) => {
    await page.goto("/#/tools/nope");

    await expect(page).toHaveURL(/#\/tools\/catalog$/);
    await expect(page.getByRole("heading", { name: "工具台", exact: true })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: TOOLS_NAV_NAME }).getByRole("link", { name: /^题库/ })
    ).toHaveAttribute("aria-current", "location");
  });

  test("设置页深链接直接恢复到指定分栏", async ({ page }) => {
    const settingsNav = page.getByRole("complementary", { name: SETTINGS_NAV_NAME });

    await page.goto("/#/settings/audio");

    await expect(page.getByRole("heading", { name: "设置", exact: true })).toBeVisible();
    await expect(page.getByText("当前：声音")).toBeVisible();
    await expect(settingsNav.getByRole("link", { name: "声音", exact: true })).toHaveAttribute(
      "aria-current",
      "location"
    );

    // 刷新后仍停在同一个分栏
    await page.reload();
    await expect(page).toHaveURL(/#\/settings\/audio$/);
    await expect(page.getByText("当前：声音")).toBeVisible();
  });
});
