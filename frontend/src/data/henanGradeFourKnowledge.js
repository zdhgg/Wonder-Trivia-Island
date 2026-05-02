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

export const HENAN_GRADE_FOUR_SYSTEMATIC_SECTIONS = Object.freeze([
  createSection({
    id: "henan-grade-4-upper",
    grade: "四年级",
    semester: "上册",
    title: "四年级上册",
    summary: "上册开始把大数、乘除笔算、句段阅读和日常英语表达连成更完整的学习地图。",
    basisNote: "按河南当前小学课程主线整理，四年级继续以语文、数学、英语三条主线并行推进。",
    subjects: [
      {
        id: "henan-grade-4-upper-chinese",
        subject: "语文",
        summary: "上册先把词义辨析、句段理解、古诗积累和观察表达慢慢连起来。",
        modules: [
          {
            id: "g4-upper-chinese-words",
            title: "词义辨析和词语运用",
            summary: "同样的词看着像，意思和用法却不一定一样，要学会联系语境慢慢分清。",
            learnGoals: ["会分辨近义词差别", "会联系语境理解词义", "会把词语用进合适句子"],
            knowledgeTags: ["词义辨析", "近义词辨析", "词语搭配", "词语运用"]
          },
          {
            id: "g4-upper-chinese-sentence",
            title: "句子结构和修辞初步",
            summary: "句子不只要通顺，还要会看主干、辨病句，也开始认识比喻和拟人这些表达办法。",
            learnGoals: ["会看句子主要意思", "会发现常见病句问题", "认识比喻句和拟人句"],
            knowledgeTags: ["句子结构", "病句辨析", "比喻句", "拟人句"]
          },
          {
            id: "g4-upper-chinese-reading",
            title: "段落概括和阅读提取",
            summary: "读短文时要会找中心句、提关键信息，也开始学会用几句话概括段意。",
            learnGoals: ["会提取关键信息", "会找中心句", "会概括自然段意思"],
            knowledgeTags: ["段落概括", "阅读理解", "信息提取", "中心句"]
          },
          {
            id: "g4-upper-chinese-write",
            title: "观察表达和习作起步",
            summary: "写作时先学会认真观察，再把事情按顺序说清楚，让句子慢慢有画面。",
            learnGoals: ["会按顺序观察", "会把看到的细节写出来", "会写一段完整表达"],
            knowledgeTags: ["观察表达", "写作顺序", "习作起步", "细节描写"]
          }
        ]
      },
      {
        id: "henan-grade-4-upper-math",
        subject: "数学",
        summary: "上册重点进入大数认识、三位数乘法、两位数除法和角图形观察。",
        modules: [
          {
            id: "g4-upper-math-number",
            title: "大数认识和数位改写",
            summary: "数字越变越大，越要看清数位顺序、会读写数，还要能按要求改写和估一估。",
            learnGoals: ["会读写大数", "会看数位顺序", "会改写和估算大数"],
            knowledgeTags: ["大数认识", "数位顺序表", "数的改写", "近似数"]
          },
          {
            id: "g4-upper-math-multiply",
            title: "三位数乘两位数",
            summary: "乘法不只会口算，还要学会按位笔算、估算结果，并看懂积为什么会这样变化。",
            learnGoals: ["会三位数乘两位数笔算", "会先估再算", "会观察积的变化规律"],
            knowledgeTags: ["三位数乘两位数", "积的变化规律", "估算", "情景计算"]
          },
          {
            id: "g4-upper-math-divide",
            title: "除数是两位数的除法",
            summary: "除法开始变长了，要学会试商、调商，也要会把除法放回生活题里理解。",
            learnGoals: ["会试商和调商", "会做除数是两位数的除法", "会理解除法情景"],
            knowledgeTags: ["除数是两位数的除法", "试商", "商的变化规律", "情景计算"]
          },
          {
            id: "g4-upper-math-geometry",
            title: "角和平行垂直观察",
            summary: "图形学习开始更认真了，要会认角、分角，也要看清平行和垂直这些关系。",
            learnGoals: ["会认识和分类角", "会辨认平行与垂直", "会从图中观察关系"],
            knowledgeTags: ["角的认识", "角的分类", "平行与垂直", "观察物体"]
          }
        ]
      },
      {
        id: "henan-grade-4-upper-english",
        subject: "英语",
        summary: "上册继续把课堂交流、学校生活、时间日期和场景句意慢慢学稳。",
        modules: [
          {
            id: "g4-upper-english-classroom",
            title: "课堂交流和日常问答",
            summary: "会听懂常见课堂用语，也会在简单场景里做回应，英语对话会更像真的在发生。",
            learnGoals: ["会判断常见课堂表达", "会做简单日常问答", "敢在场景里选句子"],
            knowledgeTags: ["课堂用语", "情景对话", "句子选择", "日常问答"]
          },
          {
            id: "g4-upper-english-words",
            title: "学校生活和常见词汇",
            summary: "学校里的地点、人物和物品词汇会越来越多，要学会把词和场景连起来记。",
            learnGoals: ["会认学校生活常见词汇", "会做词义判断", "会把词放回场景理解"],
            knowledgeTags: ["常识词汇", "词义判断", "学校生活", "词汇认读"]
          },
          {
            id: "g4-upper-english-time",
            title: "时间日期和日程表达",
            summary: "数字不只会认，还要会说时间、日期和简单安排，让英语慢慢和生活连起来。",
            learnGoals: ["会认时间日期表达", "会理解简单日程句子", "会做相关场景选择"],
            knowledgeTags: ["时间词汇", "数字单词", "句意理解", "日程表达"]
          },
          {
            id: "g4-upper-english-read",
            title: "句子理解和场景选择",
            summary: "句子开始更完整了，要学会从关键短语里看出意思，再把它放回对的场景里。",
            learnGoals: ["会抓英语句子关键词", "会做场景匹配", "会判断短句大意"],
            knowledgeTags: ["句子理解", "句意理解", "短语理解", "情景对话"]
          }
        ]
      }
    ]
  }),
  createSection({
    id: "henan-grade-4-lower",
    grade: "四年级",
    semester: "下册",
    title: "四年级下册",
    summary: "下册把小数、运算律、三角形、写景写事和英语场景理解继续往前推进。",
    basisNote: "按河南当前小学课程主线整理，四年级下册继续在语文、数学、英语上稳步加深。",
    subjects: [
      {
        id: "henan-grade-4-lower-chinese",
        subject: "语文",
        summary: "下册更重视词语品味、阅读关系、古诗文化和写景写事表达。",
        modules: [
          {
            id: "g4-lower-chinese-words",
            title: "词语色彩和准确表达",
            summary: "一个词换一换，语气就会变很多，要学会挑更贴切、更有味道的表达。",
            learnGoals: ["会体会词语感情色彩", "会比较词义差别", "会准确表达意思"],
            knowledgeTags: ["词语感情色彩", "词义理解", "词语运用", "成语理解"]
          },
          {
            id: "g4-lower-chinese-reading",
            title: "顺序因果和阅读概括",
            summary: "读文章不只要知道写了什么，还要看清先后顺序、因果关系和段意之间怎么连。",
            learnGoals: ["会辨顺序和因果关系", "会概括段落内容", "会说明文章主要意思"],
            knowledgeTags: ["顺序关系", "因果关系", "阅读理解", "段落概括"]
          },
          {
            id: "g4-lower-chinese-culture",
            title: "古诗文和文化积累",
            summary: "古诗文会更耐读，要学会借着注释和画面理解句子，也认识更多传统文化内容。",
            learnGoals: ["会借助提示理解诗句", "会积累常见文化常识", "会联系内容体会情感"],
            knowledgeTags: ["古诗积累", "文言启蒙", "传统文化", "诗句理解"]
          },
          {
            id: "g4-lower-chinese-write",
            title: "写景写事和细节表达",
            summary: "写景要有顺序，写事要讲清经过，还要学会用细节让内容更生动。",
            learnGoals: ["会安排表达顺序", "会把事情经过说完整", "会加入细节描写"],
            knowledgeTags: ["写景表达", "写事顺序", "细节描写", "习作方法"]
          }
        ]
      },
      {
        id: "henan-grade-4-lower-math",
        subject: "数学",
        summary: "下册重点进入小数、运算律、三角形和统计平均数这些更完整的数学主题。",
        modules: [
          {
            id: "g4-lower-math-decimal",
            title: "小数初步和单位换算",
            summary: "整数旁边开始多了小数点，要会认识小数，也要会在长度和质量里做简单换算。",
            learnGoals: ["会认识简单小数", "会联系单位理解小数", "会做常见单位换算"],
            knowledgeTags: ["小数初步", "单位换算", "长度单位", "质量单位"]
          },
          {
            id: "g4-lower-math-operations",
            title: "运算律和简便计算",
            summary: "不是每道题都要一步一步硬算，有些题可以先观察，再用运算律把它算得更轻松。",
            learnGoals: ["会认识常见运算律", "会做简便计算", "会看混合运算顺序"],
            knowledgeTags: ["加法运算律", "乘法运算律", "简便计算", "混合运算"]
          },
          {
            id: "g4-lower-math-triangle",
            title: "三角形和图形分类",
            summary: "三角形开始有更多名字和特点，要会分辨、会比较，也要会联系其他图形一起看。",
            learnGoals: ["会按特点分类三角形", "会理解三角形基本特性", "会联系其他图形观察"],
            knowledgeTags: ["三角形分类", "三角形特性", "平行四边形", "图形认识"]
          },
          {
            id: "g4-lower-math-statistics",
            title: "平均数和统计图",
            summary: "数字开始会讲故事，要学会整理数据、看统计图，也会用平均数帮忙想问题。",
            learnGoals: ["会理解平均数意思", "会看简单统计图", "会整理和比较数据"],
            knowledgeTags: ["平均数", "条形统计图", "数据整理", "情景计算"]
          }
        ]
      },
      {
        id: "henan-grade-4-lower-english",
        subject: "英语",
        summary: "下册继续把人物物品、天气活动、位置路线和小短文理解慢慢学熟。",
        modules: [
          {
            id: "g4-lower-english-family",
            title: "人物物品和关系表达",
            summary: "人物和物品词汇会继续变多，要会在句子里判断它们是谁、指什么、在说什么。",
            learnGoals: ["会认常见人物物品词汇", "会做词义判断", "会看句子中的指代关系"],
            knowledgeTags: ["家庭成员", "物品词汇", "句意理解", "词义判断"]
          },
          {
            id: "g4-lower-english-weather",
            title: "天气活动和日常安排",
            summary: "天气和活动经常一起出现，要学会在日常场景里判断该说哪句话、做什么事。",
            learnGoals: ["会认天气和活动表达", "会判断日常安排", "会做相关情景选择"],
            knowledgeTags: ["天气词汇", "日常活动", "情景对话", "句子选择"]
          },
          {
            id: "g4-lower-english-place",
            title: "位置路线和场景理解",
            summary: "问路、说位置和找地方时，英语不只看单词，更要看整句在什么场景里用。",
            learnGoals: ["会理解位置表达", "会判断路线场景", "会做句子和场景匹配"],
            knowledgeTags: ["位置表达", "短语理解", "情景对话", "句子理解"]
          },
          {
            id: "g4-lower-english-read",
            title: "句型替换和短文理解",
            summary: "句子开始会有更多变化，要学会从小短文里找关键词，也能看懂句型变化后的意思。",
            learnGoals: ["会看简单句型替换", "会提取短文关键词", "会判断短文大意"],
            knowledgeTags: ["句型替换", "句意理解", "阅读理解", "短文理解"]
          }
        ]
      }
    ]
  })
]);
