const { randomUUID } = require("node:crypto");
const { test, expect } = require("@playwright/test");

// 首页「进入另一个页面」的那一声轻短音效。
//
// 这一组锁的是四件事：
//   1) 第一次点入口：这一枚 click 自己就是合法手势，解锁成功后响一声；
//   2) 之后再点：仍然是"一次点击一声"，不会叠成两层；
//   3) 用户静音后点：保持安静，而且不偷偷恢复音量 / 打开声音开关；
//   4) 短音效不牵动持续 BGM：首页始终没有持续音乐，进知识岛才起播、离岛就停。
//
// 探针用 Audio 替身按素材 URL 分桶，所以"响了几次"是可数的，
// 而且不需要往生产代码里塞任何测试专用入口。

const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const HOME_PROFILE = Object.freeze({ displayName: "小探险家", grade: "三年级", semester: "上册" });
const BACKPACK_OPEN_LABEL = "打开我的探险收藏册，查看印章、航海收藏和成就";
const BACKPACK_CLOSE_LABEL = "关闭我的探险收藏册";
const ISLAND_ENTRY_TEXT = "我的知识岛";
const ISLAND_REGION = "我的知识岛";

// 数「短音效」这一个素材：建过几个元素、真的 play 过几次。
async function installCueProbe(page) {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const probe = { created: 0, playCalls: 0 };

    window.__entryCueProbe = probe;

    window.Audio = class ProbedAudio extends NativeAudio {
      constructor(source) {
        super(source);

        const url = typeof source === "string" ? source : "";

        if (!url.includes("sfx-toggle")) {
          return;
        }

        probe.created += 1;

        const nativePlay = this.play.bind(this);

        this.play = (...args) => {
          probe.playCalls += 1;
          return nativePlay(...args);
        };
      }
    };
  });
}

async function readCueProbe(page) {
  return page.evaluate(() => {
    const probe = window.__entryCueProbe || { created: 0, playCalls: 0 };

    return { created: probe.created, playCalls: probe.playCalls };
  });
}

// 引擎侧的真实状态：解锁标记 + 持续 BGM 有没有起来。
async function readEngineState(page) {
  return page.evaluate(async () => {
    const engine = await import("/src/audio/audioEngine.js");

    return {
      unlocked: engine.isAudioEngineUnlocked(),
      bgmPlaying: engine.isBackgroundMusicPlaying(),
      bgmSuppressed: engine.isBackgroundMusicSuppressed(),
      bgmStartCount: engine.getBackgroundMusicStartCount()
    };
  });
}

// 右上角那颗全站声音按钮。
function soundButton(page) {
  return page.locator("button.site-nav__quick-button--audio");
}

async function seedHome(page) {
  await page.addInitScript(
    ({ settingsKey, profileSnapshot }) => {
      window.localStorage.setItem(settingsKey, JSON.stringify({ profile: profileSnapshot }));
    },
    { settingsKey: SETTINGS_STORAGE_KEY, profileSnapshot: HOME_PROFILE }
  );
  await page.context().addCookies([
    {
      name: PROFILE_COOKIE_NAME,
      value: randomUUID(),
      url: "http://127.0.0.1:3101",
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
  await page.goto("/");
  await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });
}

function backpackEntry(page) {
  return page.getByRole("button", { name: BACKPACK_OPEN_LABEL });
}

async function closeBackpackIfOpen(page) {
  const closeButton = page.getByRole("button", { name: BACKPACK_CLOSE_LABEL });

  if (await closeButton.isVisible()) {
    await closeButton.click();
    await closeButton.waitFor({ state: "hidden", timeout: 10_000 });
  }
}

test.describe("首页入口点击音效", () => {
  test("第一次点入口：这一枚 click 自己完成解锁，并响一次短音效", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await installCueProbe(page);
    await seedHome(page);

    // 此刻还没发生过任何交互：引擎未解锁，一声也没有。
    const before = await readEngineState(page);

    expect(before.unlocked).toBe(false);
    expect((await readCueProbe(page)).playCalls).toBe(0);

    await backpackEntry(page).click();
    await page.getByRole("dialog", { name: "我的探险收藏册" }).waitFor({ state: "visible", timeout: 10_000 });

    // 点击之后：解锁成功，而且正好响了一声。
    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(1);
    const after = await readEngineState(page);

    expect(after.unlocked).toBe(true);
    // 关键约束：短音效绝不把持续 BGM 带起来 —— 首页本来就不该有持续音乐。
    expect(after.bgmPlaying).toBe(false);
    expect(after.bgmStartCount).toBe(0);
    expect(consoleErrors).toEqual([]);

    await closeBackpackIfOpen(page);
  });

  test("之后再点入口：每次仍然只有一声，不叠播", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);

    // 连点三轮，每一轮都要精确地只多一声。
    for (let round = 1; round <= 3; round += 1) {
      await backpackEntry(page).click();
      await page.getByRole("dialog", { name: "我的探险收藏册" }).waitFor({ state: "visible", timeout: 10_000 });

      // 一次点击 = 一次 playCalls。写成"精确等于"而不是"大于 0"，
      // 才能真的抓住"一次点击叠了两声"这种回归。
      await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(round);
      expect((await readCueProbe(page)).playCalls, `第 ${round} 次点击后多响了`).toBe(round);

      await closeBackpackIfOpen(page);
    }

    const probe = await readCueProbe(page);

    expect(probe.playCalls).toBe(3);
    // 三次点击 = 三个各自只 play 过一次的元素，不是同一个元素被反复 play。
    expect(probe.created).toBe(3);
  });

  test("用户静音后点入口：保持安静，且不恢复音量、不打开声音开关", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);

    // 先响一声把引擎解锁，这样后面静音才有"从有声到无声"这个前提。
    await backpackEntry(page).click();
    await page.getByRole("dialog", { name: "我的探险收藏册" }).waitFor({ state: "visible", timeout: 10_000 });
    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(1);
    await closeBackpackIfOpen(page);

    // 静音。
    await soundButton(page).click();
    await expect(soundButton(page)).toHaveAccessibleName(/静音/);

    const mutedPreferences = await page.evaluate(async () => {
      const store = (await import("/src/stores/useAudioStore.js")).useAudioStore();

      return {
        masterVolume: store.masterVolume,
        musicEnabled: store.musicEnabled,
        sfxEnabled: store.sfxEnabled
      };
    });

    expect(mutedPreferences.masterVolume).toBe(0);
    expect(mutedPreferences.sfxEnabled).toBe(false);

    // 静音状态下再点两次入口：必须一声都不出。
    await backpackEntry(page).click();
    await page.getByRole("dialog", { name: "我的探险收藏册" }).waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(500);
    await closeBackpackIfOpen(page);

    await backpackEntry(page).click();
    await page.getByRole("dialog", { name: "我的探险收藏册" }).waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(500);

    const probe = await readCueProbe(page);

    expect(probe.playCalls).toBe(1);
    expect(probe.created).toBe(1);

    // 静音不能被"点入口"偷偷撤销：音量与开关都保持原样。
    const afterClick = await page.evaluate(async () => {
      const store = (await import("/src/stores/useAudioStore.js")).useAudioStore();

      return {
        masterVolume: store.masterVolume,
        musicEnabled: store.musicEnabled,
        sfxEnabled: store.sfxEnabled
      };
    });

    expect(afterClick.masterVolume).toBe(0);
    expect(afterClick.musicEnabled).toBe(false);
    expect(afterClick.sfxEnabled).toBe(false);
  });

  test("普通页面没有持续音乐；进知识岛才起播，离岛立刻停", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);

    // 解锁 + 一声短音效，但首页始终没有持续 BGM。
    await backpackEntry(page).click();
    await page.getByRole("dialog", { name: "我的探险收藏册" }).waitFor({ state: "visible", timeout: 10_000 });
    await closeBackpackIfOpen(page);

    await expect.poll(async () => (await readEngineState(page)).unlocked).toBe(true);

    const onHome = await readEngineState(page);

    expect(onHome.bgmPlaying).toBe(false);
    expect(onHome.bgmSuppressed).toBe(true);
    expect(onHome.bgmStartCount).toBe(0);

    const cueBeforeIsland = (await readCueProbe(page)).playCalls;

    // 进知识岛：入口那一声 + 知识岛自己的持续 BGM / 环境声。
    await page.locator(".growth-summary button", { hasText: ISLAND_ENTRY_TEXT }).first().click();
    await page.getByRole("region", { name: ISLAND_REGION }).first().waitFor({ state: "visible", timeout: 15_000 });

    await expect.poll(async () => (await readEngineState(page)).bgmPlaying).toBe(true);
    // 知识岛入口也只多响一声短音效。
    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(cueBeforeIsland + 1);

    // 离岛：持续 BGM 立刻停。
    await page.getByRole("button", { name: "返回首页" }).click();
    await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

    await expect.poll(async () => (await readEngineState(page)).bgmPlaying).toBe(false);
  });
});

// 二级页面的入口同样要有一声。
//
// 这里是首页之外的覆盖面：大地图的岛卡、闯关地图的关卡、顶栏导航。
// 特别要防的是"一次点击响两声"——因为这些入口和首页的入口最终汇流到
// 同一批导航函数，万一在函数里也挂了音效就会叠起来。所以下面一律断言
// **精确的累计次数**，而不是"至少响了一次"。
test.describe("二级页面入口点击音效", () => {
  const WORLD_MAP_URL = "/#/challenge/world";

  async function openWorldMap(page) {
    // 深链只是"把页面摆出来"，本身不是一次点击，不应该产生任何声音。
    await page.goto(WORLD_MAP_URL);
    await page.getByRole("heading", { name: "奇妙世界大地图" }).waitFor({ state: "visible", timeout: 15_000 });

    return page.locator(".challenge-world-card");
  }

  test("大地图：点一张岛卡只响一声，并进到闯关地图", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);
    await openWorldMap(page);

    // 刚打开时还没有发生过任何交互：一个声音都没有。
    expect((await readCueProbe(page)).playCalls).toBe(0);

    await page.locator(".challenge-world-card").first().click();

    // 这一枚 click 自己完成解锁，并且只响一声。
    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(1);
    await page.getByRole("heading", { name: "奇妙海岛闯关" }).waitFor({ state: "visible", timeout: 15_000 });

    // 普通页面不播放持续 BGM：这里只是闯关地图，不是知识岛。
    const state = await readEngineState(page);

    expect(state.bgmPlaying).toBe(false);
    expect(state.bgmStartCount).toBe(0);
  });

  test("闯关地图：点一站关卡只多一声", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);
    await openWorldMap(page);

    await page.locator(".challenge-world-card").first().click();
    await page.getByRole("heading", { name: "奇妙海岛闯关" }).waitFor({ state: "visible", timeout: 15_000 });
    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(1);

    // 找一站已解锁的关（锁定站会弹提示，不该走这一声）。
    const unlockedStage = page.locator(".challenge-node:not(.challenge-node--locked)").first();

    await expect(unlockedStage).toBeVisible();
    await unlockedStage.click();

    // 精确 +1：证明这一声是"这一枚点击"的，既没漏响，也没有叠成两声。
    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(2);
  });

  test("二级页面顶栏：点「返回首页」响一声", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);
    await openWorldMap(page);

    expect((await readCueProbe(page)).playCalls).toBe(0);

    await page.getByRole("button", { name: "返回首页" }).click();
    await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(1);
  });

  test("二级页面在静音状态下：点岛卡仍然一声不出", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);
    await openWorldMap(page);

    // 先静音，再点。引擎从未解锁过，所以这一声必须彻底没有。
    await soundButton(page).click();
    await expect(soundButton(page)).toHaveAccessibleName(/静音/);

    await page.locator(".challenge-world-card").first().click();
    await page.getByRole("heading", { name: "奇妙海岛闯关" }).waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(500);

    const probe = await readCueProbe(page);

    expect(probe.playCalls).toBe(0);
    expect(probe.created).toBe(0);

    // 静音也没有被这次点击撤销。
    const preferences = await page.evaluate(async () => {
      const store = (await import("/src/stores/useAudioStore.js")).useAudioStore();

      return { masterVolume: store.masterVolume, sfxEnabled: store.sfxEnabled };
    });

    expect(preferences.masterVolume).toBe(0);
    expect(preferences.sfxEnabled).toBe(false);
  });

  test("知识岛的「返回首页」也响一声，且离岛后持续音乐停掉", async ({ page }) => {
    await installCueProbe(page);
    await seedHome(page);

    // 进知识岛：先响一声入口音，再起持续 BGM。
    await page.locator(".growth-summary button", { hasText: ISLAND_ENTRY_TEXT }).first().click();
    await page.getByRole("region", { name: ISLAND_REGION }).first().waitFor({ state: "visible", timeout: 15_000 });
    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(1);
    await expect.poll(async () => (await readEngineState(page)).bgmPlaying).toBe(true);

    // 离岛按钮：只多一声短音效，BGM 随即停掉。
    await page.getByRole("button", { name: "返回首页" }).click();
    await page.getByRole("region", { name: "我的成长" }).waitFor({ state: "visible", timeout: 15_000 });

    await expect.poll(async () => (await readCueProbe(page)).playCalls).toBe(2);
    await expect.poll(async () => (await readEngineState(page)).bgmPlaying).toBe(false);
  });
});
