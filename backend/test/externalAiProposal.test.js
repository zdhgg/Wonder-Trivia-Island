const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "external-ai-proposal.test.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;
process.env.ADMIN_IMPORT_KEY = "test-admin-key";
// 教学演示链路必须完全不依赖模型供应商配置：这里显式清空，任何隐式依赖都会暴露出来。
delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_TEACHING_DEMO_MODEL;
delete process.env.OPENAI_BASE_URL;

const app = require("../src/app");
const { questions } = require("../scripts/questionSeedData");
const { closeDatabaseConnection, createDatabaseConnection, get, run, all } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions } = require("../src/questions/repository");
const { ensureExternalAiProposalsTable } = require("../src/services/externalAiProposals");
const { ensureTeachingDemoDraftsTable } = require("../src/services/teachingDemoDrafts");

let server = null;
let baseUrl = "";

function resetDatabase() {
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    ensureExternalAiProposalsTable(db);
    ensureTeachingDemoDraftsTable(db);
    run(
      db,
      `
        CREATE TABLE IF NOT EXISTS study_record_book (
          profile_id TEXT PRIMARY KEY,
          record_book_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `
    );
    run(db, "DELETE FROM questions");
    run(db, "DELETE FROM teaching_demo_drafts");
    run(db, "DELETE FROM teaching_demo_requests");
    run(db, "DELETE FROM external_ai_proposals");
    run(db, "DELETE FROM study_record_book");
    insertQuestions(db, [questions[0]]);
    run(
      db,
      `
        INSERT INTO study_record_book (profile_id, record_book_json, updated_at)
        VALUES (?, ?, ?)
      `,
      [
        "profile-evidence-1",
        JSON.stringify({
          questionRecords: {
            "1": {
              questionId: 1,
              snapshot: {
                id: 1,
                subject: "语文",
                grade: "一年级",
                semester: "上册",
                knowledgeTag: "看图起步",
                type: "识字题"
              },
              attempts: 4,
              correctCount: 1,
              wrongCount: 2,
              timeoutCount: 1,
              nextReviewAt: new Date(Date.now() - 60_000).toISOString(),
              lastAnsweredAt: new Date().toISOString()
            }
          }
        }),
        new Date().toISOString()
      ]
    );
  } finally {
    closeDatabaseConnection(db);
  }
}

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = await response.json().catch(() => null);

  return { response, payload };
}

// External AI Gateway 现在是 localhost-only 的本机进程间接口：
// 能不能访问完全由真实 socket 是否 loopback 决定，不需要也不接受任何凭证头。
// 这个 helper 只负责补 JSON Content-Type。
function gatewayHeaders(json = false) {
  return {
    ...(json ? { "Content-Type": "application/json" } : {})
  };
}

function adminHeaders(json = false) {
  return {
    "x-admin-key": "test-admin-key",
    ...(json ? { "Content-Type": "application/json" } : {})
  };
}

function proposalPayload(type, sourceId = `test-harness-${type}`) {
  return {
    type,
    scope: {
      subject: "语文",
      grade: "一年级",
      semester: "上册",
      knowledgeTag: "看图起步"
    },
    suggestion: {
      title: `${type} 建议`,
      note: "保留为动态知识补充，不写入正式知识目录。"
    },
    source: {
      harnessId: sourceId,
      runId: `run-${type}`
    },
    evidence: {
      questionIds: [1],
      reason: "测试证据"
    }
  };
}

function teachingProposalPayload(type = "comparison_demo", sourceId = `teaching-${type}`) {
  return {
    ...proposalPayload("common_mistake", sourceId),
    suggestion: {
      title: "乘法口诀与算式表达形式混淆",
      note: "保留为动态知识补充。",
      teachingIntervention: {
        problemType: "学生把乘法口诀和乘法算式混写",
        recommendedIntervention: type,
        reason: "两个表达形式相关但用途不同，静态文字容易混淆。",
        suggestedDemo: {
          title: "三六十八与 3×6=18 的表达区别",
          summary: "对比口诀和算式的写法与题目要求。"
        }
      }
    }
  };
}

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

test.before(async () => {
  resetDatabase();

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
    server.on("error", reject);
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (fs.existsSync(tempDbPath)) {
    fs.rmSync(tempDbPath, { force: true });
  }
});

test.beforeEach(() => {
  resetDatabase();
});

test("Gateway 只读题目上下文和统计，且访问判定只看真实 socket", async () => {
  const stats = await jsonRequest("/api/external-ai/question-stats", {
    headers: gatewayHeaders()
  });
  assert.equal(stats.response.status, 200);
  assert.equal(stats.payload.total, 1);

  const context = await jsonRequest("/api/external-ai/questions?subject=%E8%AF%AD%E6%96%87&pageSize=1", {
    headers: gatewayHeaders()
  });
  assert.equal(context.response.status, 200);
  assert.equal(context.payload.data.length, 1);
  assert.equal(typeof context.payload.data[0].content, "string");
  assert.equal(Object.hasOwn(context.payload.data[0], "answer"), false);

  // 完全不带任何 header：测试进程直连 backend，真实 socket 是 loopback，应当 200。
  const noHeaderAtAll = await jsonRequest("/api/external-ai/question-stats");
  assert.equal(noHeaderAtAll.response.status, 200);

  // 已废弃的 x-external-ai-key 不再有任何特殊语义，带任意值都不影响判定。
  const legacyKeyHeader = await jsonRequest("/api/external-ai/question-stats", {
    headers: { "x-external-ai-key": "whatever" }
  });
  assert.equal(legacyKeyHeader.response.status, 200);

  // ADMIN_IMPORT_KEY 属于人工管理面，不是 Gateway 的凭证：带上它既不提权也不被拒。
  const adminKeyOnly = await jsonRequest("/api/external-ai/question-stats", {
    headers: { "x-admin-key": "test-admin-key" }
  });
  assert.equal(adminKeyOnly.response.status, 200);

  // 伪造 forwarded header 同样不参与判定。
  const forgedForwarded = await jsonRequest("/api/external-ai/question-stats", {
    headers: {
      "x-forwarded-for": "203.0.113.9",
      forwarded: "for=203.0.113.9",
      "x-real-ip": "203.0.113.9"
    }
  });
  assert.equal(forgedForwarded.response.status, 200);
});

// Harness 需要知道数据库允许的合法 questions.type，才能自己生成候选题。
// byType 必须与建表 CHECK 用的同一份 ALLOWED_TYPES 对齐，不能是另一套枚举。
test("question-stats 暴露 byType，且与 ALLOWED_TYPES 真源及真实数据库一致", async () => {
  const { response, payload } = await jsonRequest("/api/external-ai/question-stats");
  assert.equal(response.status, 200);

  const { ALLOWED_TYPES } = require("../src/questions/repository");
  assert.ok(Array.isArray(ALLOWED_TYPES) && ALLOWED_TYPES.length > 0);

  // 键集合必须与真源完全一致：既不缺合法 type，也不凭空多出枚举。
  assert.deepEqual(Object.keys(payload.byType).sort(), [...ALLOWED_TYPES].sort());

  // 每个值都是非负整数，且总和等于 total（type 是 NOT NULL，不会有题落空）。
  for (const [type, count] of Object.entries(payload.byType)) {
    assert.ok(Number.isInteger(count) && count >= 0, `byType[${type}] 必须是非负整数`);
  }

  const byTypeTotal = Object.values(payload.byType).reduce((sum, count) => sum + count, 0);
  assert.equal(byTypeTotal, payload.total);

  // 与真实数据库的 GROUP BY type 结果一致（byType 不是硬编码常量）。
  const db = createDatabaseConnection();

  try {
    const rows = all(db, "SELECT type, COUNT(*) AS count FROM questions GROUP BY type");
    const expected = Object.fromEntries(ALLOWED_TYPES.map((type) => [type, 0]));

    for (const row of rows) {
      expected[row.type] = Number(row.count);
    }

    assert.deepEqual(payload.byType, expected);
  } finally {
    closeDatabaseConnection(db);
  }

  // 种子只放了 questions[0] 一道题：它的 type 必须是唯一非零项。
  assert.equal(payload.byType[questions[0].type], 1);
  assert.equal(byTypeTotal, 1);
});

test("Gateway 接受四种 proposal，默认保存为 pending", async () => {
  for (const type of ["focus_mark", "common_mistake", "knowledge_update", "question_type_advice"]) {
    const { response, payload } = await jsonRequest("/api/external-ai/proposals", {
      method: "POST",
      headers: gatewayHeaders(true),
      body: JSON.stringify(proposalPayload(type))
    });

    assert.equal(response.status, 201);
    assert.equal(payload.data.type, type);
    assert.equal(payload.data.status, "pending");
  }

  const listed = await jsonRequest("/api/proposals?status=pending", {
    headers: adminHeaders()
  });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.payload.pagination.total, 4);
});

test("Gateway 拒绝非法类型和缺少来源的 proposal", async () => {
  const invalidType = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(proposalPayload("not-supported"))
  });
  assert.equal(invalidType.response.status, 400);

  const invalidSource = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({
      ...proposalPayload("focus_mark"),
      source: { model: "anonymous" }
    })
  });
  assert.equal(invalidSource.response.status, 400);
});

test("后台可以接受或拒绝，accepted proposal 可由 Gateway 查询", async () => {
  const created = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(proposalPayload("focus_mark", "review-harness"))
  });
  const proposalId = created.payload.data.id;

  const accepted = await jsonRequest(`/api/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "符合本周教学重点。" })
  });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.payload.data.status, "accepted");
  assert.equal(accepted.payload.data.reviewNote, "符合本周教学重点。");

  const acceptedContext = await jsonRequest("/api/external-ai/proposals?status=accepted", {
    headers: gatewayHeaders()
  });
  assert.equal(acceptedContext.response.status, 200);
  assert.equal(acceptedContext.payload.data.length, 1);
  assert.equal(acceptedContext.payload.data[0].id, proposalId);

  const own = await jsonRequest("/api/external-ai/proposals?status=accepted&sourceId=review-harness", {
    headers: gatewayHeaders()
  });
  assert.equal(own.payload.data.length, 1);

  const rejectedCreated = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(proposalPayload("common_mistake", "reject-harness"))
  });
  const rejected = await jsonRequest(`/api/proposals/${rejectedCreated.payload.data.id}/reject`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "证据不足，暂不确认。" })
  });
  assert.equal(rejected.response.status, 200);
  assert.equal(rejected.payload.data.status, "rejected");
});

test("学习证据只返回聚合结果，不暴露 study_record_book JSON", async () => {
  const result = await jsonRequest(
    "/api/external-ai/learning-evidence?profileId=profile-evidence-1&subject=%E8%AF%AD%E6%96%87",
    {
      headers: gatewayHeaders()
    }
  );

  assert.equal(result.response.status, 200);
  assert.equal(result.payload.filters.profileId, "profile-evidence-1");
  assert.equal(result.payload.data.length, 1);
  assert.equal(result.payload.data[0].knowledgeTag, "看图起步");
  assert.equal(result.payload.data[0].attempts, 4);
  assert.equal(result.payload.data[0].wrongCount, 2);
  assert.equal(result.payload.data[0].correctCount, 1);
  assert.equal(result.payload.data[0].timeoutCount, 1);
  assert.equal(result.payload.data[0].dueCount, 1);
  assert.equal(Object.hasOwn(result.payload, "questionRecords"), false);
  assert.equal(Object.hasOwn(result.payload.data[0], "record_book_json"), false);
});

test("学习证据缺少 profileId 时拒绝跨 profile 聚合", async () => {
  const result = await jsonRequest("/api/external-ai/learning-evidence?subject=%E8%AF%AD%E6%96%87", {
    headers: gatewayHeaders()
  });

  assert.equal(result.response.status, 400);
  assert.match(result.payload.message, /profileId/);
});

test("proposal 流程不改动 questions 或 study_record_book", async () => {
  const before = createDatabaseConnection();
  let beforeQuestion;
  let beforeStudy;

  try {
    beforeQuestion = get(before, "SELECT COUNT(*) AS count FROM questions");
    beforeStudy = get(before, "SELECT record_book_json FROM study_record_book WHERE profile_id = ?", ["profile-evidence-1"]);
  } finally {
    closeDatabaseConnection(before);
  }

  const created = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(proposalPayload("common_mistake"))
  });
  await jsonRequest(`/api/proposals/${created.payload.data.id}/accept`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "保留。" })
  });

  const after = createDatabaseConnection();

  try {
    const afterQuestion = get(after, "SELECT COUNT(*) AS count FROM questions");
    const afterStudy = get(after, "SELECT record_book_json FROM study_record_book WHERE profile_id = ?", ["profile-evidence-1"]);
    assert.deepEqual(afterQuestion, beforeQuestion);
    assert.deepEqual(afterStudy, beforeStudy);
  } finally {
    closeDatabaseConnection(after);
  }
});

test("教学演示链路不依赖任何模型供应商配置", () => {
  assert.equal(process.env.OPENAI_API_KEY, undefined);
  assert.equal(process.env.OPENAI_TEACHING_DEMO_MODEL, undefined);

  // 教学演示相关源码不得再引用任何模型供应商或模型环境变量。
  for (const relativePath of [
    "../src/services/teachingDemoSpec.js",
    "../src/services/teachingDemoDrafts.js",
    "../src/routes/proposalReview.js",
    "../src/routes/externalAiGateway.js"
  ]) {
    const source = fs.readFileSync(path.join(__dirname, relativePath), "utf8");

    assert.equal(
      /\bopenai\b/i.test(source),
      false,
      `${relativePath} 不应再引用 OpenAI`
    );
    assert.equal(
      /OPENAI_TEACHING_DEMO_MODEL/.test(source),
      false,
      `${relativePath} 不应再引用 OPENAI_TEACHING_DEMO_MODEL`
    );
  }
});

test("External AI Gateway 不再依赖任何凭证：本机进程间接口只认真实 socket", () => {
  // 这个 Key 已随 Gateway 本机化彻底移除，环境里不应再出现。
  assert.equal(process.env.EXTERNAL_AI_GATEWAY_KEY, undefined);

  const repoRoot = path.resolve(__dirname, "..", "..");
  const scannedDirectories = [
    path.join(repoRoot, "backend", "src"),
    path.join(repoRoot, "frontend", "src"),
    path.join(repoRoot, "frontend", "security"),
    path.join(repoRoot, "e2e", "specs"),
    path.join(repoRoot, "scripts")
  ];
  const scannedFiles = [
    path.join(repoRoot, ".env.example"),
    path.join(repoRoot, "README.md"),
    path.join(repoRoot, "playwright.config.js"),
    path.join(repoRoot, "frontend", "vite.config.js"),
    path.join(repoRoot, "frontend", "vite.config.proxy.ts")
  ].filter((file) => fs.existsSync(file));
  // 这个测试文件本身不在扫描范围内，所以可以直接写明文。
  const forbiddenTokens = ["EXTERNAL_AI_GATEWAY_KEY", "x-external-ai-key"];
  const offenders = [];

  function scanFile(filePath) {
    const source = fs.readFileSync(filePath, "utf8");

    for (const token of forbiddenTokens) {
      if (source.includes(token)) {
        offenders.push(`${path.relative(repoRoot, filePath)} :: ${token}`);
      }
    }
  }

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }

        walk(fullPath);
        continue;
      }

      if (/\.(js|mjs|cjs|ts|vue|json|md)$/.test(entry.name)) {
        scanFile(fullPath);
      }
    }
  }

  for (const directory of scannedDirectories) {
    if (fs.existsSync(directory)) {
      walk(directory);
    }
  }

  for (const file of scannedFiles) {
    scanFile(file);
  }

  assert.deepEqual(
    offenders,
    [],
    `运行时代码 / 文档 / 配置里不应再出现已废弃的 Gateway 凭证：\n${offenders.join("\n")}`
  );
});

test("teachingIntervention 可选且会拒绝非法类型或明显非法结构", async () => {
  const valid = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(teachingProposalPayload())
  });
  assert.equal(valid.response.status, 201);
  assert.equal(valid.payload.data.suggestion.teachingIntervention.recommendedIntervention, "comparison_demo");

  const invalidType = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({
      ...teachingProposalPayload("comparison_demo", "invalid-teaching-type"),
      suggestion: {
        ...teachingProposalPayload().suggestion,
        teachingIntervention: {
          ...teachingProposalPayload().suggestion.teachingIntervention,
          recommendedIntervention: "arbitrary_component"
        }
      }
    })
  });
  assert.equal(invalidType.response.status, 400);

  const invalidShape = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({
      ...teachingProposalPayload("comparison_demo", "invalid-teaching-shape"),
      suggestion: {
        teachingIntervention: {
          recommendedIntervention: "comparison_demo",
          reason: "缺少问题类型和演示概要"
        }
      }
    })
  });
  assert.equal(invalidShape.response.status, 400);

  // 旧 Proposal 没有 teachingIntervention 时继续兼容：不迁移、不报错。
  const legacy = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(proposalPayload("focus_mark", "legacy-without-intervention"))
  });
  assert.equal(legacy.response.status, 201);
  assert.equal(legacy.payload.data.suggestion.teachingIntervention, undefined);
});

test("accepted proposal 只有用户点击后才登记待外部生成请求，未点击前 Harness 既查不到也不能提交", async () => {
  const created = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(teachingProposalPayload("comparison_demo", "comparison-request-loop"))
  });
  assert.equal(created.response.status, 201);
  const proposalId = created.payload.data.id;

  // pending proposal 不能请求生成。
  const pendingRequest = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(pendingRequest.response.status, 409);

  const accepted = await jsonRequest(`/api/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "先确认问题判断，再决定是否制作演示。" })
  });
  assert.equal(accepted.response.status, 200);

  // accepted 但用户还没点击：请求与草稿都不存在。
  const initialState = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(initialState.response.status, 200);
  assert.equal(initialState.payload.data.proposalId, proposalId);
  assert.equal(initialState.payload.data.request, null);
  assert.equal(initialState.payload.data.draft, null);

  // Harness 在用户点击前查询不到这个 proposal。
  const listBeforeClick = await jsonRequest("/api/external-ai/teaching-demo-requests", {
    headers: gatewayHeaders()
  });
  assert.equal(listBeforeClick.response.status, 200);
  assert.equal(
    listBeforeClick.payload.data.some((item) => item.proposalId === proposalId),
    false
  );

  // Harness 也不能绕过“制作”按钮主动塞 demo。
  const forcedDraft = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({
      proposalId,
      interventionType: "comparison_demo",
      spec: comparisonDemoSpec()
    })
  });
  assert.equal(forcedDraft.response.status, 409);

  const stateAfterForcedDraft = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(stateAfterForcedDraft.payload.data.draft, null);

  // 用户点击“制作教学演示草稿”：只登记请求，不产生草稿。
  const requested = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(requested.response.status, 201);
  assert.equal(requested.payload.data.request.status, "requested");
  assert.equal(requested.payload.data.request.interventionType, "comparison_demo");
  assert.equal(requested.payload.data.draft, null);
  assert.ok(requested.payload.data.request.requestedAt);

  // 重复点击是幂等的，不会产生第二条请求。
  const requestedAgain = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(requestedAgain.response.status, 200);
  assert.equal(requestedAgain.payload.data.request.id, requested.payload.data.request.id);

  // Harness 现在能查到最小必要数据。
  const listAfterClick = await jsonRequest("/api/external-ai/teaching-demo-requests", {
    headers: gatewayHeaders()
  });
  assert.equal(listAfterClick.response.status, 200);
  const entry = listAfterClick.payload.data.find((item) => item.proposalId === proposalId);
  assert.ok(entry, "待生成列表应包含用户请求过的 proposal");
  assert.equal(entry.interventionType, "comparison_demo");
  assert.equal(entry.proposalType, "common_mistake");
  assert.equal(entry.scope.knowledgeTag, "看图起步");
  assert.equal(entry.suggestion.teachingIntervention.recommendedIntervention, "comparison_demo");
  assert.equal(entry.teachingIntervention.recommendedIntervention, "comparison_demo");
  assert.equal(entry.teachingIntervention.problemType, "学生把乘法口诀和乘法算式混写");
  assert.equal(entry.source.harnessId, "comparison-request-loop");
  assert.deepEqual(entry.evidence.questionIds, [1]);
  assert.ok(entry.requestedAt);
  assert.ok(!("reviewNote" in entry), "待生成列表不应暴露管理字段");

  // Gateway 不需要任何凭证：本机直连（真实 socket 是 loopback）即可访问。
  const withoutAnyCredential = await jsonRequest("/api/external-ai/teaching-demo-requests");
  assert.equal(withoutAnyCredential.response.status, 200);

  // 带上已废弃的 x-external-ai-key 也不改变判定。
  const legacyKeyHeader = await jsonRequest("/api/external-ai/teaching-demo-requests", {
    headers: { "x-external-ai-key": "whatever" }
  });
  assert.equal(legacyKeyHeader.response.status, 200);

  // 管理接口的目标语义是「真实 socket loopback OR 正确 ADMIN_IMPORT_KEY」。
  // 测试进程的流量全部来自 loopback，所以本机调用不再需要管理口令。
  // 非本机的拒绝由 securityBoundary.test.js 的 resolveManagementAccess 纯函数测试
  // 以及 Vite 边缘守卫负责：HTTP 测试进程内无法模拟真实的非 loopback 来源。
  const adminStateWithoutKey = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`);
  assert.equal(adminStateWithoutKey.response.status, 200);
  assert.ok(adminStateWithoutKey.payload.data.request);
});

test("Harness 提交合法 comparison_demo 后生成 draft，但不能自行审核", async () => {
  const beforeDb = createDatabaseConnection();
  let beforeQuestionCount;
  let beforeStudy;

  try {
    beforeQuestionCount = get(beforeDb, "SELECT COUNT(*) AS count FROM questions");
    beforeStudy = get(beforeDb, "SELECT record_book_json FROM study_record_book WHERE profile_id = ?", ["profile-evidence-1"]);
  } finally {
    closeDatabaseConnection(beforeDb);
  }

  const created = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(teachingProposalPayload("comparison_demo", "comparison-submit-loop"))
  });
  const proposalId = created.payload.data.id;

  await jsonRequest(`/api/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });

  const submitted = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({
      proposalId,
      interventionType: "comparison_demo",
      spec: comparisonDemoSpec()
    })
  });
  assert.equal(submitted.response.status, 201);
  assert.equal(submitted.payload.data.status, "draft");
  assert.equal(submitted.payload.data.interventionType, "comparison_demo");
  assert.equal(submitted.payload.data.spec.template, "comparison_demo");
  assert.equal(submitted.payload.data.spec.scene.left.value, "三六十八");
  assert.equal(submitted.payload.data.spec.scene.right.value, "3×6=18");
  // 教学内容口径：口诀和算式相关但表达形式不同，绝不能把 3×6=18 说成计算错误。
  assert.match(submitted.payload.data.spec.scene.left.label, /口诀/);
  assert.match(submitted.payload.data.spec.scene.right.label, /算式/);
  assert.equal(/错误|算错|不对/.test(submitted.payload.data.spec.scene.right.description), false);

  // Harness 没有审核入口。
  const harnessApprove = await jsonRequest("/api/external-ai/teaching-demo-drafts/approve", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({ proposalId })
  });
  assert.equal(harnessApprove.response.status, 404);

  const harnessAcceptProposal = await jsonRequest(`/api/external-ai/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(harnessAcceptProposal.response.status, 404);

  // 草稿提交后从待生成列表中消失。
  const listAfterSubmit = await jsonRequest("/api/external-ai/teaching-demo-requests", {
    headers: gatewayHeaders()
  });
  assert.equal(
    listAfterSubmit.payload.data.some((item) => item.proposalId === proposalId),
    false
  );

  // 管理页看到请求已提交 + 待审核草稿。
  const stateAfterSubmit = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(stateAfterSubmit.payload.data.request.status, "submitted");
  assert.equal(stateAfterSubmit.payload.data.draft.id, submitted.payload.data.id);
  assert.equal(stateAfterSubmit.payload.data.draft.status, "draft");

  // demo 审核只能走内部管理接口：External Gateway 上没有 approve 入口，
  // 上面已经有 practiceDemoApprove 之类的 404 断言。
  // 本机（loopback）调用管理接口免管理口令是本轮明确调整后的语义，
  // 因此这里不再用带副作用的 approve 去探测 401 —— 非本机的拒绝由
  // securityBoundary.test.js 的纯函数测试 + Vite 边缘守卫覆盖。

  const approved = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/approve`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "口诀与算式的区别表达清楚。" })
  });
  assert.equal(approved.response.status, 200);
  assert.equal(approved.payload.data.draft.status, "approved");
  assert.equal(approved.payload.data.draft.reviewNote, "口诀与算式的区别表达清楚。");

  // 已确认可用的草稿不允许 Harness 覆盖，也不允许重复审核。
  const resubmit = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({ proposalId, interventionType: "comparison_demo", spec: comparisonDemoSpec() })
  });
  assert.equal(resubmit.response.status, 409);

  const reviewAgain = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/reject`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(reviewAgain.response.status, 409);

  // 全链路不改动题库与学习记录。
  const afterDb = createDatabaseConnection();

  try {
    assert.deepEqual(get(afterDb, "SELECT COUNT(*) AS count FROM questions"), beforeQuestionCount);
    assert.deepEqual(
      get(afterDb, "SELECT record_book_json FROM study_record_book WHERE profile_id = ?", ["profile-evidence-1"]),
      beforeStudy
    );
  } finally {
    closeDatabaseConnection(afterDb);
  }
});

test("Harness 不能覆盖等待审核或已确认的 draft，rejected 后必须由用户重新请求", async () => {
  const created = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(teachingProposalPayload("comparison_demo", "overwrite-guard-loop"))
  });
  const proposalId = created.payload.data.id;

  await jsonRequest(`/api/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  const requested = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(requested.response.status, 201);
  assert.equal(requested.payload.data.request.status, "requested");

  // 第一次 Harness submission 成功：draft 落库，request 变成 submitted。
  const submit = (spec) => jsonRequest("/api/external-ai/teaching-demo-drafts", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({ proposalId, interventionType: "comparison_demo", spec })
  });
  const first = await submit(comparisonDemoSpec());
  assert.equal(first.response.status, 201);
  assert.equal(first.payload.data.status, "draft");
  const draftId = first.payload.data.id;

  const afterFirst = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(afterFirst.payload.data.request.status, "submitted");
  assert.equal(afterFirst.payload.data.draft.status, "draft");

  // 等待人工审核期间重复 submission 必须被拒绝，且不能改动已有候选稿。
  const duplicate = await submit({ ...comparisonDemoSpec(), title: "Harness 试图覆盖的标题" });
  assert.equal(duplicate.response.status, 409);

  const afterDuplicate = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(afterDuplicate.payload.data.draft.id, draftId);
  assert.equal(afterDuplicate.payload.data.draft.status, "draft");
  assert.equal(afterDuplicate.payload.data.draft.spec.title, comparisonDemoSpec().title);
  assert.equal(afterDuplicate.payload.data.request.status, "submitted");

  // 人工「不采用」之后，用户没有重新请求之前，Harness 依然不能提交。
  const rejected = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/reject`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "先不采用。" })
  });
  assert.equal(rejected.response.status, 200);
  assert.equal(rejected.payload.data.draft.status, "rejected");

  const afterRejectWithoutRequest = await submit({ ...comparisonDemoSpec(), title: "未经重新请求的提交" });
  assert.equal(afterRejectWithoutRequest.response.status, 409);

  const stateAfterReject = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(stateAfterReject.payload.data.draft.status, "rejected");
  assert.equal(stateAfterReject.payload.data.request.status, "submitted");

  // 用户明确点击「重新制作草稿」：request 恢复为 requested，draft 仍是 rejected。
  const reRequested = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(reRequested.response.status, 200);
  assert.equal(reRequested.payload.data.request.status, "requested");
  assert.equal(reRequested.payload.data.request.submittedAt, null);
  assert.equal(reRequested.payload.data.draft.status, "rejected");

  // 重新请求之后可以再次提交，并回到新的 draft。
  const second = await submit({ ...comparisonDemoSpec(), title: "重新制作后的标题" });
  assert.equal(second.response.status, 201);
  assert.equal(second.payload.data.id, draftId);
  assert.equal(second.payload.data.status, "draft");
  assert.equal(second.payload.data.spec.title, "重新制作后的标题");
  assert.equal(second.payload.data.reviewNote, "");
  assert.equal(second.payload.data.reviewedAt, null);

  const afterSecond = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(afterSecond.payload.data.request.status, "submitted");
  assert.equal(afterSecond.payload.data.draft.status, "draft");
  assert.ok(afterSecond.payload.data.request.submittedAt);

  // 已确认可用之后，Harness 永远不能覆盖。
  const approved = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/approve`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "这一版可用。" })
  });
  assert.equal(approved.response.status, 200);

  const afterApproved = await submit({ ...comparisonDemoSpec(), title: "确认后仍想覆盖" });
  assert.equal(afterApproved.response.status, 409);

  // 用户也不能对已确认的草稿重新登记请求。
  const reRequestApproved = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(reRequestApproved.response.status, 409);

  // request 只有 requested / submitted 两个持久化状态，renewed 只是内部动作语义。
  const db = createDatabaseConnection();

  try {
    assert.throws(
      () => run(db, "UPDATE teaching_demo_requests SET status = 'renewed' WHERE proposal_id = ?", [proposalId]),
      "数据库约束必须拒绝第三个 request 状态"
    );

    const requestRow = get(db, "SELECT status FROM teaching_demo_requests WHERE proposal_id = ?", [proposalId]);
    assert.equal(requestRow.status, "submitted");

    assert.throws(
      () => run(db, "UPDATE teaching_demo_drafts SET status = 'pending' WHERE proposal_id = ?", [proposalId]),
      "数据库约束必须拒绝未知 draft 状态"
    );
  } finally {
    closeDatabaseConnection(db);
  }
});

test("非法 spec 被拒绝：未知字段、代码字段、类型不一致、越界数值", async () => {
  const created = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(teachingProposalPayload("comparison_demo", "invalid-spec-loop"))
  });
  const proposalId = created.payload.data.id;

  await jsonRequest(`/api/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });

  const invalidSpecs = [
    { ...comparisonDemoSpec(), component: "ArbitraryVueComponent" },
    { ...comparisonDemoSpec(), takeaway: "<script>alert(1)</script>" },
    { ...comparisonDemoSpec(), title: "{{ 7 * 7 }}" },
    { ...comparisonDemoSpec(), summary: "<svg><path d=\"M0 0 L10 10\" /></svg>" },
    { ...comparisonDemoSpec(), steps: [{ title: "点击", text: "执行", focus: "left", onClick: "doThing()" }] },
    { ...comparisonDemoSpec(), steps: [{ title: "点击", text: "执行", focus: "arbitrary_focus" }] },
    { ...comparisonDemoSpec(), template: "micro_animation" }
  ];

  for (const spec of invalidSpecs) {
    const rejected = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
      method: "POST",
      headers: gatewayHeaders(true),
      body: JSON.stringify({ proposalId, interventionType: "comparison_demo", spec })
    });
    assert.equal(rejected.response.status, 422, `应拒绝：${JSON.stringify(spec).slice(0, 120)}`);
    assert.ok(Array.isArray(rejected.payload.details) && rejected.payload.details.length > 0);
  }

  // interventionType 必须与 proposal 推荐一致。
  const mismatch = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({ proposalId, interventionType: "micro_animation", spec: microAnimationSpec() })
  });
  assert.equal(mismatch.response.status, 409);

  const unsupportedType = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({ proposalId, interventionType: "guided_example", spec: comparisonDemoSpec() })
  });
  assert.equal(unsupportedType.response.status, 409);

  // 非法提交之后仍然没有草稿落库。
  const state = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(state.payload.data.draft, null);
  assert.equal(state.payload.data.request.status, "requested");
});

test("micro_animation 越界数值被拒绝，合法参考规格可以预览但不自动批准", async () => {
  const created = await jsonRequest("/api/external-ai/proposals", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify(teachingProposalPayload("micro_animation", "micro-reference"))
  });
  const proposalId = created.payload.data.id;

  await jsonRequest(`/api/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });

  const outOfRange = [
    { groupCount: 99 },
    { itemsPerGroup: 0 },
    { groupCount: "5" },
    { groupCount: 2.5 }
  ];

  for (const patch of outOfRange) {
    const rejected = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
      method: "POST",
      headers: gatewayHeaders(true),
      body: JSON.stringify({
        proposalId,
        interventionType: "micro_animation",
        spec: {
          ...microAnimationSpec(),
          scene: { ...microAnimationSpec().scene, ...patch }
        }
      })
    });
    assert.equal(rejected.response.status, 422, `应拒绝越界数值：${JSON.stringify(patch)}`);
  }

  const submitted = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
    method: "POST",
    headers: gatewayHeaders(true),
    body: JSON.stringify({
      proposalId,
      interventionType: "micro_animation",
      spec: microAnimationSpec()
    })
  });
  assert.equal(submitted.response.status, 201);
  assert.equal(submitted.payload.data.status, "draft");
  assert.equal(submitted.payload.data.spec.scene.groupCount, 5);
  assert.equal(submitted.payload.data.spec.scene.itemsPerGroup, 6);

  // 不自动批准：只有人工审核后才改变状态。
  const state = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
    headers: adminHeaders()
  });
  assert.equal(state.payload.data.draft.status, "draft");

  const rejectedByHuman = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/reject`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({ reviewNote: "作为 renderer 参考，当前不批准正式使用。" })
  });
  assert.equal(rejectedByHuman.response.status, 200);
  assert.equal(rejectedByHuman.payload.data.draft.status, "rejected");

  // 不采用之后可以重新登记请求，但不会自动产生草稿。
  const reRequested = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify({})
  });
  assert.equal(reRequested.response.status, 200);
  assert.equal(reRequested.payload.data.request.status, "requested");
  assert.equal(reRequested.payload.data.draft.status, "rejected");
});

test("practice / guided_example 保持原有边界：只展示建议，不登记生成请求", async () => {
  for (const interventionType of ["practice", "guided_example"]) {
    const created = await jsonRequest("/api/external-ai/proposals", {
      method: "POST",
      headers: gatewayHeaders(true),
      body: JSON.stringify(teachingProposalPayload(interventionType, `unsupported-${interventionType}`))
    });
    const proposalId = created.payload.data.id;

    await jsonRequest(`/api/proposals/${proposalId}/accept`, {
      method: "POST",
      headers: adminHeaders(true),
      body: JSON.stringify({})
    });

    const requested = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo/request`, {
      method: "POST",
      headers: adminHeaders(true),
      body: JSON.stringify({})
    });
    assert.equal(requested.response.status, 409);
    assert.equal(requested.payload.data, undefined);

    const gatewaySubmit = await jsonRequest("/api/external-ai/teaching-demo-drafts", {
      method: "POST",
      headers: gatewayHeaders(true),
      body: JSON.stringify({
        proposalId,
        interventionType,
        spec: comparisonDemoSpec()
      })
    });
    assert.equal(gatewaySubmit.response.status, 409);

    const state = await jsonRequest(`/api/proposals/${proposalId}/teaching-demo`, {
      headers: adminHeaders()
    });
    assert.equal(state.payload.data.request, null);
    assert.equal(state.payload.data.draft, null);
  }
});
