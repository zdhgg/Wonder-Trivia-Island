const express = require("express");
const { commitQuestionImport, previewQuestionImport } = require("../../services/questionImport");
const { requireImportAccess } = require("./shared");

const router = express.Router();

router.post("/import/preview", requireImportAccess, (req, res, next) => {
  try {
    const result = previewQuestionImport(req.body?.rows, req.body?.mode, req.db);
    res.json(result);
  } catch (error) {
    if (
      error.message === "导入模式无效。" ||
      error.message === "请先上传至少一行题目数据。" ||
      error.message === "单次最多预检 1000 行题目，请拆分后再导入。"
    ) {
      res.status(400).json({
        message: error.message
      });
      return;
    }

    next(error);
  }
});

router.post("/import/commit", requireImportAccess, (req, res, next) => {
  try {
    const result = commitQuestionImport(req.body?.questions, req.body?.mode, req.db);
    res.json(result);
  } catch (error) {
    if (
      error.message === "导入模式无效。" ||
      error.message === "没有可导入的题目，请先完成预检。" ||
      error.message === "单次最多导入 1000 行题目，请拆分后再导入。" ||
      error.message === "提交的导入数据未通过校验。"
    ) {
      res.status(400).json({
        message: error.message,
        details: error.details || []
      });
      return;
    }

    next(error);
  }
});

module.exports = router;
