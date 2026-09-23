const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// 长期成长账本的接口级测试：用独立的临时库，绝不碰 backend/data/trivia.db。
const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "growth-progress.test.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;

const app = require("../src/app");
const { closeDatabaseConnection, createDatabaseConnection, dbPath, run } = require("../src/db/database");

let server = null;
let baseUrl = "";

// 接口只认“服务器本地今天”，所以测试里的日期一律相对今天算，不写死某一天。
function getLocalDateKey(offsetDays = 0) {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

const TODAY = getLocalDateKey(0);
const YESTERDAY = getLocalDateKey(-1);
const TOMORROW = getLocalDateKey(1);

function getCookieHeader(response) {
  const rawSetCookie = response.headers.get("set-cookie");

  if (!rawSetCookie) {
    return "";
  }

  return rawSetCookie.split(";")[0];
}

async function readJson(response) {
  return response.json();
}

async function getGrowthProgress(cookieHeader = "") {
  return fetch(`${baseUrl}/api/growth-progress`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {}
  });
}

async function claimDailyChest(dateKey, cookieHeader = "") {
  return fetch(`${baseUrl}/api/growth-progress/daily-chest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    },
    body: JSON.stringify({ dateKey })
  });
}

async function readStampCount(cookieHeader = "") {
  const payload = await readJson(await getGrowthProgress(cookieHeader));

  return payload.growthProgress.totalDailyChests;
}

test.before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
    server.on("error", reject);
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  for (const suffix of ["", "-wal", "-shm"]) {
    const filePath = `${dbPath}${suffix}`;

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
});

test("growth progress starts empty for a brand new profile", async () => {
  const response = await getGrowthProgress();

  assert.equal(response.status, 200);

  const payload = await readJson(response);

  assert.equal(payload.growthProgress.version, 1);
  assert.equal(payload.growthProgress.totalDailyChests, 0);
  assert.deepEqual(payload.growthProgress.dailyClaims, {});
  assert.equal(payload.updatedAt, null);
});

test("daily chest claim adds exactly one exploration stamp for today", async () => {
  const claimResponse = await claimDailyChest(TODAY);

  assert.equal(claimResponse.status, 200);

  const cookieHeader = getCookieHeader(claimResponse);
  assert.ok(cookieHeader.includes("wonder_trivia_profile="));

  const claimPayload = await readJson(claimResponse);

  assert.equal(claimPayload.alreadyClaimed, false);
  assert.equal(claimPayload.dateKey, TODAY);
  assert.equal(claimPayload.growthProgress.totalDailyChests, 1);
  assert.ok(claimPayload.growthProgress.dailyClaims[TODAY].claimedAt);
  assert.equal(Object.keys(claimPayload.growthProgress.dailyClaims).length, 1);

  // 同一天再读一次：状态必须还在（刷新页面后已领取状态仍然存在）。
  const getPayload = await readJson(await getGrowthProgress(cookieHeader));

  assert.equal(getPayload.growthProgress.totalDailyChests, 1);
  assert.ok(getPayload.growthProgress.dailyClaims[TODAY].claimedAt);
});

test("claiming the same local day twice never increases the stamp count", async () => {
  const firstResponse = await claimDailyChest(TODAY);
  const cookieHeader = getCookieHeader(firstResponse);
  const firstPayload = await readJson(firstResponse);

  assert.equal(firstPayload.growthProgress.totalDailyChests, 1);

  // 连续重复请求同一个 dateKey，包括并发发起的两次。
  const repeatResponses = await Promise.all([
    claimDailyChest(TODAY, cookieHeader),
    claimDailyChest(TODAY, cookieHeader)
  ]);

  for (const repeatResponse of repeatResponses) {
    assert.equal(repeatResponse.status, 200);

    const repeatPayload = await readJson(repeatResponse);

    assert.equal(repeatPayload.alreadyClaimed, true);
    assert.equal(repeatPayload.growthProgress.totalDailyChests, 1);
  }

  const getPayload = await readJson(await getGrowthProgress(cookieHeader));

  assert.equal(getPayload.growthProgress.totalDailyChests, 1);
  assert.equal(Object.keys(getPayload.growthProgress.dailyClaims).length, 1);
});

test("a future date key is rejected and never creates a stamp", async () => {
  // 明天、下个月、明年：都不允许提前把还没到的日子领掉。
  for (const futureDateKey of [TOMORROW, getLocalDateKey(30), getLocalDateKey(365)]) {
    const response = await claimDailyChest(futureDateKey);

    assert.equal(response.status, 400, `${futureDateKey} 不应该被接受`);

    const payload = await readJson(response);

    assert.ok(payload.message.includes("只能领取今天"));
  }

  assert.equal(await readStampCount(), 0);
});

test("a past date key is rejected too", async () => {
  // 过去的日子也补不回来：否则连续提交历史 dateKey 一样能刷印章。
  for (const pastDateKey of [YESTERDAY, getLocalDateKey(-30)]) {
    const response = await claimDailyChest(pastDateKey);

    assert.equal(response.status, 400, `${pastDateKey} 不应该被接受`);
  }

  assert.equal(await readStampCount(), 0);
});

test("spamming many different date keys cannot inflate the stamp count", async () => {
  const firstResponse = await claimDailyChest(TODAY);
  const cookieHeader = getCookieHeader(firstResponse);

  await readJson(firstResponse);
  assert.equal(await readStampCount(cookieHeader), 1);

  // 前后各 90 天，一个不落全部提交：全部被拒，累计数停在 1。
  const offsets = [];

  for (let offset = -90; offset <= 90; offset += 1) {
    if (offset !== 0) {
      offsets.push(offset);
    }
  }

  const sprayResponses = await Promise.all(
    offsets.map((offset) => claimDailyChest(getLocalDateKey(offset), cookieHeader))
  );

  for (const response of sprayResponses) {
    assert.equal(response.status, 400);
  }

  assert.equal(await readStampCount(cookieHeader), 1);

  // 今天再领一次也只是幂等返回，不会变成 2。
  const repeatPayload = await readJson(await claimDailyChest(TODAY, cookieHeader));

  assert.equal(repeatPayload.alreadyClaimed, true);
  assert.equal(await readStampCount(cookieHeader), 1);
});

test("growth progress is isolated per profile", async () => {
  const firstResponse = await claimDailyChest(TODAY);
  const firstCookie = getCookieHeader(firstResponse);

  await readJson(firstResponse);

  const secondProfilePayload = await readJson(await getGrowthProgress());

  assert.equal(secondProfilePayload.growthProgress.totalDailyChests, 0);
  assert.deepEqual(secondProfilePayload.growthProgress.dailyClaims, {});

  const firstProfilePayload = await readJson(await getGrowthProgress(firstCookie));

  assert.equal(firstProfilePayload.growthProgress.totalDailyChests, 1);
});

test("daily chest claim rejects a malformed date key", async () => {
  for (const malformedDateKey of ["2026/09/22", "today", "", "2026-9-2"]) {
    const response = await claimDailyChest(malformedDateKey);

    assert.equal(response.status, 400, `${JSON.stringify(malformedDateKey)} 不应该被接受`);

    const payload = await readJson(response);

    assert.ok(payload.message.includes("dateKey"));
  }

  assert.equal(await readStampCount(), 0);
});

test("stored growth progress is normalized on read", async () => {
  const db = createDatabaseConnection();

  try {
    run(
      db,
      `
        INSERT INTO growth_progress (profile_id, progress_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(profile_id) DO UPDATE SET
          progress_json = excluded.progress_json,
          updated_at = excluded.updated_at
      `,
      [
        "growth-normalize-profile",
        JSON.stringify({
          version: 99,
          totalDailyChests: 0,
          dailyClaims: {
            "2026-10-01": { claimedAt: "2026-10-01T08:00:00.000Z" },
            "2026-10-02": { claimedAt: "" },
            "not-a-date": { claimedAt: "2026-10-03T08:00:00.000Z" }
          }
        }),
        new Date().toISOString()
      ]
    );
  } finally {
    closeDatabaseConnection(db);
  }

  const payload = await readJson(
    await getGrowthProgress("wonder_trivia_profile=growth-normalize-profile")
  );

  assert.equal(payload.growthProgress.version, 1);
  // 合法 claim 只有一条，累计数不会低于真实条数。
  assert.equal(payload.growthProgress.totalDailyChests, 1);
  assert.deepEqual(Object.keys(payload.growthProgress.dailyClaims), ["2026-10-01"]);
});

test("growth progress does not touch challenge progress or study record book data", async () => {
  const challengeResponse = await fetch(`${baseUrl}/api/challenge-progress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      progressBook: {
        activeChapterId: "chapter-grade-3-upper",
        chapters: {
          "chapter-grade-3-upper": {
            unlockedStageIds: ["stage-1", "stage-2"],
            bestResults: {
              "stage-1": {
                starCount: 3,
                bestAccuracy: 100,
                attempts: 1,
                bestScore: 100,
                rewardEarned: true
              }
            }
          }
        }
      }
    })
  });
  const cookieHeader = getCookieHeader(challengeResponse);

  assert.equal(challengeResponse.status, 200);
  await readJson(challengeResponse);

  const studyResponse = await fetch(`${baseUrl}/api/study-record-book`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader
    },
    body: JSON.stringify({
      studyRecordBook: {
        questionRecords: {
          "7": {
            questionId: 7,
            snapshot: {
              id: 7,
              subject: "数学",
              grade: "三年级",
              semester: "上册",
              knowledgeTag: "乘法口诀",
              type: "单项选择",
              content: "6 × 7 等于多少？",
              difficulty: "1",
              options: [
                { key: "A", text: "42" },
                { key: "B", text: "48" }
              ]
            },
            correctAnswer: "A",
            attempts: 2,
            correctCount: 1,
            wrongCount: 1,
            lastAnsweredAt: "2026-09-22T08:45:00.000Z"
          }
        }
      }
    })
  });

  assert.equal(studyResponse.status, 200);
  await readJson(studyResponse);

  const claimResponse = await claimDailyChest(TODAY, cookieHeader);

  assert.equal(claimResponse.status, 200);
  assert.equal((await readJson(claimResponse)).growthProgress.totalDailyChests, 1);

  // 既有两路数据必须一字不变。
  const challengePayload = await readJson(
    await fetch(`${baseUrl}/api/challenge-progress`, { headers: { Cookie: cookieHeader } })
  );

  assert.equal(challengePayload.progressBook.activeChapterId, "chapter-grade-3-upper");
  assert.equal(
    challengePayload.progressBook.chapters["chapter-grade-3-upper"].bestResults["stage-1"].starCount,
    3
  );
  assert.equal(challengePayload.growthProgress, undefined);

  const studyPayload = await readJson(
    await fetch(`${baseUrl}/api/study-record-book`, { headers: { Cookie: cookieHeader } })
  );

  assert.equal(studyPayload.studyRecordBook.questionRecords["7"].attempts, 2);
  assert.equal(studyPayload.studyRecordBook.questionRecords["7"].correctAnswer, "A");
  assert.equal(studyPayload.growthProgress, undefined);

  // 三张表各自独立存在。
  const db = createDatabaseConnection();

  try {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);

    assert.ok(tableNames.includes("growth_progress"));
    assert.ok(tableNames.includes("challenge_progress"));
    assert.ok(tableNames.includes("study_record_book"));
  } finally {
    closeDatabaseConnection(db);
  }
});
