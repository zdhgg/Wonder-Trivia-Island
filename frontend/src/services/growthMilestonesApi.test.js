import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMilestone,
  deleteMilestone,
  deleteMilestonePhoto,
  fetchMilestones,
  updateMilestone,
  uploadMilestonePhoto
} from "./growthMilestonesApi.js";

// 边界：她的成长记录由服务端说了算。这一层只负责「请求发对 + 失败就抛错」，
// 绝不返回本地伪造的成长记录或照片。
function stubFetch(handler) {
  vi.stubGlobal("fetch", vi.fn(handler));
}

function buildResponse({ ok = true, status = 200, payload = {} } = {}) {
  return {
    ok,
    status,
    json: async () => payload
  };
}

function buildRawMilestone(overrides = {}) {
  return {
    id: 6,
    occurredOn: "2026-10-18",
    category: "school",
    title: "参加了学校的合唱比赛",
    note: "站第二排。",
    photos: [],
    createdAt: "2026-10-18T09:12:00.000Z",
    updatedAt: "2026-10-18T09:12:00.000Z",
    ...overrides
  };
}

function readLastFetchCall() {
  const fetchMock = globalThis.fetch;

  return fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("growthMilestonesApi · 读取", () => {
  it("GET /api/growth-milestones，并把记录归一化成展示模型", async () => {
    stubFetch(async () => buildResponse({ payload: { milestones: [buildRawMilestone()] } }));

    const milestones = await fetchMilestones();
    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-milestones");
    expect(init.method).toBe("GET");
    expect(milestones).toHaveLength(1);
    expect(milestones[0].categoryMeta.displayLabel).toBe("🎭 校园活动");
  });

  it("空列表是合法结果", async () => {
    stubFetch(async () => buildResponse({ payload: { milestones: [] } }));

    await expect(fetchMilestones()).resolves.toEqual([]);
  });

  it("响应体不是记录形状时抛错，而不是当成空列表", async () => {
    stubFetch(async () => buildResponse({ payload: { unexpected: true } }));
    await expect(fetchMilestones()).rejects.toThrow("她的成长记录格式不正确");

    stubFetch(async () => buildResponse({ payload: { milestones: "nope" } }));
    await expect(fetchMilestones()).rejects.toThrow("她的成长记录格式不正确");
  });

  it("服务端拒绝时抛出服务端文案", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 500, payload: { message: "数据库锁住了。" } }));

    await expect(fetchMilestones()).rejects.toThrow("数据库锁住了");
  });
});

describe("growthMilestonesApi · 新增 / 修改 / 删除", () => {
  it("新增走 POST，并把服务端返回的那一条交回调用方", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { milestone: buildRawMilestone() } }));

    const milestone = await createMilestone({
      occurredOn: "2026-10-18",
      category: "school",
      title: "参加了学校的合唱比赛",
      note: "站第二排。",
      photos: ["data:image/jpeg;base64,aGVsbG8="]
    });
    const [url, init] = readLastFetchCall();
    const body = JSON.parse(init.body);

    expect(url).toBe("/api/growth-milestones");
    expect(init.method).toBe("POST");
    expect(body.photos).toEqual(["data:image/jpeg;base64,aGVsbG8="]);
    expect(milestone.id).toBe(6);
  });

  it("新增被拒绝时抛错，绝不返回本地构造的记录", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 400, payload: { message: "title 需要 1–40 个字。" } }));

    await expect(createMilestone({ occurredOn: "2026-10-18", category: "school", title: "" })).rejects.toThrow(
      "title 需要 1–40 个字"
    );
  });

  it("新增响应缺少 milestone 时抛错", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: {} }));

    await expect(createMilestone({ occurredOn: "2026-10-18", category: "school", title: "标题" })).rejects.toThrow(
      "她的成长记录格式不正确"
    );
  });

  it("修改走 PATCH /:id，只提交表单给出的字段", async () => {
    stubFetch(async () => buildResponse({ payload: { milestone: buildRawMilestone({ title: "改过的标题" }) } }));

    const updated = await updateMilestone(6, {
      occurredOn: "2026-10-18",
      category: "school",
      title: "改过的标题",
      note: ""
    });
    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-milestones/6");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      occurredOn: "2026-10-18",
      category: "school",
      title: "改过的标题",
      note: ""
    });
    expect(updated.title).toBe("改过的标题");
  });

  it("删除走 DELETE /:id，成功后回显被删的 id", async () => {
    stubFetch(async () => buildResponse({ payload: { deletedId: 6 } }));

    await expect(deleteMilestone(6)).resolves.toBe(6);

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-milestones/6");
    expect(init.method).toBe("DELETE");
  });

  it("删除失败时抛错，调用方不会误以为已经删掉", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 404, payload: { message: "这条成长记录不存在。" } }));

    await expect(deleteMilestone(6)).rejects.toThrow("这条成长记录不存在");
  });
});

describe("growthMilestonesApi · 照片（与「我们一起」同一套约定）", () => {
  it("追加照片走 POST /:id/photos，返回归一化后的照片", async () => {
    stubFetch(async () =>
      buildResponse({
        status: 201,
        payload: {
          photo: {
            id: 31,
            url: "/api/growth-milestones/photos/31",
            mimeType: "image/jpeg",
            byteSize: 180000,
            createdAt: "2026-10-18T20:00:00.000Z"
          }
        }
      })
    );

    const photo = await uploadMilestonePhoto(6, "data:image/jpeg;base64,aGVsbG8=");
    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-milestones/6/photos");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ dataUrl: "data:image/jpeg;base64,aGVsbG8=" });
    expect(photo.id).toBe(31);
  });

  it("上传失败 / 响应不是照片形状时都抛错", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 400, payload: { message: "一条记录最多放 6 张照片。" } }));
    await expect(uploadMilestonePhoto(6, "x")).rejects.toThrow("最多放 6 张照片");

    stubFetch(async () => buildResponse({ status: 201, payload: {} }));
    await expect(uploadMilestonePhoto(6, "x")).rejects.toThrow("照片格式不正确");
  });

  it("删照片走 DELETE /:id/photos/:photoId", async () => {
    stubFetch(async () => buildResponse({ payload: { deletedId: 31 } }));

    await expect(deleteMilestonePhoto(6, 31)).resolves.toBe(31);

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-milestones/6/photos/31");
    expect(init.method).toBe("DELETE");
  });
});
