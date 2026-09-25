<script setup>
import { computed } from "vue";

// 首页“我的成长”：把已经拿到的星星 / 航海收藏 / 成就摆到孩子面前，
// 并给一个“最接近完成”的下一成就。完整收藏与成就列表在“我的探险收藏册”里。
const props = defineProps({
  growth: {
    type: Object,
    required: true
  },
  // 「成长纪念册 / 下次一起做什么」这两条入口的文案
  // （homeDashboard.buildHomeGrowthBookEntry / buildHomeGrowthPlansEntry）。
  // 单独一个 prop 而不是塞进 growth：它们和星星 / 收藏 / 成就那三个“本章指标”不同源。
  growthBookEntry: {
    type: Object,
    default: () => ({})
  },
  growthPlansEntry: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(["open-backpack", "open-entry"]);

// 两条成长入口用同一个渲染模板，只有文案和去往的页面不同。
// 兜底成空对象：老调用方（或测试）不传时，标题还在、提示语为空，不会渲染出 undefined。
const growthEntries = computed(() => [
  {
    id: "growth-book",
    title: "我们的成长纪念册",
    icon: props.growthBookEntry?.icon ?? "",
    hint: props.growthBookEntry?.hint ?? "",
    ariaLabel: props.growthBookEntry?.ariaLabel ?? "打开我们的成长纪念册"
  },
  {
    id: "growth-plans",
    title: "下次我们一起做什么",
    icon: props.growthPlansEntry?.icon ?? "",
    hint: props.growthPlansEntry?.hint ?? "",
    ariaLabel: props.growthPlansEntry?.ariaLabel ?? "打开下次我们一起做什么"
  }
]);
</script>

<template>
  <section class="growth-summary" aria-label="我的成长">
    <header class="growth-summary__head">
      <h2 class="growth-summary__title">我的成长</h2>
      <button
        class="growth-summary__more"
        type="button"
        aria-label="打开我的探险收藏册，查看印章、航海收藏和成就"
        @click="emit('open-backpack')"
      >
        我的探险收藏册
      </button>
    </header>

    <ul class="growth-summary__stats">
      <li class="growth-summary__stat growth-summary__stat--star">
        <span class="growth-summary__stat-icon" aria-hidden="true">⭐</span>
        <strong class="growth-summary__stat-value">{{ growth.starText }}</strong>
        <span class="growth-summary__stat-label">本章星星</span>
      </li>
      <li class="growth-summary__stat growth-summary__stat--reward">
        <span class="growth-summary__stat-icon" aria-hidden="true">🎒</span>
        <strong class="growth-summary__stat-value">{{ growth.rewardText }}</strong>
        <span class="growth-summary__stat-label">航海收藏</span>
      </li>
      <li class="growth-summary__stat growth-summary__stat--achievement">
        <span class="growth-summary__stat-icon" aria-hidden="true">🏅</span>
        <strong class="growth-summary__stat-value">{{ growth.achievementText }}</strong>
        <span class="growth-summary__stat-label">成就</span>
      </li>
    </ul>

    <!-- 长期成长摘要：整行就是热区，点开同一个探险收藏册（右上角按钮仍然保留）。
         只做轻量摘要：岛名 + 已经攒了多少枚印章 + 下一次变化，不把整座岛搬到首页。 -->
    <button
      class="growth-summary__stamps"
      type="button"
      :aria-label="`打开我的探险收藏册，查看我的知识岛（${growth.stampText}）`"
      @click="emit('open-backpack')"
    >
      <span class="growth-summary__stamps-glyph" aria-hidden="true">{{ growth.knowledgeIsland.currentStage.glyph }}</span>
      <span class="growth-summary__stamps-copy">
        <span class="growth-summary__stamps-island">{{ growth.knowledgeIslandTitle }}</span>
        <span class="growth-summary__stamps-text">{{ growth.knowledgeIslandText }}</span>
        <span class="growth-summary__stamps-next">{{ growth.knowledgeIsland.nextText }}</span>
      </span>
      <span class="growth-summary__stamps-more" aria-hidden="true">›</span>
    </button>

    <!-- 成长纪念册 / 下次一起做什么：和知识岛同一层的轻量入口，各自走独立页面。
         这里只说“一起经历的事”和“想一起做的事”，不显示任何条数 / 进度——
         首页本轮不请求足迹与清单接口，免得清单变成待办面板。 -->
    <button
      v-for="entry in growthEntries"
      :key="entry.id"
      class="growth-summary__entry"
      type="button"
      :aria-label="entry.ariaLabel"
      @click="emit('open-entry', entry.id)"
    >
      <span class="growth-summary__entry-glyph" aria-hidden="true">{{ entry.icon }}</span>
      <span class="growth-summary__entry-copy">
        <strong class="growth-summary__entry-title">{{ entry.title }}</strong>
        <span class="growth-summary__entry-hint">{{ entry.hint }}</span>
      </span>
      <span class="growth-summary__entry-more" aria-hidden="true">›</span>
    </button>

    <div v-if="growth.nextAchievement" class="growth-summary__next">
      <span class="growth-summary__next-label">下一成就</span>
      <div class="growth-summary__next-body">
        <span class="growth-summary__next-glyph" aria-hidden="true">{{ growth.nextAchievement.glyph }}</span>
        <div class="growth-summary__next-copy">
          <strong class="growth-summary__next-name">{{ growth.nextAchievement.name }}</strong>
          <span v-if="growth.nextAchievement.progressText" class="growth-summary__next-progress">
            {{ growth.nextAchievement.progressText }}
          </span>
          <span class="growth-summary__next-goal">{{ growth.nextAchievement.goalText }}</span>
        </div>
      </div>
      <div v-if="growth.nextAchievement.progressTarget > 0" class="growth-summary__next-track" aria-hidden="true">
        <span
          class="growth-summary__next-fill"
          :style="{
            width: `${Math.min(100, Math.round((growth.nextAchievement.progressValue / growth.nextAchievement.progressTarget) * 100))}%`
          }"
        ></span>
      </div>
    </div>

    <p v-else-if="growth.allAchievementsDone" class="growth-summary__done">
      🏅 所有成就都已经达成啦，太厉害了！
    </p>
  </section>
</template>

<style scoped>
.growth-summary {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.3), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 252, 244, 0.88) 100%);
  box-shadow:
    0 10px 22px -28px rgba(36, 50, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.growth-summary__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.growth-summary__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
  line-height: 1.2;
}

.growth-summary__more {
  appearance: none;
  min-height: 32px;
  padding: 4px 12px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink-soft);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.growth-summary__more:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 174, 66, 0.5);
  color: var(--color-ink);
}

.growth-summary__more:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 174, 66, 0.24);
}

.growth-summary__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.growth-summary__stat {
  display: grid;
  gap: 2px;
  justify-items: center;
  padding: 10px 6px;
  border: 1px solid rgba(36, 50, 74, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
  text-align: center;
}

.growth-summary__stat-icon {
  font-size: 1.16rem;
  line-height: 1;
}

.growth-summary__stat-value {
  color: var(--color-ink);
  font-size: 1.12rem;
  font-weight: 900;
  line-height: 1.1;
}

.growth-summary__stat--star .growth-summary__stat-value {
  color: #b77211;
}

.growth-summary__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.74rem;
  font-weight: 700;
}

/* 长期成长的一条轻量信息：不做第四个指标卡，只写“知识岛现在到哪一步了”，整行可点进收藏册。 */
.growth-summary__stamps {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: rgba(184, 242, 223, 0.28);
  color: var(--color-ink-soft);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.growth-summary__stamps:hover {
  border-color: rgba(124, 216, 184, 0.62);
  background: rgba(184, 242, 223, 0.52);
  color: var(--color-ink);
}

.growth-summary__stamps:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.9);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.3);
}

.growth-summary__stamps-glyph {
  flex-shrink: 0;
  font-size: 1.2rem;
  line-height: 1;
}

.growth-summary__stamps-copy {
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.growth-summary__stamps-island {
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 900;
}

.growth-summary__stamps-text {
  min-width: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 800;
}

.growth-summary__stamps-next {
  min-width: 0;
  color: #1f6b51;
  font-size: 0.78rem;
  font-weight: 900;
}

.growth-summary__stamps-more {
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: 900;
}

/* 成长的几个入口：和知识岛摘要一样是整行可点的轻量入口，
   但换一套纸张色，和「印章 / 收藏 / 成就」这些有分母的指标区分开。 */
.growth-summary__entry {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: 1.5px solid rgba(255, 214, 160, 0.72);
  border-radius: 14px;
  background: rgba(255, 244, 226, 0.72);
  color: var(--color-ink-soft);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.growth-summary__entry:hover {
  border-color: rgba(255, 174, 66, 0.62);
  background: rgba(255, 238, 205, 0.92);
  color: var(--color-ink);
}

.growth-summary__entry:focus-visible {
  outline: none;
  border-color: rgba(255, 174, 66, 0.9);
  box-shadow: 0 0 0 3px rgba(255, 214, 128, 0.4);
}

.growth-summary__entry-glyph {
  flex-shrink: 0;
  font-size: 1.2rem;
  line-height: 1;
}

.growth-summary__entry-copy {
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.growth-summary__entry-title {
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 900;
}

.growth-summary__entry-hint {
  min-width: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 800;
}

.growth-summary__entry-more {
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: 900;
}

.growth-summary__next {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 174, 66, 0.28);
  border-radius: 18px;
  background: rgba(255, 248, 226, 0.72);
}

.growth-summary__next-label {
  color: rgba(176, 84, 22, 0.98);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.growth-summary__next-body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.growth-summary__next-glyph {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 231, 156, 0.9) 100%);
  color: var(--color-ink);
  font-size: 1.1rem;
  font-weight: 900;
  box-shadow: 0 10px 18px -16px rgba(36, 50, 74, 0.4);
}

.growth-summary__next-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.growth-summary__next-name {
  color: var(--color-ink);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.3;
}

.growth-summary__next-progress {
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
}

.growth-summary__next-goal {
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 800;
}

.growth-summary__next-track {
  position: relative;
  overflow: hidden;
  height: 9px;
  border-radius: 999px;
  background: rgba(36, 50, 74, 0.1);
}

.growth-summary__next-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 214, 128, 0.96) 0%, rgba(255, 174, 66, 0.96) 100%);
  transition: width 260ms ease;
}

.growth-summary__done {
  margin: 0;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(184, 242, 223, 0.44);
  color: var(--color-ink);
  font-size: 0.9rem;
  font-weight: 800;
}

@media (max-width: 480px) {
  .growth-summary__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .growth-summary__stat-value {
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .growth-summary__more,
  .growth-summary__more:hover,
  .growth-summary__stamps,
  .growth-summary__entry,
  .growth-summary__next-fill {
    transition: none;
    transform: none;
  }
}
</style>
