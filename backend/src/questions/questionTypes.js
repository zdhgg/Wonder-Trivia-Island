const { questions } = require("../../scripts/questionSeedData");

const ALLOWED_TYPES = Object.freeze(
  [...new Set(questions.map((question) => String(question?.type || "").trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "zh-Hans-CN")
  )
);

const ALLOWED_TYPE_SET = new Set(ALLOWED_TYPES);

module.exports = {
  ALLOWED_TYPES,
  ALLOWED_TYPE_SET
};
