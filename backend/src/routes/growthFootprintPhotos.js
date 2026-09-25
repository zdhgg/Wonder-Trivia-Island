const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const express = require("express");
const { all, createDatabaseConnection, dbPath, get, run } = require("../db/database");

// 纪念册照片（Phase 2D-C1 / D1）。
//
// 存储方式：**文件落在磁盘上，数据库只存一行元数据**。
//   - 照片文件：backend/data/growth-photos/<uuid>.<ext>（和 trivia.db 同一个 data 目录，方便整目录拷贝）
//   - 元数据：每个记录类型一张自己的照片表（footprint_id / milestone_id 指向自己的记录）
//
// 为什么不用「把图片 base64 塞进数据库」：
//   一张手机照片哪怕压到 1280px 也有几百 KB，base64 还要再涨三分之一，
//   整个 SQLite 会被图片撑大、每次读列表都要拖着它走。文件放磁盘、库里只留指针最省事。
//
// 为什么每一类记录一张照片表：SQLite 没法给一个列同时加两个外键候选，
// 而纪念册本来就分「我们一起（足迹）」和「她的成长（成长记录）」两条线，
// 各自一张表比往一张表里塞 kind 更清楚，也不会让两条线的删除逻辑互相牵连。
// 代价只是一份工厂代码——所以这里用 createPhotoStore() 生成，逻辑只写一遍。
//
// 本轮刻意不做的：缩略图管线、EXIF 清理、图片裁剪、视频、云同步。
// 前端负责把照片压到 1280px / JPEG 再上传，所以这里只需要「存下来、取得回、删得掉」。

// 照片和数据库放在同一个目录里（默认 backend/data/growth-photos）。
// 从 dbPath 派生而不是写死：测试用临时库时，照片也会落在临时目录里，
// 不可能污染真实家庭数据；将来整目录拷贝/备份也是自洽的。
// TRIVIA_PHOTOS_DIR 是给测试用的：多个测试文件各用各的目录，互不干扰。
const PHOTOS_DIR = process.env.TRIVIA_PHOTOS_DIR
  ? path.resolve(process.env.TRIVIA_PHOTOS_DIR)
  : path.join(path.dirname(dbPath), "growth-photos");
// 一张照片的上限。前端压缩后通常是 200–500 KB，这里留足余量但挡住明显的异常请求。
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
// 一条记录最多几张：不做附件管理器，只留几张回忆。
const MAX_PHOTOS_PER_RECORD = 6;
const PROFILE_COOKIE_NAME = "wonder_trivia_profile";
const PROFILE_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;
const PHOTO_ID_PATTERN = /^[1-9]\d*$/;
const SUPPORTED_MIME_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
});

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

// 只读身份：照片接口永远挂在某条记录下，profile 只用于「这是不是你的记录」，
// 所以这里不负责发 cookie（发 cookie 的职责留在各 router 自己的 getProfileId）。
function readProfileId(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const profileId = String(cookies[PROFILE_COOKIE_NAME] || "").trim();

  return PROFILE_ID_PATTERN.test(profileId) ? profileId : "";
}

function parsePositiveId(rawValue) {
  const normalized = String(rawValue ?? "").trim();

  if (!PHOTO_ID_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isSafeInteger(parsed) ? parsed : null;
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

// 给一类记录（足迹 / 成长记录）造一套照片能力。
//
// 每条线各调一次：表名、外键列名、图片 URL 前缀不同，其余逻辑完全一样。
function createPhotoStore({ tableName, ownerColumn, urlPath }) {
  const selectFields = ["id", ownerColumn, "file_name", "mime_type", "byte_size", "created_at"].join(", ");
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${ownerColumn} INTEGER NOT NULL,
      profile_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `;
  const createIndexSql = `
    CREATE INDEX IF NOT EXISTS idx_${tableName}_owner
    ON ${tableName} (${ownerColumn}, id ASC);
  `;

  function ensureTable(db) {
    run(db, createTableSql);
    run(db, createIndexSql);
  }

  function serializeRow(row) {
    if (!row) {
      return null;
    }

    const photoId = Number(row.id);

    return {
      id: photoId,
      url: `${urlPath}/${photoId}`,
      mimeType: String(row.mime_type ?? ""),
      byteSize: Number(row.byte_size ?? 0),
      createdAt: String(row.created_at ?? "")
    };
  }

  function listPhotos(db, ownerId) {
    return all(
      db,
      `
        SELECT ${selectFields}
        FROM ${tableName}
        WHERE ${ownerColumn} = ?
        ORDER BY id ASC
      `,
      [ownerId]
    ).map(serializeRow);
  }

  // 一次 SELECT 把多条记录的照片一起取回来，避免列表接口 N+1 次查询。
  function listPhotosByOwnerIds(db, ownerIds) {
    const photosByOwnerId = new Map();
    const resolvedIds = (Array.isArray(ownerIds) ? ownerIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isSafeInteger(id) && id > 0);

    if (resolvedIds.length === 0) {
      return photosByOwnerId;
    }

    const placeholders = resolvedIds.map(() => "?").join(", ");
    const rows = all(
      db,
      `
        SELECT ${selectFields}
        FROM ${tableName}
        WHERE ${ownerColumn} IN (${placeholders})
        ORDER BY id ASC
      `,
      resolvedIds
    );

    for (const row of rows) {
      const ownerId = Number(row[ownerColumn]);

      if (!photosByOwnerId.has(ownerId)) {
        photosByOwnerId.set(ownerId, []);
      }

      photosByOwnerId.get(ownerId).push(serializeRow(row));
    }

    return photosByOwnerId;
  }

  // 落盘 + 落库。
  //
  // 注意顺序：先写文件再写数据库。反过来一旦写库成功而落盘失败，
  // 数据库里就会留下一行指向不存在文件的记录（列表里会出现永远加载不出来的照片）。
  function insertPhoto(db, ownerId, profileId, photo) {
    const fileName = `${randomUUID()}.${photo.extension}`;

    ensurePhotosDir();
    fs.writeFileSync(path.join(PHOTOS_DIR, fileName), photo.buffer);

    try {
      const insertResult = run(
        db,
        `
          INSERT INTO ${tableName} (
            ${ownerColumn},
            profile_id,
            file_name,
            mime_type,
            byte_size,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [ownerId, profileId, fileName, photo.mimeType, photo.buffer.length, new Date().toISOString()]
      );

      return get(
        db,
        `
          SELECT ${selectFields}
          FROM ${tableName}
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

  // 一条记录的照片一起写：超过上限的部分直接拒绝（不静默丢弃）。
  // 返回 { message, values }（values 是已落库并序列化好的照片）。
  function insertPhotoList(db, ownerId, profileId, rawPhotos) {
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
          FROM ${tableName}
          WHERE ${ownerColumn} = ?
        `,
        [ownerId]
      )?.total || 0
    );

    if (existingCount + rawPhotos.length > MAX_PHOTOS_PER_RECORD) {
      return {
        message: `一条记录最多放 ${MAX_PHOTOS_PER_RECORD} 张照片。`,
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
      values.push(insertPhoto(db, ownerId, profileId, photo));
    }

    return {
      message: "",
      values: values.map(serializeRow)
    };
  }

  // 删除某条记录的全部照片（记录本身被删时调用）：先删文件，再删行。
  function removePhotosForOwner(db, ownerId) {
    const rows = all(
      db,
      `
        SELECT file_name
        FROM ${tableName}
        WHERE ${ownerColumn} = ?
      `,
      [ownerId]
    );

    run(
      db,
      `
        DELETE FROM ${tableName}
        WHERE ${ownerColumn} = ?
      `,
      [ownerId]
    );

    for (const row of rows) {
      removeStoredPhotoFile(row.file_name);
    }
  }

  return {
    ensureTable,
    insertPhotoList,
    listPhotos,
    listPhotosByOwnerIds,
    removePhotosForOwner,
    serializeRow,
    ownerColumn,
    tableName
  };
}

// 「我们一起」的足迹照片（growth_footprints）。
const footprintPhotos = createPhotoStore({
  tableName: "growth_footprint_photos",
  ownerColumn: "footprint_id",
  urlPath: "/api/growth-footprints/photos"
});

// 「她的成长」的成长记录照片（growth_milestones）。
const milestonePhotos = createPhotoStore({
  tableName: "growth_milestone_photos",
  ownerColumn: "milestone_id",
  urlPath: "/api/growth-milestones/photos"
});

function sendPhotoNotFound(res) {
  res.status(404).json({
    message: "这张照片不在了。"
  });
}

function sendOwnerNotFound(res) {
  res.status(404).json({
    message: "这条记录不存在。"
  });
}

// 照片接口永远挂在某条记录下，所以每次都要先确认这条记录属于当前 profile。
// 返回 { db, ownerId } 或 null（已经回过 4xx）。
function openOwnedRecord({ req, res, store, ownerTable }) {
  const ownerId = parsePositiveId(req.params?.id);

  if (ownerId === null) {
    res.status(400).json({
      message: "记录 id 无效。"
    });
    return null;
  }

  const db = createDatabaseConnection();

  store.ensureTable(db);

  const owned = get(
    db,
    `
      SELECT id
      FROM ${ownerTable}
      WHERE id = ? AND profile_id = ?
    `,
    [ownerId, readProfileId(req)]
  );

  if (!owned) {
    db.close();
    sendOwnerNotFound(res);
    return null;
  }

  return { db, ownerId };
}

// 给一类记录生成照片 router：挂在 /api/<records>/:id/photos 下。
function createPhotoRouter({ store, ownerTable }) {
  const router = express.Router();

  router.post("/:id/photos", (req, res, next) => {
    const opened = openOwnedRecord({ req, res, store, ownerTable });

    if (!opened) {
      return;
    }

    const { db, ownerId } = opened;

    try {
      const photoResult = store.insertPhotoList(db, ownerId, readProfileId(req), [req.body?.dataUrl]);

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
    const opened = openOwnedRecord({ req, res, store, ownerTable });

    if (!opened) {
      return;
    }

    const { db, ownerId } = opened;
    const photoId = parsePositiveId(req.params?.photoId);

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
          FROM ${store.tableName}
          WHERE id = ? AND ${store.ownerColumn} = ?
        `,
        [photoId, ownerId]
      );

      if (!row) {
        sendPhotoNotFound(res);
        return;
      }

      run(
        db,
        `
          DELETE FROM ${store.tableName}
          WHERE id = ?
        `,
        [photoId]
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

  return router;
}

module.exports = {
  MAX_PHOTOS_PER_RECORD,
  MAX_PHOTO_BYTES,
  // 图片本体：/api/<records>/photos/:photoId
  // 挂在 /api 下（和别的接口同一个代理前缀），前端 <img src> 直接可用。
  // 本地家庭系统、照片 id 不可枚举，这里不再做一次 profile 校验：
  // 校验会把 <img> 变成需要带凭证的请求，收益却接近于零。
  createPhotoMediaRouter({ ensureOwnerTables }) {
    const router = express.Router();

    router.get("/photos/:photoId", (req, res, next) => {
      const photoId = parsePositiveId(req.params?.photoId);

      if (photoId === null) {
        res.status(400).json({
          message: "照片 id 无效。"
        });
        return;
      }

      const db = createDatabaseConnection();

      try {
        // 图片本体可能在任何一次记录接口之前被请求（比如刷新后浏览器直接取图），
        // 而且纪念册的两条线共用这个取图入口（id 全局自增，不会撞），
        // 所以两张表都要保证存在、都要找一遍。
        ensureOwnerTables(db);
        let row = null;

        for (const store of [footprintPhotos, milestonePhotos]) {
          row = get(
            db,
            `
              SELECT file_name, mime_type
              FROM ${store.tableName}
              WHERE id = ?
            `,
            [photoId]
          );

          if (row) {
            break;
          }
        }

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

    return router;
  },
  createPhotoRouter,
  ensurePhotosDir,
  footprintPhotos,
  milestonePhotos,
  readProfileId
};
