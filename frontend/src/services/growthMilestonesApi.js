import { normalizeFootprintPhotos } from "../utils/growthFootprints.js";
import { normalizeMilestones } from "../utils/growthMilestones.js";

// 「她的成长」的接口封装（Phase 2D-D1）：只读写独立的 /api/growth-milestones，
// 照片走 /api/growth-milestones/:id/photos（与「我们一起」完全同一套约定）。
//
// 服务端是唯一事实来源：形状不对就抛错，绝不伪造本地记录。
function resolveMilestones(payload) {
  return Array.isArray(payload?.milestones) ? normalizeMilestones(payload.milestones) : null;
}

function resolveMilestone(payload) {
  if (!payload?.milestone || typeof payload.milestone !== "object") {
    return null;
  }

  const [milestone] = normalizeMilestones([payload.milestone]);

  return milestone && milestone.id > 0 ? milestone : null;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export async function fetchMilestones(signal) {
  const response = await fetch("/api/growth-milestones", {
    method: "GET",
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `加载她的成长记录失败：${response.status}`);
  }

  const milestones = resolveMilestones(payload);

  if (!milestones) {
    throw new Error("她的成长记录格式不正确。");
  }

  return milestones;
}

export async function createMilestone(milestone, signal) {
  const response = await fetch("/api/growth-milestones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(milestone ?? {}),
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `保存这条成长记录失败：${response.status}`);
  }

  const created = resolveMilestone(payload);

  if (!created) {
    throw new Error("她的成长记录格式不正确。");
  }

  return created;
}

export async function updateMilestone(milestoneId, milestone, signal) {
  const response = await fetch(`/api/growth-milestones/${encodeURIComponent(milestoneId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(milestone ?? {}),
    signal
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || `修改这条成长记录失败：${response.status}`);
  }

  const updated = resolveMilestone(payload);

  if (!updated) {
    throw new Error("她的成长记录格式不正确。");
  }

  return updated;
}

export async function deleteMilestone(milestoneId, signal) {
  const response = await fetch(`/api/growth-milestones/${encodeURIComponent(milestoneId)}`, {
    method: "DELETE",
    signal
  });

  if (!response.ok) {
    const payload = await readJson(response);

    throw new Error(payload?.message || `删除这条成长记录失败：${response.status}`);
  }

  return milestoneId;
}

// 给已有的一条成长记录追加一张照片（和「我们一起」的照片接口同一套约定）。
export async function uploadMilestonePhoto(milestoneId, dataUrl, signal) {
  const response = await fetch(`/api/growth-milestones/${encodeURIComponent(milestoneId)}/photos`, {
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

export async function deleteMilestonePhoto(milestoneId, photoId, signal) {
  const response = await fetch(
    `/api/growth-milestones/${encodeURIComponent(milestoneId)}/photos/${encodeURIComponent(photoId)}`,
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
