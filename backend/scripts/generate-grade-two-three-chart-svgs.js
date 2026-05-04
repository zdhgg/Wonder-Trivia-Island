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
    .split(/[，；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractComparableValue(text) {
  const source = String(text || "");

  const timeMatch = source.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  }

  const currencyWithJiao = source.match(/(\d+(?:\.\d+)?)元(\d+)角/);
  if (currencyWithJiao) {
    return Number(currencyWithJiao[1]) * 10 + Number(currencyWithJiao[2]);
  }

  if (/千克/.test(source) || /克/.test(source)) {
    const kilogramMatch = source.match(/(\d+(?:\.\d+)?)千克/);
    const gramMatch = source.match(/(\d+(?:\.\d+)?)克/);

    if (kilogramMatch && gramMatch && source.indexOf("千克") < source.indexOf("克")) {
      return Number(kilogramMatch[1]) * 1000 + Number(gramMatch[1]);
    }

    if (kilogramMatch) {
      return Number(kilogramMatch[1]) * 1000;
    }

    if (gramMatch) {
      return Number(gramMatch[1]);
    }
  }

  const currencyOnlyYuan = source.match(/(\d+(?:\.\d+)?)元/);
  if (currencyOnlyYuan && !/角/.test(source)) {
    return Number(currencyOnlyYuan[1]) * 10;
  }

  const currencyOnlyJiao = source.match(/(\d+(?:\.\d+)?)角/);
  if (currencyOnlyJiao) {
    return Number(currencyOnlyJiao[1]);
  }

  const numberMatches = [...source.matchAll(/(\d+(?:\.\d+)?)/g)];
  if (numberMatches.length === 0) {
    return null;
  }

  return Number(numberMatches[numberMatches.length - 1][1]);
}

function buildRows(entries, theme) {
  const values = entries.map((entry) => extractComparableValue(entry));
  const canDrawBars = values.every((value) => Number.isFinite(value));
  const maxValue = canDrawBars ? Math.max(...values) : 0;

  return entries
    .slice(0, 3)
    .map((entry, index) => {
      const y = 86 + index * 52;
      const lines = wrapText(entry, 14);
      const value = values[index];
      const barWidth = canDrawBars && maxValue > 0 ? Math.max(26, Math.round((value / maxValue) * 124)) : 0;

      const textNodes = lines
        .slice(0, 2)
        .map(
          (line, lineIndex) =>
            `<tspan x="98" y="${y + 20 + lineIndex * 18}">${escapeXml(line)}</tspan>`
        )
        .join("");

      const barNode =
        canDrawBars && Number.isFinite(value)
          ? `
        <rect x="314" y="${y + 10}" width="124" height="12" rx="6" fill="${theme.stripSoft}" />
        <rect x="314" y="${y + 10}" width="${barWidth}" height="12" rx="6" fill="${theme.strip}" />
        <text x="438" y="${y + 21}" text-anchor="end" font-size="14" fill="${theme.accent}" font-weight="700">${escapeXml(String(value))}</text>
      `
          : "";

      return `
      <rect x="62" y="${y}" width="376" height="42" rx="16" fill="${theme.card}" stroke="${theme.line}" />
      <circle cx="84" cy="${y + 21}" r="10" fill="${theme.badge}" stroke="${theme.line}" />
      <text x="84" y="${y + 26}" text-anchor="middle" font-size="12" fill="${theme.accent}" font-weight="700">${index + 1}</text>
      <text x="98" y="${y + 20}" font-size="16" fill="${theme.text}" font-weight="600">${textNodes}</text>
      ${barNode}
    `;
    })
    .join("");
}

function buildNoteBody(body, theme) {
  const lines = wrapText(body, 16);
  const textNodes = lines
    .slice(0, 4)
    .map(
      (line, index) =>
        `<tspan x="88" y="${104 + index * 28}">${escapeXml(line)}</tspan>`
    )
    .join("");

  return `
    <rect x="64" y="86" width="352" height="116" rx="24" fill="${theme.card}" stroke="${theme.line}" />
    <rect x="84" y="108" width="312" height="72" rx="18" fill="${theme.accentSoft}" />
    <text x="88" y="104" font-size="20" fill="${theme.text}" font-weight="700">${textNodes}</text>
  `;
}

function buildSvg(question) {
  const theme = THEMES[question.subject] || THEMES.数学;
  const payload = extractChartPayload(question.content);
  const entries = parseEntries(payload.body);
  const isNoteLayout = entries.length < 2;
  const bodyNode = isNoteLayout ? buildNoteBody(payload.body, theme) : buildRows(entries, theme);
  const footer = question.subject === "数学" ? "观察数据，再判断答案" : "读懂信息，再选择答案";
  const promptLines = wrapText(payload.prompt || footer, 18);
  const promptNodes = promptLines
    .slice(0, 2)
    .map(
      (line, index) =>
        `<tspan x="68" y="${238 + index * 18}">${escapeXml(line)}</tspan>`
    )
    .join("");

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
  <rect x="54" y="44" width="84" height="20" rx="10" fill="rgba(255,255,255,0.20)" />
  <text x="96" y="58" text-anchor="middle" font-size="12" fill="#FFFFFF" font-weight="700">${escapeXml(question.type)}</text>
  <text x="64" y="112" font-size="24" fill="${theme.text}" font-weight="800">${escapeXml(payload.title || question.type)}</text>
  <text x="64" y="70" font-size="24" fill="#FFFFFF" font-weight="800">${escapeXml(question.grade)} ${escapeXml(question.subject)}</text>
  ${bodyNode}
  <rect x="56" y="218" width="368" height="24" rx="12" fill="${theme.badge}" />
  <text x="68" y="238" font-size="14" fill="${theme.subtext}" font-weight="600">${promptNodes}</text>
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
  fs.writeFileSync(filePath, content, "utf8");
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
