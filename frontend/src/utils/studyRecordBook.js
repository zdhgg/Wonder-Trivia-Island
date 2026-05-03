export const STUDY_RECORD_BOOK_STORAGE_KEY = "wonder-trivia-island.study.record-book";

export const WRONG_REVIEW_MASTERY_STREAK = 2;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const REVIEW_INTERVAL_DAYS = Object.freeze({
  PENDING: 0,
  REVIEWING: 1,
  MASTERED: 3
});

export const STUDY_REVIEW_STATUS = Object.freeze({
  FRESH: "fresh",
  PENDING: "pending",
  REVIEWING: "reviewing",
  MASTERED: "mastered"
});

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

  if (!normalized) {
    return "";
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function normalizeCount(value) {
  return Math.max(0, Number.parseInt(String(value ?? "0"), 10) || 0);
}

function normalizeOptions(options = []) {
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

export function normalizeQuestionSnapshot(question = {}) {
  const parsedQuestionId = Number.parseInt(String(question?.id ?? ""), 10);

  return {
    id: Number.isInteger(parsedQuestionId) && parsedQuestionId > 0 ? parsedQuestionId : null,
    subject: normalizeText(question?.subject, 16),
    grade: normalizeText(question?.grade, 16),
    semester: normalizeText(question?.semester, 16),
    knowledgeTag: normalizeText(question?.knowledgeTag, 48),
    type: normalizeText(question?.type, 32),
    content: normalizeText(question?.content, 500),
    imageUrl: normalizeText(question?.imageUrl, 2000),
    difficulty: normalizeText(question?.difficulty, 8),
    options: normalizeOptions(question?.options)
  };
}

export function normalizeStudyQuestionRecord(record = {}) {
  const snapshot = normalizeQuestionSnapshot(record?.snapshot ?? record?.question ?? record);

  return {
    questionId: snapshot.id,
    snapshot,
    correctAnswer: normalizeText(record?.correctAnswer, 8),
    explanation: normalizeText(record?.explanation, 2000),
    attempts: normalizeCount(record?.attempts),
    correctCount: normalizeCount(record?.correctCount),
    wrongCount: normalizeCount(record?.wrongCount),
    timeoutCount: normalizeCount(record?.timeoutCount),
    reviewCorrectStreak: normalizeCount(record?.reviewCorrectStreak),
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

export function normalizeStudyRecordBook(book = {}) {
  const rawRecords =
    book?.questionRecords && typeof book.questionRecords === "object" && !Array.isArray(book.questionRecords)
      ? book.questionRecords
      : {};
  const questionRecords = {};

  for (const [rawQuestionId, rawRecord] of Object.entries(rawRecords)) {
    const normalizedRecord = normalizeStudyQuestionRecord(rawRecord);
    const fallbackQuestionId = Number.parseInt(String(rawQuestionId), 10);
    const resolvedQuestionId =
      normalizedRecord.questionId ??
      (Number.isInteger(fallbackQuestionId) && fallbackQuestionId > 0 ? fallbackQuestionId : null);

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
    updatedAt: normalizeTimestamp(book?.updatedAt)
  };
}

export function createStudyRecordBook() {
  return normalizeStudyRecordBook();
}

function addDaysToTimestamp(timestamp, days) {
  const normalizedTimestamp = normalizeTimestamp(timestamp);

  if (!normalizedTimestamp) {
    return "";
  }

  const baseTime = new Date(normalizedTimestamp).getTime();

  if (Number.isNaN(baseTime)) {
    return "";
  }

  return new Date(baseTime + Math.max(0, Number(days || 0)) * DAY_IN_MS).toISOString();
}

function getStartOfDayTime(value) {
  const timestamp = typeof value === "number" ? value : new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  const date = new Date(timestamp);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getUpcomingReviewLabel(timestamp, referenceTime = Date.now(), { short = false } = {}) {
  const targetTime = getStartOfDayTime(timestamp);
  const baseTime = getStartOfDayTime(referenceTime);

  if (!targetTime || !baseTime) {
    return short ? "今天" : "今天回看";
  }

  const diffDays = Math.round((targetTime - baseTime) / DAY_IN_MS);

  if (diffDays <= 0) {
    return short ? "今天" : "今天回看";
  }

  if (diffDays === 1) {
    return short ? "明天" : "明天回看";
  }

  if (diffDays < 7) {
    return short ? `${diffDays}天后` : `${diffDays} 天后回看`;
  }

  const targetDate = new Date(targetTime);
  return short ? `${targetDate.getMonth() + 1}/${targetDate.getDate()}` : `${targetDate.getMonth() + 1} 月 ${targetDate.getDate()} 日回看`;
}

function getReviewStagePriority(stage) {
  if (stage === "due") {
    return 0;
  }

  if (stage === "scheduled") {
    return 1;
  }

  if (stage === "mastered") {
    return 2;
  }

  return 3;
}

export function getQuestionReviewStatus(record) {
  const normalizedRecord = normalizeStudyQuestionRecord(record);

  if (normalizedRecord.wrongCount <= 0 && normalizedRecord.timeoutCount <= 0) {
    return STUDY_REVIEW_STATUS.FRESH;
  }

  if (normalizedRecord.reviewCorrectStreak >= WRONG_REVIEW_MASTERY_STREAK) {
    return STUDY_REVIEW_STATUS.MASTERED;
  }

  if (normalizedRecord.reviewCorrectStreak > 0) {
    return STUDY_REVIEW_STATUS.REVIEWING;
  }

  return STUDY_REVIEW_STATUS.PENDING;
}

export function isReviewPendingStatus(status) {
  return status === STUDY_REVIEW_STATUS.PENDING || status === STUDY_REVIEW_STATUS.REVIEWING;
}

export function getQuestionMasteryPercent(record) {
  const normalizedRecord = normalizeStudyQuestionRecord(record);
  const reviewStatus = getQuestionReviewStatus(normalizedRecord);
  const totalWrongCount = normalizedRecord.wrongCount + normalizedRecord.timeoutCount;

  if (totalWrongCount <= 0) {
    return normalizedRecord.attempts > 0 ? 100 : 0;
  }

  if (reviewStatus === STUDY_REVIEW_STATUS.MASTERED) {
    return 100;
  }

  if (reviewStatus === STUDY_REVIEW_STATUS.REVIEWING) {
    return 68;
  }

  return 34;
}

export function getQuestionReviewSchedule(record, referenceTime = Date.now()) {
  const normalizedRecord = normalizeStudyQuestionRecord(record);
  const reviewStatus = getQuestionReviewStatus(normalizedRecord);
  const nextReviewAt = normalizedRecord.nextReviewAt || normalizedRecord.lastWrongAt || normalizedRecord.lastAnsweredAt;
  const nextReviewTime = nextReviewAt ? new Date(nextReviewAt).getTime() : 0;
  const isDue = isReviewPendingStatus(reviewStatus) && (!nextReviewTime || nextReviewTime <= referenceTime);
  const isScheduled = isReviewPendingStatus(reviewStatus) && Boolean(nextReviewTime) && nextReviewTime > referenceTime;

  if (reviewStatus === STUDY_REVIEW_STATUS.FRESH) {
    return {
      status: reviewStatus,
      stage: "fresh",
      nextReviewAt: "",
      isDue: false,
      isScheduled: false,
      tone: "calm",
      label: "当前稳定",
      shortLabel: "稳定"
    };
  }

  if (reviewStatus === STUDY_REVIEW_STATUS.MASTERED) {
    const upcomingLabel = getUpcomingReviewLabel(nextReviewAt, referenceTime, { short: true });

    return {
      status: reviewStatus,
      stage: "mastered",
      nextReviewAt,
      isDue: false,
      isScheduled: Boolean(nextReviewTime) && nextReviewTime > referenceTime,
      tone: "calm",
      label: nextReviewTime > referenceTime ? `${upcomingLabel}轻回看` : "已回稳",
      shortLabel: nextReviewTime > referenceTime ? `${upcomingLabel}轻回看` : "已回稳"
    };
  }

  if (isDue) {
    return {
      status: reviewStatus,
      stage: "due",
      nextReviewAt,
      isDue: true,
      isScheduled: false,
      tone: reviewStatus === STUDY_REVIEW_STATUS.PENDING ? "alert" : "warm",
      label: reviewStatus === STUDY_REVIEW_STATUS.PENDING ? "现在温习" : "今天回温",
      shortLabel: reviewStatus === STUDY_REVIEW_STATUS.PENDING ? "到期" : "今天"
    };
  }

  return {
    status: reviewStatus,
    stage: "scheduled",
    nextReviewAt,
    isDue: false,
    isScheduled: true,
    tone: "planned",
    label: getUpcomingReviewLabel(nextReviewAt, referenceTime),
    shortLabel: getUpcomingReviewLabel(nextReviewAt, referenceTime, { short: true })
  };
}

export function isQuestionReviewDue(record, referenceTime = Date.now()) {
  return getQuestionReviewSchedule(record, referenceTime).isDue;
}

export function getKnowledgeTagLabel(snapshot = {}) {
  const normalizedSnapshot = normalizeQuestionSnapshot(snapshot);

  if (normalizedSnapshot.knowledgeTag) {
    return normalizedSnapshot.knowledgeTag;
  }

  if (normalizedSnapshot.subject) {
    return `${normalizedSnapshot.subject}综合`;
  }

  return "未标注知识点";
}

function compareTimestampDescending(leftValue = "", rightValue = "") {
  const leftTime = leftValue ? new Date(leftValue).getTime() : 0;
  const rightTime = rightValue ? new Date(rightValue).getTime() : 0;

  return rightTime - leftTime;
}

function compareTimestampAscending(leftValue = "", rightValue = "") {
  const leftTime = leftValue ? new Date(leftValue).getTime() : 0;
  const rightTime = rightValue ? new Date(rightValue).getTime() : 0;

  if (!leftTime) {
    return rightTime ? 1 : 0;
  }

  if (!rightTime) {
    return -1;
  }

  return leftTime - rightTime;
}

function getRecordReferenceTimestamp(record = {}) {
  const candidates = [record.lastAnsweredAt, record.lastWrongAt, record.lastCorrectAt, record.masteredAt].filter(Boolean);

  return candidates.sort((leftValue, rightValue) => compareTimestampDescending(leftValue, rightValue))[0] || "";
}

export function listStudyQuestionRecords(book) {
  const normalizedBook = normalizeStudyRecordBook(book);

  return Object.values(normalizedBook.questionRecords).sort((leftRecord, rightRecord) => {
    const timeDifference = compareTimestampDescending(leftRecord.lastAnsweredAt, rightRecord.lastAnsweredAt);

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return Number(rightRecord.questionId || 0) - Number(leftRecord.questionId || 0);
  });
}

export function findStudyQuestionRecord(book, questionId) {
  const normalizedQuestionId = Number.parseInt(String(questionId ?? ""), 10);

  if (!Number.isInteger(normalizedQuestionId) || normalizedQuestionId <= 0) {
    return null;
  }

  const normalizedBook = normalizeStudyRecordBook(book);
  return normalizedBook.questionRecords[String(normalizedQuestionId)] ?? null;
}

export function mergeStudyQuestionRecords(leftRecord, rightRecord) {
  const normalizedLeftRecord = normalizeStudyQuestionRecord(leftRecord);
  const normalizedRightRecord = normalizeStudyQuestionRecord(rightRecord);
  const leftReferenceTimestamp = getRecordReferenceTimestamp(normalizedLeftRecord);
  const rightReferenceTimestamp = getRecordReferenceTimestamp(normalizedRightRecord);
  const latestRecord =
    compareTimestampDescending(leftReferenceTimestamp, rightReferenceTimestamp) <= 0
      ? normalizedLeftRecord
      : normalizedRightRecord;
  const fallbackRecord = latestRecord === normalizedLeftRecord ? normalizedRightRecord : normalizedLeftRecord;
  const resolvedQuestionId = latestRecord.questionId ?? fallbackRecord.questionId;

  if (!resolvedQuestionId) {
    return normalizeStudyQuestionRecord();
  }

  return normalizeStudyQuestionRecord({
    questionId: resolvedQuestionId,
    snapshot: {
      ...fallbackRecord.snapshot,
      ...latestRecord.snapshot,
      id: resolvedQuestionId,
      options: latestRecord.snapshot.options.length ? latestRecord.snapshot.options : fallbackRecord.snapshot.options
    },
    correctAnswer: latestRecord.correctAnswer || fallbackRecord.correctAnswer,
    explanation: latestRecord.explanation || fallbackRecord.explanation,
    attempts: Math.max(normalizedLeftRecord.attempts, normalizedRightRecord.attempts),
    correctCount: Math.max(normalizedLeftRecord.correctCount, normalizedRightRecord.correctCount),
    wrongCount: Math.max(normalizedLeftRecord.wrongCount, normalizedRightRecord.wrongCount),
    timeoutCount: Math.max(normalizedLeftRecord.timeoutCount, normalizedRightRecord.timeoutCount),
    reviewCorrectStreak: latestRecord.reviewCorrectStreak,
    lastResult: latestRecord.lastResult || fallbackRecord.lastResult,
    lastSelectedOption:
      latestRecord.lastSelectedOption !== "" ? latestRecord.lastSelectedOption : fallbackRecord.lastSelectedOption,
    lastAnsweredAt: latestRecord.lastAnsweredAt || fallbackRecord.lastAnsweredAt,
    firstWrongAt:
      compareTimestampAscending(normalizedLeftRecord.firstWrongAt, normalizedRightRecord.firstWrongAt) <= 0
        ? normalizedLeftRecord.firstWrongAt || normalizedRightRecord.firstWrongAt
        : normalizedRightRecord.firstWrongAt || normalizedLeftRecord.firstWrongAt,
    lastWrongAt:
      compareTimestampDescending(normalizedLeftRecord.lastWrongAt, normalizedRightRecord.lastWrongAt) <= 0
        ? normalizedLeftRecord.lastWrongAt || normalizedRightRecord.lastWrongAt
        : normalizedRightRecord.lastWrongAt || normalizedLeftRecord.lastWrongAt,
    lastCorrectAt:
      compareTimestampDescending(normalizedLeftRecord.lastCorrectAt, normalizedRightRecord.lastCorrectAt) <= 0
        ? normalizedLeftRecord.lastCorrectAt || normalizedRightRecord.lastCorrectAt
        : normalizedRightRecord.lastCorrectAt || normalizedLeftRecord.lastCorrectAt,
    nextReviewAt: latestRecord.nextReviewAt || fallbackRecord.nextReviewAt,
    masteredAt:
      compareTimestampDescending(normalizedLeftRecord.masteredAt, normalizedRightRecord.masteredAt) <= 0
        ? normalizedLeftRecord.masteredAt || normalizedRightRecord.masteredAt
        : normalizedRightRecord.masteredAt || normalizedLeftRecord.masteredAt
  });
}

export function mergeStudyRecordBooks(leftBook, rightBook) {
  const normalizedLeftBook = normalizeStudyRecordBook(leftBook);
  const normalizedRightBook = normalizeStudyRecordBook(rightBook);
  const mergedQuestionRecords = {};
  const questionRecordKeys = new Set([
    ...Object.keys(normalizedLeftBook.questionRecords),
    ...Object.keys(normalizedRightBook.questionRecords)
  ]);

  for (const questionRecordKey of questionRecordKeys) {
    mergedQuestionRecords[questionRecordKey] = mergeStudyQuestionRecords(
      normalizedLeftBook.questionRecords[questionRecordKey],
      normalizedRightBook.questionRecords[questionRecordKey]
    );
  }

  return normalizeStudyRecordBook({
    questionRecords: mergedQuestionRecords,
    updatedAt:
      compareTimestampDescending(normalizedLeftBook.updatedAt, normalizedRightBook.updatedAt) <= 0
        ? normalizedLeftBook.updatedAt || normalizedRightBook.updatedAt
        : normalizedRightBook.updatedAt || normalizedLeftBook.updatedAt
  });
}

export function isStudyRecordBookEqual(leftBook, rightBook) {
  return JSON.stringify(normalizeStudyRecordBook(leftBook)) === JSON.stringify(normalizeStudyRecordBook(rightBook));
}

export function listWrongStudyQuestionRecords(book) {
  return listStudyQuestionRecords(book)
    .filter((record) => record.wrongCount > 0 || record.timeoutCount > 0)
    .sort((leftRecord, rightRecord) => {
      const leftStatus = getQuestionReviewStatus(leftRecord);
      const rightStatus = getQuestionReviewStatus(rightRecord);
      const leftPending = isReviewPendingStatus(leftStatus) ? 1 : 0;
      const rightPending = isReviewPendingStatus(rightStatus) ? 1 : 0;
      const leftSchedule = getQuestionReviewSchedule(leftRecord);
      const rightSchedule = getQuestionReviewSchedule(rightRecord);

      if (leftPending !== rightPending) {
        return rightPending - leftPending;
      }

      const stagePriorityDifference = getReviewStagePriority(leftSchedule.stage) - getReviewStagePriority(rightSchedule.stage);

      if (stagePriorityDifference !== 0) {
        return stagePriorityDifference;
      }

      if (leftSchedule.nextReviewAt || rightSchedule.nextReviewAt) {
        const leftNextReviewTime = leftSchedule.nextReviewAt ? new Date(leftSchedule.nextReviewAt).getTime() : 0;
        const rightNextReviewTime = rightSchedule.nextReviewAt ? new Date(rightSchedule.nextReviewAt).getTime() : 0;

        if (leftNextReviewTime !== rightNextReviewTime) {
          return leftNextReviewTime - rightNextReviewTime;
        }
      }

      return compareTimestampDescending(leftRecord.lastAnsweredAt, rightRecord.lastAnsweredAt);
    });
}

export function getPendingReviewQuestionIds(book, limit = 10) {
  return listWrongStudyQuestionRecords(book)
    .filter((record) => isReviewPendingStatus(getQuestionReviewStatus(record)))
    .slice(0, Math.max(1, Number.parseInt(String(limit ?? "10"), 10) || 10))
    .map((record) => record.questionId)
    .filter(Boolean);
}

export function listQuestionSnapshotsByIds(book, questionIds = []) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return [];
  }

  const normalizedBook = normalizeStudyRecordBook(book);

  return questionIds
    .map((questionId) => normalizedBook.questionRecords[String(Number.parseInt(String(questionId ?? ""), 10))] ?? null)
    .filter(Boolean)
    .map((record) => normalizeQuestionSnapshot(record.snapshot))
    .filter((snapshot) => snapshot.id);
}

export function recordStudyAttempt(book, attempt = {}) {
  const normalizedBook = normalizeStudyRecordBook(book);
  const snapshot = normalizeQuestionSnapshot(attempt?.question);

  if (!snapshot.id) {
    return normalizedBook;
  }

  const questionRecordKey = String(snapshot.id);
  const previousRecord = normalizeStudyQuestionRecord(normalizedBook.questionRecords[questionRecordKey]);
  const answeredAt = normalizeTimestamp(attempt?.answeredAt) || new Date().toISOString();
  const isCorrect = Boolean(attempt?.isCorrect);
  const isTimeout = Boolean(attempt?.isTimeout);
  const hadWrongHistory = previousRecord.wrongCount + previousRecord.timeoutCount > 0;
  const nextReviewCorrectStreak = hadWrongHistory ? (isCorrect ? previousRecord.reviewCorrectStreak + 1 : 0) : 0;
  const nextSnapshot = {
    ...previousRecord.snapshot,
    ...snapshot,
    options: snapshot.options.length ? snapshot.options : previousRecord.snapshot.options
  };
  const nextRecord = normalizeStudyQuestionRecord({
    ...previousRecord,
    questionId: snapshot.id,
    snapshot: nextSnapshot,
    correctAnswer: normalizeText(attempt?.correctAnswer, 8) || previousRecord.correctAnswer,
    explanation: normalizeText(attempt?.explanation, 2000) || previousRecord.explanation,
    attempts: previousRecord.attempts + 1,
    correctCount: previousRecord.correctCount + (isCorrect ? 1 : 0),
    wrongCount: previousRecord.wrongCount + (!isCorrect && !isTimeout ? 1 : 0),
    timeoutCount: previousRecord.timeoutCount + (isTimeout ? 1 : 0),
    reviewCorrectStreak: nextReviewCorrectStreak,
    lastResult: isCorrect ? "correct" : isTimeout ? "timeout" : "wrong",
    lastSelectedOption: normalizeText(attempt?.selectedOption, 16),
    lastAnsweredAt: answeredAt,
    firstWrongAt: !isCorrect ? previousRecord.firstWrongAt || answeredAt : previousRecord.firstWrongAt,
    lastWrongAt: !isCorrect ? answeredAt : previousRecord.lastWrongAt,
    lastCorrectAt: isCorrect ? answeredAt : previousRecord.lastCorrectAt,
    nextReviewAt: !hadWrongHistory && isCorrect
      ? ""
      : !isCorrect
        ? addDaysToTimestamp(answeredAt, REVIEW_INTERVAL_DAYS.PENDING)
        : nextReviewCorrectStreak >= WRONG_REVIEW_MASTERY_STREAK
          ? addDaysToTimestamp(answeredAt, REVIEW_INTERVAL_DAYS.MASTERED)
          : addDaysToTimestamp(answeredAt, REVIEW_INTERVAL_DAYS.REVIEWING),
    masteredAt:
      hadWrongHistory && isCorrect && nextReviewCorrectStreak >= WRONG_REVIEW_MASTERY_STREAK
        ? answeredAt
        : !isCorrect
          ? ""
          : previousRecord.masteredAt
  });

  return normalizeStudyRecordBook({
    ...normalizedBook,
    updatedAt: answeredAt,
    questionRecords: {
      ...normalizedBook.questionRecords,
      [questionRecordKey]: nextRecord
    }
  });
}

export function buildKnowledgeSummaryList(book) {
  const knowledgeSummaryMap = new Map();

  for (const record of listStudyQuestionRecords(book)) {
    const knowledgeLabel = getKnowledgeTagLabel(record.snapshot);
    const reviewStatus = getQuestionReviewStatus(record);
    const reviewSchedule = getQuestionReviewSchedule(record);
    const masteryPercent = getQuestionMasteryPercent(record);
    const currentSummary = knowledgeSummaryMap.get(knowledgeLabel) ?? {
      label: knowledgeLabel,
      questionIds: [],
      questionCount: 0,
      attempts: 0,
      correctCount: 0,
      wrongCount: 0,
      timeoutCount: 0,
      pendingCount: 0,
      dueCount: 0,
      scheduledCount: 0,
      reviewingCount: 0,
      masteredCount: 0,
      masteryPercentTotal: 0,
      subjects: [],
      grades: [],
      latestExplanation: "",
      latestQuestionContent: "",
      latestReviewedAt: "",
      latestQuestionId: null
    };

    currentSummary.questionIds.push(record.questionId);
    currentSummary.questionCount += 1;
    currentSummary.attempts += record.attempts;
    currentSummary.correctCount += record.correctCount;
    currentSummary.wrongCount += record.wrongCount;
    currentSummary.timeoutCount += record.timeoutCount;

    if (isReviewPendingStatus(reviewStatus)) {
      currentSummary.pendingCount += 1;
    }

    if (reviewSchedule.isDue) {
      currentSummary.dueCount += 1;
    }

    if (reviewSchedule.isScheduled) {
      currentSummary.scheduledCount += 1;
    }

    if (reviewStatus === STUDY_REVIEW_STATUS.REVIEWING) {
      currentSummary.reviewingCount += 1;
    }

    if (reviewStatus === STUDY_REVIEW_STATUS.MASTERED) {
      currentSummary.masteredCount += 1;
    }

    currentSummary.masteryPercentTotal += masteryPercent;

    if (record.snapshot.subject && !currentSummary.subjects.includes(record.snapshot.subject)) {
      currentSummary.subjects.push(record.snapshot.subject);
    }

    if (record.snapshot.grade && !currentSummary.grades.includes(record.snapshot.grade)) {
      currentSummary.grades.push(record.snapshot.grade);
    }

    const shouldUpdateLatest =
      !currentSummary.latestReviewedAt ||
      compareTimestampDescending(currentSummary.latestReviewedAt, record.lastAnsweredAt) > 0;

    if (shouldUpdateLatest) {
      currentSummary.latestReviewedAt = record.lastAnsweredAt;
      currentSummary.latestExplanation = record.explanation;
      currentSummary.latestQuestionContent = record.snapshot.content;
      currentSummary.latestQuestionId = record.questionId;
    }

    knowledgeSummaryMap.set(knowledgeLabel, currentSummary);
  }

  return Array.from(knowledgeSummaryMap.values())
    .map((summary) => ({
      ...summary,
      masteryPercent: summary.questionCount > 0 ? Math.round(summary.masteryPercentTotal / summary.questionCount) : 0,
      stageLabel:
        summary.dueCount > 0
          ? "待补强"
          : summary.pendingCount > 0
            ? "回温中"
            : summary.questionCount > 0
              ? "已回稳"
              : "待开始",
      stageTone:
        summary.dueCount > 0
          ? "alert"
          : summary.pendingCount > 0
            ? "warm"
            : "calm",
      accuracyPercent:
        summary.attempts > 0 ? Math.round((summary.correctCount / summary.attempts) * 100) : 0
    }))
    .sort((leftSummary, rightSummary) => {
      if (leftSummary.pendingCount !== rightSummary.pendingCount) {
        return rightSummary.pendingCount - leftSummary.pendingCount;
      }

      if (leftSummary.questionCount !== rightSummary.questionCount) {
        return rightSummary.questionCount - leftSummary.questionCount;
      }

      return compareTimestampDescending(leftSummary.latestReviewedAt, rightSummary.latestReviewedAt);
    });
}
