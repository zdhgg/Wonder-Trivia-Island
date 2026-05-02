const { all, closeDatabaseConnection, createDatabaseConnection, run } = require("../db/database");
const {
  ALLOWED_GRADES,
  ALLOWED_SEMESTERS,
  ALLOWED_SUBJECTS,
  ALLOWED_TYPES,
  MAX_KNOWLEDGE_TAG_LENGTH,
  createDatabaseBackup,
  ensureQuestionsTable,
  getQuestionCount,
  getQuestionPolicyIssues,
  insertQuestions
} = require("../questions/repository");

const ALLOWED_GRADE_SET = new Set(ALLOWED_GRADES);
const ALLOWED_SEMESTER_SET = new Set(ALLOWED_SEMESTERS);
const ALLOWED_SUBJECT_SET = new Set(ALLOWED_SUBJECTS);
const ALLOWED_TYPE_SET = new Set(ALLOWED_TYPES);
const IMPORT_MODES = new Set(["append", "replace"]);
const OPTION_KEYS = ["A", "B", "C", "D"];
const SIMILARITY_WARNING_THRESHOLD = 0.7;
const STRONG_SIMILARITY_RECOMMENDATION_THRESHOLD = 0.9;
const REVIEW_SIMILARITY_RECOMMENDATION_THRESHOLD = 0.82;

const FIELD_ALIASES = Object.freeze({
  subject: ["subject", "学科", "科目"],
  grade: ["grade", "年级"],
  semester: ["semester", "学期", "册别", "上下册", "册"],
  knowledgeTag: ["knowledgetag", "knowledge_tag", "abilitytag", "ability_tag", "能力标签", "知识标签", "知识点", "标签", "闯关标签"],
  type: ["type", "题型", "类型"],
  content: ["content", "question", "题目", "题干"],
  optionA: ["optiona", "选项a", "a", "选项1"],
  optionB: ["optionb", "选项b", "b", "选项2"],
  optionC: ["optionc", "选项c", "c", "选项3"],
  optionD: ["optiond", "选项d", "d", "选项4"],
  answer: ["answer", "答案", "正确答案"],
  explanation: ["explanation", "解析", "答案解析"],
  difficulty: ["difficulty", "难度", "星级"]
});

const SUBJECT_ALIASES = Object.freeze({
  chinese: "语文",
  math: "数学",
  maths: "数学",
  mathematics: "数学",
  english: "英语",
  语文: "语文",
  数学: "数学",
  英语: "英语"
});

const GRADE_ALIASES = Object.freeze({
  1: "一年级",
  2: "二年级",
  3: "三年级",
  4: "四年级",
  5: "五年级",
  6: "六年级",
  一年级: "一年级",
  二年级: "二年级",
  三年级: "三年级",
  四年级: "四年级",
  五年级: "五年级",
  六年级: "六年级",
  一年: "一年级",
  二年: "二年级",
  三年: "三年级",
  四年: "四年级",
  五年: "五年级",
  六年: "六年级"
});

const SEMESTER_ALIASES = Object.freeze({
  上册: "上册",
  上: "上册",
  上学期: "上册",
  下册: "下册",
  下: "下册",
  下学期: "下册",
  通用: "通用",
  全年: "通用",
  全册: "通用",
  通册: "通用"
});

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function buildFieldMap(rawRow = {}) {
  const fieldMap = new Map();

  for (const [key, value] of Object.entries(rawRow)) {
    fieldMap.set(normalizeHeader(key), value);
  }

  return fieldMap;
}

function readField(fieldMap, fieldName) {
  const aliases = FIELD_ALIASES[fieldName] || [];

  for (const alias of aliases) {
    if (fieldMap.has(alias)) {
      return fieldMap.get(alias);
    }
  }

  return "";
}

function normalizeSubject(rawValue) {
  const subject = normalizeText(rawValue);

  if (!subject) {
    return "";
  }

  const canonical = SUBJECT_ALIASES[subject.toLowerCase()];
  return canonical || subject;
}

function normalizeGrade(rawValue) {
  const grade = normalizeText(rawValue);

  if (!grade) {
    return "";
  }

  const compactGrade = grade.replace(/\s+/g, "");
  const canonical = GRADE_ALIASES[compactGrade];
  return canonical || compactGrade;
}

function normalizeSemester(rawValue, grade = "") {
  const semester = normalizeText(rawValue);

  if (!semester) {
    return grade && grade !== "一年级" ? "通用" : "";
  }

  const compactSemester = semester.replace(/\s+/g, "");
  return SEMESTER_ALIASES[compactSemester] || compactSemester;
}

function normalizeDifficulty(rawValue) {
  const text = normalizeText(rawValue);

  if (!text) {
    return NaN;
  }

  return Number.parseInt(text, 10);
}

function normalizeKnowledgeTag(rawValue) {
  return normalizeText(rawValue).replace(/\s+/g, " ").slice(0, MAX_KNOWLEDGE_TAG_LENGTH);
}

function buildDuplicateKey(question) {
  return `${question.subject}::${question.grade}::${question.semester}::${question.content}`;
}

function buildQuestionGroupKey(question) {
  return `${question.subject}::${question.grade}::${question.semester}`;
}

function normalizeComparableContent(value) {
  return normalizeText(value)
    .toLocaleLowerCase("zh-Hans-CN")
    .replace(/[，。、“”‘’？！?!、；：:,.（）()《》〈〉【】[\]\[{}"'`~\s-]/g, "");
}

function createBigramCounts(text) {
  const counts = new Map();

  if (!text) {
    return counts;
  }

  if (text.length < 2) {
    counts.set(text, 1);
    return counts;
  }

  for (let index = 0; index < text.length - 1; index += 1) {
    const gram = text.slice(index, index + 2);
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }

  return counts;
}

function calculateDiceCoefficient(left, right) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftCounts = createBigramCounts(left);
  const rightCounts = createBigramCounts(right);
  let intersection = 0;
  let leftTotal = 0;
  let rightTotal = 0;

  for (const count of leftCounts.values()) {
    leftTotal += count;
  }

  for (const count of rightCounts.values()) {
    rightTotal += count;
  }

  for (const [gram, leftCount] of leftCounts.entries()) {
    const rightCount = rightCounts.get(gram) || 0;
    intersection += Math.min(leftCount, rightCount);
  }

  return leftTotal + rightTotal === 0 ? 0 : (2 * intersection) / (leftTotal + rightTotal);
}

function calculateContentSimilarity(leftContent, rightContent) {
  const left = normalizeComparableContent(leftContent);
  const right = normalizeComparableContent(rightContent);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;

  if (shorter.length >= 8 && longer.includes(shorter)) {
    return 0.96;
  }

  return calculateDiceCoefficient(left, right);
}

function truncatePreviewText(value, maxLength = 26) {
  const normalized = normalizeText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function buildComparisonRecommendation(type, similarity = null) {
  if (type === "existing_duplicate") {
    return {
      label: "建议删除",
      tone: "remove",
      reason: "题库里已经有同题，通常不需要重复导入当前题。"
    };
  }

  if (type === "file_duplicate") {
    return {
      label: "建议合并",
      tone: "merge",
      reason: "当前文件里是重复行，通常只保留一行即可。"
    };
  }

  if (type === "existing_similar") {
    if (similarity >= STRONG_SIMILARITY_RECOMMENDATION_THRESHOLD) {
      return {
        label: "建议删除",
        tone: "remove",
        reason: "这道题和题库里的题几乎是同一道题，通常无需重复导入。"
      };
    }

    if (similarity >= REVIEW_SIMILARITY_RECOMMENDATION_THRESHOLD) {
      return {
        label: "建议合并",
        tone: "merge",
        reason: "这更像是换了说法的同一道题，建议保留表述更清晰的一题。"
      };
    }

    return {
      label: "建议保留",
      tone: "keep",
      reason: "这更像同主题的不同问法，可按训练目标保留为变体。"
    };
  }

  if (type === "file_similar") {
    if (similarity >= STRONG_SIMILARITY_RECOMMENDATION_THRESHOLD) {
      return {
        label: "建议合并",
        tone: "merge",
        reason: "当前文件里的两题几乎相同，通常保留一题即可。"
      };
    }

    if (similarity >= REVIEW_SIMILARITY_RECOMMENDATION_THRESHOLD) {
      return {
        label: "建议合并",
        tone: "merge",
        reason: "两题差异较小，可合并成更清晰的一题。"
      };
    }

    return {
      label: "建议保留",
      tone: "keep",
      reason: "两题还有明显差异，可按练习目标一起保留。"
    };
  }

  return null;
}

function buildComparisonPayload({
  type,
  title,
  targetLabel,
  content,
  similarity = null
}) {
  return {
    type,
    title,
    targetLabel,
    contentPreview: truncatePreviewText(content, 48),
    similarityPercent:
      typeof similarity === "number" && Number.isFinite(similarity)
        ? Math.max(0, Math.min(100, Math.round(similarity * 100)))
        : null,
    recommendation: buildComparisonRecommendation(type, similarity)
  };
}

function validateRawRow(rawRow, rowNumber) {
  const issues = [];
  const fieldMap = buildFieldMap(rawRow);
  const subject = normalizeSubject(readField(fieldMap, "subject"));
  const grade = normalizeGrade(readField(fieldMap, "grade"));
  const semester = normalizeSemester(readField(fieldMap, "semester"), grade);
  const knowledgeTag = normalizeKnowledgeTag(readField(fieldMap, "knowledgeTag"));
  const type = normalizeText(readField(fieldMap, "type"));
  const content = normalizeText(readField(fieldMap, "content"));
  const answer = normalizeText(readField(fieldMap, "answer")).toUpperCase();
  const explanation = normalizeText(readField(fieldMap, "explanation"));
  const difficulty = normalizeDifficulty(readField(fieldMap, "difficulty"));
  const optionTexts = OPTION_KEYS.map((optionKey) =>
    normalizeText(readField(fieldMap, `option${optionKey}`))
  );

  if (!subject) {
    issues.push({
      level: "error",
      field: "subject",
      message: "缺少学科。"
    });
  } else if (!ALLOWED_SUBJECT_SET.has(subject)) {
    issues.push({
      level: "error",
      field: "subject",
      message: `学科仅支持：${ALLOWED_SUBJECTS.join("、")} 。`
    });
  }

  if (!grade) {
    issues.push({
      level: "error",
      field: "grade",
      message: "缺少年级。"
    });
  } else if (!ALLOWED_GRADE_SET.has(grade)) {
    issues.push({
      level: "error",
      field: "grade",
      message: `年级仅支持：${ALLOWED_GRADES.join("、")} 。`
    });
  }

  if (!semester) {
    issues.push({
      level: "error",
      field: "semester",
      message: grade === "一年级" ? "一年级题目必须填写学期（上册或下册）。" : "缺少学期。"
    });
  } else if (!ALLOWED_SEMESTER_SET.has(semester)) {
    issues.push({
      level: "error",
      field: "semester",
      message: `学期仅支持：${ALLOWED_SEMESTERS.join("、")} 。`
    });
  }

  if (subject && grade && semester) {
    for (const message of getQuestionPolicyIssues({ subject, grade, semester })) {
      issues.push({
        level: "error",
        field: "subject",
        message
      });
    }
  }

  if (!type) {
    issues.push({
      level: "error",
      field: "type",
      message: "缺少题型。"
    });
  } else if (!ALLOWED_TYPE_SET.has(type)) {
    issues.push({
      level: "error",
      field: "type",
      message: `题型仅支持预设枚举，共 ${ALLOWED_TYPES.length} 种。`
    });
  }

  if (!content) {
    issues.push({
      level: "error",
      field: "content",
      message: "缺少题目内容。"
    });
  }

  OPTION_KEYS.forEach((optionKey, index) => {
    if (!optionTexts[index]) {
      issues.push({
        level: "error",
        field: `option${optionKey}`,
        message: `选项 ${optionKey} 不能为空。`
      });
    }
  });

  if (!answer) {
    issues.push({
      level: "error",
      field: "answer",
      message: "缺少正确答案。"
    });
  } else if (!OPTION_KEYS.includes(answer)) {
    issues.push({
      level: "error",
      field: "answer",
      message: "答案必须是 A、B、C、D 之一。"
    });
  }

  if (!explanation) {
    issues.push({
      level: "error",
      field: "explanation",
      message: "缺少答案解析。"
    });
  }

  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) {
    issues.push({
      level: "error",
      field: "difficulty",
      message: "难度必须是 1 到 3 的整数。"
    });
  }

  const question =
    issues.length > 0
      ? null
        : {
          subject,
          grade,
          semester,
          knowledgeTag,
          type,
          content,
          options: OPTION_KEYS.map((optionKey, index) => ({
            key: optionKey,
            text: optionTexts[index]
          })),
          answer,
          explanation,
          difficulty
        };

  return {
    rowNumber,
    preview: {
      rowNumber,
      subject,
      grade,
      semester,
      knowledgeTag,
      type,
      content,
      answer,
      difficulty: Number.isNaN(difficulty) ? "" : difficulty
    },
    issues,
    question
  };
}

function validatePreparedQuestion(question, rowDescriptor = "题目") {
  const validationLabel =
    typeof rowDescriptor === "number" ? `第 ${rowDescriptor} 行` : String(rowDescriptor || "题目");
  const normalizedQuestion = {
    subject: normalizeSubject(question?.subject),
    grade: normalizeGrade(question?.grade),
    semester: normalizeSemester(question?.semester, normalizeGrade(question?.grade)),
    knowledgeTag: normalizeKnowledgeTag(question?.knowledgeTag),
    type: normalizeText(question?.type),
    content: normalizeText(question?.content),
    answer: normalizeText(question?.answer).toUpperCase(),
    explanation: normalizeText(question?.explanation),
    difficulty: Number.parseInt(question?.difficulty, 10),
    options: Array.isArray(question?.options)
      ? question.options.map((option) => ({
          key: normalizeText(option?.key).toUpperCase(),
          text: normalizeText(option?.text)
        }))
      : []
  };

  const issues = [];

  if (!ALLOWED_SUBJECT_SET.has(normalizedQuestion.subject)) {
    issues.push(`${validationLabel}的学科无效。`);
  }

  if (!ALLOWED_GRADE_SET.has(normalizedQuestion.grade)) {
    issues.push(`${validationLabel}的年级无效。`);
  }

  if (!ALLOWED_SEMESTER_SET.has(normalizedQuestion.semester)) {
    issues.push(`${validationLabel}的学期无效。`);
  }

  issues.push(...getQuestionPolicyIssues(normalizedQuestion).map((message) => `${validationLabel}：${message}`));

  if (!normalizedQuestion.type) {
    issues.push(`${validationLabel}缺少题型。`);
  } else if (!ALLOWED_TYPE_SET.has(normalizedQuestion.type)) {
    issues.push(`${validationLabel}的题型不在允许范围内。`);
  }

  if (!normalizedQuestion.content) {
    issues.push(`${validationLabel}缺少题目内容。`);
  }

  if (!OPTION_KEYS.includes(normalizedQuestion.answer)) {
    issues.push(`${validationLabel}的答案必须是 A、B、C、D 之一。`);
  }

  if (!normalizedQuestion.explanation) {
    issues.push(`${validationLabel}缺少答案解析。`);
  }

  if (
    !Number.isInteger(normalizedQuestion.difficulty) ||
    normalizedQuestion.difficulty < 1 ||
    normalizedQuestion.difficulty > 3
  ) {
    issues.push(`${validationLabel}的难度必须是 1 到 3 的整数。`);
  }

  if (normalizedQuestion.options.length !== OPTION_KEYS.length) {
    issues.push(`${validationLabel}的选项数量不正确。`);
  } else {
    normalizedQuestion.options.forEach((option, index) => {
      const expectedKey = OPTION_KEYS[index];

      if (option.key !== expectedKey || !option.text) {
        issues.push(`${validationLabel}的选项 ${expectedKey} 不完整。`);
      }
    });
  }

  return {
    issues,
    question: normalizedQuestion
  };
}

function findExistingQuestionKeys(questions, db = null) {
  if (questions.length === 0) {
    return new Set();
  }

  const activeDb = db || createDatabaseConnection();

  try {
    ensureQuestionsTable(activeDb);

    const uniqueContents = [...new Set(questions.map((question) => question.content))];
    const existingKeys = new Set();

    for (let index = 0; index < uniqueContents.length; index += 200) {
      const batch = uniqueContents.slice(index, index + 200);
      const placeholders = batch.map(() => "?").join(", ");
      const rows = all(
        activeDb,
        `SELECT subject, grade, semester, content FROM questions WHERE content IN (${placeholders})`,
        batch
      );

      for (const row of rows) {
        existingKeys.add(`${row.subject}::${row.grade}::${row.semester}::${row.content}`);
      }
    }

    return existingKeys;
  } finally {
    if (!db) {
      closeDatabaseConnection(activeDb);
    }
  }
}

function findExistingQuestionRecordMap(questions, db = null) {
  if (questions.length === 0) {
    return new Map();
  }

  const activeDb = db || createDatabaseConnection();

  try {
    ensureQuestionsTable(activeDb);

    const uniqueContents = [...new Set(questions.map((question) => question.content))];
    const existingRecords = new Map();

    for (let index = 0; index < uniqueContents.length; index += 200) {
      const batch = uniqueContents.slice(index, index + 200);
      const placeholders = batch.map(() => "?").join(", ");
      const rows = all(
        activeDb,
        `SELECT id, subject, grade, semester, content FROM questions WHERE content IN (${placeholders})`,
        batch
      );

      for (const row of rows) {
        const key = `${row.subject}::${row.grade}::${row.semester}::${row.content}`;

        if (!existingRecords.has(key)) {
          existingRecords.set(key, row);
        }
      }
    }

    return existingRecords;
  } finally {
    if (!db) {
      closeDatabaseConnection(activeDb);
    }
  }
}

function findExistingQuestionGroups(questions, db = null) {
  if (questions.length === 0) {
    return new Map();
  }

  const activeDb = db || createDatabaseConnection();

  try {
    ensureQuestionsTable(activeDb);

    const groupMap = new Map();
    const uniqueGroups = new Map();

    for (const question of questions) {
      const groupKey = buildQuestionGroupKey(question);

      if (!uniqueGroups.has(groupKey)) {
        uniqueGroups.set(groupKey, {
          subject: question.subject,
          grade: question.grade,
          semester: question.semester
        });
      }
    }

    for (const [groupKey, group] of uniqueGroups.entries()) {
      const rows = all(
        activeDb,
        `
          SELECT id, subject, grade, semester, content
          FROM questions
          WHERE subject = ? AND grade = ? AND semester = ?
        `,
        [group.subject, group.grade, group.semester]
      );

      groupMap.set(groupKey, rows);
    }

    return groupMap;
  } finally {
    if (!db) {
      closeDatabaseConnection(activeDb);
    }
  }
}

function findPotentialSimilarExistingQuestions(validRows, existingQuestionGroups) {
  const similarMap = new Map();

  for (const row of validRows) {
    const groupRows = existingQuestionGroups.get(buildQuestionGroupKey(row.question)) || [];
    let bestMatch = null;

    for (const existingRow of groupRows) {
      const similarity = calculateContentSimilarity(row.question.content, existingRow.content);

      if (similarity < SIMILARITY_WARNING_THRESHOLD) {
        continue;
      }

      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          id: existingRow.id,
          content: existingRow.content,
          similarity
        };
      }
    }

    if (bestMatch) {
      similarMap.set(row.rowNumber, bestMatch);
    }
  }

  return similarMap;
}

function findPotentialSimilarRowsInFile(validRows) {
  const groupedRows = new Map();
  const similarMap = new Map();

  for (const row of validRows) {
    const groupKey = buildQuestionGroupKey(row.question);

    if (!groupedRows.has(groupKey)) {
      groupedRows.set(groupKey, []);
    }

    groupedRows.get(groupKey).push(row);
  }

  for (const rows of groupedRows.values()) {
    for (let leftIndex = 0; leftIndex < rows.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < rows.length; rightIndex += 1) {
        const leftRow = rows[leftIndex];
        const rightRow = rows[rightIndex];
        const similarity = calculateContentSimilarity(leftRow.question.content, rightRow.question.content);

        if (similarity < SIMILARITY_WARNING_THRESHOLD) {
          continue;
        }

        const leftExistingMatch = similarMap.get(leftRow.rowNumber);
        const rightExistingMatch = similarMap.get(rightRow.rowNumber);

        if (!leftExistingMatch || similarity > leftExistingMatch.similarity) {
          similarMap.set(leftRow.rowNumber, {
            relatedRowNumber: rightRow.rowNumber,
            content: rightRow.question.content,
            similarity
          });
        }

        if (!rightExistingMatch || similarity > rightExistingMatch.similarity) {
          similarMap.set(rightRow.rowNumber, {
            relatedRowNumber: leftRow.rowNumber,
            content: leftRow.question.content,
            similarity
          });
        }
      }
    }
  }

  return similarMap;
}

function summarizePreview(rows) {
  return rows.reduce(
    (summary, row) => {
      if (row.status === "error") {
        summary.errorRows += 1;
      }

      if (row.status === "warning") {
        summary.warningRows += 1;
      }

      if (row.status === "valid" || row.status === "warning") {
        summary.validRows += 1;
      }

      return summary;
    },
    {
      totalRows: rows.length,
      validRows: 0,
      errorRows: 0,
      warningRows: 0
    }
  );
}

function previewQuestionImport(rawRows, mode = "append", db = null) {
  if (!IMPORT_MODES.has(mode)) {
    throw new Error("导入模式无效。");
  }

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("请先上传至少一行题目数据。");
  }

  if (rawRows.length > 1000) {
    throw new Error("单次最多预检 1000 行题目，请拆分后再导入。");
  }

  const validatedRows = rawRows.map((rawRow, index) => validateRawRow(rawRow, index + 2));
  const validCandidates = validatedRows.filter((row) => row.question);
  const duplicateCounts = new Map();
  const duplicateRowNumbers = new Map();

  for (const row of validCandidates) {
    const key = buildDuplicateKey(row.question);
    duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);

    if (!duplicateRowNumbers.has(key)) {
      duplicateRowNumbers.set(key, []);
    }

    duplicateRowNumbers.get(key).push(row.rowNumber);
  }

  const activeDb = db || createDatabaseConnection();
  ensureQuestionsTable(activeDb);
  const existingRecordMap = findExistingQuestionRecordMap(
    validCandidates.map((row) => row.question),
    activeDb
  );
  const existingKeys = findExistingQuestionKeys(
    validCandidates.map((row) => row.question),
    activeDb
  );
  const existingQuestionGroups = findExistingQuestionGroups(
    validCandidates.map((row) => row.question),
    activeDb
  );
  const similarExistingQuestionMap = findPotentialSimilarExistingQuestions(validCandidates, existingQuestionGroups);
  const similarFileRowMap = findPotentialSimilarRowsInFile(validCandidates);
  const previewRows = [];
  const validQuestions = [];

  for (const row of validatedRows) {
    const issues = [...row.issues];

    if (row.question) {
      const duplicateKey = buildDuplicateKey(row.question);

      if ((duplicateCounts.get(duplicateKey) || 0) > 1) {
        const relatedRowNumber = (duplicateRowNumbers.get(duplicateKey) || []).find(
          (candidateRowNumber) => candidateRowNumber !== row.rowNumber
        );

        issues.push({
          level: "warning",
          field: "content",
          message: "当前文件中存在同学科、同年级、同学期、同题目的重复行。",
          comparison: relatedRowNumber
            ? buildComparisonPayload({
                type: "file_duplicate",
                title: "文件内重复题",
                targetLabel: `第 ${relatedRowNumber} 行`,
                content: row.question.content,
                similarity: 1
              })
            : null
        });
      }

      if (existingKeys.has(duplicateKey)) {
        const existingRecord = existingRecordMap.get(duplicateKey);

        issues.push({
          level: "warning",
          field: "content",
          message: "题库中已存在相同学科、年级、学期和题目内容的记录。",
          comparison: existingRecord
            ? buildComparisonPayload({
                type: "existing_duplicate",
                title: "题库已存在同题",
                targetLabel: `题号 #${existingRecord.id}`,
                content: existingRecord.content,
                similarity: 1
              })
            : null
        });
      }

      const similarExistingQuestion = similarExistingQuestionMap.get(row.rowNumber);

      if (similarExistingQuestion && !existingKeys.has(duplicateKey)) {
        issues.push({
          level: "warning",
          field: "content",
          message: `题库中存在相似题：#${similarExistingQuestion.id}「${truncatePreviewText(similarExistingQuestion.content)}」。请确认是否只是换了说法。`,
          comparison: buildComparisonPayload({
            type: "existing_similar",
            title: "题库相似题",
            targetLabel: `题号 #${similarExistingQuestion.id}`,
            content: similarExistingQuestion.content,
            similarity: similarExistingQuestion.similarity
          })
        });
      }

      const similarFileRow = similarFileRowMap.get(row.rowNumber);

      if (similarFileRow && (duplicateCounts.get(duplicateKey) || 0) <= 1) {
        issues.push({
          level: "warning",
          field: "content",
          message: `当前文件中第 ${similarFileRow.relatedRowNumber} 行与本题高度相似：「${truncatePreviewText(similarFileRow.content)}」。请确认是否重复出题。`,
          comparison: buildComparisonPayload({
            type: "file_similar",
            title: "文件内相似题",
            targetLabel: `第 ${similarFileRow.relatedRowNumber} 行`,
            content: similarFileRow.content,
            similarity: similarFileRow.similarity
          })
        });
      }

      validQuestions.push({
        ...row.question,
        sourceRowNumber: row.rowNumber
      });
    }

    const hasErrors = issues.some((issue) => issue.level === "error");
    const hasWarnings = !hasErrors && issues.some((issue) => issue.level === "warning");

    previewRows.push({
      ...row.preview,
      status: hasErrors ? "error" : hasWarnings ? "warning" : "valid",
      issues
    });
  }

  try {
    const currentQuestionCount = getQuestionCount(activeDb);
    const summary = summarizePreview(previewRows);

    return {
      summary: {
        ...summary,
        currentQuestionCount
      },
      mode,
      rows: previewRows,
      validQuestions
    };
  } finally {
    if (!db) {
      closeDatabaseConnection(activeDb);
    }
  }
}

function commitQuestionImport(questions, mode = "append", db = null) {
  if (!IMPORT_MODES.has(mode)) {
    throw new Error("导入模式无效。");
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("没有可导入的题目，请先完成预检。");
  }

  if (questions.length > 1000) {
    throw new Error("单次最多导入 1000 行题目，请拆分后再导入。");
  }

  const normalizedQuestions = [];
  const validationErrors = [];

  questions.forEach((question, index) => {
    const result = validatePreparedQuestion(question, Number(question?.sourceRowNumber) || index + 2);

    if (result.issues.length > 0) {
      validationErrors.push(...result.issues);
      return;
    }

    normalizedQuestions.push(result.question);
  });

  if (validationErrors.length > 0) {
    const error = new Error("提交的导入数据未通过校验。");
    error.details = validationErrors;
    throw error;
  }

  const backupPath = mode === "replace" ? createDatabaseBackup() : null;
  const activeDb = db || createDatabaseConnection();

  try {
    ensureQuestionsTable(activeDb);
    const previousQuestionCount = getQuestionCount(activeDb);

    run(activeDb, "BEGIN TRANSACTION");

    if (mode === "replace") {
      run(activeDb, "DELETE FROM questions");
    }

    insertQuestions(activeDb, normalizedQuestions);

    const totalQuestionCount = getQuestionCount(activeDb);

    run(activeDb, "COMMIT");

    return {
      mode,
      importedCount: normalizedQuestions.length,
      previousQuestionCount,
      totalQuestionCount,
      backupPath
    };
  } catch (error) {
    try {
      run(activeDb, "ROLLBACK");
    } catch (rollbackError) {
      // Keep the original import error visible.
    }

    throw error;
  } finally {
    if (!db) {
      closeDatabaseConnection(activeDb);
    }
  }
}

module.exports = {
  commitQuestionImport,
  previewQuestionImport,
  validatePreparedQuestion
};
