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

export const HENAN_GRADE_SIX_SYSTEMATIC_SECTIONS = Object.freeze([
  createSection({
    id: "henan-grade-6-upper",
    grade: "六年级",
    semester: "上册",
    title: "六年级上册",
    summary: "上册开始把分数、百分数、圆和更完整的阅读表达一起推向毕业前的主线整理。",
    basisNote: "按河南当前小学课程主线整理，六年级继续在语文、数学、英语三条线上向综合理解和衔接能力推进。",
    subjects: [
      {
        id: "henan-grade-6-upper-chinese",
        subject: "语文",
        summary: "上册更重视词句品味、阅读概括、古诗文理解和观点表达。",
        modules: [
          {
            id: "g6-upper-chinese-words",
            title: "词句品味和表达效果",
            summary: "六年级语文开始更讲究词句的力量，要会体会词语、句式和修辞带来的表达效果。",
            learnGoals: ["会体会词句表达效果", "会联系语境理解句子", "会比较不同表达方式"],
            knowledgeTags: ["词句品味", "修辞作用", "句子理解", "表达效果"]
          },
          {
            id: "g6-upper-chinese-reading",
            title: "阅读概括和观点提取",
            summary: "读文章时不仅要看内容，还要会概括主要意思，也能看出作者想表达的观点和态度。",
            learnGoals: ["会概括文章内容", "会提取作者观点", "会分析段落关系"],
            knowledgeTags: ["阅读概括", "中心思想", "段落关系", "观点提取"]
          },
          {
            id: "g6-upper-chinese-culture",
            title: "古诗文理解和文化体会",
            summary: "古诗文阅读开始更强调借助背景、注释和情感线索去理解句意和文化味道。",
            learnGoals: ["会借注释理解诗文", "会体会诗文情感", "会联系文化背景思考内容"],
            knowledgeTags: ["古诗文理解", "文言句意", "传统文化", "情感体会"]
          },
          {
            id: "g6-upper-chinese-write",
            title: "习作谋篇和观点表达",
            summary: "写作不只把事情写完整，还要学会安排结构、突出重点，也敢清楚表达自己的想法。",
            learnGoals: ["会安排习作结构", "会突出重点表达", "会写出清楚观点"],
            knowledgeTags: ["习作结构", "观点表达", "重点描写", "表达方法"]
          }
        ]
      },
      {
        id: "henan-grade-6-upper-math",
        subject: "数学",
        summary: "上册重点进入分数乘法、圆、百分数和比这些更综合的数学主题。",
        modules: [
          {
            id: "g6-upper-math-fraction",
            title: "分数乘法和分数应用",
            summary: "分数开始真正参与计算和应用，要会理解分数乘法，也能看懂相关生活题的数量关系。",
            learnGoals: ["会做分数乘法", "会理解分数乘法意义", "会解决相关应用题"],
            knowledgeTags: ["分数乘法", "分数应用", "倒数", "情景计算"]
          },
          {
            id: "g6-upper-math-circle",
            title: "圆和周长面积",
            summary: "圆的学习开始更完整了，要会认识圆的特征，也能理解周长和面积是怎样算出来的。",
            learnGoals: ["会认识圆的基本特征", "会算圆的周长", "会算圆的面积"],
            knowledgeTags: ["圆的认识", "圆的周长", "圆的面积", "扇形初步"]
          },
          {
            id: "g6-upper-math-percent",
            title: "百分数和实际应用",
            summary: "百分数是生活里很常见的表达，要会看懂“每百份里有多少”，也会和分数小数互相联系。",
            learnGoals: ["会理解百分数意义", "会分数小数百分数互化", "会解决百分数应用题"],
            knowledgeTags: ["百分数意义", "百分数应用", "百分数与分数小数互化", "情景计算"]
          },
          {
            id: "g6-upper-math-ratio",
            title: "比和按比例分配",
            summary: "数量关系开始更像“谁和谁比”，要会理解比，也能在分配问题里按关系去想。",
            learnGoals: ["会理解比的意义", "会认识比值", "会做按比例分配"],
            knowledgeTags: ["比的意义", "比值", "按比例分配", "数量关系"]
          }
        ]
      },
      {
        id: "henan-grade-6-upper-english",
        subject: "英语",
        summary: "上册继续把校园生活、旅行计划、人物关系和短文理解稳稳接上。",
        modules: [
          {
            id: "g6-upper-english-dialogue",
            title: "校园交流和日常对话",
            summary: "对话开始更完整，要会在校园和日常场景里判断人物关系、意图和最合适的表达。",
            learnGoals: ["会判断日常交流场景", "会理解完整问答", "会做情景对话选择"],
            knowledgeTags: ["情景对话", "日常交流", "句子选择", "校园生活"]
          },
          {
            id: "g6-upper-english-plan",
            title: "时间计划和旅行安排",
            summary: "英语里的计划表达开始更多，要会看懂时间安排、活动顺序和简单旅行场景。",
            learnGoals: ["会理解计划安排", "会判断活动顺序", "会在旅行场景里理解句子"],
            knowledgeTags: ["时间表达", "计划安排", "旅行场景", "句意理解"]
          },
          {
            id: "g6-upper-english-words",
            title: "人物关系和常见词汇",
            summary: "人物、职业、地点和物品会越来越多，要学会从词和句子的关系里理解它们的意思。",
            learnGoals: ["会认常见主题词汇", "会做词义判断", "会从上下文理解单词"],
            knowledgeTags: ["人物关系", "职业词汇", "常识词汇", "词义判断"]
          },
          {
            id: "g6-upper-english-read",
            title: "句型理解和短文阅读",
            summary: "句型开始变化得更多，要会从关键词和句型线索里看懂短句和小短文。",
            learnGoals: ["会抓句型关键词", "会理解简单短文", "会判断句子和段落大意"],
            knowledgeTags: ["句型理解", "短文理解", "阅读理解", "句意判断"]
          }
        ]
      }
    ]
  }),
  createSection({
    id: "henan-grade-6-lower",
    grade: "六年级",
    semester: "下册",
    title: "六年级下册",
    summary: "下册把比例、立体图形、总复习和更完整的英语阅读表达继续推进到毕业衔接阶段。",
    basisNote: "按河南当前小学课程主线整理，六年级下册更重视综合应用、复习整理和升学前的能力衔接。",
    subjects: [
      {
        id: "henan-grade-6-lower-chinese",
        subject: "语文",
        summary: "下册更重视综合阅读、表达方法、古诗文整理和总复习中的语文能力梳理。",
        modules: [
          {
            id: "g6-lower-chinese-reading",
            title: "综合阅读和信息整合",
            summary: "读文章时要会把多处信息连起来想，也会从材料里筛出最重要的内容。",
            learnGoals: ["会整合多处信息", "会概括综合阅读内容", "会从材料里提炼重点"],
            knowledgeTags: ["综合阅读", "信息整合", "阅读概括", "主题理解"]
          },
          {
            id: "g6-lower-chinese-expression",
            title: "表达方法和语言赏析",
            summary: "语文到了毕业阶段，要开始更主动地看作者怎样写，也会模仿这些方法表达自己的意思。",
            learnGoals: ["会辨常见表达方法", "会体会语言作用", "会在表达里尝试运用"],
            knowledgeTags: ["表达方法", "语言赏析", "修辞作用", "词句品味"]
          },
          {
            id: "g6-lower-chinese-culture",
            title: "古诗文整理和文化复习",
            summary: "古诗文和传统文化内容要开始系统整理，读懂句意，也能联系人物和背景一起想。",
            learnGoals: ["会整理古诗文知识", "会理解文言重点句意", "会联系文化背景复习"],
            knowledgeTags: ["古诗文复习", "文言句意", "传统文化", "诗句理解"]
          },
          {
            id: "g6-lower-chinese-write",
            title: "毕业表达和习作复习",
            summary: "毕业前的表达更讲究条理和重点，要会在写事、写人、写景里灵活调动学过的方法。",
            learnGoals: ["会整理写作思路", "会灵活使用表达方法", "会完成更完整的习作表达"],
            knowledgeTags: ["习作复习", "写作思路", "表达条理", "写人写事写景"]
          }
        ]
      },
      {
        id: "henan-grade-6-lower-math",
        subject: "数学",
        summary: "下册重点进入分数除法、比例、圆柱圆锥和综合复习。",
        modules: [
          {
            id: "g6-lower-math-fraction",
            title: "分数除法和分数应用",
            summary: "分数从乘法继续走到除法，要会看懂除法关系，也能解决相关数量问题。",
            learnGoals: ["会做分数除法", "会理解分数除法意义", "会解决分数应用题"],
            knowledgeTags: ["分数除法", "分数应用", "倒数", "数量关系"]
          },
          {
            id: "g6-lower-math-ratio",
            title: "比例和正反比例初步",
            summary: "比到了后面会变成比例关系，要学会看数量怎样一起变化，也开始认识正反比例的影子。",
            learnGoals: ["会理解比例意义", "会判断简单正反比例关系", "会在表格图中看变化"],
            knowledgeTags: ["比例", "正比例初步", "反比例初步", "数量关系"]
          },
          {
            id: "g6-lower-math-solid",
            title: "圆柱圆锥和体积整理",
            summary: "立体图形学习会更完整，要会认识圆柱圆锥，也会把体积和表面积知识慢慢串起来。",
            learnGoals: ["会认识圆柱圆锥特征", "会理解体积和表面积关系", "会联系立体图形解决问题"],
            knowledgeTags: ["圆柱认识", "圆锥认识", "圆柱体积", "表面积"]
          },
          {
            id: "g6-lower-math-review",
            title: "统计整理和总复习应用",
            summary: "毕业前的数学开始更强调整理、比较和综合应用，要会把学过的知识连成网再去做题。",
            learnGoals: ["会整理统计信息", "会看综合数据图表", "会做综合应用题复习"],
            knowledgeTags: ["统计整理", "折线统计图", "综合应用", "总复习"]
          }
        ]
      },
      {
        id: "henan-grade-6-lower-english",
        subject: "英语",
        summary: "下册继续把健康建议、公共场所、旅行表达和小升初前的阅读理解稳稳接上。",
        modules: [
          {
            id: "g6-lower-english-scene",
            title: "旅行活动和场景表达",
            summary: "旅行、活动和天气这些场景常常放在一起，要学会从完整语境里判断最合适的表达。",
            learnGoals: ["会判断旅行活动场景", "会理解相关句意", "会做情景对话选择"],
            knowledgeTags: ["旅行场景", "活动安排", "情景对话", "句子选择"]
          },
          {
            id: "g6-lower-english-health",
            title: "健康建议和日常表达",
            summary: "健康、饮食和建议表达在英语里很常见，要会从句型里看出是在提醒、建议还是说明。",
            learnGoals: ["会理解建议表达", "会判断健康场景句意", "会做相关句型选择"],
            knowledgeTags: ["健康表达", "建议句型", "句型理解", "句意判断"]
          },
          {
            id: "g6-lower-english-place",
            title: "公共场所和路线理解",
            summary: "位置和路线题会更完整，要会在公共场所语境里判断方向、位置和人物行动。",
            learnGoals: ["会理解路线位置表达", "会在公共场所场景里判断句子", "会做简短对话理解"],
            knowledgeTags: ["位置表达", "路线理解", "公共场所", "短语理解"]
          },
          {
            id: "g6-lower-english-read",
            title: "毕业阅读和综合复习",
            summary: "英语阅读开始更偏综合复习，要会抓关键词、看段意，也能在熟悉句型里更快找到正确表达。",
            learnGoals: ["会提取阅读关键词", "会概括短文大意", "会进行句型和场景综合判断"],
            knowledgeTags: ["阅读理解", "短文理解", "句型复习", "综合判断"]
          }
        ]
      }
    ]
  })
]);
