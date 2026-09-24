// 知识岛成长：把「累计探险印章」翻译成孩子看得懂的小岛变化。
//
// 这一层是纯函数，只做一件事：
//   印章数（stampCount）→ 知识岛当前阶段 / 阶段进度 / 下一阶段提示
//
// 它不读 localStorage、不读接口、不写任何进度，也不引入第二套成长账本：
//   - 数据库里仍然只保存一个事实：累计拿过多少枚印章（growthProgress.totalDailyChests）；
//   - 前端负责解释这些印章对应的小岛样子。
// 所以只要同一个 profile 从服务端取到同一份 growthProgress，阶段就能被重新算成同一个结果：
// 这里不负责跨设备同步、也不记录“看过哪个阶段”，同步本身由 growthProgress 那一路负责。
//
// 这里同样没有“已读 / 庆祝过”的第二套状态：
// 阶段变化反馈只发生在服务端确认“这次真的新领到一枚印章”的那一刻，属于临时 UI 状态。

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

// 岛上元素的图标：阶段配置只写元素名字，图标在这里集中一份，
// 收藏册的舞台和阶段庆祝都从这里取，避免同一件东西在两处各画一遍。
export const KNOWLEDGE_ISLAND_FEATURE_GLYPHS = Object.freeze({
  嫩芽: "🌱",
  小草丛: "🌿",
  椰子树: "🌴",
  小帐篷: "⛺",
  小码头: "🛶",
  泊岸小船: "⛵",
  灯塔: "🗼",
  灯光: "💡"
});

export function getKnowledgeIslandFeatureGlyph(feature) {
  return KNOWLEDGE_ISLAND_FEATURE_GLYPHS[String(feature ?? "").trim()] || "";
}

// 阶段顺序的唯一来源就是 KNOWLEDGE_ISLAND_STAGES：
// Vue 组件不再自己维护一份 id 顺序数组，避免两处顺序漂移。
export function getKnowledgeIslandStageIndexById(stageId) {
  const normalizedStageId = String(stageId ?? "").trim();
  const index = KNOWLEDGE_ISLAND_STAGES.findIndex((stage) => stage.id === normalizedStageId);

  // 未知 id 不猜、不报错，按“还没到任何阶段”处理。
  return index;
}

export function isKnowledgeIslandStageAtOrAfter(currentStageId, targetStageId) {
  const currentIndex = getKnowledgeIslandStageIndexById(currentStageId);
  const targetIndex = getKnowledgeIslandStageIndexById(targetStageId);

  if (currentIndex < 0 || targetIndex < 0) {
    return false;
  }

  return currentIndex >= targetIndex;
}

// 异常输入一律安全归零：不出现负数、NaN、小数、字符串数字以外的猜测。
// 这是「展示层」语义——显示阶段时宁可退化成 0 枚，也不能因为脏数据渲染失败。
export function normalizeKnowledgeIslandStampCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// 「一次性事件检测」的严格语义，只给 buildKnowledgeIslandStageTransition 用。
// 与上面的展示层语义刻意不同：这里只接受真正的非负安全整数，不做容错、不归零。
// 原因：阶段变化反馈是一次性事件，如果允许 undefined 先归零再比较，
// 一次脏输入（例如服务端响应里少了字段）就会被当成真实的 0 → N 领取，弹出虚假庆祝。
// 不允许数字字符串 / 小数，是因为真实调用方传的都是 number，没有兼容不存在调用的理由。
export function isValidKnowledgeIslandStampCount(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    // 超出安全整数范围的值已经不是“能数清楚的印章数”，一并挡掉。
    Number.isSafeInteger(value) &&
    value >= 0
  );
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

// ---------------------------------------------------------------------------
// 阶段变化（Phase 2C-B）：两次印章数之间，知识岛是不是真的进了更高的阶段。
//
// 这是一个纯判断，没有任何一次性状态：
//   - 没跨阶段（同值 / 只 +1 但没到阈值 / 倒退）→ null
//   - 跨了阶段 → 一个稳定的 ViewModel，供临时庆祝层展示
// 真实领取路径每次只 +1 枚，但这里也支持一次跳过多个阶段（只给一个结果，不做队列）。
//
// 输入语义比展示层严格（见 isValidKnowledgeIslandStampCount）：
// 任一输入不是非负整数就直接返回 null，绝不先归零再比较——
// 否则 undefined → 3 会被算成 0 → 3，凭空造出一次阶段变化反馈。
// ---------------------------------------------------------------------------
export function buildKnowledgeIslandStageTransition(previousStampCount, nextStampCount) {
  if (!isValidKnowledgeIslandStampCount(previousStampCount) || !isValidKnowledgeIslandStampCount(nextStampCount)) {
    return null;
  }

  const fromIndex = resolveKnowledgeIslandStageIndex(previousStampCount);
  const toIndex = resolveKnowledgeIslandStageIndex(nextStampCount);

  // 只有真的进入更高阶段才谈得上“有新变化”：
  // 同值、倒退、以及印章数没跨过阈值的情况都在这里被挡掉。
  if (toIndex <= fromIndex) {
    return null;
  }

  const fromStage = KNOWLEDGE_ISLAND_STAGES[fromIndex];
  const toStage = KNOWLEDGE_ISLAND_STAGES[toIndex];
  // 差集来自阶段配置本身：toStage.features - fromStage.features。
  const newFeatures = toStage.features
    .filter((feature) => !fromStage.features.includes(feature))
    .map((feature) => ({ name: feature, glyph: getKnowledgeIslandFeatureGlyph(feature) }));
  const isMaxStageReached = toIndex === KNOWLEDGE_ISLAND_STAGES.length - 1;
  const celebrateText = isMaxStageReached
    ? "现在的小岛已经非常热闹啦！"
    : "刚刚获得的探险印章，让知识岛有了新的变化。";

  return {
    // 输入已经校验过，就是这两个非负整数，不需要再归一化。
    previousStampCount,
    nextStampCount,
    fromStage: {
      id: fromStage.id,
      threshold: fromStage.threshold,
      name: fromStage.name,
      glyph: fromStage.glyph
    },
    toStage: {
      id: toStage.id,
      threshold: toStage.threshold,
      name: toStage.name,
      glyph: toStage.glyph,
      summary: toStage.summary
    },
    fromStageIndex: fromIndex,
    toStageIndex: toIndex,
    newFeatures,
    hasNewFeatures: newFeatures.length > 0,
    isMaxStageReached,
    // 复用同一套阶段解释：庆祝层与收藏册显示的是同一座岛。
    island: buildKnowledgeIslandGrowth(nextStampCount),
    title: "小岛有新变化啦！",
    celebrateText,
    actionLabel: "去看看我的知识岛",
    dismissLabel: "知道啦"
  };
}
