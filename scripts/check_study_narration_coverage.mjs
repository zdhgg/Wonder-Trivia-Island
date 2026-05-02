import fs from "node:fs/promises";
import path from "node:path";
import {
  GENERATED_DOCS_DIR,
  buildStudyNarrationManifest,
  buildStudyNarrationTargetRelativePath
} from "./lib/study_narration_manifest.mjs";
import { STUDY_NARRATION_PRIORITY_BATCHES } from "./lib/study_narration_priority.mjs";

function roundPercent(value, total) {
  if (!total) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(1));
}

function toTsvCell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

function summarizeEntries(entries) {
  const customClipCount = entries.filter((entry) => entry.narrationSource === "custom").length;
  const audioClipCount = entries.filter((entry) => entry.hasAudioAsset).length;
  const clipCount = entries.length;

  return {
    clipCount,
    customClipCount,
    audioClipCount,
    missingClipCount: clipCount - audioClipCount,
    audioCoveragePercent: roundPercent(audioClipCount, clipCount),
    customNarrationPercent: roundPercent(customClipCount, clipCount)
  };
}

function summarizeBy(entries, fieldName) {
  const groups = new Map();

  for (const entry of entries) {
    const key = entry[fieldName] || "未分组";
    const groupEntries = groups.get(key) || [];
    groupEntries.push(entry);
    groups.set(key, groupEntries);
  }

  return [...groups.entries()]
    .map(([key, groupEntries]) => ({
      key,
      ...summarizeEntries(groupEntries)
    }))
    .sort((left, right) => left.key.localeCompare(right.key, "zh-CN"));
}

function buildLessonRows(entries) {
  const groups = new Map();

  for (const entry of entries) {
    const groupEntries = groups.get(entry.lessonId) || [];
    groupEntries.push(entry);
    groups.set(entry.lessonId, groupEntries);
  }

  return [...groups.entries()]
    .map(([lessonId, lessonEntries]) => {
      const firstEntry = lessonEntries[0];
      return {
        lessonId,
        lessonTitle: firstEntry.lessonTitle,
        grade: firstEntry.grade,
        semester: firstEntry.semester,
        subject: firstEntry.subject,
        ...summarizeEntries(lessonEntries)
      };
    })
    .sort((left, right) => left.lessonId.localeCompare(right.lessonId, "en"));
}

async function main() {
  const manifest = await buildStudyNarrationManifest();
  const lessonRows = buildLessonRows(manifest.entries);
  const priorityBatchReports = [];

  const report = {
    generatedAt: new Date().toISOString(),
    overall: summarizeEntries(manifest.entries),
    byGrade: summarizeBy(manifest.entries, "grade"),
    bySubject: summarizeBy(manifest.entries, "subject"),
    bySemester: summarizeBy(manifest.entries, "semester"),
    priorityBatches: priorityBatchReports
  };

  await fs.mkdir(GENERATED_DOCS_DIR, { recursive: true });

  const coverageJsonPath = path.join(GENERATED_DOCS_DIR, "study-narration-coverage.json");

  await fs.writeFile(coverageJsonPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Coverage report exported: ${coverageJsonPath}`);

  for (const batch of STUDY_NARRATION_PRIORITY_BATCHES) {
    const priorityLessonMap = new Map(batch.lessons.map((lesson) => [lesson.lessonId, lesson]));
    const priorityLessonRows = lessonRows
      .filter((lesson) => priorityLessonMap.has(lesson.lessonId))
      .map((lesson) => ({
        ...lesson,
        note: priorityLessonMap.get(lesson.lessonId)?.note || ""
      }));
    const priorityEntries = manifest.entries.filter((entry) => priorityLessonMap.has(entry.lessonId));
    const priorityMissingEntries = priorityEntries
      .filter((entry) => !entry.hasAudioAsset)
      .map((entry) => ({
        ...entry,
        note: priorityLessonMap.get(entry.lessonId)?.note || "",
        suggestedTarget: buildStudyNarrationTargetRelativePath(entry.lessonId, entry.cardId)
      }));

    priorityBatchReports.push({
      key: batch.key,
      label: batch.label,
      description: batch.description,
      lessonCount: priorityLessonRows.length,
      ...summarizeEntries(priorityEntries)
    });

    const priorityTsvPath = path.join(GENERATED_DOCS_DIR, `study-narration-${batch.key}.tsv`);
    const priorityMissingTsvPath = path.join(GENERATED_DOCS_DIR, `study-narration-${batch.key}-missing.tsv`);
    const priorityRows = [
      ["lessonId", "lessonTitle", "grade", "semester", "subject", "clipCount", "customClipCount", "audioClipCount", "missingClipCount", "audioCoveragePercent", "note"].join("\t"),
      ...priorityLessonRows.map((lesson) =>
        [
          lesson.lessonId,
          lesson.lessonTitle,
          lesson.grade,
          lesson.semester,
          lesson.subject,
          lesson.clipCount,
          lesson.customClipCount,
          lesson.audioClipCount,
          lesson.missingClipCount,
          `${lesson.audioCoveragePercent}%`,
          lesson.note
        ]
          .map(toTsvCell)
          .join("\t")
      )
    ];
    await fs.writeFile(priorityTsvPath, priorityRows.join("\n"), "utf8");

    const priorityMissingRows = [
      ["lessonId", "lessonTitle", "cardId", "cardTitle", "narrationSource", "suggestedTarget", "narrationText", "note"].join("\t"),
      ...priorityMissingEntries.map((entry) =>
        [
          entry.lessonId,
          entry.lessonTitle,
          entry.cardId,
          entry.cardTitle,
          entry.narrationSource,
          entry.suggestedTarget,
          entry.narrationText,
          entry.note
        ]
          .map(toTsvCell)
          .join("\t")
      )
    ];
    await fs.writeFile(priorityMissingTsvPath, priorityMissingRows.join("\n"), "utf8");

    console.log(`${batch.label}: ${priorityLessonRows.length} lessons / ${priorityEntries.length} clips / ${priorityMissingEntries.length} missing`);
    console.log(`Priority batch TSV: ${priorityTsvPath}`);
    console.log(`Priority batch missing TSV: ${priorityMissingTsvPath}`);
  }

  await fs.writeFile(coverageJsonPath, JSON.stringify(report, null, 2), "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
