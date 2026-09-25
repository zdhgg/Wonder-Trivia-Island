const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const { closeDatabaseConnection, createDatabaseConnection, initializeDatabase } = require("./db/database");
const { ensureQuestionsTable } = require("./questions/repository");
const challengeProgressRouter = require("./routes/challengeProgress");
const growthFootprintsRouter = require("./routes/growthFootprints");
const growthPlansRouter = require("./routes/growthPlans");
const growthProgressRouter = require("./routes/growthProgress");
const questionsRouter = require("./routes/questions");
const studyRecordBookRouter = require("./routes/studyRecordBook");

initializeDatabase((db) => {
  ensureQuestionsTable(db);
});

const app = express();
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
const allowAllCorsOrigins = corsOrigins.includes("*");

function parseCorsOrigins(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function shouldAllowCorsOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowAllCorsOrigins) {
    return true;
  }

  return corsOrigins.includes(origin);
}

function attachDatabaseConnection(req, res, next) {
  const db = createDatabaseConnection();
  let isClosed = false;

  function closeConnection() {
    if (isClosed) {
      return;
    }

    isClosed = true;
    closeDatabaseConnection(db);
  }

  req.db = db;
  res.on("finish", closeConnection);
  res.on("close", closeConnection);
  next();
}

if (allowAllCorsOrigins || corsOrigins.length > 0) {
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, shouldAllowCorsOrigin(origin));
      }
    })
  );
}
app.use(
  morgan("dev", {
    skip: () => process.env.NODE_ENV === "test"
  })
);
// 照片以 data URL 随记录一起提交（前端已经压到 1280px），
// 一条记录最多 6 张，所以这里给到 12mb：够用，但仍能挡住明显异常的请求体。
app.use(express.json({ limit: "12mb" }));

app.get("/health", (req, res) => {
  res.json({
    message: "Wonder Trivia Island API is running."
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "Wonder Trivia Island API is running."
  });
});

app.use("/api/questions", attachDatabaseConnection, questionsRouter);
app.use("/api/challenge-progress", challengeProgressRouter);
app.use("/api/growth-progress", growthProgressRouter);
app.use("/api/growth-footprints", growthFootprintsRouter);
app.use("/api/growth-plans", growthPlansRouter);
app.use("/api/study-record-book", studyRecordBookRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found."
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: "服务器开小差了，请确认已经先执行 npm run init-db。"
  });
});

module.exports = app;
