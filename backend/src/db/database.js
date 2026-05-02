const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const defaultDbPath = path.join(__dirname, "../../data", "trivia.db");
const dbPath = path.resolve(process.env.TRIVIA_DB_PATH || defaultDbPath);
let savepointCounter = 0;

function ensureDataDir() {
  const dataDir = path.dirname(dbPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function applyConnectionPragmas(db) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
}

function createDatabaseConnection() {
  ensureDataDir();

  const db = new DatabaseSync(dbPath);

  applyConnectionPragmas(db);

  return db;
}

function closeDatabaseConnection(db) {
  if (!db) {
    return;
  }

  db.close();
}

function initializeDatabase(schemaInitializer) {
  const db = createDatabaseConnection();

  try {
    if (typeof schemaInitializer === "function") {
      schemaInitializer(db);
    }
  } finally {
    closeDatabaseConnection(db);
  }
}

function run(db, sql, params = []) {
  if (params.length === 0) {
    db.exec(sql);
    return null;
  }

  return db.prepare(sql).run(...params);
}

function all(db, sql, params = []) {
  return db.prepare(sql).all(...params);
}

function get(db, sql, params = []) {
  return db.prepare(sql).get(...params);
}

function runInSavepoint(db, label, operation) {
  const normalizedLabel = String(label || "savepoint").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  const savepointName = `${normalizedLabel}_${++savepointCounter}`;

  run(db, `SAVEPOINT ${savepointName}`);

  try {
    const result = operation();
    run(db, `RELEASE SAVEPOINT ${savepointName}`);
    return result;
  } catch (error) {
    try {
      run(db, `ROLLBACK TO SAVEPOINT ${savepointName}`);
    } catch (rollbackError) {
      // Keep the original error visible.
    }

    try {
      run(db, `RELEASE SAVEPOINT ${savepointName}`);
    } catch (releaseError) {
      // Keep the original error visible.
    }

    throw error;
  }
}

ensureDataDir();

module.exports = {
  all,
  closeDatabaseConnection,
  createDatabaseConnection,
  dbPath,
  get,
  initializeDatabase,
  run,
  runInSavepoint
};
