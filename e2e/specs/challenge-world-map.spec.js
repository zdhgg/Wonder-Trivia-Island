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
// 档案年级只存在 settings.center 里（useSettingsStore），种一份即可驱动大地图高亮。
async function seedProfile(page, profile) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: "wonder-trivia-island.settings.center", profileSnapshot: profile }
  );
}

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

  // 年级视觉层级的回归：我的年级（档案年级对应的上/下册两张）必须有状态 class，
  // 其余年级一张都不能少、也不能点不动。档案年级是通过 settings.center 存的，
  // 这里直接种一份档案，避免依赖首页入口。
  test("档案年级对应的两张岛被突出，其余年级仍可点", async ({ page }) => {
    await seedProfile(page, { grade: "四年级", semester: "上册" });
    await page.goto("/#/challenge/world");

    const currentCards = page.locator(".challenge-world-card--current");
    const otherCards = page.locator(".challenge-world-card--other");

    // 上册 / 下册同属当前年级，正好两张高亮，另外 10 张弱化但都还在。
    await expect(currentCards).toHaveCount(2);
    await expect(otherCards).toHaveCount(10);
    await expect(currentCards.nth(0)).toContainText("四年级 · 上册");
    await expect(currentCards.nth(1)).toContainText("四年级 · 下册");
    await expect(currentCards.first().locator(".challenge-world-card__own-badge")).toHaveText("我的年级");
    await expect(otherCards.first().locator(".challenge-world-card__own-badge")).toHaveCount(0);

    // 12 张卡的顺序不变：仍然是一年级上册 → 六年级下册。
    await expect(page.locator(".challenge-world-card__grade-tag")).toHaveText([
      "一年级 · 上册",
      "一年级 · 下册",
      "二年级 · 上册",
      "二年级 · 下册",
      "三年级 · 上册",
      "三年级 · 下册",
      "四年级 · 上册",
      "四年级 · 下册",
      "五年级 · 上册",
      "五年级 · 下册",
      "六年级 · 上册",
      "六年级 · 下册"
    ]);

    // 弱化不能压低整卡到点不动：其他年级 hover 依然有浮起反馈，且能点进闯关页。
    await otherCards.first().hover();
    await expect
      .poll(async () => otherCards.first().evaluate((el) => getComputedStyle(el).transform))
      .not.toBe("none");
    await otherCards.first().click();
    await expect(page).toHaveURL(/#\/challenge$/);
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();
  });

  // 高亮必须跟着档案年级走，不能写死。
  test("换档案年级后高亮跟着换到新年级", async ({ page }) => {
    await seedProfile(page, { grade: "五年级", semester: "下册" });
    await page.goto("/#/challenge/world");

    await expect(page.locator(".challenge-world-card--current")).toHaveCount(2);
    await expect(page.locator(".challenge-world-card--current").nth(0)).toContainText("五年级 · 上册");
    await expect(page.locator(".challenge-world-card--current").nth(1)).toContainText("五年级 · 下册");
    // 四年级的两张退回普通状态，不会残留高亮。
    await expect(page.locator(".challenge-world-card").filter({ hasText: "四年级 · 上册" })).toHaveClass(
      /challenge-world-card--other/
    );
  });

  // 档案年级异常（这里是种进 localStorage 的"七年级"）时不能把 12 张卡一起弱化。
  test("档案年级异常时不做弱化，12 张卡照常展示可点", async ({ page }) => {
    await seedProfile(page, { grade: "七年级", semester: "上册" });
    await page.goto("/#/challenge/world");

    await expect(page.locator(".challenge-world-card")).toHaveCount(12);
    await expect(page.locator(".challenge-world-card--current")).toHaveCount(0);
    await expect(page.locator(".challenge-world-card--other")).toHaveCount(0);
  });
});
