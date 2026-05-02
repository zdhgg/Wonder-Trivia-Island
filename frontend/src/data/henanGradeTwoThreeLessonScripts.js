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

export const HENAN_GRADE_TWO_THREE_LESSON_SCRIPTS = Object.freeze({
  "g2-upper-chinese-words": buildScript({
    teacherLead: "二年级开始，词语朋友会越来越多，我们要学会给它们分家。",
    conceptText: "有的词是同一类，有的词意思差不多，有的词意思正好相反。",
    whyText: "词语分得清，说话和写句子就会更准确。",
    exampleLabel: "分一分",
    examplePrompt: "看到几个词时，先想想它们是不是同一类，再找找谁和谁更像朋友。",
    exampleExplanation: "把词语放到对的位置上，脑袋里的词语柜子就会更整齐。",
    pitfalls: ["只看一个字像不像，不看整个词的意思。", "近义词和反义词总是混在一起。", "会认词语，却不知道能不能分成一类。"],
    memoryText: "词语小口令: 先看意思, 再找朋友, 最后分分类。",
    memorySequence: ["看意思", "找朋友", "分分类"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先看意思", text: "读词语时先别急着选，先想它大概在说什么。", badge: "看意思" },
      { title: "第 2 步 找朋友", text: "看看哪个词和它意思更近，哪个词和它正好相反。", badge: "找朋友" },
      { title: "第 3 步 分分类", text: "把能放在一起的词语放一队，词语仓库就更清楚了。", badge: "会分类" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先看整个词在说什么。别只盯一个字，要把整个词一起想。",
      "step-2": "第二步，找词语朋友。看看谁和它意思更像，谁和它正好相反。",
      "step-3": "第三步，帮词语分家。能放在一起的站一队，词语柜子就整齐了。",
      example: "跟我分一分。看到几个词，先想它们是不是同一类，再找意思相近和相反的词。",
      memory: "记住词语小口令。先看意思，再找朋友，最后分分类。"
    })
  }),
  "g2-upper-chinese-sentences": buildScript({
    teacherLead: "一句话要像小火车一样，一节一节连好，还要在对的地方停下来。",
    conceptText: "标点会告诉我们哪里停、哪里问，句子顺序会告诉我们怎么说才通顺。",
    whyText: "句子排顺了，读和写都会轻松很多。",
    exampleLabel: "连起来",
    examplePrompt: "看到乱乱的句子时，先找谁在前，再看句子最后该放什么标点。",
    exampleExplanation: "句子站好队，意思就不会乱跑。",
    pitfalls: ["只顾看词，不看整句前后顺序。", "句子说完了，却忘了点标点。", "有问句却还在用句号。"],
    memoryText: "句子小口令: 先排队, 再读顺, 最后点标点。",
    memorySequence: ["先排队", "再读顺", "点标点"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 排排队", text: "先找出句子里的主角和动作，看看谁应该先站出来。", badge: "排顺序" },
      { title: "第 2 步 读一读", text: "把排好的句子读一遍，听听顺不顺。", badge: "读通顺" },
      { title: "第 3 步 点一下", text: "说完了就请句号、问号来帮忙停一停。", badge: "会标点" }
    )
  }),
  "g2-upper-chinese-links": buildScript({
    teacherLead: "说事情的时候，前后要连起来，别人才能一下就听懂。",
    conceptText: "因为、所以、先、再这些词，会把前后意思连成一条线。",
    whyText: "会连意思，讲故事、答问题和写句子都会更有条理。",
    exampleLabel: "接一接",
    examplePrompt: "看到两句话时，先想它们是先后关系，还是原因和结果关系。",
    exampleExplanation: "把关系想明白，关联词才不会乱用。",
    pitfalls: ["句子前后有关系，却没有连起来。", "看到关联词就硬塞，不想它合不合适。", "先后顺序说反了。"],
    memoryText: "连接小口令: 先看关系, 再选词, 最后连起来。",
    memorySequence: ["看关系", "选词", "连起来"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看关系", text: "先看看前后两句话是在说原因结果，还是先后顺序。", badge: "看关系" },
      { title: "第 2 步 选连接词", text: "关系想清楚了，再选合适的小桥词。", badge: "会连接" },
      { title: "第 3 步 说清楚", text: "把两句话连成一口气说出来，意思就更明白。", badge: "说条理" }
    )
  }),
  "g2-upper-chinese-reading": buildScript({
    teacherLead: "短文虽然不长，可里面也藏着人物、事情和线索。",
    conceptText: "读短文时要找谁、在做什么、结果怎样，还要学会看图说画面。",
    whyText: "会找重点，阅读题和口头表达都会更稳。",
    exampleLabel: "找重点",
    examplePrompt: "先读一遍，再圈出短文里最重要的人物和事情。",
    exampleExplanation: "先抓大意，再看细节，小短文就不怕了。",
    pitfalls: ["一个字一个字读，却不知道整段在讲什么。", "看图只会说看到什么，不会说发生了什么。", "读完以后找不到重点。"],
    memoryText: "阅读小口令: 先读全, 再找人事, 最后说大意。",
    memorySequence: ["先读全", "找人事", "说大意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 读完整", text: "先把短文从头到尾读一遍，不要读一半就停。", badge: "先读全" },
      { title: "第 2 步 找重点", text: "看看是谁、做了什么、结果怎样。", badge: "找重点" },
      { title: "第 3 步 说一说", text: "用自己的话把图和短文的意思讲出来。", badge: "会复述" }
    )
  }),
  "g2-upper-math-mental": buildScript({
    teacherLead: "二年级的口算要更稳，数字站得清，比较大小才不会乱。",
    conceptText: "加减口算要看清数位，比较大小要先比大位再比小位。",
    whyText: "口算和比较是后面乘除和应用题的地基。",
    exampleLabel: "先口算",
    examplePrompt: "做题前先看看数字谁大谁小，再慢慢把结果算出来。",
    exampleExplanation: "看清数字位置，脑子里的算路就更顺。",
    pitfalls: ["只想快，不看数位。", "比较大小时只看后面一个数字。", "口算时把加和减看反。"],
    memoryText: "口算小口令: 先看数, 再动脑, 最后说答案。",
    memorySequence: ["先看数", "再动脑", "说答案"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看清数字", text: "先看每个数长什么样，不把十位和个位看混。", badge: "看清数" },
      { title: "第 2 步 算一算", text: "按加法还是减法慢慢想，不抢跑。", badge: "会口算" },
      { title: "第 3 步 比大小", text: "算完还要会说谁大谁小、谁排前面。", badge: "会比较" }
    )
  }),
  "g2-upper-math-chain": buildScript({
    teacherLead: "连加连减像走小台阶，一步一步来，就不会摔跟头。",
    conceptText: "先算第一步，再接着算第二步，情景题还要先读懂在说什么。",
    whyText: "会分步想，后面的多步题才不会一下就绕晕。",
    exampleLabel: "分两步",
    examplePrompt: "遇到连加连减时，先说第一步要算什么，再想第二步。",
    exampleExplanation: "先说顺序，再算结果，脑袋更清楚。",
    pitfalls: ["两步一起看，反而算乱了。", "情景题没看懂就下笔。", "第一步算对了，第二步忘了接上。"],
    memoryText: "分步小口令: 先第一步, 再第二步, 最后看结果。",
    memorySequence: ["第一步", "第二步", "看结果"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看场景", text: "先弄明白题里发生了什么，是加上还是减少。", badge: "看场景" },
      { title: "第 2 步 分步骤", text: "把题拆成一小步一小步来算。", badge: "会分步" },
      { title: "第 3 步 接起来", text: "前一步的结果要记得带到下一步去。", badge: "会接着算" }
    )
  }),
  "g2-upper-math-time": buildScript({
    teacherLead: "钟面和时间表，都是二年级要认识的新伙伴。",
    conceptText: "要看清长针短针，也要知道先后经过了多久。",
    whyText: "会看时间，生活安排和数学题都会更顺手。",
    exampleLabel: "看钟面",
    examplePrompt: "先指一指短针在哪里，再看看长针走到了哪儿。",
    exampleExplanation: "先会认时刻，再学会算时间经过了多少。",
    pitfalls: ["只看一根针。", "先后顺序想反了。", "会认整点，不会看接近几点。"],
    memoryText: "时间小口令: 先看短针, 再看长针, 最后说时刻。",
    memorySequence: ["看短针", "看长针", "说时刻"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看短针", text: "先看看大概是几点，短针会先告诉你。", badge: "看短针" },
      { title: "第 2 步 看长针", text: "再看看长针走到哪里，分钟就出来了。", badge: "看长针" },
      { title: "第 3 步 排顺序", text: "把几个时刻排一排，时间先后就清楚了。", badge: "会排序" }
    )
  }),
  "g2-upper-math-share": buildScript({
    teacherLead: "把东西平均分，就是乘法和除法世界前面的门。",
    conceptText: "每份一样多叫平均分，几个几放在一起，就会慢慢变成乘法。",
    whyText: "这一步想明白，后面学口诀和除法会轻松很多。",
    exampleLabel: "分一分",
    examplePrompt: "看到几个盘子和几个物品时，先试着平均分开。",
    exampleExplanation: "一边分一边数，关系就会自己跳出来。",
    pitfalls: ["每份分得不一样多。", "只会分，却说不出几个几。", "平均分和随便分混在一起。"],
    memoryText: "平均分小口令: 一份一份放, 每份一样多。",
    memorySequence: ["一份一份放", "每份一样多", "说几个几"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 平均分", text: "先把东西一份一份分开，保证每份一样多。", badge: "会平均分" },
      { title: "第 2 步 数一数", text: "看看一共有几份，每份有几个。", badge: "会数关系" },
      { title: "第 3 步 说出来", text: "把“几个几”大声说出来，就是乘法的小影子。", badge: "乘法启蒙" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，平均分。一个一个放，保证每份一样多。",
      "step-2": "第二步，数份数和每份几个。两边都要看清。",
      "step-3": "第三步，说出几个几。这样就和乘法搭上桥了。",
      example: "跟我摆一摆。看到盘子和物品时，先平均分，再说一共有几份、每份几个。",
      memory: "记住平均分小口令。一份一份放，每份一样多，再说几个几。"
    })
  }),
  "g2-lower-chinese-use": buildScript({
    teacherLead: "会认词语只是第一步，二年级下册开始要学会把词语用起来。",
    conceptText: "挑对词、放对位置，句子就会更通顺、更像你想说的话。",
    whyText: "词语会用，写话和阅读理解都会更稳。",
    exampleLabel: "用一用",
    examplePrompt: "先选出最合适的词，再放进句子里读一读。",
    exampleExplanation: "合适的词像合脚的鞋，穿上才走得顺。",
    pitfalls: ["看到熟词就直接塞进去。", "词语会认，但不会和别的词搭配。", "句子里意思不顺还没发现。"],
    memoryText: "用词小口令: 先选对, 再放好, 最后读顺。",
    memorySequence: ["先选对", "再放好", "最后读顺"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 挑一挑", text: "先从几个词里挑出最合适的一个。", badge: "会选词" },
      { title: "第 2 步 放进去", text: "把词放进句子里，看看意思是不是更完整。", badge: "会搭配" },
      { title: "第 3 步 读顺它", text: "读一遍顺不顺，不顺就再换一换。", badge: "会运用" }
    )
  }),
  "g2-lower-chinese-links": buildScript({
    teacherLead: "意思相近、相反和前后连接，都是二年级说话写话的小工具。",
    conceptText: "找到词语之间的关系，句子就不容易散开。",
    whyText: "会辨关系，说话更准，写句子也更有条理。",
    exampleLabel: "比一比",
    examplePrompt: "看到两个词时，先想它们是像朋友，还是像对着站。",
    exampleExplanation: "先认关系，再开口，脑袋会更清楚。",
    pitfalls: ["近义词和反义词老是分不清。", "只记字面，不看词语真正意思。", "连接时前后逻辑不顺。"],
    memoryText: "关系小口令: 先辨关系, 再选词, 最后连句子。",
    memorySequence: ["辨关系", "选词", "连句子"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 辨一辨", text: "先判断两个词是差不多，还是正相反。", badge: "辨关系" },
      { title: "第 2 步 接一接", text: "再看看前后意思能不能用连接词搭起来。", badge: "会连接" },
      { title: "第 3 步 说完整", text: "把关系讲完整，句子就更通顺。", badge: "说完整" }
    )
  }),
  "g2-lower-chinese-read": buildScript({
    teacherLead: "二年级下册的阅读，要学会借着标点和句子关系去想意思。",
    conceptText: "停顿对了，句子意思就更清楚，短文也更容易读懂。",
    whyText: "会读懂短文，后面做题和表达都会更有底气。",
    exampleLabel: "读一段",
    examplePrompt: "先读一段话，再看看哪里该停，重点信息藏在哪儿。",
    exampleExplanation: "会停、会找重点，短文就会慢慢打开。",
    pitfalls: ["读得太快，不看停顿。", "找到词语，却找不到整段大意。", "读完以后说不清重点。"],
    memoryText: "阅读小口令: 先停好, 再找点, 最后说大意。",
    memorySequence: ["先停好", "再找点", "说大意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 读停顿", text: "先让句子在合适的地方停一停。", badge: "会停顿" },
      { title: "第 2 步 找重点", text: "看看人物、事情和结果在哪儿。", badge: "找重点" },
      { title: "第 3 步 讲大意", text: "把这一小段在说什么讲给自己听。", badge: "说大意" }
    )
  }),
  "g2-lower-chinese-write": buildScript({
    teacherLead: "写话不是一下写很多，而是把看到的事情慢慢排顺。",
    conceptText: "先看清画面，再想先说什么、后说什么，最后写成几句完整的话。",
    whyText: "敢写、会写，后面的习作才不会害怕。",
    exampleLabel: "先看图",
    examplePrompt: "先说图上有谁、在做什么，再想哪一句要放前面。",
    exampleExplanation: "说顺了，再写下来，句子会更自然。",
    pitfalls: ["看图只会报名称。", "想到哪句写哪句，没有顺序。", "一句话没写完整就停下了。"],
    memoryText: "写话小口令: 先看图, 再排顺, 最后写完整。",
    memorySequence: ["先看图", "再排顺", "写完整"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看画面", text: "先把图里的人、物和动作看清楚。", badge: "会观察" },
      { title: "第 2 步 排顺序", text: "想想先说什么，后说什么。", badge: "会整理" },
      { title: "第 3 步 写下来", text: "用几句完整的话把画面写出来。", badge: "敢表达" }
    )
  }),
  "g2-lower-math-multiply": buildScript({
    teacherLead: "乘法口诀不是只背得快，还要知道它在帮我们数什么。",
    conceptText: "几个几合起来，就能用乘法和口诀帮忙更快地算出来。",
    whyText: "口诀稳了，后面乘法和应用题会轻松很多。",
    exampleLabel: "说口诀",
    examplePrompt: "先看是几个几，再想对应的口诀是哪一句。",
    exampleExplanation: "先认关系，再背口诀，乘法更扎实。",
    pitfalls: ["口诀背会了，却不知道在算什么。", "几个几总是看反。", "一看到生活题就不会用乘法。"],
    memoryText: "乘法小口令: 先看几个几, 再想口诀, 最后写算式。",
    memorySequence: ["看几个几", "想口诀", "写算式"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看几个几", text: "先看有几组，每组有几个。", badge: "看关系" },
      { title: "第 2 步 想口诀", text: "把对应口诀在脑袋里叫出来。", badge: "会口诀" },
      { title: "第 3 步 写算式", text: "把几个几写成乘法算式。", badge: "会乘法" }
    )
  }),
  "g2-lower-math-divide": buildScript({
    teacherLead: "除法是把一堆东西分开看，关键是看清怎么分。",
    conceptText: "会平均分，就能慢慢明白除法在求每份多少，还是求分成几份。",
    whyText: "除法意思懂了，后面做题就不会只靠猜。",
    exampleLabel: "分一分",
    examplePrompt: "先想这题是在求每份几个，还是求一共几份。",
    exampleExplanation: "把分法说清楚，除法就更听话。",
    pitfalls: ["一看到分就不知道求什么。", "平均分和不平均分混在一起。", "只会算，不会说意思。"],
    memoryText: "除法小口令: 先看怎么分, 再看求什么。",
    memorySequence: ["看怎么分", "看求什么", "写答案"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看分法", text: "先看题里是不是平均分。", badge: "看分法" },
      { title: "第 2 步 想问题", text: "再想它是在问每份，还是在问份数。", badge: "看问题" },
      { title: "第 3 步 写结果", text: "想清楚后再写除法结果。", badge: "会除法" }
    )
  }),
  "g2-lower-math-life": buildScript({
    teacherLead: "时间和长度都在生活里，学会以后每天都会用得到。",
    conceptText: "会看时间变化，也会比较长短、估一估生活里的量。",
    whyText: "生活数学会越学越好用，不只是在纸上做题。",
    exampleLabel: "说生活",
    examplePrompt: "先说一说题目里的时间或长度在生活里像什么。",
    exampleExplanation: "先把数学放进生活场景，题意就更好懂。",
    pitfalls: ["时间前后顺序看反。", "长度只看数字，不想单位。", "生活题一紧张就忘了数学本领。"],
    memoryText: "生活数学口令: 先看单位, 再想场景, 最后做比较。",
    memorySequence: ["看单位", "想场景", "做比较"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看时间", text: "先看看是哪个时刻，或者经过了多久。", badge: "会时间" },
      { title: "第 2 步 看长度", text: "再想长短、远近该怎么比。", badge: "会比较" },
      { title: "第 3 步 连生活", text: "把时间和长度放进每天会遇到的事情里。", badge: "会应用" }
    )
  }),
  "g2-lower-math-problem": buildScript({
    teacherLead: "会口算只是开始，二年级下册更要学会在题里找规律、找关系。",
    conceptText: "情景题里有数字，也有意思，先看懂再计算最重要。",
    whyText: "会转弯想一想，做题就不会一直撞墙。",
    exampleLabel: "找关系",
    examplePrompt: "先说题里知道什么、要找什么，再决定怎么算。",
    exampleExplanation: "关系看准了，口算和规律都会更顺。",
    pitfalls: ["题还没读完就开始算。", "只看到数字，没看到题里在问什么。", "发现规律时只看一项就下结论。"],
    memoryText: "应用题小口令: 先读题, 再找关系, 最后算。",
    memorySequence: ["先读题", "找关系", "最后算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先读题", text: "先把题目完整看一遍。", badge: "先读题" },
      { title: "第 2 步 找关系", text: "看看题里哪些数字是连在一起的。", badge: "找关系" },
      { title: "第 3 步 算一算", text: "想好方法以后再动笔。", badge: "会解决" }
    )
  }),
  "g3-upper-chinese-words": buildScript({
    teacherLead: "三年级的词语开始更有味道了，不只会认，还要会想。",
    conceptText: "词义、成语和近义词都在帮我们把一句话读得更细。",
    whyText: "字词想得深一点，阅读和表达都会更有劲。",
    exampleLabel: "猜一猜",
    examplePrompt: "看到成语和新词时，先联系前后句猜猜它在说什么。",
    exampleExplanation: "把词放回句子里，意思才会慢慢亮出来。",
    pitfalls: ["只背解释，不会放回句子里理解。", "看到成语就害怕。", "近义词只看字面。"],
    memoryText: "字词小口令: 先放句里, 再想意思, 最后会运用。",
    memorySequence: ["放句里", "想意思", "会运用"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 放回句子", text: "先看看这个词出现在什么句子里。", badge: "放句里" },
      { title: "第 2 步 猜意思", text: "联系上下文，猜猜它到底在说什么。", badge: "会猜义" },
      { title: "第 3 步 学运用", text: "会理解以后，再试着把它说进自己的句子里。", badge: "会运用" }
    )
  }),
  "g3-upper-chinese-read": buildScript({
    teacherLead: "三年级的阅读开始更像小侦探，要会看句子之间怎么互相帮忙。",
    conceptText: "关联词会告诉你前后关系，段落会告诉你文章在往哪里走。",
    whyText: "会看句段关系，读文章就不容易只记零零碎碎。",
    exampleLabel: "找关系",
    examplePrompt: "先看这几句话是在并列、转折，还是先后推进。",
    exampleExplanation: "关系找清楚，段落意思就会更完整。",
    pitfalls: ["只看单句，不看前后关系。", "看到关联词却不知道它在帮什么忙。", "段落读完说不出重点。"],
    memoryText: "句段小口令: 先看关系, 再找重点, 最后说段意。",
    memorySequence: ["看关系", "找重点", "说段意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看连接", text: "先看看句子之间是怎样连起来的。", badge: "看关系" },
      { title: "第 2 步 找重点", text: "段里最重要的一句或一个意思是什么。", badge: "找重点" },
      { title: "第 3 步 说段意", text: "把这一段在讲什么完整说出来。", badge: "说段意" }
    )
  }),
  "g3-upper-chinese-poetry": buildScript({
    teacherLead: "古诗不只是背熟，还要读出画面和味道。",
    conceptText: "边读古诗边想景象，再想诗人为什么要这样写。",
    whyText: "会想画面、会体会意思，古诗就不会只剩下背诵。",
    exampleLabel: "想画面",
    examplePrompt: "读诗句时，先想你眼前看到了什么，再想诗人在夸谁、想谁。",
    exampleExplanation: "画面一出来，诗句就会更好记。",
    pitfalls: ["只背字，不想画面。", "知道每个字，却不知道整句在写什么。", "古诗和文化背景完全分开。"],
    memoryText: "古诗小口令: 先读顺, 再想画面, 最后说感觉。",
    memorySequence: ["先读顺", "想画面", "说感觉"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 读诗句", text: "先把古诗读顺，不着急赶速度。", badge: "读顺" },
      { title: "第 2 步 想画面", text: "一边读一边想眼前出现了什么景。", badge: "想画面" },
      { title: "第 3 步 说味道", text: "想想这首诗让你觉得开心、安静，还是想家。", badge: "会体会" }
    )
  }),
  "g3-upper-chinese-write": buildScript({
    teacherLead: "三年级习作起步，不是写很多，而是把感受说得更真。",
    conceptText: "挑合适的词、写真实的感觉，句子就会更有画面。",
    whyText: "表达更准确，后面的习作才会一点点长出来。",
    exampleLabel: "说感受",
    examplePrompt: "看到一个场景时，先说你喜欢它、害怕它，还是觉得它很美。",
    exampleExplanation: "把感觉说出来，句子就不会只剩下空空的描述。",
    pitfalls: ["全都说“很好”“很美”，词太单。", "只写看到的，不写自己的感受。", "一句接一句，却没有重点。"],
    memoryText: "习作小口令: 先观察, 再感受, 最后写出来。",
    memorySequence: ["先观察", "再感受", "写出来"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先观察", text: "先把看到的景和事认真看一看。", badge: "会观察" },
      { title: "第 2 步 说感受", text: "想想你心里最想说的感觉是什么。", badge: "会表达" },
      { title: "第 3 步 写几句", text: "把观察和感受合在一起写成几句完整的话。", badge: "会起步" }
    )
  }),
  "g3-upper-math-measure": buildScript({
    teacherLead: "三年级数学开始更讲究时间和测量了，很多地方都要更精确。",
    conceptText: "时、分、秒要分清，长度和观察也要更细心。",
    whyText: "会量、会看、会比，后面的图形和应用才走得稳。",
    exampleLabel: "量一量",
    examplePrompt: "先看看题里要比的是时间、长度，还是图形的样子。",
    exampleExplanation: "对象看准了，方法才不会选错。",
    pitfalls: ["时分秒总是混。", "长度单位看漏了。", "观察物体只看一面。"],
    memoryText: "测量小口令: 先看对象, 再看单位, 最后比较。",
    memorySequence: ["看对象", "看单位", "做比较"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看对象", text: "先看题里比的是时间、长度还是图形。", badge: "看对象" },
      { title: "第 2 步 看单位", text: "再看清单位，不让秒和分、厘米和米打架。", badge: "看单位" },
      { title: "第 3 步 做比较", text: "最后再说谁长、谁短、谁更久。", badge: "会比较" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，看对象。先分清题里是在比时间、长度，还是图形。",
      "step-2": "第二步，看单位。秒、分、厘米、米，一个都不能看错。",
      "step-3": "第三步，再比较。对象和单位都看准，谁长谁短、谁久谁快就清楚了。",
      example: "跟我量一量。先看题里比什么，再看单位，最后说结果。",
      memory: "记住测量小口令。先看对象，再看单位，最后比较。"
    })
  }),
  "g3-upper-math-multiply": buildScript({
    teacherLead: "乘法到了三年级，不只要快，还要会按顺序想。",
    conceptText: "口算乘法先看口诀，笔算时要一步一步对齐想。",
    whyText: "乘法顺了，后面的周长和应用题都会轻松些。",
    exampleLabel: "想口诀",
    examplePrompt: "看到乘法时，先想口诀，再想这题和生活里什么有关。",
    exampleExplanation: "口诀是门牌号，关系看懂了才真会做。",
    pitfalls: ["只背口诀，不看题目关系。", "数字一长就慌。", "规律题只看一个数就猜。"],
    memoryText: "乘法小口令: 先想口诀, 再看顺序, 最后算清。",
    memorySequence: ["想口诀", "看顺序", "算清"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先口算", text: "看到基础乘法先把口诀叫出来。", badge: "会口诀" },
      { title: "第 2 步 看步骤", text: "数字多一点时，要按顺序一步步来。", badge: "看步骤" },
      { title: "第 3 步 找规律", text: "有些题还藏着规律，找到它会更快。", badge: "找规律" }
    )
  }),
  "g3-upper-math-number": buildScript({
    teacherLead: "数字越变越大，更要学会拆开看，不能挤成一团。",
    conceptText: "万以内数要会看数位，也要会把大一点的加减法放进生活题里想。",
    whyText: "数位清楚了，笔算和应用题才不会一直出小差。",
    exampleLabel: "拆一拆",
    examplePrompt: "看到一个大数时，先说它有几个千、几个百、几个十和几个一。",
    exampleExplanation: "会拆数，笔算就像搭积木一样稳。",
    pitfalls: ["数位看混。", "大数一多就不敢开口读。", "应用题里只看数字，不看问题。"],
    memoryText: "大数小口令: 先看数位, 再想关系, 最后计算。",
    memorySequence: ["看数位", "想关系", "最后计算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看数位", text: "先看看这个数的每一位站在哪里。", badge: "看数位" },
      { title: "第 2 步 拆关系", text: "把大数拆成几个千、百、十和一。", badge: "会拆数" },
      { title: "第 3 步 做应用", text: "再把这些数放回生活题里去理解。", badge: "会应用" }
    )
  }),
  "g3-upper-math-perimeter": buildScript({
    teacherLead: "周长就是围着图形走一圈的长度，像给图形量腰围。",
    conceptText: "边和边加起来就是周长，规律题也在帮我们学会有顺序地看数字。",
    whyText: "图形和规律一起练，脑子会更会找线索。",
    exampleLabel: "围一圈",
    examplePrompt: "先指着图形边走一圈，再想哪些边要加起来。",
    exampleExplanation: "走一圈想明白，周长就不会算漏边。",
    pitfalls: ["只加一部分边。", "图形看明白了，数字规律却忘了找。", "一紧张就把长和宽看混。"],
    memoryText: "周长小口令: 先围一圈, 再把边相加。",
    memorySequence: ["围一圈", "看清边", "相加"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 围一圈", text: "先想想图形外面这一圈要走哪几条边。", badge: "围一圈" },
      { title: "第 2 步 数边长", text: "把每条要走的边长度看清。", badge: "看边长" },
      { title: "第 3 步 找规律", text: "有些边一样长，规律会来帮你。", badge: "会规律" }
    )
  }),
  "g3-upper-english-greet": buildScript({
    teacherLead: "三年级英语先从打招呼开始，让嘴巴敢开口。",
    conceptText: "Hello、Good morning 这些句子，是英语场景里最常见的小钥匙。",
    whyText: "会问候、会回应，英语就不会只停在看单词。",
    exampleLabel: "开口说",
    examplePrompt: "先看场景，再想这时候更适合说哪一句英语。",
    exampleExplanation: "把句子放回场景里，英语才像真的在说话。",
    pitfalls: ["只会背句子，不知道什么时候用。", "一见到英语就不敢开口。", "看不出对话发生在什么场景。"],
    memoryText: "英语小口令: 先看场景, 再选句子, 最后开口说。",
    memorySequence: ["看场景", "选句子", "开口说"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看场景", text: "先看看是在见面、上课，还是告别。", badge: "看场景" },
      { title: "第 2 步 选句子", text: "从几句英语里选最合适的一句。", badge: "选句子" },
      { title: "第 3 步 跟着说", text: "大胆跟着读一遍，英语就会越说越顺。", badge: "敢开口" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，看场景。先看看是在见面、上课，还是要告别。",
      "step-2": "第二步，选句子。不同场景，要用不同的英语问候。",
      "step-3": "第三步，大声跟着说。嘴巴敢开口，英语才会越说越顺。",
      example: "跟我说一遍。先看场景，再从几句英语里选最合适的一句。",
      memory: "记住英语问候小口令。先看场景，再选句子，最后开口说。"
    })
  }),
  "g3-upper-english-words": buildScript({
    teacherLead: "数字、颜色和常见词汇，是三年级英语起步最常见的小伙伴。",
    conceptText: "看到单词时，要把它和图片、颜色、数字一起记住。",
    whyText: "词汇认得越稳，后面的句子理解就越轻松。",
    exampleLabel: "认一认",
    examplePrompt: "先看图，再把英语单词和它配起来。",
    exampleExplanation: "单词和画面绑在一起，记忆会更牢。",
    pitfalls: ["只背中文意思。", "会看不会读。", "数字和颜色单词容易混。"],
    memoryText: "单词小口令: 先看图, 再认词, 最后读出来。",
    memorySequence: ["先看图", "再认词", "读出来"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看画面", text: "先看看图片、颜色或数字长什么样。", badge: "看画面" },
      { title: "第 2 步 配单词", text: "把英语单词和对应内容连起来。", badge: "会配对" },
      { title: "第 3 步 读出声", text: "认出来以后，再开口读一遍。", badge: "会认读" }
    )
  }),
  "g3-upper-english-sentence": buildScript({
    teacherLead: "代词和句意像英语句子里的小路标，能帮我们看懂谁在说话。",
    conceptText: "he、she、it 不一样，短句的意思也要放在场景里去想。",
    whyText: "会认代词、会懂句意，读英语句子就不会只靠猜。",
    exampleLabel: "想一想",
    examplePrompt: "先看句子里在说谁，再猜整句话大概想表达什么。",
    exampleExplanation: "找到主角，句子的意思就会更清楚。",
    pitfalls: ["he、she 总是换来换去。", "只看一个单词就猜整句。", "句子读完说不出在讲谁。"],
    memoryText: "句意小口令: 先找谁, 再看词, 最后想整句。",
    memorySequence: ["先找谁", "再看词", "想整句"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找主角", text: "先看看句子里在说男生、女生，还是物品。", badge: "找主角" },
      { title: "第 2 步 认代词", text: "把 he、she、it 和它们的主角对应起来。", badge: "认代词" },
      { title: "第 3 步 想句意", text: "再把整句大概意思说出来。", badge: "会句意" }
    )
  }),
  "g3-upper-english-scene": buildScript({
    teacherLead: "短语和场景搭起来，英语会更像真的在生活里用。",
    conceptText: "短语不长，可它常常决定一句话到底在说什么。",
    whyText: "短语认得稳，场景题和对话题都会更轻松。",
    exampleLabel: "放回去",
    examplePrompt: "先看看场景，再想哪个短语最适合放进去。",
    exampleExplanation: "短语放对地方，整句就顺了。",
    pitfalls: ["词语都认识，连成短语就不会了。", "只看字面，不看场景。", "选句子时忽略前后文。"],
    memoryText: "短语小口令: 先看场景, 再认短语, 最后放句里。",
    memorySequence: ["看场景", "认短语", "放句里"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看场景", text: "先看看人物在做什么。", badge: "看场景" },
      { title: "第 2 步 认短语", text: "把常见短语和动作、物品对应起来。", badge: "认短语" },
      { title: "第 3 步 放句里", text: "把短语放回句子，看看顺不顺。", badge: "会理解" }
    )
  }),
  "g3-lower-chinese-feel": buildScript({
    teacherLead: "三年级下册的词语，不只看意思，还要会体会它的味道。",
    conceptText: "同样是表达喜欢和讨厌，不同词语带出来的感觉也会不一样。",
    whyText: "词用得准，句子就更有感情。",
    exampleLabel: "品一品",
    examplePrompt: "先想这个词让你觉得开心、着急，还是温柔。",
    exampleExplanation: "会体会词语味道，表达就不再平平的。",
    pitfalls: ["只看字面，不感受词语情绪。", "所有好词都觉得一样。", "用词时不想场景。"],
    memoryText: "词语味道口令: 先想感觉, 再看场景, 最后用词。",
    memorySequence: ["想感觉", "看场景", "最后用词"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 想感觉", text: "先问问自己，这个词让人心里是什么感觉。", badge: "想感觉" },
      { title: "第 2 步 看场景", text: "再想它适合放在什么场景里。", badge: "看场景" },
      { title: "第 3 步 用出来", text: "挑一个最合适的词写进句子里。", badge: "会准确用词" }
    )
  }),
  "g3-lower-chinese-culture": buildScript({
    teacherLead: "古诗和成语像一个个小锦囊，越积累越能帮你读和写。",
    conceptText: "读古诗时看画面，学成语时看故事和意思，文化味道就会慢慢出来。",
    whyText: "积累多了，语言会更有味道，阅读也更好懂。",
    exampleLabel: "想故事",
    examplePrompt: "碰到成语和古诗时，先想它在说什么情景。",
    exampleExplanation: "有画面、有故事，文化积累就不会只是死背。",
    pitfalls: ["只背字，不知道意思。", "成语只会套用，不知道场合。", "古诗和生活感受完全分开。"],
    memoryText: "文化积累口令: 先想画面, 再懂意思, 最后会运用。",
    memorySequence: ["想画面", "懂意思", "会运用"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 想画面", text: "先看看古诗和成语里出现了什么场景。", badge: "想画面" },
      { title: "第 2 步 懂意思", text: "再把它真正想表达的意思讲清楚。", badge: "懂意思" },
      { title: "第 3 步 去运用", text: "试着在说话写话时把它们用起来。", badge: "会积累" }
    )
  }),
  "g3-lower-chinese-read": buildScript({
    teacherLead: "三年级下册阅读更要会抓句段之间的线索。",
    conceptText: "关联词、重点句和段落大意，都会带着我们往文章里面走。",
    whyText: "会找线索，文章一长也不会一下就迷路。",
    exampleLabel: "找线索",
    examplePrompt: "先看关联词，再找段里最重要的一句。",
    exampleExplanation: "小线索找得准，大意思就容易明白。",
    pitfalls: ["只会看表面词语。", "读一段忘一段。", "不知道哪句最重要。"],
    memoryText: "阅读进阶口令: 先找线索, 再抓重点, 最后连全段。",
    memorySequence: ["找线索", "抓重点", "连全段"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找连接词", text: "先看看句子和句子怎么连。", badge: "找线索" },
      { title: "第 2 步 抓重点句", text: "再找段里最能说明意思的一句。", badge: "抓重点" },
      { title: "第 3 步 连段意", text: "把重点句和全段意思连起来。", badge: "会概括" }
    )
  }),
  "g3-lower-chinese-write": buildScript({
    teacherLead: "习作到了这里，要学会既认真观察，也大胆想象。",
    conceptText: "观察能让内容真实，想象能让句子更亮、更有趣。",
    whyText: "会观察、会想象，写出来的内容就不会干巴巴。",
    exampleLabel: "想一想",
    examplePrompt: "先看清真实的样子，再想如果它会说话、会动，会发生什么。",
    exampleExplanation: "真实和想象一起走，写话才会好看。",
    pitfalls: ["只会照着看，不敢想。", "只顾想象，和真实完全分开。", "写了很多却没有重点。"],
    memoryText: "习作进阶口令: 先观察, 再想象, 最后整理写。",
    memorySequence: ["先观察", "再想象", "整理写"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 认真看", text: "先把真实样子看仔细。", badge: "会观察" },
      { title: "第 2 步 大胆想", text: "再想一想还能发生什么有趣的事。", badge: "会想象" },
      { title: "第 3 步 写出来", text: "把真实和想象一起整理成一段话。", badge: "会表达" }
    )
  }),
  "g3-lower-math-divide": buildScript({
    teacherLead: "除法到了下册，会遇到分不完的情况，这就是有余数。",
    conceptText: "除法口算先练顺，再理解为什么有时还会剩下一点点。",
    whyText: "把余数想明白，后面的生活题会更容易转过来。",
    exampleLabel: "分完了吗",
    examplePrompt: "先分一分，再看看是不是还能继续平均分下去。",
    exampleExplanation: "剩下的那一点点，就是余数在提醒你。",
    pitfalls: ["把余数也继续平均分。", "只会口算，不懂剩下是什么意思。", "题目里有余数却忘了写。"],
    memoryText: "除法进阶口令: 先平均分, 再看剩多少。",
    memorySequence: ["先平均分", "再看剩多少", "写完整"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先口算", text: "基础除法先算顺，脑袋别打结。", badge: "会口算" },
      { title: "第 2 步 看余数", text: "分到不能再分时，看看还剩多少。", badge: "看余数" },
      { title: "第 3 步 说意思", text: "把“商”和“余数”各表示什么讲清楚。", badge: "会解释" }
    )
  }),
  "g3-lower-math-fraction": buildScript({
    teacherLead: "把一个整体分一分，就会遇到分数；图形铺一铺，就会遇到面积。",
    conceptText: "分数在看整体分成几份，面积在看图形占了多大地方。",
    whyText: "这两个新朋友会让你看数学的眼睛更细一点。",
    exampleLabel: "分一分",
    examplePrompt: "先想整体被分成了几份，再看自己拿到了其中几份。",
    exampleExplanation: "会看整体和部分，分数就不难；会看铺满，面积也不乱。",
    pitfalls: ["只看分到几份，不看整体。", "周长和面积混在一起。", "图形占地大小看不出来。"],
    memoryText: "分数面积口令: 先看整体, 再看部分, 别和周长混。",
    memorySequence: ["看整体", "看部分", "别混周长"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看整体", text: "先看看一整个被分成了几份。", badge: "看整体" },
      { title: "第 2 步 看其中几份", text: "再看取了其中几份，这就是分数。", badge: "会分数" },
      { title: "第 3 步 看占多大", text: "图形占了多少地方，就是面积在说话。", badge: "会面积" }
    )
  }),
  "g3-lower-math-data": buildScript({
    teacherLead: "数字不只是算出来，还能排规律、整数据、帮我们做判断。",
    conceptText: "看规律时要一项一项看，做情景题时要把信息先整理清楚。",
    whyText: "会整理和会观察，综合题才不容易乱。",
    exampleLabel: "找规律",
    examplePrompt: "先看数字是加了多少、乘了多少，还是在重复排队。",
    exampleExplanation: "规律找得准，后面的数就更好猜。",
    pitfalls: ["只看前两个数就下结论。", "情景信息太多时不知道先看什么。", "数据整理完不会说结果。"],
    memoryText: "规律数据口令: 先观察, 再整理, 最后判断。",
    memorySequence: ["先观察", "再整理", "最后判断"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先观察", text: "看看数字和信息有没有重复、增加或减少的规律。", badge: "先观察" },
      { title: "第 2 步 再整理", text: "把有用的信息放到一起。", badge: "会整理" },
      { title: "第 3 步 做判断", text: "根据整理后的线索说出结果。", badge: "会判断" }
    )
  }),
  "g3-lower-math-mixed": buildScript({
    teacherLead: "乘法和除法开始一起出现时，更要先想关系再计算。",
    conceptText: "看到生活题时，要先判断是求几倍、平均分，还是先乘后除。",
    whyText: "会看关系，混合问题才不会一步就走偏。",
    exampleLabel: "先判断",
    examplePrompt: "先说题里是谁和谁在比较，再决定用乘法还是除法。",
    exampleExplanation: "关系说清楚了，算式才会更准确。",
    pitfalls: ["一看到数字就随便乘除。", "会算却不会说为什么。", "题里关系一多就慌。"],
    memoryText: "混合问题口令: 先看关系, 再选方法, 最后算。",
    memorySequence: ["看关系", "选方法", "最后算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看关系", text: "先找出题里在比较什么、怎么分。", badge: "看关系" },
      { title: "第 2 步 选方法", text: "想清楚该用乘法还是除法。", badge: "选方法" },
      { title: "第 3 步 再计算", text: "方法选对了，再稳稳算出结果。", badge: "会解决" }
    )
  }),
  "g3-lower-english-family": buildScript({
    teacherLead: "英语下册会带你认识更多身边的人、动物和常见物品。",
    conceptText: "学词义时要把英语单词和图片、场景一起记住。",
    whyText: "词汇越熟，听懂句子和对话就越轻松。",
    exampleLabel: "认一认",
    examplePrompt: "先看图，再想这个人、动物或物品英语怎么说。",
    exampleExplanation: "把词和画面绑在一起，记得更牢。",
    pitfalls: ["只背中文。", "单词长一点就不愿意读。", "看图会选，离开图就不会。"],
    memoryText: "词汇小口令: 先看图, 再认词, 最后读出来。",
    memorySequence: ["先看图", "再认词", "读出来"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 先看图", text: "先看清图片里是谁、是什么。", badge: "看图" },
      { title: "第 2 步 配单词", text: "把英语单词和它配起来。", badge: "会配词" },
      { title: "第 3 步 放句里", text: "再看看它放进简单句里是什么意思。", badge: "会句意" }
    )
  }),
  "g3-lower-english-scene": buildScript({
    teacherLead: "位置、喜好和选择题，会让英语更像真实对话。",
    conceptText: "听懂场景里在问什么，才能选对句子和短语。",
    whyText: "会看情境，英语就不会只剩背单词。",
    exampleLabel: "看场景",
    examplePrompt: "先看图和对话，再想这时候最适合说哪一句。",
    exampleExplanation: "场景看准了，句子就不容易选错。",
    pitfalls: ["只盯一句，不看前后情境。", "位置词和喜好表达混淆。", "短语会认不会用。"],
    memoryText: "情景口令: 先看图, 再想意思, 最后选句子。",
    memorySequence: ["先看图", "再想意思", "选句子"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看图听意", text: "先看清人物在做什么、说什么。", badge: "看情景" },
      { title: "第 2 步 认短语", text: "把常见短语和动作位置连起来。", badge: "认短语" },
      { title: "第 3 步 选句子", text: "最后选出最符合场景的一句。", badge: "会选择" }
    )
  }),
  "g3-lower-english-time": buildScript({
    teacherLead: "数字和时间会继续出现，让英语和日常安排连得更紧。",
    conceptText: "看到数字和时间词时，要能把它们放进每天的事情里理解。",
    whyText: "会看数字时间，很多简单英语句子都会更容易懂。",
    exampleLabel: "连生活",
    examplePrompt: "先认清数字或时间，再想它在生活里像哪件事。",
    exampleExplanation: "英语和生活连在一起，就会更好记。",
    pitfalls: ["数字读得快，却不知道句子在说什么。", "时间词总混。", "会认不会放进场景。"],
    memoryText: "时间词口令: 先认数字, 再认时间, 最后连生活。",
    memorySequence: ["认数字", "认时间", "连生活"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 认数字", text: "先把数字和数量认清楚。", badge: "认数字" },
      { title: "第 2 步 认时间", text: "再看看句子里是在说早上、晚上，还是几点钟。", badge: "认时间" },
      { title: "第 3 步 放日常", text: "把它放进每天的安排里理解。", badge: "会日常表达" }
    )
  }),
  "g3-lower-english-read": buildScript({
    teacherLead: "代词和句子理解继续往前走，英语小阅读也开始冒头了。",
    conceptText: "读英语句子时，要先看主角，再看动作，最后猜整句意思。",
    whyText: "会看代词和句意，读英语就不会只靠一个词猜答案。",
    exampleLabel: "找主角",
    examplePrompt: "先看看 he、she、it 指的是谁，再想句子在说什么。",
    exampleExplanation: "找到主角，句子意思就会亮起来。",
    pitfalls: ["代词总找不到对应的人或物。", "只看熟单词就猜句意。", "句子一长就不敢读。"],
    memoryText: "英语阅读口令: 先找主角, 再看动作, 最后想整句。",
    memorySequence: ["找主角", "看动作", "想整句"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找主角", text: "先找句子里在说谁。", badge: "找主角" },
      { title: "第 2 步 看动作", text: "再看看主角在做什么。", badge: "看动作" },
      { title: "第 3 步 想整句", text: "把主角和动作连起来，整句意思就出来了。", badge: "会理解" }
    )
  })
});
