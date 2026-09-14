const express = require("express");
const {
  IMPORT_ERROR_BATCH_MISSING,
  IMPORT_ERROR_STALE_BATCH,
  IMPORT_ERROR_STAGE_BLOCKED,
  commitPendingImport,
  commitQuestionImport,
  discardPendingImportBatch,
  getPendingImportBatch,
  previewQuestionImport,
  stageQuestionImport,
  summarizeStagedBatch
} = require("../../services/questionImport");
const { requireImportAccess } = require("./shared");

const router = express.Router();

const BAD_REQUEST_MESSAGES = new Set([
  "导入模式无效。",
  "请先上传至少一行题目数据。",
  "单次最多预检 1000 行题目，请拆分后再导入。",
  "没有可导入的题目，请先完成预检。",
  "单次最多导入 1000 行题目，请拆分后再导入。",
  "提交的导入数据未通过校验。"
]);

const ERROR_STATUS_BY_CODE = new Map([
  [IMPORT_ERROR_STAGE_BLOCKED, 422],
  [IMPORT_ERROR_STALE_BATCH, 409],
  [IMPORT_ERROR_BATCH_MISSING, 404]
]);

function respondImportError(error, res, next) {
  const status = ERROR_STATUS_BY_CODE.get(error?.code);

  if (status) {
    res.status(status).json({
      message: error.message,
      code: error.code,
      details: error.details || []
    });
    return;
  }

  if (BAD_REQUEST_MESSAGES.has(error.message)) {
    res.status(400).json({
      message: error.message,
      details: error.details || []
    });
    return;
  }

  next(error);
}

router.post("/import/preview", requireImportAccess, (req, res, next) => {
  try {
    const result = previewQuestionImport(req.body?.rows, req.body?.mode, req.db);
    res.json(result);
  } catch (error) {
    respondImportError(error, res, next);
  }
});

// 外部 harness 的提交入口：只落盘成待确认批次，不直接写题库。
router.post("/import/stage", requireImportAccess, (req, res, next) => {
  try {
    const batch = stageQuestionImport({
      rows: req.body?.rows,
      mode: req.body?.mode,
      source: req.body?.source,
      db: req.db
    });

    res.status(201).json({
      message: "题目已提交到导入待确认队列。",
      batch: summarizeStagedBatch(batch)
    });
  } catch (error) {
    respondImportError(error, res, next);
  }
});

router.get("/import/pending", requireImportAccess, (req, res, next) => {
  try {
    res.json({
      batch: getPendingImportBatch()
    });
  } catch (error) {
    next(error);
  }
});

// 人在审核页面点确认时调用；写库前比对指纹，防止覆盖掉期间新增的数据。
router.post("/import/confirm", requireImportAccess, (req, res, next) => {
  try {
    const result = commitPendingImport({
      batchId: req.body?.batchId,
      allowStale: req.body?.allowStale === true,
      db: req.db
    });

    res.json(result);
  } catch (error) {
    respondImportError(error, res, next);
  }
});

router.delete("/import/pending", requireImportAccess, (req, res, next) => {
  try {
    const result = discardPendingImportBatch({
      batchId: req.body?.batchId ?? req.query?.batchId
    });

    res.json(result);
  } catch (error) {
    respondImportError(error, res, next);
  }
});

router.post("/import/commit", requireImportAccess, (req, res, next) => {
  try {
    const result = commitQuestionImport(req.body?.questions, req.body?.mode, req.db);
    res.json(result);
  } catch (error) {
    respondImportError(error, res, next);
  }
});

module.exports = router;
