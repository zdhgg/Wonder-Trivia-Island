#!/usr/bin/env node

/**
 * 题库导入 harness。
 *
 * 默认只做预检（dry-run），把结果打印出来，方便调试导入模块；
 * 加 --stage 才会把批次落到待确认队列，由导入页面人工点确认后才写库。
 *
 * 用法：
 *   node scripts/import-questions.js backend/data/question-seed.csv
 *   node scripts/import-questions.js backend/data/question-seed.csv --mode replace --stage
 *   node scripts/import-questions.js --from-seed --limit 20
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  IMPORT_ERROR_STAGE_BLOCKED,
  previewQuestionImport,
  stageQuestionImport
} = require("../backend/src/services/questionImport");
const { dbPath } = require("../backend/src/db/database");
const { pendingBatchPath } = require("../backend/src/services/questionImportStaging");

const MAX_ROWS = 1000;
const WARNING_DETAIL_LIMIT = 20;
const CONTENT_PREVIEW_LENGTH = 64;

function printUsage() {
  console.log(`题库导入 harness

用法:
  node scripts/import-questions.js <file.csv|file.xlsx> [options]
  node scripts/import-questions.js --from-seed [options]

选项:
  --mode <append|replace>  导入模式，默认 append
  --source <label>         批次来源标记，默认取文件名
  --limit <n>              只取前 n 行，最多 ${MAX_ROWS} 行
  --stage                  提交到导入待确认队列（默认只预检，不写任何东西）
  --json                   以 JSON 输出预检结果
  --from-seed              改用 backend/scripts/questionSeedData.js 作为数据源
  -h, --help               显示本帮助

说明:
  --stage 只是把批次交给导入页面，仍需人工在页面上确认才会写入题库。
`);
}

function parseArgs(argv) {
  const options = {
    file: "",
    fromSeed: false,
    mode: "append",
    source: "",
    limit: null,
    stage: false,
    json: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--from-seed") {
      options.fromSeed = true;
      continue;
    }

    if (arg === "--stage") {
      options.stage = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--mode") {
      options.mode = String(argv[++index] || "").trim();
      continue;
    }

    if (arg === "--source") {
      options.source = String(argv[++index] || "").trim();
      continue;
    }

    if (arg === "--limit") {
      const parsed = Number.parseInt(String(argv[++index] || ""), 10);
      options.limit = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`未知参数：${arg}`);
    }

    if (options.file) {
      throw new Error(`只支持一个输入文件，收到多余参数：${arg}`);
    }

    options.file = arg;
  }

  return options;
}

function decodeCsvText(buffer) {
  const text = buffer.toString("utf8");

  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// 最小可用的 CSV 解析：处理引号包裹、转义引号和 CRLF。
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function buildRecordsFromMatrix(matrix) {
  const [headerRow = [], ...dataRows] = matrix;
  const headers = headerRow.map((value) => String(value ?? "").trim());

  if (headers.every((header) => !header)) {
    throw new Error("第一行必须是表头，当前表头为空。");
  }

  return dataRows
    .map((row) =>
      headers.reduce((record, header, columnIndex) => {
        if (header) {
          record[header] = row[columnIndex] ?? "";
        }

        return record;
      }, {})
    )
    .filter((record) => Object.values(record).some((value) => String(value ?? "").trim()));
}

function convertQuestionToImportRow(question) {
  const optionMap = Object.fromEntries(
    Array.isArray(question?.options)
      ? question.options.map((option) => [option?.key, option?.text ?? ""])
      : []
  );

  return {
    学科: question?.subject || "",
    年级: question?.grade || "",
    学期: question?.semester || "",
    题型: question?.type || "",
    题目: question?.content || "",
    题目图片: question?.imageUrl || "",
    知识标签: question?.knowledgeTag || "",
    选项A: optionMap.A || "",
    选项B: optionMap.B || "",
    选项C: optionMap.C || "",
    选项D: optionMap.D || "",
    答案: question?.answer || "",
    解析: question?.explanation || "",
    难度: String(question?.difficulty ?? "")
  };
}

function loadSeedRows() {
  const seedPath = path.join(__dirname, "..", "backend", "scripts", "questionSeedData.js");
  const { questions } = require(seedPath);

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("questionSeedData.js 里没有可导入的题目。");
  }

  return questions.map(convertQuestionToImportRow);
}

function loadXlsxRows(filePath) {
  let readXlsxFile;

  try {
    const loaded = require("read-excel-file/node");
    readXlsxFile = loaded?.default || loaded;
  } catch {
    throw new Error("读取 XLSX 需要 read-excel-file，请先在项目根目录执行 npm install。");
  }

  const matrix = readXlsxFile(filePath);

  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error("Excel 文件里没有解析出有效内容。");
  }

  return buildRecordsFromMatrix(matrix);
}

function loadFileRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到输入文件：${filePath}`);
  }

  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".xlsx") {
    return loadXlsxRows(filePath);
  }

  if (extension !== ".csv") {
    throw new Error(`只支持 .csv 和 .xlsx，当前是 ${extension || "无扩展名"}。`);
  }

  return buildRecordsFromMatrix(parseCsv(decodeCsvText(fs.readFileSync(filePath))));
}

function truncate(value, maxLength = CONTENT_PREVIEW_LENGTH) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

function printRowDetails(row, index) {
  const prefix = `  ${String(index + 1).padStart(2, " ")}. 第 ${row.rowNumber} 行 · ${row.subject || "-"} / ${row.grade || "-"} / ${row.semester || "-"}`;

  console.log(prefix);
  console.log(`      ${truncate(row.content) || "(空题目)"}`);

  for (const issue of row.issues) {
    console.log(`      [${issue.level === "error" ? "错误" : "警告"}] ${issue.message}`);

    if (issue.comparison) {
      const similarity =
        issue.comparison.similarityPercent !== null && issue.comparison.similarityPercent !== undefined
          ? ` · 相似度 ${issue.comparison.similarityPercent}%`
          : "";
      const recommendation = issue.comparison.recommendation?.label
        ? ` · ${issue.comparison.recommendation.label}`
        : "";

      console.log(`         ↳ ${issue.comparison.title} ${issue.comparison.targetLabel}${similarity}${recommendation}`);
      console.log(`           ${truncate(issue.comparison.contentPreview, 80)}`);
    }
  }
}

function printPreviewReport({ preview, source, mode }) {
  const { summary, rows } = preview;
  const errorRows = rows.filter((row) => row.status === "error");
  const warningRows = rows.filter((row) => row.status === "warning");

  console.log("");
  console.log("题库导入预检报告");
  console.log("─".repeat(48));
  console.log(`来源      ${source}`);
  console.log(`数据库    ${dbPath}`);
  console.log(`模式      ${mode === "replace" ? "覆盖导入 (replace)" : "追加导入 (append)"}`);
  console.log(`当前题库  ${summary.currentQuestionCount} 题`);
  console.log(
    `本次预检  ${summary.totalRows} 行 · 可导入 ${summary.validRows} · 警告 ${summary.warningRows} · 错误 ${summary.errorRows}`
  );

  if (errorRows.length > 0) {
    console.log("");
    console.log(`错误 (${errorRows.length} 行，必须先在源数据里修正)`);
    errorRows.slice(0, WARNING_DETAIL_LIMIT).forEach((row, index) => printRowDetails(row, index));

    if (errorRows.length > WARNING_DETAIL_LIMIT) {
      console.log(`  … 其余 ${errorRows.length - WARNING_DETAIL_LIMIT} 行错误已省略`);
    }
  }

  if (warningRows.length > 0) {
    console.log("");
    console.log(`警告 (${warningRows.length} 行，需要人工判断是否保留)`);
    warningRows.slice(0, WARNING_DETAIL_LIMIT).forEach((row, index) => printRowDetails(row, index));

    if (warningRows.length > WARNING_DETAIL_LIMIT) {
      console.log(`  … 其余 ${warningRows.length - WARNING_DETAIL_LIMIT} 行警告已省略`);
    }
  }

  console.log("");
  console.log("─".repeat(48));
}

function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`参数错误：${error.message}`);
    process.exit(2);
  }

  if (options.help) {
    printUsage();
    return;
  }

  if (!options.fromSeed && !options.file) {
    printUsage();
    process.exit(2);
  }

  if (!["append", "replace"].includes(options.mode)) {
    console.error(`--mode 只支持 append 或 replace，当前是 "${options.mode}"。`);
    process.exit(2);
  }

  let rows;
  let source;

  try {
    if (options.fromSeed) {
      rows = loadSeedRows();
      source = options.source || "seed:questionSeedData.js";
    } else {
      rows = loadFileRows(path.resolve(options.file));
      source = options.source || `file:${path.basename(options.file)}`;
    }
  } catch (error) {
    console.error(`读取数据失败：${error.message}`);
    process.exit(1);
  }

  const totalAvailable = rows.length;

  if (options.limit) {
    rows = rows.slice(0, options.limit);
  }

  if (rows.length > MAX_ROWS) {
    console.error(
      `单次最多 ${MAX_ROWS} 行，当前 ${rows.length} 行。请用 --limit ${MAX_ROWS} 分批，或拆分源文件。`
    );
    process.exit(2);
  }

  let preview;

  try {
    preview = previewQuestionImport(rows, options.mode);
  } catch (error) {
    console.error(`预检失败：${error.message}`);
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify({ source, mode: options.mode, preview }, null, 2));
  } else {
    if (options.limit && totalAvailable > rows.length) {
      console.log(`已按 --limit 截取前 ${rows.length} 行（共 ${totalAvailable} 行）。`);
    }

    printPreviewReport({ preview, source, mode: options.mode });
  }

  if (preview.summary.errorRows > 0) {
    if (!options.json) {
      console.error(`预检未通过：${preview.summary.errorRows} 行错误。修正源数据后重跑。`);
    }

    process.exit(1);
  }

  if (!options.stage) {
    if (!options.json) {
      console.log("只是预检，没有提交任何内容。确认无误后加 --stage 提交到导入页面。");
    }

    return;
  }

  try {
    const batch = stageQuestionImport({
      rows,
      mode: options.mode,
      source
    });

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            staged: true,
            batchId: batch.batchId,
            createdAt: batch.createdAt,
            source: batch.source,
            mode: batch.mode,
            summary: batch.summary,
            pendingBatchPath
          },
          null,
          2
        )
      );

      return;
    }

    console.log(`已提交待确认批次 ${batch.batchId}。`);
    console.log(`暂存文件  ${pendingBatchPath}`);
    console.log("下一步：打开工具台 → 导入，核对预检结果后点确认，才会写入题库。");
  } catch (error) {
    if (error.code === IMPORT_ERROR_STAGE_BLOCKED) {
      console.error(`提交暂存被拒绝：${error.message}`);
      process.exit(1);
    }

    console.error(`提交暂存失败：${error.message}`);
    process.exit(1);
  }
}

main();
