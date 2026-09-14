import { describe, expect, it } from "vitest";
import { STUDY_CARD_ANIMATION_IDS } from "../../../utils/studyCardAnimations.js";
import { STUDY_CONCEPT_ANIMATION_IDS } from "../../../utils/studyConceptAnimations.js";
import { resolveStudyCardAnimationComponent } from "./studyCardAnimationRegistry";

describe("studyCardAnimationRegistry", () => {
  // 漏挂组件不会报错，只会静默退回文字图标，所以这里逐个点名核对。
  it("resolves every registered action animation id", () => {
    for (const animationId of Object.values(STUDY_CARD_ANIMATION_IDS)) {
      expect(resolveStudyCardAnimationComponent(animationId), animationId).toBeTruthy();
    }
  });

  it("resolves every registered concept animation id", () => {
    for (const animationId of Object.values(STUDY_CONCEPT_ANIMATION_IDS)) {
      expect(resolveStudyCardAnimationComponent(animationId), animationId).toBeTruthy();
    }
  });

  it("returns null for unknown or empty ids so the card can fall back", () => {
    expect(resolveStudyCardAnimationComponent("nope")).toBeNull();
    expect(resolveStudyCardAnimationComponent("")).toBeNull();
    expect(resolveStudyCardAnimationComponent(undefined)).toBeNull();
    expect(resolveStudyCardAnimationComponent()).toBeNull();
  });
});
