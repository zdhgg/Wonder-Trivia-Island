<script setup>
import { computed } from "vue";
import IslandStageIllustration from "./IslandStageIllustration.vue";
import { KNOWLEDGE_ISLAND_STAGES } from "../../utils/knowledgeIslandGrowth";
import { KNOWLEDGE_ISLAND_PROSPERITY_TIERS } from "../../utils/knowledgeIslandProsperity";
const props = defineProps({
  island: { type: Object, required: true },
  dailyChest: { type: Object, default: () => ({}) },
  claiming: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" }
});
const emit = defineEmits(["claim", "explore", "preview"]);
const nextFeatures = computed(() => {
  const next = KNOWLEDGE_ISLAND_STAGES.find(stage => stage.id === props.island.nextStage?.id);
  return next?.features.filter(feature => !props.island.currentStage.features.includes(feature)).join("、") || "";
});
const starProgress = computed(() => props.island.prosperity.progressPercent);
</script>

<template>
  <aside class="island-growth" aria-label="知识岛成长信息">
    <div class="island-growth__next-head">
      <div>
        <p class="island-growth__eyebrow">{{ island.isMaxStage ? '一路探索，一路成长' : '下一次变化' }}</p>
        <h2>{{ island.nextStage?.name || island.currentStage.name }}</h2>
      </div>
      <IslandStageIllustration class="island-growth__thumbnail" :stage-id="island.nextStage?.id || island.currentStage.id" />
    </div>
    <p class="island-growth__description" data-role="island-page-next">{{ island.nextText }}</p>
    <p v-if="nextFeatures" class="island-growth__features">小岛将迎来：{{ nextFeatures }}</p>
    <div class="island-growth__progress-head">
      <span>探险印章 <strong data-role="island-page-stamp-count">{{ island.stampCount }} 枚</strong></span>
      <span>{{ island.isMaxStage ? '全部阶段已解锁' : `${island.progressText} 枚` }}</span>
    </div>
    <div class="island-growth__track" role="progressbar" aria-label="岛屿成长" :aria-valuenow="island.progressPercent" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="island.nextText">
      <span :style="{ width: `${island.progressPercent}%` }"></span>
    </div>
    <button v-if="island.nextStage" class="island-growth__preview" type="button" @click="emit('preview')">看看它未来的样子 <span aria-hidden="true">↗</span></button>

    <div class="island-growth__today" aria-label="今日行动" :aria-busy="claiming">
      <div class="island-growth__progress-head"><strong>今日探索</strong><span>{{ dailyChest.isClaimed ? '已获得印章' : `${dailyChest.progressText || '0 / 3'} 个小任务` }}</span></div>
      <p aria-live="polite">{{ dailyChest.showStampReward ? '获得 1 枚探险印章，小岛又成长了一点。' : dailyChest.hintText }}</p>
      <button v-if="dailyChest.canClaim || claiming" class="island-growth__action" type="button" :disabled="claiming" @click="emit('claim')">{{ claiming ? '正在打开宝箱…' : '领取今日宝箱' }}<span aria-hidden="true"> →</span></button>
      <button v-else class="island-growth__action" type="button" @click="emit('explore')">{{ dailyChest.isClaimed ? '继续探索' : '继续今日探索' }}<span aria-hidden="true"> →</span></button>
      <p v-if="errorMessage" class="island-growth__error" role="alert">{{ errorMessage }} 点击领取可以重试。</p>
    </div>

    <div class="island-growth__stars">
      <div class="island-growth__progress-head"><span>累计星星 <strong data-role="island-page-star-count">{{ island.prosperityStarCount }} 颗</strong></span><strong class="island-growth__tier">{{ island.prosperityLabel }}</strong></div>
      <div class="island-growth__track island-growth__track--stars" role="progressbar" aria-label="繁荣度" :aria-valuenow="starProgress" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="island.prosperity.nextText"><span :style="{ width: `${starProgress}%` }"></span></div>
      <p class="island-growth__star-note" data-role="island-page-tier-progress">{{ island.prosperity.nextText }}</p>
      <div class="island-growth__tiers" aria-label="繁荣度三个档位">
        <span v-for="tier in KNOWLEDGE_ISLAND_PROSPERITY_TIERS" :key="tier.key" :class="{ 'is-current': tier.level === island.prosperityLevel }">{{ tier.label }} · {{ tier.minStars }}{{ tier.maxStars === null ? '+' : `–${tier.maxStars}` }} 星</span>
      </div>
    </div>

  </aside>
</template>

<style scoped>
.island-growth {
  display: flex;
  flex-direction: column;
  align-self: start;
  min-width: 0;
  padding: 22px;
  border: 1px solid #dce8e6;
  border-radius: 24px;
  background: #ffffffed;
  color: #29424b;
}

.island-growth p, .island-growth h2 {
  margin: 0;
}

.island-growth__next-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.island-growth__eyebrow {
  font-size: .76rem;
  color: #637979;
  margin-bottom: 7px !important;
}

.island-growth h2 {
  font-family: "ZCOOL KuaiLe", sans-serif;
  font-size: 1.4rem;
}

.island-growth__thumbnail {
  width: 85px;
  flex-shrink: 0;
}

.island-growth__description {
  margin-top: 13px !important;
  font-size: .88rem;
  line-height: 1.65;
}

.island-growth__features {
  margin-top: 4px !important;
  font-size: .78rem;
  color: #687d7e;
  line-height: 1.6;
}

.island-growth__progress-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 5px 10px;
  font-size: .76rem;
  line-height: 1.6;
}

.island-growth > .island-growth__progress-head {
  margin-top: 18px;
}

.island-growth__progress-head strong {
  font-weight: 700;
}

.island-growth__track {
  height: 7px;
  border-radius: 9px;
  background: #eaf1ee;
  overflow: hidden;
  margin-top: 8px;
}

.island-growth__track > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #5eaa8d;
  transition: width 400ms ease;
}

.island-growth__track--stars {
  background: #f4eee2;
}

.island-growth__track--stars > span {
  background: #d8ac5c;
}

.island-growth__preview {
  align-self: flex-start;
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  background: none;
  color: #397966;
  font: inherit;
  font-size: .8rem;
  cursor: pointer;
}

.island-growth__preview span {
  margin-left: 8px;
}

.island-growth__preview:hover {
  color: #1c5947;
  text-decoration: underline;
}

.island-growth__stars {
  padding-top: 17px;
  margin-top: 20px;
  border-top: 1px solid #e7eeeb;
}

.island-growth__tier {
  color: #8b692f;
}

.island-growth__star-note {
  margin-top: 8px !important;
  font-size: .75rem;
  color: #6a7b7d;
  line-height: 1.6;
}

.island-growth__tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 8px;
  font-size: .65rem;
  color: #738080;
}

.island-growth__tiers .is-current {
  color: #846124;
  font-weight: 700;
}

.island-growth__today {
  padding-top: 18px;
  margin-top: 0;
}

.island-growth__today > p {
  margin: 5px 0 12px;
  color: #6a7b7d;
  font-size: .78rem;
  line-height: 1.6;
}

.island-growth__action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 46px;
  padding: 10px 16px;
  border: 0;
  border-radius: 13px;
  background: #327967;
  color: #fff;
  font: inherit;
  font-size: .86rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 160ms ease;
}

.island-growth__action:hover {
  background: #246653;
}

.island-growth__action:active {
  transform: translateY(1px);
}

.island-growth__action:disabled {
  background: #75988b;
  cursor: wait;
}

.island-growth button:focus-visible {
  outline: 3px solid #b98837;
  outline-offset: 3px;
}

.island-growth__today > .island-growth__error {
  color: #a34335;
}

@media (max-width: 1050px) and (min-width: 681px) {
  .island-growth {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 28px;
  }
  .island-growth > :not(.island-growth__stars):not(.island-growth__today) {
    grid-column: 1;
  }
  .island-growth__stars {
    grid-column: 2;
    grid-row: 1 / 5;
    padding-top: 0;
    border-top: 0;
  }
  .island-growth__today {
    grid-column: 2;
    grid-row: 5 / 8;
    margin: 0;
  }
}

@media (max-width: 680px) {
  .island-growth {
    padding: 20px;
    border-radius: 20px;
  }
  .island-growth__today {
    padding-top: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-growth__track > span, .island-growth__action {
    transition: none;
  }
}
</style>
