const path = require("node:path");

// E2E 运行环境的唯一事实来源：端口、路径、隔离数据库位置。
// 所有 E2E 脚本（Playwright 配置 / 数据库准备）都从这里取值，避免各自硬编码。
const ROOT_DIR = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT_DIR, "backend");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");

// E2E 专用固定端口：刻意避开开发默认端口（3008 / 8008），
// 这样即使开发者本地正在跑 npm run dev，E2E 也不会误连到他的服务。
const DEFAULT_BACKEND_PORT = 3100;
const DEFAULT_FRONTEND_PORT = 3101;

function parsePort(rawValue, fallbackPort) {
  const parsedPort = Number.parseInt(String(rawValue ?? ""), 10);

  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : fallbackPort;
}

const BACKEND_PORT = parsePort(process.env.E2E_BACKEND_PORT, DEFAULT_BACKEND_PORT);
const FRONTEND_PORT = parsePort(process.env.E2E_FRONTEND_PORT, DEFAULT_FRONTEND_PORT);

const BACKEND_ORIGIN = `http://127.0.0.1:${BACKEND_PORT}`;
const FRONTEND_ORIGIN = `http://127.0.0.1:${FRONTEND_PORT}`;

// E2E 测试库只允许落在 tmp/e2e/ 下；真实用户库在 backend/data/trivia.db。
const E2E_TMP_DIR = path.join(ROOT_DIR, "tmp", "e2e");
const E2E_DB_PATH = path.join(E2E_TMP_DIR, "trivia-e2e.db");
const REAL_DB_PATH = path.join(BACKEND_DIR, "data", "trivia.db");

// 硬性隔离保护：任何要删除/重建的库，都必须落在 tmp/e2e/ 内且不等于真实库。
function assertE2EDatabasePathIsSafe(candidatePath = E2E_DB_PATH) {
  const resolvedPath = path.resolve(candidatePath);

  if (resolvedPath === path.resolve(REAL_DB_PATH)) {
    throw new Error(`拒绝把真实数据库当作 E2E 测试库：${resolvedPath}`);
  }

  const safePrefix = `${E2E_TMP_DIR}${path.sep}`;

  if (!resolvedPath.startsWith(safePrefix)) {
    throw new Error(`E2E 测试库必须位于 ${E2E_TMP_DIR} 内，实际为：${resolvedPath}`);
  }

  return resolvedPath;
}

module.exports = {
  ROOT_DIR,
  BACKEND_DIR,
  FRONTEND_DIR,
  BACKEND_PORT,
  FRONTEND_PORT,
  BACKEND_ORIGIN,
  FRONTEND_ORIGIN,
  E2E_TMP_DIR,
  E2E_DB_PATH,
  REAL_DB_PATH,
  assertE2EDatabasePathIsSafe
};
