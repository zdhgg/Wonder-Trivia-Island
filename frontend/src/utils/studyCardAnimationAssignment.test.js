import { describe, expect, it } from "vitest";
import { buildSystematicKnowledgeCards } from "./knowledgeStudy.js";
import { buildStudyLessonPlayback } from "./studyLessonBlueprint.js";

// 站点 → 第 1/2/3 步 期望动作。这里记录教研语义和动画动作的对应关系，
// 如果哪天给某站加了覆盖、或调整了默认映射，这个表会先失败。
const EXPECTED_G2_STEP_ACTIONS = {
  "g2-upper-chinese-words": ["step-look", "step-connect", "step-build"],
  "g2-upper-chinese-sentences": ["step-look", "step-connect", "step-build"],
  "g2-upper-chinese-links": ["step-look", "step-connect", "step-build"],
  "g2-upper-chinese-reading": ["step-look", "step-connect", "step-build"],
  "g2-upper-math-mental": ["step-look", "step-connect", "step-build"],
  "g2-upper-math-chain": ["step-look", "step-connect", "step-build"],
  "g2-upper-math-time": ["step-look", "step-connect", "step-build"],
  // “平均分”第 1 步是动手分，覆盖为示范动作
  "g2-upper-math-share": ["example-try", "step-connect", "step-build"],
  "g2-lower-chinese-use": ["step-look", "step-connect", "step-build"],
  "g2-lower-chinese-links": ["step-look", "step-connect", "step-build"],
  "g2-lower-chinese-read": ["step-look", "step-connect", "step-build"],
  "g2-lower-chinese-write": ["step-look", "step-connect", "step-build"],
  "g2-lower-math-multiply": ["step-look", "step-connect", "step-build"],
  "g2-lower-math-divide": ["step-look", "step-connect", "step-build"],
  "g2-lower-math-life": ["step-look", "step-connect", "step-build"],
  "g2-lower-math-problem": ["step-look", "step-connect", "step-build"]
};

describe("grade 2 step-by-step animation assignment", () => {
  const g2Items = buildSystematicKnowledgeCards([]).filter((item) => String(item.id).startsWith("g2-"));

  it("assigns the intended action to each step of every lesson", () => {
    const actual = {};

    for (const item of g2Items) {
      const playback = buildStudyLessonPlayback(item);
      actual[item.id] = playback.cards.slice(0, 3).map((card) => card.visualAnimationId);
    }

    expect(actual).toEqual(EXPECTED_G2_STEP_ACTIONS);
  });

  it("keeps every lesson on the shared example and memory actions", () => {
    // 例子卡优先挂知识点概念动画（见 studyConceptAnimations.js），其余站保持共享动作
    const EXAMPLE_CONCEPT_LESSONS = {
      // 平均分和乘法启蒙：例子卡讲的是“先平均分，再说几份、每份几个”
      "g2-upper-math-share": "concept-share-equally",
      // 平均分和除法起步：例子卡同样是“分一分”，平均分动画照样贴
      "g2-lower-math-divide": "concept-share-equally",
      // 表内乘法和口诀：例子卡讲的是“看几个几，想口诀”
      "g2-lower-math-multiply": "concept-groups-of"
    };

    for (const item of g2Items) {
      const playback = buildStudyLessonPlayback(item);
      const byId = Object.fromEntries(playback.cards.map((card) => [card.id, card.visualAnimationId]));

      expect(byId.example, item.id).toBe(EXAMPLE_CONCEPT_LESSONS[item.id] || "example-try");
      expect(byId.memory, item.id).toBe("memory-keep");
    }
  });
});
