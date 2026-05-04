const fs = require("fs");
const path = require("path");
const { questions } = require("./questionSeedData");
const { EXTRA_STAGE_ONE_IMAGE_QUESTIONS = [] } = require("./sync-grade-one-stage-one-image-questions");

const repoRoot = path.resolve(__dirname, "..", "..");
const publicRoot = path.join(repoRoot, "frontend", "public");
const challengeImageRoot = path.join(publicRoot, "images", "challenge");

const allowedVisibleAnswerImages = new Set([
  "/images/challenge/g1-upper-stage1/number-cards-2-7-5.svg",
  "/images/challenge/g1-upper-stage1/number-cards-3-9-6.svg",
  "/images/challenge/g1-upper-stage1/number-cards-8-1-4.svg",
  "/images/challenge/g1-lower-stage3/sort-bai-wang-liu.svg",
  "/images/challenge/g1-lower-stage4/compare-45-54.svg",
  "/images/challenge/g1-lower-stage4/money-7yuan-vs-65jiao.svg",
  "/images/challenge/g1-lower-stage4/money-45fen-vs-5jiao.svg",
  "/images/challenge/g1-lower-stage5/sort-chen-bai-wang-xu.svg",
  "/images/challenge/g1-lower-stage6/sort-li-bai-chen-wu.svg",
  "/images/challenge/g1-lower-stage7/sort-bai-chen-hu-xu.svg"
]);
const visibleAnswerKnowledgeTags = new Set(["图表看懂", "图文转换"]);

const comparisonQuestionPattern = /相比|哪个.*(更多|更大|更少|更长|更短|更高|更低|更重|更轻)|哪种.*更多|哪一类.*更多/;
const relationSymbols = new Set([">", "<", "=", "＞", "＜", "≥", "≤"]);

function decodeEntities(text) {
  return String(text || "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function normalizeText(text) {
  return decodeEntities(text)
    .replace(/\s+/g, "")
    .replace(/[“”"'‘’、，。？！：；（）()]/g, "")
    .trim();
}

function extractTextNodes(svgSource) {
  return [...svgSource.matchAll(/>([^<>]+)</g)]
    .map((match) => decodeEntities(match[1]).trim())
    .filter(Boolean);
}

function walkSvgFiles(dirPath) {
  const files = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSvgFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".svg")) {
      files.push(fullPath);
    }
  }
  return files;
}

const runtimeQuestions = [...questions, ...EXTRA_STAGE_ONE_IMAGE_QUESTIONS];
const svgQuestions = runtimeQuestions.filter((question) => question.imageUrl && question.imageUrl.endsWith(".svg"));
const issues = [];
const allowedVisibleAnswers = [];
let policyAllowedVisibleAnswerCount = 0;
const referencedImageUrls = new Set();

function allowsVisibleAnswerByPolicy(question) {
  return visibleAnswerKnowledgeTags.has(String(question.knowledgeTag || "").trim());
}

for (const question of svgQuestions) {
  const correctOption = question.options.find((option) => option.key === question.answer);
  if (!correctOption) {
    issues.push({
      severity: "critical",
      imageUrl: question.imageUrl,
      content: question.content,
      detail: "Missing correct option text."
    });
    continue;
  }

  referencedImageUrls.add(question.imageUrl);

  const svgPath = path.join(publicRoot, question.imageUrl.replace(/^\//, ""));
  if (!fs.existsSync(svgPath)) {
    issues.push({
      severity: "critical",
      imageUrl: question.imageUrl,
      content: question.content,
      detail: "Missing SVG file."
    });
    continue;
  }

  const svgSource = fs.readFileSync(svgPath, "utf8");
  const textNodes = extractTextNodes(svgSource);
  const normalizedNodes = textNodes.map(normalizeText).filter(Boolean);
  const normalizedAnswer = normalizeText(correctOption.text);

  if (
    comparisonQuestionPattern.test(question.content) &&
    normalizedNodes.some((node) => relationSymbols.has(node))
  ) {
    issues.push({
      severity: "critical",
      imageUrl: question.imageUrl,
      content: question.content,
      detail: `Comparison SVG still exposes relation symbol: ${textNodes.join(" | ")}`
    });
  }

  if (!normalizedAnswer) {
    continue;
  }

  const exactAnswerVisible = normalizedNodes.some((node) => node === normalizedAnswer);
  if (!exactAnswerVisible) {
    continue;
  }

  if (allowedVisibleAnswerImages.has(question.imageUrl)) {
    allowedVisibleAnswers.push({
      imageUrl: question.imageUrl,
      content: question.content,
      answer: correctOption.text,
      textNodes
    });
    continue;
  }

  if (allowsVisibleAnswerByPolicy(question)) {
    policyAllowedVisibleAnswerCount += 1;
    continue;
  }

  issues.push({
    severity: "critical",
    imageUrl: question.imageUrl,
    content: question.content,
    detail: `SVG still contains the exact answer text: ${textNodes.join(" | ")}`
  });
}

const allSvgAssets = walkSvgFiles(challengeImageRoot).map((filePath) => `/${path.relative(publicRoot, filePath).replace(/\\/g, "/")}`);
const unusedSvgAssets = allSvgAssets.filter((assetPath) => !referencedImageUrls.has(assetPath));

console.log(`Checked ${svgQuestions.length} SVG-backed questions.`);
console.log(`Referenced SVG assets: ${referencedImageUrls.size}`);
console.log(`Challenge SVG files on disk: ${allSvgAssets.length}`);

if (allowedVisibleAnswers.length > 0) {
  console.log("");
  console.log("Allowed visible answer candidates:");
  for (const item of allowedVisibleAnswers) {
    console.log(`- ${item.imageUrl} | ${item.answer} | ${item.textNodes.join(" | ")}`);
  }
}

if (policyAllowedVisibleAnswerCount > 0) {
  console.log("");
  console.log(`Visible-answer SVGs allowed by knowledge-tag policy: ${policyAllowedVisibleAnswerCount}`);
}

if (unusedSvgAssets.length > 0) {
  console.log("");
  console.log("Unused challenge SVG assets:");
  for (const assetPath of unusedSvgAssets) {
    console.log(`- ${assetPath}`);
  }
}

if (issues.length > 0) {
  console.log("");
  console.log("Critical issues:");
  for (const issue of issues) {
    console.log(`- ${issue.imageUrl} | ${issue.content} | ${issue.detail}`);
  }
  process.exitCode = 1;
} else {
  console.log("");
  console.log("No direct answer exposure or missing SVG issues detected.");
}
