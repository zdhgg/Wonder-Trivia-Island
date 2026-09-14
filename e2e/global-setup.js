const path = require("node:path");
const { prepareE2EDatabase } = require("./prepare-e2e-database");
const { ROOT_DIR } = require("./e2e-environment");

// 每次 npm run e2e 都从零重建隔离测试库：
// 第二次运行不依赖第一次残留的数据，两次结果一致。
module.exports = async function globalSetup() {
  const { dbPath, questionCount } = prepareE2EDatabase();

  console.log(`[e2e] 隔离测试库已重建：${path.relative(ROOT_DIR, dbPath)}（${questionCount} 道题）`);
};
