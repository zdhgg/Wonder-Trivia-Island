<script setup>
// 知识岛成长展示组件：只负责把已经算好的 ViewModel 画出来。
//
// 组件不做任何判定：不读 localStorage、不调接口、不自己数印章、不自己算阶段。
// 阶段文字 / 进度 / 下一阶段提示全部来自 knowledgeIslandGrowth.buildKnowledgeIslandGrowth()；
// 岛上元素出现与否只看「当前阶段的 features 里有没有这件东西」——
// 组件里没有第二份阶段顺序数组（顺序的唯一来源是 KNOWLEDGE_ISLAND_STAGES）。
//
// 画面是轻量 CSS 绘本地图：海水、浪线、沙洲、草地与小物件分层，
// 阶段元素在同一幅小景里逐件长出来，不引入图片资产或额外渲染依赖。
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
</script>

<template>
  <div class="knowledge-island" :data-stage="island.currentStage.id" :class="`knowledge-island--${island.currentStage.id}`">
    <div
      class="knowledge-island__figure"
      data-role="knowledge-island-figure"
      role="img"
      :data-stage="island.currentStage.id"
      :aria-label="`知识岛现在的样子：${island.currentStage.name}。${island.currentStage.summary}`"
    >
      <!-- 天空：留出一块明亮的绘本留白，再用太阳与云朵交代远景。 -->
      <span class="knowledge-island__sun" aria-hidden="true"></span>
      <span class="knowledge-island__cloud knowledge-island__cloud--left" aria-hidden="true"></span>
      <span class="knowledge-island__cloud knowledge-island__cloud--right" aria-hidden="true"></span>
      <span class="knowledge-island__sky-dot knowledge-island__sky-dot--a" aria-hidden="true"></span>
      <span class="knowledge-island__sky-dot knowledge-island__sky-dot--b" aria-hidden="true"></span>

      <!-- 海水分三层：远处的浅蓝、近处的深蓝和贴着岸边的浪花。 -->
      <span class="knowledge-island__sea" aria-hidden="true"></span>
      <span class="knowledge-island__sea-depth" aria-hidden="true"></span>
      <span class="knowledge-island__surf" aria-hidden="true">
        <span class="knowledge-island__surf-line knowledge-island__surf-line--a"></span>
        <span class="knowledge-island__surf-line knowledge-island__surf-line--b"></span>
        <span class="knowledge-island__surf-line knowledge-island__surf-line--c"></span>
        <span class="knowledge-island__surf-line knowledge-island__surf-line--d"></span>
      </span>

      <!-- 最高阶段才点亮的灯塔光束。 -->
      <span v-if="hasIslandFeature('灯光')" class="knowledge-island__beam" aria-hidden="true"></span>

      <!-- 岛影、沙滩和草地内的纹理共同组成不规则岸线。 -->
      <span class="knowledge-island__island-shadow" aria-hidden="true"></span>
      <span class="knowledge-island__ground" aria-hidden="true"></span>
      <span class="knowledge-island__shoreline" aria-hidden="true"></span>
      <span class="knowledge-island__rock knowledge-island__rock--left" aria-hidden="true"></span>
      <span class="knowledge-island__rock knowledge-island__rock--right" aria-hidden="true"></span>
      <span class="knowledge-island__shell" aria-hidden="true"></span>

      <!-- 下面这些是成长元素，名称与 features 保持一一对应。 -->
      <span v-if="hasIslandFeature('小草丛')" class="knowledge-island__grass" aria-hidden="true">
        <span class="knowledge-island__grass-blade knowledge-island__grass-blade--a"></span>
        <span class="knowledge-island__grass-blade knowledge-island__grass-blade--b"></span>
        <span class="knowledge-island__grass-blade knowledge-island__grass-blade--c"></span>
      </span>

      <span v-if="hasIslandFeature('嫩芽')" class="knowledge-island__sprout" aria-hidden="true">
        <span class="knowledge-island__sprout-stem"></span>
        <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--left"></span>
        <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--right"></span>
      </span>

      <span v-if="hasIslandFeature('椰子树')" class="knowledge-island__palm" aria-hidden="true">
        <span class="knowledge-island__palm-trunk"></span>
        <span class="knowledge-island__palm-crown">
          <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--a"></span>
          <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--b"></span>
          <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--c"></span>
          <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--d"></span>
        </span>
        <span class="knowledge-island__palm-fruit"></span>
      </span>

      <span v-if="hasIslandFeature('小帐篷')" class="knowledge-island__camp" aria-hidden="true">
        <span class="knowledge-island__camp-body"></span>
        <span class="knowledge-island__camp-door"></span>
        <span class="knowledge-island__camp-flag"></span>
      </span>

      <span v-if="hasIslandFeature('小码头')" class="knowledge-island__dock" aria-hidden="true">
        <span class="knowledge-island__dock-plank knowledge-island__dock-plank--a"></span>
        <span class="knowledge-island__dock-plank knowledge-island__dock-plank--b"></span>
        <span class="knowledge-island__dock-post knowledge-island__dock-post--a"></span>
        <span class="knowledge-island__dock-post knowledge-island__dock-post--b"></span>
      </span>

      <span v-if="hasIslandFeature('泊岸小船')" class="knowledge-island__boat" aria-hidden="true">
        <span class="knowledge-island__boat-hull"></span>
        <span class="knowledge-island__boat-mast"></span>
        <span class="knowledge-island__boat-sail"></span>
      </span>

      <span v-if="hasIslandFeature('灯塔')" class="knowledge-island__lighthouse" aria-hidden="true">
        <span class="knowledge-island__lighthouse-roof"></span>
        <span class="knowledge-island__lighthouse-tower"></span>
        <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--a"></span>
        <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--b"></span>
        <span class="knowledge-island__lighthouse-light"></span>
      </span>
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
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid rgba(83, 177, 173, 0.42);
  border-radius: 22px;
  background:
    linear-gradient(170deg, rgba(238, 252, 249, 0.98) 0%, rgba(255, 252, 243, 0.94) 100%);
  box-sizing: border-box;
}

/* 一幅小小的冒险地图：比例足够高，让岛岸与阶段建筑有呼吸空间。 */
.knowledge-island__figure {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 16 / 8.5;
  max-height: 220px;
  min-height: 118px;
  border: 1px solid rgba(50, 143, 174, 0.22);
  border-radius: 18px;
  background:
    radial-gradient(circle at 78% 16%, rgba(255, 255, 255, 0.74) 0 13%, transparent 14%),
    linear-gradient(180deg, #ccecf8 0%, #e8f8fb 57%, #dff3f3 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 10px 18px -18px rgba(37, 106, 126, 0.55);
}

.knowledge-island__sun {
  position: absolute;
  top: 10%;
  right: 10%;
  width: clamp(22px, 5vw, 36px);
  aspect-ratio: 1;
  border: clamp(2px, 0.45vw, 4px) solid rgba(255, 250, 211, 0.9);
  border-radius: 50%;
  background: #ffd979;
  box-shadow: 0 0 0 5px rgba(255, 232, 155, 0.22), 0 8px 15px -10px rgba(214, 142, 37, 0.6);
  z-index: 1;
}

.knowledge-island__cloud {
  position: absolute;
  width: 17%;
  height: 8%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  opacity: 0.86;
  z-index: 1;
}

.knowledge-island__cloud::before,
.knowledge-island__cloud::after {
  content: "";
  position: absolute;
  bottom: 15%;
  border-radius: 50%;
  background: inherit;
}

.knowledge-island__cloud::before {
  left: 16%;
  width: 42%;
  aspect-ratio: 1;
}

.knowledge-island__cloud::after {
  right: 14%;
  width: 30%;
  aspect-ratio: 1;
}

.knowledge-island__cloud--left {
  top: 19%;
  left: 8%;
  transform: scale(0.78);
}

.knowledge-island__cloud--right {
  top: 30%;
  right: 28%;
  transform: scale(0.58);
  opacity: 0.56;
}

.knowledge-island__sky-dot {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1;
}

.knowledge-island__sky-dot--a {
  top: 15%;
  left: 31%;
}

.knowledge-island__sky-dot--b {
  top: 31%;
  left: 43%;
  width: 4px;
  height: 4px;
  opacity: 0.72;
}

/* 远处浅海 + 近处深海，海平面用不规则曲线而不是一条直线。 */
.knowledge-island__sea {
  position: absolute;
  inset: auto -4% 0;
  height: 62%;
  background: linear-gradient(180deg, #85cde6 0%, #5faed2 100%);
  clip-path: polygon(0 18%, 10% 12%, 21% 16%, 34% 8%, 48% 14%, 61% 7%, 74% 13%, 87% 8%, 100% 15%, 100% 100%, 0 100%);
  z-index: 2;
}

.knowledge-island__sea::before,
.knowledge-island__sea::after {
  content: "";
  position: absolute;
  left: 0;
  width: 100%;
  height: 38%;
  background: repeating-linear-gradient(
    168deg,
    rgba(255, 255, 255, 0.18) 0 2px,
    transparent 2px 22px
  );
  opacity: 0.72;
}

.knowledge-island__sea::before {
  top: 20%;
}

.knowledge-island__sea::after {
  top: 53%;
  transform: translateX(-18px);
  opacity: 0.46;
}

.knowledge-island__sea-depth {
  position: absolute;
  inset: auto -4% 0;
  height: 35%;
  background: linear-gradient(180deg, rgba(42, 135, 183, 0.22), rgba(38, 115, 167, 0.48));
  clip-path: polygon(0 20%, 20% 10%, 41% 24%, 62% 12%, 82% 21%, 100% 12%, 100% 100%, 0 100%);
  z-index: 3;
}

.knowledge-island__surf {
  position: absolute;
  inset: auto -2% 26%;
  height: 14%;
  opacity: 0.76;
  z-index: 4;
}

/* 岸边只留几段手绘浪线：宽度、间距、角度各不相同，避免规则矩形的瓷砖感。 */
.knowledge-island__surf-line {
  --wave-angle: 0deg;
  --wave-shift: 3px;
  position: absolute;
  display: block;
  height: 11px;
  border-top: 3px solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  transform: translateX(0) rotate(var(--wave-angle));
  transform-origin: left center;
  animation: knowledge-island-wave-drift 7s ease-in-out infinite alternate;
}

.knowledge-island__surf-line::after {
  content: "";
  position: absolute;
  right: 7%;
  top: -5px;
  width: 8px;
  height: 5px;
  border-top: 2px solid rgba(255, 255, 255, 0.68);
  border-radius: 50%;
  transform: rotate(-16deg);
}

.knowledge-island__surf-line--a {
  top: 40%;
  left: 4%;
  width: 17%;
  --wave-angle: -4deg;
  --wave-shift: 2px;
}

.knowledge-island__surf-line--b {
  top: 24%;
  left: 25%;
  width: 24%;
  border-top-width: 2px;
  --wave-angle: 3deg;
  --wave-shift: 4px;
  animation-delay: -1.8s;
}

.knowledge-island__surf-line--c {
  top: 53%;
  left: 54%;
  width: 19%;
  --wave-angle: -2deg;
  --wave-shift: 3px;
  animation-delay: -3.4s;
}

.knowledge-island__surf-line--d {
  top: 18%;
  left: 79%;
  width: 13%;
  border-top-width: 2px;
  --wave-angle: 5deg;
  --wave-shift: 2px;
  animation-delay: -5.2s;
}

/* 最高阶段才点亮的光束。 */
.knowledge-island__beam {
  position: absolute;
  right: 4%;
  bottom: 53%;
  width: 42%;
  height: 25%;
  background: linear-gradient(270deg, rgba(255, 238, 160, 0.76), rgba(255, 238, 160, 0));
  clip-path: polygon(100% 25%, 0 0, 0 100%, 100% 75%);
  animation: knowledge-island-beam 4s ease-in-out infinite;
  z-index: 8;
}

.knowledge-island__island-shadow {
  position: absolute;
  left: 50%;
  bottom: 12%;
  width: 68%;
  height: 40%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(39, 91, 108, 0.26);
  filter: blur(3px);
  clip-path: polygon(8% 50%, 17% 26%, 35% 15%, 53% 22%, 71% 11%, 91% 31%, 96% 60%, 78% 76%, 57% 88%, 35% 80%, 15% 72%);
  z-index: 5;
}

/* 沙洲是手绘地图式的不规则轮廓；内部伪元素是初始就有的草地。 */
.knowledge-island__ground {
  position: absolute;
  left: 50%;
  bottom: 16%;
  width: 66%;
  height: 48%;
  transform: translateX(-50%);
  border: 2px solid rgba(226, 168, 87, 0.36);
  border-radius: 50%;
  background: linear-gradient(170deg, #ffe7b6 0%, #ffd28a 100%);
  clip-path: polygon(7% 48%, 16% 27%, 34% 15%, 52% 21%, 70% 10%, 89% 28%, 97% 53%, 87% 72%, 66% 78%, 50% 91%, 30% 79%, 12% 73%);
  box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.68), 0 10px 18px -16px rgba(49, 77, 73, 0.68);
  z-index: 6;
}

.knowledge-island__ground::before {
  content: "";
  position: absolute;
  inset: 10% 14% 19% 17%;
  border-radius: 50%;
  background: linear-gradient(160deg, #a5d98d 0%, #79c57d 100%);
  clip-path: polygon(5% 45%, 18% 20%, 37% 14%, 54% 22%, 75% 12%, 93% 37%, 88% 65%, 68% 80%, 43% 74%, 22% 84%, 9% 67%);
  opacity: 0.95;
}

.knowledge-island__ground::after {
  content: "";
  position: absolute;
  left: 39%;
  bottom: 18%;
  width: 18%;
  height: 48%;
  border-left: 4px solid rgba(255, 227, 167, 0.92);
  border-radius: 50%;
  transform: rotate(28deg);
  opacity: 0.9;
}

.knowledge-island__shoreline {
  position: absolute;
  left: 50%;
  bottom: 20%;
  width: 65%;
  height: 45%;
  transform: translateX(-50%);
  border: 3px dotted rgba(255, 247, 214, 0.76);
  border-color: rgba(255, 247, 214, 0.76) transparent transparent;
  border-radius: 50%;
  clip-path: polygon(0 0, 100% 0, 100% 62%, 0 62%);
  opacity: 0.84;
  z-index: 7;
}

.knowledge-island__rock,
.knowledge-island__shell {
  position: absolute;
  z-index: 8;
}

.knowledge-island__rock {
  width: 18px;
  height: 10px;
  border-radius: 70% 50% 48% 60%;
  background: linear-gradient(145deg, #9caeb0 0%, #6c898e 100%);
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.38), 0 4px 8px -7px rgba(38, 76, 86, 0.8);
}

.knowledge-island__rock--left {
  left: 27%;
  bottom: 29%;
  transform: rotate(-12deg);
}

.knowledge-island__rock--right {
  right: 29%;
  bottom: 23%;
  width: 14px;
  height: 8px;
  transform: rotate(17deg);
  opacity: 0.82;
}

.knowledge-island__shell {
  right: 37%;
  bottom: 28%;
  width: 12px;
  height: 8px;
  border: 2px solid #efad83;
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  transform: rotate(-16deg);
  box-shadow: inset 0 2px 0 rgba(255, 244, 214, 0.72);
}

/* 所有岛上元素都坐在草地 / 沙滩上方。 */
.knowledge-island__sprout,
.knowledge-island__grass,
.knowledge-island__palm,
.knowledge-island__camp,
.knowledge-island__dock,
.knowledge-island__boat,
.knowledge-island__lighthouse {
  position: absolute;
  z-index: 9;
}

.knowledge-island__sprout {
  left: 36%;
  bottom: 38%;
  width: 24px;
  height: 31px;
}

.knowledge-island__sprout-stem {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 3px;
  height: 20px;
  transform: translateX(-50%) rotate(4deg);
  border-radius: 999px;
  background: #4c9d5d;
}

.knowledge-island__sprout-leaf {
  position: absolute;
  bottom: 14px;
  width: 14px;
  height: 8px;
  border-radius: 100% 0 100% 0;
  background: #4dba72;
}

.knowledge-island__sprout-leaf--left {
  left: 1px;
  transform: rotate(-28deg);
}

.knowledge-island__sprout-leaf--right {
  right: 1px;
  transform: scaleX(-1) rotate(-28deg);
}

.knowledge-island__grass {
  left: 42%;
  bottom: 26%;
  width: 22px;
  height: 19px;
}

.knowledge-island__grass-blade {
  position: absolute;
  bottom: 0;
  width: 5px;
  height: 17px;
  border-radius: 100% 0 100% 0;
  background: #4b9f60;
  transform-origin: bottom center;
}

.knowledge-island__grass-blade--a {
  left: 2px;
  transform: rotate(-25deg);
}

.knowledge-island__grass-blade--b {
  left: 9px;
  height: 19px;
}

.knowledge-island__grass-blade--c {
  right: 1px;
  transform: rotate(29deg);
}

.knowledge-island__palm {
  left: 57%;
  bottom: 39%;
  width: 45px;
  height: 70px;
}

.knowledge-island__palm-trunk {
  position: absolute;
  left: 18px;
  bottom: 0;
  width: 10px;
  height: 48px;
  border-radius: 60% 44% 18% 18%;
  background: repeating-linear-gradient(168deg, #b97842 0 8px, #d19452 8px 12px);
  transform: rotate(7deg);
  transform-origin: bottom center;
}

.knowledge-island__palm-crown {
  position: absolute;
  left: 1px;
  top: 0;
  width: 42px;
  height: 34px;
}

.knowledge-island__palm-leaf {
  position: absolute;
  left: 18px;
  top: 15px;
  width: 29px;
  height: 9px;
  border-radius: 100% 0 100% 0;
  background: #3d9d62;
  transform-origin: 0 50%;
}

.knowledge-island__palm-leaf--a {
  transform: rotate(-20deg);
}

.knowledge-island__palm-leaf--b {
  transform: rotate(25deg) scale(0.94);
}

.knowledge-island__palm-leaf--c {
  transform: rotate(158deg) scale(0.82);
}

.knowledge-island__palm-leaf--d {
  transform: rotate(202deg) scale(0.72);
}

.knowledge-island__palm-fruit {
  position: absolute;
  left: 18px;
  top: 20px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8f683a;
  box-shadow: 6px 2px 0 #8f683a;
}

.knowledge-island__camp {
  left: 43%;
  bottom: 28%;
  width: 42px;
  height: 31px;
}

.knowledge-island__camp-body {
  position: absolute;
  left: 2px;
  bottom: 0;
  width: 38px;
  height: 27px;
  background: #f2a65b;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  filter: drop-shadow(0 3px 0 rgba(173, 102, 58, 0.22));
}

.knowledge-island__camp-door {
  position: absolute;
  left: 17px;
  bottom: 0;
  width: 9px;
  height: 14px;
  border-radius: 8px 8px 0 0;
  background: #7b6756;
}

.knowledge-island__camp-flag {
  position: absolute;
  top: -4px;
  left: 20px;
  width: 2px;
  height: 10px;
  background: #80512f;
}

.knowledge-island__camp-flag::after {
  content: "";
  position: absolute;
  top: 0;
  left: 2px;
  width: 9px;
  height: 6px;
  background: #ef6e65;
  clip-path: polygon(0 0, 100% 28%, 0 100%);
}

.knowledge-island__dock {
  left: 66%;
  bottom: 20%;
  width: 24%;
  height: 25%;
  transform: rotate(-8deg);
}

.knowledge-island__dock-plank {
  position: absolute;
  left: 0;
  width: 100%;
  height: 8px;
  border: 1px solid rgba(130, 74, 38, 0.35);
  border-radius: 4px;
  background: linear-gradient(180deg, #e6b36d 0%, #b77a42 100%);
  box-shadow: inset 0 1px 0 rgba(255, 245, 204, 0.58);
}

.knowledge-island__dock-plank--a {
  top: 5px;
}

.knowledge-island__dock-plank--b {
  top: 15px;
}

.knowledge-island__dock-post {
  position: absolute;
  top: 5px;
  width: 5px;
  height: 30px;
  border-radius: 3px;
  background: #8f5a32;
}

.knowledge-island__dock-post--a {
  left: 5px;
}

.knowledge-island__dock-post--b {
  right: 5px;
}

.knowledge-island__boat {
  left: 73%;
  bottom: 26%;
  width: 35px;
  height: 33px;
}

.knowledge-island__boat-hull {
  position: absolute;
  left: 2px;
  bottom: 2px;
  width: 30px;
  height: 10px;
  border-radius: 0 0 17px 17px;
  background: #f08d55;
  border: 1px solid rgba(131, 74, 54, 0.35);
}

.knowledge-island__boat-mast {
  position: absolute;
  left: 16px;
  bottom: 11px;
  width: 2px;
  height: 22px;
  background: #765a48;
}

.knowledge-island__boat-sail {
  position: absolute;
  left: 18px;
  top: 1px;
  width: 15px;
  height: 18px;
  background: #fff4d0;
  clip-path: polygon(0 0, 100% 80%, 0 100%);
  border: 1px solid rgba(185, 135, 77, 0.3);
}

.knowledge-island__lighthouse {
  left: 51%;
  bottom: 44%;
  width: 32px;
  height: 64px;
  transform: translateX(-50%);
}

.knowledge-island__lighthouse-roof {
  position: absolute;
  left: 2px;
  top: 0;
  width: 28px;
  height: 13px;
  border-radius: 50% 50% 18% 18%;
  background: #e7665a;
  box-shadow: inset 0 2px 0 rgba(255, 245, 220, 0.42);
}

.knowledge-island__lighthouse-tower {
  position: absolute;
  left: 6px;
  top: 10px;
  width: 20px;
  height: 49px;
  clip-path: polygon(14% 0, 86% 0, 100% 100%, 0 100%);
  background: repeating-linear-gradient(180deg, #fff3cf 0 11px, #e47763 11px 18px);
  border-radius: 4px 4px 2px 2px;
}

.knowledge-island__lighthouse-window {
  position: absolute;
  left: 13px;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #5c9eb4;
  box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.7);
}

.knowledge-island__lighthouse-window--a {
  top: 20px;
}

.knowledge-island__lighthouse-window--b {
  top: 36px;
}

.knowledge-island__lighthouse-light {
  position: absolute;
  left: 12px;
  top: 5px;
  width: 8px;
  height: 7px;
  border-radius: 50%;
  background: #ffe58d;
  box-shadow: 0 0 0 2px rgba(255, 242, 164, 0.5);
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
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(72, 154, 148, 0.24);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.78);
  font-size: 1.15rem;
  line-height: 1;
}

.knowledge-island__stage-name {
  min-width: 0;
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
  border: 1px solid rgba(62, 140, 148, 0.14);
  border-radius: 999px;
  background: rgba(41, 108, 123, 0.12);
  box-shadow: inset 0 1px 2px rgba(35, 89, 104, 0.1);
}

.knowledge-island__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7bd29c 0%, #56b4d2 100%);
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
    opacity: 0.84;
  }
}

@keyframes knowledge-island-wave-drift {
  from {
    transform: translateX(calc(var(--wave-shift) * -1)) rotate(var(--wave-angle));
  }

  to {
    transform: translateX(var(--wave-shift)) rotate(var(--wave-angle));
  }
}

/* 390 窄屏：保留画面层次，缩小建筑与卡片内边距，避免横向溢出。 */
@media (max-width: 480px) {
  .knowledge-island {
    padding: 11px 12px;
  }

  .knowledge-island__figure {
    min-height: 116px;
    max-height: 164px;
  }

  .knowledge-island__palm {
    transform: scale(0.86);
    transform-origin: bottom left;
  }

  .knowledge-island__lighthouse {
    transform: translateX(-50%) scale(0.88);
    transform-origin: bottom center;
  }

  .knowledge-island__camp {
    transform: scale(0.88);
    transform-origin: bottom left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .knowledge-island__beam,
  .knowledge-island__surf-line {
    animation: none;
  }

  .knowledge-island__fill {
    transition: none;
  }
}


</style>
