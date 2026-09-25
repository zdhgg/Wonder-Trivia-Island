import { describe, expect, it } from "vitest";
import {
  GROWTH_ACTIVITY_COUNT,
  GROWTH_ACTIVITY_GROUPS,
  GROWTH_ACTIVITY_RECOMMENDATIONS,
  MAX_GROWTH_PLAN_TITLE_LENGTH,
  buildGrowthPlanEmptyText,
  formatActivityMinutes,
  getGrowthActivityRecommendation,
  isRecommendationPlanned
} from "./growthActivities.js";
import { FOOTPRINT_CATEGORY_IDS } from "./growthFootprints.js";

describe("growthActivities · 内置推荐", () => {
  it("六个展示分组都在，每组都有自己的文案和图标", () => {
    expect(GROWTH_ACTIVITY_GROUPS.map((group) => group.id)).toEqual([
      "explore",
      "create",
      "outdoor",
      "together",
      "chat",
      "learning"
    ]);
    expect(GROWTH_ACTIVITY_GROUPS.map((group) => group.label)).toEqual([
      "一起探索",
      "一起动手",
      "一起出门",
      "一起生活",
      "一起聊天",
      "一起学点东西"
    ]);

    for (const group of GROWTH_ACTIVITY_GROUPS) {
      expect(group.glyph, group.id).toBeTruthy();
      expect(group.activities.length, group.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("每条推荐都有标题、一句话说明和大概时长", () => {
    for (const activity of GROWTH_ACTIVITY_RECOMMENDATIONS) {
      expect(activity.title, activity.id).toBeTruthy();
      expect(activity.title.length).toBeLessThanOrEqual(MAX_GROWTH_PLAN_TITLE_LENGTH);
      expect(activity.summary, activity.id).toBeTruthy();
      expect(activity.summary.length).toBeLessThanOrEqual(60);
      expect(Number.isInteger(activity.minutes), activity.id).toBe(true);
      expect(activity.minutes).toBeGreaterThan(0);
    }

    expect(GROWTH_ACTIVITY_COUNT).toBe(GROWTH_ACTIVITY_RECOMMENDATIONS.length);
  });

  it("推荐 id 唯一，且都带 rec_ 前缀（服务端据此识别来源）", () => {
    const ids = GROWTH_ACTIVITY_RECOMMENDATIONS.map((activity) => activity.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(id, id).toMatch(/^rec_[a-z0-9-]+$/);
    }
  });

  it("落库类别只复用纪念册已有的五个 id，不会另起一套分类", () => {
    for (const activity of GROWTH_ACTIVITY_RECOMMENDATIONS) {
      expect(FOOTPRINT_CATEGORY_IDS, activity.id).toContain(activity.category);
    }
  });

  it("每个分组的类别合法，且组内 activity 不带自己的 category", () => {
    // 回归保护：页面渲染的是分组里嵌的 activity（不带 category），
    // 组级字段一旦缺失，加入想做时就会发一个空 category 给服务端（400）。
    for (const group of GROWTH_ACTIVITY_GROUPS) {
      expect(FOOTPRINT_CATEGORY_IDS, group.id).toContain(group.category);

      for (const activity of group.activities) {
        expect(activity.category, `${group.id}/${activity.id} 不应该在 activity 上重复定义类别`).toBeUndefined();
      }
    }
  });

  it("扁平化清单是页面真正要用的形状：每条都带着从分组继承来的类别", () => {
    for (const activity of GROWTH_ACTIVITY_RECOMMENDATIONS) {
      const group = GROWTH_ACTIVITY_GROUPS.find((item) => item.id === activity.groupId);

      expect(group, activity.id).toBeDefined();
      expect(activity.category).toBe(group.category);
      expect(activity.groupLabel).toBe(group.label);
    }

    // 六个分组的所有推荐都在扁平清单里，一条不少。
    expect(GROWTH_ACTIVITY_COUNT).toBe(
      GROWTH_ACTIVITY_GROUPS.reduce((total, group) => total + group.activities.length, 0)
    );
  });

  it("按 id 查得到推荐，查不到时给 null（不猜、不兜底到第一条）", () => {
    expect(getGrowthActivityRecommendation("rec_star-night").title).toBe("一起看星星");
    expect(getGrowthActivityRecommendation("rec_star-night").groupId).toBe("explore");
    expect(getGrowthActivityRecommendation("   ")).toBeNull();
    expect(getGrowthActivityRecommendation("rec_nope")).toBeNull();
    expect(getGrowthActivityRecommendation(undefined)).toBeNull();
  });
});

describe("growthActivities · 时长文案", () => {
  it("只用整刻钟语气，不出现看起来很精确的分钟数", () => {
    expect(formatActivityMinutes(15)).toBe("约 15 分钟");
    expect(formatActivityMinutes(20)).toBe("约 20 分钟");
    expect(formatActivityMinutes(30)).toBe("约半小时");
    expect(formatActivityMinutes(45)).toBe("约半小时");
    expect(formatActivityMinutes(60)).toBe("约 1 小时");
    expect(formatActivityMinutes(90)).toBe("约 1 小时 30 分钟");
    expect(formatActivityMinutes(120)).toBe("约 2 小时");
  });

  it("非法 / 缺失时长给空串，不显示「约 0 分钟」", () => {
    for (const value of [0, -5, null, undefined, "", "abc", Number.NaN]) {
      expect(formatActivityMinutes(value), String(value)).toBe("");
    }
  });
});

describe("growthActivities · 是否已经在想一起做里", () => {
  it("只按 sourceId 比对：自己新增的同名条目不算同一条", () => {
    const plans = [
      { id: 1, sourceId: "rec_star-night", title: "一起看星星" },
      { id: 2, sourceId: "", title: "一起看星星" }
    ];

    expect(isRecommendationPlanned("rec_star-night", plans)).toBe(true);
    expect(isRecommendationPlanned("rec_volcano", plans)).toBe(false);
  });

  it("空输入与脏数据一律返回 false，不抛错", () => {
    expect(isRecommendationPlanned("", [{ sourceId: "rec_star-night" }])).toBe(false);
    expect(isRecommendationPlanned(undefined, [{ sourceId: "rec_star-night" }])).toBe(false);
    expect(isRecommendationPlanned("rec_star-night", null)).toBe(false);
    expect(isRecommendationPlanned("rec_star-night", [{}, { sourceId: null }])).toBe(false);
  });
});

describe("growthActivities · 文案不做游戏化", () => {
  it("空清单文案只是说明页面，不含任务 / 积分 / 完成率这类说法", () => {
    const text = buildGrowthPlanEmptyText();

    expect(text).toContain("想好下次一起做什么");
    expect(text).not.toMatch(/\d+\s*\/\s*\d+/);

    for (const forbiddenWord of ["进度", "经验", "升级", "完成率", "成就", "印章", "宝箱", "任务", "积分", "等级", "排行榜", "打卡"]) {
      expect(text, `空状态文案不应该出现「${forbiddenWord}」`).not.toContain(forbiddenWord);
    }
  });

  it("推荐文案里没有奖励 / 分值 / 名次", () => {
    for (const activity of GROWTH_ACTIVITY_RECOMMENDATIONS) {
      for (const text of [activity.title, activity.summary]) {
        for (const forbiddenWord of ["积分", "得分", "排名", "奖励", "徽章", "打卡"]) {
          expect(text, `${text} 不应该出现「${forbiddenWord}」`).not.toContain(forbiddenWord);
        }
      }
    }
  });
});
