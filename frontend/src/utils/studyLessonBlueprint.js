const DEFAULT_CARD_DURATION_MS = 2600;

const SUBJECT_VISUAL_PRESETS = Object.freeze({
  语文: Object.freeze({
    tone: "chinese",
    glyph: "语"
  }),
  数学: Object.freeze({
    tone: "math",
    glyph: "数"
  }),
  英语: Object.freeze({
    tone: "english",
    glyph: "英"
  }),
  default: Object.freeze({
    tone: "general",
    glyph: "学"
  })
});

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTitlePrefix(value) {
  return normalizeText(value).replace(/^第\s*\d+\s*步\s*/u, "").trim();
}

function resolveSubjectPreset(subject) {
  return SUBJECT_VISUAL_PRESETS[normalizeText(subject)] ?? SUBJECT_VISUAL_PRESETS.default;
}

function buildNarrationText(parts) {
  return parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .map((part) => (/[。！？.!?]$/u.test(part) ? part : `${part}。`))
    .join("");
}

function resolveStudyNarrationText(item, cardId, fallbackParts) {
  const narrationMap =
    item?.studyNarration && typeof item.studyNarration === "object" && !Array.isArray(item.studyNarration)
      ? item.studyNarration
      : null;
  const overrideText = normalizeText(narrationMap?.[cardId]);

  if (overrideText) {
    return overrideText;
  }

  return buildNarrationText(fallbackParts);
}

function createCard(item, overrides = {}, options = {}) {
  const preset = resolveSubjectPreset(item?.primarySubject);
  const title = normalizeText(overrides.title);
  const body = normalizeText(overrides.body);
  const cardId = normalizeText(overrides.id);
  const lessonId = normalizeText(item?.id || item?.label);
  const detail = normalizeText(overrides.detail);

  if (!title || !body || !cardId) {
    return null;
  }

  return {
    id: cardId,
    kind: normalizeText(overrides.kind) || "lesson",
    eyebrow: normalizeText(overrides.eyebrow),
    title,
    body,
    detail,
    badge: normalizeText(overrides.badge),
    chips: Array.isArray(overrides.chips)
      ? overrides.chips.map((chip) => normalizeText(chip)).filter(Boolean).slice(0, 4)
      : [],
    audioSrc: normalizeText(options.resolveAudioSrc?.(lessonId, cardId)),
    audioAssetStem: lessonId && cardId ? `${lessonId}/${cardId}` : "",
    narrationText: resolveStudyNarrationText(item, cardId, [title, body, detail]),
    visualGlyph: normalizeText(overrides.visualGlyph) || preset.glyph,
    visualTone: normalizeText(overrides.visualTone) || preset.tone,
    minDurationMs: Number.isFinite(Number(overrides.minDurationMs))
      ? Math.max(1600, Number(overrides.minDurationMs))
      : DEFAULT_CARD_DURATION_MS
  };
}

function buildMiniLessonCards(item, options) {
  const lessons = Array.isArray(item?.miniLessons) ? item.miniLessons : [];

  return lessons
    .slice(0, 3)
    .map((lesson, index) =>
      createCard(
        item,
        {
          id: `step-${index + 1}`,
          kind: "step",
          eyebrow: `第 ${index + 1} 步`,
          title: trimTitlePrefix(lesson?.title) || `学习第 ${index + 1} 步`,
          body: lesson?.text,
          detail: index === 0 ? item?.teacherLead : "",
          badge: lesson?.badge,
          visualGlyph: String(index + 1),
          chips: [item?.primarySubject, item?.primaryGrade].filter(Boolean),
          minDurationMs: DEFAULT_CARD_DURATION_MS + index * 120
        },
        options
      )
    )
    .filter(Boolean);
}

function buildOpeningCard(item, options) {
  return createCard(
    item,
    {
      id: "opening",
      kind: "opening",
      eyebrow: item?.stageLabel || "开讲啦",
      title: item?.label || "知识小讲堂",
      body: item?.teacherLead || item?.conceptText || item?.stageSummary || "先把这一站的小本领听明白。",
      detail: item?.stageSummary || item?.whyText,
      badge: item?.contextTag,
      chips: item?.metrics?.map((metric) => `${metric.label} ${metric.value}`) || [],
      visualGlyph: resolveSubjectPreset(item?.primarySubject).glyph,
      minDurationMs: 2800
    },
    options
  );
}

function buildReasonCard(item, options) {
  return createCard(
    item,
    {
      id: "reason",
      kind: "reason",
      eyebrow: "这站在学什么",
      title: item?.conceptLabel || "老师先说",
      body: item?.conceptText || item?.whyText,
      detail: item?.whyText && normalizeText(item?.whyText) !== normalizeText(item?.conceptText) ? item?.whyText : "",
      badge: item?.footerChips?.[0] || item?.primarySubject,
      visualGlyph: "讲",
      minDurationMs: 2800
    },
    options
  );
}

function buildExampleCard(item, options) {
  return createCard(
    item,
    {
      id: "example",
      kind: "example",
      eyebrow: "跟着试试看",
      title: item?.exampleLabel || "看个例子",
      body: item?.examplePrompt || item?.exampleExplanation,
      detail:
        item?.exampleExplanation && normalizeText(item?.exampleExplanation) !== normalizeText(item?.examplePrompt)
          ? item?.exampleExplanation
          : "",
      badge: item?.practiceActionLabel || "听完再试",
      visualGlyph: "试",
      minDurationMs: 3000
    },
    options
  );
}

function buildReminderCard(item, options) {
  const pitfalls = Array.isArray(item?.pitfalls) ? item.pitfalls.map((pitfall) => normalizeText(pitfall)).filter(Boolean) : [];

  if (!pitfalls.length) {
    return null;
  }

  return createCard(
    item,
    {
      id: "reminder",
      kind: "reminder",
      eyebrow: "听完记一下",
      title: "这些地方最容易走神",
      body: pitfalls[0],
      detail: pitfalls[1] || pitfalls[2] || "",
      chips: pitfalls.slice(1, 3),
      visualGlyph: "稳",
      minDurationMs: 2600
    },
    options
  );
}

function buildMemoryCard(item, options) {
  const sequence = Array.isArray(item?.memorySequence) ? item.memorySequence.map((step) => normalizeText(step)).filter(Boolean) : [];

  return createCard(
    item,
    {
      id: "memory",
      kind: "memory",
      eyebrow: "收住这一站",
      title: item?.memoryLabel || "记住小口令",
      body: item?.memoryText || "把这一站的小口令先记在脑袋里。",
      detail: sequence.length ? `顺序是：${sequence.join(" · ")}` : "",
      chips: sequence,
      badge: item?.recommendedPointLabel ? `站里先从 ${item.recommendedPointLabel} 看` : "",
      visualGlyph: "记",
      minDurationMs: 2600
    },
    options
  );
}

export function buildStudyLessonCards(item, options = {}) {
  if (!item) {
    return [];
  }

  const miniLessonCards = buildMiniLessonCards(item, options);

  if (miniLessonCards.length) {
    return [...miniLessonCards, buildExampleCard(item, options), buildMemoryCard(item, options)]
      .filter(Boolean)
      .slice(0, 5);
  }

  return [
    buildOpeningCard(item, options),
    buildReasonCard(item, options),
    buildExampleCard(item, options),
    buildReminderCard(item, options),
    buildMemoryCard(item, options)
  ]
    .filter(Boolean)
    .slice(0, 5);
}

export function buildStudyLessonPlayback(item, options = {}) {
  if (!item) {
    return null;
  }

  const cards = buildStudyLessonCards(item, options);

  if (!cards.length) {
    return null;
  }

  return {
    id: normalizeText(item.id || item.label),
    title: normalizeText(item.label) || "知识小讲堂",
    subject: normalizeText(item.primarySubject),
    grade: normalizeText(item.primaryGrade),
    semester: normalizeText(item.primarySemester),
    summaryText:
      normalizeText(item.teacherLead) ||
      normalizeText(item.stageSummary) ||
      normalizeText(item.conceptText) ||
      "顺着这几张卡听完，这一站就算听懂第一遍了。",
    rewardLabel: normalizeText(item.primaryGrade) === "一年级" ? "启蒙之星" : "知识之星",
    cards
  };
}
