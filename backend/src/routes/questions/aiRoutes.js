const express = require("express");
const { generateQuestionDrafts } = require("../../services/questionGeneration");
const { probeAiRuntimeConnection } = require("../../services/aiRuntimeProbe");
const {
  requireImportAccess,
  parseIntegerParam,
  normalizeRequestText,
  normalizeKnowledgeTag,
  parseAiRuntime,
  validateQuestionFilters
} = require("./shared");

const router = express.Router();

router.post("/generate", requireImportAccess, async (req, res, next) => {
  const count = parseIntegerParam(req.body?.count, 1, { min: 1, max: 20 });
  const difficulty = parseIntegerParam(req.body?.difficulty, null, { min: 1, max: 3 });
  const questionFilters = {
    subject: normalizeRequestText(req.body?.subject, 20),
    grade: normalizeRequestText(req.body?.grade, 20),
    semester: normalizeRequestText(req.body?.semester, 20),
    knowledgeTag: normalizeKnowledgeTag(req.body?.knowledgeTag),
    difficulty
  };
  const topic = normalizeRequestText(req.body?.topic, 120);
  const guidance = normalizeRequestText(req.body?.guidance, 600);
  const referenceText = normalizeRequestText(req.body?.referenceText, 6000);
  const model = normalizeRequestText(req.body?.model, 120);
  const aiRuntime = parseAiRuntime(req.body?.aiRuntime);

  if (count === null) {
    res.status(400).json({
      message: "count 仅支持 1 到 20 的正整数。"
    });
    return;
  }

  if (!questionFilters.subject || !questionFilters.grade || !questionFilters.semester || difficulty === null) {
    res.status(400).json({
      message: "AI 出题必须提供完整的学科、年级、学期和难度。"
    });
    return;
  }

  if (!validateQuestionFilters(questionFilters, res, req.body || {})) {
    return;
  }

  if (aiRuntime.issues.length > 0) {
    res.status(400).json({
      message: "AI 运行时配置无效。",
      details: aiRuntime.issues
    });
    return;
  }

  try {
    const result = await generateQuestionDrafts({
      ...questionFilters,
      count,
      model,
      aiRuntime: aiRuntime.config,
      topic,
      guidance,
      referenceText
    });

    res.json({
      message: "AI 草稿已生成。",
      data: result.questions[0] || null,
      drafts: result.questions,
      meta: result.meta
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
