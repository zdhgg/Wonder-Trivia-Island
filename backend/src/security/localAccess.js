const { isLoopbackAddress } = require("../../../shared/loopbackAddress.mjs");

// 管理面访问判定结果。抽成纯函数是为了让「非本机」这条分支可以被单测覆盖：
// 测试进程内的 HTTP 流量永远是 loopback（app.listen 绑 127.0.0.1），
// 无法用真实网络拓扑去跑「局域网直连」这一路，所以判定逻辑必须能脱离 HTTP 求值。
const MANAGEMENT_ACCESS = Object.freeze({
  ALLOW_LOOPBACK: "allow-loopback",
  ALLOW_KEY: "allow-key",
  DENY_LOOPBACK_REQUIRED: "deny-loopback-required",
  DENY_INVALID_KEY: "deny-invalid-key"
});

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * 管理面访问判定（纯函数）。
 *
 * 目标语义：
 *   real socket is loopback  OR  valid ADMIN_IMPORT_KEY
 *
 * 也就是：
 *   - PC 本机浏览器做管理：不需要 ADMIN_IMPORT_KEY；
 *   - 非本机直连 backend 做管理：必须提供正确的 ADMIN_IMPORT_KEY。
 *
 * `remoteAddress` 必须是真实 socket 对端地址，不能是 req.ip / 任何 forwarded header。
 */
function resolveManagementAccess({ remoteAddress = "", expectedKey = "", providedKey = "" } = {}) {
  if (isLoopbackAddress(remoteAddress)) {
    return { allowed: true, reason: MANAGEMENT_ACCESS.ALLOW_LOOPBACK };
  }

  const normalizedExpected = normalizeKey(expectedKey);
  const normalizedProvided = normalizeKey(providedKey);

  if (normalizedExpected && normalizedProvided === normalizedExpected) {
    return { allowed: true, reason: MANAGEMENT_ACCESS.ALLOW_KEY };
  }

  return {
    allowed: false,
    reason: normalizedExpected ? MANAGEMENT_ACCESS.DENY_INVALID_KEY : MANAGEMENT_ACCESS.DENY_LOOPBACK_REQUIRED
  };
}

/**
 * 只看真实 socket 对端地址，完全忽略请求头。
 * 即使调用方伪造 X-Forwarded-For: 127.0.0.1，这里也不会放行。
 */
function isLoopbackRequest(req) {
  return isLoopbackAddress(req?.socket?.remoteAddress);
}

module.exports = {
  MANAGEMENT_ACCESS,
  isLoopbackAddress,
  isLoopbackRequest,
  resolveManagementAccess
};
