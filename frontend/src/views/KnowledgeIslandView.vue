<script setup>
// 我的知识岛：长期成长的独立页面（/knowledge-island）。
//
// 这一页只做两件事：
//   1. 把 KnowledgeIslandGrowth 放大成整页的主画面（size="hero"）；
//   2. 用同一份岛屿 ViewModel 说清楚「现在是什么样、还差多少」。
//
// 它不读 localStorage、不调接口、不数印章、不比阈值：
//   - 阶段 / 进度 / 下一阶段 / 繁荣度全部来自 knowledgeIslandGrowth 的纯函数结果；
//   - 页面不新增任何成长规则，也不引入第二份知识岛状态。
//   收藏册里的「我的知识岛」入口卡与首页摘要读的是同一套纯函数输入，
//   所以三处永远是同一个阶段、同一档繁荣度、同一颗星星。
import { computed } from "vue";
import { useRouter } from "vue-router";
import KnowledgeIslandGrowth from "../components/KnowledgeIslandGrowth.vue";
import { APP_ROUTE_NAME } from "../router/routes.js";
import { getKnowledgeIslandStageIndexById } from "../utils/knowledgeIslandGrowth.js";
import { KNOWLEDGE_ISLAND_PROSPERITY_TIERS } from "../utils/knowledgeIslandProsperity.js";

const props = defineProps({
  island: {
    type: Object,
    required: true
  }
});

const router = useRouter();

// 顶部摘要：阶段 + 繁荣度各说一次，不重复下面的成长信息网格。
const stageName = computed(() => props.island?.currentStage?.name || "");
const stageGlyph = computed(() => props.island?.currentStage?.glyph || "🏝️");
const stageSummary = computed(() => props.island?.currentStage?.summary || "");
const prosperityKey = computed(() => String(props.island?.prosperityKey || "basic"));
const stampCount = computed(() => Number(props.island?.stampCount) || 0);
const starCount = computed(() => Number(props.island?.prosperityStarCount) || 0);

// 「第几 / 共几个阶段」：阶段顺序仍然只由 knowledgeIslandGrowth 解释，这里只是问一句。
const stagePosition = computed(() => {
  const stageIndex = getKnowledgeIslandStageIndexById(props.island?.currentStage?.id);
  const stageCount = Number(props.island?.stageCount) || 0;
  const safeIndex = stageIndex >= 0 ? stageIndex : 0;

  return `第 ${safeIndex + 1} / ${stageCount} 个阶段`;
});

function goHome() {
  void router.push({ name: APP_ROUTE_NAME.HOME });
}
</script>

<template>
  <section class="island-page" aria-label="我的知识岛">
    <header class="island-page__hero">
      <div class="island-page__hero-copy">
        <p class="island-page__eyebrow">长期成长 · 跨章节累计</p>
        <h1 class="island-page__title">我的知识岛</h1>
        <p class="island-page__lead">印章让小岛成长，星星让小岛更加繁荣。</p>
      </div>

      <div class="island-page__hero-side">
        <p class="island-page__hero-stage">
          <span class="island-page__hero-glyph" aria-hidden="true">{{ stageGlyph }}</span>
          <span class="island-page__hero-stage-text">
            <strong>当前：{{ stageName }}</strong>
            <span :class="['island-page__hero-prosperity', `island-page__hero-prosperity--${prosperityKey}`]">
              {{ island.prosperityLabel }}
            </span>
          </span>
        </p>
        <button class="island-page__back" type="button" @click="goHome">返回首页</button>
      </div>
    </header>

    <!-- 主体：同一座岛，只是不再被压缩在收藏册的小模块里。 -->
    <KnowledgeIslandGrowth :island="island" size="hero" />

    <p class="island-page__summary">{{ stageSummary }}</p>

    <section class="island-page__stats" aria-label="知识岛成长信息">
      <article class="island-page__stat">
        <span class="island-page__stat-label">当前阶段</span>
        <strong class="island-page__stat-value">{{ stageName }}</strong>
        <span class="island-page__stat-note">{{ stagePosition }}</span>
      </article>

      <article class="island-page__stat">
        <span class="island-page__stat-label">探险印章</span>
        <strong class="island-page__stat-value" data-role="island-page-stamp-count">{{ stampCount }} 枚</strong>
        <span class="island-page__stat-note">每开一次今日宝箱多一枚</span>
      </article>

      <article class="island-page__stat">
        <span class="island-page__stat-label">繁荣度</span>
        <strong :class="['island-page__stat-value', `island-page__stat-value--${prosperityKey}`]">
          {{ island.prosperityLabel }}
        </strong>
        <span class="island-page__stat-note">{{ island.prosperity.summary }}</span>
      </article>

      <article class="island-page__stat">
        <span class="island-page__stat-label">累计星星</span>
        <strong class="island-page__stat-value" data-role="island-page-star-count">{{ starCount }} 颗</strong>
        <span class="island-page__stat-note">全部章节加起来的好成绩</span>
      </article>

      <article class="island-page__stat island-page__stat--wide">
        <span class="island-page__stat-label">下一枚印章</span>
        <!-- 直接说 knowledgeIslandGrowth 已经算好的那句话：同一件事全站只有一种说法。 -->
        <strong class="island-page__stat-value" data-role="island-page-next">{{ island.nextText }}</strong>
        <span v-if="!island.isMaxStage" class="island-page__stat-note">
          这一阶段已经走了 {{ island.progressText }} 枚
        </span>
      </article>
    </section>

    <!-- 繁荣度三档：档位名称与顺序都直接读 knowledgeIslandProsperity 的常量，
         页面只负责把「已经走到哪一档」画出来，不在这里重新判定星数。 -->
    <div class="island-page__tiers" aria-label="繁荣度三个档位">
      <span
        v-for="tier in KNOWLEDGE_ISLAND_PROSPERITY_TIERS"
        :key="tier.key"
        :class="[
          'island-page__tier',
          `island-page__tier--${tier.key}`,
          { 'island-page__tier--reached': Number(island.prosperityLevel) >= tier.level }
        ]"
      >
        {{ tier.label }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.island-page {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.island-page__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.42) 0%, rgba(173, 235, 255, 0) 36%),
    linear-gradient(180deg, rgba(255, 253, 248, 0.96) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow:
    0 22px 34px -36px rgba(36, 50, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.island-page__hero-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.island-page__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
}

.island-page__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.9rem;
  line-height: 1.15;
}

.island-page__lead {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.6;
}

.island-page__hero-side {
  display: grid;
  justify-items: end;
  gap: 10px;
  min-width: 0;
}

.island-page__hero-stage {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  min-width: 0;
}

.island-page__hero-glyph {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(72, 154, 148, 0.24);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  font-size: 1.5rem;
  line-height: 1;
}

.island-page__hero-stage-text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--color-ink);
  font-size: 1.05rem;
}

.island-page__hero-prosperity {
  padding: 2px 10px;
  border: 1px solid rgba(72, 154, 148, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #2f7a6c;
  font-size: 0.8rem;
  font-weight: 900;
}

.island-page__hero-prosperity--lush {
  border-color: rgba(52, 138, 92, 0.32);
  background: rgba(240, 252, 240, 0.86);
  color: #2f7a4c;
}

.island-page__hero-prosperity--flourishing {
  border-color: rgba(198, 141, 26, 0.36);
  background: rgba(255, 249, 226, 0.9);
  color: #8a5a00;
}

.island-page__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 10px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.island-page__back:hover,
.island-page__back:focus-visible {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  outline: none;
  transform: translateY(-1px);
}

.island-page__summary {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.6;
}

/* 成长信息：宽屏一行四格，窄屏折成两格；最后一格独占一整行。 */
.island-page__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.island-page__stat {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 20px;
  background: linear-gradient(160deg, #ffffff 0%, #f7fbfe 100%);
  box-shadow: 0 18px 30px -32px rgba(36, 50, 74, 0.4);
}

.island-page__stat--wide {
  grid-column: 1 / -1;
}

.island-page__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.island-page__stat-value {
  min-width: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.35rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.island-page__stat-value--basic {
  color: #2f7a6c;
}

.island-page__stat-value--lush {
  color: #2f7a4c;
}

.island-page__stat-value--flourishing {
  color: #8a5a00;
}

.island-page__stat-note {
  min-width: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.5;
}

.island-page__tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.island-page__tier {
  padding: 4px 12px;
  border: 1.5px dashed rgba(36, 50, 74, 0.16);
  border-radius: 999px;
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
  opacity: 0.55;
}

.island-page__tier--reached {
  border-style: solid;
  opacity: 1;
}

.island-page__tier--basic.island-page__tier--reached {
  border-color: rgba(72, 154, 148, 0.36);
  background: rgba(238, 250, 246, 0.9);
  color: #2f7a6c;
}

.island-page__tier--lush.island-page__tier--reached {
  border-color: rgba(52, 138, 92, 0.36);
  background: rgba(240, 252, 240, 0.9);
  color: #2f7a4c;
}

.island-page__tier--flourishing.island-page__tier--reached {
  border-color: rgba(198, 141, 26, 0.4);
  background: rgba(255, 249, 226, 0.92);
  color: #8a5a00;
}

@media (max-width: 900px) {
  .island-page__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .island-page {
    gap: 12px;
  }

  .island-page__hero {
    padding: 16px 14px;
    border-radius: 22px;
  }

  .island-page__title {
    font-size: 1.6rem;
  }

  /* 窄屏顶部摘要改成左对齐一列，按钮仍占满一行方便点。 */
  .island-page__hero-side {
    justify-items: start;
    width: 100%;
  }

  .island-page__back {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-page__back {
    transition: none;
  }

  .island-page__back:hover,
  .island-page__back:focus-visible {
    transform: none;
  }
}
</style>
