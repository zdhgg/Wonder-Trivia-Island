const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { dbPath } = require("../db/database");

const STAGING_VERSION = 1;
const stagingDir = path.join(path.dirname(dbPath), "staging");
const pendingBatchPath = path.join(stagingDir, "pending.json");

function ensureStagingDir() {
  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }
}

function createBatchId() {
  return crypto.randomUUID();
}

function writePendingBatch(batch) {
  ensureStagingDir();

  const payload = {
    version: STAGING_VERSION,
    ...batch
  };
  // 临时文件 + rename，避免读到写了一半的 JSON。
  const tempPath = `${pendingBatchPath}.${process.pid}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tempPath, pendingBatchPath);

  return payload;
}

function readPendingBatch() {
  if (!fs.existsSync(pendingBatchPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(pendingBatchPath, "utf8"));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function clearPendingBatch() {
  try {
    fs.unlinkSync(pendingBatchPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

module.exports = {
  clearPendingBatch,
  createBatchId,
  ensureStagingDir,
  pendingBatchPath,
  readPendingBatch,
  stagingDir,
  writePendingBatch
};
