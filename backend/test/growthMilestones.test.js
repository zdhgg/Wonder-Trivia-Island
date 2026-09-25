const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// 「她的成长」的接口级测试：用独立的临时库 + 独立的照片目录，
// 绝不碰 backend/data/trivia.db 与真实的 backend/data/growth-photos。
const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "growth-milestones.test.db");
// 每个测试文件用自己的照片目录：测试之间不互相删对方的文件。
const photosDir = path.join(tempDir, "growth-milestones-photos");

fs.rmSync(photosDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;
process.env.TRIVIA_PHOTOS_DIR = photosDir;

const app = require("../src/app");
const { closeDatabaseConnection, createDatabaseConnection, run } = require("../src/db/database");

const MILESTONES_PATH = "/api/growth-milestones";
const FOOTPRINTS_PATH = "/api/growth-footprints";
const CATEGORY_IDS = Object.freeze(["classroom", "school", "hobby", "growth", "special"]);
const MAX_TITLE_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;
const MAX_PHOTOS_PER_RECORD = 6;

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;

let server = null;
let baseUrl = "";

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

  return rawSetCookie ? rawSetCookie.split(";")[0] : "";
}

function buildHeaders(cookieHeader = "", withJsonBody = false) {
  return {
    ...(withJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {})
  };
}

async function requestJson(method, requestPath, { body, cookieHeader = "" } = {}) {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers: buildHeaders(cookieHeader, body !== undefined),
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  return { response, payload: await response.json().catch(() => null) };
}

async function createProfile() {
  const { response, payload } = await requestJson("GET", MILESTONES_PATH);
  const cookieHeader = getCookieHeader(response);

  assert.equal(response.status, 200);
  assert.ok(cookieHeader.includes("wonder_trivia_profile="));
  assert.ok(Array.isArray(payload.milestones));

  return cookieHeader;
}

async function listMilestones(cookieHeader) {
  const { response, payload } = await requestJson("GET", MILESTONES_PATH, { cookieHeader });

  assert.equal(response.status, 200);

  return payload.milestones;
}

async function createMilestone(cookieHeader, overrides = {}) {
  const { response, payload } = await requestJson("POST", MILESTONES_PATH, {
    cookieHeader,
    body: {
      occurredOn: TODAY,
      category: "classroom",
      title: "第一次自己举手回答问题",
      note: "",
      ...overrides
    }
  });

  assert.equal(response.status, 201, `创建失败：${JSON.stringify(payload)}`);

  return payload.milestone;
}

function readTableNames() {
  const db = createDatabaseConnection();

  try {
    return db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
  } finally {
    db.close();
  }
}

function readStoredPhotoFiles() {
  return fs.existsSync(photosDir) ? fs.readdirSync(photosDir) : [];
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
  await new Promise((resolve) => server.close(resolve));
  closeDatabaseConnection(createDatabaseConnection());
});

test.beforeEach(() => {
  const db = createDatabaseConnection();

  try {
    run(db, "DROP TABLE IF EXISTS growth_milestone_photos");
    run(db, "DROP TABLE IF EXISTS growth_milestones");
    run(db, "DROP TABLE IF EXISTS growth_footprint_photos");
    run(db, "DROP TABLE IF EXISTS growth_footprints");
    run(db, "DROP TABLE IF EXISTS growth_plans");
  } finally {
    db.close();
  }

  fs.rmSync(photosDir, { recursive: true, force: true });
});

test("a brand new profile has no growth records at all", async () => {
  const cookieHeader = await createProfile();

  assert.deepEqual(await listMilestones(cookieHeader), []);
});

test("a growth record keeps its date, category, title, note and no tags", async () => {
  const cookieHeader = await createProfile();
  const milestone = await createMilestone(cookieHeader, {
    occurredOn: YESTERDAY,
    category: "school",
    title: "参加了学校的合唱比赛",
    note: "站第二排，唱完自己先鼓起掌来。"
  });

  assert.equal(milestone.occurredOn, YESTERDAY);
  assert.equal(milestone.category, "school");
  assert.equal(milestone.title, "参加了学校的合唱比赛");
  assert.equal(milestone.note, "站第二排，唱完自己先鼓起掌来。");
  assert.deepEqual(milestone.photos, []);
  // 成长记录没有 tags 这个概念（那是「我们一起」的标记方式）。
  assert.equal(milestone.tags, undefined);
  assert.deepEqual(Object.keys(milestone).sort(), [
    "category",
    "createdAt",
    "id",
    "note",
    "occurredOn",
    "photos",
    "title",
    "updatedAt"
  ]);
});

test("every growth category id is accepted", async () => {
  const cookieHeader = await createProfile();

  for (const category of CATEGORY_IDS) {
    await createMilestone(cookieHeader, { category, title: `一条记录（${category}）` });
  }

  assert.equal((await listMilestones(cookieHeader)).length, CATEGORY_IDS.length);
});

test("the list is ordered by date desc and then id desc", async () => {
  const cookieHeader = await createProfile();

  await createMilestone(cookieHeader, { occurredOn: getLocalDateKey(-30), title: "一个月前" });
  const newest = await createMilestone(cookieHeader, { occurredOn: TODAY, title: "今天" });
  const secondNewest = await createMilestone(cookieHeader, { occurredOn: TODAY, title: "也是今天" });

  const milestones = await listMilestones(cookieHeader);

  assert.deepEqual(milestones.map((item) => item.id), [secondNewest.id, newest.id, milestones[2].id]);
  assert.deepEqual(milestones.map((item) => item.title), ["也是今天", "今天", "一个月前"]);
});

test("invalid input is rejected with 400 and nothing is stored", async () => {
  const cookieHeader = await createProfile();
  const invalidBodies = [
    { occurredOn: "", category: "classroom", title: "标题" },
    { occurredOn: TOMORROW, category: "classroom", title: "标题" },
    { occurredOn: "2026-02-30", category: "classroom", title: "标题" },
    { occurredOn: TODAY, category: "nope", title: "标题" },
    { occurredOn: TODAY, category: "classroom", title: "" },
    { occurredOn: TODAY, category: "classroom", title: "字".repeat(MAX_TITLE_LENGTH + 1) },
    { occurredOn: TODAY, category: "classroom", title: "标题", note: "记".repeat(MAX_NOTE_LENGTH + 1) }
  ];

  for (const body of invalidBodies) {
    const { response } = await requestJson("POST", MILESTONES_PATH, { cookieHeader, body });

    assert.equal(response.status, 400, `应该拒绝：${JSON.stringify(body)}`);
  }

  assert.deepEqual(await listMilestones(cookieHeader), []);
});

test("editing only touches the fields that were sent", async () => {
  const cookieHeader = await createProfile();
  const milestone = await createMilestone(cookieHeader, { category: "hobby" });
  const { response, payload } = await requestJson("PATCH", `${MILESTONES_PATH}/${milestone.id}`, {
    cookieHeader,
    body: { title: "改过的标题" }
  });

  assert.equal(response.status, 200);
  assert.equal(payload.milestone.title, "改过的标题");
  // 没传的字段保持原值。
  assert.equal(payload.milestone.category, "hobby");
  assert.equal(payload.milestone.occurredOn, TODAY);
});

test("a malformed, missing or foreign id never looks like success", async () => {
  const cookieHeader = await createProfile();
  const milestone = await createMilestone(cookieHeader);

  const malformed = await requestJson("PATCH", `${MILESTONES_PATH}/abc`, { cookieHeader, body: { title: "标题" } });
  const missing = await requestJson("PATCH", `${MILESTONES_PATH}/999999`, { cookieHeader, body: { title: "标题" } });
  const stranger = await createProfile();
  const foreign = await requestJson("DELETE", `${MILESTONES_PATH}/${milestone.id}`, { cookieHeader: stranger });

  assert.equal(malformed.response.status, 400);
  assert.equal(missing.response.status, 404);
  assert.equal(foreign.response.status, 404);
  assert.equal((await listMilestones(cookieHeader)).length, 1);
});

test("deleting a record removes it for good", async () => {
  const cookieHeader = await createProfile();
  const milestone = await createMilestone(cookieHeader);
  const { response, payload } = await requestJson("DELETE", `${MILESTONES_PATH}/${milestone.id}`, { cookieHeader });

  assert.equal(response.status, 200);
  assert.equal(payload.deletedId, milestone.id);
  assert.deepEqual(await listMilestones(cookieHeader), []);

  const again = await requestJson("DELETE", `${MILESTONES_PATH}/${milestone.id}`, { cookieHeader });

  assert.equal(again.response.status, 404);
});

test("records are isolated per profile", async () => {
  const firstProfile = await createProfile();
  const secondProfile = await createProfile();

  await createMilestone(firstProfile, { title: "只属于第一个 profile" });

  assert.equal((await listMilestones(firstProfile)).length, 1);
  assert.deepEqual(await listMilestones(secondProfile), []);
});

test("photos can be attached on create and are served back", async () => {
  const cookieHeader = await createProfile();
  const milestone = await createMilestone(cookieHeader, { photos: [TINY_PNG_DATA_URL] });

  assert.equal(milestone.photos.length, 1);

  const [photo] = milestone.photos;

  assert.equal(photo.url, `/api/growth-milestones/photos/${photo.id}`);
  assert.equal(readStoredPhotoFiles().length, 1);

  const response = await fetch(`${baseUrl}${photo.url}`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(Buffer.from(await response.arrayBuffer()).toString("base64"), TINY_PNG_BASE64);
});

test("photos can be added and removed one at a time on an existing record", async () => {
  const cookieHeader = await createProfile();
  const milestone = await createMilestone(cookieHeader);
  const added = await requestJson("POST", `${MILESTONES_PATH}/${milestone.id}/photos`, {
    cookieHeader,
    body: { dataUrl: TINY_PNG_DATA_URL }
  });

  assert.equal(added.response.status, 201);

  const photoId = added.payload.photo.id;

  assert.equal((await listMilestones(cookieHeader))[0].photos.length, 1);

  const removed = await requestJson("DELETE", `${MILESTONES_PATH}/${milestone.id}/photos/${photoId}`, { cookieHeader });

  assert.equal(removed.response.status, 200);
  assert.equal((await listMilestones(cookieHeader))[0].photos.length, 0);
  assert.equal(readStoredPhotoFiles().length, 0);
  assert.equal((await fetch(`${baseUrl}/api/growth-milestones/photos/${photoId}`)).status, 404);
});

test("photo limits and invalid photos are rejected, and nothing is written", async () => {
  const cookieHeader = await createProfile();
  const tooManyPhotos = Array.from({ length: MAX_PHOTOS_PER_RECORD + 1 }, () => TINY_PNG_DATA_URL);

  const tooMany = await requestJson("POST", MILESTONES_PATH, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "growth", title: "照片太多", photos: tooManyPhotos }
  });
  const invalid = await requestJson("POST", MILESTONES_PATH, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "growth", title: "不合法照片", photos: ["not-a-photo"] }
  });

  assert.equal(tooMany.response.status, 400);
  assert.equal(invalid.response.status, 400);
  assert.deepEqual(await listMilestones(cookieHeader), []);
  assert.equal(readStoredPhotoFiles().length, 0);
});

test("deleting a record deletes its photo files too", async () => {
  const cookieHeader = await createProfile();
  const milestone = await createMilestone(cookieHeader, { photos: [TINY_PNG_DATA_URL] });
  const photoUrl = milestone.photos[0].url;

  assert.equal(readStoredPhotoFiles().length, 1);

  await requestJson("DELETE", `${MILESTONES_PATH}/${milestone.id}`, { cookieHeader });

  assert.equal(readStoredPhotoFiles().length, 0);
  assert.equal((await fetch(`${baseUrl}${photoUrl}`)).status, 404);
});

test("growth records and shared footprints stay two separate lines", async () => {
  const cookieHeader = await createProfile();

  // 各写一条，各有各的照片。
  const milestone = await createMilestone(cookieHeader, { title: "她的事", photos: [TINY_PNG_DATA_URL] });
  const { response: footprintResponse } = await requestJson("POST", FOOTPRINTS_PATH, {
    cookieHeader,
    body: {
      occurredOn: TODAY,
      category: "explore",
      title: "我们一起做的事",
      note: "",
      tags: ["first"],
      photos: [TINY_PNG_DATA_URL]
    }
  });

  assert.equal(footprintResponse.status, 201);

  // 列表各回各的，互不串线。
  const { payload: footprintPayload } = await requestJson("GET", FOOTPRINTS_PATH, { cookieHeader });

  assert.equal(footprintPayload.footprints.length, 1);
  assert.equal(footprintPayload.footprints[0].title, "我们一起做的事");
  assert.equal((await listMilestones(cookieHeader)).length, 1);

  // 两条线各有自己的表和照片表。
  const tableNames = readTableNames();

  for (const expectedTable of [
    "growth_milestones",
    "growth_milestone_photos",
    "growth_footprints",
    "growth_footprint_photos"
  ]) {
    assert.ok(tableNames.includes(expectedTable), `缺少 ${expectedTable}`);
  }

  // 删掉成长记录，不影响「我们一起」那条。
  await requestJson("DELETE", `${MILESTONES_PATH}/${milestone.id}`, { cookieHeader });

  assert.deepEqual(await listMilestones(cookieHeader), []);

  const { payload: afterDelete } = await requestJson("GET", FOOTPRINTS_PATH, { cookieHeader });

  assert.equal(afterDelete.footprints.length, 1);
  // 两张照片各删各的，还剩「我们一起」那张。
  assert.equal(readStoredPhotoFiles().length, 1);
});

test("growth records never touch progress, plans or the study record book", async () => {
  const cookieHeader = await createProfile();

  await createMilestone(cookieHeader);

  const tableNames = readTableNames();

  for (const untouchedTable of ["growth_progress", "challenge_progress", "study_record_book", "growth_plans"]) {
    assert.ok(!tableNames.includes(untouchedTable), `不应该创建 ${untouchedTable}`);
  }
});
