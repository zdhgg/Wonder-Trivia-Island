// 纪念册照片的前端处理（Phase 2D-C1）。
//
// 只有一件事：**把手机照片压到能存的尺寸再上传**。
// 一张 4000px 的原图有几 MB，直接传会让请求体和磁盘都很难看；
// 压到 1280px / JPEG 之后通常只剩 200–500 KB，肉眼几乎看不出差别。
//
// 这里是纯浏览器代码（canvas / Image / FileReader），不做任何网络请求；
// 纯逻辑（格式校验、体积检查、提示文案）单独拆成可以被单测覆盖的纯函数。
export const MAX_PHOTO_SOURCE_BYTES = 12 * 1024 * 1024;
export const MAX_PHOTO_OUTPUT_BYTES = 3 * 1024 * 1024;
export const MAX_PHOTO_EDGE = 1280;
export const PHOTO_JPEG_QUALITY = 0.82;
// 一条纪念记录最多几张：和 backend/src/routes/growthFootprintPhotos.js 保持一致。
export const MAX_FOOTPRINT_PHOTOS = 6;
export const SUPPORTED_PHOTO_MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);

export function isSupportedPhotoType(mimeType) {
  return SUPPORTED_PHOTO_MIME_TYPES.includes(String(mimeType ?? "").trim().toLowerCase());
}

// 目标尺寸：长边不超过 MAX_PHOTO_EDGE，短边按比例缩放。
// 返回 null 表示「不用缩」（本来就够小），调用方可以直接用原图。
export function calculatePhotoTargetSize(width, height, maxEdge = MAX_PHOTO_EDGE) {
  const normalizedWidth = Number(width);
  const normalizedHeight = Number(height);

  if (!Number.isFinite(normalizedWidth) || !Number.isFinite(normalizedHeight) || normalizedWidth <= 0 || normalizedHeight <= 0) {
    return null;
  }

  const longestEdge = Math.max(normalizedWidth, normalizedHeight);

  if (longestEdge <= maxEdge) {
    return null;
  }

  const scale = maxEdge / longestEdge;

  return {
    width: Math.max(1, Math.round(normalizedWidth * scale)),
    height: Math.max(1, Math.round(normalizedHeight * scale))
  };
}

export function formatPhotoSize(byteSize) {
  const parsed = Number(byteSize);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  if (parsed < 1024 * 1024) {
    return `${Math.max(1, Math.round(parsed / 1024))} KB`;
  }

  return `${(parsed / 1024 / 1024).toFixed(1)} MB`;
}

// 选了文件之后的本地检查：返回 null 表示可以继续，否则返回给用户看的一句话。
export function describePhotoFileIssue(file, { currentCount = 0, maxCount = MAX_FOOTPRINT_PHOTOS } = {}) {
  if (!file) {
    return "没有选到照片。";
  }

  if (!isSupportedPhotoType(file.type)) {
    return "只能放 JPEG / PNG / WebP 的照片。";
  }

  if (Number(file.size) > MAX_PHOTO_SOURCE_BYTES) {
    return `这张照片有 ${formatPhotoSize(file.size)}，太大了，换一张小一点的吧。`;
  }

  if (currentCount >= maxCount) {
    return `一条记录最多放 ${maxCount} 张照片。`;
  }

  return "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("读取照片失败。"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("这张照片打不开。"));
    image.src = dataUrl;
  });
}

function renderToJpegDataUrl(image, width, height) {
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("这个浏览器不支持压缩照片。");
  }

  // JPEG 没有透明通道：PNG 的透明区域否则会变成黑色。
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const offsetX = Math.max(0, (width - sourceWidth) / 2);
  const offsetY = Math.max(0, (height - sourceHeight) / 2);

  context.drawImage(image, offsetX, offsetY, sourceWidth, sourceHeight);

  return canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
}

// 「用户选的文件 → 可以直接提交的 data URL」。
// 失败一律抛错（调用方负责显示一句话），绝不返回一个半成品。
export async function preparePhotoForUpload(file) {
  const issue = describePhotoFileIssue(file);

  if (issue) {
    throw new Error(issue);
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const targetSize = calculatePhotoTargetSize(sourceWidth, sourceHeight);

  if (!targetSize) {
    // 本来就不大：直接用原图，省一次重新编码。
    return {
      dataUrl: sourceDataUrl,
      mimeType: file.type,
      width: sourceWidth,
      height: sourceHeight,
      sourceBytes: Number(file.size) || 0
    };
  }

  const dataUrl = renderToJpegDataUrl(image, targetSize.width, targetSize.height);
  const encodedBytes = estimateDataUrlBytes(dataUrl);

  if (encodedBytes > MAX_PHOTO_OUTPUT_BYTES) {
    throw new Error(`这张照片压完还有 ${formatPhotoSize(encodedBytes)}，换一张小一点的吧。`);
  }

  return {
    dataUrl,
    mimeType: "image/jpeg",
    width: targetSize.width,
    height: targetSize.height,
    sourceBytes: Number(file.size) || 0
  };
}

// data URL 的 base64 部分换算成字节数（用来在上传前做一次体积检查）。
export function estimateDataUrlBytes(dataUrl) {
  const matched = /^data:[^;]+;base64,(.*)$/.exec(String(dataUrl ?? ""));

  if (!matched) {
    return 0;
  }

  const base64 = matched[1];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
