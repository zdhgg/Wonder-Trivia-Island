const { loadRootEnv } = require("../../scripts/loadRootEnv");
const app = require("./app");

const explicitApiPort = Object.prototype.hasOwnProperty.call(process.env, "API_PORT") ? process.env.API_PORT : "";
const explicitPort = Object.prototype.hasOwnProperty.call(process.env, "PORT") ? process.env.PORT : "";

loadRootEnv();

function parsePort(rawValue) {
  const parsedPort = Number.parseInt(String(rawValue || ""), 10);

  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : null;
}

const PORT =
  parsePort(explicitApiPort) ??
  parsePort(explicitPort) ??
  parsePort(process.env.API_PORT) ??
  parsePort(process.env.PORT) ??
  3000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
