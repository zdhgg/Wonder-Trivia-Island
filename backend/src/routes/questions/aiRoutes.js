const express = require("express");
const { probeAiRuntimeConnection } = require("../../services/aiRuntimeProbe");
const { normalizeRequestText, parseAiRuntime } = require("./shared");

const router = express.Router();

router.post("/ai/runtime-check", async (req, res, next) => {
  try {
    const questionModel = normalizeRequestText(req.body?.questionModel, 120);
    const reviewModel = normalizeRequestText(req.body?.reviewModel, 120);
    const ttsModel = normalizeRequestText(req.body?.ttsModel, 120);
    const aiRuntime = parseAiRuntime(req.body?.aiRuntime);

    if (aiRuntime.issues.length > 0) {
      res.status(400).json({
        message: "AI 运行时配置无效。",
        details: aiRuntime.issues
      });
      return;
    }

    const result = await probeAiRuntimeConnection({
      aiRuntime: aiRuntime.config,
      questionModel,
      reviewModel,
      ttsModel
    });

    res.json({
      message: result.allPassed ? "AI 连接测试通过。" : "AI 连接测试已完成，部分能力不可用。",
      data: result
    });
  } catch (error) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({
        message: error.message,
        details: error.details || []
      });
      return;
    }

    next(error);
  }
});

module.exports = router;
