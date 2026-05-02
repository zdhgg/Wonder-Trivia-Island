import fs from "node:fs/promises";
import path from "node:path";
import {
  PROJECT_ROOT,
  STUDY_AUDIO_EXTENSIONS,
  STUDY_AUDIO_ROOT,
  buildStudyNarrationManifest
} from "./lib/study_narration_manifest.mjs";
import { GRADE_ONE_BATCH_ONE, getPriorityBatchByKey } from "./lib/study_narration_priority.mjs";

function parseArgs(argv) {
  const options = {
    source: "",
    dryRun: false,
    overwrite: false,
    move: false,
    priorityKey: "",
    lessonIds: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (current === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (current === "--move") {
      options.move = true;
      continue;
    }

    if (current === "--source" && argv[index + 1]) {
      options.source = argv[index + 1];
      index += 1;
      continue;
    }

    if (current.startsWith("--source=")) {
      options.source = current.slice("--source=".length);
      continue;
    }

    if (current === "--priority" && argv[index + 1]) {
      options.priorityKey = argv[index + 1];
      index += 1;
      continue;
    }

    if (current.startsWith("--priority=")) {
      options.priorityKey = current.slice("--priority=".length);
      continue;
    }

    if (current === "--lesson-id" && argv[index + 1]) {
      options.lessonIds.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current.startsWith("--lesson-id=")) {
      options.lessonIds.push(current.slice("--lesson-id=".length));
    }
  }

  return options;
}

function printUsage() {
  console.log("Usage: node scripts/import_study_narration_assets.mjs --source <dir> [--dry-run] [--overwrite] [--move]");
  console.log("Supported source naming:");
  console.log("1. Nested folders: <source>/<lessonId>/<cardId>.<ext>");
  console.log("2. Flat files: <source>/<lessonId>__<cardId>.<ext>");
  console.log(`Priority presets: ${GRADE_ONE_BATCH_ONE.key}`);
}

async function collectFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (STUDY_AUDIO_EXTENSIONS.includes(extension)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function resolveSourceMapping(sourceRoot, absoluteFilePath) {
  const relativePath = path.relative(sourceRoot, absoluteFilePath).replace(/\\/g, "/");
  const extension = path.extname(relativePath).toLowerCase();
  const baseName = path.basename(relativePath, extension);
  const segments = relativePath.split("/");

  if (segments.length >= 2) {
    return {
      lessonId: segments[segments.length - 2],
      cardId: baseName,
      extension
    };
  }

  const flatMatch = baseName.match(/^(?<lessonId>.+?)(?:__|--)(?<cardId>.+)$/u);

  if (!flatMatch?.groups?.lessonId || !flatMatch?.groups?.cardId) {
    return null;
  }

  return {
    lessonId: flatMatch.groups.lessonId,
    cardId: flatMatch.groups.cardId,
    extension
  };
}

async function removeExistingVariants(targetDir, cardId) {
  for (const extension of STUDY_AUDIO_EXTENSIONS) {
    const variantPath = path.join(targetDir, `${cardId}${extension}`);

    try {
      await fs.rm(variantPath, { force: true });
    } catch {
      // Ignore remove failures on non-existing variants.
    }
  }
}

async function copyOrMoveFile(sourcePath, targetPath, shouldMove) {
  await fs.copyFile(sourcePath, targetPath);

  if (shouldMove) {
    await fs.unlink(sourcePath);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.source) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const sourceRoot = path.resolve(PROJECT_ROOT, options.source);
  const priorityBatch = options.priorityKey ? getPriorityBatchByKey(options.priorityKey) : null;
  const allowedLessonIds = new Set([
    ...options.lessonIds,
    ...(priorityBatch ? priorityBatch.lessons.map((lesson) => lesson.lessonId) : [])
  ]);
  const manifest = await buildStudyNarrationManifest();
  const manifestMap = new Map(manifest.entries.map((entry) => [`${entry.lessonId}/${entry.cardId}`, entry]));

  const sourceFiles = await collectFiles(sourceRoot);
  const results = {
    scanned: sourceFiles.length,
    imported: [],
    skipped: [],
    unknown: [],
    parseFailed: [],
    duplicates: []
  };
  const plannedTargets = new Set();

  for (const absoluteFilePath of sourceFiles) {
    const mapping = resolveSourceMapping(sourceRoot, absoluteFilePath);

    if (!mapping) {
      results.parseFailed.push(path.relative(sourceRoot, absoluteFilePath));
      continue;
    }

    if (allowedLessonIds.size > 0 && !allowedLessonIds.has(mapping.lessonId)) {
      results.skipped.push({
        source: path.relative(sourceRoot, absoluteFilePath),
        reason: "filtered-out"
      });
      continue;
    }

    const manifestKey = `${mapping.lessonId}/${mapping.cardId}`;
    const manifestEntry = manifestMap.get(manifestKey);

    if (!manifestEntry) {
      results.unknown.push({
        source: path.relative(sourceRoot, absoluteFilePath),
        lessonId: mapping.lessonId,
        cardId: mapping.cardId
      });
      continue;
    }

    const targetDir = path.join(STUDY_AUDIO_ROOT, mapping.lessonId);
    const targetPath = path.join(targetDir, `${mapping.cardId}${mapping.extension}`);
    const targetKey = `${mapping.lessonId}/${mapping.cardId}`;

    if (plannedTargets.has(targetKey)) {
      results.duplicates.push({
        source: path.relative(sourceRoot, absoluteFilePath),
        lessonId: mapping.lessonId,
        cardId: mapping.cardId
      });
      continue;
    }

    plannedTargets.add(targetKey);

    if (!options.dryRun) {
      await fs.mkdir(targetDir, { recursive: true });

      if (options.overwrite) {
        await removeExistingVariants(targetDir, mapping.cardId);
      } else if (manifestEntry.hasAudioAsset) {
        results.skipped.push({
          source: path.relative(sourceRoot, absoluteFilePath),
          reason: "target-exists",
          target: path.relative(PROJECT_ROOT, targetPath)
        });
        continue;
      }

      await copyOrMoveFile(absoluteFilePath, targetPath, options.move);
    }

    results.imported.push({
      source: path.relative(sourceRoot, absoluteFilePath),
      lessonId: mapping.lessonId,
      cardId: mapping.cardId,
      target: path.relative(PROJECT_ROOT, targetPath),
      mode: options.move ? "move" : "copy",
      dryRun: options.dryRun
    });
  }

  console.log(`Scanned ${results.scanned} source files from ${sourceRoot}`);
  console.log(`Imported ${results.imported.length} files${options.dryRun ? " (dry run)" : ""}`);
  console.log(`Skipped ${results.skipped.length} files`);
  console.log(`Unknown manifest targets ${results.unknown.length}`);
  console.log(`Parse failures ${results.parseFailed.length}`);
  console.log(`Duplicate targets ${results.duplicates.length}`);

  if (priorityBatch) {
    console.log(`Priority filter: ${priorityBatch.label}`);
  }

  if (results.unknown.length) {
    console.log("Unknown targets:");
    for (const item of results.unknown.slice(0, 10)) {
      console.log(`- ${item.source} -> ${item.lessonId}/${item.cardId}`);
    }
  }

  if (results.parseFailed.length) {
    console.log("Parse failures:");
    for (const item of results.parseFailed.slice(0, 10)) {
      console.log(`- ${item}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
