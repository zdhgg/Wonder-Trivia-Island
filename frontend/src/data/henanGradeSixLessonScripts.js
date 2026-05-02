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

export const HENAN_GRADE_SIX_LESSON_SCRIPTS = Object.freeze({
  "g6-upper-chinese-words": buildScript({
    teacherLead: "六年级的词句品味，已经不只是知道意思，更要看出作者为什么偏偏这样写。",
    conceptText: "一个词、一种句式、一个修辞，都会让语气、画面和情感发生细小变化。",
    whyText: "会品词句，阅读时更容易抓住表达重点，自己写作时也更会选词造句。",
    exampleLabel: "放回语境",
    examplePrompt: "看到句子时，先别急着说修辞名字，先想换个说法后语气和力量会不会变。",
    exampleExplanation: "先比较表达效果，再说术语，词句的味道会更清楚。",
    pitfalls: ["只背修辞名称，不体会它在句子里的作用。", "看词语只看字面，不看前后语境。", "会说“更生动”，却说不清到底生动在哪里。"],
    memoryText: "词句小口令: 先回语境, 再看变化, 最后说作用。",
    memorySequence: ["回语境", "看变化", "说作用"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 回语境", text: "先看这个词句放在谁、什么事、什么情感里。", badge: "回语境" },
      { title: "第 2 步 看变化", text: "再想如果换个普通说法，语气和画面会有什么不同。", badge: "看变化" },
      { title: "第 3 步 说作用", text: "最后把表达效果用完整的话说清楚。", badge: "说作用" }
    )
  }),
  "g6-upper-chinese-reading": buildScript({
    teacherLead: "六年级阅读更像在搭框架，不只要读懂内容，还要看出文章怎么组织想法。",
    conceptText: "中心意思、段落关系和作者观点，往往藏在结构和关键词的安排里。",
    whyText: "会概括和提观点，长一点的文章也不会读完只剩零散细节。",
    exampleLabel: "搭框架",
    examplePrompt: "读完一段后，先说这段主要讲什么，再看它和前后段是并列、递进还是转折。",
    exampleExplanation: "先理结构，再抓观点，文章主线就不会散掉。",
    pitfalls: ["只摘原句，不会用自己的话概括。", "看到了细节，却没看出作者想表达什么。", "段落关系靠感觉猜，不找连接线索。"],
    memoryText: "阅读小口令: 先抓主线, 再理关系, 最后说观点。",
    memorySequence: ["抓主线", "理关系", "说观点"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 抓主线", text: "先概括每一段在讲什么，别让信息散开。", badge: "抓主线" },
      { title: "第 2 步 理关系", text: "再看段落之间是在补充、转折，还是层层推进。", badge: "理关系" },
      { title: "第 3 步 说观点", text: "最后用一句完整的话说出文章或作者的主要想法。", badge: "说观点" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先抓主线。每一段在讲什么，要先排成一条清楚的线。",
      "step-2": "第二步，理清关系。看看段落是在补充、转折，还是一层一层往前推。",
      "step-3": "第三步，说出观点。文章最想告诉我们的意思，要敢用完整的话讲出来。",
      example: "跟我搭框架。先概括段意，再看关系，最后说出作者的主要想法。",
      memory: "记住六年级阅读小口令。先抓主线，再理关系，最后说观点。"
    })
  }),
  "g6-upper-chinese-culture": buildScript({
    teacherLead: "古诗文到了六年级，更重要的是借提示走进去，而不是只停在背诵表面。",
    conceptText: "注释、背景、关键词和情感线索，会一起帮我们理解诗文句意和文化意味。",
    whyText: "会借助线索理解诗文，复习时就不是死记，而是真正能读懂。",
    exampleLabel: "借线索",
    examplePrompt: "读诗文时，先看题目和注释，再想作者在什么情境里写下这些句子。",
    exampleExplanation: "先把情境找出来，句意和情感才更容易连起来。",
    pitfalls: ["只会翻成白话，却说不出情感和意味。", "有注释不看，直接凭印象猜。", "背景、人物、作品内容完全分开记。"],
    memoryText: "诗文小口令: 先看提示, 再想情境, 最后说情感。",
    memorySequence: ["看提示", "想情境", "说情感"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看提示", text: "先把题目、注释和背景里的关键信息找出来。", badge: "看提示" },
      { title: "第 2 步 想情境", text: "再想作者当时看见了什么、经历了什么。", badge: "想情境" },
      { title: "第 3 步 说情感", text: "最后把诗文要表达的感受或意味讲清楚。", badge: "说情感" }
    )
  }),
  "g6-upper-chinese-write": buildScript({
    teacherLead: "六年级习作更讲究谋篇，不是把材料堆上去，而是要知道怎么安排重点。",
    conceptText: "结构、顺序和观点会一起决定文章站不站得住，也决定读的人能不能一下看明白。",
    whyText: "会安排结构、突出重点，毕业阶段的写人写事写景才会更完整、更有力量。",
    exampleLabel: "先列骨架",
    examplePrompt: "动笔前先想开头想立什么意，中间重点写哪一层，结尾怎么收住。",
    exampleExplanation: "先把骨架搭好，细节才知道该往哪里放。",
    pitfalls: ["材料很多，却没有明确重点。", "结构松散，想到哪写到哪。", "观点想说很多，结果一层也没说透。"],
    memoryText: "习作小口令: 先定中心, 再排结构, 最后写重点。",
    memorySequence: ["定中心", "排结构", "写重点"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 定中心", text: "先想这篇文章最想让别人记住什么。", badge: "定中心" },
      { title: "第 2 步 排结构", text: "再把开头、中间、结尾的大致顺序排出来。", badge: "排结构" },
      { title: "第 3 步 写重点", text: "最后把最能撑住中心的细节写透。", badge: "写重点" }
    )
  }),
  "g6-upper-math-fraction": buildScript({
    teacherLead: "分数乘法到了六年级，关键不是硬算，而是先看懂“求谁的几分之几”。",
    conceptText: "分数乘法常常在表达部分与整体、倍数与对应量之间的关系。",
    whyText: "会先说关系，再计算，分数应用题就不会一看到数字就乱乘。",
    exampleLabel: "先说关系",
    examplePrompt: "做题前先说清楚: 谁是单位“1”，要求的是哪一部分，还是在比较两个量。",
    exampleExplanation: "关系先理顺，算式才会自然长出来。",
    pitfalls: ["见到分数就直接乘，不判断关系。", "单位“1”总是找错。", "算完有结果，却说不清为什么这样列式。"],
    memoryText: "分数乘法口令: 先找单位一, 再看关系, 最后列式算。",
    memorySequence: ["找单位一", "看关系", "列式算"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找单位一", text: "先找题里把谁当成整体或基准量。", badge: "找单位一" },
      { title: "第 2 步 看关系", text: "再判断是在求几分之几，还是在比较对应量。", badge: "看关系" },
      { title: "第 3 步 列式算", text: "最后按关系把分数乘法写出来并检查。", badge: "列式算" }
    )
  }),
  "g6-upper-math-circle": buildScript({
    teacherLead: "圆这一站不能只记公式，更要知道半径、直径、周长和面积是怎么连起来的。",
    conceptText: "圆的特征和公式都在提醒我们: 图形背后有稳定的关系，不是凭空记住一个答案。",
    whyText: "把图形关系弄明白，后面遇到组合图形和实际问题才不会乱套公式。",
    exampleLabel: "先看关系",
    examplePrompt: "做题前先看已知的是半径、直径还是周长，再决定下一步该用哪个关系。",
    exampleExplanation: "先认关系，再用公式，图形题会更稳。",
    pitfalls: ["只背公式，不看已知条件在说什么。", "半径和直径经常混。", "周长题、面积题一紧张就套错。"],
    memoryText: "圆形口令: 先认条件, 再想关系, 最后用公式。",
    memorySequence: ["认条件", "想关系", "用公式"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 认条件", text: "先弄清题里给的是半径、直径还是别的量。", badge: "认条件" },
      { title: "第 2 步 想关系", text: "再把圆里的量怎样互相连接说出来。", badge: "想关系" },
      { title: "第 3 步 用公式", text: "最后选对周长或面积公式去计算。", badge: "用公式" }
    )
  }),
  "g6-upper-math-percent": buildScript({
    teacherLead: "百分数最容易让人只看见“%”，其实它真正讲的是每一百份里有多少。",
    conceptText: "百分数和分数、小数可以互相转化，本质都是在描述同一类数量关系。",
    whyText: "会联系三种表示法，折扣、达标率、增长变化这些题就更容易想通。",
    exampleLabel: "先换语言",
    examplePrompt: "看到百分数时，先把它想成“每百份有多少”，再看能不能换成分数或小数帮助理解。",
    exampleExplanation: "先把意思看懂，互化和应用都不容易卡住。",
    pitfalls: ["只会机械互化，不理解百分数在表示什么。", "百分数应用题里分不清谁是比较基准。", "增长、减少一类题只盯结果不看原量。"],
    memoryText: "百分数口令: 先懂意思, 再做互化, 最后解应用。",
    memorySequence: ["懂意思", "做互化", "解应用"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 懂意思", text: "先把百分数翻成“每百份有多少”。", badge: "懂意思" },
      { title: "第 2 步 做互化", text: "再试着和分数、小数互相转换。", badge: "做互化" },
      { title: "第 3 步 解应用", text: "最后回到情境里看它在比较什么。", badge: "解应用" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先懂意思。百分数就是每一百份里有多少。",
      "step-2": "第二步，再做互化。把它和分数、小数换着看，关系会更清楚。",
      "step-3": "第三步，回到应用题。先看谁是基准，再看它在比较什么。",
      example: "跟我换一换。先说清百分数的意思，再试着把它换成别的表示法。",
      memory: "记住百分数小口令。先懂意思，再做互化，最后解应用。"
    })
  }),
  "g6-upper-math-ratio": buildScript({
    teacherLead: "比这部分真正难的，不是写出几个数字，而是看清谁和谁在比较。",
    conceptText: "比、比值和按比例分配，本质都在研究两个量之间怎样成组出现。",
    whyText: "会看比较关系，分配题和生活里的比例问题就更容易下手。",
    exampleLabel: "先找成组",
    examplePrompt: "看题时先找题里哪两个量是在一起比较，再想是求比、比值，还是按关系分配。",
    exampleExplanation: "先看到配对关系，列式就不会乱。",
    pitfalls: ["把比和除法符号混在一起，不理解意义。", "不知道哪两个量应该拿来比较。", "按比例分配时只顾平均分。"],
    memoryText: "比的口令: 先找两量, 再看关系, 最后按比分。",
    memorySequence: ["找两量", "看关系", "按比分"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找两量", text: "先把需要比较的两个量找出来。", badge: "找两量" },
      { title: "第 2 步 看关系", text: "再判断是在写比，还是在求比值或分配。", badge: "看关系" },
      { title: "第 3 步 按比分", text: "最后按照比表达的关系去列式。", badge: "按比分" }
    )
  }),
  "g6-upper-english-dialogue": buildScript({
    teacherLead: "六年级英语对话要先看人物关系和说话目的，不能只盯一个熟词就选。",
    conceptText: "问路、请求、邀请、回应这些表达，都会随着场景和身份一起变化。",
    whyText: "会判断交流意图，选句子时就不容易只靠眼熟去猜。",
    exampleLabel: "先看谁在说",
    examplePrompt: "先判断说话的人是什么关系、在什么场合，再看这句话是在询问、建议还是回应。",
    exampleExplanation: "场景和关系一看准，对话就更容易接上。",
    pitfalls: ["只认单词，不看说话情境。", "人物关系没看清，礼貌表达常选错。", "问句、答句和建议句总是混。"],
    memoryText: "对话口令: 先看关系, 再判目的, 最后选表达。",
    memorySequence: ["看关系", "判目的", "选表达"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看关系", text: "先看这是同学、老师还是陌生人之间的对话。", badge: "看关系" },
      { title: "第 2 步 判目的", text: "再判断这句话是在问、在答，还是在建议。", badge: "判目的" },
      { title: "第 3 步 选表达", text: "最后找最适合这个场景的一句英语。", badge: "选表达" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先看关系。是同学之间、老师和学生，还是陌生人之间在说话。",
      "step-2": "第二步，判断目的。对方是在询问、邀请，还是在回应别人。",
      "step-3": "第三步，选最合适的表达。关系和目的对上了，句子才会真正合适。",
      example: "跟我接对话。先认人物关系，再判交流目的，最后选一句最合适的英语。",
      memory: "记住英语对话小口令。先看关系，再判目的，最后选表达。"
    })
  }),
  "g6-upper-english-plan": buildScript({
    teacherLead: "计划和旅行安排题，最重要的是把时间、地点、活动顺序排清楚。",
    conceptText: "英语里的计划表达经常把时间词、活动词和场景信息放在一起。",
    whyText: "会读安排顺序，英语句意题和短文题都会更清晰。",
    exampleLabel: "排时间线",
    examplePrompt: "读题时先把时间词圈出来，再看活动是先发生还是后发生。",
    exampleExplanation: "时间线一理清，句子就不容易打架。",
    pitfalls: ["只看活动，不看时间先后。", "地点、时间、人物信息拆不开。", "旅行场景一复杂就靠猜。"],
    memoryText: "计划口令: 先找时间, 再排顺序, 最后懂安排。",
    memorySequence: ["找时间", "排顺序", "懂安排"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 找时间", text: "先把 morning、next week 这些时间提示找出来。", badge: "找时间" },
      { title: "第 2 步 排顺序", text: "再看这些活动是按什么先后发生。", badge: "排顺序" },
      { title: "第 3 步 懂安排", text: "最后用一句话概括整个计划在做什么。", badge: "懂安排" }
    )
  }),
  "g6-upper-english-words": buildScript({
    teacherLead: "六年级词汇不能只背中文，要会看这个词在句子里扮演什么角色。",
    conceptText: "人物、职业、地点和常识词汇，常常要靠上下文才能真正分清意思。",
    whyText: "词义判断一稳，短文阅读和句型理解都会更快进入状态。",
    exampleLabel: "放进句子",
    examplePrompt: "先看这个词前后连着谁、做什么，再判断它在这里更像哪一类意思。",
    exampleExplanation: "把词放进上下文里，它的身份就清楚多了。",
    pitfalls: ["只背一个固定中文，不看语境。", "词认识，放进句子就不敢判。", "人物词、职业词和地点词总混。"],
    memoryText: "词义口令: 先看前后, 再判角色, 最后定意思。",
    memorySequence: ["看前后", "判角色", "定意思"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看前后", text: "先找词前后最关键的搭配和线索。", badge: "看前后" },
      { title: "第 2 步 判角色", text: "再判断它在句子里是人物、地点还是其他信息。", badge: "判角色" },
      { title: "第 3 步 定意思", text: "最后结合场景确定最合适的词义。", badge: "定意思" }
    )
  }),
  "g6-upper-english-read": buildScript({
    teacherLead: "英语阅读到这里，要学会同时抓关键词和句型，而不是一遇到长句就停住。",
    conceptText: "句型结构会告诉我们谁做什么，关键词会带着我们看懂整句和整段。",
    whyText: "会抓句型线索，短文和综合阅读就不会只靠蒙。",
    exampleLabel: "先抓骨架",
    examplePrompt: "先找句子里的主角、动作和时间地点，再看整段最重复的信息是什么。",
    exampleExplanation: "句子骨架一找出来，短文意思就开始连起来了。",
    pitfalls: ["只盯陌生词，忽略已知线索。", "句型没看清就硬猜意思。", "读完一句懂一点，连成一段就断掉。"],
    memoryText: "阅读口令: 先抓骨架, 再看关键词, 最后说段意。",
    memorySequence: ["抓骨架", "看关键词", "说段意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 抓骨架", text: "先找句子里的主角和动作。", badge: "抓骨架" },
      { title: "第 2 步 看关键词", text: "再抓时间、地点和重复出现的重点词。", badge: "看关键词" },
      { title: "第 3 步 说段意", text: "最后用简单英语或中文概括这段主要讲什么。", badge: "说段意" }
    )
  }),
  "g6-lower-chinese-reading": buildScript({
    teacherLead: "综合阅读更像在整理一张信息网，不是一句一句读完就结束。",
    conceptText: "多处信息、多个材料、不同提示，要一起连起来看，才能抓住真正重点。",
    whyText: "会整合信息，毕业阶段的材料阅读和综合题就更不容易漏点。",
    exampleLabel: "先织网",
    examplePrompt: "读题时先圈每处材料里的关键词，再想哪些信息在互相补充、哪些信息最关键。",
    exampleExplanation: "先把信息连成网，答案才不会只抓住一小块。",
    pitfalls: ["只看一则材料，不看整体。", "信息很多时不会筛主次。", "摘到内容，却说不清主题。"],
    memoryText: "综合阅读口令: 先提信息, 再做整合, 最后说主题。",
    memorySequence: ["提信息", "做整合", "说主题"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 提信息", text: "先把每则材料里最重要的信息提出来。", badge: "提信息" },
      { title: "第 2 步 做整合", text: "再把能互相补充的内容连起来看。", badge: "做整合" },
      { title: "第 3 步 说主题", text: "最后说清这些材料共同指向什么主题。", badge: "说主题" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先提信息。每则材料最关键的话和数据，都要先找出来。",
      "step-2": "第二步，做整合。想一想哪些信息在互相补充，哪些只是细节陪衬。",
      "step-3": "第三步，说主题。把几则材料连起来，最后要敢讲出共同指向的中心。",
      example: "跟我织一张信息网。先提信息，再做整合，最后说出这些材料共同在讲什么。",
      memory: "记住综合阅读小口令。先提信息，再做整合，最后说主题。"
    })
  }),
  "g6-lower-chinese-expression": buildScript({
    teacherLead: "语言赏析这一站，重点是看作者用了什么办法把意思写得更有力量。",
    conceptText: "表达方法和修辞手法，不是背名字，而是看它怎样推动情感、画面和节奏。",
    whyText: "会赏析，也会模仿，自己的表达才会从“会写”慢慢走向“写得好”。",
    exampleLabel: "先看怎么写",
    examplePrompt: "遇到精彩句段时，先看作者是在对比、描写还是借景抒情，再说它带来了什么效果。",
    exampleExplanation: "先认方法，再谈效果，赏析就不会空。",
    pitfalls: ["一开口就说“生动形象”，却没依据。", "看出了手法，却说不出作用。", "赏析和自己的表达完全分开。"],
    memoryText: "赏析口令: 先认方法, 再看效果, 最后想运用。",
    memorySequence: ["认方法", "看效果", "想运用"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 认方法", text: "先判断这句主要用了什么表达办法。", badge: "认方法" },
      { title: "第 2 步 看效果", text: "再看这种写法让画面、情感或语气发生了什么变化。", badge: "看效果" },
      { title: "第 3 步 想运用", text: "最后想自己写作时能不能借一借这种方式。", badge: "想运用" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先认方法。先看作者用了对比、描写，还是借景抒情，不要只背名字。",
      "step-2": "第二步，看效果。这种写法让画面、情感和语气发生了什么变化。",
      "step-3": "第三步，想运用。会赏析还不够，还要想自己写作时能不能借过来。",
      example: "跟我赏一赏。先认方法，再看效果，最后想这种写法为什么值得学。",
      memory: "记住语言赏析小口令。先认方法，再看效果，最后想运用。"
    })
  }),
  "g6-lower-chinese-culture": buildScript({
    teacherLead: "古诗文复习到下册，更像在收束线索，要把人物、背景、句意和文化点慢慢串成一条线。",
    conceptText: "复习不只是回忆句子，而是把重要篇目里的关键意思和文化背景重新连起来。",
    whyText: "整理得越清楚，遇到新题就越知道该从哪里下手，不会只剩死背。",
    exampleLabel: "先串线",
    examplePrompt: "复习诗文时，先想作品讲了什么、和谁有关，再回到关键句看它在表达什么情感。",
    exampleExplanation: "线一串起来，诗文知识就不容易散掉。",
    pitfalls: ["只背诗句，不管背景和人物。", "文言句意会背答案，不会自己解释。", "不同篇目的文化点全堆在一起。"],
    memoryText: "复习口令: 先想背景, 再懂句意, 最后连文化。",
    memorySequence: ["想背景", "懂句意", "连文化"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 想背景", text: "先把作者、时代和作品情境重新想起来。", badge: "想背景" },
      { title: "第 2 步 懂句意", text: "再把关键诗句或文言句真正讲明白。", badge: "懂句意" },
      { title: "第 3 步 连文化", text: "最后把它和相关的文化常识或人物联系上。", badge: "连文化" }
    )
  }),
  "g6-lower-chinese-write": buildScript({
    teacherLead: "毕业阶段的习作复习，要学会把学过的方法调出来，而不是临场碰运气。",
    conceptText: "写作思路、表达条理和材料选择，都会决定文章是不是清楚、完整、有重点。",
    whyText: "会整理写法，碰到不同题材时都更容易快速搭出一篇完整文章。",
    exampleLabel: "先定路子",
    examplePrompt: "拿到题目后先想这更适合写事、写人还是写景，再决定要用哪些学过的方法撑住内容。",
    exampleExplanation: "先把路子定下来，材料和细节才不会乱跑。",
    pitfalls: ["题目一换就不知道该怎么开头。", "方法学过很多，却不会选最合适的。", "结构看起来完整，但重点不突出。"],
    memoryText: "习作复习口令: 先定题路, 再选方法, 最后稳条理。",
    memorySequence: ["定题路", "选方法", "稳条理"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 定题路", text: "先判断题目最适合用什么写法切入。", badge: "定题路" },
      { title: "第 2 步 选方法", text: "再挑最能服务这个题目的表达办法。", badge: "选方法" },
      { title: "第 3 步 稳条理", text: "最后让文章的顺序和重点都站稳。", badge: "稳条理" }
    )
  }),
  "g6-lower-math-fraction": buildScript({
    teacherLead: "分数除法最容易让人慌，其实关键还是先看清谁被分、按什么关系分。",
    conceptText: "分数除法既有计算规则，也有数量关系，要把“除以谁”想明白。",
    whyText: "会先说意义，再算结果，分数应用题才不容易因为形式变了就卡住。",
    exampleLabel: "先想怎么分",
    examplePrompt: "做题前先判断这是平均分、倍数比较，还是在求一个量里包含几个另一个量。",
    exampleExplanation: "先想清“除”在做什么，倒数和算式才不会乱。",
    pitfalls: ["只会套乘倒数，不理解为什么。", "把乘法题和除法题关系看反。", "应用题中单位“1”和比较量总混。"],
    memoryText: "分数除法口令: 先懂除意, 再转关系, 最后算检查。",
    memorySequence: ["懂除意", "转关系", "算检查"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 懂除意", text: "先说清这道题里的“除”到底在表达什么。", badge: "懂除意" },
      { title: "第 2 步 转关系", text: "再把数量关系变成合适的分数除法式子。", badge: "转关系" },
      { title: "第 3 步 算检查", text: "最后完成计算并回头看结果合不合理。", badge: "算检查" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先懂除意。先想这道题是在平均分，还是在比较一个量里有几个另一个量。",
      "step-2": "第二步，转成关系。把题意讲顺了，再把它变成真正的分数除法式子。",
      "step-3": "第三步，算完再检查。不要只会乘倒数，还要看结果是不是合题意。",
      example: "跟我分一分。先说清除法在做什么，再把关系写出来，最后完成计算。",
      memory: "记住分数除法小口令。先懂除意，再转关系，最后算检查。"
    })
  }),
  "g6-lower-math-ratio": buildScript({
    teacherLead: "比例这一站开始更强调“变化有没有一起跟着变”，不只是把两个数摆在一起。",
    conceptText: "正比例、反比例初步，都是在观察量和量之间怎样一起变化。",
    whyText: "看懂变化关系，表格题、图像题和综合应用题都会更有方向。",
    exampleLabel: "先看怎么变",
    examplePrompt: "看到数据表时，先想一个量变大时，另一个量是跟着变大、变小，还是不稳定。",
    exampleExplanation: "变化规律一抓住，比例关系就开始显形。",
    pitfalls: ["只盯两列数字，不看变化趋势。", "正比例、反比例只记名字。", "一看表格就想直接套公式。"],
    memoryText: "比例口令: 先看变化, 再判关系, 最后用规律。",
    memorySequence: ["看变化", "判关系", "用规律"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看变化", text: "先观察一个量变化时另一个量有没有一起变。", badge: "看变化" },
      { title: "第 2 步 判关系", text: "再判断它更像正向一起变，还是一个大一个小。", badge: "判关系" },
      { title: "第 3 步 用规律", text: "最后把观察到的比例规律说清楚再解题。", badge: "用规律" }
    )
  }),
  "g6-lower-math-solid": buildScript({
    teacherLead: "圆柱圆锥这部分，重点是把立体图形真正想成立起来的物体，不只是平面公式换名字。",
    conceptText: "底面、侧面、高和体积之间都有关系，先认清结构再谈计算。",
    whyText: "会看立体图形结构，体积和表面积题就不容易在条件里迷路。",
    exampleLabel: "先认结构",
    examplePrompt: "做题前先指出哪个是底面、哪个是高，再看题目问的是占多大空间还是表面有多大。",
    exampleExplanation: "先把图形站稳，公式才知道往哪用。",
    pitfalls: ["体积题和表面积题总混。", "高和斜边、半径等条件看不清。", "只会套公式，不会联系图形结构。"],
    memoryText: "立体图形口令: 先认结构, 再判所求, 最后列式。",
    memorySequence: ["认结构", "判所求", "列式"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 认结构", text: "先把底面、侧面和高这些部分找出来。", badge: "认结构" },
      { title: "第 2 步 判所求", text: "再分清题目在问体积还是表面积。", badge: "判所求" },
      { title: "第 3 步 列式", text: "最后根据图形关系写出正确算式。", badge: "列式" }
    )
  }),
  "g6-lower-math-review": buildScript({
    teacherLead: "总复习不是把旧题再做一遍，而是学会把学过的知识分类、整理，再拿去解综合题。",
    conceptText: "统计、图表和应用题，会一起考我们能不能把信息整理成清楚的数学关系。",
    whyText: "会整理知识网，综合题就不容易一题换一题地重新摸索。",
    exampleLabel: "先整理信息",
    examplePrompt: "遇到综合题先把已知条件分一分，看看哪些是数据、哪些是关系、哪些是最终问题。",
    exampleExplanation: "先把题面整理干净，思路就不会被信息淹掉。",
    pitfalls: ["一上来就算，没有先整理条件。", "统计图会看表面高低，不会说数据意义。", "综合题里学过的方法不会主动调出来。"],
    memoryText: "总复习口令: 先整信息, 再连知识, 最后解问题。",
    memorySequence: ["整信息", "连知识", "解问题"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 整信息", text: "先把题里所有条件按类型整理出来。", badge: "整信息" },
      { title: "第 2 步 连知识", text: "再想这题会用到哪些学过的方法。", badge: "连知识" },
      { title: "第 3 步 解问题", text: "最后按清楚的顺序一步一步解答。", badge: "解问题" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先整信息。把题里的数据、关系和问题分开摆，不要一上来就算。",
      "step-2": "第二步，连知识。想一想这是分数、比例、统计，还是图形哪条主线在帮忙。",
      "step-3": "第三步，再解问题。顺序清楚了，综合题就不会把人淹住。",
      example: "跟我整理题面。先分信息，再连知识，最后一步一步把综合题做出来。",
      memory: "记住总复习小口令。先整信息，再连知识，最后解问题。"
    })
  }),
  "g6-lower-english-scene": buildScript({
    teacherLead: "旅行活动场景里，英语句子常常一口气给出天气、地点、安排和人物动作。",
    conceptText: "场景题不是背句子，而是看这些线索拼起来以后最合理的表达是什么。",
    whyText: "会从完整语境里选句子，综合对话题就会稳很多。",
    exampleLabel: "先拼场景",
    examplePrompt: "读题时先把天气、地点和活动圈出来，再看人物最可能会说哪句话。",
    exampleExplanation: "场景一拼完整，句子选择通常就更自然。",
    pitfalls: ["只看活动词，不看天气和地点。", "情景对话只凭句型眼熟。", "前一句后一句不连着看。"],
    memoryText: "场景口令: 先拼语境, 再判意图, 最后选句。",
    memorySequence: ["拼语境", "判意图", "选句"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 拼语境", text: "先把题里的天气、地点和人物活动拼到一起。", badge: "拼语境" },
      { title: "第 2 步 判意图", text: "再看人物是想询问、安排还是回应。", badge: "判意图" },
      { title: "第 3 步 选句", text: "最后挑最适合这个旅行场景的表达。", badge: "选句" }
    )
  }),
  "g6-lower-english-health": buildScript({
    teacherLead: "健康建议类句子，最重要的是看清它是在提醒、建议，还是说明习惯。",
    conceptText: "should、must、too much 这些线索，常常在告诉我们说话人的态度和目的。",
    whyText: "会判断语气和功能，建议类句型就不会总和一般陈述句混在一起。",
    exampleLabel: "先看语气",
    examplePrompt: "先找表示建议或提醒的词，再判断这句话是在劝别人做，还是告诉别人不要做。",
    exampleExplanation: "语气一看清，健康场景里的句意就更准。",
    pitfalls: ["只认个别词，不看整句语气。", "建议句和陈述句混在一起。", "健康场景一换说法就不会判断。"],
    memoryText: "建议口令: 先看语气, 再懂功能, 最后判句意。",
    memorySequence: ["看语气", "懂功能", "判句意"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 看语气", text: "先找 should、must 等表达语气的关键词。", badge: "看语气" },
      { title: "第 2 步 懂功能", text: "再判断这句话是在建议、提醒还是说明。", badge: "懂功能" },
      { title: "第 3 步 判句意", text: "最后结合健康场景说出整句意思。", badge: "判句意" }
    )
  }),
  "g6-lower-english-place": buildScript({
    teacherLead: "公共场所和路线题，不能只看位置词，还要看人物究竟准备往哪里去、怎么走。",
    conceptText: "地点、方向、路线和行动，会一起决定句子的真正含义。",
    whyText: "会看路线关系，问路指路和场所理解题都更容易接起来。",
    exampleLabel: "先画路线",
    examplePrompt: "看到句子时，先想人物现在在哪儿、要去哪里，再看 left、across、near 这些线索。",
    exampleExplanation: "先把路线在脑中走一遍，方向题就不会乱。",
    pitfalls: ["只认位置词，不管人物行动。", "问路句和指路句常常弄反。", "公共场所一多就找不到主线。"],
    memoryText: "路线口令: 先定起点, 再看方向, 最后懂路线。",
    memorySequence: ["定起点", "看方向", "懂路线"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 定起点", text: "先弄清人物现在所处的位置。", badge: "定起点" },
      { title: "第 2 步 看方向", text: "再读清左转、直走、经过这些方向词。", badge: "看方向" },
      { title: "第 3 步 懂路线", text: "最后把整条路线或地点关系说完整。", badge: "懂路线" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先定起点。人物现在站在哪儿，要去哪里，这两个位置要先看清。",
      "step-2": "第二步，看方向词。left、across、near 这些词都在给路线带方向。",
      "step-3": "第三步，说完整路线。脑子里先走一遍，问路和指路才不容易弄反。",
      example: "跟我画一条路线。先找起点终点，再顺着方向词把整条路理出来。",
      memory: "记住路线英语小口令。先定起点，再看方向，最后懂路线。"
    })
  }),
  "g6-lower-english-read": buildScript({
    teacherLead: "毕业阅读更像一次综合判断，要把关键词、句型和段落主意一起抓住。",
    conceptText: "同一个短文里，可能既有句型复习，也有场景判断和主旨概括。",
    whyText: "会统整这些线索，阅读题就不容易一题一题各猜各的。",
    exampleLabel: "先抓主线",
    examplePrompt: "先找整段里反复出现的人、事、词和句型，再想这段到底想告诉我们什么。",
    exampleExplanation: "先抓住主线，细节题才知道该回到哪里找。",
    pitfalls: ["句型认识一点，就以为整段都懂了。", "只抓细节，不看主旨。", "读一段时不回头核对前后线索。"],
    memoryText: "毕业阅读口令: 先抓主线, 再核细节, 最后定主旨。",
    memorySequence: ["抓主线", "核细节", "定主旨"],
    miniLessons: buildMiniLessons(
      { title: "第 1 步 抓主线", text: "先找短文反复在讲的人和事情。", badge: "抓主线" },
      { title: "第 2 步 核细节", text: "再回到关键句核对题目问的细节。", badge: "核细节" },
      { title: "第 3 步 定主旨", text: "最后说清这段最核心的大意。", badge: "定主旨" }
    ),
    studyNarration: Object.freeze({
      "step-1": "第一步，先抓主线。短文反复在讲谁、在讲什么，要先看出来。",
      "step-2": "第二步，回头核细节。题目问到哪一句，就回到哪一句去确认。",
      "step-3": "第三步，定主旨。细节都对上以后，还要敢说整段最核心的意思。",
      example: "跟我读一段。先抓主线，再核细节，最后说这段短文主要想告诉我们什么。",
      memory: "记住毕业阅读小口令。先抓主线，再核细节，最后定主旨。"
    })
  })
});
