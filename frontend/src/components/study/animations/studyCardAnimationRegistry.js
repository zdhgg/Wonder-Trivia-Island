import { STUDY_CARD_ANIMATION_IDS } from "../../../utils/studyCardAnimations";
import { STUDY_CONCEPT_ANIMATION_IDS } from "../../../utils/studyConceptAnimations";
import StudyConceptGroupsOfAnimation from "./StudyConceptGroupsOfAnimation.vue";
import StudyExampleTryAnimation from "./StudyExampleTryAnimation.vue";
import StudyMemoryKeepAnimation from "./StudyMemoryKeepAnimation.vue";
import StudyStepBuildAnimation from "./StudyStepBuildAnimation.vue";
import StudyStepConnectAnimation from "./StudyStepConnectAnimation.vue";
import StudyStepLookAnimation from "./StudyStepLookAnimation.vue";

// 讲堂播放器视图本身是异步加载的，这里的静态导入会一起进播放器分块，
// 所以动画既能同步首帧出现，也不会增加首页体积。
const STUDY_CARD_ANIMATION_REGISTRY = Object.freeze({
  [STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF]: StudyConceptGroupsOfAnimation,
  [STUDY_CARD_ANIMATION_IDS.STEP_LOOK]: StudyStepLookAnimation,
  [STUDY_CARD_ANIMATION_IDS.STEP_CONNECT]: StudyStepConnectAnimation,
  [STUDY_CARD_ANIMATION_IDS.STEP_BUILD]: StudyStepBuildAnimation,
  [STUDY_CARD_ANIMATION_IDS.EXAMPLE_TRY]: StudyExampleTryAnimation,
  [STUDY_CARD_ANIMATION_IDS.MEMORY_KEEP]: StudyMemoryKeepAnimation
});

export function resolveStudyCardAnimationComponent(animationId) {
  const normalizedAnimationId = String(animationId ?? "").trim();

  if (!normalizedAnimationId) {
    return null;
  }

  return STUDY_CARD_ANIMATION_REGISTRY[normalizedAnimationId] || null;
}
