const express = require("express");
const { generateHomeWelcomeMessage } = require("../../services/homeWelcomeMessage");
const {
  generateQuestionReview,
  generateQuizSessionSummary,
  synthesizeQuestionReviewSpeech
} = require("../../services/questionReview");
const {
  get,
  parseQuestionId,
  normalizeRequestText,
  parseAiRuntime,
  findQuestionById,
  buildQuestionReviewPayload
} = require("./shared");

const router = express.Router();

router.post("/submit", (req, res, next) => {
  try {
    const questionId = Number(req.body?.questionId);
    const selectedOption = String(req.body?.selectedOption || "").trim();

    if (!Number.isInteger(questionId) || questionId <= 0 || !selectedOption) {
      res.status(400).json({
        message: "questionId 和 selectedOption 为必填项。"
      });
      return;
    }

    const row = get(
      req.db,
      `
        SELECT id, answer, explanation
        FROM questions
        WHERE id = ?
      `,
      [questionId]
    );

    if (!row) {
      res.status(404).json({
        message: "题目不存在。"
      });
      return;
    }

    res.json({
      questionId: row.id,
      correct: selectedOption === row.answer,
      correctAnswer: row.answer,
      explanation: row.explanation
    });
  } catch (error) {
    next(error);
  }
});

router.post("/review", async (req, res, next) => {
  try {
    const questionId = parseQuestionId(req.body?.questionId);
    const selectedOption = normalizeRequestText(req.body?.selectedOption, 12);
    const model = normalizeRequestText(req.body?.model, 120);
    const reviewLength = normalizeRequestText(req.body?.reviewLength, 20);
    const aiRuntime = parseAiRuntime(req.body?.aiRuntime);

    if (questionId === null || !selectedOption) {
      res.status(400).json({
        message: "questionId 和 selectedOption 为必填项。"
      });
      return;
    }

    const row = findQuestionById(req.db, questionId);

    if (!row) {
      res.status(404).json({
        message: "题目不存在。"
      });
      return;
    }

    if (aiRuntime.issues.length > 0) {
      res.status(400).json({
        message: "AI 运行时配置无效。",
        details: aiRuntime.issues
      });
      return;
    }

    const result = await generateQuestionReview({
      ...buildQuestionReviewPayload(row, selectedOption, model),
      aiRuntime: aiRuntime.config,
      reviewLength
    });

    res.json({
      message: "AI 点评已生成。",
      data: result.review,
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

router.post("/review/summary", async (req, res, next) => {
  try {
    const model = normalizeRequestText(req.body?.model, 120);
    const reviewLength = normalizeRequestText(req.body?.reviewLength, 20);
    const attempts = Array.isArray(req.body?.attempts) ? req.body.attempts : [];
    const aiRuntime = parseAiRuntime(req.body?.aiRuntime);

    if (attempts.length === 0) {
      res.status(400).json({
        message: "attempts 为必填项，且至少包含一条作答记录。"
      });
      return;
    }

    if (aiRuntime.issues.length > 0) {
      res.status(400).json({
        message: "AI 运行时配置无效。",
        details: aiRuntime.issues
      });
      return;
    }

    const result = await generateQuizSessionSummary({
      aiRuntime: aiRuntime.config,
      model,
      reviewLength,
      playMode: normalizeRequestText(req.body?.playMode, 20),
      stageTitle: normalizeRequestText(req.body?.stageTitle, 80),
      score: Number(req.body?.score),
      correctCount: Number(req.body?.correctCount),
      wrongCount: Number(req.body?.wrongCount),
      totalQuestions: Number(req.body?.totalQuestions),
      accuracyPercent: Number(req.body?.accuracyPercent),
      attempts
    });

    res.json({
      message: "本轮 AI 学习总结已生成。",
      data: result.summary,
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

router.post("/review/home-welcome", async (req, res, next) => {
  try {
    const model = normalizeRequestText(req.body?.model, 120);
    const aiRuntime = parseAiRuntime(req.body?.aiRuntime);
    const context = req.body?.context && typeof req.body.context === "object" && !Array.isArray(req.body.context)
      ? req.body.context
      : {};

    if (aiRuntime.issues.length > 0) {
      res.status(400).json({
        message: "AI 运行时配置无效。",
        details: aiRuntime.issues
      });
      return;
    }

    const result = await generateHomeWelcomeMessage({
      model,
      aiRuntime: aiRuntime.config,
      context
    });

    res.json({
      message: "首页欢迎语已生成。",
      data: result.message,
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

router.post("/review/speech", async (req, res, next) => {
  try {
    const text = normalizeRequestText(req.body?.text, 200);
    const model = normalizeRequestText(req.body?.model, 120);
    const voice = normalizeRequestText(req.body?.voice, 40);
    const speed = Number(req.body?.speed);
    const audioFormat = normalizeRequestText(req.body?.audioFormat, 20);
    const aiRuntime = parseAiRuntime(req.body?.aiRuntime);

    if (!text) {
      res.status(400).json({
        message: "text 为必填项。"
      });
      return;
    }

    if (aiRuntime.issues.length > 0) {
      res.status(400).json({
        message: "AI 运行时配置无效。",
        details: aiRuntime.issues
      });
      return;
    }

    const audioResult = await synthesizeQuestionReviewSpeech({
      text,
      model,
      aiRuntime: aiRuntime.config,
      voice,
      speed,
      audioFormat
    });

    const contentType =
      audioResult.format === "wav"
        ? "audio/wav"
        : audioResult.format === "pcm16"
          ? "audio/L16; rate=24000; channels=1"
          : "audio/mpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.send(audioResult.buffer);
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
