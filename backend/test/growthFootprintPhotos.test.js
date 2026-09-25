const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// 纪念册照片的接口级测试：用独立的临时库 + 独立的照片目录，
// 绝不碰 backend/data/trivia.db 与真实的 backend/data/growth-photos。
const tempDir = path.join(__dirname, ".tmp");
const tempDbPath = path.join(tempDir, "growth-photos.test.db");
// 每个测试文件用自己的照片目录：测试之间不互相删对方的文件。
const photosDir = path.join(tempDir, "growth-footprint-photos");

fs.rmSync(photosDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.TRIVIA_DB_PATH = tempDbPath;
process.env.TRIVIA_PHOTOS_DIR = photosDir;

const app = require("../src/app");
const { closeDatabaseConnection, createDatabaseConnection, run } = require("../src/db/database");

const FOOTPRINTS_PATH = "/api/growth-footprints";
const MILESTONES_PATH = "/api/growth-milestones";
const PLANS_PATH = "/api/growth-plans";
const MAX_PHOTOS_PER_FOOTPRINT = 6;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

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

// 一小段合法 PNG（1x1 透明像素）：足够验证「存下来、取得回」。
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_JPEG_DATA_URL = `data:image/jpeg;base64,${TINY_PNG_BASE64}`;

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
  const { response, payload } = await requestJson("GET", FOOTPRINTS_PATH);
  const cookieHeader = getCookieHeader(response);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.footprints));

  return cookieHeader;
}

async function createFootprint(cookieHeader, overrides = {}) {
  const { response, payload } = await requestJson("POST", FOOTPRINTS_PATH, {
    cookieHeader,
    body: {
      occurredOn: TODAY,
      category: "explore",
      title: "一起看星星",
      note: "",
      ...overrides
    }
  });

  assert.equal(response.status, 201, `创建失败：${JSON.stringify(payload)}`);

  return payload.footprint;
}

async function listFootprints(cookieHeader) {
  const { response, payload } = await requestJson("GET", FOOTPRINTS_PATH, { cookieHeader });

  assert.equal(response.status, 200);

  return payload.footprints;
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
    run(db, "DROP TABLE IF EXISTS growth_footprint_photos");
    run(db, "DROP TABLE IF EXISTS growth_footprints");
    run(db, "DROP TABLE IF EXISTS growth_plans");
  } finally {
    db.close();
  }

  fs.rmSync(photosDir, { recursive: true, force: true });
});

test("a brand new footprint has no photos at all", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader);

  assert.deepEqual(footprint.photos, []);
  assert.deepEqual((await listFootprints(cookieHeader))[0].photos, []);
});

test("creating a footprint with photos stores them and returns their urls", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader, {
    photos: [TINY_PNG_DATA_URL, TINY_JPEG_DATA_URL]
  });

  assert.equal(footprint.photos.length, 2);

  const [firstPhoto] = footprint.photos;

  assert.ok(firstPhoto.id > 0);
  assert.equal(firstPhoto.url, `/api/growth-footprints/photos/${firstPhoto.id}`);
  assert.equal(firstPhoto.mimeType, "image/png");
  assert.ok(firstPhoto.byteSize > 0);
  assert.ok(firstPhoto.createdAt);

  // 文件真的落到了这个临时目录里，数据库里只有指针。
  assert.equal(readStoredPhotoFiles().length, 2);

  const listed = (await listFootprints(cookieHeader))[0];

  assert.equal(listed.photos.length, 2);
  assert.deepEqual(listed.photos.map((photo) => photo.id), footprint.photos.map((photo) => photo.id));
});

test("the photo bytes are served back with the right content type", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader, { photos: [TINY_PNG_DATA_URL] });
  const response = await fetch(`${baseUrl}${footprint.photos[0].url}`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");

  const bytes = Buffer.from(await response.arrayBuffer());

  assert.equal(bytes.length, footprint.photos[0].byteSize);
  assert.equal(bytes.toString("base64"), TINY_PNG_BASE64);
});

test("a missing photo id is a 404, a malformed one is a 400", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader, { photos: [TINY_PNG_DATA_URL] });

  const missing = await fetch(`${baseUrl}${FOOTPRINTS_PATH}/photos/999999`);
  const malformed = await fetch(`${baseUrl}${FOOTPRINTS_PATH}/photos/abc`);

  assert.equal(missing.status, 404);
  assert.equal(malformed.status, 400);

  // 正常的那张仍然在。
  assert.equal((await fetch(`${baseUrl}${footprint.photos[0].url}`)).status, 200);
});

test("photos can be added to an existing footprint one at a time", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader);
  const { response, payload } = await requestJson("POST", `${FOOTPRINTS_PATH}/${footprint.id}/photos`, {
    cookieHeader,
    body: { dataUrl: TINY_PNG_DATA_URL }
  });

  assert.equal(response.status, 201, `上传失败：${JSON.stringify(payload)}`);
  assert.equal(payload.photo.mimeType, "image/png");
  assert.equal((await listFootprints(cookieHeader))[0].photos.length, 1);

  // 上限是「一条记录最多放 6 张」：第 6 张可以，第 7 张会被拒绝。
  for (let index = 1; index < MAX_PHOTOS_PER_FOOTPRINT; index += 1) {
    const added = await requestJson("POST", `${FOOTPRINTS_PATH}/${footprint.id}/photos`, {
      cookieHeader,
      body: { dataUrl: TINY_PNG_DATA_URL }
    });

    assert.equal(added.response.status, 201, `第 ${index + 1} 张应该还能加`);
  }

  const tooMany = await requestJson("POST", `${FOOTPRINTS_PATH}/${footprint.id}/photos`, {
    cookieHeader,
    body: { dataUrl: TINY_PNG_DATA_URL }
  });

  assert.equal(tooMany.response.status, 400);
  assert.match(tooMany.payload.message, /最多放 6 张/);
  assert.equal((await listFootprints(cookieHeader))[0].photos.length, MAX_PHOTOS_PER_FOOTPRINT);
  assert.equal(readStoredPhotoFiles().length, MAX_PHOTOS_PER_FOOTPRINT);
});

test("adding too many photos at once is rejected without creating the footprint", async () => {
  const cookieHeader = await createProfile();
  const tooManyPhotos = Array.from({ length: MAX_PHOTOS_PER_FOOTPRINT + 1 }, () => TINY_PNG_DATA_URL);
  const { response, payload } = await requestJson("POST", FOOTPRINTS_PATH, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "explore", title: "照片太多", photos: tooManyPhotos }
  });

  assert.equal(response.status, 400);
  assert.match(payload.message, /最多放 6 张/);
  // 整条记录都没有产生，也没有留下任何照片文件。
  assert.deepEqual(await listFootprints(cookieHeader), []);
  assert.equal(readStoredPhotoFiles().length, 0);
});

test("invalid photo payloads are rejected and nothing is written", async () => {
  const cookieHeader = await createProfile();
  const oversized = `data:image/png;base64,${Buffer.alloc(MAX_PHOTO_BYTES + 1024).toString("base64")}`;
  const invalidPhotoLists = [
    "not-an-array",
    ["plain text"],
    ["data:text/plain;base64,aGVsbG8="],
    ["data:image/gif;base64,R0lGODlhAQABAAAAACw="],
    ["data:image/png;base64,"],
    [oversized]
  ];

  for (const photos of invalidPhotoLists) {
    const { response } = await requestJson("POST", FOOTPRINTS_PATH, {
      cookieHeader,
      body: { occurredOn: TODAY, category: "explore", title: "不该被创建", photos }
    });

    assert.equal(response.status, 400, `应该拒绝：${JSON.stringify(photos).slice(0, 60)}`);
  }

  assert.deepEqual(await listFootprints(cookieHeader), []);
  assert.equal(readStoredPhotoFiles().length, 0);
});

test("the check order is photo first, then nothing is written at all", async () => {
  const cookieHeader = await createProfile();
  const { response } = await requestJson("POST", FOOTPRINTS_PATH, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "explore", title: "先写足迹再校验照片", photos: ["nope"] }
  });

  assert.equal(response.status, 400);
  // 关键点：足迹没被写进去（否则会留下一条没有照片的孤儿记录）。
  assert.deepEqual(await listFootprints(cookieHeader), []);
});

test("one photo can be removed without touching the others", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader, { photos: [TINY_PNG_DATA_URL, TINY_JPEG_DATA_URL] });
  const [firstPhoto, secondPhoto] = footprint.photos;
  const { response, payload } = await requestJson(
    "DELETE",
    `${FOOTPRINTS_PATH}/${footprint.id}/photos/${firstPhoto.id}`,
    { cookieHeader }
  );

  assert.equal(response.status, 200);
  assert.equal(payload.deletedId, firstPhoto.id);

  const remaining = (await listFootprints(cookieHeader))[0].photos;

  assert.deepEqual(remaining.map((photo) => photo.id), [secondPhoto.id]);
  assert.equal(readStoredPhotoFiles().length, 1);
  // 被删掉的那张已经取不到了。
  assert.equal((await fetch(`${baseUrl}${firstPhoto.url}`)).status, 404);

  // 再删一次是 404。
  const again = await requestJson("DELETE", `${FOOTPRINTS_PATH}/${footprint.id}/photos/${firstPhoto.id}`, {
    cookieHeader
  });

  assert.equal(again.response.status, 404);
});

test("photos belong to their footprint and profile", async () => {
  const owner = await createProfile();
  const stranger = await createProfile();
  const footprint = await createFootprint(owner, { photos: [TINY_PNG_DATA_URL] });

  // 别人不能往我的记录里加照片，也不能删我的照片（统一 404，不透露存在性）。
  const addByStranger = await requestJson("POST", `${FOOTPRINTS_PATH}/${footprint.id}/photos`, {
    cookieHeader: stranger,
    body: { dataUrl: TINY_PNG_DATA_URL }
  });
  const deleteByStranger = await requestJson(
    "DELETE",
    `${FOOTPRINTS_PATH}/${footprint.id}/photos/${footprint.photos[0].id}`,
    { cookieHeader: stranger }
  );

  assert.equal(addByStranger.response.status, 404);
  assert.equal(deleteByStranger.response.status, 404);
  assert.equal((await listFootprints(owner))[0].photos.length, 1);
});

test("deleting the footprint removes its photo files too", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader, { photos: [TINY_PNG_DATA_URL, TINY_JPEG_DATA_URL] });
  const photoUrl = footprint.photos[0].url;

  assert.equal(readStoredPhotoFiles().length, 2);

  const { response } = await requestJson("DELETE", `${FOOTPRINTS_PATH}/${footprint.id}`, { cookieHeader });

  assert.equal(response.status, 200);
  assert.deepEqual(await listFootprints(cookieHeader), []);
  // 数据库里没有孤儿行，磁盘上也没有孤儿文件。
  assert.equal(readStoredPhotoFiles().length, 0);
  assert.equal((await fetch(`${baseUrl}${photoUrl}`)).status, 404);
});

test("completing a plan can attach photos in the same request", async () => {
  const cookieHeader = await createProfile();
  const { payload: planPayload } = await requestJson("POST", PLANS_PATH, {
    cookieHeader,
    body: { title: "一起去河边捡石头", category: "outdoor" }
  });
  const { response, payload } = await requestJson("POST", `${PLANS_PATH}/${planPayload.plan.id}/complete`, {
    cookieHeader,
    body: {
      occurredOn: TODAY,
      category: "outdoor",
      tags: ["first"],
      note: "捡了一桶石头。",
      photos: [TINY_PNG_DATA_URL]
    }
  });

  assert.equal(response.status, 201, `完成失败：${JSON.stringify(payload)}`);
  assert.equal(payload.footprint.photos.length, 1);
  assert.equal(payload.footprint.note, "捡了一桶石头。");
  assert.equal(readStoredPhotoFiles().length, 1);

  // 想做清单已经空了，纪念册里能看到这条带照片的记录。
  const { payload: plansPayload } = await requestJson("GET", PLANS_PATH, { cookieHeader });

  assert.deepEqual(plansPayload.plans, []);

  const footprints = await listFootprints(cookieHeader);

  assert.equal(footprints.length, 1);
  assert.equal(footprints[0].photos.length, 1);
});

test("a rejected completion keeps the plan and writes no photo", async () => {
  const cookieHeader = await createProfile();
  const { payload: planPayload } = await requestJson("POST", PLANS_PATH, {
    cookieHeader,
    body: { title: "一起去河边捡石头", category: "outdoor" }
  });
  const { response } = await requestJson("POST", `${PLANS_PATH}/${planPayload.plan.id}/complete`, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "outdoor", photos: ["not-a-photo"] }
  });

  assert.equal(response.status, 400);

  const { payload: plansPayload } = await requestJson("GET", PLANS_PATH, { cookieHeader });

  assert.equal(plansPayload.plans.length, 1, "照片不合法时那条想做应该还在清单里");
  assert.deepEqual(await listFootprints(cookieHeader), []);
  assert.equal(readStoredPhotoFiles().length, 0);
});

test("editing a footprint keeps its photos", async () => {
  const cookieHeader = await createProfile();
  const footprint = await createFootprint(cookieHeader, { photos: [TINY_PNG_DATA_URL] });
  const { response, payload } = await requestJson("PATCH", `${FOOTPRINTS_PATH}/${footprint.id}`, {
    cookieHeader,
    body: { title: "改过的标题" }
  });

  assert.equal(response.status, 200);
  assert.equal(payload.footprint.title, "改过的标题");
  assert.equal(payload.footprint.photos.length, 1);
  assert.equal(payload.footprint.photos[0].id, footprint.photos[0].id);
});

// 回归：两条记录线的照片 id 是各表独立自增的，会重复。
// 只要它们共用过一个取图入口，同一个数字就会指向两张不同的照片。
//
// 为了让这个场景在每次运行里都**确定**出现（AUTOINCREMENT 计数器不随 DROP TABLE 归零，
// 而且测试文件之间是并行跑的，谁先跑到哪个数字完全不固定），
// 这里先把两条线各造出一张真实照片，再把成长记录那张的行 id 对齐到足迹那张的 id 上。
// 照片表和文件都是真实生成的，只有 id 是对齐出来的——
// 表结构本身没有外键约束，一个 id 在两条线里各有一行是完全合法的状态。
test("the same photo id on both lines resolves to its own photo, not the other line's", async () => {
  const cookieHeader = await createProfile();

  // 两条线各放一张照片：内容相同但**格式不同**（image/png vs image/jpeg），
  // 所以「谁串了线」可以由返回的 Content-Type 直接判定。
  const footprint = await createFootprint(cookieHeader, { title: "我们一起看的星星", photos: [TINY_PNG_DATA_URL] });
  const { response: milestoneResponse, payload: milestonePayload } = await requestJson("POST", MILESTONES_PATH, {
    cookieHeader,
    body: {
      occurredOn: TODAY,
      category: "hobby",
      title: "她自己画的一幅画",
      photos: [TINY_JPEG_DATA_URL]
    }
  });

  assert.equal(milestoneResponse.status, 201, `创建成长记录失败：${JSON.stringify(milestonePayload)}`);

  const footprintPhoto = footprint.photos[0];
  const milestonePhoto = milestonePayload.milestone.photos[0];

  // 两条线的照片 id 是各表独立自增的，一次运行里未必恰好撞上
  // （AUTOINCREMENT 计数器不随 DROP TABLE 归零，测试文件之间还并行跑）。
  // 所以这里把两张真实的照片行一起对齐到一个固定的高号 id，
  // 让「同一个数字、两条线各有一张照片」这个状态在每次运行里都确定出现。
  // 表结构本身没有外键约束，一个 id 在两条线里各有一行是完全合法的状态。
  const collidingPhotoId = 9001;
  const db = createDatabaseConnection();

  try {
    // 先清掉可能残留的同号行（id 是测试自己挑的高号，正常情况下不存在）。
    run(db, "DELETE FROM growth_footprint_photos WHERE id = ?", [collidingPhotoId]);
    run(db, "DELETE FROM growth_milestone_photos WHERE id = ?", [collidingPhotoId]);
    run(db, "UPDATE growth_footprint_photos SET id = ? WHERE id = ?", [collidingPhotoId, footprintPhoto.id]);
    run(db, "UPDATE growth_milestone_photos SET id = ? WHERE id = ?", [collidingPhotoId, milestonePhoto.id]);

    const collidingRows = db.prepare("SELECT id FROM growth_milestone_photos WHERE id = ?").all(collidingPhotoId);

    assert.equal(collidingRows.length, 1, "成长记录线现在也有一张同号照片");
  } finally {
    db.close();
  }

  // 列表回包：两条线各自给出自己的 URL（同一个数字，不同的入口）。
  const { payload: footprintsPayload } = await requestJson("GET", FOOTPRINTS_PATH, { cookieHeader });
  const { payload: milestonesPayload } = await requestJson("GET", MILESTONES_PATH, { cookieHeader });
  const listedFootprintPhoto = footprintsPayload.footprints[0].photos[0];
  const listedMilestonePhoto = milestonesPayload.milestones[0].photos[0];

  assert.equal(listedFootprintPhoto.id, collidingPhotoId);
  assert.equal(listedMilestonePhoto.id, collidingPhotoId);
  assert.equal(listedFootprintPhoto.url, `/api/growth-footprints/photos/${collidingPhotoId}`);
  assert.equal(listedMilestonePhoto.url, `/api/growth-milestones/photos/${collidingPhotoId}`);
  assert.notEqual(listedFootprintPhoto.url, listedMilestonePhoto.url);

  // 两个 URL 分别返回各自的图片。
  const footprintImage = await fetch(`${baseUrl}${listedFootprintPhoto.url}`);
  const milestoneImage = await fetch(`${baseUrl}${listedMilestonePhoto.url}`);

  assert.equal(footprintImage.status, 200);
  assert.equal(milestoneImage.status, 200);
  // 这两条断言就是这个 bug 的判定：id 撞车时，谁串了线谁的格式就不对。
  assert.equal(footprintImage.headers.get("content-type"), "image/png", "足迹 URL 不能返回成长记录那张照片");
  assert.equal(milestoneImage.headers.get("content-type"), "image/jpeg", "成长记录 URL 不能返回足迹那张照片");

  const footprintBytes = Buffer.from(await footprintImage.arrayBuffer());
  const milestoneBytes = Buffer.from(await milestoneImage.arrayBuffer());

  assert.equal(footprintBytes.toString("base64"), TINY_PNG_BASE64);
  assert.equal(milestoneBytes.toString("base64"), TINY_PNG_BASE64);
  // 尺寸对得上各自那一行（同号不同行，行为完全一致）。
  assert.equal(footprintBytes.length, listedFootprintPhoto.byteSize);
  assert.equal(milestoneBytes.length, listedMilestonePhoto.byteSize);
});

// 回归：一条线没有这个 id 时，绝不能"顺便"去另一张表里找。
// （这正是共用一个取图入口时会发生的事：数字撞上就串线。）
test("a photo id only exists on its own line, never falls through to the other table", async () => {
  const cookieHeader = await createProfile();

  // 只在「她的成长」这条线放一张照片。
  const { payload: milestonePayload } = await requestJson("POST", MILESTONES_PATH, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "hobby", title: "只有成长记录有照片", photos: [TINY_PNG_DATA_URL] }
  });
  const milestonePhoto = milestonePayload.milestone.photos[0];

  // 足迹那条线一张照片都没有，所以同一个数字在它那里必须是 404。
  const wrongLine = await fetch(`${baseUrl}${FOOTPRINTS_PATH}/photos/${milestonePhoto.id}`);

  assert.equal(wrongLine.status, 404);
  // 而它自己的入口照常取得到。
  assert.equal((await fetch(`${baseUrl}${MILESTONES_PATH}/photos/${milestonePhoto.id}`)).status, 200);

  // 反过来：只在足迹线放一张照片，成长记录线同样要按自己的表回答。
  const footprint = await createFootprint(cookieHeader, { photos: [TINY_PNG_DATA_URL] });
  const footprintPhoto = footprint.photos[0];

  assert.equal((await fetch(`${baseUrl}${FOOTPRINTS_PATH}/photos/${footprintPhoto.id}`)).status, 200);

  const { payload: milestonePhotosNow } = await requestJson("GET", MILESTONES_PATH, { cookieHeader });
  const milestoneIds = milestonePhotosNow.milestones.flatMap((item) => item.photos.map((photo) => photo.id));
  const isAlsoOnMilestoneLine = milestoneIds.includes(footprintPhoto.id);

  assert.equal(
    (await fetch(`${baseUrl}${MILESTONES_PATH}/photos/${footprintPhoto.id}`)).status,
    isAlsoOnMilestoneLine ? 200 : 404,
    "成长记录线只按自己的照片表回答"
  );

  // 两条线的照片 id 各表独立自增：这里再确认一次「会撞」这件事本身。
  const { payload: milestoneSecond } = await requestJson("POST", MILESTONES_PATH, {
    cookieHeader,
    body: { occurredOn: TODAY, category: "growth", title: "再放一张成长记录照片", photos: [TINY_PNG_DATA_URL] }
  });
  const secondMilestonePhotoId = milestoneSecond.milestone.photos.at(-1).id;

  assert.ok(
    secondMilestonePhotoId > milestonePhoto.id,
    "成长记录照片 id 只在自己这条线上递增"
  );
});

test("photos never leak into growth progress, challenge progress or the study record book", async () => {
  const cookieHeader = await createProfile();

  await createFootprint(cookieHeader, { photos: [TINY_PNG_DATA_URL] });

  const db = createDatabaseConnection();

  try {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);

    for (const untouchedTable of ["growth_progress", "challenge_progress", "study_record_book"]) {
      assert.ok(!tableNames.includes(untouchedTable), `不应该创建 ${untouchedTable}`);
    }
  } finally {
    db.close();
  }
});
