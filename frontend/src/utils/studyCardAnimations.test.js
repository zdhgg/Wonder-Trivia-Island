import { describe, expect, it } from "vitest";
import {
  STUDY_CARD_ANIMATION_IDS,
  isStudyCardAnimationEnabled,
  resolveStudyCardAnimationId
} from "./studyCardAnimations.js";
import { buildStudyLessonPlayback } from "./studyLessonBlueprint.js";

function buildLessonItem(overrides = {}) {
  return {
    id: "g2-lower-math-multiply",
    label: "乘法口诀",
    primarySubject: "数学",
    primaryGrade: "二年级",
    primarySemester: "下册",
    teacherLead: "先看是几个几。",
    exampleLabel: "说口诀",
    examplePrompt: "先看是几个几，再想对应的口诀是哪一句。",
    exampleExplanation: "先认关系，再背口诀，乘法更扎实。",
    memoryText: "乘法小口令: 先看几个几, 再想口诀, 最后写算式。",
    memorySequence: ["看几个几", "想口诀", "写算式"],
    pitfalls: ["口诀背会了，却不知道在算什么。", "几个几总是看反。"],
    miniLessons: [
      { title: "第 1 步 看几个几", text: "先看有几组。", badge: "看关系" },
      { title: "第 2 步 想口诀", text: "把对应口诀叫出来。", badge: "会口诀" },
      { title: "第 3 步 写算式", text: "写成乘法算式。", badge: "会乘法" }
    ],
    ...overrides
  };
}

describe("studyCardAnimations", () => {
  it("enables animations only for lesson prefixes in the pilot scope", () => {
    expect(isStudyCardAnimationEnabled("g2-upper-math-mental")).toBe(true);
    expect(isStudyCardAnimationEnabled("g2-lower-chinese-read")).toBe(true);
    expect(isStudyCardAnimationEnabled("g1-upper-math-number-sense")).toBe(false);
    expect(isStudyCardAnimationEnabled("g3-upper-english-words")).toBe(false);
    expect(isStudyCardAnimationEnabled("")).toBe(false);
  });

  it("maps the five pilot card ids onto the shared action vocabulary", () => {
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-mental", cardId: "step-1" })).toBe(
      STUDY_CARD_ANIMATION_IDS.STEP_LOOK
    );
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-mental", cardId: "step-2" })).toBe(
      STUDY_CARD_ANIMATION_IDS.STEP_CONNECT
    );
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-mental", cardId: "step-3" })).toBe(
      STUDY_CARD_ANIMATION_IDS.STEP_BUILD
    );
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-mental", cardId: "example" })).toBe(
      STUDY_CARD_ANIMATION_IDS.EXAMPLE_TRY
    );
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-mental", cardId: "memory" })).toBe(
      STUDY_CARD_ANIMATION_IDS.MEMORY_KEEP
    );
  });

  it("lets a lesson override the default action for one step", () => {
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-share", cardId: "step-1" })).toBe(
      STUDY_CARD_ANIMATION_IDS.EXAMPLE_TRY
    );
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-share", cardId: "step-2" })).toBe(
      STUDY_CARD_ANIMATION_IDS.STEP_CONNECT
    );
  });

  it("returns null for unknown cards and for lessons outside the pilot", () => {
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-mental", cardId: "opening" })).toBeNull();
    expect(resolveStudyCardAnimationId({ lessonId: "g1-upper-math-number-sense", cardId: "step-1" })).toBeNull();
    expect(resolveStudyCardAnimationId({ lessonId: "g2-upper-math-mental", cardId: "" })).toBeNull();
    expect(resolveStudyCardAnimationId()).toBeNull();
  });
});

describe("studyLessonBlueprint animation binding", () => {
  it("attaches the resolved animation id to every card of a pilot lesson", () => {
    const playback = buildStudyLessonPlayback(buildLessonItem());

    expect(playback.cards.map((card) => card.id)).toEqual(["step-1", "step-2", "step-3", "example", "memory"]);
    expect(playback.cards.map((card) => card.visualAnimationId)).toEqual([
      STUDY_CARD_ANIMATION_IDS.STEP_LOOK,
      STUDY_CARD_ANIMATION_IDS.STEP_CONNECT,
      STUDY_CARD_ANIMATION_IDS.STEP_BUILD,
      STUDY_CARD_ANIMATION_IDS.EXAMPLE_TRY,
      STUDY_CARD_ANIMATION_IDS.MEMORY_KEEP
    ]);
    expect(playback.cards.every((card) => card.lessonId === "g2-lower-math-multiply")).toBe(true);
  });

  it("leaves lessons outside the pilot untouched so they keep the text orb fallback", () => {
    const playback = buildStudyLessonPlayback(buildLessonItem({ id: "g1-upper-chinese-habits", primaryGrade: "一年级" }));

    expect(playback.cards).toHaveLength(5);
    expect(playback.cards.every((card) => card.visualAnimationId === null)).toBe(true);
    expect(playback.cards.every((card) => card.visualGlyph)).toBe(true);
  });
});
