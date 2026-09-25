const { randomUUID } = require("node:crypto");
const express = require("express");
const { all, createDatabaseConnection, get, run, runInSavepoint } = require("../db/database");
const {
  ensurePhotosTable,
  insertPhotoList
} = require("./growthFootprintPhotos");

// 「下次我们一起做什么」（Phase 2D-B1）。
//
// 两条数据线在这里各自保持简单：
//   想一起做 = 一个轻量的清单（growth_plans），收藏的是**还没发生**的事；
//   一起做过 = 真实发生过的足迹（growth_footprints），由 Phase 2D-A1 负责。
//
// 所以这里的 complete 接口是本文件唯一会写 footprints 的地方，
// 它做的是「把一条想做变成一条足迹，并把想做删掉」——原子完成，不会留下孤儿记录。
//
// 不产生任何自动成就 / 印章 / XP：完成一个想做只是多了一条真实足迹。
const router = express.Router();
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 只接受不带前导零的正整数：0 / 负数 / 小数 / abc / 1e3 一律不算合法 id。
const PLAN_ID_PATTERN = /^[1-9]\d*$/;
// 与 growthFootprints 同一套类别（记忆册的类别本来就是「经历的性质」）。
// 推荐清单在**展示层**分成探索 / 动手 / 出门 / 创作 / 生活 / 聊天六组，
// 但落库的 category 仍然是这五个之一，两侧不会各自长出一套分类。
const CATEGORY_IDS = Object.freeze(["learning", "explore", "outdoor", "create", "together"]);
const TAG_IDS = Object.freeze(["first", "special", "coop", "discover", "brave"]);
const MAX_TITLE_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;
const MAX_DURATION_MINUTES = 24 * 60;
// 推荐 id 允许承载来源信息（rec_first-campfire），自定义条目不带来源。
const SOURCE_ID_PATTERN = /^rec_[a-z0-9-]{1,64}$/;
const PLAN_SELECT_FIELDS = ["id", "source_id", "title", "note", "category", "duration_minutes", "created_at"].join(", ");
const FOOTPRINT_SELECT_FIELDS = [
  "id",
  "occurred_on",
  "category",
  "title",
  "note",
  "tags_json",
  "created_at",
  "updated_at"
].join(", ");

// 懒建表：和 growth_progress / growth_footprints 一样，不引入 migration 框架。
// source_id 只对「来自内置推荐」的行做唯一约束（自定义条目为 NULL，SQLite 允许多个 NULL）。
const createTableSql = `
  CREATE TABLE IF NOT EXISTS growth_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    source_id TEXT,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    duration_minutes INTEGER,
    created_at TEXT NOT NULL
  );
`;
const createUniqueIndexSql = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_plans_profile_source
  ON growth_plans (profile_id, source_id);
`;
const createOrderIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_growth_plans_profile_created
  ON growth_plans (profile_id, created_at DESC, id DESC);
`;
// 与 growthFootprints 逐字一致的懒建表 SQL：complete 会写这张表，
// 不能假设那些 route 已经先被访问过（否则第一次访问就是 500）。
const createFootprintsTableSql = `
  CREATE TABLE IF NOT EXISTS growth_footprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    occurred_on TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

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

// 服务端的「本地今天」，用本地年月日拼，和 growthFootprints 同一口径。
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

function normalizePlanText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function normalizeShortText(value, maxLength) {
  return normalizePlanText(value).slice(0, maxLength);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseStoredTags(rawTagsJson) {
  let parsedTags = null;

  try {
    parsedTags = JSON.parse(String(rawTagsJson ?? ""));
  } catch {
    return [];
  }

  if (!Array.isArray(parsedTags)) {
    return [];
  }

  const normalizedTags = parsedTags.map((tag) => String(tag ?? "").trim());

  return TAG_IDS.filter((tagId) => normalizedTags.includes(tagId));
}

function serializePlanRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    sourceId: row.source_id === null || row.source_id === undefined ? "" : String(row.source_id),
    title: String(row.title ?? ""),
    note: String(row.note ?? ""),
    category: String(row.category ?? ""),
    durationMinutes: row.duration_minutes === null || row.duration_minutes === undefined ? null : Number(row.duration_minutes),
    createdAt: String(row.created_at ?? "")
  };
}

function serializeFootprintRow(row, photos = []) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    occurredOn: String(row.occurred_on ?? ""),
    category: String(row.category ?? ""),
    title: String(row.title ?? ""),
    note: String(row.note ?? ""),
    tags: parseStoredTags(row.tags_json),
    photos: Array.isArray(photos) ? photos : [],
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function ensureGrowthPlansTables(db) {
  run(db, createTableSql);
  run(db, createUniqueIndexSql);
  run(db, createOrderIndexSql);
  run(db, createFootprintsTableSql);
  ensurePhotosTable(db);
}

function parsePlanId(rawValue) {
  const normalized = String(rawValue ?? "").trim();

  if (!PLAN_ID_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function listStoredPlans(db, profileId) {
  return all(
    db,
    `
      SELECT ${PLAN_SELECT_FIELDS}
      FROM growth_plans
      WHERE profile_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [profileId]
  ).map(serializePlanRow);
}

function getStoredPlan(db, planId, profileId) {
  return get(
    db,
    `
      SELECT ${PLAN_SELECT_FIELDS}
      FROM growth_plans
      WHERE id = ? AND profile_id = ?
    `,
    [planId, profileId]
  );
}

// 想做清单只保留「还没发生的事」，所以这里只有一个字段可改。
//
// 注意：PATCH 允许只传 title（或只传 note），但 UPDATE 两条都要写，
// 所以这里把没传的字段用当前值补齐——绝不能把 undefined 绑进 SQL 参数（SQLite 会直接抛错）。
function updateStoredPlan(db, planId, profileId, storedPlan, patch) {
  const nextTitle = Object.prototype.hasOwnProperty.call(patch, "title")
    ? patch.title
    : String(storedPlan.title ?? "");
  const nextNote = Object.prototype.hasOwnProperty.call(patch, "note")
    ? patch.note
    : String(storedPlan.note ?? "");

  const updateResult = run(
    db,
    `
      UPDATE growth_plans
      SET title = ?, note = ?
      WHERE id = ? AND profile_id = ?
    `,
    [nextTitle, nextNote, planId, profileId]
  );

  if (Number(updateResult.changes) === 0) {
    return null;
  }

  return getStoredPlan(db, planId, profileId);
}

// 返回 { message, value }：message 非空表示校验失败（对应 400），value 是可直接落库的字段集合。
//
// 这个接口一个请求只做一件事（加一条想做），所以不做部分更新：
// PATCH 只允许改 title / note，避免把「换个标题」写成一次隐式的类别 / 时长改写。
function normalizePlanInput(rawBody, { partial = false } = {}) {
  const source = isPlainObject(rawBody) ? rawBody : {};
  const hasField = (key) => Object.prototype.hasOwnProperty.call(source, key);
  const value = {};

  if (!partial) {
    const title = normalizePlanText(source.title);

    if (!title) {
      return { message: `title 需要 1–${MAX_TITLE_LENGTH} 个字。`, value: null };
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return { message: `title 最多 ${MAX_TITLE_LENGTH} 个字。`, value: null };
    }

    const note = normalizePlanText(source.note);

    if (note.length > MAX_NOTE_LENGTH) {
      return { message: `note 最多 ${MAX_NOTE_LENGTH} 个字。`, value: null };
    }

    const category = normalizeShortText(source.category, 32);

    if (!CATEGORY_IDS.includes(category)) {
      return { message: `category 仅支持：${CATEGORY_IDS.join("、")}。`, value: null };
    }

    const sourceId = normalizePlanText(source.sourceId);

    // 只有推荐才允许带来源 id：自定义条目必须留空，否则会被唯一索引当成同一条。
    if (sourceId && !SOURCE_ID_PATTERN.test(sourceId)) {
      return { message: "sourceId 格式不正确。", value: null };
    }

    value.sourceId = sourceId || null;
    value.title = title;
    value.note = note;
    value.category = category;
    value.durationMinutes = normalizeDurationMinutes(source.durationMinutes);

    if (source.durationMinutes !== undefined && source.durationMinutes !== null && value.durationMinutes === null) {
      return { message: `durationMinutes 需要是 1–${MAX_DURATION_MINUTES} 之间的分钟数。`, value: null };
    }

    return { message: "", value };
  }

  if (!hasField("title") && !hasField("note")) {
    return { message: "没有需要修改的字段。", value: null };
  }

  if (hasField("title")) {
    const title = normalizePlanText(source.title);

    if (!title || title.length > MAX_TITLE_LENGTH) {
      return { message: `title 需要 1–${MAX_TITLE_LENGTH} 个字。`, value: null };
    }

    value.title = title;
  }

  if (hasField("note")) {
    const note = normalizePlanText(source.note);

    if (note.length > MAX_NOTE_LENGTH) {
      return { message: `note 最多 ${MAX_NOTE_LENGTH} 个字。`, value: null };
    }

    value.note = note;
  }

  return { message: "", value };
}

function normalizeDurationMinutes(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_DURATION_MINUTES) {
    return null;
  }

  return parsed;
}

// 完成时提交的是「一条足迹」：日期 / 类别 / 标题 / 记录 / 标签。
// 标题与类别由那条想做带过来，用户只需要补日期、类别、标签和一句记录。
function normalizeCompletionInput(rawBody, plan) {
  const source = isPlainObject(rawBody) ? rawBody : {};
  const occurredOn = normalizeOccurredOn(source.occurredOn);

  if (!occurredOn) {
    return { message: "occurredOn 必须是 YYYY-MM-DD 格式的真实日期。", value: null };
  }

  const todayDateKey = getLocalDateKey();

  if (occurredOn > todayDateKey) {
    return { message: `occurredOn 不能晚于今天（${todayDateKey}）。`, value: null };
  }

  const category = normalizeShortText(source.category ?? plan.category, 32);

  if (!CATEGORY_IDS.includes(category)) {
    return { message: `category 仅支持：${CATEGORY_IDS.join("、")}。`, value: null };
  }

  const title = normalizePlanText(source.title ?? plan.title);

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return { message: `title 需要 1–${MAX_TITLE_LENGTH} 个字。`, value: null };
  }

  const note = normalizePlanText(source.note);

  if (note.length > MAX_NOTE_LENGTH) {
    return { message: `note 最多 ${MAX_NOTE_LENGTH} 个字。`, value: null };
  }

  if (source.tags !== undefined && source.tags !== null && !Array.isArray(source.tags)) {
    return { message: "tags 必须是数组。", value: null };
  }

  const normalizedTags = Array.isArray(source.tags) ? source.tags.map((tag) => String(tag ?? "").trim()) : [];
  const unknownTag = normalizedTags.find((tag) => !TAG_IDS.includes(tag));

  if (unknownTag !== undefined) {
    return { message: `tags 仅支持：${TAG_IDS.join("、")}。`, value: null };
  }

  return {
    message: "",
    value: {
      occurredOn,
      category,
      title,
      note,
      tags: TAG_IDS.filter((tagId) => normalizedTags.includes(tagId))
    }
  };
}

function insertFootprint(db, profileId, footprint) {
  const createdAt = new Date().toISOString();
  const insertResult = run(
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
      profileId,
      footprint.occurredOn,
      footprint.category,
      footprint.title,
      footprint.note,
      JSON.stringify(footprint.tags),
      createdAt,
      createdAt
    ]
  );

  return get(
    db,
    `
      SELECT ${FOOTPRINT_SELECT_FIELDS}
      FROM growth_footprints
      WHERE id = ? AND profile_id = ?
    `,
    [Number(insertResult.lastInsertRowid), profileId]
  );
}

// 别人的 id / 不存在的 id 统一走这里：同一个 404、同一句文案。
function sendPlanNotFound(res) {
  res.status(404).json({
    message: "这件事不在想一起做的清单里。"
  });
}

router.get("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthPlansTables(db);

    res.json({
      plans: listStoredPlans(db, profileId)
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.post("/", (req, res, next) => {
  const validationResult = normalizePlanInput(req.body);

  if (validationResult.message) {
    res.status(400).json({
      message: validationResult.message
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthPlansTables(db);

    const { sourceId } = validationResult.value;

    // 同一条推荐只加一次：重复加入时把already存在的那条原样返回（200 而不是 201），
    // 客户端因此不需要自己防重，也不会出现两行一模一样的推荐。
    if (sourceId) {
      const existingPlan = get(
        db,
        `
          SELECT ${PLAN_SELECT_FIELDS}
          FROM growth_plans
          WHERE profile_id = ? AND source_id = ?
        `,
        [profileId, sourceId]
      );

      if (existingPlan) {
        res.json({
          plan: serializePlanRow(existingPlan),
          alreadyPlanned: true
        });
        return;
      }
    }

    const createdAt = new Date().toISOString();
    const insertResult = run(
      db,
      `
        INSERT INTO growth_plans (
          profile_id,
          source_id,
          title,
          note,
          category,
          duration_minutes,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profileId,
        sourceId,
        validationResult.value.title,
        validationResult.value.note,
        validationResult.value.category,
        validationResult.value.durationMinutes,
        createdAt
      ]
    );

    res.status(201).json({
      plan: serializePlanRow(getStoredPlan(db, Number(insertResult.lastInsertRowid), profileId)),
      alreadyPlanned: false
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.patch("/:id", (req, res, next) => {
  const planId = parsePlanId(req.params?.id);

  if (planId === null) {
    res.status(400).json({
      message: "想做 id 无效。"
    });
    return;
  }

  const validationResult = normalizePlanInput(req.body, { partial: true });

  if (validationResult.message) {
    res.status(400).json({
      message: validationResult.message
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthPlansTables(db);

    const storedPlan = getStoredPlan(db, planId, profileId);

    if (!storedPlan) {
      sendPlanNotFound(res);
      return;
    }

    const updatedRow = updateStoredPlan(db, planId, profileId, storedPlan, validationResult.value);

    if (!updatedRow) {
      sendPlanNotFound(res);
      return;
    }

    res.json({
      plan: serializePlanRow(updatedRow)
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

// 完成：在同一个 savepoint 里「写一条足迹 + 删掉这条想做」。
// 任何一步失败都整体回滚，不会出现「纪念册里有了、想做清单里还留着」。
router.post("/:id/complete", (req, res, next) => {
  const planId = parsePlanId(req.params?.id);

  if (planId === null) {
    res.status(400).json({
      message: "想做 id 无效。"
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthPlansTables(db);

    const storedPlan = getStoredPlan(db, planId, profileId);

    if (!storedPlan) {
      sendPlanNotFound(res);
      return;
    }

    const validationResult = normalizeCompletionInput(req.body, serializePlanRow(storedPlan));

    if (validationResult.message) {
      res.status(400).json({
        message: validationResult.message
      });
      return;
    }

    const footprintRow = runInSavepoint(db, "complete_growth_plan", () => {
      const insertedRow = insertFootprint(db, profileId, validationResult.value);
      const footprintId = Number(insertedRow.id);
      // 照片和足迹、删想做在同一个 savepoint 里：照片不合法时整件事都不发生，
      // 那条想做会原样留在清单里。
      const photoResult = insertPhotoList(db, footprintId, profileId, req.body?.photos);

      if (photoResult.message) {
        throw Object.assign(new Error(photoResult.message), { isPhotoValidationError: true });
      }

      run(
        db,
        `
          DELETE FROM growth_plans
          WHERE id = ? AND profile_id = ?
        `,
        [planId, profileId]
      );

      return { insertedRow, photos: photoResult.values };
    });

    res.status(201).json({
      footprint: serializeFootprintRow(footprintRow.insertedRow, footprintRow.photos),
      completedPlanId: planId
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

router.delete("/:id", (req, res, next) => {
  const planId = parsePlanId(req.params?.id);

  if (planId === null) {
    res.status(400).json({
      message: "想做 id 无效。"
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthPlansTables(db);

    const deleteResult = run(
      db,
      `
        DELETE FROM growth_plans
        WHERE id = ? AND profile_id = ?
      `,
      [planId, profileId]
    );

    if (Number(deleteResult.changes) === 0) {
      sendPlanNotFound(res);
      return;
    }

    res.json({
      message: "这件事已经从想一起做里拿掉了。",
      deletedId: planId
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

module.exports = router;
