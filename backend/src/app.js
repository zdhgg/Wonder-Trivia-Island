const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const { closeDatabaseConnection, createDatabaseConnection, initializeDatabase } = require("./db/database");
const { ensureQuestionsTable } = require("./questions/repository");
const challengeProgressRouter = require("./routes/challengeProgress");
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
app.use(express.json({ limit: "2mb" }));

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
