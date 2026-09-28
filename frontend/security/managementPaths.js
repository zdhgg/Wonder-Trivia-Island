// Vite 边缘的「管理面 / External Harness 面」路径判定 —— 路径表的唯一真源。
//
// 这是一个纯函数模块：不做 I/O、不做认证、不依赖 Vue、不读取环境变量。
// 它同时被 vite.config.js 与 vite.config.proxy.ts 使用，避免两个 Vite 配置
// 各抄一份路由表、然后慢慢漂移。
//
// 三类面（与审计结论一致，边界是「学习 vs 管理」，不是「读 vs 写」）：
//   A 学习面：手机 / 局域网必须一直可用 —— 本模块一律返回 false，直接放行。
//   B 管理面：局域网浏览器不得经 Vite 调用（本机浏览器可以）—— isManagementRequest。
//   C External Harness 面：任何浏览器都不得经 Vite 代理 —— isExternalAiRequest。

const EXTERNAL_AI_PREFIX = "/api/external-ai";
const PROPOSALS_PREFIX = "/api/proposals";
const QUESTION_IMPORT_PREFIX = "/api/questions/import";
const QUESTION_BATCH_PREFIX = "/api/questions/batch";
const QUESTION_RUNTIME_CHECK_PATH = "/api/questions/ai/runtime-check";
const QUESTION_GENERATE_PATH = "/api/questions/generate";
const QUESTIONS_COLLECTION_PATTERN = /^\/api\/questions\/?$/;
// 只接受纯数字 question id：/api/questions/random 绝不能被当成 :id。
const QUESTIONS_ITEM_PATTERN = /^\/api\/questions\/\d+\/?$/;
const QUESTIONS_ITEM_METHODS = new Set(["PATCH", "DELETE"]);

function normalizeRequestPath(url) {
  const raw = String(url ?? "").trim();

  if (!raw) {
    return "";
  }

  // 代理场景可能收到绝对 URL，只保留 pathname。
  const withoutOrigin = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")
    : raw;
  const withoutHash = withoutOrigin.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;

  if (withLeadingSlash.length <= 1) {
    return withLeadingSlash;
  }

  return withLeadingSlash.replace(/\/+$/, "");
}

function matchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isExternalAiRequest(url) {
  return matchesPrefix(normalizeRequestPath(url), EXTERNAL_AI_PREFIX);
}

function isManagementRequest(method, url) {
  const path = normalizeRequestPath(url);

  if (!path) {
    return false;
  }

  // External Harness 面由 isExternalAiRequest 单独识别，这里不重复表达。
  if (matchesPrefix(path, EXTERNAL_AI_PREFIX)) {
    return false;
  }

  const verb = String(method ?? "").trim().toUpperCase();

  if (matchesPrefix(path, PROPOSALS_PREFIX)) {
    return true;
  }

  if (matchesPrefix(path, QUESTION_IMPORT_PREFIX)) {
    return true;
  }

  if (matchesPrefix(path, QUESTION_BATCH_PREFIX)) {
    return true;
  }

  if (path === QUESTION_GENERATE_PATH) {
    return true;
  }

  // runtime-check 不写库，但会让后端发起出站模型调用，按管理面拦掉。
  if (path === QUESTION_RUNTIME_CHECK_PATH) {
    return true;
  }

  if (QUESTIONS_COLLECTION_PATTERN.test(path)) {
    return true;
  }

  if (QUESTIONS_ITEM_PATTERN.test(path) && QUESTIONS_ITEM_METHODS.has(verb)) {
    return true;
  }

  return false;
}

export { isExternalAiRequest, isManagementRequest, normalizeRequestPath };
