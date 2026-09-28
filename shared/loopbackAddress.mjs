// 本机（loopback）地址判定的唯一真源。
//
// 只接受内核提供的 TCP 对端地址（Node 的 `socket.remoteAddress`）。
// 绝不接受 X-Forwarded-For / Forwarded / X-Real-IP 这类客户端可伪造的请求头，
// 也绝不接受 Express 的 `req.ip` —— 一旦设置了 trust proxy，它同样来自请求头。
//
// 这个文件被两边共用，因此必须保持无依赖、无 I/O：
//   - backend：CommonJS 侧用 `require()` 加载（Node 24 支持 require(esm)）
//   - frontend：Vite 配置是 ESM，直接 `import`

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const IPV6_LOOPBACK_FORMS = new Set(["::1", "0:0:0:0:0:0:0:1"]);

function isLoopbackAddress(remoteAddress) {
  const raw = String(remoteAddress ?? "").trim();

  if (!raw) {
    return false;
  }

  // 去掉 zone index，例如 "fe80::1%eth0"。
  const withoutZone = raw.split("%")[0].trim();

  if (!withoutZone) {
    return false;
  }

  if (IPV6_LOOPBACK_FORMS.has(withoutZone.toLowerCase())) {
    return true;
  }

  // IPv4-mapped / IPv4-compatible IPv6（::ffff:127.0.0.1）→ 先取回 IPv4 形式。
  const mapped = IPV4_MAPPED_PATTERN.exec(withoutZone);
  const candidate = mapped ? mapped[1] : withoutZone;
  const ipv4 = IPV4_PATTERN.exec(candidate);

  if (!ipv4) {
    return false;
  }

  const octets = [ipv4[1], ipv4[2], ipv4[3], ipv4[4]].map((part) => Number(part));

  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  // 整个 127.0.0.0/8 都是 loopback，不只是 127.0.0.1。
  return octets[0] === 127;
}

export { isLoopbackAddress };
