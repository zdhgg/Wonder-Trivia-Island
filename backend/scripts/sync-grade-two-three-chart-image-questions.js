const { createDatabaseConnection, dbPath, run } = require("../src/db/database");
const { all } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions, createDatabaseBackup } = require("../src/questions/repository");
const { questions } = require("./questionSeedData");

const TARGET_GROUPS = [
  ["二年级", "上册", "图表看懂"],
  ["二年级", "下册", "图表看懂"],
  ["三年级", "上册", "图文转换"],
  ["三年级", "下册", "图文转换"]
];

function getTargetQuestions() {
  const keySet = new Set(TARGET_GROUPS.map((group) => group.join("|")));
  return questions.filter((question) =>
    keySet.has([question.grade, question.semester, question.knowledgeTag].join("|"))
  );
}

function main() {
  const targetQuestions = getTargetQuestions().filter((question) => String(question.imageUrl || "").trim());

  if (targetQuestions.length === 0) {
    throw new Error("未找到二、三年级图表题的带图种子数据。");
  }

  const backupPath = createDatabaseBackup();
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    run(db, "BEGIN TRANSACTION");

    for (const [grade, semester, knowledgeTag] of TARGET_GROUPS) {
      run(
        db,
        `
          DELETE FROM questions
          WHERE grade = ? AND semester = ? AND knowledgeTag = ?
        `,
        [grade, semester, knowledgeTag]
      );

      insertQuestions(
        db,
        targetQuestions.filter(
          (question) =>
            question.grade === grade &&
            question.semester === semester &&
            question.knowledgeTag === knowledgeTag
        )
      );
    }

    run(db, "COMMIT");

    const syncedRows = all(
      db,
      `
        SELECT grade, semester, subject, knowledgeTag, COUNT(*) AS count
        FROM questions
        WHERE (grade = '二年级' AND knowledgeTag = '图表看懂')
           OR (grade = '三年级' AND knowledgeTag = '图文转换')
        GROUP BY grade, semester, subject, knowledgeTag
        ORDER BY grade, semester, subject
      `
    );

    console.log(`Database: ${dbPath}`);
    if (backupPath) {
      console.log(`Backup: ${backupPath}`);
    }
    for (const row of syncedRows) {
      console.log(`- ${row.grade} ${row.semester} ${row.subject} ${row.knowledgeTag}: ${row.count}`);
    }
  } catch (error) {
    try {
      run(db, "ROLLBACK");
    } catch {
      // Keep the original error visible.
    }
    throw error;
  } finally {
    db.close();
  }
}

main();
