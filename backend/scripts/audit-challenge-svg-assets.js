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

// 布局防回归只覆盖二/三年级 stage-4 由模板生成的 chart 图（其余 240 张为手绘/其他模板，不走这些坐标规则）
const CHART_TEMPLATE_IMAGE_PATTERN = /\/images\/challenge\/g[23]-[^/]*-stage4\/(?:math|chinese)-chart-\d+\.svg$/;
const FULLWIDTH_CHAR_PATTERN = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF01-\uFF60\u3000-\u303F]/;

function estimateTextWidth(text, fontSize) {
  let width = 0;

  for (const char of String(text || "")) {
    width += FULLWIDTH_CHAR_PATTERN.test(char) ? fontSize : fontSize * 0.56;
  }

  return width;
}

function collectSvgTextLines(svgSource) {
  const lines = [];
  const tagPattern = /<(text|tspan)\b([^>]*)>([^<]*)</g;
  let inheritedFontSize = 16;
  let inheritedAnchor = "start";
  let match;

  while ((match = tagPattern.exec(svgSource)) !== null) {
    const [, tag, rawAttrs, rawContent] = match;
    const fontSizeAttr = /font-size="([-\d.]+)"/.exec(rawAttrs);
    const anchorAttr = /text-anchor="(\w+)"/.exec(rawAttrs);
    // SVG 继承只发生在 tspan → 父 <text>；兄弟 <text> 之间不继承，默认值各自回到 start/16
    const fontSize = fontSizeAttr
      ? Number.parseFloat(fontSizeAttr[1])
      : tag === "tspan"
        ? inheritedFontSize
        : 16;
    const anchor = anchorAttr ? anchorAttr[1] : tag === "tspan" ? inheritedAnchor : "start";

    if (tag === "text") {
      inheritedFontSize = fontSize;
      inheritedAnchor = anchor;
    }

    const content = decodeEntities(rawContent).trim();
    const xAttr = /\bx="([-\d.]+)"/.exec(rawAttrs);
    const yAttr = /\by="([-\d.]+)"/.exec(rawAttrs);

    if (!content || !xAttr || !yAttr) {
      continue;
    }

    const x = Number.parseFloat(xAttr[1]);
    const y = Number.parseFloat(yAttr[1]);
    const width = estimateTextWidth(content, fontSize);
    const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;

    lines.push({
      content,
      fontSize,
      index: match.index,
      box: {
        left,
        right: left + width,
        top: y - fontSize * 0.85,
        bottom: y + fontSize * 0.25
      }
    });
  }

  return lines;
}

function collectSvgRectBoxes(svgSource) {
  const rects = [];
  const rectPattern = /<rect\b([^>]*)>/g;
  let match;

  while ((match = rectPattern.exec(svgSource)) !== null) {
    const rawAttrs = match[1];
    const fillAttr = /fill="([^"]*)"/.exec(rawAttrs);
    const fill = fillAttr ? fillAttr[1] : "";
    const alphaAttr = /rgba\([^)]*,\s*([\d.]+)\)/.exec(fill);
    const isOpaque =
      Boolean(fill) && fill !== "none" && !fill.startsWith("url(") && !(alphaAttr && Number.parseFloat(alphaAttr[1]) < 0.95);

    const xAttr = /\bx="([-\d.]+)"/.exec(rawAttrs);
    const yAttr = /\by="([-\d.]+)"/.exec(rawAttrs);
    const widthAttr = /\bwidth="([-\d.]+)"/.exec(rawAttrs);
    const heightAttr = /\bheight="([-\d.]+)"/.exec(rawAttrs);

    if (!isOpaque || !xAttr || !yAttr || !widthAttr || !heightAttr) {
      continue;
    }

    rects.push({
      index: match.index,
      box: {
        left: Number.parseFloat(xAttr[1]),
        right: Number.parseFloat(xAttr[1]) + Number.parseFloat(widthAttr[1]),
        top: Number.parseFloat(yAttr[1]),
        bottom: Number.parseFloat(yAttr[1]) + Number.parseFloat(heightAttr[1])
      }
    });
  }

  return rects;
}

function boxesIntersect(a, b) {
  return a.left + 1 < b.right - 1 && a.right - 1 > b.left + 1 && a.top + 1 < b.bottom - 1 && a.bottom - 1 > b.top + 1;
}

function runSvgLayoutChecks(question, svgSource, issues) {
  if (!CHART_TEMPLATE_IMAGE_PATTERN.test(question.imageUrl)) {
    return;
  }

  const addIssue = (detail) =>
    issues.push({
      severity: "critical",
      imageUrl: question.imageUrl,
      content: question.content,
      detail
    });

  const viewBoxMatch = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svgSource);

  if (!viewBoxMatch) {
    addIssue("Missing viewBox.");
    return;
  }

  const viewBoxWidth = Number.parseFloat(viewBoxMatch[1]);
  const viewBoxHeight = Number.parseFloat(viewBoxMatch[2]);
  const textLines = collectSvgTextLines(svgSource);
  const rectBoxes = collectSvgRectBoxes(svgSource);

  for (const line of textLines) {
    if (line.box.left < -1 || line.box.top < -1 || line.box.right > viewBoxWidth + 1 || line.box.bottom > viewBoxHeight + 1) {
      addIssue(`Text "${line.content}" escapes the viewBox 0 0 ${viewBoxWidth} ${viewBoxHeight}.`);
    }
  }

  for (let i = 0; i < textLines.length; i++) {
    for (let j = i + 1; j < textLines.length; j++) {
      if (boxesIntersect(textLines[i].box, textLines[j].box)) {
        addIssue(`Text "${textLines[i].content}" overlaps text "${textLines[j].content}".`);
      }
    }
  }

  for (const line of textLines) {
    for (const rect of rectBoxes) {
      if (rect.index > line.index && boxesIntersect(rect.box, line.box)) {
        addIssue(`Rect painted after text "${line.content}" covers it.`);
      }
    }
  }

  // 无“：”题干曾被整句塞进大号标题行导致横向溢出，这里保证长题干不再出现在大字号节点里
  const content = String(question.content || "");

  if (!content.includes("：") && content.length >= 16) {
    const normalizedContent = normalizeText(content);

    for (const line of textLines) {
      if (line.fontSize >= 20 && normalizeText(line.content).includes(normalizedContent)) {
        addIssue(`Chart heading still contains the full no-colon stem.`);
      }
    }
  }
}

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

  runSvgLayoutChecks(question, svgSource, issues);

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
