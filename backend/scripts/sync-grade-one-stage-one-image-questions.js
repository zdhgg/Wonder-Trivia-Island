const { createDatabaseConnection, dbPath, run, all } = require("../src/db/database");
const { ensureQuestionsTable, insertQuestions, createDatabaseBackup } = require("../src/questions/repository");
const { questions } = require("./questionSeedData");

const TARGET_GRADE = "一年级";
const TARGET_SEMESTER = "上册";
const TARGET_KNOWLEDGE_TAG = "看图起步";

const EXTRA_STAGE_ONE_IMAGE_QUESTIONS = [
  {
    subject: "数学",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "数一数",
    content: "看图数一数，天上飘着几个气球？",
    imageUrl: "/images/challenge/g1-upper-stage1/balloons-4.svg",
    options: [
      { key: "A", text: "3个" },
      { key: "B", text: "4个" },
      { key: "C", text: "5个" },
      { key: "D", text: "6个" }
    ],
    answer: "B",
    explanation: "图里一共有4个气球。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "大小比较",
    content: "看图比一比，数字卡片里最大的数是哪一个？",
    imageUrl: "/images/challenge/g1-upper-stage1/number-cards-3-9-6.svg",
    options: [
      { key: "A", text: "9" },
      { key: "B", text: "3" },
      { key: "C", text: "6" },
      { key: "D", text: "一样大" }
    ],
    answer: "A",
    explanation: "9比3和6都大。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "位置",
    content: "看图判断，小鸟在树枝的哪边？",
    imageUrl: "/images/challenge/g1-upper-stage1/bird-branch-up.svg",
    options: [
      { key: "A", text: "下边" },
      { key: "B", text: "左边" },
      { key: "C", text: "上边" },
      { key: "D", text: "后边" }
    ],
    answer: "C",
    explanation: "小鸟停在树枝上面，所以在上边。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "数一数",
    content: "看图数一数，鱼缸里一共有几条小鱼？",
    imageUrl: "/images/challenge/g1-upper-stage1/fish-5.svg",
    options: [
      { key: "A", text: "3条" },
      { key: "B", text: "4条" },
      { key: "C", text: "6条" },
      { key: "D", text: "5条" }
    ],
    answer: "D",
    explanation: "图里的小鱼一共有5条。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "大小比较",
    content: "看图比一比，数字卡片从小到大排，第一个数是哪一个？",
    imageUrl: "/images/challenge/g1-upper-stage1/number-cards-8-1-4.svg",
    options: [
      { key: "A", text: "4" },
      { key: "B", text: "8" },
      { key: "C", text: "一样大" },
      { key: "D", text: "1" }
    ],
    answer: "D",
    explanation: "从小到大排是1、4、8，第一个是1。",
    difficulty: 1
  },
  {
    subject: "数学",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "位置",
    content: "看图判断，太阳在房子的哪边？",
    imageUrl: "/images/challenge/g1-upper-stage1/sun-house-up.svg",
    options: [
      { key: "A", text: "下边" },
      { key: "B", text: "左边" },
      { key: "C", text: "后边" },
      { key: "D", text: "上边" }
    ],
    answer: "D",
    explanation: "太阳在房子的上面。",
    difficulty: 1
  },
  {
    subject: "语文",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "识字应用",
    content: "看图认字，表示这张嘴巴的汉字是哪一个？",
    imageUrl: "/images/challenge/g1-upper-stage1/mouth.svg",
    options: [
      { key: "A", text: "耳" },
      { key: "B", text: "手" },
      { key: "C", text: "足" },
      { key: "D", text: "口" }
    ],
    answer: "D",
    explanation: "嘴巴常常对应汉字“口”。",
    difficulty: 1
  },
  {
    subject: "语文",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "课文理解",
    content: "看图判断，图里飘扬的是什么颜色的旗？",
    imageUrl: "/images/challenge/g1-upper-stage1/red-flag-close.svg",
    options: [
      { key: "A", text: "蓝色" },
      { key: "B", text: "绿色" },
      { key: "C", text: "黄色" },
      { key: "D", text: "红色" }
    ],
    answer: "D",
    explanation: "图里的国旗是红色的。",
    difficulty: 1
  },
  {
    subject: "语文",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "词语搭配",
    content: "看图填词，下面哪个词最适合填“绿绿的（ ）”？",
    imageUrl: "/images/challenge/g1-upper-stage1/green-grass.svg",
    options: [
      { key: "A", text: "月亮" },
      { key: "B", text: "苹果" },
      { key: "C", text: "白云" },
      { key: "D", text: "草地" }
    ],
    answer: "D",
    explanation: "图里是一片绿绿的草地。",
    difficulty: 1
  },
  {
    subject: "语文",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "识字应用",
    content: "看图认字，表示这只手的汉字是哪一个？",
    imageUrl: "/images/challenge/g1-upper-stage1/hand.svg",
    options: [
      { key: "A", text: "口" },
      { key: "B", text: "耳" },
      { key: "C", text: "目" },
      { key: "D", text: "手" }
    ],
    answer: "D",
    explanation: "图里画的是一只手。",
    difficulty: 1
  },
  {
    subject: "语文",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "课文理解",
    content: "看图判断，夜空里圆圆亮亮的是什么？",
    imageUrl: "/images/challenge/g1-upper-stage1/moon.svg",
    options: [
      { key: "A", text: "太阳" },
      { key: "B", text: "苹果" },
      { key: "C", text: "红旗" },
      { key: "D", text: "月亮" }
    ],
    answer: "D",
    explanation: "图里夜空中挂着月亮。",
    difficulty: 1
  },
  {
    subject: "语文",
    grade: TARGET_GRADE,
    semester: TARGET_SEMESTER,
    knowledgeTag: TARGET_KNOWLEDGE_TAG,
    type: "词语搭配",
    content: "看图填词，下面哪个词最适合填“白白的（ ）”？",
    imageUrl: "/images/challenge/g1-upper-stage1/white-cloud.svg",
    options: [
      { key: "A", text: "草地" },
      { key: "B", text: "苹果" },
      { key: "C", text: "耳朵" },
      { key: "D", text: "云朵" }
    ],
    answer: "D",
    explanation: "图里是白白的云朵。",
    difficulty: 1
  }
];

function getStageOneImageQuestions() {
  const baseQuestions = questions.filter(
    (question) =>
      question.grade === TARGET_GRADE &&
      question.semester === TARGET_SEMESTER &&
      question.knowledgeTag === TARGET_KNOWLEDGE_TAG &&
      String(question.imageUrl || "").trim()
  );

  return [...baseQuestions, ...EXTRA_STAGE_ONE_IMAGE_QUESTIONS];
}

function main() {
  const targetQuestions = getStageOneImageQuestions();

  if (targetQuestions.length === 0) {
    throw new Error("未找到一年级上册第一关的带图题种子数据。");
  }

  const backupPath = createDatabaseBackup();
  const db = createDatabaseConnection();

  try {
    ensureQuestionsTable(db);
    run(db, "BEGIN TRANSACTION");

    const beforeRows = all(
      db,
      `
        SELECT id
        FROM questions
        WHERE grade = ? AND semester = ? AND knowledgeTag = ?
      `,
      [TARGET_GRADE, TARGET_SEMESTER, TARGET_KNOWLEDGE_TAG]
    );

    run(
      db,
      `
        DELETE FROM questions
        WHERE grade = ? AND semester = ? AND knowledgeTag = ?
      `,
      [TARGET_GRADE, TARGET_SEMESTER, TARGET_KNOWLEDGE_TAG]
    );

    insertQuestions(db, targetQuestions);
    run(db, "COMMIT");

    const afterRows = all(
      db,
      `
        SELECT id, subject, type, content, imageUrl
        FROM questions
        WHERE grade = ? AND semester = ? AND knowledgeTag = ?
        ORDER BY id ASC
      `,
      [TARGET_GRADE, TARGET_SEMESTER, TARGET_KNOWLEDGE_TAG]
    );

    console.log(`Database: ${dbPath}`);
    if (backupPath) {
      console.log(`Backup: ${backupPath}`);
    }
    console.log(`Replaced ${beforeRows.length} old questions with ${afterRows.length} image questions.`);
    for (const row of afterRows) {
      console.log(`- [${row.subject}] ${row.type} | ${row.content} | ${row.imageUrl}`);
    }
  } catch (error) {
    try {
      run(db, "ROLLBACK");
    } catch {
      // Keep original error visible.
    }
    throw error;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  TARGET_GRADE,
  TARGET_SEMESTER,
  TARGET_KNOWLEDGE_TAG,
  EXTRA_STAGE_ONE_IMAGE_QUESTIONS,
  getStageOneImageQuestions
};
