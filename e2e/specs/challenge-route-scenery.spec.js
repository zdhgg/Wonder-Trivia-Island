const { test, expect } = require("@playwright/test");

// 场景：奇妙海岛闯关（/#/challenge）路线页的场景装饰回归。
//
// 背景：这页原先的"装饰"是一条 .challenge-route::after 伪元素，
// content 是一串 emoji，用 left:50% + translateX(-50%) + letter-spacing:48px
// 钉在地图正下方中央。容器为了给它腾地方留了 220px 底部内边距，
// 结果就是：卡片挤在上半部分、下面一大片空白，中间浮着一排看不出
// 和 7 个关卡有什么关系的小图标。
// 这次把它换成按路线分区的三层景观（远景 / 分区中景 / 前景浪花），
// 下面这几条断言就是防止它退回去的锚点。
//
// 说明：直接深链 /#/challenge，不依赖首页入口；
// 每次清空 localStorage，从"只有第 1 站解锁"的干净进度开始。

const SCENERY_LAYERS = [
  ".challenge-route__backdrop",
  ".challenge-route__scenery",
  ".challenge-route__shore"
];

test.describe("闯关路线场景装饰", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
  });

  // 装饰层的根本底线：它铺满了整张地图（inset:0），一旦有人日后把
  // pointer-events 删掉或者漏写，卡片就会被这层透明容器吃掉点击。
  test("装饰层不接受任何 pointer event", async ({ page }) => {
    await page.goto("/#/challenge");
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();

    const pointerState = await page.evaluate((selectors) => {
      return selectors.map((selector) => {
        const layers = [...document.querySelectorAll(selector)];
        return {
          selector,
          count: layers.length,
          pointerEvents: layers.map((el) => getComputedStyle(el).pointerEvents)
        };
      });
    }, SCENERY_LAYERS);

    for (const layer of pointerState) {
      expect(layer.count, `${layer.selector} 应该存在`).toBeGreaterThan(0);
      for (const value of layer.pointerEvents) {
        expect(value, `${layer.selector} 必须 pointer-events:none`).toBe("none");
      }
    }
  });

  // 比"样式写了 none"更强的断言：直接问浏览器命中测试。
  // 每张关卡卡片的中心点，命中的必须是自己（或它的子元素），
  // 绝不能是任何一层装饰。
  test("每张关卡卡片的命中测试都落在卡片自己身上", async ({ page }) => {
    await page.goto("/#/challenge");
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();

    const hitResults = await page.evaluate(() => {
      return [...document.querySelectorAll(".challenge-node")].map((card) => {
        const box = card.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return {
          order: card.querySelector(".challenge-node__index")?.textContent?.trim() ?? "",
          hitsSelf: Boolean(hit && (hit === card || card.contains(hit))),
          hitClass: hit?.className ?? ""
        };
      });
    });

    expect(hitResults).toHaveLength(7);
    for (const result of hitResults) {
      expect(result.hitsSelf, `第 ${result.order} 的中心点被 ${result.hitClass} 挡住了`).toBe(true);
    }
  });

  // 装饰必须和路线挂钩：每一段景观横向对齐它负责的那几站，
  // 且不越界去压别的站。这条正是"随机散落贴纸"的反面。
  test("每段景观横向对齐它负责的站点", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/#/challenge");
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();

    const zoneMap = await page.evaluate(() => {
      const zones = [...document.querySelectorAll(".challenge-scenery-zone")];
      if (zones.some((zone) => getComputedStyle(zone).display === "none")) return null;

      const cards = [...document.querySelectorAll(".challenge-node")].map((card) => {
        const box = card.getBoundingClientRect();
        return { center: box.left + box.width / 2 };
      });

      return zones.map((zone) => {
        const box = zone.getBoundingClientRect();
        return {
          stations: zone.dataset.stations,
          left: box.left,
          right: box.right,
          ownCenters: cards
            .map((card, index) => ({ order: index + 1, center: card.center }))
            .filter((card) => card.center >= box.left && card.center <= box.right)
            .map((card) => card.order)
        };
      });
    });

    expect(zoneMap, "宽屏下分区景观应该存在").not.toBeNull();
    expect(zoneMap.map((zone) => zone.stations)).toEqual(["1-2", "3-4", "5-6", "7"]);

    // 每一段正好罩住自己的站点，一站不多一站不少。
    const expected = { "1-2": [1, 2], "3-4": [3, 4], "5-6": [5, 6], "7": [7] };
    for (const zone of zoneMap) {
      expect(zone.ownCenters, `第 ${zone.stations} 段景观的横向范围`).toEqual(expected[zone.stations]);
    }
  });

  // 7 张卡一张不少、顺序不变，装饰不能把任何一站挤走或挤没。
  test("7 个关卡位置与顺序保持不变", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/#/challenge");
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();

    const cards = page.locator(".challenge-node");
    await expect(cards).toHaveCount(7);
    await expect(page.locator(".challenge-node__index")).toHaveText([
      "第 1 站",
      "第 2 站",
      "第 3 站",
      "第 4 站",
      "第 5 站",
      "第 6 站",
      "第 7 站"
    ]);

    // 卡片必须仍在路线网格里，而不是被装饰压成不可点的背景。
    const cardState = await cards.first().evaluate((el) => {
      const style = getComputedStyle(el);
      return { position: style.position, zIndex: style.zIndex, cursor: style.cursor };
    });
    expect(cardState.position).toBe("relative");
    expect(Number(cardState.zIndex)).toBeGreaterThan(0);
    expect(cardState.cursor).toBe("pointer");
  });

  // 真实点击：装饰铺在卡片下方，但点击依然要进到答题页。
  test("真实点击第 1 站仍然进入答题页", async ({ page }) => {
    await page.goto("/#/challenge");
    await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();

    // 卡片自带一个无限循环的 float-island-gentle 浮动动画，Playwright 的
    // actionability 会一直判定"元素不稳定"而拒绝点击。
    // 这里只冻结这一个既有动画（不改任何布局），让点击走正常的可操作性
    // 检查——包括"该点确实能收到事件"这一项，正是拦截检测的关键。
    // 刻意不用 force:true：force 会连"事件是否真的落在卡片上"一起跳过。
    await page.addStyleTag({
      content: ".challenge-node { animation: none !important; }"
    });

    // 干净进度下只有第 1 站是当前关，可以直接进。
    const firstStage = page.locator(".challenge-node").first();
    await expect(firstStage).toContainText("第 1 站");
    await firstStage.click();

    await expect(page).toHaveURL(/#\/quiz\?/);
    // 不只是"进了答题页"，还要确认进的是第 1 关这一关。
    await expect(page).toHaveURL(/[?&]stage=stage-1\b/);
    await expect(page.getByText(/第 1 关 ·/).first()).toBeVisible();
    await expect(page.getByLabel(/答题进度/)).toBeVisible();
  });

  // 宽屏和窄屏都不能被装饰撑出横向溢出。
  test("宽屏与窄屏都没有横向溢出", async ({ page }) => {
    for (const width of [1440, 1100, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/#/challenge");
      await expect(page.getByRole("heading", { name: "奇妙海岛闯关" })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));

      expect(
        overflow.scrollWidth,
        `${width}px 下出现了横向溢出（${overflow.scrollWidth} > ${overflow.clientWidth}）`
      ).toBeLessThanOrEqual(overflow.clientWidth);
    }
  });
});
