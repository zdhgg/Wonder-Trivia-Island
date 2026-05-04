const {
  gradeOneChineseSemesterQuestionConfigs,
  gradeOneMathSemesterQuestionConfigs
} = require("./gradeOneSemesterSeedData");

const OPTION_KEYS = ["A", "B", "C", "D"];

function buildQuestion(
  { subject, grade, semester = "通用", knowledgeTag = "", type, content, imageUrl = "", correctText, distractors, explanation, difficulty },
  orderIndex
) {
  if (!Array.isArray(distractors) || distractors.length !== 3) {
    throw new Error(`Question "${content}" must provide exactly 3 distractors.`);
  }

  const correctIndex = orderIndex % OPTION_KEYS.length;
  const optionTexts = [...distractors];
  optionTexts.splice(correctIndex, 0, correctText);

  if (new Set(optionTexts).size !== OPTION_KEYS.length) {
    throw new Error(`Question "${content}" has duplicated option texts.`);
  }

  return {
    subject,
    grade,
    semester,
    knowledgeTag: String(knowledgeTag || "").trim(),
    type,
    content,
    imageUrl: String(imageUrl || "").trim(),
    options: optionTexts.map((text, index) => ({
      key: OPTION_KEYS[index],
      text
    })),
    answer: OPTION_KEYS[correctIndex],
    explanation,
    difficulty
  };
}

function buildSubjectQuestions(subject, configs) {
  return configs.map((config, index) => buildQuestion({ subject, ...config }, index));
}

function buildQuestions(configs) {
  return configs.map((config, index) => buildQuestion(config, index));
}

function createNumericDistractors(answer) {
  const numericAnswer = Number(answer);
  if (!Number.isFinite(numericAnswer)) {
    return ["0", "1", "2"];
  }

  const candidates = [
    numericAnswer - 1,
    numericAnswer + 1,
    numericAnswer + 2,
    numericAnswer - 2,
    numericAnswer + 3,
    numericAnswer - 3,
    numericAnswer + 10,
    numericAnswer - 10
  ];

  const distractors = [];
  for (const candidate of candidates) {
    if (candidate >= 0 && candidate !== numericAnswer && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
    if (distractors.length === 3) {
      break;
    }
  }

  let offset = 4;
  while (distractors.length < 3) {
    const candidate = numericAnswer + offset;
    if (!distractors.includes(candidate)) {
      distractors.push(candidate);
    }
    offset += 1;
  }

  return distractors.map(String);
}

function createComputeTuples(type, operator, pairs, difficulty = 1) {
  return pairs.map(([left, right]) => {
    const answer = operator === "+" ? left + right : left - right;
    return [
      type,
      `${left} ${operator} ${right} = ?`,
      String(answer),
      createNumericDistractors(answer),
      `${left}${operator === "+" ? "加" : "减"}${right}等于${answer}。`,
      difficulty
    ];
  });
}

function withImageUrls(rawConfigs, imageUrls) {
  if (rawConfigs.length !== imageUrls.length) {
    throw new Error(`Expected ${rawConfigs.length} image URLs, received ${imageUrls.length}.`);
  }

  return rawConfigs.map((rawConfig, index) => {
    const nextConfig = [...rawConfig];
    nextConfig[6] = imageUrls[index];
    return nextConfig;
  });
}

function createSequentialImageUrls(folder, count, prefix = "item") {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid sequential image count for ${folder}: ${count}`);
  }

  return Array.from({ length: count }, (_, index) => {
    const suffix = String(index + 1).padStart(2, "0");
    return `/images/challenge/${folder}/${prefix}-${suffix}.svg`;
  });
}

function createChallengeConfigs(grade, subject, knowledgeTag, rawConfigs, semester = "通用") {
  return rawConfigs.map((rawConfig) => {
    const [type, content, correctText, distractors, explanation, difficulty = 3, imageUrl = ""] = rawConfig;

    return {
    subject,
    grade,
    semester,
    knowledgeTag,
    type,
    content,
    imageUrl,
    correctText,
    distractors,
    explanation,
    difficulty
    };
  });
}

function createGradeOneChallengeConfigs(subject, knowledgeTag, rawConfigs, semester = "上册") {
  return createChallengeConfigs("一年级", subject, knowledgeTag, rawConfigs, semester);
}

function withChallengeSemester(configs, semester) {
  return configs.map((config) => ({
    ...config,
    semester
  }));
}

function createConfigList(rawConfigs) {
  return rawConfigs.map(([grade, type, content, correctText, distractors, explanation, difficulty, imageUrl = ""]) => ({
    grade,
    type,
    content,
    correctText,
    distractors,
    explanation,
    difficulty,
    imageUrl
  }));
}

function createKnowledgeRouteConfigs(subject, grade, semester, rawConfigs) {
  return rawConfigs.map(
    ([knowledgeTag, type, content, correctText, distractors, explanation, difficulty = 2]) => ({
      subject,
      grade,
      semester,
      knowledgeTag,
      type,
      content,
      correctText,
      distractors,
      explanation,
      difficulty
    })
  );
}

function createEnglishKnowledgeRouteConfigs(grade, semester, rawConfigs) {
  return createKnowledgeRouteConfigs("英语", grade, semester, rawConfigs);
}

const chineseQuestionConfigs = [
  {
    grade: "一年级",
    type: "偏旁识字",
    content: "下面哪个字和“日”有关？",
    correctText: "晴",
    distractors: ["河", "林", "跑"],
    explanation: "“晴”字带日字旁，常和太阳、天气有关。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "趣味识字",
    content: "表示很多树木的是哪个字？",
    correctText: "森",
    distractors: ["林", "从", "众"],
    explanation: "一棵树是“木”，两棵树是“林”，很多树常用“森”来表示。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "偏旁识字",
    content: "“口”字旁的字通常和什么更有关？",
    correctText: "嘴巴或说话",
    distractors: ["树木", "河流", "天气"],
    explanation: "像“唱、叫、吃”这些字都有“口”字旁，常和嘴巴、说话或吃东西有关。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "词语分类",
    content: "下面哪个词语表示动作？",
    correctText: "跳绳",
    distractors: ["蓝天", "苹果", "老师"],
    explanation: "“跳绳”表示在做什么，属于动作词。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "近义词",
    content: "“高兴”的近义词是哪一个？",
    correctText: "开心",
    distractors: ["难过", "着急", "安静"],
    explanation: "“高兴”和“开心”意思相近。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "反义词",
    content: "“安静”的反义词是哪一个？",
    correctText: "热闹",
    distractors: ["整齐", "认真", "明亮"],
    explanation: "“安静”相反的是“热闹”。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "标点符号",
    content: "句子讲完一件事后，常用哪个标点？",
    correctText: "句号",
    distractors: ["问号", "书名号", "破折号"],
    explanation: "一句陈述的话说完，通常用句号。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "标点符号",
    content: "表示提问题时，句末常用哪个标点？",
    correctText: "问号",
    distractors: ["逗号", "顿号", "引号"],
    explanation: "有疑问、提问题的句子一般用问号。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "古诗积累",
    content: "“春眠不觉晓”的下一句是什么？",
    correctText: "处处闻啼鸟",
    distractors: ["夜来风雨声", "花落知多少", "低头思故乡"],
    explanation: "这两句都出自《春晓》，“春眠不觉晓，处处闻啼鸟”。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "古诗积累",
    content: "“举头望明月”的下一句是什么？",
    correctText: "低头思故乡",
    distractors: ["疑是地上霜", "处处闻啼鸟", "飞流直下三千尺"],
    explanation: "这是《静夜思》中的名句，“举头望明月，低头思故乡”。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "词语运用",
    content: "下面哪个词语最适合形容雨下得很大？",
    correctText: "倾盆大雨",
    distractors: ["哈哈大笑", "一动不动", "慢条斯理"],
    explanation: "“倾盆大雨”专门形容雨下得很大。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "成语理解",
    content: "“一心一意”最适合形容哪种状态？",
    correctText: "做事专心",
    distractors: ["走路很慢", "声音很大", "天气很冷"],
    explanation: "“一心一意”表示专心、认真。",
    difficulty: 2
  },
  {
    grade: "三年级",
    type: "词义理解",
    content: "“已经”表示事情怎样？",
    correctText: "发生过了",
    distractors: ["还没开始", "完全不知道", "永远不会发生"],
    explanation: "“已经”说明事情完成了或发生过了。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "关联词",
    content: "“因为下雨，所以带伞。” 这句话里“所以”后面接的是什么？",
    correctText: "结果",
    distractors: ["原因", "人物", "地点"],
    explanation: "“因为”后面常说原因，“所以”后面常说结果。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "词语搭配",
    content: "下面哪个词语搭配更恰当？",
    correctText: "清澈的河水",
    distractors: ["清澈的雷声", "清澈的操场", "清澈的书包"],
    explanation: "“清澈”一般用来形容水很清。",
    difficulty: 1
  },
  {
    grade: "四年级",
    type: "成语理解",
    content: "“专心致志”中的“致”最接近哪层意思？",
    correctText: "集中",
    distractors: ["打开", "送给", "变化"],
    explanation: "“专心致志”表示把心思集中在一件事上。",
    difficulty: 3
  },
  {
    grade: "四年级",
    type: "阅读方法",
    content: "读书时遇到不懂的地方，最合适的做法是？",
    correctText: "查资料或请教",
    distractors: ["永远跳过", "随便猜意思", "把书合上"],
    explanation: "查资料、请教别人能帮助我们真正弄懂问题。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "修辞判断",
    content: "下列哪句是比喻句？",
    correctText: "弯弯的月亮像小船",
    distractors: ["我今天去学校", "小狗在门口睡觉", "我们一起做游戏"],
    explanation: "把月亮比作小船，就是比喻句。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "句意理解",
    content: "“他跑得像风一样快”主要想说明什么？",
    correctText: "他跑得很快",
    distractors: ["今天风很大", "他喜欢吹风", "他在找风"],
    explanation: "这里用“像风一样快”来突出速度快。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "句子理解",
    content: "“先天下之忧而忧，后天下之乐而乐”表达了什么情怀？",
    correctText: "关心大家",
    distractors: ["只顾自己", "害怕学习", "喜欢睡觉"],
    explanation: "这句话强调先为大家着想，有责任感。",
    difficulty: 3
  },
  {
    grade: "五年级",
    type: "应用文",
    content: "写通知时最不应该缺少哪一项？",
    correctText: "时间地点",
    distractors: ["随意涂鸦", "很长的笑话", "花边图案"],
    explanation: "通知最重要的是把时间、地点和事情说清楚。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "成语理解",
    content: "下面哪个词语最适合形容做事有条理？",
    correctText: "井井有条",
    distractors: ["手忙脚乱", "东倒西歪", "糊里糊涂"],
    explanation: "“井井有条”表示做事很有条理。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "关联词",
    content: "“如果明天放晴，我们就去春游。” 这句话前半句表示什么？",
    correctText: "条件",
    distractors: ["结果", "感叹", "命令"],
    explanation: "“如果……”常用来提出条件。",
    difficulty: 3
  },
  {
    grade: "五年级",
    type: "写作方法",
    content: "写景时想让画面更生动，哪种方法更合适？",
    correctText: "加入颜色和声音等描写",
    distractors: ["每句都只写“很好看”", "全文只写数字", "完全不写感受"],
    explanation: "具体的颜色、声音、气味等描写能让画面更鲜活。",
    difficulty: 2
  },
  {
    grade: "六年级",
    type: "名句理解",
    content: "“学而不思则罔，思而不学则殆”告诉我们什么？",
    correctText: "学习和思考要结合",
    distractors: ["只要思考不用学习", "只背书就够了", "学习越少越好"],
    explanation: "光学不想、光想不学都不行，学习和思考要结合。",
    difficulty: 3
  },
  {
    grade: "六年级",
    type: "表达交流",
    content: "辩论时更重要的做法是什么？",
    correctText: "有依据地表达观点",
    distractors: ["一直打断别人", "声音越大越赢", "只重复一句话"],
    explanation: "辩论靠理由和证据，不靠抢话。",
    difficulty: 2
  },
  {
    grade: "六年级",
    type: "演讲写作",
    content: "写演讲稿时，开头最重要的作用是什么？",
    correctText: "吸引听众",
    distractors: ["把结尾全部说完", "列出所有答案", "不让人听懂"],
    explanation: "好的开头要先吸引听众继续听下去。",
    difficulty: 3
  },
  {
    grade: "六年级",
    type: "成语理解",
    content: "“坚持不懈”最适合形容哪种人？",
    correctText: "遇到困难也不放弃的人",
    distractors: ["三分钟热度的人", "什么都不想做的人", "常忘记作业的人"],
    explanation: "“坚持不懈”强调一直坚持、不轻易放弃。",
    difficulty: 2
  },
  {
    grade: "三年级",
    type: "词语感情色彩",
    content: "下面哪组词语的感情色彩更积极？",
    correctText: "勤劳、友善",
    distractors: ["懒惰、粗心", "吵闹、生气", "发呆、迷路"],
    explanation: "“勤劳、友善”都是褒义词，感情色彩更积极。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "修辞理解",
    content: "“书是人类进步的阶梯”这句话把书比作什么？",
    correctText: "阶梯",
    distractors: ["花朵", "河流", "星星"],
    explanation: "句子里明确把书比作“阶梯”。",
    difficulty: 2
  },
  {
    grade: "二年级",
    type: "关联词",
    content: "“我爱读书，因为它让我学到很多知识。” 这句话中“因为”后面说明的是？",
    correctText: "原因",
    distractors: ["结果", "时间", "地点"],
    explanation: "“因为”后面一般说明原因。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "词语分类",
    content: "下面哪个词语和“天空”最有关系？",
    correctText: "白云",
    distractors: ["铅笔", "桌子", "鞋子"],
    explanation: "白云在天空中，所以和“天空”最有关系。",
    difficulty: 1
  },
  {
    grade: "五年级",
    type: "阅读概括",
    content: "概括文章主要内容时，最关键的是抓住什么？",
    correctText: "主要人物和主要事件",
    distractors: ["每个标点符号", "字写得多大", "纸张颜色"],
    explanation: "概括主要内容要抓住人物、事件和核心意思。",
    difficulty: 3
  }
];

const mathQuestionConfigs = [
  {
    grade: "一年级",
    type: "口算加法",
    content: "3 + 2 = ?",
    correctText: "5",
    distractors: ["4", "6", "7"],
    explanation: "3 和 2 合起来就是 5。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "口算减法",
    content: "9 - 4 = ?",
    correctText: "5",
    distractors: ["4", "6", "7"],
    explanation: "从 9 里面拿走 4，还剩 5。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "口算加法",
    content: "7 + 6 = ?",
    correctText: "13",
    distractors: ["12", "11", "14"],
    explanation: "7 加 6 等于 13。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "口算减法",
    content: "15 - 8 = ?",
    correctText: "7",
    distractors: ["6", "8", "9"],
    explanation: "15 减去 8，还剩 7。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "连加计算",
    content: "4 + 5 + 3 = ?",
    correctText: "12",
    distractors: ["10", "11", "13"],
    explanation: "先算 4 + 5 = 9，再算 9 + 3 = 12。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "口算减法",
    content: "18 - 9 = ?",
    correctText: "9",
    distractors: ["8", "10", "11"],
    explanation: "18 减去 9，正好还剩 9。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "平均分",
    content: "6 个气球，每人分 2 个，可以分给几人？",
    correctText: "3人",
    distractors: ["2人", "4人", "6人"],
    explanation: "6 ÷ 2 = 3，所以可以分给 3 人。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "情景计算",
    content: "2 盒彩笔，每盒 8 支，一共有几支？",
    correctText: "16支",
    distractors: ["10支", "14支", "18支"],
    explanation: "2 盒每盒 8 支，就是 2 × 8 = 16 支。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "乘法口算",
    content: "3 × 4 = ?",
    correctText: "12",
    distractors: ["7", "10", "16"],
    explanation: "3 个 4 相加是 12。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "除法口算",
    content: "24 ÷ 6 = ?",
    correctText: "4",
    distractors: ["3", "5", "6"],
    explanation: "24 平均分成 6 份，每份是 4。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "乘法口算",
    content: "5 × 7 = ?",
    correctText: "35",
    distractors: ["30", "40", "42"],
    explanation: "5 个 7 是 35。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "除法口算",
    content: "32 ÷ 8 = ?",
    correctText: "4",
    distractors: ["3", "5", "8"],
    explanation: "32 里面有 4 个 8，所以结果是 4。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "情景计算",
    content: "操场上有 18 名同学，排成每行 6 人，可以排几行？",
    correctText: "3行",
    distractors: ["2行", "4行", "6行"],
    explanation: "18 ÷ 6 = 3，可以排 3 行。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "情景计算",
    content: "小卖部有 20 支铅笔，卖出 7 支，又进货 5 支，现在有几支？",
    correctText: "18支",
    distractors: ["17支", "16支", "19支"],
    explanation: "先算 20 - 7 = 13，再算 13 + 5 = 18。",
    difficulty: 1
  },
  {
    grade: "四年级",
    type: "两位数加法",
    content: "45 + 28 = ?",
    correctText: "73",
    distractors: ["63", "71", "83"],
    explanation: "45 加 28 等于 73。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "两位数减法",
    content: "90 - 37 = ?",
    correctText: "53",
    distractors: ["43", "57", "63"],
    explanation: "90 减 37，结果是 53。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "乘法口算",
    content: "8 × 9 = ?",
    correctText: "72",
    distractors: ["64", "70", "81"],
    explanation: "8 个 9 是 72。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "除法口算",
    content: "56 ÷ 7 = ?",
    correctText: "8",
    distractors: ["6", "7", "9"],
    explanation: "56 里面有 8 个 7，所以结果是 8。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "情景计算",
    content: "一本故事书 36 页，小明已经看了 19 页，还剩几页？",
    correctText: "17页",
    distractors: ["15页", "16页", "18页"],
    explanation: "36 - 19 = 17，还剩 17 页。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "平均分",
    content: "3 盒彩泥，每盒 12 块，平均分给 6 个小朋友，每人几块？",
    correctText: "6块",
    distractors: ["4块", "5块", "7块"],
    explanation: "一共有 3 × 12 = 36 块，再算 36 ÷ 6 = 6 块。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "三位数加法",
    content: "125 + 75 = ?",
    correctText: "200",
    distractors: ["190", "205", "225"],
    explanation: "125 加 75 正好是 200。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "三位数减法",
    content: "300 - 128 = ?",
    correctText: "172",
    distractors: ["162", "182", "178"],
    explanation: "300 减去 128，结果是 172。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "乘法口算",
    content: "25 × 4 = ?",
    correctText: "100",
    distractors: ["90", "95", "110"],
    explanation: "4 个 25 相加是 100。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "除法口算",
    content: "84 ÷ 12 = ?",
    correctText: "7",
    distractors: ["6", "8", "9"],
    explanation: "84 里面有 7 个 12，所以结果是 7。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "图形周长",
    content: "一个正方形每条边长 5 厘米，它的周长是多少？",
    correctText: "20厘米",
    distractors: ["10厘米", "15厘米", "25厘米"],
    explanation: "正方形有 4 条相等的边，所以周长是 4 × 5 = 20 厘米。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "长度计算",
    content: "一根绳子长 48 米，剪成每段 6 米的小段，可以剪几段？",
    correctText: "8段",
    distractors: ["6段", "7段", "9段"],
    explanation: "48 ÷ 6 = 8，所以可以剪成 8 段。",
    difficulty: 2
  },
  {
    grade: "六年级",
    type: "小数加法",
    content: "1.5 元 + 2.5 元 = ?",
    correctText: "4元",
    distractors: ["3元", "3.5元", "4.5元"],
    explanation: "1.5 加 2.5 等于 4。",
    difficulty: 2
  },
  {
    grade: "六年级",
    type: "小数减法",
    content: "6.4 - 2.1 = ?",
    correctText: "4.3",
    distractors: ["4.1", "4.5", "5.3"],
    explanation: "按小数位对齐计算，6.4 - 2.1 = 4.3。",
    difficulty: 2
  },
  {
    grade: "六年级",
    type: "速度问题",
    content: "一辆车 2 小时行 120 千米，平均每小时行多少千米？",
    correctText: "60千米",
    distractors: ["50千米", "70千米", "80千米"],
    explanation: "120 ÷ 2 = 60，平均每小时行 60 千米。",
    difficulty: 3
  },
  {
    grade: "六年级",
    type: "折扣问题",
    content: "一本书原价 80 元，打九折后是多少元？",
    correctText: "72元",
    distractors: ["70元", "74元", "78元"],
    explanation: "九折就是原价的 90%，80 × 0.9 = 72。",
    difficulty: 3
  },
  {
    grade: "六年级",
    type: "长方形面积",
    content: "一个长方形长 8 厘米，宽 5 厘米，面积是多少平方厘米？",
    correctText: "40平方厘米",
    distractors: ["13平方厘米", "26平方厘米", "80平方厘米"],
    explanation: "长方形面积 = 长 × 宽，所以 8 × 5 = 40 平方厘米。",
    difficulty: 3
  },
  {
    grade: "三年级",
    type: "数字规律",
    content: "从 2, 4, 6, 8 往后接着写，下一个数是多少？",
    correctText: "10",
    distractors: ["9", "11", "12"],
    explanation: "这些数每次都加 2，所以下一个是 10。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "时间计算",
    content: "时钟从 3 点走到 6 点，经过了几小时？",
    correctText: "3小时",
    distractors: ["2小时", "4小时", "6小时"],
    explanation: "3 点到 6 点一共经过 3 个整点，所以是 3 小时。",
    difficulty: 1,
    imageUrl: "/images/challenge/g2-general/clock-3-to-6.svg"
  },
  {
    grade: "四年级",
    type: "单价计算",
    content: "12 元钱买 3 支同样的笔，每支笔多少钱？",
    correctText: "4元",
    distractors: ["3元", "5元", "6元"],
    explanation: "12 ÷ 3 = 4，每支笔 4 元。",
    difficulty: 2
  }
];

const englishQuestionConfigs = [
  {
    grade: "一年级",
    type: "单词认读",
    content: "“苹果”的英文是哪一个？",
    correctText: "apple",
    distractors: ["banana", "cat", "dog"],
    explanation: "apple 表示苹果。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "颜色单词",
    content: "“红色”的英文是哪一个？",
    correctText: "red",
    distractors: ["blue", "black", "white"],
    explanation: "red 表示红色。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "情景对话",
    content: "早上见到老师，应该说哪一句？",
    correctText: "Good morning.",
    distractors: ["Good night.", "Thank you.", "Sit down."],
    explanation: "早上打招呼常说 Good morning.",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "单词认读",
    content: "看到一只猫，应该说哪个单词？",
    correctText: "cat",
    distractors: ["bag", "pen", "desk"],
    explanation: "cat 表示猫。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "礼貌用语",
    content: "“谢谢”常说哪一句？",
    correctText: "Thank you.",
    distractors: ["Stand up.", "Open the door.", "See you."],
    explanation: "Thank you. 表示“谢谢”。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "礼貌用语",
    content: "“再见”最常用哪一句？",
    correctText: "Goodbye.",
    distractors: ["Hello.", "Please.", "Sorry."],
    explanation: "Goodbye. 表示“再见”。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "单词认读",
    content: "“书”的英文是哪一个？",
    correctText: "book",
    distractors: ["ruler", "milk", "shoe"],
    explanation: "book 表示书。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "单词认读",
    content: "Which word means “狗”？",
    correctText: "dog",
    distractors: ["fish", "tree", "sun"],
    explanation: "dog 的中文意思是“狗”。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "课堂指令",
    content: "老师说“Sit down.” 是什么意思？",
    correctText: "坐下",
    distractors: ["起立", "关门", "排队"],
    explanation: "Sit down. 的意思是“坐下”。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "数字单词",
    content: "“三支铅笔”里表示“三”的单词是哪一个？",
    correctText: "three",
    distractors: ["tree", "thirty", "free"],
    explanation: "three 表示数字 3。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "词义判断",
    content: "Which word is a color?",
    correctText: "yellow",
    distractors: ["jump", "school", "sister"],
    explanation: "yellow 是颜色单词，表示黄色。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "句意理解",
    content: "“I am happy.” 中 happy 最接近什么意思？",
    correctText: "开心的",
    distractors: ["口渴的", "困倦的", "安静的"],
    explanation: "happy 表示开心的、高兴的。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "代词认读",
    content: "表示“我们”的英文是哪一个？",
    correctText: "we",
    distractors: ["me", "she", "it"],
    explanation: "we 表示“我们”。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "句子理解",
    content: "“This is my bag.” 中 my 表示什么？",
    correctText: "我的",
    distractors: ["你的", "他的", "她的"],
    explanation: "my 是物主代词，表示“我的”。",
    difficulty: 1
  },
  {
    grade: "三年级",
    type: "情景对话",
    content: "问别人名字时，更合适的是哪一句？",
    correctText: "What's your name?",
    distractors: ["How old is the bag?", "Where is blue?", "Are you a desk?"],
    explanation: "What's your name? 的意思是“你叫什么名字？”。",
    difficulty: 1
  },
  {
    grade: "四年级",
    type: "句子选择",
    content: "Which sentence means “我喜欢英语”？",
    correctText: "I like English.",
    distractors: ["I have three cats.", "She is my teacher.", "Open your book."],
    explanation: "I like English. 正好表示“我喜欢英语”。",
    difficulty: 1
  },
  {
    grade: "四年级",
    type: "代词认读",
    content: "“他”的英文代词是哪一个？",
    correctText: "he",
    distractors: ["she", "we", "they"],
    explanation: "he 表示“他”。",
    difficulty: 1
  },
  {
    grade: "四年级",
    type: "指示代词",
    content: "“这些苹果”中的 these 表示什么？",
    correctText: "这些",
    distractors: ["那些", "一个", "这里"],
    explanation: "these 表示“这些”。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "单词认读",
    content: "Which word means “星期五”？",
    correctText: "Friday",
    distractors: ["February", "winter", "homework"],
    explanation: "Friday 表示星期五。",
    difficulty: 2
  },
  {
    grade: "四年级",
    type: "句意理解",
    content: "“Let’s play.” 中 Let’s 最接近什么意思？",
    correctText: "让我们",
    distractors: ["他已经", "我不能", "你不会"],
    explanation: "Let’s = Let us，表示“让我们……”。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "反义词",
    content: "Which word is the opposite of 'big'?",
    correctText: "small",
    distractors: ["tall", "long", "clean"],
    explanation: "big 的反义词是 small。",
    difficulty: 2
  },
  {
    grade: "五年级",
    type: "现在进行时",
    content: "“我正在读书。” 更合适的英文是哪一句？",
    correctText: "I am reading.",
    distractors: ["I read yesterday.", "Read I am.", "I reading am."],
    explanation: "现在正在进行的动作常用“be + 动词-ing”，所以是 I am reading.",
    difficulty: 3
  },
  {
    grade: "五年级",
    type: "情态动词",
    content: "“她会游泳”用英文可以说？",
    correctText: "She can swim.",
    distractors: ["She can swims.", "She swim can.", "Can she swimming."],
    explanation: "can 后面接动词原形，所以用 She can swim.",
    difficulty: 3
  },
  {
    grade: "五年级",
    type: "句型判断",
    content: "Which one is a question?",
    correctText: "Where are you?",
    distractors: ["I am at home.", "He likes music.", "We have class."],
    explanation: "Where are you? 是疑问句，末尾用问号。",
    difficulty: 3
  },
  {
    grade: "五年级",
    type: "时间短语",
    content: "“每天”最接近哪个短语？",
    correctText: "every day",
    distractors: ["last night", "next week", "at the zoo"],
    explanation: "every day 表示“每天”。",
    difficulty: 2
  },
  {
    grade: "六年级",
    type: "时态判断",
    content: "Which sentence is in the past tense?",
    correctText: "We visited the museum yesterday.",
    distractors: ["We visit the museum now.", "We are visit the museum.", "We can visits the museum."],
    explanation: "visited 是动词过去式，这句话表示过去发生的事。",
    difficulty: 3
  },
  {
    grade: "六年级",
    type: "条件句",
    content: "“如果明天下雨，我们就在家看书。” 哪句更合适？",
    correctText: "If it rains tomorrow, we will read at home.",
    distractors: [
      "If it rain tomorrow, we read at home.",
      "If rains tomorrow, we will at home.",
      "Tomorrow rain if, we read home."
    ],
    explanation: "条件句要有完整主语和合适的动词形式，所以第一句最正确。",
    difficulty: 3
  },
  {
    grade: "六年级",
    type: "词义判断",
    content: "Which word means “重要的”？",
    correctText: "important",
    distractors: ["interesting", "difficult", "hungry"],
    explanation: "important 表示“重要的”。",
    difficulty: 2
  },
  {
    grade: "六年级",
    type: "词性理解",
    content: "“Please speak slowly.” 中 slowly 修饰的是？",
    correctText: "speak",
    distractors: ["please", "you", "class"],
    explanation: "slowly 是副词，用来修饰动词 speak，表示“慢慢地说”。",
    difficulty: 3
  },
  {
    grade: "六年级",
    type: "书信表达",
    content: "写邮件开头向老师问好，更合适的是哪一句？",
    correctText: "Dear Ms. Li,",
    distractors: ["How old are you?", "I am a pencil.", "Nice chair!"],
    explanation: "正式写给老师的邮件，开头常用 Dear + 称呼。",
    difficulty: 2
  },
  {
    grade: "三年级",
    type: "常识词汇",
    content: "Which animal can fly in the sky?",
    correctText: "bird",
    distractors: ["fish", "tiger", "rabbit"],
    explanation: "bird 表示鸟，鸟会在天空中飞。",
    difficulty: 1
  },
  {
    grade: "二年级",
    type: "单词认读",
    content: "“牛奶”的英文是哪一个？",
    correctText: "milk",
    distractors: ["bread", "water", "egg"],
    explanation: "milk 表示牛奶。",
    difficulty: 1
  },
  {
    grade: "一年级",
    type: "单词联想",
    content: "看到太阳，最可能想到哪个英文单词？",
    correctText: "sun",
    distractors: ["bus", "cup", "leg"],
    explanation: "sun 表示太阳。",
    difficulty: 1
  }
];

const chineseExtraQuestionConfigs = createConfigList([
  ["一年级", "词语分类", "下面哪个词语和“花朵”最像一类？", "小草", ["跑步", "认真", "明亮"], "小草和花朵都属于植物。", 1],
  ["一年级", "词语识别", "下面哪个词表示动作？", "拍手", ["白云", "小河", "高山"], "“拍手”表示在做什么，是动作词。", 1],
  ["一年级", "偏旁识字", "带“氵”的字更可能和什么有关？", "水", ["火", "石头", "书本"], "三点水旁的字常和水有关，比如河、海、洗。", 1],
  ["一年级", "反义词", "“上”的反义词是什么？", "下", ["左", "里", "前"], "“上”和“下”是一组反义词。", 1],
  ["一年级", "反义词", "“大”的反义词是什么？", "小", ["高", "远", "多"], "“大”和“小”意思相反。", 1],
  ["一年级", "标点符号", "一句表示疑问的话，句末通常用哪个标点？", "问号", ["句号", "逗号", "书名号"], "表示提问的句子，句末常用问号。", 1],
  ["一年级", "词语分类", "下面哪个词最可能出现在天空中？", "白云", ["铅笔", "西瓜", "书桌"], "白云在天空中，其余几个词都不是天空里的事物。", 1],
  ["二年级", "词语分类", "下面哪个词语表示颜色？", "碧绿", ["奔跑", "桌子", "清晨"], "“碧绿”表示颜色，常形容草地或树叶。", 1],
  ["二年级", "词语运用", "“认真地听课”中表示“怎么样”的是哪部分？", "认真地", ["听课", "课", "地"], "“认真地”说明听课时的样子和状态。", 1],
  ["二年级", "词语形式", "下面哪个词语是 AABB 式？", "高高兴兴", ["雪白", "明天", "安静"], "“高高兴兴”属于 AABB 式词语。", 1],
  ["二年级", "阅读理解", "“小鱼在水里游来游去。” 这句话里谁在游？", "小鱼", ["水", "小鸟", "老师"], "句子写的是小鱼在水里游。", 1],
  ["二年级", "标点符号", "表示一句话中间稍微停顿，常用哪个标点？", "逗号", ["句号", "问号", "书名号"], "句子中间短暂停顿时，常用逗号。", 1],
  ["三年级", "古诗积累", "“远上寒山石径斜”的下一句是什么？", "白云生处有人家", ["停车坐爱枫林晚", "霜叶红于二月花", "低头思故乡"], "这两句都出自《山行》，“远上寒山石径斜，白云生处有人家”。", 2],
  ["三年级", "古诗积累", "“停车坐爱枫林晚”的下一句是什么？", "霜叶红于二月花", ["白云生处有人家", "夜来风雨声", "举头望明月"], "《山行》中写道：“停车坐爱枫林晚，霜叶红于二月花”。", 2],
  ["三年级", "成语理解", "“津津有味”最适合形容什么？", "读书看得很入迷", ["跑步很快", "天气很热", "衣服很新"], "“津津有味”常形容看书、听故事时很有兴趣。", 2],
  ["三年级", "近义词", "“忽然”的近义词是哪一个？", "突然", ["经常", "缓慢", "终于"], "“忽然”和“突然”意思相近。", 1],
  ["四年级", "寓言理解", "“守株待兔”告诉我们什么？", "不能只靠运气等结果", ["只要站着不动就行", "兔子天天都会来", "种树一定能抓兔子"], "这个故事告诉我们不能不努力，只想靠运气。", 3],
  ["四年级", "成语理解", "“画龙点睛”比喻什么？", "在关键处点得精彩", ["把画画得很慢", "只会画龙", "写字特别大"], "“画龙点睛”常比喻在关键地方加一句或一笔，使内容更精彩。", 2],
  ["四年级", "修辞判断", "下面哪句是拟人句？", "小溪唱着歌向前跑", ["我今天去公园", "树上有三只鸟", "天空很蓝"], "把小溪写得像人一样会“唱歌”，这是拟人。", 2],
  ["四年级", "关联词", "“虽然今天很冷，但是大家还是按时到了。” 前后分句关系是什么？", "转折", ["并列", "因果", "选择"], "“虽然……但是……”表示转折关系。", 2],
  ["四年级", "反义词", "“宽阔”的反义词是哪一个？", "狭窄", ["整齐", "安静", "弯曲"], "“宽阔”和“狭窄”意思相反。", 2],
  ["四年级", "阅读方法", "“浏览”一本书时，更接近哪种读法？", "大致翻看重点内容", ["逐字逐句背下来", "只看封面", "一页也不看"], "浏览是快速、大致地看，先抓重点。", 2],
  ["五年级", "名句理解", "“己所不欲，勿施于人”更接近什么意思？", "自己不愿意的不要强加给别人", ["要把喜欢的都送人", "别人不做我也不做", "只听自己的想法"], "这句话强调要替别人着想。", 3],
  ["五年级", "文学常识", "“完璧归赵”这个故事与谁有关？", "蔺相如", ["李白", "曹操", "郑和"], "“完璧归赵”讲的是蔺相如机智地把和氏璧完整带回赵国。", 2],
  ["五年级", "成语理解", "“负荆请罪”主要表现了什么？", "勇于认错", ["害怕上学", "喜欢旅游", "打扮奇怪"], "廉颇背着荆条去认错，体现了知错能改。", 2],
  ["五年级", "写作方法", "写读后感时，最重要的是什么？", "写出真实的感受", ["把原文全部抄一遍", "只写题目不写内容", "专门写错别字"], "读后感最重要的是写出自己的理解和感受。", 3],
  ["五年级", "结构判断", "“总分总”结构通常是怎样安排内容的？", "先总说，再分说，最后总结", ["先写结果，再写题目", "只写一个自然段", "想到哪写到哪"], "“总分总”是常见的文章结构。", 2],
  ["五年级", "成语理解", "“栩栩如生”最适合形容什么？", "形象非常逼真", ["声音很轻很小", "动作特别慢", "天气非常炎热"], "“栩栩如生”常形容画面、雕像等像活的一样。", 2],
  ["六年级", "成语理解", "“醉翁之意不在酒”更强调什么？", "真正目的不在表面上", ["只想喝到好酒", "一点想法都没有", "只喜欢看风景"], "这句话常用来表示真正的目的不在字面所说的事情上。", 3],
  ["六年级", "文学常识", "《史记》的作者是谁？", "司马迁", ["班固", "杜甫", "王安石"], "《史记》是司马迁写的重要史书。", 2],
  ["六年级", "修辞作用", "排比句最常见的作用是什么？", "增强语势和节奏", ["让句子变得更短", "把人物名字隐藏起来", "只用在说明文里"], "排比能让语言更有力量，更有节奏感。", 3],
  ["六年级", "写作方法", "“围绕中心意思写”要求文章怎样？", "内容都紧扣主题", ["每段都换一个主题", "想到什么就写什么", "只写题目不写内容"], "围绕中心意思写，就是所有内容都服务同一个主题。", 3],
  ["六年级", "文化故事", "“高山流水”后来常用来比喻什么？", "知音难得", ["山特别高", "水流特别急", "走路特别慢"], "伯牙和子期的故事后来常用“高山流水”比喻知音。", 3],
  ["六年级", "成语理解", "“顾名思义”最接近什么意思？", "看到名称就想到含义", ["看到人名就去找他", "只看图片不看文字", "不知道名字也能明白"], "“顾名思义”就是从名称去理解意思。", 2]
]);

const mathExtraQuestionConfigs = createConfigList([
  ["一年级", "口算加法", "8 + 5 = ?", "13", ["11", "12", "14"], "8 加 5 等于 13。", 1],
  ["一年级", "口算减法", "14 - 6 = ?", "8", ["7", "9", "10"], "14 减 6 还剩 8。", 1],
  ["一年级", "口算加法", "6 + 7 = ?", "13", ["12", "14", "15"], "6 和 7 合起来是 13。", 1],
  ["一年级", "口算减法", "16 - 9 = ?", "7", ["6", "8", "9"], "16 减去 9，结果是 7。", 1],
  ["一年级", "连加计算", "5 + 5 + 4 = ?", "14", ["12", "13", "15"], "先算 5 + 5 = 10，再加 4 得 14。", 1],
  ["一年级", "大小比较", "下面哪个数比 9 大？", "12", ["7", "8", "6"], "12 比 9 大，其余几个数都比 9 小。", 1],
  ["二年级", "口算减法", "23 - 5 = ?", "18", ["16", "17", "19"], "23 减 5 等于 18。", 1],
  ["二年级", "口算加法", "9 + 8 = ?", "17", ["15", "16", "18"], "9 加 8 等于 17。", 1],
  ["二年级", "情景计算", "4 盒彩笔，每盒 5 支，一共有几支？", "20支", ["15支", "18支", "24支"], "4 × 5 = 20，一共有 20 支。", 1],
  ["二年级", "平均分", "18 个橘子，每袋装 6 个，可以装几袋？", "3袋", ["2袋", "4袋", "6袋"], "18 ÷ 6 = 3，所以可以装 3 袋。", 1],
  ["二年级", "时间计算", "从 7:30 到 8:00，一共过了多久？", "30分钟", ["20分钟", "40分钟", "60分钟"], "7:30 到 8:00 刚好半小时，就是 30 分钟。", 2],
  ["二年级", "大小比较", "36 比 29 多几？", "7", ["5", "6", "8"], "36 - 29 = 7。", 1],
  ["三年级", "乘法口算", "6 × 8 = ?", "48", ["42", "46", "54"], "6 个 8 是 48。", 1],
  ["三年级", "除法口算", "42 ÷ 7 = ?", "6", ["5", "7", "8"], "42 平均分成 7 份，每份是 6。", 1],
  ["三年级", "乘法口算", "7 × 9 = ?", "63", ["56", "62", "72"], "7 个 9 相加就是 63。", 1],
  ["三年级", "除法口算", "54 ÷ 9 = ?", "6", ["5", "7", "9"], "54 里面有 6 个 9。", 1],
  ["三年级", "长方形周长", "一个长方形长 7 厘米，宽 3 厘米，它的周长是多少厘米？", "20厘米", ["10厘米", "17厘米", "21厘米"], "长方形周长是 (7 + 3) × 2 = 20 厘米。", 2, "/images/challenge/g3-general/rectangle-7x3-perimeter.svg"],
  ["四年级", "三位数加法", "126 + 78 = ?", "204", ["194", "214", "224"], "126 加 78 等于 204。", 2],
  ["四年级", "三位数减法", "400 - 156 = ?", "244", ["234", "246", "254"], "400 减去 156，结果是 244。", 2],
  ["四年级", "乘法计算", "24 × 3 = ?", "72", ["62", "68", "84"], "24 的 3 倍是 72。", 2],
  ["四年级", "除法计算", "96 ÷ 8 = ?", "12", ["10", "11", "13"], "96 平均分成 8 份，每份是 12。", 2],
  ["四年级", "情景计算", "5 盒彩纸，每盒 18 张，用掉 12 张后，还剩多少张？", "78张", ["68张", "72张", "88张"], "先算总数 5 × 18 = 90，再算 90 - 12 = 78。", 2],
  ["五年级", "除法计算", "120 ÷ 15 = ?", "8", ["6", "7", "9"], "120 里面有 8 个 15。", 2],
  ["五年级", "正方形周长", "一个正方形边长 12 厘米，它的周长是多少厘米？", "48厘米", ["24厘米", "36厘米", "60厘米"], "正方形周长 = 4 × 边长，所以是 48 厘米。", 2],
  ["五年级", "长方形面积", "一个长方形长 9 厘米，宽 6 厘米，面积是多少平方厘米？", "54平方厘米", ["15平方厘米", "30平方厘米", "60平方厘米"], "长方形面积 = 长 × 宽，所以 9 × 6 = 54。", 2],
  ["五年级", "平均数", "三次测试成绩分别是 88、92、90，平均分是多少？", "90分", ["88分", "89分", "91分"], "先把三次成绩相加得 270，再算 270 ÷ 3 = 90。", 3],
  ["五年级", "小数加法", "2.4 + 1.6 = ?", "4", ["3.8", "4.2", "4.4"], "按小数加法计算，2.4 + 1.6 = 4。", 2],
  ["六年级", "百分数", "40 的 75% 是多少？", "30", ["20", "25", "35"], "75% 就是 0.75，40 × 0.75 = 30。", 3],
  ["六年级", "分数加法", "1/2 + 1/4 = ?", "3/4", ["2/4", "1/6", "5/4"], "把 1/2 化成 2/4，再算 2/4 + 1/4 = 3/4。", 3],
  ["六年级", "分数应用", "20 的 3/5 是多少？", "12", ["8", "10", "15"], "20 × 3/5 = 12。", 3],
  ["六年级", "速度问题", "一辆车 3 小时行 180 千米，平均每小时行多少千米？", "60千米", ["50千米", "70千米", "90千米"], "180 ÷ 3 = 60，平均每小时行 60 千米。", 3],
  ["六年级", "百分数应用", "一件商品原价 50 元，上涨 10% 后是多少元？", "55元", ["52元", "54元", "60元"], "上涨 10% 就是增加 5 元，所以现价是 55 元。", 2],
  ["六年级", "和差问题", "甲乙两数的和是 84，乙比甲多 12，乙是多少？", "48", ["36", "42", "54"], "如果把 12 平均分掉，先算 (84 + 12) ÷ 2 = 48，得到较大的乙数。", 3]
]);

const englishExtraQuestionConfigs = createConfigList([
  ["一年级", "单词认读", "“学校”的英文是哪一个？", "school", ["chair", "water", "pencil"], "school 表示学校。", 1],
  ["一年级", "单词认读", "“书包”的英文是哪一个？", "bag", ["milk", "nose", "shoe"], "bag 表示书包。", 1],
  ["一年级", "数字单词", "“一”的英文是哪一个？", "one", ["two", "ten", "on"], "one 表示数字 1。", 1],
  ["一年级", "情景对话", "第一次见面打招呼，更合适的是哪一句？", "Hello!", ["Good night!", "Sit down.", "Close the door."], "第一次见面或平时打招呼都可以说 Hello!", 1],
  ["一年级", "课堂指令", "“起立”的英文指令是哪一句？", "Stand up.", ["Sit down.", "Open it.", "Thank you."], "Stand up. 的意思是“起立”。", 1],
  ["一年级", "单词分类", "Which word is a fruit?", "orange", ["eraser", "teacher", "window"], "orange 表示橙子，是水果。", 1],
  ["一年级", "单词认读", "“老师”的英文是哪一个？", "teacher", ["banana", "brother", "play"], "teacher 表示老师。", 1],
  ["二年级", "单词认读", "“窗户”的英文是哪一个？", "window", ["flower", "river", "schoolbag"], "window 表示窗户。", 1],
  ["二年级", "课堂指令", "“Close the door.” 的意思是什么？", "关门", ["开门", "擦桌子", "打开书"], "Close the door. 的意思是“把门关上”。", 1],
  ["二年级", "颜色单词", "“绿色”的英文是哪一个？", "green", ["brown", "chair", "seven"], "green 表示绿色。", 1],
  ["二年级", "句意理解", "“This is a pen.” 的意思是什么？", "这是一支钢笔", ["那是一张桌子", "我有一支钢笔", "请给我一支钢笔"], "This is a pen. 直译就是“这是一支钢笔”。", 1],
  ["二年级", "单词分类", "Which word is an animal?", "rabbit", ["apple", "desk", "music"], "rabbit 表示兔子，是动物。", 1],
  ["三年级", "情景对话", "别人问 “How are you?”，更合适的回答是哪一句？", "I'm fine, thank you.", ["My name is Tom.", "I am ten years old.", "See you tomorrow."], "How are you? 常用来问候，对应回答常是 I'm fine, thank you.", 1],
  ["三年级", "句子选择", "“我有一只风筝。” 更合适的英文是哪一句？", "I have a kite.", ["I am a kite.", "I like kite.", "Have I a kite."], "I have a kite. 表示“我有一只风筝”。", 1],
  ["三年级", "短语理解", "“on the desk” 最接近什么意思？", "在桌子上", ["在桌子下", "在教室里", "在门旁边"], "on 表示“在……上面”，desk 是桌子。", 1],
  ["三年级", "时间词汇", "Which word means “星期天”？", "Sunday", ["summer", "supper", "study"], "Sunday 表示星期天。", 2],
  ["四年级", "句子选择", "“她有长头发。” 更合适的英文是哪一句？", "She has long hair.", ["She have long hair.", "He has long hair.", "She long hair has."], "主语是 she 时，动词要用 has。", 2],
  ["四年级", "情景对话", "别人问图书馆在哪里，更合适的回答是哪一句？", "It is next to the playground.", ["It is a good book.", "I like the library.", "She is in Grade Four."], "问地点时，要回答地点位置。", 2],
  ["四年级", "句子选择", "“我喜欢唱歌。” 更合适的英文是哪一句？", "I like singing.", ["I am sing.", "I can singer.", "Like I singing."], "like 后面接动词-ing 时，表示喜欢做某事。", 2],
  ["四年级", "时间词汇", "Which month comes after May?", "June", ["April", "March", "Monday"], "在 May 之后的月份是 June。", 2],
  ["四年级", "现在进行时", "“他们正在踢足球。” 更合适的英文是哪一句？", "They are playing football.", ["They play football yesterday.", "They is playing football.", "Are they football play."], "现在正在进行的动作常用 are + 动词-ing。", 2],
  ["五年级", "句意理解", "“How much is it?” 主要是在问什么？", "价格", ["时间", "天气", "年龄"], "How much is it? 常用来询问价格。", 2],
  ["五年级", "句意理解", "“What time is it?” 主要是在问什么？", "时间", ["数量", "颜色", "地点"], "What time is it? 用来询问时间。", 2],
  ["五年级", "比较级", "下面哪一句使用了比较级？", "Tom is taller than Ben.", ["Tom is a tall boy.", "Tom can play basketball.", "Ben and Tom are friends."], "taller than 表示“比……更高”，属于比较级。", 2],
  ["五年级", "句子选择", "“因为下雨，我们待在家里。” 更合适的英文是哪一句？", "We stay at home because it is raining.", ["We stay at home and rain.", "Because home we are.", "It raining stay we home."], "because 可以引出原因，整句要保持完整。", 3],
  ["五年级", "there be 句型", "下面哪一句正确使用了 there is？", "There is a book on the desk.", ["There are a book on the desk.", "There is books on the desk.", "There book is on the desk."], "单数名词 a book 前面要用 There is。", 2],
  ["六年级", "一般将来时", "“我们下周要参观博物馆。” 更合适的英文是哪一句？", "We will visit the museum next week.", ["We visited the museum next week.", "We will visited the museum.", "We next week visit museum will."], "将来发生的事常用 will + 动词原形。", 3],
  ["六年级", "情态动词", "“你晚饭前应该洗手。” 更合适的英文是哪一句？", "You should wash your hands before dinner.", ["You should washes your hands.", "You washing hands should.", "Should your hands before dinner."], "should 后面接动词原形，表示“应该”。", 2],
  ["六年级", "条件句", "“如果我有空，我会帮你。” 更合适的英文是哪一句？", "If I am free, I will help you.", ["If I will free, I help you.", "I am free if help you.", "If free am I, will you help."], "条件句要有完整主语，后半句用 will 表示将来。", 3],
  ["六年级", "词性判断", "Which word is a noun?", "teacher", ["careful", "quickly", "beautiful"], "teacher 是名词，表示“老师”。", 2],
  ["六年级", "词义理解", "“My hobby is collecting stamps.” 中 hobby 最接近什么意思？", "爱好", ["假期", "作业", "邻居"], "hobby 表示平时喜欢做的事情，也就是“爱好”。", 2],
  ["六年级", "书信表达", "写邮件结尾表达祝福，更合适的是哪一句？", "Best wishes,", ["How old are you?", "Stand up, please.", "I am a student."], "Best wishes, 常用于邮件或信件结尾表达祝福。", 2],
  ["六年级", "情景对话", "别人问 “Why do you like science?”，更合适的回答是哪一句？", "Because it is interesting.", ["I like blue very much.", "My science book is green.", "It is on the desk."], "Why 提问原因，回答常用 Because 开头。", 3]
]);

const gradeFourToSixEnglishSemesterQuestions = buildQuestions([
  ...createEnglishKnowledgeRouteConfigs("四年级", "上册", [
    ["课堂用语", "课堂指令", "老师说“Open your book to page ten.”，你应该怎么做？", "把书翻到第 10 页", ["把书放进书包", "把窗户打开", "把铅笔借给同桌"], "Open your book to page ten. 的意思是把书翻到第 10 页。", 2],
    ["课堂用语", "情景对话", "上课时想请同桌把橡皮递给你，更合适的是哪一句？", "Pass me the eraser, please.", ["What color is the eraser?", "I draw with my eraser.", "This eraser is under the desk."], "需要礼貌地请求别人递东西时，可以说 Pass me the eraser, please.", 2],
    ["课堂用语", "句子选择", "老师提醒大家安静下来，哪一句最合适？", "Be quiet, please.", ["How old are you?", "I like music class.", "It is a lovely rabbit."], "让大家安静下来时，可以说 Be quiet, please.", 2],
    ["常识词汇", "词义判断", "Which word is a school place?", "library", ["banana", "Sunday", "dinner"], "library 表示图书馆，是学校里的地点。", 2],
    ["常识词汇", "单词认读", "“computer room” 最接近哪一项？", "计算机教室", ["操场旁边", "音乐时间", "数学作业"], "computer room 指学校里的计算机教室。", 2],
    ["常识词汇", "词义判断", "在句子“Our music room is on the second floor.”里，music room 指哪里？", "音乐教室", ["图书馆", "校医室", "操场"], "music room 表示音乐教室。", 2],
    ["时间词汇", "时间词汇", "“half past seven” 是几点？", "7 点 30 分", ["7 点整", "6 点 30 分", "8 点 30 分"], "half past seven 就是 7 点过半，也就是 7 点 30 分。", 2],
    ["时间词汇", "数字单词", "在短语“twenty-four students”里，表示人数的是哪个数字？", "24", ["14", "20", "40"], "twenty-four 表示 24。", 2],
    ["时间词汇", "活动安排", "“We have PE on Tuesday afternoon.” 这句话主要在安排什么？", "周二下午上体育课", ["周二早上做值日", "周三下午看电影", "周五晚上去购物"], "这句话说明周二下午安排的是体育课。", 2],
    ["句子理解", "句子理解", "“She is reading in the library.” 里 she 正在做什么？", "在图书馆看书", ["在操场跑步", "在食堂吃饭", "在家做作业"], "read in the library 表示在图书馆看书。", 2],
    ["句子理解", "句意理解", "“My art class starts at nine.” 最接近哪一项？", "我的美术课九点开始", ["我的九点钟很漂亮", "我九点要去图书馆", "美术课要上九节"], "starts at nine 表示九点开始。", 2],
    ["句子理解", "短语理解", "“next to the playground” 最接近什么意思？", "在操场旁边", ["在操场后面", "在操场里面", "在操场前面"], "next to 表示“紧挨着、在……旁边”。", 2]
  ]),
  ...createEnglishKnowledgeRouteConfigs("四年级", "下册", [
    ["家庭成员", "词义判断", "Which word is a family member?", "uncle", ["library", "cloudy", "Thursday"], "uncle 表示家庭成员里的“叔叔、舅舅”。", 2],
    ["家庭成员", "情景对话", "向朋友介绍“这是我的姐姐”，更合适的是哪一句？", "This is my sister.", ["She is in the park.", "I like this pencil.", "These are my books."], "介绍自己的姐姐时，可以说 This is my sister.", 2],
    ["家庭成员", "单词认读", "“parents” 最接近哪一项？", "父母", ["朋友们", "老师们", "孩子们"], "parents 表示父母。", 2],
    ["天气词汇", "情景对话", "下雨天出门前，妈妈最可能提醒你哪一句？", "Take your umbrella.", ["Clean the blackboard.", "Open the fridge.", "Draw a panda."], "下雨天出门常会提醒 Take your umbrella. 带上雨伞。", 2],
    ["天气词汇", "句意理解", "“It is cloudy and cool today.” 最接近哪一项？", "今天多云而且凉爽", ["今天晴朗又炎热", "今天下雪很冷", "今天有风也闷热"], "cloudy 表示多云，cool 表示凉爽。", 2],
    ["天气词汇", "活动安排", "“It's snowy, so we play inside.” 这句话说明今天怎么安排？", "因为下雪所以在室内活动", ["因为刮风所以去放风筝", "因为天晴所以去远足", "因为下雨所以去游泳"], "句子里说明因为下雪，所以在室内活动。", 2],
    ["位置表达", "短语理解", "“between the two trees” 最接近什么意思？", "在两棵树中间", ["在两棵树后面", "在两棵树上面", "在两棵树前面"], "between 表示“在……中间”。", 2],
    ["位置表达", "句子理解", "“The zoo is across from the bank.” 这句话说明动物园在哪里？", "在银行对面", ["在银行后面", "在银行里面", "在银行右边很远"], "across from 表示“在……对面”。", 2],
    ["位置表达", "情景对话", "别人问书店在哪里，更合适的回答是哪一句？", "It's beside the hospital.", ["It is a funny story.", "I read books every day.", "She likes the hospital."], "回答地点位置时，要用表示方位的句子。", 2],
    ["句子选择", "句子选择", "“邮局就在公园前面。” 更合适的英文是哪一句？", "The post office is in front of the park.", ["The post office front the park.", "The park is a post office.", "In front the park is happy."], "in front of 表示“在……前面”。", 2],
    ["句型替换", "句型判断", "Which sentence says the same as “He likes swimming”?", "He loves swimming.", ["He swim every day.", "He can a swimmer.", "He is at swimming."], "likes swimming 和 loves swimming 都表示喜欢游泳。", 2],
    ["句型替换", "阅读理解", "短文：Amy gets up at 7 and goes to school at 8. Amy 在 8 点做什么？", "去上学", ["起床", "吃晚饭", "去睡觉"], "短文里明确写着 Amy 在 8 点去上学。", 2],
    ["句型替换", "短文理解", "短文：Tom can ride a bike, but he can't swim. 下面哪一项是正确的？", "Tom 会骑自行车", ["Tom 会游泳", "Tom 不会骑车", "Tom 正在跑步"], "根据短文，Tom 会骑自行车，但不会游泳。", 2]
  ]),
  ...createEnglishKnowledgeRouteConfigs("五年级", "上册", [
    ["情景对话", "情景对话", "想问同学周末常做什么，更合适的是哪一句？", "What do you do on weekends?", ["Where is your ruler?", "Who is your art teacher?", "Why is the sky blue?"], "询问别人周末做什么，可以说 What do you do on weekends?", 2],
    ["情景对话", "句子选择", "在夏令营里介绍“我来自郑州”，哪一句最合适？", "I'm from Zhengzhou.", ["I'm in the kitchen.", "I am twelve books.", "I'm doing my homework."], "介绍自己来自哪里时，可以说 I'm from ...", 2],
    ["情景对话", "情景对话", "同学说“I feel ill.”，更合适的回应是哪一句？", "I'm sorry to hear that.", ["I can draw a map.", "The library is open.", "It is next Monday."], "听到别人不舒服时，可以先表达关心。", 2],
    ["学校生活", "词义判断", "在句子“Lily is our class monitor.”里，monitor 最接近什么意思？", "班长", ["讲台", "作业本", "操场"], "class monitor 指班长。", 2],
    ["学校生活", "句子选择", "“我们通常在阅览室看书。” 更合适的英文是哪一句？", "We usually read in the reading room.", ["We reading room every day.", "Usually we books are.", "The reading room is blue."], "这句话要表达在阅览室看书的习惯。", 2],
    ["学校生活", "情景对话", "老师问今天谁负责擦黑板，哪一句回答更合适？", "I clean the blackboard today.", ["I have a black bag.", "The blackboard is green.", "Today is very windy."], "回答值日安排时，要直接说明自己负责的任务。", 2],
    ["常识词汇", "词义判断", "Which word is about a public place for learning history?", "museum", ["noodle", "healthy", "weekend"], "museum 表示博物馆，是学习历史和文化的公共场所。", 2],
    ["时间表达", "时间词汇", "“quarter to eight” 是几点？", "7 点 45 分", ["7 点 15 分", "8 点 15 分", "8 点整"], "quarter to eight 表示差一刻到八点，也就是 7 点 45 分。", 2],
    ["时间表达", "活动安排", "“We will visit the museum after lunch.” 这句话说明什么安排？", "午饭后去参观博物馆", ["早餐前去操场集合", "晚饭后做科学实验", "周末在家整理房间"], "after lunch 表示午饭后。", 2],
    ["时间表达", "句意理解", "“My father gets home at half past six.” 最接近哪一项？", "我爸爸六点半到家", ["我爸爸六点去上班", "我爸爸七点去跑步", "我爸爸五点半做晚饭"], "half past six 表示六点半。", 2],
    ["句型理解", "句型判断", "Which sentence asks about frequency correctly?", "How often do you play football?", ["How often you play football?", "How do often you football?", "How often are play football?"], "询问做某事的频率时，常用 How often do you ...?", 3],
    ["句型理解", "阅读理解", "短文：Lucy always does homework before dinner. Then she plays the piano. Lucy 晚饭前做什么？", "做作业", ["弹钢琴", "看电视", "去散步"], "根据短文，Lucy 晚饭前先做作业。", 2],
    ["句型理解", "短语理解", "“be good at drawing” 最接近什么意思？", "擅长画画", ["正在画画", "想学画画", "不喜欢画画"], "be good at 表示“擅长”。", 2]
  ]),
  ...createEnglishKnowledgeRouteConfigs("五年级", "下册", [
    ["节日词汇", "情景对话", "在儿童节见到同学，最合适的祝福是哪一句？", "Happy Children's Day!", ["Good night, teacher!", "Turn left here!", "I have a ruler."], "在儿童节给同学送祝福，可以说 Happy Children's Day!", 2],
    ["节日词汇", "句子选择", "“春节时我们和爷爷奶奶一起吃晚饭。” 更合适的英文是哪一句？", "We have dinner with our grandparents at the Spring Festival.", ["We dinner with spring and books.", "Grandparents are in the dinner.", "Spring Festival is a new pencil."], "这句话要把节日、人物和活动说完整。", 2],
    ["节日词汇", "句意理解", "“We watch the moon on Mid-Autumn Festival.” 最接近哪一项？", "我们在中秋节赏月", ["我们在重阳节爬山", "我们在春节放风筝", "我们在元旦看烟花"], "watch the moon on Mid-Autumn Festival 表示中秋节赏月。", 2],
    ["位置表达", "短语理解", "“go straight and turn left” 最接近什么意思？", "直走然后左转", ["直走然后右转", "往回走再停下", "先上楼再下楼"], "go straight 表示直走，turn left 表示左转。", 2],
    ["位置表达", "句子选择", "别人问去博物馆怎么走，哪一句回答更合适？", "Go along Green Street and it is on your right.", ["The museum is my favorite lesson.", "I can see a new museum book.", "Green Street is very happy today."], "回答路线时，要说清沿哪条路走和位置。", 2],
    ["位置表达", "情景对话", "在医院门口问邮局位置，更合适的回答是哪一句？", "It's between the bank and the cinema.", ["It is a useful postcard.", "I send letters every week.", "The hospital is very clean."], "between ... and ... 可以说明地点在两者之间。", 2],
    ["食物词汇", "词义判断", "Which word is something you can eat for breakfast?", "bread", ["library", "Monday", "teacher"], "bread 表示面包，是早餐里常见的食物。", 2],
    ["食物词汇", "单词认读", "“vegetable salad” 最接近哪一项？", "蔬菜沙拉", ["水果商店", "热牛奶", "校门口"], "vegetable salad 表示蔬菜沙拉。", 2],
    ["食物词汇", "句意理解", "“Too much cola is bad for your teeth.” 最接近哪一项？", "喝太多可乐对牙齿不好", ["喝牛奶会让人困", "多吃苹果会跑更快", "牙齿喜欢天天吃糖"], "句子提醒我们太多可乐对牙齿不好。", 2],
    ["写话表达", "句子选择", "给朋友发周末留言，哪一句更适合作为开头？", "I'm going to visit the science museum this Saturday.", ["Science museum is very tall.", "Saturday under the bus stop.", "My friend blue and happy."], "简单写话开头要把时间和计划说清楚。", 2],
    ["短文理解", "短文理解", "短文：Jenny likes apples. She drinks milk every morning. Jenny 每天早上喝什么？", "牛奶", ["橙汁", "茶", "可乐"], "短文里明确写着 Jenny 每天早上喝牛奶。", 2],
    ["短文理解", "阅读理解", "短文：Our class will plant trees on Friday. We need shovels and water. 周五这个班要做什么？", "去植树", ["开运动会", "排练节目", "参观动物园"], "根据短文，周五全班要去植树。", 2],
    ["短文理解", "句型判断", "Which sentence tells a simple plan?", "I am going to make a fruit list after dinner.", ["I went to the farm last week.", "She likes yellow best.", "There are three books here."], "am going to ... 常用来表达计划。", 2]
  ]),
  ...createEnglishKnowledgeRouteConfigs("六年级", "上册", [
    ["情景对话", "情景对话", "别人问你为什么参加科学社团，更合适的回答是哪一句？", "Because I enjoy experiments.", ["My club room is blue.", "There are ten desks.", "I go home by bike."], "回答原因时，可以用 Because ...", 2],
    ["情景对话", "句子选择", "“我认为我们应该先做计划。” 更合适的英文是哪一句？", "I think we should make a plan first.", ["I think a plan is under the chair.", "We first make should plan.", "I make a plan yesterday first."], "这句话要表达“我认为”和“应该先做计划”。", 2],
    ["情景对话", "情景对话", "在校园义卖活动中想邀请同学加入，哪一句更合适？", "Would you like to join us?", ["What time is the ruler?", "The desk is next to me.", "I bought a new schoolbag."], "邀请别人加入活动时，可以用 Would you like to join us?", 2],
    ["时间表达", "时间词汇", "“the day after tomorrow” 最接近什么意思？", "后天", ["昨天", "今天", "明天"], "the day after tomorrow 表示后天。", 2],
    ["时间表达", "活动安排", "“We are leaving at 8:15 and coming back before noon.” 这句话主要在说明什么？", "出发和返回时间安排", ["午餐吃什么", "谁来打扫教室", "要买几张车票"], "句子里给出了出发时间和返回时间。", 2],
    ["时间表达", "句意理解", "“The meeting has been put off until Friday.” 最接近哪一项？", "会议改到了周五", ["会议已经结束了", "周五不能开会", "会议每周五都开"], "put off until Friday 表示推迟到周五。", 2],
    ["人物关系", "词义判断", "在句子“My cousin is in Grade Six.”里，cousin 最接近什么意思？", "表兄弟姐妹", ["班主任", "邻居阿姨", "运动鞋"], "cousin 表示表兄弟姐妹。", 2],
    ["人物关系", "单词认读", "句子“My uncle is a doctor.” 里，doctor 最接近哪一项？", "医生", ["司机", "厨师", "画家"], "doctor 表示医生。", 2],
    ["人物关系", "情景对话", "介绍“他是我最好的朋友”，哪一句最合适？", "He is my best friend.", ["He likes Friday best.", "His pencil is very long.", "She is reading a story."], "介绍人物关系时，可以说 He is my best friend.", 2],
    ["常识词汇", "词义判断", "Which word is about a job that helps sick people?", "nurse", ["bridge", "autumn", "careful"], "nurse 表示护士，是照顾病人的职业。", 2],
    ["句型理解", "句型判断", "Which sentence gives advice correctly?", "You should take notes carefully.", ["You should takes notes carefully.", "Take notes should you carefully.", "You carefully notes should."], "should 后面接动词原形，所以第一句正确。", 3],
    ["句型理解", "阅读理解", "短文：Linda wants to be a teacher. She often helps younger students. Linda 长大后想成为什么？", "老师", ["医生", "厨师", "飞行员"], "短文里明确写着 Linda 想成为老师。", 2],
    ["句型理解", "短文理解", "短文：Ben missed the bus, so he walked to school. Why did Ben walk to school?", "Because he missed the bus.", ["Because he likes running.", "Because the school is closed.", "Because his bike is new."], "短文说明 Ben 因为错过公交车，所以步行去学校。", 2]
  ]),
  ...createEnglishKnowledgeRouteConfigs("六年级", "下册", [
    ["旅行场景", "情景对话", "在火车站想问列车什么时候出发，更合适的是哪一句？", "When does the train leave?", ["Why is the train blue?", "How old is the train?", "Where do pencils come from?"], "询问列车出发时间时，可以说 When does the train leave?", 2],
    ["旅行场景", "活动安排", "“First we check in, then we visit the old town after lunch.” 第一步要做什么？", "先办理入住", ["先参观古镇", "先去机场送人", "先写旅行日记"], "句子里 first 后面就是第一步安排。", 2],
    ["旅行场景", "句子选择", "“我们最好带上一张地图。” 更合适的英文是哪一句？", "We'd better take a map.", ["We take map yesterday.", "A map is better than lunch.", "We are map on the desk."], "We'd better ... 可以表达“最好……”。", 2],
    ["健康表达", "句意理解", "“You'd better drink more water and go to bed early.” 最接近哪一项？", "你最好多喝水并且早点睡", ["你应该少喝水多运动", "你最好晚点睡再吃糖", "你需要马上去火车站"], "这句话给出了健康方面的建议。", 2],
    ["健康表达", "情景对话", "同学发烧了，哪一句建议最合适？", "You should see a doctor.", ["You should climb the hill.", "You should clean the window.", "You should buy a toy train."], "身体不舒服时，最合适的建议是去看医生。", 2],
    ["健康表达", "句型判断", "Which sentence gives good advice?", "Don't eat too much ice cream.", ["Ice cream is in my schoolbag.", "Too much ice cream are cold.", "Eat because the doctor is blue."], "这句话给出了清楚合理的建议。", 2],
    ["位置表达", "短语理解", "“at the end of the street” 最接近什么意思？", "在街道尽头", ["在街道中间", "在街道左边第一家", "在街道对面的公园"], "at the end of ... 表示“在……尽头”。", 2],
    ["位置表达", "句子选择", "“博物馆就在书店后面。” 更合适的英文是哪一句？", "The museum is behind the bookshop.", ["The museum behinds the bookshop.", "The bookshop is a museum.", "Behind the museum is reading."], "behind 表示“在……后面”。", 2],
    ["位置表达", "情景对话", "别人问怎么去地铁站，更合适的回答是哪一句？", "Go straight and you'll see it on the left.", ["The subway station likes music.", "I go there last Sunday.", "Left is my favorite color."], "回答路线时，要说清走法和方位。", 2],
    ["阅读理解", "阅读理解", "短文：Our group will collect rubbish in the park on Saturday morning. 这个小组周六早上要做什么？", "去公园捡垃圾", ["去电影院看电影", "去图书馆借书", "去商店买礼物"], "短文里写着这个小组周六早上去公园捡垃圾。", 2],
    ["阅读理解", "短文理解", "短文：Anna lost her ticket, so she asked the guide for help. Why did Anna ask for help?", "Because she lost her ticket.", ["Because she found a map.", "Because she wanted some water.", "Because she bought a gift."], "根据短文，Anna 是因为丢了票才去求助。", 2],
    ["阅读理解", "句型判断", "Which sentence can be used as a clear travel note?", "Please meet at Gate Three at 9:00.", ["Gate Three is happy.", "Nine is a big station.", "Meet please because travel."], "清楚的出行提醒要说出地点和时间。", 2]
  ])
]);

const gradeFourToSixCoverageBackfillQuestions = buildQuestions([
  ...createKnowledgeRouteConfigs("语文", "四年级", "上册", [
    ["观察表达", "写作方法", "看图写话时，第一步最应该做什么？", "先按顺序看清图里的主要内容", ["先把题目抄三遍", "先挑最长的词语写上去", "先随便写一句结尾"], "观察表达先要看清画面里的人、事、景，再按顺序组织语言。", 2],
    ["习作起步", "写作方法", "刚开始写一段话时，更合适的做法是哪一项？", "先想清楚想写什么，再写开头", ["想到哪个词就先写哪个词", "先写最后一句再说", "完全不看题目要求"], "习作起步要先明确主题，再从开头慢慢写。", 2],
    ["细节描写", "写作方法", "想把“他很开心”写得更具体，哪一句更合适？", "他笑得眼睛弯弯的，还拍起了手", ["他是一个人", "今天天气不错", "教室里有很多桌子"], "细节描写要把动作、神情这些看得见的细节写出来。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "四年级", "上册", [
    ["观察物体", "立体图形", "从正面看一个长方体盒子，最可能看到什么图形？", "长方形", ["三角形", "圆形", "平行四边形"], "长方体的正面通常看到的是长方形。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "四年级", "下册", [
    ["成语理解", "成语理解", "“专心致志”最适合形容哪种状态？", "做事非常专心", ["走路特别快", "天气特别热", "衣服特别整齐"], "专心致志就是全神贯注地做事。", 2],
    ["因果关系", "关联词判断", "“因为下雨，所以比赛延期了。” 前后分句关系是什么？", "因果关系", ["并列关系", "选择关系", "转折关系"], "前一句说原因，后一句说结果，属于因果关系。", 2],
    ["文言启蒙", "文言理解", "文言句子“学而时习之”的“习”最接近什么意思？", "复习、练习", ["休息", "玩耍", "旅行"], "这里的“习”指反复复习、练习。", 2],
    ["写景表达", "写作方法", "写景时想让画面更清楚，下面哪种做法更合适？", "按从远到近的顺序写景物", ["把景物名字随便堆在一起", "只写一句“真美啊”", "不写看到的颜色和样子"], "写景表达常要有顺序，比如从远到近、从上到下。", 2],
    ["细节描写", "写作方法", "想写春雨很细，哪一句更合适？", "细细的雨丝轻轻落在树叶上", ["今天我们去上学", "教室里有黑板", "我喜欢吃苹果"], "细节描写要抓住看得见、感受到的小变化。", 2],
    ["习作方法", "写作方法", "写一件事时，哪一步最有助于把事情写完整？", "先想清楚起因、经过和结果", ["先把好词全部列出来", "只写最热闹的一句", "完全照抄别人的作文"], "习作方法里很重要的一点，就是先理清事情的发展顺序。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "四年级", "下册", [
    ["质量单位", "单位换算", "2 千克和多少克一样重？", "2000 克", ["20 克", "200 克", "20000 克"], "1 千克等于 1000 克，所以 2 千克等于 2000 克。", 2],
    ["平行四边形", "平面图形", "下面哪一项是平行四边形最明显的特点？", "两组对边分别平行", ["四条边都一样长", "只有一组对边平行", "四个角都是直角"], "平行四边形最明显的特点是两组对边分别平行。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "五年级", "上册", [
    ["文言启蒙", "文言理解", "文言句子“知之为知之”的“知”最接近什么意思？", "知道、明白", ["奔跑", "睡觉", "种树"], "这里的“知”表示知道、明白。", 2],
    ["记事表达", "写作方法", "写一件难忘的小事，哪种安排更清楚？", "按事情发生的先后顺序写", ["先写结果再随便插别的事", "只写一句总结", "每句都换一个人称"], "记事表达最基础的是把事情的顺序交代清楚。", 2],
    ["习作结构", "写作方法", "文章采用“总分总”结构时，开头最适合做什么？", "先总说想表达的主要内容", ["先把所有细节都写完", "先抄一句古诗", "先写结尾感受"], "“总分总”结构通常开头先总说，中间分说，结尾总结。", 2],
    ["场面描写", "写作方法", "想写操场上很热闹，哪一句更有场面感？", "呐喊声、脚步声和欢笑声一下子挤满了操场", ["操场很大", "今天星期三", "我们有一个操场"], "场面描写要抓住多人活动时的声音、动作和气氛。", 2],
    ["细节描写", "写作方法", "想写同学认真读书，哪一句更具体？", "他微微皱着眉，一边读一边轻轻点头", ["他在读书", "书很好看", "教室里很安静"], "细节描写要把动作、神情等小地方写清楚。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "五年级", "上册", [
    ["因数与倍数", "数字规律", "下面哪一组关系是正确的？", "4 是 12 的因数", ["12 是 4 的因数", "4 和 12 没关系", "12 不是 4 的倍数"], "因为 12 ÷ 4 = 3，所以 4 是 12 的因数，12 是 4 的倍数。", 2],
    ["2和5的倍数特征", "数字规律", "下面哪个数一定是 5 的倍数？", "135", ["132", "148", "126"], "个位是 0 或 5 的数一定是 5 的倍数。", 2],
    ["质数与合数", "数字规律", "下面哪个数是质数？", "13", ["12", "15", "21"], "13 只有 1 和 13 两个因数，所以是质数。", 2],
    ["数的奇偶性", "数字规律", "奇数加奇数，和通常是什么数？", "偶数", ["奇数", "质数", "不确定"], "两个奇数相加，结果通常是偶数。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "五年级", "下册", [
    ["人物描写", "人物理解", "从“他咬着牙又站了起来”这句话里，最能看出人物什么特点？", "坚强不服输", ["特别贪玩", "非常胆小", "只喜欢安静"], "人物描写常通过动作表现人物性格。", 2],
    ["古诗积累", "古诗积累", "“劝君更尽一杯酒”的下一句是什么？", "西出阳关无故人", ["不及汪伦送我情", "天下谁人不识君", "千里江陵一日还"], "这两句出自《送元二使安西》。", 2],
    ["传统文化", "传统文化", "端午节人们常常会做下面哪件事？", "吃粽子、赛龙舟", ["赏月、吃月饼", "登高、插茱萸", "贴春联、放鞭炮"], "端午节的传统习俗包括吃粽子、赛龙舟等。", 2],
    ["写人表达", "写作方法", "写人物时，最能突出人物特点的是哪种做法？", "抓住人物独特的语言和动作来写", ["只写人物叫什么名字", "只写天气变化", "把景物写满一页"], "写人表达要抓住能体现性格的典型细节。", 2],
    ["写景表达", "写作方法", "写景时为了让层次更清楚，哪种顺序更合适？", "从上到下或从远到近来写", ["想到哪儿写到哪儿", "只写最后一句感叹", "把景物名字全部并排写"], "写景表达讲究有顺序，这样画面更清楚。", 2],
    ["习作方法", "写作方法", "修改作文时，先检查哪一项最有帮助？", "内容有没有围绕主题", ["纸张够不够厚", "铅笔是不是新的", "座位是不是靠窗"], "习作方法里，修改时要先看内容有没有紧扣主题。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "五年级", "下册", [
    ["可能性", "数量统计", "袋子里有 5 个红球和 1 个蓝球，任意摸 1 个，哪种颜色更容易摸到？", "红球", ["蓝球", "两种一样容易", "一定摸不到红球"], "红球数量更多，所以摸到红球的可能性更大。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "六年级", "上册", [
    ["文言句意", "文言理解", "“孰为汝多知乎”里的“孰”最接近什么意思？", "谁", ["哪里", "什么时间", "为什么"], "这里的“孰”表示“谁”。", 2],
    ["习作结构", "写作方法", "写观点类作文时，下面哪种结构更清楚？", "先提出观点，再举例说明，最后总结", ["先写与主题无关的故事", "每段都换一个中心", "只写一个结尾句"], "观点类习作常用“提出观点-说明理由-总结提升”的结构。", 2],
    ["观点表达", "演讲写作", "在班会上表达建议时，哪种说法更有说服力？", "先说观点，再说明理由和做法", ["只重复一句“我觉得很好”", "先讲很多无关故事", "一句话里同时说三件不相关的事"], "观点表达要把观点、理由和建议说完整。", 2],
    ["重点描写", "写作方法", "写一场比赛时，最能突出重点的做法是哪一项？", "把最关键的几个镜头写具体", ["每一秒都平均写一样多", "只写比赛地点", "完全不写人物表现"], "重点描写要抓住最关键、最能体现主题的部分。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "六年级", "上册", [
    ["扇形初步", "圆的认识", "把一个圆平均分成 4 份，其中 1 份最接近什么图形？", "扇形", ["长方形", "平行四边形", "梯形"], "圆的一部分由两条半径和一段弧围成，叫扇形。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "六年级", "下册", [
    ["词句品味", "词语体会", "“他的心像被轻轻揪了一下”这句话最能表现什么？", "人物内心被触动了", ["人物走得很快", "天气突然变冷", "教室里十分明亮"], "词句品味要体会词语和句子背后的情感和表达效果。", 2],
    ["习作复习", "写作方法", "毕业前整理习作时，先做哪一步更合适？", "先回看常见问题，再有针对性修改", ["先把题目都改成一样", "先把所有标点删掉", "先只看字写得漂不漂亮"], "习作复习要先发现常见问题，再逐项修改。", 2],
    ["写作思路", "写作方法", "下笔前列一个简单提纲，主要是为了什么？", "让文章思路更清楚", ["让字写得更大", "让纸张更整齐", "让开头变得更短"], "写作思路清楚，文章内容才更有条理。", 2],
    ["写人写事写景", "写作方法", "下面哪一项最能体现综合运用写作方法？", "写人时穿插一件事，再用景物烘托心情", ["只把人名重复很多遍", "只写天气不给内容", "整篇只列几个词语"], "写人写事写景要学会把人物、事件和景物自然结合起来。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "六年级", "下册", [
    ["表面积", "面积应用", "一个长方体礼盒长 6 厘米、宽 4 厘米、高 3 厘米，给它包彩纸时主要要算什么？", "六个面的总面积", ["只算一个面的面积", "只算体积", "只算最长的边"], "表面积就是物体外面所有面的面积总和。", 2]
  ])
]);

const gradeFourToSixRouteDeepeningQuestions = buildQuestions([
  ...createKnowledgeRouteConfigs("语文", "四年级", "上册", [
    ["观察表达", "写作方法", "看图写话前，第一步最应该先观察什么？", "图里的人物在做什么、在哪里", ["先背一段好词好句", "先把题目抄下来", "先只看图上的颜色"], "观察表达前要先看清人物、地点和主要活动。", 2],
    ["观察表达", "写作方法", "写操场活动图时，哪种顺序更容易说清楚？", "先整体看，再按从近到远说", ["看到什么就随便说什么", "只盯着一个人不看别处", "先写结尾再看图片"], "观察表达时先整体再局部，更容易把画面说明白。", 2],
    ["习作起步", "写作方法", "写《我的书桌》开头，哪一句更合适？", "我的书桌靠着窗户，上面整齐地摆着书和笔筒。", ["今天的天气真好。", "我最喜欢吃苹果。", "书桌是一种家具。"], "习作起步时，开头要先点明写作对象和主要样子。", 2],
    ["习作起步", "写作方法", "刚开始写一段话时，怎样更容易不跑题？", "先用一句话想清楚自己最想写什么", ["先把会写的字全都写上", "先写最后一句再说", "先抄一首古诗进去"], "起步写作前先确定中心，内容才不容易跑偏。", 2],
    ["细节描写", "写作方法", "想把“小猫很警觉”写具体，哪一句更合适？", "它竖起耳朵，眼睛紧紧盯着门口。", ["小猫是一只动物。", "它今天在院子里。", "门口有一双鞋。"], "细节描写要抓住动作和神情。", 2],
    ["细节描写", "写作方法", "想写“他跑得很快”，哪一句更具体？", "他一冲出去，鞋底像带起了一阵风。", ["他参加了跑步。", "操场很大。", "今天有很多同学。"], "把动作写具体，速度感会更强。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "四年级", "上册", [
    ["观察物体", "立体图形", "一个圆柱形水杯竖着放，从侧面看最可能看到什么图形？", "长方形", ["三角形", "梯形", "平行四边形"], "圆柱从侧面看通常是长方形。", 2],
    ["观察物体", "立体图形", "同一个正方体从不同方向看，最常看到什么图形？", "正方形", ["圆形", "三角形", "梯形"], "正方体每个面都是正方形，从正面、侧面等看过去常看到正方形。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "四年级", "下册", [
    ["成语理解", "成语理解", "“守口如瓶”最接近什么意思？", "嘴很严，不乱说秘密", ["说话声音很大", "做事特别慢", "走路十分轻快"], "“守口如瓶”形容说话谨慎，能保守秘密。", 2],
    ["成语理解", "成语理解", "“胸有成竹”最适合形容哪种状态？", "做事前已经很有把握", ["突然非常紧张", "完全不想努力", "一直犹豫不决"], "“胸有成竹”比喻做事前已经有了成熟的打算。", 2],
    ["因果关系", "关联词判断", "“因为道路湿滑，所以大家走得更慢。” 这句话前后是什么关系？", "前面说原因，后面说结果", ["前后并列", "前后转折", "前后选择"], "“因为……所以……”表示因果关系。", 2],
    ["因果关系", "关联词理解", "“树叶被风吹得沙沙响，所以大家知道风大起来了。” 结果是什么？", "大家知道风大起来了", ["树叶很绿", "风停下来了", "天马上黑了"], "句子里“所以”后面说的是结果。", 2],
    ["文言启蒙", "文言理解", "文言句子“学而不思则罔”里的“罔”最接近什么意思？", "迷惑，不明白", ["高兴", "勇敢", "安静"], "“罔”在这里指迷惑、没有收获。", 2],
    ["文言启蒙", "文言理解", "“三人行，必有我师焉”里的“师”最接近哪一项？", "值得学习的人", ["教室里的桌子", "走得最快的人", "年纪最大的人"], "这里的“师”指可以向他学习的人。", 2],
    ["写景表达", "写作方法", "写湖边清晨的景色，哪种顺序更合适？", "先写远处湖面，再写近处花草", ["想到哪里写到哪里", "只写一句“真美啊”", "只把景物名字排在一起"], "写景表达有顺序，画面才更清楚。", 2],
    ["写景表达", "写作方法", "想写雨后的校园，哪一句更有画面？", "操场边的树叶上还挂着亮晶晶的小水珠。", ["今天我们去上学。", "校园里有很多同学。", "学校有一面红旗。"], "写景要抓住能看见的小细节。", 2],
    ["细节描写", "写作方法", "写树叶飘落时，哪一句更具体？", "一片黄叶打着转，轻轻落在台阶边。", ["树上有叶子。", "秋天到了。", "地上很干净。"], "细节描写要把动作和样子写具体。", 2],
    ["细节描写", "写作方法", "想写妹妹害羞，哪一句更合适？", "她低着头，手指轻轻捏着衣角。", ["妹妹在教室里。", "妹妹今天上学。", "妹妹有一本书。"], "害羞这种状态，常通过动作和神情表现。", 2],
    ["习作方法", "写作方法", "把一次活动写完整，最适合先做什么？", "先理清活动的先后顺序", ["先写题目外的内容", "先把好词全堆在一起", "先删掉所有动作词"], "活动类习作要先把事情的顺序想清楚。", 2],
    ["习作方法", "写作方法", "修改习作时，先检查哪一项最有帮助？", "句子是否通顺、内容是否围绕主题", ["纸张是不是很白", "字写得是不是最大", "题目是不是最短"], "修改习作先看内容和语言是否合适。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "四年级", "下册", [
    ["质量单位", "单位换算", "3500 克等于多少千克？", "3.5 千克", ["35 千克", "0.35 千克", "350 千克"], "1000 克是 1 千克，所以 3500 克是 3.5 千克。", 2],
    ["质量单位", "单位换算", "一袋大米重 25 千克，约等于多少克？", "25000 克", ["2500 克", "250 克", "250000 克"], "1 千克是 1000 克，所以 25 千克是 25000 克。", 2],
    ["平行四边形", "平面图形", "平行四边形最明显的特点是什么？", "两组对边分别平行", ["四条边一定一样长", "四个角一定都是直角", "只有一组对边平行"], "平行四边形最明显的特点就是两组对边分别平行。", 2],
    ["平行四边形", "平面图形", "把长方形木框轻轻一拉，最可能变成什么图形？", "平行四边形", ["三角形", "圆形", "梯形"], "长方形木框拉斜后，常会变成平行四边形。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "四年级", "下册", [
    ["句子选择", "句子选择", "“今天天气暖和又晴朗。” 更合适的英文是哪一句？", "It is warm and sunny today.", ["It is a sunny pencil.", "Warm today are we.", "The weather likes apples."], "warm and sunny 可以表达“暖和又晴朗”。", 2],
    ["句子选择", "句子选择", "“书店在银行旁边。” 更合适的英文是哪一句？", "The bookshop is next to the bank.", ["The bank is reading a book.", "Next to bookshop bank the.", "The bookshop likes the bank."], "next to 表示“在……旁边”。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "五年级", "上册", [
    ["文言启蒙", "文言理解", "“学而时习之，不亦说乎”里的“说”最接近什么意思？", "愉快、高兴", ["说话", "解释", "赞美"], "这里的“说”通“悦”，表示愉快。", 2],
    ["文言启蒙", "文言理解", "“温故而知新”里的“故”最接近什么意思？", "学过的旧知识", ["很远的地方", "奇怪的故事", "新的发现"], "“温故”就是复习旧知识。", 2],
    ["记事表达", "写作方法", "写一次难忘的活动时，哪种安排更清楚？", "按事情发生的先后顺序写", ["把不同事情混在一起写", "只写一句结果", "每句话都换一个主题"], "记事表达时，事情顺序清楚最重要。", 2],
    ["记事表达", "写作方法", "想把一次比赛写完整，最合适的开头方式是哪一项？", "先交代时间、地点和参加的活动", ["先写最后谁赢了", "先写和比赛无关的风景", "先把结尾感受写三遍"], "记事开头先交代清楚事情背景。", 2],
    ["习作结构", "写作方法", "文章采用“总分总”结构时，开头通常要做什么？", "先总说要写的主要内容", ["先把细节全部写完", "先抄一句诗", "先只写最后一句"], "“总分总”结构开头常先总说。", 2],
    ["习作结构", "写作方法", "写一篇介绍景点的文章，哪种安排更清楚？", "先整体介绍，再分几方面具体写", ["一句写景，一句写人，完全不分层次", "从结尾开始倒着写", "只把景点名字重复很多遍"], "有层次的结构能让文章更清楚。", 2],
    ["场面描写", "写作方法", "想写操场上的欢呼声很热烈，哪一句更有场面感？", "一阵阵加油声像浪潮一样从跑道边涌了过来。", ["操场很大。", "今天星期三。", "学校有很多班级。"], "场面描写要抓住多人活动时的声音和气氛。", 2],
    ["场面描写", "写作方法", "写运动会开幕式，哪种内容最适合突出场面？", "队伍整齐入场、音乐响起、掌声不断", ["教室里有几张桌子", "书包里装了什么", "放学后吃什么饭"], "场面描写要写集体活动中的动态和气氛。", 2],
    ["细节描写", "写作方法", "想写老师认真批改作业，哪一句更具体？", "她俯下身子，一边圈画一边在旁边写下提醒。", ["老师坐在讲台前。", "作业本摆在桌上。", "教室里挂着钟表。"], "细节描写要把人物动作写具体。", 2],
    ["细节描写", "写作方法", "想写“妈妈很着急”，哪一句更合适？", "她一边看表，一边快步在门口来回走。", ["妈妈在家里。", "妈妈今天穿外套。", "门口有一盆花。"], "着急可以通过动作表现出来。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "五年级", "上册", [
    ["因数与倍数", "数字规律", "下面哪句话是正确的？", "24 是 8 的倍数", ["8 是 24 的倍数", "8 不是 24 的因数", "24 和 8 没关系"], "因为 24 ÷ 8 = 3，所以 24 是 8 的倍数。", 2],
    ["因数与倍数", "数字规律", "18 的一个因数是下面哪一个？", "6", ["5", "7", "11"], "18 ÷ 6 = 3，所以 6 是 18 的因数。", 2],
    ["2和5的倍数特征", "数字规律", "下面哪个数既是 2 的倍数，也是 5 的倍数？", "40", ["35", "22", "27"], "同时是 2 和 5 的倍数，个位必须是 0。", 2],
    ["2和5的倍数特征", "数字规律", "判断一个数是不是 5 的倍数，最方便看哪一位？", "个位", ["十位", "百位", "千位"], "是否是 5 的倍数，只要看个位是不是 0 或 5。", 2],
    ["质数与合数", "数字规律", "在 18、19、27 这三个数里，哪一个是质数？", "19", ["18", "21", "27"], "19 只有 1 和 19 两个因数，是质数。", 2],
    ["质数与合数", "数字规律", "下面哪个数是合数？", "21", ["2", "3", "5"], "21 除了 1 和 21 以外，还有 3 和 7 这两个因数，所以是合数。", 2],
    ["数的奇偶性", "数字规律", "一个奇数加一个偶数，和通常是什么数？", "奇数", ["偶数", "质数", "无法判断"], "奇数加偶数，结果通常是奇数。", 2],
    ["数的奇偶性", "数字规律", "两个奇数相加，结果通常是什么数？", "偶数", ["奇数", "质数", "一定是 1"], "两个奇数相加，结果通常是偶数。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "五年级", "上册", [
    ["常识词汇", "词义判断", "Which word is about a place for learning history?", "museum", ["noodle", "healthy", "weekend"], "museum 表示博物馆。", 2],
    ["常识词汇", "词义判断", "Which word means a useful thing for telling time?", "clock", ["garden", "quiet", "careful"], "clock 表示钟、时钟。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "五年级", "下册", [
    ["人物描写", "人物理解", "从“他咬着牙又站了起来”这句话中，最能看出人物什么品质？", "坚强不服输", ["特别贪玩", "非常胆小", "只喜欢安静"], "人物描写常通过动作表现人物性格。", 2],
    ["人物描写", "人物理解", "“她把伞往同学那边推了推，自己肩膀却淋湿了。” 最能表现人物什么品质？", "关心别人", ["爱发脾气", "做事马虎", "非常骄傲"], "通过动作可以看出人物关心他人。", 2],
    ["古诗积累", "古诗积累", "“欲穷千里目”的上一句是什么？", "白日依山尽", ["黄河入海流", "更上一层楼", "孤帆一片日边来"], "“白日依山尽，黄河入海流。欲穷千里目，更上一层楼。”", 2],
    ["古诗积累", "古诗积累", "“不识庐山真面目”的下一句是什么？", "只缘身在此山中", ["远近高低各不同", "横看成岭侧成峰", "欲把西湖比西子"], "这是《题西林壁》中的名句。", 2],
    ["传统文化", "传统文化", "重阳节人们常有哪种习俗？", "登高", ["赛龙舟", "赏月吃月饼", "贴春联"], "重阳节有登高等传统习俗。", 2],
    ["传统文化", "传统文化", "春节前夕人们常会做下面哪件事？", "贴春联", ["插柳踏青", "赛龙舟", "赏菊登高"], "贴春联是春节常见的传统活动。", 2],
    ["写人表达", "写作方法", "要把人物写鲜活，下面哪种方法更有效？", "抓住典型语言和动作来写", ["只重复写人物名字", "只写天气变化", "把景物写满一页"], "写人表达要抓住最能体现性格的细节。", 2],
    ["写人表达", "写作方法", "想让人物形象更鲜明，下面哪种做法更合适？", "写出他说话时的语气和表情", ["只写他穿什么颜色的衣服", "只写时间地点", "只写人物身高"], "人物语言、神情更能表现特点。", 2],
    ["写景表达", "写作方法", "写傍晚江边的景色时，哪种顺序更合适？", "从远处天空写到近处江面", ["想到哪儿写到哪儿", "只写一句感叹", "把景物名字全部并排写"], "写景表达常讲究顺序。", 2],
    ["写景表达", "写作方法", "想写江边晚霞很美，哪一句更有画面？", "晚霞把江面染成了金红色，风一吹，碎光轻轻晃动。", ["江边有人。", "今天我们散步。", "晚上的天色会变暗。"], "写景要抓住颜色、光线和动态。", 2],
    ["习作方法", "写作方法", "修改一篇作文时，先看哪一项最重要？", "内容有没有围绕主题展开", ["纸张是不是很厚", "题目是不是最短", "字是不是写得最大"], "习作方法里，修改时先看内容是否紧扣主题。", 2],
    ["习作方法", "写作方法", "写作文前列提纲最大的作用是什么？", "帮助安排材料和顺序", ["让字写得更整齐", "让作文篇幅更短", "让题目显得更难"], "提纲能帮助安排文章内容。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "五年级", "下册", [
    ["可能性", "数量统计", "盒子里有 6 支白色粉笔和 2 支黄色粉笔，任意拿 1 支，哪种颜色更容易拿到？", "白色粉笔", ["黄色粉笔", "两种一样容易", "一定拿不到白色粉笔"], "白色粉笔更多，所以拿到白色粉笔的可能性更大。", 2],
    ["可能性", "数量统计", "抛一枚硬币 1 次，下面哪种情况不可能发生？", "正反两面同时都朝上", ["正面朝上", "反面朝上", "硬币落到桌上"], "一次抛硬币不可能同时正反两面都朝上。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "五年级", "下册", [
    ["写话表达", "句子选择", "给同学写活动邀请，哪一句最适合作为开头？", "I'm going to join the school art show this Friday.", ["Friday is under the art room.", "School art show is a pencil.", "My class is Friday and blue."], "写话开头要把时间和计划说清楚。", 2],
    ["写话表达", "句子选择", "写一张小便条结尾表达期待，哪一句更合适？", "See you at the school gate!", ["Gate school the at you.", "I am a gate today.", "School gate is very busy."], "写话结尾可以用清楚自然的见面提醒。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "六年级", "上册", [
    ["文言句意", "文言理解", "“思援弓缴而射之”里的“援”最接近什么意思？", "拉，引", ["帮助", "原因", "归还"], "“援”在这里是拿起、拉开弓的意思。", 2],
    ["文言句意", "文言理解", "“虽与之俱学”的“俱”最接近哪一项？", "一起", ["马上", "已经", "认真"], "“俱”在这里表示一起、共同。", 2],
    ["习作结构", "写作方法", "写一篇有观点的发言稿时，哪种结构更清楚？", "先提出观点，再举例说明，最后总结", ["先写与主题无关的故事", "每段都换一个中心", "只写一个结尾句"], "观点类作文结构要清楚。", 2],
    ["习作结构", "写作方法", "写一篇活动倡议，开头最合适做什么？", "先说明倡议的主题和目的", ["先写最后的总结", "先写天气和风景", "先列出所有人的名字"], "倡议类文章开头要先点明中心。", 2],
    ["观点表达", "演讲写作", "在毕业分享会上提出建议，哪种说法更有说服力？", "先说观点，再说明理由和做法", ["只重复一句“我觉得很好”", "先讲很多无关故事", "一句话说三件不相关的事"], "观点表达要把观点和理由说清楚。", 2],
    ["观点表达", "演讲写作", "下面哪一句更像清楚表达自己的观点？", "我认为课间阅读角应该扩大，因为越来越多同学愿意借书。", ["阅读角里有很多书。", "今天下课十分钟。", "我昨天去图书馆。"], "表达观点时，要有明确判断和理由。", 2],
    ["重点描写", "写作方法", "写一场比赛时，最能突出重点的做法是什么？", "把最关键的几个镜头写具体", ["每一秒都平均写一样多", "只写比赛地点", "完全不写人物表现"], "重点描写要抓住最关键的部分。", 2],
    ["重点描写", "写作方法", "要突出人物第一次上台演讲的紧张，哪一句更合适？", "他握着稿纸的手微微发抖，声音起初也有些发颤。", ["他走上了讲台。", "讲台在教室前面。", "同学们都坐着。"], "重点描写要抓最能表现人物状态的细节。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "六年级", "上册", [
    ["扇形初步", "圆的认识", "把圆平均分成 8 份，其中 1 份最接近什么图形？", "扇形", ["长方形", "三角形", "正方形"], "圆的一部分由两条半径和一段弧围成，可以看作扇形。", 2],
    ["扇形初步", "圆的认识", "下列哪一项最像扇形？", "展开的折扇一小片", ["黑板表面", "数学书封面", "乒乓球"], "展开折扇的一小片最像扇形。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "六年级", "上册", [
    ["常识词汇", "词义判断", "Which word is about a person who drives a bus?", "driver", ["airport", "autumn", "careful"], "driver 表示司机。", 2],
    ["常识词汇", "词义判断", "Which word means a place where planes take off?", "airport", ["notebook", "science", "quiet"], "airport 表示机场。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "六年级", "下册", [
    ["词句品味", "词语体会", "“教室里静得连翻书声都听得见”这句话最想突出什么？", "教室特别安静", ["同学们都没带书", "教室面积很大", "大家马上要放学"], "通过细小声音反衬安静，是常见表达方法。", 2],
    ["词句品味", "词语体会", "“风一停，树叶像在认真听什么似的”这句话最想表现什么？", "周围一下子安静下来", ["树叶会说话", "风越来越大", "树叶变少了"], "把树叶写得像在倾听，是为了衬出环境安静。", 2],
    ["习作复习", "写作方法", "复习旧作文时，先做哪一步更合适？", "先回看常见问题，再有针对性修改", ["先把题目改成一样", "先把标点都删掉", "先只看字大不大"], "习作复习要先找到问题，再逐项改。", 2],
    ["习作复习", "写作方法", "复习写作时，下面哪种方法更有效？", "把以前老师提醒过的共性问题记下来", ["只挑最短的作文看", "每篇都不读只看分数", "只改第一页"], "复习习作要总结问题，形成自己的修改清单。", 2],
    ["写作思路", "写作方法", "写《毕业前的一件事》前先列提纲，主要是为了什么？", "让文章思路更清楚", ["让字写得更大", "让纸张更整齐", "让开头变得更短"], "提纲能帮助安排文章的思路。", 2],
    ["写作思路", "写作方法", "写“难忘的小学生活”时，先做哪件事更有帮助？", "先选出最能表现主题的几件事", ["先把所有学科都写一遍", "先写一大段天气", "先把题目画花边"], "先筛选材料，文章思路才容易集中。", 2],
    ["写人写事写景", "写作方法", "想写校园劳动日，下面哪种安排最能体现综合运用写法？", "先写同学劳动的样子，再用景物和感受把画面连起来", ["只把人名重复很多遍", "只写天气不给内容", "整篇只列几个词语"], "写人写事写景要学会把人物、事件和景物自然结合。", 2],
    ["写人写事写景", "写作方法", "想写毕业那天的校园生活，哪种安排更合适？", "先写人物活动，再穿插校园景色和自己的感受", ["只写操场面积多大", "只写树有几棵", "只把人物名字排成一列"], "综合表达时，要把人、事、景和感受结合起来。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "六年级", "下册", [
    ["表面积", "面积应用", "一个长方体礼盒长 6 厘米、宽 4 厘米、高 3 厘米，包彩纸时主要要算什么？", "六个面的总面积", ["只算一个面的面积", "只算体积", "只算最长的边"], "表面积就是物体外面所有面的面积总和。", 2],
    ["表面积", "面积应用", "给一个正方体礼物盒的六个面都贴纸，最需要知道什么？", "每个面的面积和一共有几个面", ["盒子里能装多少东西", "盒子有多重", "盒子是哪种颜色"], "贴满外面六个面，需要考虑表面积。", 2]
  ])
]);

const gradeFourToSixLowSupplyPriorityQuestions = buildQuestions([
  ...createKnowledgeRouteConfigs("语文", "四年级", "上册", [
    ["近义词辨析", "近义词", "想表达“草木长得很旺盛”，下面哪个词更合适？", "繁茂", ["零散", "缓慢", "清凉"], "“繁茂”更适合形容草木茂盛。", 2],
    ["近义词辨析", "近义词", "句子“夜晚的校园十分（ ）”里，下面哪个词最合适？", "宁静", ["匆忙", "拥挤", "尖锐"], "“宁静”更符合夜晚校园安静的情境。", 2],
    ["词语搭配", "词语搭配", "下面哪组搭配最恰当？", "清澈的湖水", ["勇敢的露珠", "安静地阳光", "整齐的鸟鸣"], "词语搭配要符合事物特点和语言习惯。", 2],
    ["词语运用", "词语运用", "下面哪句话中词语运用最恰当？", "一阵秋风吹过，树叶纷纷飘落下来。", ["铅笔在操场上散步。", "黑板高兴地跑远了。", "书包把窗户吃掉了。"], "词语运用要符合事物特点和实际语境。", 2],
    ["词语运用", "词语运用", "下面哪句话里“清脆”用得最合适？", "清晨传来一阵清脆的鸟叫声。", ["他写了一篇清脆的作文。", "操场很清脆。", "桌子上放着清脆的书本。"], "“清脆”常用来形容声音悦耳。", 2],
    ["比喻句", "比喻句", "下面哪一句是比喻句？", "弯弯的月亮像一只小船挂在天空。", ["月亮慢慢升起来了。", "今天晚上能看见月亮。", "月亮旁边有几颗星星。"], "把月亮比作小船，是典型的比喻。", 2],
    ["比喻句", "比喻句", "“阳光像金子一样洒满操场”这句话运用了什么修辞？", "比喻", ["拟人", "排比", "夸张"], "把阳光比作金子，运用了比喻。", 2],
    ["拟人句", "修辞判断", "下面哪一句是拟人句？", "小树在风中点头问好。", ["树叶从树上落下来。", "操场上有一棵小树。", "今天风有点大。"], "把小树写得像人一样会点头问好，是拟人。", 2],
    ["拟人句", "修辞判断", "“星星眨着眼睛望着我们”这句话主要运用了什么写法？", "把星星当成人来写", ["把星星当成数字来写", "把星星当成颜色来写", "把星星当成天气来写"], "“眨眼睛”是人的动作，这里运用了拟人。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "四年级", "上册", [
    ["大数认识", "数位认识", "九十万里面有几个十万？", "9 个十万", ["90 个十万", "900 个十万", "1 个十万"], "九十万就是 9 个十万。", 2],
    ["大数认识", "数位认识", "数字 5080000 读作什么？", "五百零八万", ["五十八万", "五百八十万", "五百零八"], "读大数时要按数级来读，5080000 读作五百零八万。", 2],
    ["数位顺序表", "数位认识", "在数字 4608300 中，数字 6 在什么位上？", "十万位", ["万位", "千位", "百万位"], "4608300 里，6 表示 6 个十万。", 2],
    ["数位顺序表", "数位认识", "百万位左边一位是什么位？", "千万位", ["十万位", "十亿位", "万位"], "整数数位顺序里，百万位左边一位是千万位。", 2],
    ["数的改写", "数位判断", "把 3200000 改写成以“万”为单位的数，应该写成什么？", "320 万", ["32 万", "3200 万", "3.2 万"], "3200000 里面有 320 个一万。", 2],
    ["数的改写", "数位判断", "470000 改写成以“万”为单位的数，应该写成什么？", "47 万", ["4.7 万", "470 万", "4700 万"], "470000 里面有 47 个一万。", 2],
    ["近似数", "近似数", "把 398760 省略万位后面的尾数，约是多少万？", "40 万", ["39 万", "398 万", "4 万"], "398760 接近 40 万。", 2],
    ["近似数", "近似数", "学校有 10098 人，精确到万位约是多少人？", "1 万人", ["10 万人", "2 万人", "10000 万人"], "10098 精确到万位约是 1 万。", 2],
    ["试商", "除法计算", "计算 326 除以 43 时，通常可以把 43 看作几十来试商？", "40", ["30", "50", "60"], "试商时常把 43 看作 40。", 2],
    ["试商", "除法计算", "计算 568 除以 79 时，把 79 看作 80 试商，商先试几比较合适？", "7", ["5", "6", "8"], "80 乘 7 约等于 560，所以先试 7 较合适。", 2],
    ["商的变化规律", "数字规律", "被除数和除数同时乘 10，商会怎样变化？", "商不变", ["商扩大 10 倍", "商缩小 10 倍", "无法确定"], "被除数和除数同时扩大相同倍数，商不变。", 2],
    ["商的变化规律", "数字规律", "已知 240 除以 12 等于 20，那么 2400 除以 120 等于多少？", "20", ["2", "200", "240"], "被除数和除数同时乘 10，商不变。", 2],
    ["角的认识", "角的认识", "角的大小主要和什么有关？", "两边张开的大小", ["边的长短", "颜色深浅", "顶点的位置高低"], "角的大小看两边张开的程度，不看边长。", 2],
    ["角的认识", "角的认识", "一个角有几个顶点和几条边？", "1 个顶点、2 条边", ["2 个顶点、1 条边", "1 个顶点、1 条边", "2 个顶点、2 条边"], "角由一个顶点和两条边组成。", 2],
    ["角的分类", "角度判断", "比直角大、比平角小的角叫什么角？", "钝角", ["锐角", "周角", "平角"], "钝角大于 90 度，小于 180 度。", 2],
    ["平行与垂直", "平面图形", "黑板的上下两条边最接近什么关系？", "互相平行", ["互相垂直", "相交成锐角", "没有关系"], "黑板的上下边距离处处相等，属于平行。", 2],
    ["平行与垂直", "平面图形", "墙角相交的两条边最接近什么关系？", "互相垂直", ["互相平行", "互不相交", "完全重合"], "墙角常形成直角，两条边互相垂直。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "四年级", "上册", [
    ["情景对话", "情景对话", "同学问你“Where is your bag?”，哪一句回答更合适？", "It's on the chair.", ["My bag is blue.", "She is my friend.", "Let's draw a kite."], "回答物品位置时，可以用 It's on ...。", 2],
    ["情景对话", "情景对话", "放学时同学对你说“See you tomorrow.”，你最合适怎么回答？", "See you!", ["I am a desk.", "Thank you, pencil.", "Open the window."], "日常告别时，See you! 是自然回应。", 2],
    ["句子选择", "句子选择", "“这是我的新教室。” 更合适的英文是哪一句？", "This is my new classroom.", ["This classroom are new.", "My new is this classroom.", "Classroom this my is."], "介绍事物时可以用 This is ...。", 2],
    ["句子选择", "句子选择", "“那些是三把椅子。” 更合适的英文是哪一句？", "Those are three chairs.", ["Those is three chairs.", "Three chairs is those.", "These are a chair."], "those 和复数名词搭配时，要用 are。", 2],
    ["日常问答", "情景对话", "别人问你“How many notebooks do you have?”，哪一句回答最合适？", "I have four notebooks.", ["It is a notebook.", "My notebook is red.", "She has a bag."], "回答数量时，可直接说 I have ...。", 2],
    ["词义判断", "词义判断", "Which word means “教室”?", "classroom", ["window", "teacher", "black"], "classroom 表示教室。", 2],
    ["数字单词", "数字单词", "下面哪个单词表示数字 18？", "eighteen", ["eighty", "eleven", "thirteen"], "eighteen 表示十八。", 2],
    ["数字单词", "数字单词", "下面哪个单词表示数字 40？", "forty", ["fourteen", "four", "fifty"], "forty 表示四十。", 2],
    ["句意理解", "句意理解", "“Open the window, please.” 这句话的意思最接近哪一项？", "请把窗户打开", ["请把门关上", "请把书拿来", "请坐在窗边"], "open the window 表示打开窗户。", 2],
    ["句意理解", "句意理解", "“Put the crayons on the desk.” 这句话的意思最接近哪一项？", "把蜡笔放在书桌上", ["把桌子搬到外面", "把铅笔放进盒子里", "把书包背起来"], "put ... on the desk 表示放到书桌上。", 2],
    ["短语理解", "短语理解", "短语“near the door”最接近什么意思？", "在门附近", ["在门里面", "从门后面出来", "把门打开"], "near 表示“在……附近”。", 2],
    ["短语理解", "短语理解", "短语“in the schoolbag”最接近什么意思？", "在书包里", ["在书包上面", "背着书包跑", "整理书包"], "in the schoolbag 表示在书包里面。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "四年级", "下册", [
    ["物品词汇", "单词认读", "Which word is about “雨伞”?", "umbrella", ["window", "garden", "lesson"], "umbrella 表示雨伞。", 2],
    ["句意理解", "句意理解", "“It's time for PE class.” 这句话最接近什么意思？", "到上体育课的时间了", ["现在该吃午饭了", "今天没有体育课", "老师正在办公室"], "It's time for ... 表示“到……时间了”。", 2],
    ["句意理解", "句意理解", "“My shoes are under the bed.” 这句话最接近什么意思？", "我的鞋在床下面", ["我的鞋在门外面", "我的鞋在书包里", "我的鞋是新的"], "under the bed 表示在床下面。", 2],
    ["词义判断", "词义判断", "Which word means “晴朗的”?", "sunny", ["cloud", "rain", "wind"], "sunny 表示晴朗的。", 2],
    ["词义判断", "词义判断", "Which word is about a place to buy books?", "bookshop", ["kitchen", "playground", "weather"], "bookshop 表示书店。", 2],
    ["短语理解", "短语理解", "短语“next to the library”最接近什么意思？", "在图书馆旁边", ["在图书馆里面", "离开图书馆", "走向图书馆"], "next to 表示“在……旁边”。", 2],
    ["短语理解", "短语理解", "短语“go home”最接近什么意思？", "回家", ["去上学", "打扫教室", "打开门"], "go home 表示回家。", 2],
    ["句子理解", "句子理解", "“The cap is on the teacher's desk.” 这句话告诉我们什么？", "帽子在老师的桌子上", ["帽子在老师头上", "老师在找帽子", "桌子在帽子下面"], "on the desk 表示在桌子上。", 2],
    ["阅读理解", "阅读理解", "阅读句子：Tom has a green bag and a blue pencil box. What color is Tom's bag?", "Green.", ["Blue.", "Red.", "Yellow."], "句子里直接说 Tom has a green bag。", 2],
    ["阅读理解", "阅读理解", "阅读句子：It is rainy today, so Lily takes her umbrella. What does Lily take?", "Her umbrella.", ["Her kite.", "Her football.", "Her ruler."], "下雨天 Lily 带了 umbrella。", 2],
    ["短文理解", "短文理解", "阅读短文：Lucy gets up at seven. She has breakfast at home and goes to school at eight. When does Lucy get up?", "At seven.", ["At six.", "At eight.", "At nine."], "短文第一句说 Lucy gets up at seven。", 2],
    ["短文理解", "短文理解", "阅读短文：Today is warm and sunny. Ben wears his T-shirt and goes to the park with his sister. Where does Ben go?", "To the park.", ["To the zoo.", "To the library.", "To the farm."], "短文里明确说 Ben goes to the park。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "四年级", "下册", [
    ["词语运用", "词语运用", "下面哪句话里“灵巧”用得最合适？", "小燕子张开灵巧的翅膀，在屋檐下轻快地穿梭。", ["操场很灵巧。", "黑板灵巧地站着。", "今天的天气很灵巧。"], "“灵巧”常用来形容动作轻快、机敏。", 2],
    ["词语运用", "词语运用", "下面哪一句里词语运用更恰当？", "雨后的空气格外清新，花坛里的月季显得更鲜艳了。", ["书包在操场上开花。", "铅笔高兴地唱着歌。", "桌椅在天空中散步。"], "词语运用要符合事物特点和语境。", 2],
    ["顺序关系", "顺序理解", "写一次春游活动时，下面哪种安排最清楚？", "先写出发，再写游玩经过，最后写返程感受", ["先写结尾，再随便插几件事", "想到哪儿写到哪儿", "只写一句“真开心”"], "按事情先后顺序写，内容会更清楚。", 2],
    ["顺序关系", "顺序理解", "“先把种子埋进土里，再浇水，最后把花盆放到阳光下。” 这段话主要按什么顺序写？", "先后顺序", ["空间顺序", "总分顺序", "因果顺序"], "句子按做事步骤依次展开，属于先后顺序。", 2],
    ["古诗积累", "古诗积累", "“儿童急走追黄蝶”的下一句是什么？", "飞入菜花无处寻", ["忙趁东风放纸鸢", "树头新绿未成阴", "唯有蜻蜓蛱蝶飞"], "这两句出自《宿新市徐公店》。", 2],
    ["古诗积累", "古诗积累", "“绿遍山原白满川”的下一句是什么？", "子规声里雨如烟", ["乡村四月闲人少", "飞入菜花无处寻", "门泊东吴万里船"], "这是《乡村四月》中的诗句。", 2],
    ["传统文化", "传统文化", "清明节人们常会做下面哪件事？", "扫墓、踏青", ["贴春联", "赛龙舟", "赏月吃月饼"], "清明节常见习俗是扫墓和踏青。", 2],
    ["传统文化", "传统文化", "下面哪项更接近中国传统二十四节气的内容？", "立春", ["圣诞节", "感恩节", "儿童节"], "立春是二十四节气之一。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "五年级", "上册", [
    ["词义理解", "词义理解", "句子“他站在门口四处打量”里的“打量”最接近什么意思？", "仔细地看", ["轻轻地说", "慢慢地走", "高声地笑"], "“打量”在这里是仔细观察的意思。", 2],
    ["近义词辨析", "近义词", "下面哪组词语最适合填入“夜晚的校园十分（ ）”这句话？", "安静", ["激动", "匆忙", "明亮"], "形容夜晚校园的状态，用“安静”更合适。", 2],
    ["近义词辨析", "近义词", "想表达“请求得很诚恳”，下面哪个词更合适？", "恳求", ["观看", "跳跃", "飘动"], "“恳求”比“请求”语气更诚恳。", 2],
    ["成语运用", "成语理解", "形容同学读书时非常专心，下面哪个成语最合适？", "聚精会神", ["东张西望", "乱七八糟", "心直口快"], "聚精会神形容注意力高度集中。", 2],
    ["词语运用", "词语运用", "下面哪一组搭配最恰当？", "温和的阳光", ["勇敢的石头", "整齐地风", "明亮地苹果"], "词语搭配要符合事物特点。", 2],
    ["词语运用", "词语运用", "下面哪一句里词语用得更恰当？", "清晨的薄雾慢慢散开，远处的山一点点清晰起来。", ["铅笔在操场上奔跑。", "课桌安静地唱歌。", "月亮把书包吃掉了。"], "词语运用要符合语境，不能随意搭配。", 2],
    ["古诗理解", "诗句理解", "“空山新雨后，天气晚来秋”描绘的最可能是哪种景象？", "雨后山林清新宁静的秋景", ["热闹的集市", "寒冷的大雪天", "烈日下的沙漠"], "诗句写的是山中雨后傍晚的秋景。", 2],
    ["古诗理解", "诗句理解", "《示儿》表达了诗人怎样的感情？", "对国家统一的深切期望", ["只想早点睡觉", "对春游的高兴", "对丰收的庆祝"], "《示儿》寄托了诗人强烈的爱国情感。", 2],
    ["传统文化", "传统文化", "中秋节人们常有哪项传统活动？", "赏月", ["赛龙舟", "插秧", "泼水"], "中秋节常见习俗是赏月、吃月饼。", 2],
    ["表达方法", "写作方法", "想突出人物心情紧张，哪种表达更有效？", "通过手心冒汗、说话变慢来表现", ["只写教室有几扇窗", "只写天气很热", "只写题目很长"], "表达方法上，可以借动作和状态来表现心情。", 2],
    ["表达方法", "写作方法", "想写夜晚操场特别安静，哪种方法更合适？", "写“连远处的脚步声都听得见”来衬托", ["只把“安静”重复三遍", "只写操场面积", "只写白天的热闹"], "用衬托的方法，能把安静写得更具体。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "五年级", "上册", [
    ["句子选择", "句子选择", "“明天我们要去博物馆。” 更合适的英文是哪一句？", "We are going to the museum tomorrow.", ["Tomorrow is a museum.", "We going tomorrow museum.", "The museum is tomorrow we."], "表达计划安排时，可以用 be going to。", 2],
    ["句意理解", "句意理解", "“Please line up near the school gate.” 这句话最接近什么意思？", "请在校门口附近排队", ["请把校门关上", "请去操场跑步", "请把书包放进教室"], "line up near the school gate 表示在校门口附近排队。", 2],
    ["句意理解", "句意理解", "“My brother often helps me with my homework.” 这句话最接近什么意思？", "我哥哥经常帮我做作业", ["我哥哥总是忘记作业", "我经常替哥哥写作业", "我和哥哥一起去操场"], "helps me with my homework 表示帮我做作业。", 2],
    ["阅读理解", "阅读理解", "阅读句子：Amy goes to the library every Friday afternoon. When does Amy go to the library?", "Every Friday afternoon.", ["Every Monday morning.", "Every Saturday evening.", "Every Sunday afternoon."], "句子里直接说明了去图书馆的时间。", 2],
    ["阅读理解", "阅读理解", "阅读句子：Mike likes science best because he loves doing small experiments. Why does Mike like science best?", "Because he loves doing small experiments.", ["Because he likes running.", "Because he wants a new bag.", "Because he is good at music."], "根据句子后半部分可以找到原因。", 2],
    ["短语理解", "短语理解", "短语“after school”最接近什么意思？", "放学后", ["在学校里面", "去上学的路上", "在课堂开始前"], "after school 表示放学后。", 2],
    ["短语理解", "短语理解", "短语“take a photo”最接近什么意思？", "拍一张照片", ["洗一件衣服", "带一本书", "画一幅地图"], "take a photo 表示拍照。", 2],
    ["句意判断", "句意判断", "句子“We should be quiet in the reading room.” 表达的意思正确吗？", "正确", ["错误", "不确定", "和句子无关"], "在阅览室要保持安静，这句话表达正确。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "五年级", "下册", [
    ["词语感情色彩", "词语感情色彩", "下面哪个词更带有赞美的感情色彩？", "慈祥", ["冷淡", "迟疑", "平常"], "“慈祥”常用来赞美人物神态温和可亲。", 2],
    ["修辞运用", "修辞判断", "“小草悄悄探出了脑袋”这句话运用了什么写法？", "拟人", ["排比", "设问", "对偶"], "把小草写得像人一样探出脑袋，运用了拟人。", 2],
    ["修辞运用", "修辞判断", "“太阳像一个大火球挂在天上”主要运用了什么修辞？", "比喻", ["夸张", "排比", "设问"], "把太阳比作大火球，运用了比喻。", 2],
    ["比喻句", "比喻句", "下面哪一句是比喻句？", "校园里的银杏叶像一把把小扇子。", ["银杏叶落了一地。", "今天校园里很安静。", "同学们在树下看书。"], "把银杏叶比作小扇子，是比喻。", 2],
    ["比喻句", "比喻句", "“她的歌声像泉水一样清亮”这句话把什么比作了泉水？", "歌声", ["校园", "泉水", "太阳"], "句子把歌声比作泉水，突出声音清亮。", 2],
    ["排比句", "修辞判断", "下面哪一句是排比句？", "这里有高高的树，有清清的水，有热闹的笑声。", ["树上停着一只鸟。", "今天的天气很好。", "我喜欢看书。"], "三个结构相近的分句并列出现，是排比。", 2],
    ["排比句", "修辞判断", "“我爱读书，因为它让我增长知识，因为它让我开阔眼界，因为它让我学会思考。” 这句话主要运用了什么修辞？", "排比", ["比喻", "夸张", "反问"], "连续三个“因为它让我……”构成排比。", 2],
    ["文言句意", "文言理解", "“梁国杨氏子九岁，甚聪惠”里的“甚”最接近什么意思？", "很，非常", ["正在", "于是", "刚刚"], "“甚”在这里表示很、非常。", 2],
    ["文言句意", "文言理解", "“孔指以示儿曰”里的“示”最接近什么意思？", "给……看", ["思考", "离开", "寻找"], "“示”在这里是指给孩子看。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "五年级", "下册", [
    ["情景对话", "情景对话", "想邀请同学周末一起去图书馆，哪一句更合适？", "Would you like to go to the library with me this weekend?", ["The library is a blue book.", "I weekend a library go.", "She goes to school at seven."], "邀请别人一起去某地时，可以用 Would you like to ...?", 2],
    ["短语理解", "短语理解", "短语“be late for class”最接近什么意思？", "上课迟到", ["提前下课", "整理教室", "在教室里读书"], "be late for class 表示上课迟到。", 2],
    ["短语理解", "短语理解", "短语“help with housework”最接近什么意思？", "帮忙做家务", ["整理书包", "参加运动会", "去医院看病"], "help with housework 表示帮忙做家务。", 2],
    ["句意理解", "句意理解", "“We will have a school trip next Friday.” 这句话最接近什么意思？", "下周五我们将有一次学校出游", ["下周五我们要参加考试", "下周五我们要打扫教室", "下周五我们要开家长会"], "school trip 表示学校组织的出游活动。", 2],
    ["阅读理解", "阅读理解", "阅读句子：Lucy usually waters the flowers after dinner. What does Lucy usually do after dinner?", "She waters the flowers.", ["She cleans the blackboard.", "She rides a bike.", "She watches a football game."], "句子里直接说明了 Lucy 晚饭后做的事情。", 2],
    ["阅读理解", "阅读理解", "阅读句子：Jack wants to be a doctor because he likes helping sick people. Why does Jack want to be a doctor?", "Because he likes helping sick people.", ["Because he likes drawing maps.", "Because he wants a new bike.", "Because he likes rainy days."], "根据 because 后面的内容可以找到原因。", 2],
    ["句型替换", "句型判断", "Which sentence says the same as “She is good at dancing”?", "She dances very well.", ["She dance in the park.", "She is a dance teacher book.", "She can to dancing."], "be good at dancing 和 dances very well 都表示擅长跳舞。", 2],
    ["句型替换", "句型判断", "Which sentence says the same as “We should leave now”?", "It's time for us to go now.", ["We now a classroom.", "Leave is our school.", "We should now a bag."], "两句话都表达“我们现在该走了”的意思。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "六年级", "上册", [
    ["词句品味", "词语体会", "“风从操场尽头吹来，带着一点点秋天的凉意。” 这句话最想营造什么感觉？", "环境清新又带着淡淡离愁", ["天气非常炎热", "操场上特别拥挤", "同学们正在大声争吵"], "词句品味要体会句子里的画面和情绪。", 2],
    ["修辞作用", "修辞作用", "“掌声像潮水一样一阵阵涌来”这句比喻有什么作用？", "把掌声热烈的场面写得更生动", ["说明操场上真的有海水", "表示同学们都去游泳了", "只是交代了天气变化"], "修辞作用常体现在让场景更具体、更有感染力。", 2],
    ["句子理解", "句子理解", "“他嘴上说着轻松，手却把演讲稿捏出了褶皱。” 这句话主要说明什么？", "他其实有些紧张", ["他不喜欢这张纸", "他想把稿纸撕掉", "他已经完全忘词了"], "通过动作可以看出人物真实状态。", 2],
    ["表达效果", "句子理解", "“六年的时光从指缝间悄悄溜走”这句话的表达效果是什么？", "把时间过得快写得更形象", ["说明手指很长", "表示时间可以看见", "只是介绍一个动作"], "这种说法能把抽象的“时间流逝”写得更具体。", 2],
    ["表达方法", "写作方法", "想突出毕业典礼庄重又温暖，哪种写法更合适？", "把现场布置、掌声和人物神情结合起来写", ["只写礼堂有多少椅子", "只把“感动”重复很多遍", "只写天气预报"], "表达方法上，可以综合场景和人物来表现氛围。", 2],
    ["表达方法", "写作方法", "写毕业留言时，哪种方式更容易打动人？", "结合具体回忆来表达感谢和祝福", ["只写很多感叹号", "只写对方的名字", "只抄一段课文"], "有具体回忆的表达会更真切、更有感染力。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "六年级", "上册", [
    ["句子选择", "句子选择", "“我们应该先听听大家的意见。” 更合适的英文是哪一句？", "We should listen to everyone's ideas first.", ["We everyone ideas first.", "Should we first are ideas.", "Everyone is a first idea."], "表达“应该先听意见”时，可以用 should listen to ... first。", 2],
    ["句子选择", "句子选择", "“如果你需要帮助，请给我打电话。” 更合适的英文是哪一句？", "Please call me if you need help.", ["Help needs a phone call.", "If help call is me.", "You are help on the phone."], "这句话要把“如果需要帮助”和“请给我打电话”表达完整。", 2],
    ["句意理解", "句意理解", "“The meeting has been put off until next Monday.” 这句话最接近什么意思？", "会议推迟到下周一举行", ["会议已经在今天结束", "会议改到昨天举行", "会议在周一早上开始上课"], "put off until next Monday 表示推迟到下周一。", 2],
    ["句意理解", "句意理解", "“I was too nervous to say a word at first.” 这句话最接近什么意思？", "我一开始紧张得一句话也说不出来", ["我一开始说了很多话", "我一开始特别高兴", "我一开始在教室里跑步"], "too nervous to say a word 表示紧张得说不出话。", 2],
    ["短文理解", "短文理解", "短文：Linda made a study plan for the summer holiday. She will read for an hour every morning and practice spoken English every evening. What will Linda do every evening?", "Practice spoken English.", ["Read history books.", "Play table tennis.", "Visit her grandparents."], "根据短文可知，Linda 每天晚上练习英语口语。", 2],
    ["短文理解", "短文理解", "短文：Tom joined a volunteer group last month. On weekends he helps clean the park and sort rubbish. What does Tom usually do on weekends?", "He helps clean the park and sort rubbish.", ["He learns to swim.", "He sells storybooks.", "He watches films at home."], "短文直接说明了 Tom 周末的活动。", 2],
    ["阅读理解", "阅读理解", "阅读句子：Jenny will visit her aunt in Shanghai during the winter holiday. Where will Jenny go during the winter holiday?", "Shanghai.", ["Beijing.", "Sanya.", "Xi'an."], "句子里明确提到她要去 Shanghai。", 2],
    ["阅读理解", "阅读理解", "阅读句子：The art show starts at three o'clock, so we need to arrive before half past two. When do we need to arrive?", "Before half past two.", ["At three o'clock.", "After four o'clock.", "At half past three."], "根据 so 后面的内容可以确定到达时间。", 2],
    ["句意判断", "句型判断", "句子“We'd better leave early to catch the train.” 表达的意思正确吗？", "正确", ["错误", "不确定", "和句子无关"], "We'd better leave early 表示最好早点出发，句意表达正确。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "六年级", "上册", [
    ["分数应用", "分数应用", "一本故事书有 60 页，已经看了全书的三分之一，已经看了多少页？", "20 页", ["15 页", "30 页", "40 页"], "60 的三分之一是 20。", 2],
    ["倒数", "分数计算", "八分之五的倒数是多少？", "五分之八", ["八分之五", "八分之三", "十三分之五"], "交换分子和分母，就得到倒数。", 2],
    ["倒数", "分数计算", "四分之一的倒数是多少？", "4", ["1", "四分之一", "四分之四"], "四分之一和 4 相乘等于 1。", 2],
    ["圆的周长", "圆的周长", "要求一个圆的周长，最常用的公式是哪一个？", "周长等于 2 乘圆周率乘半径", ["周长等于长乘宽", "周长等于底面积乘高", "周长等于半径加半径"], "圆的周长公式是 C=2πr。", 2],
    ["圆的面积", "圆的面积", "要求一个圆的面积，先要知道什么？", "圆的半径", ["圆的颜色", "圆所在的页码", "圆旁边有什么图形"], "圆面积公式是 S=πr^2，先要知道半径。", 2],
    ["圆的面积", "圆的面积", "半径是 2 厘米的圆，面积最接近下面哪一项？", "4π 平方厘米", ["2π 平方厘米", "8π 平方厘米", "16π 平方厘米"], "面积等于 π 乘 2 的平方，也就是 4π。", 2],
    ["百分数意义", "百分数", "“一批作业完成了 80%”最接近下面哪句话？", "100 份里大约完成了 80 份", ["已经全部完成", "只完成了 8 份", "完全没有开始"], "百分数表示把总量看成 100 份。", 2],
    ["百分数应用", "百分数应用", "一件商品原价 100 元，打九折后现价是多少元？", "90 元", ["10 元", "80 元", "110 元"], "九折就是按原价的 90% 计算。", 2],
    ["比值", "比的应用", "6 比 9 的比值是多少？", "三分之二", ["二分之三", "15", "3"], "比值就是前项除以后项，6 除以 9 等于三分之二。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "六年级", "下册", [
    ["分数应用", "分数应用", "一根彩带用了全长的五分之三，还剩全长的几分之几？", "五分之二", ["五分之一", "五分之三", "十分之三"], "1 减去五分之三，等于五分之二。", 2],
    ["分数应用", "分数应用", "一盒彩笔有 48 支，其中八分之三是红色，红色彩笔有多少支？", "18 支", ["12 支", "16 支", "24 支"], "48 乘八分之三，等于 18。", 2],
    ["倒数", "分数计算", "七分之三的倒数是多少？", "三分之七", ["七分之三", "十分之三", "四分之七"], "交换分子和分母后得到倒数。", 2],
    ["倒数", "分数计算", "整数 2 的倒数是多少？", "二分之一", ["2", "1", "三分之一"], "2 和二分之一相乘等于 1。", 2],
    ["正比例初步", "应用判断", "单价一定时，总价和数量成什么比例？", "正比例", ["反比例", "没有关系", "先正后反"], "单价不变时，买得越多，总价按相同倍数增加。", 2],
    ["反比例初步", "应用判断", "路程一定时，速度和时间成什么比例？", "反比例", ["正比例", "没有关系", "相等关系"], "速度越快，所用时间越少，两者成反比例。", 2],
    ["圆柱认识", "圆柱认识", "圆柱有几个大小相等的底面？", "2 个", ["1 个", "3 个", "4 个"], "圆柱有上下两个完全相同的圆形底面。", 2],
    ["圆柱认识", "圆柱认识", "圆柱的侧面展开后，最常见得到什么图形？", "长方形", ["三角形", "圆形", "平行四边形"], "圆柱侧面沿高展开，通常得到长方形。", 2],
    ["圆柱体积", "圆柱体积", "求圆柱体积最常用的公式是哪一个？", "底面积乘高", ["长乘宽", "周长乘高", "底面积加高"], "圆柱体积公式是 V=Sh。", 2],
    ["圆柱体积", "圆柱体积", "一个圆柱的底面积是 10 平方厘米，高是 4 厘米，它的体积是多少？", "40 立方厘米", ["14 立方厘米", "20 立方厘米", "400 立方厘米"], "圆柱体积等于底面积乘高，10 乘 4 等于 40。", 2],
    ["统计整理", "统计整合", "统计全班最喜欢的运动项目时，第一步最适合做什么？", "先收集每个人的数据", ["直接猜哪个最多", "先画图再说", "先把黑板擦干净"], "做统计前，先要收集真实数据。", 2],
    ["统计整理", "统计整合", "整理一周气温数据时，哪种做法更合适？", "按日期记录并制成表格", ["把数字随便写在纸角", "只记最高的一天", "先不看数据直接下结论"], "统计整理要按顺序记录，方便比较。", 2],
    ["折线统计图", "图表分析", "折线统计图最适合用来观察什么？", "数量的变化趋势", ["物体的颜色", "文字的笔画", "教室的面积"], "折线统计图最擅长表现数量的增减变化。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "四年级", "下册", [
    ["三角形分类", "三角形认识", "有一个三角形的三条边分别是 5 厘米、5 厘米、7 厘米，这是什么三角形？", "等腰三角形", ["等边三角形", "直角三角形", "没有名字的三角形"], "有两条边相等的三角形是等腰三角形。", 2],
    ["三角形分类", "三角形认识", "按角来分，一个三角形里有一个直角，它属于什么三角形？", "直角三角形", ["锐角三角形", "等边三角形", "平行四边形"], "有一个直角的三角形叫直角三角形。", 2],
    ["三角形特性", "三角形认识", "三角形最稳定，下面哪种地方最常利用这一点？", "自行车车架", ["圆形钟面", "长方形课桌面", "橡皮表面"], "三角形具有稳定性，所以常用在支架和车架上。", 2],
    ["三角形特性", "三角形认识", "任意一个三角形都有几条边和几个角？", "3 条边、3 个角", ["2 条边、3 个角", "3 条边、2 个角", "4 条边、4 个角"], "三角形由 3 条边和 3 个角组成。", 2],
    ["图形认识", "三角形认识", "下面哪个图形一定有三条边？", "三角形", ["长方形", "圆形", "平行四边形"], "三角形最明显的特点就是有三条边。", 2],
    ["图形认识", "角的认识", "一个图形有四条边、四个角，其中四个角都是直角，这个图形最像什么？", "长方形", ["三角形", "圆形", "扇形"], "有四条边和四个直角的图形是长方形。", 2],
    ["平均数", "平均数", "4 个同学跳绳成绩分别是 8 下、10 下、12 下、10 下，他们的平均成绩是多少下？", "10 下", ["8 下", "9 下", "12 下"], "把总数相加后再平均，(8+10+12+10)÷4=10。", 2]
  ]),
  ...createKnowledgeRouteConfigs("数学", "五年级", "上册", [
    ["小数大小比较", "小数比较", "下面哪个数最大？", "3.56", ["3.5", "3.506", "3.49"], "比较小数大小时，先比整数部分，再比小数部分。", 2],
    ["小数减法", "小数减法", "8.4 - 2.7 等于多少？", "5.7", ["6.1", "5.3", "4.7"], "计算小数减法时，要把小数点对齐。", 2],
    ["小数减法", "小数减法", "一根彩带长 6.5 米，用去了 1.8 米，还剩多少米？", "4.7 米", ["5.3 米", "4.3 米", "3.7 米"], "6.5 减去 1.8 等于 4.7。", 2]
  ]),
  ...createKnowledgeRouteConfigs("语文", "六年级", "下册", [
    ["信息整合", "信息提取", "阅读通知：周五下午两点，全体毕业生到报告厅参加演讲彩排。下面哪项信息正确？", "周五下午两点到报告厅集合", ["周五上午两点到操场集合", "周四下午到报告厅开运动会", "周五下午两点在教室考试"], "信息整合要先抓住时间、地点和事件。", 2],
    ["表达方法", "写作方法", "想突出毕业离别时的不舍，哪种写法更合适？", "通过人物动作和环境描写一起烘托心情", ["只写天气热不热", "只把“舍不得”重复三遍", "只写操场面积有多大"], "表达方法可以借动作和环境共同表现情感。", 2],
    ["语言赏析", "词语体会", "“操场上的风轻轻掠过脸庞，像一句没说完的告别。” 这句话好在哪里？", "把风写得有感情，烘托了离别气氛", ["说明风特别大", "只是在介绍天气", "表示操场很拥挤"], "语言赏析要体会句子里的画面感和情感。", 2],
    ["修辞作用", "修辞作用", "“六年的时光像一本翻得飞快的书”这句比喻有什么作用？", "把时光过得快写得更具体生动", ["说明书本很重", "表示教室里书很多", "只是在介绍一本新书"], "修辞作用要看它怎样帮助表达意思和情感。", 2],
    ["古诗文复习", "古诗积累", "“随风潜入夜”的下一句是什么？", "润物细无声", ["花重锦官城", "当春乃发生", "野径云俱黑"], "这两句出自杜甫《春夜喜雨》。", 2],
    ["古诗文复习", "古诗积累", "“粉骨碎身浑不怕”的下一句是什么？", "要留清白在人间", ["任尔东西南北风", "只缘身在此山中", "更上一层楼"], "这是《石灰吟》中的名句。", 2],
    ["文言句意", "文言理解", "“及其日中如探汤”里的“汤”最接近什么意思？", "热水", ["米饭", "河流", "太阳"], "文中的“汤”是热水的意思。", 2],
    ["文言句意", "文言理解", "“为是其智弗若与”里的“弗若”最接近什么意思？", "不如", ["非常像", "已经到了", "重新开始"], "“弗若”表示不如、比不上。", 2]
  ]),
  ...createKnowledgeRouteConfigs("英语", "六年级", "下册", [
    ["活动安排", "活动安排", "班级计划周六上午去养老院做志愿服务，下面哪项最可能是活动安排？", "Meet at the school gate at 8:00 a.m.", ["Read a story under the desk.", "Paint the gate blue at home.", "Watch TV in the bedroom."], "活动安排常包含集合时间和地点。", 2],
    ["活动安排", "活动安排", "如果英语夏令营下午两点开始，下面哪一句最适合作为提醒？", "Don't be late for the camp at 2:00 p.m.", ["The camp is a big library.", "Two o'clock is a nice pencil.", "We are on a camp desk."], "活动提醒要把时间和事项说清楚。", 2],
    ["句子选择", "句子选择", "“我们最好先把任务分清楚。” 更合适的英文是哪一句？", "We'd better make the tasks clear first.", ["We first task a clear.", "Better we are tasks now.", "Tasks is better on the desk."], "表达“最好先……”时，可以用 We'd better ... first。", 2],
    ["短语理解", "短语理解", "短语“hand in the report”最接近什么意思？", "上交报告", ["查阅报告", "撕掉报告", "抄写报告"], "hand in 表示上交。", 2],
    ["短语理解", "短语理解", "短语“look through the notes”最接近什么意思？", "浏览笔记", ["借出笔记", "扔掉笔记", "装订笔记"], "look through 表示浏览、快速查看。", 2],
    ["短文理解", "短文理解", "短文：Sara is preparing for middle school. She gets up early, reviews math in the morning, and reads English articles before bed. What does Sara do before bed?", "She reads English articles.", ["She plays tennis.", "She visits her teacher.", "She cleans the classroom."], "短文最后一句说明了 Sara 睡前做的事。", 2],
    ["短文理解", "短文理解", "短文：David made a list for the graduation party. He needs to prepare songs, check the lights, and welcome guests at the door. What will David do at the door?", "Welcome guests.", ["Draw a map.", "Read a science book.", "Practice basketball."], "根据短文，David 在门口负责迎接客人。", 2],
    ["句型复习", "句型判断", "Which sentence says the same as “It is time for us to start”?", "We should start now.", ["We start a schoolbag.", "Time is on the wall.", "Us are time to start."], "两句话都表示“我们该开始了”。", 2]
  ])
]);

const legacyQuestions = [
  ...buildSubjectQuestions("语文", chineseQuestionConfigs),
  ...buildSubjectQuestions("语文", chineseExtraQuestionConfigs),
  ...buildSubjectQuestions("数学", mathQuestionConfigs),
  ...buildSubjectQuestions("数学", mathExtraQuestionConfigs),
  ...buildSubjectQuestions("英语", englishQuestionConfigs),
  ...buildSubjectQuestions("英语", englishExtraQuestionConfigs)
].filter((question) => question.grade !== "一年级");

const gradeOneUpperStageOneChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "看图起步", [
    ["数一数", "看图数一数，盘子里一共有几个苹果？", "3个", ["2个", "4个", "5个"], "图里一共能看到3个苹果。", 1, "/images/challenge/g1-upper-stage1/apples-3.svg"],
    ["大小比较", "看图比一比，数字卡片里最小的数是哪一个？", "2", ["5", "7", "一样大"], "2比5和7都小。", 1, "/images/challenge/g1-upper-stage1/number-cards-2-7-5.svg"],
    ["位置", "看图判断，小狗在小兔的哪边？", "右边", ["左边", "前面", "后面"], "图里小兔在左，小狗在右，所以小狗在小兔右边。", 1, "/images/challenge/g1-upper-stage1/rabbit-dog-left-right.svg"]
  ]),
  ...createGradeOneChallengeConfigs("语文", "看图起步", [
    ["识字应用", "看图认字，表示这只耳朵的汉字是哪一个？", "耳", ["目", "口", "手"], "耳朵对应的汉字是“耳”。", 1, "/images/challenge/g1-upper-stage1/ear.svg"],
    ["课文理解", "看图判断，我们的国旗叫什么？", "五星红旗", ["彩旗", "队旗", "小红旗"], "图里是五星红旗。", 1, "/images/challenge/g1-upper-stage1/china-flag.svg"],
    ["词语搭配", "看图填词，下面哪个词最适合填“红红的（ ）”？", "苹果", ["天空", "月亮", "河水"], "图里是一个红红的苹果。", 1, "/images/challenge/g1-upper-stage1/red-apple.svg"]
  ])
];

const gradeOneUpperStageTwoChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "顺序跟答", [
    ["数的顺序", "按顺序填数：6、7、8、（ ）", "9", ["5", "10", "11"], "按顺序数，8后面是9。", 1, "/images/challenge/g1-upper-stage2/numbers-6-7-8-9.svg"],
    ["数的顺序", "从10往后数，第3个数是几？", "13", ["11", "12", "14"], "10后面依次是11、12、13。", 1, "/images/challenge/g1-upper-stage2/numbers-after-10.svg"],
    ["几个和第几个", "5个小朋友排队，小兰排第2，她前面有几人？", "1人", ["2人", "3人", "4人"], "排第2说明前面有1人。", 1, "/images/challenge/g1-upper-stage2/queue-second.svg"],
    ["位置", "小明站在队伍第4个位置，他前面有几人？", "3人", ["2人", "4人", "5人"], "第4个位置前面有3人。", 1, "/images/challenge/g1-upper-stage2/queue-fourth.svg"],
    ["找规律", "按顺序摆：红、黄、红、黄、红、（ ）", "黄", ["红", "蓝", "绿"], "颜色按红、黄重复出现，所以后面是黄。", 1, "/images/challenge/g1-upper-stage2/red-yellow-pattern.svg"]
  ]),
  ...createGradeOneChallengeConfigs("语文", "顺序跟答", [
    ["声母认读", "按顺序读声母：b、p、m、f、（ ）", "d", ["a", "o", "i"], "声母顺序里，f后面是d。", 1, "/images/challenge/g1-upper-stage2/shengmu-bpmfd.svg"],
    ["韵母认读", "按顺序读单韵母：a、o、e、（ ）", "i", ["u", "b", "m"], "单韵母顺序里，e后面是i。", 1, "/images/challenge/g1-upper-stage2/yunmu-aoei.svg"],
    ["课文理解", "《影子》里，前一句是“影子在前”，下一句是什么？", "影子在后", ["影子在左", "影子在上", "影子不见了"], "课文里写“影子在前，影子在后”。", 1, "/images/challenge/g1-upper-stage2/shadow-front-back.svg"],
    ["标点符号", "一句话还没说完，中间轻轻停一下，常用哪个标点？", "逗号", ["句号", "问号", "感叹号"], "句子中间短暂停顿，常用逗号。", 1, "/images/challenge/g1-upper-stage2/comma-pause.svg"],
    ["量词运用", "给“小鸟”选量词，一（ ）小鸟最合适？", "只", ["条", "本", "朵"], "小鸟通常用“只”来搭配。", 1, "/images/challenge/g1-upper-stage2/one-bird.svg"]
  ])
];

const gradeOneUpperStageThreeChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "数量找友", [
    ["数的组成", "14和哪个数合起来能凑成20？", "6", ["4", "5", "7"], "14再加6就是20。", 2, "/images/challenge/g1-upper-stage3/make-20-from-14.svg"],
    ["数的分解", "把15分成10和另一个数，另一个数是几？", "5", ["4", "6", "10"], "15可以分成10和5。", 2, "/images/challenge/g1-upper-stage3/split-15.svg"],
    ["数位认识", "20是由几个十组成的？", "2个十", ["1个十", "2个一", "20个一"], "20由2个十组成。", 2, "/images/challenge/g1-upper-stage3/two-tens.svg"],
    ["数位认识", "17里面，个位上的数是几？", "7", ["1", "10", "17"], "17的个位上是7。", 2, "/images/challenge/g1-upper-stage3/number-17.svg"],
    ["数的组成", "1个十和8个一组成几？", "18", ["10", "17", "28"], "1个十和8个一组成18。", 2, "/images/challenge/g1-upper-stage3/ten-and-eight.svg"]
  ]),
  ...createGradeOneChallengeConfigs("语文", "数量找友", [
    ["书写规范", "写字时，两只脚怎样放更合适？", "平放地面", ["翘在椅子上", "踩在桌脚上", "一前一后乱摆"], "写字时坐姿要端正，双脚平放更合适。", 2, "/images/challenge/g1-upper-stage3/sit-posture-feet.svg"],
    ["量词运用", "下面哪个量词最适合“一（ ）星星”？", "颗", ["条", "本", "把"], "星星通常用“颗”来搭配。", 2, "/images/challenge/g1-upper-stage3/one-star.svg"],
    ["笔画数", "汉字“田”一共有几画？", "5画", ["4画", "6画", "7画"], "“田”共有5画。", 2, "/images/challenge/g1-upper-stage3/character-tian.svg"],
    ["量词运用", "下面哪个量词最适合“一（ ）豆子”？", "粒", ["条", "把", "本"], "豆子通常用“粒”来搭配。", 2, "/images/challenge/g1-upper-stage3/one-bean.svg"],
    ["词语理解", "“一群小鸟”里的“群”最能说明什么？", "数量很多", ["只有一只", "没有数量", "只有两只"], "“群”通常表示数量比较多。", 2, "/images/challenge/g1-upper-stage3/flock-birds.svg"]
  ])
];

const gradeOneUpperStageFourChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "短句抓点", [
    ["解决问题", "妈妈买来13个橘子，上午吃了4个，下午又吃了3个，还剩多少个？", "6个", ["5个", "7个", "8个"], "13 - 4 - 3 = 6，所以还剩6个。", 2, "/images/challenge/g1-upper-stage4/oranges-13-minus-4-minus-3.svg"],
    ["解决问题", "小亮做了11道题，对了8道，错了几道？", "3道", ["2道", "4道", "5道"], "11 - 8 = 3，所以错了3道。", 2, "/images/challenge/g1-upper-stage4/questions-11-correct-8.svg"],
    ["解决问题", "操场上有7个男生和5个女生，一共有多少人？", "12人", ["10人", "11人", "13人"], "7 + 5 = 12，所以一共有12人。", 2, "/images/challenge/g1-upper-stage4/boys-7-girls-5.svg"],
    ["数位认识", "19里面十位上的数是几？", "1", ["9", "10", "19"], "19的十位上是1。", 2, "/images/challenge/g1-upper-stage4/number-19.svg"],
    ["数的组成", "12再添上8，一共是多少？", "20", ["18", "19", "21"], "12加8等于20。", 2, "/images/challenge/g1-upper-stage4/12-plus-8.svg"],
    ["找规律", "按规律填数：5、10、15、20、（ ）", "25", ["22", "24", "30"], "这些数每次增加5，所以后面是25。", 2, "/images/challenge/g1-upper-stage4/pattern-5-10-15-20.svg"],
    ["解决问题", "文具盒里有14支铅笔，借给同学5支，还剩多少支？", "9支", ["8支", "10支", "11支"], "14 - 5 = 9，所以还剩9支。", 2, "/images/challenge/g1-upper-stage4/pencils-14-minus-5.svg"],
    ["解决问题", "图书角有16本故事书，拿走7本，还剩多少本？", "9本", ["8本", "10本", "11本"], "16 - 7 = 9，所以还剩9本。", 2, "/images/challenge/g1-upper-stage4/books-16-minus-7.svg"],
    ["数位认识", "17里面个位上的数是几？", "7", ["1", "10", "17"], "17的个位上是7。", 2, "/images/challenge/g1-upper-stage4/number-17-stage4.svg"],
    ["找规律", "按规律填数：2、6、10、14、（ ）", "18", ["16", "17", "20"], "这些数每次增加4，所以后面是18。", 2, "/images/challenge/g1-upper-stage4/pattern-2-6-10-14.svg"]
  ]),
  ...createGradeOneChallengeConfigs("语文", "短句抓点", [
    ["口语交际", "别人帮你捡起橡皮，你更合适说什么？", "谢谢你", ["快点走开", "这本来就是你的", "我不要了"], "别人帮助了你，要礼貌地说谢谢。", 2, "/images/challenge/g1-upper-stage4/help-eraser-thanks.svg"],
    ["标点符号", "“今天下雨了（ ）” 句末最合适填什么标点？", "句号", ["问号", "感叹号", "顿号"], "陈述一件事情，句末通常用句号。", 2, "/images/challenge/g1-upper-stage4/rainy-day-period.svg"],
    ["课文理解", "《青蛙写诗》里，水泡泡帮忙当什么标点？", "小句号", ["小逗号", "小问号", "小书名号"], "课文里水泡泡说自己可以当个小句号。", 2, "/images/challenge/g1-upper-stage4/frog-poem-bubble.svg"],
    ["课文理解", "《小小的船》里，“我”坐在哪里？", "小小的船里", ["大海里", "山顶上", "田野里"], "课文里写“我在小小的船里坐”。", 2, "/images/challenge/g1-upper-stage4/little-boat.svg"],
    ["词语搭配", "下面哪个词最适合填“白白的（ ）”？", "云朵", ["苹果", "草地", "太阳"], "“白白的云朵”是合适搭配。", 2, "/images/challenge/g1-upper-stage4/white-cloud-stage4.svg"],
    ["量词运用", "下面哪个量词最适合“一（ ）白云”？", "朵", ["条", "把", "本"], "白云通常用“朵”来搭配。", 2, "/images/challenge/g1-upper-stage4/one-cloud.svg"],
    ["口语交际", "妈妈递给你水果时，你更合适说什么？", "谢谢妈妈", ["我不要", "快点拿来", "你走开"], "接受别人帮助或关心时，要礼貌表达感谢。", 2, "/images/challenge/g1-upper-stage4/mom-gives-fruit.svg"],
    ["标点符号", "“快来和我一起玩（ ）” 句末更适合填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示招呼、呼唤时，句末常用感叹号。", 2, "/images/challenge/g1-upper-stage4/come-play-exclamation.svg"],
    ["课文理解", "《比尾巴》里，谁的尾巴弯？", "猴子", ["兔子", "鸭子", "孔雀"], "课文里说猴子的尾巴弯。", 2, "/images/challenge/g1-upper-stage4/monkey-tail.svg"],
    ["词语搭配", "下面哪个词最适合填“闪闪的（ ）”？", "星星", ["书包", "尺子", "小路"], "“闪闪的星星”是常见搭配。", 2, "/images/challenge/g1-upper-stage4/shining-stars.svg"]
  ])
];

const gradeOneUpperStageFiveChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "规律连答", [
    ["找规律", "按规律填数：2、5、8、11、（ ）", "14", ["12", "13", "15"], "这些数每次增加3，所以11后面是14。", 3, "/images/challenge/g1-upper-stage5/pattern-2-5-8-11.svg"],
    ["找规律", "按规律填数：19、17、15、（ ）", "13", ["11", "12", "14"], "这些数每次减少2，所以15后面是13。", 3, "/images/challenge/g1-upper-stage5/pattern-19-17-15.svg"],
    ["找规律", "按规律填数：3、6、9、（ ）、15", "12", ["10", "11", "13"], "这些数每次增加3，所以9后面是12。", 3, "/images/challenge/g1-upper-stage5/pattern-3-6-9-15.svg"],
    ["找规律", "按规律填数：1、4、7、10、（ ）", "13", ["12", "14", "15"], "这些数每次增加3，所以10后面是13。", 3, "/images/challenge/g1-upper-stage5/pattern-1-4-7-10.svg"],
    ["找规律", "按规律填图：○、△、○、△、○、（ ）", "△", ["○", "□", "☆"], "图形按○、△重复出现，所以后面是△。", 3, "/images/challenge/g1-upper-stage5/pattern-circle-triangle.svg"],
    ["找规律", "按规律填图：□、□、○、□、□、○、（ ）", "□", ["○", "△", "☆"], "图形按“□、□、○”重复出现，下一个是□。", 3, "/images/challenge/g1-upper-stage5/pattern-square-square-circle.svg"],
    ["找规律", "按大小规律：1个★、2个★、3个★、（ ）", "4个★", ["2个★", "3个★", "5个★"], "星星个数每次多1，所以后面是4个★。", 3, "/images/challenge/g1-upper-stage5/pattern-stars-1-2-3.svg"],
    ["找规律", "按规律填数：4、8、12、（ ）", "16", ["14", "15", "18"], "这些数每次增加4，所以12后面是16。", 3, "/images/challenge/g1-upper-stage5/pattern-4-8-12.svg"],
    ["找规律", "按规律填数：20、18、16、14、（ ）", "12", ["10", "11", "13"], "这些数每次减少2，所以后面是12。", 3, "/images/challenge/g1-upper-stage5/pattern-20-18-16-14.svg"],
    ["找规律", "按规律填数：6、9、12、15、（ ）", "18", ["16", "17", "19"], "这些数每次增加3，所以后面是18。", 3, "/images/challenge/g1-upper-stage5/pattern-6-9-12-15.svg"]
  ]),
  ...createGradeOneChallengeConfigs("语文", "规律连答", [
    ["词语形式", "下面哪个词和“高高兴兴”一样，都是 AABB 式？", "干干净净", ["飞来飞去", "雪白雪白", "红红的"], "“干干净净”也是前后两个字各重复一次的 AABB 式词语。", 3, "/images/challenge/g1-upper-stage5/aabb-happy-clean.svg"],
    ["词语形式", "下面哪个词和“跑来跑去”是同一类？", "飞来飞去", ["高高兴兴", "又大又圆", "雪白雪白"], "“飞来飞去”也是“来去式”词语。", 3, "/images/challenge/g1-upper-stage5/laiqu-fly.svg"],
    ["课文理解", "《四季》里，草芽尖尖是春天，荷叶圆圆是夏天，谷穗弯弯是（ ）", "秋天", ["春天", "夏天", "冬天"], "课文里“谷穗弯弯”对应秋天。", 3, "/images/challenge/g1-upper-stage5/seasons-autumn.svg"],
    ["课文理解", "《雪地里的小画家》里，小鸡画竹叶，小狗画梅花，小鸭画（ ）", "枫叶", ["竹叶", "月牙", "荷叶"], "课文里“小鸭画枫叶”。", 3, "/images/challenge/g1-upper-stage5/duck-maple-leaf.svg"],
    ["词语形式", "下面哪个词和“干干净净”是同一类？", "明明白白", ["飞来飞去", "红红的", "又香又甜"], "“明明白白”也是 AABB 式词语。", 3, "/images/challenge/g1-upper-stage5/aabb-bright.svg"],
    ["词语形式", "下面哪个词和“走来走去”是同一类？", "看来看去", ["整整齐齐", "雪白雪白", "又细又长"], "“看来看去”也是“来去式”词语。", 3, "/images/challenge/g1-upper-stage5/laiqu-look.svg"],
    ["课文理解", "《大小多少》里，“一个大，一个小”说的是哪一组？", "一头黄牛一只猫", ["一群鸭子一只鸟", "一朵花一棵树", "一把伞一本书"], "课文里写“一头黄牛一只猫”。", 3, "/images/challenge/g1-upper-stage5/size-many-cow-cat.svg"],
    ["课文理解", "课文《小小的船》把弯弯的月儿比作什么？", "小小的船", ["圆圆的球", "长长的小路", "高高的山"], "课文把弯弯的月儿比作小小的船。", 3, "/images/challenge/g1-upper-stage5/moon-boat.svg"],
    ["词语形式", "下面哪个词和“又高又大”是同一类？", "又香又甜", ["干干净净", "飞来飞去", "明明白白"], "“又香又甜”和“又高又大”都是“又A又B”式词语。", 3, "/images/challenge/g1-upper-stage5/youa-youxiang.svg"],
    ["课文顺序", "按四季顺序排，春天后面是什么季节？", "夏天", ["秋天", "冬天", "还是春天"], "四季按春、夏、秋、冬排列。", 3, "/images/challenge/g1-upper-stage5/seasons-order-spring-summer.svg"]
  ])
];

const gradeOneUpperStageSixChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "限时稳步", [
    ["20以内不进位加法", "11 + 5 = ?", "16", ["15", "17", "18"], "11加5等于16。", 3, "/images/challenge/g1-upper-stage6/add-11-plus-5.svg"],
    ["20以内不退位减法", "18 - 5 = ?", "13", ["12", "14", "15"], "18减5等于13。", 3, "/images/challenge/g1-upper-stage6/subtract-18-minus-5.svg"],
    ["20以内不进位加法", "13 + 2 = ?", "15", ["14", "16", "17"], "13加2等于15。", 3, "/images/challenge/g1-upper-stage6/add-13-plus-2.svg"],
    ["20以内不退位减法", "17 - 2 = ?", "15", ["14", "16", "13"], "17减2等于15。", 3, "/images/challenge/g1-upper-stage6/subtract-17-minus-2.svg"],
    ["数的组成", "16是1个十和几个一？", "6个一", ["5个一", "7个一", "16个一"], "16由1个十和6个一组成。", 3, "/images/challenge/g1-upper-stage6/number-16-one-ten-six-ones.svg"],
    ["数位认识", "13里面的“1”表示什么？", "1个十", ["1个一", "3个十", "13个一"], "13里的1在十位上，表示1个十。", 3, "/images/challenge/g1-upper-stage6/number-13-one-ten.svg"],
    ["认识钟表", "分针指着12，时针指着7，现在是几时？", "7时", ["6时", "8时", "12时"], "分针指12表示整时，时针指7就是7时。", 3, "/images/challenge/g1-upper-stage6/clock-7.svg"],
    ["大小比较", "下面哪个算式的结果最大？", "9 + 8", ["17 - 1", "12 + 3", "18 - 4"], "9 + 8 = 17，比其他三个结果都大。", 3, "/images/challenge/g1-upper-stage6/compare-max-equation.svg"]
  ]),
  ...createGradeOneChallengeConfigs("语文", "限时稳步", [
    ["整体认读音节", "下面哪一个音节要整体认读？", "yu", ["nu", "le", "he"], "yu是整体认读音节。", 3, "/images/challenge/g1-upper-stage6/overall-yu.svg"],
    ["拼音规则", "“x”和“ü”组成音节时，应该写成哪一个？", "xu", ["xü", "xiu", "xua"], "x和ü组成音节时，ü上两点省写成xu。", 3, "/images/challenge/g1-upper-stage6/xu-rule.svg"],
    ["标点符号", "“多漂亮啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "顿号"], "表示赞叹的句子，句末常用感叹号。", 3, "/images/challenge/g1-upper-stage6/exclamation-pretty.svg"],
    ["量词运用", "下面哪个量词最适合“一（ ）雨伞”？", "把", ["条", "只", "本"], "雨伞通常用“把”来搭配。", 3, "/images/challenge/g1-upper-stage6/one-umbrella.svg"],
    ["拼音规则", "“q”和“ü”组成音节时，正确写法是哪一个？", "qu", ["qü", "qiu", "qia"], "q和ü组成音节时，ü上两点省写成qu。", 3, "/images/challenge/g1-upper-stage6/qu-rule.svg"],
    ["量词运用", "下面哪个量词最适合“一（ ）帽子”？", "顶", ["条", "本", "朵"], "帽子通常用“顶”来搭配。", 3, "/images/challenge/g1-upper-stage6/one-hat.svg"],
    ["整体认读音节", "下面哪一个音节也要整体认读？", "shi", ["sa", "ne", "lu"], "shi是整体认读音节。", 3, "/images/challenge/g1-upper-stage6/overall-shi.svg"],
    ["量词运用", "下面哪个量词最适合“一（ ）桌子”？", "张", ["条", "本", "只"], "桌子通常用“张”来搭配。", 3, "/images/challenge/g1-upper-stage6/one-table.svg"]
  ])
];

const gradeOneUpperStageSevenChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "启蒙冲线", [
    ["解决问题", "篮子里原来有12个苹果，吃掉2个，又放进3个，现在有多少个？", "13个", ["11个", "12个", "14个"], "12 - 2 + 3 = 13，所以现在有13个苹果。", 3, "/images/challenge/g1-upper-stage7/apples-12-minus-2-plus-3.svg"],
    ["几个和第几个", "排队时，小明前面有3人，后面有2人，这一排一共有多少人？", "6人", ["5人", "7人", "8人"], "前面3人、后面2人，再加上小明自己，一共6人。", 3, "/images/challenge/g1-upper-stage7/queue-3-front-2-back.svg"],
    ["数位认识", "18里面的“8”表示什么？", "8个一", ["8个十", "1个十", "18个一"], "18里的8在个位上，表示8个一。", 3, "/images/challenge/g1-upper-stage7/number-18-eight-ones.svg"],
    ["找规律", "按规律填数：4、7、10、（ ）", "13", ["11", "12", "14"], "这些数每次增加3，所以10后面是13。", 3, "/images/challenge/g1-upper-stage7/pattern-4-7-10.svg"],
    ["认识钟表", "分针指着12，时针指着9，现在是几时？", "9时", ["8时", "10时", "12时"], "分针指12表示整时，时针指9就是9时。", 3, "/images/challenge/g1-upper-stage7/clock-9.svg"],
    ["位置", "小猫在桌子下面，小球在桌子上面。谁在上面？", "小球", ["小猫", "桌子", "都不对"], "题目里说小球在桌子上面。", 3, "/images/challenge/g1-upper-stage7/cat-under-ball-above.svg"],
    ["数的顺序", "15前面的一个数是几？", "14", ["13", "16", "17"], "按顺序数，15前面是14。", 3, "/images/challenge/g1-upper-stage7/number-before-15.svg"],
    ["数的组成", "19可以分成1个十和几个一？", "9个一", ["8个一", "10个一", "19个一"], "19由1个十和9个一组成。", 3, "/images/challenge/g1-upper-stage7/number-19-one-ten-nine-ones.svg"],
    ["解决问题", "小朋友做纸花，上午做了8朵，下午又做了7朵，一共做了多少朵？", "15朵", ["14朵", "16朵", "17朵"], "8 + 7 = 15，所以一共做了15朵。", 3, "/images/challenge/g1-upper-stage7/paper-flowers-8-plus-7.svg"],
    ["几个和第几个", "一排有8人，小冬排第5，他后面有几人？", "3人", ["2人", "4人", "5人"], "一共8人，排第5，后面还有3人。", 3, "/images/challenge/g1-upper-stage7/queue-eight-fifth.svg"]
  ]),
  ...createGradeOneChallengeConfigs("语文", "启蒙冲线", [
    ["课文理解", "《四季》里，雪人大肚子一挺，说“我就是（ ）”。", "冬天", ["春天", "夏天", "秋天"], "课文里雪人说“我就是冬天”。", 3, "/images/challenge/g1-upper-stage7/snowman-winter.svg"],
    ["整体认读音节", "下面哪个音节属于整体认读音节？", "ri", ["ran", "re", "ru"], "ri要整体认读。", 3, "/images/challenge/g1-upper-stage7/overall-ri.svg"],
    ["标点符号", "“你今天开心吗（ ）” 句末最合适填什么标点？", "问号", ["句号", "感叹号", "逗号"], "表示提问的句子，句末常用问号。", 3, "/images/challenge/g1-upper-stage7/question-happy.svg"],
    ["词语形式", "下面哪个词和“游来游去”是同一类？", "跳来跳去", ["高高兴兴", "又大又圆", "雪白雪白"], "“跳来跳去”也是“来去式”词语。", 3, "/images/challenge/g1-upper-stage7/laiqu-jump.svg"],
    ["课文理解", "《画》这首诗里，“近听水”怎么样？", "无声", ["很响", "很深", "很急"], "诗句是“近听水无声”。", 3, "/images/challenge/g1-upper-stage7/painting-water-silent.svg"],
    ["整体认读音节", "下面哪个音节也要整体认读？", "zhi", ["za", "de", "he"], "zhi是整体认读音节。", 3, "/images/challenge/g1-upper-stage7/overall-zhi.svg"],
    ["标点符号", "“太好了，我们出发吧（ ）” 句末更适合填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表达高兴、激动时，句末常用感叹号。", 3, "/images/challenge/g1-upper-stage7/exclamation-lets-go.svg"],
    ["词语形式", "下面哪个词和“跑来跑去”属于同一类词语？", "想来想去", ["干干净净", "明明白白", "又大又圆"], "“想来想去”也是“来去式”词语。", 3, "/images/challenge/g1-upper-stage7/laiqu-think.svg"],
    ["课文理解", "《雪地里的小画家》里，小马画了什么？", "月牙", ["竹叶", "枫叶", "梅花"], "课文里写“小马画月牙”。", 3, "/images/challenge/g1-upper-stage7/horse-moon-crescent.svg"],
    ["口语交际", "同学把橡皮借给你以后，你更合适说什么？", "谢谢你，我会及时还你。", ["快点拿来", "这本来就该给我", "你别说话"], "借用别人的东西后，要礼貌感谢。", 3, "/images/challenge/g1-upper-stage7/borrow-eraser-thanks.svg"]
  ])
];

const gradeOneLowerStageOneChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "独立看题", [
    ["数的顺序", "按顺序数，57后面的一个数是几？", "58", ["56", "59", "67"], "按顺序数，57后面是58。", 1, "/images/challenge/g1-lower-stage1/number-after-57.svg"],
    ["100以内数", "70里面有几个十？", "7个十", ["6个十", "70个十", "7个一"], "70由7个十组成。", 1, "/images/challenge/g1-lower-stage1/number-70-seven-tens.svg"],
    ["分类整理", "4、16、9里，哪个是两位数？", "16", ["4", "9", "都不是"], "16是两位数。", 1, "/images/challenge/g1-lower-stage1/compare-4-16-9.svg"]
  ], "下册"),
  ...createGradeOneChallengeConfigs("语文", "独立看题", [
    ["多音字辨音", "“一只小羊”里的“只”应该读什么？", "zhī", ["zhǐ", "zī", "zhē"], "作量词时，“只”读 zhī。", 1, "/images/challenge/g1-lower-stage1/sheep-zhi.svg"],
    ["音序查字", "查“树”字时，先找哪个大写字母？", "S", ["Sh", "U", "T"], "“树”的音序是 S。", 1, "/images/challenge/g1-lower-stage1/character-tree-s.svg"],
    ["音节认读", "“笑”字的音节是什么？", "xiào", ["xào", "xiāo", "xǎo"], "“笑”读 xiào。", 1, "/images/challenge/g1-lower-stage1/laugh-xiao.svg"]
  ], "下册")
];

const gradeOneLowerStageTwoChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "条件配对", [
    ["数的顺序", "按顺序数，70前面的一个数是几？", "69", ["68", "71", "79"], "按顺序数，70前面是69。", 1, "/images/challenge/g1-lower-stage2/number-before-70.svg"],
    ["100以内数", "关于32和41，哪种说法是对的？", "32 < 41", ["32 > 41", "32 = 41", "41 < 32"], "32小于41。", 1, "/images/challenge/g1-lower-stage2/compare-32-and-41.svg"],
    ["人民币", "2元5角一共是多少角？", "25角", ["7角", "52角", "205角"], "2元是20角，再加5角是25角。", 1, "/images/challenge/g1-lower-stage2/money-2yuan-5jiao.svg"],
    ["分类整理", "7、15、9里面，哪个是两位数？", "15", ["7", "9", "都不是"], "15是两位数。", 1, "/images/challenge/g1-lower-stage2/compare-7-15-9.svg"],
    ["人民币", "1张1元和几张2角一样多？", "5张", ["2张", "4张", "10张"], "1元等于10角，10角能换5张2角。", 1, "/images/challenge/g1-lower-stage2/one-yuan-five-two-jiao.svg"]
  ], "下册"),
  ...createGradeOneChallengeConfigs("语文", "条件配对", [
    ["姓氏识字", "“口天”合起来表示哪个姓？", "吴", ["李", "张", "胡"], "“口天吴”说的就是吴姓。", 1, "/images/challenge/g1-lower-stage2/surname-koutian-wu.svg"],
    ["姓氏识字", "“双人徐”里的后一个字是哪一个？", "徐", ["许", "胡", "吴"], "“双人徐”说的就是徐姓。", 1, "/images/challenge/g1-lower-stage2/surname-shuangren-xu.svg"],
    ["量词运用", "给“桥”选量词，一（ ）桥最合适？", "座", ["只", "条", "把"], "桥通常用“座”来搭配。", 1, "/images/challenge/g1-lower-stage2/one-bridge.svg"],
    ["动词搭配", "给“故事”选动词，最合适的是哪一个？", "讲", ["洗", "跳", "住"], "我们常说“讲故事”。", 1, "/images/challenge/g1-lower-stage2/tell-story.svg"],
    ["近义词", "“爱护”更像下面哪个词？", "保护", ["离开", "破坏", "忘记"], "“爱护”和“保护”意思相近。", 1, "/images/challenge/g1-lower-stage2/protect-care.svg"]
  ], "下册")
];

const gradeOneLowerStageThreeChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "顺序推想", [
    ["想加算减", "算14减9时，可以先想9加几等于14？", "5", ["4", "6", "7"], "因为9 + 5 = 14，所以14 - 9 = 5。", 2, "/images/challenge/g1-lower-stage3/think-9-plus-what-equals-14.svg"],
    ["人民币", "56角是多少？", "5元6角", ["56元", "6元5角", "5角6分"], "56角就是5元6角。", 2, "/images/challenge/g1-lower-stage3/money-56jiao.svg"],
    ["认识钟表", "分针指着6，时针在8和9之间，这时是几时半？", "8时半", ["8时", "9时", "9时半"], "分针指向6表示半时。", 2, "/images/challenge/g1-lower-stage3/clock-8-30.svg"],
    ["数位认识", "56里面的“5”表示什么？", "5个十", ["5个一", "6个十", "56个一"], "56里的5在十位上，表示5个十。", 2, "/images/challenge/g1-lower-stage3/number-56-five-tens.svg"],
    ["组数比较", "用3、6、9组成不同的两位数，最大的是多少？", "96", ["93", "69", "63"], "十位放最大的9，个位放6，组成96。", 2, "/images/challenge/g1-lower-stage3/make-largest-96.svg"]
  ], "下册"),
  ...createGradeOneChallengeConfigs("语文", "顺序推想", [
    ["音序排序", "“白、王、刘”按音序排，最前面是谁？", "白", ["王", "刘", "一样前"], "白的音序是 B，排在最前面。", 2, "/images/challenge/g1-lower-stage3/sort-bai-wang-liu.svg"],
    ["多音字辨音", "“快乐”的“乐”应该读什么？", "lè", ["yuè", "yào", "luò"], "表示高兴时，“乐”读 lè。", 2, "/images/challenge/g1-lower-stage3/happy-le.svg"],
    ["连词成句", "把词语排成通顺句子，哪一句更合适？", "小鸟在树上快乐地唱歌。", ["快乐地小鸟在树上唱歌。", "在树上小鸟唱歌快乐地。", "唱歌小鸟快乐地在树上。"], "按正常语序表达才通顺。", 2, "/images/challenge/g1-lower-stage3/bird-sing-sentence.svg"],
    ["课文理解", "在《古对今》里，和“春暖”相对的是哪个词？", "秋凉", ["严寒", "酷暑", "晨风"], "课文中有“春暖对秋凉”。", 2, "/images/challenge/g1-lower-stage3/spring-warm-autumn-cool.svg"],
    ["传统文化", "《人之初》开头告诉我们，人一开始怎样？", "性本善", ["性本恶", "要贪玩", "不读书"], "《人之初》开头是“人之初，性本善”。", 2, "/images/challenge/g1-lower-stage3/ren-zhi-chu-xing-ben-shan.svg"]
  ], "下册")
];

const gradeOneLowerStageFourChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "比较判断", [
    ["大小比较", "45和54相比，哪个数更大？", "54", ["45", "一样大", "不能比较"], "54比45大。", 2, "/images/challenge/g1-lower-stage4/compare-45-54.svg"],
    ["数的顺序", "按顺序数，78前面的一个数是几？", "77", ["76", "79", "88"], "按顺序数，78前面是77。", 2, "/images/challenge/g1-lower-stage4/number-before-78.svg"],
    ["人民币", "7元和65角相比，哪个更多？", "7元", ["65角", "一样多", "没法比较"], "7元等于70角，比65角多。", 2, "/images/challenge/g1-lower-stage4/money-7yuan-vs-65jiao.svg"],
    ["人民币", "45分和5角相比，哪个更多？", "5角", ["45分", "一样多", "都不对"], "5角等于50分，比45分多。", 2, "/images/challenge/g1-lower-stage4/money-45fen-vs-5jiao.svg"],
    ["数位认识", "64里面的“4”在什么位上？", "个位", ["十位", "百位", "千位"], "64里的4在个位上。", 2, "/images/challenge/g1-lower-stage4/number-64-ones-place.svg"],
    ["数的分解", "63可以写成什么？", "60 + 3", ["6 + 3", "30 + 6", "60 + 30"], "63由6个十和3个一组成。", 2, "/images/challenge/g1-lower-stage4/decompose-63.svg"],
    ["组数比较", "用2、4、8组成不同的两位数，最大的是多少？", "84", ["82", "48", "42"], "十位放8，个位放4，最大是84。", 2, "/images/challenge/g1-lower-stage4/make-largest-84.svg"],
    ["平面图形", "正方形和长方形相比，谁四条边都一样长？", "正方形", ["长方形", "一样长", "都不对"], "只有正方形四条边都一样长。", 2, "/images/challenge/g1-lower-stage4/square-vs-rectangle.svg"],
    ["解决问题", "故事书有36本，科技书有29本，哪种书更多？", "故事书", ["科技书", "一样多", "没法比"], "36比29大，所以故事书更多。", 2, "/images/challenge/g1-lower-stage4/books-36-vs-29.svg"],
    ["想加算减", "算17减8时，可以先想8加几等于17？", "9", ["8", "10", "7"], "因为8 + 9 = 17，所以17 - 8 = 9。", 2, "/images/challenge/g1-lower-stage4/think-8-plus-what-equals-17.svg"]
  ], "下册"),
  ...createGradeOneChallengeConfigs("语文", "比较判断", [
    ["反义词", "和“前”意思相反的是哪个词？", "后", ["左", "高", "远"], "“前”和“后”是一对反义词。", 2, "/images/challenge/g1-lower-stage4/opposite-front-back.svg"],
    ["反义词", "和“去”相对的动作是哪个？", "来", ["上", "进", "跑"], "“来”和“去”相对。", 2, "/images/challenge/g1-lower-stage4/opposite-go-come.svg"],
    ["近义词", "“开心”更接近下面哪个词？", "高兴", ["害怕", "难过", "着急"], "“开心”和“高兴”意思相近。", 2, "/images/challenge/g1-lower-stage4/happy-gaoxing.svg"],
    ["词语搭配", "下面哪一组词语搭配更自然？", "碧绿碧绿的荷叶", ["碧绿碧绿的太阳", "碧绿碧绿的棉花", "碧绿碧绿的月亮"], "“碧绿碧绿的荷叶”搭配自然。", 2, "/images/challenge/g1-lower-stage4/lotus-leaves-green.svg"],
    ["标点符号", "“今天真热（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示强烈感受时，句末常用感叹号。", 2, "/images/challenge/g1-lower-stage4/hot-exclamation.svg"],
    ["标点符号", "“你写完作业了吗（ ）” 句末最合适填什么标点？", "问号", ["句号", "感叹号", "逗号"], "表示提问时，句末常用问号。", 2, "/images/challenge/g1-lower-stage4/homework-question.svg"],
    ["课文理解", "在《小青蛙》一课里，小青蛙主要保护什么？", "禾苗", ["花朵", "书本", "石头"], "课文写小青蛙保护禾苗。", 2, "/images/challenge/g1-lower-stage4/frog-protect-seedlings.svg"],
    ["课文理解", "《动物儿歌》里，在花间捉迷藏的是谁？", "蝴蝶", ["蜻蜓", "蚂蚁", "蝌蚪"], "课文里有“蝴蝶花间捉迷藏”。", 2, "/images/challenge/g1-lower-stage4/butterfly-flowers.svg"],
    ["连词成句", "读一读，哪一句语序最通顺？", "我们在教室里认真地读书。", ["认真地我们教室里在读书。", "读书教室里认真地我们在。", "教室里读书我们认真地在。"], "按正常语序表达才通顺。", 2, "/images/challenge/g1-lower-stage4/classroom-read-sentence.svg"],
    ["动词搭配", "给“电话”选动作，最合适的是哪一个？", "打", ["吃", "喝", "开"], "我们常说“打电话”。", 2, "/images/challenge/g1-lower-stage4/make-phone-call.svg"]
  ], "下册")
];

const gradeOneLowerStageFiveChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "口算稳住", [
    ...withImageUrls(createComputeTuples("20以内退位减法", "-", [[18, 7], [17, 6], [15, 8], [12, 7], [14, 9]], 3), [
      "/images/challenge/g1-lower-stage5/subtract-18-7.svg",
      "/images/challenge/g1-lower-stage5/subtract-17-6.svg",
      "/images/challenge/g1-lower-stage5/subtract-15-8.svg",
      "/images/challenge/g1-lower-stage5/subtract-12-7.svg",
      "/images/challenge/g1-lower-stage5/subtract-14-9.svg"
    ]),
    ...withImageUrls(createComputeTuples("100以内口算", "+", [[21, 8], [43, 5], [57, 2], [64, 3]], 3), [
      "/images/challenge/g1-lower-stage5/add-21-8.svg",
      "/images/challenge/g1-lower-stage5/add-43-5.svg",
      "/images/challenge/g1-lower-stage5/add-57-2.svg",
      "/images/challenge/g1-lower-stage5/add-64-3.svg"
    ]),
    ...withImageUrls(createComputeTuples("100以内口算", "-", [[63, 2]], 3), [
      "/images/challenge/g1-lower-stage5/subtract-63-2.svg"
    ])
  ], "下册"),
  ...createGradeOneChallengeConfigs("语文", "口算稳住", [
    ["多音字辨音", "在“音乐课”这个词里，“乐”字读什么？", "yuè", ["lè", "yào", "luò"], "“音乐”的“乐”读 yuè。", 3, "/images/challenge/g1-lower-stage5/music-yue.svg"],
    ["多音字辨音", "“只好回家”里的“只”应该读什么？", "zhǐ", ["zhī", "zī", "zhè"], "表示“只得”时，“只”读 zhǐ。", 3, "/images/challenge/g1-lower-stage5/zhihao-zhi.svg"],
    ["音序排序", "“陈、白、王、徐”按音序排，最前面是谁？", "白", ["陈", "王", "徐"], "白的音序是 B，排在最前面。", 3, "/images/challenge/g1-lower-stage5/sort-chen-bai-wang-xu.svg"],
    ["连词成句", "哪一句把“我、妈妈、公园、散步”说通顺了？", "我和妈妈一起去公园散步。", ["我一起和妈妈去公园散步。", "公园散步我和妈妈一起去。", "妈妈去我和一起公园散步。"], "按正常语序表达才通顺。", 3, "/images/challenge/g1-lower-stage5/mom-park-walk-sentence.svg"],
    ["句子理解", "“文具用完要送回家”主要想告诉我们什么？", "要及时收好文具", ["要把文具送给别人", "文具不用了就扔掉", "只要好看就行"], "这句话主要提醒我们要爱护并收好文具。", 3, "/images/challenge/g1-lower-stage5/put-away-stationery.svg"],
    ["课文理解", "《一分钟》里，元元迟到和哪件事最有关系？", "多睡了一分钟", ["书包太重", "跑得太快", "天气太冷"], "课文通过元元说明一分钟也很重要。", 3, "/images/challenge/g1-lower-stage5/yuanyuan-one-minute.svg"],
    ["传统文化", "《端午粽》一课里，端午节家里常吃什么？", "粽子", ["月饼", "汤圆", "饺子"], "端午节有吃粽子的习俗。", 3, "/images/challenge/g1-lower-stage5/duanwu-zongzi.svg"],
    ["字谜识字", "那个“左边绿，右边红，左右相遇起凉风”的字谜，谜底是什么？", "秋", ["春", "林", "明"], "这个字谜的谜底是“秋”。", 3, "/images/challenge/g1-lower-stage5/riddle-qiu.svg"],
    ["词语搭配", "下面哪个短语搭配更自然？", "雪白雪白的棉花", ["雪白雪白的太阳", "雪白雪白的河水", "雪白雪白的草地"], "“雪白雪白的棉花”搭配更自然。", 3, "/images/challenge/g1-lower-stage5/white-cotton.svg"],
    ["反义词", "和“高兴”意思相反的是哪个词？", "难过", ["开心", "喜欢", "明亮"], "“高兴”和“难过”意思相反。", 3, "/images/challenge/g1-lower-stage5/opposite-happy-sad.svg"]
  ], "下册")
];

const gradeOneLowerStageSixChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "限时提速", [
    ...withImageUrls(createComputeTuples("100以内口算", "+", [[26, 7], [34, 8], [51, 9], [72, 6]], 3), [
      "/images/challenge/g1-lower-stage6/add-26-7.svg",
      "/images/challenge/g1-lower-stage6/add-34-8.svg",
      "/images/challenge/g1-lower-stage6/add-51-9.svg",
      "/images/challenge/g1-lower-stage6/add-72-6.svg"
    ]),
    ...withImageUrls(createComputeTuples("100以内口算", "-", [[82, 6], [95, 7], [73, 8]], 3), [
      "/images/challenge/g1-lower-stage6/subtract-82-6.svg",
      "/images/challenge/g1-lower-stage6/subtract-95-7.svg",
      "/images/challenge/g1-lower-stage6/subtract-73-8.svg"
    ]),
    ...withImageUrls(createComputeTuples("两位数加减两位数", "+", [[24, 31]], 3), [
      "/images/challenge/g1-lower-stage6/add-24-31.svg"
    ])
  ], "下册"),
  ...createGradeOneChallengeConfigs("语文", "限时提速", [
    ["音序排序", "“李、白、陈、吴”按音序排，最后一个是谁？", "吴", ["李", "白", "陈"], "吴的音序是 W，排在最后面。", 3, "/images/challenge/g1-lower-stage6/sort-li-bai-chen-wu.svg"],
    ["多音字辨音", "“得先写作业”里的“得”应该读什么？", "děi", ["de", "dé", "dè"], "表示“需要、必须”时，“得”读 děi。", 3, "/images/challenge/g1-lower-stage6/dei-write-homework.svg"],
    ["连词成句", "哪一句把“外婆、粽子、又香又甜”说通顺了？", "外婆包的粽子又香又甜。", ["粽子外婆包的又香又甜。", "又香又甜外婆包的粽子。", "外婆又香又甜包的粽子。"], "按正常语序表达才通顺。", 3, "/images/challenge/g1-lower-stage6/grandma-zongzi-sentence.svg"],
    ["标点符号", "“太好了，我们比赛赢了（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示高兴和激动时，句末常用感叹号。", 3, "/images/challenge/g1-lower-stage6/we-won-exclamation.svg"],
    ["课文理解", "《动物王国开大会》里，狗熊通知了很多次，主要是哪句话没说明白？", "开会时间", ["开会地点", "动物名字", "天气情况"], "通知要说清时间，大家才知道什么时候到。", 3, "/images/challenge/g1-lower-stage6/bear-meeting-time.svg"],
    ["句子理解", "“一分钟也很重要”这句话更想告诉我们什么？", "要珍惜时间", ["要多睡一会儿", "要慢慢走路", "要把钟表藏起来"], "这句话提醒我们时间很宝贵，要珍惜。", 3, "/images/challenge/g1-lower-stage6/value-time.svg"],
    ["词语形式", "下面哪个词和“跑来跑去”属于同一类？", "走来走去", ["开开心心", "又香又甜", "雪白雪白"], "“走来走去”也是“来去式”词语。", 3, "/images/challenge/g1-lower-stage6/laiqu-walk.svg"],
    ["课文理解", "《要下雨了》里，小燕子飞得很低，主要是因为什么？", "快下雨了", ["天太冷了", "它迷路了", "它想休息"], "课文里小燕子飞得低，是因为快下雨了。", 3, "/images/challenge/g1-lower-stage6/swallow-rain.svg"]
  ], "下册")
];

const gradeOneLowerStageSevenChallengeConfigs = [
  ...createGradeOneChallengeConfigs("数学", "进阶冲线", [
    ...withImageUrls(createComputeTuples("两位数加减两位数", "+", [[25, 32], [33, 44], [52, 13], [36, 27]], 3), [
      "/images/challenge/g1-lower-stage7/add-25-32.svg",
      "/images/challenge/g1-lower-stage7/add-33-44.svg",
      "/images/challenge/g1-lower-stage7/add-52-13.svg",
      "/images/challenge/g1-lower-stage7/add-36-27.svg"
    ]),
    ...withImageUrls(createComputeTuples("两位数加减两位数", "-", [[84, 52], [93, 41], [72, 26], [66, 18]], 3), [
      "/images/challenge/g1-lower-stage7/subtract-84-52.svg",
      "/images/challenge/g1-lower-stage7/subtract-93-41.svg",
      "/images/challenge/g1-lower-stage7/subtract-72-26.svg",
      "/images/challenge/g1-lower-stage7/subtract-66-18.svg"
    ]),
    ...withImageUrls(createComputeTuples("100以内口算", "+", [[45, 8]], 3), [
      "/images/challenge/g1-lower-stage7/add-45-8.svg"
    ]),
    ...withImageUrls(createComputeTuples("100以内口算", "-", [[91, 8]], 3), [
      "/images/challenge/g1-lower-stage7/subtract-91-8.svg"
    ])
  ], "下册"),
  ...createGradeOneChallengeConfigs("语文", "进阶冲线", [
    ["音序排序", "“白、陈、胡、许”按音序排，第2个是谁？", "陈", ["白", "胡", "许"], "按音序排，白在最前，第二个是陈。", 3, "/images/challenge/g1-lower-stage7/sort-bai-chen-hu-xu.svg"],
    ["多音字辨音", "“写得真好”里的“得”应该读什么？", "de", ["děi", "dé", "dāi"], "作结构助词时，“得”读 de。", 3, "/images/challenge/g1-lower-stage7/de-write-well.svg"],
    ["句子理解", "《文具的家》里的“家”主要指什么？", "文具该放回的地方", ["文具店", "同学家里", "老师办公室"], "课文提醒我们文具用完要放回固定的地方。", 3, "/images/challenge/g1-lower-stage7/stationery-home.svg"],
    ["课文理解", "《小猴子下山》最后为什么空着手回家？", "见一样爱一样", ["因为路太远", "因为没有力气", "因为下雨了"], "小猴子总是看见新的就丢掉旧的，最后什么也没留下。", 3, "/images/challenge/g1-lower-stage7/monkey-empty-handed.svg"],
    ["课文理解", "《咕咚》里，小兔一开始为什么跑起来？", "以为“咕咚”很可怕", ["想去找朋友玩", "想比赛跑步", "要去摘果子"], "小兔误以为“咕咚”是可怕的东西。", 3, "/images/challenge/g1-lower-stage7/gudong-rabbit.svg"],
    ["传统文化", "《人之初》开头“人之初，性本善”后面一句是什么？", "性相近，习相远", ["苟不教，性乃迁", "子不学，非所宜", "玉不琢，不成器"], "《三字经》开头两句是“人之初，性本善。性相近，习相远。”", 3, "/images/challenge/g1-lower-stage7/xing-xiang-jin-xi-xiang-yuan.svg"],
    ["连词成句", "哪一句把“放学以后、先、再”说通顺了？", "放学以后，我先写作业再看书。", ["放学以后我看书先再写作业。", "我先再看书放学以后写作业。", "写作业放学以后我再先看书。"], "按事情发生顺序和正常语序表达才通顺。", 3, "/images/challenge/g1-lower-stage7/after-school-first-then.svg"],
    ["标点符号", "“你愿意和我一起读书吗（ ）” 句末最合适填什么标点？", "问号", ["句号", "感叹号", "逗号"], "表示询问时，句末常用问号。", 3, "/images/challenge/g1-lower-stage7/read-together-question.svg"],
    ["课文理解", "《荷叶圆圆》里，小水珠把荷叶当成什么？", "摇篮", ["凉帽", "歌台", "停机坪"], "课文里小水珠说荷叶是自己的摇篮。", 3, "/images/challenge/g1-lower-stage7/lotus-cradle.svg"],
    ["词语理解", "“轻轻地”最适合形容哪种样子？", "动作很轻", ["颜色很深", "个子很高", "天气很热"], "“轻轻地”通常用来形容动作很轻。", 3, "/images/challenge/g1-lower-stage7/lightly-action.svg"]
  ], "下册")
];

const gradeTwoStageOneChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "条件上手", [
    ["乘法应用", "二(1)班摆了4排椅子，每排6把，一共有多少把椅子？", "24", createNumericDistractors(24), "4排椅子，每排6把，用4×6=24。", 1],
    ["减法应用", "一根彩带长32厘米，剪去7厘米后还剩多少厘米？", "25", createNumericDistractors(25), "用32减7，结果是25。", 1],
    ["时间推算", "钟面刚好指向8时，再过2小时是几时？", "10时", ["9时", "11时", "12时"], "8时再过2小时就是10时。", 1, "/images/challenge/g2-upper-stage1/clock-8-plus-2-hours.svg"]
  ]),
  ...createChallengeConfigs("二年级", "语文", "条件上手", [
    ["句子信息", "读句子“清清的河水倒映着白云”，句中“清清的”写的是什么？", "河水", ["白云", "天空", "小桥"], "“清清的”用来形容河水。", 1],
    ["词语理解", "在“认真地写字”里，哪一部分写出了写字的样子？", "认真地", ["写字", "认真", "字"], "“认真地”说明写字时的状态。", 1],
    ["句子信息", "“小松鼠住在高高的树洞里。” 这句话告诉我们小松鼠住在哪里？", "树洞里", ["高高的", "小松鼠", "森林外"], "句子直接说明了住的地方是树洞里。", 1]
  ])
];

const gradeTwoStageTwoChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "线索配齐", [
    ["乘法应用", "3盒彩笔，每盒8支，一共有多少支？", "24", createNumericDistractors(24), "3盒，每盒8支，用3×8=24。", 1],
    ["平均分", "24个橘子，每盘放6个，可以放几盘？", "4", createNumericDistractors(4), "24里面有4个6，所以可以放4盘。", 1],
    ["乘除配对", "已知5×7=35，那么35÷7等于几？", "5", createNumericDistractors(5), "乘法和除法是互相关联的，35÷7=5。", 1],
    ["时刻推算", "现在是9时半，再过半小时是几时？", "10时", ["9时", "9时半", "10时半"], "9时半再过半小时正好到10时。", 1],
    ["差量比较", "56比48多多少？", "8", createNumericDistractors(8), "求相差多少，用56减48，得8。", 1]
  ]),
  ...createChallengeConfigs("二年级", "语文", "线索配齐", [
    ["量词搭配", "“一（ ）石桥”里最合适填哪个量词？", "座", ["条", "本", "只"], "石桥通常用量词“座”。", 1],
    ["关联词运用", "下面哪句话把“一边……一边……”用对了？", "姐姐一边唱歌，一边整理书桌。", ["因为下雨，一边带伞。", "苹果一边红，一边甜。", "我一边教室，一边读书。"], "“一边……一边……”表示两个动作同时进行。", 1],
    ["词语搭配", "“弯弯的（ ）”最适合填哪一个词？", "月亮", ["铅笔", "桌子", "书包"], "“弯弯的月亮”是自然、常见的搭配。", 1],
    ["顺序理解", "“先洗手，再吃饭。” 按这句话去做，第一步是什么？", "洗手", ["吃饭", "收碗", "睡觉"], "句子里已经告诉我们先做洗手。", 1],
    ["声音词语", "“小鸟在枝头叽叽喳喳地叫。” 最能表示声音的是哪个词？", "叽叽喳喳", ["枝头", "小鸟", "地叫"], "“叽叽喳喳”是描写声音的词。", 1]
  ])
];

const gradeTwoStageThreeChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "短文找点", [
    ["短文应用", "图书角原来有18本故事书，老师又放进去9本，小朋友借走6本，现在还有多少本？", "21", createNumericDistractors(21), "先加上9本，再减去借走的6本，18+9-6=21。", 2],
    ["短文应用", "操场上有5排跳绳队员，每排4人，后来又来了7人，现在一共有多少人？", "27", createNumericDistractors(27), "5排每排4人，共20人，再加7人，得到27人。", 2],
    ["短文应用", "小华上午做了23道口算题，下午比上午少做5道，他下午做了多少道？", "18", createNumericDistractors(18), "下午比上午少5道，所以23-5=18。", 2],
    ["短文应用", "一盒饼干有30块，第一次吃了8块，第二次吃了7块，还剩多少块？", "15", createNumericDistractors(15), "先后吃掉8块和7块，共15块，所以30-15=15。", 2],
    ["短文应用", "有27朵纸花，平均插在3个花瓶里，每个花瓶插几朵？", "9", createNumericDistractors(9), "27平均分成3份，每份是9。", 2]
  ]),
  ...createChallengeConfigs("二年级", "语文", "短文找点", [
    ["短文理解", "放学后，小亮先去图书馆借书，再回家写作业，最后和爸爸去散步。小亮借书以后做什么？", "回家写作业", ["和爸爸散步", "马上睡觉", "先去买菜"], "按事情顺序，借书之后是回家写作业。", 2],
    ["通知理解", "通知：明天下午2点在音乐教室排练，参加合唱的同学请1点50分前到。参加合唱的同学最晚什么时候到？", "1点50分前", ["2点整", "1点40分", "下午3点"], "通知写明“请1点50分前到”。", 2],
    ["短文理解", "小兔去菜园，先拔了萝卜，又摘了青菜，最后提着篮子回家。小兔回家前做的最后一件事是什么？", "摘青菜", ["拔萝卜", "提篮子出门", "睡觉"], "回家前最后完成的是摘青菜。", 2],
    ["短文理解", "小雨早上先背古诗，再整理书包，然后去上学。整理书包前她在做什么？", "背古诗", ["去上学", "吃午饭", "写作文"], "顺着句子看，整理书包前先背古诗。", 2],
    ["图表阅读", "教室后墙贴着值日表：周一小东扫地，周二小美擦黑板，周三小军摆桌椅。周二谁负责擦黑板？", "小美", ["小东", "小军", "老师"], "值日表中周二对应的是小美。", 2, "/images/challenge/g2-upper-stage3/duty-roster-xiaodong-xiaomei-xiaojun.svg"]
  ])
];

const gradeTwoStageFourChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "图表看懂", withImageUrls([
    ["图表分析", "图书角借阅统计：故事书18本，科普书12本，童话书15本。借得最多的是哪一类？", "故事书", ["科普书", "童话书", "一样多"], "18本最多，所以借得最多的是故事书。", 2],
    ["图表分析", "水果店上午卖出苹果24千克、梨18千克、香蕉30千克。卖得最少的是哪一种？", "梨", ["苹果", "香蕉", "一样少"], "18千克最少，对应的是梨。", 2],
    ["图表分析", "二(2)班回收旧纸：第一组16千克，第二组20千克，第三组14千克。哪一组回收得最多？", "第二组", ["第一组", "第三组", "一样多"], "20千克最多，所以是第二组。", 2],
    ["图表分析", "跳绳比赛成绩表：小文跳了45下，小杰跳了39下，小美跳了48下。谁跳得最多？", "小美", ["小文", "小杰", "三人一样多"], "48下最多，所以小美第一。", 2],
    ["图表分析", "商店文具价格表：铅笔2元，橡皮3元，尺子4元。买哪样文具最便宜？", "铅笔", ["橡皮", "尺子", "一样便宜"], "2元最便宜，对应铅笔。", 2],
    ["图表分析", "图书借还记录：周一借出8本，周二借出12本，周三借出10本。哪一天借出的书最多？", "周二", ["周一", "周三", "三天一样多"], "12本最多，所以是周二。", 2],
    ["图表分析", "三种动物数量统计：白兔9只，小鸡12只，小鸭10只。数量最少的是谁？", "白兔", ["小鸡", "小鸭", "一样少"], "9只最少，所以白兔最少。", 2],
    ["图表分析", "班级种树记录：第一天种7棵，第二天种9棵，第三天种6棵。哪一天种得最少？", "第三天", ["第一天", "第二天", "一样少"], "第三天只种了6棵，是最少的。", 2],
    ["图表分析", "三盒粉笔数量分别是32支、28支、35支。哪一盒粉笔最多？", "35支那盒", ["32支那盒", "28支那盒", "三盒一样多"], "35支最多，所以答案是35支那盒。", 2],
    ["图表分析", "作业完成情况：小刚做了17题，小林做了20题，小雨做了19题。做得最多的是谁？", "小林", ["小刚", "小雨", "三人一样多"], "20题最多，所以是小林。", 2]
  ], createSequentialImageUrls("g2-upper-stage4", 10, "math-chart"))),
  ...createChallengeConfigs("二年级", "语文", "图表看懂", withImageUrls([
    ["图表阅读", "值日安排表：周一小宁扫地，周二小雨拖地，周三小军擦窗。周三是谁擦窗？", "小军", ["小宁", "小雨", "老师"], "值日安排表里写着周三由小军擦窗。", 2],
    ["图表阅读", "课程表显示：第一节语文，第二节数学，第三节音乐。第三节上什么课？", "音乐", ["语文", "数学", "美术"], "课程表上第三节写的是音乐。", 2],
    ["图表阅读", "借书登记：小兰借《童话故事》，小方借《十万个为什么》，小东借《成语故事》。谁借了《十万个为什么》？", "小方", ["小兰", "小东", "老师"], "借书登记里《十万个为什么》对应小方。", 2],
    ["图表阅读", "天气记录：周一晴，周二多云，周三小雨。哪一天是小雨天气？", "周三", ["周一", "周二", "三天都下雨"], "天气记录上周三是小雨。", 2],
    ["图表阅读", "植物观察表：向日葵长了18厘米，牵牛花长了12厘米，凤仙花长了15厘米。长得最高的是哪一种？", "向日葵", ["牵牛花", "凤仙花", "一样高"], "18厘米最高，所以是向日葵。", 2],
    ["图表阅读", "兴趣小组报名表：绘画组10人，跳绳组14人，棋艺组9人。人数最多的是哪个组？", "跳绳组", ["绘画组", "棋艺组", "人数一样多"], "14人最多，所以是跳绳组。", 2],
    ["图表阅读", "图书整理单：第一层放童话书，第二层放科普书，第三层放漫画书。科普书放在第几层？", "第二层", ["第一层", "第三层", "第四层"], "整理单里科普书在第二层。", 2],
    ["图表阅读", "广播站值班表：周四李明播新闻，周五王欣播故事，周六张帆播音乐。周五是谁值班？", "王欣", ["李明", "张帆", "老师"], "值班表里周五对应王欣。", 2],
    ["图表阅读", "春游分组名单：第一组去看熊猫，第二组去看海狮，第三组去看长颈鹿。想看海狮的是第几组？", "第二组", ["第一组", "第三组", "第四组"], "分组名单里第二组去看海狮。", 2],
    ["图表阅读", "作息表：7:20到校，8:00上课，9:30做广播操。9:30大家在做什么？", "做广播操", ["到校", "上课", "回家"], "作息表中9:30对应做广播操。", 2]
  ], createSequentialImageUrls("g2-upper-stage4", 10, "chinese-chart")))
];

const gradeTwoStageFiveChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "两步连推", [
    ["两步计算", "每盒有6支蜡笔，买了4盒，用掉5支，还剩多少支？", "19", createNumericDistractors(19), "先算4盒共有24支，再减去5支，还剩19支。", 3],
    ["两步计算", "二(2)班男生18人，女生比男生多4人，这个班一共有多少人？", "40", createNumericDistractors(40), "女生有22人，18+22=40。", 3],
    ["两步计算", "一本故事书有46页，小兰昨天看了18页，今天又看了17页，还剩多少页？", "11", createNumericDistractors(11), "已经看了35页，用46减35，还剩11页。", 3],
    ["两步计算", "教室里有6张桌子，每张桌子配4把椅子，已经摆好19把，还差多少把椅子？", "5", createNumericDistractors(5), "一共要24把椅子，24减19，还差5把。", 3],
    ["两步计算", "操场上有3排学生，每排8人，又来了7人，现在一共有多少人？", "31", createNumericDistractors(31), "3排共24人，再加7人，得到31人。", 3],
    ["两步计算", "商店上午卖出25个气球，下午卖出的比上午少9个，这一天一共卖出多少个？", "41", createNumericDistractors(41), "下午卖16个，25加16等于41。", 3],
    ["两步计算", "一根彩带长70厘米，第一次剪去18厘米，第二次剪去25厘米，还剩多少厘米？", "27", createNumericDistractors(27), "先后剪去43厘米，用70减43，剩27厘米。", 3],
    ["两步计算", "买1盒彩笔要9元，买3盒后再买1本8元的图画本，一共要多少元？", "35", createNumericDistractors(35), "3盒彩笔27元，再加图画本8元，共35元。", 3],
    ["两步计算", "停车场原有36辆车，开走8辆后又开来14辆，现在有多少辆？", "42", createNumericDistractors(42), "36减8再加14，最后是42辆。", 3],
    ["两步计算", "24个苹果平均装进4个篮子，每个篮子再放2个梨，每个篮子里一共有几个水果？", "8", createNumericDistractors(8), "每篮先有6个苹果，再放2个梨，所以一共有8个水果。", 3]
  ]),
  ...createChallengeConfigs("二年级", "语文", "两步连推", [
    ["短文推理", "小雨先把作业写完，又去帮妈妈择菜，晚饭后才看故事书。小雨什么时候看故事书？", "晚饭后", ["放学后立刻", "写作业前", "择菜的时候"], "根据句子顺序，故事书是在晚饭后才看。", 3],
    ["活动顺序", "班会课上，老师先让大家讨论，再请每组选代表发言，最后全班投票。投票前要做什么？", "每组选代表发言", ["自由下课", "回家准备", "先去操场"], "活动顺序里，投票前一步是各组选代表发言。", 3],
    ["顺序理解", "妈妈说：“先整理书包，再检查作业，最后早点睡觉。” 按这个要求，检查作业后要做什么？", "早点睡觉", ["整理书包", "继续玩玩具", "马上出门"], "句子中最后一步是早点睡觉。", 3],
    ["活动安排", "周六计划表：8点练字，9点看书，10点去公园。9点以后接着要做什么？", "去公园", ["练字", "吃晚饭", "做广播操"], "9点看书之后，10点要去公园。", 3],
    ["短文推理", "小猫找皮球，先去客厅没找到，又到阳台看见皮球在花盆后面。小猫最后在哪里找到皮球？", "阳台的花盆后面", ["客厅沙发下", "卧室门口", "书桌抽屉里"], "短文明确说最后在阳台花盆后面找到皮球。", 3],
    ["阅读推理", "下课铃响后，小军先收好书本，再排队喝水，然后回到座位读书。喝水前他先做什么？", "收好书本", ["回到座位", "读书", "去操场"], "按顺序看，喝水前先收好书本。", 3],
    ["顺序理解", "小明把四张卡片按“先写名字，再画图，最后涂色”的顺序完成。画图之后要做什么？", "涂色", ["写名字", "换新卡片", "剪下来"], "顺序中的最后一步是涂色。", 3],
    ["阅读推理", "小兰在图书馆先借了《童话故事》，回家读完后又把书还回去。读完书以后她做了什么？", "把书还回去", ["再借一本新书", "马上睡觉", "先去跑步"], "短文说读完后又把书还回去了。", 3],
    ["通知理解", "留言：请值日生先擦黑板，再摆桌椅，最后关窗离开教室。值日生离开前最后要做什么？", "关窗", ["擦黑板", "摆桌椅", "打开灯"], "留言把最后一步写得很清楚，是关窗。", 3],
    ["短文推理", "小朋友们先在操场集合，再跟老师进馆参观，出来后一起合影。合影前他们做了什么？", "进馆参观", ["回家写作业", "在教室午睡", "去食堂吃饭"], "合影发生在参观之后。", 3]
  ])
];

const gradeTwoStageSixChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "稳答提速", [
    ["乘法速算", "7 × 8 = ?", "56", createNumericDistractors(56), "7乘8等于56。", 3],
    ["除法速算", "54 ÷ 6 = ?", "9", createNumericDistractors(9), "54除以6等于9。", 3],
    ["加法速算", "35 + 27 = ?", "62", createNumericDistractors(62), "35加27等于62。", 3],
    ["减法速算", "80 - 36 = ?", "44", createNumericDistractors(44), "80减36等于44。", 3],
    ["乘法速算", "6 × 9 = ?", "54", createNumericDistractors(54), "6乘9等于54。", 3],
    ["除法速算", "63 ÷ 7 = ?", "9", createNumericDistractors(9), "63除以7等于9。", 3],
    ["加法速算", "45 + 18 = ?", "63", createNumericDistractors(63), "45加18等于63。", 3],
    ["减法速算", "72 - 28 = ?", "44", createNumericDistractors(44), "72减28等于44。", 3]
  ]),
  ...createChallengeConfigs("二年级", "语文", "稳答提速", [
    ["标点符号", "“春天真美啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末常用感叹号。", 3],
    ["词语理解", "“急忙跑来”里，哪个词说明跑得很快？", "急忙", ["跑来", "里", "来"], "“急忙”写出了动作很快、很着急。", 3],
    ["顺序理解", "“先开窗，再擦桌子。” 先要做什么？", "开窗", ["擦桌子", "关门", "洗手"], "句子用“先”明确指出第一步是开窗。", 3],
    ["量词搭配", "“一（ ）火车”里最合适的量词是哪一个？", "列", ["只", "本", "朵"], "火车通常用量词“列”。", 3],
    ["修辞感受", "“小溪唱着歌向前流。” 这句话把小溪写得像什么？", "像会唱歌的人", ["像一张桌子", "像一本书", "像一把伞"], "把小溪写得像人一样会唱歌，这是拟人的写法。", 3],
    ["顺序理解", "“雨停了，太阳出来了，彩虹挂在天边。” 哪件事是最后发生的？", "彩虹挂在天边", ["雨停了", "太阳出来了", "大家回家了"], "按句子顺序看，最后出现的是彩虹挂在天边。", 3],
    ["词语运用", "哪句话把“立刻”用得最合适？", "听到铃声后，大家立刻排好队。", ["太阳立刻是红色的。", "桌子立刻很安静。", "苹果立刻在书包里。"], "“立刻”表示马上，放在排队的句子里最恰当。", 3],
    ["句子排序", "“放学后，我先扫地，再关灯。” 关灯前做什么？", "扫地", ["回家", "吃饭", "拿伞"], "句子先说扫地，再说关灯。", 3]
  ])
];

const gradeTwoStageSevenChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "方法冲线", [
    ["综合计算", "8个篮子，每个放5个苹果，送走9个后还剩多少个苹果？", "31", createNumericDistractors(31), "先算共有40个苹果，再减去9个，还剩31个。", 3],
    ["综合计算", "一本书有68页，小明已经看了29页，还要看多少页？", "39", createNumericDistractors(39), "总页数减去已看的页数，68-29=39。", 3],
    ["综合计算", "买4盒彩笔，每盒7元，再买1块5元的橡皮，一共要多少元？", "33", createNumericDistractors(33), "4盒彩笔共28元，再加5元，一共33元。", 3],
    ["综合计算", "60个扣子平均分给6个同学，每人再分到3个贴纸，一共得到多少个物品？", "13", createNumericDistractors(13), "每人先分到10个扣子，再加3个贴纸，共13个。", 3],
    ["综合计算", "二(3)班上午做了18朵小红花，下午做的是上午的2倍，这一天一共做了多少朵？", "54", createNumericDistractors(54), "下午做36朵，再加上午18朵，共54朵。", 3],
    ["综合计算", "停车场有45辆车，开走17辆，又开来9辆，现在有多少辆？", "37", createNumericDistractors(37), "45减17再加9，最后是37辆。", 3],
    ["综合计算", "图书角三层书架分别放24本、18本、16本书，一共放了多少本书？", "58", createNumericDistractors(58), "把三层的书加起来，24+18+16=58。", 3],
    ["综合计算", "4袋糖，每袋9块，平均分给6个小朋友，每人分到几块？", "6", createNumericDistractors(6), "先算一共36块糖，再平均分给6人，每人6块。", 3],
    ["综合计算", "一根绳子长84厘米，剪成7段同样长的小绳，每段多少厘米？", "12", createNumericDistractors(12), "84平均分成7段，每段长12厘米。", 3],
    ["时间推算", "从8:20开始做题，做了40分钟，结束时是几时？", "9:00", ["8:40", "9:20", "10:00"], "8:20再过40分钟，就是9:00。", 3]
  ]),
  ...createChallengeConfigs("二年级", "语文", "方法冲线", [
    ["通知理解", "通知：明天早上8点在校门口集合去春游，请同学们7点50分前到。想准时参加春游，最晚什么时候到校门口？", "7点50分前", ["8点整", "7点30分", "8点10分"], "通知明确写着要在7点50分前到。", 3],
    ["短文推理", "小海先把借来的书还回图书馆，又挑了一本新书，回家后先写作业，晚上才开始读新书。小海晚上做什么？", "读新书", ["还书", "挑书", "写作业"], "按事情顺序，晚上才开始读新书。", 3],
    ["比喻理解", "“风一吹，树叶像小船一样飘下来。” 这句话把什么比作小船？", "树叶", ["风", "大树", "操场"], "句子里把飘下来的树叶比作小船。", 3],
    ["顺序理解", "做手工时，先折纸，再剪窗花，最后贴到卡片上。剪窗花之后要做什么？", "贴到卡片上", ["折纸", "重新画图", "去洗手"], "顺序里的最后一步是贴到卡片上。", 3],
    ["活动安排", "周末安排：上午去看望爷爷奶奶，中午回家吃饭，下午参加绘画课。下午他要做什么？", "参加绘画课", ["去看望爷爷奶奶", "回家吃饭", "打扫教室"], "安排里下午对应参加绘画课。", 3],
    ["留言理解", "留言：雨伞放在门后，水壶放在书桌上，作业本在书包里。想拿水壶，应该去哪里找？", "书桌上", ["门后", "书包里", "阳台上"], "留言写得很清楚，水壶在书桌上。", 3],
    ["词语理解", "“亮晶晶的露珠”里，哪个词最能写出露珠的样子？", "亮晶晶", ["露珠", "的", "样子"], "“亮晶晶”写出了露珠闪闪发亮的样子。", 3],
    ["顺序理解", "“回到家后，我先洗手，再吃点心，然后开始练琴。” 练琴前做了哪两件事？", "洗手和吃点心", ["只洗手", "只吃点心", "收拾书包和看电视"], "按顺序看，练琴前先洗手，再吃点心。", 3],
    ["短文推理", "故事里，小狗先帮小兔找胡萝卜，找到后又一起把胡萝卜送回菜园。找到胡萝卜以后，他们做了什么？", "把胡萝卜送回菜园", ["回家睡觉", "继续找白菜", "去河边钓鱼"], "找到胡萝卜后，他们又把胡萝卜送回了菜园。", 3],
    ["标点符号", "“你愿意和我一起去图书馆吗（ ）” 句末该填什么标点？", "问号", ["句号", "感叹号", "顿号"], "表示询问时，句末要用问号。", 3]
  ])
];

const gradeTwoLowerStageOneChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "条件上手", [
    ["有余数除法", "17个贝壳平均装进5个小袋，每袋最多装几个，还剩几个？", "每袋3个，还剩2个", ["每袋2个，还剩7个", "每袋3个，还剩1个", "每袋4个，还剩1个"], "17除以5，商是3，余数是2。", 1],
    ["长度比较", "一根红丝带长52厘米，蓝丝带长46厘米，红丝带比蓝丝带长多少厘米？", "6厘米", ["4厘米", "5厘米", "7厘米"], "52减46等于6厘米。", 1],
    ["时间推算", "现在是下午4时，再过2小时是几时？", "下午6时", ["下午5时", "下午7时", "晚上8时"], "下午4时再过2小时就是下午6时。", 1]
  ]),
  ...createChallengeConfigs("二年级", "语文", "条件上手", [
    ["课文理解", "《找春天》里，孩子们最想找到什么？", "春天", ["秋天", "冬天", "雪人"], "课文一开始写孩子们冲出家门去找春天。", 1],
    ["句子信息", "“小鸭把雨靴放在门口。” 这句话告诉我们雨靴放在哪里？", "门口", ["书桌上", "书包里", "窗台边"], "句子里直接说雨靴放在门口。", 1],
    ["词语理解", "“特别认真”里，哪个词表示程度更深？", "特别", ["认真", "里", "个"], "“特别”表示比一般更突出。", 1]
  ])
];

const gradeTwoLowerStageTwoChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "线索配齐", [
    ["有余数除法", "25个苹果，每6个装一盘，可以装几盘，还剩几个？", "4盘，还剩1个", ["3盘，还剩7个", "4盘，还剩2个", "5盘，正好装完"], "25除以6，商4余1。", 1],
    ["乘法应用", "7盒彩笔，每盒6支，一共有多少支？", "42", createNumericDistractors(42), "7乘6等于42。", 1],
    ["乘除配对", "已知8 × 4 = 32，那么32 ÷ 8等于几？", "4", createNumericDistractors(4), "根据乘除法关系，32除以8等于4。", 1],
    ["质量比较", "1千克和950克相比，哪个更重？", "1千克", ["950克", "一样重", "没法比较"], "1千克等于1000克，比950克重。", 1],
    ["时间计算", "从6时20分到7时整，经过了多少分钟？", "40分钟", ["20分钟", "30分钟", "50分钟"], "7时整比6时20分多40分钟。", 1]
  ]),
  ...createChallengeConfigs("二年级", "语文", "线索配齐", [
    ["传统文化", "《传统节日》里，端午节常吃什么？", "粽子", ["月饼", "汤圆", "元宵"], "端午节有吃粽子的习俗。", 1],
    ["关联词运用", "下面哪句话把“因为……所以……”用对了？", "因为下雨，所以我们带了雨伞。", ["因为我们带了雨伞，所以太阳出来了。", "因为小鸟，所以在天空飞。", "下雨因为，所以路滑。"], "“因为”后面说原因，“所以”后面说结果。", 1],
    ["量词搭配", "“一（ ）彩虹”里最合适填哪个量词？", "道", ["朵", "本", "条"], "彩虹通常用量词“道”。", 1],
    ["顺序理解", "“先洗菜，再做饭。” 按这句话去做，第一步是什么？", "洗菜", ["做饭", "盛饭", "收拾桌子"], "句子里已经说清楚先洗菜。", 1],
    ["声音词语", "“溪水哗啦哗啦地流着。” 最能表示声音的是哪个词？", "哗啦哗啦", ["溪水", "流着", "地"], "“哗啦哗啦”是描写声音的词。", 1]
  ])
];

const gradeTwoLowerStageThreeChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "短文找点", [
    ["短文应用", "图书角有27本故事书，平均放在5层书架上，每层最多放几本，还剩几本？", "每层5本，还剩2本", ["每层4本，还剩7本", "每层5本，还剩1本", "每层6本，还剩1本"], "27除以5，商5余2。", 2],
    ["短文应用", "二(2)班有36名同学去春游，每辆车坐8人，至少要几辆车？", "5辆", ["4辆", "6辆", "7辆"], "36除以8等于4余4，还要再多1辆车。", 2],
    ["质量计算", "一桶油连桶重9千克，桶重1千克，油重多少千克？", "8千克", ["7千克", "9千克", "10千克"], "总重量减去桶重，9减1等于8千克。", 2],
    ["短文应用", "商店运来4箱矿泉水，每箱9瓶，已经喝掉7瓶，还剩多少瓶？", "29", createNumericDistractors(29), "4箱共有36瓶，36减7等于29。", 2],
    ["时间计算", "从上午9:30到10:10，经过了多少分钟？", "40分钟", ["30分钟", "45分钟", "50分钟"], "9:30到10:00是30分钟，再到10:10是10分钟，共40分钟。", 2]
  ]),
  ...createChallengeConfigs("二年级", "语文", "短文找点", [
    ["通知理解", "通知：周四下午3点在美术教室排练节目，请参加的同学2点50分前到。最晚什么时候到？", "2点50分前", ["3点整", "2点30分", "下午4点"], "通知里明确写着2点50分前到。", 2],
    ["课文理解", "《开满鲜花的小路》里，门前开着什么样的鲜花？", "五颜六色的鲜花", ["雪白的蒲公英", "金黄的麦穗", "高高的向日葵"], "课文写门前开着一大片五颜六色的鲜花。", 2],
    ["短文理解", "小鹿先给花浇水，又把草拔掉，最后关上院门回家。小鹿回家前做的最后一件事是什么？", "拔草", ["浇水", "关院门", "写作业"], "回家前最后完成的是拔草。", 2],
    ["句子理解", "“春风轻轻吹着柳枝。” 这句话里哪个词写出了风很轻？", "轻轻", ["春风", "柳枝", "吹着"], "“轻轻”写出了风吹得很柔和。", 2],
    ["图表阅读", "值日表上写着：周一小青擦桌子，周二小林摆椅子，周三小红关窗。周二谁摆椅子？", "小林", ["小青", "小红", "老师"], "值日表里周二对应的是小林。", 2, "/images/challenge/g2-lower-stage3/duty-roster-xiaoqing-xiaolin-xiaohong.svg"]
  ])
];

const gradeTwoLowerStageFourChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "图表看懂", withImageUrls([
    ["图表分析", "借书统计表：童话书26本，科普书22本，漫画书31本。借得最多的是哪一类？", "漫画书", ["童话书", "科普书", "一样多"], "31本最多，所以借得最多的是漫画书。", 2],
    ["图表分析", "回收记录：废纸24千克，塑料18千克，易拉罐16千克。哪一种回收得最多？", "废纸", ["塑料", "易拉罐", "一样多"], "24千克最多，所以废纸最多。", 2],
    ["图表分析", "水果称重表：苹果900克，西瓜3千克，香蕉1500克。最重的是哪一种？", "西瓜", ["苹果", "香蕉", "一样重"], "3千克比900克和1500克都重。", 2],
    ["图表分析", "身高记录：小东135厘米，小雨132厘米，小乐138厘米。谁最高？", "小乐", ["小东", "小雨", "三人一样高"], "138厘米最高，所以小乐最高。", 2],
    ["图表分析", "文具价格表：文具盒12元，水彩笔18元，剪刀9元。最便宜的是哪一种？", "剪刀", ["文具盒", "水彩笔", "一样便宜"], "9元最便宜，所以是剪刀。", 2],
    ["图表分析", "集星榜：第一组18颗星，第二组23颗星，第三组20颗星。哪一组得星最多？", "第二组", ["第一组", "第三组", "一样多"], "23颗星最多。", 2],
    ["图表分析", "三本课外书页数分别是98页、105页、87页。页数最少的是哪一本？", "87页那本", ["98页那本", "105页那本", "三本一样多"], "87页最少。", 2],
    ["图表分析", "气温记录：周一26℃，周二29℃，周三24℃。哪一天最热？", "周二", ["周一", "周三", "三天一样热"], "29℃最高，所以周二最热。", 2],
    ["图表分析", "班车发车表：第一班7:30，第二班7:45，第三班8:00。最早发车的是哪一班？", "第一班", ["第二班", "第三班", "三班一样早"], "7:30最早。", 2],
    ["图表分析", "植物高度表：凤仙花42厘米，太阳花37厘米，牵牛花45厘米。最高的是哪一种？", "牵牛花", ["凤仙花", "太阳花", "一样高"], "45厘米最高，所以牵牛花最高。", 2]
  ], createSequentialImageUrls("g2-lower-stage4", 10, "math-chart"))),
  ...createChallengeConfigs("二年级", "语文", "图表看懂", withImageUrls([
    ["图表阅读", "课程表写着：第一节语文，第二节数学，第三节美术。第三节上什么课？", "美术", ["语文", "数学", "音乐"], "课程表里第三节是美术。", 2],
    ["图表阅读", "值日安排表：周三小雪擦黑板，周四小军浇花，周五小兰倒垃圾。周四谁浇花？", "小军", ["小雪", "小兰", "老师"], "值日安排表里周四对应小军。", 2],
    ["通知理解", "通知栏写着：周五下午4点在操场举行跳绳比赛。比赛地点在哪里？", "操场", ["礼堂", "图书馆", "教室"], "通知里明确写着在操场举行。", 2],
    ["图表阅读", "读书卡上写着：《神笔马良》，作者洪汛涛，推荐人小雨。谁写了这本书？", "洪汛涛", ["小雨", "马良", "老师"], "读书卡上作者一栏写的是洪汛涛。", 2],
    ["图表阅读", "失物招领上写着：捡到蓝色水壶一个，请到门卫室领取。应该去哪里找水壶？", "门卫室", ["广播站", "医务室", "图书角"], "失物招领上写着到门卫室领取。", 2],
    ["图表阅读", "节目单显示：第一个节目朗读，第二个节目唱歌，第三个节目舞蹈。唱歌排在第几个？", "第二个", ["第一个", "第三个", "第四个"], "节目单里唱歌排第二。", 2],
    ["图表阅读", "天气记录：周一晴，周二小雨，周三多云。哪一天适合晒衣服？", "周一", ["周二", "周三", "三天都不适合"], "晴天最适合晒衣服。", 2],
    ["图表阅读", "春游分组表：第一组看蝴蝶馆，第二组看海洋馆，第三组看植物园。想看海洋馆的是第几组？", "第二组", ["第一组", "第三组", "第四组"], "分组表中第二组去看海洋馆。", 2],
    ["图表阅读", "作息表：8:40做眼保健操，9:20阅读，10:00写字。9:20大家在做什么？", "阅读", ["写字", "做眼保健操", "放学"], "作息表中9:20对应阅读。", 2],
    ["图表阅读", "借书登记表：小东借《成语故事》，小美借《童话选》，小林借《十万个为什么》。谁借了《成语故事》？", "小东", ["小美", "小林", "老师"], "借书登记表中《成语故事》对应小东。", 2]
  ], createSequentialImageUrls("g2-lower-stage4", 10, "chinese-chart")))
];

const gradeTwoLowerStageFiveChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "两步连推", [
    ["两步计算", "4盒酸奶，每盒8杯，喝掉9杯后，还剩多少杯？", "23", createNumericDistractors(23), "4盒共有32杯，32减9等于23。", 3],
    ["有余数除法", "54颗糖平均分给8个小朋友，每人分到几颗，还剩几颗？", "每人6颗，还剩6颗", ["每人5颗，还剩14颗", "每人6颗，还剩4颗", "每人7颗，还剩2颗"], "54除以8，商6余6。", 3],
    ["质量计算", "3袋大米，每袋2千克，用去了1500克，还剩多少？", "4千克500克", ["3千克500克", "4千克", "5千克500克"], "3袋共6千克，6千克减1500克，还剩4千克500克。", 3],
    ["两步计算", "花园里有7行树苗，每行9棵，又补种了5棵，现在一共有多少棵？", "68", createNumericDistractors(68), "7乘9等于63，再加5等于68。", 3],
    ["长度计算", "一根绳子长94厘米，剪下3段，每段26厘米，还剩多少厘米？", "16厘米", ["14厘米", "18厘米", "20厘米"], "3段一共78厘米，94减78等于16厘米。", 3],
    ["两步计算", "6盒铅笔，每盒12支，送给同学17支后，还剩多少支？", "55", createNumericDistractors(55), "6盒共有72支，72减17等于55。", 3],
    ["分组计算", "45名同学做游戏，每组8人，还剩5人做记录，可以分成几组？", "5组", ["4组", "6组", "7组"], "45减5等于40，40除以8等于5组。", 3],
    ["两步计算", "苹果有2箱，每箱18个，梨有3箱，每箱12个，两种水果一共有多少个？", "72", createNumericDistractors(72), "苹果36个，梨36个，一共72个。", 3],
    ["时间计算", "小明7:35开始读书，读了45分钟，结束时是几时几分？", "8:20", ["8:10", "8:15", "8:25"], "7:35加45分钟等于8:20。", 3],
    ["两步计算", "4篮鸡蛋，每篮16个，卖出19个后，还剩多少个？", "45", createNumericDistractors(45), "4篮共有64个，64减19等于45。", 3]
  ]),
  ...createChallengeConfigs("二年级", "语文", "两步连推", [
    ["课文理解", "《小马过河》里，小马最后明白了什么？", "遇事要自己试一试", ["只听老牛的话就行", "什么事都不用想", "看见困难就回家"], "小马最后是自己试过以后才知道深浅。", 3],
    ["课文理解", "《雷锋叔叔，你在哪里》告诉我们雷锋叔叔常常在哪里？", "在帮助别人的地方", ["在山顶上", "在电视里", "在商店里"], "课文告诉我们雷锋精神在帮助别人的行动里。", 3],
    ["课文理解", "《千人糕》想告诉我们什么？", "一块糕要经过很多人的劳动", ["千人糕只能千人吃", "做糕一点也不难", "糕是从树上长出来的"], "课文借千人糕让我们明白劳动成果来之不易。", 3],
    ["顺序理解", "做饭时，妈妈先洗菜，再切菜，最后下锅炒。切菜后下一步做什么？", "下锅炒", ["洗菜", "盛饭", "摆碗筷"], "按事情顺序，切菜后就下锅炒。", 3],
    ["通知理解", "通知：明天上午8点到校门口集合去劳动基地，请大家带手套和水壶。去劳动基地前要先到哪里集合？", "校门口", ["操场", "图书馆", "食堂"], "通知里写着在校门口集合。", 3],
    ["留言理解", "留言：作业本放在书桌左边抽屉里，雨衣挂在门后。想找雨衣应该去哪里？", "门后", ["抽屉里", "窗台上", "鞋柜上"], "留言中写着雨衣挂在门后。", 3],
    ["句意理解", "“如果明天下雨，活动改在教室里举行。” 下雨时活动会在哪里举行？", "教室里", ["操场上", "图书馆", "校门口"], "句子已经说明下雨时改在教室里举行。", 3],
    ["修辞理解", "“春风一吹，柳枝跳起舞来。” 这句话把柳枝写得像什么？", "像会跳舞的人", ["像一块石头", "像一本书", "像一把伞"], "把柳枝写得会跳舞，是拟人的写法。", 3],
    ["词语运用", "下面哪句话正确用了“终于”？", "我们等了很久，终于轮到我们上场了。", ["苹果终于是红色的。", "桌子终于在教室里。", "今天终于会写字。"], "“终于”表示经过等待或努力后出现结果。", 3],
    ["活动顺序", "班队会上，大家先分组讨论，再写建议，最后派代表发言。派代表发言前要做什么？", "写建议", ["回家休息", "分糖果", "马上下课"], "按顺序，发言前一步是写建议。", 3]
  ])
];

const gradeTwoLowerStageSixChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "稳答提速", [
    ["乘法速算", "8 × 7 = ?", "56", createNumericDistractors(56), "8乘7等于56。", 3],
    ["除法速算", "42 ÷ 6 = ?", "7", createNumericDistractors(7), "42除以6等于7。", 3],
    ["减法速算", "76 - 28 = ?", "48", createNumericDistractors(48), "76减28等于48。", 3],
    ["加法速算", "37 + 29 = ?", "66", createNumericDistractors(66), "37加29等于66。", 3],
    ["单位换算", "1千克等于多少克？", "1000克", ["100克", "10000克", "10克"], "1千克等于1000克。", 3],
    ["有余数除法", "19个球，每6个装一盒，可以装几盒，还剩几个？", "3盒，还剩1个", ["2盒，还剩7个", "3盒，还剩2个", "4盒，正好装完"], "19除以6，商3余1。", 3],
    ["时间推算", "现在是6:40，再过20分钟是几时几分？", "7:00", ["6:50", "7:10", "7:20"], "6:40再过20分钟是7:00。", 3],
    ["减法速算", "95 - 47 = ?", "48", createNumericDistractors(48), "95减47等于48。", 3]
  ]),
  ...createChallengeConfigs("二年级", "语文", "稳答提速", [
    ["标点符号", "“多漂亮的彩虹啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末常用感叹号。", 3],
    ["词语理解", "“赶紧收书包”里，哪个词写出了动作很快？", "赶紧", ["收", "书包", "里"], "“赶紧”表示马上、很快。", 3],
    ["量词搭配", "“一（ ）春风”里最合适填哪个量词？", "阵", ["本", "朵", "只"], "春风通常用量词“阵”。", 3],
    ["顺序理解", "“先擦桌子，再摆椅子。” 摆椅子前要先做什么？", "擦桌子", ["回家", "洗手", "拖地"], "句子里已经说明先擦桌子。", 3],
    ["修辞理解", "“太阳像个大火球。” 这句话把什么比作大火球？", "太阳", ["白云", "月亮", "小河"], "句子把太阳比作大火球。", 3],
    ["传统文化", "《传统节日》里，中秋节常吃什么？", "月饼", ["粽子", "汤圆", "粳米饭"], "中秋节有吃月饼的习俗。", 3],
    ["词语运用", "下面哪句话正确用了“忽然”？", "小雨忽然从天上落下来。", ["铅笔忽然很高兴。", "书包忽然在跑步。", "桌子忽然在唱歌。"], "“忽然”用来写事情一下子发生。", 3],
    ["近义词", "“赶紧”的近义词是哪一个？", "立刻", ["缓慢", "终于", "安静"], "“赶紧”和“立刻”意思相近。", 3]
  ])
];

const gradeTwoLowerStageSevenChallengeConfigs = [
  ...createChallengeConfigs("二年级", "数学", "方法冲线", [
    ["综合计算", "5盒彩贴，每盒18张，送给同学27张后，还剩多少张？", "63", createNumericDistractors(63), "5盒共有90张，90减27等于63。", 3],
    ["分组计算", "68名同学坐船，每条船最多坐9人，至少要几条船？", "8条船", ["7条船", "9条船", "10条船"], "68除以9等于7余5，还需要再多1条船。", 3],
    ["质量计算", "2千克500克苹果，又买了800克，现在一共有多少？", "3千克300克", ["2千克800克", "3千克", "4千克300克"], "2500克加800克等于3300克，也就是3千克300克。", 3],
    ["长度计算", "一根84厘米的绳子，做了4个边长18厘米的正方形后，还剩多少厘米？", "12厘米", ["10厘米", "14厘米", "16厘米"], "4个边共用72厘米，84减72等于12厘米。", 3, "/images/challenge/g2-lower-stage7/rope-84-four-squares-18.svg"],
    ["综合计算", "花园里有7行树，每行12棵，又补种了9棵，现在一共有多少棵？", "93", createNumericDistractors(93), "7乘12等于84，再加9等于93。", 3],
    ["有余数除法", "96颗糖平均分给9个小朋友，每人分到几颗，还剩几颗？", "每人10颗，还剩6颗", ["每人9颗，还剩15颗", "每人10颗，还剩5颗", "每人11颗，还剩7颗"], "96除以9，商10余6。", 3],
    ["时间推算", "8:15开始做题，55分钟后结束，结束时是几时几分？", "9:10", ["9:00", "9:05", "9:15"], "8:15加55分钟等于9:10。", 3],
    ["综合计算", "5篮鸡蛋，每篮14个，卖出18个后，还剩多少个？", "52", createNumericDistractors(52), "5篮共有70个，70减18等于52。", 3],
    ["综合计算", "三层书架上分别放着28本、32本、26本书，一共有多少本？", "86", createNumericDistractors(86), "28加32再加26等于86。", 3],
    ["质量计算", "一桶油重5千克，用去1800克后，还剩多少？", "3千克200克", ["2千克200克", "3千克800克", "4千克200克"], "5000克减1800克等于3200克，也就是3千克200克。", 3]
  ]),
  ...createChallengeConfigs("二年级", "语文", "方法冲线", [
    ["课文理解", "《蜘蛛开店》里，蜘蛛最后为什么匆忙跑回网上？", "蜈蚣的脚太多了", ["顾客全都走了", "门坏了", "忘记带钱包了"], "因为蜈蚣脚太多，织袜子太麻烦了。", 3],
    ["课文理解", "《青蛙卖泥塘》最后为什么不卖泥塘了？", "泥塘变成了好地方", ["没人来买", "青蛙搬家了", "天一直下雨"], "泥塘经过改造后变得很好，青蛙舍不得卖了。", 3],
    ["课文理解", "《小毛虫》最后变成了什么？", "蝴蝶", ["蜻蜓", "小鸟", "蜜蜂"], "小毛虫经历变化，最后变成了蝴蝶。", 3],
    ["通知理解", "通知：运动会入场式8点开始，请各班7点45分前在操场北侧排好队。最晚什么时候要排好队？", "7点45分前", ["8点整", "7点30分", "8点15分"], "通知里写明7点45分前排好队。", 3],
    ["顺序理解", "“回家后，我先洗手，再写作业，最后去看书。” 看书前要做什么？", "洗手和写作业", ["只洗手", "只写作业", "先吃晚饭"], "按顺序，看书前先洗手，再写作业。", 3],
    ["句意理解", "“风把花香送得很远。” 这句话主要写花香怎样？", "飘得很远", ["很苦", "很安静", "很短"], "句子是在写花香飘散得很远。", 3],
    ["修辞理解", "“月亮像弯弯的小船。” 这句话把什么比作小船？", "月亮", ["星星", "白云", "湖水"], "句子里把月亮比作小船。", 3],
    ["留言理解", "留言：雨衣在门后，水彩笔在第二层抽屉，故事书在枕头边。想找故事书应该去哪里？", "枕头边", ["门后", "第二层抽屉", "阳台上"], "留言里写着故事书在枕头边。", 3],
    ["标点符号", "“你明天去植树吗（ ）” 句末最合适填什么标点？", "问号", ["句号", "感叹号", "逗号"], "表示提问时，句末常用问号。", 3],
    ["词语理解", "“恋恋不舍”最适合形容下面哪种心情？", "舍不得离开", ["非常生气", "一点都不怕", "特别着急"], "“恋恋不舍”表示留恋，不愿分开。", 3]
  ])
];

const gradeThreeStageOneChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "读题转弯", [
    ["应用判断", "一本故事书有36页，小明每天看9页，几天能看完？", "4", createNumericDistractors(4), "36÷9=4，需要4天看完。", 1],
    ["平均分", "24块饼干平均分给6个同学，每人分到几块？", "4", createNumericDistractors(4), "24平均分成6份，每份是4。", 1],
    ["路程计算", "操场一圈400米，小军跑了2圈，一共跑了多少米？", "800", createNumericDistractors(800), "400×2=800米。", 1]
  ]),
  ...createChallengeConfigs("三年级", "语文", "读题转弯", [
    ["修辞理解", "“荷叶圆圆的，像一个个碧绿的大圆盘。” 这句话把荷叶比作什么？", "大圆盘", ["小雨伞", "小船", "星星"], "句子里把荷叶比作碧绿的大圆盘。", 1],
    ["近义词", "在“忽然下起了大雨”里，“忽然”更接近哪个词？", "突然", ["经常", "缓慢", "安静"], "“忽然”和“突然”意思相近。", 1],
    ["句意理解", "“今天的风真凉快！” 这句话更像是在表达什么？", "赞叹", ["提问", "命令", "批评"], "句末用了感叹语气，表达的是赞叹。", 1]
  ])
];

const gradeThreeStageTwoChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "信息拆分", [
    ["信息提取", "做风车用了15张红纸、9张黄纸和6张蓝纸，一共用了多少张纸？", "30", createNumericDistractors(30), "把三种颜色的纸加起来，15+9+6=30。", 1],
    ["信息提取", "一辆车上午运来28箱苹果，下午又运来17箱，一共运来多少箱？", "45", createNumericDistractors(45), "28加17等于45。", 1],
    ["平均分", "48名同学坐船，每条船坐8人，正好坐满需要几条船？", "6", createNumericDistractors(6), "48÷8=6条船。", 1],
    ["乘法应用", "一根绳子剪成8段，每段长5米，这根绳子原来长多少米？", "40", createNumericDistractors(40), "8段每段5米，用8×5=40米。", 1],
    ["信息提取", "果园里有6行梨树，每行7棵，又种了5棵，现在一共有多少棵？", "47", createNumericDistractors(47), "先算6×7=42，再加5，得到47。", 1]
  ]),
  ...createChallengeConfigs("三年级", "语文", "信息拆分", [
    ["通知理解", "通知：周五下午3点在报告厅举行故事比赛，参赛同学2点50分前入场。比赛地点在哪里？", "报告厅", ["操场", "图书馆", "教室"], "通知里明确写着比赛地点是报告厅。", 1],
    ["留言理解", "留言：请先把作业本交到办公室第一张桌子上，再去操场集合。第一步要做什么？", "把作业本交到办公室", ["去操场集合", "回教室坐好", "去食堂排队"], "留言中“先”后面的内容就是第一步。", 1],
    ["顺序理解", "小明先查资料，再写提纲，最后完成手抄报。完成手抄报前一步是什么？", "写提纲", ["查资料", "贴照片", "去打印"], "按顺序看，最后一步前面是写提纲。", 1],
    ["信息判断", "公告牌写着：图书馆每周二闭馆，周三到周日开放。星期二能不能借书？", "不能借书", ["可以借书", "只能借一本", "只在上午能借"], "因为周二闭馆，所以不能借书。", 1],
    ["句意提取", "“春雨把小草叫醒了，也把花儿染红了。” 这句话写了春雨做了哪两件事？", "叫醒小草，染红花儿", ["吹走白云，叫来燕子", "浇湿屋顶，吹落叶子", "赶跑乌云，带来雷声"], "句子里直接写了春雨做的两件事。", 1]
  ])
];

const gradeThreeStageThreeChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "估算判断", [
    ["估算判断", "198最接近下面哪个整百数？", "200", ["100", "300", "400"], "198离200最近。", 2],
    ["估算判断", "302 + 97 的和大约是多少？", "400", ["300", "500", "600"], "302约是300，97约是100，所以和大约是400。", 2],
    ["估算判断", "一袋大米重49千克，估一估，约重多少千克？", "50千克", ["40千克", "60千克", "90千克"], "49千克约等于50千克。", 2],
    ["估算判断", "买文具大约要198元，准备多少钱更合适？", "200元", ["100元", "150元", "300元"], "198元接近200元，准备200元更合适。", 2],
    ["估算判断", "学校准备了403瓶水，平均分给8个班，每班大约分多少瓶？", "50瓶", ["5瓶", "40瓶", "80瓶"], "403约是400，400÷8≈50。", 2]
  ]),
  ...createChallengeConfigs("三年级", "语文", "估算判断", [
    ["词义判断", "“教室里顿时安静下来”里的“顿时”最接近哪个词？", "立刻", ["一直", "偶尔", "缓缓"], "“顿时”表示很快、一下子。", 2],
    ["句意判断", "“天空像洗过一样蓝”主要想说明什么？", "天空特别蓝很干净", ["天空快下雨了", "天空里有很多鸟", "天空变黑了"], "这句话重点写天空蓝而且清亮。", 2],
    ["成语理解", "“他把这本书看得津津有味”更能说明他怎样？", "很爱看这本书", ["走路很快", "天气很热", "声音很大"], "“津津有味”表示很有兴趣。", 2],
    ["判断句意", "下面哪句话更像是在提醒大家爱护环境？", "看见垃圾要主动捡起来。", ["下课后快点跑回家。", "苹果洗一洗更好吃。", "教室里的灯真明亮。"], "主动捡垃圾是在提醒大家爱护环境。", 2],
    ["词义判断", "“我估计十分钟就能到”里的“估计”最接近哪个词？", "大概", ["必须", "马上", "已经"], "“估计”表示大概、推测。", 2]
  ])
];

const gradeThreeStageFourChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "图文转换", withImageUrls([
    ["图表分析", "图书借阅表显示：童话书32本，科普书28本，作文书35本。借出最多的是哪一类？", "作文书", ["童话书", "科普书", "一样多"], "35本最多，所以借出最多的是作文书。", 2],
    ["图表分析", "水果店销售记录：苹果45千克，香蕉38千克，橙子41千克。卖得最多的是哪一种？", "苹果", ["香蕉", "橙子", "一样多"], "45千克最多，所以苹果卖得最多。", 2],
    ["图表分析", "兴趣小组人数统计：书法组18人，篮球组24人，合唱组21人。人数最少的是哪个组？", "书法组", ["篮球组", "合唱组", "一样少"], "18人最少，所以是书法组。", 2],
    ["图表分析", "三辆车运货数量分别是56箱、49箱、62箱。运得最多的是哪辆车？", "62箱那辆", ["56箱那辆", "49箱那辆", "三辆一样多"], "62箱最多。", 2],
    ["图表分析", "三种文具价格表：钢笔8元，笔记本6元，文件夹9元。最便宜的是哪一种？", "笔记本", ["钢笔", "文件夹", "一样便宜"], "6元最低，所以笔记本最便宜。", 2],
    ["图表分析", "跳绳成绩表：小东86下，小林92下，小雨88下。谁跳得最多？", "小林", ["小东", "小雨", "三人一样多"], "92下最多，所以是小林。", 2],
    ["图表分析", "植物高度记录：向日葵95厘米，玉米87厘米，辣椒79厘米。最高的是哪一种？", "向日葵", ["玉米", "辣椒", "一样高"], "95厘米最高。", 2],
    ["图表分析", "班级节水记录：第一周36桶，第二周42桶，第三周39桶。哪一周节水最多？", "第二周", ["第一周", "第三周", "一样多"], "42桶最多，所以是第二周。", 2],
    ["图表分析", "阅览室座位统计：第一排12个，第二排10个，第三排14个。哪一排座位最多？", "第三排", ["第一排", "第二排", "一样多"], "14个最多，所以第三排座位最多。", 2],
    ["图表分析", "三本书页数分别是126页、138页、119页。页数最少的是哪一本？", "119页那本", ["126页那本", "138页那本", "三本一样多"], "119页最少。", 2]
  ], createSequentialImageUrls("g3-upper-stage4", 10, "math-chart"))),
  ...createChallengeConfigs("三年级", "语文", "图文转换", withImageUrls([
    ["图表阅读", "课程表写着：第一节数学，第二节语文，第三节科学，第四节体育。第三节上什么课？", "科学", ["数学", "语文", "体育"], "课程表里第三节是科学。", 2],
    ["图表阅读", "值日安排表：周一小乐倒垃圾，周二小文擦黑板，周三小军摆桌椅。周二谁负责擦黑板？", "小文", ["小乐", "小军", "老师"], "值日表上周二对应小文。", 2],
    ["图表阅读", "节目单显示：第一个节目合唱，第二个节目舞蹈，第三个节目朗诵。舞蹈排在第几个？", "第二个", ["第一个", "第三个", "第四个"], "节目单里舞蹈排第二。", 2],
    ["图表阅读", "作息表：8:00上课，9:40课间操，10:10阅读。10:10大家在做什么？", "阅读", ["上课", "课间操", "放学"], "作息表中10:10安排的是阅读。", 2],
    ["图表阅读", "读书卡上写着：《昆虫记》，作者法布尔，推荐人小林。谁写了这本书？", "法布尔", ["小林", "老师", "昆虫"], "读书卡上作者一栏写的是法布尔。", 2],
    ["图表阅读", "导览图说明：校门东边是操场，北边是图书馆，西边是食堂。图书馆在校门的哪一边？", "北边", ["东边", "西边", "南边"], "导览图里写着图书馆在北边。", 2],
    ["图表阅读", "天气预报牌：周一晴，周二阴，周三小雨。哪一天适合晒被子？", "周一", ["周二", "周三", "三天都不适合"], "晴天最适合晒被子。", 2],
    ["图表阅读", "通知栏写着：科技节开幕式4月18日上午9点在礼堂举行。开幕式在哪里举行？", "礼堂", ["操场", "图书馆", "教室"], "通知栏里明确写的是礼堂。", 2],
    ["图表阅读", "失物招领上写着：捡到一顶蓝色帽子，请到门卫室领取。想找帽子应该去哪里？", "门卫室", ["广播站", "图书角", "食堂"], "失物招领上写着到门卫室领取。", 2],
    ["图表阅读", "借书登记表：小红借《海底两万里》，小刚借《十万个为什么》，小雨借《安徒生童话》。谁借了《海底两万里》？", "小红", ["小刚", "小雨", "老师"], "登记表中《海底两万里》对应小红。", 2]
  ], createSequentialImageUrls("g3-upper-stage4", 10, "chinese-chart")))
];

const gradeThreeStageFiveChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "应用连推", [
    ["两步应用", "一箱有24瓶矿泉水，运来3箱后又拿走15瓶，还剩多少瓶？", "57", createNumericDistractors(57), "先算3箱共有72瓶，再减15瓶，还剩57瓶。", 3],
    ["两步应用", "学校买来5包彩纸，每包18张，做手工用去27张，还剩多少张？", "63", createNumericDistractors(63), "先算5包共有90张，再减27张，剩63张。", 3],
    ["两步应用", "一辆客车上午运了46人，下午比上午多运18人，这一天一共运了多少人？", "110", createNumericDistractors(110), "下午运64人，再和上午46人相加，得110人。", 3],
    ["两步应用", "食堂买来72个鸡蛋，平均装进8个盒子，每盒又拿走2个，现在每盒还有几个？", "7", createNumericDistractors(7), "72÷8=9，每盒拿走2个后还剩7个。", 3],
    ["两步应用", "一本相册每页贴6张照片，贴满8页后又多贴了5张，一共贴了多少张照片？", "53", createNumericDistractors(53), "8页共48张，再加5张，得到53张。", 3],
    ["两步应用", "操场跑道一圈是250米，小林跑了4圈后又走了120米，一共运动了多少米？", "1120", createNumericDistractors(1120), "4圈是1000米，再加120米，共1120米。", 3],
    ["两步应用", "书架上层有38本书，下层比上层多16本，两层一共有多少本？", "92", createNumericDistractors(92), "下层有54本，再加上层38本，共92本。", 3],
    ["两步应用", "买3盒钢笔，每盒12支，又送给同学9支，还剩多少支？", "27", createNumericDistractors(27), "3盒共36支，送出9支后还剩27支。", 3],
    ["两步应用", "果园里有9行苹果树，每行14棵，后来又补种了8棵，现在一共有多少棵？", "134", createNumericDistractors(134), "9×14=126，再加8棵，共134棵。", 3],
    ["两步应用", "一根木条长96厘米，先剪下28厘米，又剪下34厘米，还剩多少厘米？", "34", createNumericDistractors(34), "一共剪下62厘米，用96减62，还剩34厘米。", 3]
  ]),
  ...createChallengeConfigs("三年级", "语文", "应用连推", [
    ["短文推理", "小明先在图书馆借了一本书，回家后先写作业，再读了半小时，晚上把读书笔记写好。写读书笔记前他做了什么？", "读了半小时书", ["借书", "写作业", "去睡觉"], "按事情顺序，写笔记前先读了半小时书。", 3],
    ["通知理解", "通知：周六8点在校门口集合去博物馆参观，要求穿校服、带水杯。集合以后大家要去哪里？", "博物馆", ["图书馆", "体育馆", "食堂"], "通知中写明集合后去博物馆参观。", 3],
    ["顺序理解", "做实验时，先把种子放进杯子里，再倒入清水，最后贴上标签。倒入清水后下一步做什么？", "贴上标签", ["放种子", "换杯子", "拿回家"], "按步骤看，倒水后下一步是贴标签。", 3],
    ["阅读推理", "小华整理房间，先叠被子，再擦书桌，然后把图书按大小摆好。擦完书桌后他做什么？", "把图书按大小摆好", ["叠被子", "马上出门", "去厨房洗碗"], "顺序中的下一步是摆好图书。", 3],
    ["句意理解", "“风停了，湖面像镜子一样平静。” 这句话主要想说明什么？", "湖面非常平静", ["湖面很浑浊", "湖里有很多鱼", "天空开始下雪"], "把湖面比作镜子，是在写它很平静。", 3],
    ["阅读推理", "小军先把演讲稿读熟，又请爸爸帮他修改，最后站在镜子前练习。站在镜子前练习之前，他做了什么？", "请爸爸帮他修改", ["写演讲稿", "去操场跑步", "上台演讲"], "练习前一步是请爸爸帮忙修改。", 3],
    ["通知理解", "班级公告：周三带跳绳参加比赛，周四交手工作品，周五展示读书卡。周四要交什么？", "手工作品", ["跳绳", "读书卡", "作文"], "公告里周四对应的是交手工作品。", 3, "/images/challenge/g3-upper-stage5/class-notice-ropework-card.svg"],
    ["阅读推理", "小狗先把球踢到草地上，又追过去叼回来，最后把球放进篮子里。把球放进篮子前，小狗做了什么？", "追过去叼回来", ["把球踢上树", "回家睡觉", "去找主人"], "按顺序看，放进篮子前是叼回来。", 3],
    ["词语运用", "下面哪句话最能表现“继续努力”的意思？", "虽然这次没成功，他还是认真练习。", ["作业写完就不再看了。", "一下课就把书扔在桌上。", "看到困难马上放弃了。"], "认真练习体现了继续努力。", 3],
    ["阅读推理", "游园时，大家先在门口领地图，再去动物区参观，最后到草地集合拍照。集合拍照前去的是哪里？", "动物区", ["门口", "教室", "食堂"], "按活动顺序，集合拍照前在动物区参观。", 3]
  ])
];

const gradeThreeStageSixChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "限时稳答", [
    ["乘法速算", "12 × 4 = ?", "48", createNumericDistractors(48), "12乘4等于48。", 3],
    ["除法速算", "81 ÷ 9 = ?", "9", createNumericDistractors(9), "81除以9等于9。", 3],
    ["加法速算", "126 + 37 = ?", "163", createNumericDistractors(163), "126加37等于163。", 3],
    ["减法速算", "205 - 68 = ?", "137", createNumericDistractors(137), "205减68等于137。", 3],
    ["乘法速算", "14 × 6 = ?", "84", createNumericDistractors(84), "14乘6等于84。", 3],
    ["除法速算", "96 ÷ 8 = ?", "12", createNumericDistractors(12), "96除以8等于12。", 3],
    ["周长计算", "一个长方形长9厘米、宽4厘米，它的周长是多少厘米？", "26", createNumericDistractors(26), "周长是(9+4)×2=26厘米。", 3, "/images/challenge/g3-upper-stage6/rectangle-9x4-perimeter.svg"],
    ["时间计算", "从9:15到10:00，经过了多少分钟？", "45", createNumericDistractors(45), "9:15到10:00一共45分钟。", 3]
  ]),
  ...createChallengeConfigs("三年级", "语文", "限时稳答", [
    ["古诗积累", "“两个黄鹂鸣翠柳”的下一句是什么？", "一行白鹭上青天", ["窗含西岭千秋雪", "门泊东吴万里船", "低头思故乡"], "这是《绝句》中的名句。", 3],
    ["词语理解", "“依依不舍”最能形容下面哪种心情？", "舍不得离开", ["特别生气", "非常害怕", "一点也不在乎"], "“依依不舍”表示留恋，不忍分开。", 3],
    ["标点符号", "“多么壮观的瀑布啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "顿号"], "表示赞叹时常用感叹号。", 3],
    ["句意理解", "“他像小燕子一样轻快地跑过去。” 这句话主要想写他怎样？", "跑得轻快", ["跑得很慢", "站着不动", "说话很响"], "把他比作小燕子，是在写动作轻快。", 3],
    ["近义词", "“立刻”的近义词是哪一个？", "马上", ["终于", "一直", "偶尔"], "“立刻”和“马上”意思接近。", 3],
    ["成语理解", "“一丝不苟”最适合形容做事怎样？", "认真仔细", ["非常缓慢", "十分热闹", "有点害怕"], "“一丝不苟”表示做事认真细致。", 3],
    ["句子排序", "“先擦窗户，再拖地。” 按这句话做事，拖地前先要做什么？", "擦窗户", ["搬桌子", "回家", "洗衣服"], "句子里已经告诉我们先擦窗户。", 3],
    ["词语运用", "下面哪句话正确用了“忽然”？", "天忽然下起了大雨。", ["桌子忽然很整齐。", "苹果忽然在地上跑。", "铅笔忽然很香。"], "“忽然”表示事情一下子发生。", 3]
  ])
];

const gradeThreeStageSevenChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "综合冲线", [
    ["综合计算", "一个书架有4层，每层放28本书，又新添了15本，一共放了多少本书？", "127", createNumericDistractors(127), "4层共有112本，再加15本，一共127本。", 3],
    ["综合计算", "工人叔叔上午运来135块砖，下午运来的比上午少27块，这一天一共运来多少块砖？", "243", createNumericDistractors(243), "下午运108块，135+108=243。", 3],
    ["综合计算", "把84颗糖平均装进7袋，每袋再放进3颗巧克力，每袋共有多少颗？", "15", createNumericDistractors(15), "84÷7=12，再加3，共15颗。", 3],
    ["综合计算", "一条跑道长300米，小乐跑了3圈后又跑了150米，一共跑了多少米？", "1050", createNumericDistractors(1050), "3圈是900米，再加150米，共1050米。", 3],
    ["综合计算", "一箱苹果有48个，卖出19个后，又补进25个，现在箱里有多少个？", "54", createNumericDistractors(54), "48-19+25=54。", 3],
    ["综合计算", "一根铁丝长120厘米，先做成一个边长18厘米的正方形，还剩多少厘米？", "48", createNumericDistractors(48), "正方形周长是18×4=72厘米，120-72=48厘米。", 3, "/images/challenge/g3-upper-stage7/wire-120-square-18.svg"],
    ["综合计算", "学校买来9盒彩笔，每盒16支，分给6个班后还剩12支，每个班分到多少支？", "22", createNumericDistractors(22), "共144支，分掉132支，132÷6=22。", 3],
    ["综合计算", "图书馆第一天借出58本书，第二天借出的比第一天多16本，两天一共借出多少本？", "132", createNumericDistractors(132), "第二天借74本，两天共132本。", 3],
    ["综合计算", "买3个足球，每个78元，付给售货员250元，应找回多少元？", "16", createNumericDistractors(16), "3个足球共234元，250-234=16元。", 3],
    ["时间推算", "一场演出9:40开始，进行了1小时25分钟，结束时是几时几分？", "11:05", ["10:45", "11:15", "12:05"], "9:40加1小时25分钟，结束时间是11:05。", 3]
  ]),
  ...createChallengeConfigs("三年级", "语文", "综合冲线", [
    ["通知理解", "通知：4月20日上午8:30在操场举行运动会开幕式，请各班8:15前整队完成。最晚什么时候要整好队？", "8:15前", ["8:30", "8:00", "9:15"], "通知里写明要在8:15前整队完成。", 3],
    ["短文推理", "小兰先把参观博物馆的内容记在本子上，回家后整理成小报，第二天又在班里介绍。她在班里介绍前做了什么？", "整理成小报", ["参观博物馆", "回家睡觉", "去公园玩"], "按顺序，介绍前先整理成小报。", 3],
    ["修辞理解", "“阳光像金子一样洒满大地。” 这句话把什么比作金子？", "阳光", ["大地", "花朵", "云彩"], "句子里把阳光比作金子。", 3],
    ["句意概括", "“他读书时一会儿皱眉，一会儿点头。” 这句话最能说明什么？", "他读得很投入", ["他在打瞌睡", "他不喜欢读书", "他想马上回家"], "皱眉和点头说明他边读边思考，很投入。", 3],
    ["顺序理解", "班队活动先分组讨论，再写发言提纲，最后上台交流。上台交流前要先做什么？", "写发言提纲", ["回家休息", "打扫卫生", "先去操场"], "活动顺序里，上台前一步是写提纲。", 3],
    ["词语理解", "“喜出望外”最适合形容下面哪种心情？", "非常高兴又有些意外", ["特别生气", "十分难过", "完全害怕"], "“喜出望外”表示遇到意外的喜事，非常高兴。", 3],
    ["阅读推理", "小军先把种植观察记录下来，又给植物浇水，最后把花盆搬到阳光下。浇水后他做什么？", "把花盆搬到阳光下", ["记录观察", "去操场玩", "换一个花盆"], "按顺序，浇水后的下一步是搬到阳光下。", 3, "/images/challenge/g3-upper-stage7/plant-observe-water-sun.svg"],
    ["标点符号", "“这本书真有意思（ ）” 句末最适合填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示强烈感受时，句末常用感叹号。", 3],
    ["词语运用", "下面哪句话最能体现“坚持不懈”？", "他每天练习书法，从不间断。", ["他写两笔就去玩了。", "他一遇到难题就放弃。", "他总说以后再学。"], "每天坚持练习，体现了坚持不懈。", 3],
    ["阅读推理", "游学那天，大家先在教室听安全提醒，再乘车去基地，午饭后进行制作活动。制作活动前大家做了什么？", "先听提醒，再乘车到基地并吃午饭", ["直接回家", "先考试", "马上去看电影"], "按活动顺序，制作活动前先听提醒、乘车到基地，再吃午饭。", 3]
  ])
];

const gradeThreeLowerStageOneChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "读题转弯", [
    ["面积基础", "长方形菜圃长8米，宽5米，面积是多少平方米？", "40平方米", ["35平方米", "30平方米", "45平方米"], "长方形面积用长乘宽，8乘5等于40平方米。", 1, "/images/challenge/g3-lower-stage1/rectangle-8x5-area.svg"],
    ["小数换算", "0.7元等于多少角？", "7角", ["70角", "17角", "0.7角"], "1元等于10角，所以0.7元就是7角。", 1],
    ["日期判断", "4月一共有30天，4月的最后一天是几月几日？", "4月30日", ["4月29日", "5月1日", "3月30日"], "4月有30天，所以最后一天是4月30日。", 1]
  ]),
  ...createChallengeConfigs("三年级", "语文", "读题转弯", [
    ["课文理解", "《燕子》里，燕子是从哪里赶来的？", "南方", ["北方", "西方", "海底"], "课文写燕子从南方赶来，为春天增添了生机。", 1],
    ["句子信息", "“荷叶挨挨挤挤的，像一个个碧绿的大圆盘。” 这句话把什么比作大圆盘？", "荷叶", ["荷花", "蜻蜓", "池水"], "句子里把挨挨挤挤的荷叶比作碧绿的大圆盘。", 1],
    ["词语理解", "“清香扑鼻”里，哪个词写出了香味迎面而来？", "扑鼻", ["清香", "里", "迎面"], "“扑鼻”写出了香味直往鼻子里来的感觉。", 1]
  ])
];

const gradeThreeLowerStageTwoChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "信息拆分", [
    ["周长计算", "一个长方形操场长9米，宽4米，它的周长是多少米？", "26", createNumericDistractors(26), "周长是(9+4)乘2，等于26米。", 1, "/images/challenge/g3-lower-stage2/playground-9x4-perimeter.svg"],
    ["面积计算", "一块边长6分米的正方形地砖，面积是多少平方分米？", "36", createNumericDistractors(36), "正方形面积是边长乘边长，6乘6等于36。", 1, "/images/challenge/g3-lower-stage2/square-tile-6-area.svg"],
    ["小数计算", "一本练习本2.5元，买2本一共多少元？", "5", createNumericDistractors(5), "2.5元乘2等于5元。", 1],
    ["单位换算", "1米5分米一共是多少分米？", "15分米", ["10分米", "12分米", "20分米"], "1米是10分米，再加5分米，一共15分米。", 1],
    ["周期计算", "5个星期一共有多少天？", "35天", ["30天", "40天", "25天"], "1个星期有7天，5个星期就是35天。", 1]
  ]),
  ...createChallengeConfigs("三年级", "语文", "信息拆分", [
    ["课文理解", "《荷花》里，白荷花是从什么之间冒出来的？", "大圆盘之间", ["树叶中间", "石头旁边", "小路两边"], "课文写白荷花从大圆盘之间冒出来。", 1],
    ["寓言理解", "《守株待兔》里，农夫天天守在树桩旁，结果怎样？", "再也没有等到兔子", ["每天都捡到兔子", "收了很多庄稼", "去山上放羊了"], "农夫靠运气等兔子，最后什么也没有等到。", 1],
    ["课文理解", "《陶罐和铁罐》里，许多年后，人们先发现了谁？", "陶罐", ["铁罐", "金罐", "木罐"], "故事里多年后被挖出来的是埋在土里的陶罐。", 1],
    ["课文理解", "《鹿角和鹿腿》里，鹿最后觉得什么最有用？", "难看的腿", ["美丽的角", "长长的尾巴", "清清的河水"], "被狮子追赶时，鹿靠腿逃生，明白了腿更有用。", 1],
    ["量词搭配", "“一（ ）清香”里最合适填哪个量词？", "阵", ["本", "条", "朵"], "清香通常用量词“阵”。", 1]
  ])
];

const gradeThreeLowerStageThreeChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "估算判断", [
    ["估算判断", "一盒彩纸有198张，另一盒有203张，两盒一共大约400张，对吗？", "对", ["不对", "大约500张", "大约300张"], "198接近200，203也接近200，所以和大约是400。", 2],
    ["估算判断", "49名同学每人发4支铅笔，大约要200支铅笔，对吗？", "对", ["不对", "大约100支", "大约300支"], "49接近50，50乘4约等于200。", 2],
    ["面积判断", "一块长11米、宽4米的草地，面积会超过40平方米吗？", "会", ["不会", "正好40平方米", "没法判断"], "11乘4等于44，44平方米超过40平方米。", 2, "/images/challenge/g3-lower-stage3/grass-11x4-over-40.svg"],
    ["估算判断", "6元8角和9角合起来，大约7元，这样估算对吗？", "对", ["不对", "大约6元", "大约8元"], "6元8角接近7元，再加9角，估成大约7元是合理的粗估。", 2],
    ["路程判断", "一圈跑道400米，跑2圈大约800米，这样判断对吗？", "对", ["不对", "大约600米", "大约1000米"], "400乘2就是800，所以这个判断对。", 2]
  ]),
  ...createChallengeConfigs("三年级", "语文", "估算判断", [
    ["寓言理解", "《守株待兔》这个故事最想提醒我们什么？", "不能靠运气过日子", ["做事越慢越好", "天天等着就会成功", "农田不用管理"], "故事告诉我们做事不能只靠运气，要靠自己的劳动。", 2],
    ["词语体会", "“荷花在这些大圆盘之间冒出来。” “冒”字更能看出荷花怎样？", "有生气地长出来", ["一动不动", "马上要枯萎", "躲在叶子后面"], "“冒”写出了荷花向上生长、很有精神的样子。", 2],
    ["通知判断", "通知：周三下午2点在图书馆分享读书心得，请参加的同学1点50分前到。1点55分到还能算准时吗？", "不能", ["能", "正好最早", "要明天再去"], "通知要求1点50分前到，1点55分已经晚了。", 2],
    ["句意概括", "“这一池的荷花都开了。” 这句话最能说明什么？", "荷花开得很多", ["只有一朵荷花开了", "池里没有荷花", "荷花全谢了"], "“一池”“都开了”说明开花的荷花很多。", 2],
    ["课文理解", "《陶罐和铁罐》里，铁罐后来不见了，主要因为怎样？", "它生锈碎掉了", ["它飞到了天上", "它被陶罐拿走了", "它变成了金子"], "铁罐经不起时间的变化，最后生锈并破碎了。", 2]
  ])
];

const gradeThreeLowerStageFourChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "图文转换", withImageUrls([
    ["图表分析", "文具价格表：毛笔12元，宣纸8元，墨汁6元。最便宜的是哪一种？", "墨汁", ["毛笔", "宣纸", "一样便宜"], "6元最低，所以墨汁最便宜。", 2],
    ["图表分析", "种植面积表：白菜18平方米，萝卜24平方米，青菜21平方米。面积最大的是哪一种？", "萝卜", ["白菜", "青菜", "一样大"], "24平方米最大，所以是萝卜。", 2],
    ["图表分析", "水果称重表：西瓜4千克，菠萝2500克，苹果1800克。最重的是哪一种？", "西瓜", ["菠萝", "苹果", "一样重"], "4千克等于4000克，比2500克和1800克都重。", 2],
    ["图表分析", "阅读安排表：9:10阅读，9:50数学，10:30科学。9:50在上什么课？", "数学", ["阅读", "科学", "体育"], "安排表中9:50对应数学。", 2],
    ["图表分析", "月份天数表：2月28天，4月30天，5月31天。天数最多的是哪个月？", "5月", ["2月", "4月", "一样多"], "31天最多，所以是5月。", 2],
    ["图表分析", "跳远成绩表：小宇145厘米，小晨152厘米，小安149厘米。谁跳得最远？", "小晨", ["小宇", "小安", "三人一样远"], "152厘米最大，所以小晨跳得最远。", 2],
    ["图表分析", "教室面积表：一组48平方米，二组52平方米，三组50平方米。面积最大的是哪一组？", "二组", ["一组", "三组", "一样大"], "52平方米最大。", 2],
    ["图表分析", "商品价签：牛奶2元8角，面包3元5角，饼干4元2角。最贵的是哪一种？", "饼干", ["牛奶", "面包", "一样贵"], "4元2角最高，所以饼干最贵。", 2],
    ["图表分析", "班车时刻表：第一班8:05，第二班8:20，第三班8:40。最早发车的是哪一班？", "第一班", ["第二班", "第三班", "三班一样早"], "8:05最早。", 2],
    ["图表分析", "树木高度表：香樟树3米，银杏树4米，石榴树2米。最高的是哪一种？", "银杏树", ["香樟树", "石榴树", "一样高"], "4米最高，所以银杏树最高。", 2]
  ], createSequentialImageUrls("g3-lower-stage4", 10, "math-chart"))),
  ...createChallengeConfigs("三年级", "语文", "图文转换", withImageUrls([
    ["图表阅读", "课程表写着：第一节语文，第二节数学，第三节音乐，第四节美术。第三节上什么课？", "音乐", ["语文", "数学", "美术"], "课程表中第三节对应音乐。", 2],
    ["图表阅读", "值日安排表：周一小林浇花，周二小雅擦窗，周三小东整理图书。周二谁擦窗？", "小雅", ["小林", "小东", "老师"], "值日表里周二对应小雅。", 2],
    ["通知理解", "通知栏写着：周四下午4点在礼堂举行故事分享会。活动地点在哪里？", "礼堂", ["操场", "图书馆", "教室"], "通知里明确写着在礼堂举行。", 2],
    ["图表阅读", "读书卡上写着：《海底世界》，作者石友，推荐人小雨。谁是推荐人？", "小雨", ["石友", "海底世界", "老师"], "读书卡上推荐人一栏写的是小雨。", 2],
    ["图表阅读", "导览图说明：校门东边是操场，西边是食堂，北边是科技楼。科技楼在校门的哪一边？", "北边", ["东边", "西边", "南边"], "导览图中写着科技楼在北边。", 2],
    ["图表阅读", "失物招领上写着：捡到一副蓝色手套，请到门卫室领取。应该去哪里找手套？", "门卫室", ["广播站", "图书角", "教务处"], "失物招领明确写着到门卫室领取。", 2],
    ["图表阅读", "节目单显示：第一个节目古诗朗诵，第二个节目小合唱，第三个节目舞蹈。小合唱排在第几个？", "第二个", ["第一个", "第三个", "第四个"], "节目单里小合唱排第二。", 2],
    ["图表阅读", "天气记录：周一晴，周二多云，周三小雨。哪一天最适合晾被子？", "周一", ["周二", "周三", "三天都不适合"], "晴天最适合晾被子。", 2],
    ["图表阅读", "作息表：8:20晨读，9:00数学，9:50课间操。9:00大家在做什么？", "上数学课", ["晨读", "课间操", "放学"], "作息表里9:00安排的是数学。", 2],
    ["图表阅读", "借书登记表：小辉借《赵州桥》，小曼借《昆虫记》，小强借《十万个为什么》。谁借了《昆虫记》？", "小曼", ["小辉", "小强", "老师"], "登记表中《昆虫记》对应小曼。", 2]
  ], createSequentialImageUrls("g3-lower-stage4", 10, "chinese-chart")))
];

const gradeThreeLowerStageFiveChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "应用连推", [
    ["两步应用", "一块长方形菜地长12米，宽5米，每平方米种3株番茄，一共能种多少株？", "180", createNumericDistractors(180), "面积是12乘5等于60平方米，再乘3，一共能种180株。", 3, "/images/challenge/g3-lower-stage5/garden-12x5-three-plants.svg"],
    ["两步应用", "学校买来4包宣纸，每包25张，书法课用去36张，还剩多少张？", "64", createNumericDistractors(64), "4包共有100张，减去36张，还剩64张。", 3],
    ["两步应用", "3盒彩绳，每盒18根，平均扎成6束，每束有多少根？", "9", createNumericDistractors(9), "3盒共有54根，54除以6等于9根。", 3],
    ["两步应用", "4块边长9分米的正方形展板，一共是多少平方分米？", "324", createNumericDistractors(324), "每块面积是9乘9等于81平方分米，4块一共324平方分米。", 3, "/images/challenge/g3-lower-stage5/four-square-boards-9.svg"],
    ["两步应用", "一条小路长120米，已经铺好了3段，每段28米，还剩多少米没铺？", "36", createNumericDistractors(36), "已经铺了84米，用120减84，还剩36米。", 3],
    ["两步应用", "买4盒彩笔，每盒13元，付给售货员60元，应找回多少元？", "8", createNumericDistractors(8), "4盒彩笔共52元，60减52等于8元。", 3],
    ["两步应用", "5箱果汁，每箱12瓶，平均分给6个小组，每组分到多少瓶？", "10", createNumericDistractors(10), "5箱共有60瓶，60除以6等于10瓶。", 3],
    ["两步应用", "一块长方形布长8米，宽6米，剪去14平方米后，还剩多少平方米？", "34", createNumericDistractors(34), "布的面积是48平方米，减去14平方米后还剩34平方米。", 3, "/images/challenge/g3-lower-stage5/cloth-8x6-minus-14.svg"],
    ["两步应用", "一本书共180页，前3天每天读28页，还剩多少页？", "96", createNumericDistractors(96), "3天读了84页，180减84等于96页。", 3],
    ["两步应用", "买2支钢笔，每支2元6角，又买1本4元3角的练习册，一共要付多少钱？", "9元5角", ["9元1角", "8元5角", "10元5角"], "两支钢笔共5元2角，再加4元3角，一共9元5角。", 3]
  ]),
  ...createChallengeConfigs("三年级", "语文", "应用连推", [
    ["寓言理解", "《守株待兔》里，农夫如果想再有收成，接下来最该做什么？", "下地耕作", ["继续守在树桩旁", "天天睡觉", "把田地丢下"], "想有收成就要靠劳动，不能只等运气。", 3],
    ["课文理解", "《蜜蜂》里，法布尔做完实验后明白了什么？", "蜜蜂有辨认方向的能力", ["蜜蜂不会飞", "蜜蜂只喜欢花园", "蜜蜂晚上才出门"], "实验说明蜜蜂有辨认方向、找到回家路的能力。", 3],
    ["顺序理解", "做植物标本时，先采集叶片，再夹在书里压平，最后贴在记录卡上。压平后要做什么？", "贴在记录卡上", ["先采集叶片", "去浇花", "马上装进书包"], "按步骤看，压平后的下一步是贴在记录卡上。", 3, "/images/challenge/g3-lower-stage5/leaf-specimen-steps.svg"],
    ["通知理解", "通知：周六8点在博物馆门口集合参观古代器物展，请大家带好水杯。集合后大家要去哪里？", "参观古代器物展", ["去操场跑步", "去食堂吃饭", "回教室上课"], "通知写明集合后是去参观古代器物展。", 3],
    ["条件理解", "“如果下午下雨，运动会改到礼堂举行。” 下雨时运动会在哪里举行？", "礼堂", ["操场", "图书馆", "校门口"], "条件里已经说明下雨时改到礼堂举行。", 3],
    ["课文理解", "《纸的发明》里，蔡伦改进造纸术后，纸变得怎样？", "更轻便也更好用", ["更重更难写", "只能写一个字", "只能在木头上用"], "蔡伦改进后，纸更方便书写和使用。", 3],
    ["短文推理", "小敏先参观赵州桥，又把桥的样子画下来，回家后整理成介绍卡。整理介绍卡前她做了什么？", "把桥的样子画下来", ["回家睡觉", "去操场跳绳", "把介绍卡撕掉"], "按事情顺序，整理介绍卡前先画下桥的样子。", 3],
    ["留言理解", "留言：观察表放在科学柜第二层，放大镜在窗边，记录本在讲台上。想拿观察表应该去哪里？", "科学柜第二层", ["窗边", "讲台上", "门口柜子里"], "留言里明确写着观察表在科学柜第二层。", 3, "/images/challenge/g3-lower-stage5/note-science-cabinet-second-shelf.svg"],
    ["词语理解", "“名扬中外”最准确的意思是什么？", "在国内外都很有名", ["只在家里有名", "一点也不有名", "名字特别长"], "“名扬中外”就是名声传到国内外，大家都知道。", 3],
    ["活动顺序", "科技节先听讲座，再动手制作，最后展示作品。展示作品前要做什么？", "动手制作", ["马上回家", "先去操场", "交饭卡"], "活动顺序里，展示作品前一步是动手制作。", 3]
  ])
];

const gradeThreeLowerStageSixChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "限时稳答", [
    ["乘法速算", "23 × 3 = ?", "69", createNumericDistractors(69), "23乘3等于69。", 3],
    ["除法速算", "84 ÷ 4 = ?", "21", createNumericDistractors(21), "84除以4等于21。", 3],
    ["乘法速算", "15 × 6 = ?", "90", createNumericDistractors(90), "15乘6等于90。", 3],
    ["除法速算", "96 ÷ 3 = ?", "32", createNumericDistractors(32), "96除以3等于32。", 3],
    ["面积计算", "长方形长12厘米、宽5厘米，面积是多少平方厘米？", "60", createNumericDistractors(60), "长方形面积是12乘5，等于60平方厘米。", 3, "/images/challenge/g3-lower-stage6/rectangle-12x5-area.svg"],
    ["周长计算", "一个正方形边长7厘米，周长是多少厘米？", "28", createNumericDistractors(28), "正方形周长是4个边长相加，7乘4等于28厘米。", 3, "/images/challenge/g3-lower-stage6/square-7-perimeter.svg"],
    ["小数计算", "2元5角 + 3元 = ?", "5元5角", ["4元5角", "5元", "6元5角"], "2元5角再加3元，等于5元5角。", 3],
    ["单位换算", "1元8角写成小数是几元？", "1.8元", ["1.08元", "18元", "0.18元"], "1元8角就是1.8元。", 3]
  ]),
  ...createChallengeConfigs("三年级", "语文", "限时稳答", [
    ["古诗积累", "“迟日江山丽”的下一句是什么？", "春风花草香", ["泥融飞燕子", "沙暖睡鸳鸯", "夜来风雨声"], "这是《绝句》中的诗句。", 3],
    ["古诗积累", "“竹外桃花三两枝”的下一句是什么？", "春江水暖鸭先知", ["蒌蒿满地芦芽短", "正是河豚欲上时", "低头思故乡"], "这是《惠崇春江晚景》中的诗句。", 3],
    ["成语理解", "“没精打采”最适合形容下面哪种状态？", "精神不振", ["特别兴奋", "十分勇敢", "非常整齐"], "“没精打采”表示没有精神。", 3],
    ["标点符号", "“这幅画真神奇（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "顿号"], "表示赞叹时，句末通常用感叹号。", 3],
    ["近义词", "“观察”的近义词是哪一个？", "查看", ["遗忘", "躲闪", "吵闹"], "“观察”和“查看”都有认真去看的意思。", 3],
    ["句意理解", "“荷叶像碧绿的大圆盘。” 这句话主要写荷叶怎样？", "又大又绿", ["又薄又小", "又黑又硬", "已经枯黄"], "比作大圆盘，是在写荷叶大而且绿。", 3],
    ["量词搭配", "“一（ ）图画”里最合适填哪个量词？", "幅", ["条", "棵", "阵"], "图画通常用量词“幅”。", 3],
    ["词语运用", "下面哪句话正确用了“轻快”？", "燕子轻快地掠过湖面。", ["石头轻快地躺在地上。", "书包轻快地坐在椅子上。", "黑板轻快地站在墙边。"], "“轻快”适合形容动作轻松灵活。", 3]
  ])
];

const gradeThreeLowerStageSevenChallengeConfigs = [
  ...createChallengeConfigs("三年级", "数学", "综合冲线", [
    ["综合计算", "一块长方形菜地长16米，宽9米，每平方米种2株番茄，一共能种多少株？", "288", createNumericDistractors(288), "面积是16乘9等于144平方米，再乘2，一共288株。", 3, "/images/challenge/g3-lower-stage7/garden-16x9-two-plants.svg"],
    ["综合计算", "工地运来8捆电线，每捆35米，用去96米后，还剩多少米？", "184", createNumericDistractors(184), "8捆共有280米，减去96米，还剩184米。", 3],
    ["综合计算", "图书室买来12套故事书，每套8本，平均放到4个书架上，每个书架放多少本？", "24", createNumericDistractors(24), "12套共有96本，96除以4等于24本。", 3],
    ["综合计算", "水果店上午卖出46千克草莓，下午比上午多卖18千克，两天一共卖出多少千克？", "110", createNumericDistractors(110), "下午卖64千克，两天一共110千克。", 3],
    ["综合计算", "一块正方形空地边长15米，四周围篱笆，已经装好42米，还差多少米？", "18", createNumericDistractors(18), "正方形周长是60米，60减42还差18米。", 3, "/images/challenge/g3-lower-stage7/square-15-fence-42-left.svg"],
    ["综合计算", "做风筝用了3卷彩线，每卷28米，后来又买来16米，现在一共有多少米彩线？", "100", createNumericDistractors(100), "3卷共有84米，再加16米，一共100米。", 3],
    ["综合计算", "参加劳动的同学分成7组，每组6人，还有5位老师一起参加，一共有多少人？", "47", createNumericDistractors(47), "7组同学有42人，再加5位老师，一共47人。", 3],
    ["综合计算", "一盒饼干9元，买5盒付给售货员50元，应找回多少元？", "5", createNumericDistractors(5), "5盒共45元，50减45等于5元。", 3],
    ["综合计算", "72名同学分4次坐船，每次都有2位老师一起上船，4次一共上船多少人次？", "80", createNumericDistractors(80), "同学一共72人次，再加老师4次共8人次，一共80人次。", 3],
    ["时间推算", "活动9:25开始，进行了1小时35分钟，结束时是几时几分？", "11:00", ["10:50", "11:10", "12:00"], "9:25加1小时35分钟，正好是11:00。", 3]
  ]),
  ...createChallengeConfigs("三年级", "语文", "综合冲线", [
    ["通知理解", "通知：4月28日上午8:20在操场北侧整队，8:30准时出发去植物园。最晚什么时候要整好队？", "8:20前", ["8:30", "8:40", "7:20"], "通知要求8:20在操场北侧整队，所以最晚要在8:20前整好。", 3],
    ["短文推理", "小雯先把在植物园看到的花名记在本子上，回家后整理成海报，第二天再上台分享。上台分享前她做了什么？", "整理成海报", ["去操场跑步", "把本子丢掉", "直接睡觉"], "按顺序，分享前先整理成海报。", 3],
    ["修辞理解", "“火烧云一会儿像骏马，一会儿像狮子。” 这句话把什么比作骏马和狮子？", "火烧云", ["太阳", "晚霞里的山", "河水"], "句子里把变化多端的火烧云比作不同的动物。", 3],
    ["句意概括", "《赵州桥》写桥栏板上的图案各不相同，主要想说明什么？", "桥上的雕刻很精美", ["桥栏板很旧", "桥很短", "桥下没有水"], "写图案各不相同，是为了表现桥栏板雕刻精美。", 3],
    ["顺序理解", "班会先分组讨论，再画思维图，最后推荐代表介绍。介绍前要做什么？", "画思维图", ["马上回家", "先去操场", "把课桌搬走"], "按顺序，介绍前一步是画思维图。", 3],
    ["词语理解", "“名扬中外”里的“中外”指哪里？", "中国和外国", ["中午和外面", "中间和外边", "中国的外套"], "“名扬中外”里的“中外”指中国和外国。", 3],
    ["短文推理", "《慢性子裁缝和急性子顾客》里，顾客不停改要求，最可能带来什么结果？", "衣服总也定不下来", ["衣服立刻做好了", "顾客马上不买了", "裁缝去种地了"], "要求总在变，衣服就一直难以确定下来。", 3],
    ["标点符号", "“海底的景色多奇妙啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末通常用感叹号。", 3],
    ["词语运用", "下面哪句话最能体现“坚持观察”？", "他每天都把豆苗的变化记下来。", ["他看一眼就不管了。", "他把花盆搬走后忘了。", "他只在周末想起来一次。"], "每天都记录变化，最能体现坚持观察。", 3],
    ["活动顺序", "研学时，大家先听讲解，再分组记录，最后制作模型。制作模型前要做什么？", "分组记录", ["直接回家", "先吃晚饭", "把模型拆掉"], "活动顺序里，制作模型前一步是分组记录。", 3, "/images/challenge/g3-lower-stage7/study-tour-steps-model.svg"]
  ])
];

const gradeFourStageOneChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "关键定位", [
    ["数位判断", "在数字508760中，8在什么数位上？", "千位", ["百位", "万位", "十位"], "从右往左数，8在千位上。", 1],
    ["角的认识", "比直角大、比平角小的角，最可能是哪一种？", "钝角", ["锐角", "直角", "周角"], "钝角比90°大，比180°小。", 1],
    ["面积单位", "教室地面的面积通常用下面哪个单位表示？", "平方米", ["平方厘米", "千米", "升"], "地面面积较大，通常用平方米表示。", 1]
  ]),
  ...createChallengeConfigs("四年级", "语文", "关键定位", [
    ["课文理解", "《观潮》里，钱塘江大潮被称为什么？", "天下奇观", ["海边小景", "江南古桥", "秋夜明月"], "课文中把钱塘江大潮称作“天下奇观”。", 1],
    ["词语理解", "“人声鼎沸”最适合形容哪种场面？", "人很多很热闹", ["天气很冷", "颜色很鲜艳", "道路很笔直"], "“人声鼎沸”形容人声嘈杂、场面热闹。", 1],
    ["句意理解", "“爬山虎的脚触着墙的时候，六七根细丝的头上就变成小圆片。” 这句话主要写了什么？", "爬山虎的脚怎样贴住墙", ["墙面颜色变化", "叶子怎样变黄", "种子怎样发芽"], "这句话重点写爬山虎的脚怎样牢牢贴住墙。", 1]
  ])
];

const gradeFourStageTwoChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "条件筛选", [
    ["数的比较", "下面哪个数最大？540300、504300、543000、530400", "543000", ["540300", "504300", "530400"], "先比十万位，再比较后面的数，543000最大。", 1],
    ["近似数", "398000最接近下面哪个数？", "400000", ["390000", "300000", "500000"], "398000接近40万。", 1],
    ["角度判断", "一个角是95°，它是什么角？", "钝角", ["锐角", "直角", "平角"], "95°比90°大，是钝角。", 1],
    ["乘法计算", "23 × 40 = ?", "920", createNumericDistractors(920), "23乘40等于920。", 1],
    ["除法计算", "240 ÷ 30 = ?", "8", createNumericDistractors(8), "240除以30等于8。", 1]
  ]),
  ...createChallengeConfigs("四年级", "语文", "条件筛选", [
    ["课文理解", "《蟋蟀的住宅》里，蟋蟀挖洞主要靠什么？", "前足和像钳子一样的工具", ["翅膀和尾巴", "嘴和羽毛", "后腿和耳朵"], "课文写蟋蟀主要靠前足和像钳子一样的工具挖洞。", 1],
    ["神话理解", "《盘古开天地》里，盘古倒下后，他的气息变成了什么？", "风和云", ["石头和桥", "房子和路", "书和笔"], "课文写盘古呼出的气息变成了风和云。", 1],
    ["古文理解", "《王戎不取道旁李》里，王戎为什么不去摘李子？", "他判断李子一定是苦的", ["他够不着树枝", "他不喜欢吃李子", "树上没有李子"], "王戎根据路边李树果多无人摘，判断李子一定是苦的。", 1],
    ["通知理解", "通知：周五下午4点在报告厅举行诗歌朗诵会，请参演同学3点50分前到。最晚什么时候到？", "3点50分前", ["4点整", "3点40分", "4点10分"], "通知要求3点50分前到。", 1],
    ["关联词判断", "“虽然天气很冷，但是同学们还是坚持晨跑。” 前后分句关系是什么？", "转折", ["并列", "因果", "选择"], "“虽然……但是……”表示转折。", 1]
  ])
];

const gradeFourStageThreeChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "多步计算", [
    ["多步计算", "学校买来36盒彩笔，每盒12支，分给8个班后还剩48支，每班分到多少支？", "48", createNumericDistractors(48), "36盒彩笔共432支，分掉384支，384除以8等于48。", 2],
    ["多步计算", "一辆货车上午运来280箱苹果，下午比上午少45箱，这一天一共运来多少箱？", "515", createNumericDistractors(515), "下午运235箱，280加235等于515。", 2],
    ["面积计算", "一个长方形花坛长18米，宽12米，每平方米种4株花，一共种多少株？", "864", createNumericDistractors(864), "花坛面积是216平方米，再乘4，一共864株。", 2],
    ["面积计算", "一块果园长200米，宽50米，面积是多少平方米？", "10000", createNumericDistractors(10000), "长方形面积是200乘50，等于10000平方米。", 2],
    ["除法应用", "480本书平均装进24箱，每箱装好后又借出5本，现在每箱还有多少本？", "15", createNumericDistractors(15), "480除以24等于20，再减5等于15。", 2]
  ]),
  ...createChallengeConfigs("四年级", "语文", "多步计算", [
    ["顺序理解", "小周先查资料，再写演讲提纲，最后上台演讲。上台演讲前一步要做什么？", "写演讲提纲", ["查资料", "收拾书包", "回家吃饭"], "按顺序看，上台演讲前一步是写提纲。", 2],
    ["条件理解", "通知：如果周六下雨，运动会改在体育馆举行；如果不下雨，就在操场举行。下雨时运动会在哪里举行？", "体育馆", ["操场", "图书馆", "报告厅"], "通知中已经说明下雨时改到体育馆。", 2],
    ["课文理解", "《为中华之崛起而读书》中，周恩来立下志向是为了什么？", "为中华之崛起", ["为自己出名", "为去远方旅游", "为买很多书"], "课文中写周恩来立志“为中华之崛起而读书”。", 2],
    ["句意概括", "“麻雀扎煞起全身的羽毛，绝望地尖叫着。” 最能表现老麻雀怎样？", "拼命保护小麻雀", ["正在找食物", "想飞得更高", "准备搬家"], "这些动作表现出老麻雀奋不顾身保护小麻雀。", 2],
    ["神话理解", "《精卫填海》里，精卫天天衔木石填海，最能表现它什么精神？", "坚持不懈", ["害怕困难", "得过且过", "不愿思考"], "精卫日复一日填海，表现了坚持不懈的精神。", 2]
  ])
];

const gradeFourStageFourChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "图表整合", [
    ["图表分析", "图书借阅表：童话书128本，科普书156本，历史书104本。借阅最多的是哪一类？", "科普书", ["童话书", "历史书", "一样多"], "156本最多，所以科普书借阅最多。", 2],
    ["图表分析", "跳远成绩表：小宇142厘米，小诚151厘米，小安149厘米。谁跳得最远？", "小诚", ["小宇", "小安", "三人一样远"], "151厘米最大，所以小诚跳得最远。", 2],
    ["图表分析", "文具价签：钢笔18元，文件夹24元，笔记本15元。最便宜的是哪一种？", "笔记本", ["钢笔", "文件夹", "一样便宜"], "15元最低，所以笔记本最便宜。", 2],
    ["图表分析", "植树统计表：一组种18棵，二组种24棵，三组种21棵。哪一组种得最多？", "二组", ["一组", "三组", "一样多"], "24棵最多。", 2],
    ["图表分析", "班车时刻表：第一班8:05，第二班8:20，第三班8:35。最早发车的是哪一班？", "第一班", ["第二班", "第三班", "三班一样早"], "8:05最早。", 2],
    ["图表分析", "降雨量统计：周一12毫米，周二18毫米，周三9毫米。哪一天雨下得最大？", "周二", ["周一", "周三", "三天一样大"], "18毫米最大。", 2],
    ["图表分析", "球类数量表：篮球26个，足球32个，排球28个。数量最多的是哪一种？", "足球", ["篮球", "排球", "一样多"], "32个最多，所以足球最多。", 2],
    ["图表分析", "三本书页数分别是236页、214页、259页。页数最少的是哪一本？", "214页那本", ["236页那本", "259页那本", "三本一样多"], "214页最少。", 2],
    ["图表分析", "回收统计：废纸36千克，塑料42千克，易拉罐39千克。回收最多的是哪一种？", "塑料", ["废纸", "易拉罐", "一样多"], "42千克最多。", 2],
    ["图表分析", "身高记录：小明148厘米，小亮151厘米，小军149厘米。谁最高？", "小亮", ["小明", "小军", "三人一样高"], "151厘米最高。", 2]
  ]),
  ...createChallengeConfigs("四年级", "语文", "图表整合", [
    ["图表阅读", "课程表写着：第一节语文，第二节数学，第三节科学，第四节体育。第三节上什么课？", "科学", ["语文", "数学", "体育"], "课程表中第三节是科学。", 2],
    ["图表阅读", "值日安排表：周一小东擦黑板，周二小雅整理图书，周三小军浇花。周二谁整理图书？", "小雅", ["小东", "小军", "老师"], "值日表里周二对应小雅。", 2],
    ["通知理解", "通知栏写着：周五下午3点半在报告厅举行讲故事比赛。比赛地点在哪里？", "报告厅", ["操场", "教室", "图书馆"], "通知中明确写着在报告厅举行。", 2],
    ["图表阅读", "读书卡上写着：《昆虫记》，作者法布尔，推荐人小林。谁是作者？", "法布尔", ["小林", "昆虫记", "老师"], "读书卡上作者一栏写的是法布尔。", 2],
    ["图表阅读", "失物招领上写着：捡到一件蓝色校服外套，请到门卫室领取。应该去哪里找外套？", "门卫室", ["广播站", "教务处", "图书角"], "失物招领明确写着到门卫室领取。", 2],
    ["图表阅读", "导览图说明：校门东边是操场，北边是图书馆，西边是食堂。图书馆在校门的哪一边？", "北边", ["东边", "西边", "南边"], "导览图里写着图书馆在北边。", 2],
    ["图表阅读", "节目单显示：第一个节目合唱，第二个节目朗诵，第三个节目舞蹈。朗诵排在第几个？", "第二个", ["第一个", "第三个", "第四个"], "节目单中朗诵排第二。", 2],
    ["图表阅读", "天气记录：周一晴，周二多云，周三小雨。哪一天最适合去晾被子？", "周一", ["周二", "周三", "三天都不适合"], "晴天最适合晾被子。", 2],
    ["图表阅读", "借书登记表：小红借《十万个为什么》，小军借《海底两万里》，小丽借《安徒生童话》。谁借了《海底两万里》？", "小军", ["小红", "小丽", "老师"], "登记表中《海底两万里》对应小军。", 2],
    ["图表阅读", "研学流程表：8:00签到，8:20听讲解，9:00分组参观。9:00大家要做什么？", "分组参观", ["签到", "听讲解", "回学校"], "流程表中9:00安排的是分组参观。", 2]
  ])
];

const gradeFourStageFiveChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "推理连贯", [
    ["两步应用", "15盒彩纸，每盒24张，留下36张做展示后，其余平均分给6个班，每班分到多少张？", "54", createNumericDistractors(54), "15盒彩纸共360张，减去36张还剩324张，324除以6等于54。", 3],
    ["两步应用", "图书室有8个书架，每个书架45本书，又新送来68本书，现在一共有多少本书？", "428", createNumericDistractors(428), "8个书架共有360本，再加68本，一共428本。", 3],
    ["两步应用", "操场跑道一圈400米，小亮跑了3圈后又走了250米，一共运动了多少米？", "1450", createNumericDistractors(1450), "3圈是1200米，再加250米，一共1450米。", 3],
    ["两步应用", "一块长35米、宽18米的菜地，如果每9平方米栽1棵树苗，一共能栽多少棵？", "70", createNumericDistractors(70), "菜地面积是630平方米，630除以9等于70。", 3],
    ["两步应用", "9箱牛奶，每箱24盒，送给敬老院58盒后，还剩多少盒？", "158", createNumericDistractors(158), "9箱共有216盒，216减58等于158。", 3],
    ["两步应用", "一根绳子长720米，平均剪成18段，拿走其中7段，还剩多少米？", "440", createNumericDistractors(440), "每段40米，7段是280米，720减280等于440。", 3],
    ["两步应用", "商店运来480瓶矿泉水，上午卖出125瓶，下午卖出的比上午多35瓶，还剩多少瓶？", "195", createNumericDistractors(195), "下午卖160瓶，一共卖285瓶，还剩195瓶。", 3],
    ["两步应用", "一个长方形广场长28米，宽16米，四周围一圈护栏，护栏总长多少米？", "88", createNumericDistractors(88), "长方形周长是(28+16)乘2，等于88米。", 3],
    ["两步应用", "学校买来24箱练习本，每箱20本，平均分给12个班后，每班又退回4本，每班最后留下多少本？", "36", createNumericDistractors(36), "总共480本，平均每班40本，再退回4本，最后36本。", 3],
    ["时间推算", "一场科技讲座9:15开始，进行了1小时35分钟，结束时是几时几分？", "10:50", ["10:40", "11:00", "11:15"], "9:15加1小时35分钟，结束时间是10:50。", 3]
  ]),
  ...createChallengeConfigs("四年级", "语文", "推理连贯", [
    ["顺序理解", "小林先查百科资料，再写观察记录，最后做成展板。做展板前要先做什么？", "写观察记录", ["查百科资料", "回家休息", "去操场集合"], "按顺序，做展板前一步是写观察记录。", 3],
    ["条件理解", "如果明天下雨，升旗仪式改在礼堂举行；如果不下雨，就在操场举行。下雨时应该去哪里参加升旗仪式？", "礼堂", ["操场", "图书馆", "教室"], "题目里明确说明下雨时改在礼堂举行。", 3],
    ["课文理解", "《盘古开天地》里，盘古每天都在长高，最主要是为了什么？", "把天和地撑开", ["去看更远的地方", "让自己跑得更快", "寻找更多食物"], "盘古长高是为了不让天地重新合拢。", 3],
    ["课文理解", "《王戎不取道旁李》里，王戎的判断说明他是个怎样的孩子？", "善于观察和思考", ["只爱吃李子", "很怕生人", "不愿出门"], "王戎能根据现象做出判断，说明他善于观察思考。", 3],
    ["句意概括", "“老麻雀像一块石头似的落在猎狗面前。” 这句话最能表现老麻雀怎样？", "勇敢地保护幼儿", ["想和猎狗玩", "已经受伤不能飞", "准备去找食物"], "这句比喻写出了老麻雀奋不顾身保护小麻雀。", 3],
    ["留言理解", "留言：练习册在书桌右边抽屉里，校服挂在衣架上，剪刀在笔筒旁边。想找练习册应该去哪里？", "书桌右边抽屉里", ["衣架上", "笔筒旁边", "窗台边"], "留言写明练习册在书桌右边抽屉里。", 3],
    ["词语理解", "“若有所思”最适合形容下面哪种状态？", "像在认真思考什么", ["一直大声说笑", "跑得特别快", "什么都不看"], "“若有所思”表示好像在想事情。", 3],
    ["课文理解", "《普罗米修斯》里，普罗米修斯冒着危险把火种带给人类，最能看出他什么品质？", "勇敢而无私", ["胆小怕事", "只顾自己", "容易放弃"], "他不顾自己的痛苦帮助人类，体现了勇敢无私。", 3],
    ["活动顺序", "班会先分组讨论，再写倡议书，最后派代表发言。代表发言前要做什么？", "写倡议书", ["打扫教室", "回家吃饭", "先去操场"], "按顺序，发言前一步是写倡议书。", 3],
    ["通知理解", "通知：周六早上8点在校门口集合去参观博物馆，请同学们7点50分前到。最晚什么时候到校门口？", "7点50分前", ["8点整", "7点30分", "8点10分"], "通知里写着7点50分前到。", 3]
  ])
];

const gradeFourStageSixChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "速度稳定", [
    ["加法速算", "125 + 75 = ?", "200", createNumericDistractors(200), "125加75等于200。", 3],
    ["减法速算", "840 - 360 = ?", "480", createNumericDistractors(480), "840减360等于480。", 3],
    ["乘法速算", "25 × 4 = ?", "100", createNumericDistractors(100), "25乘4等于100。", 3],
    ["乘法速算", "96 × 5 = ?", "480", createNumericDistractors(480), "96乘5等于480。", 3],
    ["除法速算", "720 ÷ 90 = ?", "8", createNumericDistractors(8), "720除以90等于8。", 3],
    ["除法速算", "560 ÷ 70 = ?", "8", createNumericDistractors(8), "560除以70等于8。", 3],
    ["乘法速算", "18 × 30 = ?", "540", createNumericDistractors(540), "18乘30等于540。", 3],
    ["加法速算", "420 + 180 = ?", "600", createNumericDistractors(600), "420加180等于600。", 3]
  ]),
  ...createChallengeConfigs("四年级", "语文", "速度稳定", [
    ["古诗积累", "“不识庐山真面目”的下一句是什么？", "只缘身在此山中", ["远近高低各不同", "春风又绿江南岸", "低头思故乡"], "这是《题西林壁》中的诗句。", 3],
    ["成语理解", "“腾云驾雾”最适合形容什么？", "像在云雾中飞行", ["走路特别慢", "说话很轻", "坐得很端正"], "“腾云驾雾”常形容会飞或行进得很神奇。", 3],
    ["标点符号", "“这景色真壮观（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末常用感叹号。", 3],
    ["近义词", "“宽阔”的近义词是哪一个？", "广阔", ["狭窄", "安静", "轻快"], "“宽阔”和“广阔”意思接近。", 3],
    ["反义词", "“茂盛”的反义词是哪一个？", "稀疏", ["繁密", "挺拔", "整齐"], "“茂盛”和“稀疏”意思相反。", 3],
    ["句意理解", "“钱塘江大潮像千万匹白色战马齐头并进。” 这句话主要运用了什么修辞？", "比喻", ["设问", "夸张", "对偶"], "句子把潮水比作战马，是比喻。", 3],
    ["量词搭配", "“一（ ）住宅”里最合适填哪个量词？", "座", ["条", "阵", "棵"], "住宅通常用量词“座”。", 3],
    ["关联词理解", "“因为今天下雨，所以比赛延期。” “所以”后面接的是什么？", "结果", ["原因", "时间", "地点"], "“因为”后面说原因，“所以”后面说结果。", 3]
  ])
];

const gradeFourStageSevenChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "章节冲线", [
    ["综合计算", "学校买来28箱矿泉水，每箱24瓶，运动会用了156瓶后，还剩多少瓶？", "516", createNumericDistractors(516), "28箱共有672瓶，672减156等于516。", 3],
    ["综合计算", "一块长方形草坪长45米，宽18米，每平方米铺3块草皮，一共要铺多少块草皮？", "2430", createNumericDistractors(2430), "草坪面积是810平方米，再乘3，一共2430块。", 3],
    ["综合计算", "图书馆有12排书架，每排36本书，又新添了128本，现在一共有多少本书？", "560", createNumericDistractors(560), "12排共有432本，再加128本，一共560本。", 3],
    ["综合计算", "商店运来960个苹果，上午卖出275个，下午比上午多卖45个，还剩多少个？", "365", createNumericDistractors(365), "下午卖320个，一共卖595个，还剩365个。", 3],
    ["综合计算", "一条跑道长400米，小华跑了4圈后又慢走180米，一共走了多少米？", "1780", createNumericDistractors(1780), "4圈是1600米，再加180米，一共1780米。", 3],
    ["综合计算", "一根铁丝长96厘米，围成一个长26厘米、宽18厘米的长方形后，还剩多少厘米？", "8", createNumericDistractors(8), "长方形周长是88厘米，96减88等于8厘米。", 3],
    ["综合计算", "果园里有16行苹果树，每行28棵，又补种了52棵，现在一共有多少棵？", "500", createNumericDistractors(500), "16乘28等于448，再加52等于500。", 3],
    ["综合计算", "4盒彩笔和6本练习册一共花了96元，已知每盒彩笔12元，练习册一共花了多少元？", "48", createNumericDistractors(48), "4盒彩笔共48元，96减48等于48元。", 3],
    ["综合计算", "把840本书平均分给24个班，每班又从图书角借出5本，现在每班还剩多少本？", "30", createNumericDistractors(30), "840除以24等于35，每班借出5本后还剩30本。", 3],
    ["时间推算", "一场演出8:40开始，进行了2小时15分钟，结束时是几时几分？", "10:55", ["10:45", "11:05", "11:15"], "8:40加2小时15分钟，结束时间是10:55。", 3]
  ]),
  ...createChallengeConfigs("四年级", "语文", "章节冲线", [
    ["通知理解", "通知：4月28日上午8:20在操场北侧整队，8:30准时出发去科技馆。最晚什么时候要整好队？", "8:20前", ["8:30", "8:40", "7:20"], "通知要求8:20在操场北侧整队。", 3],
    ["短文推理", "小雯先把参观科技馆的内容记在本子上，回家后整理成海报，第二天再上台介绍。上台介绍前她做了什么？", "整理成海报", ["回家睡觉", "去操场跑步", "把本子丢掉"], "按顺序，介绍前先整理成海报。", 3],
    ["修辞理解", "“浪潮越来越近，犹如千万匹白色战马齐头并进。” 这句话把什么比作战马？", "浪潮", ["海风", "江水两岸", "人群"], "句子里把奔涌而来的浪潮比作战马。", 3],
    ["句意概括", "《蟋蟀的住宅》详细写住宅门口、平台和通道，主要是为了说明什么？", "蟋蟀住宅建得很讲究", ["蟋蟀不会挖洞", "住宅很容易坏", "门口没有平台"], "这些细节都在说明蟋蟀的住宅设计得很讲究。", 3],
    ["顺序理解", "班队活动先分组讨论，再写发言提纲，最后上台交流。上台交流前要做什么？", "写发言提纲", ["回家休息", "先去操场", "打扫卫生"], "按活动顺序，上台前一步是写提纲。", 3],
    ["词语理解", "“若隐若现”最适合形容下面哪种情景？", "景物看起来时有时无", ["声音特别大", "动作非常快", "颜色十分鲜艳"], "“若隐若现”形容隐隐约约，看不真切。", 3],
    ["短文推理", "小军先把观察到的种子变化记下来，又给花盆浇水，最后把花盆搬到阳台。浇水后他做了什么？", "把花盆搬到阳台", ["记录变化", "去操场玩", "换一个花盆"], "按顺序，浇水后下一步是把花盆搬到阳台。", 3],
    ["标点符号", "“这本书真有意思（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示强烈感受时，句末常用感叹号。", 3],
    ["词语运用", "下面哪句话最能体现“坚持不懈”？", "他每天练习书法，从不间断。", ["他写两笔就去玩了。", "他一遇到难题就放弃。", "他总说以后再学。"], "每天坚持练习，最能体现坚持不懈。", 3],
    ["活动顺序", "研学那天，大家先在教室听安全提醒，再乘车去基地，午饭后进行制作活动。制作活动前大家做了什么？", "先听提醒，再乘车到基地并吃午饭", ["直接回家", "先考试", "马上去看电影"], "按活动顺序，制作活动前先听提醒、乘车到基地，再吃午饭。", 3]
  ])
];

const gradeFourLowerStageOneChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "关键定位", [
    ["小数认识", "0.8里面有几个0.1？", "8", createNumericDistractors(8), "0.8可以看成8个0.1。", 1],
    ["三角形认识", "一个等腰三角形至少有几条边相等？", "2", createNumericDistractors(2), "等腰三角形至少有2条边相等。", 1],
    ["长度换算", "1米2分米写成分米是多少分米？", "12分米", ["2分米", "10分米", "102分米"], "1米是10分米，再加2分米，一共12分米。", 1]
  ]),
  ...createChallengeConfigs("四年级", "语文", "关键定位", [
    ["课文理解", "《猫》里，大猫高兴的时候常会怎样？", "在你腿上蹭来蹭去", ["躲进洞里不出来", "一直大声叫", "跑到屋顶睡觉"], "课文写大猫高兴时会在你腿上蹭来蹭去。", 1],
    ["课文理解", "《母鸡》后来让作者觉得它怎么样？", "伟大", ["懒惰", "胆小", "糊涂"], "作者后来觉得母鸡是伟大的。", 1],
    ["词语理解", "“天高地阔地吃起来”里，哪个词写出了地方很开阔？", "天高地阔", ["吃起来", "地", "起来"], "“天高地阔”写出了乡下吃饭地方的开阔。", 1]
  ])
];

const gradeFourLowerStageTwoChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "条件筛选", [
    ["小数比较", "0.56和0.65相比，哪个更大？", "0.65", ["0.56", "一样大", "没法比较"], "先看十分位，6个十分之一比5个十分之一大。", 1],
    ["角度计算", "一个三角形有两个角都是45°，第三个角是多少度？", "90°", ["45°", "60°", "135°"], "三角形内角和是180°，180减45再减45等于90°。", 1],
    ["价格比较", "3.2元、2.8元、3.5元中，最小的是哪一个？", "2.8元", ["3.2元", "3.5元", "一样大"], "比较整数部分和小数部分，2.8元最小。", 1],
    ["数位认识", "小数点右边第一位是什么位？", "十分位", ["个位", "百分位", "十位"], "小数点右边第一位是十分位。", 1],
    ["角度判断", "一个等边三角形的每个角都是多少度？", "60°", ["45°", "90°", "120°"], "等边三角形三个角相等，180°平均分成3份，每个角是60°。", 1]
  ]),
  ...createChallengeConfigs("四年级", "语文", "条件筛选", [
    ["课文理解", "《海上日出》主要是按什么顺序来写的？", "时间顺序", ["地点顺序", "人物顺序", "事情大小顺序"], "课文是按太阳升起前、升起时、升起后的顺序来写的。", 1],
    ["课文理解", "《记金华的双龙洞》里，从外洞到内洞要经过哪里？", "孔隙", ["山脚", "溪边", "石桥"], "作者是通过狭窄的孔隙进入内洞的。", 1],
    ["课文理解", "《巨人的花园》后来又有了春天，主要因为什么？", "巨人欢迎孩子们回来", ["巨人把树都砍掉了", "花园搬到了山上", "天气忽然变热了"], "巨人明白了快乐应和大家分享，于是欢迎孩子们回来。", 1],
    ["通知理解", "通知：周四下午3点到科学教室做实验，请同学们2点50分前到。最晚什么时候到？", "2点50分前", ["3点整", "2点40分", "3点10分"], "通知明确要求2点50分前到。", 1],
    ["词语理解", "“屏息凝视”最能说明猫怎样？", "看得很专心", ["跑得很快", "睡得很香", "叫得很响"], "“屏息凝视”说明猫专心地看着。", 1]
  ])
];

const gradeFourLowerStageThreeChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "多步计算", [
    ["多步计算", "买3盒彩泥，每盒14元，又买1把剪刀8元，一共多少元？", "50", createNumericDistractors(50), "3盒彩泥共42元，再加8元，一共50元。", 2],
    ["小数计算", "一条绳子长8米，先剪下2.6米，又剪下1.8米，还剩多少米？", "3.6米", ["3.2米", "4.2米", "4.6米"], "8减2.6再减1.8，等于3.6米。", 2],
    ["面积应用", "一块菜地长24米，宽15米，每平方米收2千克青菜，一共收多少千克？", "720", createNumericDistractors(720), "菜地面积是360平方米，再乘2，一共收720千克。", 2],
    ["平均数应用", "5个同样的盒子共装牛奶95瓶，平均每盒装多少瓶？", "19", createNumericDistractors(19), "95平均分成5份，每份是19。", 2],
    ["多步计算", "一辆货车上午运240箱，下午又运185箱，平均分给5个超市，每个超市分到多少箱？", "85", createNumericDistractors(85), "两次共运425箱，425除以5等于85。", 2]
  ]),
  ...createChallengeConfigs("四年级", "语文", "多步计算", [
    ["课文理解", "《乡下人家》主要想表达作者什么感情？", "喜爱和赞美乡下生活", ["讨厌乡下的泥土", "只想住进城市", "担心天气太热"], "课文通过许多景象表达了作者对乡下生活的喜爱和赞美。", 2],
    ["课文理解", "《猫》一文先写老实、贪玩、尽职，再写淘气，主要想说明什么？", "猫的性格古怪又可爱", ["猫只会睡觉", "猫很怕主人", "猫不喜欢玩"], "这样写是为了表现猫既古怪又可爱。", 2],
    ["课文理解", "《巨人的花园》里，花园后来常年洋溢着欢乐，最主要的原因是什么？", "巨人愿意与孩子们分享花园", ["花园搬了地方", "天气天天下雨", "树木全都砍掉了"], "巨人学会了和孩子们分享，花园才恢复生机。", 2],
    ["课文理解", "《海上日出》里，太阳完全跳出海面后，海面变得怎样？", "亮光夺目", ["一片漆黑", "安静无波", "全是乌云"], "太阳出来后，海面被照得亮光夺目。", 2],
    ["顺序理解", "小杰先看说明书，再拼装模型，最后涂颜色。涂颜色前要做什么？", "拼装模型", ["看说明书", "收拾书桌", "去洗手"], "按顺序，涂颜色前一步是拼装模型。", 2]
  ])
];

const gradeFourLowerStageFourChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "图表整合", [
    ["图表分析", "阅读记录表：故事书58页，科普书63页，漫画书49页。读得最多的是哪一类？", "科普书", ["故事书", "漫画书", "一样多"], "63页最多，所以读得最多的是科普书。", 2],
    ["图表分析", "饮水记录：周一36瓶，周二42瓶，周三39瓶。哪一天喝得最多？", "周二", ["周一", "周三", "三天一样多"], "42瓶最多，所以是周二。", 2],
    ["图表分析", "水果重量表：苹果2.5千克，梨3.2千克，香蕉2.8千克。最重的是哪一种？", "梨", ["苹果", "香蕉", "一样重"], "3.2千克最大，所以梨最重。", 2],
    ["图表分析", "文具价格表：圆规8元5角，三角尺6元8角，量角器7元2角。最便宜的是哪一种？", "三角尺", ["圆规", "量角器", "一样便宜"], "6元8角最低，所以三角尺最便宜。", 2],
    ["图表分析", "班车时刻表：第一班8:10，第二班8:25，第三班8:40。最早发车的是哪一班？", "第一班", ["第二班", "第三班", "三班一样早"], "8:10最早。", 2],
    ["图表分析", "气温记录：周一25℃，周二29℃，周三27℃。哪一天最热？", "周二", ["周一", "周三", "三天一样热"], "29℃最高，所以周二最热。", 2],
    ["图表分析", "跳远成绩表：小林158厘米，小东163厘米，小安155厘米。谁跳得最远？", "小东", ["小林", "小安", "三人一样远"], "163厘米最大，所以小东跳得最远。", 2],
    ["图表分析", "三本书页数分别是318页、276页、305页。页数最少的是哪一本？", "276页那本", ["318页那本", "305页那本", "三本一样多"], "276页最少。", 2],
    ["图表分析", "植树统计表：第一组24棵，第二组29棵，第三组27棵。哪一组种得最多？", "第二组", ["第一组", "第三组", "一样多"], "29棵最多，所以第二组最多。", 2],
    ["图表分析", "水费记录：一月48元，二月52元，三月46元。哪一个月最多？", "二月", ["一月", "三月", "三个月一样多"], "52元最高，所以二月最多。", 2]
  ]),
  ...createChallengeConfigs("四年级", "语文", "图表整合", [
    ["图表阅读", "课程表写着：第一节数学，第二节语文，第三节音乐，第四节科学。第三节上什么课？", "音乐", ["数学", "语文", "科学"], "课程表里第三节是音乐。", 2],
    ["图表阅读", "值日安排表：周一小萌浇花，周二小刚擦窗，周三小乐排桌椅。周二谁擦窗？", "小刚", ["小萌", "小乐", "老师"], "值日表里周二对应小刚。", 2],
    ["通知理解", "通知栏写着：周四下午4点在礼堂举行读书分享会。活动地点在哪里？", "礼堂", ["操场", "教室", "图书馆"], "通知中明确写着在礼堂举行。", 2],
    ["图表阅读", "读书卡上写着：《海上日出》，作者巴金，推荐人小雨。谁是作者？", "巴金", ["小雨", "海上日出", "老师"], "读书卡上的作者一栏写的是巴金。", 2],
    ["图表阅读", "失物招领上写着：捡到一个黑色水壶，请到门卫室领取。应该去哪里找水壶？", "门卫室", ["广播站", "图书角", "医务室"], "失物招领明确写着到门卫室领取。", 2],
    ["图表阅读", "导览图说明：校门东边是操场，西边是艺术楼，北边是图书馆。艺术楼在校门的哪一边？", "西边", ["东边", "北边", "南边"], "导览图中写着艺术楼在西边。", 2],
    ["图表阅读", "节目单显示：第一个节目古诗朗诵，第二个节目小合唱，第三个节目课本剧。课本剧排在第几个？", "第三个", ["第一个", "第二个", "第四个"], "节目单里课本剧排第三。", 2],
    ["图表阅读", "作息表：8:10晨读，8:50数学，9:40课间操。8:50大家在做什么？", "上数学课", ["晨读", "课间操", "放学"], "作息表里8:50安排的是数学。", 2],
    ["图表阅读", "借书登记表：小军借《猫》，小林借《白鹅》，小美借《母鸡》。谁借了《白鹅》？", "小林", ["小军", "小美", "老师"], "登记表中《白鹅》对应小林。", 2],
    ["图表阅读", "天气记录：周一晴，周二小雨，周三多云。哪一天最适合晾衣服？", "周一", ["周二", "周三", "三天都不适合"], "晴天最适合晾衣服。", 2]
  ])
];

const gradeFourLowerStageFiveChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "推理连贯", [
    ["小数应用", "4盒彩带，每盒12.5米，做装饰用了18米，还剩多少米？", "32米", ["30米", "31米", "33米"], "4盒彩带共50米，减去18米，还剩32米。", 3],
    ["面积应用", "一块长36米、宽25米的菜地，如果每9平方米种1棵树苗，一共能种多少棵？", "100", createNumericDistractors(100), "菜地面积是900平方米，900除以9等于100。", 3],
    ["两步应用", "学校买来18箱牛奶，每箱24盒，送出96盒后，平均分给12个班，每班分到多少盒？", "28", createNumericDistractors(28), "18箱共432盒，减去96盒还剩336盒，336除以12等于28。", 3],
    ["平均数应用", "5个同样的书架一共放了425本书，每个书架又取下18本修补，现在每个书架还剩多少本？", "67", createNumericDistractors(67), "每个书架原来85本，取下18本后还剩67本。", 3],
    ["两步应用", "一辆卡车上午运320袋大米，下午又运280袋，每25袋装一排，正好装了多少排？", "24", createNumericDistractors(24), "两次共运600袋，600除以25等于24排。", 3],
    ["周长应用", "长方形操场长48米，宽32米，沿四周跑2圈一共多少米？", "320", createNumericDistractors(320), "操场一圈周长是160米，跑2圈一共320米。", 3],
    ["两步应用", "840瓶水平均分给24个班，每班用了7瓶后还剩多少瓶？", "28", createNumericDistractors(28), "每班原来35瓶，35减7等于28瓶。", 3],
    ["面积计算", "3块边长15米的正方形草地，总面积是多少平方米？", "675", createNumericDistractors(675), "每块面积225平方米，3块一共675平方米。", 3],
    ["人民币计算", "买8本笔记本，每本4元8角，付40元，应找回多少元？", "1元6角", ["2元6角", "1元2角", "3元6角"], "8本笔记本共38元4角，40元减38元4角，应找回1元6角。", 3],
    ["两步应用", "一根木料长96米，先截去28米，又把剩下的平均分成4段，每段多长？", "17", createNumericDistractors(17), "剩下68米，68除以4等于17米。", 3]
  ]),
  ...createChallengeConfigs("四年级", "语文", "推理连贯", [
    ["课文理解", "《乡下人家》说“不论什么时候，不论什么季节，都有一道独特、迷人的风景”，主要表达什么？", "对乡村生活的喜爱和赞美", ["乡下总是下雨", "乡下没有人住", "作者想离开乡下"], "这句话集中表达了作者对乡村生活的喜爱和赞美。", 3],
    ["课文理解", "《猫》先写大猫性格古怪，再写满月小猫淘气，前后这样写有什么作用？", "更全面表现猫的可爱", ["说明猫只会睡觉", "说明猫很怕主人", "说明猫不喜欢玩"], "这样写让猫的形象更加完整，也更显得可爱。", 3],
    ["课文理解", "《白鹅》从叫声、步态、吃相写起，主要想突出白鹅什么特点？", "高傲", ["胆小", "懒惰", "安静"], "作者从多方面写白鹅，主要是为了突出它的高傲。", 3],
    ["课文理解", "《母鸡》后来让作者不敢再讨厌，主要因为什么？", "母鸡负责、慈爱、勇敢、辛苦", ["母鸡飞得特别高", "母鸡总爱睡觉", "母鸡很会唱歌"], "作者被母鸡保护小鸡的样子打动了。", 3],
    ["课文理解", "《海上日出》随着太阳慢慢升起，景色不断变化，这样写主要让人感受到什么？", "日出的壮观", ["海面特别黑", "风浪很小", "时间过得很慢"], "按变化过程来写，更能让人感受到海上日出的壮观。", 3],
    ["课文理解", "《记金华的双龙洞》里乘小船穿过孔隙时，最能感觉到什么？", "孔隙狭窄低矮", ["外洞特别明亮", "山路很平坦", "水流已经干了"], "作者写仰卧小船而行，是为了突出孔隙狭窄低矮。", 3],
    ["课文理解", "《巨人的花园》最后告诉我们什么道理？", "快乐要和大家分享", ["花园只能一个人住", "树木越高越好", "春天不会再回来"], "故事告诉我们，和大家分享快乐才能真正幸福。", 3],
    ["留言理解", "留言：调查表在科学柜上层，剪刀在笔袋里，颜料在窗台旁。想找调查表应该去哪里？", "科学柜上层", ["笔袋里", "窗台旁", "门口柜子里"], "留言里明确写着调查表在科学柜上层。", 3],
    ["活动顺序", "活动先搜集资料，再分组讨论，最后完成海报。完成海报前要做什么？", "分组讨论", ["搜集资料", "回家休息", "先去操场"], "按顺序，完成海报前一步是分组讨论。", 3],
    ["通知理解", "通知：周日上午9点在校门口集合去植物园，要求8点50分前到。最晚什么时候到？", "8点50分前", ["9点整", "8点40分", "9点10分"], "通知已经写明要在8点50分前到。", 3]
  ])
];

const gradeFourLowerStageSixChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "速度稳定", [
    ["加法速算", "0.7 + 0.3 = ?", "1", createNumericDistractors(1), "0.7加0.3等于1。", 3],
    ["减法速算", "5.6 - 1.8 = ?", "3.8", ["3.6", "3.4", "4.8"], "5.6减1.8等于3.8。", 3],
    ["乘法速算", "125 × 8 = ?", "1000", createNumericDistractors(1000), "125乘8等于1000。", 3],
    ["除法速算", "360 ÷ 12 = ?", "30", createNumericDistractors(30), "360除以12等于30。", 3],
    ["角度判断", "一个等边三角形的每个角是多少度？", "60°", ["45°", "90°", "120°"], "等边三角形每个角都是60°。", 3],
    ["周长计算", "一个长方形长20米、宽15米，它的周长是多少米？", "70", createNumericDistractors(70), "长方形周长是(20+15)乘2，等于70米。", 3],
    ["人民币换算", "0.25元等于多少分？", "25分", ["2分", "5分", "250分"], "1元等于100分，所以0.25元等于25分。", 3],
    ["除法速算", "480 ÷ 60 = ?", "8", createNumericDistractors(8), "480除以60等于8。", 3]
  ]),
  ...createChallengeConfigs("四年级", "语文", "速度稳定", [
    ["古诗积累", "“梅子金黄杏子肥”的下一句是什么？", "麦花雪白菜花稀", ["日长篱落无人过", "惟有蜻蜓蛱蝶飞", "春来江水绿如蓝"], "这是《四时田园杂兴》里的诗句。", 3],
    ["句意理解", "“乡下人家，不论什么时候，都有一道独特、迷人的风景。” 这句话主要表达什么？", "乡下景色很迷人", ["乡下总是下雨", "乡下没有花草", "乡下特别安静"], "这句话直接赞美了乡下景色独特迷人。", 3],
    ["近义词", "“高傲”的近义词是哪一个？", "傲慢", ["谦虚", "胆小", "安静"], "“高傲”和“傲慢”意思接近。", 3],
    ["标点符号", "“这条小河真清啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末常用感叹号。", 3],
    ["量词搭配", "“一（ ）风景”里最合适填哪个量词？", "道", ["棵", "阵", "本"], "风景通常用量词“道”。", 3],
    ["反义词", "“宽敞”的反义词是哪一个？", "狭窄", ["明亮", "整齐", "热闹"], "“宽敞”和“狭窄”意思相反。", 3],
    ["句意理解", "“小猫一下子窜上了桌子。” 这句话主要写出了小猫怎样？", "动作很快", ["睡得很香", "声音很大", "吃得很慢"], "“一下子窜上”写出了小猫动作很快。", 3],
    ["文学常识", "《海上日出》的作者是谁？", "巴金", ["老舍", "叶圣陶", "鲁迅"], "《海上日出》的作者是巴金。", 3]
  ])
];

const gradeFourLowerStageSevenChallengeConfigs = [
  ...createChallengeConfigs("四年级", "数学", "章节冲线", [
    ["综合计算", "学校买来15箱练习本，每箱28本，发给6个年级共360本后，还剩多少本？", "60", createNumericDistractors(60), "15箱共420本，发出360本后还剩60本。", 3],
    ["综合计算", "一块长方形菜地长54米，宽26米，每6平方米种1株向日葵，一共能种多少株？", "234", createNumericDistractors(234), "菜地面积是1404平方米，1404除以6等于234。", 3],
    ["综合计算", "图书室有18排书架，每排32本书，又借出175本后，还剩多少本？", "401", createNumericDistractors(401), "18排共有576本，借出175本后还剩401本。", 3],
    ["综合计算", "商店运来12箱梨，每箱35千克，上午卖出126千克，下午又卖出98千克，还剩多少千克？", "196", createNumericDistractors(196), "12箱共420千克，两次共卖224千克，还剩196千克。", 3],
    ["综合计算", "一条环形跑道一圈250米，小军跑了5圈又走了180米，一共运动了多少米？", "1430", createNumericDistractors(1430), "5圈是1250米，再加180米，一共1430米。", 3],
    ["综合计算", "一块正方形花圃边长24米，沿四周围一圈护栏，已装好68米，还差多少米？", "28", createNumericDistractors(28), "正方形周长是96米，96减68等于28米。", 3],
    ["综合计算", "840瓶牛奶平均分给28个班，每班喝掉6瓶后还剩多少瓶？", "24", createNumericDistractors(24), "每班原来30瓶，喝掉6瓶后还剩24瓶。", 3],
    ["综合计算", "买6盒彩笔，每盒18元，又买2本相册，每本24元，一共花多少元？", "156", createNumericDistractors(156), "6盒彩笔108元，相册48元，一共156元。", 3],
    ["综合计算", "一根绳子长180米，先用去36米做跳绳，剩下的平均剪成9段，每段多少米？", "16", createNumericDistractors(16), "还剩144米，144除以9等于16米。", 3],
    ["时间推算", "活动8:35开始，进行了2小时25分钟，结束时是几时几分？", "11:00", ["10:50", "11:10", "11:20"], "8:35加2小时25分钟，结束时间正好是11:00。", 3]
  ]),
  ...createChallengeConfigs("四年级", "语文", "章节冲线", [
    ["通知理解", "通知：5月6日上午8点10分在校门口整队，8点20分准时出发去博物馆。最晚什么时候要整好队？", "8点10分前", ["8点20分", "8点整", "8点30分"], "通知要求8点10分在校门口整队。", 3],
    ["短文推理", "小雯先把参观博物馆的见闻记在本子上，回家后整理成介绍卡，第二天再上台分享。上台分享前她做了什么？", "整理成介绍卡", ["去操场跑步", "把本子丢掉", "直接睡觉"], "按顺序，分享前先整理成介绍卡。", 3],
    ["修辞理解", "“天边的红霞像着了火一样。” 这句话把什么比作着了火？", "红霞", ["白云", "山坡", "江面"], "句子里把红霞比作着了火。", 3],
    ["句意概括", "《白鹅》里写白鹅走起路来慢条斯理，主要想说明什么？", "白鹅十分高傲", ["白鹅很胆小", "白鹅走不动路", "白鹅身体很小"], "这样的描写是为了突出白鹅高傲的特点。", 3],
    ["活动顺序", "班会先分组准备，再整理发言卡，最后上台介绍。上台介绍前要做什么？", "整理发言卡", ["马上回家", "先去操场", "打扫卫生"], "按顺序，上台介绍前一步是整理发言卡。", 3],
    ["词语理解", "“闪闪烁烁”最适合形容什么样子？", "光亮忽明忽暗", ["声音越来越大", "跑得特别快", "颜色很整齐"], "“闪闪烁烁”形容光亮不停闪动。", 3],
    ["课文理解", "《巨人的花园》最后最想告诉我们什么？", "有快乐要和大家分享", ["花园越大越好", "孩子不能玩耍", "树木不能开花"], "故事结尾告诉我们，快乐应该和大家分享。", 3],
    ["标点符号", "“多么可爱的白鹅啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末应该用感叹号。", 3],
    ["词语运用", "下面哪句话最能体现“专心致志”？", "他做实验时一直盯着刻度看。", ["他一会儿做题一会儿玩。", "他刚写两笔就去聊天。", "他听课时总看窗外。"], "一直专心盯着刻度看，最能体现专心致志。", 3],
    ["活动顺序", "研学时，大家先听老师提醒安全事项，再乘车去基地，午饭后制作标本。制作标本前大家做了什么？", "先听提醒，再乘车到基地并吃午饭", ["直接回家", "先考试", "马上看电影"], "按活动顺序，制作标本前先听提醒、乘车到基地，再吃午饭。", 3]
  ])
];

const gradeFiveUpperStageOneChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "结构拆题", [
    ["小数乘法", "3.6 × 10 = ?", "36", createNumericDistractors(36), "3.6乘10，小数点向右移动一位，结果是36。", 1],
    ["面积公式", "一个平行四边形底8厘米，高5厘米，面积是多少平方厘米？", "40", createNumericDistractors(40), "平行四边形面积是底乘高，8乘5等于40。", 1],
    ["简易方程", "x + 2.8 = 5.6，x = ?", "2.8", ["2.6", "3.6", "3.8"], "5.6减2.8，x等于2.8。", 1]
  ]),
  ...createChallengeConfigs("五年级", "语文", "结构拆题", [
    ["课文理解", "《白鹭》里，作者把白鹭比作什么？", "一首精巧的诗", ["一幅热闹的画", "一阵急雨", "一条宽阔的河"], "课文中把白鹭比作一首精巧的诗。", 1],
    ["课文理解", "《落花生》里，父亲借花生告诉孩子们什么？", "做人要做有用的人", ["只要外表好看就行", "要多吃花生", "要把花生种在院子里"], "父亲借花生告诉孩子们要做有用的人。", 1],
    ["课文理解", "《搭石》里，乡亲们摆搭石最看重什么？", "让别人过河方便", ["让自己先过去", "让石头更漂亮", "让河水变浅"], "课文写乡亲们摆搭石是为了让大家过河方便。", 1]
  ])
];

const gradeFiveUpperStageTwoChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "证据比对", [
    ["小数比较", "3.45和3.54相比，哪个更大？", "3.54", ["3.45", "一样大", "没法比较"], "先比较十分位，再比较百分位，3.54更大。", 1],
    ["单位换算", "0.75千克等于多少克？", "750克", ["75克", "705克", "7.5克"], "1千克等于1000克，所以0.75千克等于750克。", 1],
    ["三角形面积", "一个三角形底10厘米，高8厘米，面积是多少平方厘米？", "40", createNumericDistractors(40), "三角形面积是底乘高再除以2，10乘8除以2等于40。", 1],
    ["简易方程", "2x = 9.6，x = ?", "4.8", ["3.8", "4.6", "5.8"], "9.6除以2，x等于4.8。", 1],
    ["周长计算", "一个长方形长12厘米、宽5厘米，周长是多少厘米？", "34", createNumericDistractors(34), "长方形周长是(12+5)乘2，等于34厘米。", 1]
  ]),
  ...createChallengeConfigs("五年级", "语文", "证据比对", [
    ["课文理解", "《将相和》中“完璧归赵”的人是谁？", "蔺相如", ["廉颇", "赵王", "秦王"], "“完璧归赵”的主要人物是蔺相如。", 1],
    ["民间故事", "《猎人海力布》里，海力布为什么变成了石头？", "因为他说出了动物的秘密", ["因为他迷路了", "因为他不肯打猎", "因为他丢了宝石"], "海力布为了救乡亲们，说出了秘密，最后变成了石头。", 1],
    ["民间故事", "《牛郎织女》里，牛郎和织女一年相会一次是在什么时候？", "七月初七", ["正月初一", "八月十五", "九月初九"], "故事中他们在每年七月初七相会。", 1],
    ["通知理解", "通知：周六上午8点在图书馆门口集合去研学，请同学们7点50分前到。最晚什么时候到？", "7点50分前", ["8点整", "7点40分", "8点10分"], "通知要求7点50分前到。", 1],
    ["关联词判断", "“因为准备充分，所以比赛赢了。” 前后分句关系是什么？", "因果", ["并列", "转折", "选择"], "“因为……所以……”表示因果关系。", 1]
  ])
];

const gradeFiveUpperStageThreeChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "关系推断", [
    ["小数应用", "买2支钢笔，每支8.5元，又买1本6.8元的练习册，一共要付多少元？", "23.8元", ["22.8元", "23.3元", "24.8元"], "两支钢笔共17元，再加6.8元，一共23.8元。", 2],
    ["小数减法", "一根绳子长22.5米，剪下6.4米后，还剩多少米？", "16.1米", ["15.1米", "16.9米", "17.1米"], "22.5减6.4等于16.1米。", 2],
    ["多步计算", "4桶油，每桶3.5千克，用去4.8千克后，还剩多少千克？", "9.2千克", ["8.2千克", "9.8千克", "10.2千克"], "4桶共有14千克，用去4.8千克后还剩9.2千克。", 2],
    ["简易方程", "x - 4.6 = 7.8，x = ?", "12.4", ["11.4", "12.2", "13.4"], "7.8加4.6，x等于12.4。", 2],
    ["三角形面积", "一个三角形底16厘米，高5厘米，面积是多少平方厘米？", "40", createNumericDistractors(40), "16乘5除以2，面积是40平方厘米。", 2]
  ]),
  ...createChallengeConfigs("五年级", "语文", "关系推断", [
    ["顺序理解", "小杰先查资料，再列提纲，最后完成演讲稿。完成演讲稿前一步是什么？", "列提纲", ["查资料", "回家休息", "上台演讲"], "按顺序，完成演讲稿前一步是列提纲。", 2],
    ["课文理解", "《将相和》里，廉颇后来负荆请罪，最主要是因为什么？", "他知道自己错了", ["他想去旅游", "他丢了宝剑", "赵王命令他"], "廉颇认识到自己不该嫉妒蔺相如，所以去请罪。", 2],
    ["条件理解", "通知：如果下雨，朗诵会改在礼堂举行；如果不下雨，就在操场举行。下雨时朗诵会在哪里举行？", "礼堂", ["操场", "教室", "图书馆"], "通知里已经说明下雨时改在礼堂举行。", 2],
    ["课文理解", "《什么比猎豹的速度更快》里，最后说明什么最快？", "光", ["猎豹", "游隼", "火箭"], "课文层层比较，最后说明光最快。", 2],
    ["课文理解", "《圆明园的毁灭》主要表达了作者怎样的感情？", "痛惜与愤慨", ["轻松和快乐", "得意和自豪", "好奇和兴奋"], "课文表达了对圆明园毁灭的痛惜和愤慨。", 2]
  ])
];

const gradeFiveUpperStageFourChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "多项统整", [
    ["图表分析", "文具价格表：钢笔8.5元，文件夹6.8元，笔记本4.5元。最便宜的是哪一种？", "笔记本", ["钢笔", "文件夹", "一样便宜"], "4.5元最低，所以笔记本最便宜。", 2],
    ["图表分析", "借书记录：故事书125本，科普书138本，历史书116本。借出最多的是哪一类？", "科普书", ["故事书", "历史书", "一样多"], "138本最多，所以科普书借出最多。", 2],
    ["图表分析", "水果重量表：苹果2.6千克，橙子3.1千克，梨2.8千克。最重的是哪一种？", "橙子", ["苹果", "梨", "一样重"], "3.1千克最大，所以橙子最重。", 2],
    ["图表分析", "跳远成绩表：小林1.68米，小军1.72米，小安1.65米。谁跳得最远？", "小军", ["小林", "小安", "三人一样远"], "1.72米最大，所以小军跳得最远。", 2],
    ["图表分析", "班车时刻表：第一班8:05，第二班8:20，第三班8:35。最早发车的是哪一班？", "第一班", ["第二班", "第三班", "一样早"], "8:05最早。", 2],
    ["图表分析", "气温记录：周一26℃，周二29℃，周三27℃。哪一天最热？", "周二", ["周一", "周三", "三天一样热"], "29℃最高，所以周二最热。", 2],
    ["图表分析", "展板面积表：第一块42平方分米，第二块38平方分米，第三块45平方分米。面积最大的是哪一块？", "第三块", ["第一块", "第二块", "一样大"], "45平方分米最大。", 2],
    ["图表分析", "三本书页数分别是236页、214页、259页。页数最少的是哪一本？", "214页那本", ["236页那本", "259页那本", "三本一样多"], "214页最少。", 2],
    ["图表分析", "球类数量表：篮球26个，足球32个，排球28个。数量最多的是哪一种？", "足球", ["篮球", "排球", "一样多"], "32个最多，所以足球最多。", 2],
    ["图表分析", "节水统计：第一周36吨，第二周42吨，第三周39吨。哪一周节水最多？", "第二周", ["第一周", "第三周", "一样多"], "42吨最多，所以第二周节水最多。", 2]
  ]),
  ...createChallengeConfigs("五年级", "语文", "多项统整", [
    ["图表阅读", "课程表写着：第一节语文，第二节数学，第三节科学，第四节体育。第三节上什么课？", "科学", ["语文", "数学", "体育"], "课程表中第三节是科学。", 2],
    ["图表阅读", "值日安排表：周一小文擦黑板，周二小雅整理图书，周三小军浇花。周二谁整理图书？", "小雅", ["小文", "小军", "老师"], "值日表中周二对应小雅。", 2],
    ["图表阅读", "阅读卡上写着：《白鹭》，作者郭沫若，推荐人小雨。谁是作者？", "郭沫若", ["小雨", "白鹭", "老师"], "阅读卡作者一栏写的是郭沫若。", 2],
    ["通知理解", "通知栏写着：周五下午4点在报告厅举行诗歌会。活动地点在哪里？", "报告厅", ["操场", "图书馆", "教室"], "通知中写明在报告厅举行。", 2],
    ["图表阅读", "失物招领上写着：捡到一把蓝色雨伞，请到门卫室领取。应该去哪里找雨伞？", "门卫室", ["广播站", "图书角", "医务室"], "失物招领写着到门卫室领取。", 2],
    ["图表阅读", "导览图说明：校门东边是操场，北边是图书馆，西边是食堂。图书馆在校门的哪一边？", "北边", ["东边", "西边", "南边"], "导览图里写着图书馆在北边。", 2],
    ["图表阅读", "节目单显示：第一个节目合唱，第二个节目朗诵，第三个节目舞蹈。朗诵排在第几个？", "第二个", ["第一个", "第三个", "第四个"], "节目单中朗诵排第二。", 2],
    ["图表阅读", "借书登记表：小红借《猎人海力布》，小军借《将相和》，小美借《白鹭》。谁借了《将相和》？", "小军", ["小红", "小美", "老师"], "登记表里《将相和》对应小军。", 2],
    ["图表阅读", "活动流程表：8:00签到，8:20听讲解，9:00分组参观。9:00大家要做什么？", "分组参观", ["签到", "听讲解", "回学校"], "流程表里9:00安排的是分组参观。", 2],
    ["图表阅读", "作息表：8:10晨读，8:50数学，9:40课间操。8:50大家在做什么？", "上数学课", ["晨读", "课间操", "放学"], "作息表里8:50安排的是数学。", 2]
  ])
];

const gradeFiveUpperStageFiveChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "表达判断", [
    ["小数应用", "12盒彩带，每盒2.5米，用去6.8米后，还剩多少米？", "23.2米", ["22.2米", "23.8米", "24.2米"], "12盒彩带共30米，减去6.8米后还剩23.2米。", 3],
    ["面积应用", "一块长方形菜地长36米，宽24米，每8平方米种1棵树苗，一共能种多少棵？", "108", createNumericDistractors(108), "菜地面积是864平方米，864除以8等于108。", 3],
    ["多步计算", "15箱苹果，每箱24千克，卖出86千克后，还剩多少千克？", "274", createNumericDistractors(274), "15箱共有360千克，减去86千克，还剩274千克。", 3],
    ["面积应用", "一个平行四边形底25米，高12米，每5平方米种1棵花苗，一共能种多少棵？", "60", createNumericDistractors(60), "面积是300平方米，300除以5等于60。", 3],
    ["小数应用", "一条公路长48.6千米，已经修好18.9千米，又修好12.7千米，还剩多少千米？", "17千米", ["16千米", "17.8千米", "18千米"], "48.6减18.9再减12.7，正好还剩17千米。", 3],
    ["面积计算", "3块长方形玻璃，每块长1.2米、宽0.8米，总面积是多少平方米？", "2.88平方米", ["2.4平方米", "2.68平方米", "3.08平方米"], "一块面积是0.96平方米，3块一共2.88平方米。", 3],
    ["简易方程", "x + 7.5 = 18.2，x = ?", "10.7", ["9.7", "10.5", "11.7"], "18.2减7.5，x等于10.7。", 3],
    ["小数应用", "4桶油，每桶12.5千克，卖出18.6千克后，还剩多少千克？", "31.4千克", ["30.4千克", "32.4千克", "33.4千克"], "4桶油共50千克，减去18.6千克，还剩31.4千克。", 3],
    ["周长应用", "一个长方形操场长18米，宽12米，绕操场跑2圈一共多少米？", "120", createNumericDistractors(120), "一圈周长是60米，2圈一共120米。", 3],
    ["多步计算", "学校买来24箱练习本，每箱20本，平均分给12个班后，每班再退回4本，每班最后留下多少本？", "36", createNumericDistractors(36), "一共480本，平均每班40本，再退回4本后还剩36本。", 3]
  ]),
  ...createChallengeConfigs("五年级", "语文", "表达判断", [
    ["课文理解", "《太阳》一文主要告诉我们太阳和我们的关系怎样？", "非常密切", ["一点关系也没有", "只能晚上看到", "只能在海边看到"], "课文说明太阳和我们的关系非常密切。", 3],
    ["课文理解", "《松鼠》一文主要抓住松鼠的什么特点来写？", "乖巧可爱", ["动作缓慢", "特别凶猛", "完全不会爬树"], "课文主要写了松鼠乖巧可爱的特点。", 3],
    ["课文理解", "《慈母情深》里，母亲毫不犹豫给钱买书，最能表现什么？", "支持孩子读书", ["想让孩子去游玩", "忘了钱的用途", "觉得书很便宜"], "母亲给钱买书，最能表现她支持孩子读书。", 3],
    ["课文理解", "《父爱之舟》主要想表达什么？", "深沉的父爱", ["对小船的喜爱", "想去学游泳", "只想写夜景"], "课文通过许多细节表达了深沉的父爱。", 3],
    ["课文理解", "《“精彩极了”和“糟糕透了”》告诉我们什么？", "成长既需要鼓励也需要提醒", ["只要表扬不要批评", "只有批评才有用", "写作文不需要修改"], "课文说明成长中既需要鼓励，也需要提醒。", 3],
    ["课文理解", "《少年中国说（节选）》表达了作者什么愿望？", "希望少年奋发图强", ["只想看风景", "希望大家早点放学", "劝大家不要读书"], "课文表达了对少年中国的热切期望。", 3],
    ["通知理解", "通知：周六8点在校门口集合参观科技馆，请同学们7点50分前到。最晚什么时候到？", "7点50分前", ["8点整", "7点40分", "8点10分"], "通知中要求7点50分前到。", 3],
    ["留言理解", "留言：调查表在书桌左边抽屉里，剪刀在笔袋里，颜料在窗台上。想找调查表应该去哪里？", "书桌左边抽屉里", ["笔袋里", "窗台上", "门后边"], "留言里明确写着调查表在书桌左边抽屉里。", 3],
    ["条件理解", "“如果明天下雨，活动改在礼堂举行。” 下雨时活动会在哪里举行？", "礼堂", ["操场", "图书馆", "食堂"], "句子里已经说明下雨时改在礼堂举行。", 3],
    ["活动顺序", "班会先分组讨论，再写倡议书，最后派代表发言。发言前要做什么？", "写倡议书", ["马上回家", "先去操场", "分糖果"], "按顺序，发言前一步是写倡议书。", 3]
  ])
];

const gradeFiveUpperStageSixChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "高压稳答", [
    ["加法速算", "3.2 + 1.8 = ?", "5", createNumericDistractors(5), "3.2加1.8等于5。", 3],
    ["减法速算", "7.5 - 2.6 = ?", "4.9", ["4.7", "4.8", "5.9"], "7.5减2.6等于4.9。", 3],
    ["乘法速算", "0.4 × 100 = ?", "40", createNumericDistractors(40), "0.4乘100等于40。", 3],
    ["除法速算", "8.4 ÷ 2 = ?", "4.2", ["3.2", "4.4", "5.2"], "8.4除以2等于4.2。", 3],
    ["三角形面积", "一个三角形底12厘米，高6厘米，面积是多少平方厘米？", "36", createNumericDistractors(36), "12乘6除以2，面积是36平方厘米。", 3],
    ["单位换算", "1.5千克等于多少克？", "1500克", ["150克", "1050克", "15000克"], "1千克等于1000克，所以1.5千克等于1500克。", 3],
    ["简易方程", "2x = 7.2，x = ?", "3.6", ["2.6", "3.2", "4.6"], "7.2除以2，x等于3.6。", 3],
    ["周长计算", "一个长方形长15厘米、宽9厘米，它的周长是多少厘米？", "48", createNumericDistractors(48), "长方形周长是(15+9)乘2，等于48厘米。", 3]
  ]),
  ...createChallengeConfigs("五年级", "语文", "高压稳答", [
    ["古诗积累", "“死去元知万事空”的下一句是什么？", "但悲不见九州同", ["家祭无忘告乃翁", "山外青山楼外楼", "春风又绿江南岸"], "这是《示儿》中的诗句。", 3],
    ["成语理解", "“同心协力”最适合形容什么？", "大家一起努力", ["一个人偷偷做事", "只看热闹不帮忙", "总是互相争吵"], "“同心协力”表示大家齐心协力，一起努力。", 3],
    ["标点符号", "“这景色真迷人（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末常用感叹号。", 3],
    ["近义词", "“宽阔”的近义词是哪一个？", "广阔", ["狭窄", "安静", "轻快"], "“宽阔”和“广阔”意思接近。", 3],
    ["量词搭配", "“一（ ）搭石”里最合适填哪个量词？", "排", ["条", "阵", "棵"], "搭石常常成排摆放，所以用“排”更合适。", 3],
    ["修辞理解", "“白鹭是一首精巧的诗。” 这句话运用了什么修辞？", "比喻", ["设问", "夸张", "对偶"], "把白鹭比作一首诗，是比喻。", 3],
    ["关联词理解", "“因为今天下雨，所以比赛延期。” “所以”后面接的是什么？", "结果", ["原因", "时间", "地点"], "“因为”后面说原因，“所以”后面说结果。", 3],
    ["词语运用", "下面哪句话正确用了“居然”？", "这么难的题，他居然答对了。", ["桌子居然在教室里。", "书包居然很整齐。", "窗户居然是白色的。"], "“居然”表示出人意料。", 3]
  ])
];

const gradeFiveUpperStageSevenChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "预演冲线", [
    ["综合计算", "24箱牛奶，每箱12.5千克，卖出68千克后，还剩多少千克？", "232千克", ["222千克", "242千克", "252千克"], "24箱牛奶共300千克，减去68千克，还剩232千克。", 3],
    ["综合计算", "一块长方形果园长45米，宽18米，每9平方米栽1棵果树，一共能栽多少棵？", "90", createNumericDistractors(90), "果园面积是810平方米，810除以9等于90。", 3],
    ["综合计算", "36箱铅笔，每箱24支，卖出158支后，还剩多少支？", "706", createNumericDistractors(706), "36箱共有864支，减去158支后还剩706支。", 3],
    ["综合计算", "7卷彩带，每卷12.5米，又买来8.6米，一共有多少米？", "96.1米", ["95.1米", "96.6米", "97.1米"], "7卷共有87.5米，再加8.6米，一共96.1米。", 3],
    ["综合计算", "一块平行四边形草地底28米，高16米，每8平方米种1棵树苗，一共能种多少棵？", "56", createNumericDistractors(56), "面积是448平方米，448除以8等于56。", 3],
    ["综合计算", "一个长方形操场长24米，宽16米，沿四周跑2圈一共多少米？", "160", createNumericDistractors(160), "操场一圈周长是80米，跑2圈一共160米。", 3],
    ["综合计算", "6桶食用油，每桶15.5千克，用去18.7千克后，还剩多少千克？", "74.3千克", ["73.3千克", "75.3千克", "76.3千克"], "6桶油共93千克，减去18.7千克后还剩74.3千克。", 3],
    ["简易方程", "x - 6.8 = 14.5，x = ?", "21.3", ["20.3", "21.5", "22.3"], "14.5加6.8，x等于21.3。", 3],
    ["综合计算", "3块三角形广告牌的底都是18米、高都是12米，3块广告牌总面积是多少平方米？", "324", createNumericDistractors(324), "一块面积是108平方米，3块总面积是324平方米。", 3],
    ["综合计算", "840本书平均分给24个班，每班再借出6本后，还剩多少本？", "29", createNumericDistractors(29), "每班原来35本，借出6本后还剩29本。", 3]
  ]),
  ...createChallengeConfigs("五年级", "语文", "预演冲线", [
    ["通知理解", "通知：5月12日上午8点10分在校门口整队，8点20分准时出发去科技馆。最晚什么时候要整好队？", "8点10分前", ["8点20分", "8点整", "8点30分"], "通知要求8点10分在校门口整队。", 3],
    ["短文推理", "小雯先把参观科技馆的内容记在本子上，回家后整理成介绍卡，第二天再上台分享。上台分享前她做了什么？", "整理成介绍卡", ["去操场跑步", "把本子丢掉", "直接睡觉"], "按顺序，分享前先整理成介绍卡。", 3],
    ["课文理解", "《圆明园的毁灭》最想告诉我们什么？", "不要忘记国耻，珍惜今天", ["圆明园很适合游玩", "只要风景美就够了", "古建筑都不重要"], "课文通过写圆明园的毁灭，提醒我们不要忘记国耻。", 3],
    ["课文理解", "《什么比猎豹的速度更快》最后说明什么最快？", "光", ["猎豹", "游隼", "喷气式飞机"], "课文层层比较，最后说明光最快。", 3],
    ["课文理解", "《少年中国说（节选）》最能激励少年怎样？", "奋发图强", ["只顾玩耍", "害怕困难", "什么也不学"], "课文寄托了对少年奋发图强的期望。", 3],
    ["课文理解", "《慈母情深》里，母亲拿出钱给“我”买书，最能表现什么？", "支持孩子读书", ["想让孩子去买玩具", "忘了家里缺钱", "只想早点回家"], "母亲在艰难生活中仍支持孩子读书。", 3],
    ["词语理解", "“心旷神怡”最适合形容下面哪种感受？", "心里舒畅，精神愉快", ["特别生气", "非常害怕", "十分疲惫"], "“心旷神怡”形容心情舒畅愉快。", 3],
    ["标点符号", "“这本书真有意思（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示强烈感受时，句末常用感叹号。", 3],
    ["留言理解", "留言：活动表在书桌中间抽屉里，水彩笔在笔袋里，胶棒在窗台上。想找活动表应该去哪里？", "书桌中间抽屉里", ["笔袋里", "窗台上", "门后边"], "留言里写明活动表在书桌中间抽屉里。", 3],
    ["活动顺序", "班会先分组讨论，再整理发言提纲，最后派代表发言。派代表发言前要做什么？", "整理发言提纲", ["马上回家", "先去操场", "分糖果"], "按顺序，发言前一步是整理发言提纲。", 3]
  ])
];

const gradeFiveLowerStageOneChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "结构拆题", [
    ["分数比较", "3/5和2/5相比，哪个更大？", "3/5", ["2/5", "一样大", "没法比较"], "分母相同，分子大的分数更大。", 1],
    ["体积计算", "一个正方体棱长4厘米，体积是多少立方厘米？", "64", createNumericDistractors(64), "正方体体积是棱长乘棱长再乘棱长，4乘4乘4等于64。", 1],
    ["长度换算", "1米2分米写成用“米”作单位的数是多少米？", "1.2米", ["1.02米", "12米", "0.12米"], "2分米是0.2米，所以一共是1.2米。", 1]
  ]),
  ...createChallengeConfigs("五年级", "语文", "结构拆题", [
    ["课文理解", "《草船借箭》里，诸葛亮向谁“借”箭？", "曹操", ["周瑜", "鲁肃", "刘备"], "草船借箭中，箭主要是从曹操那里得来的。", 1],
    ["课文理解", "《景阳冈》里，武松在冈上打死了什么？", "老虎", ["野狼", "黑熊", "狐狸"], "《景阳冈》里武松打死的是老虎。", 1],
    ["课文理解", "《刷子李》里，刷子李最让人佩服的本领是什么？", "刷墙技艺高超", ["跑得特别快", "会做很多饭", "会写很多字"], "课文最突出刷子李刷墙技艺高超。", 1]
  ])
];

const gradeFiveLowerStageTwoChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "证据比对", [
    ["分数比较", "5/6和4/6相比，哪个更大？", "5/6", ["4/6", "一样大", "没法比较"], "分母相同，分子大的更大。", 1],
    ["分数应用", "12的2/3是多少？", "8", createNumericDistractors(8), "12乘2再除以3，结果是8。", 1],
    ["体积计算", "一个长方体长5厘米、宽4厘米、高3厘米，体积是多少立方厘米？", "60", createNumericDistractors(60), "长方体体积是长乘宽乘高，5乘4乘3等于60。", 1],
    ["单位换算", "3.5升等于多少毫升？", "3500毫升", ["350毫升", "3050毫升", "35毫升"], "1升等于1000毫升，所以3.5升等于3500毫升。", 1],
    ["平均数", "18、20、22这三个数的平均数是多少？", "20", createNumericDistractors(20), "三个数和是60，60除以3等于20。", 1]
  ]),
  ...createChallengeConfigs("五年级", "语文", "证据比对", [
    ["课文理解", "《杨氏之子》里，杨氏之子的回答妙在哪里？", "既回答问题又不失礼貌", ["他故意不理客人", "他说得很大声", "他说得特别慢"], "杨氏之子的回答既机智又有礼貌。", 1],
    ["寓言理解", "《自相矛盾》告诉我们什么？", "说话做事前后要一致", ["说话越多越好", "做事不用思考", "看到什么都要买"], "故事告诉我们前后不能自相矛盾。", 1],
    ["课文理解", "《田忌赛马》里，田忌最后赢了，主要是因为怎样？", "调换了马的出场顺序", ["换了新的马", "齐威王让着他", "孙膑替他上场"], "田忌赢在调换出场顺序。", 1],
    ["通知理解", "通知：周五下午3点在礼堂举行读书分享会，请参加的同学2点50分前到。最晚什么时候到？", "2点50分前", ["3点整", "2点40分", "3点10分"], "通知要求2点50分前到。", 1],
    ["课文理解", "《威尼斯的小艇》里，小艇是威尼斯人主要的什么？", "交通工具", ["玩具", "装饰品", "学习用品"], "课文写小艇是威尼斯重要的交通工具。", 1]
  ])
];

const gradeFiveLowerStageThreeChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "关系推断", [
    ["分数应用", "12个苹果，吃去1/3后，还剩多少个？", "8", createNumericDistractors(8), "吃去4个，还剩8个。", 2],
    ["体积计算", "一个长方体长8厘米、宽5厘米、高4厘米，体积是多少立方厘米？", "160", createNumericDistractors(160), "8乘5乘4等于160。", 2],
    ["平均数", "三次数学成绩分别是86分、90分、94分，平均分是多少？", "90", createNumericDistractors(90), "三次成绩和是270，除以3等于90。", 2],
    ["时间换算", "2/5小时等于多少分钟？", "24分钟", ["20分钟", "25分钟", "30分钟"], "1小时是60分钟，60乘2再除以5等于24分钟。", 2],
    ["小数减法", "一瓶饮料有2升，喝去3/4升后，还剩多少升？", "1.25升", ["1.2升", "1.5升", "1.75升"], "2减0.75等于1.25升。", 2]
  ]),
  ...createChallengeConfigs("五年级", "语文", "关系推断", [
    ["课文理解", "《军神》里，刘伯承做手术时不打麻药，最能表现什么？", "意志坚强", ["特别爱吃糖", "身体很胖", "非常爱睡觉"], "不打麻药体现了刘伯承钢铁般的意志。", 2],
    ["课文理解", "《跳水》里，船长让孩子跳进海里，最主要是为了什么？", "救孩子", ["让孩子学游泳", "逗大家开心", "惩罚孩子"], "船长是为了及时救孩子。", 2],
    ["顺序理解", "小杰先查资料，再写观察记录，最后完成展示卡。完成展示卡前一步是什么？", "写观察记录", ["查资料", "回家休息", "上台发言"], "按顺序，完成展示卡前一步是写观察记录。", 2],
    ["课文理解", "《牧场之国》主要让我们感受到什么？", "荷兰牧场宁静美丽", ["城市特别喧闹", "山路十分险峻", "沙漠非常炎热"], "课文主要写荷兰牧场宁静而美丽。", 2],
    ["条件理解", "通知：如果周六下雨，春游改在校史馆举行；如果不下雨，就去植物园。下雨时春游在哪里举行？", "校史馆", ["植物园", "操场", "礼堂"], "通知里已经说明下雨时改在校史馆举行。", 2]
  ])
];

const gradeFiveLowerStageFourChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "多项统整", [
    ["图表分析", "饮料销量表：苹果汁3.2升，橙汁4.5升，葡萄汁2.8升。卖得最多的是哪一种？", "橙汁", ["苹果汁", "葡萄汁", "一样多"], "4.5升最多，所以橙汁卖得最多。", 2],
    ["图表分析", "水箱容量表：甲箱48升，乙箱52升，丙箱46升。容量最大的是哪一个？", "乙箱", ["甲箱", "丙箱", "一样大"], "52升最大。", 2],
    ["图表分析", "三本书页数分别是126页、138页、119页。页数最少的是哪一本？", "119页那本", ["126页那本", "138页那本", "三本一样多"], "119页最少。", 2],
    ["图表分析", "班车时刻表：第一班8:10，第二班8:25，第三班8:40。最早发车的是哪一班？", "第一班", ["第二班", "第三班", "一样早"], "8:10最早。", 2],
    ["图表分析", "跳绳成绩表：小林86下，小东92下，小安88下。谁跳得最多？", "小东", ["小林", "小安", "三人一样多"], "92下最多。", 2],
    ["图表分析", "水果重量表：苹果2.5千克，梨3.2千克，香蕉2.8千克。最重的是哪一种？", "梨", ["苹果", "香蕉", "一样重"], "3.2千克最大。", 2],
    ["图表分析", "作业用时表：小文35分钟，小军42分钟，小雅39分钟。谁用时最长？", "小军", ["小文", "小雅", "三人一样长"], "42分钟最长。", 2],
    ["图表分析", "长方体体积表：甲120立方厘米，乙96立方厘米，丙108立方厘米。体积最大的是哪一个？", "甲", ["乙", "丙", "一样大"], "120立方厘米最大。", 2],
    ["图表分析", "水费记录：一月48元，二月52元，三月46元。哪个月最高？", "二月", ["一月", "三月", "三个月一样"], "52元最高。", 2],
    ["图表分析", "体重记录：小明32.5千克，小军31.8千克，小安33.1千克。谁最重？", "小安", ["小明", "小军", "三人一样重"], "33.1千克最大。", 2]
  ]),
  ...createChallengeConfigs("五年级", "语文", "多项统整", [
    ["图表阅读", "课程表写着：第一节数学，第二节语文，第三节音乐，第四节科学。第三节上什么课？", "音乐", ["数学", "语文", "科学"], "课程表中第三节是音乐。", 2],
    ["图表阅读", "值日安排表：周一小萌浇花，周二小刚擦窗，周三小乐排桌椅。周二谁擦窗？", "小刚", ["小萌", "小乐", "老师"], "值日表里周二对应小刚。", 2],
    ["通知理解", "通知栏写着：周四下午4点在礼堂举行读书分享会。活动地点在哪里？", "礼堂", ["操场", "教室", "图书馆"], "通知中写明在礼堂举行。", 2],
    ["图表阅读", "读书卡上写着：《草船借箭》，作者罗贯中，推荐人小雨。谁是作者？", "罗贯中", ["小雨", "草船借箭", "老师"], "读书卡作者一栏写的是罗贯中。", 2],
    ["图表阅读", "失物招领上写着：捡到一支蓝色钢笔，请到门卫室领取。应该去哪里找钢笔？", "门卫室", ["广播站", "图书角", "医务室"], "失物招领明确写着到门卫室领取。", 2],
    ["图表阅读", "导览图说明：校门东边是操场，西边是艺术楼，北边是图书馆。艺术楼在校门的哪一边？", "西边", ["东边", "北边", "南边"], "导览图中写着艺术楼在西边。", 2],
    ["图表阅读", "节目单显示：第一个节目古诗朗诵，第二个节目小合唱，第三个节目课本剧。课本剧排在第几个？", "第三个", ["第一个", "第二个", "第四个"], "节目单中课本剧排第三。", 2],
    ["图表阅读", "作息表：8:20晨读，9:00数学，9:50课间操。9:00大家在做什么？", "上数学课", ["晨读", "课间操", "放学"], "作息表中9:00安排的是数学。", 2],
    ["图表阅读", "借书登记表：小军借《草船借箭》，小林借《刷子李》，小美借《军神》。谁借了《刷子李》？", "小林", ["小军", "小美", "老师"], "登记表中《刷子李》对应小林。", 2],
    ["图表阅读", "天气记录：周一晴，周二小雨，周三多云。哪一天最适合晾衣服？", "周一", ["周二", "周三", "三天都不适合"], "晴天最适合晾衣服。", 2]
  ])
];

const gradeFiveLowerStageFiveChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "表达判断", [
    ["小数应用", "4盒牛奶，每盒2.5升，喝掉3.8升后，还剩多少升？", "6.2升", ["5.2升", "6.8升", "7.2升"], "4盒牛奶共10升，减去3.8升后还剩6.2升。", 3],
    ["体积应用", "一个长方体水箱长12分米、宽5分米、高4分米，体积是多少立方分米？", "240", createNumericDistractors(240), "长方体体积是12乘5乘4，等于240立方分米。", 3],
    ["多步计算", "18筐苹果，每筐24个，送给敬老院56个后，其余平均分给8个班，每班分到多少个？", "47", createNumericDistractors(47), "18筐共有432个，减去56个后还剩376个，376除以8等于47。", 3],
    ["分数应用", "一根绳子长20米，第一次用去1/4，第二次用去3米，还剩多少米？", "12米", ["11米", "13米", "14米"], "第一次用去5米，还剩15米，再减3米，还剩12米。", 3],
    ["平均数应用", "5个同样的盒子共装牛奶95瓶，每盒喝掉4瓶后，每盒还剩多少瓶？", "15", createNumericDistractors(15), "每盒原来19瓶，喝掉4瓶后还剩15瓶。", 3],
    ["体积应用", "3个棱长都是6厘米的正方体，总体积是多少立方厘米？", "648", createNumericDistractors(648), "一个正方体体积是216立方厘米，3个一共648立方厘米。", 3],
    ["小数应用", "8本笔记本，每本4.8元，付50元，应找回多少元？", "11.6元", ["10.6元", "12.6元", "13.6元"], "8本共38.4元，50减38.4等于11.6元。", 3],
    ["平均数应用", "三次数学测验成绩是88分、92分、95分，平均成绩是多少分？", "91.7分", ["90分", "91分", "92.7分"], "三次总分275分，275除以3约等于91.7分。", 3],
    ["体积应用", "一个长方体鱼缸长10分米、宽4分米、高6分米，注入96升水后，平均每1立方分米装多少升水？", "1升", ["0.5升", "2升", "3升"], "96立方分米正好对应96升，所以每1立方分米装1升。", 3],
    ["多步计算", "一瓶饮料有2.4升，3瓶一共多少升？如果喝掉1.8升，还剩多少升？", "5.4升", ["4.4升", "5.2升", "6.2升"], "3瓶共7.2升，喝掉1.8升后还剩5.4升。", 3]
  ]),
  ...createChallengeConfigs("五年级", "语文", "表达判断", [
    ["课文理解", "《草船借箭》里，诸葛亮借箭成功，最主要凭借什么？", "足智多谋", ["运气特别好", "船特别大", "士兵特别多"], "诸葛亮借箭成功主要靠足智多谋。", 3],
    ["课文理解", "《景阳冈》里，武松明知有虎还上冈，最能看出他怎样？", "勇敢豪爽", ["特别胆小", "很爱哭", "做事拖拉"], "武松明知有虎还敢上冈，表现了勇敢豪爽。", 3],
    ["课文理解", "《刷子李》里，曹小三为什么开始对师傅佩服得不得了？", "因为刷子李技艺高超", ["因为师傅会唱歌", "因为师傅长得高", "因为师傅话很多"], "曹小三亲眼见到师傅的高超技艺后十分佩服。", 3],
    ["课文理解", "《威尼斯的小艇》主要让我们感受到什么？", "威尼斯独特的水城风光", ["沙漠特别干燥", "高山十分险峻", "森林很密很深"], "课文通过小艇写出了威尼斯独特的水城风光。", 3],
    ["课文理解", "《牧场之国》主要表现了荷兰怎样的特点？", "宁静而富有生机", ["喧闹而拥挤", "荒凉而干燥", "特别寒冷"], "课文主要写荷兰牧场宁静又富有生机。", 3],
    ["文言理解", "《杨氏之子》里，杨氏之子的回答为什么让人叫绝？", "机智而有礼", ["说得特别长", "故意不回答", "一直在发脾气"], "他的回答机智巧妙，同时又很有礼貌。", 3],
    ["寓言理解", "《自相矛盾》告诉我们什么道理？", "说话做事要前后一致", ["什么都可以夸大", "越快越好", "只要人多就对"], "故事提醒我们不能自相矛盾。", 3],
    ["课文理解", "《田忌赛马》里，孙膑帮助田忌取胜主要靠什么？", "改变马的比赛顺序", ["让马跑得更快", "给马更多食物", "让齐威王休息"], "孙膑通过调整出场顺序帮助田忌获胜。", 3],
    ["课文理解", "《跳水》里，船长在关键时刻做出的决定说明他怎样？", "沉着机智", ["慌乱无措", "只顾自己", "不爱说话"], "船长在危急时刻果断决策，说明他沉着机智。", 3],
    ["课文理解", "《军神》里，沃克医生为什么称刘伯承为“军神”？", "因为他意志像钢铁一样坚强", ["因为他会很多魔术", "因为他写字特别快", "因为他认识很多人"], "沃克医生被刘伯承坚强的意志深深震撼。", 3]
  ])
];

const gradeFiveLowerStageSixChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "高压稳答", [
    ["分数计算", "1/2 + 1/4 = ?", "3/4", ["2/4", "1", "1/4"], "二分之一等于二分之二个四分之一，和四分之一合起来是四分之三。", 3],
    ["分数计算", "5/6 - 1/6 = ?", "2/3", ["4/6", "1/6", "5/12"], "5/6减1/6等于4/6，化简后是2/3。", 3],
    ["小数乘法", "12 × 0.5 = ?", "6", createNumericDistractors(6), "12乘0.5就是12的一半，等于6。", 3],
    ["小数除法", "2.4 ÷ 2 = ?", "1.2", ["1", "1.4", "2.2"], "2.4除以2等于1.2。", 3],
    ["体积计算", "一个正方体棱长5厘米，体积是多少立方厘米？", "125", createNumericDistractors(125), "5乘5乘5等于125。", 3],
    ["分数应用", "20的3/4是多少？", "15", createNumericDistractors(15), "20乘3再除以4，等于15。", 3],
    ["单位换算", "1.8升等于多少毫升？", "1800毫升", ["180毫升", "1080毫升", "18000毫升"], "1升等于1000毫升，所以1.8升等于1800毫升。", 3],
    ["平均数", "18和22的平均数是多少？", "20", createNumericDistractors(20), "18加22等于40，40除以2等于20。", 3]
  ]),
  ...createChallengeConfigs("五年级", "语文", "高压稳答", [
    ["课文理解", "《草船借箭》里，诸葛亮借箭时，江上出现了什么天气？", "大雾", ["大雪", "大风", "烈日"], "草船借箭成功和江上的大雾有很大关系。", 3],
    ["课文理解", "《景阳冈》里，武松一共喝了多少碗酒？", "十八碗", ["三碗", "八碗", "十二碗"], "课文里写武松喝了十八碗酒。", 3],
    ["课文理解", "《刷子李》里，最让人惊叹的是什么？", "刷完墙身上几乎没有白点", ["他刷墙特别慢", "他总爱说话", "他常常忘带工具"], "刷子李高超的技艺让身上几乎不沾白点。", 3],
    ["成语理解", "“胸有成竹”最适合形容什么？", "做事前已经很有把握", ["什么都不会做", "非常着急", "总是乱说话"], "“胸有成竹”形容做事前已经想好，有把握。", 3],
    ["标点符号", "“这小艇多灵活啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末常用感叹号。", 3],
    ["近义词", "“推辞”的近义词是哪一个？", "拒绝", ["欢迎", "表扬", "鼓励"], "“推辞”和“拒绝”意思接近。", 3],
    ["寓言理解", "《自相矛盾》里的“矛”和“盾”分别是做什么用的？", "矛用来进攻，盾用来防守", ["矛用来防守，盾用来写字", "矛用来吃饭，盾用来睡觉", "它们都用来装水"], "矛是进攻的武器，盾是防守的器具。", 3],
    ["课文理解", "《威尼斯的小艇》里，小艇最主要的作用是什么？", "帮助人们出行", ["在陆地上跑步", "在天空中飞行", "只用来比赛"], "小艇是威尼斯人重要的出行工具。", 3]
  ])
];

const gradeFiveLowerStageSevenChallengeConfigs = [
  ...createChallengeConfigs("五年级", "数学", "预演冲线", [
    ["综合计算", "15箱练习本，每箱28本，发给各班360本后，还剩多少本？", "60", createNumericDistractors(60), "15箱共420本，发出360本后还剩60本。", 3],
    ["综合计算", "一块长方形菜地长54米，宽26米，每6平方米种1株向日葵，一共能种多少株？", "234", createNumericDistractors(234), "菜地面积是1404平方米，1404除以6等于234。", 3],
    ["综合计算", "18排书架，每排32本书，又借出175本后，还剩多少本？", "401", createNumericDistractors(401), "18排共有576本，减去175本后还剩401本。", 3],
    ["综合计算", "12箱梨，每箱35千克，上午卖出126千克，下午又卖出98千克，还剩多少千克？", "196", createNumericDistractors(196), "12箱共420千克，两次共卖224千克，还剩196千克。", 3],
    ["综合计算", "一条环形跑道一圈250米，小军跑了5圈又走了180米，一共运动了多少米？", "1430", createNumericDistractors(1430), "5圈是1250米，再加180米，一共1430米。", 3],
    ["综合计算", "一个正方形花圃边长24米，围一圈护栏已装好68米，还差多少米？", "28", createNumericDistractors(28), "正方形周长是96米，96减68等于28米。", 3],
    ["综合计算", "840瓶牛奶平均分给28个班，每班喝掉6瓶后，还剩多少瓶？", "24", createNumericDistractors(24), "每班原来30瓶，喝掉6瓶后还剩24瓶。", 3],
    ["综合计算", "买6盒彩笔，每盒18元，又买2本相册，每本24元，一共花多少元？", "156", createNumericDistractors(156), "6盒彩笔108元，相册48元，一共156元。", 3],
    ["综合计算", "一根绳子长180米，先用去36米做跳绳，剩下的平均剪成9段，每段多少米？", "16", createNumericDistractors(16), "还剩144米，144除以9等于16米。", 3],
    ["时间推算", "活动8:35开始，进行了2小时25分钟，结束时是几时几分？", "11:00", ["10:50", "11:10", "11:20"], "8:35加2小时25分钟，结束时间正好是11:00。", 3]
  ]),
  ...createChallengeConfigs("五年级", "语文", "预演冲线", [
    ["通知理解", "通知：5月6日上午8点10分在校门口整队，8点20分准时出发去博物馆。最晚什么时候要整好队？", "8点10分前", ["8点20分", "8点整", "8点30分"], "通知要求8点10分整队。", 3],
    ["短文推理", "小雯先把参观博物馆的见闻记在本子上，回家后整理成介绍卡，第二天再上台分享。上台分享前她做了什么？", "整理成介绍卡", ["去操场跑步", "把本子丢掉", "直接睡觉"], "按顺序，分享前先整理成介绍卡。", 3],
    ["修辞理解", "“天边的红霞像着了火一样。” 这句话把什么比作着了火？", "红霞", ["白云", "江面", "山坡"], "句子里把红霞比作着了火。", 3],
    ["课文理解", "《白鹅》里，作者写白鹅走起路来慢条斯理，主要想说明什么？", "白鹅十分高傲", ["白鹅很胆小", "白鹅走不动路", "白鹅特别懒"], "这样的描写是为了突出白鹅高傲的特点。", 3],
    ["活动顺序", "班会先分组准备，再整理发言卡，最后上台介绍。上台介绍前要做什么？", "整理发言卡", ["马上回家", "先去操场", "打扫卫生"], "按顺序，上台介绍前一步是整理发言卡。", 3],
    ["词语理解", "“闪闪烁烁”最适合形容什么样子？", "光亮忽明忽暗", ["声音越来越大", "跑得特别快", "颜色很整齐"], "“闪闪烁烁”形容光亮不停闪动。", 3],
    ["课文理解", "《巨人的花园》最后最想告诉我们什么？", "快乐要和大家分享", ["花园只能一个人住", "春天永远不会来", "孩子们不能玩耍"], "故事结尾告诉我们，快乐应该和大家分享。", 3],
    ["标点符号", "“多么可爱的白鹅啊（ ）” 句末最合适填什么标点？", "感叹号", ["句号", "问号", "逗号"], "表示赞叹时，句末应该用感叹号。", 3],
    ["词语运用", "下面哪句话最能体现“专心致志”？", "他做实验时一直盯着刻度看。", ["他一会儿做题一会儿玩。", "他刚写两笔就去聊天。", "他听课时总看窗外。"], "一直专心盯着刻度看，最能体现专心致志。", 3],
    ["活动顺序", "研学时，大家先听老师提醒安全事项，再乘车去基地，午饭后制作标本。制作标本前大家做了什么？", "先听提醒，再乘车到基地并吃午饭", ["直接回家", "先考试", "马上看电影"], "按活动顺序，制作标本前先听提醒、乘车到基地，再吃午饭。", 3]
  ])
];

const gradeOneUpperChallengeQuestions = buildQuestions([
  ...gradeOneUpperStageOneChallengeConfigs,
  ...gradeOneUpperStageTwoChallengeConfigs,
  ...gradeOneUpperStageThreeChallengeConfigs,
  ...gradeOneUpperStageFourChallengeConfigs,
  ...gradeOneUpperStageFiveChallengeConfigs,
  ...gradeOneUpperStageSixChallengeConfigs,
  ...gradeOneUpperStageSevenChallengeConfigs
]);

const gradeOneLowerChallengeQuestions = buildQuestions([
  ...gradeOneLowerStageOneChallengeConfigs,
  ...gradeOneLowerStageTwoChallengeConfigs,
  ...gradeOneLowerStageThreeChallengeConfigs,
  ...gradeOneLowerStageFourChallengeConfigs,
  ...gradeOneLowerStageFiveChallengeConfigs,
  ...gradeOneLowerStageSixChallengeConfigs,
  ...gradeOneLowerStageSevenChallengeConfigs
]);

const gradeTwoUpperChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeTwoStageOneChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeTwoStageTwoChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeTwoStageThreeChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeTwoStageFourChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeTwoStageFiveChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeTwoStageSixChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeTwoStageSevenChallengeConfigs, "上册")
]);

const gradeTwoLowerChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeTwoLowerStageOneChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeTwoLowerStageTwoChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeTwoLowerStageThreeChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeTwoLowerStageFourChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeTwoLowerStageFiveChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeTwoLowerStageSixChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeTwoLowerStageSevenChallengeConfigs, "下册")
]);

const gradeThreeUpperChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeThreeStageOneChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeThreeStageTwoChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeThreeStageThreeChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeThreeStageFourChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeThreeStageFiveChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeThreeStageSixChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeThreeStageSevenChallengeConfigs, "上册")
]);

const gradeThreeLowerChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeThreeLowerStageOneChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeThreeLowerStageTwoChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeThreeLowerStageThreeChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeThreeLowerStageFourChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeThreeLowerStageFiveChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeThreeLowerStageSixChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeThreeLowerStageSevenChallengeConfigs, "下册")
]);

const gradeFourUpperChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeFourStageOneChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFourStageTwoChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFourStageThreeChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFourStageFourChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFourStageFiveChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFourStageSixChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFourStageSevenChallengeConfigs, "上册")
]);

const gradeFourLowerChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeFourLowerStageOneChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFourLowerStageTwoChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFourLowerStageThreeChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFourLowerStageFourChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFourLowerStageFiveChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFourLowerStageSixChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFourLowerStageSevenChallengeConfigs, "下册")
]);

const gradeFiveUpperChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeFiveUpperStageOneChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFiveUpperStageTwoChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFiveUpperStageThreeChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFiveUpperStageFourChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFiveUpperStageFiveChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFiveUpperStageSixChallengeConfigs, "上册"),
  ...withChallengeSemester(gradeFiveUpperStageSevenChallengeConfigs, "上册")
]);

const gradeFiveLowerChallengeQuestions = buildQuestions([
  ...withChallengeSemester(gradeFiveLowerStageOneChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFiveLowerStageTwoChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFiveLowerStageThreeChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFiveLowerStageFourChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFiveLowerStageFiveChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFiveLowerStageSixChallengeConfigs, "下册"),
  ...withChallengeSemester(gradeFiveLowerStageSevenChallengeConfigs, "下册")
]);

const gradeSixUpperChallengeQuestions = buildQuestions([
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "审题锁点", [
      ["比的化简", "12∶18化成最简整数比是多少？", "2∶3", ["3∶2", "6∶9", "4∶6"], "12和18同时除以6，最简比是2∶3。", 1],
      ["百分数基础", "80的25%是多少？", "20", createNumericDistractors(20), "80乘25%等于20。", 1],
      ["圆的认识", "一个圆的半径是4厘米，它的直径是多少厘米？", "8", createNumericDistractors(8), "直径等于半径乘2，所以是8厘米。", 1]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "审题锁点", [
      ["课文理解", "《草原》开头写草原给作者的第一感受是什么？", "辽阔而美丽", ["昏暗又拥挤", "寒冷又荒凉", "狭窄又安静"], "课文一开头就写出了草原辽阔而美丽的特点。", 1],
      ["课文理解", "《丁香结》里，作者常把丁香结联想到什么？", "生活中的愁结", ["热闹的节日", "丰收的果实", "明亮的灯火"], "作者由丁香结想到生活里解不开的愁结。", 1],
      ["课文理解", "《开国大典》举行的地点在哪里？", "天安门广场", ["人民大会堂", "故宫太和殿", "中山公园"], "开国大典在天安门广场举行。", 1]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "信息建模", [
      ["比例尺", "地图比例尺是1∶400000，图上3厘米表示实际多少千米？", "12", createNumericDistractors(12), "实际距离是3乘400000厘米，等于12千米。", 1],
      ["圆的周长", "直径10厘米的圆，周长约是多少厘米？", "31.4", createNumericDistractors(31.4), "圆周长等于圆周率乘直径，3.14乘10等于31.4。", 1],
      ["圆的面积", "半径5厘米的圆，面积约是多少平方厘米？", "78.5", createNumericDistractors(78.5), "圆面积等于3.14乘5的平方，约78.5。", 1],
      ["简易方程", "3x + 6 = 24，x = ?", "6", createNumericDistractors(6), "先用24减6得18，再除以3得6。", 1],
      ["折扣计算", "一件文具原价200元，打九折后是多少元？", "180", createNumericDistractors(180), "九折就是按原价的90%计算，200乘0.9等于180。", 1]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "信息建模", [
      ["课文理解", "《竹节人》主要写了什么内容？", "做竹节人和玩竹节人的乐趣", ["冬天堆雪人的经历", "一次难忘的旅行", "校园种树的经过"], "课文围绕做竹节人、斗竹节人展开，写出了童年乐趣。", 1],
      ["课文理解", "《宇宙生命之谜》对地球外生命的态度是什么？", "还在探索没有定论", ["已经完全证实存在", "肯定没有任何生命", "只有月球上有生命"], "课文说明目前还在探索，并没有定论。", 1],
      ["通知理解", "通知：周三14点20分到科技馆门口集合，要求14点10分前到。最晚什么时候到？", "14点10分前", ["14点20分", "14点15分", "14点30分"], "通知明确要求14点10分前到。", 1],
      ["课文理解", "《桥》里洪水来时，老支书先让谁撤离？", "村民群众", ["自己的亲人", "家里的牲口", "外村游客"], "老支书先组织群众撤离。", 1],
      ["课文理解", "《夏天里的成长》主要想告诉我们什么？", "万物在夏天迅速生长", ["冬天最适合游玩", "秋天果实最香甜", "春天花朵最鲜艳"], "课文围绕“夏天是万物迅速生长的季节”来写。", 1]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "多步求解", [
      ["分数应用", "六年级有48人参加合唱排练，其中5/6到场，后来又有3人请假离开，最后在场多少人？", "37", createNumericDistractors(37), "48乘5/6等于40，40减3等于37。", 2],
      ["百分数应用", "一本书共240页，第一天读了全书的25%，第二天又读了36页，还剩多少页？", "144", createNumericDistractors(144), "第一天读60页，两天共读96页，还剩144页。", 2],
      ["多步计算", "打印店计划4天装订72本练习册，前3天每天装订15本，第4天要装订多少本？", "27", createNumericDistractors(27), "前三天共装订45本，72减45等于27本。", 2],
      ["圆柱体积", "一个圆柱形水桶底面半径2分米，高5分米，体积约是多少立方分米？", "62.8", createNumericDistractors(62.8), "圆柱体积等于3.14乘2的平方再乘5，约62.8。", 2],
      ["按比分配", "把54本书按2∶4∶3分给三个小组，第二组分到多少本？", "24", createNumericDistractors(24), "总份数是9份，每份6本，第二组4份共24本。", 2]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "多步求解", [
      ["活动顺序", "小组先查资料，再做采访提纲，最后完成校园广播稿。完成广播稿前一步是什么？", "做采访提纲", ["查资料", "上台播报", "回家休息"], "按顺序，完成广播稿前一步是做采访提纲。", 2],
      ["条件理解", "如果明天下雨，毕业照改在报告厅拍；如果不下雨，就在操场拍。下雨时毕业照在哪里拍？", "报告厅", ["操场", "图书馆", "体育馆"], "条件里明确说下雨时改在报告厅拍。", 2],
      ["课文理解", "《穷人》里，桑娜把西蒙的孩子抱回家的主要原因是什么？", "不忍心让孩子无人照顾", ["想让家里更热闹", "想得到邻居夸奖", "想让渔夫生气"], "桑娜心地善良，不忍心看孩子无人照顾。", 2],
      ["课文理解", "《灯光》里，郝副营长最向往的是什么？", "孩子们能在电灯下读书", ["自己住进高楼", "天天去看电影", "拥有很多玩具"], "郝副营长憧憬孩子们过上有灯光、能读书的幸福生活。", 2],
      ["课文理解", "《开国大典》中，阅兵式后紧接着进行的是什么？", "群众游行", ["升旗仪式", "放学回家", "签名活动"], "按典礼顺序，阅兵式后是群众游行。", 2]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "跨题迁移", [
      ["图表阅读", "图书角借阅统计：周一18本，周二24本，周三21本。借阅最多的是哪一天？", "周二", ["周一", "周三", "三天一样多"], "24本最多，所以是周二。", 2],
      ["图表阅读", "文具价格表：圆规6.5元，直尺3.2元，马克笔8.6元。最便宜的是哪一种？", "直尺", ["圆规", "马克笔", "一样便宜"], "3.2元最低，所以直尺最便宜。", 2],
      ["图表阅读", "百米跑成绩：小明14.2秒，小军13.9秒，小浩14.5秒。谁跑得最快？", "小军", ["小明", "小浩", "三人一样快"], "用时最短的是13.9秒，所以小军最快。", 2],
      ["分数比较", "3/4米、2/3米、5/6米三根彩带中，最长的是哪一根？", "5/6米", ["3/4米", "2/3米", "一样长"], "比较分数大小，5/6最大。", 2],
      ["折扣判断", "书包原价80元，按七五折出售，现价是多少元？", "60", createNumericDistractors(60), "80乘0.75等于60。", 2],
      ["百分率比较", "三块试验田发芽率分别是98%、95%、97%，发芽率最高的是哪一块？", "98%那块", ["95%那块", "97%那块", "三块一样高"], "98%最高。", 2],
      ["比例尺应用", "地图比例尺是1∶200000，图上5厘米表示实际多少千米？", "10", createNumericDistractors(10), "图上1厘米表示2千米，5厘米表示10千米。", 2],
      ["统计整合", "合唱队男生18人，女生22人，合唱队一共有多少人？", "40", createNumericDistractors(40), "18加22等于40。", 2],
      ["圆的判断", "半径分别是2厘米、4厘米、3厘米的三个圆，面积最大的是哪个？", "半径4厘米的圆", ["半径2厘米的圆", "半径3厘米的圆", "三个一样大"], "半径越大，圆面积越大。", 2],
      ["数据比较", "六(1)班回收纸张12.5千克，六(2)班回收14.8千克，六(3)班回收13.6千克。回收最多的是哪个班？", "六(2)班", ["六(1)班", "六(3)班", "三个班一样多"], "14.8千克最多。", 2]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "跨题迁移", [
      ["节目顺序", "节目单：诗朗诵、古筝、课本剧、合唱。课本剧排在第几个？", "第三个", ["第一个", "第二个", "第四个"], "按节目单顺序，课本剧排第三。", 2],
      ["活动安排", "读书会先默读材料，再分组讨论，最后代表发言。代表发言前要做什么？", "分组讨论", ["默读材料", "打扫教室", "回家休息"], "按顺序，代表发言前一步是分组讨论。", 2],
      ["课文理解", "《桥》里洪水逼近时，老支书最先做的是什么？", "组织大家排队过桥", ["先回家拿东西", "先照顾自家牲口", "先给自己找船"], "老支书先组织群众有序撤离。", 2],
      ["课文理解", "《穷人》结尾渔夫知道真相后，态度是怎样的？", "同意一起抚养孩子", ["坚决反对", "马上送回去", "假装没听见"], "渔夫和桑娜一样善良，愿意一起抚养孩子。", 2],
      ["课文理解", "《丁香结》里，作者面对“结”的态度更接近哪一种？", "坦然面对", ["一味逃避", "完全忽视", "只剩抱怨"], "作者认为生活中的结解不完，要学会坦然面对。", 2],
      ["课文理解", "《夏天里的成长》列举很多事物迅速生长，主要是为了说明什么？", "夏天万物都在使劲长", ["秋天最适合旅行", "植物冬天不需要阳光", "春天变化最少"], "大量例子共同说明夏天里万物迅速生长。", 2],
      ["课文理解", "《竹节人》里，老师没收竹节人后，后来怎样了？", "老师自己也看得入迷", ["老师立刻把它扔掉", "老师叫大家重写作业", "老师带回家锁起来"], "老师后来也沉浸在竹节人的乐趣中。", 2],
      ["课文理解", "《宇宙生命之谜》认为生命存在至少需要哪些条件？", "水和适宜的生存环境", ["只要有石头就行", "只要够高就行", "只要颜色鲜艳就行"], "课文提到水、适宜温度、大气等条件。", 2],
      ["课文理解", "《开国大典》写观礼群众欢呼鼓掌，主要是为了表现什么？", "人们无比激动自豪", ["广场上特别安静", "大家急着回家", "天气忽然变冷"], "欢呼和掌声表现了人们的激动与自豪。", 2],
      ["留言理解", "留言：采访记录放在资料夹第一页，照片在蓝色信封里，录音笔在抽屉右侧。想先找采访记录该去哪里？", "资料夹第一页", ["蓝色信封里", "抽屉右侧", "讲台上"], "留言中明确写着采访记录在资料夹第一页。", 2]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "综合判断", [
      ["百分数应用", "商店运来240本练习本，上午卖出60%，下午又卖出36本，还剩多少本？", "60", createNumericDistractors(60), "上午卖出144本，再卖36本，共卖180本，还剩60本。", 3],
      ["圆周长应用", "一个直径50米的圆形跑道，小亮跑了4圈，一共跑了多少米？", "628", createNumericDistractors(628), "一圈约157米，4圈共628米。", 3],
      ["圆柱应用", "一个圆柱形粮仓底面半径3米，高4米，容积约是多少立方米？", "113.04", createNumericDistractors(113.04), "圆柱体积等于3.14乘9再乘4，约113.04。", 3],
      ["百分数求整体", "一种点心中面粉占20%，如果用了500克面粉，这批点心原料一共多少克？", "2500", createNumericDistractors(2500), "500克对应总量的20%，总量是500除以20%。", 3],
      ["分数应用", "一项工程第一周完成全长的1/4，第二周完成全长的1/3，还剩全长的几分之几？", "5/12", ["1/12", "7/12", "1/2"], "1/4加1/3等于7/12，所以还剩5/12。", 3],
      ["按比例分配", "把96个零件按5∶3分给甲、乙两个小组，甲组分到多少个？", "60", createNumericDistractors(60), "总份数8份，每份12个，甲组5份共60个。", 3],
      ["平均数应用", "三次数学测验成绩分别是88分、92分、95分，平均分是多少？", "91.7", createNumericDistractors(91.7), "总分275分，275除以3约等于91.7。", 3],
      ["单位换算", "一个水池注入1.5立方米的水，相当于多少升？", "1500", createNumericDistractors(1500), "1立方米等于1000升，所以1.5立方米等于1500升。", 3],
      ["折扣应用", "一件上衣原价320元，先打八折，再减20元，最后要付多少元？", "236", createNumericDistractors(236), "八折后是256元，再减20元，最后236元。", 3],
      ["比的应用", "甲杯盐水中盐和水的比是1∶9，如果有30克盐，这杯盐水共多少克？", "300", createNumericDistractors(300), "总份数是10份，30克对应1份，所以一共300克。", 3]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "综合判断", [
      ["课文理解", "《草原》里主客双方最后都不想离开，最主要说明了什么？", "蒙汉情谊深厚", ["草原路太远", "大家都很疲倦", "天气忽然变冷"], "依依惜别最能表现蒙汉情谊深厚。", 3],
      ["课文理解", "《灯光》题目中的“灯光”更深一层象征什么？", "幸福生活和革命理想", ["战场上的火把", "夜里的月亮", "城市里的广告牌"], "灯光不仅是景象，也象征着革命者追求的幸福生活。", 3],
      ["课文理解", "《桥》结尾交代老支书和小伙子的关系，最突出的作用是什么？", "突出先人后己的大爱", ["说明村里人很少", "只是补充姓名", "为了写天气变化"], "揭示父子关系后，更能突出老支书舍己为人的精神。", 3],
      ["课文理解", "《穷人》中多次写恶劣环境，主要起到什么作用？", "衬托人物生活贫困和心地善良", ["说明海上风景优美", "表现房子非常宽敞", "暗示天气会转晴"], "环境越恶劣，越能衬托人物的善良与坚强。", 3],
      ["课文理解", "《开国大典》反复写掌声和欢呼声，主要想表现什么？", "人民心中的激动与自豪", ["典礼时间很短", "广场里座位很多", "人们没有看清流程"], "反复写掌声和欢呼，是为了突出人民的激动自豪。", 3],
      ["课文理解", "《宇宙生命之谜》列举许多资料和推测，主要告诉我们什么？", "科学探索要有证据支撑", ["猜想越多越好", "只要大胆想象就够了", "研究不需要验证"], "文章强调探索宇宙生命要依据资料和科学判断。", 3],
      ["课文理解", "《丁香结》结尾表达的生活态度是什么？", "豁达地面对烦恼", ["永远逃避困难", "什么都不在乎", "只接受快乐不接受烦恼"], "作者认为生活中的结解不完，要学会豁达面对。", 3],
      ["课文理解", "《竹节人》读起来特别有趣，关键原因是什么？", "充满童真和细致生动的描写", ["全文只写天气", "文章全是说明文字", "故事没有任何人物"], "童真视角和细节描写让课文很有趣。", 3],
      ["句意理解", "《夏天里的成长》说“人也是一样，要赶时候，赶热天，尽量地用力地长”，这句话主要想告诉我们什么？", "要珍惜时机主动成长", ["长得慢更轻松", "只要天气热就能成功", "长大后不用学习"], "句子借夏天生长说明人也要把握时机努力成长。", 3],
      ["条件推断", "策划书写着：如果采访对象临时缺席，就改为现场问卷；如果人员到齐，就先录制视频。采访对象缺席时，小组应先做什么？", "改做现场问卷", ["先录制视频", "直接结束活动", "先去操场跑步"], "条件里明确规定采访对象缺席时改做现场问卷。", 3]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "限时冲顶", [
      ["分数速算", "3/5 + 2/5 = ?", "1", createNumericDistractors(1), "同分母分数相加，结果是1。", 3],
      ["百分数速算", "120 × 25% = ?", "30", createNumericDistractors(30), "120的25%就是120除以4，等于30。", 3],
      ["小数除法", "0.75 ÷ 0.25 = ?", "3", createNumericDistractors(3), "0.75里面有3个0.25。", 3],
      ["简易方程", "x ÷ 4 = 6，x = ?", "24", createNumericDistractors(24), "两边同时乘4，x等于24。", 3],
      ["圆的周长", "半径1厘米的圆，周长约是多少厘米？", "6.28", createNumericDistractors(6.28), "圆周长等于2乘3.14乘1。", 3],
      ["百分数速算", "200的15%是多少？", "30", createNumericDistractors(30), "200乘15%等于30。", 3],
      ["小数乘法", "1.5 × 8 = ?", "12", createNumericDistractors(12), "1.5乘8等于12。", 3],
      ["最简分数", "把6/8化成最简分数，结果是多少？", "3/4", ["1/4", "2/3", "4/5"], "6和8同时除以2，得到3/4。", 3]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "限时冲顶", [
      ["文学常识", "《草原》的作者是谁？", "老舍", ["朱自清", "宗璞", "鲁迅"], "《草原》的作者是老舍。", 3],
      ["文学常识", "《丁香结》的作者是谁？", "宗璞", ["老舍", "巴金", "冰心"], "《丁香结》的作者是宗璞。", 3],
      ["课文常识", "《开国大典》写的是哪一天的盛况？", "1949年10月1日", ["1945年8月15日", "1950年10月1日", "1949年9月1日"], "开国大典举行于1949年10月1日。", 3],
      ["人物理解", "《桥》中的老支书最突出的品质是什么？", "沉着无私", ["胆小怕事", "犹豫拖拉", "只顾自己"], "老支书在危急时刻沉着无私。", 3],
      ["课文理解", "《竹节人》最主要写的是哪类生活？", "童年校园生活", ["海边旅行生活", "城市上班生活", "荒岛求生生活"], "课文写的是校园里做竹节人、玩竹节人的事。", 3],
      ["古诗积累", "“移舟泊烟渚”的下一句是什么？", "日暮客愁新", ["江清月近人", "野旷天低树", "白雨跳珠乱入船"], "这是《宿建德江》中的诗句。", 3],
      ["句意理解", "《夏天里的成长》里，作者说“人也是一样”，这里的“人”也在长什么？", "在成长进步", ["在慢慢变矮", "在停止学习", "在搬家旅行"], "这里借万物生长说明人也要成长进步。", 3],
      ["文体常识", "《桥》更接近下面哪一种文体？", "小说", ["诗歌", "说明文", "日记"], "《桥》通过人物和情节塑造形象，更接近小说。", 3]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "终章通关", [
      ["综合计算", "学校为毕业汇演买来18箱矿泉水，每箱24瓶，演出前发出196瓶后，剩下的平均分给4个班，每班多少瓶？", "59", createNumericDistractors(59), "18箱共432瓶，减去196瓶还剩236瓶，再平均分给4个班，每班59瓶。", 3],
      ["综合计算", "地图比例尺是1∶500000，图上两地相距8厘米，客车每小时行40千米，走完实际路程要几小时？", "1", createNumericDistractors(1), "图上1厘米表示5千米，8厘米就是40千米，40除以40等于1小时。", 3],
      ["综合计算", "一个圆形花坛半径6米，沿外圈每隔3.14米摆一盆花，大约能摆多少盆？", "12", createNumericDistractors(12), "花坛周长约37.68米，37.68除以3.14约等于12。", 3],
      ["综合计算", "一桶油有18升，食堂买了6桶，用去总量的2/3，还剩多少升？", "36", createNumericDistractors(36), "6桶共108升，用去2/3后还剩1/3，也就是36升。", 3],
      ["综合计算", "一个圆柱形水箱底面半径2米，高3米，装了半箱水，水的体积约是多少立方米？", "18.84", createNumericDistractors(18.84), "满箱体积约37.68立方米，装半箱就是18.84立方米。", 3],
      ["综合计算", "毕业纪念册原价每本28元，买35本打九折，一共要付多少元？", "882", createNumericDistractors(882), "原价共980元，打九折后是882元。", 3],
      ["综合计算", "六年级植树240棵，成活率是95%，成活了多少棵？", "228", createNumericDistractors(228), "240乘95%等于228。", 3],
      ["综合计算", "一项修路工程已经完成全长的3/8，还剩50千米没有修，这条路全长多少千米？", "80", createNumericDistractors(80), "剩下的是全长的5/8，50除以5/8等于80。", 3],
      ["综合计算", "把84块奖牌按2∶5分给甲、乙两队，乙队比甲队多多少块？", "36", createNumericDistractors(36), "总份数7份，每份12块，乙队比甲队多3份，就是36块。", 3],
      ["综合计算", "一批图书先按原价的80%出售，又在此基础上每本减4元，原价40元的书最后每本多少元？", "28", createNumericDistractors(28), "先按80%出售得32元，再减4元，最后28元。", 3]
    ]),
    "上册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "终章通关", [
      ["通知理解", "通知：周五8点在报告厅集合参加毕业分享会，要求7点50分完成签到。最晚什么时候签到？", "7点50分前", ["8点整", "7点55分", "8点10分"], "通知要求7点50分前完成签到。", 3],
      ["课文理解", "《桥》为什么用“桥”作题目更有力量？", "既指木桥也象征生命通道", ["只是因为字数少", "因为桥上风景最好", "因为桥的颜色好看"], "题目中的“桥”既是实写，也象征党员为群众搭起生命通道。", 3],
      ["课文理解", "《灯光》写天安门前的灯光，又回忆战场上的故事，最想表达什么？", "今天的幸福生活来之不易", ["夜景比白天更亮", "战士们都喜欢看灯", "城市里没有黑夜"], "现实灯光和战场回忆形成对照，更能表现今天的幸福来之不易。", 3],
      ["人物心理", "《穷人》里桑娜“忐忑不安”，最主要是因为什么？", "担心渔夫又舍不得孩子", ["害怕风停了", "忘了做晚饭", "想去集市买布"], "她既担心丈夫的反应，又舍不得把孩子送走。", 3],
      ["顺序整合", "《开国大典》按典礼进程写场面，下面哪一项顺序正确？", "宣布成立、升旗、阅兵、游行", ["升旗、宣布成立、游行、阅兵", "游行、升旗、宣布成立、阅兵", "阅兵、宣布成立、升旗、游行"], "课文按典礼过程依次写了宣布成立、升旗、阅兵、游行。", 3],
      ["课文理解", "《宇宙生命之谜》让我们面对未知世界时应持什么态度？", "不断求证，理性探索", ["随便猜想即可", "完全不用研究", "只听传言就够了"], "课文强调探索未知要讲证据、讲科学。", 3],
      ["课文理解", "《丁香结》里作者为什么说“结，是解不完的”？", "人生的问题常伴随着成长", ["丁香花永远不开", "所有难题都会自动消失", "人不需要思考烦恼"], "这句话说明生活中的问题总会存在，要学会面对。", 3],
      ["诗句理解", "“蒙汉情深何忍别，天涯碧草话斜阳”最能表达怎样的感情？", "依依惜别和深厚情谊", ["旅途特别劳累", "草地非常寒冷", "时间过得太慢"], "诗句集中表达了依依惜别和深厚情谊。", 3],
      ["活动推理", "毕业采访活动先看老照片，再采访老师，最后整理成长册。如果老师临时开会，就先整理照片说明。老师临时开会时，大家应先做什么？", "先整理照片说明", ["直接采访老师", "立刻回家", "马上开始彩排"], "条件里说明老师临时开会时先整理照片说明。", 3],
      ["课文理解", "《竹节人》里老师由严肃到看得入迷，这样写主要让人感受到什么？", "老师也有未泯的童心", ["老师只会批评学生", "老师不认识竹节人", "老师最爱布置作业"], "这一转变让人物更有趣，也让课文更有温度。", 3]
    ]),
    "上册"
  )
]);

const gradeSixLowerChallengeQuestions = buildQuestions([
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "审题锁点", [
      ["比的化简", "18∶24化成最简整数比是多少？", "3∶4", ["4∶3", "6∶8", "9∶12"], "18和24同时除以6，最简比是3∶4。", 1],
      ["百分数基础", "120的15%是多少？", "18", createNumericDistractors(18), "120乘15%等于18。", 1],
      ["圆柱认识", "一个圆柱的底面直径是6厘米，底面半径是多少厘米？", "3", createNumericDistractors(3), "半径等于直径除以2，所以是3厘米。", 1]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "审题锁点", [
      ["课文理解", "《北京的春节》重点写哪个日子最热闹？", "除夕", ["元旦", "重阳", "端午"], "课文重点写了除夕的热闹景象。", 1],
      ["课文理解", "《匆匆》里作者最强烈的感受是什么？", "时间流逝得太快", ["时间过得太慢", "春天来得太早", "夜晚特别漫长"], "全文表达了作者对时间匆匆流逝的感受。", 1],
      ["课文理解", "《学弈》里两个学生学棋结果不同，主要原因是什么？", "一个专心一个分心", ["老师教法不同", "棋盘大小不同", "下棋时间不同"], "文章用对比说明学习要专心致志。", 1]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "信息建模", [
      ["比例尺", "一张图纸比例尺是1∶500000，图上2厘米表示实际多少千米？", "10", createNumericDistractors(10), "图上1厘米表示5千米，2厘米就是10千米。", 1],
      ["圆柱体积", "底面半径2厘米、高10厘米的圆柱，体积约是多少立方厘米？", "125.6", createNumericDistractors(125.6), "圆柱体积等于3.14乘4再乘10，约125.6。", 1],
      ["圆锥体积", "一个圆锥底面积12平方厘米，高9厘米，体积是多少立方厘米？", "36", createNumericDistractors(36), "圆锥体积等于底面积乘高再除以3，12乘9除以3等于36。", 1],
      ["折扣计算", "原价300元的运动鞋打八五折后，现价多少元？", "255", createNumericDistractors(255), "300乘0.85等于255。", 1],
      ["税率计算", "一本书定价40元，按5%加价后售价是多少元？", "42", createNumericDistractors(42), "40乘1.05等于42。", 1]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "信息建模", [
      ["文学常识", "《十六年前的回忆》的作者是谁？", "李星华", ["老舍", "朱自清", "冰心"], "《十六年前的回忆》的作者是李星华。", 1],
      ["课文理解", "《为人民服务》这篇演讲最核心的号召是什么？", "全心全意为人民服务", ["只做轻松的工作", "只顾个人利益", "遇事立刻退缩"], "这篇演讲强调全心全意为人民服务。", 1],
      ["通知理解", "通知：周五15点40分在操场集合彩排，要求15点30分前到。最晚什么时候到？", "15点30分前", ["15点40分", "15点35分", "15点50分"], "通知明确要求15点30分前到。", 1],
      ["课文理解", "《真理诞生于一百个问号之后》主要说明什么？", "善于追问和实证才能发现真理", ["只要运气好就能成功", "知识都来自猜想", "真理不需要验证"], "课文强调追问、观察和实验的重要性。", 1],
      ["课文理解", "《那个星期天》主要写了什么内容？", "等待落空时的心情变化", ["一次快乐的旅行", "一场激烈的比赛", "一顿丰盛的晚饭"], "课文主要写“我”等待母亲兑现承诺时的心情变化。", 1]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "多步求解", [
      ["分数应用", "班里有60人，其中3/5报名社团活动，后来又有4人临时请假，最后参加的有多少人？", "32", createNumericDistractors(32), "60乘3/5等于36，再减4等于32。", 2],
      ["百分数应用", "一本书共300页，第一天读了全书的20%，第二天又读了45页，还剩多少页？", "195", createNumericDistractors(195), "第一天读60页，两天共读105页，还剩195页。", 2],
      ["圆柱应用", "一个圆柱形容器最多能装188.4升水，已经装了62.8升，还差多少升装满？", "125.6", createNumericDistractors(125.6), "188.4减62.8等于125.6。", 2],
      ["按比分配", "把72件作品按5∶4分给甲、乙两个展区，乙展区分到多少件？", "32", createNumericDistractors(32), "总份数9份，每份8件，乙展区4份共32件。", 2],
      ["圆锥体积", "一个沙堆是圆锥形，底面积18平方米，高6米，它的体积是多少立方米？", "36", createNumericDistractors(36), "圆锥体积等于18乘6再除以3，等于36。", 2]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "多步求解", [
      ["活动顺序", "调查活动先设计问卷，再外出采访，最后整理报告。整理报告前一步是什么？", "外出采访", ["设计问卷", "打印成册", "回家休息"], "按顺序，整理报告前一步是外出采访。", 2],
      ["条件理解", "如果图书馆借到资料，就直接整理笔记；如果没借到，就先查电子资料。没有借到资料时应该怎么做？", "先查电子资料", ["直接整理笔记", "先结束任务", "马上去操场"], "条件里明确说没借到资料时先查电子资料。", 2],
      ["课文理解", "《两小儿辩日》里，两个孩子争论的是什么？", "太阳早晨和中午哪个更远", ["谁的书读得多", "河水什么时候最深", "哪条路更近"], "两个孩子围绕太阳远近展开争论。", 2],
      ["课文理解", "《北京的春节》按时间顺序写风俗，写完腊八后，接着重点写了什么阶段？", "过年前的准备", ["中秋赏月", "夏天避暑", "秋天收果子"], "课文写完腊八后，接着写人们为过年做准备。", 2],
      ["课文理解", "《十六年前的回忆》里，李大钊面对敌人表现得怎样？", "沉着坚定", ["惊慌失措", "左右躲闪", "不停抱怨"], "李大钊面对危险依然沉着坚定。", 2]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "跨题迁移", [
      ["图表阅读", "借阅统计表：周一26本，周二31本，周三29本。借出最多的是哪一天？", "周二", ["周一", "周三", "三天一样多"], "31本最多，所以是周二。", 2],
      ["图表阅读", "三种书包折后价分别是96元、88元、92元，最便宜的是哪一个？", "88元那个", ["96元那个", "92元那个", "三个一样便宜"], "88元最低。", 2],
      ["体积比较", "三个圆柱的体积分别是125.6、113.04、131.88，体积最大的是哪一个？", "131.88那个", ["125.6那个", "113.04那个", "三个一样大"], "131.88最大。", 2],
      ["成绩比较", "跳绳成绩：小林160下，小浩172下，小军168下。谁跳得最多？", "小浩", ["小林", "小军", "三人一样多"], "172下最多，所以是小浩。", 2],
      ["百分率比较", "三种树苗成活率分别是92%、96%、94%，哪一种最高？", "96%那种", ["92%那种", "94%那种", "三种一样高"], "96%最高。", 2],
      ["比例尺应用", "图上4厘米表示实际12千米，这幅图的比例尺相当于1∶多少？", "300000", createNumericDistractors(300000), "12千米等于1200000厘米，1200000除以4等于300000。", 2],
      ["折扣计算", "一件球衣原价120元，按七折出售，现价是多少元？", "84", createNumericDistractors(84), "120乘0.7等于84。", 2],
      ["平均数", "三次数学小测成绩是86分、90分、94分，平均分是多少？", "90", createNumericDistractors(90), "总分270分，除以3等于90。", 2],
      ["分数比较", "1/2、3/5、5/8这三个数中，最大的是哪个？", "5/8", ["1/2", "3/5", "一样大"], "比较大小可知5/8最大。", 2],
      ["数量统计", "六(1)班收集废纸18千克，六(2)班21千克，六(3)班19千克，三个班一共收集多少千克？", "58", createNumericDistractors(58), "18加21再加19等于58。", 2]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "跨题迁移", [
      ["活动安排", "毕业留言册先分组采访，再整理金句，最后誊写成册。誊写成册前一步是什么？", "整理金句", ["分组采访", "拍毕业照", "离校回家"], "按顺序，誊写成册前一步是整理金句。", 2],
      ["课文理解", "《北京的春节》详写除夕、初一、元宵节，主要是为了突出什么？", "春节风俗热闹有味", ["天气变化很快", "城市特别安静", "街道非常空旷"], "详写这些日子，是为了突出春节的热闹和年味。", 2],
      ["课文理解", "《腊八粥》里八儿最盼望的是什么？", "早点喝到腊八粥", ["早点去上学", "早点放风筝", "早点睡午觉"], "八儿整篇都在盼着早点喝到腊八粥。", 2],
      ["课文理解", "《表里的生物》里，“我”小时候最好奇的是什么？", "表里为什么会发出声音", ["为什么雨会下个不停", "为什么树叶会变黄", "为什么河水会流动"], "“我”一直追问表里为什么会发出声音。", 2],
      ["课文理解", "《真理诞生于一百个问号之后》最强调哪种学习方法？", "发现问题并不断追问", ["只背结论不思考", "看过就算", "全靠别人提醒"], "课文强调要从现象中发现问题、不断追问。", 2],
      ["课文理解", "《鲁滨逊漂流记》里，鲁滨逊流落荒岛后首先要解决什么问题？", "生存问题", ["怎样去逛集市", "怎样看电影", "怎样换新衣服"], "流落荒岛后最先要面对的是生存。", 2],
      ["课文理解", "《骑鹅旅行记》里，尼尔斯一路经历后最大的变化是什么？", "从淘气变得懂事", ["从勇敢变得胆小", "从安静变得懒惰", "从勤快变得粗心"], "经历旅程后，尼尔斯逐渐变得懂事善良。", 2],
      ["课文理解", "《汤姆·索亚历险记》中的汤姆给人最鲜明的印象是什么？", "聪明顽皮", ["沉默寡言", "非常胆小", "总爱哭闹"], "汤姆活泼机灵、富于冒险精神。", 2],
      ["留言理解", "留言：主持词在红色文件夹里，签到表在讲台左侧，照相机在窗边柜子上。想先拿签到表该去哪儿？", "讲台左侧", ["红色文件夹里", "窗边柜子上", "门口地垫下"], "留言中明确写着签到表在讲台左侧。", 2],
      ["课文理解", "《为人民服务》里“为人民利益而死，就比泰山还重”这句话主要赞扬什么？", "为人民奉献的价值", ["山很高很稳", "石头特别沉", "路走得很远"], "这句话强调为人民利益而牺牲的价值非常崇高。", 2]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "综合判断", [
      ["百分数应用", "学校义卖收入480元，拿出25%买奖品后，剩下多少元？", "360", createNumericDistractors(360), "奖品用了120元，剩下360元。", 3],
      ["圆柱应用", "一个圆柱形水桶底面半径2分米，高6分米，最多能装水多少升？", "75.36", createNumericDistractors(75.36), "圆柱体积约75.36立方分米，也就是75.36升。", 3],
      ["按比例分配", "把140面小旗按3∶4分给甲、乙两组，乙组比甲组多多少面？", "20", createNumericDistractors(20), "总份数7份，每份20面，乙比甲多1份，就是20面。", 3],
      ["成活率应用", "种了320棵树，成活率是90%，成活多少棵？", "288", createNumericDistractors(288), "320乘90%等于288。", 3],
      ["比例尺应用", "地图上两地相距6厘米，比例尺是1∶300000，实际距离是多少千米？", "18", createNumericDistractors(18), "图上1厘米表示3千米，所以实际距离是18千米。", 3],
      ["圆锥应用", "一个圆锥形沙堆底面积24平方米，高4.5米，体积是多少立方米？", "36", createNumericDistractors(36), "24乘4.5再除以3，体积是36立方米。", 3],
      ["分数工程", "一条路第一天修了全长的2/5，第二天又修了全长的1/4，还剩全长的几分之几？", "7/20", ["3/20", "9/20", "1/5"], "2/5加1/4等于13/20，所以还剩7/20。", 3],
      ["折扣应用", "一台学习机原价500元，先打八折，再减30元，最后售价是多少元？", "370", createNumericDistractors(370), "八折后是400元，再减30元，最后370元。", 3],
      ["平均数应用", "四次口算成绩分别是92分、95分、89分、96分，平均分是多少？", "93", createNumericDistractors(93), "总分372分，除以4等于93。", 3],
      ["综合计算", "三箱矿泉水共72瓶，运动会喝掉总数的1/3后，剩下的平均分给6个小组，每组分到多少瓶？", "8", createNumericDistractors(8), "喝掉24瓶后还剩48瓶，平均分给6组，每组8瓶。", 3]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "综合判断", [
      ["课文理解", "《匆匆》中作者反复追问“我们的日子为什么一去不复返呢”，主要表达什么？", "对时间流逝的追问与惋惜", ["对假期太短的抱怨", "对天气炎热的不满", "对路程遥远的焦急"], "反复追问强化了对时间流逝的惋惜。", 3],
      ["课文理解", "《十六年前的回忆》写父亲遇害前后的事，主要是为了表达什么？", "对父亲的敬仰与怀念", ["对旅行的向往", "对美食的喜爱", "对游戏的沉迷"], "全文通过回忆表达了对李大钊的敬仰和怀念。", 3],
      ["课文理解", "《为人民服务》引用司马迁的话，主要是想说明什么？", "人的死有不同意义", ["古人都喜欢写书", "每个人都怕困难", "山和羽毛一样重"], "引用名言是为了说明死的意义不同。", 3],
      ["课文理解", "《真理诞生于一百个问号之后》列举多个事例，主要说明什么？", "发现真理离不开质疑和实验", ["真理只能靠运气得到", "提问越多越烦恼", "做实验一定会失败"], "多个事例共同证明真理发现源于追问和实证。", 3],
      ["课文理解", "《那个星期天》里环境从明亮到昏暗不断变化，主要起什么作用？", "衬托“我”的心情变化", ["说明季节要变了", "表示街上人很多", "暗示母亲生病"], "环境变化和人物心情变化相互映衬。", 3],
      ["课文理解", "《表里的生物》通过“我”的追问和猜想，主要表现了什么？", "儿童的好奇心和求知欲", ["儿童只爱玩耍", "大人总是很忙", "钟表声音很吵"], "文章重点写出了孩子强烈的好奇心。", 3],
      ["课文理解", "《鲁滨逊漂流记》里，鲁滨逊能长期生存下来，最关键依靠什么？", "勇敢和智慧", ["别人天天送饭", "岛上有现成房子", "他一直待在船上"], "鲁滨逊靠顽强意志和智慧克服困难。", 3],
      ["课文理解", "《骑鹅旅行记》里，尼尔斯一路上的经历最重要的收获是什么？", "学会关心别人和承担责任", ["学会偷懒逃课", "学会一直发脾气", "学会只顾自己"], "旅程让尼尔斯逐渐成长，懂得关心他人。", 3],
      ["课文理解", "《汤姆·索亚历险记》节选让人最强烈地感受到汤姆怎样的特点？", "自由活泼又富于冒险", ["做事特别刻板", "只喜欢安静读书", "从不和朋友来往"], "节选突出了汤姆活泼、机灵、富有冒险精神。", 3],
      ["条件推断", "班级计划写毕业纪念文：如果采访提前完成，就先排版；如果采访拖延，就先整理照片。采访拖延时，小组应该先做什么？", "先整理照片", ["先排版", "先去操场集合", "直接上交空白稿"], "条件中明确说明采访拖延时先整理照片。", 3]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "限时冲顶", [
      ["百分数速算", "40 × 15% = ?", "6", createNumericDistractors(6), "40乘15%等于6。", 3],
      ["小数乘法", "2.5 × 4 = ?", "10", createNumericDistractors(10), "2.5乘4等于10。", 3],
      ["分数速算", "3/10 + 7/10 = ?", "1", createNumericDistractors(1), "同分母分数相加得1。", 3],
      ["圆的周长", "半径2厘米的圆，周长约是多少厘米？", "12.56", createNumericDistractors(12.56), "圆周长等于2乘3.14乘2。", 3],
      ["小数除法", "1.2 ÷ 0.3 = ?", "4", createNumericDistractors(4), "1.2里面有4个0.3。", 3],
      ["圆锥体积", "一个圆锥底面积12平方厘米，高3厘米，体积是多少立方厘米？", "12", createNumericDistractors(12), "12乘3再除以3，等于12。", 3],
      ["百分数速算", "60的75%是多少？", "45", createNumericDistractors(45), "60乘75%等于45。", 3],
      ["简易方程", "x - 18 = 27，x = ?", "45", createNumericDistractors(45), "27加18等于45。", 3]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "限时冲顶", [
      ["文学常识", "《匆匆》的作者是谁？", "朱自清", ["老舍", "李星华", "巴金"], "《匆匆》的作者是朱自清。", 3],
      ["文学常识", "《北京的春节》的作者是谁？", "老舍", ["朱自清", "冰心", "叶圣陶"], "《北京的春节》的作者是老舍。", 3],
      ["人物常识", "《十六年前的回忆》主要回忆的是谁？", "李大钊", ["鲁迅", "詹天佑", "邓稼先"], "这篇课文主要回忆李大钊。", 3],
      ["寓意理解", "《学弈》告诉我们学习时最需要什么？", "专心致志", ["东张西望", "只靠天赋", "随便听听"], "故事告诉我们学习要专心致志。", 3],
      ["文言理解", "《两小儿辩日》里，谁“不能决也”？", "孔子", ["两个小儿", "车夫", "渔夫"], "文中写孔子也不能判断。", 3],
      ["课文常识", "《为人民服务》是谁所作的演讲？", "毛泽东", ["周恩来", "朱自清", "老舍"], "《为人民服务》是毛泽东的演讲。", 3],
      ["课文理解", "《表里的生物》里，“我”最好奇的是什么？", "表里的声音", ["院子里的花草", "窗外的小鸟", "屋里的画框"], "课文围绕“表里的声音”展开。", 3],
      ["方法理解", "《真理诞生于一百个问号之后》里，发现真理要善于做什么？", "提出问题", ["立刻放弃", "照搬答案", "只看热闹"], "课文强调善于发现问题、提出问题。", 3]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "数学", "终章通关", [
      ["综合计算", "校园义卖卖出45本纪念册，每本24元，后来又拿出总收入的1/4买奖品，还剩多少元？", "810", createNumericDistractors(810), "总收入1080元，拿出270元买奖品后还剩810元。", 3],
      ["综合计算", "一个圆柱形泳池底面半径3米，高2米，池中装了3/4池水，水的体积约是多少立方米？", "42.39", createNumericDistractors(42.39), "满池体积约56.52立方米，装3/4池就是42.39立方米。", 3],
      ["综合计算", "把126张奖状按4∶5分给甲、乙两班，乙班比甲班多多少张？", "14", createNumericDistractors(14), "总份数9份，每份14张，乙比甲多1份，就是14张。", 3],
      ["综合计算", "六年级种了400株向日葵，成活率是92%，没有成活多少株？", "32", createNumericDistractors(32), "成活368株，没有成活32株。", 3],
      ["综合计算", "地图比例尺是1∶800000，图上两地距离5厘米，客车每小时行50千米，几小时能到？", "0.8", createNumericDistractors(0.8), "实际距离40千米，40除以50等于0.8小时。", 3],
      ["综合计算", "一个圆锥形沙堆底面积30平方米，高3米，把它平均装进5辆车，每辆车装多少立方米？", "6", createNumericDistractors(6), "沙堆体积30立方米，平均装进5辆车，每辆6立方米。", 3],
      ["综合计算", "一项工程完成了全长的3/5后，还剩48米，这项工程全长多少米？", "120", createNumericDistractors(120), "剩下的是2/5，48除以2/5等于120。", 3],
      ["综合计算", "一套校服原价260元，先打九折，再优惠15元，最后买3套一共多少钱？", "657", createNumericDistractors(657), "每套九折后234元，再减15元是219元，3套共657元。", 3],
      ["综合计算", "四次数学竞赛成绩分别是94分、88分、96分、90分，平均分是多少？", "92", createNumericDistractors(92), "总分368分，平均分92。", 3],
      ["综合计算", "一批水有96瓶，先喝掉1/4，再把剩下的平均分给8个小组，每组分到多少瓶？", "9", createNumericDistractors(9), "喝掉24瓶后还剩72瓶，平均分给8组，每组9瓶。", 3]
    ]),
    "下册"
  ),
  ...withChallengeSemester(
    createChallengeConfigs("六年级", "语文", "终章通关", [
      ["通知理解", "通知：毕业汇演彩排下午2点开始，要求1点45分前在后台完成换装。最晚什么时候换装完毕？", "1点45分前", ["2点整", "1点50分", "2点10分"], "通知要求1点45分前完成换装。", 3],
      ["课文理解", "《北京的春节》为什么要详写除夕、初一和元宵节？", "突出春节民俗的热闹和特色", ["因为别的日子都下雨", "因为作者只记得这三天", "因为其余日子没有人过节"], "详写重点日子，更能突出春节风俗的热闹和特色。", 3],
      ["课文理解", "《匆匆》用“匆匆”作题目，最能概括什么？", "时间飞快流逝", ["春天景色很美", "城市道路很挤", "孩子跑得很快"], "题目直接概括了时间匆匆流逝这一主旨。", 3],
      ["人物理解", "《十六年前的回忆》中的李大钊给人最深的印象是什么？", "忠诚坚定、从容无畏", ["胆小怕事、犹豫不决", "喜欢炫耀、爱发脾气", "只顾自己、不管别人"], "课文通过多处细节刻画了李大钊坚定无畏的形象。", 3],
      ["主旨理解", "《为人民服务》这篇演讲最核心的观点是什么？", "一切为了人民的利益", ["一切只为个人出名", "只做简单的事情", "做事不能吃苦"], "全文围绕“为人民服务”展开。", 3],
      ["方法理解", "《真理诞生于一百个问号之后》给我们的启发最接近哪一项？", "从现象中发现问题并反复求证", ["遇到问题立刻放弃", "只记结论不思考", "听别人说什么就信什么"], "课文强调在观察、提问、实验中发现真理。", 3],
      ["情感变化", "《那个星期天》里，“我”的心情从期待慢慢变成了什么？", "失望和委屈", ["骄傲和轻松", "兴奋和得意", "平静和无聊"], "等待没有实现，心情逐渐转为失望和委屈。", 3],
      ["课文理解", "《鲁滨逊漂流记》节选最能让我们感受到什么？", "人在困境中的顽强生存", ["城市生活的热闹", "节日聚会的快乐", "校园比赛的激烈"], "节选重点写鲁滨逊在困境中顽强生存。", 3],
      ["课文理解", "《骑鹅旅行记》里，尼尔斯一路成长说明了什么？", "真正的成长来自经历和反思", ["只要个子高就是成长", "长大后不用帮助别人", "冒险越多越不用负责"], "尼尔斯在旅途中学会反思并逐渐成长。", 3],
      ["课文理解", "《汤姆·索亚历险记》节选为什么读起来特别吸引人？", "人物活泼，故事充满冒险感", ["全文只写天气情况", "每一句都在讲道理", "没有任何情节变化"], "汤姆鲜活的人物形象和冒险情节很有吸引力。", 3]
    ]),
    "下册"
  )
]);

const questions = [
  ...legacyQuestions,
  ...gradeFourToSixCoverageBackfillQuestions,
  ...gradeFourToSixRouteDeepeningQuestions,
  ...gradeFourToSixLowSupplyPriorityQuestions,
  ...gradeFourToSixEnglishSemesterQuestions,
  ...buildSubjectQuestions("语文", gradeOneChineseSemesterQuestionConfigs),
  ...buildSubjectQuestions("数学", gradeOneMathSemesterQuestionConfigs),
  ...gradeOneUpperChallengeQuestions,
  ...gradeOneLowerChallengeQuestions,
  ...gradeTwoUpperChallengeQuestions,
  ...gradeTwoLowerChallengeQuestions,
  ...gradeThreeUpperChallengeQuestions,
  ...gradeThreeLowerChallengeQuestions,
  ...gradeFourUpperChallengeQuestions,
  ...gradeFourLowerChallengeQuestions,
  ...gradeFiveUpperChallengeQuestions,
  ...gradeFiveLowerChallengeQuestions,
  ...gradeSixUpperChallengeQuestions,
  ...gradeSixLowerChallengeQuestions
];

if (process.env.SKIP_SEED_DUPLICATE_CHECK !== "1") {
  const uniqueQuestionKeys = new Set();

  for (const question of questions) {
    const questionKey = `${question.subject}|${question.grade}|${question.semester}|${question.content}`;

    if (uniqueQuestionKeys.has(questionKey)) {
      throw new Error(`Duplicate seed question detected: ${questionKey}`);
    }

    uniqueQuestionKeys.add(questionKey);
  }
}

module.exports = {
  questions
};
