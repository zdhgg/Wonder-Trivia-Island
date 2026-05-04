const { createDatabaseConnection, dbPath, run, all } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions, createDatabaseBackup } = require("../src/questions/repository");
const { questions } = require("./questionSeedData");

const TARGET_CONTENTS = new Set([
  "时钟从 3 点走到 6 点，经过了几小时？",
  "一个长方形长 7 厘米，宽 3 厘米，它的周长是多少厘米？",
  "钟面刚好指向8时，再过2小时是几时？",
  "一根84厘米的绳子，做了4个边长18厘米的正方形后，还剩多少厘米？",
  "一个长方形长9厘米、宽4厘米，它的周长是多少厘米？",
  "一根铁丝长120厘米，先做成一个边长18厘米的正方形，还剩多少厘米？",
  "长方形菜圃长8米，宽5米，面积是多少平方米？",
  "一个长方形操场长9米，宽4米，它的周长是多少米？",
  "一块边长6分米的正方形地砖，面积是多少平方分米？",
  "一块长11米、宽4米的草地，面积会超过40平方米吗？",
  "一块长方形菜地长12米，宽5米，每平方米种3株番茄，一共能种多少株？",
  "4块边长9分米的正方形展板，一共是多少平方分米？",
  "一块长方形布长8米，宽6米，剪去14平方米后，还剩多少平方米？",
  "长方形长12厘米、宽5厘米，面积是多少平方厘米？",
  "一个正方形边长7厘米，周长是多少厘米？",
  "一块长方形菜地长16米，宽9米，每平方米种2株番茄，一共能种多少株？",
  "一块正方形空地边长15米，四周围篱笆，已经装好42米，还差多少米？"
]);

function getTargetQuestions() {
  return questions.filter(
    (question) => TARGET_CONTENTS.has(question.content) && String(question.imageUrl || "").trim()
  );
}

function main() {
  const targetQuestions = getTargetQuestions();

  if (targetQuestions.length !== TARGET_CONTENTS.size) {
    throw new Error(`Expected ${TARGET_CONTENTS.size} geometry/time image questions, received ${targetQuestions.length}.`);
  }

  const backupPath = createDatabaseBackup();
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    run(db, "BEGIN TRANSACTION");

    for (const question of targetQuestions) {
      run(
        db,
        `
          DELETE FROM questions
          WHERE subject = ? AND grade = ? AND semester = ? AND knowledgeTag = ? AND content = ?
        `,
        [question.subject, question.grade, question.semester, question.knowledgeTag, question.content]
      );

      insertQuestions(db, [question]);
    }

    run(db, "COMMIT");

    const rows = all(
      db,
      `
        SELECT grade, semester, knowledgeTag, content, imageUrl
        FROM questions
        WHERE content IN (${Array.from(TARGET_CONTENTS).map(() => "?").join(", ")})
        ORDER BY grade, semester, knowledgeTag, content
      `,
      Array.from(TARGET_CONTENTS)
    );

    console.log(`Database: ${dbPath}`);
    if (backupPath) {
      console.log(`Backup: ${backupPath}`);
    }
    console.log(`Synced ${rows.length} geometry/time image questions.`);
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
