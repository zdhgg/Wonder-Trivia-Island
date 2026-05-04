const { createDatabaseConnection, dbPath, run, all } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions, createDatabaseBackup } = require("../src/questions/repository");
const { questions } = require("./questionSeedData");

const TARGET_CONTENTS = new Set([
  "教室后墙贴着值日表：周一小东扫地，周二小美擦黑板，周三小军摆桌椅。周二谁负责擦黑板？",
  "值日表上写着：周一小青擦桌子，周二小林摆椅子，周三小红关窗。周二谁摆椅子？",
  "班级公告：周三带跳绳参加比赛，周四交手工作品，周五展示读书卡。周四要交什么？",
  "小军先把种植观察记录下来，又给植物浇水，最后把花盆搬到阳光下。浇水后他做什么？",
  "做植物标本时，先采集叶片，再夹在书里压平，最后贴在记录卡上。压平后要做什么？",
  "留言：观察表放在科学柜第二层，放大镜在窗边，记录本在讲台上。想拿观察表应该去哪里？",
  "研学时，大家先听讲解，再分组记录，最后制作模型。制作模型前要做什么？"
]);

function main() {
  const targetQuestions = questions.filter((question) => TARGET_CONTENTS.has(question.content) && question.imageUrl);

  if (targetQuestions.length !== TARGET_CONTENTS.size) {
    throw new Error(`Expected ${TARGET_CONTENTS.size} remaining image questions, received ${targetQuestions.length}.`);
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
    console.log(`Synced ${rows.length} remaining image questions.`);
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
