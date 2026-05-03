const express = require("express");
const {
  ALLOWED_SUBJECTS,
  getQuestionPolicyIssues,
  insertQuestion
} = require("../../questions/repository");
const { validatePreparedQuestion } = require("../../services/questionImport");
const {
  run,
  ALLOWED_GRADE_SET,
  ALLOWED_SEMESTER_SET,
  ALLOWED_SUBJECT_SET,
  requireImportAccess,
  parseIntegerParam,
  parseQuestionId,
  parseQuestionIds,
  normalizeKnowledgeTag,
  normalizeImageUrl,
  serializeQuestionRow,
  findQuestionById,
  findQuestionsByIds
} = require("./shared");

const router = express.Router();

router.post("/", requireImportAccess, (req, res, next) => {
  const validationResult = validatePreparedQuestion(req.body, "题目");

  if (validationResult.issues.length > 0) {
    res.status(400).json({
      message: "提交的题目数据未通过校验。",
      details: validationResult.issues
    });
    return;
  }

  try {
    const insertResult = insertQuestion(req.db, validationResult.question);
    const createdQuestion = findQuestionById(req.db, Number(insertResult.lastInsertRowid));

    res.status(201).json({
      message: "题目已创建。",
      data: serializeQuestionRow(createdQuestion)
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/batch/update", requireImportAccess, (req, res, next) => {
  const questionIds = parseQuestionIds(req.body?.ids);
  const changes = req.body?.changes || {};
  const normalizedChanges = {};

  if (!questionIds) {
    res.status(400).json({
      message: "ids 必须是至少包含一个正整数的数组。"
    });
    return;
  }

  if (changes.subject !== undefined) {
    const subject = String(changes.subject || "").trim();

    if (!ALLOWED_SUBJECT_SET.has(subject)) {
      res.status(400).json({
        message: `subject 仅支持：${ALLOWED_SUBJECTS.join("、")}。`
      });
      return;
    }

    normalizedChanges.subject = subject;
  }

  if (changes.grade !== undefined) {
    const grade = String(changes.grade || "").trim();

    if (!ALLOWED_GRADE_SET.has(grade)) {
      res.status(400).json({
        message: `grade 仅支持：${[...ALLOWED_GRADE_SET].join("、")}。`
      });
      return;
    }

    normalizedChanges.grade = grade;
  }

  if (changes.semester !== undefined) {
    const semester = String(changes.semester || "").trim();

    if (!ALLOWED_SEMESTER_SET.has(semester)) {
      res.status(400).json({
        message: `semester 仅支持：${[...ALLOWED_SEMESTER_SET].join("、")}。`
      });
      return;
    }

    normalizedChanges.semester = semester;
  }

  if (changes.difficulty !== undefined) {
    const difficulty = parseIntegerParam(changes.difficulty, null, { min: 1, max: 3 });

    if (difficulty === null) {
      res.status(400).json({
        message: "difficulty 仅支持 1 到 3。"
      });
      return;
    }

    normalizedChanges.difficulty = difficulty;
  }

  if (changes.knowledgeTag !== undefined) {
    normalizedChanges.knowledgeTag = normalizeKnowledgeTag(changes.knowledgeTag);
  }

  if (changes.imageUrl !== undefined) {
    normalizedChanges.imageUrl = normalizeImageUrl(changes.imageUrl);
  }

  if (Object.keys(normalizedChanges).length === 0) {
    res.status(400).json({
      message: "changes 至少要包含 subject、grade、semester、difficulty、knowledgeTag、imageUrl 中的一项。"
    });
    return;
  }

  try {
    const existingQuestions = findQuestionsByIds(req.db, questionIds);

    if (existingQuestions.length !== questionIds.length) {
      res.status(404).json({
        message: "部分题目不存在。"
      });
      return;
    }

    for (const existingQuestion of existingQuestions) {
      const policyIssues = getQuestionPolicyIssues({
        subject: normalizedChanges.subject ?? existingQuestion.subject,
        grade: normalizedChanges.grade ?? existingQuestion.grade,
        semester: normalizedChanges.semester ?? existingQuestion.semester
      });

      if (policyIssues.length > 0) {
        res.status(400).json({
          message: policyIssues[0]
        });
        return;
      }
    }

    const setClauses = [];
    const params = [];

    if (normalizedChanges.subject !== undefined) {
      setClauses.push("subject = ?");
      params.push(normalizedChanges.subject);
    }

    if (normalizedChanges.grade !== undefined) {
      setClauses.push("grade = ?");
      params.push(normalizedChanges.grade);
    }

    if (normalizedChanges.semester !== undefined) {
      setClauses.push("semester = ?");
      params.push(normalizedChanges.semester);
    }

    if (normalizedChanges.difficulty !== undefined) {
      setClauses.push("difficulty = ?");
      params.push(normalizedChanges.difficulty);
    }

    if (normalizedChanges.knowledgeTag !== undefined) {
      setClauses.push("knowledgeTag = ?");
      params.push(normalizedChanges.knowledgeTag);
    }

    if (normalizedChanges.imageUrl !== undefined) {
      setClauses.push("imageUrl = ?");
      params.push(normalizedChanges.imageUrl);
    }

    setClauses.push("updatedAt = CURRENT_TIMESTAMP");

    const placeholders = questionIds.map(() => "?").join(", ");

    run(req.db, "BEGIN TRANSACTION");
    run(
      req.db,
      `
        UPDATE questions
        SET ${setClauses.join(", ")}
        WHERE id IN (${placeholders})
      `,
      [...params, ...questionIds]
    );
    run(req.db, "COMMIT");

    res.json({
      message: "批量更新完成。",
      updatedCount: questionIds.length,
      ids: questionIds,
      changes: normalizedChanges
    });
  } catch (error) {
    try {
      run(req.db, "ROLLBACK");
    } catch {
      // Keep the original error visible.
    }

    next(error);
  }
});

router.post("/batch/delete", requireImportAccess, (req, res, next) => {
  const questionIds = parseQuestionIds(req.body?.ids);

  if (!questionIds) {
    res.status(400).json({
      message: "ids 必须是至少包含一个正整数的数组。"
    });
    return;
  }

  try {
    const existingQuestions = findQuestionsByIds(req.db, questionIds);

    if (existingQuestions.length !== questionIds.length) {
      res.status(404).json({
        message: "部分题目不存在。"
      });
      return;
    }

    const placeholders = questionIds.map(() => "?").join(", ");

    run(req.db, "BEGIN TRANSACTION");
    run(
      req.db,
      `
        DELETE FROM questions
        WHERE id IN (${placeholders})
      `,
      questionIds
    );
    run(req.db, "COMMIT");

    res.json({
      message: "批量删除完成。",
      deletedCount: questionIds.length,
      ids: questionIds
    });
  } catch (error) {
    try {
      run(req.db, "ROLLBACK");
    } catch {
      // Keep the original error visible.
    }

    next(error);
  }
});

router.patch("/:id", requireImportAccess, (req, res, next) => {
  const questionId = parseQuestionId(req.params?.id);

  if (questionId === null) {
    res.status(400).json({
      message: "题目 id 无效。"
    });
    return;
  }

  const validationResult = validatePreparedQuestion(req.body, "题目");

  if (validationResult.issues.length > 0) {
    res.status(400).json({
      message: "提交的题目数据未通过校验。",
      details: validationResult.issues
    });
    return;
  }

  try {
    const existingQuestion = findQuestionById(req.db, questionId);

    if (!existingQuestion) {
      res.status(404).json({
        message: "题目不存在。"
      });
      return;
    }

    run(
      req.db,
      `
        UPDATE questions
        SET
          subject = ?,
          grade = ?,
          semester = ?,
          knowledgeTag = ?,
          type = ?,
          content = ?,
          imageUrl = ?,
          options = ?,
          answer = ?,
          explanation = ?,
          difficulty = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        validationResult.question.subject,
        validationResult.question.grade,
        validationResult.question.semester,
        validationResult.question.knowledgeTag,
        validationResult.question.type,
        validationResult.question.content,
        validationResult.question.imageUrl,
        JSON.stringify(validationResult.question.options),
        validationResult.question.answer,
        validationResult.question.explanation,
        validationResult.question.difficulty,
        questionId
      ]
    );

    const updatedQuestion = findQuestionById(req.db, questionId);

    res.json({
      message: "题目已更新。",
      data: serializeQuestionRow(updatedQuestion)
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireImportAccess, (req, res, next) => {
  const questionId = parseQuestionId(req.params?.id);

  if (questionId === null) {
    res.status(400).json({
      message: "题目 id 无效。"
    });
    return;
  }

  try {
    const existingQuestion = findQuestionById(req.db, questionId);

    if (!existingQuestion) {
      res.status(404).json({
        message: "题目不存在。"
      });
      return;
    }

    run(
      req.db,
      `
        DELETE FROM questions
        WHERE id = ?
      `,
      [questionId]
    );

    res.json({
      message: "题目已删除。",
      deletedId: questionId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
