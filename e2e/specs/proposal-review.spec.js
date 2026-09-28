const { test, expect } = require("@playwright/test");
const { BACKEND_ORIGIN } = require("../e2e-environment");

test.describe("External AI proposal 审核闭环", () => {
  test("提交 focus_mark 后可以在工具台接受，并在已确认列表查看", async ({ page, request }) => {
    const submitResponse = await request.post(`${BACKEND_ORIGIN}/api/external-ai/proposals`, {
      headers: {
        "x-external-ai-key": "e2e-gateway-key"
      },
      data: {
        type: "focus_mark",
        scope: {
          grade: "二年级",
          subject: "数学",
          semester: "上册",
          knowledgeTag: "两步连推"
        },
        suggestion: {
          label: "近期教学重点",
          reason: "课堂练习需要更多两步推理"
        },
        source: {
          harnessId: "e2e-review-harness",
          runId: "e2e-focus-mark"
        },
        evidence: {
          questionIds: [1],
          wrongCount: 3
        }
      }
    });

    expect(submitResponse.status()).toBe(201);

    await page.goto("/#/tools/proposals");
    await expect(page.getByRole("heading", { name: "工具台", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "知识建议审核", exact: true })).toBeVisible();
    await expect(page.getByText("e2e-review-harness")).toBeVisible();

    const proposalCard = page.locator(".proposal-card").first();
    await proposalCard.getByRole("button", { name: "接受" }).click();

    await expect(page.getByText("提案已确认，保留在动态知识补充中。")).toBeVisible();
    await page.getByRole("tab", { name: "已确认" }).click();
    await expect(page.getByText("e2e-review-harness")).toBeVisible();
    await expect(page.getByText("动态知识补充", { exact: true })).toBeVisible();
  });
});
