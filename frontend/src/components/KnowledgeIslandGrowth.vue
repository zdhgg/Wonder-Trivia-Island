<script setup>
// 知识岛成长展示组件：只负责把已经算好的 ViewModel 画出来。
//
// 组件不做任何判定：不读 localStorage、不调接口、不自己数印章、不自己算阶段。
// 阶段文字 / 进度 / 下一阶段提示全部来自 knowledgeIslandGrowth.buildKnowledgeIslandGrowth()；
// 岛上元素出现与否只看「当前阶段的 features 里有没有这件东西」——
// 组件里没有第二份阶段顺序数组（顺序的唯一来源是 KNOWLEDGE_ISLAND_STAGES）。
//
// 本轮不引入外部图片资产：岛屿用 CSS 形状 + emoji 拼出来，
// 不同阶段肉眼可见地多出东西（沙滩 → 嫩芽 → 椰子树 → 小码头 → 灯塔）。
import { getKnowledgeIslandFeatureGlyph } from "../utils/knowledgeIslandGrowth";

const props = defineProps({
  island: {
    type: Object,
    required: true
  }
});

function currentStageFeatures() {
  return props.island?.currentStage?.features || [];
}

// 阶段配置里的 features 只增不减，所以“现在岛上有这件东西”=
// “当前阶段已经包含它”。
function hasIslandFeature(feature) {
  return currentStageFeatures().includes(feature);
}

function hasIslandFeatureGlyph(glyph) {
  return currentStageFeatures().some((feature) => getKnowledgeIslandFeatureGlyph(feature) === glyph);
}
</script>

<template>
  <div class="knowledge-island" :data-stage="island.currentStage.id" :class="`knowledge-island--${island.currentStage.id}`">
    <!-- 岛屿视觉：0 枚时也是一座有沙滩、有海浪的小岛，不是空白卡片。 -->
    <div
      class="knowledge-island__figure"
      data-role="knowledge-island-figure"
      role="img"
      :data-stage="island.currentStage.id"
      :aria-label="`知识岛现在的样子：${island.currentStage.name}`"
    >
      <span class="knowledge-island__sky-dot knowledge-island__sky-dot--a" aria-hidden="true"></span>
      <span class="knowledge-island__sky-dot knowledge-island__sky-dot--b" aria-hidden="true"></span>

      <span v-if="hasIslandFeature('灯光')" class="knowledge-island__beam" aria-hidden="true"></span>
      <span class="knowledge-island__sea" aria-hidden="true"></span>
      <span class="knowledge-island__surf" aria-hidden="true"></span>
      <span class="knowledge-island__ground" aria-hidden="true"></span>

      <span v-if="hasIslandFeature('小草丛')" class="knowledge-island__grass" aria-hidden="true">🌿</span>
      <span v-if="hasIslandFeature('嫩芽')" class="knowledge-island__sprout" aria-hidden="true">🌱</span>
      <span v-if="hasIslandFeature('椰子树')" class="knowledge-island__palm" aria-hidden="true">🌴</span>
      <span v-if="hasIslandFeature('小帐篷')" class="knowledge-island__camp" aria-hidden="true">⛺</span>
      <span v-if="hasIslandFeature('小码头')" class="knowledge-island__dock" aria-hidden="true"></span>
      <span v-if="hasIslandFeature('泊岸小船')" class="knowledge-island__boat" aria-hidden="true">⛵</span>
      <span v-if="hasIslandFeature('灯塔')" class="knowledge-island__lighthouse" aria-hidden="true">🗼</span>
    </div>

    <div class="knowledge-island__info">
      <p class="knowledge-island__stage">
        <span class="knowledge-island__stage-glyph" aria-hidden="true">{{ island.currentStage.glyph }}</span>
        <span class="knowledge-island__stage-name">当前：{{ island.currentStage.name }}</span>
      </p>
      <p class="knowledge-island__stamps">{{ island.stampText }}</p>

      <div v-if="!island.isMaxStage" class="knowledge-island__progress">
        <div
          class="knowledge-island__track"
          role="progressbar"
          :aria-valuenow="island.progressValue"
          :aria-valuemin="0"
          :aria-valuemax="island.progressTarget"
          :aria-valuetext="`${island.currentStage.name} 进度 ${island.progressText}`"
        >
          <span class="knowledge-island__fill" :style="{ width: `${island.progressPercent}%` }"></span>
        </div>
        <span class="knowledge-island__progress-text">{{ island.progressText }}</span>
      </div>

      <p class="knowledge-island__next" :class="{ 'knowledge-island__next--max': island.isMaxStage }">{{ island.nextText }}</p>
    </div>

    <!-- 可选补充区域：收藏册（无插槽内容）用来放作用域说明提示词，
         阶段庆祝弹层用来放“去看看我的知识岛”等操作。 -->
    <slot></slot>
  </div>
</template>

<style scoped>
.knowledge-island {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border: 1.5px solid rgba(124, 216, 184, 0.42);
  border-radius: 20px;
  background: linear-gradient(170deg, rgba(240, 251, 247, 0.96) 0%, rgba(255, 252, 244, 0.9) 100%);
  box-sizing: border-box;
}

/* 岛屿画面：固定 5:2，窄屏也不会因为装饰元素把卡片撑大。 */
.knowledge-island__figure {
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 5 / 2;
  max-height: 168px;
  border-radius: 16px;
  background: linear-gradient(180deg, #d9f0fd 0%, #eaf8ff 64%, #eef8ff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.knowledge-island__sky-dot {
  position: absolute;
  top: 14%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
}

.knowledge-island__sky-dot--a {
  left: 14%;
}

.knowledge-island__sky-dot--b {
  left: 24%;
  top: 26%;
  width: 7px;
  height: 7px;
  opacity: 0.7;
}

/* 最高阶段才点亮的光束。 */
.knowledge-island__beam {
  position: absolute;
  right: 4%;
  bottom: 62%;
  width: 46%;
  height: 26%;
  background: linear-gradient(270deg, rgba(255, 233, 158, 0.72) 0%, rgba(255, 233, 158, 0) 100%);
  clip-path: polygon(100% 30%, 0% 0%, 0% 100%, 100% 70%);
  animation: knowledge-island-beam 3.6s ease-in-out infinite;
  z-index: 2;
}

.knowledge-island__sea {
  position: absolute;
  inset: auto 0 0 0;
  height: 62%;
  background: linear-gradient(180deg, rgba(126, 200, 240, 0.55) 0%, rgba(86, 170, 222, 0.72) 100%);
}

.knowledge-island__surf {
  position: absolute;
  inset: auto 0 0 0;
  height: 16%;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.7) 0 14px,
    rgba(255, 255, 255, 0.16) 14px 28px
  );
  opacity: 0.85;
  animation: knowledge-island-surf 7s linear infinite;
  z-index: 3;
}

.knowledge-island__ground {
  position: absolute;
  left: 50%;
  bottom: 16%;
  width: 62%;
  height: 30%;
  transform: translateX(-50%);
  border-radius: 50% 50% 34% 34% / 76% 76% 26% 26%;
  background: linear-gradient(180deg, #ffe6b3 0%, #ffd591 100%);
  box-shadow: 0 12px 20px -14px rgba(36, 50, 74, 0.55), inset 0 2px 0 rgba(255, 255, 255, 0.7);
  z-index: 4;
}

.knowledge-island__sprout,
.knowledge-island__grass,
.knowledge-island__palm,
.knowledge-island__camp,
.knowledge-island__boat,
.knowledge-island__lighthouse {
  position: absolute;
  line-height: 1;
  z-index: 5;
}

.knowledge-island__sprout {
  left: 36%;
  bottom: 30%;
  font-size: 1.1rem;
}

/* 小草丛：和嫩芽同阶段出现，让“萌芽海岸”这一阶段真的多出两样东西。 */
.knowledge-island__grass {
  left: 40%;
  bottom: 24%;
  font-size: 0.9rem;
}

.knowledge-island__palm {
  left: 56%;
  bottom: 34%;
  font-size: 1.6rem;
}

.knowledge-island__camp {
  left: 42%;
  bottom: 26%;
  font-size: 1.2rem;
}

.knowledge-island__dock {
  position: absolute;
  left: 62%;
  bottom: 12%;
  width: 22%;
  height: 9%;
  border-radius: 4px;
  background: linear-gradient(180deg, #e4b57c 0%, #c9924f 100%);
  box-shadow: 0 6px 12px -8px rgba(36, 50, 74, 0.6);
  z-index: 4;
}

.knowledge-island__boat {
  left: 68%;
  bottom: 18%;
  font-size: 1.25rem;
}

.knowledge-island__lighthouse {
  left: 50%;
  bottom: 44%;
  transform: translateX(-50%);
  font-size: 1.9rem;
}

.knowledge-island__info {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.knowledge-island__stage {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-width: 0;
}

.knowledge-island__stage-glyph {
  flex-shrink: 0;
  font-size: 1.2rem;
  line-height: 1;
}

.knowledge-island__stage-name {
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.3;
}

.knowledge-island__stamps {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  font-weight: 800;
}

.knowledge-island__progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.knowledge-island__track {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: rgba(36, 50, 74, 0.1);
}

.knowledge-island__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(124, 216, 184, 0.98) 0%, rgba(86, 176, 214, 0.98) 100%);
  transition: width 260ms ease;
}

.knowledge-island__progress-text {
  flex-shrink: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 900;
}

.knowledge-island__next {
  margin: 0;
  color: #1f6b51;
  font-size: 0.86rem;
  font-weight: 900;
}

.knowledge-island__next--max {
  color: #8a5a00;
}

@keyframes knowledge-island-beam {
  0%,
  100% {
    opacity: 0.42;
  }

  50% {
    opacity: 0.86;
  }
}

@keyframes knowledge-island-surf {
  from {
    background-position-x: 0;
  }

  to {
    background-position-x: 28px;
  }
}

/* 390 窄屏：岛上元素稍微收小一点，绝不撑出横向滚动。 */
@media (max-width: 480px) {
  .knowledge-island {
    padding: 10px 12px;
  }

  .knowledge-island__figure {
    max-height: 132px;
  }

  .knowledge-island__palm {
    font-size: 1.4rem;
  }

  .knowledge-island__lighthouse {
    font-size: 1.6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .knowledge-island__beam,
  .knowledge-island__surf {
    animation: none;
  }

  .knowledge-island__fill {
    transition: none;
  }
}
</style>
