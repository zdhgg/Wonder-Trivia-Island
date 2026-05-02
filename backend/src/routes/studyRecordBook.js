const { randomUUID } = require("node:crypto");
const express = require("express");
const { createDatabaseConnection, get, run } = require("../db/database");

const router = express.Router();
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const createTableSql = `
  CREATE TABLE IF NOT EXISTS study_record_book (
    profile_id TEXT PRIMARY KEY,
    record_book_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

function parseCookieHeader(rawHeader = "") {
  return String(rawHeader || "")
    .split(";")
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (name) {
        cookies[name] = decodeURIComponent(value);
      }

      return cookies;
    }, {});
}

function clampInteger(rawValue, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsedValue = Number.parseInt(String(rawValue ?? ""), 10);

  if (!Number.isInteger(parsedValue)) {
    return min;
  }

  return Math.max(min, Math.min(max, parsedValue));
}

function normalizeText(value, maxLength = 0) {
  const normalized = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function normalizeTimestamp(value) {
  const normalized = normalizeText(value, 64);

  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    return "";
  }

  return new Date(normalized).toISOString();
}

function normalizeQuestionOptions(options = []) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => ({
      key: normalizeText(option?.key, 8),
      text: normalizeText(option?.text, 240)
    }))
    .filter((option) => option.key && option.text);
}

function normalizeQuestionSnapshot(question = {}) {
  const questionId = clampInteger(question?.id, { min: 0, max: 999999999 });

  return {
    id: questionId > 0 ? questionId : null,
    subject: normalizeText(question?.subject, 16),
    grade: normalizeText(question?.grade, 16),
    semester: normalizeText(question?.semester, 16),
    knowledgeTag: normalizeText(question?.knowledgeTag, 48),
    type: normalizeText(question?.type, 32),
    content: normalizeText(question?.content, 500),
    difficulty: normalizeText(question?.difficulty, 8),
    options: normalizeQuestionOptions(question?.options)
  };
}

function normalizeStudyQuestionRecord(record = {}) {
  const snapshot = normalizeQuestionSnapshot(record?.snapshot ?? record?.question ?? record);

  return {
    questionId: snapshot.id,
    snapshot,
    correctAnswer: normalizeText(record?.correctAnswer, 8),
    explanation: normalizeText(record?.explanation, 2000),
    attempts: clampInteger(record?.attempts, { min: 0, max: 999999 }),
    correctCount: clampInteger(record?.correctCount, { min: 0, max: 999999 }),
    wrongCount: clampInteger(record?.wrongCount, { min: 0, max: 999999 }),
    timeoutCount: clampInteger(record?.timeoutCount, { min: 0, max: 999999 }),
    reviewCorrectStreak: clampInteger(record?.reviewCorrectStreak, { min: 0, max: 999999 }),
    lastResult: normalizeText(record?.lastResult, 16),
    lastSelectedOption: normalizeText(record?.lastSelectedOption, 16),
    lastAnsweredAt: normalizeTimestamp(record?.lastAnsweredAt),
    firstWrongAt: normalizeTimestamp(record?.firstWrongAt),
    lastWrongAt: normalizeTimestamp(record?.lastWrongAt),
    lastCorrectAt: normalizeTimestamp(record?.lastCorrectAt),
    nextReviewAt: normalizeTimestamp(record?.nextReviewAt),
    masteredAt: normalizeTimestamp(record?.masteredAt)
  };
}

function normalizeStudyRecordBook(recordBook = {}) {
  const rawQuestionRecords =
    recordBook?.questionRecords && typeof recordBook.questionRecords === "object" && !Array.isArray(recordBook.questionRecords)
      ? recordBook.questionRecords
      : {};
  const questionRecords = {};

  for (const [rawQuestionId, rawRecord] of Object.entries(rawQuestionRecords)) {
    const normalizedRecord = normalizeStudyQuestionRecord(rawRecord);
    const fallbackQuestionId = clampInteger(rawQuestionId, { min: 0, max: 999999999 });
    const resolvedQuestionId = normalizedRecord.questionId ?? (fallbackQuestionId > 0 ? fallbackQuestionId : null);

    if (!resolvedQuestionId) {
      continue;
    }

    questionRecords[String(resolvedQuestionId)] = {
      ...normalizedRecord,
      questionId: resolvedQuestionId,
      snapshot: {
        ...normalizedRecord.snapshot,
        id: resolvedQuestionId
      }
    };
  }

  return {
    questionRecords,
    updatedAt: normalizeTimestamp(recordBook?.updatedAt)
  };
}

function ensureStudyRecordBookTable(db) {
  run(db, createTableSql);
}

function getProfileId(req, res) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const existingProfileId = String(cookies[PROFILE_COOKIE_NAME] || "").trim();

  if (PROFILE_ID_PATTERN.test(existingProfileId)) {
    return existingProfileId;
  }

  const profileId = randomUUID();

  res.cookie(PROFILE_COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365 * 2
  });

  return profileId;
}

function getStoredStudyRecordBook(db, profileId) {
  ensureStudyRecordBookTable(db);
  const row = get(
    db,
    `
      SELECT record_book_json, updated_at
      FROM study_record_book
      WHERE profile_id = ?
    `,
    [profileId]
  );

  if (!row) {
    return {
      studyRecordBook: normalizeStudyRecordBook(),
      updatedAt: null
    };
  }

  try {
    return {
      studyRecordBook: normalizeStudyRecordBook(JSON.parse(row.record_book_json)),
      updatedAt: row.updated_at || null
    };
  } catch {
    return {
      studyRecordBook: normalizeStudyRecordBook(),
      updatedAt: row.updated_at || null
    };
  }
}

function saveStudyRecordBook(db, profileId, recordBook) {
  const normalizedRecordBook = normalizeStudyRecordBook(recordBook);
  const updatedAt = new Date().toISOString();

  ensureStudyRecordBookTable(db);
  run(
    db,
    `
      INSERT INTO study_record_book (profile_id, record_book_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        record_book_json = excluded.record_book_json,
        updated_at = excluded.updated_at
    `,
    [profileId, JSON.stringify(normalizedRecordBook), updatedAt]
  );

  return {
    studyRecordBook: normalizedRecordBook,
    updatedAt
  };
}

router.get("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);
    const payload = getStoredStudyRecordBook(db, profileId);

    res.json(payload);
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.put("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const rawRecordBook = req.body?.studyRecordBook ?? req.body?.recordBook;

    if (!rawRecordBook || typeof rawRecordBook !== "object") {
      res.status(400).json({
        message: "studyRecordBook 必须是对象。"
      });
      return;
    }

    const profileId = getProfileId(req, res);
    const payload = saveStudyRecordBook(db, profileId, rawRecordBook);

    res.json(payload);
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

module.exports = router;
