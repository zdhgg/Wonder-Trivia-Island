import { describe, expect, it } from "vitest";
import { isExternalAiRequest, isManagementRequest, normalizeRequestPath } from "./managementPaths.js";
// 同一份 loopback 判定同时给 Vite 配置与 backend 使用；这里确认 ESM 侧能正常加载。
import { isLoopbackAddress } from "../../shared/loopbackAddress.mjs";

describe("normalizeRequestPath", () => {
  it("去掉查询串、hash 与结尾斜杠", () => {
    expect(normalizeRequestPath("/api/questions?pageSize=1")).toBe("/api/questions");
    expect(normalizeRequestPath("/api/questions/#hash")).toBe("/api/questions");
    expect(normalizeRequestPath("/api/questions/import/pending/")).toBe("/api/questions/import/pending");
    expect(normalizeRequestPath("api/questions")).toBe("/api/questions");
  });

  it("绝对 URL 只保留 pathname", () => {
    expect(normalizeRequestPath("http://127.0.0.1:8008/api/questions/12")).toBe("/api/questions/12");
  });

  it("空值返回空串", () => {
    expect(normalizeRequestPath("")).toBe("");
    expect(normalizeRequestPath(undefined)).toBe("");
  });
});

describe("isExternalAiRequest", () => {
  it("识别整条 External Harness 前缀", () => {
    const externalPaths = [
      "/api/external-ai",
      "/api/external-ai/",
      "/api/external-ai/question-stats",
      "/api/external-ai/questions?subject=%E8%AF%AD%E6%96%87&pageSize=1",
      "/api/external-ai/learning-evidence?profileId=p1",
      "/api/external-ai/proposals",
      "/api/external-ai/proposals/12",
      "/api/external-ai/teaching-demo-requests",
      "/api/external-ai/teaching-demo-drafts"
    ];

    for (const pathname of externalPaths) {
      expect(isExternalAiRequest(pathname), pathname).toBe(true);
    }
  });

  it("不误伤相邻前缀", () => {
    const otherPaths = [
      "/api/external-aix",
      "/apiexternal-ai",
      "/api/questions",
      "/api/proposals",
      "/api/external",
      "/api/health"
    ];

    for (const pathname of otherPaths) {
      expect(isExternalAiRequest(pathname), pathname).toBe(false);
    }
  });
});

describe("isManagementRequest —— B 类必须命中", () => {
  it("裸 /api/questions（列表与新增）", () => {
    expect(isManagementRequest("GET", "/api/questions")).toBe(true);
    expect(isManagementRequest("GET", "/api/questions/")).toBe(true);
    expect(isManagementRequest("POST", "/api/questions")).toBe(true);
    expect(isManagementRequest("POST", "/api/questions?x=1")).toBe(true);
  });

  it("数字 question id 的 PATCH / DELETE", () => {
    expect(isManagementRequest("PATCH", "/api/questions/123")).toBe(true);
    expect(isManagementRequest("DELETE", "/api/questions/123")).toBe(true);
    expect(isManagementRequest("patch", "/api/questions/123/")).toBe(true);
    expect(isManagementRequest("DELETE", "/api/questions/999999")).toBe(true);
  });

  it("批量修改与批量删除", () => {
    expect(isManagementRequest("PATCH", "/api/questions/batch/update")).toBe(true);
    expect(isManagementRequest("POST", "/api/questions/batch/delete")).toBe(true);
  });

  it("题库导入（stage / pending / confirm / preview）", () => {
    expect(isManagementRequest("POST", "/api/questions/import/preview")).toBe(true);
    expect(isManagementRequest("POST", "/api/questions/import/stage")).toBe(true);
    expect(isManagementRequest("GET", "/api/questions/import/pending")).toBe(true);
    expect(isManagementRequest("POST", "/api/questions/import/confirm")).toBe(true);
    expect(isManagementRequest("DELETE", "/api/questions/import/pending")).toBe(true);
  });

  it("runtime-check（会触发后端出站模型调用）", () => {
    expect(isManagementRequest("POST", "/api/questions/ai/runtime-check")).toBe(true);
  });

  it("旧 AI 出题入口已删除：/api/questions/generate 不在路径表，重新加路由时必须重新归类", () => {
    expect(isManagementRequest("POST", "/api/questions/generate")).toBe(false);
  });

  it("proposal 与 teaching demo 的全部入口", () => {
    const proposalPaths = [
      "/api/proposals",
      "/api/proposals?status=pending",
      "/api/proposals/12",
      "/api/proposals/12/accept",
      "/api/proposals/12/reject",
      "/api/proposals/12/teaching-demo",
      "/api/proposals/12/teaching-demo/request",
      "/api/proposals/12/teaching-demo/approve",
      "/api/proposals/12/teaching-demo/reject"
    ];

    for (const pathname of proposalPaths) {
      expect(isManagementRequest("GET", pathname), pathname).toBe(true);
      expect(isManagementRequest("POST", pathname), pathname).toBe(true);
    }
  });
});

describe("isManagementRequest —— A 类必须放行", () => {
  it("抽题 / 统计 / 盘点 / 判题 / 点评", () => {
    const learningPaths = [
      "/api/questions/random",
      "/api/questions/random?count=5&subject=%E6%95%B0%E5%AD%A6",
      "/api/questions/stats",
      "/api/questions/coverage",
      "/api/questions/submit",
      "/api/questions/review",
      "/api/questions/review/summary",
      "/api/questions/review/home-welcome",
      "/api/questions/review/speech",
      "/api/health"
    ];

    for (const pathname of learningPaths) {
      for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
        expect(isManagementRequest(method, pathname), `${method} ${pathname}`).toBe(false);
      }
    }
  });

  it("学习记录与成长系统：即使是 PUT / POST / PATCH / DELETE 也不拦", () => {
    const learningWrites = [
      ["PUT", "/api/study-record-book"],
      ["GET", "/api/study-record-book"],
      ["PUT", "/api/challenge-progress"],
      ["GET", "/api/challenge-progress"],
      ["POST", "/api/growth-progress/daily-chest"],
      ["GET", "/api/growth-progress"],
      ["POST", "/api/growth-plans"],
      ["PATCH", "/api/growth-plans/3"],
      ["POST", "/api/growth-plans/3/complete"],
      ["DELETE", "/api/growth-plans/3"],
      ["POST", "/api/growth-footprints"],
      ["DELETE", "/api/growth-footprints/9"],
      ["POST", "/api/growth-footprints/9/photos"],
      ["DELETE", "/api/growth-footprints/9/photos/1"],
      ["GET", "/api/growth-milestones/photos/1"],
      ["PATCH", "/api/growth-milestones/7"]
    ];

    for (const [method, pathname] of learningWrites) {
      expect(isManagementRequest(method, pathname), `${method} ${pathname}`).toBe(false);
    }
  });
});

describe("isManagementRequest —— 边界易错点", () => {
  it("/api/questions/random 绝不能被当成数字 question id", () => {
    for (const method of ["GET", "POST", "PATCH", "DELETE", "PUT"]) {
      expect(isManagementRequest(method, "/api/questions/random"), method).toBe(false);
    }

    // 连带上其它非数字子路径也不能被当成 :id
    for (const subPath of ["random", "stats", "coverage", "submit", "review", "abc", "-1", "1.5", "1e3"]) {
      expect(isManagementRequest("PATCH", `/api/questions/${subPath}`), subPath).toBe(false);
      expect(isManagementRequest("DELETE", `/api/questions/${subPath}`), subPath).toBe(false);
    }
  });

  it("数字 id 只有 PATCH / DELETE 属于管理面", () => {
    expect(isManagementRequest("PATCH", "/api/questions/12")).toBe(true);
    expect(isManagementRequest("DELETE", "/api/questions/12")).toBe(true);
    // GET 单题不是后端存在的管理入口，不拦。
    expect(isManagementRequest("GET", "/api/questions/12")).toBe(false);
    expect(isManagementRequest("POST", "/api/questions/12")).toBe(false);
  });

  it("external-ai 由 isExternalAiRequest 独立识别，不在管理面重复表达", () => {
    expect(isManagementRequest("POST", "/api/external-ai/proposals")).toBe(false);
    expect(isManagementRequest("GET", "/api/external-ai/questions")).toBe(false);
    expect(isExternalAiRequest("/api/external-ai/proposals")).toBe(true);
  });

  it("空 method 不影响按路径判定的管理面，空 url 一律不判为管理面", () => {
    // 裸 /api/questions 与 /api/proposals 这类整条前缀本来就是管理面，
    // 方法缺失时按 fail-closed 处理。
    expect(isManagementRequest("", "/api/questions")).toBe(true);
    expect(isManagementRequest("", "/api/proposals")).toBe(true);
    expect(isManagementRequest("GET", "")).toBe(false);
    expect(isManagementRequest(undefined, undefined)).toBe(false);
  });
});

describe("共享 loopback 判定在 ESM 侧可用", () => {
  it("与本机判定保持一致", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("127.0.0.2")).toBe(true);
    expect(isLoopbackAddress("::1")).toBe(true);
    expect(isLoopbackAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("192.168.31.61")).toBe(false);
    expect(isLoopbackAddress("::ffff:192.168.31.61")).toBe(false);
    expect(isLoopbackAddress("")).toBe(false);
  });
});
