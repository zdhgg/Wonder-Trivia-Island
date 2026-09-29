const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// 用独立的临时目录：既隔离正式题库，也避免和 core.test.js 的 .tmp 抢同一个库文件。
const tempDir = path.join(__dirname, ".tmp-import-review");
const tempDbPath = path.join(tempDir, "trivia.test.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;

const app = require("../src/app");
const { closeDatabaseConnection, createDatabaseConnection, dbPath, run } = require("../src/db/database");
const {
  ensureQuestionsTable,
  getQuestionCount,
  insertQuestions
} = require("../src/questions/repository");
const {
  commitPendingImport,
  discardPendingImportBatch,
  getPendingImportBatch,
  previewQuestionImport,
  stageQuestionImport
} = require("../src/services/questionImport");
const {
  clearPendingBatch,
  readPendingBatch,
  writePendingBatch
} = require("../src/services/questionImportStaging");
const { questions: SEED_QUESTIONS } = require("../scripts/questionSeedData");

// 真实批次里那 4 道题的 canonical 结构，用来反推 harness 提交的原始 row。
const REVIEW_QUESTIONS = [
  {
    subject: "数学",
    grade: "二年级",
    semester: "上册",
    knowledgeTag: "条件上手",
    type: "乘法应用",
    content: "题目要求填写乘法口诀。下面哪一个符合要求？",
    imageUrl: "",
    options: [
      { key: "A", text: "三六十八" },
      { key: "B", text: "3×6=18" },
      { key: "C", text: "18÷3=6" },
      { key: "D", text: "3+6=9" }
    ],
    answer: "A",
    explanation:
      "题目要的是乘法口诀，口诀用汉字写成一句，所以选「三六十八」。3×6=18 是乘法算式，18÷3=6 是除法算式，都不是口诀。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: "二年级",
    semester: "下册",
    knowledgeTag: "条件上手",
    type: "乘法应用",
    content: "题目要求写乘法算式。口诀「六七四十二」对应的乘法算式是哪一个？",
    imageUrl: "",
    options: [
      { key: "A", text: "六七四十二" },
      { key: "B", text: "6+7=13" },
      { key: "C", text: "42÷7=6" },
      { key: "D", text: "6×7=42" }
    ],
    answer: "D",
    explanation:
      "乘法算式用数字和乘号写成，口诀「六七四十二」对应的乘法算式是 6×7=42。「六七四十二」本身是乘法口诀，不是算式。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: "二年级",
    semester: "上册",
    knowledgeTag: "线索配齐",
    type: "乘法应用",
    content: "下面哪一句是乘法算式，不是乘法口诀？",
    imageUrl: "",
    options: [
      { key: "A", text: "七八五十六" },
      { key: "B", text: "8×7=56" },
      { key: "C", text: "六九五十四" },
      { key: "D", text: "三六十八" }
    ],
    answer: "B",
    explanation: "乘法算式用数字和乘号写，8×7=56 是算式。另外三句都是用汉字写的乘法口诀。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: "二年级",
    semester: "下册",
    knowledgeTag: "线索配齐",
    type: "乘法应用",
    content: "题目要求写乘法口诀，小亮写的是 6×9=54。下面哪种说法对？",
    imageUrl: "",
    options: [
      { key: "A", text: "小亮算错了，6×9 不等于 54" },
      { key: "B", text: "小亮算对了，只是没有写成口诀" },
      { key: "C", text: "6×9=54 也是一句乘法口诀" },
      { key: "D", text: "小亮应该写成 6+9=15" }
    ],
    answer: "B",
    explanation:
      "小亮算对了，只是没有写成口诀。6×9=54 是正确的乘法算式，口诀要写成「六九五十四」。",
    difficulty: 1
  }
];

// 每行答案对应的选项文本，用来验证「答案字母」和「选项内容」能正确对齐。
const EXPECTED_ANSWER_TEXTS = ["三六十八", "6×7=42", "8×7=56", "小亮算对了，只是没有写成口诀"];

function cloneQuestion(question) {
  return JSON.parse(JSON.stringify(question));
}

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
  } finally {
    closeDatabaseConnection(db);
  }
}

function seedQuestions(seedList) {
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    insertQuestions(db, seedList);
  } finally {
    closeDatabaseConnection(db);
  }
}

// 注意：不要在这里 clearPendingBatch()。
// writePendingBatch 走的是「临时文件 + rename」覆盖写，本身就能重置批次；
// 频繁删文件会撞上环境里的批量删除保护。
function stageReviewBatch({ source = "test:import-review" } = {}) {
  resetDatabase();

  return stageQuestionImport({
    rows: REVIEW_QUESTIONS.map(questionToImportRow),
    mode: "append",
    source
  });
}

function assertRowCarriesReviewFields(row, expected) {
  assert.ok(row, "行数据不能为空");

  for (const field of ["subject", "grade", "semester", "type", "knowledgeTag", "content"]) {
    assert.equal(row[field], expected[field], `${field} 应当透传到审核数据`);
  }

  assert.equal(row.difficulty, expected.difficulty, "difficulty 应当透传到审核数据");
  assert.deepEqual(row.options, expected.options, "options 必须完整保留");
  assert.equal(row.answer, expected.answer, "answer 必须保留");
  assert.equal(row.explanation, expected.explanation, "explanation 必须保留");
}

let server = null;
let baseUrl = "";

test.before(async () => {
  resetDatabase();

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
    server.on("error", reject);
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  clearPendingBatch();
});

// 1. 带 A-D + answer + explanation 的 row 经 stageQuestionImport() 后仍然完整。
test("stageQuestionImport 落盘的批次完整保留选项、答案与解析", () => {
  const batch = stageReviewBatch();
  const stored = readPendingBatch();

  assert.equal(stored.batchId, batch.batchId);
  assert.equal(stored.rows.length, REVIEW_QUESTIONS.length);

  stored.rows.forEach((row, index) => {
    assertRowCarriesReviewFields(row, REVIEW_QUESTIONS[index]);
  });
});

test("同一批题换成英文表头别名提交也能得到一致的 canonical 结构", () => {
  resetDatabase();

  const rows = REVIEW_QUESTIONS.map((question) => {
    const optionMap = Object.fromEntries(question.options.map((option) => [option.key, option.text]));

    return {
      subject: question.subject,
      grade: question.grade,
      semester: question.semester,
      knowledgeTag: question.knowledgeTag,
      type: question.type,
      content: question.content,
      optionA: optionMap.A,
      optionB: optionMap.B,
      optionC: optionMap.C,
      optionD: optionMap.D,
      answer: question.answer.toLowerCase(),
      explanation: question.explanation,
      difficulty: question.difficulty
    };
  });

  stageQuestionImport({ rows, mode: "append", source: "test:ascii-alias" });
  const stored = readPendingBatch();

  stored.rows.forEach((row, index) => {
    assertRowCarriesReviewFields(row, REVIEW_QUESTIONS[index]);
    assert.equal(row.answer, row.answer.toUpperCase(), "答案应当被归一化为大写");
  });
});

// 2. GET /pending 能返回审核 UI 需要的字段。
test("GET /api/questions/import/pending 返回审核页所需的全部字段", async () => {
  stageReviewBatch();

  const response = await fetch(`${baseUrl}/api/questions/import/pending`, { method: "GET" });
  assert.equal(response.status, 200);

  const payload = await response.json();
  const batch = payload?.batch;

  assert.ok(batch, "应当返回待确认批次");
  assert.equal(batch.rows.length, REVIEW_QUESTIONS.length);
  assert.equal(batch.validQuestions, undefined, "validQuestions 仍然不该暴露给页面");

  batch.rows.forEach((row, index) => {
    assertRowCarriesReviewFields(row, REVIEW_QUESTIONS[index]);
    assert.equal(row.status, "valid");
    assert.deepEqual(row.issues, []);
  });
});

// 3. 正确答案与选项文本能够对应。
test("答案字母能在同一行的选项中查到对应文本", () => {
  const stored = (() => {
    stageReviewBatch();
    return readPendingBatch();
  })();

  stored.rows.forEach((row, index) => {
    const matched = row.options.find((option) => option.key === row.answer);

    assert.ok(matched, `第 ${row.rowNumber} 行应当能按答案字母找到选项`);
    assert.equal(matched.text, EXPECTED_ANSWER_TEXTS[index], "答案指向的选项文本应当正确");
    assert.equal(row.options.length, 4, "四选一结构不应被改写");
  });
});

// 4. 旧批次缺少选项与解析时，接口不报错，仍然原样返回。
test("缺少选项与解析的旧批次可读且不报错", async () => {
  resetDatabase();

  writePendingBatch({
    batchId: "legacy-batch-without-details",
    createdAt: new Date().toISOString(),
    source: "legacy",
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
  });

  const served = getPendingImportBatch();

  assert.ok(served, "旧批次应当仍然可读");
  assert.equal(served.rows[0].answer, "A");
  assert.equal(served.rows[0].options, undefined, "旧批次本来就没有 options，保持原样");
  assert.equal(served.rows[0].explanation, undefined, "旧批次本来就没有 explanation，保持原样");

  const response = await fetch(`${baseUrl}/api/questions/import/pending`, { method: "GET" });
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.batch.rows[0].answer, "A");
  assert.equal(payload.batch.rows[0].options, undefined);
});

// 5. stage → pending → confirm 原有逻辑无回归。
test("stage → pending → confirm 链路仍然可用，且 confirm 后批次被清空", async () => {
  const batch = stageReviewBatch();

  const countBefore = (() => {
    const db = createDatabaseConnection();

    try {
      return getQuestionCount(db);
    } finally {
      closeDatabaseConnection(db);
    }
  })();

  const response = await fetch(`${baseUrl}/api/questions/import/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId: batch.batchId })
  });

  assert.equal(response.status, 200);

  const result = await response.json();

  assert.equal(result.batchId, batch.batchId);
  assert.equal(result.importedCount, REVIEW_QUESTIONS.length);
  assert.equal(result.totalQuestionCount, countBefore + REVIEW_QUESTIONS.length);

  const countAfter = (() => {
    const db = createDatabaseConnection();

    try {
      return getQuestionCount(db);
    } finally {
      closeDatabaseConnection(db);
    }
  })();

  assert.equal(countAfter, countBefore + REVIEW_QUESTIONS.length);
  assert.equal(getPendingImportBatch(), null, "确认后待确认批次应当被清空");
});

test("丢弃批次仍然按 batchId 校验，不一致时报错", () => {
  stageReviewBatch({ source: "test:discard" });
  const stored = readPendingBatch();

  assert.throws(
    () => discardPendingImportBatch({ batchId: "not-the-current-one" }),
    /待确认批次已经变化/
  );
  assert.ok(readPendingBatch(), "校验失败时不应当误删批次");
  assert.equal(readPendingBatch().batchId, stored.batchId);

  discardPendingImportBatch({ batchId: stored.batchId });
  assert.equal(readPendingBatch(), null);
});

// 6. duplicate / similar / warning / error 判断不受 preview 结构变更影响。
test("重复题、相似题与错误行判定不受选项字段加入的影响", () => {
  resetDatabase();

  const existing = cloneQuestion(SEED_QUESTIONS[0]);
  seedQuestions([existing]);

  const preview = previewQuestionImport(
    [
      questionToImportRow(existing),
      questionToImportRow({
        ...existing,
        content: `${existing.content}请选出正确的一项。`,
        explanation: `${existing.explanation}换个说法再练一次。`
      }),
      { ...questionToImportRow(existing), 答案: "E" },
      { ...questionToImportRow(existing), 难度: "9" }
    ],
    "append"
  );

  const rows = preview.rows;
  assert.equal(rows.length, 4);

  const duplicateRow = rows.find((row) => row.rowNumber === 2);
  assert.equal(duplicateRow.status, "warning");

  const duplicateIssue = duplicateRow.issues.find(
    (issue) => issue.comparison?.type === "existing_duplicate"
  );
  assert.ok(duplicateIssue, "完全重复仍应被识别为 existing_duplicate");
  assert.equal(duplicateIssue.comparison.recommendation.tone, "remove");

  const similarRow = rows.find((row) => row.rowNumber === 3);
  assert.equal(similarRow.status, "warning");

  const similarIssue = similarRow.issues.find((issue) => issue.comparison?.type === "existing_similar");
  assert.ok(similarIssue, "相似题仍应被识别为 existing_similar");
  assert.ok(similarIssue.comparison.similarityPercent > 0, "相似度百分比仍应给出");

  const answerRow = rows.find((row) => row.rowNumber === 4);
  assert.equal(answerRow.status, "error");
  assert.ok(
    answerRow.issues.some((issue) => issue.field === "answer" && /A、B、C、D/.test(issue.message)),
    "答案非法仍应报 error"
  );

  const difficultyRow = rows.find((row) => row.rowNumber === 5);
  assert.equal(difficultyRow.status, "error");
  assert.ok(
    difficultyRow.issues.some((issue) => issue.field === "difficulty"),
    "难度非法仍应报 error"
  );

  // 即使被判为 warning，审核字段也照样要带上，否则页面无法核对。
  assert.deepEqual(duplicateRow.options, existing.options);
  assert.equal(duplicateRow.explanation, existing.explanation);
  assert.deepEqual(similarRow.options, existing.options);
});

test("文件内重复行仍然按 file_duplicate 告警", () => {
  resetDatabase();

  const question = cloneQuestion(SEED_QUESTIONS[1]);
  const preview = previewQuestionImport(
    [questionToImportRow(question), questionToImportRow(cloneQuestion(question))],
    "append"
  );

  for (const row of preview.rows) {
    assert.equal(row.status, "warning");
    assert.ok(row.issues.some((issue) => issue.comparison?.type === "file_duplicate"));
    assert.deepEqual(row.options, question.options);
  }
});

test.after(() => {
  try {
    clearPendingBatch();
  } catch {
    // 收尾阶段不因清理失败而让测试失败。
  }

  const backupsDir = path.join(path.dirname(dbPath), "backups");

  try {
    if (fs.existsSync(backupsDir)) {
      fs.rmSync(backupsDir, { recursive: true, force: true });
    }

    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  } catch {
    // 沙箱文件系统偶发限制，忽略即可。
  }
});
