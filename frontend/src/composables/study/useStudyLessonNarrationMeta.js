import { computed } from "vue";
import { hasStudyNarrationAsset } from "../../audio/studyNarrationRegistry";
import { useStudyNarrationAutoCache } from "../useStudyNarrationAutoCache";
import { buildStudyLessonCards } from "../../utils/studyLessonPlayer";

const DEFAULT_LESSON_NARRATION_META = Object.freeze({
  totalCardCount: 0,
  readyCardCount: 0,
  tone: "text",
  entryLabel: "看图文讲解",
  badgeText: "图文讲解",
  summaryText: "当前这站还没配讲解语音，进入后会按图文顺序带着学。",
  guideText: "这一站已经排成讲解卡啦，点“看图文讲解”会顺着往下看，不用自己挑顺序。",
  buttonTitle: "当前没有讲解语音，进入后会按图文顺序学习。"
});

function hasNarrationForStudyCard(card) {
  return Boolean(card?.audioSrc) || Boolean(card?.audioAssetStem && hasStudyNarrationAsset(card.audioAssetStem));
}

function buildLessonNarrationMeta(item) {
  const cards = buildStudyLessonCards(item);
  const totalCardCount = cards.length;
  const readyCardCount = cards.reduce((count, card) => count + (hasNarrationForStudyCard(card) ? 1 : 0), 0);

  if (readyCardCount <= 0 || totalCardCount <= 0) {
    return {
      ...DEFAULT_LESSON_NARRATION_META,
      totalCardCount,
      readyCardCount
    };
  }

  if (readyCardCount < totalCardCount) {
    return {
      totalCardCount,
      readyCardCount,
      tone: "mixed",
      entryLabel: "进入讲堂",
      badgeText: `已配 ${readyCardCount}/${totalCardCount} 段语音`,
      summaryText: `当前这站已配 ${readyCardCount}/${totalCardCount} 段讲解语音，其余内容会按图文顺序继续。`,
      guideText: "这一站已经排成讲解卡啦，点“进入讲堂”会先听现有语音，缺的部分会自动切到图文讲解。",
      buttonTitle: `当前已配 ${readyCardCount}/${totalCardCount} 段讲解语音。`
    };
  }

  return {
    totalCardCount,
    readyCardCount,
    tone: "audio",
    entryLabel: "进入讲堂",
    badgeText: `已配 ${readyCardCount}/${totalCardCount} 段语音`,
    summaryText: `当前这站已配 ${readyCardCount}/${totalCardCount} 段讲解语音，进入后可以直接顺着听。`,
    guideText: "这一站已经排成讲解卡啦，点“进入讲堂”会顺着往下听，不用自己挑顺序。",
    buttonTitle: `当前已配 ${readyCardCount}/${totalCardCount} 段讲解语音，可以直接顺着听。`
  };
}

export function useStudyLessonNarrationMeta({ knowledgeItems, selectedGradeFilter, selectedSystematicKnowledgeItem }) {
  const studyNarrationAutoCacheGrade = computed(() =>
    selectedGradeFilter.value !== "全部年级"
      ? selectedGradeFilter.value
      : selectedSystematicKnowledgeItem.value?.primaryGrade || ""
  );

  const lessonNarrationMetaById = computed(() => {
    const metaById = new Map();

    for (const item of knowledgeItems.value) {
      const itemId = String(item?.id || item?.label || "").trim();

      if (!itemId || metaById.has(itemId)) {
        continue;
      }

      metaById.set(itemId, buildLessonNarrationMeta(item));
    }

    return metaById;
  });

  function getLessonNarrationMeta(item) {
    const itemId = String(item?.id || item?.label || "").trim();
    return lessonNarrationMetaById.value.get(itemId) || DEFAULT_LESSON_NARRATION_META;
  }

  useStudyNarrationAutoCache(
    studyNarrationAutoCacheGrade,
    computed(() => selectedSystematicKnowledgeItem.value?.id || "")
  );

  return {
    getLessonNarrationMeta
  };
}
