import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildSystematicKnowledgeCards } from "../../frontend/src/utils/knowledgeStudy.js";
import { buildStudyLessonPlayback } from "../../frontend/src/utils/studyLessonBlueprint.js";
import { STUDY_NARRATION_PRIORITY_BATCHES } from "./study_narration_priority.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const STUDY_AUDIO_ROOT = path.join(PROJECT_ROOT, "frontend", "src", "assets", "audio", "study");
export const STUDY_PUBLIC_AUDIO_ROOT = path.join(PROJECT_ROOT, "frontend", "public", "audio", "study");
export const GENERATED_DOCS_DIR = path.join(PROJECT_ROOT, "docs", "generated");
export const STUDY_AUDIO_INDEX_MODULE_PATH = path.join(PROJECT_ROOT, "frontend", "src", "audio", "studyNarrationAssetIndex.js");
export const STUDY_AUDIO_PACK_MANIFEST_PATH = path.join(GENERATED_DOCS_DIR, "study-narration-pack-manifest.json");
export const STUDY_AUDIO_PACK_INDEX_MODULE_PATH = path.join(
  PROJECT_ROOT,
  "frontend",
  "src",
  "audio",
  "studyNarrationPackIndex.js"
);
export const STUDY_AUDIO_EXTENSIONS = Object.freeze([".mp3", ".wav", ".m4a", ".ogg"]);

const STUDY_GRADE_PACK_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: "grade1",
    gradeLabel: "一年级",
    label: "一年级讲堂音频包",
    description: "覆盖一年级全部讲堂站点，适合作为启蒙阶段的整年级预取包。"
  }),
  Object.freeze({
    key: "grade2",
    gradeLabel: "二年级",
    label: "二年级讲堂音频包",
    description: "覆盖二年级全部讲堂站点，适合作为低年级延续学习的整年级预取包。"
  }),
  Object.freeze({
    key: "grade3",
    gradeLabel: "三年级",
    label: "三年级讲堂音频包",
    description: "覆盖三年级全部讲堂站点，适合作为中段课程的整年级预取包。"
  }),
  Object.freeze({
    key: "grade4",
    gradeLabel: "四年级",
    label: "四年级讲堂音频包",
    description: "覆盖四年级全部讲堂站点，适合作为跨学科主线路径的整年级预取包。"
  }),
  Object.freeze({
    key: "grade5",
    gradeLabel: "五年级",
    label: "五年级讲堂音频包",
    description: "覆盖五年级全部讲堂站点，适合作为高年级主路径学习的整年级预取包。"
  }),
  Object.freeze({
    key: "grade6",
    gradeLabel: "六年级",
    label: "六年级讲堂音频包",
    description: "覆盖六年级全部讲堂站点，适合作为毕业阶段冲刺的整年级预取包。"
  })
]);

function toTsvCell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

export function formatRelativePath(...segments) {
  return path.posix.join(...segments.map((segment) => String(segment).replace(/\\/g, "/")));
}

export function buildStudyNarrationTargetRelativePath(lessonId, cardId, extension = ".mp3") {
  return formatRelativePath("frontend", "src", "assets", "audio", "study", lessonId, `${cardId}${extension}`);
}

export function buildStudyNarrationPublicRelativePath(lessonId, cardId, extension = ".mp3") {
  return formatRelativePath("audio", "study", lessonId, `${cardId}${extension}`);
}

function toJsStringLiteral(value) {
  return JSON.stringify(String(value ?? ""));
}

function normalizePackLessonIds(lessonIds = []) {
  const seen = new Set();
  const normalizedLessonIds = [];

  for (const lessonId of lessonIds) {
    const normalizedLessonId = String(lessonId ?? "").trim();

    if (!normalizedLessonId || seen.has(normalizedLessonId)) {
      continue;
    }

    seen.add(normalizedLessonId);
    normalizedLessonIds.push(normalizedLessonId);
  }

  return normalizedLessonIds;
}

function groupEntriesByLessonId(entries = []) {
  const groupedEntries = new Map();

  for (const entry of entries) {
    const lessonId = String(entry?.lessonId ?? "").trim();

    if (!lessonId) {
      continue;
    }

    if (!groupedEntries.has(lessonId)) {
      groupedEntries.set(lessonId, []);
    }

    groupedEntries.get(lessonId).push(entry);
  }

  return groupedEntries;
}

function formatCoveragePercent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

function buildStudyNarrationCacheVersion(audioIndexEntries = []) {
  const hash = createHash("sha1");

  for (const entry of audioIndexEntries) {
    hash.update(`${entry.assetStem}:${entry.publicRelativePath}:${entry.byteSize}\n`);
  }

  return hash.digest("hex").slice(0, 12);
}

async function buildStudyNarrationAudioIndexEntries(manifest) {
  const audioIndexEntries = [];

  for (const entry of manifest.entries) {
    if (!entry.existingAssetPath) {
      continue;
    }

    const assetStem = formatRelativePath(entry.lessonId, entry.cardId);
    const extension = path.extname(entry.existingAssetPath);
    const sourceAbsolutePath = path.join(PROJECT_ROOT, entry.existingAssetPath);
    const publicRelativePath = buildStudyNarrationPublicRelativePath(entry.lessonId, entry.cardId, extension);
    const publicAbsolutePath = path.join(PROJECT_ROOT, "frontend", "public", publicRelativePath);
    const assetStats = await fs.stat(sourceAbsolutePath);

    audioIndexEntries.push({
      assetStem,
      lessonId: entry.lessonId,
      cardId: entry.cardId,
      sourceAbsolutePath,
      publicRelativePath,
      publicAbsolutePath,
      byteSize: assetStats.size
    });
  }

  return audioIndexEntries.sort((left, right) => left.assetStem.localeCompare(right.assetStem, "en"));
}

function buildStudyNarrationPackDescriptor(definition, manifestEntriesByLessonId, audioEntriesByLessonId) {
  const lessonIds = normalizePackLessonIds(definition.lessonIds);
  const clipEntries = lessonIds.flatMap((lessonId) => manifestEntriesByLessonId.get(lessonId) || []);
  const audioEntries = lessonIds.flatMap((lessonId) => audioEntriesByLessonId.get(lessonId) || []);

  return {
    key: String(definition.key ?? "").trim(),
    kind: String(definition.kind ?? "").trim() || "priority",
    label: String(definition.label ?? "").trim(),
    description: String(definition.description ?? "").trim(),
    lessonIds,
    clipCount: clipEntries.length,
    audioClipCount: audioEntries.length,
    audioCoveragePercent: formatCoveragePercent(audioEntries.length, clipEntries.length),
    totalBytes: audioEntries.reduce((totalBytes, entry) => totalBytes + Number(entry.byteSize || 0), 0),
    assetStems: audioEntries.map((entry) => entry.assetStem),
    assetRelativePaths: audioEntries.map((entry) => entry.publicRelativePath)
  };
}

function buildStudyNarrationPackManifest(manifest, audioIndexEntries) {
  const manifestEntriesByLessonId = groupEntriesByLessonId(manifest.entries);
  const audioEntriesByLessonId = groupEntriesByLessonId(audioIndexEntries);
  const cacheVersion = buildStudyNarrationCacheVersion(audioIndexEntries);
  const gradePackDefinitions = STUDY_GRADE_PACK_DEFINITIONS.map((definition) => {
    const seenLessonIds = new Set();
    const lessonIds = [];

    for (const entry of manifest.entries) {
      if (entry.grade !== definition.gradeLabel || seenLessonIds.has(entry.lessonId)) {
        continue;
      }

      seenLessonIds.add(entry.lessonId);
      lessonIds.push(entry.lessonId);
    }

    return {
      key: definition.key,
      kind: "grade",
      label: definition.label,
      description: definition.description,
      lessonIds
    };
  });
  const priorityPackDefinitions = STUDY_NARRATION_PRIORITY_BATCHES.map((batch) => ({
    key: batch.key,
    kind: "priority",
    label: batch.label,
    description: batch.description,
    lessonIds: batch.lessons.map((lesson) => lesson.lessonId)
  }));
  const packs = [...gradePackDefinitions, ...priorityPackDefinitions].map((definition) =>
    buildStudyNarrationPackDescriptor(definition, manifestEntriesByLessonId, audioEntriesByLessonId)
  );

  return {
    generatedAt: manifest.generatedAt,
    cacheVersion,
    summary: {
      packCount: packs.length,
      gradePackCount: gradePackDefinitions.length,
      priorityPackCount: priorityPackDefinitions.length,
      audioClipCount: packs.reduce((totalCount, pack) => totalCount + pack.audioClipCount, 0),
      totalBytes: packs.reduce((totalBytes, pack) => totalBytes + pack.totalBytes, 0)
    },
    packs
  };
}

function pushFrozenStringArray(lines, propertyName, values, indent = "    ") {
  lines.push(`${indent}${propertyName}: Object.freeze([`);

  for (const value of values) {
    lines.push(`${indent}  ${toJsStringLiteral(value)},`);
  }

  lines.push(`${indent}]),`);
}

async function writeStudyNarrationPackFiles(packManifest) {
  const jsonPath = STUDY_AUDIO_PACK_MANIFEST_PATH;
  const packIndexModulePath = STUDY_AUDIO_PACK_INDEX_MODULE_PATH;

  await fs.writeFile(jsonPath, JSON.stringify(packManifest, null, 2), "utf8");

  const packIndexModuleLines = [
    "// Auto-generated by scripts/export_study_narration_manifest.mjs.",
    "// Do not edit manually. Run `npm run audio:study-manifest` after updating study audio assets.",
    `export const STUDY_NARRATION_PACK_INDEX_META = Object.freeze(${JSON.stringify({
      generatedAt: packManifest.generatedAt,
      cacheVersion: packManifest.cacheVersion
    })});`,
    "export const STUDY_NARRATION_PACK_INDEX = Object.freeze({"
  ];

  for (const pack of packManifest.packs) {
    packIndexModuleLines.push(`  ${toJsStringLiteral(pack.key)}: Object.freeze({`);
    packIndexModuleLines.push(`    key: ${toJsStringLiteral(pack.key)},`);
    packIndexModuleLines.push(`    kind: ${toJsStringLiteral(pack.kind)},`);
    packIndexModuleLines.push(`    label: ${toJsStringLiteral(pack.label)},`);
    packIndexModuleLines.push(`    description: ${toJsStringLiteral(pack.description)},`);
    packIndexModuleLines.push(`    clipCount: ${Number(pack.clipCount || 0)},`);
    packIndexModuleLines.push(`    audioClipCount: ${Number(pack.audioClipCount || 0)},`);
    packIndexModuleLines.push(`    audioCoveragePercent: ${Number(pack.audioCoveragePercent || 0)},`);
    packIndexModuleLines.push(`    totalBytes: ${Number(pack.totalBytes || 0)},`);
    pushFrozenStringArray(packIndexModuleLines, "lessonIds", pack.lessonIds);
    pushFrozenStringArray(packIndexModuleLines, "assetStems", pack.assetStems);
    packIndexModuleLines.push("  }),");
  }

  packIndexModuleLines.push("});");
  packIndexModuleLines.push("export const STUDY_NARRATION_PACK_LIST = Object.freeze([");

  for (const pack of packManifest.packs) {
    packIndexModuleLines.push(`  STUDY_NARRATION_PACK_INDEX[${toJsStringLiteral(pack.key)}],`);
  }

  packIndexModuleLines.push("]);");
  packIndexModuleLines.push("");

  await fs.writeFile(packIndexModulePath, packIndexModuleLines.join("\n"), "utf8");

  return { jsonPath, packIndexModulePath };
}

export async function findExistingAudioAssetRelativePath(lessonId, cardId) {
  for (const extension of STUDY_AUDIO_EXTENSIONS) {
    const absolutePath = path.join(STUDY_AUDIO_ROOT, lessonId, `${cardId}${extension}`);

    try {
      await fs.access(absolutePath);
      return buildStudyNarrationTargetRelativePath(lessonId, cardId, extension);
    } catch {
      // Continue checking remaining supported formats.
    }
  }

  return "";
}

export function createStudyNarrationEntry(playback, lesson, card, existingAssetPath) {
  return {
    lessonId: playback.id,
    lessonTitle: playback.title,
    grade: playback.grade,
    semester: playback.semester,
    subject: playback.subject,
    cardId: card.id,
    cardTitle: card.title,
    cardKind: card.kind,
    narrationSource: lesson.studyNarration?.[card.id] ? "custom" : "derived",
    narrationText: card.narrationText,
    expectedAssetPath: buildStudyNarrationTargetRelativePath(playback.id, card.id),
    existingAssetPath,
    hasAudioAsset: Boolean(existingAssetPath)
  };
}

export async function buildStudyNarrationManifest({ studyKnowledgeSummaries = [] } = {}) {
  const lessons = buildSystematicKnowledgeCards(studyKnowledgeSummaries);
  const entries = [];

  for (const lesson of lessons) {
    const playback = buildStudyLessonPlayback(lesson);

    if (!playback) {
      continue;
    }

    for (const card of playback.cards) {
      const existingAssetPath = await findExistingAudioAssetRelativePath(playback.id, card.id);
      entries.push(createStudyNarrationEntry(playback, lesson, card, existingAssetPath));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      lessonCount: new Set(entries.map((entry) => entry.lessonId)).size,
      clipCount: entries.length,
      customNarrationCount: entries.filter((entry) => entry.narrationSource === "custom").length,
      audioAssetCount: entries.filter((entry) => entry.hasAudioAsset).length
    },
    entries
  };
}

export async function writeStudyNarrationManifestFiles(manifest) {
  await fs.mkdir(GENERATED_DOCS_DIR, { recursive: true });

  const jsonPath = path.join(GENERATED_DOCS_DIR, "study-narration-manifest.json");
  const tsvPath = path.join(GENERATED_DOCS_DIR, "study-narration-manifest.tsv");
  const audioIndexModulePath = STUDY_AUDIO_INDEX_MODULE_PATH;

  await fs.writeFile(jsonPath, JSON.stringify(manifest, null, 2), "utf8");

  const tsvHeader = [
    "lessonId",
    "lessonTitle",
    "grade",
    "semester",
    "subject",
    "cardId",
    "cardTitle",
    "cardKind",
    "narrationSource",
    "hasAudioAsset",
    "expectedAssetPath",
    "existingAssetPath",
    "narrationText"
  ];
  const tsvRows = [
    tsvHeader.join("\t"),
    ...manifest.entries.map((entry) =>
      [
        entry.lessonId,
        entry.lessonTitle,
        entry.grade,
        entry.semester,
        entry.subject,
        entry.cardId,
        entry.cardTitle,
        entry.cardKind,
        entry.narrationSource,
        entry.hasAudioAsset ? "yes" : "no",
        entry.expectedAssetPath,
        entry.existingAssetPath,
        entry.narrationText
      ]
        .map(toTsvCell)
        .join("\t")
    )
  ];

  await fs.writeFile(tsvPath, tsvRows.join("\n"), "utf8");

  const audioIndexEntries = await buildStudyNarrationAudioIndexEntries(manifest);
  await fs.rm(STUDY_PUBLIC_AUDIO_ROOT, { recursive: true, force: true });
  await fs.mkdir(STUDY_PUBLIC_AUDIO_ROOT, { recursive: true });

  for (const entry of audioIndexEntries) {
    await fs.mkdir(path.dirname(entry.publicAbsolutePath), { recursive: true });
    await fs.copyFile(entry.sourceAbsolutePath, entry.publicAbsolutePath);
  }

  const audioIndexModuleLines = [
    "// Auto-generated by scripts/export_study_narration_manifest.mjs.",
    "// Do not edit manually. Run `npm run audio:study-manifest` after updating study audio assets.",
    "export const STUDY_NARRATION_ASSET_INDEX = Object.freeze({",
    ...audioIndexEntries.map(
      (entry) => `  ${toJsStringLiteral(entry.assetStem)}: ${toJsStringLiteral(entry.publicRelativePath)},`
    ),
    "});",
    ""
  ];
  await fs.writeFile(audioIndexModulePath, audioIndexModuleLines.join("\n"), "utf8");

  const packManifest = buildStudyNarrationPackManifest(manifest, audioIndexEntries);
  const { jsonPath: packManifestPath, packIndexModulePath } = await writeStudyNarrationPackFiles(packManifest);

  return { jsonPath, tsvPath, audioIndexModulePath, packManifestPath, packIndexModulePath };
}
