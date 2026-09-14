const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const { BACKEND_DIR, E2E_DB_PATH, assertE2EDatabasePathIsSafe } = require("./e2e-environment");

// 职责单一：把 E2E 测试库重建为确定状态。
// 复用项目已有的 backend/scripts/init-db.js（DROP + 重新写入种子题），
// 不复制、不迁移、不读取真实用户数据库。
function removeExistingDatabaseFiles(dbPath) {
  for (const suffix of ["", "-wal", "-shm"]) {
    const filePath = `${dbPath}${suffix}`;

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function runProjectInitDb(dbPath) {
  const result = spawnSync(process.execPath, ["--no-warnings", path.join("scripts", "init-db.js")], {
    cwd: BACKEND_DIR,
    // 跨平台传参：直接给子进程 env，避免 shell 的 VAR=value 写法。
    env: { ...process.env, TRIVIA_DB_PATH: dbPath },
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`init-db 初始化失败，退出码 ${result.status}`);
  }
}

function countSeededQuestions(dbPath) {
  const db = new DatabaseSync(dbPath);

  try {
    return Number(db.prepare("SELECT COUNT(*) AS total FROM questions").get()?.total || 0);
  } finally {
    db.close();
  }
}

function prepareE2EDatabase() {
  const dbPath = assertE2EDatabasePathIsSafe(E2E_DB_PATH);

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  removeExistingDatabaseFiles(dbPath);
  runProjectInitDb(dbPath);

  const questionCount = countSeededQuestions(dbPath);

  if (questionCount <= 0) {
    throw new Error("E2E 测试库初始化后没有任何题目，请检查 init-db 与种子数据。");
  }

  return { dbPath, questionCount };
}

module.exports = { prepareE2EDatabase };

if (require.main === module) {
  const { dbPath, questionCount } = prepareE2EDatabase();
  console.log(`E2E 测试库已重建：${dbPath}（${questionCount} 道题）`);
}
