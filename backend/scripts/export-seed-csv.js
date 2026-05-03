const fs = require("fs");
const path = require("path");
const { questions } = require("./questionSeedData");

const header = ["学科", "年级", "学期", "知识标签", "题型", "题目", "题目图片", "选项A", "选项B", "选项C", "选项D", "答案", "解析", "难度"];
const outputPath = path.join(__dirname, "..", "data", "question-seed.csv");

function serializeCsvField(value) {
  const normalized = String(value ?? "");

  if (!/[",\r\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

const rows = questions.map((question) => {
  const optionMap = Object.fromEntries(question.options.map((option) => [option.key, option.text]));

  return [
    question.subject,
    question.grade,
    question.semester,
    question.knowledgeTag || "",
    question.type,
    question.content,
    question.imageUrl || "",
    optionMap.A || "",
    optionMap.B || "",
    optionMap.C || "",
    optionMap.D || "",
    question.answer,
    question.explanation,
    question.difficulty
  ];
});

const csvContent = `\uFEFF${[header, ...rows].map((row) => row.map(serializeCsvField).join(",")).join("\r\n")}`;

fs.writeFileSync(outputPath, csvContent, "utf8");

console.log(`Exported ${questions.length} questions to ${outputPath}`);
