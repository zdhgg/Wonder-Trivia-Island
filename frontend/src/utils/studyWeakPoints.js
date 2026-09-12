// 专项强化目录：把“老师反馈的薄弱点”翻译成题库能检索的知识标签。
//
// 每个条目的 knowledgeTag 都必须能通过后端 knowledgeTagAliases 命中真实题目，
// 否则专项练习会开出空场。改动这里的标签时，同步跑
// backend/test/core.test.js 里的专项覆盖用例（它会按真实数据校验每个条目都有题）。

// 题量低于这个数的条目会提示“题目偏少”，避免家长点进去只练两三题。
export const WEAK_POINT_THIN_POOL_THRESHOLD = 4;

const GRADE_TWO_MATH_WEAK_POINTS = Object.freeze([
  Object.freeze({
    id: "g2-math-multiply",
    label: "乘法（几个几 / 乘数位置）",
    knowledgeTag: "乘法",
    // 家长最常听到的表述，用于关键词搜索
    keywords: Object.freeze(["乘法", "乘数", "几个几", "口诀", "乘数位置关系", "倍"]),
    hint: "几个几合起来、乘数前后位置、乘法口诀"
  }),
  Object.freeze({
    id: "g2-math-divide",
    label: "除法与平均分",
    knowledgeTag: "除法",
    keywords: Object.freeze(["除法", "平均分", "平均", "余数", "有余数除法", "分几份"]),
    hint: "平均分成几份、每份多少、余数"
  }),
  Object.freeze({
    id: "g2-math-two-step",
    label: "两步计算和应用题",
    knowledgeTag: "两步计算",
    keywords: Object.freeze(["两步", "应用题", "综合计算", "连加", "连减", "多步"]),
    hint: "先算什么再算什么，把生活题拆成两步"
  }),
  Object.freeze({
    id: "g2-math-time",
    label: "时间的认识和推算",
    knowledgeTag: "时间认识",
    keywords: Object.freeze(["时间", "钟表", "几点", "时针", "分针", "时刻"]),
    hint: "看钟面、认时刻、推算经过的时间"
  }),
  Object.freeze({
    id: "g2-math-measure",
    label: "长度和质量单位",
    knowledgeTag: "长度和质量单位",
    keywords: Object.freeze(["长度", "质量", "单位", "厘米", "米", "千克", "克", "换算"]),
    hint: "厘米和米、克和千克，以及单位换算"
  }),
  Object.freeze({
    id: "g2-math-chart",
    label: "看图表分析数据",
    knowledgeTag: "图表分析",
    keywords: Object.freeze(["图表", "统计", "表格", "数据", "看图"]),
    hint: "从表格和统计图里读出数量关系"
  }),
  Object.freeze({
    id: "g2-math-compare",
    label: "大小比较",
    knowledgeTag: "大小比较",
    keywords: Object.freeze(["比较", "大小", "多多少", "少多少", "差量"]),
    hint: "谁多谁少、多多少少多少"
  })
]);

const GRADE_TWO_CHINESE_WEAK_POINTS = Object.freeze([
  Object.freeze({
    id: "g2-chinese-words",
    label: "词语理解与积累",
    knowledgeTag: "词语",
    keywords: Object.freeze(["词语", "近义词", "反义词", "量词", "搭配", "分类", "成语"]),
    hint: "近义词反义词、词语搭配、词语分类"
  }),
  Object.freeze({
    id: "g2-chinese-sentence",
    label: "句子理解与排序",
    knowledgeTag: "句子",
    keywords: Object.freeze(["句子", "排序", "连词成句", "句意", "句子信息"]),
    hint: "把句子排顺、看懂句子在说什么"
  }),
  Object.freeze({
    id: "g2-chinese-punctuation",
    label: "标点符号",
    knowledgeTag: "标点符号",
    keywords: Object.freeze(["标点", "句号", "问号", "叹号", "逗号", "引号"]),
    hint: "句号问号怎么用，标点放在哪里"
  }),
  Object.freeze({
    id: "g2-chinese-order",
    label: "顺序和条理",
    knowledgeTag: "顺序理解",
    keywords: Object.freeze(["顺序", "先后", "条理", "活动顺序", "排列"]),
    hint: "先做什么后做什么，把事情理清"
  }),
  Object.freeze({
    id: "g2-chinese-notice",
    label: "通知和留言理解",
    knowledgeTag: "通知理解",
    keywords: Object.freeze(["通知", "留言", "告示", "信息"]),
    hint: "从通知和留言里找出关键信息"
  }),
  Object.freeze({
    id: "g2-chinese-chart-reading",
    label: "图表阅读",
    knowledgeTag: "图表阅读",
    keywords: Object.freeze(["图表", "表格", "阅读", "看图"]),
    hint: "读表格和图示里的文字信息"
  }),
  Object.freeze({
    id: "g2-chinese-reading",
    label: "课文和短文理解",
    knowledgeTag: "课文理解",
    keywords: Object.freeze(["课文", "短文", "阅读", "理解", "概括"]),
    hint: "读懂短文讲了什么、找到重点"
  }),
  Object.freeze({
    id: "g2-chinese-conjunction",
    label: "关联词",
    knowledgeTag: "关联词",
    keywords: Object.freeze(["关联词", "因为所以", "虽然但是", "连接"]),
    hint: "把前后两个意思连起来"
  })
]);

export const STUDY_WEAK_POINT_LIBRARY = Object.freeze({
  二年级: Object.freeze({
    数学: GRADE_TWO_MATH_WEAK_POINTS,
    语文: GRADE_TWO_CHINESE_WEAK_POINTS
  })
});

export const WEAK_POINT_GRADE_OPTIONS = Object.freeze(Object.keys(STUDY_WEAK_POINT_LIBRARY));

function normalizeText(value) {
  return String(value ?? "").trim();
}

export function getWeakPointSubjects(grade) {
  return Object.keys(STUDY_WEAK_POINT_LIBRARY[normalizeText(grade)] || {});
}

export function getWeakPoints(grade, subject) {
  const gradeEntry = STUDY_WEAK_POINT_LIBRARY[normalizeText(grade)];
  return gradeEntry?.[normalizeText(subject)] || [];
}

// 家长输入的搜索词可能和条目名称不同（比如直接打“乘数位置关系”），
// 所以名称、提示、关键词和标签都参与匹配。
export function matchWeakPoints(weakPoints, keyword) {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();

  if (!normalizedKeyword) {
    return weakPoints;
  }

  return weakPoints.filter((weakPoint) => {
    const haystack = [
      weakPoint.label,
      weakPoint.hint,
      weakPoint.knowledgeTag,
      ...(weakPoint.keywords || [])
    ]
      .map((part) => normalizeText(part).toLowerCase())
      .join(" ");

    return haystack.includes(normalizedKeyword);
  });
}

export function findWeakPointById(weakPointId) {
  const normalizedId = normalizeText(weakPointId);

  if (!normalizedId) {
    return null;
  }

  for (const grade of Object.keys(STUDY_WEAK_POINT_LIBRARY)) {
    for (const subject of getWeakPointSubjects(grade)) {
      const weakPoint = getWeakPoints(grade, subject).find((item) => item.id === normalizedId);

      if (weakPoint) {
        return { ...weakPoint, grade, subject };
      }
    }
  }

  return null;
}
