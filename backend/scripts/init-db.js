const { createDatabaseConnection, dbPath, run } = require("../src/db/database");
const { createTableSql, insertQuestions } = require("../src/questions/repository");
const { questions } = require("./questionSeedData");

function initDatabase() {
  const db = createDatabaseConnection();

  try {
    run(db, "BEGIN TRANSACTION");
    run(db, "DROP TABLE IF EXISTS questions");
    run(db, createTableSql);

    insertQuestions(db, questions);

    run(db, "COMMIT");
    console.log(`Database initialized successfully: ${dbPath}`);
    console.log(`Inserted ${questions.length} sample questions.`);
  } catch (error) {
    try {
      run(db, "ROLLBACK");
    } catch (rollbackError) {
      // Ignore rollback failure so the original error stays visible.
    }
    console.error("Failed to initialize database.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

initDatabase();
