const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");
const {
  ROOT_DIR,
  BACKEND_DIR,
  FRONTEND_DIR,
  BACKEND_PORT,
  FRONTEND_PORT,
  BACKEND_ORIGIN,
  FRONTEND_ORIGIN,
  E2E_DB_PATH
} = require("./e2e/e2e-environment");

const E2E_SPEC_DIR = path.join(__dirname, "e2e", "specs");
const E2E_GLOBAL_SETUP = path.join(__dirname, "e2e", "global-setup.js");
const E2E_ARTIFACTS_DIR = path.join(ROOT_DIR, "tmp", "e2e", "artifacts");

module.exports = defineConfig({
  testDir: E2E_SPEC_DIR,
  globalSetup: E2E_GLOBAL_SETUP,
  outputDir: E2E_ARTIFACTS_DIR,

  // 串行执行：单文件 SQLite + 本地家庭学习系统，确定性优先于速度。
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [["list"]],

  use: {
    baseURL: FRONTEND_ORIGIN,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },

  // 只安装并运行 Chromium。
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],

  // 两个服务都由 Playwright 负责拉起与关闭，不依赖开发者先手动 npm run dev。
  // reuseExistingServer: false —— 端口被占用时直接失败，绝不误连到开发者的服务。
  webServer: [
    {
      command: `node --no-warnings ${path.join("src", "server.js")}`,
      cwd: BACKEND_DIR,
      url: `${BACKEND_ORIGIN}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        // server.js 会优先采用显式 API_PORT，不会被根目录 .env 的端口覆盖。
        API_PORT: String(BACKEND_PORT),
        // 硬性隔离：E2E 后端只允许打开专用测试库。
        TRIVIA_DB_PATH: E2E_DB_PATH,
        NODE_ENV: "test"
      }
    },
    {
      command: `node ${path.join("node_modules", "vite", "bin", "vite.js")} --port ${FRONTEND_PORT} --strictPort`,
      cwd: FRONTEND_DIR,
      url: FRONTEND_ORIGIN,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        // vite.config.js 通过 loadEnv 读取根 .env，而 loadEnv 让 process.env 优先，
        // 因此这里显式传 PORT / API_PORT 就能让 dev server 与 /api 代理都指向 E2E 服务。
        PORT: String(FRONTEND_PORT),
        API_PORT: String(BACKEND_PORT)
      }
    }
  ]
});
