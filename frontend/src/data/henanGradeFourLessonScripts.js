function buildMiniLessons(first, second, third) {
  return Object.freeze([Object.freeze(first), Object.freeze(second), Object.freeze(third)]);
}

function freezeStudyNarration(studyNarration) {
  if (!studyNarration || typeof studyNarration !== "object" || Array.isArray(studyNarration)) {
    return undefined;
  }

  return Object.freeze({ ...studyNarration });
}

function buildScript({
  teacherLead,
  conceptText,
  whyText,
  exampleLabel,
  examplePrompt,
  exampleExplanation,
  pitfalls,
  memoryText,
  memorySequence,
  miniLessons,
  studyNarration
}) {
  const frozenNarration = freezeStudyNarration(studyNarration);

  return Object.freeze({
    teacherLead,
    conceptText,
    whyText,
    exampleLabel,
    examplePrompt,
    exampleExplanation,
    pitfalls: Object.freeze(pitfalls),
    memoryText,
    memorySequence: Object.freeze(memorySequence),
    miniLessons,
    studyNarration: frozenNarration
  });
}

export const HENAN_GRADE_FOUR_LESSON_SCRIPTS = Object.freeze({
  "g4-upper-chinese-words": buildScript({
    teacherLead: "四年级的词语开始更讲究“差不多里有不同”，不能只看表面像不像。",
    conceptText: "近义词看着像朋友，可放进句子里时，语气、范围和感觉都可能不一样。",
    whyText: "词义分得细一点，阅读时更容易看懂，表达时也不容易词不达意。",
    exampleLabel: "比一比",
    examplePrompt: "看到两个近义词时，先把它们分别放回句子里，看看哪一个更贴切。",
    exampleExplanation: "会放回语境里比较，词语的小差别就会慢慢亮出来。",
    pitfalls: ["只看字面像不像，不看句子在说什么。", "近义词一律当成完全一样。", "会解释意思，却不会真的放进句子里用。"],
    memoryText: "用词小口令: 先看语境, 再比词义, 最后选最合适的。",
    memorySequence: ["看语境", "比词义", "选词语"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看语境", text: "先看句子到底在写谁、写什么事。", badge: "看语境" },
      { title: "第 2 步 比差别", text: "再比较两个词的语气、范围和感觉有没有细小不同。", badge: "比差别" },
      { title: "第 3 步 选合适", text: "最后挑一个放进去最顺、最准的词。", badge: "会选词" }
    )
  }),
  "g4-upper-chinese-sentence": buildScript({
    teacherLead: "四年级的句子训练，不只要通顺，还要会看它是怎么搭起来的。",
    conceptText: "句子里谁是主要意思、哪里搭配不当、哪句用了比喻或拟人，都要慢慢看出来。",
    whyText: "会看句子结构，写句子会更稳，做阅读题时也更容易抓住重点。",
    exampleLabel: "找一找",
    examplePrompt: "看到一句话时，先说主要在讲什么，再找有没有不通顺或特别生动的地方。",
    exampleExplanation: "先抓主干，再看细节，句子就不会只剩下一堆词。",
    pitfalls: ["只看热闹词语，不看整句主要意思。", "病句改对了，却说不出哪里有问题。", "看到比喻和拟人，只会背名字不会体会作用。"],
    memoryText: "句子小口令: 先抓主干, 再找问题, 最后看表达。",
    memorySequence: ["抓主干", "找问题", "看表达"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 抓主干", text: "先看看这句话最主要在说谁、做什么。", badge: "抓主干" },
      { title: "第 2 步 找问题", text: "再找有没有搭配不当、成分缺少或顺序不对。", badge: "找问题" },
      { title: "第 3 步 看修辞", text: "最后体会这句话有没有在用比喻或拟人让表达更生动。", badge: "看修辞" }
    )
  }),
  "g4-upper-chinese-reading": buildScript({
    teacherLead: "四年级阅读开始更像拼地图，要把句子里的信息一块一块拼起来。",
    conceptText: "找中心句、提关键词、概括段意，都是在帮我们把一段话真正读明白。",
    whyText: "会概括和提取信息，后面做说明文、写景文阅读都会更轻松。",
    exampleLabel: "抓重点",
    examplePrompt: "读完一段后，先圈出最关键的一句，再试着用自己的话说这段主要讲什么。",
    exampleExplanation: "先抓重点，再概括，段落就不会只剩零散细节。",
    pitfalls: ["读完只记住几个词，没抓住整段意思。", "把细节当重点，忽略中心句。", "会摘句子，不会换成自己的话概括。"],
    memoryText: "阅读小口令: 先找重点, 再提信息, 最后概括段意。",
    memorySequence: ["找重点", "提信息", "概括段意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找中心", text: "先看看哪一句最能代表这一段的主要意思。", badge: "找中心" },
      { title: "第 2 步 提信息", text: "再把人物、事情、特点这些关键词摘出来。", badge: "提信息" },
      { title: "第 3 步 说段意", text: "最后用自己的话完整说一遍这段在讲什么。", badge: "说段意" }
    )
  }),
  "g4-upper-chinese-write": buildScript({
    teacherLead: "四年级习作开始讲究观察和顺序，不是想到哪写到哪。",
    conceptText: "先把看到的内容按顺序理一理，再挑能让画面更清楚的小细节写进去。",
    whyText: "会观察、会安排表达顺序，写出来的话才更像真的发生在眼前。",
    exampleLabel: "先观察",
    examplePrompt: "写一件小事前，先想它是按时间顺序写，还是按看到的先后顺序写。",
    exampleExplanation: "顺序一理清，句子自然就不会东一块西一块。",
    pitfalls: ["只写大概，不写关键细节。", "观察顺序乱，读的人跟不上。", "一味堆词，却没有把画面写清楚。"],
    memoryText: "习作小口令: 先观察, 再排序, 最后写细节。",
    memorySequence: ["先观察", "再排序", "写细节"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先观察", text: "先看清楚人物、动作和周围环境。", badge: "会观察" },
      { title: "第 2 步 排顺序", text: "想想从哪里写起，后面又该接什么。", badge: "会排序" },
      { title: "第 3 步 写细节", text: "把最能让画面活起来的小地方写出来。", badge: "写细节" }
    )
  }),
  "g4-upper-math-number": buildScript({
    teacherLead: "四年级的大数像长长的数字队伍，要先看清每一位站在哪里。",
    conceptText: "会读会写还不够，还要会按数位改写，也能大概估一估这个数离谁更近。",
    whyText: "大数一旦看清，后面的乘除笔算和生活中的数量问题都会更顺。",
    exampleLabel: "拆一拆",
    examplePrompt: "看到一个大数时，先说它有几个万、几个千、几个百，再想能不能改写成更简单的形式。",
    exampleExplanation: "先把数位拆清楚，大数就不会挤成一团。",
    pitfalls: ["只会念数字，不看数位。", "改写时把位值关系弄乱。", "近似数一看就猜，不先比较。"],
    memoryText: "大数小口令: 先看数位, 再做改写, 最后估大小。",
    memorySequence: ["看数位", "做改写", "估大小"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看数位", text: "先把万位、千位、百位这些位置认清。", badge: "看数位" },
      { title: "第 2 步 会改写", text: "再按要求把大数改写成更简洁的形式。", badge: "会改写" },
      { title: "第 3 步 估一估", text: "最后看看这个数更接近哪个整千、整万。", badge: "会估算" }
    )
  }),
  "g4-upper-math-multiply": buildScript({
    teacherLead: "三位数乘两位数看起来长，其实还是按顺序一位一位想。",
    conceptText: "先估一估结果大概多大，再按位笔算，算完还要检查积是不是合理。",
    whyText: "会估算、会笔算，做应用题时就不容易因为数字变长而慌掉。",
    exampleLabel: "先估算",
    examplePrompt: "做乘法前先把两个数看成接近的整十、整百，猜猜结果大概会落在哪儿。",
    exampleExplanation: "先估后算，结果一偏很多就能马上发现。",
    pitfalls: ["直接下笔，不先判断结果大概范围。", "笔算时对位不齐。", "算完不回头检查结果合不合理。"],
    memoryText: "乘法小口令: 先估算, 再对位, 最后检查。",
    memorySequence: ["先估算", "再对位", "最后检查"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先估算", text: "先想结果大概是几千、几万。", badge: "先估算" },
      { title: "第 2 步 排对位", text: "笔算时一位一位对齐，不让数字乱站队。", badge: "排对位" },
      { title: "第 3 步 看结果", text: "算完再看看结果和估算差得多不多。", badge: "会检查" }
    )
  }),
  "g4-upper-math-divide": buildScript({
    teacherLead: "除数变成两位数以后，更要学会慢慢试、稳稳调。",
    conceptText: "试商不是猜，而是先比大小、再试一位，发现不合适就及时调一调。",
    whyText: "试商稳了，长除法就会少很多回头路，应用题也更敢做。",
    exampleLabel: "试一试",
    examplePrompt: "先看看前几位够不够除，再想商大概会是几，不合适时怎么调。",
    exampleExplanation: "试商像搭台阶，先迈小步，后面就会顺很多。",
    pitfalls: ["一上来就写商，不先看够不够除。", "试错了还不肯调商。", "余数和除数大小关系常常忘记检查。"],
    memoryText: "除法小口令: 先看够不够, 再试商, 最后调一调。",
    memorySequence: ["看够不够", "再试商", "调一调"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看够不够", text: "先判断前面几位能不能拿来除。", badge: "会判断" },
      { title: "第 2 步 先试商", text: "再试着写一个合适的商。", badge: "会试商" },
      { title: "第 3 步 调一调", text: "如果偏大或偏小，就及时改正。", badge: "会调商" }
    )
  }),
  "g4-upper-math-geometry": buildScript({
    teacherLead: "图形到了四年级，要开始看关系，不只是认名字。",
    conceptText: "角有大小和平分方式，直线之间也会出现平行和垂直这些特别重要的关系。",
    whyText: "看清图形关系，后面的三角形、面积和作图都会更容易跟上。",
    exampleLabel: "看关系",
    examplePrompt: "看到图时，先找角，再看看线和线之间是在并排走，还是正正地相交。",
    exampleExplanation: "先看关系，图形就不会只是几条线拼在一起。",
    pitfalls: ["只看图形样子，不比较角和线的关系。", "平行和垂直总靠感觉猜。", "看图时容易漏掉隐含的角。"],
    memoryText: "图形小口令: 先看角, 再看线, 最后说关系。",
    memorySequence: ["看角", "看线", "说关系"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找角", text: "先把图里的角找出来，看看谁更大、谁更小。", badge: "找角" },
      { title: "第 2 步 看线", text: "再观察两条线是平着走还是直直相交。", badge: "看线" },
      { title: "第 3 步 说关系", text: "最后把图形里的关系用数学词说清楚。", badge: "说关系" }
    )
  }),
  "g4-upper-english-classroom": buildScript({
    teacherLead: "四年级英语里，先会听懂场景，再选句子，嘴巴就会更敢开口。",
    conceptText: "课堂用语和日常问答看起来短，可它们都和具体场景紧紧连在一起。",
    whyText: "会判断什么时候该说哪一句，英语就不只是在背单词。",
    exampleLabel: "看场景",
    examplePrompt: "先看看是在上课、打招呼还是做日常问答，再选最合适的英语句子。",
    exampleExplanation: "场景看对了，句子通常就会选对一大半。",
    pitfalls: ["只记句子，不看场景。", "看见熟词就急着选。", "知道中文意思，却不知道什么时候用。"],
    memoryText: "英语小口令: 先看场景, 再选句子, 最后开口读。",
    memorySequence: ["看场景", "选句子", "开口读"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看场景", text: "先看人物在做什么、在哪里说话。", badge: "看场景" },
      { title: "第 2 步 选句子", text: "再挑最适合这个场景的一句英语。", badge: "选句子" },
      { title: "第 3 步 跟着说", text: "把句子读出来，英语会越来越顺。", badge: "敢开口" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，看人物在做什么。是在上课、问好，还是回答问题。",
      "step-2": "第二步，选最合适的一句英语。不要只看熟词，要看整个场景。",
      "step-3": "第三步，跟着读出来。场景对了，句子也就更容易记住。",
      example: "跟我试试。先认场景，再挑一句最适合的课堂英语。",
      memory: "记住课堂英语小口令。先看场景，再选句子，最后开口读。"
    })
  }),
  "g4-upper-english-words": buildScript({
    teacherLead: "词汇越多，越不能只背中文，要把词和画面、地方、人物一起记。",
    conceptText: "学校生活词汇常常成群出现，看到词时要能想起它常在哪个场景里用。",
    whyText: "词和场景绑在一起，句子理解才会更快、更稳。",
    exampleLabel: "连一连",
    examplePrompt: "看到词汇时，先想它是人物、地方还是物品，再和对应画面连起来。",
    exampleExplanation: "不让词单独站着，记忆就会更牢。",
    pitfalls: ["只背一串中文意思。", "词会认，但放进句子就不认识。", "类似词总是混在一起。"],
    memoryText: "单词小口令: 先分类型, 再连场景, 最后读词。",
    memorySequence: ["分类型", "连场景", "读词语"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 分类型", text: "先判断它是人物、地点还是物品。", badge: "分类型" },
      { title: "第 2 步 连场景", text: "再想这个词最常出现在哪种学校生活里。", badge: "连场景" },
      { title: "第 3 步 读出来", text: "把词和画面对应好，再开口读。", badge: "会认读" }
    )
  }),
  "g4-upper-english-time": buildScript({
    teacherLead: "时间、日期和安排一连起来，英语就更像每天真的会遇到的事情。",
    conceptText: "数字不只是会认，还要放进几点、几月几日、什么时候做什么这些表达里理解。",
    whyText: "时间和日程看懂了，做英语场景题时会少很多猜测。",
    exampleLabel: "排一排",
    examplePrompt: "先看句子是在说时刻、日期还是安排，再判断它到底在什么时候发生。",
    exampleExplanation: "时间线理顺了，句子意思就不会打架。",
    pitfalls: ["只会认数字，不会看它在句子里的作用。", "日期和时间表达混在一起。", "安排前后顺序常常看反。"],
    memoryText: "时间小口令: 先看数字, 再看时间词, 最后想安排。",
    memorySequence: ["看数字", "看时间词", "想安排"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看数字", text: "先认清句子里的数字和日期。", badge: "看数字" },
      { title: "第 2 步 看时间词", text: "再看看 morning、Monday 这些提示词。", badge: "看时间词" },
      { title: "第 3 步 想安排", text: "最后判断这件事会在什么时候发生。", badge: "想安排" }
    )
  }),
  "g4-upper-english-read": buildScript({
    teacherLead: "英语句子越长，越要学会抓住关键词，不要一上来就整句硬猜。",
    conceptText: "关键短语、动作词和场景词，常常是看懂一句英语的最快线索。",
    whyText: "会抓关键词，做句意题和场景题就会稳很多。",
    exampleLabel: "抓关键词",
    examplePrompt: "先在句子里找动作词和场景词，再猜整句大概想说什么。",
    exampleExplanation: "先抓住最亮的词，整句意思就会慢慢连起来。",
    pitfalls: ["看见陌生词就卡住，不继续往下看。", "只盯一个单词，忽略整句线索。", "选场景时不看前后信息。"],
    memoryText: "句意小口令: 先抓词, 再看场景, 最后想整句。",
    memorySequence: ["抓关键词", "看场景", "想整句"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 抓关键词", text: "先找句子里最关键的动作或地点词。", badge: "抓关键词" },
      { title: "第 2 步 看场景", text: "再看看这些词通常会出现在什么情境里。", badge: "看场景" },
      { title: "第 3 步 想句意", text: "最后把整句大概意思说出来。", badge: "想句意" }
    )
  }),
  "g4-lower-chinese-words": buildScript({
    teacherLead: "四年级下册的词语，要开始学会“味道”不同，表达也要更有分寸。",
    conceptText: "有的词带着夸赞，有的词带着提醒，同一个意思换个词，感觉就会变。",
    whyText: "会品词语色彩，写景写事时表达会更准确，也更有感受。",
    exampleLabel: "品一品",
    examplePrompt: "看到几个意思相近的词时，先想哪个更亲切、哪个更郑重、哪个更有力量。",
    exampleExplanation: "先品词味，再选词，句子的感觉会更对。",
    pitfalls: ["词会认，却不体会语气。", "成语只会背，不知道用在什么地方。", "一写句子就总用同样的词。"],
    memoryText: "品词小口令: 先想感觉, 再比意思, 最后再运用。",
    memorySequence: ["想感觉", "比意思", "再运用"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 想感觉", text: "先想这个词让人听起来是什么感觉。", badge: "想感觉" },
      { title: "第 2 步 比意思", text: "再比较它和相近词哪里不一样。", badge: "比意思" },
      { title: "第 3 步 会运用", text: "最后把更合适的词放回句子里。", badge: "会运用" }
    )
  }),
  "g4-lower-chinese-reading": buildScript({
    teacherLead: "读文章时，四年级要开始真正看清句子之间怎么前后接力。",
    conceptText: "顺序、因果、转折这些关系，会悄悄告诉我们文章是在怎么往前走。",
    whyText: "会看关系，文章结构就不再是一团，概括和理解都会更清楚。",
    exampleLabel: "理关系",
    examplePrompt: "读一段时，先看看事情是按先后写，还是在说原因和结果。",
    exampleExplanation: "关系一理清，段意就更容易说完整。",
    pitfalls: ["只找几个词，不看句子关系。", "原因和结果常常说反。", "会摘抄原句，不会归纳主要意思。"],
    memoryText: "阅读小口令: 先看关系, 再找重点, 最后说大意。",
    memorySequence: ["看关系", "找重点", "说大意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看关系", text: "先看看句子之间是在按顺序讲，还是在说因果。", badge: "看关系" },
      { title: "第 2 步 找重点", text: "再找最能说明这一段意思的关键句。", badge: "找重点" },
      { title: "第 3 步 说大意", text: "最后用自己的话讲这一段的主要内容。", badge: "说大意" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，看关系。先分清这段是在按顺序讲，还是在说原因和结果。",
      "step-2": "第二步，找重点句。最能说明意思的那一句，通常藏着段意。",
      "step-3": "第三步，用自己的话讲大意。不要只抄原句。",
      example: "跟我理一理。读完一段，先看关系，再找重点，最后说这段主要讲什么。",
      memory: "记住阅读小口令。先看关系，再找重点，最后说大意。"
    })
  }),
  "g4-lower-chinese-culture": buildScript({
    teacherLead: "古诗文到了四年级，已经不只是背，会借提示去想意思也很重要。",
    conceptText: "遇到古诗和简短古文时，要学会借注释、画面和上下文去慢慢理解。",
    whyText: "会借助提示理解诗句和文化内容，后面读古诗文就不会只剩死记。",
    exampleLabel: "借提示",
    examplePrompt: "读一句诗文时，先看注释，再联系画面猜猜它到底在说什么。",
    exampleExplanation: "提示不是摆设，它是在帮我们走进诗句里面。",
    pitfalls: ["一遇到古诗文就只想着背。", "有注释也不看，只凭感觉猜。", "会说字面意思，却说不出情感和文化味道。"],
    memoryText: "古诗文口令: 先看提示, 再想画面, 最后体会情感。",
    memorySequence: ["看提示", "想画面", "体会情感"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看提示", text: "先看看题目、注释和背景有没有给线索。", badge: "看提示" },
      { title: "第 2 步 想画面", text: "再边读边想眼前会出现什么景和事。", badge: "想画面" },
      { title: "第 3 步 说情感", text: "最后想想作者是在高兴、思念，还是赞叹。", badge: "说情感" }
    )
  }),
  "g4-lower-chinese-write": buildScript({
    teacherLead: "四年级写景写事，关键不在多写，而在写得有顺序、有细节。",
    conceptText: "写景时要让画面慢慢展开，写事时要把经过一环一环讲清楚。",
    whyText: "顺序清楚、细节具体，读的人才会觉得事情真的发生过、景真的看得见。",
    exampleLabel: "排一排",
    examplePrompt: "写一件事前，先把开始、经过、结果排好，再挑一个最值得细写的地方。",
    exampleExplanation: "先有骨架，再添细节，文章就不会散。",
    pitfalls: ["什么都写，结果重点反而不见了。", "事情经过一跳一跳，读者跟不上。", "写景只写“很美”，没有具体地方。"],
    memoryText: "习作小口令: 先排顺序, 再抓重点, 最后写细节。",
    memorySequence: ["排顺序", "抓重点", "写细节"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 排顺序", text: "先确定从哪里开始写，后面怎么接。", badge: "排顺序" },
      { title: "第 2 步 抓重点", text: "挑一个最值得展开写的画面或情节。", badge: "抓重点" },
      { title: "第 3 步 写细节", text: "把动作、声音、颜色这些细节写进去。", badge: "写细节" }
    )
  }),
  "g4-lower-math-decimal": buildScript({
    teacherLead: "小数点像给数字开了一扇小门，门里还是原来的位值关系。",
    conceptText: "认识小数时，要一边看小数点，一边联系长度、质量这些单位去理解它表示多少。",
    whyText: "小数和单位一旦连起来，后面的计算和应用题就更容易想明白。",
    exampleLabel: "看一看",
    examplePrompt: "看到一个小数时，先想它在什么单位场景里最常出现，再说它比整数多了什么变化。",
    exampleExplanation: "把小数放进生活量里，点前点后的意思就不容易混。",
    pitfalls: ["只看数字，不看小数点位置。", "单位换算时前后乱跳。", "小数和整数比较大小时容易只看个数。"],
    memoryText: "小数小口令: 先看小数点, 再想单位, 最后做换算。",
    memorySequence: ["看小数点", "想单位", "做换算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看小数点", text: "先看看小数点把数字分成了哪两边。", badge: "看小数点" },
      { title: "第 2 步 想单位", text: "再把这个数放到长度、质量等单位里理解。", badge: "想单位" },
      { title: "第 3 步 做换算", text: "最后试着把它和其他单位互相转换。", badge: "会换算" }
    )
  }),
  "g4-lower-math-operations": buildScript({
    teacherLead: "有些算式不一定要硬算到底，先看一眼，运算律可能已经在帮忙了。",
    conceptText: "交换、结合和拆分这些想法，会让一些算式变得更整齐、更好算。",
    whyText: "会简便计算，不只是省时间，更是在训练我们会观察、会找关系。",
    exampleLabel: "先观察",
    examplePrompt: "做题前先看看哪两个数凑整更方便，或者哪一部分能先算。",
    exampleExplanation: "先看关系再下笔，简便不是碰运气。",
    pitfalls: ["一看到数字就从左算到右。", "知道运算律名字，却不会真的用。", "为了简便乱换顺序，忽略运算规则。"],
    memoryText: "简算小口令: 先观察, 再凑整, 最后按规则算。",
    memorySequence: ["先观察", "再凑整", "按规则算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先观察", text: "先看看算式里哪些数放在一起会更方便。", badge: "先观察" },
      { title: "第 2 步 再凑整", text: "把容易凑成整十、整百的数先找出来。", badge: "会凑整" },
      { title: "第 3 步 规则算", text: "最后按运算顺序和规则把题做完。", badge: "规则算" }
    )
  }),
  "g4-lower-math-triangle": buildScript({
    teacherLead: "三角形看着简单，其实每条边、每个角都在告诉我们它的特点。",
    conceptText: "会分类三角形，关键是看边和角；看清特点以后，图形之间的关系也更好懂。",
    whyText: "三角形是后面图形学习的重要基础，认得准，后面就更容易连起来。",
    exampleLabel: "分分类",
    examplePrompt: "看到几个三角形时，先比边，再比角，看看它们可以按什么标准分家。",
    exampleExplanation: "先确定标准，再分类，图形就不会越看越乱。",
    pitfalls: ["分类时一会儿看边，一会儿看角，标准不统一。", "只记名字，不知道为什么这样分。", "看图时容易漏掉图形的重要特征。"],
    memoryText: "图形小口令: 先定标准, 再看特征, 最后分类。",
    memorySequence: ["定标准", "看特征", "做分类"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 定标准", text: "先决定这次是按边分，还是按角分。", badge: "定标准" },
      { title: "第 2 步 看特征", text: "再看看每个三角形最明显的特点。", badge: "看特征" },
      { title: "第 3 步 做分类", text: "最后把同一类的三角形放到一起。", badge: "会分类" }
    )
  }),
  "g4-lower-math-statistics": buildScript({
    teacherLead: "数据到了四年级，已经会开始讲故事了，不只是几个数字排在一起。",
    conceptText: "平均数是在找“差不多每份有多少”，统计图是在帮我们一眼看清谁多谁少。",
    whyText: "会整理数据、会看图，生活里的调查和应用题都会更容易懂。",
    exampleLabel: "看数据",
    examplePrompt: "先看题里给了哪些数据，再想它是在比高低，还是在找平均情况。",
    exampleExplanation: "先看数据在讲什么，公式和方法才不会乱用。",
    pitfalls: ["一看到平均数就直接加完乱除。", "统计图会看高低，却不会说趋势。", "整理数据时容易漏信息。"],
    memoryText: "统计小口令: 先看数据, 再想问题, 最后选方法。",
    memorySequence: ["看数据", "想问题", "选方法"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看数据", text: "先看有哪些数字和信息已经给出来。", badge: "看数据" },
      { title: "第 2 步 想问题", text: "再判断是求平均，还是比较谁更多。", badge: "想问题" },
      { title: "第 3 步 选方法", text: "最后选平均数或统计图这些合适的方法。", badge: "选方法" }
    )
  }),
  "g4-lower-english-family": buildScript({
    teacherLead: "人物和物品一多，英语里就更要学会看它到底在指谁、说什么。",
    conceptText: "词义判断不只是认词，还要放进句子里看它是在说人、物还是关系。",
    whyText: "会看指代和关系，短句和小短文就不容易读得一头雾水。",
    exampleLabel: "连一连",
    examplePrompt: "先看看句子里的代词和名词在对应谁，再判断整句在说什么。",
    exampleExplanation: "把人物和物品对上号，句子意思就更清楚。",
    pitfalls: ["只看单词，不看它在句子里指谁。", "物品和人物词汇常常混。", "代词一变，整句就不知道谁是谁。"],
    memoryText: "英语口令: 先找对象, 再看句子, 最后想意思。",
    memorySequence: ["找对象", "看句子", "想意思"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找对象", text: "先看看句子里在说人物还是物品。", badge: "找对象" },
      { title: "第 2 步 看对应", text: "再把代词和它真正指的对象连起来。", badge: "看对应" },
      { title: "第 3 步 想句意", text: "最后把整句在讲什么说出来。", badge: "想句意" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先找对象。看看这句话到底在说谁，还是在说什么物品。",
      "step-2": "第二步，把代词和名字对上。不要只看 it 或 she，要知道它指的是谁。",
      "step-3": "第三步，再想整句意思。对象一对准，英语句子就清楚多了。",
      example: "跟我连一连。先认人物和物品，再把代词和真正的对象对起来。",
      memory: "记住家庭英语小口令。先找对象，再看对应，最后想句意。"
    })
  }),
  "g4-lower-english-weather": buildScript({
    teacherLead: "天气和活动常常一起出现，看懂场景比单独背词更重要。",
    conceptText: "句子里常会把天气、时间和活动放在一起，我们要学会连着看。",
    whyText: "会看整段场景，做英语选择题和对话题就会稳很多。",
    exampleLabel: "想场景",
    examplePrompt: "先看天气词，再看看人物准备做什么，最后选最合适的句子。",
    exampleExplanation: "天气和活动一连上，场景就清楚多了。",
    pitfalls: ["只看天气词，不看后面的活动。", "明明是日常安排，却按单词题去想。", "场景变化一点就不会选句子。"],
    memoryText: "场景小口令: 先看天气, 再看活动, 最后选句子。",
    memorySequence: ["看天气", "看活动", "选句子"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看天气", text: "先看看句子里有没有晴天、下雨这些提示。", badge: "看天气" },
      { title: "第 2 步 看活动", text: "再看看人物打算做什么。", badge: "看活动" },
      { title: "第 3 步 选表达", text: "最后选最适合这个场景的一句英语。", badge: "选表达" }
    )
  }),
  "g4-lower-english-place": buildScript({
    teacherLead: "说位置和路线时，英语句子里的小短语常常就是关键线索。",
    conceptText: "位置词和方向词不长，但它们决定了整句是在问路、指路还是介绍位置。",
    whyText: "会看位置关系，情景对话和路线题就不容易选错。",
    exampleLabel: "找位置",
    examplePrompt: "先看 near、behind 这些位置短语，再想句子是在问路还是告诉别人怎么走。",
    exampleExplanation: "位置词一抓住，场景关系就清楚了。",
    pitfalls: ["只认单词，不看它和谁在连。", "问路和指路的句子总混在一起。", "位置词一多就乱了方向。"],
    memoryText: "位置小口令: 先看位置词, 再想场景, 最后懂句意。",
    memorySequence: ["看位置词", "想场景", "懂句意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看位置词", text: "先找到句子里表示位置的短语。", badge: "看位置词" },
      { title: "第 2 步 想场景", text: "再判断这句话是在问路还是在说明位置。", badge: "想场景" },
      { title: "第 3 步 懂句意", text: "最后把整句的大概意思说清楚。", badge: "懂句意" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先找位置词。near、behind、next to 这些词最能带路。",
      "step-2": "第二步，想清场景。是在问路，还是在告诉别人位置和路线。",
      "step-3": "第三步，再说句意。位置关系理顺了，整句就不会走丢。",
      example: "跟我试试。先圈位置词，再判断这句是在问路还是在指路。",
      memory: "记住位置英语小口令。先看位置词，再想场景，最后懂句意。"
    })
  }),
  "g4-lower-english-read": buildScript({
    teacherLead: "四年级的小短文不长，但已经需要学会抓住句型和关键词一起看。",
    conceptText: "句型一变，句子重点可能就会变；短文阅读要先找关键词，再想整段主意。",
    whyText: "会看句型变化和短文重点，英语理解就不会只停在认词阶段。",
    exampleLabel: "读一读",
    examplePrompt: "先找短文里重复出现的词和句型，再想这一小段最主要在讲什么。",
    exampleExplanation: "关键词会带路，短文意思就会慢慢打开。",
    pitfalls: ["看见短文就只认单词，不看整段。", "句型换了就不敢判断意思。", "读完一句懂一点，连成整段就断掉。"],
    memoryText: "短文小口令: 先找关键词, 再看句型, 最后说大意。",
    memorySequence: ["找关键词", "看句型", "说大意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找关键词", text: "先找短文里反复出现的人、事、物。", badge: "找关键词" },
      { title: "第 2 步 看句型", text: "再看看这些句子用了什么固定表达。", badge: "看句型" },
      { title: "第 3 步 说大意", text: "最后用简单的话说出短文主要讲什么。", badge: "说大意" }
    )
  })
});
