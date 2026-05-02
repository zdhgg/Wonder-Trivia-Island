export function useKnowledgeLessonCards({
  expandedLessonIds,
  lessonContentStageById,
  expandedLessonContentIds,
  showRecordedCards,
  showRecommendedCards,
  getLessonNarrationMeta
}) {
  function isLessonExpanded(item) {
    return expandedLessonIds.value.includes(item.id || item.label);
  }

  function toggleLessonExpanded(item) {
    const targetId = item.id || item.label;

    if (!targetId) {
      return;
    }

    expandedLessonIds.value = expandedLessonIds.value.includes(targetId)
      ? expandedLessonIds.value.filter((id) => id !== targetId)
      : [...expandedLessonIds.value, targetId];
  }

  function getVisibleKnowledgePoints(item) {
    const points = Array.isArray(item?.knowledgePointCards) ? item.knowledgePointCards : [];

    if (!item?.isSystematic || points.length <= 1 || isLessonExpanded(item)) {
      return points;
    }

    return [points.find((point) => point.isRecommendedNext) || points[0]].filter(Boolean);
  }

  function getKnowledgePointToggleLabel(item) {
    const points = Array.isArray(item?.knowledgePointCards) ? item.knowledgePointCards : [];

    if (!points.length) {
      return "";
    }

    if (!item?.isSystematic || points.length <= 1) {
      return isLessonExpanded(item) ? "收起这一站的小点" : `展开这一站的 ${points.length} 个小点`;
    }

    if (isLessonExpanded(item)) {
      return "先收起其他小点";
    }

    const remainingCount = Math.max(points.length - 1, 0);
    return remainingCount > 0 ? `再展开另外 ${remainingCount} 个小点` : "展开这一站的小点";
  }

  function isLessonContentOpen(item) {
    return expandedLessonContentIds.value.includes(item.id || item.label);
  }

  function getLessonContentStage(item) {
    if (!item?.isSystematic) {
      return 3;
    }

    const targetId = item.id || item.label;

    if (!targetId || !expandedLessonContentIds.value.includes(targetId)) {
      return 0;
    }

    return lessonContentStageById.value[targetId] || 1;
  }

  function advanceLessonContentStage(item) {
    const targetId = item.id || item.label;

    if (!targetId) {
      return;
    }

    const nextStage = Math.min(getLessonContentStage(item) + 1, 3);
    lessonContentStageById.value = {
      ...lessonContentStageById.value,
      [targetId]: nextStage
    };
  }

  function getMiniLessonCurrentStep(item) {
    const lessons = Array.isArray(item?.miniLessons) ? item.miniLessons : [];

    if (!lessons.length) {
      return 0;
    }

    if (!item?.isSystematic) {
      return lessons.length;
    }

    const stage = getLessonContentStage(item);
    return stage > 0 ? Math.min(stage, lessons.length) : 1;
  }

  function getMiniLessonTone(item, miniIndex) {
    if (!item?.isSystematic) {
      return "current";
    }

    const step = miniIndex + 1;
    const currentStep = getMiniLessonCurrentStep(item);

    if (step < currentStep) {
      return "done";
    }

    if (step === currentStep) {
      return "current";
    }

    return "waiting";
  }

  function getMiniLessonStateLabel(item, miniIndex) {
    if (!item?.isSystematic) {
      return "";
    }

    const step = miniIndex + 1;
    const currentStep = getMiniLessonCurrentStep(item);
    const stage = getLessonContentStage(item);

    if (step < currentStep) {
      return "看过了";
    }

    if (step === currentStep) {
      return stage > 0 ? "正在看" : "现在先看";
    }

    return step === currentStep + 1 ? "下一步" : "后面再看";
  }

  function shouldRevealMiniLessonBody(item, miniIndex) {
    if (!item?.isSystematic) {
      return true;
    }

    return miniIndex + 1 <= getMiniLessonCurrentStep(item);
  }

  function getMiniLessonGuideText(item) {
    if (!item?.isSystematic) {
      return "";
    }

    const narrationMeta = getLessonNarrationMeta(item);
    const stage = getLessonContentStage(item);

    if (stage <= 0) {
      return narrationMeta.guideText;
    }

    if (stage === 1) {
      return "现在正在看第 1 步。看完下面这块，再继续第 2 步。";
    }

    if (stage === 2) {
      return "现在正在看第 2 步。小例子看完后，再去第 3 步。";
    }

    return "三步都排好啦，顺着看完就可以去做 3 题试试。";
  }

  function toggleLessonContent(item) {
    const targetId = item.id || item.label;

    if (!targetId) {
      return;
    }

    if (expandedLessonContentIds.value.includes(targetId)) {
      expandedLessonContentIds.value = expandedLessonContentIds.value.filter((id) => id !== targetId);
      expandedLessonIds.value = expandedLessonIds.value.filter((id) => id !== targetId);
      const nextStages = { ...lessonContentStageById.value };
      delete nextStages[targetId];
      lessonContentStageById.value = nextStages;
      return;
    }

    expandedLessonContentIds.value = [...expandedLessonContentIds.value, targetId];
    expandedLessonIds.value = expandedLessonIds.value.filter((id) => id !== targetId);
    lessonContentStageById.value = {
      ...lessonContentStageById.value,
      [targetId]: 1
    };
  }

  function toggleSection(sectionId) {
    if (sectionId === "recorded") {
      showRecordedCards.value = !showRecordedCards.value;
      return;
    }

    if (sectionId === "recommended") {
      showRecommendedCards.value = !showRecommendedCards.value;
    }
  }

  return {
    isLessonExpanded,
    toggleLessonExpanded,
    getVisibleKnowledgePoints,
    getKnowledgePointToggleLabel,
    isLessonContentOpen,
    getLessonContentStage,
    advanceLessonContentStage,
    getMiniLessonCurrentStep,
    getMiniLessonTone,
    getMiniLessonStateLabel,
    shouldRevealMiniLessonBody,
    getMiniLessonGuideText,
    toggleLessonContent,
    toggleSection
  };
}
