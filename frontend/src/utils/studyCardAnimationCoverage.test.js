import { describe, expect, it } from "vitest";
import { buildSystematicKnowledgeCards } from "./knowledgeStudy.js";
import { buildStudyLessonPlayback } from "./studyLessonBlueprint.js";

// 这组用例直接跑真实教研数据，确保“已铺动画的年级”没有漏站的卡片，
// 同时确保其他年级完全不受影响。新增年级试点时同步调整期望值。
const ANIMATED_LESSON_PREFIX = "g2-";

describe("study animation coverage against real curriculum data", () => {
  const items = buildSystematicKnowledgeCards([]);

  it("covers every card of every grade-2 lesson", () => {
    const g2Items = items.filter((item) => String(item.id).startsWith(ANIMATED_LESSON_PREFIX));
    expect(g2Items.length).toBeGreaterThan(0);

    const missing = [];
    let cardCount = 0;

    for (const item of g2Items) {
      const playback = buildStudyLessonPlayback(item);
      expect(playback, `${item.id} should build a playback`).toBeTruthy();

      for (const card of playback.cards) {
        cardCount += 1;

        if (!card.visualAnimationId) {
          missing.push(`${item.id}/${card.id}`);
        }
      }
    }

    expect(missing).toEqual([]);
    // 16 个二年级小站 × 5 张卡
    expect(cardCount).toBe(80);
  });

  it("leaves every other grade on the text-orb fallback", () => {
    const otherItems = items.filter((item) => !String(item.id).startsWith(ANIMATED_LESSON_PREFIX));
    expect(otherItems.length).toBeGreaterThan(0);

    const leaked = [];

    for (const item of otherItems) {
      const playback = buildStudyLessonPlayback(item);

      for (const card of playback?.cards || []) {
        if (card.visualAnimationId) {
          leaked.push(`${item.id}/${card.id}=${card.visualAnimationId}`);
        }
      }
    }

    expect(leaked).toEqual([]);
  });
});
