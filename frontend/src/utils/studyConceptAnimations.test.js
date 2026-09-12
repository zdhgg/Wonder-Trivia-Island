import { describe, expect, it } from "vitest";
import { STUDY_CONCEPT_ANIMATION_IDS, resolveStudyConceptAnimationId } from "./studyConceptAnimations.js";
import { buildStudyLessonPlayback } from "./studyLessonBlueprint.js";

function buildGroupsOfLessonItem(overrides = {}) {
  return {
    id: "g2-upper-math-share",
    label: "平均分和乘法启蒙",
    primarySubject: "数学",
    primaryGrade: "二年级",
    primarySemester: "上册",
    knowledgeTags: ["平均分", "乘法初步", "乘法口诀"],
    teacherLead: "把东西平均分，就是乘法和除法世界前面的门。",
    exampleLabel: "分一分",
    examplePrompt: "看到几个盘子和几个物品时，先试着平均分开。",
    exampleExplanation: "一边分一边数，关系就会自己跳出来。",
    memoryText: "平均分小口令: 一份一份放, 每份一样多。",
    memorySequence: ["一份一份放", "每份一样多", "说几个几"],
    miniLessons: [
      { title: "第 1 步 平均分", text: "先把东西一份一份分开，保证每份一样多。", badge: "会平均分" },
      { title: "第 2 步 数一数", text: "看看一共有几份，每份有几个。", badge: "会数关系" },
      { title: "第 3 步 说出来", text: "把“几个几”大声说出来，就是乘法的小影子。", badge: "乘法启蒙" }
    ],
    ...overrides
  };
}

describe("studyConceptAnimations", () => {
  it("maps multiplication knowledge tags onto the groups-of concept animation", () => {
    expect(
      resolveStudyConceptAnimationId({ knowledgeTags: ["平均分", "乘法初步", "乘法口诀"], cardId: "example" })
    ).toBe(STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF);
    expect(resolveStudyConceptAnimationId({ knowledgeTags: ["乘法口诀"], cardId: "example" })).toBe(
      STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF
    );
  });

  it("hosts concept animations on the example card only", () => {
    expect(resolveStudyConceptAnimationId({ knowledgeTags: ["乘法初步"], cardId: "step-1" })).toBe("");
    expect(resolveStudyConceptAnimationId({ knowledgeTags: ["乘法初步"], cardId: "memory" })).toBe("");
    expect(resolveStudyConceptAnimationId({ knowledgeTags: ["乘法初步"], cardId: "" })).toBe("");
  });

  it("returns empty for stations without a registered concept", () => {
    expect(resolveStudyConceptAnimationId({ knowledgeTags: ["口算加法", "大小比较"], cardId: "example" })).toBe("");
    expect(resolveStudyConceptAnimationId({ knowledgeTags: [], cardId: "example" })).toBe("");
    expect(resolveStudyConceptAnimationId({ knowledgeTags: undefined, cardId: "example" })).toBe("");
    expect(resolveStudyConceptAnimationId({})).toBe("");
  });

  it("prefers the concept animation on the example card while other cards keep action animations", () => {
    const playback = buildStudyLessonPlayback(buildGroupsOfLessonItem());
    const byId = Object.fromEntries(playback.cards.map((card) => [card.id, card.visualAnimationId]));

    expect(byId["step-1"]).toBe("example-try");
    expect(byId["step-2"]).toBe("step-connect");
    expect(byId["step-3"]).toBe("step-build");
    expect(byId.example).toBe(STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF);
    expect(byId.memory).toBe("memory-keep");
  });

  it("keeps the shared action animation on the example card when no concept is registered", () => {
    const playback = buildStudyLessonPlayback(
      buildGroupsOfLessonItem({ id: "g2-upper-math-mental", knowledgeTags: ["口算加法", "口算减法", "大小比较"] })
    );
    const exampleCard = playback.cards.find((card) => card.id === "example");

    expect(exampleCard.visualAnimationId).toBe("example-try");
  });
});
