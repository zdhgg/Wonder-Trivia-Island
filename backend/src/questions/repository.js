const fs = require("fs");
const path = require("path");
const {
  all,
  closeDatabaseConnection,
  createDatabaseConnection,
  dbPath,
  get,
  run,
  runInSavepoint
} = require("../db/database");
const { ALLOWED_TYPES } = require("./questionTypes");

const QUESTIONS_TABLE = "questions";
const ALLOWED_SUBJECTS = Object.freeze(["语文", "数学", "英语"]);
const ALLOWED_GRADES = Object.freeze(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);
const ALLOWED_SEMESTERS = Object.freeze(["上册", "下册", "通用"]);
const MAX_KNOWLEDGE_TAG_LENGTH = 40;
const QUESTIONS_INDEX_DEFINITIONS = Object.freeze([
  {
    name: "idx_questions_grade_semester_subject_difficulty",
    columns: ["grade", "semester", "subject", "difficulty"]
  },
  {
    name: "idx_questions_grade_semester_knowledge_tag",
    columns: ["grade", "semester", "knowledgeTag"]
  }
]);

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function buildAllowedTypesSql() {
  return ALLOWED_TYPES.map((type) => `'${escapeSqlString(type)}'`).join(", ");
}

function buildCreateTableSql(tableName = QUESTIONS_TABLE) {
  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL CHECK (subject IN ('语文', '数学', '英语')),
      grade TEXT NOT NULL CHECK (grade IN ('一年级', '二年级', '三年级', '四年级', '五年级', '六年级')),
      semester TEXT NOT NULL CHECK (semester IN ('上册', '下册', '通用')),
      knowledgeTag TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK (type IN (${buildAllowedTypesSql()})),
      content TEXT NOT NULL,
      imageUrl TEXT NOT NULL DEFAULT '',
      options TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (NOT (grade = '一年级' AND subject = '英语'))
    );
  `;
}

const createTableSql = buildCreateTableSql();
const insertSql = `
  INSERT INTO questions (
    subject,
    grade,
    semester,
    knowledgeTag,
    type,
    content,
    imageUrl,
    options,
    answer,
    explanation,
    difficulty,
    createdAt,
    updatedAt
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
`;

function getQuestionPolicyIssues({ subject, grade, semester }) {
  const issues = [];

  if (subject === "英语" && grade === "一年级") {
    issues.push("当前题库规则下，一年级暂不支持英语。");
  }

  if (grade === "一年级" && semester === "通用") {
    issues.push("一年级题目必须标注为上册或下册。");
  }

  return issues;
}

function ensureQuestionIndexes(db) {
  for (const indexDefinition of QUESTIONS_INDEX_DEFINITIONS) {
    run(
      db,
      `CREATE INDEX IF NOT EXISTS ${indexDefinition.name} ON ${QUESTIONS_TABLE} (${indexDefinition.columns.join(", ")})`
    );
  }
}

function isQuestionsTableSchemaUpToDate(tableSql = "", columns = []) {
  const columnSet = new Set(columns.map((column) => column.name));
  const requiredColumns = [
    "id",
    "subject",
    "grade",
    "semester",
    "knowledgeTag",
    "type",
    "content",
    "imageUrl",
    "options",
    "answer",
    "explanation",
    "difficulty",
    "createdAt",
    "updatedAt"
  ];
  const normalizedTableSql = String(tableSql || "");

  return (
    requiredColumns.every((columnName) => columnSet.has(columnName)) &&
    /type\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*type\s+IN\s*\(/i.test(normalizedTableSql) &&
    /createdAt\s+TEXT\s+NOT\s+NULL/i.test(normalizedTableSql) &&
    /updatedAt\s+TEXT\s+NOT\s+NULL/i.test(normalizedTableSql)
  );
}

function ensureExistingTypesSupported(db) {
  const placeholders = ALLOWED_TYPES.map(() => "?").join(", ");
  const rows = all(
    db,
    `
      SELECT DISTINCT type
      FROM ${QUESTIONS_TABLE}
      WHERE type NOT IN (${placeholders})
      ORDER BY type ASC
    `,
    ALLOWED_TYPES
  );

  if (rows.length === 0) {
    return;
  }

  throw new Error(`现有题库存在未纳入类型枚举的题型：${rows.map((row) => row.type).join("、")}。`);
}

function rebuildQuestionsTable(db, columns = []) {
  const hasGradeColumn = columns.some((column) => column.name === "grade");
  const hasSemesterColumn = columns.some((column) => column.name === "semester");
  const hasKnowledgeTagColumn = columns.some((column) => column.name === "knowledgeTag");
  const hasImageUrlColumn = columns.some((column) => column.name === "imageUrl");
  const hasCreatedAtColumn = columns.some((column) => column.name === "createdAt");
  const hasUpdatedAtColumn = columns.some((column) => column.name === "updatedAt");
  const tempTableName = `${QUESTIONS_TABLE}__next`;
  const sourceColumnsSql = [
    "id",
    "subject",
    hasGradeColumn ? "grade" : "'三年级' AS grade",
    hasSemesterColumn ? "semester" : "'通用' AS semester",
    hasKnowledgeTagColumn ? "COALESCE(NULLIF(knowledgeTag, ''), '') AS knowledgeTag" : "'' AS knowledgeTag",
    "type",
    "content",
    hasImageUrlColumn ? "COALESCE(NULLIF(imageUrl, ''), '') AS imageUrl" : "'' AS imageUrl",
    "options",
    "answer",
    "explanation",
    "difficulty",
    hasCreatedAtColumn ? "COALESCE(NULLIF(createdAt, ''), CURRENT_TIMESTAMP) AS createdAt" : "CURRENT_TIMESTAMP AS createdAt",
    hasUpdatedAtColumn ? "COALESCE(NULLIF(updatedAt, ''), CURRENT_TIMESTAMP) AS updatedAt" : "CURRENT_TIMESTAMP AS updatedAt"
  ].join(",\n        ");

  runInSavepoint(db, "rebuild_questions_table", () => {
    ensureExistingTypesSupported(db);
    run(db, `DROP TABLE IF EXISTS ${tempTableName}`);
    run(db, buildCreateTableSql(tempTableName));
    run(
      db,
      `
        INSERT INTO ${tempTableName} (
          id,
          subject,
          grade,
          semester,
          knowledgeTag,
          type,
          content,
          imageUrl,
          options,
          answer,
          explanation,
          difficulty,
          createdAt,
          updatedAt
        )
        SELECT
          ${sourceColumnsSql}
        FROM ${QUESTIONS_TABLE}
      `
    );
    run(db, `DROP TABLE ${QUESTIONS_TABLE}`);
    run(db, `ALTER TABLE ${tempTableName} RENAME TO ${QUESTIONS_TABLE}`);
  });
}

function ensureQuestionsTable(db) {
  const tableInfo = get(
    db,
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `,
    [QUESTIONS_TABLE]
  );

  if (!tableInfo) {
    run(db, createTableSql);
    ensureQuestionIndexes(db);
    return;
  }

  const columns = all(db, `PRAGMA table_info(${QUESTIONS_TABLE})`);

  if (!isQuestionsTableSchemaUpToDate(tableInfo.sql, columns)) {
    rebuildQuestionsTable(db, columns);
  }

  ensureQuestionIndexes(db);
}

function insertQuestion(db, question) {
  return run(db, insertSql, [
    question.subject,
    question.grade,
    question.semester,
    String(question.knowledgeTag || "").trim().slice(0, MAX_KNOWLEDGE_TAG_LENGTH),
    question.type,
    question.content,
    String(question.imageUrl || "").trim(),
    JSON.stringify(question.options),
    question.answer,
    question.explanation,
    question.difficulty
  ]);
}

function insertQuestions(db, questions) {
  return runInSavepoint(db, "insert_questions", () => {
    const insertResults = [];

    for (const question of questions) {
      insertResults.push(insertQuestion(db, question));
    }

    return insertResults;
  });
}

function getQuestionCount(db) {
  const row = get(db, `SELECT COUNT(*) AS count FROM ${QUESTIONS_TABLE}`);
  return Number(row?.count || 0);
}

function createDatabaseBackup() {
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  const backupsDir = path.join(path.dirname(dbPath), "backups");

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `trivia-${timestamp}.db`);
  const db = createDatabaseConnection();

  try {
    run(db, "PRAGMA wal_checkpoint(FULL)");
    run(db, `VACUUM INTO '${escapeSqlString(backupPath)}'`);
  } finally {
    closeDatabaseConnection(db);
  }

  return backupPath;
}

module.exports = {
  ALLOWED_GRADES,
  ALLOWED_SEMESTERS,
  ALLOWED_SUBJECTS,
  ALLOWED_TYPES,
  MAX_KNOWLEDGE_TAG_LENGTH,
  createDatabaseBackup,
  createTableSql,
  ensureQuestionsTable,
  getQuestionCount,
  getQuestionPolicyIssues,
  insertQuestion,
  insertQuestions
};
