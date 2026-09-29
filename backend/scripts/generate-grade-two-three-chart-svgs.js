const fs = require("fs");
const path = require("path");
const { questions } = require("./questionSeedData");

const repoRoot = path.resolve(__dirname, "..", "..");
const publicRoot = path.join(repoRoot, "frontend", "public");
const chartRoot = path.join(publicRoot, "images", "challenge");

const GROUPS = [
  {
    grade: "二年级",
    semester: "上册",
    subject: "数学",
    knowledgeTag: "图表看懂",
    folder: "g2-upper-stage4",
    prefix: "math-chart"
  },
  {
    grade: "二年级",
    semester: "上册",
    subject: "语文",
    knowledgeTag: "图表看懂",
    folder: "g2-upper-stage4",
    prefix: "chinese-chart"
  },
  {
    grade: "二年级",
    semester: "下册",
    subject: "数学",
    knowledgeTag: "图表看懂",
    folder: "g2-lower-stage4",
    prefix: "math-chart"
  },
  {
    grade: "二年级",
    semester: "下册",
    subject: "语文",
    knowledgeTag: "图表看懂",
    folder: "g2-lower-stage4",
    prefix: "chinese-chart"
  },
  {
    grade: "三年级",
    semester: "上册",
    subject: "数学",
    knowledgeTag: "图文转换",
    folder: "g3-upper-stage4",
    prefix: "math-chart"
  },
  {
    grade: "三年级",
    semester: "上册",
    subject: "语文",
    knowledgeTag: "图文转换",
    folder: "g3-upper-stage4",
    prefix: "chinese-chart"
  },
  {
    grade: "三年级",
    semester: "下册",
    subject: "数学",
    knowledgeTag: "图文转换",
    folder: "g3-lower-stage4",
    prefix: "math-chart"
  },
  {
    grade: "三年级",
    semester: "下册",
    subject: "语文",
    knowledgeTag: "图文转换",
    folder: "g3-lower-stage4",
    prefix: "chinese-chart"
  }
];

const THEMES = {
  数学: {
    bgA: "#F5FBFF",
    bgB: "#E2F4FF",
    card: "#FFFFFF",
    strip: "#1B8EF2",
    stripSoft: "#D8EEFF",
    accent: "#1E6FE8",
    accentSoft: "#EAF4FF",
    text: "#18334F",
    subtext: "#53718F",
    line: "#C9E2F8",
    badge: "#E7F5FF"
  },
  语文: {
    bgA: "#FFF8F2",
    bgB: "#FCEBD8",
    card: "#FFFDFB",
    strip: "#E5823A",
    stripSoft: "#FCE6D2",
    accent: "#CB6A28",
    accentSoft: "#FFF0E4",
    text: "#5A3520",
    subtext: "#8A624B",
    line: "#F1D5BF",
    badge: "#FFF1E3"
  }
};

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function padIndex(index) {
  return String(index + 1).padStart(2, "0");
}

function wrapText(text, maxChars) {
  const source = String(text || "").trim();
  if (!source) {
    return [];
  }

  const lines = [];
  let current = "";

  for (const char of source) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current);
      current = "";
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function extractChartPayload(content) {
  const normalized = String(content || "").trim();
  const colonIndex = normalized.indexOf("：");

  if (colonIndex === -1) {
    return {
      title: normalized,
      body: normalized,
      prompt: ""
    };
  }

  const title = normalized.slice(0, colonIndex).trim();
  const rest = normalized.slice(colonIndex + 1).trim();
  const sentenceIndex = rest.indexOf("。");

  if (sentenceIndex === -1) {
    return {
      title,
      body: rest,
      prompt: ""
    };
  }

  return {
    title,
    body: rest.slice(0, sentenceIndex).trim(),
    prompt: rest.slice(sentenceIndex + 1).trim()
  };
}

function parseEntries(body) {
  return String(body || "")
    .split(/[，；、]/)
    .map((item) => item.trim().split("。")[0].trim())
    .filter(Boolean);
}

// value：归一化到公共单位（克/角/分钟），只用于条形图长度比例；
// display：题面原始写法，用于条形图末端的数值标签，避免“24千克”被显示成换算后的“24000”。
function extractComparableValue(text) {
  const source = String(text || "");

  const timeMatch = source.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return { value: Number(timeMatch[1]) * 60 + Number(timeMatch[2]), display: timeMatch[0] };
  }

  const currencyWithJiao = source.match(/(\d+(?:\.\d+)?)元(\d+)角/);
  if (currencyWithJiao) {
    return {
      value: Number(currencyWithJiao[1]) * 10 + Number(currencyWithJiao[2]),
      display: `${currencyWithJiao[1]}元${currencyWithJiao[2]}角`
    };
  }

  if (/千克/.test(source) || /克/.test(source)) {
    const kilogramMatch = source.match(/(\d+(?:\.\d+)?)千克/);
    const gramMatch = source.match(/(\d+(?:\.\d+)?)克/);

    if (kilogramMatch && gramMatch && source.indexOf("千克") < source.indexOf("克")) {
      return {
        value: Number(kilogramMatch[1]) * 1000 + Number(gramMatch[1]),
        display: `${kilogramMatch[0]}${gramMatch[1]}克`
      };
    }

    if (kilogramMatch) {
      return { value: Number(kilogramMatch[1]) * 1000, display: `${kilogramMatch[1]}千克` };
    }

    if (gramMatch) {
      return { value: Number(gramMatch[1]), display: `${gramMatch[1]}克` };
    }
  }

  const currencyOnlyYuan = source.match(/(\d+(?:\.\d+)?)元/);
  if (currencyOnlyYuan && !/角/.test(source)) {
    return { value: Number(currencyOnlyYuan[1]) * 10, display: `${currencyOnlyYuan[1]}元` };
  }

  const currencyOnlyJiao = source.match(/(\d+(?:\.\d+)?)角/);
  if (currencyOnlyJiao) {
    return { value: Number(currencyOnlyJiao[1]), display: `${currencyOnlyJiao[1]}角` };
  }

  const numberMatches = [...source.matchAll(/(\d+(?:\.\d+)?)/g)];
  if (numberMatches.length === 0) {
    return null;
  }

  const lastNumber = numberMatches[numberMatches.length - 1][1];
  return { value: Number(lastNumber), display: lastNumber };
}

function buildRows(entries, theme) {
  const comparableValues = entries.map((entry) => extractComparableValue(entry));
  const canDrawBars = comparableValues.every((item) => item && Number.isFinite(item.value));
  const maxValue = canDrawBars ? Math.max(...comparableValues.map((item) => item.value)) : 0;

  return entries
    .slice(0, 3)
    .map((entry, index) => {
      // 行区 y 86~216（3 行 x 38 高 + 8 间距），给 y=222 的 footer 留出间隙
      const y = 86 + index * 46;
      const lines = wrapText(entry, 13);
      const comparable = comparableValues[index];
      const barWidth =
        canDrawBars && comparable ? Math.max(20, Math.round((comparable.value / maxValue) * 76)) : 0;

      const lineBaselines = lines.length > 1 ? [y + 15, y + 33] : [y + 24];
      const textNodes = lines
        .slice(0, 2)
        .map(
          (line, lineIndex) =>
            `<tspan x="98" y="${lineBaselines[lineIndex]}">${escapeXml(line)}</tspan>`
        )
        .join("");

      const barNode =
        canDrawBars && comparable
          ? `
        <rect x="314" y="${y + 13}" width="76" height="12" rx="6" fill="${theme.stripSoft}" />
        <rect x="314" y="${y + 13}" width="${barWidth}" height="12" rx="6" fill="${theme.strip}" />
        <text x="432" y="${y + 23}" text-anchor="end" font-size="12" fill="${theme.accent}" font-weight="700">${escapeXml(comparable.display)}</text>
      `
          : "";

      return `
      <rect x="62" y="${y}" width="376" height="38" rx="14" fill="${theme.card}" stroke="${theme.line}" />
      <circle cx="84" cy="${y + 19}" r="10" fill="${theme.badge}" stroke="${theme.line}" />
      <text x="84" y="${y + 23}" text-anchor="middle" font-size="12" fill="${theme.accent}" font-weight="700">${index + 1}</text>
      <text x="98" font-size="16" fill="${theme.text}" font-weight="600">${textNodes}</text>
      ${barNode}
    `;
    })
    .join("");
}

function buildNoteBody(body, theme) {
  const lines = wrapText(body, 14);
  // 内框 y 98~194，四行基线 120/143/166/189 全部落在框内
  const lineBaselines = [120, 143, 166, 189];
  const textNodes = lines
    .slice(0, 4)
    .map(
      (line, index) =>
        `<tspan x="96" y="${lineBaselines[index]}">${escapeXml(line)}</tspan>`
    )
    .join("");

  return `
    <rect x="64" y="86" width="352" height="120" rx="20" fill="${theme.card}" stroke="${theme.line}" />
    <rect x="84" y="98" width="312" height="96" rx="16" fill="${theme.accentSoft}" />
    <text x="96" font-size="20" fill="${theme.text}" font-weight="700">${textNodes}</text>
  `;
}

function buildSvg(question) {
  const theme = THEMES[question.subject] || THEMES.数学;
  const payload = extractChartPayload(question.content);
  const entries = parseEntries(payload.body);
  const isNoteLayout = entries.length < 2;
  const bodyNode = isNoteLayout ? buildNoteBody(payload.body, theme) : buildRows(entries, theme);
  const footer = question.subject === "数学" ? "观察数据，再判断答案" : "读懂信息，再选择答案";
  // footer 单行最多 24 字；超长时截断加省略号，避免溢出提示条
  const promptLines = wrapText(payload.prompt || footer, 24);
  const promptText = promptLines.length > 1 ? `${promptLines[0]}…` : promptLines[0];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgA}" />
      <stop offset="100%" stop-color="${theme.bgB}" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#7A94AA" flood-opacity="0.14" />
    </filter>
  </defs>
  <rect width="480" height="280" rx="28" fill="url(#bg)" />
  <circle cx="420" cy="54" r="42" fill="${theme.stripSoft}" opacity="0.72" />
  <circle cx="56" cy="36" r="26" fill="${theme.badge}" opacity="0.9" />
  <rect x="38" y="26" width="404" height="228" rx="28" fill="${theme.card}" filter="url(#shadow)" />
  <rect x="38" y="26" width="404" height="52" rx="28" fill="${theme.strip}" />
  <text x="56" y="59" font-size="20" fill="#FFFFFF" font-weight="800">${escapeXml(question.grade)} ${escapeXml(question.subject)}</text>
  <text x="424" y="57" text-anchor="end" font-size="14" fill="rgba(255,255,255,0.85)" font-weight="700">${escapeXml(question.type)}</text>
  ${bodyNode}
  <rect x="56" y="222" width="368" height="24" rx="12" fill="${theme.badge}" />
  <text x="68" y="238" font-size="14" fill="${theme.subtext}" font-weight="600">${escapeXml(promptText)}</text>
</svg>`;
}

function buildOutputPath(group, index) {
  return path.join(chartRoot, group.folder, `${group.prefix}-${padIndex(index)}.svg`);
}

function findQuestions(group) {
  return questions.filter(
    (question) =>
      question.grade === group.grade &&
      question.semester === group.semester &&
      question.subject === group.subject &&
      question.knowledgeTag === group.knowledgeTag
  );
}

function writeSvgFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content.replace(/[ \t]+$/gm, ""), "utf8");
}

function main() {
  let generatedCount = 0;

  for (const group of GROUPS) {
    const groupQuestions = findQuestions(group);

    if (groupQuestions.length !== 10) {
      throw new Error(
        `Expected 10 questions for ${group.grade}/${group.semester}/${group.subject}/${group.knowledgeTag}, received ${groupQuestions.length}.`
      );
    }

    groupQuestions.forEach((question, index) => {
      const filePath = buildOutputPath(group, index);
      writeSvgFile(filePath, buildSvg(question));
      generatedCount += 1;
    });
  }

  console.log(`Generated ${generatedCount} SVG files for grade 2/3 chart questions.`);
}

main();
