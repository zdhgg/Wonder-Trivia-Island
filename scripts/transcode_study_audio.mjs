import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

const DEFAULT_ROOT = "frontend/src/assets/audio/study";
const DEFAULT_TARGET_FORMAT = "mp3";
const DEFAULT_MP3_BITRATE = "48k";
const DEFAULT_SAMPLE_RATE = "16000";
const SUPPORTED_TARGET_FORMATS = new Set(["mp3"]);

function normalizeRelativePath(value) {
  return String(value ?? "").replace(/\\/g, "/").trim();
}

function parseArgs(argv = []) {
  const options = {
    root: DEFAULT_ROOT,
    selectionTsv: "",
    targetFormat: DEFAULT_TARGET_FORMAT,
    mp3Bitrate: DEFAULT_MP3_BITRATE,
    sampleRate: DEFAULT_SAMPLE_RATE,
    overwrite: false,
    deleteSource: false,
    whatIf: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--root") {
      options.root = argv[index + 1] || options.root;
      index += 1;
      continue;
    }

    if (arg === "--selection-tsv") {
      options.selectionTsv = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg === "--target-format") {
      options.targetFormat = String(argv[index + 1] || DEFAULT_TARGET_FORMAT).toLowerCase();
      index += 1;
      continue;
    }

    if (arg === "--mp3-bitrate") {
      options.mp3Bitrate = argv[index + 1] || DEFAULT_MP3_BITRATE;
      index += 1;
      continue;
    }

    if (arg === "--sample-rate") {
      options.sampleRate = argv[index + 1] || DEFAULT_SAMPLE_RATE;
      index += 1;
      continue;
    }

    if (arg === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (arg === "--delete-source") {
      options.deleteSource = true;
      continue;
    }

    if (arg === "--what-if") {
      options.whatIf = true;
    }
  }

  return options;
}

function parseTsv(content) {
  const rows = String(content || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].split("\t");

  return rows.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
}

async function loadSelectionTargets(selectionTsvPath) {
  const selectedTargets = new Set();
  const selectedLessons = new Set();

  if (!selectionTsvPath) {
    return { selectedTargets, selectedLessons };
  }

  const absolutePath = path.resolve(selectionTsvPath);
  const rows = parseTsv(await fs.readFile(absolutePath, "utf8"));

  for (const row of rows) {
    const lessonId = normalizeRelativePath(row.lessonId || "");
    if (lessonId) {
      selectedLessons.add(lessonId);
    }

    const relativeTarget = normalizeRelativePath(row.suggestedTarget || row.expectedAssetPath || "");
    if (!relativeTarget) {
      continue;
    }

    selectedTargets.add(normalizeRelativePath(relativeTarget.replace(/\.[^./]+$/, ".wav")));
  }

  return { selectedTargets, selectedLessons };
}

async function listWavFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const wavPaths = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      wavPaths.push(...(await listWavFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".wav") {
      wavPaths.push(absolutePath);
    }
  }

  return wavPaths;
}

function shouldIncludeWav(wavPath, rootPath, selectedTargets, selectedLessons) {
  if (!selectedTargets.size && !selectedLessons.size) {
    return true;
  }

  const relativeFromCwd = normalizeRelativePath(path.relative(process.cwd(), wavPath));
  const lessonId = normalizeRelativePath(path.relative(rootPath, wavPath)).split("/")[0] || "";

  return selectedTargets.has(relativeFromCwd) || selectedLessons.has(lessonId);
}

function buildTargetPath(wavPath, targetFormat) {
  return wavPath.replace(/\.wav$/i, `.${targetFormat}`);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function runFfmpeg(inputPath, outputPath, options) {
  const ffmpegArgs = [
    "-hide_banner",
    "-loglevel",
    "error",
    options.overwrite ? "-y" : "-n",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    options.sampleRate
  ];

  if (options.targetFormat === "mp3") {
    ffmpegArgs.push("-codec:a", "libmp3lame", "-b:a", options.mp3Bitrate);
  }

  ffmpegArgs.push(outputPath);

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary is not available.");
  }

  if (!SUPPORTED_TARGET_FORMATS.has(options.targetFormat)) {
    throw new Error(`Unsupported target format: ${options.targetFormat}`);
  }

  const rootPath = path.resolve(options.root);
  const { selectedTargets, selectedLessons } = await loadSelectionTargets(options.selectionTsv);
  const wavPaths = (await listWavFiles(rootPath)).filter((wavPath) =>
    shouldIncludeWav(wavPath, rootPath, selectedTargets, selectedLessons)
  );

  if (!wavPaths.length) {
    console.log("No WAV assets matched current filters.");
    return;
  }

  let convertedCount = 0;
  let skippedCount = 0;
  let deletedCount = 0;
  let failedCount = 0;
  let totalSourceBytes = 0;
  let totalTargetBytes = 0;

  for (const wavPath of wavPaths) {
    const targetPath = buildTargetPath(wavPath, options.targetFormat);
    const sourceBytes = (await fs.stat(wavPath)).size;
    totalSourceBytes += sourceBytes;

    if (!options.overwrite && (await pathExists(targetPath))) {
      skippedCount += 1;
      totalTargetBytes += (await fs.stat(targetPath)).size;
      console.log(`Skip existing: ${normalizeRelativePath(path.relative(process.cwd(), targetPath))}`);
      continue;
    }

    if (options.whatIf) {
      convertedCount += 1;
      console.log(
        `Plan transcode: ${normalizeRelativePath(path.relative(process.cwd(), wavPath))} -> ${normalizeRelativePath(path.relative(process.cwd(), targetPath))}`
      );
      continue;
    }

    try {
      await runFfmpeg(wavPath, targetPath, options);
      const targetBytes = (await fs.stat(targetPath)).size;
      totalTargetBytes += targetBytes;
      convertedCount += 1;
      console.log(
        `Transcoded ${normalizeRelativePath(path.relative(process.cwd(), wavPath))} -> ${normalizeRelativePath(path.relative(process.cwd(), targetPath))} :: ${sourceBytes} -> ${targetBytes} bytes`
      );

      if (options.deleteSource) {
        await fs.unlink(wavPath);
        deletedCount += 1;
      }
    } catch (error) {
      failedCount += 1;
      console.warn(
        `Failed: ${normalizeRelativePath(path.relative(process.cwd(), wavPath))} :: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  const savedBytes = totalSourceBytes - totalTargetBytes;
  const savedPercent = totalSourceBytes ? ((savedBytes / totalSourceBytes) * 100).toFixed(1) : "0.0";
  console.log(
    `Transcode summary :: converted ${convertedCount}, skipped ${skippedCount}, deleted source ${deletedCount}, failed ${failedCount}`
  );

  if (!options.whatIf) {
    console.log(
      `Selected WAV bytes ${totalSourceBytes} -> target bytes ${totalTargetBytes} (saved ${savedBytes} bytes, ${savedPercent}%)`
    );
  }

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
