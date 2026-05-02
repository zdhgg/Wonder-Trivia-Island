const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");
const backendEntry = path.join(backendDir, "src", "server.js");
const viteEntry = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");

function ensureFileExists(filePath, helpText) {
  if (!fs.existsSync(filePath)) {
    console.error(`[dev] Missing required file: ${filePath}`);
    console.error(`[dev] ${helpText}`);
    process.exit(1);
  }
}

ensureFileExists(backendEntry, "Run `npm run backend:install` if the backend has not been installed.");
ensureFileExists(viteEntry, "Run `npm run frontend:install` if the frontend has not been installed.");

const children = [];
let isShuttingDown = false;
let pendingExitCode = 0;

function log(message) {
  process.stdout.write(`[dev] ${message}\n`);
}

function startProcess(name, args, cwd) {
  log(`starting ${name}`);

  const child = spawn(process.execPath, args, {
    cwd,
    stdio: "inherit",
    windowsHide: false
  });

  child.on("error", (error) => {
    if (isShuttingDown) {
      return;
    }

    pendingExitCode = 1;
    log(`${name} failed to start: ${error.message}`);
    requestShutdown();
  });

  child.on("exit", (code, signal) => {
    if (!isShuttingDown) {
      pendingExitCode = code ?? 1;
      log(`${name} exited ${signal ? `with signal ${signal}` : `with code ${code}`}`);
      requestShutdown();
      return;
    }

    if (children.every((entry) => entry.child.exitCode !== null || entry.child.killed)) {
      process.exit(pendingExitCode);
    }
  });

  children.push({ name, child });
}

function requestShutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  log("stopping child processes");

  for (const entry of children) {
    if (entry.child.exitCode === null && !entry.child.killed) {
      entry.child.kill("SIGINT");
    }
  }

  setTimeout(() => {
    for (const entry of children) {
      if (entry.child.exitCode === null && !entry.child.killed) {
        entry.child.kill("SIGTERM");
      }
    }
  }, 1200);

  setTimeout(() => {
    for (const entry of children) {
      if (entry.child.exitCode === null && !entry.child.killed) {
        entry.child.kill("SIGKILL");
      }
    }
  }, 3000);
}

process.on("SIGINT", () => {
  pendingExitCode = 0;
  requestShutdown();
});

process.on("SIGTERM", () => {
  pendingExitCode = 0;
  requestShutdown();
});

startProcess("backend", ["--watch", "--no-warnings", backendEntry], backendDir);
startProcess("frontend", [viteEntry], frontendDir);
