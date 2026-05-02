import { HENAN_GRADE_ONE_SYSTEMATIC_SECTIONS } from "../data/henanGradeOneKnowledge.js";
import { HENAN_GRADE_ONE_LESSON_SCRIPTS } from "../data/henanGradeOneLessonScripts.js";
import { HENAN_GRADE_FOUR_LESSON_SCRIPTS } from "../data/henanGradeFourLessonScripts.js";
import { HENAN_GRADE_FOUR_SYSTEMATIC_SECTIONS } from "../data/henanGradeFourKnowledge.js";
import { HENAN_GRADE_FIVE_LESSON_SCRIPTS } from "../data/henanGradeFiveLessonScripts.js";
import { HENAN_GRADE_FIVE_SYSTEMATIC_SECTIONS } from "../data/henanGradeFiveKnowledge.js";
import { HENAN_GRADE_SIX_LESSON_SCRIPTS } from "../data/henanGradeSixLessonScripts.js";
import { HENAN_GRADE_SIX_SYSTEMATIC_SECTIONS } from "../data/henanGradeSixKnowledge.js";
import { HENAN_GRADE_TWO_THREE_SYSTEMATIC_SECTIONS } from "../data/henanGradeTwoThreeKnowledge.js";
import { HENAN_GRADE_TWO_THREE_LESSON_SCRIPTS } from "../data/henanGradeTwoThreeLessonScripts.js";

const HENAN_SYSTEMATIC_SECTIONS = Object.freeze([
  ...HENAN_GRADE_ONE_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_TWO_THREE_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_FOUR_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_FIVE_SYSTEMATIC_SECTIONS,
  ...HENAN_GRADE_SIX_SYSTEMATIC_SECTIONS
]);

const HENAN_LESSON_SCRIPTS = Object.freeze({
  ...HENAN_GRADE_ONE_LESSON_SCRIPTS,
  ...HENAN_GRADE_TWO_THREE_LESSON_SCRIPTS,
  ...HENAN_GRADE_FOUR_LESSON_SCRIPTS,
  ...HENAN_GRADE_FIVE_LESSON_SCRIPTS,
  ...HENAN_GRADE_SIX_LESSON_SCRIPTS
});

function normalizeText(value, maxLength = 0) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || maxLength <= 0) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim();
}

function clipText(value, maxLength = 0) {
  const normalized = normalizeText(value);

  if (!normalized || maxLength <= 0 || normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function clampPercent(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(100, Math.max(0, parsed));
}

function normalizeCount(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeStudyNarrationConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(([cardId, text]) => [normalizeText(cardId), normalizeText(text)])
    .filter(([cardId, text]) => cardId && text);

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

const SUBJECT_GUIDES = Object.freeze({
  "数学": Object.freeze({
    cardLabel: "数学学习卡",
    sequence: Object.freeze(["圈条件", "定关系", "再计算"]),
    buildConcept(label) {
      return `学习 ${label} 时，先看数量之间是什么关系，再决定用什么方法，不要一看到数字就直接算。`;
    },
    buildWhy(label, context) {
      if (context.isRecommended) {
        return `先把 ${label} 的判断顺序讲清楚，等会儿做题时才知道自己是卡在审题、关系还是计算。`;
      }

      if (context.dueCount > 0) {
        return `你最近在 ${label} 上还有要补强的题，说明真正需要稳定的是“先想什么，再算什么”的顺序。`;
      }

      return `数学题考的不是只会算结果，而是能不能先说清楚为什么这样列式、为什么这样判断。`;
    },
    buildPitfalls(label, context) {
      const pitfalls = [
        `只看到数字就开始算，没有先判断 ${label} 在比较什么、求什么。`,
        "题目里的单位、顺序或隐藏条件没有看全，前一步就走偏了。"
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift(`这个点最近正确率只有 ${context.accuracyPercent}% ，常见情况是思路刚起步就被题面带偏。`);
      }

      return pitfalls;
    },
    buildMemory(label) {
      return `记忆顺序先固定下来: 先圈出题目条件, 再说 ${label} 要用的关系, 最后才动笔。`;
    },
    buildExampleHint(label, context) {
      if (context.isRecommended) {
        return `先从一两道 ${label} 入门题开始, 看自己能不能先说出“这题该怎么想”。`;
      }

      return `看例子时别急着记答案, 先用自己的话说出这题为什么属于 ${label}。`;
    }
  }),
  "语文": Object.freeze({
    cardLabel: "语文学习卡",
    sequence: Object.freeze(["找关键词", "连上下文", "说意思"]),
    buildConcept(label) {
      return `学习 ${label} 时，先抓住关键词，再回到句子或语段里看它到底想表达什么。`;
    },
    buildWhy(label, context) {
      if (context.isRecommended) {
        return `先把 ${label} 的意思说清楚，再做题时就不会只盯着某个词语表面去猜。`;
      }

      if (context.dueCount > 0) {
        return `你最近在 ${label} 上还会反复出错，往往不是不会读字，而是没有把关键词和上下文连起来。`;
      }

      return `语文题考的不是背标准答案，而是能不能根据原文或句子说出判断依据。`;
    },
    buildPitfalls(label, context) {
      const pitfalls = [
        `只看某个显眼的词，不把它放回整句或整段里理解。`,
        "把自己的感觉当成原文意思，没有回到题干和上下文里找依据。"
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift(`这个点最近正确率只有 ${context.accuracyPercent}% ，说明“看懂了”和“说清理由”之间还有差距。`);
      }

      return pitfalls;
    },
    buildMemory(label) {
      return `记住一句顺序话: 先找关键词, 再连上下文, 最后用自己的话把 ${label} 说清楚。`;
    },
    buildExampleHint(label, context) {
      if (context.isRecommended) {
        return `开始做题前，先想一想 ${label} 最常考的是“意思”“作用”还是“情感”。`;
      }

      return `看例子时，先指出题目里的关键词，再看解析为什么能得出这个意思。`;
    }
  }),
  "英语": Object.freeze({
    cardLabel: "英语学习卡",
    sequence: Object.freeze(["认词", "看句", "做匹配"]),
    buildConcept(label) {
      return `学习 ${label} 时，先认准关键词，再判断这个单词或句型在题目里到底指什么。`;
    },
    buildWhy(label, context) {
      if (context.isRecommended) {
        return `先把 ${label} 的词义或句型场景讲清楚，再做题时就不会只靠眼熟去猜。`;
      }

      if (context.dueCount > 0) {
        return `你最近在 ${label} 上还需要补强，说明“认识单词”和“放进句子里会用”之间还没有连稳。`;
      }

      return `英语题考的是识别和匹配，不是只记中文意思，更不是凭感觉选一个像的。`;
    },
    buildPitfalls(label, context) {
      const pitfalls = [
        "只看单词眼熟就直接选，没有把它放回句子或场景里判断。",
        `只记中文意思，不知道 ${label} 在实际题目里会怎么出现。`
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift(`这个点最近正确率只有 ${context.accuracyPercent}% ，容易出现“看起来会，放进句子就犹豫”的情况。`);
      }

      return pitfalls;
    },
    buildMemory(label) {
      return `记忆方法是: 先认词, 再看句子场景, 最后再判断 ${label} 的正确用法。`;
    },
    buildExampleHint(label, context) {
      if (context.isRecommended) {
        return `先从最常见的场景题开始, 看自己能不能把 ${label} 和正确意思配上。`;
      }

      return `看例子时, 先读关键词, 再确认解析为什么能对应到正确单词或句型。`;
    }
  }),
  default: Object.freeze({
    cardLabel: "知识学习卡",
    sequence: Object.freeze(["先理解", "会复述", "再检测"]),
    buildConcept(label) {
      return `学习 ${label} 时，先把它到底在讲什么说清楚，再去做题，才不会变成只记答案。`;
    },
    buildWhy(label, context) {
      if (context.isRecommended) {
        return `先建立 ${label} 的概念框架，后面做题时才分得清自己错在知识、审题还是表达。`;
      }

      if (context.dueCount > 0) {
        return `你最近在 ${label} 上还有需要回看的内容，说明这个知识点还没有稳定迁移到新题里。`;
      }

      return `把规则或意思先讲明白，换一道题时才不会只记住上一题的答案。`;
    },
    buildPitfalls(label, context) {
      const pitfalls = [
        `觉得自己“看过就会”，但没有真的把 ${label} 用自己的话讲出来。`,
        "一上来就做题，没有先判断题目到底想考什么。"
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift(`这个点最近正确率只有 ${context.accuracyPercent}% ，要重点检查是不是理解还停留在表面。`);
      }

      return pitfalls;
    },
    buildMemory(label) {
      return `记住一句话: 先理解 ${label}, 再复述给自己听, 最后再用题目做检测。`;
    },
    buildExampleHint(label, context) {
      if (context.isRecommended) {
        return `先用一轮小练习建立 ${label} 的学习卡，系统才会继续沉淀更具体的讲解。`;
      }

      return `先看题目在考什么, 再看解析为什么能说明 ${label}。`;
    }
  })
});

function getSubjectGuide(subject) {
  return SUBJECT_GUIDES[subject] ?? SUBJECT_GUIDES.default;
}

function buildStageSummary(context) {
  if (context.isRecommended) {
    return `题库里已经有 ${context.totalAvailableCount} 道相关题，可以先看讲解，再用少量题建立第一张学习卡。`;
  }

  if (context.dueCount > 0) {
    return `今天还有 ${context.dueCount} 道相关题需要补强，先把规则讲明白，再去做理解检测。`;
  }

  if (context.pendingCount > 0) {
    return `这个知识点正在回温阶段，重点是把方法自己说出来，而不是继续机械刷题。`;
  }

  if (context.questionCount > 0) {
    return `这个知识点已经有个人记录，现在更适合用讲解把理解固定下来，再做少量检测确认迁移。`;
  }

  return "先把概念和方法讲清楚，再去做题更容易稳住。";
}

function buildContextTag(primarySubject, primaryGrade, cardLabel) {
  const segments = [primarySubject, primaryGrade].filter(Boolean);
  return segments.length ? segments.join(" · ") : cardLabel;
}

function buildMetrics(context) {
  if (context.isRecommended) {
    return [
      { label: "题库储备", value: `${context.totalAvailableCount} 题` },
      { label: "学习入口", value: "先学后测" },
      { label: "当前状态", value: "待建立" }
    ];
  }

  return [
    { label: "已沉淀", value: `${context.questionCount} 题` },
    { label: "个人正确率", value: `${context.accuracyPercent}%` },
    { label: "理解度", value: `${context.masteryPercent}%` }
  ];
}

function buildFooterChips(context) {
  const chips = [
    context.contextTag,
    context.latestReviewedLabel ? `最近整理 ${context.latestReviewedLabel}` : "",
    context.isRecommended ? `题库已备 ${context.totalAvailableCount} 题` : "",
    !context.isRecommended && context.dueCount > 0 ? `今天补强 ${context.dueCount} 题` : "",
    !context.isRecommended && context.pendingCount > 0 && context.dueCount === 0 ? `回温中 ${context.pendingCount} 题` : "",
    !context.isRecommended && context.pendingCount === 0 && context.questionCount > 0 ? "已形成个人讲解" : ""
  ].filter(Boolean);

  return chips.slice(0, 4);
}

export function buildKnowledgeStudyCard(summary = {}, options = {}) {
  const label = normalizeText(options.label || summary.label || "未命名知识点");
  const primarySubject = normalizeText(options.primarySubject || summary.primarySubject || summary.subjects?.[0] || "");
  const primaryGrade = normalizeText(options.primaryGrade || summary.primaryGrade || summary.grades?.[0] || "");
  const latestExplanation = normalizeText(summary.latestExplanation || options.latestExplanation, 320);
  const latestQuestionContent = normalizeText(summary.latestQuestionContent || options.latestQuestionContent, 220);
  const isRecommended = Boolean(options.isRecommended);
  const questionCount = normalizeCount(summary.questionCount);
  const pendingCount = normalizeCount(summary.pendingCount);
  const dueCount = normalizeCount(summary.dueCount);
  const scheduledCount = normalizeCount(summary.scheduledCount);
  const masteredCount = normalizeCount(summary.masteredCount);
  const accuracyPercent = clampPercent(summary.accuracyPercent);
  const masteryPercent = clampPercent(summary.masteryPercent);
  const totalAvailableCount = normalizeCount(options.totalAvailableCount ?? summary.totalAvailableCount ?? questionCount);
  const latestReviewedLabel = normalizeText(options.latestReviewedLabel || summary.latestReviewedLabel || "");
  const guide = getSubjectGuide(primarySubject);
  const context = {
    label,
    isRecommended,
    questionCount,
    pendingCount,
    dueCount,
    scheduledCount,
    masteredCount,
    accuracyPercent,
    masteryPercent,
    totalAvailableCount
  };
  const contextTag = buildContextTag(primarySubject, primaryGrade, guide.cardLabel);
  const conceptText = latestExplanation
    ? `先把核心意思说清楚: ${clipText(latestExplanation, 168)}`
    : guide.buildConcept(label, context);
  const whyText = guide.buildWhy(label, context);
  const examplePrompt = latestQuestionContent
    ? clipText(latestQuestionContent, 136)
    : isRecommended
      ? `先从 ${label} 的入门题开始, 边做边看自己是否能先说出规则。`
      : `${label} 的最近题目会在这里作为例子出现。`;
  const exampleExplanation = latestExplanation
    ? clipText(latestExplanation, 168)
    : guide.buildExampleHint(label, context);
  const pitfalls = guide.buildPitfalls(label, context).slice(0, 3);

  return {
    label,
    primarySubject,
    primaryGrade,
    questionCount,
    pendingCount,
    dueCount,
    scheduledCount,
    masteredCount,
    accuracyPercent,
    masteryPercent,
    latestReviewedLabel,
    totalAvailableCount,
    isRecommended,
    stageLabel: isRecommended ? "待建立" : summary.stageLabel || "待开始",
    stageTone: isRecommended ? "planned" : summary.stageTone || "calm",
    contextTag,
    stageSummary: buildStageSummary({
      ...context,
      latestReviewedLabel,
      contextTag
    }),
    metrics: buildMetrics({
      ...context,
      latestReviewedLabel,
      contextTag
    }),
    conceptText,
    whyText,
    exampleLabel: latestQuestionContent ? "最近题目" : isRecommended ? "开始方式" : "讲解入口",
    examplePrompt,
    exampleExplanation,
    pitfalls,
    memoryText: guide.buildMemory(label, context),
    memorySequence: [...guide.sequence],
    footerChips: buildFooterChips({
      ...context,
      latestReviewedLabel,
      contextTag
    }),
    preferredQuestionCount: "3",
    practiceActionLabel: isRecommended ? "先做 3 题建立学习卡" : "做 3 题检测理解"
  };
}

export function buildSystematicKnowledgeSections(studyKnowledgeSummaries = []) {
  const summaryMap = new Map(
    studyKnowledgeSummaries.map((summary) => [normalizeText(summary.label), summary]).filter((entry) => entry[0])
  );

  return HENAN_SYSTEMATIC_SECTIONS.map((section) => ({
    ...section,
    subjects: section.subjects.map((subjectSection) => ({
      ...subjectSection,
      modules: subjectSection.modules.map((module) => {
        const matchedSummaries = module.knowledgeTags
          .map((tag) => summaryMap.get(normalizeText(tag)))
          .filter(Boolean);
        const matchedCount = matchedSummaries.length;
        const dueCount = matchedSummaries.reduce((total, summary) => total + normalizeCount(summary?.dueCount), 0);
        const pendingCount = matchedSummaries.reduce((total, summary) => total + normalizeCount(summary?.pendingCount), 0);

        return {
          ...module,
          knowledgeTagCount: module.knowledgeTags.length,
          matchedCount,
          dueCount,
          pendingCount,
          linkedKnowledgeLabels: matchedSummaries.map((summary) => summary.label).slice(0, 4),
          progressTone: dueCount > 0 ? "alert" : matchedCount > 0 ? "calm" : "planned",
          progressLabel:
            dueCount > 0
              ? `连上 ${matchedCount} 个小点，今天要回看 ${dueCount} 个`
              : matchedCount > 0
                ? `已经连上 ${matchedCount} 个知识小卡`
                : "先按这条路线慢慢学",
          progressHint:
            dueCount > 0
              ? "这部分已经和你的做题记录连上了，可以先看路线，再去补强。"
              : matchedCount > 0
                ? "这部分已经开始变成你的个人知识卡啦。"
                : "这部分还没连上你的做题记录，但可以先按模块顺序学。"
        };
      })
    }))
  }));
}

function averagePercent(summaries, key) {
  if (!summaries.length) {
    return 0;
  }

  const total = summaries.reduce((sum, summary) => sum + clampPercent(summary?.[key]), 0);
  return Math.round(total / summaries.length);
}

const SYSTEMATIC_MODULE_GUIDES = Object.freeze({
  "数学": Object.freeze({
    sequence: Object.freeze(["看题", "想法", "写答"]),
    buildConcept(module) {
      return `这一站要学 ${module.summary}`;
    },
    buildWhy(context) {
      if (context.dueCount > 0) {
        return "先把这一站回看稳，后面的算数题和生活题才不会打结。";
      }

      if (context.matchedCount > 0) {
        return "这一站已经和你做过的题连上啦，顺着学会更容易越走越稳。";
      }

      return "这是一块基础砖，先学会它，后面的数学路会更顺。";
    },
    buildPitfalls(context) {
      const pitfalls = [
        "只盯着数字跑，没有先看题目在问什么。",
        "条件没看全，就急着开始算了。"
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift("这一站最近还容易滑一下，先慢一点看题。");
      }

      return pitfalls;
    },
    buildMemory() {
      return "记住小口令: 先看题, 再想法, 最后写答。";
    },
    buildExample(practiceTag) {
      return {
        label: "先试一试",
        prompt: `先拿「${practiceTag}」试 3 题。`,
        explanation: "做题前先说一句: 这题到底在考什么?"
      };
    }
  }),
  "语文": Object.freeze({
    sequence: Object.freeze(["找词", "读句", "说清"]),
    buildConcept(module) {
      return `这一站在学 ${module.summary}`;
    },
    buildWhy(context) {
      if (context.dueCount > 0) {
        return "先把这一站回看顺，认字、读句子、做阅读题都会轻松一点。";
      }

      if (context.matchedCount > 0) {
        return "这一站已经和你的学习记录连起来啦，接着学会更有感觉。";
      }

      return "这是一块语文小地基，先搭好，后面读和写都会更顺。";
    },
    buildPitfalls(context) {
      const pitfalls = [
        "只看一个词，不把它放回句子里想一想。",
        "还没读完整句，就急着猜答案。"
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift("这一站最近还会卡壳，先慢慢读，再开口说。");
      }

      return pitfalls;
    },
    buildMemory() {
      return "记住小口令: 先找词, 再读句, 最后说清楚。";
    },
    buildExample(practiceTag) {
      return {
        label: "先读一读",
        prompt: `先从「${practiceTag}」这类小题开始。`,
        explanation: "做前先想一想: 这题想让我读懂什么?"
      };
    }
  }),
  "英语": Object.freeze({
    sequence: Object.freeze(["看图", "认句", "开口说"]),
    buildConcept(module) {
      return `这一站会带你学 ${module.summary}`;
    },
    buildWhy(context) {
      if (context.dueCount > 0) {
        return "先把这一站回看顺，英语句子和场景题才不会一见面就发懵。";
      }

      if (context.matchedCount > 0) {
        return "这一站已经和你的英语练习连起来啦，接着学会更顺。";
      }

      return "英语要先敢看、敢听、敢开口，这一站就是起步小台阶。";
    },
    buildPitfalls(context) {
      const pitfalls = [
        "只盯着一个单词猜意思，不看整句和场景。",
        "看懂一点点就直接选，没有再回头核对。"
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift("这一站最近还容易猜错，先把句子放回场景里。");
      }

      return pitfalls;
    },
    buildMemory() {
      return "记住小口令: 先看图, 再认句, 最后开口说。";
    },
    buildExample(practiceTag) {
      return {
        label: "先说一说",
        prompt: `先从「${practiceTag}」这类小题开始。`,
        explanation: "做题前先想: 这句英语最可能出现在哪个场景?"
      };
    }
  }),
  default: Object.freeze({
    sequence: Object.freeze(["先看", "再想", "试一试"]),
    buildConcept(module) {
      return `这一站会带你学 ${module.summary}`;
    },
    buildWhy(context) {
      if (context.dueCount > 0) {
        return "先把这一站重新理顺，再做题会更稳。";
      }

      if (context.matchedCount > 0) {
        return "这一站已经开始和你的学习记录连上啦。";
      }

      return "先有整块地图，再学小点，会更清楚自己在学什么。";
    },
    buildPitfalls(context) {
      const pitfalls = [
        "看了一眼就想跳过去，没有先弄懂这一站在学什么。",
        "只想做题，没有先把规则说给自己听。"
      ];

      if (context.accuracyPercent > 0 && context.accuracyPercent < 70) {
        pitfalls.unshift("这一站还没站稳，先把讲解看一遍再动手。");
      }

      return pitfalls;
    },
    buildMemory() {
      return "记住小口令: 先看懂, 再想明白, 最后试一试。";
    },
    buildExample(practiceTag) {
      return {
        label: "开始方式",
        prompt: `可以先从「${practiceTag}」试 3 题。`,
        explanation: "边做边想: 这一站最重要的小本领是什么?"
      };
    }
  })
});

function getSystematicModuleGuide(subject) {
  return SYSTEMATIC_MODULE_GUIDES[subject] ?? SYSTEMATIC_MODULE_GUIDES.default;
}

function getSystematicModuleScript(moduleId) {
  return HENAN_LESSON_SCRIPTS[moduleId] ?? null;
}

function buildSystematicMiniLessons(module, moduleScript, practiceKnowledgeTag) {
  if (Array.isArray(moduleScript?.miniLessons) && moduleScript.miniLessons.length) {
    return moduleScript.miniLessons.slice(0, 3).map((lesson, index) => ({
      id: `${module.id}-mini-${index + 1}`,
      title: lesson.title,
      text: lesson.text,
      badge: lesson.badge
    }));
  }

  const goals = Array.isArray(module.learnGoals) ? module.learnGoals : [];
  const firstGoal = goals[0] || "先把这一步学会";
  const secondGoal = goals[1] || "把小本领练稳";
  const thirdGoal = goals[2] || "试着自己做一做";

  return [
    {
      id: `${module.id}-mini-1`,
      title: "第 1 步 先认识",
      text: moduleScript?.teacherLead || module.summary,
      badge: firstGoal
    },
    {
      id: `${module.id}-mini-2`,
      title: "第 2 步 学本领",
      text: moduleScript?.conceptText || module.summary,
      badge: secondGoal
    },
    {
      id: `${module.id}-mini-3`,
      title: "第 3 步 试试看",
      text: moduleScript?.examplePrompt || `先从「${practiceKnowledgeTag}」试一试。`,
      badge: thirdGoal
    }
  ];
}

function buildKnowledgePointHint(subject, tag, summary) {
  const dueCount = normalizeCount(summary?.dueCount);
  const questionCount = normalizeCount(summary?.questionCount);

  if (subject === "数学") {
    if (dueCount > 0) {
      return `这个小点今天要回看啦，先说清「${tag}」在算什么，再动笔。`;
    }

    if (questionCount > 0) {
      return `你已经碰过「${tag}」啦，再试几题会更稳。`;
    }

    return `先把「${tag}」看懂，再慢慢算，别急着抢跑。`;
  }

  if (subject === "语文") {
    if (dueCount > 0) {
      return `这个小点今天要回看啦，先读一读，再说说它是什么意思。`;
    }

    if (questionCount > 0) {
      return `你已经学过一点「${tag}」啦，再读一读会更顺。`;
    }

    return `先认识「${tag}」在学什么，再开口读一读、说一说。`;
  }

  if (subject === "英语") {
    if (dueCount > 0) {
      return `这个英语小点今天要回看啦，先看场景，再想「${tag}」在说什么。`;
    }

    if (questionCount > 0) {
      return `你已经碰过「${tag}」啦，再看一遍句子会更稳。`;
    }

    return `先把「${tag}」放进图片或场景里想一想，再开口读。`;
  }

  if (dueCount > 0) {
    return `这个小点今天要回看啦，先把它讲给自己听。`;
  }

  if (questionCount > 0) {
    return `这个小点已经有一点练习记录啦。`;
  }

  return `先从「${tag}」开始认识这一站的小本领。`;
}

function buildKnowledgePointScript(subject, module, tag, summary) {
  const dueCount = normalizeCount(summary?.dueCount);
  const questionCount = normalizeCount(summary?.questionCount);
  const progressTail =
    dueCount > 0
      ? "今天记得回来看它。"
      : questionCount > 0
        ? "你已经学过一点啦。"
        : "现在就能先认识它。";

  if (subject === "语文") {
    if (["入学教育", "课堂习惯", "学习习惯", "书写规范", "口语交际"].includes(tag)) {
      return {
        teacherLead: "这是当小学生的小本领站。",
        learnText: `「${tag}」在教我们会听、会说、会坐好，也会有礼貌。${progressTail}`,
        tryText: "先想一想，上课时小眼睛、小耳朵、小嘴巴要怎么做。",
        pocketText: "先把习惯摆好"
      };
    }

    if (["笔画名称", "笔顺规则", "笔画数"].includes(tag)) {
      return {
        teacherLead: "写字前，要先认清笔画小伙伴。",
        learnText: `学「${tag}」时，先看清从哪一笔开始，再慢慢往下写。${progressTail}`,
        tryText: "看到一个字，先说第一笔是什么，再数一数一共有几笔。",
        pocketText: "先看笔顺"
      };
    }

    if (["偏旁识字", "部首辨认", "归类识字", "姓氏识字", "字谜识字", "会意识字", "象形识字", "识字应用"].includes(tag)) {
      return {
        teacherLead: "认字不是死记，汉字里藏着小线索。",
        learnText: `「${tag}」会提醒你先看偏旁、样子和家族，再猜字的意思。${progressTail}`,
        tryText: "碰到新字时，先找找它像什么，或者和哪一类字像一家人。",
        pocketText: "先看线索"
      };
    }

    if (["拼音基础", "声母认读", "韵母认读", "整体认读音节", "拼读练习", "三拼音节", "拼音规则", "字音辨认", "声调认读", "拼音作用", "多音字辨音", "音节认读", "音序查字", "音序排序"].includes(tag)) {
      return {
        teacherLead: "这是声音小喇叭站，眼睛耳朵嘴巴都要一起上课。",
        learnText: `学「${tag}」时，不只要看字母，还要张嘴读、竖耳朵听。${progressTail}`,
        tryText: "先慢慢读一遍，再听听这个音是不是读对了，排的顺序是不是对了。",
        pocketText: "看一看, 读一读"
      };
    }

    if (["课文理解", "古诗积累", "传统文化"].includes(tag)) {
      return {
        teacherLead: "读书的时候，要把字变成脑袋里的小画面。",
        learnText: `「${tag}」在教你边读边想，看看是谁、在哪儿、发生了什么。${progressTail}`,
        tryText: "读完一句后先别急着翻页，先说说你脑袋里看到了什么。",
        pocketText: "边读边想画面"
      };
    }

    if (["标点符号", "量词运用", "动词搭配", "词语形式", "词语搭配", "近义词", "反义词", "连词成句", "比喻句"].includes(tag)) {
      return {
        teacherLead: "词语和句子要站好队，话才会说得顺。",
        learnText: `学「${tag}」时，要看看哪个词和哪个词更配，句子停在哪里更合适。${progressTail}`,
        tryText: "试着把词语放进一句话里，再听听顺不顺、像不像平时会说的话。",
        pocketText: "先排好词语队"
      };
    }
  }

  if (subject === "数学") {
    if (["数一数", "比多少", "大小比较", "数的顺序", "几个和第几个", "组数比较"].includes(tag)) {
      return {
        teacherLead: "这是数感小站，要先让数字乖乖站队。",
        learnText: `碰到「${tag}」时，先一个一个看清楚，再说谁大谁小、谁排前面。${progressTail}`,
        tryText: "看到一排图或数字，先数清楚，再说一说它们是怎么排队的。",
        pocketText: "先数清楚"
      };
    }

    if (["数的组成", "数位认识", "数的分解", "100以内数"].includes(tag)) {
      return {
        teacherLead: "数字里面藏着“几个十”和“几个一”的秘密。",
        learnText: `学「${tag}」时，要先把数拆开看，不让十位和个位挤成一团。${progressTail}`,
        tryText: "看到一个数，先说有几个十，再说有几个一。",
        pocketText: "先拆开看"
      };
    }

    if (["10以内加法", "10以内减法", "20以内不进位加法", "20以内不退位减法", "20以内退位减法", "想加算减", "100以内口算", "两位数加减两位数"].includes(tag)) {
      return {
        teacherLead: "算式不是看到数字就冲，要先想清楚在干什么。",
        learnText: `碰到「${tag}」时，先想这是合起来、拿走一些，还是需要借一借、凑一凑。${progressTail}`,
        tryText: "下笔前先说一句: 这题为什么用这种算法?",
        pocketText: "先想再算"
      };
    }

    if (["位置", "立体图形", "平面图形", "分类整理", "认识钟表", "人民币", "找规律", "解决问题"].includes(tag)) {
      return {
        teacherLead: "生活里的数学朋友在这里排队等你认呢。",
        learnText: `学「${tag}」时，要先看清生活场景，再找出里面的数学线索。${progressTail}`,
        tryText: "先说你看到了什么，再说这里的数学本领藏在哪里。",
        pocketText: "先找线索"
      };
    }
  }

  if (subject === "英语") {
    if (["情景对话", "礼貌用语", "课堂指令", "句子选择", "课堂用语"].includes(tag)) {
      return {
        teacherLead: "这是一张英语场景卡，先看谁在说、在什么地方说。",
        learnText: `学「${tag}」时，要先看清场景，再想哪一句英语最合适。${progressTail}`,
        tryText: "先看图片和人物，再猜这时候最想说哪一句英语。",
        pocketText: "先看场景"
      };
    }

    if (["数字单词", "时间词汇", "颜色单词", "常识词汇", "单词认读", "单词分类"].includes(tag)) {
      return {
        teacherLead: "这是英语单词小卡，要把词和画面连在一起记。",
        learnText: `学「${tag}」时，先看图、再认词，英语会更好记。${progressTail}`,
        tryText: "先看图或数字，再把英语词读一遍。",
        pocketText: "先看图再认词"
      };
    }

    if (["代词认读", "词义判断", "句意理解", "句子理解", "短语理解"].includes(tag)) {
      return {
        teacherLead: "这张卡在教我们看英语句子的小线索。",
        learnText: `学「${tag}」时，要先找主角，再看动作，最后想整句意思。${progressTail}`,
        tryText: "先圈出句子里最熟的词，再猜整句大意。",
        pocketText: "先找主角"
      };
    }
  }

  return {
    teacherLead: `${module.title}里的这个小点也很重要。`,
    learnText: buildKnowledgePointHint(subject, tag, summary),
    tryText: `先用自己的话说说「${tag}」在学什么，再试 1 道小题。`,
    pocketText: "先讲给自己听"
  };
}

function buildKnowledgePointRouteBadge(index, total) {
  if (total <= 1) {
    return "先学";
  }

  if (index === 0) {
    return "先学";
  }

  if (index === total - 1) {
    return "最后学";
  }

  return "接着学";
}

function resolveRecommendedKnowledgePointIndex(points) {
  if (!points.length) {
    return -1;
  }

  const dueIndex = points.findIndex((point) => point.dueCount > 0);

  if (dueIndex >= 0) {
    return dueIndex;
  }

  const freshIndex = points.findIndex((point) => point.questionCount === 0);

  if (freshIndex >= 0) {
    return freshIndex;
  }

  let fallbackIndex = 0;
  let lowestMastery = points[0]?.masteryPercent ?? 0;

  for (let index = 1; index < points.length; index += 1) {
    if ((points[index]?.masteryPercent ?? 0) < lowestMastery) {
      lowestMastery = points[index].masteryPercent;
      fallbackIndex = index;
    }
  }

  return fallbackIndex;
}

function buildSystematicKnowledgePointCards(section, subjectSection, module, summaryMap) {
  const points = module.knowledgeTags.map((tag, index) => {
    const label = normalizeText(tag);
    const summary = summaryMap.get(label) ?? null;
    const dueCount = normalizeCount(summary?.dueCount);
    const pendingCount = normalizeCount(summary?.pendingCount);
    const questionCount = normalizeCount(summary?.questionCount);
    const masteryPercent = clampPercent(summary?.masteryPercent);
    const pointScript = buildKnowledgePointScript(subjectSection.subject, module, label, summary);
    const routeBadge = buildKnowledgePointRouteBadge(index, module.knowledgeTags.length);

    return {
      id: `${module.id}-point-${index + 1}`,
      label,
      primarySubject: subjectSection.subject,
      primaryGrade: section.grade,
      primarySemester: section.semester,
      practiceKnowledgeTag: label,
      preferredQuestionCount: "3",
      orderIndex: index + 1,
      routeBadge,
      dueCount,
      pendingCount,
      questionCount,
      masteryPercent,
      statusLabel: dueCount > 0 ? "今天回看" : questionCount > 0 ? "已经学过" : "先认识",
      statusTone: dueCount > 0 ? "alert" : questionCount > 0 ? "calm" : "planned",
      teacherLead: pointScript.teacherLead,
      learnText: pointScript.learnText,
      tryText: pointScript.tryText,
      pocketText: pointScript.pocketText,
      hintText: buildKnowledgePointHint(subjectSection.subject, label, summary),
      progressText:
        questionCount > 0
          ? `已经做过 ${questionCount} 题 · 会了 ${masteryPercent}%`
          : "还没连上练习记录",
      dueText:
        dueCount > 0
          ? `今天回看 ${dueCount} 题`
          : pendingCount > 0
            ? `还有 ${pendingCount} 题在回温`
            : "可以先试 3 题",
      actionLabel: dueCount > 0 ? "回看这小点" : "试试这小点"
    };
  });

  const recommendedIndex = resolveRecommendedKnowledgePointIndex(points);

  return points.map((point, index) => ({
    ...point,
    isRecommendedNext: index === recommendedIndex
  }));
}

function buildSystematicModuleCard(section, subjectSection, module, moduleIndex, matchedSummaries, summaryMap) {
  const matchedCount = matchedSummaries.length;
  const dueCount = matchedSummaries.reduce((total, summary) => total + normalizeCount(summary?.dueCount), 0);
  const pendingCount = matchedSummaries.reduce((total, summary) => total + normalizeCount(summary?.pendingCount), 0);
  const questionCount = matchedSummaries.reduce((total, summary) => total + normalizeCount(summary?.questionCount), 0);
  const accuracyPercent = averagePercent(matchedSummaries, "accuracyPercent");
  const masteryPercent = averagePercent(matchedSummaries, "masteryPercent");
  const guide = getSystematicModuleGuide(subjectSection.subject);
  const moduleScript = getSystematicModuleScript(module.id);
  const practiceKnowledgeTag =
    matchedSummaries.find((summary) => normalizeCount(summary?.dueCount) > 0)?.label ||
    matchedSummaries[0]?.label ||
    module.knowledgeTags[0] ||
    module.title;
  const example = moduleScript
    ? {
        label: moduleScript.exampleLabel,
        prompt: moduleScript.examplePrompt,
        explanation: moduleScript.exampleExplanation
      }
    : guide.buildExample(practiceKnowledgeTag, module, {
        matchedCount,
        dueCount,
        pendingCount,
        accuracyPercent,
        masteryPercent
      });
  const progressLabel =
    dueCount > 0 ? `今天回看 ${dueCount} 题` : matchedCount > 0 ? `已经点亮 ${matchedCount} 个小点` : "新站开讲";
  const progressSummary =
    dueCount > 0
      ? `这一站已经和你的练习连上啦，今天回看 ${dueCount} 题就好。`
      : matchedCount > 0
        ? "这一站已经学过一部分啦，顺着往下走会更稳。"
        : "这是一张直接按课程路线排好的讲解卡，不用先做题也能开始学。";
  const fallbackFooterChips = [
    section.title,
    subjectSection.subject,
    ...module.learnGoals.slice(0, 2)
  ].slice(0, 4);
  const fallbackPitfalls = guide.buildPitfalls(
    {
      matchedCount,
      dueCount,
      pendingCount,
      accuracyPercent,
      masteryPercent
    },
    module
  ).slice(0, 3);
  const fallbackMemorySequence = [...guide.sequence];
  const showProgress = matchedCount > 0 || questionCount > 0;
  const miniLessons = buildSystematicMiniLessons(module, moduleScript, practiceKnowledgeTag);
  const knowledgePointCards = buildSystematicKnowledgePointCards(section, subjectSection, module, summaryMap);
  const recommendedPoint = knowledgePointCards.find((point) => point.isRecommendedNext) ?? knowledgePointCards[0] ?? null;
  const knowledgePathChips = knowledgePointCards.map((point) => `${point.orderIndex}.${point.label}`).slice(0, 6);
  const knowledgePathSummary = recommendedPoint
    ? recommendedPoint.dueCount > 0
      ? `这一站先从「${recommendedPoint.label}」回看起。`
      : recommendedPoint.questionCount === 0
        ? `这一站建议先从「${recommendedPoint.label}」开始。`
        : `这一站下一步可以先学「${recommendedPoint.label}」。`
    : "这一站按顺序一小点一小点学。";

  return {
    id: module.id,
    label: module.title,
    primarySubject: subjectSection.subject,
    primaryGrade: section.grade,
    primarySemester: section.semester,
    isSystematic: true,
    matchedCount,
    pendingCount,
    dueCount,
    questionCount,
    accuracyPercent,
    masteryPercent,
    showProgress,
    teacherLead: moduleScript?.teacherLead || `${section.title}的这一站，先来学 ${module.title}。`,
    conceptLabel: "老师先说",
    whyLabel: "学它有啥用",
    pitfallLabel: "小心别绊住",
    memoryLabel: "记忆小口令",
    stageLabel: dueCount > 0 ? "今天回看" : matchedCount > 0 ? "已经点亮" : "新站开讲",
    stageTone: dueCount > 0 ? "alert" : matchedCount > 0 ? "calm" : "planned",
    stageSummary: progressSummary,
    contextTag: `${subjectSection.subject} · ${section.title}`,
    metrics: [
      { label: "学到哪一站", value: `${subjectSection.subject}第 ${moduleIndex + 1} 站` },
      { label: "站里有几个小点", value: `${module.knowledgeTags.length} 个` },
      {
        label: dueCount > 0 ? "今天任务" : matchedCount > 0 ? "点亮进度" : "现在状态",
        value: progressLabel
      }
    ],
    conceptText:
      moduleScript?.conceptText ||
      guide.buildConcept(module, {
        matchedCount,
        dueCount,
        pendingCount,
        accuracyPercent,
        masteryPercent
      }),
    whyText:
      moduleScript?.whyText ||
      guide.buildWhy(
        {
          matchedCount,
          dueCount,
          pendingCount,
          accuracyPercent,
          masteryPercent
        },
        module
      ),
    exampleLabel: example.label,
    examplePrompt: example.prompt,
    exampleExplanation: example.explanation,
    miniLessons,
    knowledgePointCards,
    knowledgePathSummary,
    knowledgePathChips,
    recommendedPointLabel: recommendedPoint?.label || "",
    pitfalls: moduleScript?.pitfalls ? [...moduleScript.pitfalls].slice(0, 3) : fallbackPitfalls,
    memoryText: moduleScript?.memoryText || guide.buildMemory(module),
    memorySequence: moduleScript?.memorySequence ? [...moduleScript.memorySequence] : fallbackMemorySequence,
    studyNarration: normalizeStudyNarrationConfig(moduleScript?.studyNarration),
    footerChips: moduleScript?.footerChips ? [...moduleScript.footerChips].slice(0, 4) : fallbackFooterChips,
    practiceActionLabel: dueCount > 0 ? "做 3 题回看" : "做 3 题试试",
    preferredQuestionCount: "3",
    practiceKnowledgeTag,
    reviewKnowledgeTag: practiceKnowledgeTag,
    linkedKnowledgeLabels: matchedSummaries.map((summary) => summary.label).slice(0, 4)
  };
}

export function buildSystematicKnowledgeCards(studyKnowledgeSummaries = []) {
  const summaryMap = new Map(
    studyKnowledgeSummaries.map((summary) => [normalizeText(summary.label), summary]).filter((entry) => entry[0])
  );

  return HENAN_SYSTEMATIC_SECTIONS.flatMap((section) =>
    section.subjects.flatMap((subjectSection) =>
      subjectSection.modules.map((module, moduleIndex) => {
        const matchedSummaries = module.knowledgeTags
          .map((tag) => summaryMap.get(normalizeText(tag)))
          .filter(Boolean);

        return buildSystematicModuleCard(section, subjectSection, module, moduleIndex, matchedSummaries, summaryMap);
      })
    )
  );
}
