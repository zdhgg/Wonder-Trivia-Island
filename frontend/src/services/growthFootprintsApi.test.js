import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFootprint,
  deleteFootprint,
  deleteFootprintPhoto,
  fetchFootprints,
  updateFootprint,
  uploadFootprintPhoto
} from "./growthFootprintsApi.js";

// 边界：服务端 growth_footprints 是纪念册的唯一事实来源。
// 这一层的职责是「请求发对 + 服务端说不行就抛错」，
// 绝不返回一个可以拿去本地假装保存成功的空壳记录。
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

function buildRawFootprint(overrides = {}) {
  return {
    id: 7,
    occurredOn: "2026-10-18",
    category: "explore",
    title: "第一次一起做火山实验",
    note: "冒泡特别开心。",
    tags: ["first", "coop"],
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

describe("growthFootprintsApi · 读取", () => {
  it("GET /api/growth-footprints，并把记录归一化成展示模型", async () => {
    stubFetch(async () => buildResponse({ payload: { footprints: [buildRawFootprint()] } }));

    const footprints = await fetchFootprints();

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-footprints");
    expect(init.method).toBe("GET");
    expect(footprints).toHaveLength(1);
    expect(footprints[0].id).toBe(7);
    expect(footprints[0].categoryMeta.displayLabel).toBe("🔬 一起探索");
    expect(footprints[0].tagMetas.map((tag) => tag.id)).toEqual(["first", "coop"]);
  });

  it("空列表是合法结果（纪念册还没翻开过）", async () => {
    stubFetch(async () => buildResponse({ payload: { footprints: [] } }));

    await expect(fetchFootprints()).resolves.toEqual([]);
  });

  it("响应体不是足迹形状时抛错，而不是当成空列表", async () => {
    stubFetch(async () => buildResponse({ payload: { unexpected: true } }));
    await expect(fetchFootprints()).rejects.toThrow("成长纪念册格式不正确");

    stubFetch(async () => buildResponse({ payload: { footprints: "nope" } }));
    await expect(fetchFootprints()).rejects.toThrow("成长纪念册格式不正确");
  });

  it("服务端拒绝时抛出服务端文案", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 500, payload: { message: "数据库锁住了。" } }));

    await expect(fetchFootprints()).rejects.toThrow("数据库锁住了");
  });
});

describe("growthFootprintsApi · 新增 / 修改 / 删除", () => {
  it("新增走 POST，并把服务端返回的那一条交回调用方", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { footprint: buildRawFootprint() } }));

    const createdFootprint = await createFootprint({
      occurredOn: "2026-10-18",
      category: "explore",
      title: "第一次一起做火山实验",
      note: "冒泡特别开心。",
      tags: ["coop", "first"]
    });

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-footprints");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body).title).toBe("第一次一起做火山实验");
    expect(createdFootprint.id).toBe(7);
  });

  it("新增被服务端拒绝时抛错，绝不返回本地构造的记录", async () => {
    stubFetch(async () =>
      buildResponse({ ok: false, status: 400, payload: { message: "occurredOn 不能晚于今天（2026-10-18）。" } })
    );

    await expect(
      createFootprint({ occurredOn: "2099-01-01", category: "explore", title: "未来的事" })
    ).rejects.toThrow("不能晚于今天");
  });

  it("新增响应缺少 footprint 时抛错（不会把空对象当成一条新记录）", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: {} }));

    await expect(createFootprint({ occurredOn: "2026-10-18", category: "explore", title: "标题" })).rejects.toThrow(
      "成长纪念册格式不正确"
    );
  });

  it("修改走 PATCH /:id，只提交表单给出的字段", async () => {
    stubFetch(async () => buildResponse({ payload: { footprint: buildRawFootprint({ title: "改过的标题" }) } }));

    const updatedFootprint = await updateFootprint(7, {
      occurredOn: "2026-10-18",
      category: "explore",
      title: "改过的标题",
      note: "",
      tags: []
    });

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-footprints/7");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      occurredOn: "2026-10-18",
      category: "explore",
      title: "改过的标题",
      note: "",
      tags: []
    });
    expect(updatedFootprint.title).toBe("改过的标题");
  });

  it("修改不存在的记录时抛出服务端 404 文案", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 404, payload: { message: "这条足迹不存在。" } }));

    await expect(updateFootprint(999, { title: "标题" })).rejects.toThrow("这条足迹不存在");
  });

  it("删除走 DELETE /:id，成功后回显被删的 id", async () => {
    stubFetch(async () => buildResponse({ payload: { message: "这条足迹已经删掉了。", deletedId: 7 } }));

    await expect(deleteFootprint(7)).resolves.toBe(7);

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-footprints/7");
    expect(init.method).toBe("DELETE");
  });

  it("删除失败（例如已被删过）时抛错，调用方不会误以为已经删掉", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 404, payload: { message: "这条足迹不存在。" } }));

    await expect(deleteFootprint(7)).rejects.toThrow("这条足迹不存在");
  });
});

describe("growthFootprintsApi · 照片", () => {
  const DATA_URL = "data:image/jpeg;base64,aGVsbG8=";
  const RAW_PHOTO = {
    id: 21,
    url: "/api/growth-footprints/photos/21",
    mimeType: "image/jpeg",
    byteSize: 240000,
    createdAt: "2026-10-18T20:00:00.000Z"
  };

  it("新增时可以把照片随记录一起提交", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { footprint: buildRawFootprint({ photos: [RAW_PHOTO] }) } }));

    const footprint = await createFootprint({
      occurredOn: "2026-10-18",
      category: "explore",
      title: "一起看星星",
      note: "",
      tags: [],
      photos: [DATA_URL]
    });
    const [, init] = readLastFetchCall();

    expect(JSON.parse(init.body).photos).toEqual([DATA_URL]);
    expect(footprint.photos).toHaveLength(1);
    expect(footprint.photos[0].url).toBe("/api/growth-footprints/photos/21");
  });

  it("给已有记录追加照片走 POST /:id/photos", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { photo: RAW_PHOTO } }));

    const photo = await uploadFootprintPhoto(7, DATA_URL);
    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-footprints/7/photos");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ dataUrl: DATA_URL });
    expect(photo.id).toBe(21);
  });

  it("上传被拒绝时抛错，不会返回一个本地伪造的照片", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 400, payload: { message: "一条记录最多放 6 张照片。" } }));

    await expect(uploadFootprintPhoto(7, DATA_URL)).rejects.toThrow("最多放 6 张照片");
  });

  it("上传成功但响应不是照片形状时同样抛错", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: {} }));

    await expect(uploadFootprintPhoto(7, DATA_URL)).rejects.toThrow("照片格式不正确");
  });

  it("删照片走 DELETE /:id/photos/:photoId", async () => {
    stubFetch(async () => buildResponse({ payload: { deletedId: 21 } }));

    await expect(deleteFootprintPhoto(7, 21)).resolves.toBe(21);

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-footprints/7/photos/21");
    expect(init.method).toBe("DELETE");
  });

  it("删照片失败时抛错", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 404, payload: { message: "这张照片不在了。" } }));

    await expect(deleteFootprintPhoto(7, 21)).rejects.toThrow("这张照片不在了");
  });

  it("列表响应里的坏照片会被丢掉，不会渲染出破图", async () => {
    stubFetch(async () =>
      buildResponse({
        payload: {
          footprints: [
            buildRawFootprint({
              photos: [RAW_PHOTO, { id: 0, url: "/api/x" }, { id: 9, url: "https://example.com/a.jpg" }, null]
            })
          ]
        }
      })
    );

    const [footprint] = await fetchFootprints();

    expect(footprint.photos).toHaveLength(1);
    expect(footprint.photos[0].id).toBe(21);
  });
});
