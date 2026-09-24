// 知识岛成长：把「累计探险印章」翻译成孩子看得懂的小岛变化。
//
// 这一层是纯函数，只做一件事：
//   印章数（stampCount）→ 知识岛当前阶段 / 阶段进度 / 下一阶段提示
//
// 它不读 localStorage、不读接口、不写任何进度，也不引入第二套成长账本：
//   - 数据库里仍然只保存一个事实：累计拿过多少枚印章（growthProgress.totalDailyChests）；
//   - 前端负责解释这些印章对应的小岛样子。
// 因此「阶段」永远可以只由 stampCount 推导出来，刷新、换设备、换章节都不会漂移。
//
// 本轮刻意不做：阶段升级庆祝、已读标记、动画队列（留给 Phase 2C-B），
// 所以这里没有任何一次性状态，全部输出都是 stampCount 的确定性函数。

// 阶段阈值本轮固定：0 / 3 / 7 / 15 / 30。
// 不动态生成、不随机、不消费印章——印章只累计，不会被花掉。
export const KNOWLEDGE_ISLAND_STAGES = Object.freeze([
  Object.freeze({
    id: "first-sight",
    threshold: 0,
    name: "初见小岛",
    glyph: "🏝️",
    summary: "一座刚刚露出海面的小岛，等着你每天来看看它。",
    // features 是本阶段结束时岛上有的全部元素（只会一个个多出来，不会消失）。
    features: Object.freeze(["沙滩", "海浪"])
  }),
  Object.freeze({
    id: "sprout-coast",
    threshold: 3,
    name: "萌芽海岸",
    glyph: "🌱",
    summary: "海岸边冒出第一丛嫩芽，小岛开始有生气了。",
    features: Object.freeze(["沙滩", "海浪", "嫩芽", "小草丛"])
  }),
  Object.freeze({
    id: "palm-camp",
    threshold: 7,
    name: "椰林营地",
    glyph: "🌴",
    summary: "椰子树长高了，树荫下多了一个可以歇脚的小营地。",
    features: Object.freeze(["沙滩", "海浪", "嫩芽", "小草丛", "椰子树", "小帐篷"])
  }),
  Object.freeze({
    id: "explorer-dock",
    threshold: 15,
    name: "探险码头",
    glyph: "⛵",
    summary: "岛上修好了小码头，小船可以靠岸，也能出海看看。",
    features: Object.freeze(["沙滩", "海浪", "嫩芽", "小草丛", "椰子树", "小帐篷", "小码头", "泊岸小船"])
  }),
  Object.freeze({
    id: "knowledge-lighthouse",
    threshold: 30,
    name: "知识灯塔",
    glyph: "🗼",
    summary: "灯塔亮起来了，远远就能看见这座热闹的小岛。",
    features: Object.freeze([
      "沙滩",
      "海浪",
      "嫩芽",
      "小草丛",
      "椰子树",
      "小帐篷",
      "小码头",
      "泊岸小船",
      "灯塔",
      "灯光"
    ])
  })
]);

export const KNOWLEDGE_ISLAND_MAX_STAGE = KNOWLEDGE_ISLAND_STAGES[KNOWLEDGE_ISLAND_STAGES.length - 1];

// 异常输入一律安全归零：不出现负数、NaN、小数、字符串数字以外的猜测。
export function normalizeKnowledgeIslandStampCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// 找到 stampCount 落在哪一段：恰好到阈值立刻进入新阶段（例如正好 3 枚 = 萌芽海岸）。
export function resolveKnowledgeIslandStageIndex(stampCount) {
  const normalizedStampCount = normalizeKnowledgeIslandStampCount(stampCount);
  let resolvedIndex = 0;

  for (let index = 0; index < KNOWLEDGE_ISLAND_STAGES.length; index += 1) {
    if (normalizedStampCount >= KNOWLEDGE_ISLAND_STAGES[index].threshold) {
      resolvedIndex = index;
    } else {
      break;
    }
  }

  return resolvedIndex;
}

export function isKnowledgeIslandMaxStage(stampCount) {
  return resolveKnowledgeIslandStageIndex(stampCount) === KNOWLEDGE_ISLAND_STAGES.length - 1;
}

// 进度按「当前阶段阈值 → 下一阶段阈值」这个区间算，不是 stampCount / 下一阶段阈值。
// 例：4 枚印章 → 当前 3、下一阶段 7 → 1 / 4 = 25%。
// 孩子看到的意思是“这一阶段已经走了多少”，而不是“离总目标还差多远”。
export function buildKnowledgeIslandGrowth(stampCount = 0) {
  const normalizedStampCount = normalizeKnowledgeIslandStampCount(stampCount);
  const currentIndex = resolveKnowledgeIslandStageIndex(normalizedStampCount);
  const currentStage = KNOWLEDGE_ISLAND_STAGES[currentIndex];
  const nextStage = currentIndex + 1 < KNOWLEDGE_ISLAND_STAGES.length ? KNOWLEDGE_ISLAND_STAGES[currentIndex + 1] : null;
  const isMaxStage = !nextStage;
  const maxStampCount = KNOWLEDGE_ISLAND_MAX_STAGE.threshold;
  // 超过最高阶段阈值后停留最高阶段：进度满、不再提示“再攒 X 枚”。
  const cappedStampCount = isMaxStage ? maxStampCount : normalizedStampCount;
  const progressValue = cappedStampCount - currentStage.threshold;
  const progressTarget = nextStage ? nextStage.threshold - currentStage.threshold : 0;
  const progressPercent =
    isMaxStage || progressTarget <= 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((progressValue / progressTarget) * 100)));
  const remainingToNext = nextStage ? Math.max(0, nextStage.threshold - normalizedStampCount) : 0;

  return {
    stampCount: normalizedStampCount,
    currentStage: {
      id: currentStage.id,
      threshold: currentStage.threshold,
      name: currentStage.name,
      glyph: currentStage.glyph,
      summary: currentStage.summary,
      features: [...currentStage.features]
    },
    nextStage: nextStage
      ? {
          id: nextStage.id,
          threshold: nextStage.threshold,
          name: nextStage.name,
          glyph: nextStage.glyph,
          summary: nextStage.summary
        }
      : null,
    remainingToNext,
    progressValue,
    progressTarget,
    progressPercent,
    isMaxStage,
    hasNextStage: Boolean(nextStage),
    stageCount: KNOWLEDGE_ISLAND_STAGES.length,
    maxStampCount,
    // 印章口径始终只说一个数字：N 枚探险印章。
    stampText: `已经攒了 ${normalizedStampCount} 枚探险印章`,
    statusText: `${currentStage.name} · 已经攒了 ${normalizedStampCount} 枚探险印章`,
    // 作用域澄清（本轮只加这一处）：收藏册顶部的“年级 · 学期 · 路线”是当前章节作用域，
    // 知识岛不属于任何一章，所以在这里明说它是长期、跨章节累计的。
    islandScopeText: "长期成长 · 每一章的印章都会一起让小岛长大",
    progressText: nextStage ? `${progressValue} / ${progressTarget}` : "",
    // 最高阶段不说“满级”，只说小岛现在的样子；
    // 其余阶段统一用“再攒 X 枚，小岛会有新变化”，不出现等级 / 经验值这类系统词。
    nextText: nextStage
      ? `再攒 ${remainingToNext} 枚印章，小岛会有新变化`
      : "现在的小岛已经非常热闹啦！",
    // 这一阶段小岛上现在有什么（元素只增不减），用于收藏册里的详细说明。
    // 注意：这里不再重复“再攒 X 枚”（组件里已经有 nextText），也不重复作用域提示。
    stageHintText: `现在的小岛有：${currentStage.features.join("、")}。`
  };
}
