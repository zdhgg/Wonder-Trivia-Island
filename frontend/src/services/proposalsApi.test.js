import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchTeachingDemoState,
  requestTeachingDemoDraft,
  reviewTeachingDemoDraft
} from "./proposalsApi.js";

// 边界：教学演示的浏览器侧只做三件事——读状态、登记「待外部生成」请求、审核草稿。
// 这里不产生任何 spec，也不存在任何「本地生成」的兜底路径。
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

function buildRequestPayload(overrides = {}) {
  return {
    id: 7,
    proposalId: 42,
    interventionType: "comparison_demo",
    status: "requested",
    requestedAt: "2026-04-01T10:00:00.000Z",
    submittedAt: null,
    ...overrides
  };
}

function buildDraftPayload(overrides = {}) {
  return {
    id: 11,
    proposalId: 42,
    status: "draft",
    interventionType: "comparison_demo",
    spec: { template: "comparison_demo", title: "乘法口诀和乘法算式" },
    reviewNote: "",
    createdAt: "2026-04-01T10:05:00.000Z",
    reviewedAt: null,
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

describe("proposalsApi · 教学演示状态", () => {
  it("读取状态时使用管理地址，并把请求与草稿分开返回", async () => {
    stubFetch(async () =>
      buildResponse({
        payload: {
          data: {
            proposalId: 42,
            request: buildRequestPayload({ status: "submitted" }),
            draft: buildDraftPayload()
          }
        }
      })
    );

    const state = await fetchTeachingDemoState({ proposalId: 42, adminKey: "review-key" });

    expect(state.proposalId).toBe(42);
    expect(state.request.status).toBe("submitted");
    expect(state.draft.spec.template).toBe("comparison_demo");
    expect(readLastFetchCall()[0]).toBe("/api/proposals/42/teaching-demo");
    expect(readLastFetchCall()[1].method).toBe("GET");
    expect(readLastFetchCall()[1].headers["x-admin-key"]).toBe("review-key");
  });

  it("尚未请求时返回 null 请求与 null 草稿，不伪造任何状态", async () => {
    stubFetch(async () =>
      buildResponse({ payload: { data: { proposalId: 42, request: null, draft: null } } })
    );

    const state = await fetchTeachingDemoState({ proposalId: 42 });

    expect(state.request).toBeNull();
    expect(state.draft).toBeNull();
  });

  it("服务端说不行时抛错，不做本地兜底", async () => {
    stubFetch(async () =>
      buildResponse({ ok: false, status: 409, payload: { message: "只有 accepted proposal 才能请求制作教学演示草稿。" } })
    );

    await expect(fetchTeachingDemoState({ proposalId: 42 })).rejects.toThrow("只有 accepted proposal");
  });
});

describe("proposalsApi · 登记待外部生成请求", () => {
  it("POST 只登记请求，返回等待状态的 request 且没有 draft", async () => {
    stubFetch(async () =>
      buildResponse({
        status: 201,
        payload: { data: { proposalId: 42, request: buildRequestPayload(), draft: null } }
      })
    );

    const state = await requestTeachingDemoDraft({ proposalId: 42, adminKey: "review-key" });
    const [url, options] = readLastFetchCall();

    expect(url).toBe("/api/proposals/42/teaching-demo/request");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({});
    expect(state.request.status).toBe("requested");
    expect(state.draft).toBeNull();
  });

  it("缺少 proposalId 时直接拒绝，不发请求", async () => {
    stubFetch(async () => buildResponse({}));

    await expect(requestTeachingDemoDraft({ proposalId: 0 })).rejects.toThrow("参数不完整");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("proposalsApi · 草稿审核", () => {
  it("确认可用走内部 approve 地址并带上备注", async () => {
    stubFetch(async () =>
      buildResponse({
        payload: { data: { proposalId: 42, request: buildRequestPayload({ status: "submitted" }), draft: buildDraftPayload({ status: "approved" }) } }
      })
    );

    const state = await reviewTeachingDemoDraft({
      proposalId: 42,
      decision: "approved",
      reviewNote: "口诀与算式的区别表达清楚。",
      adminKey: "review-key"
    });
    const [url, options] = readLastFetchCall();

    expect(url).toBe("/api/proposals/42/teaching-demo/approve");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body).reviewNote).toBe("口诀与算式的区别表达清楚。");
    expect(state.draft.status).toBe("approved");
  });

  it("不采用走内部 reject 地址", async () => {
    stubFetch(async () =>
      buildResponse({
        payload: { data: { proposalId: 42, request: buildRequestPayload({ status: "submitted" }), draft: buildDraftPayload({ status: "rejected" }) } }
      })
    );

    const state = await reviewTeachingDemoDraft({ proposalId: 42, decision: "rejected" });

    expect(readLastFetchCall()[0]).toBe("/api/proposals/42/teaching-demo/reject");
    expect(state.draft.status).toBe("rejected");
  });

  it("未知 decision 会被当作参数不完整拒绝", async () => {
    stubFetch(async () => buildResponse({}));

    await expect(reviewTeachingDemoDraft({ proposalId: 42, decision: "publish" })).rejects.toThrow("参数不完整");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
