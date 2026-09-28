const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// 单独一个子目录：staging 目录是 path.dirname(dbPath) + "/staging"，
// 和其它测试文件共用 backend/test/.tmp 会争抢同一个 pending.json。
const tempDir = path.join(__dirname, ".tmp", "security-boundary");
const tempDbPath = path.join(tempDir, "trivia.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;
// 这组测试要分别覆盖「未配置 ADMIN_IMPORT_KEY」与「已配置」两条分支，先清空。
delete process.env.ADMIN_IMPORT_KEY;

const {
  MANAGEMENT_ACCESS,
  isLoopbackAddress,
  isLoopbackRequest,
  resolveManagementAccess
} = require("../src/security/localAccess");
// 删掉 HTTP 旁路之后，服务函数必须还在（commitPendingImport 依赖它）。
const {
  commitQuestionImport,
  discardPendingImportBatch,
  stageQuestionImport
} = require("../src/services/questionImport");
const app = require("../src/app");
const { questions } = require("../scripts/questionSeedData");
const { closeDatabaseConnection, createDatabaseConnection, run } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions } = require("../src/questions/repository");

const SAFE_SEED_QUESTIONS = questions.filter(
  (question) => !(question.grade === "一年级" && question.subject === "英语")
).slice(0, 2);

let server = null;
let baseUrl = "";

function questionToImportRow(question) {
  const optionMap = Object.fromEntries(question.options.map((option) => [option.key, option.text]));

  return {
    学科: question.subject,
    年级: question.grade,
    学期: question.semester,
    知识标签: question.knowledgeTag || "",
    题型: question.type,
    题目: question.content,
    题目图片: question.imageUrl || "",
    选项A: optionMap.A,
    选项B: optionMap.B,
    选项C: optionMap.C,
    选项D: optionMap.D,
    答案: question.answer,
    解析: question.explanation,
    难度: String(question.difficulty)
  };
}

function resetDatabase() {
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    run(db, "DELETE FROM questions");
    insertQuestions(db, [SAFE_SEED_QUESTIONS[0]]);
  } finally {
    closeDatabaseConnection(db);
  }
}

function clearStaging() {
  try {
    discardPendingImportBatch({});
  } catch {
    // 没有待确认批次时忽略。
  }
}

test.before(async () => {
  resetDatabase();
  clearStaging();

  await new Promise((resolve, reject) => {
    // 绑 127.0.0.1：测试进程内的所有 HTTP 流量都是 loopback，
    // 「非本机」这一路只能由 resolveManagementAccess 的纯函数测试覆盖。
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
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

  clearStaging();

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test.beforeEach(() => {
  resetDatabase();
  clearStaging();
});

// ---------------------------------------------------------------------------
// 1. loopback 地址判定
// ---------------------------------------------------------------------------

const LOOPBACK_ADDRESSES = [
  "127.0.0.1",
  // 整个 127.0.0.0/8 都是 loopback，不能只认 127.0.0.1
  "127.0.0.2",
  "127.1.2.3",
  "127.255.255.254",
  "::1",
  "0:0:0:0:0:0:0:1",
  "::ffff:127.0.0.1",
  "::ffff:127.9.9.9",
  "::1%lo0"
];

const NON_LOOPBACK_ADDRESSES = [
  "192.168.31.61",
  "10.0.0.5",
  "172.16.0.1",
  "172.22.192.1",
  "::ffff:192.168.31.61",
  "::ffff:10.0.0.5",
  "128.0.0.1",
  "126.255.255.255",
  "0.0.0.0",
  "fe80::1",
  "2001:db8::1",
  "::ffff:127.0.0.256",
  "127.0.0.256",
  "localhost",
  "1.2.3",
  "",
  "   ",
  null,
  undefined
];

test("isLoopbackAddress 只认真实的 loopback 地址", () => {
  for (const address of LOOPBACK_ADDRESSES) {
    assert.equal(isLoopbackAddress(address), true, `${String(address)} 应判定为 loopback`);
  }

  for (const address of NON_LOOPBACK_ADDRESSES) {
    assert.equal(isLoopbackAddress(address), false, `${String(address)} 不应判定为 loopback`);
  }
});

// ---------------------------------------------------------------------------
// 2. 伪造 forwarded header 完全无效
// ---------------------------------------------------------------------------

test("X-Forwarded-For / X-Real-IP / Forwarded / req.ip 都无法把非本机伪装成本机", () => {
  const forged = {
    ip: "127.0.0.1",
    socket: { remoteAddress: "192.168.31.61" },
    headers: {
      "x-forwarded-for": "127.0.0.1",
      "x-real-ip": "127.0.0.1",
      forwarded: "for=127.0.0.1;proto=http"
    }
  };

  assert.equal(isLoopbackRequest(forged), false, "伪造的请求头不得影响判定");

  // IPv4-mapped 的局域网地址同样不被伪造头救回来。
  assert.equal(
    isLoopbackRequest({
      socket: { remoteAddress: "::ffff:192.168.31.61" },
      headers: { "x-forwarded-for": "::1" }
    }),
    false
  );

  // 没有 socket 地址时一律按非本机处理，绝不能因为带了 XFF 就放行。
  assert.equal(isLoopbackRequest({ headers: { "x-forwarded-for": "127.0.0.1" } }), false);
  assert.equal(isLoopbackRequest({ socket: {}, headers: { "x-forwarded-for": "127.0.0.1" } }), false);
  assert.equal(isLoopbackRequest(undefined), false);

  // 真正的本机连接依然是本机。
  assert.equal(isLoopbackRequest({ socket: { remoteAddress: "::ffff:127.0.0.1" } }), true);
});

// ---------------------------------------------------------------------------
// 3. 管理面访问判定（纯函数，覆盖 HTTP 测不到的非本机分支）
// ---------------------------------------------------------------------------

test("resolveManagementAccess 的目标语义：real socket loopback OR valid ADMIN_IMPORT_KEY", () => {
  // 本机：无论有没有配置 Key、有没有带 Key、带的对不对，都放行。
  assert.deepEqual(resolveManagementAccess({ remoteAddress: "127.0.0.1" }), {
    allowed: true,
    reason: MANAGEMENT_ACCESS.ALLOW_LOOPBACK
  });
  assert.equal(resolveManagementAccess({ remoteAddress: "127.0.0.2", expectedKey: "k" }).allowed, true);
  assert.equal(
    resolveManagementAccess({ remoteAddress: "127.0.0.2", expectedKey: "k" }).reason,
    MANAGEMENT_ACCESS.ALLOW_LOOPBACK,
    "配置了 Key 时本机也不需要提供 Key"
  );
  assert.equal(
    resolveManagementAccess({ remoteAddress: "::1", expectedKey: "k", providedKey: "wrong" }).allowed,
    true,
    "本机带错 Key 也仍然是本机"
  );
  assert.equal(
    resolveManagementAccess({ remoteAddress: "::ffff:127.0.0.1", expectedKey: "k" }).reason,
    MANAGEMENT_ACCESS.ALLOW_LOOPBACK
  );

  // 非本机 + 正确 Key：放行。
  assert.deepEqual(resolveManagementAccess({ remoteAddress: "192.168.31.61", expectedKey: "k", providedKey: "k" }), {
    allowed: true,
    reason: MANAGEMENT_ACCESS.ALLOW_KEY
  });

  // 非本机 + 没带 Key：拒绝。
  assert.deepEqual(resolveManagementAccess({ remoteAddress: "192.168.31.61", expectedKey: "k" }), {
    allowed: false,
    reason: MANAGEMENT_ACCESS.DENY_INVALID_KEY
  });

  // 非本机 + 带错 Key：拒绝。
  assert.deepEqual(resolveManagementAccess({ remoteAddress: "10.0.0.9", expectedKey: "k", providedKey: "nope" }), {
    allowed: false,
    reason: MANAGEMENT_ACCESS.DENY_INVALID_KEY
  });

  // 非本机 + 服务端根本没配置 Key：拒绝。
  assert.deepEqual(resolveManagementAccess({ remoteAddress: "10.0.0.9" }), {
    allowed: false,
    reason: MANAGEMENT_ACCESS.DENY_LOOPBACK_REQUIRED
  });

  // IPv4-mapped 局域网地址 + 没有 Key：拒绝。
  assert.equal(resolveManagementAccess({ remoteAddress: "::ffff:192.168.31.61" }).allowed, false);

  // 空地址：拒绝（fail-closed）。
  assert.equal(resolveManagementAccess({ remoteAddress: "" }).allowed, false);
  assert.equal(resolveManagementAccess().allowed, false);
});

// ---------------------------------------------------------------------------
// 4. HTTP：管理接口在本机的真实行为
// ---------------------------------------------------------------------------

test("管理接口：配置了 ADMIN_IMPORT_KEY 时，本机浏览器依然免 Key", async () => {
  process.env.ADMIN_IMPORT_KEY = "test-admin-key";

  try {
    const withoutHeader = await fetch(`${baseUrl}/api/questions/import/pending`);
    assert.equal(withoutHeader.status, 200, "本机不需要管理口令");

    const withHeader = await fetch(`${baseUrl}/api/questions/import/pending`, {
      headers: { "x-admin-key": "test-admin-key" }
    });
    assert.equal(withHeader.status, 200);

    const withWrongHeader = await fetch(`${baseUrl}/api/questions/import/pending`, {
      headers: { "x-admin-key": "wrong-key" }
    });
    assert.equal(withWrongHeader.status, 200, "本机仍然免口令，错误口令不影响本机判定");

    const withForgedForwarded = await fetch(`${baseUrl}/api/questions/import/pending`, {
      headers: { "x-forwarded-for": "203.0.113.9" }
    });
    assert.equal(withForgedForwarded.status, 200, "本机就是本机，伪造 XFF 不改变结果");
  } finally {
    delete process.env.ADMIN_IMPORT_KEY;
  }
});

test("管理接口：未配置 ADMIN_IMPORT_KEY 时本机仍然可用", async () => {
  delete process.env.ADMIN_IMPORT_KEY;

  const response = await fetch(`${baseUrl}/api/questions/import/pending`);
  assert.equal(response.status, 200);
});

// ---------------------------------------------------------------------------
// 5. 删除 HTTP 旁路，保留 service
// ---------------------------------------------------------------------------

test("被删除的 POST /api/questions/import/commit 返回 404，且不再写库", async () => {
  const before = createDatabaseConnection();
  let beforeCount;

  try {
    beforeCount = Number(
      before.prepare("SELECT COUNT(*) AS count FROM questions").get()?.count ?? 0
    );
  } finally {
    closeDatabaseConnection(before);
  }

  const response = await fetch(`${baseUrl}/api/questions/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "replace",
      questions: [questionToImportRow(SAFE_SEED_QUESTIONS[1])]
    })
  });

  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, "Route not found.");

  const after = createDatabaseConnection();

  try {
    assert.equal(
      Number(after.prepare("SELECT COUNT(*) AS count FROM questions").get()?.count ?? 0),
      beforeCount,
      "被删除的旁路绝不能再写库"
    );
  } finally {
    closeDatabaseConnection(after);
  }
});

test("删掉的只是 HTTP 路由：commitQuestionImport 服务函数仍然存在且可用", () => {
  assert.equal(typeof commitQuestionImport, "function");

  const result = commitQuestionImport([SAFE_SEED_QUESTIONS[1]], "append");

  assert.equal(result.importedCount, 1);
  assert.ok(result.totalQuestionCount >= 1);
});

// ---------------------------------------------------------------------------
// 6. 正常的人工闸门流程不受影响
// ---------------------------------------------------------------------------

test("stage → pending → confirm 正常流程不受本轮收口影响", async () => {
  const rows = [questionToImportRow(SAFE_SEED_QUESTIONS[1])];

  const staged = await fetch(`${baseUrl}/api/questions/import/stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, mode: "append", source: "security-boundary-test" })
  });
  assert.equal(staged.status, 201);

  const stagedPayload = await staged.json();
  assert.equal(stagedPayload.batch.rowCount, 1);
  assert.equal(stagedPayload.batch.source, "security-boundary-test");

  const pending = await fetch(`${baseUrl}/api/questions/import/pending`);
  assert.equal(pending.status, 200);

  const pendingPayload = await pending.json();
  assert.equal(pendingPayload.batch.batchId, stagedPayload.batch.batchId);

  const confirmed = await fetch(`${baseUrl}/api/questions/import/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId: stagedPayload.batch.batchId })
  });
  assert.equal(confirmed.status, 200);

  const confirmedPayload = await confirmed.json();
  assert.equal(confirmedPayload.importedCount, 1);

  // 确认之后批次被清掉。
  const pendingAfter = await fetch(`${baseUrl}/api/questions/import/pending`);
  assert.equal((await pendingAfter.json()).batch, null);
});

test("不带 staging 的 stageQuestionImport 仍会拒绝有错误的批次", () => {
  assert.throws(
    () =>
      stageQuestionImport({
        rows: [{ 学科: "火星文", 年级: "二年级", 学期: "上册", 题型: "识字题", 题目: "非法数据" }],
        mode: "append",
        source: "security-boundary-test"
      }),
    (error) => error.code === "IMPORT_STAGE_BLOCKED"
  );
});

// ---------------------------------------------------------------------------
// 7. 学习面（A 类）依然不设防
// ---------------------------------------------------------------------------

test("孩子端学习接口不受管理面收口影响（本机与局域网使用同一套路由行为）", async () => {
  delete process.env.ADMIN_IMPORT_KEY;

  const learningPaths = [
    "/api/questions/random?count=1",
    "/api/questions/stats",
    "/api/health"
  ];

  for (const pathname of learningPaths) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 200, `${pathname} 必须保持可用`);
  }

  // 判题接口不调用模型、不写库，也不应受管理守卫影响。
  const submit = await fetch(`${baseUrl}/api/questions/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: 1, selectedOption: "A" })
  });
  assert.ok([200, 404].includes(submit.status), "判题接口不应返回 401/403");
});
