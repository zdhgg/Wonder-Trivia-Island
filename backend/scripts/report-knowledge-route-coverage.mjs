import { createRequire } from "node:module";
import { HENAN_GRADE_ONE_SYSTEMATIC_SECTIONS } from "../../frontend/src/data/henanGradeOneKnowledge.js";
import { HENAN_GRADE_FOUR_SYSTEMATIC_SECTIONS } from "../../frontend/src/data/henanGradeFourKnowledge.js";
import { HENAN_GRADE_FIVE_SYSTEMATIC_SECTIONS } from "../../frontend/src/data/henanGradeFiveKnowledge.js";
import { HENAN_GRADE_SIX_SYSTEMATIC_SECTIONS } from "../../frontend/src/data/henanGradeSixKnowledge.js";
import { HENAN_GRADE_TWO_THREE_SYSTEMATIC_SECTIONS } from "../../frontend/src/data/henanGradeTwoThreeKnowledge.js";

const require = createRequire(import.meta.url);
const { closeDatabaseConnection, createDatabaseConnection } = require("../src/db/database");
const { getKnowledgeTagSearchTerms } = require("../src/questions/knowledgeTagAliases");

const ALL_SECTIONS = Object.freeze([
  ...HENAN_GRADE_ONE_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_TWO_THREE_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_FOUR_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_FIVE_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_SIX_SYSTEMATIC_SECTIONS
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function buildScopeKey(grade, semester, subject) {
  return [grade, semester, subject].join("||");
}

function parseGradeFilter(args) {
  const directGrades = args
    .filter((value) => !String(value || "").startsWith("--"))
    .map((value) => normalizeText(value))
    .filter(Boolean);

  if (directGrades.length > 0) {
    return new Set(directGrades);
  }

  return null;
}

function parseMinCount(args) {
  const rawArg = args.find((value) => String(value || "").startsWith("--min-count="));

  if (!rawArg) {
    return 0;
  }

  const parsed = Number.parseInt(String(rawArg).split("=")[1] || "", 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function buildScopeRows(db) {
  const rows = db
    .prepare(
      `
        SELECT
          grade,
          semester,
          subject,
          TRIM(COALESCE(knowledgeTag, '')) AS knowledgeTag,
          TRIM(COALESCE(type, '')) AS type
        FROM questions
      `
    )
    .all();
  const scopeMap = new Map();

  for (const row of rows) {
    const key = buildScopeKey(row.grade, row.semester, row.subject);

    if (!scopeMap.has(key)) {
      scopeMap.set(key, []);
    }

    scopeMap.get(key).push(row);
  }

  return scopeMap;
}

function buildUniqueKnowledgeTags(subjectSection) {
  const uniqueTags = [];
  const seen = new Set();

  for (const module of subjectSection.modules || []) {
    for (const tag of module.knowledgeTags || []) {
      const normalizedTag = normalizeText(tag);

      if (!normalizedTag || seen.has(normalizedTag)) {
        continue;
      }

      seen.add(normalizedTag);
      uniqueTags.push(normalizedTag);
    }
  }

  return uniqueTags;
}

function countMatches(rows, tag) {
  const searchTerms = getKnowledgeTagSearchTerms(tag);

  return rows.filter((row) => searchTerms.includes(row.knowledgeTag) || searchTerms.includes(row.type)).length;
}

function formatCoverageLine(section, subjectSection, rows, coveredCount, totalCount) {
  const questionCount = rows.length;
  const coverageText = `${coveredCount}/${totalCount}`;
  const questionText = questionCount > 0 ? `${questionCount} 题` : "题库空白";

  return `[${section.grade}${section.semester}${subjectSection.subject}] ${coverageText} · ${questionText}`;
}

async function main() {
  const args = process.argv.slice(2);
  const gradeFilter = parseGradeFilter(args);
  const minCount = parseMinCount(args);
  const db = createDatabaseConnection();

  try {
    const scopeMap = buildScopeRows(db);
    const sections = gradeFilter
      ? ALL_SECTIONS.filter((section) => gradeFilter.has(section.grade))
      : ALL_SECTIONS;
    const emptyScopes = [];
    let totalTags = 0;
    let coveredTags = 0;

    for (const section of sections) {
      for (const subjectSection of section.subjects || []) {
        const scopeKey = buildScopeKey(section.grade, section.semester, subjectSection.subject);
        const rows = scopeMap.get(scopeKey) || [];
        const tags = buildUniqueKnowledgeTags(subjectSection);
        const tagCounts = tags.map((tag) => ({
          tag,
          count: countMatches(rows, tag)
        }));
        const uncoveredTags = tagCounts.filter((item) => item.count === 0).map((item) => item.tag);
        const lowSupplyTags =
          minCount > 0
            ? tagCounts.filter((item) => item.count > 0 && item.count < minCount)
            : [];

        totalTags += tags.length;
        coveredTags += tags.length - uncoveredTags.length;

        if (rows.length === 0) {
          emptyScopes.push(`${section.grade}${section.semester}${subjectSection.subject}`);
        }

        console.log(formatCoverageLine(section, subjectSection, rows, tags.length - uncoveredTags.length, tags.length));

        if (uncoveredTags.length > 0) {
          console.log(`未覆盖: ${uncoveredTags.join(" | ")}`);
        }

        if (lowSupplyTags.length > 0) {
          console.log(`题量偏低: ${lowSupplyTags.map((item) => `${item.tag}(${item.count})`).join(" | ")}`);
        }
      }
    }

    console.log("");
    console.log(`总覆盖: ${coveredTags}/${totalTags}`);

    if (emptyScopes.length > 0) {
      console.log(`空白范围: ${emptyScopes.join(" | ")}`);
    }
  } finally {
    closeDatabaseConnection(db);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
