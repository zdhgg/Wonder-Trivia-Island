const { randomUUID } = require("node:crypto");
const express = require("express");
const { all, createDatabaseConnection, get, run, runInSavepoint } = require("../db/database");
const {
  createPhotoMediaRouter,
  createPhotoRouter,
  milestonePhotos
} = require("./growthFootprintPhotos");

// 「她的成长」（Phase 2D-D1）：纪念册的第二条记录线。
//
// 和「我们一起」（growth_footprints）的分工：
//   - growth_footprints：我们**一起**真实发生过的事（有 tags：第一次 / 特别时刻…）；
//   - growth_milestones：**她自己的**成长经历（上课、校园活动、兴趣变化、第一次做到…）。
//
// 为什么单独一张表而不是给 footprints 加一个 kind 列：
//   两条线的字段本来就不一样（成长记录没有 tags），类别也是两套；
//   混在一张表里会让「时间线要不要合并、照片算谁的」这类问题一直纠缠下去。
//   一张表一条线，删除、照片、校验各管各的，反而更省心。
//
// 这里只存事实，不做评价：没有优良中差、没有分数、没有成长指数、没有排名、没有自动成就。
const router = express.Router();
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 只接受不带前导零的正整数：0 / 负数 / 小数 / abc / 1e3 一律不算合法 id。
const MILESTONE_ID_PATTERN = /^[1-9]\d*$/;
// 成长记录的类别：说清「这是哪一类经历」，不是评分等级。
const CATEGORY_IDS = Object.freeze(["classroom", "school", "hobby", "growth", "special"]);
const MAX_TITLE_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;
const MILESTONE_SELECT_FIELDS = ["id", "occurred_on", "category", "title", "note", "created_at", "updated_at"].join(", ");
const PATCHABLE_COLUMNS = Object.freeze({
  occurredOn: "occurred_on",
  category: "category",
  title: "title",
  note: "note"
});

// 懒建表：和别的成长表一样，不引入 migration 框架。
const createTableSql = `
  CREATE TABLE IF NOT EXISTS growth_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    occurred_on TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
const createIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_growth_milestones_profile_occurred
  ON growth_milestones (profile_id, occurred_on DESC, id DESC);
`;

function ensureGrowthMilestonesTable(db) {
  run(db, createTableSql);
  run(db, createIndexSql);
  milestonePhotos.ensureTable(db);
}

function parseCookieHeader(rawHeader = "") {
  return String(rawHeader || "")
    .split(";")
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (name) {
        cookies[name] = decodeURIComponent(value);
      }

      return cookies;
    }, {});
}

// 身份与另外几个 router 逐字一致：同一个 cookie 名、同一个格式、同一组 cookie 选项。
function getProfileId(req, res) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const existingProfileId = String(cookies[PROFILE_COOKIE_NAME] || "").trim();

  if (PROFILE_ID_PATTERN.test(existingProfileId)) {
    return existingProfileId;
  }

  const profileId = randomUUID();

  res.cookie(PROFILE_COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365 * 2
  });

  return profileId;
}

function getLocalDateKey(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = `${referenceDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${referenceDate.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 严格判断「真实日历日」：格式 + 逐字段比对（和 growthFootprints 同一实现）。
function normalizeOccurredOn(value) {
  const matched = DATE_KEY_PATTERN.exec(String(value ?? "").trim());

  if (!matched) {
    return "";
  }

  const year = Number.parseInt(matched[1], 10);
  const month = Number.parseInt(matched[2], 10);
  const day = Number.parseInt(matched[3], 10);
  const calendarProbe = new Date();

  calendarProbe.setHours(0, 0, 0, 0);
  calendarProbe.setFullYear(year, month - 1, day);

  const isRealDate =
    calendarProbe.getFullYear() === year &&
    calendarProbe.getMonth() === month - 1 &&
    calendarProbe.getDate() === day;

  return isRealDate ? `${matched[1]}-${matched[2]}-${matched[3]}` : "";
}

function normalizeMilestoneText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function normalizeShortText(value, maxLength) {
  return normalizeMilestoneText(value).slice(0, maxLength);
}

function hasField(source, key) {
  return Object.prototype.hasOwnProperty.call(Object(source), key);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function serializeMilestoneRow(row, photos = []) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    occurredOn: String(row.occurred_on ?? ""),
    category: String(row.category ?? ""),
    title: String(row.title ?? ""),
    note: String(row.note ?? ""),
    photos: Array.isArray(photos) ? photos : [],
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function parseMilestoneId(rawValue) {
  const normalized = String(rawValue ?? "").trim();

  if (!MILESTONE_ID_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function listStoredMilestones(db, profileId) {
  const rows = all(
    db,
    `
      SELECT ${MILESTONE_SELECT_FIELDS}
      FROM growth_milestones
      WHERE profile_id = ?
      ORDER BY occurred_on DESC, id DESC
    `,
    [profileId]
  );
  // 一次把这一批记录的照片全取回来，避免每条各查一次。
  const photosByMilestoneId = milestonePhotos.listPhotosByOwnerIds(
    db,
    rows.map((row) => Number(row.id))
  );

  return rows.map((row) => serializeMilestoneRow(row, photosByMilestoneId.get(Number(row.id)) ?? []));
}

function getStoredMilestone(db, milestoneId, profileId) {
  return get(
    db,
    `
      SELECT ${MILESTONE_SELECT_FIELDS}
      FROM growth_milestones
      WHERE id = ? AND profile_id = ?
    `,
    [milestoneId, profileId]
  );
}

function getSerializedMilestone(db, milestoneId, profileId) {
  const row = getStoredMilestone(db, milestoneId, profileId);

  return row ? serializeMilestoneRow(row, milestonePhotos.listPhotos(db, milestoneId)) : null;
}

function insertStoredMilestone(db, profileId, milestone) {
  const createdAt = new Date().toISOString();
  const insertResult = run(
    db,
    `
      INSERT INTO growth_milestones (
        profile_id,
        occurred_on,
        category,
        title,
        note,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      profileId,
      milestone.occurredOn,
      milestone.category,
      milestone.title,
      milestone.note,
      createdAt,
      createdAt
    ]
  );

  return getStoredMilestone(db, Number(insertResult.lastInsertRowid), profileId);
}

function updateStoredMilestone(db, milestoneId, profileId, milestone) {
  const assignments = [];
  const params = [];

  for (const [fieldName, columnName] of Object.entries(PATCHABLE_COLUMNS)) {
    if (hasField(milestone, fieldName)) {
      assignments.push(`${columnName} = ?`);
      params.push(milestone[fieldName]);
    }
  }

  assignments.push("updated_at = ?");
  params.push(new Date().toISOString());

  const updateResult = run(
    db,
    `
      UPDATE growth_milestones
      SET ${assignments.join(", ")}
      WHERE id = ? AND profile_id = ?
    `,
    [...params, milestoneId, profileId]
  );

  if (Number(updateResult.changes) === 0) {
    return null;
  }

  return getStoredMilestone(db, milestoneId, profileId);
}

// 返回 { message, value }：message 非空表示校验失败（对应 400）。
//
// POST（partial = false）：occurredOn / category / title 必填；note 可省略。
// PATCH（partial = true）：只校验并返回「真的传了」的字段。
function normalizeMilestoneInput(rawBody, { partial = false } = {}) {
  const source = isPlainObject(rawBody) ? rawBody : {};
  const value = {};
  const shouldCheckRequired = (key) => (partial ? hasField(source, key) : true);
  const shouldCheckOptional = (key) => hasField(source, key);

  if (shouldCheckRequired("occurredOn")) {
    const occurredOn = normalizeOccurredOn(source.occurredOn);

    if (!occurredOn) {
      return { message: "occurredOn 必须是 YYYY-MM-DD 格式的真实日期。", value: null };
    }

    const todayDateKey = getLocalDateKey();

    if (occurredOn > todayDateKey) {
      return { message: `occurredOn 不能晚于今天（${todayDateKey}）。`, value: null };
    }

    value.occurredOn = occurredOn;
  }

  if (shouldCheckRequired("category")) {
    const category = normalizeShortText(source.category, 32);

    if (!CATEGORY_IDS.includes(category)) {
      return { message: `category 仅支持：${CATEGORY_IDS.join("、")}。`, value: null };
    }

    value.category = category;
  }

  if (shouldCheckRequired("title")) {
    const title = normalizeMilestoneText(source.title);

    if (!title) {
      return { message: `title 需要 1–${MAX_TITLE_LENGTH} 个字。`, value: null };
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return { message: `title 最多 ${MAX_TITLE_LENGTH} 个字。`, value: null };
    }

    value.title = title;
  }

  if (shouldCheckOptional("note")) {
    const note = normalizeMilestoneText(source.note);

    if (note.length > MAX_NOTE_LENGTH) {
      return { message: `note 最多 ${MAX_NOTE_LENGTH} 个字。`, value: null };
    }

    value.note = note;
  }

  if (partial && Object.keys(value).length === 0) {
    return { message: "没有需要修改的字段。", value: null };
  }

  if (!partial) {
    value.note = value.note ?? "";
  }

  return { message: "", value };
}

// 别人的 id / 不存在的 id 统一走这里：同一个 404、同一句文案。
function sendMilestoneNotFound(res) {
  res.status(404).json({
    message: "这条成长记录不存在。"
  });
}

router.get("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthMilestonesTable(db);

    res.json({
      milestones: listStoredMilestones(db, profileId)
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.post("/", (req, res, next) => {
  const validationResult = normalizeMilestoneInput(req.body);

  if (validationResult.message) {
    res.status(400).json({
      message: validationResult.message
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    // 身份只认 cookie：body 里的 id / profileId 一律不参与归属判断。
    const profileId = getProfileId(req, res);

    ensureGrowthMilestonesTable(db);

    // 记录和照片在同一个 savepoint 里写：照片不合法时整条记录都不产生。
    const created = runInSavepoint(db, "create_growth_milestone", () => {
      const createdRow = insertStoredMilestone(db, profileId, validationResult.value);
      const milestoneId = Number(createdRow.id);
      const photoResult = milestonePhotos.insertPhotoList(db, milestoneId, profileId, req.body?.photos);

      if (photoResult.message) {
        throw Object.assign(new Error(photoResult.message), { isPhotoValidationError: true });
      }

      return getSerializedMilestone(db, milestoneId, profileId);
    });

    res.status(201).json({
      milestone: created
    });
  } catch (error) {
    if (error?.isPhotoValidationError) {
      res.status(400).json({
        message: error.message
      });
      return;
    }

    next(error);
  } finally {
    db.close();
  }
});

router.patch("/:id", (req, res, next) => {
  const milestoneId = parseMilestoneId(req.params?.id);

  if (milestoneId === null) {
    res.status(400).json({
      message: "成长记录 id 无效。"
    });
    return;
  }

  const validationResult = normalizeMilestoneInput(req.body, { partial: true });

  if (validationResult.message) {
    res.status(400).json({
      message: validationResult.message
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthMilestonesTable(db);

    const storedRow = getStoredMilestone(db, milestoneId, profileId);

    if (!storedRow) {
      sendMilestoneNotFound(res);
      return;
    }

    const updatedRow = updateStoredMilestone(db, milestoneId, profileId, validationResult.value);

    if (!updatedRow) {
      sendMilestoneNotFound(res);
      return;
    }

    res.json({
      milestone: serializeMilestoneRow(updatedRow, milestonePhotos.listPhotos(db, milestoneId))
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.delete("/:id", (req, res, next) => {
  const milestoneId = parseMilestoneId(req.params?.id);

  if (milestoneId === null) {
    res.status(400).json({
      message: "成长记录 id 无效。"
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthMilestonesTable(db);

    // 删记录时把照片一起删掉（先删文件再删行）：纪念册里不该留下没人认领的照片文件。
    const deleteResult = runInSavepoint(db, "delete_growth_milestone", () => {
      milestonePhotos.removePhotosForOwner(db, milestoneId);

      return run(
        db,
        `
          DELETE FROM growth_milestones
          WHERE id = ? AND profile_id = ?
        `,
        [milestoneId, profileId]
      );
    });

    // 硬删除：重复删除同一条返回 404，而不是「成功但什么都没删」。
    if (Number(deleteResult.changes) === 0) {
      sendMilestoneNotFound(res);
      return;
    }

    res.json({
      message: "这条成长记录已经删掉了。",
      deletedId: milestoneId
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

// 照片接口：/api/growth-milestones/:id/photos 与 /photos/:photoId。
// 具体路径必须挂在 /:id 之前，否则 /photos/3 会被当成 id 为 "photos" 的请求。
router.use(createPhotoRouter({ store: milestonePhotos, ownerTable: "growth_milestones" }));

module.exports = router;
module.exports.ensureGrowthMilestonesTable = ensureGrowthMilestonesTable;
module.exports.createMilestonePhotoMediaRouter = () =>
  createPhotoMediaRouter({
    // 取图入口是两条线共用的，所以两张照片表都要在。
    ensureOwnerTables(db) {
      ensureGrowthMilestonesTable(db);

      const { ensureGrowthFootprintsTable } = require("./growthFootprints");

      ensureGrowthFootprintsTable(db);
    }
  });
