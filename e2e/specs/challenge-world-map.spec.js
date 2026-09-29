const { test, expect } = require("@playwright/test");

// 场景：奇妙世界大地图（challenge-world）样式与交互回归。
//
// 背景：这页的全部样式规则曾在 v1.4.0 发布提交中被整块删除，
// 结果 12 张岛卡退化成左侧全宽纵向列表：没有网格、没有 cursor、
// 没有 hover 反馈，肉眼看起来像“整页不可点”。
// 这两条断言正是当时的 Regression 锚点：布局必须是网格，卡片必须可以点。
//
// 说明：直接深链 /#/challenge/world，不依赖首页入口或localStorage 进度，
// 12 张岛卡来自静态章节配置，纯前端即可渲染。
test.describe("奇妙世界大地图", () => {
  // 每次从干净的本地进度开始，避免上次跑测试留下的章节进度影响点击目标。
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
  });

  test("岛卡保持网格布局且可以点进闯关页", async ({ page }) => {
    await page.goto("/#/challenge/world");
    await expect(page.getByRole("heading", { name: "奇妙世界大地图" })).toBeVisible();

    // 12 张岛卡都在，纵向退化立即现形：每张卡都要是真的网格单元（同排等高且多列）。
    const continentGrid = page.locator(".challenge-world__continents");
    const cards = page.locator(".challenge-world-card");
    await expect(cards).toHaveCount(12);

    const gridState = await continentGrid.evaluate((el) => {
      const style = getComputedStyle(el);
      const first = el.children[0].getBoundingClientRect();
      const second = el.children[1].getBoundingClientRect();

      return {
        display: style.display,
        columns: style.gridTemplateColumns.split(" ").length,
        cursor: getComputedStyle(el.children[0]).cursor,
        // 退化成单列时，前两张卡会更靠左/更宽；这里是双列以上的形状。
        firstTop: first.top,
        firstLeft: first.left,
        firstWidth: first.width,
        secondLeft: second.left,
        sameRow: Math.abs(first.top - second.top) < 2
      };
    });

    expect(gridState.display).toBe("grid");
    expect(gridState.columns).toBeGreaterThan(1);
    expect(gridState.sameRow).toBe(true);
    expect(gridState.firstWidth).toBeLessThan(500);
    expect(gridState.cursor).toBe("pointer");

    // 卡片视觉反馈仍然存在：hover 有位移（v1.4.0 删掉的正是 hover 浮起）。
    await cards.first().hover();
    await expect
      .poll(async () =>
        cards.first().evaluate((el) => getComputedStyle(el).transform)
      )
      .not.toBe("none");

    // 真实点击第一张岛卡：跳到这一章的闯关地图。
    await cards.first().click();
    await expect(page).toHaveURL(/#\/challenge$/);
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();
  });

  test("窄屏时岛卡退回单列但仍是网格", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto("/#/challenge/world");
    await expect(page.getByRole("heading", { name: "奇妙世界大地图" })).toBeVisible();

    const narrowState = await page.locator(".challenge-world__continents").evaluate((el) => {
      const style = getComputedStyle(el);
      const cards = [...el.children].map((child) => child.getBoundingClientRect());

      return {
        display: style.display,
        columns: style.gridTemplateColumns.split(" ").length,
        // minmax(260px, 1fr) 在 480px 视口下应只剩一列。
        firstTop: cards[0].top,
        firstLeft: cards[0].left,
        secondLeft: cards[1]?.left ?? 0,
        stacked: cards[1] ? cards[1].top > cards[0].top : true
      };
    });

    expect(narrowState.display).toBe("grid");
    expect(narrowState.columns).toBe(1);
    expect(narrowState.secondLeft).toBe(narrowState.firstLeft);
    expect(narrowState.stacked).toBe(true);
  });
});
