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

export const HENAN_GRADE_FIVE_LESSON_SCRIPTS = Object.freeze({
  "g5-upper-chinese-words": buildScript({
    teacherLead: "五年级的词语开始更讲究分寸，不能只觉得差不多，还要看它放进句子里合不合适。",
    conceptText: "近义词和成语看着像朋友，可语气、范围和使用场合常常并不完全一样。",
    whyText: "词义辨得准，阅读更容易抓重点，写作时也不容易词不达意。",
    exampleLabel: "放回句子",
    examplePrompt: "看到两个意思相近的词时，先把它们分别放回原句，看哪个更贴题、更顺。",
    exampleExplanation: "先看语境，再选词，词语的小差别才会慢慢亮出来。",
    pitfalls: ["只看词面相似，不看句子到底在表达什么。", "成语会背意思，却不会用在合适场景。", "近义词一律当成完全一样。"],
    memoryText: "词语小口令: 先回语境, 再比差别, 最后选合适。",
    memorySequence: ["回语境", "比差别", "选合适"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 回语境", text: "先看这句话到底在写谁、写什么事。", badge: "回语境" },
      { title: "第 2 步 比差别", text: "再比较几个词在语气和范围上有没有细小不同。", badge: "比差别" },
      { title: "第 3 步 选合适", text: "最后选一个放进去最顺、最准的表达。", badge: "会选词" }
    )
  }),
  "g5-upper-chinese-reading": buildScript({
    teacherLead: "五年级阅读不只看单句了，要开始看句子和段落是怎么前后接力的。",
    conceptText: "段落关系、说明信息和中心句，都是在帮我们把整篇文章的结构看清楚。",
    whyText: "会看关系、会提信息，说明文和一般阅读都会更容易读顺。",
    exampleLabel: "理一理",
    examplePrompt: "读完一段后，先想这段主要讲什么，再看它和前后段是在补充、举例，还是转折。",
    exampleExplanation: "先理关系，再抓重点，文章就不会只剩零散内容。",
    pitfalls: ["只记住几个信息点，不看整段关系。", "把细节当重点，忽略中心句。", "会摘抄句子，不会概括段意。"],
    memoryText: "阅读小口令: 先找重点, 再理关系, 最后说大意。",
    memorySequence: ["找重点", "理关系", "说大意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找重点", text: "先看看哪一句最能代表这一段的主要意思。", badge: "找重点" },
      { title: "第 2 步 理关系", text: "再看这段和前后内容是在怎样连接。", badge: "理关系" },
      { title: "第 3 步 说大意", text: "最后用自己的话把这一段讲完整。", badge: "说大意" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先找重点句。最能代表这一段意思的那一句，通常就在带路。",
      "step-2": "第二步，理清前后关系。看看这段是在补充、举例，还是转折推进。",
      "step-3": "第三步，用自己的话说大意。不要只摘句子，要把意思讲完整。",
      example: "跟我理一理。读完一段，先找重点，再看关系，最后说出这一段在讲什么。",
      memory: "记住五年级阅读小口令。先找重点，再理关系，最后说大意。"
    })
  }),
  "g5-upper-chinese-culture": buildScript({
    teacherLead: "古诗文到了五年级，已经不只是背，还要会借景、借事、借句子去体会表达方法。",
    conceptText: "诗句含义、传统文化和表达方法，常常是一起出现、互相支撑的。",
    whyText: "会看句意，也会看作者怎么表达，读诗文就不会只停在字面上。",
    exampleLabel: "想画面",
    examplePrompt: "读诗句时先想画面，再想作者是借景抒情、借事说理，还是在写自己的感受。",
    exampleExplanation: "画面和表达方法一连上，诗文就更容易读进去。",
    pitfalls: ["只会翻句子，不想它在表达什么感受。", "有文化线索却不会连到作品里。", "表达方法只记名字，不会说作用。"],
    memoryText: "诗文小口令: 先想画面, 再懂句意, 最后看表达。",
    memorySequence: ["想画面", "懂句意", "看表达"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 想画面", text: "先看看诗文里出现了哪些人、景和事情。", badge: "想画面" },
      { title: "第 2 步 懂句意", text: "再把关键句真正讲明白，不只停在背诵。", badge: "懂句意" },
      { title: "第 3 步 看表达", text: "最后想作者是怎样把感受写出来的。", badge: "看表达" }
    )
  }),
  "g5-upper-chinese-write": buildScript({
    teacherLead: "五年级记事作文更讲究顺序和重点，不是把事情全记下来就够了。",
    conceptText: "起因、经过、结果要站稳顺序，场面和细节要服务最重要的内容。",
    whyText: "会排顺序、抓重点，写出来的事情才更完整，也更有画面感。",
    exampleLabel: "先排骨架",
    examplePrompt: "动笔前先把事情的起因、经过、结果排出来，再挑一个最值得细写的场面。",
    exampleExplanation: "顺序一稳，细节才知道该往哪里落。",
    pitfalls: ["写了很多经过，却没突出重点。", "事情先后顺序乱，读的人跟不上。", "场面描写热闹，但和主题没连上。"],
    memoryText: "记事小口令: 先排顺序, 再抓重点, 最后写细节。",
    memorySequence: ["排顺序", "抓重点", "写细节"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 排顺序", text: "先确定事情从哪里开始，后来又怎样发展。", badge: "排顺序" },
      { title: "第 2 步 抓重点", text: "再选最能说明主题的那个场面来展开。", badge: "抓重点" },
      { title: "第 3 步 写细节", text: "最后把动作、语言和感受写具体。", badge: "写细节" }
    )
  }),
  "g5-upper-math-decimal": buildScript({
    teacherLead: "小数到了五年级，已经不只是会认，还要会拿它去比较、计算和放进单位里理解。",
    conceptText: "小数点的位置、数位关系和单位意义，会一起决定这个数到底在表示多少。",
    whyText: "把小数意义看清楚，小数大小比较和加减运算就不会只靠机械规则。",
    exampleLabel: "先看数位",
    examplePrompt: "做题前先看看小数点左右各是什么位，再判断它和单位、大小有什么关系。",
    exampleExplanation: "先把数位理清，小数就不会像一串挤在一起的数字。",
    pitfalls: ["只看数字个数，不看小数点位置。", "比较大小时忽略相同数位先比。", "会算加减，却不知道结果大概落在哪儿。"],
    memoryText: "小数口令: 先看数位, 再懂大小, 最后做运算。",
    memorySequence: ["看数位", "懂大小", "做运算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看数位", text: "先把小数点左右的数位看清楚。", badge: "看数位" },
      { title: "第 2 步 懂大小", text: "再比较每一位的大小，判断谁更大。", badge: "懂大小" },
      { title: "第 3 步 做运算", text: "最后按小数点对齐去完成加减。", badge: "做运算" }
    )
  }),
  "g5-upper-math-number": buildScript({
    teacherLead: "因数和倍数这部分，关键是看数和数之间的关系，不是单独盯着某一个数字。",
    conceptText: "因数、倍数、奇偶性和质合数，都是在提醒我们数字之间有规律可循。",
    whyText: "会看数的关系，后面的分数、方程和综合题都会更容易转过弯来。",
    exampleLabel: "找关系",
    examplePrompt: "看到两个数时，先想谁能整除谁，再看它们在奇偶、倍数特征上有没有明显线索。",
    exampleExplanation: "先找关系，数字就不只是一个个孤零零地站着。",
    pitfalls: ["把因数和倍数方向说反。", "倍数特征只会背，不会判断。", "质数合数只记定义，不会拿具体数字去分。"],
    memoryText: "数的规律口令: 先看整除, 再看特征, 最后做判断。",
    memorySequence: ["看整除", "看特征", "做判断"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看整除", text: "先判断这两个数能不能整除、怎么整除。", badge: "看整除" },
      { title: "第 2 步 看特征", text: "再找奇偶性和倍数特征这些线索。", badge: "看特征" },
      { title: "第 3 步 做判断", text: "最后说清它们属于哪种数的关系。", badge: "做判断" }
    )
  }),
  "g5-upper-math-area": buildScript({
    teacherLead: "面积题到了五年级，要学会先看图形特点，再想该拆还是该拼。",
    conceptText: "平行四边形、三角形、梯形和组合图形的面积，都在告诉我们图形可以转化着看。",
    whyText: "会看图、会拆分，面积题就不容易一看到复杂图形就发懵。",
    exampleLabel: "先拆图",
    examplePrompt: "看到图形时先认清它是什么，再想能不能拆成熟悉的几块，或者转化成熟悉图形。",
    exampleExplanation: "先把图拆顺，公式和算式才会自然出现。",
    pitfalls: ["只盯公式，不看图形特点。", "组合图形不会拆，直接乱套公式。", "底和高经常找错，尤其换个方向就不敢认。"],
    memoryText: "面积口令: 先认图, 再拆分, 最后列式算。",
    memorySequence: ["认图", "拆分", "列式算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 认图", text: "先判断这块图形是熟悉图还是组合图。", badge: "认图" },
      { title: "第 2 步 拆分", text: "再想它能拆成哪些会算面积的小图形。", badge: "拆分" },
      { title: "第 3 步 列式算", text: "最后把各部分面积算出来并合并。", badge: "列式算" }
    )
  }),
  "g5-upper-math-equation": buildScript({
    teacherLead: "简易方程这一站，不是见到 x 就怕，而是先把未知量和等量关系说清楚。",
    conceptText: "用字母表示数、等式性质和解方程，都是在帮我们把数量关系写得更清楚。",
    whyText: "会列方程、会解方程，情景题就不一定非要一格一格地猜。",
    exampleLabel: "先写关系",
    examplePrompt: "看题时先找谁是未知量，再想题里哪两个部分是相等的、可以用方程写出来。",
    exampleExplanation: "关系写清楚，解方程就不会只剩算步骤。",
    pitfalls: ["只会移来移去，不懂方程在表示什么。", "未知量找错，整题都跟着偏。", "等式左右关系没看稳就下笔。"],
    memoryText: "方程口令: 先找未知, 再写等量, 最后解检查。",
    memorySequence: ["找未知", "写等量", "解检查"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找未知", text: "先确定题目真正要求哪个量。", badge: "找未知" },
      { title: "第 2 步 写等量", text: "再把题里的相等关系用方程表示出来。", badge: "写等量" },
      { title: "第 3 步 解检查", text: "最后解出未知数并代回去检查。", badge: "解检查" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先找未知量。题目真正想问谁，就先把它盯住。",
      "step-2": "第二步，写出等量关系。看清哪两部分相等，再把关系写成方程。",
      "step-3": "第三步，解完要检查。把答案代回去，看看是不是和题意对上了。",
      example: "跟我列一列。先找未知，再写等量，最后解出来检查。",
      memory: "记住方程小口令。先找未知，再写等量，最后解检查。"
    })
  }),
  "g5-upper-english-dialogue": buildScript({
    teacherLead: "五年级英语对话要开始看完整场景，不是只看一句眼熟就选。",
    conceptText: "人物身份、问答目的和情景提示，都会影响一段对话里最合适的表达。",
    whyText: "会看场景和意图，句子选择就不容易只靠感觉。",
    exampleLabel: "先看场景",
    examplePrompt: "先判断是在介绍自己、打招呼还是问答交流，再看说话的人最可能要表达什么。",
    exampleExplanation: "场景一看准，对话就更容易顺着接下去。",
    pitfalls: ["只看熟词，不看说话场景。", "问句、答句经常接反。", "个人信息和日常交流放在一起就容易混。"],
    memoryText: "对话口令: 先看场景, 再判意图, 最后选句子。",
    memorySequence: ["看场景", "判意图", "选句子"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看场景", text: "先看对话发生在什么情境里。", badge: "看场景" },
      { title: "第 2 步 判意图", text: "再判断人物是在询问、回答还是介绍。", badge: "判意图" },
      { title: "第 3 步 选句子", text: "最后挑最合适的一句英语接上。", badge: "选句子" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先看场景。是在打招呼、介绍自己，还是在一问一答。",
      "step-2": "第二步，判断意图。说话的人是想询问、回答，还是补充信息。",
      "step-3": "第三步，选最合适的句子。场景和意图对上了，答案就更稳。",
      example: "跟我接一句。先认场景，再判意图，最后把最合适的英语接上去。",
      memory: "记住英语对话小口令。先看场景，再判意图，最后选句子。"
    })
  }),
  "g5-upper-english-words": buildScript({
    teacherLead: "学校和家庭词汇越多，越不能只背中文，要学会把词放回真实场景里。",
    conceptText: "人物、地点和物品词汇经常成组出现，只有放进句子和场景里才更容易记牢。",
    whyText: "词和场景绑在一起，句意理解才会更快、更稳。",
    exampleLabel: "连场景",
    examplePrompt: "看到一个词时，先想它更常出现在学校还是家庭，再看它和句子里哪个对象在连着。",
    exampleExplanation: "先把词放进生活场景，记忆就不容易散。",
    pitfalls: ["只背单个中文意思。", "词会认，放进句子里就不知道是谁。", "地点、人物、物品词总爱混在一起。"],
    memoryText: "词汇口令: 先分场景, 再找对象, 最后懂词义。",
    memorySequence: ["分场景", "找对象", "懂词义"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 分场景", text: "先判断这个词更像学校场景还是家庭场景。", badge: "分场景" },
      { title: "第 2 步 找对象", text: "再看看它在句子里和谁、什么连在一起。", badge: "找对象" },
      { title: "第 3 步 懂词义", text: "最后结合上下文确定它的意思。", badge: "懂词义" }
    )
  }),
  "g5-upper-english-time": buildScript({
    teacherLead: "时间和活动安排题，最重要的是把时间线和人物动作排清楚。",
    conceptText: "星期、时刻和活动顺序常常一起出现，得连起来看整句才不会乱。",
    whyText: "会看安排顺序，日常计划和场景对话就更容易理解。",
    exampleLabel: "排时间线",
    examplePrompt: "读题时先圈时间词，再看人物是在上学、运动还是做别的日常活动。",
    exampleExplanation: "时间线一理顺，句子的意思就更容易站稳。",
    pitfalls: ["只看活动，不看先后顺序。", "时间词看漏，整句就理解错。", "几个活动连在一起时容易混。"],
    memoryText: "时间口令: 先找时间, 再看活动, 最后懂安排。",
    memorySequence: ["找时间", "看活动", "懂安排"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找时间", text: "先把句子里的时间提示圈出来。", badge: "找时间" },
      { title: "第 2 步 看活动", text: "再看看人物具体要做什么活动。", badge: "看活动" },
      { title: "第 3 步 懂安排", text: "最后用一句话说清活动安排。", badge: "懂安排" }
    )
  }),
  "g5-upper-english-read": buildScript({
    teacherLead: "句型理解到了五年级，要开始学会抓主角、动作和关键词，不要一长就停。",
    conceptText: "固定句型和关键词，常常是看懂短句和小短文的最快线索。",
    whyText: "会抓句型骨架，阅读理解就不会只剩下猜词。",
    exampleLabel: "抓骨架",
    examplePrompt: "先找句子里的主角和动作，再看时间地点等关键词在提醒什么场景。",
    exampleExplanation: "骨架先找出来，整句的意思就更容易拼起来。",
    pitfalls: ["只看一个熟词，不看整句结构。", "句型一变就不敢判断。", "短文读完一句懂一点，连起来就断掉。"],
    memoryText: "阅读口令: 先抓主角, 再看动作, 最后想整句。",
    memorySequence: ["抓主角", "看动作", "想整句"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 抓主角", text: "先找句子里是谁在做事。", badge: "抓主角" },
      { title: "第 2 步 看动作", text: "再看他在做什么、发生了什么。", badge: "看动作" },
      { title: "第 3 步 想整句", text: "最后把整句的大概意思说出来。", badge: "想整句" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先抓主角。看看是谁在做事，不要一长句就先慌。",
      "step-2": "第二步，再看动作和关键词。谁做了什么，常常就是句子的骨架。",
      "step-3": "第三步，拼整句意思。骨架搭起来以后，再把时间地点这些线索补进去。",
      example: "跟我读一读。先找主角，再看动作，最后把整句意思连起来。",
      memory: "记住英语阅读小口令。先抓主角，再看动作，最后想整句。"
    })
  }),
  "g5-lower-chinese-words": buildScript({
    teacherLead: "下册的词句品味更讲究“味道”，同样一句话，换个词、换个修辞，感觉就会变。",
    conceptText: "感情色彩和修辞作用，会一起影响句子的语气、节奏和画面。",
    whyText: "会品词句，阅读时更容易体会情感，写作时也更会让句子活起来。",
    exampleLabel: "比一比",
    examplePrompt: "看到句子时先想这个词带来的感觉，再看看比喻、排比这些写法让句子哪里更亮。",
    exampleExplanation: "先感受，再分析，修辞和词语就不会变成死知识。",
    pitfalls: ["只会说“更生动”，说不清哪里更生动。", "词语带的情绪看不出来。", "修辞名称会背，却不会放回句子里体会。"],
    memoryText: "词句口令: 先想感觉, 再看写法, 最后说效果。",
    memorySequence: ["想感觉", "看写法", "说效果"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 想感觉", text: "先想这个词句让人读起来是什么感觉。", badge: "想感觉" },
      { title: "第 2 步 看写法", text: "再判断它是不是用了特别的修辞方式。", badge: "看写法" },
      { title: "第 3 步 说效果", text: "最后说清这种表达为什么更有力量。", badge: "说效果" }
    )
  }),
  "g5-lower-chinese-reading": buildScript({
    teacherLead: "人物阅读到了这里，要学会从语言、动作和事情里慢慢拼出人物特点。",
    conceptText: "人物特点和文章主题，往往不是直接写出来的，而是藏在多处信息里。",
    whyText: "会看人物线索，记叙文阅读和概括题都会更稳。",
    exampleLabel: "找线索",
    examplePrompt: "读文章时先找人物说了什么、做了什么，再想这些细节都在说明他怎样的人。",
    exampleExplanation: "人物线索一连起来，整篇文章就不再只是几个片段。",
    pitfalls: ["只看外表词语，不看具体行为。", "人物特点说得太空，没有依据。", "会概括内容，却连不到主题上。"],
    memoryText: "人物阅读口令: 先找细节, 再看特点, 最后连主题。",
    memorySequence: ["找细节", "看特点", "连主题"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找细节", text: "先把和人物有关的重要语言动作找出来。", badge: "找细节" },
      { title: "第 2 步 看特点", text: "再想这些细节在说明人物的什么特点。", badge: "看特点" },
      { title: "第 3 步 连主题", text: "最后把人物特点和文章主要意思连起来。", badge: "连主题" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先找人物细节。看看人物说了什么，做了什么，不要只记外表词。",
      "step-2": "第二步，看这些细节在说明什么特点。细节不是摆着看热闹的。",
      "step-3": "第三步，把人物特点连回文章主题。这样阅读才不会只剩零散片段。",
      example: "跟我找一找。先圈人物语言动作，再想这些细节一起在说明什么。",
      memory: "记住人物阅读小口令。先找细节，再看特点，最后连主题。"
    })
  }),
  "g5-lower-chinese-culture": buildScript({
    teacherLead: "古诗文这时更要学会把句意、背景和作者情感一起看，不然很容易只剩背诵。",
    conceptText: "诗句理解、文化背景和作者感受，常常是一条线上的不同部分。",
    whyText: "会连背景、懂句意，古诗文复习和阅读都会更扎实。",
    exampleLabel: "连一连",
    examplePrompt: "先读懂关键句，再想它和作者处境、文化背景之间是什么关系。",
    exampleExplanation: "背景一连上，诗句里的情感就更容易看出来。",
    pitfalls: ["只记诗句，不记背景。", "文言句意懂一点，却说不完整。", "情感体会总停在表面词语上。"],
    memoryText: "古诗文口令: 先懂句意, 再想背景, 最后说情感。",
    memorySequence: ["懂句意", "想背景", "说情感"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 懂句意", text: "先把诗文中的关键句真正讲清楚。", badge: "懂句意" },
      { title: "第 2 步 想背景", text: "再把它放回作者和作品背景里。", badge: "想背景" },
      { title: "第 3 步 说情感", text: "最后想这句诗文到底想传出什么感受。", badge: "说情感" }
    )
  }),
  "g5-lower-chinese-write": buildScript({
    teacherLead: "写人写景到了五年级，要开始学会让文章有层次，而不是想到什么写什么。",
    conceptText: "人物特点、写景顺序和表达条理，会一起决定文章是不是清楚、耐读。",
    whyText: "会安排层次，人物和景物才不会平平地摆在纸上。",
    exampleLabel: "先定顺序",
    examplePrompt: "动笔前先想人物最值得写的特点是什么，景物又该按什么顺序展开。",
    exampleExplanation: "顺序一清楚，内容才知道怎么一层层往前走。",
    pitfalls: ["人物特点说得笼统，没有具体细节。", "写景顺序乱，画面东一块西一块。", "条理有了，但重点还是不突出。"],
    memoryText: "写作口令: 先定顺序, 再抓重点, 最后稳层次。",
    memorySequence: ["定顺序", "抓重点", "稳层次"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 定顺序", text: "先想人物或景物该从哪里写起。", badge: "定顺序" },
      { title: "第 2 步 抓重点", text: "再挑最能说明特点的内容重点写。", badge: "抓重点" },
      { title: "第 3 步 稳层次", text: "最后让开头、中间、结尾都有清楚层次。", badge: "稳层次" }
    )
  }),
  "g5-lower-math-fraction": buildScript({
    teacherLead: "分数这一站最重要的是先把单位“1”找对，不然后面比较大小都会摇晃。",
    conceptText: "分数意义、分数单位和真假分数，都是在告诉我们部分和整体怎样连在一起。",
    whyText: "会看单位“1”、会比较大小，分数就不再只是图上涂几块。",
    exampleLabel: "先找整体",
    examplePrompt: "做题时先想谁被平均分了，再看每份是几分之一，整体里一共有多少份。",
    exampleExplanation: "整体一找稳，分数的样子和大小就更容易看明白。",
    pitfalls: ["只看分子分母，不想整体。", "比较大小时只凭数字大就猜。", "真分数和假分数概念总混。"],
    memoryText: "分数口令: 先找整体, 再看每份, 最后比大小。",
    memorySequence: ["找整体", "看每份", "比大小"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找整体", text: "先确定题里谁被当成了整体。", badge: "找整体" },
      { title: "第 2 步 看每份", text: "再看这个整体被平均分成了几份。", badge: "看每份" },
      { title: "第 3 步 比大小", text: "最后结合整体和份数去判断分数大小。", badge: "比大小" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先找整体。谁被当成单位一，分数就先从谁开始看。",
      "step-2": "第二步，看每一份。平均分成几份，每份就有多重要。",
      "step-3": "第三步，再比大小。分数大小不能只看数字，要连着整体一起看。",
      example: "跟我分一分。先找整体，再看每份，最后判断这个分数表示多少。",
      memory: "记住分数小口令。先找整体，再看每份，最后比大小。"
    })
  }),
  "g5-lower-math-fraction-calc": buildScript({
    teacherLead: "通分约分和分数加减，关键不是步骤多，而是先看清分数之间能不能直接比、直接算。",
    conceptText: "约分是在把同样的关系变简单，通分是在把不同的分母先变到同一把尺子上。",
    whyText: "会约分通分，分数运算就不会像在乱改数字。",
    exampleLabel: "先统一尺子",
    examplePrompt: "做分数加减前先看分母一样不一样，不一样时先找最合适的公分母。",
    exampleExplanation: "先把尺子统一，分数之间才真的能加、能减。",
    pitfalls: ["一上来就算，不先看分母。", "通分约分步骤会写，但不懂为什么。", "结果能再约分却忘了检查。"],
    memoryText: "分数运算口令: 先看分母, 再做通约, 最后算检查。",
    memorySequence: ["看分母", "做通约", "算检查"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看分母", text: "先判断这些分数能不能直接相加减。", badge: "看分母" },
      { title: "第 2 步 做通约", text: "再按需要通分或约分，让关系更清楚。", badge: "做通约" },
      { title: "第 3 步 算检查", text: "最后完成运算并看看结果还能不能再化简。", badge: "算检查" }
    )
  }),
  "g5-lower-math-solid": buildScript({
    teacherLead: "长方体正方体这部分，要学会真正把图形想成立体的，不只是记几个名字。",
    conceptText: "面、棱、顶点、表面积和体积，都是在帮我们理解空间里的图形关系。",
    whyText: "会看立体图形结构，后面的体积和生活空间题就会更好下手。",
    exampleLabel: "先认结构",
    examplePrompt: "看到图形时先说出有哪些面、棱和顶点，再判断题目是在问外面还是里面。",
    exampleExplanation: "结构先看清，表面积和体积就不容易混。",
    pitfalls: ["把表面积和体积当成同一回事。", "长方体和正方体特征说不全。", "题目一换成生活场景就不知道在问什么。"],
    memoryText: "立体图形口令: 先认结构, 再判所求, 最后列式。",
    memorySequence: ["认结构", "判所求", "列式"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 认结构", text: "先把这个立体图形的面、棱和顶点找出来。", badge: "认结构" },
      { title: "第 2 步 判所求", text: "再判断题目是在问表面还是占多大空间。", badge: "判所求" },
      { title: "第 3 步 列式", text: "最后根据结构关系写出算式。", badge: "列式" }
    )
  }),
  "g5-lower-math-data": buildScript({
    teacherLead: "统计和可能性这部分，数字已经开始讲故事了，不能只盯着算结果。",
    conceptText: "折线统计图、平均数和可能性，都在帮我们看数据背后的变化和趋势。",
    whyText: "会看数据关系，图表题和情景题就不容易只看表面高低。",
    exampleLabel: "先看变化",
    examplePrompt: "读图表时先看数据是上升还是下降，再想平均数和可能性分别在描述什么。",
    exampleExplanation: "先看变化和意义，数据就不只是几串数字。",
    pitfalls: ["统计图只看最高最低，不看整体趋势。", "平均数会算，却不知道它在表示什么。", "可能性题只靠感觉，不看条件。"],
    memoryText: "数据口令: 先看变化, 再想意义, 最后做判断。",
    memorySequence: ["看变化", "想意义", "做判断"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看变化", text: "先观察图里的数据是怎样变化的。", badge: "看变化" },
      { title: "第 2 步 想意义", text: "再想平均数或可能性在这题里表示什么。", badge: "想意义" },
      { title: "第 3 步 做判断", text: "最后结合数据完整地说出结论。", badge: "做判断" }
    )
  }),
  "g5-lower-english-scene": buildScript({
    teacherLead: "节日、天气和旅行场景一放在一起，英语就更像真实生活了，要学会看完整语境。",
    conceptText: "场景词、天气词和人物活动，会一起提醒我们句子最可能在说什么。",
    whyText: "会拼语境，情景对话和句子选择就不会只靠某个熟词去猜。",
    exampleLabel: "拼场景",
    examplePrompt: "先看天气和节日线索，再看人物准备做什么活动，最后判断最合适的表达。",
    exampleExplanation: "场景先拼完整，句子才知道该往哪边选。",
    pitfalls: ["只看节日词，不看后面的活动。", "天气和出行场景一混就容易乱。", "前后句不连着看，只凭一个词判断。"],
    memoryText: "场景口令: 先拼语境, 再看活动, 最后选句。",
    memorySequence: ["拼语境", "看活动", "选句"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 拼语境", text: "先把天气、节日和地点这些提示连起来。", badge: "拼语境" },
      { title: "第 2 步 看活动", text: "再看看人物在这种场景里会做什么。", badge: "看活动" },
      { title: "第 3 步 选句", text: "最后挑最适合这个场景的一句英语。", badge: "选句" }
    )
  }),
  "g5-lower-english-place": buildScript({
    teacherLead: "位置路线题不能只背位置词，要会把人物走的路线在脑子里真正走一遍。",
    conceptText: "公共场所、方向短语和路线关系，常常要一起看才知道句子真正想表达什么。",
    whyText: "会看路线和位置，问路指路题就会稳很多。",
    exampleLabel: "走一遍",
    examplePrompt: "读句子时先想人物现在在哪儿、要去哪里，再看 left、near、behind 这些线索。",
    exampleExplanation: "路线先在脑中走顺，方向和地点关系才不容易错。",
    pitfalls: ["只认位置词，不管人物行动。", "问路句和指路句总混。", "公共场所一多就抓不到重点。"],
    memoryText: "路线口令: 先定位置, 再看方向, 最后懂路线。",
    memorySequence: ["定位置", "看方向", "懂路线"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 定位置", text: "先确定人物现在所在的位置。", badge: "定位置" },
      { title: "第 2 步 看方向", text: "再读清短语里给出的方向线索。", badge: "看方向" },
      { title: "第 3 步 懂路线", text: "最后把整条路线或地点关系说出来。", badge: "懂路线" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先定位置。人物现在在哪儿，要去哪里，这两个点要先站稳。",
      "step-2": "第二步，看方向词。left、near、behind 这些词都在给路线带路。",
      "step-3": "第三步，说清路线。脑子里先走一遍，句意就不容易弄反。",
      example: "跟我走一走。先找起点和终点，再顺着方向词把路线理出来。",
      memory: "记住路线英语小口令。先定位置，再看方向，最后懂路线。"
    })
  }),
  "g5-lower-english-health": buildScript({
    teacherLead: "健康饮食题要先看说话人的态度，是在建议、提醒，还是单纯说明习惯。",
    conceptText: "食物词汇和建议句型常常连在一起，得看整句功能而不是只认单词。",
    whyText: "会判语气和功能，健康表达就不容易和普通陈述句混在一起。",
    exampleLabel: "看语气",
    examplePrompt: "先找 should、healthy、too much 这些词，再判断句子是在建议别人做什么。",
    exampleExplanation: "语气一看清，句子的作用就更明确。",
    pitfalls: ["只认食物词，不看建议语气。", "建议句和一般陈述句常混。", "换个说法就不知道还是在讲健康建议。"],
    memoryText: "建议口令: 先看语气, 再懂功能, 最后判句意。",
    memorySequence: ["看语气", "懂功能", "判句意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看语气", text: "先找句子里表示建议和提醒的词。", badge: "看语气" },
      { title: "第 2 步 懂功能", text: "再判断这句话是在建议、提醒还是介绍习惯。", badge: "懂功能" },
      { title: "第 3 步 判句意", text: "最后结合场景说清整句想表达什么。", badge: "判句意" }
    )
  }),
  "g5-lower-english-read": buildScript({
    teacherLead: "短文理解到了这里，要开始学会先抓关键词，再看整段大意，不要一题一题地各猜各的。",
    conceptText: "短文主线、关键词和句型替换，常常会一起出现，带着我们把内容看完整。",
    whyText: "会抓主线和关键词，阅读理解和简单写话都会更有方向。",
    exampleLabel: "抓主线",
    examplePrompt: "先找短文里反复出现的人、物和动作，再看整段最想告诉我们什么。",
    exampleExplanation: "主线一抓稳，细节题和句型替换都更容易判断。",
    pitfalls: ["只抓一个词就猜整段意思。", "会读单句，不会概括整段。", "句型替换只会换词，不懂整体意思。"],
    memoryText: "短文口令: 先抓主线, 再看细节, 最后说大意。",
    memorySequence: ["抓主线", "看细节", "说大意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 抓主线", text: "先找短文一直在讲的人和事情。", badge: "抓主线" },
      { title: "第 2 步 看细节", text: "再回到题目要的细节句去核对。", badge: "看细节" },
      { title: "第 3 步 说大意", text: "最后用自己的话说短文主要讲什么。", badge: "说大意" }
    )
  })
});
