// 概念动画注册表：知识点标签 → 教学动画。
// 与按“步骤动作”分配的 studyCardAnimations 不同，这里按小站的知识点挂动画：
// 同一个标签在不同年级、不同小站出现时自动复用，课程路线扩充后不需要改组件。
export const STUDY_CONCEPT_ANIMATION_IDS = Object.freeze({
  GROUPS_OF: "concept-groups-of",
  SHARE_EQUALLY: "concept-share-equally"
});

// 同一张卡可能带多个标签，这里按数组顺序决定优先级：越靠前越具体，先命中先用，
// 不依赖课程数据里标签的书写顺序。
// “平均分和乘法启蒙”这类小站同时带“平均分”和“乘法初步”，而例子卡的解说词
// 讲的是平均分（“先平均分，再说一共有几份、每份几个”），所以“平均分”必须排在
// “乘法初步”前面，否则会被乘法概念动画抢走。
const CONCEPT_ANIMATION_RULES = Object.freeze([
  Object.freeze({ tag: "平均分", animationId: STUDY_CONCEPT_ANIMATION_IDS.SHARE_EQUALLY }),
  Object.freeze({ tag: "乘法初步", animationId: STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF }),
  Object.freeze({ tag: "乘法口诀", animationId: STUDY_CONCEPT_ANIMATION_IDS.GROUPS_OF })
]);

// 概念动画固定挂在例子卡（example）上：例子卡的讲解节奏就是“演示这个概念”，
// 动画时间轴按例子卡解说词的语序分相，并与语音时长同步。
const CONCEPT_ANIMATION_CARD_ID = "example";

export function resolveStudyConceptAnimationId({ knowledgeTags, cardId } = {}) {
  if (String(cardId ?? "").trim() !== CONCEPT_ANIMATION_CARD_ID) {
    return "";
  }

  const tags = new Set(
    (Array.isArray(knowledgeTags) ? knowledgeTags : []).map((tag) => String(tag ?? "").trim())
  );

  for (const rule of CONCEPT_ANIMATION_RULES) {
    if (tags.has(rule.tag)) {
      return rule.animationId;
    }
  }

  return "";
}
