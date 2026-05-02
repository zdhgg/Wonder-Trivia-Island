function createModule({ id, title, summary, learnGoals, knowledgeTags }) {
  return Object.freeze({
    id,
    title,
    summary,
    learnGoals: Object.freeze(learnGoals),
    knowledgeTags: Object.freeze(knowledgeTags)
  });
}

function createSubjectSection({ id, subject, summary, modules }) {
  return Object.freeze({
    id,
    subject,
    summary,
    modules: Object.freeze(modules.map((module) => createModule(module)))
  });
}

function createSection({ id, grade, semester, title, summary, basisNote, subjects }) {
  return Object.freeze({
    id,
    grade,
    semester,
    title,
    summary,
    basisNote,
    subjects: Object.freeze(subjects.map((subject) => createSubjectSection(subject)))
  });
}

export const HENAN_GRADE_FIVE_SYSTEMATIC_SECTIONS = Object.freeze([
  createSection({
    id: "henan-grade-5-upper",
    grade: "五年级",
    semester: "上册",
    title: "五年级上册",
    summary: "上册开始把小数运算、因数倍数、句段关系和英语日常阅读一起推向更完整的学习主线。",
    basisNote: "按河南当前小学课程主线整理，五年级继续在语文、数学、英语三条路线里稳步加深。",
    subjects: [
      {
        id: "henan-grade-5-upper-chinese",
        subject: "语文",
        summary: "上册先把字词理解、句段关系、古诗文积累和记事表达慢慢连成更完整的阅读写作线。",
        modules: [
          {
            id: "g5-upper-chinese-words",
            title: "词义推敲和成语运用",
            summary: "词语到了五年级更讲究准确和分寸，要会联系语境推敲意思，也敢在表达里用成语。",
            learnGoals: ["会联系语境辨词义", "会分辨近义词差别", "会恰当地运用成语"],
            knowledgeTags: ["词义理解", "近义词辨析", "成语运用", "词语运用"]
          },
          {
            id: "g5-upper-chinese-reading",
            title: "句段关系和说明阅读",
            summary: "读文章时不只看一句，还要看句子和段落之间怎么互相支撑，也开始更认真地读说明内容。",
            learnGoals: ["会看段落关系", "会提取说明信息", "会概括主要内容"],
            knowledgeTags: ["段落关系", "说明文阅读", "信息提取", "中心句"]
          },
          {
            id: "g5-upper-chinese-culture",
            title: "古诗文积累和表达方法",
            summary: "古诗文要继续积累，也要会体会作者怎样借景、借事、借句子来表达感受。",
            learnGoals: ["会理解诗句含义", "会积累传统文化内容", "会体会常见表达方法"],
            knowledgeTags: ["古诗理解", "文言启蒙", "传统文化", "表达方法"]
          },
          {
            id: "g5-upper-chinese-write",
            title: "记事习作和场面描写",
            summary: "写事时要把起因经过结果讲清楚，也开始学会在场面和细节里写出重点。",
            learnGoals: ["会安排叙事顺序", "会描写典型场面", "会通过细节突出重点"],
            knowledgeTags: ["记事表达", "习作结构", "场面描写", "细节描写"]
          }
        ]
      },
      {
        id: "henan-grade-5-upper-math",
        subject: "数学",
        summary: "上册重点进入小数运算、因数倍数、图形面积和简易方程这些更成体系的内容。",
        modules: [
          {
            id: "g5-upper-math-decimal",
            title: "小数意义和加减运算",
            summary: "小数不只要会认，还要会比较大小、联系单位理解，也能做小数加减法。",
            learnGoals: ["会理解小数意义", "会比较小数大小", "会做小数加减法"],
            knowledgeTags: ["小数意义", "小数大小比较", "小数加法", "小数减法"]
          },
          {
            id: "g5-upper-math-number",
            title: "因数倍数和数的规律",
            summary: "一个数和另一个数之间的关系开始更丰富了，要会看因数、倍数，也会发现一些特别的数。",
            learnGoals: ["会判断因数和倍数", "会辨认常见倍数特征", "会观察数的关系"],
            knowledgeTags: ["因数与倍数", "2和5的倍数特征", "质数与合数", "数的奇偶性"]
          },
          {
            id: "g5-upper-math-area",
            title: "面积计算和组合图形",
            summary: "图形开始更讲究计算了，要会算面积，也要会把大图拆开来看。",
            learnGoals: ["会算常见图形面积", "会拆分组合图形", "会联系图形特点列式"],
            knowledgeTags: ["平行四边形面积", "三角形面积", "梯形面积", "组合图形面积"]
          },
          {
            id: "g5-upper-math-equation",
            title: "用字母表示数和简易方程",
            summary: "有些数量关系开始不用具体数字直接说，也要会借方程把未知数慢慢找出来。",
            learnGoals: ["会用字母表示数", "会理解等式关系", "会解简易方程"],
            knowledgeTags: ["用字母表示数", "简易方程", "等式性质", "情景计算"]
          }
        ]
      },
      {
        id: "henan-grade-5-upper-english",
        subject: "英语",
        summary: "上册继续把日常交流、学校家庭、时间计划和句型理解慢慢学稳。",
        modules: [
          {
            id: "g5-upper-english-dialogue",
            title: "个人信息和日常交流",
            summary: "对话会更完整，要会看清谁在说什么，也能在常见情景里选出最合适的表达。",
            learnGoals: ["会判断日常对话场景", "会理解常见问答", "会做句子选择"],
            knowledgeTags: ["情景对话", "日常问答", "句子选择", "个人信息"]
          },
          {
            id: "g5-upper-english-words",
            title: "学校家庭和常见词汇",
            summary: "人物、地点和物品词汇会继续扩展，要学会把词放回学校和家庭场景里记住。",
            learnGoals: ["会认学校家庭常见词汇", "会做词义判断", "会把词放回句子理解"],
            knowledgeTags: ["学校生活", "家庭成员", "常识词汇", "词义判断"]
          },
          {
            id: "g5-upper-english-time",
            title: "时间计划和活动安排",
            summary: "时间、星期和日常活动常常一起出现，要学会在安排和计划里看懂句子意思。",
            learnGoals: ["会理解时间表达", "会判断活动安排", "会在场景中理解句意"],
            knowledgeTags: ["时间表达", "日常活动", "句意理解", "情景对话"]
          },
          {
            id: "g5-upper-english-read",
            title: "句型理解和阅读判断",
            summary: "句子开始变得更完整，要会从关键词和固定句型里看出整句大意。",
            learnGoals: ["会抓句子关键词", "会判断简单句型", "会读懂短句和短文"],
            knowledgeTags: ["句型理解", "阅读理解", "短语理解", "句意判断"]
          }
        ]
      }
    ]
  }),
  createSection({
    id: "henan-grade-5-lower",
    grade: "五年级",
    semester: "下册",
    title: "五年级下册",
    summary: "下册把分数、体积统计、人物描写和英语场景阅读继续往前推进。",
    basisNote: "按河南当前小学课程主线整理，五年级下册继续在语文、数学、英语三条路线里向更综合的理解推进。",
    subjects: [
      {
        id: "henan-grade-5-lower-chinese",
        subject: "语文",
        summary: "下册更重视词句品味、人物阅读、古诗文理解和写人写景表达。",
        modules: [
          {
            id: "g5-lower-chinese-words",
            title: "词句品味和修辞运用",
            summary: "词语不只要会认会用，还要会品味它在句子里的语气和修辞效果。",
            learnGoals: ["会体会词语色彩", "会认识常见修辞作用", "会让句子表达更生动"],
            knowledgeTags: ["词语感情色彩", "修辞运用", "比喻句", "排比句"]
          },
          {
            id: "g5-lower-chinese-reading",
            title: "人物特点和阅读概括",
            summary: "读文章时要会从语言、动作和事情里看人物，也要能概括段落和全文的主要意思。",
            learnGoals: ["会分析人物特点", "会抓阅读重点", "会概括文章主要内容"],
            knowledgeTags: ["人物描写", "阅读概括", "信息提取", "主题理解"]
          },
          {
            id: "g5-lower-chinese-culture",
            title: "古诗文理解和文化积累",
            summary: "古诗文要读得更细，也要学会把诗句和文化背景连起来体会。",
            learnGoals: ["会理解古诗文重点句意", "会积累文化内容", "会体会作者情感"],
            knowledgeTags: ["古诗积累", "文言句意", "传统文化", "诗句理解"]
          },
          {
            id: "g5-lower-chinese-write",
            title: "写人写景和条理表达",
            summary: "写作时既要写出人物特点，也要把景和事安排得清清楚楚，让文章更有层次。",
            learnGoals: ["会写人物特点", "会组织写景顺序", "会让文章表达更有条理"],
            knowledgeTags: ["写人表达", "写景表达", "表达顺序", "习作方法"]
          }
        ]
      },
      {
        id: "henan-grade-5-lower-math",
        subject: "数学",
        summary: "下册重点进入分数、长方体正方体、统计可能性和综合应用。",
        modules: [
          {
            id: "g5-lower-math-fraction",
            title: "分数意义和大小比较",
            summary: "分数开始不只是看图，还要看单位“1”、会比较大小规律，也会认识更多分数形式。",
            learnGoals: ["会理解分数意义", "会比较分数大小", "会认识常见分数形式"],
            knowledgeTags: ["分数意义", "分数大小比较", "真分数和假分数", "分数单位"]
          },
          {
            id: "g5-lower-math-fraction-calc",
            title: "通分约分和分数加减",
            summary: "分数运算开始更讲究方法，要会约分、通分，也能做同分母和异分母分数的加减。",
            learnGoals: ["会约分和通分", "会做分数加减法", "会理解分数运算关系"],
            knowledgeTags: ["约分", "通分", "分数加法", "分数减法"]
          },
          {
            id: "g5-lower-math-solid",
            title: "长方体正方体和体积初步",
            summary: "图形从平面走向立体，要会认长方体正方体，也会看表面积和体积这些新概念。",
            learnGoals: ["会认识立体图形特点", "会理解表面积和体积", "会联系生活空间想问题"],
            knowledgeTags: ["长方体认识", "正方体认识", "表面积", "体积初步"]
          },
          {
            id: "g5-lower-math-data",
            title: "统计图平均数和可能性",
            summary: "数字开始更会讲故事了，要学会看图、看平均情况，也会判断事情发生的可能大小。",
            learnGoals: ["会看简单统计图", "会理平均数意义", "会判断基本可能性"],
            knowledgeTags: ["折线统计图", "平均数", "可能性", "情景计算"]
          }
        ]
      },
      {
        id: "henan-grade-5-lower-english",
        subject: "英语",
        summary: "下册继续把节日旅行、位置路线、健康饮食和短文理解一步一步学熟。",
        modules: [
          {
            id: "g5-lower-english-scene",
            title: "节日旅行和天气场景",
            summary: "天气、节日和出行场景经常放在一起出现，要会在完整场景里理解句子。",
            learnGoals: ["会理解节日旅行场景", "会判断天气相关表达", "会做情景对话选择"],
            knowledgeTags: ["节日词汇", "旅行场景", "天气表达", "情景对话"]
          },
          {
            id: "g5-lower-english-place",
            title: "位置路线和公共场所",
            summary: "问路和介绍地点时，英语更讲究位置词和路线关系，要会从短语里看出方向。",
            learnGoals: ["会理解位置表达", "会判断路线场景", "会在公共场所场景里选句子"],
            knowledgeTags: ["位置表达", "公共场所", "短语理解", "句子选择"]
          },
          {
            id: "g5-lower-english-health",
            title: "健康饮食和建议表达",
            summary: "英语场景开始更贴近日常生活，要会看懂饮食、健康和建议这些常见表达。",
            learnGoals: ["会认食物健康词汇", "会理解建议表达", "会判断日常句意"],
            knowledgeTags: ["食物词汇", "健康表达", "句型理解", "句意理解"]
          },
          {
            id: "g5-lower-english-read",
            title: "短文理解和写话起步",
            summary: "句子和短文开始更有整体性，要会从关键词里抓大意，也开始敢写一点简单表达。",
            learnGoals: ["会抓短文关键词", "会判断短文主要意思", "会做简单句型替换和表达"],
            knowledgeTags: ["短文理解", "阅读理解", "句型替换", "写话表达"]
          }
        ]
      }
    ]
  })
]);
