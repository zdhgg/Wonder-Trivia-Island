// 知识岛繁荣度：把「闯关星星」翻译成小岛有多丰富。
//
// 这一层是纯函数，只做两件事：
//   1) 从既有闯关进度账本里算出「全部历史章节累计最好星数」；
//   2) 把这个星数分到三档繁荣度上（基础 / 丰盛 / 繁荣）。
//
// 它不新增任何持久状态：星数完全从 challenge progress 的 bestResults 推导，
// 所以刷新、换设备、升年级之后重新算出来都是同一个数字。
//
// 关键口径（这一层最容易出错的地方，明确写死在这里）：
//   - 遍历「全部」章节，不看 activeChapterId、不看首页正在看哪一章；
//   - 每关只取 bestResults 里保存的最好星数（本来就是历史最大值，重复刷同一关不会重复累计）；
//   - 不看 preferredGrade / 学习档案年级：升年级、切换年级都不影响累计星数。
//
// 繁荣度只增不减：星数是历史累计值，没有消耗、没有兑换、没有花掉这一说。

// 繁荣度三档。阈值集中定义在这里，组件和模板里不再出现任何魔法数字。
// 0 / 1 / 2 三个 level 与 basic / lush / flourishing 三个 key 是稳定契约，
// 改动必须同时改 knowledgeIslandProsperity.test.js 里的 FIXED_TIER_THRESHOLDS。
//
// 为什么最高档定在 63 而不是更小的数：
// 真实账号已经累计到 40 多星，阈值太小会在上线当天直接顶到最高档，成长过程会消失。
// 63 星约等于 3 章 × 7 关 × 3 星，够真实用户再走一段。
export const KNOWLEDGE_ISLAND_PROSPERITY_TIERS = Object.freeze([
  Object.freeze({
    level: 0,
    key: "basic",
    label: "基础",
    minStars: 0,
    // 闭区间上限；最后一档用 null 表示“没有上限”。
    maxStars: 20,
    summary: "小岛刚刚开始，星星再多也要一枚一枚攒。"
  }),
  Object.freeze({
    level: 1,
    key: "lush",
    label: "丰盛",
    minStars: 21,
    maxStars: 62,
    summary: "岛上已经热闹起来了，细节也越来越丰富。"
  }),
  Object.freeze({
    level: 2,
    key: "flourishing",
    label: "繁荣",
    minStars: 63,
    maxStars: null,
    summary: "整座岛都活起来了，每一处都看得出用心。"
  })
]);

export const KNOWLEDGE_ISLAND_MAX_PROSPERITY = KNOWLEDGE_ISLAND_PROSPERITY_TIERS[KNOWLEDGE_ISLAND_PROSPERITY_TIERS.length - 1];

// 与印章数同样的展示层容错语义：非法输入一律安全归零，不出现 NaN / 负数。
export function normalizeKnowledgeIslandStarCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// 找到星数落在哪一档：恰好到阈值立刻进入新档（例如正好 21 星 = 丰盛）。
export function resolveKnowledgeIslandProsperityIndex(starCount) {
  const normalizedStarCount = normalizeKnowledgeIslandStarCount(starCount);
  let resolvedIndex = 0;

  for (let index = 0; index < KNOWLEDGE_ISLAND_PROSPERITY_TIERS.length; index += 1) {
    if (normalizedStarCount >= KNOWLEDGE_ISLAND_PROSPERITY_TIERS[index].minStars) {
      resolvedIndex = index;
    } else {
      break;
    }
  }

  return resolvedIndex;
}

export function isKnowledgeIslandMaxProsperity(starCount) {
  return resolveKnowledgeIslandProsperityIndex(starCount) === KNOWLEDGE_ISLAND_PROSPERITY_TIERS.length - 1;
}

// 繁荣度 ViewModel：只描述「星星有多少」，完全不涉及岛屿阶段。
// 印章决定岛上有哪些建筑，星星只决定这些已解锁内容有多丰富——两者互不越权。
export function buildKnowledgeIslandProsperity(starCount = 0) {
  const normalizedStarCount = normalizeKnowledgeIslandStarCount(starCount);
  const currentIndex = resolveKnowledgeIslandProsperityIndex(normalizedStarCount);
  const currentTier = KNOWLEDGE_ISLAND_PROSPERITY_TIERS[currentIndex];
  const nextTier = currentIndex + 1 < KNOWLEDGE_ISLAND_PROSPERITY_TIERS.length
    ? KNOWLEDGE_ISLAND_PROSPERITY_TIERS[currentIndex + 1]
    : null;
  const isMaxProsperity = !nextTier;
  const remainingToNext = nextTier ? Math.max(0, nextTier.minStars - normalizedStarCount) : 0;
  const progressValue = normalizedStarCount - currentTier.minStars;
  const progressTarget = nextTier ? nextTier.minStars - currentTier.minStars : 0;

  return {
    starCount: normalizedStarCount,
    level: currentTier.level,
    key: currentTier.key,
    label: currentTier.label,
    summary: currentTier.summary,
    minStars: currentTier.minStars,
    nextTierStars: nextTier ? nextTier.minStars : 0,
    remainingToNext,
    progressValue,
    progressTarget,
    // 最高档没有下一档，进度记满，避免出现 0 / 0。
    progressPercent:
      isMaxProsperity || progressTarget <= 0
        ? 100
        : Math.max(0, Math.min(100, Math.round((progressValue / progressTarget) * 100))),
    isMaxProsperity,
    hasNextTier: Boolean(nextTier),
    tierCount: KNOWLEDGE_ISLAND_PROSPERITY_TIERS.length,
    // 星级数字是“跨章节累计最好星数”，所以文案里必须写清楚它不是本章星星。
    starText: `累计 ${normalizedStarCount} 颗闯关星星`,
    prosperityText: `${currentTier.label} · 累计 ${normalizedStarCount} 颗闯关星星`,
    // 最高档不再提示“再攒 X 颗”，也不说“满级”这类系统词。
    nextText: nextTier ? `再攒 ${remainingToNext} 颗星星，小岛会更丰富` : "小岛已经很热闹啦！"
  };
}

// ---------------------------------------------------------------------------
// lifetime star：全部历史章节累计最好星数。
//
// 这是知识岛繁荣度唯一的星数来源，所以口径必须一次性写清楚：
//   - 遍历 progressBook.chapters 的「全部」章节，不绑 activeChapterId；
//   - 每关只读 bestResults[stageId].starCount（服务端/账本里保存的最好成绩）；
//   - 重复刷同一关只会把同一个 bestResults 槽位覆盖成更好的成绩，不会多出一笔，
//     所以这里天然不会重复累计；
//   - 新开一章 0 星的章节只是多了一个值为 0 的加数，总数不会下降；
//   - 不写任何地方，调用方拿到的就是一个数字。
//
// 脏数据处理：非对象的 chapters、非对象的 bestResults、非数字的 starCount 一律按 0 计，
// 整体结构不合法时直接返回 0，绝不抛错——它是展示层数据，不能因为脏数据白屏。
// ---------------------------------------------------------------------------
export function sumChallengeProgressBookStars(progressBook) {
  const chapters = progressBook?.chapters;

  if (!chapters || typeof chapters !== "object" || Array.isArray(chapters)) {
    return 0;
  }

  let totalStars = 0;

  for (const chapterProgress of Object.values(chapters)) {
    const bestResults = chapterProgress?.bestResults;

    if (!bestResults || typeof bestResults !== "object" || Array.isArray(bestResults)) {
      continue;
    }

    for (const stageResult of Object.values(bestResults)) {
      totalStars += normalizeKnowledgeIslandStarCount(stageResult?.starCount);
    }
  }

  return totalStars;
}
