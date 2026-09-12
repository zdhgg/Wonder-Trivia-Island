export const STUDY_CARD_ANIMATION_IDS = Object.freeze({
  STEP_LOOK: "step-look",
  STEP_CONNECT: "step-connect",
  STEP_BUILD: "step-build",
  EXAMPLE_TRY: "example-try",
  MEMORY_KEEP: "memory-keep"
});

const VALID_ANIMATION_IDS = new Set(Object.values(STUDY_CARD_ANIMATION_IDS));

// 讲堂卡片按 cardId 复用同一套动作语义：先看清 → 找关系 → 做出来 → 跟我做 → 收好。
const DEFAULT_CARD_ANIMATION_IDS = Object.freeze({
  "step-1": STUDY_CARD_ANIMATION_IDS.STEP_LOOK,
  "step-2": STUDY_CARD_ANIMATION_IDS.STEP_CONNECT,
  "step-3": STUDY_CARD_ANIMATION_IDS.STEP_BUILD,
  example: STUDY_CARD_ANIMATION_IDS.EXAMPLE_TRY,
  memory: STUDY_CARD_ANIMATION_IDS.MEMORY_KEEP
});

// 个别小站的某一步和默认动作不贴，可以在这里单独改写。
const LESSON_CARD_ANIMATION_OVERRIDES = Object.freeze({
  // “平均分”的第 1 步本身就是动手分，默认的“先看清”不贴切，改成示范动作。
  "g2-upper-math-share": Object.freeze({
    "step-1": STUDY_CARD_ANIMATION_IDS.EXAMPLE_TRY
  })
});

// 动画试点当前只铺二年级。扩到其他年级时，在这里追加对应前缀（例如 "g3-"）。
export const STUDY_CARD_ANIMATION_ENABLED_LESSON_PREFIXES = Object.freeze(["g2-"]);

function normalizeId(value) {
  return String(value ?? "").trim();
}

export function isStudyCardAnimationEnabled(lessonId) {
  const normalizedLessonId = normalizeId(lessonId);

  if (!normalizedLessonId) {
    return false;
  }

  return STUDY_CARD_ANIMATION_ENABLED_LESSON_PREFIXES.some((prefix) => normalizedLessonId.startsWith(prefix));
}

export function resolveStudyCardAnimationId({ lessonId, cardId } = {}) {
  const normalizedLessonId = normalizeId(lessonId);
  const normalizedCardId = normalizeId(cardId);

  if (!normalizedCardId || !isStudyCardAnimationEnabled(normalizedLessonId)) {
    return null;
  }

  const overrideAnimationId = normalizeId(LESSON_CARD_ANIMATION_OVERRIDES[normalizedLessonId]?.[normalizedCardId]);

  if (overrideAnimationId) {
    return VALID_ANIMATION_IDS.has(overrideAnimationId) ? overrideAnimationId : null;
  }

  const defaultAnimationId = normalizeId(DEFAULT_CARD_ANIMATION_IDS[normalizedCardId]);

  return VALID_ANIMATION_IDS.has(defaultAnimationId) ? defaultAnimationId : null;
}
