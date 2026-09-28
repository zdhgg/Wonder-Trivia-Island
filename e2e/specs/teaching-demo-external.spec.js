const { test, expect } = require("@playwright/test");
const { BACKEND_ORIGIN } = require("../e2e-environment");

// 全链路 E2E：Wonder-Trivia-Island 自己不做任何模型推理。
// 测试进程扮演外部 Harness，用独立 EXTERNAL_AI_GATEWAY_KEY 通过 External AI Gateway
// 提交 proposal 与 demo spec；管理页只负责登记请求、预览与人工审核。
const GATEWAY_HEADERS = {
  "x-external-ai-key": "e2e-gateway-key"
};

function teachingProposalPayload(interventionType, harnessId) {
  return {
    type: "common_mistake",
    scope: {
      subject: "数学",
      grade: "二年级",
      semester: "上册",
      knowledgeTag: "表内乘法"
    },
    suggestion: {
      title: "乘法口诀与算式表达形式混淆",
      note: "保留为动态知识补充。",
      teachingIntervention: {
        problemType: "学生把乘法口诀和乘法算式混写",
        recommendedIntervention: interventionType,
        reason: "两个表达形式相关但用途不同，静态文字容易混淆。",
        suggestedDemo: {
          title: "口诀与算式的表达区别",
          summary: "对比口诀和算式的写法与题目要求。"
        }
      }
    },
    source: {
      harnessId,
      runId: `run-${interventionType}`
    },
    evidence: {
      questionIds: [1],
      wrongCount: 3
    }
  };
}

// 真实案例 A：口诀 vs 算式。口径必须保持「相关但表达形式不同」，不得说 3×6=18 是错的。
function comparisonDemoSpec() {
  return {
    template: "comparison_demo",
    title: "乘法口诀和乘法算式",
    summary: "两种表达相关，但形式和题目要求不同。",
    scene: {
      left: {
        label: "乘法口诀",
        value: "三六十八",
        description: "用语言记忆乘法关系。"
      },
      right: {
        label: "乘法算式",
        value: "3×6=18",
        description: "用数字和运算符表示计算关系。"
      }
    },
    steps: [
      { title: "先看题目要求", text: "题目要求填写乘法口诀。", focus: "both" },
      { title: "区分表达形式", text: "三六十八是口诀，3×6=18 是算式。", focus: "left" },
      { title: "记住关系", text: "两种写法相关，但不能互相替代。", focus: "takeaway" }
    ],
    labels: ["口诀", "算式"],
    takeaway: "3×6=18 是正确算式，只是没有按题目要求写成口诀。",
    question: "题目要求写乘法口诀，应该选择哪一种？"
  };
}

// 真实案例 B：鱼缸问题只验证 request → draft → Renderer 技术链路。
// 当前「份数在前 / 每份数在前」教学口径仍有冲突，所以只做参考、不自动批准、不改题库。
function microAnimationSpec() {
  return {
    template: "micro_animation",
    title: "每组数量和组数",
    summary: "先看每组有多少，再看一共有几组。",
    scene: {
      groupCount: 5,
      itemsPerGroup: 6,
      groupLabel: "鱼缸",
      itemLabel: "条",
      perGroupLabel: "每份数：每缸 6 条",
      groupCountLabel: "份数：一共 5 缸",
      expression: "6 × 5 = 30",
      totalLabel: "总数：30 条"
    },
    steps: [
      { title: "看每一组", text: "每个鱼缸都高亮 6 条鱼。", focus: "each_group" },
      { title: "看有几组", text: "一共有 5 个鱼缸。", focus: "groups" },
      { title: "形成算式", text: "把每份数和份数对应到算式。", focus: "expression" }
    ],
    labels: ["每份数", "份数"],
    takeaway: "先说清每份有多少，再说清有几份。",
    question: ""
  };
}

async function submitProposal(request, interventionType, harnessId) {
  const response = await request.post(`${BACKEND_ORIGIN}/api/external-ai/proposals`, {
    headers: GATEWAY_HEADERS,
    data: teachingProposalPayload(interventionType, harnessId)
  });

  expect(response.status()).toBe(201);

  return (await response.json()).data.id;
}

async function acceptProposal(request, proposalId) {
  const response = await request.post(`${BACKEND_ORIGIN}/api/proposals/${proposalId}/accept`, {
    data: { reviewNote: "E2E：先确认问题判断。" }
  });

  expect(response.status()).toBe(200);
}

async function listRequests(request) {
  const response = await request.get(`${BACKEND_ORIGIN}/api/external-ai/teaching-demo-requests`, {
    headers: GATEWAY_HEADERS
  });

  expect(response.status()).toBe(200);

  return (await response.json()).data;
}

async function submitDraft(request, body) {
  return request.post(`${BACKEND_ORIGIN}/api/external-ai/teaching-demo-drafts`, {
    headers: GATEWAY_HEADERS,
    data: body
  });
}

test.describe("教学演示外部生成闭环", () => {
  test("口诀 vs 算式：请求 → Harness 提交 → 现有 Renderer 预览 → 人工确认可用", async ({ page, request }) => {
    const proposalId = await submitProposal(request, "comparison_demo", "e2e-teaching-demo-harness");

    await page.goto("/#/tools/proposals");
    await expect(page.getByRole("heading", { name: "知识建议审核", exact: true })).toBeVisible();

    const pendingCard = page.locator(".proposal-card", { hasText: "e2e-teaching-demo-harness" }).first();
    await expect(pendingCard).toBeVisible();
    // 教学建议由外部 Harness 提交并在审核页展示，系统不自己判断教学方式。
    await expect(pendingCard.getByText("教学干预建议")).toBeVisible();
    await expect(pendingCard.locator(".teaching-intervention-card__type")).toHaveText("对比演示");

    await pendingCard.getByRole("button", { name: "接受" }).click();
    await expect(page.getByText("提案已确认，保留在动态知识补充中。")).toBeVisible();

    await page.getByRole("tab", { name: "已确认" }).click();

    const acceptedCard = page.locator(".proposal-card", { hasText: "e2e-teaching-demo-harness" }).first();
    await expect(acceptedCard).toBeVisible();
    await expect(acceptedCard.getByText("接受 Proposal 不会自动生成演示")).toBeVisible();

    // 用户点击之前，Harness 既查不到请求，也不能主动塞 demo。
    expect((await listRequests(request)).some((item) => item.proposalId === proposalId)).toBe(false);

    const forcedDraft = await submitDraft(request, {
      proposalId,
      interventionType: "comparison_demo",
      spec: comparisonDemoSpec()
    });
    expect(forcedDraft.status()).toBe(409);

    // 用户明确点击「制作教学演示草稿」：只登记待外部生成请求。
    await acceptedCard.getByRole("button", { name: "制作教学演示草稿" }).click();
    await expect(
      page.getByText("已请求生成，等待外部 AI 提交草稿。草稿提交后刷新本页即可预览。")
    ).toBeVisible();
    await expect(acceptedCard.getByText("系统不会自己调用模型")).toBeVisible();
    await expect(acceptedCard.getByRole("button", { name: "制作教学演示草稿" })).toHaveCount(0);

    // Harness 查询待生成请求。
    const pendingRequests = await listRequests(request);
    const entry = pendingRequests.find((item) => item.proposalId === proposalId);
    expect(entry).toBeTruthy();
    expect(entry.interventionType).toBe("comparison_demo");
    expect(entry.teachingIntervention.recommendedIntervention).toBe("comparison_demo");
    expect(entry.scope.knowledgeTag).toBe("表内乘法");

    // 非法 spec（代码字段 / 未知字段）会被拒绝，不落库。
    const illegalDraft = await submitDraft(request, {
      proposalId,
      interventionType: "comparison_demo",
      spec: { ...comparisonDemoSpec(), component: "ArbitraryVueComponent", takeaway: "<script>alert(1)</script>" }
    });
    expect(illegalDraft.status()).toBe(422);

    // 合法受控 spec 落库为待审核 draft。
    const submitted = await submitDraft(request, {
      proposalId,
      interventionType: "comparison_demo",
      spec: comparisonDemoSpec()
    });
    expect(submitted.status()).toBe(201);
    expect((await submitted.json()).data.status).toBe("draft");

    // 提交后不再出现在待生成列表。
    expect((await listRequests(request)).some((item) => item.proposalId === proposalId)).toBe(false);

    // 管理页刷新后由现有 Renderer 预览。
    await acceptedCard.getByRole("button", { name: "刷新状态" }).click();
    await expect(acceptedCard.locator(".comparison-demo__title")).toHaveText("乘法口诀和乘法算式");
    await expect(acceptedCard.locator(".comparison-demo__side--left .comparison-demo__value")).toHaveText("三六十八");
    await expect(acceptedCard.locator(".comparison-demo__side--right .comparison-demo__value")).toHaveText("3×6=18");
    await expect(acceptedCard.locator(".comparison-demo__side--right .comparison-demo__side-label")).toHaveText("乘法算式");
    await expect(acceptedCard.locator(".teaching-draft-status")).toHaveText("待审核");
    // 口径检查：算式是正确的，只是表达形式不同。
    await expect(acceptedCard.locator(".comparison-demo__takeaway")).toContainText("3×6=18 是正确算式");

    // 人工确认可用：Harness 没有这个能力，只有内部管理接口能改状态。
    await acceptedCard.getByRole("button", { name: "确认可用" }).click();
    await expect(page.getByText("教学演示草稿已确认可用。")).toBeVisible();
    await expect(acceptedCard.locator(".teaching-draft-status")).toHaveText("已确认可用");

    // 已确认的草稿不允许 Harness 覆盖。
    const overwrite = await submitDraft(request, {
      proposalId,
      interventionType: "comparison_demo",
      spec: comparisonDemoSpec()
    });
    expect(overwrite.status()).toBe(409);
  });

  test("鱼缸 micro_animation：越界数值被拒绝，合法草稿由 Renderer 预览且不自动批准", async ({ page, request }) => {
    const proposalId = await submitProposal(request, "micro_animation", "e2e-teaching-demo-micro");

    await acceptProposal(request, proposalId);

    // 未点击前 Harness 不能提交。
    const beforeRequest = await submitDraft(request, {
      proposalId,
      interventionType: "micro_animation",
      spec: microAnimationSpec()
    });
    expect(beforeRequest.status()).toBe(409);

    const requested = await request.post(`${BACKEND_ORIGIN}/api/proposals/${proposalId}/teaching-demo/request`, {
      data: {}
    });
    expect(requested.status()).toBe(201);

    // 越界数值被拒绝。
    const outOfRange = await submitDraft(request, {
      proposalId,
      interventionType: "micro_animation",
      spec: { ...microAnimationSpec(), scene: { ...microAnimationSpec().scene, groupCount: 99 } }
    });
    expect(outOfRange.status()).toBe(422);

    const submitted = await submitDraft(request, {
      proposalId,
      interventionType: "micro_animation",
      spec: microAnimationSpec()
    });
    expect(submitted.status()).toBe(201);
    expect((await submitted.json()).data.status).toBe("draft");

    await page.goto("/#/tools/proposals");
    await page.getByRole("tab", { name: "已确认" }).click();

    const card = page.locator(".proposal-card", { hasText: "e2e-teaching-demo-micro" }).first();
    await expect(card.locator(".micro-animation__title")).toHaveText("每组数量和组数");
    await expect(card.locator(".micro-animation__expression")).toHaveText("6 × 5 = 30");
    await expect(card.locator(".micro-animation__legend")).toContainText("每份数：每缸 6 条");
    await expect(card.locator(".micro-animation__legend")).toContainText("总数：30 条");
    // 不自动批准：仍然停在待审核。
    await expect(card.locator(".teaching-draft-status")).toHaveText("待审核");

    // 教学口径仍有冲突，因此人工选择「不采用」，且不改动题库。
    await card.getByRole("button", { name: "不采用" }).click();
    await expect(page.getByText("教学演示草稿已标记为不采用。")).toBeVisible();
    await expect(card.locator(".teaching-draft-status")).toHaveText("不采用");
  });

  test("practice / guided_example 保持边界：只展示教学建议，不提供制作入口", async ({ page, request }) => {
    const practiceId = await submitProposal(request, "practice", "e2e-teaching-demo-practice");
    const guidedId = await submitProposal(request, "guided_example", "e2e-teaching-demo-guided");

    await acceptProposal(request, practiceId);
    await acceptProposal(request, guidedId);

    // 服务端也拒绝登记生成请求。
    for (const proposalId of [practiceId, guidedId]) {
      const response = await request.post(`${BACKEND_ORIGIN}/api/proposals/${proposalId}/teaching-demo/request`, {
        data: {}
      });
      expect(response.status()).toBe(409);
    }

    await page.goto("/#/tools/proposals");
    await page.getByRole("tab", { name: "已确认" }).click();

    const practiceCard = page.locator(".proposal-card", { hasText: "e2e-teaching-demo-practice" }).first();
    await expect(practiceCard.getByText("该建议是专项练习，第一版不制作教学演示草稿。")).toBeVisible();
    await expect(practiceCard.getByRole("button", { name: "制作教学演示草稿" })).toHaveCount(0);

    const guidedCard = page.locator(".proposal-card", { hasText: "e2e-teaching-demo-guided" }).first();
    await expect(guidedCard.getByText("分步骤示范目前只展示 AI 推荐，暂未支持制作演示。")).toBeVisible();
    await expect(guidedCard.getByRole("button", { name: "制作教学演示草稿" })).toHaveCount(0);
  });
});
