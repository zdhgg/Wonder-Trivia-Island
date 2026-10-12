<script setup>
import { computed } from "vue";
import IslandDialog from "./IslandDialog.vue";
import KnowledgeIslandGrowth from "../KnowledgeIslandGrowth.vue";
import { buildKnowledgeIslandGrowth } from "../../utils/knowledgeIslandGrowth";
const props = defineProps({
  stage: { type: Object, default: null },
  island: { type: Object, required: true }
});
const emit = defineEmits(["close"]);
// 预览独立生成展示数据，绝不写回用户的岛屿、星星或领取状态。
const preview = computed(() => props.stage ? buildKnowledgeIslandGrowth(props.stage.threshold, { starCount: props.island.prosperityStarCount }) : null);
const remaining = computed(() => Math.max(0, (props.stage?.threshold || 0) - props.island.stampCount));
const newFeatures = computed(() => props.stage?.features.filter(feature => !props.island.currentStage.features.includes(feature)) || []);
</script>

<template>
  <IslandDialog :open="Boolean(stage)" :title="`${stage?.name || ''} · 阶段预览`" @close="emit('close')">
    <template v-if="preview">
      <p class="stage-preview__notice">{{ remaining ? `还差 ${remaining} 枚印章解锁，以下是未来的样子。` : stage.id === island.currentStage.id ? '这就是小岛现在的样子。' : '这是你已经走过的成长阶段。' }}</p>
      <KnowledgeIslandGrowth :island="preview" :interactive="false" size="hero" />
      <p class="stage-preview__summary">{{ stage.summary }}</p>
      <p v-if="newFeatures.length" class="stage-preview__features">将会出现：{{ newFeatures.join('、') }}</p>
    </template>
  </IslandDialog>
</template>

<style scoped>
.stage-preview__notice {
  margin: 0 0 16px;
  color: #527666;
  font-size: .88rem;
  line-height: 1.7;
}

.stage-preview__summary {
  margin: 18px 0 8px;
  line-height: 1.7;
}

.stage-preview__features {
  margin: 0;
  color: #6b7e7d;
  font-size: .85rem;
  line-height: 1.7;
}
</style>
