const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { BACKEND_ORIGIN, E2E_TMP_DIR } = require("../e2e-environment");

const STAGING_DIR = path.join(E2E_TMP_DIR, "staging");
const STAGING_PATH = path.join(STAGING_DIR, "pending.json");

// 和真实 harness payload 同构：中文表头别名 + A-D + 答案 + 解析。
const REVIEW_ROWS = [
  {
    学科: "数学",
    年级: "二年级",
    学期: "上册",
    知识标签: "条件上手",
    题型: "乘法应用",
    题目: "题目要求填写乘法口诀。下面哪一个符合要求？",
    题目图片: "",
    选项A: "三六十八",
    选项B: "3×6=18",
    选项C: "18÷3=6",
    选项D: "3+6=9",
    答案: "A",
    解析: "题目要的是乘法口诀，口诀用汉字写成一句，所以选「三六十八」。3×6=18 是乘法算式，18÷3=6 是除法算式，都不是口诀。",
    难度: "1"
  },
  {
    学科: "数学",
    年级: "二年级",
    学期: "下册",
    知识标签: "条件上手",
    题型: "乘法应用",
    题目: "题目要求写乘法算式。口诀「六七四十二」对应的乘法算式是哪一个？",
    题目图片: "",
    选项A: "六七四十二",
    选项B: "6+7=13",
    选项C: "42÷7=6",
    选项D: "6×7=42",
    答案: "D",
    解析: "乘法算式用数字和乘号写成，口诀「六七四十二」对应的乘法算式是 6×7=42。「六七四十二」本身是乘法口诀，不是算式。",
    难度: "1"
  }
];

function writeLegacyBatch() {
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  const payload = {
    version: 1,
    batchId: "legacy-batch-e2e",
    createdAt: new Date().toISOString(),
    source: "legacy-harness",
    mode: "append",
    summary: { totalRows: 1, validRows: 1, errorRows: 0, warningRows: 0, currentQuestionCount: 0 },
    rows: [
      {
        rowNumber: 2,
        subject: "数学",
        grade: "二年级",
        semester: "上册",
        knowledgeTag: "条件上手",
        type: "乘法应用",
        content: "题目要求填写乘法口诀。下面哪一个符合要求？",
        imageUrl: "",
        answer: "A",
        difficulty: 1,
        status: "valid",
        issues: []
      }
    ],
    validQuestions: [],
    fingerprint: { questionCount: 0, maxId: 0, maxUpdatedAt: "" }
  };

  fs.writeFileSync(STAGING_PATH, JSON.stringify(payload, null, 2), "utf8");
}

test.describe("题库导入审核页", () => {
  test.beforeEach(async ({ request }) => {
    await request.delete(`${BACKEND_ORIGIN}/api/questions/import/pending`);
  });

  test("新批次展开后能看到选项、醒目的正确答案与解析", async ({ page, request }) => {
    const stageResponse = await request.post(`${BACKEND_ORIGIN}/api/questions/import/stage`, {
      data: {
        rows: REVIEW_ROWS,
        mode: "append",
        source: "e2e-import-review"
      }
    });

    expect(stageResponse.status()).toBe(201);

    await page.goto("/#/tools/import");
    await expect(page.getByRole("heading", { name: "待确认批次" })).toBeVisible();

    // 表格必须带上答案列，而不只是题干。
    await expect(page.locator(".preview-table__head").getByText("答案")).toBeVisible();
    await expect(page.getByText("A · 三六十八")).toBeVisible();
    await expect(page.getByText("D · 6×7=42")).toBeVisible();

    // 展开第 1 题。
    await page.locator(".preview-table__row").first().click();
    const firstDetails = page.locator(".preview-details").first();

    await expect(firstDetails).toBeVisible();
    await expect(firstDetails.getByText("三六十八", { exact: true })).toBeVisible();
    await expect(firstDetails.getByText("3×6=18", { exact: true })).toBeVisible();
    await expect(firstDetails.getByText("18÷3=6", { exact: true })).toBeVisible();
    await expect(firstDetails.getByText("3+6=9", { exact: true })).toBeVisible();
    await expect(firstDetails.getByText("正确答案")).toBeVisible();
    await expect(firstDetails.locator(".preview-option--correct .preview-option__text")).toHaveText("三六十八");
    await expect(firstDetails.getByText(/口诀用汉字写成一句/)).toBeVisible();

    // 展开第 2 题，确认正确答案跟着换到 D。
    await page.locator(".preview-table__row").nth(1).click();
    const secondDetails = page.locator(".preview-details").nth(1);

    await expect(secondDetails).toBeVisible();
    await expect(secondDetails.getByText("6×7=42", { exact: true })).toBeVisible();
    await expect(secondDetails.locator(".preview-option--correct .preview-option__text")).toHaveText("6×7=42");
    await expect(secondDetails.getByText(/「六七四十二」本身是乘法口诀/)).toBeVisible();
  });

  test("旧批次缺少选项与解析时给出提示而不是报错", async ({ page }) => {
    writeLegacyBatch();

    await page.goto("/#/tools/import");
    await expect(page.getByRole("heading", { name: "待确认批次" })).toBeVisible();

    await page.locator(".preview-table__row").first().click();

    await expect(page.getByText("这个批次没有携带选项和解析数据")).toBeVisible();
    // 页面没有崩掉，侧边结果面板仍然可用。
    await expect(page.getByRole("heading", { name: "导入结果" })).toBeVisible();
  });
});
