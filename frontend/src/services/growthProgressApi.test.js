import { afterEach, describe, expect, it, vi } from "vitest";
import { claimDailyChest, fetchGrowthProgress } from "./growthProgressApi.js";

// 边界：服务端 growth_progress 是长期账本的唯一事实来源。
// 这一层的职责就是“拿不到服务端账本就必须抛错”，让调用方没有任何本地加印章的机会。
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("growthProgressApi · 服务端是长期账本的唯一来源", () => {
  it("领取成功时原样返回服务端账本", async () => {
    const growthProgress = { version: 1, totalDailyChests: 2, dailyClaims: {} };

    stubFetch(async () => buildResponse({ payload: { growthProgress, alreadyClaimed: false } }));

    await expect(claimDailyChest({ dateKey: "2026-09-22" })).resolves.toEqual({
      growthProgress,
      alreadyClaimed: false
    });
  });

  it("服务端拒绝时抛错，绝不返回一个可以拿去加印章的账本", async () => {
    stubFetch(async () =>
      buildResponse({
        ok: false,
        status: 400,
        payload: { message: "只能领取今天（2026-09-22）的今日宝箱。" }
      })
    );

    await expect(claimDailyChest({ dateKey: "2099-01-01" })).rejects.toThrow("只能领取今天");
  });

  it("响应体不是账本形状时同样抛错（不会把空值当成账本写进本地镜像）", async () => {
    stubFetch(async () => buildResponse({ payload: { unexpected: true } }));

    await expect(claimDailyChest({ dateKey: "2026-09-22" })).rejects.toThrow("成长账本格式不正确");
    await expect(fetchGrowthProgress()).rejects.toThrow("成长账本格式不正确");
  });

  it("没有日期时直接抛错，连请求都不发", async () => {
    const fetchMock = vi.fn();

    stubFetch(fetchMock);

    await expect(claimDailyChest({})).rejects.toThrow("需要日期");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
