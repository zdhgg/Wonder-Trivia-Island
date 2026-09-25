const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// 共同成长足迹的接口级测试：用独立的临时库，绝不碰 backend/data/trivia.db。
const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "growth-footprints.test.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;

const app = require("../src/app");
const { closeDatabaseConnection, createDatabaseConnection, dbPath, run } = require("../src/db/database");

const API_PATH = "/api/growth-footprints";
const MAX_TITLE_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;
const CATEGORY_IDS = Object.freeze(["learning", "explore", "outdoor", "create", "together"]);
const TAG_IDS = Object.freeze(["first", "special", "coop", "discover", "brave"]);

let server = null;
let baseUrl = "";

// 未来日期是相对「服务器本地今天」判断的，所以测试日期一律相对今天算，不写死某一天。
function getLocalDateKey(offsetDays = 0) {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

const TODAY = getLocalDateKey(0);
const TOMORROW = getLocalDateKey(1);
// 排序用例用的三个「过去的日子」：相距 600 天 / 365 天，保证跨年又跨月。
const ORDERING_DAY_OLDEST = getLocalDateKey(-1000);
const ORDERING_DAY_MIDDLE = getLocalDateKey(-400);
const ORDERING_DAY_NEWEST = getLocalDateKey(-35);

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

function buildHeaders(cookieHeader = "", withJsonBody = false) {
  return {
    ...(withJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {})
  };
}

async function requestList(cookieHeader = "") {
  return fetch(`${baseUrl}${API_PATH}`, {
    headers: buildHeaders(cookieHeader)
  });
}

async function requestCreate(body, cookieHeader = "") {
  return fetch(`${baseUrl}${API_PATH}`, {
    method: "POST",
    headers: buildHeaders(cookieHeader, true),
    body: JSON.stringify(body)
  });
}

async function requestPatch(footprintId, body, cookieHeader = "") {
  return fetch(`${baseUrl}${API_PATH}/${footprintId}`, {
    method: "PATCH",
    headers: buildHeaders(cookieHeader, true),
    body: JSON.stringify(body)
  });
}

async function requestDelete(footprintId, cookieHeader = "") {
  return fetch(`${baseUrl}${API_PATH}/${footprintId}`, {
    method: "DELETE",
    headers: buildHeaders(cookieHeader)
  });
}

// 一个全新的 profile：GET 一次就会拿到服务端新发的 cookie。
async function createProfile() {
  const response = await requestList();
  const cookieHeader = getCookieHeader(response);

  assert.equal(response.status, 200);
  assert.ok(cookieHeader.includes("wonder_trivia_profile="));
  await readJson(response);

  return cookieHeader;
}

async function listFootprints(cookieHeader) {
  const response = await requestList(cookieHeader);

  assert.equal(response.status, 200);

  const payload = await readJson(response);

  assert.ok(Array.isArray(payload.footprints));
  return payload.footprints;
}

// 建一条足迹并返回服务端返回的那条记录（默认日期用今天）。
async function createFootprint(cookieHeader, overrides = {}) {
  const response = await requestCreate(
    {
      occurredOn: TODAY,
      category: "explore",
      title: "一起做点什么",
      ...overrides
    },
    cookieHeader
  );

  assert.equal(response.status, 201, `创建失败：${await response.clone().text()}`);

  const payload = await readJson(response);

  return payload.footprint;
}

function readTableNames() {
  const db = createDatabaseConnection();

  try {
    return db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
  } finally {
    closeDatabaseConnection(db);
  }
}

async function readJsonFrom(path, cookieHeader = "") {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: buildHeaders(cookieHeader)
  });

  assert.equal(response.status, 200);
  return readJson(response);
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

// ---------------------------------------------------------------------------
// 1. 新 profile 的列表是空的
// ---------------------------------------------------------------------------

test("a brand new profile has no footprints", async () => {
  const response = await requestList();

  assert.equal(response.status, 200);

  const payload = await readJson(response);

  assert.deepEqual(payload.footprints, []);
});

// ---------------------------------------------------------------------------
// 2. 正常创建
// ---------------------------------------------------------------------------

test("creating a footprint returns 201 with server generated id and timestamps", async () => {
  const cookieHeader = await createProfile();
  const beforeCreate = Date.now();
  const response = await requestCreate(
    {
      occurredOn: TODAY,
      category: "explore",
      title: "第一次一起做火山实验",
      note: "一开始还有点担心会喷得到处都是，\n后来自己加了小苏打，看到冒泡特别开心。",
      tags: ["first", "coop"]
    },
    cookieHeader
  );

  assert.equal(response.status, 201);

  const { footprint } = await readJson(response);

  assert.ok(Number.isInteger(footprint.id));
  assert.ok(footprint.id > 0);
  assert.equal(footprint.occurredOn, TODAY);
  assert.equal(footprint.category, "explore");
  assert.equal(footprint.title, "第一次一起做火山实验");
  // 换行必须原样保留：这不是要清洗的文本，是真实记录。
  assert.equal(
    footprint.note,
    "一开始还有点担心会喷得到处都是，\n后来自己加了小苏打，看到冒泡特别开心。"
  );
  assert.deepEqual(footprint.tags, ["first", "coop"]);
  // 时间戳由服务端生成，而且和 occurredOn 是两个不同概念。
  assert.ok(Number.isFinite(Date.parse(footprint.createdAt)));
  assert.ok(Number.isFinite(Date.parse(footprint.updatedAt)));
  assert.ok(Date.parse(footprint.createdAt) >= beforeCreate - 1000);
  assert.equal(footprint.createdAt, footprint.updatedAt);

  // 同一天可以有多条：第二天的记录不会覆盖第一天。
  const second = await createFootprint(cookieHeader, { title: "同一天的第二件事" });

  assert.notEqual(second.id, footprint.id);

  const footprints = await listFootprints(cookieHeader);

  assert.equal(footprints.length, 2);
});

// ---------------------------------------------------------------------------
// 3. 允许补录历史日期  /  4. 拒绝未来日期
// ---------------------------------------------------------------------------

test("a historical date can be backfilled, including months ago", async () => {
  const cookieHeader = await createProfile();

  for (const offsetDays of [-1, -30, -200, -1500]) {
    const occurredOn = getLocalDateKey(offsetDays);
    const response = await requestCreate(
      { occurredOn, category: "together", title: `补录 ${occurredOn}` },
      cookieHeader
    );

    assert.equal(response.status, 201, `${occurredOn} 应该允许补录`);
    assert.equal((await readJson(response)).footprint.occurredOn, occurredOn);
  }

  assert.equal((await listFootprints(cookieHeader)).length, 4);
});

test("a future date is rejected and never creates a footprint", async () => {
  const cookieHeader = await createProfile();

  for (const futureDateKey of [TOMORROW, getLocalDateKey(30), getLocalDateKey(365)]) {
    const response = await requestCreate(
      { occurredOn: futureDateKey, category: "outdoor", title: "还没发生的事" },
      cookieHeader
    );

    assert.equal(response.status, 400, `${futureDateKey} 不应该被接受`);

    const payload = await readJson(response);

    assert.ok(payload.message.includes("不能晚于今天"), payload.message);
  }

  assert.deepEqual(await listFootprints(cookieHeader), []);
});

// ---------------------------------------------------------------------------
// 5. 拒绝不存在的日期  /  6. 拒绝错误格式
// ---------------------------------------------------------------------------

test("a date that does not exist on the calendar is rejected", async () => {
  const cookieHeader = await createProfile();

  // 2026-02-30 / 2026-13-01 / 2027-04-31 格式都对但不是真实日历日。
  // 关键：不能被静默归一化成 3 月 2 日 / 次年 1 月 1 日。
  for (const impossibleDateKey of ["2026-02-30", "2026-13-01", "2027-04-31", "2026-00-10", "2026-01-00"]) {
    const response = await requestCreate(
      { occurredOn: impossibleDateKey, category: "create", title: "不存在的日子" },
      cookieHeader
    );

    assert.equal(response.status, 400, `${impossibleDateKey} 不应该被接受`);

    const payload = await readJson(response);

    assert.ok(payload.message.includes("真实日期"), payload.message);
  }

  // 闰年 2 月 29 日是真实存在的日期，必须被接受（不是「非法日期」）。
  const leapDayResponse = await requestCreate(
    { occurredOn: "2024-02-29", category: "create", title: "闰日那天" },
    cookieHeader
  );

  assert.equal(leapDayResponse.status, 201);

  // 非闰年 2 月 29 日不存在，必须被拒绝。
  const invalidLeapDayResponse = await requestCreate(
    { occurredOn: "2026-02-29", category: "create", title: "非闰年的 2 月 29 日" },
    cookieHeader
  );

  assert.equal(invalidLeapDayResponse.status, 400);

  assert.deepEqual(
    (await listFootprints(cookieHeader)).map((footprint) => footprint.occurredOn),
    ["2024-02-29"]
  );
});

test("a malformed date string is rejected", async () => {
  const cookieHeader = await createProfile();

  for (const malformedDateKey of ["2026/10/18", "2026-10-8", "20261018", "2026-10-18T00:00:00.000Z", "", "today", null]) {
    const response = await requestCreate(
      { occurredOn: malformedDateKey, category: "learning", title: "格式不对" },
      cookieHeader
    );

    assert.equal(response.status, 400, `${JSON.stringify(malformedDateKey)} 不应该被接受`);
  }

  // occurredOn 缺失同样是 400（必填字段）。
  const missingDateResponse = await requestCreate({ category: "learning", title: "没有日期" }, cookieHeader);

  assert.equal(missingDateResponse.status, 400);
  assert.deepEqual(await listFootprints(cookieHeader), []);
});

// ---------------------------------------------------------------------------
// 7. title 边界  /  8. note 边界
// ---------------------------------------------------------------------------

test("title length boundaries are enforced", async () => {
  const cookieHeader = await createProfile();

  // 0：空串 / 纯空白 / 缺失 都是 400
  for (const emptyTitle of ["", "   ", "\n", null]) {
    const response = await requestCreate({ occurredOn: TODAY, category: "learning", title: emptyTitle }, cookieHeader);

    assert.equal(response.status, 400, `title=${JSON.stringify(emptyTitle)} 应该被拒绝`);
  }

  const missingTitleResponse = await requestCreate({ occurredOn: TODAY, category: "learning" }, cookieHeader);

  assert.equal(missingTitleResponse.status, 400);

  // 1：最小合法
  const shortest = await createFootprint(cookieHeader, { title: "字" });

  assert.equal(shortest.title.length, 1);

  // 40：边界内
  const longestAllowed = await createFootprint(cookieHeader, { title: "字".repeat(MAX_TITLE_LENGTH) });

  assert.equal(longestAllowed.title.length, MAX_TITLE_LENGTH);

  // 41：超出即拒绝，而且不能静默截断成 40
  const tooLongResponse = await requestCreate(
    { occurredOn: TODAY, category: "learning", title: "字".repeat(MAX_TITLE_LENGTH + 1) },
    cookieHeader
  );

  assert.equal(tooLongResponse.status, 400);
  assert.ok((await readJson(tooLongResponse)).message.includes("title"));

  const footprints = await listFootprints(cookieHeader);

  assert.equal(footprints.length, 2);
  assert.ok(footprints.every((footprint) => footprint.title.length <= MAX_TITLE_LENGTH));

  // 首尾空白被 trim（记录内容本身不被改写）
  const trimmed = await createFootprint(cookieHeader, { title: "  一起看星星  " });

  assert.equal(trimmed.title, "一起看星星");
});

test("note length boundaries are enforced", async () => {
  const cookieHeader = await createProfile();

  // 0：省略 / 空串 都合法，落库为 ''
  const omittedNote = await createFootprint(cookieHeader, { title: "没写记录" });

  assert.equal(omittedNote.note, "");

  const emptyNote = await createFootprint(cookieHeader, { title: "记录是空的", note: "" });

  assert.equal(emptyNote.note, "");

  // 500：边界内且一字不差
  const longestNote = "记".repeat(MAX_NOTE_LENGTH);
  const fullNote = await createFootprint(cookieHeader, { title: "记录很长", note: longestNote });

  assert.equal(fullNote.note.length, MAX_NOTE_LENGTH);
  assert.equal(fullNote.note, longestNote);

  // 501：拒绝，不截断
  const tooLongResponse = await requestCreate(
    { occurredOn: TODAY, category: "learning", title: "记录太长了", note: "记".repeat(MAX_NOTE_LENGTH + 1) },
    cookieHeader
  );

  assert.equal(tooLongResponse.status, 400);
  assert.ok((await readJson(tooLongResponse)).message.includes("note"));
});

// ---------------------------------------------------------------------------
// 9. 非法 category  /  10. tags 规则
// ---------------------------------------------------------------------------

test("only the five fixed categories are accepted", async () => {
  const cookieHeader = await createProfile();

  for (const category of CATEGORY_IDS) {
    const response = await requestCreate({ occurredOn: TODAY, category, title: `类别 ${category}` }, cookieHeader);

    assert.equal(response.status, 201, `${category} 应该是合法类别`);
  }

  // special 是标签，不是类别；未知类别一律 400。
  for (const invalidCategory of ["special", "study", "EXPLORE", "", "学习", null]) {
    const response = await requestCreate(
      { occurredOn: TODAY, category: invalidCategory, title: "类别不对" },
      cookieHeader
    );

    assert.equal(response.status, 400, `category=${JSON.stringify(invalidCategory)} 应该被拒绝`);

    const payload = await readJson(response);

    assert.ok(payload.message.includes("category"), payload.message);
  }

  const footprints = await listFootprints(cookieHeader);

  assert.deepEqual(
    footprints.map((footprint) => footprint.category).sort(),
    [...CATEGORY_IDS].sort()
  );
});

test("tags are whitelisted, deduplicated and always returned in fixed order", async () => {
  const cookieHeader = await createProfile();

  // [] 合法
  const emptyTags = await createFootprint(cookieHeader, { title: "没有标签", tags: [] });

  assert.deepEqual(emptyTags.tags, []);

  // 合法组合：客户端顺序不影响落库顺序（固定顺序 = TAG_IDS 顺序）
  const shuffled = await createFootprint(cookieHeader, {
    title: "标签乱序",
    tags: ["brave", "first", "discover"]
  });

  assert.deepEqual(shuffled.tags, ["first", "discover", "brave"]);

  // 重复 → 去重
  const duplicated = await createFootprint(cookieHeader, {
    title: "标签重复",
    tags: ["coop", "first", "coop", "first"]
  });

  assert.deepEqual(duplicated.tags, ["first", "coop"]);

  // 全部 5 个标签
  const allTags = await createFootprint(cookieHeader, { title: "全部标签", tags: [...TAG_IDS] });

  assert.deepEqual(allTags.tags, [...TAG_IDS]);

  // 未知标签 → 400
  const unknownTagResponse = await requestCreate(
    { occurredOn: TODAY, category: "learning", title: "未知标签", tags: ["first", "persist"] },
    cookieHeader
  );

  assert.equal(unknownTagResponse.status, 400);
  assert.ok((await readJson(unknownTagResponse)).message.includes("tags"));

  // 非数组 → 400
  for (const invalidTags of ["first", 1, null, { first: true }]) {
    const response = await requestCreate(
      { occurredOn: TODAY, category: "learning", title: "标签不是数组", tags: invalidTags },
      cookieHeader
    );

    assert.equal(response.status, 400, `tags=${JSON.stringify(invalidTags)} 应该被拒绝`);
  }

  assert.equal((await listFootprints(cookieHeader)).length, 4);
});

// ---------------------------------------------------------------------------
// 11. 排序契约：occurred_on DESC, id DESC
// ---------------------------------------------------------------------------

test("footprints are listed newest-first with same-day records ordered by id desc", async () => {
  const cookieHeader = await createProfile();

  const oldest = await createFootprint(cookieHeader, { occurredOn: ORDERING_DAY_OLDEST, title: "最早的一件事" });
  const middle = await createFootprint(cookieHeader, { occurredOn: ORDERING_DAY_MIDDLE, title: "中间的一件事" });
  const newestFirst = await createFootprint(cookieHeader, { occurredOn: ORDERING_DAY_NEWEST, title: "最近的先记" });
  const newestSecond = await createFootprint(cookieHeader, { occurredOn: ORDERING_DAY_NEWEST, title: "最近的后记" });
  const middleSecond = await createFootprint(cookieHeader, { occurredOn: ORDERING_DAY_MIDDLE, title: "中间的第二件" });

  const footprints = await listFootprints(cookieHeader);

  assert.deepEqual(
    footprints.map((footprint) => footprint.id),
    [newestSecond.id, newestFirst.id, middleSecond.id, middle.id, oldest.id]
  );

  // 这条用例的输入确实跨了年、也跨了月（不是同一年内的巧合排序）。
  assert.ok(new Set(footprints.map((footprint) => footprint.occurredOn.slice(0, 4))).size >= 3);
  assert.ok(new Set(footprints.map((footprint) => footprint.occurredOn.slice(0, 7))).size >= 3);
  assert.ok(newestSecond.id > newestFirst.id);
});

// ---------------------------------------------------------------------------
// 12 / 13 / 14. PATCH 语义
// ---------------------------------------------------------------------------

test("patch only changes the fields it received", async () => {
  const cookieHeader = await createProfile();
  const created = await createFootprint(cookieHeader, {
    occurredOn: getLocalDateKey(-10),
    category: "outdoor",
    title: "去公园找秋天的叶子",
    note: "捡了七种不一样的颜色。",
    tags: ["discover", "coop"]
  });

  const response = await requestPatch(created.id, { title: "去公园找秋天的叶子（修改后）" }, cookieHeader);

  assert.equal(response.status, 200);

  const { footprint } = await readJson(response);

  assert.equal(footprint.id, created.id);
  assert.equal(footprint.title, "去公园找秋天的叶子（修改后）");
  // 没传的字段保持原值。
  assert.equal(footprint.occurredOn, created.occurredOn);
  assert.equal(footprint.category, "outdoor");
  assert.equal(footprint.note, "捡了七种不一样的颜色。");
  // 标签顺序永远由服务端固定（TAG_IDS 顺序），和客户端传入顺序无关。
  assert.deepEqual(footprint.tags, ["coop", "discover"]);
  assert.equal(footprint.createdAt, created.createdAt);
  assert.ok(Date.parse(footprint.updatedAt) >= Date.parse(created.updatedAt));

  // 多字段一起改
  const multiResponse = await requestPatch(
    created.id,
    { occurredOn: getLocalDateKey(-9), category: "together", note: "换了一段记录。" },
    cookieHeader
  );

  assert.equal(multiResponse.status, 200);

  const multiPayload = await readJson(multiResponse);

  assert.equal(multiPayload.footprint.occurredOn, getLocalDateKey(-9));
  assert.equal(multiPayload.footprint.category, "together");
  assert.equal(multiPayload.footprint.note, "换了一段记录。");
  assert.equal(multiPayload.footprint.title, "去公园找秋天的叶子（修改后）");

  // 非法字段值同样 400，而且不会写进去
  for (const invalidPatch of [
    { occurredOn: "2026-02-30" },
    { occurredOn: TOMORROW },
    { category: "special" },
    { title: "" },
    { title: "字".repeat(MAX_TITLE_LENGTH + 1) },
    { note: "记".repeat(MAX_NOTE_LENGTH + 1) },
    { tags: ["persist"] },
    { tags: "first" }
  ]) {
    const invalidResponse = await requestPatch(created.id, invalidPatch, cookieHeader);

    assert.equal(invalidResponse.status, 400, `${JSON.stringify(invalidPatch)} 应该被拒绝`);
  }

  const storedPayload = await readJson(await requestList(cookieHeader));

  assert.equal(storedPayload.footprints.length, 1);
  assert.equal(storedPayload.footprints[0].title, "去公园找秋天的叶子（修改后）");

  // 合法但不存在（且属于本 profile 范围）的 id → 404
  const missingResponse = await requestPatch(999999, { title: "不存在" }, cookieHeader);

  assert.equal(missingResponse.status, 404);
});

test("patch can clear tags with an empty array but leaves them alone when omitted", async () => {
  const cookieHeader = await createProfile();
  const created = await createFootprint(cookieHeader, { title: "带标签的记录", tags: ["first", "brave"] });

  // 不传 tags → 不修改
  const withoutTags = await requestPatch(created.id, { note: "只改记录。" }, cookieHeader);

  assert.equal(withoutTags.status, 200);
  assert.deepEqual((await readJson(withoutTags)).footprint.tags, ["first", "brave"]);

  // tags: [] → 清空（这里必须和「没传」区分开）
  const clearedResponse = await requestPatch(created.id, { tags: [] }, cookieHeader);

  assert.equal(clearedResponse.status, 200);
  assert.deepEqual((await readJson(clearedResponse)).footprint.tags, []);

  // 清空后再查一次，数据库里也是空的
  assert.deepEqual((await listFootprints(cookieHeader))[0].tags, []);
});

test("patch with nothing to change is rejected", async () => {
  const cookieHeader = await createProfile();
  const created = await createFootprint(cookieHeader, { title: "什么都没改" });

  for (const emptyBody of [{}, { profileId: "someone-else" }, { id: created.id }, { title: undefined }]) {
    const response = await requestPatch(created.id, emptyBody, cookieHeader);

    assert.equal(response.status, 400, `${JSON.stringify(emptyBody)} 应该被拒绝`);
    assert.ok((await readJson(response)).message.includes("没有需要修改的字段"));
  }

  // 一次「空修改」都没有真正写库。
  const footprints = await listFootprints(cookieHeader);

  assert.equal(footprints.length, 1);
  assert.equal(footprints[0].title, "什么都没改");
  assert.equal(footprints[0].updatedAt, footprints[0].createdAt);
});

// ---------------------------------------------------------------------------
// 15 / 16. DELETE
// ---------------------------------------------------------------------------

test("deleting a footprint removes it, and deleting it again returns 404", async () => {
  const cookieHeader = await createProfile();
  const kept = await createFootprint(cookieHeader, { title: "留下来的这件" });
  const removed = await createFootprint(cookieHeader, { title: "要被删掉的这件" });

  const response = await requestDelete(removed.id, cookieHeader);

  assert.equal(response.status, 200);

  const payload = await readJson(response);

  assert.equal(payload.deletedId, removed.id);
  assert.ok(payload.message);

  // 硬删除：真的不在了。
  const remaining = await listFootprints(cookieHeader);

  assert.deepEqual(
    remaining.map((footprint) => footprint.id),
    [kept.id]
  );

  // 重复删除 → 404，不是「成功但什么都没删」。
  const repeatResponse = await requestDelete(removed.id, cookieHeader);

  assert.equal(repeatResponse.status, 404);
  assert.equal((await readJson(repeatResponse)).message, "这条足迹不存在。");

  // 完全不存在的 id 也是同一个 404。
  const missingResponse = await requestDelete(999999, cookieHeader);

  assert.equal(missingResponse.status, 404);
  assert.equal((await readJson(missingResponse)).message, "这条足迹不存在。");
});

// ---------------------------------------------------------------------------
// 17. 非法 id
// ---------------------------------------------------------------------------

test("malformed footprint ids are rejected with 400", async () => {
  const cookieHeader = await createProfile();
  const invalidIds = ["0", "-3", "3.7", "abc", "1e3", "0x10", "01", "+1", "1.0", "NaN", "１２"];

  for (const invalidId of invalidIds) {
    const patchResponse = await requestPatch(invalidId, { title: "不该生效" }, cookieHeader);
    const deleteResponse = await requestDelete(invalidId, cookieHeader);

    assert.equal(patchResponse.status, 400, `PATCH id=${invalidId} 应该 400`);
    assert.equal(deleteResponse.status, 400, `DELETE id=${invalidId} 应该 400`);

    const payload = await readJson(patchResponse);

    assert.ok(payload.message.includes("id"), payload.message);
  }
});

// ---------------------------------------------------------------------------
// 18 / 19 / 20 / 21. profile 隔离
// ---------------------------------------------------------------------------

test("footprints are isolated per profile", async () => {
  const profileA = await createProfile();
  const profileB = await createProfile();

  const createdA = await createFootprint(profileA, { title: "A 的故事" });

  assert.deepEqual(await listFootprints(profileB), []);

  const listA = await listFootprints(profileA);

  assert.deepEqual(
    listA.map((footprint) => footprint.id),
    [createdA.id]
  );

  const createdB = await createFootprint(profileB, { title: "B 的故事" });

  const listAAfterB = await listFootprints(profileA);
  const listBAfterB = await listFootprints(profileB);

  assert.deepEqual(
    listAAfterB.map((footprint) => footprint.title),
    ["A 的故事"]
  );
  assert.deepEqual(
    listBAfterB.map((footprint) => footprint.title),
    ["B 的故事"]
  );
  assert.notEqual(createdA.id, createdB.id);
});

test("patching another profile's footprint returns 404 and changes nothing", async () => {
  const profileA = await createProfile();
  const profileB = await createProfile();
  const createdA = await createFootprint(profileA, {
    title: "A 的故事",
    note: "这段记录不能被别人改。",
    tags: ["first"]
  });

  const response = await requestPatch(createdA.id, { title: "B 想改掉它", note: "篡改" }, profileB);

  assert.equal(response.status, 404);
  assert.equal((await readJson(response)).message, "这条足迹不存在。");

  // A 的记录逐字段未变。
  const listA = await listFootprints(profileA);

  assert.equal(listA.length, 1);
  assert.equal(listA[0].id, createdA.id);
  assert.equal(listA[0].title, "A 的故事");
  assert.equal(listA[0].note, "这段记录不能被别人改。");
  assert.deepEqual(listA[0].tags, ["first"]);
  assert.equal(listA[0].updatedAt, createdA.updatedAt);
  // B 的列表仍然是空的（没有被写进 B）。
  assert.deepEqual(await listFootprints(profileB), []);
});

test("deleting another profile's footprint returns 404 and keeps the record", async () => {
  const profileA = await createProfile();
  const profileB = await createProfile();
  const createdA = await createFootprint(profileA, { title: "A 的故事" });

  const response = await requestDelete(createdA.id, profileB);

  assert.equal(response.status, 404);
  assert.equal((await readJson(response)).message, "这条足迹不存在。");

  // A 的记录仍然在。
  const listA = await listFootprints(profileA);

  assert.deepEqual(
    listA.map((footprint) => footprint.id),
    [createdA.id]
  );
  // 而且 A 自己删得掉（说明上面的 404 真的是归属问题，不是记录坏了）。
  assert.equal((await requestDelete(createdA.id, profileA)).status, 200);
  assert.deepEqual(await listFootprints(profileA), []);
});

test("client supplied identity fields cannot change ownership", async () => {
  const profileA = await createProfile();
  const profileB = await createProfile();
  const forgedOccurredOn = getLocalDateKey(-3);

  const response = await requestCreate(
    {
      // 伪造的归属 / 服务端字段：全部必须被忽略。
      id: 9999,
      profileId: "forged-profile-id-0001",
      profile_id: "forged-profile-id-0002",
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      occurredOn: forgedOccurredOn,
      category: "together",
      title: "伪造身份的记录",
      tags: ["coop"]
    },
    profileB
  );

  assert.equal(response.status, 201);

  const { footprint } = await readJson(response);

  // id 由服务端生成，不是 9999；时间戳也是服务端现在的时间。
  assert.notEqual(footprint.id, 9999);
  assert.ok(Date.parse(footprint.createdAt) > Date.parse("2020-01-01T00:00:00.000Z"));
  assert.equal(footprint.occurredOn, forgedOccurredOn);

  // 记录落在 profileB 名下，profileA 看不到。
  assert.deepEqual(
    (await listFootprints(profileB)).map((item) => item.id),
    [footprint.id]
  );
  assert.deepEqual(await listFootprints(profileA), []);

  // PATCH 里伪造 profile_id 也不能把记录搬走。
  const patchResponse = await requestPatch(
    footprint.id,
    { title: "改了标题但归属不变", profile_id: "forged-profile-id-0002", profileId: "forged-profile-id-0001" },
    profileB
  );

  assert.equal(patchResponse.status, 200);
  assert.equal((await readJson(patchResponse)).footprint.title, "改了标题但归属不变");
  assert.deepEqual(await listFootprints(profileA), []);
  assert.equal((await listFootprints(profileB))[0].title, "改了标题但归属不变");
});

// ---------------------------------------------------------------------------
// 22. 与现有三条持久化链完全隔离
// ---------------------------------------------------------------------------

test("creating a footprint never touches growth progress, challenge progress or study record book", async () => {
  const cookieHeader = await createProfile();
  const firstCreateResponse = await requestCreate(
    { occurredOn: TODAY, category: "explore", title: "第一条足迹" },
    cookieHeader
  );

  assert.equal(firstCreateResponse.status, 201);
  await readJson(firstCreateResponse);

  // 先在同一个 profile 上把另外三条链写满。
  const challengeResponse = await fetch(`${baseUrl}/api/challenge-progress`, {
    method: "PUT",
    headers: buildHeaders(cookieHeader, true),
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

  assert.equal(challengeResponse.status, 200);
  await readJson(challengeResponse);

  const studyResponse = await fetch(`${baseUrl}/api/study-record-book`, {
    method: "PUT",
    headers: buildHeaders(cookieHeader, true),
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

  const chestResponse = await fetch(`${baseUrl}/api/growth-progress/daily-chest`, {
    method: "POST",
    headers: buildHeaders(cookieHeader, true),
    body: JSON.stringify({ dateKey: TODAY })
  });

  assert.equal(chestResponse.status, 200);
  const chestPayload = await readJson(chestResponse);

  assert.equal(chestPayload.growthProgress.totalDailyChests, 1);

  // 快照：三条链现在的样子。
  const growthBefore = await readJsonFrom("/api/growth-progress", cookieHeader);
  const challengeBefore = await readJsonFrom("/api/challenge-progress", cookieHeader);
  const studyBefore = await readJsonFrom("/api/study-record-book", cookieHeader);

  // 现在做一轮完整的足迹 CRUD。
  const created = await createFootprint(cookieHeader, {
    title: "一起做火山实验",
    category: "explore",
    note: "冒泡特别开心。",
    tags: ["first", "discover"]
  });
  const patchedResponse = await requestPatch(created.id, { title: "一起做火山实验（改）" }, cookieHeader);

  assert.equal(patchedResponse.status, 200);
  await readJson(patchedResponse);

  const second = await createFootprint(cookieHeader, { title: "第二件一起做的事" });
  const deleteResponse = await requestDelete(second.id, cookieHeader);

  assert.equal(deleteResponse.status, 200);
  await readJson(deleteResponse);

  // 三条链必须一字不变。
  const growthAfter = await readJsonFrom("/api/growth-progress", cookieHeader);
  const challengeAfter = await readJsonFrom("/api/challenge-progress", cookieHeader);
  const studyAfter = await readJsonFrom("/api/study-record-book", cookieHeader);

  assert.deepEqual(growthAfter, growthBefore);
  assert.deepEqual(challengeAfter, challengeBefore);
  assert.deepEqual(studyAfter, studyBefore);

  // 印章数没有被足迹顶高，足迹接口也不返回任何成长账本字段。
  assert.equal(growthAfter.growthProgress.totalDailyChests, 1);
  assert.equal(challengeAfter.progressBook.chapters["chapter-grade-3-upper"].bestResults["stage-1"].starCount, 3);
  assert.equal(studyAfter.studyRecordBook.questionRecords["7"].attempts, 2);

  const listPayload = await readJson(await requestList(cookieHeader));

  assert.equal(listPayload.growthProgress, undefined);
  assert.equal(listPayload.stamps, undefined);
  assert.deepEqual(Object.keys(listPayload), ["footprints"]);
  // 列表里没有任何奖励字段，只有真实事实。
  assert.deepEqual(
    Object.keys(listPayload.footprints[0]).sort(),
    ["category", "createdAt", "id", "note", "occurredOn", "tags", "title", "updatedAt"]
  );

  // 四张表各自独立存在。
  const tableNames = readTableNames();

  assert.ok(tableNames.includes("growth_footprints"));
  assert.ok(tableNames.includes("growth_progress"));
  assert.ok(tableNames.includes("challenge_progress"));
  assert.ok(tableNames.includes("study_record_book"));
});

// ---------------------------------------------------------------------------
// 懒建表 + 脏数据安全降级
// ---------------------------------------------------------------------------

test("the footprints table is created lazily and reads survive dirty stored tags", async () => {
  const cookieHeader = await createProfile();

  // 直接往库里塞一条 tags_json 坏掉的记录（模拟历史脏数据）。
  const db = createDatabaseConnection();

  try {
    run(
      db,
      `
        INSERT INTO growth_footprints (
          profile_id,
          occurred_on,
          category,
          title,
          note,
          tags_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        "dirty-tags-profile",
        TODAY,
        "explore",
        "脏数据记录",
        "",
        "{not-json",
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
  } finally {
    closeDatabaseConnection(db);
  }

  const dirtyResponse = await requestList("wonder_trivia_profile=dirty-tags-profile");

  assert.equal(dirtyResponse.status, 200);

  const dirtyPayload = await readJson(dirtyResponse);

  // 坏 tags_json 安全降级成 []，绝不让整个 GET 500。
  assert.deepEqual(dirtyPayload.footprints[0].tags, []);

  // 非数组的 tags_json 同样降级成 []。
  const dbForArray = createDatabaseConnection();

  try {
    run(
      dbForArray,
      `
        INSERT INTO growth_footprints (profile_id, occurred_on, category, title, note, tags_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        "dirty-tags-profile",
        TODAY,
        "explore",
        "标签不是数组",
        "",
        JSON.stringify({ first: true }),
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // 未知标签与重复标签在读取时也被剔除 / 去重。
    run(
      dbForArray,
      `
        INSERT INTO growth_footprints (profile_id, occurred_on, category, title, note, tags_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        "dirty-tags-profile",
        TODAY,
        "explore",
        "未知标签",
        "",
        JSON.stringify(["coop", "unknown-tag", "coop", "first"]),
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
  } finally {
    closeDatabaseConnection(dbForArray);
  }

  const listResponse = await requestList("wonder_trivia_profile=dirty-tags-profile");

  assert.equal(listResponse.status, 200);

  const listPayload = await readJson(listResponse);
  const tagsByTitle = Object.fromEntries(
    listPayload.footprints.map((footprint) => [footprint.title, footprint.tags])
  );

  assert.deepEqual(tagsByTitle["标签不是数组"], []);
  assert.deepEqual(tagsByTitle["未知标签"], ["first", "coop"]);

  // 其它 profile 完全看不到这些记录。
  assert.deepEqual(await listFootprints(cookieHeader), []);
});
