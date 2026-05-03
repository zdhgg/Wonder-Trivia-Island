const { createDatabaseConnection, dbPath, run, all } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions, createDatabaseBackup } = require("../src/questions/repository");
const { questions } = require("./questionSeedData");

const TARGET_GRADE = "一年级";
const TARGET_SEMESTER = "上册";
const TARGET_KNOWLEDGE_TAG = "启蒙冲线";

function getStageSevenImageQuestions() {
  return questions.filter(
    (question) =>
      question.grade === TARGET_GRADE &&
      question.semester === TARGET_SEMESTER &&
      question.knowledgeTag === TARGET_KNOWLEDGE_TAG &&
      String(question.imageUrl || "").trim()
  );
}

function main() {
  const targetQuestions = getStageSevenImageQuestions();

  if (targetQuestions.length === 0) {
    throw new Error("未找到一年级上册第七关的带图题种子数据。");
  }

  const backupPath = createDatabaseBackup();
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    run(db, "BEGIN TRANSACTION");

    const beforeRows = all(
      db,
      `
        SELECT id
        FROM questions
        WHERE grade = ? AND semester = ? AND knowledgeTag = ?
      `,
      [TARGET_GRADE, TARGET_SEMESTER, TARGET_KNOWLEDGE_TAG]
    );

    run(
      db,
      `
        DELETE FROM questions
        WHERE grade = ? AND semester = ? AND knowledgeTag = ?
      `,
      [TARGET_GRADE, TARGET_SEMESTER, TARGET_KNOWLEDGE_TAG]
    );

    insertQuestions(db, targetQuestions);
    run(db, "COMMIT");

    const afterRows = all(
      db,
      `
        SELECT id, subject, type, content, imageUrl
        FROM questions
        WHERE grade = ? AND semester = ? AND knowledgeTag = ?
        ORDER BY id ASC
      `,
      [TARGET_GRADE, TARGET_SEMESTER, TARGET_KNOWLEDGE_TAG]
    );

    console.log(`Database: ${dbPath}`);
    if (backupPath) {
      console.log(`Backup: ${backupPath}`);
    }
    console.log(`Replaced ${beforeRows.length} old questions with ${afterRows.length} image questions.`);
    for (const row of afterRows) {
      console.log(`- [${row.subject}] ${row.type} | ${row.content} | ${row.imageUrl}`);
    }
  } catch (error) {
    try {
      run(db, "ROLLBACK");
    } catch {
      // Keep original error visible.
    }
    throw error;
  } finally {
    db.close();
  }
}

main();
