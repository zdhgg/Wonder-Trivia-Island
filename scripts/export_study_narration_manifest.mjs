import { buildStudyNarrationManifest, writeStudyNarrationManifestFiles } from "./lib/study_narration_manifest.mjs";

async function main() {
  const manifest = await buildStudyNarrationManifest();
  const { jsonPath, tsvPath, audioIndexModulePath, packManifestPath, packIndexModulePath } =
    await writeStudyNarrationManifestFiles(manifest);

  console.log(`Exported study narration manifest: ${manifest.summary.lessonCount} lessons / ${manifest.summary.clipCount} clips`);
  console.log(
    `Custom narration: ${manifest.summary.customNarrationCount}, existing audio assets: ${manifest.summary.audioAssetCount}`
  );
  console.log(`JSON: ${jsonPath}`);
  console.log(`TSV: ${tsvPath}`);
  console.log(`Audio index module: ${audioIndexModulePath}`);
  console.log(`Pack manifest: ${packManifestPath}`);
  console.log(`Pack index module: ${packIndexModulePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
