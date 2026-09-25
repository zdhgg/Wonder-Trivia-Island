import { normalizeFootprints, normalizeFootprintPhotos } from "../utils/growthFootprints.js";

// 共同成长足迹的接口封装（Phase 2D-A2）：只读写独立的 /api/growth-footprints，
// 不混进挑战存档 / 错题本 / 每日宝箱请求，也不在任何失败路径上伪造本地记录。
//
// 服务端是唯一事实来源：这里只做「形状校验 + 原样透传」，
// 归一化统一交给 utils/growthFootprints 的纯函数（调用方拿到 normalizeFootprints 的结果）。
function readFootprints(payload) {
  return normalizeFootprints(payload?.footprints);
}

function readFootprint(payload) {
  const [footprint] = normalizeFootprints([payload?.footprint]);

  // 空对象会被 normalizeFootprints 归一化成 id=0 的安全记录；id 为 0 就说明服务端没给真记录。
  return footprint && footprint.id > 0 ? footprint : null;
}

// 返回 null 表示「响应体不是足迹形状」；调用方据此抛错，而不是拿到一个空列表假装成功。
function resolveFootprints(payload) {
  return Array.isArray(payload?.footprints) ? readFootprints(payload) : null;
}

function resolveFootprint(payload) {
  return payload?.footprint && typeof payload.footprint === "object" ? readFootprint(payload) : null;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export async function fetchFootprints(signal) {
  const response = await fetch("/api/growth-footprints", {
    method: "GET",
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `加载成长纪念册失败：${response.status}`);
  }

  const footprints = resolveFootprints(payload);

  if (!footprints) {
    throw new Error("成长纪念册格式不正确。");
  }

  return footprints;
}

export async function createFootprint(footprint, signal) {
  const response = await fetch("/api/growth-footprints", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(footprint ?? {}),
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `保存这条记录失败：${response.status}`);
  }

  const createdFootprint = resolveFootprint(payload);

  if (!createdFootprint) {
    throw new Error("成长纪念册格式不正确。");
  }

  return createdFootprint;
}

export async function updateFootprint(footprintId, footprint, signal) {
  const response = await fetch(`/api/growth-footprints/${encodeURIComponent(footprintId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(footprint ?? {}),
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `修改这条记录失败：${response.status}`);
  }

  const updatedFootprint = resolveFootprint(payload);

  if (!updatedFootprint) {
    throw new Error("成长纪念册格式不正确。");
  }

  return updatedFootprint;
}

export async function deleteFootprint(footprintId, signal) {
  const response = await fetch(`/api/growth-footprints/${encodeURIComponent(footprintId)}`, {
    method: "DELETE",
    signal
  });

  if (!response.ok) {
    const payload = await readJson(response);

    throw new Error(payload?.message || `删除这条记录失败：${response.status}`);
  }

  // 删除是硬删除，服务端只回 message + deletedId；这里回显请求用的 id，方便调用方过滤本地列表。
  return footprintId;
}

// 给已有的一条足迹追加一张照片。
// dataUrl 由 utils/growthPhotoUpload.js 压好（长边 1280 / JPEG），所以请求体只有几百 KB。
export async function uploadFootprintPhoto(footprintId, dataUrl, signal) {
  const response = await fetch(`/api/growth-footprints/${encodeURIComponent(footprintId)}/photos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ dataUrl: String(dataUrl ?? "") }),
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `保存照片失败：${response.status}`);
  }

  const [photo] = normalizeFootprintPhotos([payload?.photo]);

  if (!photo) {
    throw new Error("照片格式不正确。");
  }

  return photo;
}

export async function deleteFootprintPhoto(footprintId, photoId, signal) {
  const response = await fetch(
    `/api/growth-footprints/${encodeURIComponent(footprintId)}/photos/${encodeURIComponent(photoId)}`,
    {
      method: "DELETE",
      signal
    }
  );

  if (!response.ok) {
    const payload = await readJson(response);

    throw new Error(payload?.message || `删掉这张照片失败：${response.status}`);
  }

  return photoId;
}
