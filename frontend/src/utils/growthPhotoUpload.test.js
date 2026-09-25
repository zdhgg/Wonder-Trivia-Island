import { describe, expect, it } from "vitest";
import {
  MAX_FOOTPRINT_PHOTOS,
  MAX_PHOTO_EDGE,
  MAX_PHOTO_SOURCE_BYTES,
  SUPPORTED_PHOTO_MIME_TYPES,
  calculatePhotoTargetSize,
  describePhotoFileIssue,
  estimateDataUrlBytes,
  formatPhotoSize,
  isSupportedPhotoType
} from "./growthPhotoUpload.js";

// 这一层是「选照片」的纯逻辑：能不能用、要缩到多大、误差多少。
// canvas 压缩本身属于浏览器行为，由 e2e 的端到端用例覆盖。
describe("growthPhotoUpload · 格式判断", () => {
  it("只接受 JPEG / PNG / WebP", () => {
    for (const mimeType of SUPPORTED_PHOTO_MIME_TYPES) {
      expect(isSupportedPhotoType(mimeType), mimeType).toBe(true);
    }

    // 大小写与空白不影响判断。
    expect(isSupportedPhotoType("IMAGE/JPEG")).toBe(true);
    expect(isSupportedPhotoType(" image/png ")).toBe(true);

    for (const mimeType of ["image/gif", "image/heic", "video/mp4", "text/plain", "", null, undefined]) {
      expect(isSupportedPhotoType(mimeType), String(mimeType)).toBe(false);
    }
  });
});

describe("growthPhotoUpload · 目标尺寸", () => {
  it("长边超过 1280 就等比缩小，短边一起缩", () => {
    expect(calculatePhotoTargetSize(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(calculatePhotoTargetSize(3000, 4000)).toEqual({ width: 960, height: 1280 });
    expect(calculatePhotoTargetSize(1920, 1920)).toEqual({ width: 1280, height: 1280 });
  });

  it("本来就够小就不缩（返回 null，调用方直接用原图）", () => {
    expect(calculatePhotoTargetSize(1280, 720)).toBeNull();
    expect(calculatePhotoTargetSize(640, 480)).toBeNull();
    expect(calculatePhotoTargetSize(MAX_PHOTO_EDGE, MAX_PHOTO_EDGE)).toBeNull();
  });

  it("非法尺寸给 null，不会算出 0 或者负数", () => {
    for (const [width, height] of [[0, 100], [100, 0], [-5, 100], [Number.NaN, 100], ["abc", 100], [null, null]]) {
      expect(calculatePhotoTargetSize(width, height), `${width}x${height}`).toBeNull();
    }
  });
});

describe("growthPhotoUpload · 体积文案", () => {
  it("小于 1 MB 用 KB，大于等于 1 MB 用 MB", () => {
    expect(formatPhotoSize(320 * 1024)).toBe("320 KB");
    expect(formatPhotoSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatPhotoSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("非法体积给空串", () => {
    for (const value of [0, -1, null, undefined, "abc"]) {
      expect(formatPhotoSize(value), String(value)).toBe("");
    }
  });
});

describe("growthPhotoUpload · 选文件时的提示", () => {
  function buildFile(overrides = {}) {
    return { type: "image/jpeg", size: 200 * 1024, name: "photo.jpg", ...overrides };
  }

  it("正常的照片没有问题（返回空串）", () => {
    expect(describePhotoFileIssue(buildFile())).toBe("");
  });

  it("格式不对 / 太大 / 已经放满都会给出一句话", () => {
    expect(describePhotoFileIssue(buildFile({ type: "image/gif" }))).toContain("JPEG / PNG / WebP");
    expect(describePhotoFileIssue(buildFile({ size: MAX_PHOTO_SOURCE_BYTES + 1 }))).toContain("太大了");
    expect(describePhotoFileIssue(buildFile(), { currentCount: MAX_FOOTPRINT_PHOTOS })).toContain(
      `最多放 ${MAX_FOOTPRINT_PHOTOS} 张`
    );
  });

  it("没有文件时也有话说，不会抛错", () => {
    expect(describePhotoFileIssue(null)).toBeTruthy();
    expect(describePhotoFileIssue(undefined)).toBeTruthy();
  });
});

describe("growthPhotoUpload · data URL 体积换算", () => {
  it("按 base64 长度换算成真实字节数", () => {
    // "hello" 的 base64 是 aGVsbG8=
    expect(estimateDataUrlBytes("data:text/plain;base64,aGVsbG8=")).toBe(5);
    expect(estimateDataUrlBytes("data:image/png;base64,")).toBe(0);
  });

  it("不是 data URL 时给 0，不抛错", () => {
    for (const value of ["", "hello", null, undefined, "data:image/png,notbase64"]) {
      expect(estimateDataUrlBytes(value), String(value)).toBe(0);
    }
  });
});
