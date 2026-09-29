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
//
// 繁荣度（星星）在本组件里的唯一职责：把「已经解锁的这些元素」画得更丰富一点。
// 组件不判定繁荣度（那是 knowledgeIslandProsperity 的事），只读 props 上算好的 level / key。
//
// 最重要的不变量（改这个组件时务必保留）：
//   每一件繁荣细节都必须挂在「该阶段的父元素」内部，或者本身是与阶段无关的
//   贝壳 / 石头 / 云 / 海鸥 / 浪花。
//   所以星星再多也不会让 0 枚印章的「初见小岛」提前长出草、花、椰树、帐篷、码头或灯塔。
//
// 尺寸（size）只影响「画多大」，不参与任何阶段或繁荣度判定：
//   compact（默认）：收藏册 / 阶段庆祝弹层里的小卡片；
//   hero：独立知识岛页面。画面内容、元素数量、解锁规则完全一样，
//   只是把这一幅图按「固定设计宽度 + 整块缩放」放到整页宽度上，
//   这样椰树、灯塔、贝壳这些固定像素尺寸的元素会和天空、海岸一起等比放大。
const props = defineProps({
  island: {
    type: Object,
    required: true
  },
  // 尺寸只有两种：compact 是弹窗里的小卡片，hero 是独立页面上的整页大画面。
  // 这里不写 validator（defineProps 会被提升，拿不到下面的常量），
  // 非法值由 sizeKey() 统一兜底，和 prosperityKey() 是同一套容错口径。
  size: {
    type: String,
    default: "compact"
  }
});

const ISLAND_SIZES = Object.freeze(["compact", "hero"]);

function sizeKey() {
  const normalized = String(props.size || "").trim();

  return ISLAND_SIZES.includes(normalized) ? normalized : "compact";
}

function currentStageFeatures() {
  return props.island?.currentStage?.features || [];
}

// 阶段配置里的 features 只增不减，所以“现在岛上有这件东西”=
// “当前阶段已经包含它”。
function hasIslandFeature(feature) {
  return currentStageFeatures().includes(feature);
}

// 繁荣度门槛：只控制细节，不参与任何阶段判定。
// 非法值一律按 0（基础档）处理，展示层容错与纯函数层保持同一口径。
function prosperityLevel() {
  const level = Number.parseInt(String(props.island?.prosperityLevel ?? 0), 10);

  return Number.isFinite(level) && level > 0 ? level : 0;
}

function isProsperityAtLeast(level) {
  return prosperityLevel() >= level;
}

function prosperityKey() {
  const key = String(props.island?.prosperityKey ?? "").trim();

  return key || "basic";
}
</script>

<template>
  <div
    class="knowledge-island"
    :data-size="sizeKey()"
    :data-stage="island.currentStage.id"
    :data-prosperity="prosperityKey()"
    :class="[
      `knowledge-island--${island.currentStage.id}`,
      `knowledge-island--prosperity-${prosperityKey()}`,
      `knowledge-island--${sizeKey()}`
    ]"
  >
    <div
      class="knowledge-island__figure"
      data-role="knowledge-island-figure"
      role="img"
      :data-stage="island.currentStage.id"
      :data-prosperity="prosperityKey()"
      :aria-label="`知识岛现在的样子：${island.currentStage.name}，${island.prosperityLabel}。${island.currentStage.summary}`"
    >
      <!-- 舞台层：整幅图都画在这一个盒子里。compact 尺寸下它是 display: contents，
           等于没有这一层；hero 尺寸下它按固定设计宽度绘制，再整块放大到整页宽度，
           这样固定像素尺寸的建筑与细节会跟着天空、海岸一起等比放大。 -->
      <div class="knowledge-island__stage">
        <!-- 天空：留出一块明亮的绘本留白，再用太阳与云朵交代远景。 -->
        <span class="knowledge-island__sun" aria-hidden="true"></span>
        <span class="knowledge-island__cloud knowledge-island__cloud--left" aria-hidden="true"></span>
        <span class="knowledge-island__cloud knowledge-island__cloud--right" aria-hidden="true"></span>
        <!-- 繁荣才多出来的一朵远景云：云与阶段无关，所以不需要任何阶段门禁。 -->
        <span v-if="isProsperityAtLeast(2)" class="knowledge-island__cloud knowledge-island__cloud--flourishing" aria-hidden="true"></span>
        <span class="knowledge-island__sky-dot knowledge-island__sky-dot--a" aria-hidden="true"></span>
        <span class="knowledge-island__sky-dot knowledge-island__sky-dot--b" aria-hidden="true"></span>
        <!-- 海鸥：天空细节，繁荣度越高飞得越多，同样与阶段无关。 -->
        <span v-if="isProsperityAtLeast(1)" class="knowledge-island__gull knowledge-island__gull--a" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(1)" class="knowledge-island__gull knowledge-island__gull--b" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(2)" class="knowledge-island__gull knowledge-island__gull--c" aria-hidden="true"></span>

        <!-- 海水分三层：远处的浅蓝、近处的深蓝和贴着岸边的浪花。 -->
        <span class="knowledge-island__sea" aria-hidden="true"></span>
        <span class="knowledge-island__sea-depth" aria-hidden="true"></span>
        <span class="knowledge-island__surf" aria-hidden="true">
          <span class="knowledge-island__surf-line knowledge-island__surf-line--a"></span>
          <span class="knowledge-island__surf-line knowledge-island__surf-line--b"></span>
          <span class="knowledge-island__surf-line knowledge-island__surf-line--c"></span>
          <span class="knowledge-island__surf-line knowledge-island__surf-line--d"></span>
          <!-- 繁荣档多出来的浪花：浪花与阶段无关，任何阶段都可加。 -->
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__surf-line knowledge-island__surf-line--lush-a"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__surf-line knowledge-island__surf-line--lush-b"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__surf-line knowledge-island__surf-line--flourishing-a"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__surf-line knowledge-island__surf-line--flourishing-b"></span>
        </span>

        <!-- 最高阶段才点亮的灯塔光束；繁荣度只调亮度和宽度，不负责解锁。 -->
        <span
          v-if="hasIslandFeature('灯光')"
          class="knowledge-island__beam"
          :class="`knowledge-island__beam--${prosperityKey()}`"
          aria-hidden="true"
        ></span>

        <!-- 岛影、沙滩和草地内的纹理共同组成不规则岸线。 -->
        <span class="knowledge-island__island-shadow" aria-hidden="true"></span>
        <span class="knowledge-island__ground" aria-hidden="true"></span>
        <span class="knowledge-island__shoreline" aria-hidden="true"></span>
        <span class="knowledge-island__rock knowledge-island__rock--left" aria-hidden="true"></span>
        <span class="knowledge-island__rock knowledge-island__rock--right" aria-hidden="true"></span>
        <span class="knowledge-island__shell" aria-hidden="true"></span>
        <!-- 繁荣细节里的贝壳与石头：这两个元素从初见小岛起就一直存在，
             所以只挂繁荣度门禁，不挂任何阶段门禁，也就绝不会越级解锁后续建筑。 -->
        <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-a" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-b" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(2)" class="knowledge-island__shell knowledge-island__shell--flourishing-a" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(2)" class="knowledge-island__shell knowledge-island__shell--flourishing-b" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(1)" class="knowledge-island__rock knowledge-island__rock--lush" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(2)" class="knowledge-island__rock knowledge-island__rock--flourishing" aria-hidden="true"></span>

        <!-- 下面这些是成长元素，名称与 features 保持一一对应。
             每一组内部的繁荣细节都写在这个元素的 v-if 里面：
             父元素没解锁（阶段没到），里面的细节就一个都不会被创建。 -->
        <span v-if="hasIslandFeature('小草丛')" class="knowledge-island__grass" aria-hidden="true">
          <span class="knowledge-island__grass-blade knowledge-island__grass-blade--a"></span>
          <span class="knowledge-island__grass-blade knowledge-island__grass-blade--b"></span>
          <span class="knowledge-island__grass-blade knowledge-island__grass-blade--c"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__grass-blade knowledge-island__grass-blade--d"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__grass-blade knowledge-island__grass-blade--e"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__grass-blade knowledge-island__grass-blade--f"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__flower knowledge-island__flower--a"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__flower knowledge-island__flower--b"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__flower knowledge-island__flower--c"></span>
        </span>

        <span v-if="hasIslandFeature('嫩芽')" class="knowledge-island__sprout" aria-hidden="true">
          <span class="knowledge-island__sprout-stem"></span>
          <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--left"></span>
          <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--right"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--lush-left"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--lush-right"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--flourishing-left"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--flourishing-right"></span>
        </span>

        <span v-if="hasIslandFeature('椰子树')" class="knowledge-island__palm" aria-hidden="true">
          <span class="knowledge-island__palm-trunk"></span>
          <span class="knowledge-island__palm-crown">
            <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--a"></span>
            <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--b"></span>
            <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--c"></span>
            <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--d"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__palm-leaf knowledge-island__palm-leaf--e"></span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__palm-leaf knowledge-island__palm-leaf--f"></span>
          </span>
          <span class="knowledge-island__palm-fruit"></span>
          <!-- 椰子是椰树自己的细节：写在 椰子树 的 v-if 里，没到椰林营地就永远不存在。 -->
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__palm-fruit knowledge-island__palm-fruit--lush"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__palm-fruit knowledge-island__palm-fruit--flourishing"></span>
        </span>

        <span v-if="hasIslandFeature('小帐篷')" class="knowledge-island__camp" aria-hidden="true">
          <span class="knowledge-island__camp-body"></span>
          <span class="knowledge-island__camp-door"></span>
          <span class="knowledge-island__camp-flag"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__camp-flag knowledge-island__camp-flag--lush"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__camp-crate"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-crate knowledge-island__camp-crate--flourishing"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-campfire"></span>
        </span>

        <span v-if="hasIslandFeature('小码头')" class="knowledge-island__dock" aria-hidden="true">
          <span class="knowledge-island__dock-plank knowledge-island__dock-plank--a"></span>
          <span class="knowledge-island__dock-plank knowledge-island__dock-plank--b"></span>
          <span class="knowledge-island__dock-post knowledge-island__dock-post--a"></span>
          <span class="knowledge-island__dock-post knowledge-island__dock-post--b"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-plank knowledge-island__dock-plank--lush"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-post knowledge-island__dock-post--lush"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__dock-net"></span>
        </span>

        <span v-if="hasIslandFeature('泊岸小船')" class="knowledge-island__boat" aria-hidden="true">
          <span class="knowledge-island__boat-hull"></span>
          <span class="knowledge-island__boat-mast"></span>
          <span class="knowledge-island__boat-sail"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__boat-rigging"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__boat-anchor"></span>
        </span>

        <span v-if="hasIslandFeature('灯塔')" class="knowledge-island__lighthouse" aria-hidden="true">
          <span class="knowledge-island__lighthouse-roof"></span>
          <span class="knowledge-island__lighthouse-tower"></span>
          <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--a"></span>
          <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--b"></span>
          <span class="knowledge-island__lighthouse-light"></span>
          <!-- 窗灯与灯塔基座都是灯塔自己的细节：写在 灯塔 的 v-if 里。 -->
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--lush"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--flourishing"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__lighthouse-base"></span>
        </span>
      </div>
    </div>

    <div class="knowledge-island__info">
      <p class="knowledge-island__stage">
        <span class="knowledge-island__stage-glyph" aria-hidden="true">{{ island.currentStage.glyph }}</span>
        <span class="knowledge-island__stage-name">当前：{{ island.currentStage.name }}</span>
      </p>
      <p class="knowledge-island__stamps">{{ island.stampText }}</p>

      <!-- 繁荣度独立一行：文案强调它是“跨章节累计”，避免和本章星星混为一谈。 -->
      <p class="knowledge-island__prosperity" :data-prosperity="prosperityKey()">
        <span class="knowledge-island__prosperity-label">{{ island.prosperityLabel }}</span>
        <span class="knowledge-island__prosperity-text">{{ island.prosperity.prosperityText }}</span>
      </p>

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

/* 舞台层：画面里所有元素的共同父级。
   compact（默认）是 display: contents —— 盒子不参与布局，子元素仍然直接相对
   .knowledge-island__figure 定位，所以小卡片里的画面和以前逐像素一致。
   hero 尺寸下才把它变成一个真实的盒子，规则见文件末尾的「尺寸：hero」一节。 */
.knowledge-island__stage {
  display: contents;
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

/* ===========================================================================
   繁荣度细节
   ---------------------------------------------------------------------------
   规则：下面每一条都只影响“该阶段的元素已经存在”之后的样子。
   与阶段无关的（贝壳 / 石头 / 云 / 海鸥 / 浪花）只挂繁荣度门禁；
   与阶段相关的（草丛 / 嫩芽 / 椰树 / 帐篷 / 码头 / 小船 / 灯塔）全部写在
   父元素的 v-if 内部，所以阶段没到时这些规则根本不会被渲染出来。
   0 枚印章永远不会因为星星多而长出草、花、椰树、帐篷、码头或灯塔。
   =========================================================================== */

/* 第三朵远景云：只在天上做文章，不碰岛上的任何东西。 */
.knowledge-island__cloud--flourishing {
  top: 11%;
  left: 38%;
  transform: scale(0.5);
  opacity: 0.66;
}

/* 海鸥：两笔就够像一只鸟，不引入动画系统。 */
.knowledge-island__gull {
  position: absolute;
  width: 9px;
  height: 4px;
  border-top: 2px solid rgba(72, 130, 156, 0.66);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  transform: rotate(-8deg);
  z-index: 1;
}

.knowledge-island__gull::after {
  content: "";
  position: absolute;
  left: 1px;
  top: 1px;
  width: 7px;
  height: 4px;
  border-top: 2px solid rgba(72, 130, 156, 0.66);
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  transform: rotate(6deg);
}

.knowledge-island__gull--a {
  top: 21%;
  left: 63%;
  transform: rotate(-8deg) scale(0.9);
}

.knowledge-island__gull--b {
  top: 27%;
  left: 70%;
  transform: rotate(-8deg) scale(0.7);
  opacity: 0.78;
}

.knowledge-island__gull--c {
  top: 17%;
  left: 52%;
  transform: rotate(-8deg) scale(0.6);
  opacity: 0.66;
}

/* 浪花：复用同一套 .knowledge-island__surf-line，只改位置、角度和长度。 */
.knowledge-island__surf-line--lush-a {
  top: 62%;
  left: 12%;
  width: 15%;
  border-top-width: 2px;
  --wave-angle: 2deg;
  --wave-shift: 3px;
  animation-delay: -2.6s;
}

.knowledge-island__surf-line--lush-b {
  top: 33%;
  left: 56%;
  width: 20%;
  --wave-angle: -3deg;
  --wave-shift: 2px;
  animation-delay: -4.4s;
}

.knowledge-island__surf-line--flourishing-a {
  top: 70%;
  left: 38%;
  width: 14%;
  border-top-width: 2px;
  --wave-angle: 4deg;
  --wave-shift: 3px;
  animation-delay: -6.1s;
}

.knowledge-island__surf-line--flourishing-b {
  top: 14%;
  left: 66%;
  width: 17%;
  border-top-width: 2px;
  --wave-angle: -5deg;
  --wave-shift: 2px;
  animation-delay: -0.9s;
}

/* 更多贝壳：沿着原有那只贝壳的摆放逻辑散开，避免看起来像复制粘贴。 */
.knowledge-island__shell--lush-a {
  right: 46%;
  bottom: 25%;
  width: 10px;
  height: 7px;
  transform: rotate(12deg);
  opacity: 0.9;
}

.knowledge-island__shell--lush-b {
  right: 30%;
  bottom: 34%;
  width: 9px;
  height: 6px;
  transform: rotate(-28deg);
  opacity: 0.82;
}

.knowledge-island__shell--flourishing-a {
  right: 52%;
  bottom: 33%;
  width: 11px;
  height: 7px;
  transform: rotate(22deg);
  opacity: 0.88;
}

.knowledge-island__shell--flourishing-b {
  right: 24%;
  bottom: 27%;
  width: 9px;
  height: 6px;
  transform: rotate(6deg);
  opacity: 0.78;
}

.knowledge-island__rock--lush {
  left: 34%;
  bottom: 21%;
  width: 15px;
  height: 9px;
  transform: rotate(8deg);
  opacity: 0.88;
}

.knowledge-island__rock--flourishing {
  left: 45%;
  bottom: 25%;
  width: 12px;
  height: 7px;
  transform: rotate(-18deg);
  opacity: 0.8;
}

/* 草丛更多叶片 + 小花：只在这一阶段的草丛元素内部生效。 */
.knowledge-island__grass-blade--d {
  left: 15px;
  height: 15px;
  transform: rotate(-12deg);
  background: #57a96a;
}

.knowledge-island__grass-blade--e {
  right: 8px;
  height: 16px;
  transform: rotate(14deg);
  background: #57a96a;
}

.knowledge-island__grass-blade--f {
  left: 6px;
  height: 18px;
  transform: rotate(-34deg);
  background: #3f9257;
}

.knowledge-island__flower {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef8fb0;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.72);
}

.knowledge-island__flower::after {
  content: "";
  position: absolute;
  left: 2px;
  top: 6px;
  width: 2px;
  height: 5px;
  background: #4b9f60;
}

.knowledge-island__flower--a {
  left: 3px;
  bottom: 14px;
  background: #f2a0bd;
}

.knowledge-island__flower--b {
  right: 5px;
  bottom: 12px;
  background: #f7c078;
}

.knowledge-island__flower--c {
  left: 12px;
  bottom: 6px;
  width: 5px;
  height: 5px;
  background: #ef8fb0;
}

/* 嫩芽长出更多叶子：同样在 嫩芽 的 v-if 内部。 */
.knowledge-island__sprout-leaf--lush-left {
  bottom: 20px;
  left: 2px;
  width: 11px;
  height: 6px;
  transform: rotate(-52deg);
  background: #3fa860;
}

.knowledge-island__sprout-leaf--lush-right {
  bottom: 20px;
  right: 2px;
  width: 11px;
  height: 6px;
  transform: scaleX(-1) rotate(-52deg);
  background: #3fa860;
}

.knowledge-island__sprout-leaf--flourishing-left {
  bottom: 7px;
  left: 5px;
  width: 9px;
  height: 5px;
  transform: rotate(-10deg);
  background: #6bc97e;
}

.knowledge-island__sprout-leaf--flourishing-right {
  bottom: 7px;
  right: 5px;
  width: 9px;
  height: 5px;
  transform: scaleX(-1) rotate(-10deg);
  background: #6bc97e;
}

/* 椰树：多两片叶子 + 更多椰子。 */
.knowledge-island__palm-leaf--e {
  transform: rotate(-58deg) scale(0.68);
}

.knowledge-island__palm-leaf--f {
  transform: rotate(292deg) scale(0.58);
}

.knowledge-island__palm-fruit--lush {
  left: 20px;
  top: 22px;
  box-shadow: 5px 3px 0 #8f683a;
}

.knowledge-island__palm-fruit--flourishing {
  left: 14px;
  top: 24px;
  box-shadow: 6px 2px 0 #8f683a, 11px 5px 0 #8f683a;
}

/* 营地：第二面营旗 + 木箱 + 营火。 */
.knowledge-island__camp-flag--lush {
  left: 29px;
  top: -1px;
  height: 12px;
}

.knowledge-island__camp-crate {
  position: absolute;
  left: -4px;
  bottom: 1px;
  width: 9px;
  height: 8px;
  border: 1px solid rgba(122, 78, 40, 0.4);
  border-radius: 2px;
  background: #d59a5c;
}

.knowledge-island__camp-crate--flourishing {
  left: -10px;
  width: 7px;
  height: 6px;
  background: #c68b50;
}

.knowledge-island__camp-campfire {
  position: absolute;
  right: -6px;
  bottom: 1px;
  width: 7px;
  height: 9px;
  border-radius: 50% 50% 40% 40%;
  background: radial-gradient(circle at 50% 70%, #fff0b0 0 34%, #f2a33c 62%, rgba(242, 163, 60, 0) 100%);
  box-shadow: 0 0 6px rgba(255, 214, 128, 0.66);
}

/* 码头：多一块木板 + 第三个桩 + 渔网。 */
.knowledge-island__dock-plank--lush {
  top: 25px;
  height: 7px;
}

.knowledge-island__dock-post--lush {
  left: 50%;
  top: 5px;
  transform: translateX(-50%);
}

.knowledge-island__dock-net {
  position: absolute;
  right: -8px;
  top: 12px;
  width: 11px;
  height: 13px;
  border: 1px solid rgba(122, 84, 48, 0.4);
  border-radius: 2px;
  background:
    repeating-linear-gradient(45deg, rgba(122, 84, 48, 0.28) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(-45deg, rgba(122, 84, 48, 0.28) 0 1px, transparent 1px 4px);
  transform: rotate(8deg);
}

/* 小船：索具 + 小锚。 */
.knowledge-island__boat-rigging {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 24px;
  height: 1.5px;
  background: rgba(118, 90, 72, 0.72);
  transform: rotate(6deg);
}

.knowledge-island__boat-anchor {
  position: absolute;
  left: 1px;
  bottom: 0;
  width: 6px;
  height: 6px;
  border: 1.5px solid #6f5a4c;
  border-top: 0;
  border-radius: 0 0 6px 6px;
}

.knowledge-island__boat-anchor::before {
  content: "";
  position: absolute;
  left: 2px;
  top: -4px;
  width: 1.5px;
  height: 4px;
  background: #6f5a4c;
}

/* 灯塔：窗灯亮起 + 塔基座 + 光束更宽更亮。 */
.knowledge-island__lighthouse-window--lush {
  top: 28px;
  background: #ffe9a8;
  box-shadow: 0 0 4px rgba(255, 226, 140, 0.86);
}

.knowledge-island__lighthouse-window--flourishing {
  top: 43px;
  background: #ffe9a8;
  box-shadow: 0 0 5px rgba(255, 226, 140, 0.92);
}

.knowledge-island__lighthouse-base {
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 32px;
  height: 6px;
  border-radius: 0 0 5px 5px;
  background: linear-gradient(180deg, #e8dcc4 0%, #cbbb9c 100%);
}

.knowledge-island__beam--lush {
  width: 48%;
  opacity: 0.78;
}

.knowledge-island__beam--flourishing {
  width: 56%;
  height: 29%;
  opacity: 0.92;
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

.knowledge-island__prosperity {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-width: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 800;
}

/* 三档只换颜色深浅，不换结构：一眼能看出丰盛程度，但不会喧宾夺主。 */
.knowledge-island__prosperity-label {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid rgba(72, 154, 148, 0.28);
  background: rgba(255, 255, 255, 0.78);
  color: #2f7a6c;
  font-size: 0.76rem;
  font-weight: 900;
}

.knowledge-island__prosperity[data-prosperity="lush"] .knowledge-island__prosperity-label {
  border-color: rgba(52, 138, 92, 0.32);
  color: #2f7a4c;
  background: rgba(240, 252, 240, 0.86);
}

.knowledge-island__prosperity[data-prosperity="flourishing"] .knowledge-island__prosperity-label {
  border-color: rgba(198, 141, 26, 0.36);
  color: #8a5a00;
  background: rgba(255, 249, 226, 0.9);
}

.knowledge-island__prosperity-text {
  min-width: 0;
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

/* ===========================================================================
   尺寸：hero（独立知识岛页面）
   ---------------------------------------------------------------------------
   做法只有一个：把舞台层变成一个固定“设计宽度”的盒子，再用 scale() 整块放大到
   铺满画面盒子。因为天空、海岸、椰树、灯塔、贝壳全都画在这同一个盒子内部
   （百分比定位 + 固定像素），整块放大之后：
     - 构图比例不变，画面不会被拉变形；
     - 固定像素的建筑与细节（椰树 45px、灯塔 32px、贝壳 9~12px……）跟着一起放大，
       这正是把画面搬到整页宽度时必须做的事，否则建筑会缩成岛上的小点；
     - 舞台盒放大后正好等于画面盒，永远不会超出画面，因此不会横向溢出。
   缩放倍数只按视口分档，取值一律偏向“偏大”一侧：倍数偏大只是构图略松，
   绝不会裁切；倍数偏小才会让建筑显得拥挤。
   =========================================================================== */
.knowledge-island--hero {
  --ki-hero-scale: 1;
  gap: 0;
  padding: 18px 20px 20px;
  border-radius: 30px;
  box-shadow:
    0 30px 52px -40px rgba(37, 106, 126, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

/* hero 只负责把画面画大。阶段 / 印章 / 繁荣度这些文字由独立页面自己排版，
   组件里这排小卡片信息在这里收起来，避免同一组数字在页面上出现两遍。 */
.knowledge-island--hero .knowledge-island__info {
  display: none;
}

.knowledge-island--hero .knowledge-island__figure {
  aspect-ratio: 16 / 9;
  max-height: none;
  min-height: 200px;
  border-radius: 24px;
}

.knowledge-island--hero .knowledge-island__stage {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% / var(--ki-hero-scale));
  height: calc(100% / var(--ki-hero-scale));
  transform: scale(var(--ki-hero-scale));
  transform-origin: top left;
}

@media (min-width: 681px) {
  .knowledge-island--hero {
    --ki-hero-scale: 1.55;
  }
}

@media (min-width: 900px) {
  .knowledge-island--hero {
    --ki-hero-scale: 2.15;
  }
}

@media (min-width: 1100px) {
  .knowledge-island--hero {
    --ki-hero-scale: 2.7;
  }
}

@media (min-width: 1320px) {
  .knowledge-island--hero {
    --ki-hero-scale: 3.3;
  }
}

@media (min-width: 1560px) {
  .knowledge-island--hero {
    --ki-hero-scale: 3.4;
  }
}

/* 窄屏：收紧卡片内边距，让画面尽量占满 390 的宽度。
   下面这三条是把 compact 在 480 以下给建筑做的“缩小一点”处理在 hero 里撤销掉：
   hero 的设计宽度本来就比 compact 大，建筑不需要再缩小。 */
@media (max-width: 680px) {
  .knowledge-island--hero {
    padding: 12px 12px 14px;
    border-radius: 24px;
  }

  .knowledge-island--hero .knowledge-island__figure {
    border-radius: 18px;
  }
}

@media (max-width: 480px) {
  .knowledge-island--hero .knowledge-island__palm {
    transform: none;
  }

  .knowledge-island--hero .knowledge-island__lighthouse {
    transform: translateX(-50%);
  }

  .knowledge-island--hero .knowledge-island__camp {
    transform: none;
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
