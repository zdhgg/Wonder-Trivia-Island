const express = require("express");
const { generateQuizSessionSummary } = require("../../services/questionReview");
const { get, normalizeRequestText } = require("./shared");

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

// 整轮学习总结走本地确定性规则（buildSessionSummaryFallback），
// 与模型配置无关；单题点评 /review 和语音 /review/speech 已删除。
router.post("/review/summary", async (req, res, next) => {
  try {
    const attempts = Array.isArray(req.body?.attempts) ? req.body.attempts : [];

    if (attempts.length === 0) {
      res.status(400).json({
        message: "attempts 为必填项，且至少包含一条作答记录。"
      });
      return;
    }

    const result = await generateQuizSessionSummary({
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
      message: "本轮学习总结已生成。",
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

module.exports = router;
