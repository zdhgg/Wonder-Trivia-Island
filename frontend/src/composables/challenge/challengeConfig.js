import {
  CHALLENGE_ACHIEVEMENTS,
  evaluateChallengeAchievements,
  mergeChallengeAchievementStates,
  normalizeChallengeAchievementStates
} from "../../utils/challengeAchievements";
import { evaluateStageMission } from "../../utils/challengeStageRules";

export const CHALLENGE_STAGES = Object.freeze([
  Object.freeze({
      id: "stage-1",
      title: "海边码头",
      glyph: "海",
      chapterLabel: "起航站",
      tagline: "轻松起航",
      travelNote: "从海边码头推船出发，先用更轻松的题感把节奏热起来。",
      themeClass: "harbor",
      questionCount: 3,
      difficulty: "1",
      timeLimitSeconds: 0,
      pointsPerCorrect: 10,
      passAccuracy: 60,
      mission: Object.freeze({
        title: "启航任务",
        type: "pass",
        label: "顺利完成本关",
        detail: "完成本关就能收下第一张船票。"
      }),
      reward: Object.freeze({
        id: "harbor-ticket",
        glyph: "票",
        name: "启航船票",
        summary: "航海册里的第一张通行票。"
      })
    }),
    Object.freeze({
      id: "stage-2",
      title: "贝壳浅滩",
      glyph: "贝",
      chapterLabel: "拾贝站",
      tagline: "浪花提速",
      travelNote: "到了贝壳浅滩，浪头开始变快，倒计时会提醒你稳住速度。",
      themeClass: "shell",
      questionCount: 5,
      difficulty: "1",
      timeLimitSeconds: 30,
      pointsPerCorrect: 10,
      passAccuracy: 60,
      mission: Object.freeze({
        title: "拾贝任务",
        type: "streak",
        target: 3,
        label: "连对 3 题",
        detail: "稳住节奏，连对三题就能捞起潮汐贝壳。"
      }),
      reward: Object.freeze({
        id: "tide-shell",
        glyph: "贝",
        name: "潮汐贝壳",
        summary: "浅滩站的连对收藏。"
      })
    }),
    Object.freeze({
      id: "stage-3",
      title: "珊瑚拱门",
      glyph: "珊",
      chapterLabel: "穿礁站",
      tagline: "穿礁应变",
      travelNote: "珊瑚拱门会收紧难度，既要判断更准，也要答得更利落。",
      themeClass: "coral",
      questionCount: 5,
      difficulty: "2",
      timeLimitSeconds: 25,
      pointsPerCorrect: 10,
      passAccuracy: 70,
      mission: Object.freeze({
        title: "穿礁任务",
        type: "zero-timeout",
        label: "全程不超时",
        detail: "穿过珊瑚拱门时，别让倒计时抢先一步。"
      }),
      reward: Object.freeze({
        id: "coral-charm",
        glyph: "珊",
        name: "珊瑚护符",
        summary: "稳住节奏才能带走的护符。"
      })
    }),
    Object.freeze({
      id: "stage-4",
      title: "灯塔坡地",
      glyph: "灯",
      chapterLabel: "望塔站",
      tagline: "逆风长跑",
      travelNote: "灯塔坡地的题量更长，像顶着海风前进，要把稳定性拉满。",
      themeClass: "lighthouse",
      questionCount: 10,
      difficulty: "2",
      timeLimitSeconds: 20,
      pointsPerCorrect: 10,
      passAccuracy: 70,
      mission: Object.freeze({
        title: "守塔任务",
        type: "correct-target",
        target: 8,
        label: "答对 8 题",
        detail: "顶着海风前进，也要把正确题数稳稳拉满。"
      }),
      reward: Object.freeze({
        id: "lighthouse-badge",
        glyph: "灯",
        name: "灯塔徽章",
        summary: "耐力站点亮的航路徽章。"
      })
    }),
    Object.freeze({
      id: "stage-5",
      title: "知识火山",
      glyph: "火",
      chapterLabel: "火山站",
      tagline: "火山冲刺",
      travelNote: "知识火山先把节奏推到高压段，冲出火山口后才会进入最后两站的登顶路线。",
      themeClass: "volcano",
      questionCount: 10,
      difficulty: "3",
      timeLimitSeconds: 15,
      pointsPerCorrect: 10,
      passAccuracy: 80,
      mission: Object.freeze({
        title: "火山任务",
        type: "final-sprint",
        target: 2,
        windowSize: 3,
        sprintTimeLimitSeconds: 12,
        label: "最后 3 题答对 2 题",
        detail: "终点冲刺开始后，倒计时会再快一点。"
      }),
      reward: Object.freeze({
        id: "volcano-medal",
        glyph: "火",
        name: "火山勋章",
        summary: "火山站的冲刺收藏。"
      })
    }),
    Object.freeze({
      id: "stage-6",
      title: "云顶索桥",
      glyph: "云",
      chapterLabel: "高空站",
      tagline: "云端稳步",
      travelNote: "冲出知识火山后，要在云顶索桥上稳住手感，别让高空节奏把你带偏。",
      themeClass: "sky",
      questionCount: 8,
      difficulty: "3",
      timeLimitSeconds: 15,
      pointsPerCorrect: 10,
      passAccuracy: 80,
      mission: Object.freeze({
        title: "云桥任务",
        type: "correct-target",
        target: 7,
        label: "答对 7 题",
        detail: "高空索桥没有回头路，至少答对 7 题才能带走云桥罗盘。"
      }),
      reward: Object.freeze({
        id: "sky-compass",
        glyph: "云",
        name: "云桥罗盘",
        summary: "高空站的导航收藏。"
      })
    }),
    Object.freeze({
      id: "stage-7",
      title: "荣耀终塔",
      glyph: "冠",
      chapterLabel: "登顶站",
      tagline: "终塔收束",
      travelNote: "最后的荣耀终塔会把整条路线压到最紧，冲过这里才算完成这一章节的全部挑战。",
      themeClass: "crown",
      questionCount: 10,
      difficulty: "3",
      timeLimitSeconds: 12,
      pointsPerCorrect: 10,
      passAccuracy: 80,
      mission: Object.freeze({
        title: "登顶任务",
        type: "streak",
        target: 4,
        label: "连对 4 题",
        detail: "终塔要靠稳定输出，连对 4 题才能真正拿下登顶王冠。"
      }),
      reward: Object.freeze({
        id: "summit-crown",
        glyph: "冠",
        name: "登顶王冠",
        summary: "章节路线的最终收藏。"
      })
    })
  ]);

export const CHALLENGE_CHAPTER_ROUTE_CONFIG = Object.freeze({
    "chapter-grade-1-upper": Object.freeze({
      routeTitle: "启蒙起步线",
      routeFocus: "看图观察 · 跟题作答",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({
          title: "看图起步",
          glyph: "观",
          chapterLabel: "起步站",
          questionKnowledgeTag: "看图起步"
        }),
        "stage-2": Object.freeze({ title: "顺序跟答", glyph: "跟", chapterLabel: "节奏站" }),
        "stage-3": Object.freeze({ title: "数量找友", glyph: "数", chapterLabel: "数感站" }),
        "stage-4": Object.freeze({ title: "短句抓点", glyph: "句", chapterLabel: "抓点站" }),
        "stage-5": Object.freeze({ title: "规律连答", glyph: "连", chapterLabel: "规律站" }),
        "stage-6": Object.freeze({ title: "限时稳步", glyph: "稳", chapterLabel: "稳答站" }),
        "stage-7": Object.freeze({ title: "启蒙冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-1-lower": Object.freeze({
      routeTitle: "独立答题线",
      routeFocus: "独立看题 · 顺序思考",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "独立看题", glyph: "独", chapterLabel: "起步站" }),
        "stage-2": Object.freeze({ title: "条件配对", glyph: "配", chapterLabel: "配对站" }),
        "stage-3": Object.freeze({ title: "顺序推想", glyph: "推", chapterLabel: "顺序站" }),
        "stage-4": Object.freeze({ title: "比较判断", glyph: "判", chapterLabel: "比较站" }),
        "stage-5": Object.freeze({ title: "口算稳住", glyph: "算", chapterLabel: "稳算站" }),
        "stage-6": Object.freeze({ title: "限时提速", glyph: "速", chapterLabel: "提速站" }),
        "stage-7": Object.freeze({ title: "进阶冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-2-upper": Object.freeze({
      routeTitle: "方法上手线",
      routeFocus: "读懂条件 · 两步思考",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "条件上手", glyph: "条", chapterLabel: "入门站" }),
        "stage-2": Object.freeze({ title: "线索配齐", glyph: "齐", chapterLabel: "配齐站" }),
        "stage-3": Object.freeze({ title: "短文找点", glyph: "点", chapterLabel: "短文站" }),
        "stage-4": Object.freeze({ title: "图表看懂", glyph: "图", chapterLabel: "图表站" }),
        "stage-5": Object.freeze({ title: "两步连推", glyph: "推", chapterLabel: "推理站" }),
        "stage-6": Object.freeze({ title: "稳答提速", glyph: "稳", chapterLabel: "提速站" }),
        "stage-7": Object.freeze({ title: "方法冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-2-lower": Object.freeze({
      routeTitle: "方法进阶线",
      routeFocus: "线索整合 · 稳步连推",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "条件上手", glyph: "条", chapterLabel: "入门站" }),
        "stage-2": Object.freeze({ title: "线索配齐", glyph: "齐", chapterLabel: "配齐站" }),
        "stage-3": Object.freeze({ title: "短文找点", glyph: "点", chapterLabel: "短文站" }),
        "stage-4": Object.freeze({ title: "图表看懂", glyph: "图", chapterLabel: "图表站" }),
        "stage-5": Object.freeze({ title: "两步连推", glyph: "推", chapterLabel: "推理站" }),
        "stage-6": Object.freeze({ title: "稳答提速", glyph: "稳", chapterLabel: "提速站" }),
        "stage-7": Object.freeze({ title: "方法冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-3-upper": Object.freeze({
      routeTitle: "读题转弯线",
      routeFocus: "拆分信息 · 估算判断",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "读题转弯", glyph: "读", chapterLabel: "转弯站" }),
        "stage-2": Object.freeze({ title: "信息拆分", glyph: "拆", chapterLabel: "拆分站" }),
        "stage-3": Object.freeze({ title: "估算判断", glyph: "估", chapterLabel: "估算站" }),
        "stage-4": Object.freeze({ title: "图文转换", glyph: "转", chapterLabel: "转换站" }),
        "stage-5": Object.freeze({ title: "应用连推", glyph: "连", chapterLabel: "应用站" }),
        "stage-6": Object.freeze({ title: "限时稳答", glyph: "稳", chapterLabel: "稳答站" }),
        "stage-7": Object.freeze({ title: "综合冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-3-lower": Object.freeze({
      routeTitle: "综合转化线",
      routeFocus: "图文切换 · 应用连推",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "读题转弯", glyph: "读", chapterLabel: "转弯站" }),
        "stage-2": Object.freeze({ title: "信息拆分", glyph: "拆", chapterLabel: "拆分站" }),
        "stage-3": Object.freeze({ title: "估算判断", glyph: "估", chapterLabel: "估算站" }),
        "stage-4": Object.freeze({ title: "图文转换", glyph: "转", chapterLabel: "转换站" }),
        "stage-5": Object.freeze({ title: "应用连推", glyph: "连", chapterLabel: "应用站" }),
        "stage-6": Object.freeze({ title: "限时稳答", glyph: "稳", chapterLabel: "稳答站" }),
        "stage-7": Object.freeze({ title: "综合冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-4-upper": Object.freeze({
      routeTitle: "综合提取线",
      routeFocus: "关键定位 · 多步整合",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "关键定位", glyph: "关", chapterLabel: "定位站" }),
        "stage-2": Object.freeze({ title: "条件筛选", glyph: "筛", chapterLabel: "筛选站" }),
        "stage-3": Object.freeze({ title: "多步计算", glyph: "算", chapterLabel: "计算站" }),
        "stage-4": Object.freeze({ title: "图表整合", glyph: "表", chapterLabel: "整合站" }),
        "stage-5": Object.freeze({ title: "推理连贯", glyph: "理", chapterLabel: "推理站" }),
        "stage-6": Object.freeze({ title: "速度稳定", glyph: "稳", chapterLabel: "稳速站" }),
        "stage-7": Object.freeze({ title: "章节冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-4-lower": Object.freeze({
      routeTitle: "表达统整线",
      routeFocus: "图表归并 · 推理连贯",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "关键定位", glyph: "关", chapterLabel: "定位站" }),
        "stage-2": Object.freeze({ title: "条件筛选", glyph: "筛", chapterLabel: "筛选站" }),
        "stage-3": Object.freeze({ title: "多步计算", glyph: "算", chapterLabel: "计算站" }),
        "stage-4": Object.freeze({ title: "图表整合", glyph: "表", chapterLabel: "整合站" }),
        "stage-5": Object.freeze({ title: "推理连贯", glyph: "理", chapterLabel: "推理站" }),
        "stage-6": Object.freeze({ title: "速度稳定", glyph: "稳", chapterLabel: "稳速站" }),
        "stage-7": Object.freeze({ title: "章节冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-5-upper": Object.freeze({
      routeTitle: "结构推理线",
      routeFocus: "结构拆题 · 证据比对",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "结构拆题", glyph: "拆", chapterLabel: "拆题站" }),
        "stage-2": Object.freeze({ title: "证据比对", glyph: "证", chapterLabel: "比对站" }),
        "stage-3": Object.freeze({ title: "关系推断", glyph: "推", chapterLabel: "推断站" }),
        "stage-4": Object.freeze({ title: "多项统整", glyph: "统", chapterLabel: "统整站" }),
        "stage-5": Object.freeze({ title: "表达判断", glyph: "判", chapterLabel: "表达站" }),
        "stage-6": Object.freeze({ title: "高压稳答", glyph: "稳", chapterLabel: "高压站" }),
        "stage-7": Object.freeze({ title: "预演冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-5-lower": Object.freeze({
      routeTitle: "综合表达线",
      routeFocus: "多项统整 · 表达判断",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "结构拆题", glyph: "拆", chapterLabel: "拆题站" }),
        "stage-2": Object.freeze({ title: "证据比对", glyph: "证", chapterLabel: "比对站" }),
        "stage-3": Object.freeze({ title: "关系推断", glyph: "推", chapterLabel: "推断站" }),
        "stage-4": Object.freeze({ title: "多项统整", glyph: "统", chapterLabel: "统整站" }),
        "stage-5": Object.freeze({ title: "表达判断", glyph: "判", chapterLabel: "表达站" }),
        "stage-6": Object.freeze({ title: "高压稳答", glyph: "稳", chapterLabel: "高压站" }),
        "stage-7": Object.freeze({ title: "预演冲线", glyph: "冲", chapterLabel: "终点站" })
      })
    }),
    "chapter-grade-6-upper": Object.freeze({
      routeTitle: "毕业冲顶线",
      routeFocus: "综合审题 · 高压冲刺",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "审题锁点", glyph: "审", chapterLabel: "审题站" }),
        "stage-2": Object.freeze({ title: "信息建模", glyph: "模", chapterLabel: "建模站" }),
        "stage-3": Object.freeze({ title: "多步求解", glyph: "解", chapterLabel: "求解站" }),
        "stage-4": Object.freeze({ title: "跨题迁移", glyph: "迁", chapterLabel: "迁移站" }),
        "stage-5": Object.freeze({ title: "综合判断", glyph: "综", chapterLabel: "综合站" }),
        "stage-6": Object.freeze({ title: "限时冲顶", glyph: "顶", chapterLabel: "冲顶站" }),
        "stage-7": Object.freeze({ title: "终章通关", glyph: "冠", chapterLabel: "终章站" })
      })
    }),
    "chapter-grade-6-lower": Object.freeze({
      routeTitle: "终章整合线",
      routeFocus: "跨题迁移 · 综合判断",
      stagePlan: Object.freeze({
        "stage-1": Object.freeze({ title: "审题锁点", glyph: "审", chapterLabel: "审题站" }),
        "stage-2": Object.freeze({ title: "信息建模", glyph: "模", chapterLabel: "建模站" }),
        "stage-3": Object.freeze({ title: "多步求解", glyph: "解", chapterLabel: "求解站" }),
        "stage-4": Object.freeze({ title: "跨题迁移", glyph: "迁", chapterLabel: "迁移站" }),
        "stage-5": Object.freeze({ title: "综合判断", glyph: "综", chapterLabel: "综合站" }),
        "stage-6": Object.freeze({ title: "限时冲顶", glyph: "顶", chapterLabel: "冲顶站" }),
        "stage-7": Object.freeze({ title: "终章通关", glyph: "冠", chapterLabel: "终章站" })
      })
    })
  });

export const CHALLENGE_CHAPTERS = Object.freeze([
    Object.freeze({
      id: "chapter-grade-1-upper",
      grade: "一年级",
      semester: "上册",
      label: "一年级上册",
      shortLabel: "一年级上"
    }),
    Object.freeze({
      id: "chapter-grade-1-lower",
      grade: "一年级",
      semester: "下册",
      label: "一年级下册",
      shortLabel: "一年级下"
    }),
    Object.freeze({
      id: "chapter-grade-2-upper",
      grade: "二年级",
      semester: "上册",
      label: "二年级上册",
      shortLabel: "二年级上"
    }),
    Object.freeze({
      id: "chapter-grade-2-lower",
      grade: "二年级",
      semester: "下册",
      label: "二年级下册",
      shortLabel: "二年级下"
    }),
    Object.freeze({
      id: "chapter-grade-3-upper",
      grade: "三年级",
      semester: "上册",
      label: "三年级上册",
      shortLabel: "三年级上"
    }),
    Object.freeze({
      id: "chapter-grade-3-lower",
      grade: "三年级",
      semester: "下册",
      label: "三年级下册",
      shortLabel: "三年级下"
    }),
    Object.freeze({
      id: "chapter-grade-4-upper",
      grade: "四年级",
      semester: "上册",
      label: "四年级上册",
      shortLabel: "四年级上"
    }),
    Object.freeze({
      id: "chapter-grade-4-lower",
      grade: "四年级",
      semester: "下册",
      label: "四年级下册",
      shortLabel: "四年级下"
    }),
    Object.freeze({
      id: "chapter-grade-5-upper",
      grade: "五年级",
      semester: "上册",
      label: "五年级上册",
      shortLabel: "五年级上"
    }),
    Object.freeze({
      id: "chapter-grade-5-lower",
      grade: "五年级",
      semester: "下册",
      label: "五年级下册",
      shortLabel: "五年级下"
    }),
    Object.freeze({
      id: "chapter-grade-6-upper",
      grade: "六年级",
      semester: "上册",
      label: "六年级上册",
      shortLabel: "六年级上"
    }),
    Object.freeze({
      id: "chapter-grade-6-lower",
      grade: "六年级",
      semester: "下册",
      label: "六年级下册",
      shortLabel: "六年级下"
    })
  ]);

export const CHALLENGE_SEMESTER_GRADES = Object.freeze(["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]);
  const LEGACY_CHALLENGE_CHAPTER_TARGETS = Object.freeze({
    "chapter-grade-2": Object.freeze(["chapter-grade-2-upper", "chapter-grade-2-lower"]),
    "chapter-grade-3": Object.freeze(["chapter-grade-3-upper", "chapter-grade-3-lower"]),
    "chapter-grade-4": Object.freeze(["chapter-grade-4-upper", "chapter-grade-4-lower"]),
    "chapter-grade-5": Object.freeze(["chapter-grade-5-upper", "chapter-grade-5-lower"]),
    "chapter-grade-6": Object.freeze(["chapter-grade-6-upper", "chapter-grade-6-lower"])
  });
  const LEGACY_CHALLENGE_ACTIVE_CHAPTER_MAP = Object.freeze({
    "chapter-grade-2": "chapter-grade-2-upper",
    "chapter-grade-3": "chapter-grade-3-upper",
    "chapter-grade-4": "chapter-grade-4-upper",
    "chapter-grade-5": "chapter-grade-5-upper",
    "chapter-grade-6": "chapter-grade-6-upper"
  });
export const DEFAULT_CHALLENGE_CHAPTER_ID = "chapter-grade-3-upper";

  const DEFAULT_QUIZ_SETTINGS = Object.freeze({
    selectedSubject: "全部学科",
    selectedGrade: "全部年级",
    selectedSemester: "全部学期",
    selectedQuestionCount: "3",
    selectedDifficulty: "",
    selectedTimeLimitSeconds: "0",
    selectedPointsPerCorrect: "10"
  });

  function normalizeSelectValue(rawValue, allowedValues, fallback) {
    const normalizedValue = String(rawValue ?? "").trim();

    return allowedValues.includes(normalizedValue) ? normalizedValue : fallback;
  }

  function getDifficultyLabel(value) {
    return DIFFICULTY_OPTIONS.find((option) => option.value === String(value ?? "").trim())?.label || "全部难度";
  }

export function getChallengeStage(stageId) {
    return CHALLENGE_STAGES.find((stage) => stage.id === stageId) ?? CHALLENGE_STAGES[0];
  }

export function getChallengeChapter(chapterId) {
    const baseChapter = CHALLENGE_CHAPTERS.find((chapter) => chapter.id === chapterId) ?? CHALLENGE_CHAPTERS[0];
    return {
      ...baseChapter,
      ...(CHALLENGE_CHAPTER_ROUTE_CONFIG[baseChapter.id] ?? {})
    };
  }

export function getChallengeStageConfig(stageId, chapterId = DEFAULT_CHALLENGE_CHAPTER_ID) {
    const baseStage = getChallengeStage(stageId);
    const stageOverride = getChallengeChapter(chapterId).stagePlan?.[baseStage.id] ?? {};
    const resolvedTitle = stageOverride.title || baseStage.title;
    const resolvedKnowledgeTag = stageOverride.knowledgeTag || resolvedTitle;
    const resolvedQuestionKnowledgeTag = stageOverride.questionKnowledgeTag || resolvedKnowledgeTag;

    return {
      ...baseStage,
      ...stageOverride,
      knowledgeTag: resolvedKnowledgeTag,
      questionKnowledgeTag: resolvedQuestionKnowledgeTag,
      mission: {
        ...baseStage.mission,
        ...(stageOverride.mission ?? {})
      },
      reward: {
        ...baseStage.reward,
        ...(stageOverride.reward ?? {})
      }
    };
  }

export function getChallengeStageList(chapterId = DEFAULT_CHALLENGE_CHAPTER_ID) {
    return CHALLENGE_STAGES.map((stage) => getChallengeStageConfig(stage.id, chapterId));
  }

export function supportsChallengeSemester(grade) {
    return CHALLENGE_SEMESTER_GRADES.includes(String(grade || "").trim());
  }

function getNormalizedChallengeChapterTargets(chapterId) {
    const normalizedChapterId = String(chapterId || "").trim();

    if (LEGACY_CHALLENGE_CHAPTER_TARGETS[normalizedChapterId]) {
      return [...LEGACY_CHALLENGE_CHAPTER_TARGETS[normalizedChapterId]];
    }

    if (CHALLENGE_CHAPTERS.some((chapter) => chapter.id === normalizedChapterId)) {
      return [normalizedChapterId];
    }

    return [];
  }

export function getNormalizedChallengeActiveChapterId(chapterId) {
    const normalizedChapterId = String(chapterId || "").trim();
    const migratedChapterId = LEGACY_CHALLENGE_ACTIVE_CHAPTER_MAP[normalizedChapterId] || normalizedChapterId;

    return CHALLENGE_CHAPTERS.some((chapter) => chapter.id === migratedChapterId)
      ? migratedChapterId
      : DEFAULT_CHALLENGE_CHAPTER_ID;
  }

export function getChallengeChapterIdBySelection(grade, semester = "") {
    const normalizedGrade = String(grade || "").trim();
    const normalizedSemester = String(semester || "").trim();

    if (supportsChallengeSemester(normalizedGrade)) {
      return (
        CHALLENGE_CHAPTERS.find(
          (chapter) =>
            chapter.grade === normalizedGrade &&
            chapter.semester === (normalizedSemester === "下册" ? "下册" : "上册")
        )?.id || DEFAULT_CHALLENGE_CHAPTER_ID
      );
    }

    return (
      CHALLENGE_CHAPTERS.find((chapter) => chapter.grade === normalizedGrade && !chapter.semester)?.id ||
      DEFAULT_CHALLENGE_CHAPTER_ID
    );
  }

export function getChallengeChapterBySelection(grade, semester = "") {
    return getChallengeChapter(getChallengeChapterIdBySelection(grade, semester));
  }

export function getStageStarCount(accuracyPercent, passAccuracy) {
    if (accuracyPercent < passAccuracy) {
      return 0;
    }

    if (accuracyPercent >= 100) {
      return 3;
    }

    if (accuracyPercent >= 80) {
      return 2;
    }

    return 1;
  }

export function getStageStarText(starCount) {
    const normalizedStarCount = Math.max(0, Math.min(3, Number.parseInt(String(starCount ?? 0), 10) || 0));

    if (normalizedStarCount === 0) {
      return "未获星";
    }

    return `${"★".repeat(normalizedStarCount)}${"☆".repeat(3 - normalizedStarCount)}`;
  }

export function normalizeChallengeProgress(savedProgress = {}) {
    const rawUnlockedStageIds = Array.isArray(savedProgress.unlockedStageIds) ? savedProgress.unlockedStageIds : [];
    const unlockedStageIds = CHALLENGE_STAGES.map((stage) => stage.id).filter((stageId) => rawUnlockedStageIds.includes(stageId));

    if (!unlockedStageIds.includes(CHALLENGE_STAGES[0].id)) {
      unlockedStageIds.unshift(CHALLENGE_STAGES[0].id);
    }

    const rawBestResults =
      savedProgress.bestResults && typeof savedProgress.bestResults === "object" ? savedProgress.bestResults : {};
    const bestResults = {};

    for (const stage of CHALLENGE_STAGES) {
      const rawStageResult = rawBestResults[stage.id];

      if (!rawStageResult || typeof rawStageResult !== "object") {
        continue;
      }

      const starCount = Math.max(0, Math.min(3, Number.parseInt(String(rawStageResult.starCount ?? 0), 10) || 0));
      const bestAccuracy = Math.max(0, Math.min(100, Number.parseInt(String(rawStageResult.bestAccuracy ?? 0), 10) || 0));
      const attempts = Math.max(0, Number.parseInt(String(rawStageResult.attempts ?? 0), 10) || 0);
      const bestScore = Math.max(0, Number.parseInt(String(rawStageResult.bestScore ?? 0), 10) || 0);
      const rewardEarned = Boolean(rawStageResult.rewardEarned);

      if (starCount > 0 || bestAccuracy > 0 || attempts > 0 || bestScore > 0 || rewardEarned) {
        bestResults[stage.id] = {
          starCount,
          bestAccuracy,
          attempts,
          bestScore,
          rewardEarned
        };
      }
    }

    const rawAchievements = normalizeChallengeAchievementStates(savedProgress.achievements);
    const achievementEvaluation = evaluateChallengeAchievements(
      {
        unlockedStageIds,
        bestResults,
        achievements: rawAchievements
      },
      {},
      {
        totalStageCount: CHALLENGE_STAGES.length,
        unlockTimestamp: "2000-01-01T00:00:00.000Z"
      }
    );

    return {
      unlockedStageIds,
      bestResults,
      achievements: achievementEvaluation.achievementStates
    };
  }

export function mergeChallengeProgress(primaryProgress = {}, secondaryProgress = {}) {
    const leftProgress = normalizeChallengeProgress(primaryProgress);
    const rightProgress = normalizeChallengeProgress(secondaryProgress);
    const unlockedStageIds = CHALLENGE_STAGES.map((stage) => stage.id).filter(
      (stageId) => leftProgress.unlockedStageIds.includes(stageId) || rightProgress.unlockedStageIds.includes(stageId)
    );
    const achievements = mergeChallengeAchievementStates(leftProgress.achievements, rightProgress.achievements);
    const bestResults = {};

    for (const stage of CHALLENGE_STAGES) {
      const leftStageResult = leftProgress.bestResults[stage.id] ?? {};
      const rightStageResult = rightProgress.bestResults[stage.id] ?? {};
      const mergedStageResult = {
        starCount: Math.max(leftStageResult.starCount ?? 0, rightStageResult.starCount ?? 0),
        bestAccuracy: Math.max(leftStageResult.bestAccuracy ?? 0, rightStageResult.bestAccuracy ?? 0),
        attempts: Math.max(leftStageResult.attempts ?? 0, rightStageResult.attempts ?? 0),
        bestScore: Math.max(leftStageResult.bestScore ?? 0, rightStageResult.bestScore ?? 0),
        rewardEarned: Boolean(leftStageResult.rewardEarned) || Boolean(rightStageResult.rewardEarned)
      };

      if (
        mergedStageResult.starCount > 0 ||
        mergedStageResult.bestAccuracy > 0 ||
        mergedStageResult.attempts > 0 ||
        mergedStageResult.bestScore > 0 ||
        mergedStageResult.rewardEarned
      ) {
        bestResults[stage.id] = mergedStageResult;
      }
    }

    return normalizeChallengeProgress({
      unlockedStageIds,
      bestResults,
      achievements
    });
  }

export function isChallengeProgressEqual(leftProgress, rightProgress) {
    return JSON.stringify(normalizeChallengeProgress(leftProgress)) === JSON.stringify(normalizeChallengeProgress(rightProgress));
  }

function isLegacyChallengeProgressShape(progress) {
    return Boolean(progress) && Array.isArray(progress.unlockedStageIds) && typeof progress.bestResults === "object";
  }

function normalizeChallengeProgressEntries(rawChapters = {}) {
    const normalizedEntries = {};

    for (const [rawChapterId, rawProgress] of Object.entries(rawChapters)) {
      if (!rawProgress || typeof rawProgress !== "object") {
        continue;
      }

      const normalizedProgress = normalizeChallengeProgress(rawProgress);

      for (const chapterId of getNormalizedChallengeChapterTargets(rawChapterId)) {
        normalizedEntries[chapterId] = normalizedEntries[chapterId]
          ? mergeChallengeProgress(normalizedEntries[chapterId], normalizedProgress)
          : normalizedProgress;
      }
    }

    return normalizedEntries;
  }

export function normalizeChallengeProgressBook(progressBook = {}) {
    if (isLegacyChallengeProgressShape(progressBook)) {
      return {
        activeChapterId: DEFAULT_CHALLENGE_CHAPTER_ID,
        chapters: {
          [DEFAULT_CHALLENGE_CHAPTER_ID]: normalizeChallengeProgress(progressBook)
        }
      };
    }

    const rawChapters = progressBook?.chapters && typeof progressBook.chapters === "object" ? progressBook.chapters : {};
    const normalizedEntries = normalizeChallengeProgressEntries(rawChapters);
    const chapters = {};

    for (const chapter of CHALLENGE_CHAPTERS) {
      const normalizedProgress = normalizedEntries[chapter.id];

      if (!normalizedProgress || typeof normalizedProgress !== "object") {
        continue;
      }

      if (chapter.id === DEFAULT_CHALLENGE_CHAPTER_ID || Object.keys(normalizedProgress.bestResults).length > 0) {
        chapters[chapter.id] = normalizedProgress;
      }
    }

    const activeChapterId = getNormalizedChallengeActiveChapterId(progressBook?.activeChapterId);

    if (!chapters[activeChapterId]) {
      chapters[activeChapterId] = normalizeChallengeProgress();
    }

    return {
      activeChapterId,
      chapters
    };
  }

export function getChallengeChapterProgress(progressBook, chapterId) {
    const normalizedBook = normalizeChallengeProgressBook(progressBook);
    return normalizeChallengeProgress(normalizedBook.chapters[chapterId] ?? {});
  }

export function mergeChallengeProgressBooks(primaryBook = {}, secondaryBook = {}) {
    const leftBook = normalizeChallengeProgressBook(primaryBook);
    const rightBook = normalizeChallengeProgressBook(secondaryBook);
    const chapters = {};

    for (const chapter of CHALLENGE_CHAPTERS) {
      const mergedProgress = mergeChallengeProgress(
        getChallengeChapterProgress(leftBook, chapter.id),
        getChallengeChapterProgress(rightBook, chapter.id)
      );

      if (chapter.id === DEFAULT_CHALLENGE_CHAPTER_ID || Object.keys(mergedProgress.bestResults).length > 0) {
        chapters[chapter.id] = mergedProgress;
      }
    }

    return normalizeChallengeProgressBook({
      activeChapterId: leftBook.activeChapterId || rightBook.activeChapterId || DEFAULT_CHALLENGE_CHAPTER_ID,
      chapters
    });
  }

export function isChallengeProgressBookEqual(leftBook, rightBook) {
    return JSON.stringify(normalizeChallengeProgressBook(leftBook)) === JSON.stringify(normalizeChallengeProgressBook(rightBook));
  }

export function buildChallengeOutcome({
    stage,
    result,
    starCount,
    isPassed,
    nextStage,
    unlockedNextStage,
    missionResult,
    rewardUnlocked,
    rewardAlreadyOwned,
    newAchievements = [],
    routeTitle = ""
  }) {
    const missionLabel = stage.mission?.label || "完成本关";
    const missionProgressText = missionResult?.progressText || missionLabel;
    const rewardName = stage.reward?.name || "";
    const rewardGlyph = stage.reward?.glyph || "";

    if (!isPassed) {
      return {
        stageId: stage.id,
        stageTitle: stage.title,
        isPassed: false,
        starCount: 0,
        missionLabel,
        missionProgressText,
        missionCompleted: Boolean(missionResult?.completed),
        rewardName,
        rewardGlyph,
        rewardUnlocked: false,
        rewardAlreadyOwned: Boolean(rewardAlreadyOwned),
        newAchievements,
        nextStageId: nextStage?.id || "",
        nextStageTitle: nextStage?.title || "",
        unlockedNextStage: false,
        title: "再试一次",
        summary: Boolean(missionResult?.completed)
          ? `本关需要正确率达到 ${stage.passAccuracy}% 才能过关，你这次拿到了 ${result.accuracyPercent}% 。收藏目标已经达成，再过关就能把 ${rewardName} 带走。`
          : `本关需要正确率达到 ${stage.passAccuracy}% 才能过关，你这次拿到了 ${result.accuracyPercent}% 。本关收藏目标是“${missionLabel}”，完成后可带走 ${rewardName}。`
      };
    }

    if (!nextStage) {
      const normalizedRouteTitle = String(routeTitle || "").trim();
      const routeCompletionLabel = normalizedRouteTitle || "当前章节";

      return {
        stageId: stage.id,
        stageTitle: stage.title,
        isPassed: true,
        starCount,
        missionLabel,
        missionProgressText,
        missionCompleted: Boolean(missionResult?.completed),
        rewardName,
        rewardGlyph,
        rewardUnlocked: Boolean(rewardUnlocked),
        rewardAlreadyOwned: Boolean(rewardAlreadyOwned),
        newAchievements,
        nextStageId: "",
        nextStageTitle: "",
        unlockedNextStage: false,
        title: starCount >= 3 ? `${routeCompletionLabel}通关` : "终点达成",
        summary:
          rewardUnlocked
            ? `你完成了 ${stage.title}，还把 ${rewardName} 收进了航海册，${routeCompletionLabel}已经全部打通。`
            : starCount >= 3
              ? `你以满星成绩完成了 ${stage.title}，${routeCompletionLabel}已经全部打通。`
              : `你完成了 ${stage.title}，${routeCompletionLabel}已经全部通过。`
      };
    }

    return {
      stageId: stage.id,
      stageTitle: stage.title,
      isPassed: true,
      starCount,
      missionLabel,
      missionProgressText,
      missionCompleted: Boolean(missionResult?.completed),
      rewardName,
      rewardGlyph,
      rewardUnlocked: Boolean(rewardUnlocked),
      rewardAlreadyOwned: Boolean(rewardAlreadyOwned),
      newAchievements,
      nextStageId: nextStage.id,
      nextStageTitle: nextStage.title,
      unlockedNextStage,
      title: starCount >= 3 ? "满星过关" : "闯关成功",
      summary: rewardUnlocked
        ? unlockedNextStage
          ? `你拿到 ${starCount} 星，已解锁下一关 ${nextStage.title}，还顺手收下了 ${rewardName}。`
          : `你拿到 ${starCount} 星，${rewardName} 已收下，下一关 ${nextStage.title} 也已经可以继续挑战。`
        : unlockedNextStage
          ? `你拿到 ${starCount} 星，已解锁下一关 ${nextStage.title}。想把 ${rewardName} 带走，还要完成“${missionLabel}”。`
          : `你拿到 ${starCount} 星，可以继续挑战下一关 ${nextStage.title}。想把 ${rewardName} 带走，还要完成“${missionLabel}”。`
    };
  }
