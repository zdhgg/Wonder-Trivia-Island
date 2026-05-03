const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "trivia.test.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;
process.env.OPENAI_API_KEY = "test-openai-key";

const app = require("../src/app");
const { questions } = require("../scripts/questionSeedData");
const { all, closeDatabaseConnection, createDatabaseConnection, dbPath, run } = require("../src/db/database");
const { getKnowledgeTagSearchTerms } = require("../src/questions/knowledgeTagAliases");
const { ensureQuestionsTable, insertQuestions } = require("../src/questions/repository");
const { commitQuestionImport, previewQuestionImport, validatePreparedQuestion } = require("../src/services/questionImport");
const { setOpenAIClientFactoryForTesting } = require("../src/services/questionGeneration");
const { setOpenAIReviewClientFactoryForTesting } = require("../src/services/questionReview");
const { setOpenAIProbeClientFactoryForTesting } = require("../src/services/aiRuntimeProbe");

function cloneQuestion(question) {
  return JSON.parse(JSON.stringify(question));
}

function makeUniqueQuestion(question, suffix) {
  const nextQuestion = cloneQuestion(question);

  nextQuestion.content = `${question.content} ${suffix}`;
  nextQuestion.explanation = `${question.explanation} ${suffix}`;

  return nextQuestion;
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

async function readJson(response) {
  return response.json();
}

function getCookieHeader(response) {
  const rawSetCookie = response.headers.get("set-cookie");

  if (!rawSetCookie) {
    return "";
  }

  return rawSetCookie.split(";")[0];
}

const CHALLENGE_ROUTE_KNOWLEDGE_TAGS = new Set([
  "看图起步",
  "顺序跟答",
  "数量找友",
  "短句抓点",
  "规律连答",
  "限时稳步",
  "启蒙冲线",
  "独立看题",
  "条件配对",
  "顺序推想",
  "比较判断",
  "口算稳住",
  "限时提速",
  "进阶冲线",
  "条件上手",
  "线索配齐",
  "短文找点",
  "图表看懂",
  "两步连推",
  "稳答提速",
  "方法冲线",
  "读题转弯",
  "信息拆分",
  "估算判断",
  "图文转换",
  "应用连推",
  "限时稳答",
  "综合冲线",
  "关键定位",
  "条件筛选",
  "多步计算",
  "图表整合",
  "推理连贯",
  "速度稳定",
  "章节冲线",
  "结构拆题",
  "证据比对",
  "关系推断",
  "多项统整",
  "表达判断",
  "高压稳答",
  "预演冲线",
  "审题锁点",
  "信息建模",
  "多步求解",
  "跨题迁移",
  "综合判断",
  "限时冲顶",
  "终章通关"
]);

function isChallengeRouteQuestion(question) {
  return CHALLENGE_ROUTE_KNOWLEDGE_TAGS.has(String(question?.knowledgeTag || "").trim());
}

let server = null;
let baseUrl = "";

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
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  const backupsDir = path.join(path.dirname(dbPath), "backups");

  if (fs.existsSync(backupsDir)) {
    fs.rmSync(backupsDir, { recursive: true, force: true });
  }

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }
});

test.beforeEach(() => {
  resetDatabase();
  setOpenAIClientFactoryForTesting(null);
  setOpenAIReviewClientFactoryForTesting(null);
  setOpenAIProbeClientFactoryForTesting(null);
});

test.after(() => {
  setOpenAIClientFactoryForTesting(null);
  setOpenAIReviewClientFactoryForTesting(null);
  setOpenAIProbeClientFactoryForTesting(null);
});

test("validatePreparedQuestion enforces the allowed type list", () => {
  const validQuestion = makeUniqueQuestion(questions[0], "[valid-type]");
  const validResult = validatePreparedQuestion(validQuestion, "题目");

  assert.equal(validResult.issues.length, 0);

  const invalidQuestion = {
    ...makeUniqueQuestion(questions[0], "[invalid-type]"),
    type: "火星题型"
  };
  const invalidResult = validatePreparedQuestion(invalidQuestion, "题目");

  assert.ok(invalidResult.issues.some((issue) => issue.includes("题型")));
});

test("seed data includes enough challenge questions for grades one to six semester routes", () => {
  const targets = [
    { grade: "一年级", semester: "上册", knowledgeTag: "看图起步", minimum: 6, difficulty: 1 },
    { grade: "一年级", semester: "上册", knowledgeTag: "顺序跟答", minimum: 10, difficulty: 1 },
    { grade: "一年级", semester: "上册", knowledgeTag: "数量找友", minimum: 10, difficulty: 2 },
    { grade: "一年级", semester: "上册", knowledgeTag: "短句抓点", minimum: 20, difficulty: 2 },
    { grade: "一年级", semester: "上册", knowledgeTag: "规律连答", minimum: 20, difficulty: 3 },
    { grade: "一年级", semester: "上册", knowledgeTag: "限时稳步", minimum: 16, difficulty: 3 },
    { grade: "一年级", semester: "上册", knowledgeTag: "启蒙冲线", minimum: 20, difficulty: 3 },
    { grade: "一年级", semester: "下册", knowledgeTag: "独立看题", minimum: 6, difficulty: 1 },
    { grade: "一年级", semester: "下册", knowledgeTag: "条件配对", minimum: 10, difficulty: 1 },
    { grade: "一年级", semester: "下册", knowledgeTag: "顺序推想", minimum: 10, difficulty: 2 },
    { grade: "一年级", semester: "下册", knowledgeTag: "比较判断", minimum: 20, difficulty: 2 },
    { grade: "一年级", semester: "下册", knowledgeTag: "口算稳住", minimum: 20, difficulty: 3 },
    { grade: "一年级", semester: "下册", knowledgeTag: "限时提速", minimum: 16, difficulty: 3 },
    { grade: "一年级", semester: "下册", knowledgeTag: "进阶冲线", minimum: 20, difficulty: 3 },
    { grade: "二年级", semester: "上册", knowledgeTag: "条件上手", minimum: 6, difficulty: 1 },
    { grade: "二年级", semester: "上册", knowledgeTag: "线索配齐", minimum: 10, difficulty: 1 },
    { grade: "二年级", semester: "上册", knowledgeTag: "短文找点", minimum: 10, difficulty: 2 },
    { grade: "二年级", semester: "上册", knowledgeTag: "图表看懂", minimum: 20, difficulty: 2 },
    { grade: "二年级", semester: "上册", knowledgeTag: "两步连推", minimum: 20, difficulty: 3 },
    { grade: "二年级", semester: "上册", knowledgeTag: "稳答提速", minimum: 16, difficulty: 3 },
    { grade: "二年级", semester: "上册", knowledgeTag: "方法冲线", minimum: 20, difficulty: 3 },
    { grade: "二年级", semester: "下册", knowledgeTag: "条件上手", minimum: 6, difficulty: 1 },
    { grade: "二年级", semester: "下册", knowledgeTag: "线索配齐", minimum: 10, difficulty: 1 },
    { grade: "二年级", semester: "下册", knowledgeTag: "短文找点", minimum: 10, difficulty: 2 },
    { grade: "二年级", semester: "下册", knowledgeTag: "图表看懂", minimum: 20, difficulty: 2 },
    { grade: "二年级", semester: "下册", knowledgeTag: "两步连推", minimum: 20, difficulty: 3 },
    { grade: "二年级", semester: "下册", knowledgeTag: "稳答提速", minimum: 16, difficulty: 3 },
    { grade: "二年级", semester: "下册", knowledgeTag: "方法冲线", minimum: 20, difficulty: 3 },
    { grade: "三年级", semester: "上册", knowledgeTag: "读题转弯", minimum: 6, difficulty: 1 },
    { grade: "三年级", semester: "上册", knowledgeTag: "信息拆分", minimum: 10, difficulty: 1 },
    { grade: "三年级", semester: "上册", knowledgeTag: "估算判断", minimum: 10, difficulty: 2 },
    { grade: "三年级", semester: "上册", knowledgeTag: "图文转换", minimum: 20, difficulty: 2 },
    { grade: "三年级", semester: "上册", knowledgeTag: "应用连推", minimum: 20, difficulty: 3 },
    { grade: "三年级", semester: "上册", knowledgeTag: "限时稳答", minimum: 16, difficulty: 3 },
    { grade: "三年级", semester: "上册", knowledgeTag: "综合冲线", minimum: 20, difficulty: 3 },
    { grade: "三年级", semester: "下册", knowledgeTag: "读题转弯", minimum: 6, difficulty: 1 },
    { grade: "三年级", semester: "下册", knowledgeTag: "信息拆分", minimum: 10, difficulty: 1 },
    { grade: "三年级", semester: "下册", knowledgeTag: "估算判断", minimum: 10, difficulty: 2 },
    { grade: "三年级", semester: "下册", knowledgeTag: "图文转换", minimum: 20, difficulty: 2 },
    { grade: "三年级", semester: "下册", knowledgeTag: "应用连推", minimum: 20, difficulty: 3 },
    { grade: "三年级", semester: "下册", knowledgeTag: "限时稳答", minimum: 16, difficulty: 3 },
    { grade: "三年级", semester: "下册", knowledgeTag: "综合冲线", minimum: 20, difficulty: 3 },
    { grade: "四年级", semester: "上册", knowledgeTag: "关键定位", minimum: 6, difficulty: 1 },
    { grade: "四年级", semester: "上册", knowledgeTag: "条件筛选", minimum: 10, difficulty: 1 },
    { grade: "四年级", semester: "上册", knowledgeTag: "多步计算", minimum: 10, difficulty: 2 },
    { grade: "四年级", semester: "上册", knowledgeTag: "图表整合", minimum: 20, difficulty: 2 },
    { grade: "四年级", semester: "上册", knowledgeTag: "推理连贯", minimum: 20, difficulty: 3 },
    { grade: "四年级", semester: "上册", knowledgeTag: "速度稳定", minimum: 16, difficulty: 3 },
    { grade: "四年级", semester: "上册", knowledgeTag: "章节冲线", minimum: 20, difficulty: 3 },
    { grade: "四年级", semester: "下册", knowledgeTag: "关键定位", minimum: 6, difficulty: 1 },
    { grade: "四年级", semester: "下册", knowledgeTag: "条件筛选", minimum: 10, difficulty: 1 },
    { grade: "四年级", semester: "下册", knowledgeTag: "多步计算", minimum: 10, difficulty: 2 },
    { grade: "四年级", semester: "下册", knowledgeTag: "图表整合", minimum: 20, difficulty: 2 },
    { grade: "四年级", semester: "下册", knowledgeTag: "推理连贯", minimum: 20, difficulty: 3 },
    { grade: "四年级", semester: "下册", knowledgeTag: "速度稳定", minimum: 16, difficulty: 3 },
    { grade: "四年级", semester: "下册", knowledgeTag: "章节冲线", minimum: 20, difficulty: 3 },
    { grade: "五年级", semester: "上册", knowledgeTag: "结构拆题", minimum: 6, difficulty: 1 },
    { grade: "五年级", semester: "上册", knowledgeTag: "证据比对", minimum: 10, difficulty: 1 },
    { grade: "五年级", semester: "上册", knowledgeTag: "关系推断", minimum: 10, difficulty: 2 },
    { grade: "五年级", semester: "上册", knowledgeTag: "多项统整", minimum: 20, difficulty: 2 },
    { grade: "五年级", semester: "上册", knowledgeTag: "表达判断", minimum: 20, difficulty: 3 },
    { grade: "五年级", semester: "上册", knowledgeTag: "高压稳答", minimum: 16, difficulty: 3 },
    { grade: "五年级", semester: "上册", knowledgeTag: "预演冲线", minimum: 20, difficulty: 3 },
    { grade: "五年级", semester: "下册", knowledgeTag: "结构拆题", minimum: 6, difficulty: 1 },
    { grade: "五年级", semester: "下册", knowledgeTag: "证据比对", minimum: 10, difficulty: 1 },
    { grade: "五年级", semester: "下册", knowledgeTag: "关系推断", minimum: 10, difficulty: 2 },
    { grade: "五年级", semester: "下册", knowledgeTag: "多项统整", minimum: 20, difficulty: 2 },
    { grade: "五年级", semester: "下册", knowledgeTag: "表达判断", minimum: 20, difficulty: 3 },
    { grade: "五年级", semester: "下册", knowledgeTag: "高压稳答", minimum: 16, difficulty: 3 },
    { grade: "五年级", semester: "下册", knowledgeTag: "预演冲线", minimum: 20, difficulty: 3 },
    { grade: "六年级", semester: "上册", knowledgeTag: "审题锁点", minimum: 6, difficulty: 1 },
    { grade: "六年级", semester: "上册", knowledgeTag: "信息建模", minimum: 10, difficulty: 1 },
    { grade: "六年级", semester: "上册", knowledgeTag: "多步求解", minimum: 10, difficulty: 2 },
    { grade: "六年级", semester: "上册", knowledgeTag: "跨题迁移", minimum: 20, difficulty: 2 },
    { grade: "六年级", semester: "上册", knowledgeTag: "综合判断", minimum: 20, difficulty: 3 },
    { grade: "六年级", semester: "上册", knowledgeTag: "限时冲顶", minimum: 16, difficulty: 3 },
    { grade: "六年级", semester: "上册", knowledgeTag: "终章通关", minimum: 20, difficulty: 3 },
    { grade: "六年级", semester: "下册", knowledgeTag: "审题锁点", minimum: 6, difficulty: 1 },
    { grade: "六年级", semester: "下册", knowledgeTag: "信息建模", minimum: 10, difficulty: 1 },
    { grade: "六年级", semester: "下册", knowledgeTag: "多步求解", minimum: 10, difficulty: 2 },
    { grade: "六年级", semester: "下册", knowledgeTag: "跨题迁移", minimum: 20, difficulty: 2 },
    { grade: "六年级", semester: "下册", knowledgeTag: "综合判断", minimum: 20, difficulty: 3 },
    { grade: "六年级", semester: "下册", knowledgeTag: "限时冲顶", minimum: 16, difficulty: 3 },
    { grade: "六年级", semester: "下册", knowledgeTag: "终章通关", minimum: 20, difficulty: 3 }
  ];

  for (const target of targets) {
    const count = questions.filter(
      (question) =>
        question.grade === target.grade &&
        question.semester === target.semester &&
        question.difficulty === target.difficulty &&
        question.knowledgeTag === target.knowledgeTag
    ).length;

    assert.ok(
      count >= target.minimum,
      `${target.grade}-${target.semester}-${target.knowledgeTag} 期望至少 ${target.minimum} 题，当前只有 ${count} 题。`
    );
  }
});

test("grade two to six challenge semesters use distinct prompts", () => {
  for (const grade of ["二年级", "三年级", "四年级", "五年级", "六年级"]) {
    const upperPrompts = new Set(
      questions
        .filter((question) => question.grade === grade && question.semester === "上册" && question.knowledgeTag)
        .map((question) => `${question.subject}|${question.content}`)
    );

    const overlaps = [
      ...new Set(
        questions
          .filter((question) => question.grade === grade && question.semester === "下册" && question.knowledgeTag)
          .map((question) => `${question.subject}|${question.content}`)
          .filter((prompt) => upperPrompts.has(prompt))
      )
    ];

    assert.deepEqual(overlaps, [], `${grade} 上下册仍有重复题干：${overlaps.join("；")}`);
  }
});

test("semester challenge routes keep balanced chinese and math coverage", () => {
  for (const grade of ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]) {
    for (const semester of ["上册", "下册"]) {
      const challengeQuestions = questions.filter(
        (question) => question.grade === grade && question.semester === semester && isChallengeRouteQuestion(question)
      );
      const chineseCount = challengeQuestions.filter((question) => question.subject === "语文").length;
      const mathCount = challengeQuestions.filter((question) => question.subject === "数学").length;

      assert.equal(chineseCount, 51, `${grade}-${semester} 语文挑战题应为 51 题，当前为 ${chineseCount} 题。`);
      assert.equal(mathCount, 51, `${grade}-${semester} 数学挑战题应为 51 题，当前为 ${mathCount} 题。`);
    }
  }
});

test("grade four to six English semester routes include direct question pools", () => {
  const englishTargets = [
    { grade: "四年级", semester: "上册", coreTags: ["课堂用语", "常识词汇", "时间词汇", "句子理解"] },
    { grade: "四年级", semester: "下册", coreTags: ["家庭成员", "天气词汇", "位置表达", "句型替换"] },
    { grade: "五年级", semester: "上册", coreTags: ["情景对话", "学校生活", "时间表达", "句型理解"] },
    { grade: "五年级", semester: "下册", coreTags: ["节日词汇", "位置表达", "食物词汇", "短文理解"] },
    { grade: "六年级", semester: "上册", coreTags: ["情景对话", "时间表达", "人物关系", "句型理解"] },
    { grade: "六年级", semester: "下册", coreTags: ["旅行场景", "健康表达", "位置表达", "阅读理解"] }
  ];

  for (const target of englishTargets) {
    const scopedQuestions = questions.filter(
      (question) =>
        question.subject === "英语" &&
        question.grade === target.grade &&
        question.semester === target.semester
    );

    assert.ok(
      scopedQuestions.length >= 12,
      `${target.grade}-${target.semester} 英语学期题应至少有 12 题，当前只有 ${scopedQuestions.length} 题。`
    );

    for (const tag of target.coreTags) {
      const matchedCount = scopedQuestions.filter((question) => question.knowledgeTag === tag).length;

      assert.ok(matchedCount >= 3, `${target.grade}-${target.semester}-${tag} 应至少有 3 题，当前只有 ${matchedCount} 题。`);
    }
  }
});

test("grade four to six previously thin route tags now have at least three direct questions", () => {
  const targets = [
    ["语文", "四年级", "上册", "观察表达"],
    ["语文", "四年级", "上册", "习作起步"],
    ["语文", "四年级", "上册", "细节描写"],
    ["数学", "四年级", "上册", "观察物体"],
    ["语文", "四年级", "下册", "成语理解"],
    ["语文", "四年级", "下册", "因果关系"],
    ["语文", "四年级", "下册", "文言启蒙"],
    ["语文", "四年级", "下册", "写景表达"],
    ["语文", "四年级", "下册", "细节描写"],
    ["语文", "四年级", "下册", "习作方法"],
    ["数学", "四年级", "下册", "质量单位"],
    ["数学", "四年级", "下册", "平行四边形"],
    ["语文", "五年级", "上册", "文言启蒙"],
    ["语文", "五年级", "上册", "记事表达"],
    ["语文", "五年级", "上册", "习作结构"],
    ["语文", "五年级", "上册", "场面描写"],
    ["语文", "五年级", "上册", "细节描写"],
    ["数学", "五年级", "上册", "因数与倍数"],
    ["数学", "五年级", "上册", "2和5的倍数特征"],
    ["数学", "五年级", "上册", "质数与合数"],
    ["数学", "五年级", "上册", "数的奇偶性"],
    ["语文", "五年级", "下册", "人物描写"],
    ["语文", "五年级", "下册", "古诗积累"],
    ["语文", "五年级", "下册", "传统文化"],
    ["语文", "五年级", "下册", "写人表达"],
    ["语文", "五年级", "下册", "写景表达"],
    ["语文", "五年级", "下册", "习作方法"],
    ["数学", "五年级", "下册", "可能性"],
    ["语文", "六年级", "上册", "文言句意"],
    ["语文", "六年级", "上册", "习作结构"],
    ["语文", "六年级", "上册", "观点表达"],
    ["语文", "六年级", "上册", "重点描写"],
    ["数学", "六年级", "上册", "扇形初步"],
    ["语文", "六年级", "下册", "词句品味"],
    ["语文", "六年级", "下册", "习作复习"],
    ["语文", "六年级", "下册", "写作思路"],
    ["语文", "六年级", "下册", "写人写事写景"],
    ["数学", "六年级", "下册", "表面积"]
  ];

  for (const [subject, grade, semester, knowledgeTag] of targets) {
    const matchedCount = questions.filter(
      (question) =>
        question.subject === subject &&
        question.grade === grade &&
        question.semester === semester &&
        question.knowledgeTag === knowledgeTag
    ).length;

    assert.ok(matchedCount >= 3, `${grade}-${semester}-${knowledgeTag} 应至少有 3 道直连题，当前只有 ${matchedCount} 题。`);
  }
});

test("high priority low-supply route tags now have at least three matched questions", () => {
  const targets = [
    ["语文", "四年级", "上册", "近义词辨析"],
    ["语文", "四年级", "上册", "词语搭配"],
    ["语文", "四年级", "上册", "词语运用"],
    ["语文", "四年级", "上册", "比喻句"],
    ["语文", "四年级", "上册", "拟人句"],
    ["数学", "四年级", "上册", "大数认识"],
    ["数学", "四年级", "上册", "数位顺序表"],
    ["数学", "四年级", "上册", "数的改写"],
    ["数学", "四年级", "上册", "近似数"],
    ["数学", "四年级", "上册", "试商"],
    ["数学", "四年级", "上册", "商的变化规律"],
    ["数学", "四年级", "上册", "角的认识"],
    ["数学", "四年级", "上册", "角的分类"],
    ["数学", "四年级", "上册", "平行与垂直"],
    ["英语", "四年级", "上册", "情景对话"],
    ["英语", "四年级", "上册", "句子选择"],
    ["英语", "四年级", "上册", "日常问答"],
    ["英语", "四年级", "上册", "词义判断"],
    ["英语", "四年级", "上册", "数字单词"],
    ["英语", "四年级", "上册", "句意理解"],
    ["英语", "四年级", "上册", "短语理解"],
    ["英语", "四年级", "下册", "物品词汇"],
    ["英语", "四年级", "下册", "句意理解"],
    ["英语", "四年级", "下册", "词义判断"],
    ["英语", "四年级", "下册", "短语理解"],
    ["英语", "四年级", "下册", "句子理解"],
    ["英语", "四年级", "下册", "阅读理解"],
    ["英语", "四年级", "下册", "短文理解"],
    ["语文", "四年级", "下册", "词语运用"],
    ["语文", "四年级", "下册", "顺序关系"],
    ["语文", "四年级", "下册", "古诗积累"],
    ["语文", "四年级", "下册", "传统文化"],
    ["数学", "四年级", "下册", "三角形分类"],
    ["数学", "四年级", "下册", "三角形特性"],
    ["数学", "四年级", "下册", "图形认识"],
    ["数学", "四年级", "下册", "平均数"],
    ["语文", "五年级", "上册", "词义理解"],
    ["语文", "五年级", "上册", "近义词辨析"],
    ["语文", "五年级", "上册", "成语运用"],
    ["语文", "五年级", "上册", "词语运用"],
    ["语文", "五年级", "上册", "古诗理解"],
    ["语文", "五年级", "上册", "传统文化"],
    ["语文", "五年级", "上册", "表达方法"],
    ["数学", "五年级", "上册", "小数大小比较"],
    ["数学", "五年级", "上册", "小数减法"],
    ["英语", "五年级", "上册", "句子选择"],
    ["英语", "五年级", "上册", "句意理解"],
    ["英语", "五年级", "上册", "阅读理解"],
    ["英语", "五年级", "上册", "短语理解"],
    ["英语", "五年级", "上册", "句意判断"],
    ["语文", "五年级", "下册", "词语感情色彩"],
    ["语文", "五年级", "下册", "修辞运用"],
    ["语文", "五年级", "下册", "比喻句"],
    ["语文", "五年级", "下册", "排比句"],
    ["语文", "五年级", "下册", "文言句意"],
    ["英语", "五年级", "下册", "情景对话"],
    ["英语", "五年级", "下册", "短语理解"],
    ["英语", "五年级", "下册", "句意理解"],
    ["英语", "五年级", "下册", "阅读理解"],
    ["英语", "五年级", "下册", "句型替换"],
    ["语文", "六年级", "上册", "词句品味"],
    ["语文", "六年级", "上册", "修辞作用"],
    ["语文", "六年级", "上册", "句子理解"],
    ["语文", "六年级", "上册", "表达效果"],
    ["语文", "六年级", "上册", "表达方法"],
    ["英语", "六年级", "上册", "句子选择"],
    ["英语", "六年级", "上册", "句意理解"],
    ["英语", "六年级", "上册", "短文理解"],
    ["英语", "六年级", "上册", "阅读理解"],
    ["英语", "六年级", "上册", "句意判断"],
    ["数学", "六年级", "上册", "分数应用"],
    ["数学", "六年级", "上册", "倒数"],
    ["数学", "六年级", "上册", "圆的周长"],
    ["数学", "六年级", "上册", "圆的面积"],
    ["数学", "六年级", "上册", "百分数意义"],
    ["数学", "六年级", "上册", "百分数应用"],
    ["数学", "六年级", "上册", "比值"],
    ["语文", "六年级", "下册", "信息整合"],
    ["语文", "六年级", "下册", "表达方法"],
    ["语文", "六年级", "下册", "语言赏析"],
    ["语文", "六年级", "下册", "修辞作用"],
    ["语文", "六年级", "下册", "古诗文复习"],
    ["语文", "六年级", "下册", "文言句意"],
    ["数学", "六年级", "下册", "分数应用"],
    ["数学", "六年级", "下册", "倒数"],
    ["数学", "六年级", "下册", "正比例初步"],
    ["数学", "六年级", "下册", "反比例初步"],
    ["数学", "六年级", "下册", "圆柱认识"],
    ["数学", "六年级", "下册", "圆柱体积"],
    ["数学", "六年级", "下册", "统计整理"],
    ["数学", "六年级", "下册", "折线统计图"],
    ["英语", "六年级", "下册", "活动安排"],
    ["英语", "六年级", "下册", "句子选择"],
    ["英语", "六年级", "下册", "短语理解"],
    ["英语", "六年级", "下册", "短文理解"],
    ["英语", "六年级", "下册", "句型复习"]
  ];

  for (const [subject, grade, semester, knowledgeTag] of targets) {
    const searchTerms = getKnowledgeTagSearchTerms(knowledgeTag);
    const matchedCount = questions.filter(
      (question) =>
        question.subject === subject &&
        question.grade === grade &&
        question.semester === semester &&
        (searchTerms.includes(String(question.knowledgeTag || "").trim()) || searchTerms.includes(String(question.type || "").trim()))
    ).length;

    assert.ok(matchedCount >= 3, `${grade}-${semester}-${knowledgeTag} 应至少有 3 道匹配题，当前只有 ${matchedCount} 题。`);
  }
});

test("insertQuestions works inside an outer transaction and fills timestamps", () => {
  const sampleQuestions = [
    makeUniqueQuestion(questions[0], "[txn-1]"),
    makeUniqueQuestion(questions[1], "[txn-2]")
  ];
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    run(db, "BEGIN TRANSACTION");
    insertQuestions(db, sampleQuestions);
    run(db, "COMMIT");

    const rows = all(
      db,
      `
        SELECT content, createdAt, updatedAt
        FROM questions
        ORDER BY id ASC
      `
    );

    assert.equal(rows.length, sampleQuestions.length);
    assert.ok(rows.every((row) => row.createdAt && row.updatedAt));
  } finally {
    closeDatabaseConnection(db);
  }
});

test("commitQuestionImport replace mode reports counts and creates a backup", () => {
  const firstBatch = [makeUniqueQuestion(questions[2], "[import-before]")];
  const replaceBatch = [
    makeUniqueQuestion(questions[3], "[import-replace-1]"),
    makeUniqueQuestion(questions[4], "[import-replace-2]")
  ];

  commitQuestionImport(firstBatch, "append");
  const result = commitQuestionImport(replaceBatch, "replace");

  assert.equal(result.previousQuestionCount, 1);
  assert.equal(result.importedCount, 2);
  assert.equal(result.totalQuestionCount, 2);
  assert.ok(result.backupPath);
  assert.ok(fs.existsSync(result.backupPath));
});

test("previewQuestionImport warns when a new row is highly similar to an existing question", () => {
  seedQuestions([
    {
      subject: "数学",
      grade: "三年级",
      semester: "通用",
      type: "情景计算",
      content: "环保角今天回收了14个塑料瓶，后来又收到6个，现在一共有多少个？",
      options: [
        { key: "A", text: "18个" },
        { key: "B", text: "20个" },
        { key: "C", text: "22个" },
        { key: "D", text: "24个" }
      ],
      answer: "B",
      explanation: "14 + 6 = 20，所以一共有20个。",
      difficulty: 1
    }
  ]);

  const previewResult = previewQuestionImport([
    {
      学科: "数学",
      年级: "三年级",
      学期: "通用",
      题型: "情景计算",
      题目: "环保角先回收14个塑料瓶，又收到6个，现在共有多少个？",
      选项A: "18个",
      选项B: "20个",
      选项C: "22个",
      选项D: "24个",
      答案: "B",
      解析: "14 + 6 = 20，所以现在共有20个。",
      难度: "1"
    }
  ]);

  assert.equal(previewResult.summary.validRows, 1);
  assert.equal(previewResult.summary.warningRows, 1);
  assert.equal(previewResult.rows[0].status, "warning");
  const similarityIssue = previewResult.rows[0].issues.find((issue) => issue.message.includes("题库中存在相似题"));

  assert.ok(similarityIssue);
  assert.equal(similarityIssue.comparison?.type, "existing_similar");
  assert.ok(similarityIssue.comparison?.targetLabel?.startsWith("题号 #"));
  assert.ok(Number(similarityIssue.comparison?.similarityPercent) >= 70);

  const similarityPercent = Number(similarityIssue.comparison?.similarityPercent);
  const expectedRecommendationLabel =
    similarityPercent >= 90 ? "建议删除" : similarityPercent >= 82 ? "建议合并" : "建议保留";

  assert.equal(similarityIssue.comparison?.recommendation?.label, expectedRecommendationLabel);
  assert.ok(["remove", "merge", "keep"].includes(similarityIssue.comparison?.recommendation?.tone));
  assert.ok(similarityIssue.comparison?.recommendation?.reason);
});

test("previewQuestionImport adds a delete recommendation for an exact existing duplicate", () => {
  const existingQuestion = cloneQuestion(questions.find((question) => question.subject === "语文"));

  seedQuestions([existingQuestion]);

  const previewResult = previewQuestionImport([questionToImportRow(existingQuestion)]);

  const duplicateIssue = previewResult.rows[0].issues.find((issue) => issue.comparison?.type === "existing_duplicate");

  assert.ok(duplicateIssue);
  assert.equal(duplicateIssue.comparison?.recommendation?.label, "建议删除");
  assert.equal(duplicateIssue.comparison?.recommendation?.tone, "remove");
  assert.ok(duplicateIssue.comparison?.recommendation?.reason);
});

test("question routes support grouped stats, single create, subject random filter, and judging", async () => {
  const chineseQuestion = makeUniqueQuestion(
    questions.find((question) => question.subject === "语文"),
    "[route-chinese]"
  );
  const mathQuestions = [
    makeUniqueQuestion(
      questions.find((question) => question.subject === "数学"),
      "[route-math-1]"
    ),
    makeUniqueQuestion(
      questions.find((question, index) => question.subject === "数学" && index > 1),
      "[route-math-2]"
    )
  ];

  seedQuestions([chineseQuestion, ...mathQuestions]);

  const statsResponse = await fetch(`${baseUrl}/api/questions/stats`);
  assert.equal(statsResponse.status, 200);

  const statsPayload = await readJson(statsResponse);
  assert.equal(statsPayload.total, 3);
  assert.equal(statsPayload.bySubject.语文, 1);
  assert.equal(statsPayload.bySubject.数学, 2);

  const createdQuestionPayload = makeUniqueQuestion(
    questions.find((question) => question.subject === "数学" && question.grade !== "一年级"),
    "[route-create]"
  );
  const createResponse = await fetch(`${baseUrl}/api/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(createdQuestionPayload)
  });

  assert.equal(createResponse.status, 201);

  const createPayload = await readJson(createResponse);
  assert.equal(createPayload.data.subject, createdQuestionPayload.subject);
  assert.equal(createPayload.data.imageUrl || "", createdQuestionPayload.imageUrl || "");
  assert.ok(createPayload.data.createdAt);
  assert.ok(createPayload.data.updatedAt);

  const randomResponse = await fetch(`${baseUrl}/api/questions/random?subject=%E6%95%B0%E5%AD%A6&count=10`);
  assert.equal(randomResponse.status, 200);

  const randomPayload = await readJson(randomResponse);
  assert.ok(randomPayload.data.length >= 1);
  assert.ok(randomPayload.data.every((question) => question.subject === "数学"));

  const submitResponse = await fetch(`${baseUrl}/api/questions/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionId: createPayload.data.id,
      selectedOption: createdQuestionPayload.answer
    })
  });

  assert.equal(submitResponse.status, 200);

  const submitPayload = await readJson(submitResponse);
  assert.equal(submitPayload.correct, true);
  assert.equal(submitPayload.correctAnswer, createdQuestionPayload.answer);
});

test("question random route can fall back from semester-specific questions to generic semester questions", async () => {
  seedQuestions([
    {
      subject: "数学",
      grade: "四年级",
      semester: "上册",
      type: "情景计算",
      content: "四年级上册回落测试：图书角原有18本书，又放进7本，现在有多少本？",
      options: [
        { key: "A", text: "24本" },
        { key: "B", text: "25本" },
        { key: "C", text: "26本" },
        { key: "D", text: "27本" }
      ],
      answer: "B",
      explanation: "18 + 7 = 25，所以现在有25本。",
      difficulty: 1
    },
    {
      subject: "数学",
      grade: "四年级",
      semester: "通用",
      type: "情景计算",
      content: "四年级通用回落测试：操场边有16盆花，又搬来5盆，现在一共有多少盆？",
      options: [
        { key: "A", text: "19盆" },
        { key: "B", text: "20盆" },
        { key: "C", text: "21盆" },
        { key: "D", text: "22盆" }
      ],
      answer: "C",
      explanation: "16 + 5 = 21，所以现在一共有21盆。",
      difficulty: 1
    }
  ]);

  const withoutFallbackResponse = await fetch(
    `${baseUrl}/api/questions/random?subject=%E6%95%B0%E5%AD%A6&grade=%E5%9B%9B%E5%B9%B4%E7%BA%A7&semester=%E4%B8%8A%E5%86%8C&count=2`
  );
  assert.equal(withoutFallbackResponse.status, 200);

  const withoutFallbackPayload = await readJson(withoutFallbackResponse);
  assert.equal(withoutFallbackPayload.data.length, 1);
  assert.equal(withoutFallbackPayload.usedSemesterFallback, false);
  assert.ok(withoutFallbackPayload.data.every((question) => question.semester === "上册"));

  const withFallbackResponse = await fetch(
    `${baseUrl}/api/questions/random?subject=%E6%95%B0%E5%AD%A6&grade=%E5%9B%9B%E5%B9%B4%E7%BA%A7&semester=%E4%B8%8A%E5%86%8C&count=2&allowSemesterFallback=1`
  );
  assert.equal(withFallbackResponse.status, 200);

  const withFallbackPayload = await readJson(withFallbackResponse);
  const semesters = [...new Set(withFallbackPayload.data.map((question) => question.semester))].sort();

  assert.equal(withFallbackPayload.data.length, 2);
  assert.equal(withFallbackPayload.usedKnowledgeTagFallback, false);
  assert.equal(withFallbackPayload.usedSemesterFallback, true);
  assert.deepEqual(semesters, ["上册", "通用"]);
});

test("question routes match systematic knowledge tags against aliased type labels", async () => {
  seedQuestions([
    {
      subject: "语文",
      grade: "六年级",
      semester: "下册",
      knowledgeTag: "",
      type: "方法理解",
      content: "六年级下册别名测试：这句话主要用了什么表达方法来突出重点？",
      options: [
        { key: "A", text: "只列数字" },
        { key: "B", text: "抓住写法和作用一起理解" },
        { key: "C", text: "完全不联系上下文" },
        { key: "D", text: "只看标点停顿" }
      ],
      answer: "B",
      explanation: "理解表达方法时，要联系具体写法和表达作用一起判断。",
      difficulty: 2
    },
    {
      subject: "数学",
      grade: "四年级",
      semester: "下册",
      knowledgeTag: "",
      type: "小数认识",
      content: "四年级下册别名测试：0.6 里面有几个十分之一？",
      options: [
        { key: "A", text: "4 个" },
        { key: "B", text: "5 个" },
        { key: "C", text: "6 个" },
        { key: "D", text: "10 个" }
      ],
      answer: "C",
      explanation: "0.6 表示 6 个十分之一，所以选 C。",
      difficulty: 1
    }
  ]);

  const coverageResponse = await fetch(`${baseUrl}/api/questions/coverage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      targets: [
        {
          key: "chinese-method",
          subject: "语文",
          grade: "六年级",
          semester: "下册",
          knowledgeTag: "表达方法"
        },
        {
          key: "math-decimal",
          subject: "数学",
          grade: "四年级",
          semester: "下册",
          knowledgeTag: "小数初步"
        }
      ]
    })
  });
  assert.equal(coverageResponse.status, 200);

  const coveragePayload = await readJson(coverageResponse);
  assert.deepEqual(coveragePayload.data, [
    { key: "chinese-method", count: 1 },
    { key: "math-decimal", count: 1 }
  ]);

  const randomResponse = await fetch(
    `${baseUrl}/api/questions/random?subject=%E8%AF%AD%E6%96%87&grade=%E5%85%AD%E5%B9%B4%E7%BA%A7&semester=%E4%B8%8B%E5%86%8C&knowledgeTag=%E8%A1%A8%E8%BE%BE%E6%96%B9%E6%B3%95&count=1`
  );
  assert.equal(randomResponse.status, 200);

  const randomPayload = await readJson(randomResponse);
  assert.equal(randomPayload.usedKnowledgeTagFallback, false);
  assert.equal(randomPayload.data.length, 1);
  assert.equal(randomPayload.data[0].type, "方法理解");

  const statsResponse = await fetch(`${baseUrl}/api/questions/stats`);
  assert.equal(statsResponse.status, 200);

  const statsPayload = await readJson(statsResponse);
  assert.ok(statsPayload.topKnowledgeTags.some((item) => item.label === "方法理解" && item.count === 1));
  assert.ok(statsPayload.topKnowledgeTags.some((item) => item.label === "小数认识" && item.count === 1));
});

test("question routes can generate a validated AI draft without auto-saving it", async () => {
  const generationRuntimeCalls = [];
  const generatedQuestions = [
    {
      subject: "数学",
      grade: "三年级",
      semester: "通用",
      type: "情景计算",
      content: "环保角今天回收了 14 个塑料瓶，后来又收到 6 个，现在一共有多少个？",
      options: [
        { key: "A", text: "18 个" },
        { key: "B", text: "20 个" },
        { key: "C", text: "22 个" },
        { key: "D", text: "24 个" }
      ],
      answer: "B",
      explanation: "14 + 6 = 20，所以现在一共有 20 个。",
      difficulty: 1
    },
    {
      subject: "数学",
      grade: "三年级",
      semester: "通用",
      type: "情景计算",
      content: "节水宣传角上午贴了 9 张海报，下午又贴了 7 张，一共贴了多少张？",
      options: [
        { key: "A", text: "14 张" },
        { key: "B", text: "15 张" },
        { key: "C", text: "16 张" },
        { key: "D", text: "17 张" }
      ],
      answer: "C",
      explanation: "9 + 7 = 16，所以一共贴了 16 张。",
      difficulty: 1
    },
    {
      subject: "数学",
      grade: "三年级",
      semester: "通用",
      type: "情景计算",
      content: "回收箱里原来有 12 节旧电池，又放进 5 节，现在共有多少节？",
      options: [
        { key: "A", text: "15 节" },
        { key: "B", text: "16 节" },
        { key: "C", text: "17 节" },
        { key: "D", text: "18 节" }
      ],
      answer: "C",
      explanation: "12 + 5 = 17，所以现在共有 17 节。",
      difficulty: 1
    }
  ];

  setOpenAIClientFactoryForTesting((runtimeConfig) => {
    generationRuntimeCalls.push(runtimeConfig);
    return {
      responses: {
        parse: async () => ({
          id: "resp_test_generate_question",
          model: "gpt-5.4-mini",
          output_parsed: {
            questions: generatedQuestions
          }
        })
      },
      chat: {
        completions: {
          create: async () => ({
            id: "chatcmpl_test_generate_question",
            model: "gpt-5.4-mini",
            choices: [
              {
                message: {
                  content: JSON.stringify({ questions: generatedQuestions })
                }
              }
            ]
          })
        }
      }
    };
  });

  const response = await fetch(`${baseUrl}/api/questions/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      subject: "数学",
      grade: "三年级",
      semester: "通用",
      count: 3,
      difficulty: 1,
      topic: "环保回收",
      guidance: "请写得生活化一些。",
      referenceText: "三年级同学在校园环保角开展塑料瓶回收活动。",
      aiRuntime: {
        providerLabel: "OpenAI Compatible",
        baseUrl: "https://example.com/v1",
        apiKey: "test-provider-key"
      }
    })
  });

  assert.equal(response.status, 200);

  const payload = await readJson(response);
  assert.equal(generationRuntimeCalls.length, 1);
  assert.equal(generationRuntimeCalls[0].baseUrl, "https://example.com/v1");
  assert.equal(generationRuntimeCalls[0].apiKey, "test-provider-key");
  assert.equal(payload.data.subject, "数学");
  assert.equal(payload.data.grade, "三年级");
  assert.equal(payload.data.answer, "B");
  assert.equal(payload.drafts.length, 3);
  assert.equal(payload.drafts[2].content, generatedQuestions[2].content);
  assert.equal(payload.meta.sourceMode, "reference");

  const db = createDatabaseConnection();

  try {
    const row = all(db, "SELECT COUNT(*) AS count FROM questions");
    assert.equal(Number(row[0]?.count || 0), 0);
  } finally {
    closeDatabaseConnection(db);
  }
});

test("question routes can test AI runtime connectivity for current provider and models", async () => {
  const probeRuntimeCalls = [];
  const probeParseCalls = [];
  const probeSpeechCalls = [];

  setOpenAIProbeClientFactoryForTesting((runtimeConfig) => {
    probeRuntimeCalls.push(runtimeConfig);
    return {
      responses: {
        parse: async (request) => {
          probeParseCalls.push(request);
          return {
            id: `resp_probe_${probeParseCalls.length}`,
            model: request.model,
            output_parsed: {
              status: "ok"
            }
          };
        }
      },
      chat: {
        completions: {
          create: async (request) => ({
            id: `chatcmpl_probe_${probeParseCalls.length + 1}`,
            model: request.model,
            choices: [
              {
                message: {
                  content: JSON.stringify({ status: "ok" })
                }
              }
            ]
          })
        }
      },
      audio: {
        speech: {
          create: async (request) => {
            probeSpeechCalls.push(request);
            return {
              arrayBuffer: async () => Buffer.from("probe-mp3-audio")
            };
          }
        }
      }
    };
  });

  const response = await fetch(`${baseUrl}/api/questions/ai/runtime-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionModel: "gpt-5.4-mini",
      reviewModel: "gpt-5.4-mini",
      ttsModel: "gpt-4o-mini-tts",
      aiRuntime: {
        providerLabel: "OpenAI Compatible",
        baseUrl: "https://example.com/v1",
        apiKey: "test-provider-key"
      }
    })
  });

  assert.equal(response.status, 200);

  const payload = await readJson(response);
  assert.equal(payload.data.allPassed, true);
  assert.equal(payload.data.tests.length, 3);
  assert.equal(probeRuntimeCalls.length, 1);
  assert.equal(probeRuntimeCalls[0].baseUrl, "https://example.com/v1");
  assert.equal(probeRuntimeCalls[0].apiKey, "test-provider-key");
  assert.equal(probeParseCalls.length, 2);
  assert.equal(probeSpeechCalls.length, 1);
  assert.equal(probeSpeechCalls[0].model, "gpt-4o-mini-tts");
});

test("question routes reject runtime overrides that provide a baseUrl without a custom apiKey", async () => {
  const runtimeCheckResponse = await fetch(`${baseUrl}/api/questions/ai/runtime-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionModel: "gpt-5.4-mini",
      aiRuntime: {
        providerLabel: "OpenAI Compatible",
        baseUrl: "https://example.com/v1"
      }
    })
  });

  assert.equal(runtimeCheckResponse.status, 400);

  const runtimeCheckPayload = await readJson(runtimeCheckResponse);
  assert.equal(runtimeCheckPayload.message, "AI 运行时配置无效。");
  assert.ok(runtimeCheckPayload.details.includes("aiRuntime.baseUrl 仅在同时提供 aiRuntime.apiKey 时才允许自定义。"));

  seedQuestions([
    {
      subject: "数学",
      grade: "三年级",
      semester: "通用",
      knowledgeTag: "加法应用",
      type: "情景计算",
      content: "小松鼠收集了 9 颗松果，又找到 4 颗，现在一共有多少颗？",
      options: [
        { key: "A", text: "11 颗" },
        { key: "B", text: "12 颗" },
        { key: "C", text: "13 颗" },
        { key: "D", text: "14 颗" }
      ],
      answer: "C",
      explanation: "9 + 4 = 13，所以现在一共有 13 颗。",
      difficulty: 1
    }
  ]);

  const db = createDatabaseConnection();
  let questionId = 0;

  try {
    questionId = Number(all(db, "SELECT id FROM questions LIMIT 1")[0]?.id || 0);
  } finally {
    closeDatabaseConnection(db);
  }

  const reviewResponse = await fetch(`${baseUrl}/api/questions/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionId,
      selectedOption: "A",
      aiRuntime: {
        providerLabel: "OpenAI Compatible",
        baseUrl: "https://example.com/v1"
      }
    })
  });

  assert.equal(reviewResponse.status, 400);

  const reviewPayload = await readJson(reviewResponse);
  assert.equal(reviewPayload.message, "AI 运行时配置无效。");
  assert.ok(reviewPayload.details.includes("aiRuntime.baseUrl 仅在同时提供 aiRuntime.apiKey 时才允许自定义。"));
});

test("question routes can fall back to chat completions when responses API is unavailable", async () => {
  const probeSpeechCalls = [];

  setOpenAIProbeClientFactoryForTesting(() => ({
    responses: {
      parse: async () => {
        const error = new Error("404 Not Found");
        error.status = 404;
        throw error;
      }
    },
    chat: {
      completions: {
        create: async (request) => {
          if (request.model === "mimo-v2.5-tts") {
            return {
              id: "chatcmpl_probe_fallback_tts",
              model: request.model,
              choices: [
                {
                  message: {
                    audio: {
                      data: Buffer.from("fake-mimo-wav").toString("base64")
                    }
                  }
                }
              ]
            };
          }

          return {
            id: "chatcmpl_probe_fallback",
            model: request.model,
            choices: [
              {
                message: {
                  content: JSON.stringify({ status: "ok" })
                }
              }
            ]
          };
        }
      }
    },
    audio: {
      speech: {
        create: async (request) => {
          probeSpeechCalls.push(request);
          return {
            arrayBuffer: async () => Buffer.from("probe-mp3-audio")
          };
        }
      }
    }
  }));

  const response = await fetch(`${baseUrl}/api/questions/ai/runtime-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionModel: "mimo-v2.5-pro",
      reviewModel: "mimo-v2.5-pro",
      ttsModel: "mimo-v2.5-tts",
      aiRuntime: {
        providerLabel: "Xiaomi MiMo",
        baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        apiKey: "test-provider-key"
      }
    })
  });

  assert.equal(response.status, 200);

  const payload = await readJson(response);
  assert.equal(payload.data.allPassed, true);
  assert.equal(payload.data.tests[0].type, "chat.completions");
  assert.equal(payload.data.tests[1].type, "chat.completions");
  assert.equal(payload.data.tests[2].type, "chat.completions.audio");
  assert.equal(probeSpeechCalls.length, 0);
});

test("question routes can probe Xiaomi MiMo TTS through chat completions audio mode", async () => {
  const ttsCompletionCalls = [];

  setOpenAIProbeClientFactoryForTesting(() => ({
    responses: {
      parse: async () => ({
        id: "resp_probe_ok",
        model: "mimo-v2.5-pro",
        output_parsed: { status: "ok" }
      })
    },
    chat: {
      completions: {
        create: async (request) => {
          ttsCompletionCalls.push(request);
          return {
            id: "chatcmpl_mimo_tts_probe",
            model: request.model,
            choices: [
              {
                message: {
                  audio: {
                    data: Buffer.from("fake-mimo-wav").toString("base64")
                  }
                }
              }
            ]
          };
        }
      }
    },
    audio: {
      speech: {
        create: async () => {
          throw new Error("Should not use audio.speech for MiMo TTS");
        }
      }
    }
  }));

  const response = await fetch(`${baseUrl}/api/questions/ai/runtime-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionModel: "mimo-v2.5-pro",
      reviewModel: "mimo-v2.5-pro",
      ttsModel: "mimo-v2.5-tts",
      aiRuntime: {
        providerLabel: "Xiaomi_mimo",
        baseUrl: "https://api.xiaomimimo.com/v1",
        apiKey: "test-provider-key"
      }
    })
  });

  assert.equal(response.status, 200);

  const payload = await readJson(response);
  assert.equal(payload.data.allPassed, true);
  assert.equal(payload.data.tests[2].type, "chat.completions.audio");
  assert.equal(ttsCompletionCalls.length, 1);
  assert.equal(ttsCompletionCalls[0].model, "mimo-v2.5-tts");
  assert.equal(ttsCompletionCalls[0].audio.voice, "Chloe");
});

test("question routes can generate AI review text and TTS audio for a submitted answer", async () => {
  const reviewParseCalls = [];
  const speechCreateCalls = [];
  const reviewRuntimeCalls = [];

  seedQuestions([
    {
      subject: "数学",
      grade: "三年级",
      semester: "通用",
      knowledgeTag: "加法应用",
      type: "情景计算",
      content: "图书角原来有 12 本故事书，又放进 5 本，现在一共有多少本？",
      options: [
        { key: "A", text: "15 本" },
        { key: "B", text: "16 本" },
        { key: "C", text: "17 本" },
        { key: "D", text: "18 本" }
      ],
      answer: "C",
      explanation: "12 + 5 = 17，所以现在一共有 17 本。",
      difficulty: 1
    }
  ]);

  setOpenAIReviewClientFactoryForTesting((runtimeConfig) => {
    reviewRuntimeCalls.push(runtimeConfig);
    return {
      responses: {
        parse: async (request) => {
          reviewParseCalls.push(request);
          return {
            id: "resp_test_question_review",
            model: "gpt-5.4-mini",
            output_parsed: {
              tone: "repair",
              title: "先看数量变化词",
              encouragement: "你已经把题目场景看懂了一半。",
              diagnosis: "这题关键是看到“又放进”，说明数量还要继续相加。",
              nextStep: "下次先圈出“又、多、还剩”这些变化词。",
              bubbleText: "先圈出“又放进”，这题就是继续相加。",
              speechText: "你已经把场景看懂了一半。这题要先看到“又放进”表示继续相加，下次先圈出数量变化词。"
            }
          };
        }
      },
      chat: {
        completions: {
          create: async (request) => ({
            id: "chatcmpl_test_question_review",
            model: request.model,
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    tone: "repair",
                    title: "先看数量变化词",
                    encouragement: "你已经把题目场景看懂了一半。",
                    diagnosis: "这题关键是看到“又放进”，说明数量还要继续相加。",
                    nextStep: "下次先圈出“又、多、还剩”这些变化词。",
                    bubbleText: "先圈出“又放进”，这题就是继续相加。",
                    speechText: "你已经把场景看懂了一半。这题要先看到“又放进”表示继续相加，下次先圈出数量变化词。"
                  })
                }
              }
            ]
          })
        }
      },
      audio: {
        speech: {
          create: async (request) => {
            speechCreateCalls.push(request);
            return {
              arrayBuffer: async () => Buffer.from("fake-mp3-audio")
            };
          }
        }
      }
    };
  });

  const db = createDatabaseConnection();
  let questionId = 0;

  try {
    questionId = Number(all(db, "SELECT id FROM questions LIMIT 1")[0]?.id || 0);
  } finally {
    closeDatabaseConnection(db);
  }

  const reviewResponse = await fetch(`${baseUrl}/api/questions/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      questionId,
      selectedOption: "A",
      reviewLength: "detailed",
      aiRuntime: {
        providerLabel: "OpenAI Compatible",
        baseUrl: "https://example.com/v1",
        apiKey: "test-provider-key"
      }
    })
  });

  assert.equal(reviewResponse.status, 200);

  const reviewPayload = await readJson(reviewResponse);
  assert.equal(reviewPayload.data.tone, "repair");
  assert.equal(reviewPayload.data.title, "先看数量变化词");
  assert.equal(reviewPayload.data.bubbleText, "先圈出“又放进”，这题就是继续相加");
  assert.ok(reviewPayload.data.speechText.includes("继续相加"));
  assert.equal(reviewPayload.meta.model, "gpt-5.4-mini");
  assert.equal(reviewParseCalls.length, 1);
  assert.equal(reviewRuntimeCalls[0].baseUrl, "https://example.com/v1");
  assert.equal(reviewRuntimeCalls[0].apiKey, "test-provider-key");
  assert.ok(reviewParseCalls[0].instructions.includes("当前题目属于数学。"));
  assert.ok(reviewParseCalls[0].instructions.includes("数量关系"));
  assert.ok(reviewParseCalls[0].instructions.includes("bubbleText"));

  const speechResponse = await fetch(`${baseUrl}/api/questions/review/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: reviewPayload.data.speechText,
      model: "gpt-4o-mini-tts",
      aiRuntime: {
        providerLabel: "OpenAI Compatible",
        baseUrl: "https://example.com/v1",
        apiKey: "test-provider-key"
      }
    })
  });

  assert.equal(speechResponse.status, 200);
  assert.ok(String(speechResponse.headers.get("content-type") || "").includes("audio/mpeg"));
  assert.equal(speechCreateCalls.length, 1);
  assert.equal(speechCreateCalls[0].model, "gpt-4o-mini-tts");

  const speechBuffer = Buffer.from(await speechResponse.arrayBuffer());
  assert.equal(speechBuffer.toString(), "fake-mp3-audio");
});

test("API responses do not expose wildcard CORS headers by default", async () => {
  const healthResponse = await fetch(`${baseUrl}/health`);

  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get("access-control-allow-origin"), null);
});

test("question review speech can use Xiaomi MiMo chat completions audio mode", async () => {
  const ttsCompletionCalls = [];

  setOpenAIReviewClientFactoryForTesting(() => ({
    chat: {
      completions: {
        create: async (request) => {
          ttsCompletionCalls.push(request);
          return {
            id: "chatcmpl_mimo_tts_review",
            model: request.model,
            choices: [
              {
                message: {
                  audio: {
                    data: Buffer.from("fake-mimo-review-wav").toString("base64")
                  }
                }
              }
            ]
          };
        }
      }
    },
    audio: {
      speech: {
        create: async () => {
          throw new Error("Should not use audio.speech for MiMo TTS");
        }
      }
    }
  }));

  const speechResponse = await fetch(`${baseUrl}/api/questions/review/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: "这是一段语音测试。",
      model: "mimo-v2.5-tts",
      aiRuntime: {
        providerLabel: "Xiaomi_mimo",
        baseUrl: "https://api.xiaomimimo.com/v1",
        apiKey: "test-provider-key"
      }
    })
  });

  assert.equal(speechResponse.status, 200);
  assert.equal(ttsCompletionCalls.length, 1);
  assert.equal(ttsCompletionCalls[0].model, "mimo-v2.5-tts");
  assert.equal(ttsCompletionCalls[0].audio.voice, "Chloe");

  const speechBuffer = Buffer.from(await speechResponse.arrayBuffer());
  assert.equal(speechBuffer.toString(), "fake-mimo-review-wav");
});

test("question routes can generate AI session summary for a completed round", async () => {
  const summaryParseCalls = [];

  setOpenAIReviewClientFactoryForTesting(() => ({
    responses: {
      parse: async (request) => {
        summaryParseCalls.push(request);
        return {
          id: "resp_test_session_summary",
          model: "gpt-5.4-mini",
          output_parsed: {
            tone: "repair",
            title: "先把条件看全",
            overview: "本轮 2 题里答对了 1 题，当前最适合先把审题顺序稳住。",
            strengths: "已经能在加法情景里看懂主要场景。",
            focusPoint: "容易漏看表示数量变化的词，所以会把该相加的题看成别的关系。",
            nextPlan: "建议先回看错题，再围绕数量变化词多练 3 题，每题先圈“又、多、还剩”。",
            parentTip: "家长可以先让孩子口头说出题里数量怎么变，再让他自己决定用什么运算。",
            bubbleText: "先复盘数量变化词，再决定该用什么运算。",
            speechText: "这轮先把审题顺序稳住。你已经能看懂场景了，下一步先圈出数量变化词，再决定用什么运算。"
          }
        };
      }
    },
    chat: {
      completions: {
        create: async (request) => ({
          id: "chatcmpl_test_session_summary",
          model: request.model,
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tone: "repair",
                  title: "先把条件看全",
                  overview: "本轮 2 题里答对了 1 题，当前最适合先把审题顺序稳住。",
                  strengths: "已经能在加法情景里看懂主要场景。",
                  focusPoint: "容易漏看表示数量变化的词，所以会把该相加的题看成别的关系。",
                  nextPlan: "建议先回看错题，再围绕数量变化词多练 3 题，每题先圈“又、多、还剩”。",
                  parentTip: "家长可以先让孩子口头说出题里数量怎么变，再让他自己决定用什么运算。",
                  bubbleText: "先复盘数量变化词，再决定该用什么运算。",
                  speechText: "这轮先把审题顺序稳住。你已经能看懂场景了，下一步先圈出数量变化词，再决定用什么运算。"
                })
              }
            }
          ]
        })
      }
    }
  }));

  const summaryResponse = await fetch(`${baseUrl}/api/questions/review/summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      score: 10,
      correctCount: 1,
      wrongCount: 1,
      totalQuestions: 2,
      accuracyPercent: 50,
      playMode: "free",
      reviewLength: "standard",
      attempts: [
        {
          question: {
            id: 101,
            subject: "数学",
            grade: "三年级",
            semester: "通用",
            knowledgeTag: "加法应用",
            type: "情景计算",
            content: "图书角原来有 12 本故事书，又放进 5 本，现在一共有多少本？",
            difficulty: "1"
          },
          selectedOption: "A",
          isCorrect: false,
          isTimeout: false,
          correctAnswer: "C",
          explanation: "12 + 5 = 17，所以现在一共有 17 本。"
        },
        {
          question: {
            id: 102,
            subject: "数学",
            grade: "三年级",
            semester: "通用",
            knowledgeTag: "加法应用",
            type: "情景计算",
            content: "操场上有 8 个篮球，又拿来 4 个，现在一共有多少个？",
            difficulty: "1"
          },
          selectedOption: "C",
          isCorrect: true,
          isTimeout: false,
          correctAnswer: "C",
          explanation: "8 + 4 = 12，所以现在一共有 12 个。"
        }
      ]
    })
  });

  assert.equal(summaryResponse.status, 200);

  const summaryPayload = await readJson(summaryResponse);
  assert.equal(summaryPayload.data.title, "先把条件看全");
  assert.equal(summaryPayload.data.tone, "repair");
  assert.equal(summaryPayload.data.bubbleText, "先复盘数量变化词，再决定该用什么运算");
  assert.ok(summaryPayload.data.parentTip.includes("家长"));
  assert.equal(summaryPayload.meta.model, "gpt-5.4-mini");
  assert.equal(summaryParseCalls.length, 1);
  assert.equal(summaryParseCalls[0].text.format.name, "elementary_session_summary");
  assert.ok(summaryParseCalls[0].instructions.includes("课后复盘老师"));
  assert.ok(summaryParseCalls[0].instructions.includes("家长"));
  assert.ok(summaryParseCalls[0].instructions.includes("bubbleText"));
});

test("study record book route stores and reloads normalized records for the same profile", async () => {
  const putResponse = await fetch(`${baseUrl}/api/study-record-book`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      studyRecordBook: {
        updatedAt: "2026-04-13T08:45:00.000Z",
        questionRecords: {
          "5": {
            questionId: 5,
            snapshot: {
              id: 5,
              subject: "数学",
              grade: "三年级",
              semester: "通用",
              knowledgeTag: "乘法口诀",
              type: "单项选择",
              content: "4 × 6 等于多少？",
              difficulty: "1",
              options: [
                { key: "A", text: "20" },
                { key: "B", text: "24" }
              ]
            },
            correctAnswer: "B",
            explanation: "4 乘 6 等于 24。",
            attempts: 3,
            correctCount: 1,
            wrongCount: 2,
            timeoutCount: 0,
            reviewCorrectStreak: 1,
            lastResult: "correct",
            lastSelectedOption: "B",
            lastAnsweredAt: "2026-04-13T08:45:00.000Z",
            firstWrongAt: "2026-04-12T08:45:00.000Z",
            lastWrongAt: "2026-04-12T08:50:00.000Z",
            lastCorrectAt: "2026-04-13T08:45:00.000Z",
            nextReviewAt: "2026-04-14T08:45:00.000Z"
          },
          invalid: {
            questionId: 0,
            snapshot: {
              id: 0,
              content: ""
            }
          }
        }
      }
    })
  });

  assert.equal(putResponse.status, 200);

  const cookieHeader = getCookieHeader(putResponse);
  assert.ok(cookieHeader.includes("wonder_trivia_profile="));

  const putPayload = await readJson(putResponse);
  assert.equal(Object.keys(putPayload.studyRecordBook.questionRecords).length, 1);
  assert.equal(putPayload.studyRecordBook.questionRecords["5"].snapshot.knowledgeTag, "乘法口诀");

  const getResponse = await fetch(`${baseUrl}/api/study-record-book`, {
    headers: {
      Cookie: cookieHeader
    }
  });

  assert.equal(getResponse.status, 200);

  const getPayload = await readJson(getResponse);
  assert.equal(getPayload.studyRecordBook.questionRecords["5"].attempts, 3);
  assert.equal(getPayload.studyRecordBook.questionRecords["5"].nextReviewAt, "2026-04-14T08:45:00.000Z");
});

test("challenge progress route migrates legacy grade two to six chapter ids into upper and lower routes", async () => {
  const putResponse = await fetch(`${baseUrl}/api/challenge-progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      progressBook: {
        activeChapterId: "chapter-grade-6",
        chapters: {
          "chapter-grade-2": {
            unlockedStageIds: ["stage-1", "stage-2"],
            bestResults: {
              "stage-2": {
                starCount: 2,
                bestAccuracy: 90,
                attempts: 3,
                bestScore: 180,
                rewardEarned: true
              }
            }
          },
          "chapter-grade-4": {
            unlockedStageIds: ["stage-1", "stage-2", "stage-3", "stage-4"],
            bestResults: {
              "stage-4": {
                starCount: 2,
                bestAccuracy: 80,
                attempts: 5,
                bestScore: 260,
                rewardEarned: false
              }
            }
          },
          "chapter-grade-5": {
            unlockedStageIds: ["stage-1", "stage-2", "stage-3", "stage-4", "stage-5"],
            bestResults: {
              "stage-5": {
                starCount: 3,
                bestAccuracy: 95,
                attempts: 6,
                bestScore: 320,
                rewardEarned: true
              }
            }
          },
          "chapter-grade-6": {
            unlockedStageIds: ["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6"],
            bestResults: {
              "stage-6": {
                starCount: 3,
                bestAccuracy: 96,
                attempts: 7,
                bestScore: 360,
                rewardEarned: true
              }
            }
          },
          "chapter-grade-3": {
            unlockedStageIds: ["stage-1", "stage-2", "stage-3"],
            bestResults: {
              "stage-3": {
                starCount: 3,
                bestAccuracy: 100,
                attempts: 4,
                bestScore: 300,
                rewardEarned: true
              }
            }
          }
        }
      }
    })
  });

  assert.equal(putResponse.status, 200);

  const cookieHeader = getCookieHeader(putResponse);
  const putPayload = await readJson(putResponse);

  assert.equal(putPayload.progressBook.activeChapterId, "chapter-grade-6-upper");
  assert.equal(putPayload.progressBook.chapters["chapter-grade-2-upper"].bestResults["stage-2"].starCount, 2);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-2-lower"].bestResults["stage-2"].starCount, 2);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-4-upper"].bestResults["stage-4"].starCount, 2);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-4-lower"].bestResults["stage-4"].starCount, 2);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-3-upper"].bestResults["stage-3"].starCount, 3);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-3-lower"].bestResults["stage-3"].starCount, 3);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-5-upper"].bestResults["stage-5"].starCount, 3);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-5-lower"].bestResults["stage-5"].starCount, 3);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-6-upper"].bestResults["stage-6"].starCount, 3);
  assert.equal(putPayload.progressBook.chapters["chapter-grade-6-lower"].bestResults["stage-6"].starCount, 3);

  const getResponse = await fetch(`${baseUrl}/api/challenge-progress`, {
    headers: {
      Cookie: cookieHeader
    }
  });

  assert.equal(getResponse.status, 200);

  const getPayload = await readJson(getResponse);
  assert.equal(getPayload.progressBook.activeChapterId, "chapter-grade-6-upper");
  assert.equal(getPayload.progressBook.chapters["chapter-grade-2-upper"].bestResults["stage-2"].rewardEarned, true);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-2-lower"].bestResults["stage-2"].bestScore, 180);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-4-upper"].bestResults["stage-4"].bestAccuracy, 80);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-4-lower"].unlockedStageIds.includes("stage-4"), true);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-3-upper"].bestResults["stage-3"].bestAccuracy, 100);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-3-lower"].unlockedStageIds.includes("stage-3"), true);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-5-upper"].bestResults["stage-5"].bestScore, 320);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-5-lower"].bestResults["stage-5"].rewardEarned, true);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-6-upper"].bestResults["stage-6"].bestScore, 360);
  assert.equal(getPayload.progressBook.chapters["chapter-grade-6-lower"].bestResults["stage-6"].rewardEarned, true);
});
