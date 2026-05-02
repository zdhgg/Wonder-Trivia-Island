import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

const configDir = path.dirname(fileURLToPath(import.meta.url));

function parsePort(rawValue) {
  const parsedPort = Number.parseInt(String(rawValue || ""), 10);

  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : null;
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
      proxy: {
        "/api": `http://127.0.0.1:${backendPort}`
      }
    }
  };
});
