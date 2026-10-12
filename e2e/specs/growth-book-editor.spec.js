const { test, expect } = require("@playwright/test");
const path = require("node:path");
const PHOTO = path.join(__dirname, "..", "fixtures", "tiny-photo.jpg");
const entry = (page, title) => page.getByRole("article", { name: title, exact: true });
async function openBook(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("wonder-trivia-island.settings.center", JSON.stringify({ profile: { displayName: "小探险家", grade: "三年级", semester: "上册" } })));
  await page.goto("/#/growth-book");
  await expect(page.getByRole("heading", { name: "纪念册还是空的" })).toBeVisible();
}
async function quickCreate(page, title) {
  await page.getByRole("button", { name: "记一笔", exact: true }).click();
  await page.getByLabel("一句话记下这件事").fill(title);
  await page.getByRole("button", { name: "收进纪念册", exact: true }).click();
  await expect(entry(page, title)).toBeVisible();
}

test("全部页快速记录、原地编辑，补记旧月份后展开并定位", async ({ page }, testInfo) => {
  await openBook(page);
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("book-empty.png") });
  await page.getByRole("button", { name: "记一笔", exact: true }).click();
  await expect(page.getByLabel("一句话记下这件事")).toBeFocused();
  await expect(page.getByLabel("那天发生了什么（可选）")).toHaveCount(0);
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("book-editor.png") });
  await page.getByLabel("一句话记下这件事").fill("一起在公园找到了四叶草");
  await page.getByRole("button", { name: "收进纪念册", exact: true }).click();
  await expect(entry(page, "一起在公园找到了四叶草")).toBeFocused();
  await quickCreate(page, "一件很久以前的小事");
  await entry(page, "一件很久以前的小事").getByRole("button", { name: "改一改" }).click();
  await expect(page).not.toHaveURL(/tab=/);
  await page.getByLabel("哪一天", { exact: true }).fill("2020-05-02");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  const oldMonth = page.locator(".book-month", { hasText: "2020 年 5 月" });
  await expect(oldMonth).toHaveAttribute("open", "");
  await expect(entry(page, "一件很久以前的小事")).toBeFocused();
  await oldMonth.locator("summary").click();
  await expect(oldMonth).not.toHaveAttribute("open");
  // 同一旧月份再次补记，也要重新展开，且最新月保持可见。
  await page.getByRole("button", { name: "记一笔", exact: true }).click();
  await page.getByLabel("一句话记下这件事").fill("第一次一起做了纸风车");
  await page.getByLabel("哪一天", { exact: true }).fill("2020-05-03");
  await page.getByRole("button", { name: /补充细节、分类/ }).click();
  await page.getByLabel("那天发生了什么（可选）").fill("她选了绿色的纸，我们在阳台试了好久。\n风吹来的时候，纸风车终于转起来了。\n她说，明天还要做一个送给朋友。\n这是很久以后也想记住的一天。");
  await page.locator(".footprint-photos__input").setInputFiles(PHOTO);
  await expect(page.locator(".footprint-photos__item")).toHaveCount(1);
  await page.getByRole("button", { name: "收进纪念册", exact: true }).click();
  await expect(oldMonth).toHaveAttribute("open", "");
  await expect(entry(page, "第一次一起做了纸风车")).toBeInViewport();
  await expect(entry(page, "第一次一起做了纸风车").getByRole("button", { name: "展开全文" })).toBeVisible();
  await entry(page, "第一次一起做了纸风车").getByRole("button", { name: "展开全文" }).click();
  await expect(entry(page, "第一次一起做了纸风车").getByRole("button", { name: "收起正文" })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("book-records.png"), fullPage: true });
  await page.reload();
  await expect(page.locator(".growth-book__count")).toHaveText("3 个瞬间");
  await page.getByRole("tab", { name: "全部", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "我们一起", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("收起保留文字和照片草稿，跨页签恢复，放弃修改不影响服务器", async ({ page }) => {
  await openBook(page);
  await page.getByRole("button", { name: "记一笔", exact: true }).click();
  await page.getByLabel("一句话记下这件事").fill("今天主动帮同学整理书包");
  await page.getByRole("radio", { name: "她的成长", exact: true }).check();
  await page.locator(".footprint-photos__input").setInputFiles(PHOTO);
  await expect(page.locator(".footprint-photos__item")).toHaveCount(1);
  await page.getByRole("button", { name: "收起", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "我们一起", exact: true }).click();
  await page.getByRole("button", { name: "继续：今天主动帮同学整理书包" }).click();
  await expect(page.getByLabel("一句话记下这件事")).toHaveValue("今天主动帮同学整理书包");
  await expect(page.getByRole("radio", { name: "她的成长", exact: true })).toBeChecked();
  await expect(page.locator(".footprint-photos__item")).toHaveCount(1);
  await page.getByRole("button", { name: "收进纪念册", exact: true }).click();
  await expect(page.getByRole("tab", { name: "全部", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(entry(page, "今天主动帮同学整理书包")).toBeVisible();
  await expect(page.locator(".growth-book__drafts")).toHaveCount(0);
  const before = await (await page.request.get("/api/growth-milestones")).json();
  await entry(page, "今天主动帮同学整理书包").getByRole("button", { name: "改一改" }).click();
  await page.getByLabel("一句话记下这件事").fill("不应保存的修改");
  await page.getByRole("button", { name: "移除这张照片", exact: true }).click();
  await page.locator(".footprint-photos__input").setInputFiles(PHOTO);
  await expect(page.locator(".footprint-photos__item")).toHaveCount(1);
  await page.getByRole("button", { name: "稍后继续", exact: true }).click();
  expect(await (await page.request.get("/api/growth-milestones")).json()).toEqual(before);
  await page.getByRole("button", { name: "继续：不应保存的修改" }).click();
  await expect(page.getByLabel("一句话记下这件事")).toHaveValue("不应保存的修改");
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();
  await expect(page.locator(".growth-book__drafts")).toHaveCount(0);
  expect(await (await page.request.get("/api/growth-milestones")).json()).toEqual(before);
});

test("加载失败与空状态区分，重试不会丢掉另一类记录", async ({ page }) => {
  await openBook(page);
  await quickCreate(page, "已经保存的小事");
  await page.route("**/api/growth-milestones", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "暂时无法连接" }) }));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("她的成长暂时没能加载");
  await expect(entry(page, "已经保存的小事")).toBeVisible();
  await expect(page.locator(".growth-book__count")).toHaveCount(0);
  await page.getByRole("tab", { name: "她的成长", exact: true }).click();
  await expect(page.getByRole("heading", { name: "这一页还是空的" })).toHaveCount(0);
  await page.unroute("**/api/growth-milestones");
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "这一页还是空的" })).toBeVisible();
  await page.getByRole("tab", { name: "全部", exact: true }).click();
  await expect(entry(page, "已经保存的小事")).toBeVisible();
});

test("手机编辑失败保留输入，重试后文字照片一起生效", async ({ page }, testInfo) => {
  await openBook(page);
  await quickCreate(page, "一起看了落日");
  await page.setViewportSize({ width: 390, height: 844 });
  await entry(page, "一起看了落日").getByRole("button", { name: "改一改" }).click();
  await page.getByLabel("一句话记下这件事").fill("一起看了海边的落日");
  await page.locator(".footprint-photos__input").setInputFiles(PHOTO);
  await expect(page.locator(".footprint-photos__item")).toHaveCount(1);
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("book-editor-mobile.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.route("**/api/growth-footprints/*", (route) => route.request().method() === "PATCH"
    ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "保存失败，请重试" }) }) : route.continue());
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("保存失败");
  await expect(page.getByLabel("一句话记下这件事")).toHaveValue("一起看了海边的落日");
  await expect(page.locator(".footprint-photos__item")).toHaveCount(1);
  const before = await (await page.request.get("/api/growth-footprints")).json();
  expect(before.footprints[0].title).toBe("一起看了落日");
  expect(before.footprints[0].photos).toHaveLength(0);
  await page.unroute("**/api/growth-footprints/*");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(entry(page, "一起看了海边的落日")).toBeVisible();
  await expect(entry(page, "一起看了海边的落日").locator("img")).toHaveCount(1);
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("book-mobile.png"), fullPage: true });
  await page.reload();
  await expect(entry(page, "一起看了海边的落日")).toBeVisible();
  await expect(entry(page, "一起看了海边的落日").locator("img")).toHaveCount(1);
});
