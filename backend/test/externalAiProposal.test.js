const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "external-ai-proposal.test.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;
process.env.EXTERNAL_AI_GATEWAY_KEY = "test-gateway-key";
process.env.ADMIN_IMPORT_KEY = "test-admin-key";

const app = require("../src/app");
const { questions } = require("../scripts/questionSeedData");
const { closeDatabaseConnection, createDatabaseConnection, get, run } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions } = require("../src/questions/repository");
const { ensureExternalAiProposalsTable } = require("../src/services/externalAiProposals");

let server = null;
let baseUrl = "";

function resetDatabase() {
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    ensureExternalAiProposalsTable(db);
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

function gatewayHeaders(json = false) {
  return {
    "x-external-ai-key": "test-gateway-key",
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

test("Gateway 只读题目上下文和统计，并拒绝没有专用凭证的访问", async () => {
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

  const noCredential = await jsonRequest("/api/external-ai/question-stats", {
    headers: { "x-admin-key": "test-admin-key" }
  });
  assert.equal(noCredential.response.status, 401);
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
