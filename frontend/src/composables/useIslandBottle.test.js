import { describe, expect, it } from "vitest";
import { BOTTLE_LINES, pickBottleLine } from "./useIslandBottle";

// 漂瓶字条池的意图测试：池子要撑得住「每天回来看看」，选句要同一天稳定。
// 这里只测纯函数，不挂组件（日期与存储的接线由 e2e 覆盖）。

function dateKeyOf(dayOffset) {
  const date = new Date(2026, 0, 1 + dayOffset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

describe("island bottle lines", () => {
  it("keeps a pool large enough to stay fresh for weeks", () => {
    expect(BOTTLE_LINES.length).toBeGreaterThanOrEqual(16);
    expect(new Set(BOTTLE_LINES).size).toBe(BOTTLE_LINES.length);
  });

  it("keeps every line short enough for the letter paper", () => {
    for (const line of BOTTLE_LINES) {
      expect(line.length).toBeGreaterThanOrEqual(10);
      expect(line.length).toBeLessThanOrEqual(30);
    }
  });

  it("picks the same line for the same day and never twice in a row", () => {
    const picks = Array.from({ length: 365 }, (_, dayOffset) => {
      const dateKey = dateKeyOf(dayOffset);

      expect(pickBottleLine(dateKey)).toBe(pickBottleLine(dateKey));

      return pickBottleLine(dateKey);
    });

    // 全年每一天都落在池子里，且每句都轮到过：池子大小 = 实际新鲜度。
    expect(new Set(picks).size).toBe(BOTTLE_LINES.length);

    for (let index = 1; index < picks.length; index += 1) {
      expect(picks[index]).not.toBe(picks[index - 1]);
    }
  });
});
