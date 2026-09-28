<script setup>
import ComparisonDemoRenderer from "./ComparisonDemoRenderer.vue";
import MicroAnimationRenderer from "./MicroAnimationRenderer.vue";

defineProps({
  spec: {
    type: Object,
    default: null
  }
});

</script>

<template>
  <div class="teaching-demo-renderer">
    <ComparisonDemoRenderer v-if="spec?.template === 'comparison_demo'" :spec="spec" />
    <MicroAnimationRenderer v-else-if="spec?.template === 'micro_animation'" :spec="spec" />
    <p v-else class="teaching-demo-renderer__unsupported">当前草稿使用了未支持的演示模板。</p>
  </div>
</template>

<style scoped>
.teaching-demo-renderer {
  min-width: 0;
}

.teaching-demo-renderer__unsupported {
  margin: 0;
  padding: 14px;
  border: 1px dashed rgba(166, 61, 75, 0.36);
  border-radius: 12px;
  background: rgba(255, 229, 232, 0.55);
  color: #a63d4b;
  font-size: 0.84rem;
}
</style>
