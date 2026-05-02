const fs = require("fs");
const path = require("path");

const ROOT_ENV_PATH = path.resolve(__dirname, "..", ".env");

function stripWrappingQuotes(value) {
  if (value.length >= 2) {
    const firstChar = value[0];
    const lastChar = value[value.length - 1];

    if ((firstChar === `"` && lastChar === `"`) || (firstChar === `'` && lastChar === `'`)) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function parseEnvFileContents(fileContents = "") {
  return String(fileContents || "")
    .split(/\r?\n/)
    .reduce((entries, line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return entries;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex <= 0) {
        return entries;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

      if (!key) {
        return entries;
      }

      entries[key] = stripWrappingQuotes(rawValue);
      return entries;
    }, {});
}

function loadRootEnv(targetEnv = process.env) {
  if (!fs.existsSync(ROOT_ENV_PATH)) {
    return {};
  }

  const parsedEnv = parseEnvFileContents(fs.readFileSync(ROOT_ENV_PATH, "utf8"));

  for (const [key, value] of Object.entries(parsedEnv)) {
    if (targetEnv[key] === undefined) {
      targetEnv[key] = value;
    }
  }

  return parsedEnv;
}

module.exports = {
  ROOT_ENV_PATH,
  loadRootEnv,
  parseEnvFileContents
};
