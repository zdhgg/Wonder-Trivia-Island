const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const express = require("express");
const { all, createDatabaseConnection, dbPath, get, run } = require("../db/database");

// 纪念册照片（Phase 2D-C1）。
//
// 存储方式：**文件落在磁盘上，数据库只存一行元数据**。
//   - 照片文件：backend/data/growth-photos/<uuid>.<ext>（和 trivia.db 同一个 data 目录，方便整目录拷贝）
//   - 元数据：growth_footprint_photos（footprint_id / profile_id / file_name / mime_type / byte_size）
//
// 为什么不用「把图片 base64 塞进数据库」：
//   一张手机照片哪怕压到 1280px 也有几百 KB，base64 还要再涨三分之一，
//   整个 SQLite 会被图片撑大、每次读列表都要拖着它走。文件放磁盘、库里只留指针最省事。
//
// 本轮刻意不做的：缩略图管线、EXIF 清理、图片裁剪、视频、云同步。
// 前端负责把照片压到 1280px / JPEG 再上传，所以这里只需要「存下来、取得回、删得掉」。
const router = express.Router();

// 照片和数据库放在同一个目录里（默认 backend/data/growth-photos）。
// 从 dbPath 派生而不是写死：测试用临时库时，照片也会落在临时目录里，
// 不可能污染真实家庭数据；将来整目录拷贝/备份也是自洽的。
const PHOTOS_DIR = path.join(path.dirname(dbPath), "growth-photos");
// 一张照片的上限。前端压缩后通常是 200–500 KB，这里留足余量但挡住明显的异常请求。
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
// 一本纪念册单条记录最多几张：不做附件管理器，只留几张回忆。
const MAX_PHOTOS_PER_FOOTPRINT = 6;
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const PHOTO_ID_PATTERN = /^[1-9]\d*$/;
const SUPPORTED_MIME_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
});
const PHOTO_SELECT_FIELDS = ["id", "footprint_id", "file_name", "mime_type", "byte_size", "created_at"].join(", ");

// 懒建表：和别的成长表一样，不引入 migration 框架。
const createTableSql = `
  CREATE TABLE IF NOT EXISTS growth_footprint_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    footprint_id INTEGER NOT NULL,
    profile_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`;
const createIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_growth_footprint_photos_footprint
  ON growth_footprint_photos (footprint_id, id ASC);
`;

function ensurePhotosTable(db) {
  run(db, createTableSql);
  run(db, createIndexSql);
}

function ensurePhotosDir() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }

  return PHOTOS_DIR;
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

// 只读身份：照片接口永远挂在某条足迹下，profile 只用于「这是不是你的记录」，
// 所以这里不负责发 cookie（发 cookie 的职责留在各 router 自己的 getProfileId）。
function readProfileId(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const profileId = String(cookies[PROFILE_COOKIE_NAME] || "").trim();

  return PROFILE_ID_PATTERN.test(profileId) ? profileId : "";
}

function parsePhotoId(rawValue) {
  const normalized = String(rawValue ?? "").trim();

  if (!PHOTO_ID_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function serializePhotoRow(row) {
  if (!row) {
    return null;
  }

  const photoId = Number(row.id);

  return {
    id: photoId,
    url: `/api/growth-footprints/photos/${photoId}`,
    mimeType: String(row.mime_type ?? ""),
    byteSize: Number(row.byte_size ?? 0),
    createdAt: String(row.created_at ?? "")
  };
}

function listStoredPhotos(db, footprintId) {
  return all(
    db,
    `
      SELECT ${PHOTO_SELECT_FIELDS}
      FROM growth_footprint_photos
      WHERE footprint_id = ?
      ORDER BY id ASC
    `,
    [footprintId]
  ).map(serializePhotoRow);
}

// 「服务端数据 → 展示模型」：一次 SELECT 把多条足迹的照片一起取回来，
// 避免列表接口 N+1 次查询。
function listStoredPhotosByFootprintIds(db, footprintIds) {
  const photosByFootprintId = new Map();
  const resolvedIds = (Array.isArray(footprintIds) ? footprintIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isSafeInteger(id) && id > 0);

  if (resolvedIds.length === 0) {
    return photosByFootprintId;
  }

  const placeholders = resolvedIds.map(() => "?").join(", ");
  const rows = all(
    db,
    `
      SELECT ${PHOTO_SELECT_FIELDS}
      FROM growth_footprint_photos
      WHERE footprint_id IN (${placeholders})
      ORDER BY id ASC
    `,
    resolvedIds
  );

  for (const row of rows) {
    const footprintId = Number(row.footprint_id);

    if (!photosByFootprintId.has(footprintId)) {
      photosByFootprintId.set(footprintId, []);
    }

    photosByFootprintId.get(footprintId).push(serializePhotoRow(row));
  }

  return photosByFootprintId;
}

function resolvePhotoFilePath(fileName) {
  const normalizedFileName = String(fileName ?? "").trim();

  // 只接受「我们自己生成的」文件名：uuid + 扩展名。任何带路径分隔符的输入一律拒绝，
  // 这样即使数据库被写脏也不可能读到目录外的文件。
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(normalizedFileName)) {
    return "";
  }

  return path.join(PHOTOS_DIR, normalizedFileName);
}

function removeStoredPhotoFile(fileName) {
  const filePath = resolvePhotoFilePath(fileName);

  if (!filePath) {
    return;
  }

  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // 文件删不掉不影响数据库一致性：记录已经没了，剩下的最多是一个孤儿文件。
  }
}

// 解析 data URL（`data:image/jpeg;base64,....`）。
// 只接受图片、只接受 base64，其它一律拒绝——不做任何"猜格式"的兜底。
function parsePhotoDataUrl(rawDataUrl) {
  const matched = /^data:([a-z0-9/+.-]+);base64,([a-z0-9+/=]+)$/i.exec(String(rawDataUrl ?? "").trim());

  if (!matched) {
    return { message: "照片格式不正确（需要 data URL）。", value: null };
  }

  const mimeType = matched[1].toLowerCase();
  const extension = SUPPORTED_MIME_TYPES[mimeType];

  if (!extension) {
    return { message: "照片只支持 JPEG / PNG / WebP。", value: null };
  }

  const buffer = Buffer.from(matched[2], "base64");

  if (buffer.length === 0) {
    return { message: "照片内容是空的。", value: null };
  }

  if (buffer.length > MAX_PHOTO_BYTES) {
    return {
      message: `一张照片最多 ${Math.floor(MAX_PHOTO_BYTES / 1024 / 1024)} MB。`,
      value: null
    };
  }

  return {
    message: "",
    value: {
      mimeType,
      extension,
      buffer
    }
  };
}

// 落盘 + 落库。返回 { message, value }，value 是可直接回给客户端的照片。
//
// 注意顺序：先写文件再写数据库。反过来一旦写库成功而落盘失败，
// 数据库里就会留下一行指向不存在文件的记录（列表里会出现永远加载不出来的照片）。
function insertPhoto(db, footprintId, profileId, photo) {
  const fileName = `${randomUUID()}.${photo.extension}`;

  ensurePhotosDir();
  fs.writeFileSync(path.join(PHOTOS_DIR, fileName), photo.buffer);

  try {
    const insertResult = run(
      db,
      `
        INSERT INTO growth_footprint_photos (
          footprint_id,
          profile_id,
          file_name,
          mime_type,
          byte_size,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [footprintId, profileId, fileName, photo.mimeType, photo.buffer.length, new Date().toISOString()]
    );

    return get(
      db,
      `
        SELECT ${PHOTO_SELECT_FIELDS}
        FROM growth_footprint_photos
        WHERE id = ?
      `,
      [Number(insertResult.lastInsertRowid)]
    );
  } catch (error) {
    // 写库失败就把刚写下的文件删掉，不留孤儿。
    removeStoredPhotoFile(fileName);
    throw error;
  }
}

// 一条足迹的照片一起写：超过上限的部分直接拒绝（不静默丢弃）。
// 返回 { message, values }（values 是已落库的行）。
function insertPhotoList(db, footprintId, profileId, rawPhotos) {
  if (rawPhotos === undefined || rawPhotos === null) {
    return { message: "", values: [] };
  }

  if (!Array.isArray(rawPhotos)) {
    return { message: "photos 必须是数组。", values: [] };
  }

  if (rawPhotos.length === 0) {
    return { message: "", values: [] };
  }

  const existingCount = Number(
    get(
      db,
      `
        SELECT COUNT(*) AS total
        FROM growth_footprint_photos
        WHERE footprint_id = ?
      `,
      [footprintId]
    )?.total || 0
  );

  if (existingCount + rawPhotos.length > MAX_PHOTOS_PER_FOOTPRINT) {
    return {
      message: `一条记录最多放 ${MAX_PHOTOS_PER_FOOTPRINT} 张照片。`,
      values: []
    };
  }

  const parsedPhotos = [];

  for (const rawPhoto of rawPhotos) {
    const parsed = parsePhotoDataUrl(rawPhoto);

    if (parsed.message) {
      return { message: parsed.message, values: [] };
    }

    parsedPhotos.push(parsed.value);
  }

  const values = [];

  for (const photo of parsedPhotos) {
    values.push(insertPhoto(db, footprintId, profileId, photo));
  }

  return {
    message: "",
    values: values.map(serializePhotoRow)
  };
}

// 删除某条足迹的全部照片（足迹本身被删时调用）：先删文件，再删记录。
function removeStoredPhotosForFootprint(db, footprintId) {
  const rows = all(
    db,
    `
      SELECT file_name
      FROM growth_footprint_photos
      WHERE footprint_id = ?
    `,
    [footprintId]
  );

  run(
    db,
    `
      DELETE FROM growth_footprint_photos
      WHERE footprint_id = ?
    `,
    [footprintId]
  );

  for (const row of rows) {
    removeStoredPhotoFile(row.file_name);
  }
}

function sendPhotoNotFound(res) {
  res.status(404).json({
    message: "这张照片不在了。"
  });
}

// 别人的足迹 / 不存在的足迹统一走这里：同一个 404、同一句文案。
function sendFootprintNotFound(res) {
  res.status(404).json({
    message: "这条足迹不存在。"
  });
}

// 照片接口永远挂在某条足迹下，所以每次都要先确认这条足迹属于当前 profile。
// 返回 { db, footprintId } 或 null（已经回过 404）。
function openOwnedFootprint(req, res) {
  const footprintId = parsePhotoId(req.params?.id);

  if (footprintId === null) {
    res.status(400).json({
      message: "足迹 id 无效。"
    });
    return null;
  }

  const db = createDatabaseConnection();

  ensurePhotosTable(db);

  const owned = get(    db,
    `
      SELECT id
      FROM growth_footprints
      WHERE id = ? AND profile_id = ?
    `,
    [footprintId, readProfileId(req)]
  );

  if (!owned) {
    db.close();
    sendFootprintNotFound(res);
    return null;
  }

  return { db, footprintId };
}

// ---------------------------------------------------------------------------
// 一条足迹的照片：/api/growth-footprints/:id/photos
// ---------------------------------------------------------------------------
router.post("/:id/photos", (req, res, next) => {
  const opened = openOwnedFootprint(req, res);

  if (!opened) {
    return;
  }

  const { db, footprintId } = opened;

  try {
    const photoResult = insertPhotoList(db, footprintId, readProfileId(req), [req.body?.dataUrl]);

    if (photoResult.message) {
      res.status(400).json({
        message: photoResult.message
      });
      return;
    }

    res.status(201).json({
      photo: photoResult.values[0]
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

router.delete("/:id/photos/:photoId", (req, res, next) => {
  const opened = openOwnedFootprint(req, res);

  if (!opened) {
    return;
  }

  const { db, footprintId } = opened;
  const photoId = parsePhotoId(req.params?.photoId);

  if (photoId === null) {
    db.close();
    res.status(400).json({
      message: "照片 id 无效。"
    });
    return;
  }

  try {
    const row = get(
      db,
      `
        SELECT file_name
        FROM growth_footprint_photos
        WHERE id = ? AND footprint_id = ?
      `,
      [photoId, footprintId]
    );

    if (!row) {
      sendPhotoNotFound(res);
      return;
    }

    run(
      db,
      `
        DELETE FROM growth_footprint_photos
        WHERE id = ? AND footprint_id = ?
      `,
      [photoId, footprintId]
    );
    removeStoredPhotoFile(row.file_name);

    res.json({
      message: "这张照片已经拿掉了。",
      deletedId: photoId
    });
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

// ---------------------------------------------------------------------------
// 图片本体：/api/growth-footprints/photos/:photoId
//
// 挂在 /api 下（和别的接口同一个代理前缀），前端 <img src> 直接可用。
// 本地家庭系统、照片 id 不可枚举，这里不再做一次 profile 校验：
// 校验会把 <img> 变成需要带凭证的请求，收益却接近于零。
// ---------------------------------------------------------------------------
router.get("/photos/:photoId", (req, res, next) => {
  const photoId = parsePhotoId(req.params?.photoId);

  if (photoId === null) {
    res.status(400).json({
      message: "照片 id 无效。"
    });
    return;
  }

  const db = createDatabaseConnection();

  try {
    // 图片本体可能在任何一次足迹接口之前被请求（比如刷新后浏览器直接取图），
    // 所以这里也保证两张表都在。
    const { ensureGrowthFootprintsTable } = require("./growthFootprints");

    ensureGrowthFootprintsTable(db);

    const row = get(
      db,
      `
        SELECT file_name, mime_type
        FROM growth_footprint_photos
        WHERE id = ?
      `,
      [photoId]
    );

    if (!row) {
      sendPhotoNotFound(res);
      return;
    }

    const filePath = resolvePhotoFilePath(row.file_name);

    if (!filePath || !fs.existsSync(filePath)) {
      sendPhotoNotFound(res);
      return;
    }

    res.setHeader("Content-Type", String(row.mime_type || "application/octet-stream"));
    // 照片内容不会变（换照片是删旧 + 加新），所以可以放心长缓存。
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  } finally {
    db.close();
  }
});

module.exports = {
  MAX_PHOTOS_PER_FOOTPRINT,
  MAX_PHOTO_BYTES,
  ensurePhotosTable,
  insertPhotoList,
  listStoredPhotos,
  listStoredPhotosByFootprintIds,
  readProfileId,
  removeStoredPhotoFile,
  removeStoredPhotosForFootprint,
  router,
  serializePhotoRow
};
