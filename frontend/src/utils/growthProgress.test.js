import { beforeEach, describe, expect, it } from "vitest";
import {
  GROWTH_PROGRESS_STORAGE_KEY,
  buildGrowthStampText,
  claimDailyChestInProgress,
  createEmptyGrowthProgress,
  getDailyChestClaim,
  getExplorerStampCount,
  isDailyChestClaimed,
  normalizeGrowthProgress,
  readGrowthProgressCache,
  writeGrowthProgressCache
} from "./growthProgress.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    keys() {
      return [...store.keys()];
    }
  };
}

describe("growthProgress · 长期成长账本", () => {
  beforeEach(() => {
    globalThis.window = { localStorage: createMemoryStorage() };
  });

  it("空账本是 version 1、0 个宝箱、没有任何领取记录", () => {
    expect(createEmptyGrowthProgress()).toEqual({
      version: 1,
      totalDailyChests: 0,
      dailyClaims: {}
    });
  });

  it("同一自然日重复领取只计 1 次", () => {
    const first = claimDailyChestInProgress(createEmptyGrowthProgress(), "2026-09-22", "2026-09-22T08:00:00.000Z");

    expect(first.alreadyClaimed).toBe(false);
    expect(first.progress.totalDailyChests).toBe(1);
    expect(first.progress.dailyClaims["2026-09-22"].claimedAt).toBe("2026-09-22T08:00:00.000Z");

    const second = claimDailyChestInProgress(first.progress, "2026-09-22", "2026-09-22T09:30:00.000Z");
    const third = claimDailyChestInProgress(second.progress, "2026-09-22", "2026-09-22T21:00:00.000Z");

    expect(second.alreadyClaimed).toBe(true);
    expect(third.alreadyClaimed).toBe(true);
    expect(third.progress.totalDailyChests).toBe(1);
    // 第一次的领取时间不会被后来的重复请求改写。
    expect(third.progress.dailyClaims["2026-09-22"].claimedAt).toBe("2026-09-22T08:00:00.000Z");
    expect(Object.keys(third.progress.dailyClaims)).toHaveLength(1);
  });

  it("第二天可以再次领取，累计印章数 +1", () => {
    const dayOne = claimDailyChestInProgress(createEmptyGrowthProgress(), "2026-09-22").progress;
    const dayTwo = claimDailyChestInProgress(dayOne, "2026-09-23").progress;

    expect(dayTwo.totalDailyChests).toBe(2);
    expect(getExplorerStampCount(dayTwo)).toBe(2);
    expect(Object.keys(dayTwo.dailyClaims).sort()).toEqual(["2026-09-22", "2026-09-23"]);
  });

  it("探险印章数暂时等于累计宝箱数，并给出累计文案", () => {
    const progress = claimDailyChestInProgress(
      claimDailyChestInProgress(createEmptyGrowthProgress(), "2026-09-22").progress,
      "2026-09-23"
    ).progress;

    expect(getExplorerStampCount(progress)).toBe(progress.totalDailyChests);
    expect(buildGrowthStampText(progress)).toBe("累计开启 2 个今日宝箱 · 2 枚探险印章");
  });

  it("刷新页面后已领取状态仍然存在（本地镜像可重建账本）", () => {
    const progress = claimDailyChestInProgress(createEmptyGrowthProgress(), "2026-09-22").progress;

    writeGrowthProgressCache(progress);

    // 模拟刷新：内存状态清空，只剩 localStorage。
    const reloaded = readGrowthProgressCache();

    expect(isDailyChestClaimed(reloaded, "2026-09-22")).toBe(true);
    expect(getDailyChestClaim(reloaded, "2026-09-22").claimedAt).toBe(progress.dailyClaims["2026-09-22"].claimedAt);
    expect(getExplorerStampCount(reloaded)).toBe(1);
    // 重新加载后再领一次同一天，累计数不能变。
    expect(claimDailyChestInProgress(reloaded, "2026-09-22").progress.totalDailyChests).toBe(1);
  });

  it("没有缓存或缓存损坏时退回空账本，不抛错", () => {
    expect(readGrowthProgressCache()).toEqual(createEmptyGrowthProgress());

    globalThis.window.localStorage.setItem(GROWTH_PROGRESS_STORAGE_KEY, "{不是 JSON");

    expect(readGrowthProgressCache()).toEqual(createEmptyGrowthProgress());
  });

  it("只写自己的存储键，不影响挑战 / 错题本 / 日任务的任何本地数据", () => {
    const untouched = {
      "wonder-trivia-island.challenge.progress": JSON.stringify({ activeChapterId: "chapter-grade-3-upper", chapters: {} }),
      "wonder-trivia-island.study.record-book": JSON.stringify({ questionRecords: { "9": { attempts: 3 } } }),
      "wonder-trivia-island.home.daily-tasks": JSON.stringify({ dateKey: "2026-09-22", tasks: { stagesCleared: 1 } })
    };

    for (const [key, value] of Object.entries(untouched)) {
      globalThis.window.localStorage.setItem(key, value);
    }

    writeGrowthProgressCache(claimDailyChestInProgress(createEmptyGrowthProgress(), "2026-09-22").progress);

    expect(globalThis.window.localStorage.getItem(GROWTH_PROGRESS_STORAGE_KEY)).toBeTruthy();

    for (const [key, value] of Object.entries(untouched)) {
      expect(globalThis.window.localStorage.getItem(key)).toBe(value);
    }
  });

  it("账本结构独立：规范化不会把挑战 / 错题本字段混进来", () => {
    const normalized = normalizeGrowthProgress({
      version: 1,
      totalDailyChests: 4,
      dailyClaims: { "2026-09-22": { claimedAt: "2026-09-22T08:00:00.000Z" } },
      // 明显不属于成长账本的字段必须被丢掉。
      progressBook: { chapters: {} },
      studyRecordBook: { questionRecords: {} }
    });

    expect(Object.keys(normalized).sort()).toEqual(["dailyClaims", "totalDailyChests", "version"]);
    // 累计数不会低于真实领取条数；多出来的部分保持原值（历史累计不被改写）。
    expect(normalized.totalDailyChests).toBe(4);
  });

  it("非法日期键不记账，也不会污染累计数", () => {
    const result = claimDailyChestInProgress(createEmptyGrowthProgress(), "2026/09/22");

    expect(result.isValid).toBe(false);
    expect(result.progress.totalDailyChests).toBe(0);
    expect(result.progress.dailyClaims).toEqual({});
  });
});
