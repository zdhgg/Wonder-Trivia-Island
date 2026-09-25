const { randomUUID } = require("node:crypto");
const express = require("express");
const { all, createDatabaseConnection, get, run } = require("../db/database");

// 共同成长足迹（Phase 2D-A1）：一条记录 = 真实发生过的一件「一起经历的事」。
//
// 这是一条**独立**的数据线，和闯关存档 / 错题本 / 长期成长账本都没有关系：
//   - 不写 growth_progress：不加探险印章、不开宝箱、不改知识岛阶段；
//   - 不写 challenge_progress，不写 study_record_book；
//   - 不产生任何自动成就，也没有经验值 / 连续签到 / 排行榜。
//
// 它只做一件事：把爸爸和女儿真正一起做过的事情，按「真实发生的那一天」存下来。
// 将来（2D-B 之后）共同成就与小岛纪念物都应该从这些真实事实**派生**，
// 而不是反过来先有成就再补记录——所以这里只存事实，不存任何成就 id。
const router = express.Router();
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 只接受不带前导零的正整数：0 / 负数 / 小数 / abc / 1e3 一律不算合法 id。
const FOOTPRINT_ID_PATTERN = /^[1-9]\d*$/;
// 经历的「性质」，不是成就等级。没有 special 这种类别——「特别」由标签表达。
const CATEGORY_IDS = Object.freeze(["learning", "explore", "outdoor", "create", "together"]);
// 固定标签：这些是「事情发生当时」才最容易知道的事实，事后再也可靠反推不出来。
const TAG_IDS = Object.freeze(["first", "special", "coop", "discover", "brave"]);
const MAX_TITLE_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;
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
// 懒建表：和 growth_progress / challenge_progress / study_record_book 一样，
// 不引入 migration 框架，也不在 init-db 里提前建表。
//
// category 刻意不加 CHECK(category IN ...)：SQLite 无法扩展已存在的 CHECK，
// 而类别是产品层会演进的东西，白名单校验放在代码里。
const createTableSql = `
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
const createIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_growth_footprints_profile_occurred
  ON growth_footprints (profile_id, occurred_on DESC, id DESC);
`;
// PATCH 允许修改的字段 → 数据库列。id / profile_id / created_at / updated_at 不在其中。
const PATCHABLE_COLUMNS = Object.freeze({
  occurredOn: "occurred_on",
  category: "category",
  title: "title",
  note: "note"
});

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

// 身份与另外三个 router 逐字一致：同一个 cookie 名、同一个格式、同一组 cookie 选项。
// 本轮不抽公共 profileCookie 模块（那要动三个稳定旧 router），所以这里保持一份相同实现。
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

// 服务端的「本地今天」，用本地年月日拼，和 growthProgress 的 getServerLocalDateKey 同一口径。
function getLocalDateKey(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = `${referenceDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${referenceDate.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 严格判断「真实日历日」：
//   先用正则卡住 YYYY-MM-DD，再把年月日塞进本地日期对象后**逐字段比对**。
// 不能只靠正则：2026-02-30 / 2026-13-01 格式都对，但不是真实日期；
// 也不能靠 new Date("2026-02-30")：它会把 2 月 30 日静默归一化成 3 月 2 日。
//
// 注意：occurred_on **没有**最早年份下限，合法规则只有三条——
//   1. YYYY-MM-DD 格式；2. 真实存在的日历日；3. 不晚于服务器本地今天。
// 下面那个 setFullYear 的基准日只是构造用的壳子，三个字段都会被显式覆盖，
// 所以基准日取什么值完全不影响判断，它更不是「允许的最早日期」。
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
  // 月份 / 日期溢出时会滚到下一个月（或下一年），逐字段比对立刻能发现。
  calendarProbe.setFullYear(year, month - 1, day);

  const isRealDate =
    calendarProbe.getFullYear() === year &&
    calendarProbe.getMonth() === month - 1 &&
    calendarProbe.getDate() === day;

  return isRealDate ? `${matched[1]}-${matched[2]}-${matched[3]}` : "";
}

// 只做「首尾 trim + CRLF → LF + 限制长度」，不折叠内部空格、不改写用户记录的内容。
function normalizeFootprintText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function normalizeShortText(value, maxLength) {
  return normalizeFootprintText(value).slice(0, maxLength);
}

function hasField(source, key) {
  return Object.prototype.hasOwnProperty.call(Object(source), key);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// 读取数据库里的 tags_json：脏数据安全降级成 []，绝不让一条坏记录把整个 GET 打成 500。
// 同时顺手完成「未知标签剔除 / 去重 / 固定顺序」——顺序永远由 TAG_IDS 决定。
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

function serializeFootprintRow(row) {
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
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function ensureGrowthFootprintsTable(db) {
  run(db, createTableSql);
  run(db, createIndexSql);
}

// 返回 { message, value }：message 非空表示校验失败（对应 400），value 是可直接落库的字段集合。
//
// POST（partial = false）：occurredOn / category / title 必填；note / tags 可省略。
// PATCH（partial = true）：只校验并返回「真的传了」的字段，从而实现
//   - 没传 tags → 不修改
//   - tags: []  → 清空
function normalizeFootprintInput(rawBody, { partial = false } = {}) {
  const source = isPlainObject(rawBody) ? rawBody : {};
  const value = {};
  const shouldCheckRequired = (key) => (partial ? hasField(source, key) : true);
  const shouldCheckOptional = (key) => hasField(source, key);

  if (shouldCheckRequired("occurredOn")) {
    const occurredOn = normalizeOccurredOn(source.occurredOn);

    if (!occurredOn) {
      return {
        message: "occurredOn 必须是 YYYY-MM-DD 格式的真实日期。",
        value: null
      };
    }

    // 允许补录任意历史真实日期，但未来日期没有「事情发生过」的语义。
    const todayDateKey = getLocalDateKey();

    if (occurredOn > todayDateKey) {
      return {
        message: `occurredOn 不能晚于今天（${todayDateKey}）。`,
        value: null
      };
    }

    value.occurredOn = occurredOn;
  }

  if (shouldCheckRequired("category")) {
    const category = normalizeShortText(source.category, 32);

    if (!CATEGORY_IDS.includes(category)) {
      return {
        message: `category 仅支持：${CATEGORY_IDS.join("、")}。`,
        value: null
      };
    }

    value.category = category;
  }

  if (shouldCheckRequired("title")) {
    const title = normalizeFootprintText(source.title);

    if (!title) {
      return {
        message: `title 需要 1–${MAX_TITLE_LENGTH} 个字。`,
        value: null
      };
    }

    // 超长直接拒绝，不静默截断：截断就是在改写用户记录的内容。
    if (title.length > MAX_TITLE_LENGTH) {
      return {
        message: `title 最多 ${MAX_TITLE_LENGTH} 个字。`,
        value: null
      };
    }

    value.title = title;
  }

  if (shouldCheckOptional("note")) {
    const note = normalizeFootprintText(source.note);

    if (note.length > MAX_NOTE_LENGTH) {
      return {
        message: `note 最多 ${MAX_NOTE_LENGTH} 个字。`,
        value: null
      };
    }

    value.note = note;
  }

  if (shouldCheckOptional("tags")) {
    if (!Array.isArray(source.tags)) {
      return {
        message: "tags 必须是数组。",
        value: null
      };
    }

    const normalizedTags = source.tags.map((tag) => String(tag ?? "").trim());
    const unknownTag = normalizedTags.find((tag) => !TAG_IDS.includes(tag));

    if (unknownTag !== undefined) {
      return {
        message: `tags 仅支持：${TAG_IDS.join("、")}。`,
        value: null
      };
    }

    // 去重 + 固定顺序都由 TAG_IDS 决定，客户端传什么顺序都不影响落库结果。
    value.tags = TAG_IDS.filter((tagId) => normalizedTags.includes(tagId));
  }

  if (partial && Object.keys(value).length === 0) {
    return {
      message: "没有需要修改的字段。",
      value: null
    };
  }

  if (!partial) {
    value.note = value.note ?? "";
    value.tags = value.tags ?? [];
  }

  return {
    message: "",
    value
  };
}

function parseFootprintId(rawValue) {
  const normalized = String(rawValue ?? "").trim();

  if (!FOOTPRINT_ID_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function listStoredFootprints(db, profileId) {
  return all(
    db,
    `
      SELECT ${FOOTPRINT_SELECT_FIELDS}
      FROM growth_footprints
      WHERE profile_id = ?
      ORDER BY occurred_on DESC, id DESC
    `,
    [profileId]
  ).map(serializeFootprintRow);
}

// 只按 (id, profile_id) 取：别人的 id 会自然查不到，不需要先 SELECT 再判断归属。
function getStoredFootprint(db, footprintId, profileId) {
  return get(
    db,
    `
      SELECT ${FOOTPRINT_SELECT_FIELDS}
      FROM growth_footprints
      WHERE id = ? AND profile_id = ?
    `,
    [footprintId, profileId]
  );
}

function insertStoredFootprint(db, profileId, footprint) {
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

  return getStoredFootprint(db, Number(insertResult.lastInsertRowid), profileId);
}

function updateStoredFootprint(db, footprintId, profileId, footprint) {
  const assignments = [];
  const params = [];

  for (const [fieldName, columnName] of Object.entries(PATCHABLE_COLUMNS)) {
    if (hasField(footprint, fieldName)) {
      assignments.push(`${columnName} = ?`);
      params.push(footprint[fieldName]);
    }
  }

  if (hasField(footprint, "tags")) {
    assignments.push("tags_json = ?");
    params.push(JSON.stringify(footprint.tags));
  }

  assignments.push("updated_at = ?");
  params.push(new Date().toISOString());

  const updateResult = run(
    db,
    `
      UPDATE growth_footprints
      SET ${assignments.join(", ")}
      WHERE id = ? AND profile_id = ?
    `,
    [...params, footprintId, profileId]
  );

  // 受影响行数为 0 = 这个 id 既不存在、也不属于当前 profile。
  if (Number(updateResult.changes) === 0) {
    return null;
  }

  return getStoredFootprint(db, footprintId, profileId);
}

// 别人的 id / 不存在的 id 统一走这里：同一个 404、同一句文案，不透露「存在但不是你的」。
function sendFootprintNotFound(res) {
  res.status(404).json({
    message: "这条足迹不存在。"
  });
}

router.get("/", (req, res, next) => {
  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthFootprintsTable(db);

    res.json({
      footprints: listStoredFootprints(db, profileId)
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.post("/", (req, res, next) => {
  const validationResult = normalizeFootprintInput(req.body);

  if (validationResult.message) {
    res.status(400).json({
      message: validationResult.message
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    // 身份只认 cookie：body 里的 id / profileId / profile_id 一律不参与归属判断。
    const profileId = getProfileId(req, res);

    ensureGrowthFootprintsTable(db);

    const createdRow = insertStoredFootprint(db, profileId, validationResult.value);

    res.status(201).json({
      footprint: serializeFootprintRow(createdRow)
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.patch("/:id", (req, res, next) => {
  const footprintId = parseFootprintId(req.params?.id);

  if (footprintId === null) {
    res.status(400).json({
      message: "足迹 id 无效。"
    });
    return;
  }

  const validationResult = normalizeFootprintInput(req.body, { partial: true });

  if (validationResult.message) {
    res.status(400).json({
      message: validationResult.message
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthFootprintsTable(db);

    const updatedRow = updateStoredFootprint(db, footprintId, profileId, validationResult.value);

    if (!updatedRow) {
      sendFootprintNotFound(res);
      return;
    }

    res.json({
      footprint: serializeFootprintRow(updatedRow)
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.delete("/:id", (req, res, next) => {
  const footprintId = parseFootprintId(req.params?.id);

  if (footprintId === null) {
    res.status(400).json({
      message: "足迹 id 无效。"
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    const profileId = getProfileId(req, res);

    ensureGrowthFootprintsTable(db);

    const deleteResult = run(
      db,
      `
        DELETE FROM growth_footprints
        WHERE id = ? AND profile_id = ?
      `,
      [footprintId, profileId]
    );

    // 硬删除：重复删除同一条返回 404，而不是「成功但什么都没删」。
    if (Number(deleteResult.changes) === 0) {
      sendFootprintNotFound(res);
      return;
    }

    res.json({
      message: "这条足迹已经删掉了。",
      deletedId: footprintId
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

module.exports = router;
