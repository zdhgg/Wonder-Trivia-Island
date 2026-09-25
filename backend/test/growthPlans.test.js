const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// 「下次我们一起做什么」的接口级测试：用独立的临时库，绝不碰 backend/data/trivia.db。
const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "growth-plans.test.db");

fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;

const app = require("../src/app");
const { closeDatabaseConnection, createDatabaseConnection, run } = require("../src/db/database");

const PLANS_PATH = "/api/growth-plans";
const FOOTPRINTS_PATH = "/api/growth-footprints";
const CATEGORY_IDS = Object.freeze(["learning", "explore", "outdoor", "create", "together"]);
const TAG_IDS = Object.freeze(["first", "special", "coop", "discover", "brave"]);
const MAX_TITLE_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;

let server = null;
let baseUrl = "";

// 未来日期相对「服务器本地今天」判断，所以测试日期一律相对今天算。
function getLocalDateKey(offsetDays = 0) {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

const TODAY = getLocalDateKey(0);
const YESTERDAY = getLocalDateKey(-1);

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
  const { response, payload } = await requestJson("GET", PLANS_PATH);
  const cookieHeader = getCookieHeader(response);

  assert.equal(response.status, 200);
  assert.ok(cookieHeader.includes("wonder_trivia_profile="));
  assert.ok(Array.isArray(payload.plans));

  return cookieHeader;
}

async function listPlans(cookieHeader) {
  const { response, payload } = await requestJson("GET", PLANS_PATH, { cookieHeader });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.plans));

  return payload.plans;
}

async function listFootprints(cookieHeader) {
  const { response, payload } = await requestJson("GET", FOOTPRINTS_PATH, { cookieHeader });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.footprints));

  return payload.footprints;
}

async function addPlan(cookieHeader, overrides = {}) {
  const { response, payload } = await requestJson("POST", PLANS_PATH, {
    cookieHeader,
    body: {
      title: "一起搭一次帐篷",
      category: "outdoor",
      note: "",
      ...overrides
    }
  });

  assert.equal(response.status, 201, `加入想做失败：${JSON.stringify(payload)}`);
  assert.ok(payload.plan && payload.plan.id > 0);

  return payload.plan;
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
    run(db, "DROP TABLE IF EXISTS growth_plans");
    run(db, "DROP TABLE IF EXISTS growth_footprints");
  } finally {
    db.close();
  }
});

test("a brand new profile starts with an empty plan list", async () => {
  const cookieHeader = await createProfile();

  assert.deepEqual(await listPlans(cookieHeader), []);
});

test("adding a built-in recommendation stores title, note, category and duration", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader, {
    sourceId: "rec_first-campfire",
    title: "第一次一起露营",
    note: "在阳台或院子里搭一次帐篷。",
    category: "outdoor",
    durationMinutes: 90
  });

  assert.equal(plan.sourceId, "rec_first-campfire");
  assert.equal(plan.title, "第一次一起露营");
  assert.equal(plan.note, "在阳台或院子里搭一次帐篷。");
  assert.equal(plan.category, "outdoor");
  assert.equal(plan.durationMinutes, 90);
  assert.ok(plan.createdAt);

  const plans = await listPlans(cookieHeader);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].id, plan.id);
});

test("a custom plan carries no recommendation source", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader, { title: "一起给外婆写一封信", category: "together" });

  assert.equal(plan.sourceId, "");
  assert.equal(plan.durationMinutes, null);
});

test("adding the same recommendation twice returns the existing plan instead of duplicating it", async () => {
  const cookieHeader = await createProfile();

  const first = await addPlan(cookieHeader, { sourceId: "rec_star-night", category: "explore" });
  const { response, payload } = await requestJson("POST", PLANS_PATH, {
    cookieHeader,
    body: { sourceId: "rec_star-night", title: "一起看星星", category: "explore" }
  });

  assert.equal(response.status, 200);
  assert.equal(payload.alreadyPlanned, true);
  assert.equal(payload.plan.id, first.id);
  assert.equal((await listPlans(cookieHeader)).length, 1);
});

test("two custom plans are allowed to share a title", async () => {
  const cookieHeader = await createProfile();

  await addPlan(cookieHeader, { title: "一起做一次饭", category: "together" });
  await addPlan(cookieHeader, { title: "一起做一次饭", category: "together" });

  assert.equal((await listPlans(cookieHeader)).length, 2);
});

test("plans are isolated per profile", async () => {
  const firstProfile = await createProfile();
  const secondProfile = await createProfile();

  await addPlan(firstProfile, { title: "只属于第一个 profile" });

  assert.equal((await listPlans(firstProfile)).length, 1);
  assert.deepEqual(await listPlans(secondProfile), []);
});

test("invalid plan input is rejected with 400", async () => {
  const cookieHeader = await createProfile();
  const invalidBodies = [
    { title: "", category: "outdoor" },
    { title: "字".repeat(MAX_TITLE_LENGTH + 1), category: "outdoor" },
    { title: "标题", category: "nope" },
    { title: "标题", category: "outdoor", note: "记".repeat(MAX_NOTE_LENGTH + 1) },
    { title: "标题", category: "outdoor", durationMinutes: 0 },
    { title: "标题", category: "outdoor", durationMinutes: 24 * 60 + 1 },
    { title: "标题", category: "outdoor", sourceId: "not-a-recommendation" }
  ];

  for (const body of invalidBodies) {
    const { response } = await requestJson("POST", PLANS_PATH, { cookieHeader, body });

    assert.equal(response.status, 400, `应该拒绝：${JSON.stringify(body)}`);
  }

  assert.deepEqual(await listPlans(cookieHeader), []);
});

test("every built-in category id is accepted", async () => {
  const cookieHeader = await createProfile();

  for (const category of CATEGORY_IDS) {
    await addPlan(cookieHeader, { title: `一起做的事（${category}）`, category });
  }

  assert.equal((await listPlans(cookieHeader)).length, CATEGORY_IDS.length);
});

test("renaming a plan only touches title and note", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader, { category: "create", durationMinutes: 60 });
  const { response, payload } = await requestJson("PATCH", `${PLANS_PATH}/${plan.id}`, {
    cookieHeader,
    body: { title: "改过的标题", note: "改过的备注" }
  });

  assert.equal(response.status, 200);
  assert.equal(payload.plan.title, "改过的标题");
  assert.equal(payload.plan.note, "改过的备注");
  // 类别 / 时长不在可改字段里，原值保持。
  assert.equal(payload.plan.category, "create");
  assert.equal(payload.plan.durationMinutes, 60);
});

test("a malformed or foreign plan id is a 404 / 400, never a silent success", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader);

  const badId = await requestJson("PATCH", `${PLANS_PATH}/abc`, { cookieHeader, body: { title: "标题" } });
  const missingId = await requestJson("PATCH", `${PLANS_PATH}/999999`, { cookieHeader, body: { title: "标题" } });

  assert.equal(badId.response.status, 400);
  assert.equal(missingId.response.status, 404);

  // 别人的 id 同样查不到。
  const otherProfile = await createProfile();
  const foreign = await requestJson("DELETE", `${PLANS_PATH}/${plan.id}`, { cookieHeader: otherProfile });

  assert.equal(foreign.response.status, 404);
  assert.equal((await listPlans(cookieHeader)).length, 1);
});

test("completing a plan writes exactly one footprint and removes the plan", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader, {
    title: "一起去河边捡石头",
    category: "outdoor",
    note: "带个小桶。"
  });

  const { response, payload } = await requestJson("POST", `${PLANS_PATH}/${plan.id}/complete`, {
    cookieHeader,
    body: {
      occurredOn: TODAY,
      category: "outdoor",
      title: plan.title,
      note: "捡了一桶石头，还找到一块像爱心的。",
      tags: ["first", "coop"]
    }
  });

  assert.equal(response.status, 201, `完成失败：${JSON.stringify(payload)}`);
  assert.equal(payload.completedPlanId, plan.id);
  assert.equal(payload.footprint.title, "一起去河边捡石头");
  assert.equal(payload.footprint.occurredOn, TODAY);
  assert.equal(payload.footprint.category, "outdoor");
  assert.deepEqual(payload.footprint.tags, ["first", "coop"]);

  assert.deepEqual(await listPlans(cookieHeader), []);

  const footprints = await listFootprints(cookieHeader);

  assert.equal(footprints.length, 1);
  assert.equal(footprints[0].id, payload.footprint.id);
  assert.equal(footprints[0].note, "捡了一桶石头，还找到一块像爱心的。");
});

test("completion can change the category and add tags, that is the whole point", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader, { title: "一起做个纸箱城堡", category: "create" });

  const { payload } = await requestJson("POST", `${PLANS_PATH}/${plan.id}/complete`, {
    cookieHeader,
    body: { occurredOn: YESTERDAY, category: "together", tags: [...TAG_IDS].reverse() }
  });

  assert.equal(payload.footprint.category, "together");
  assert.deepEqual(payload.footprint.tags, [...TAG_IDS]);
  assert.equal(payload.footprint.occurredOn, YESTERDAY);
});

test("completed plans never come back, and re-completing one is a 404", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader);
  const completionBody = { occurredOn: TODAY, category: "outdoor", title: plan.title, note: "", tags: [] };

  const first = await requestJson("POST", `${PLANS_PATH}/${plan.id}/complete`, { cookieHeader, body: completionBody });
  const second = await requestJson("POST", `${PLANS_PATH}/${plan.id}/complete`, { cookieHeader, body: completionBody });

  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 404);
  assert.equal((await listFootprints(cookieHeader)).length, 1);
});

test("a rejected completion writes nothing at all", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader);

  const invalidBodies = [
    { occurredOn: getLocalDateKey(1), category: "outdoor" },
    { occurredOn: "2026-02-30", category: "outdoor" },
    { occurredOn: TODAY, category: "nope" },
    { occurredOn: TODAY, category: "outdoor", tags: ["persist"] },
    { occurredOn: TODAY, category: "outdoor", note: "记".repeat(MAX_NOTE_LENGTH + 1) }
  ];

  for (const body of invalidBodies) {
    const { response } = await requestJson("POST", `${PLANS_PATH}/${plan.id}/complete`, { cookieHeader, body });

    assert.equal(response.status, 400, `应该拒绝：${JSON.stringify(body)}`);
  }

  // 想做还在、足迹一条都没有：不会出现「纪念册里有了、清单里还留着」。
  assert.equal((await listPlans(cookieHeader)).length, 1);
  assert.deepEqual(await listFootprints(cookieHeader), []);
});

test("a completed plan shows up in the memory book exactly like a hand-written footprint", async () => {
  const cookieHeader = await createProfile();
  const creditedPlan = await addPlan(cookieHeader, { title: "一起看一次日出", category: "explore" });

  await requestJson("POST", `${PLANS_PATH}/${creditedPlan.id}/complete`, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "explore", tags: ["special"] }
  });

  // 手写一条：两条记录在纪念册接口里形状完全一致。
  const handWritten = await requestJson("POST", FOOTPRINTS_PATH, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "explore", title: "一起写一张明信片", note: "寄给爷爷。", tags: ["special"] }
  });

  assert.equal(handWritten.response.status, 201);

  const footprints = await listFootprints(cookieHeader);

  assert.equal(footprints.length, 2);

  for (const footprint of footprints) {
    assert.deepEqual(Object.keys(footprint).sort(), [
      "category",
      "createdAt",
      "id",
      "note",
      "occurredOn",
      "photos",
      "tags",
      "title",
      "updatedAt"
    ]);
  }

  assert.ok(footprints.some((footprint) => footprint.title === "一起看一次日出"));
});

test("deleting a plan removes it without writing a footprint", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader);

  const { response, payload } = await requestJson("DELETE", `${PLANS_PATH}/${plan.id}`, { cookieHeader });

  assert.equal(response.status, 200);
  assert.equal(payload.deletedId, plan.id);
  assert.deepEqual(await listPlans(cookieHeader), []);
  assert.deepEqual(await listFootprints(cookieHeader), []);

  // 再删一次是 404，不是「成功但什么都没删」。
  const again = await requestJson("DELETE", `${PLANS_PATH}/${plan.id}`, { cookieHeader });

  assert.equal(again.response.status, 404);
});

test("the plans tables are created lazily on first use", async () => {
  const db = createDatabaseConnection();

  try {
    run(db, "DROP TABLE IF EXISTS growth_plans");
  } finally {
    db.close();
  }

  assert.ok(!readTableNames().includes("growth_plans"));

  await createProfile();

  assert.ok(readTableNames().includes("growth_plans"));
});

test("the plan list survives a brand new connection (it is really stored)", async () => {
  const cookieHeader = await createProfile();

  await addPlan(cookieHeader, { title: "一起种一盆薄荷", category: "create" });

  // 换一条连接重新读，等价于「刷新页面 / 重启服务」。
  const plans = await listPlans(cookieHeader);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].title, "一起种一盆薄荷");
});

test("plans never touch growth progress, challenge progress or the study record book", async () => {
  const cookieHeader = await createProfile();
  const plan = await addPlan(cookieHeader);

  await requestJson("POST", `${PLANS_PATH}/${plan.id}/complete`, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "outdoor", tags: ["coop"] }
  });

  const tableNames = readTableNames();

  // 这三张表不应该因为「想做 / 完成」被建出来。
  for (const untouchedTable of ["growth_progress", "challenge_progress", "study_record_book"]) {
    assert.ok(!tableNames.includes(untouchedTable), `不应该创建 ${untouchedTable}`);
  }

  const db = createDatabaseConnection();

  try {
    const storedPlans = db.prepare("SELECT COUNT(*) AS total FROM growth_plans").get();

    assert.equal(Number(storedPlans.total), 0, "完成之后想做清单应该是空的");
  } finally {
    db.close();
  }
});
