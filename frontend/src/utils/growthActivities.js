// 「下次我们一起做什么」的内置活动推荐（Phase 2D-B1）。
//
// 这里只有常量与纯函数：不 fetch、不读 localStorage、不用 Vue ref。
//
// 设计边界（别越界）：
//   - 推荐是**固定内置**的，本轮没有 AI 推荐、没有个性化排序；
//   - 每条推荐只有 标题 + 一句话说明 + 大概时长，没有难度、没有奖励、没有分值；
//   - 落库的 category 仍然复用纪念册那五个「经历的性质」id，
//     这里的 group 只是**展示分组**（探索 / 动手 / 出门 / 创作 / 生活 / 聊天），
//     所以同一个 group 里的推荐可以映射到不同 category（如 一起聊天 → together / learning）。
//
// 与后端的关系：服务端是最终权威，这里只是用户体验层。
export const MAX_GROWTH_PLAN_TITLE_LENGTH = 40;
export const MAX_GROWTH_PLAN_NOTE_LENGTH = 500;

// 展示分组：group.label 出现在页面上，group.category 是该组推荐默认落库的类别。
export const GROWTH_ACTIVITY_GROUPS = Object.freeze([
  Object.freeze({
    id: "explore",
    glyph: "🔬",
    label: "一起探索",
    category: "explore",
    activities: Object.freeze([
      Object.freeze({
        id: "rec_star-night",
        title: "一起看星星",
        summary: "找一个没有太多灯光的晚上，躺着数一数。",
        minutes: 45
      }),
      Object.freeze({
        id: "rec_kite-build",
        title: "一起研究风筝为什么能飞",
        summary: "查一查、试一试，再放一次看看。",
        minutes: 60
      }),
      Object.freeze({
        id: "rec_moon-phases",
        title: "把月亮每天的样子画下来",
        summary: "每天看一眼，画在同一张纸上。",
        minutes: 15
      })
    ])
  }),
  Object.freeze({
    id: "create",
    glyph: "🎨",
    label: "一起动手",
    category: "create",
    activities: Object.freeze([
      Object.freeze({
        id: "rec_volcano",
        title: "一起做一次小苏打火山",
        summary: "小苏打加醋，看它喷出来。",
        minutes: 40
      }),
      Object.freeze({
        id: "rec_paper-boat",
        title: "一起折一只纸船再去放",
        summary: "折好放到水里，看它能漂多远。",
        minutes: 30
      }),
      Object.freeze({
        id: "rec_cardboard-house",
        title: "一起搭一个纸箱小屋",
        summary: "拿家里的纸箱拼一拼，能钻进去最好。",
        minutes: 120
      })
    ])
  }),
  Object.freeze({
    id: "outdoor",
    glyph: "🌳",
    label: "一起出门",
    category: "outdoor",
    activities: Object.freeze([
      Object.freeze({
        id: "rec_first-campfire",
        title: "一起搭一次帐篷",
        summary: "在阳台或院子里也可以。",
        minutes: 90
      }),
      Object.freeze({
        id: "rec_leaf-hunt",
        title: "一起去捡十片不同的叶子",
        summary: "回来后按大小排一排。",
        minutes: 60
      }),
      Object.freeze({
        id: "rec_bike-ride",
        title: "一起骑一段没走过的路",
        summary: "不用很远，够新鲜就行。",
        minutes: 60
      })
    ])
  }),
  Object.freeze({
    id: "together",
    glyph: "🍳",
    label: "一起生活",
    category: "together",
    activities: Object.freeze([
      Object.freeze({
        id: "rec_cook-together",
        title: "一起做一顿晚饭",
        summary: "一个人洗、一个人炒，谁都别闲着。",
        minutes: 60
      }),
      Object.freeze({
        id: "rec_plant-herb",
        title: "一起种一盆薄荷",
        summary: "放在阳台上，每天浇一点水。",
        minutes: 30
      }),
      Object.freeze({
        id: "rec_tidy-desk",
        title: "一起把书桌重新摆一遍",
        summary: "把不用的收起来，把常用的放手边。",
        minutes: 45
      })
    ])
  }),
  Object.freeze({
    id: "chat",
    glyph: "💬",
    label: "一起聊天",
    category: "together",
    activities: Object.freeze([
      Object.freeze({
        id: "rec_family-stories",
        title: "听爸爸讲一件小时候的事",
        summary: "讲完可以问一个问题。",
        minutes: 20
      }),
      Object.freeze({
        id: "rec_three-good-things",
        title: "睡前说说今天最开心的三件事",
        summary: "一人说三件，谁都可以先说。",
        minutes: 15
      }),
      Object.freeze({
        id: "rec_letter-to-grandma",
        title: "一起给爷爷奶奶写一封信",
        summary: "写完贴邮票寄出去。",
        minutes: 30
      })
    ])
  }),
  Object.freeze({
    id: "learning",
    glyph: "📚",
    label: "一起学点东西",
    category: "learning",
    activities: Object.freeze([
      Object.freeze({
        id: "rec_recipe-math",
        title: "一起按食谱量一次材料",
        summary: "看看少放一半会怎么样。",
        minutes: 40
      }),
      Object.freeze({
        id: "rec_map-read",
        title: "一起在地图上找出我们去过的地方",
        summary: "数一数一共去过几个。",
        minutes: 25
      }),
      Object.freeze({
        id: "rec_insect-watch",
        title: "一起观察一只小虫子十分钟",
        summary: "它在干什么？记下来。",
        minutes: 20
      })
    ])
  })
]);

// 扁平化后的推荐清单，方便按 id 查（页面用不到嵌套结构时用这个）。
// 注意顺序：groupId / category 放在 activity 之后，组级字段永远以分组定义为准，
// 不会被 activity 对象上可能存在的同名字段覆盖。
export const GROWTH_ACTIVITY_RECOMMENDATIONS = Object.freeze(
  GROWTH_ACTIVITY_GROUPS.flatMap((group) =>
    group.activities.map((activity) =>
      Object.freeze({
        ...activity,
        groupId: group.id,
        groupLabel: group.label,
        category: group.category
      })
    )
  )
);

export const GROWTH_ACTIVITY_COUNT = GROWTH_ACTIVITY_RECOMMENDATIONS.length;

export function getGrowthActivityRecommendation(activityId) {
  const normalizedId = String(activityId ?? "").trim();

  return GROWTH_ACTIVITY_RECOMMENDATIONS.find((activity) => activity.id === normalizedId) ?? null;
}

// 「大概时长」只用整刻钟，避免出现「大约 37 分钟」这种看起来很精确的说法。
export function formatActivityMinutes(minutes) {
  const parsed = Number.parseInt(String(minutes ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  if (parsed <= 20) {
    return `约 ${parsed} 分钟`;
  }

  if (parsed <= 50) {
    return "约半小时";
  }

  if (parsed === 60) {
    return "约 1 小时";
  }

  if (parsed < 60) {
    return `约 ${parsed} 分钟`;
  }

  const hours = Math.floor(parsed / 60);
  const restMinutes = parsed % 60;

  return restMinutes === 0 ? `约 ${hours} 小时` : `约 ${hours} 小时 ${restMinutes} 分钟`;
}

// 一条推荐是否已经在「想一起做」里：只比 sourceId，不比标题
// （用户完全可以自己新增一个同名的事，那是两件事）。
export function isRecommendationPlanned(activityId, plans = []) {
  const normalizedId = String(activityId ?? "").trim();

  if (!normalizedId || !Array.isArray(plans)) {
    return false;
  }

  return plans.some((plan) => String(plan?.sourceId ?? "").trim() === normalizedId);
}

// 「已经加了几件想做的事」这类文案刻意不做：清单一多就变成任务面板了。
// 这里只给一句状态说明，说清楚这个页面是什么。
export function buildGrowthPlanEmptyText() {
  return "还没有想好下次一起做什么。可以从下面挑一件加进来，也可以自己写一件。";
}
