// 概念动画注册表：知识点标签 → 教学动画。
// 与按“步骤动作”分配的 studyCardAnimations 不同，这里按小站的知识点挂动画：
// 同一个标签在不同年级、不同小站出现时自动复用，课程路线扩充后不需要改组件。
export const STUDY_CONCEPT_ANIMATION_IDS = Object.freeze({
  GROUPS_OF: "concept-groups-of"
});

const CONCEPT_ANIMATION_IDS_BY_TAG = Object.freeze({
  乘法初步: STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF,
  乘法口诀: STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF
});

// 概念动画固定挂在例子卡（example）上：例子卡的讲解节奏就是“演示这个概念”，
// 动画时间轴按例子卡解说词的语序分相，并与语音时长同步。
const CONCEPT_ANIMATION_CARD_ID = "example";

export function resolveStudyConceptAnimationId({ knowledgeTags, cardId } = {}) {
  if (String(cardId ?? "").trim() !== CONCEPT_ANIMATION_CARD_ID) {
    return "";
  }

  const tags = Array.isArray(knowledgeTags) ? knowledgeTags : [];

  for (const tag of tags) {
    const animationId = CONCEPT_ANIMATION_IDS_BY_TAG[String(tag ?? "").trim()];

    if (animationId) {
      return animationId;
    }
  }

  return "";
}
