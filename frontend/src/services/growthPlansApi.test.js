import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeGrowthPlan,
  createGrowthPlan,
  deleteGrowthPlan,
  fetchGrowthPlans,
  normalizePlans,
  sortPlansDesc
} from "./growthPlansApi.js";

// 边界：想一起做的清单与「完成 → 一条足迹」都由服务端说了算。
// 这一层的职责是「请求发对 + 服务端说不行就抛错」，
// 绝不返回一个本地伪造的想做事项或足迹。
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

function buildRawPlan(overrides = {}) {
  return {
    id: 5,
    sourceId: "rec_star-night",
    title: "一起看星星",
    note: "找一个没有太多灯光的晚上。",
    category: "explore",
    durationMinutes: 45,
    createdAt: "2026-10-18T09:12:00.000Z",
    ...overrides
  };
}

function buildRawFootprint(overrides = {}) {
  return {
    id: 9,
    occurredOn: "2026-10-18",
    category: "explore",
    title: "一起看星星",
    note: "看到三颗流星。",
    tags: ["special"],
    createdAt: "2026-10-18T20:00:00.000Z",
    updatedAt: "2026-10-18T20:00:00.000Z",
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

describe("growthPlansApi · 读取清单", () => {
  it("GET /api/growth-plans，并把条目归一化 + 按新加的在前排序", async () => {
    stubFetch(async () =>
      buildResponse({
        payload: {
          plans: [
            buildRawPlan({ id: 1, createdAt: "2026-10-01T00:00:00.000Z", sourceId: null, durationMinutes: null }),
            buildRawPlan({ id: 2, createdAt: "2026-10-10T00:00:00.000Z" })
          ]
        }
      })
    );

    const plans = await fetchGrowthPlans();
    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-plans");
    expect(init.method).toBe("GET");
    expect(plans.map((plan) => plan.id)).toEqual([2, 1]);
    // 自定义条目没有来源、没有时长。
    expect(plans[1].sourceId).toBe("");
    expect(plans[1].durationMinutes).toBeNull();
  });

  it("空清单是合法结果（还没想好一起做什么）", async () => {
    stubFetch(async () => buildResponse({ payload: { plans: [] } }));

    await expect(fetchGrowthPlans()).resolves.toEqual([]);
  });

  it("响应体不是清单形状时抛错，而不是当成空清单", async () => {
    stubFetch(async () => buildResponse({ payload: { unexpected: true } }));
    await expect(fetchGrowthPlans()).rejects.toThrow("想一起做的清单格式不正确");

    stubFetch(async () => buildResponse({ payload: { plans: "nope" } }));
    await expect(fetchGrowthPlans()).rejects.toThrow("想一起做的清单格式不正确");
  });

  it("服务端拒绝时抛出服务端文案", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 500, payload: { message: "数据库锁住了。" } }));

    await expect(fetchGrowthPlans()).rejects.toThrow("数据库锁住了");
  });
});

describe("growthPlansApi · 加入 / 拿掉", () => {
  it("加入推荐时带上 sourceId / note / durationMinutes", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { plan: buildRawPlan(), alreadyPlanned: false } }));

    const plan = await createGrowthPlan({
      sourceId: "rec_star-night",
      title: "一起看星星",
      note: "找一个没有太多灯光的晚上。",
      category: "explore",
      durationMinutes: 45
    });
    const [url, init] = readLastFetchCall();
    const body = JSON.parse(init.body);

    expect(url).toBe("/api/growth-plans");
    expect(init.method).toBe("POST");
    expect(body).toEqual({
      sourceId: "rec_star-night",
      title: "一起看星星",
      note: "找一个没有太多灯光的晚上。",
      category: "explore",
      durationMinutes: 45
    });
    expect(plan.id).toBe(5);
  });

  it("自己新增的条目不带 sourceId，空备注也不会发上去", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { plan: buildRawPlan({ sourceId: null }) } }));

    await createGrowthPlan({ title: "一起去看一次海", category: "outdoor", note: "   ", durationMinutes: null });

    const [, init] = readLastFetchCall();
    const body = JSON.parse(init.body);

    expect(body).toEqual({ title: "一起去看一次海", category: "outdoor" });
    expect(Object.prototype.hasOwnProperty.call(body, "sourceId")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(body, "note")).toBe(false);
  });

  it("加入被拒绝时抛错，绝不返回本地构造的条目", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 400, payload: { message: "title 需要 1–40 个字。" } }));

    await expect(createGrowthPlan({ title: "", category: "explore" })).rejects.toThrow("title 需要 1–40 个字");
  });

  it("加入成功但响应缺少 plan 时同样抛错", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: {} }));

    await expect(createGrowthPlan({ title: "一起看星星", category: "explore" })).rejects.toThrow(
      "想一起做的清单格式不正确"
    );
  });

  it("拿掉条目走 DELETE /:id，成功后回显被删的 id", async () => {
    stubFetch(async () => buildResponse({ payload: { deletedId: 5 } }));

    await expect(deleteGrowthPlan(5)).resolves.toBe(5);

    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-plans/5");
    expect(init.method).toBe("DELETE");
  });

  it("拿掉失败（例如已经完成过了）时抛错", async () => {
    stubFetch(async () => buildResponse({ ok: false, status: 404, payload: { message: "这件事不在想一起做的清单里。" } }));

    await expect(deleteGrowthPlan(5)).rejects.toThrow("这件事不在想一起做的清单里");
  });
});

describe("growthPlansApi · 完成 → 一条足迹", () => {
  it("POST /:id/complete，提交补的日期 / 类别 / 标签 / 一句记录", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { footprint: buildRawFootprint(), completedPlanId: 5 } }));

    const footprint = await completeGrowthPlan(5, {
      occurredOn: "2026-10-18",
      category: "together",
      tags: ["special", "coop"],
      note: "看到三颗流星。"
    });
    const [url, init] = readLastFetchCall();

    expect(url).toBe("/api/growth-plans/5/complete");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      occurredOn: "2026-10-18",
      category: "together",
      tags: ["special", "coop"],
      note: "看到三颗流星。"
    });
    // 返回的是纪念册那条真实足迹的形状（categoryMeta / tagMetas 由纯函数补上）。
    expect(footprint.id).toBe(9);
    expect(footprint.categoryMeta.displayLabel).toBe("🔬 一起探索");
    expect(footprint.tagMetas.map((tag) => tag.id)).toEqual(["special"]);
  });

  it("不写记录时不会把空 note 发上去，tags 缺省也是数组", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { footprint: buildRawFootprint() } }));

    await completeGrowthPlan(5, { occurredOn: "2026-10-18", category: "explore" });

    const [, init] = readLastFetchCall();
    const body = JSON.parse(init.body);

    expect(body).toEqual({ occurredOn: "2026-10-18", category: "explore", tags: [] });
  });

  it("完成被拒绝时抛错，调用方不会误以为已经写进纪念册", async () => {
    stubFetch(async () =>
      buildResponse({ ok: false, status: 400, payload: { message: "occurredOn 不能晚于今天（2026-10-18）。" } })
    );

    await expect(
      completeGrowthPlan(5, { occurredOn: "2099-01-01", category: "explore" })
    ).rejects.toThrow("不能晚于今天");
  });

  it("完成响应缺少足迹形状时抛错", async () => {
    stubFetch(async () => buildResponse({ status: 201, payload: { completedPlanId: 5 } }));

    await expect(completeGrowthPlan(5, { occurredOn: "2026-10-18", category: "explore" })).rejects.toThrow(
      "成长纪念册格式不正确"
    );
  });
});

describe("growthPlansApi · 排序与归一化", () => {
  it("createdAt 相同按 id 降序，且不改动传入数组", () => {
    const input = [
      { id: 1, createdAt: "2026-10-18T09:00:00.000Z" },
      { id: 3, createdAt: "2026-10-18T09:00:00.000Z" },
      { id: 2, createdAt: "2026-10-18T09:00:00.000Z" }
    ];
    const sorted = sortPlansDesc(input);

    expect(sorted.map((plan) => plan.id)).toEqual([3, 2, 1]);
    expect(input.map((plan) => plan.id)).toEqual([1, 3, 2]);
  });

  it("脏数据被安全降级，不抛错也不伪造条目", () => {
    const [plan] = normalizePlans([
      { id: "abc", sourceId: null, title: 42, note: null, category: undefined, durationMinutes: "abc", createdAt: null }
    ]);

    expect(plan.id).toBe(0);
    expect(plan.sourceId).toBe("");
    expect(plan.title).toBe("42");
    expect(plan.note).toBe("");
    expect(plan.category).toBe("");
    expect(plan.durationMinutes).toBeNull();
    expect(plan.createdAt).toBe("");
  });

  it("非数组输入得到空数组", () => {
    expect(normalizePlans(null)).toEqual([]);
    expect(normalizePlans(undefined)).toEqual([]);
    expect(normalizePlans({})).toEqual([]);
  });
});
