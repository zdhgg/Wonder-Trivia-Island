export const HENAN_GRADE_ONE_SYSTEMATIC_SECTIONS = Object.freeze([
  Object.freeze({
    id: "henan-grade-1-upper",
    grade: "一年级",
    semester: "上册",
    title: "一年级上册",
    summary: "先把入学适应、拼音启蒙、数感起步这些根基打稳。",
    basisNote: "按河南当前国家课程主线整理，一年级先以语文、数学为主。",
    subjects: Object.freeze([
      Object.freeze({
        id: "henan-grade-1-upper-chinese",
        subject: "语文",
        summary: "上册先把会听、会说、会认、会拼、会读慢慢搭起来。",
        modules: Object.freeze([
          Object.freeze({
            id: "g1-upper-chinese-habits",
            title: "入学准备和好习惯",
            summary: "先学会问好、坐端正、爱护文具，语文课才会越学越顺。",
            learnGoals: Object.freeze(["会礼貌表达", "知道课堂规矩", "记住写字三个一"]),
            knowledgeTags: Object.freeze(["入学教育", "口语交际", "课堂习惯", "书写规范", "学习习惯"])
          }),
          Object.freeze({
            id: "g1-upper-chinese-literacy",
            title: "笔画和识字起步",
            summary: "从笔画、笔顺和象形识字开始，慢慢认识汉字的样子。",
            learnGoals: Object.freeze(["认常见笔画", "按顺序写字", "会用简单识字办法"]),
            knowledgeTags: Object.freeze(["笔画名称", "笔顺规则", "笔画数", "会意识字", "象形识字", "识字应用"])
          }),
          Object.freeze({
            id: "g1-upper-chinese-pinyin",
            title: "拼音启蒙",
            summary: "把声母、韵母、声调和拼读练熟，后面认字读书会轻松很多。",
            learnGoals: Object.freeze(["认声母韵母", "会拼读音节", "会分辨声调"]),
            knowledgeTags: Object.freeze([
              "拼音基础",
              "声母认读",
              "韵母认读",
              "整体认读音节",
              "拼读练习",
              "三拼音节",
              "拼音规则",
              "字音辨认",
              "声调认读",
              "拼音作用"
            ])
          }),
          Object.freeze({
            id: "g1-upper-chinese-reading",
            title: "课文和语言积累",
            summary: "一边读课文，一边认识标点、量词和常见词语搭配。",
            learnGoals: Object.freeze(["能读懂短课文", "会用常见标点", "积累简单词句"]),
            knowledgeTags: Object.freeze(["课文理解", "标点符号", "量词运用", "词语搭配", "词语形式"])
          })
        ])
      }),
      Object.freeze({
        id: "henan-grade-1-upper-math",
        subject: "数学",
        summary: "上册先把数一数、比一比、加减法和图形位置摸熟。",
        modules: Object.freeze([
          Object.freeze({
            id: "g1-upper-math-number-sense",
            title: "数一数和比一比",
            summary: "先认识数、会比较多少，再分清前后左右和第几个。",
            learnGoals: Object.freeze(["会按顺序数数", "会比较大小多少", "知道几个和第几个"]),
            knowledgeTags: Object.freeze(["数一数", "比多少", "大小比较", "数的顺序", "几个和第几个"])
          }),
          Object.freeze({
            id: "g1-upper-math-place-value",
            title: "10到20的数",
            summary: "把十和一的关系想明白，后面算数才不会乱。",
            learnGoals: Object.freeze(["会看数的组成", "认识十位个位", "会把数拆开看"]),
            knowledgeTags: Object.freeze(["数的组成", "数位认识", "数的分解"])
          }),
          Object.freeze({
            id: "g1-upper-math-add-subtract",
            title: "加减法第一关",
            summary: "先把10以内算稳，再过渡到20以内不进位、不退位。",
            learnGoals: Object.freeze(["会算10以内加减", "会算20以内简单加减", "能看懂小题目的意思"]),
            knowledgeTags: Object.freeze(["10以内加法", "10以内减法", "20以内不进位加法", "20以内不退位减法"])
          }),
          Object.freeze({
            id: "g1-upper-math-shape-time",
            title: "位置图形和小规律",
            summary: "一边认图形，一边看钟表、找规律，把数学放进生活里。",
            learnGoals: Object.freeze(["会说位置关系", "认识常见立体图形", "会看整时和半时"]),
            knowledgeTags: Object.freeze(["位置", "立体图形", "认识钟表", "找规律", "解决问题"])
          })
        ])
      })
    ])
  }),
  Object.freeze({
    id: "henan-grade-1-lower",
    grade: "一年级",
    semester: "下册",
    title: "一年级下册",
    summary: "下册开始把识字表达、退位减法、百以内数和生活应用连起来。",
    basisNote: "按河南当前国家课程主线整理，一年级先以语文、数学为主。",
    subjects: Object.freeze([
      Object.freeze({
        id: "henan-grade-1-lower-chinese",
        subject: "语文",
        summary: "下册更重视识字归类、字音查字、词句表达和简单阅读理解。",
        modules: Object.freeze([
          Object.freeze({
            id: "g1-lower-chinese-phonetics",
            title: "字音和查字继续学",
            summary: "把多音字、音节和音序查字再练熟，认字会更快。",
            learnGoals: Object.freeze(["会分辨常见多音字", "会看音节", "会用音序查字"]),
            knowledgeTags: Object.freeze(["多音字辨音", "音序查字", "音节认读", "整体认读音节", "音序排序", "字音辨认"])
          }),
          Object.freeze({
            id: "g1-lower-chinese-literacy",
            title: "偏旁识字和结构",
            summary: "学会从偏旁、部首和结构去认字，汉字会越来越有规律。",
            learnGoals: Object.freeze(["会看偏旁意思", "认识常见结构", "会按部首归类"]),
            knowledgeTags: Object.freeze([
              "偏旁识字",
              "汉字结构",
              "笔顺规则",
              "笔画数",
              "部首辨认",
              "归类识字",
              "姓氏识字",
              "识字应用",
              "字谜识字"
            ])
          }),
          Object.freeze({
            id: "g1-lower-chinese-reading",
            title: "课文阅读和传统文化",
            summary: "从短课文、古诗和传统节日里，学会读懂意思、记住画面。",
            learnGoals: Object.freeze(["会抓课文关键信息", "会背简单古诗", "知道常见传统文化内容"]),
            knowledgeTags: Object.freeze(["课文理解", "传统文化", "古诗积累"])
          }),
          Object.freeze({
            id: "g1-lower-chinese-expression",
            title: "词句表达小火车",
            summary: "让词语、句子和标点一个一个连起来，慢慢学会把话说顺。",
            learnGoals: Object.freeze(["会选合适量词动词", "会找近义词反义词", "能把句子排通顺"]),
            knowledgeTags: Object.freeze([
              "量词运用",
              "动词搭配",
              "词语形式",
              "词语搭配",
              "近义词",
              "反义词",
              "连词成句",
              "比喻句",
              "标点符号"
            ])
          })
        ])
      }),
      Object.freeze({
        id: "henan-grade-1-lower-math",
        subject: "数学",
        summary: "下册重点走向退位减法、百以内数、人民币和生活中的数学问题。",
        modules: Object.freeze([
          Object.freeze({
            id: "g1-lower-math-subtract",
            title: "退位减法先过关",
            summary: "先把20以内退位减法练熟，再学会用想加算减的小办法。",
            learnGoals: Object.freeze(["会算退位减法", "会用想加算减", "不怕减法绕弯"]),
            knowledgeTags: Object.freeze(["20以内退位减法", "想加算减"])
          }),
          Object.freeze({
            id: "g1-lower-math-number-100",
            title: "百以内的数",
            summary: "继续认识几十几，弄清十位个位和数的顺序。",
            learnGoals: Object.freeze(["认识100以内数", "会看数位", "会比较组数大小"]),
            knowledgeTags: Object.freeze(["100以内数", "数位认识", "数的顺序", "数的分解", "组数比较"])
          }),
          Object.freeze({
            id: "g1-lower-math-life",
            title: "图形分类和人民币",
            summary: "把图形、分类整理和人民币连到生活场景里去用。",
            learnGoals: Object.freeze(["认识平面图形", "会做简单分类", "会换算元角分"]),
            knowledgeTags: Object.freeze(["平面图形", "分类整理", "人民币"])
          }),
          Object.freeze({
            id: "g1-lower-math-calc",
            title: "百以内计算和应用",
            summary: "慢慢把口算、两位数加减和解决问题串成一整条路。",
            learnGoals: Object.freeze(["会做百以内口算", "会算两位数加减", "会读题做简单应用题"]),
            knowledgeTags: Object.freeze(["100以内口算", "两位数加减两位数", "找规律", "解决问题"])
          })
        ])
      })
    ])
  })
]);
