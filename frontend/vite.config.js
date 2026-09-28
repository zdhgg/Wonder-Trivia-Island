import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { isLoopbackAddress } from "../shared/loopbackAddress.mjs";
import { isExternalAiRequest, isManagementRequest } from "./security/managementPaths.js";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(configDir, "..", "shared");

function parsePort(rawValue) {
  const parsedPort = Number.parseInt(String(rawValue || ""), 10);

  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : null;
}

// Vite 代理边缘守卫。
//
// 为什么必须在 Vite 这一层做：Vite 代理是「服务端发起的新连接」，
// 后端看到的对端永远是 127.0.0.1（Vite 自己），无法区分「本机浏览器」与
// 「局域网浏览器」。只有 Vite 能看到浏览器 → Vite 的真实 socket 对端地址。
//
// 为什么用 bypass 而不是 configureServer 中间件：Vite 8 的 bypass 同时覆盖
// 普通 HTTP（viteProxyMiddleware）与 WebSocket upgrade（httpServer 的 upgrade
// 事件），而 connect 中间件链看不到 upgrade。门户生成的 vite.config.proxy.ts
// 正是带 ws: true 的那份配置。
//
// bypass 返回 false 时 Vite 固定回 404（fail-closed）。这里刻意不去伪造自定义
// 403 JSON：只有攻击者会看到这个响应，本机管理流量走的是 loopback 分支。
function createProxyBypassGuard() {
  return function bypass(req) {
    // C 面 External Harness：任何浏览器（含本机）都不经 Vite 代理。
    // DSH 永远直连 http://127.0.0.1:8008/api/external-ai/...
    if (isExternalAiRequest(req.url)) {
      return false;
    }

    // B 面管理：只放行真实来自本机的浏览器。
    if (isManagementRequest(req.method, req.url) && !isLoopbackAddress(req.socket?.remoteAddress)) {
      return false;
    }

    // A 面学习接口（含手机端的写入）正常代理，不看来源。
    return undefined;
  };
}

// Vite 8 的默认 fs.deny 是：
//   [".env", ".env.*", "*.{crt,pem,key,p12,pfx,cer,der}", ".npmrc", ".yarnrc.yml", "**/.git/**"]
// 显式设置 fs.deny 会整体覆盖默认值，所以必须先把默认项原样列回来，
// 否则「为了挡住 backend」反而会把 .env / 证书 / .git 重新开放。
const DEFAULT_FS_DENY = [
  ".env",
  ".env.*",
  "*.{crt,pem,key,p12,pfx,cer,der}",
  ".npmrc",
  ".yarnrc.yml",
  "**/.git/**"
];

// 曾经 allow 是整个仓库根目录，于是局域网里一条
//   GET /@fs/<repo>/backend/data/trivia.db
// 就能直接把整库（含每道题答案与学习记录）拿走。
// 这里收紧到前端真正需要的两个目录：frontend 自身 + shared/。
const fileSystemAccess = {
  allow: [configDir, sharedDir],
  deny: [...DEFAULT_FS_DENY, "**/backend/**", "**/*.db", "**/*.sqlite"]
};

function buildProxyConfig(backendPort) {
  return {
    "/api": {
      target: `http://127.0.0.1:${backendPort}`,
      bypass: createProxyBypassGuard()
    }
  };
}

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(configDir, ".."), "");
  const frontendPort = parsePort(rootEnv.PORT);
  const backendPort = parsePort(rootEnv.API_PORT) ?? 3000;

  return {
    plugins: [vue()],
    server: {
      host: rootEnv.HOST || undefined,
      port: frontendPort ?? undefined,
      fs: fileSystemAccess,
      proxy: buildProxyConfig(backendPort)
    },
    // preview 默认继承 server.host（本仓库 HOST=0.0.0.0 → 局域网可见）。
    // 这里补上同一套代理守卫，避免 preview 将来成为一条没有守卫的第二条代理路径。
    // preview 不支持 fs 配置（PreviewOptions 里没有 fs），/@fs/ 是 dev server 的事，
    // 所以这里刻意不写 preview.fs。
    preview: {
      proxy: buildProxyConfig(backendPort)
    }
  };
});
