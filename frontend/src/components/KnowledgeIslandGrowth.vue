<script setup>
// 知识岛成长展示组件：只负责把已经算好的 ViewModel 画出来。
//
// 组件不做任何判定：不读 localStorage、不调接口、不自己数印章、不自己算阶段。
// 阶段文字 / 进度 / 下一阶段提示全部来自 knowledgeIslandGrowth.buildKnowledgeIslandGrowth()；
// 岛上元素出现与否只看「当前阶段的 features 里有没有这件东西」——
// 组件里没有第二份阶段顺序数组（顺序的唯一来源是 KNOWLEDGE_ISLAND_STAGES）。
//
// 这一轮把「画什么」拆成三层，各管各的，互不越权：
//   1) knowledgeIslandGrowth    → 业务真相：现在是第几阶段、下一阶段是谁、繁荣度几档。
//   2) knowledgeIslandTerrain   → 纯视觉：这一阶段的岛身占地、岸线、绿地、高地，以及岛上的街区。
//   3) 本组件                  → 把上面两者画出来，并按街区摆放繁荣细节。
//
// 最重要的三条不变量（改这个组件时务必保留）：
//   A. 元素挂在「街区」里，街区挂在「岛身盒子」里。
//      岛身盒子由地形表给出，随阶段变大；街区坐标是岛屿自身的归一化坐标，与阶段无关。
//      所以岛屿一旦变大，所有东西都跟着岛一起长大，不会漂到海里或压在岸外。
//      这也是「贝壳 / 码头 / 灯塔不再依赖画布绝对位置」的全部实现方式。
//   B. 每一件繁荣细节都写在它所属街区 / 建筑内部，父元素没解锁就不会被创建。
//      星星再多也不会让 0 枚印章的「初见小岛」提前长出草、椰树、帐篷、码头或灯塔。
//   C. 「下一阶段预告」只画下一阶段更宽的那条岸线（虚线轮廓），
//      「下一阶段是谁」仍然由 knowledgeIslandGrowth 决定，组件不自己判断，
//      满级（nextStage 为 null）时什么都不画。
//
// 尺寸（size）只影响「画多大」，不参与任何阶段或繁荣度判定：
//   compact（默认）：阶段庆祝弹层里的小卡片；
//   hero：独立知识岛页面。
// 两种尺寸共用同一套世界坐标（见下方「世界坐标」一节），所以构图完全一致，只是缩放倍数不同。
import { computed } from "vue";
import {
  KNOWLEDGE_ISLAND_ZONES,
  buildKnowledgeIslandNextTerrainPreview,
  buildTerrainClipPath,
  buildTerrainFootprintStyle,
  buildZoneStyle,
  getKnowledgeIslandTerrain
} from "../utils/knowledgeIslandTerrain.js";

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

// 阶段配置里的 features 只增不减，所以"现在岛上有这件东西"=
// "当前阶段已经包含它"。
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

// ---------------------------------------------------------------------------
// 地形：这一阶段的岛长什么样（占地 / 岸线 / 绿地 / 高地）。
// 全部来自 knowledgeIslandTerrain，组件里不再出现任何岛屿尺寸数字。
// ---------------------------------------------------------------------------
const terrain = computed(() => getKnowledgeIslandTerrain(props.island?.currentStage?.id));
const footprintStyle = computed(() => buildTerrainFootprintStyle(terrain.value));
const groundClipPath = computed(() => buildTerrainClipPath(terrain.value.ground));
const grassClipPath = computed(() => buildTerrainClipPath(terrain.value.grass));
const reliefClipPath = computed(() => buildTerrainClipPath(terrain.value.relief));
// 绿地 / 高地有没有，由地形表决定（第一阶段草地就是 null，所以 0 枚时画面上没有任何绿色）。
const hasGrass = computed(() => Boolean(terrain.value.grass));
const hasRelief = computed(() => Boolean(terrain.value.relief));

// 街区（岛上的"街区"）：坐标与阶段无关，五个阶段共用同一份。
function zoneStyle(zoneId) {
  return buildZoneStyle(KNOWLEDGE_ISLAND_ZONES[zoneId]);
}

// 下一阶段预告：谁才是下一阶段由 knowledgeIslandGrowth 说了算，
// 这里只是拿它的 id 去地形表里取那条更宽的岸线；满级时自动是 null。
const nextTerrainPreview = computed(() => buildKnowledgeIslandNextTerrainPreview(props.island));
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
      <!-- 世界画布：固定 400 × 225 的设计画布（16:9），内部所有尺寸都按它换算。
           类名刻意用 __world 而不是 __stage：__stage 这个名字已经被信息区里
           「当前：XX」那个段落占用了，两处同名会让那条规则把段落也变成绝对定位、
           铺满整张卡片（庆祝弹层里的按钮就是这样被盖住的）。 -->
      <div class="knowledge-island__world">
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

        <!-- 海水分三层：远处的浅蓝、近处的深蓝和贴着岸边的浪线。
             海是画布级背景，不跟着岛走（岛在水里，海不会跟着岛搬家）。 -->
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

        <!-- 下一阶段预告：只画「下一阶段更宽的那条岸线」，一条淡虚线 + 一点微光。
             画的是地形表里 nextStage 对应的那条真实岸线，不是当前阶段的放大版；
             谁是下一阶段仍然由 knowledgeIslandGrowth 决定（满级时这里整块不渲染）。
             故意不画任何"幽灵建筑"：预告只说"岛会变大"，不说"会盖房子"。 -->
        <svg
          v-if="nextTerrainPreview"
          class="knowledge-island__next-terrain"
          data-role="knowledge-island-next-terrain"
          :style="nextTerrainPreview.footprintStyle"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon class="knowledge-island__next-fill" :points="nextTerrainPreview.points" />
          <polygon class="knowledge-island__next-outline" :points="nextTerrainPreview.points" />
        </svg>

        <!-- ===================== 岛身（随阶段改变骨架） =====================
             整座岛就是这一个盒子：位置与尺寸全部来自地形表。
             岛变大时，这个盒子变大，里面的街区跟着一起长大和移动——
             这就是「印章决定岛有多大、地形长到哪里」的全部实现。 -->
        <div
          class="knowledge-island__terrain"
          data-role="knowledge-island-terrain"
          :data-terrain-stage="terrain.id"
          :style="footprintStyle"
        >
          <span class="knowledge-island__island-shadow" aria-hidden="true"></span>
          <!-- 岸线浪花环：和岸线是同一条形状，只是整体放大一圈、白一些，
               所以任何阶段都严丝合缝地贴着海岸（它和岛身盒子一起缩放）。
               两个元素共用同一份地形表的形状点，不会画出两条不一样的海岸。 -->
          <span
            class="knowledge-island__shore-ring"
            :style="{ clipPath: groundClipPath }"
            aria-hidden="true"
          ></span>
          <span class="knowledge-island__ground" :style="{ clipPath: groundClipPath }" aria-hidden="true"></span>
          <!-- 绿地：地形表里这一阶段没有草地时就是 null，0 枚时这里什么都不渲染。 -->
          <span
            v-if="hasGrass"
            class="knowledge-island__grassland"
            :style="{ clipPath: grassClipPath }"
            aria-hidden="true"
          ></span>
          <!-- 高地：只有最高阶段的地形里才有，灯塔的地基。 -->
          <span
            v-if="hasRelief"
            class="knowledge-island__highland"
            :style="{ clipPath: reliefClipPath }"
            aria-hidden="true"
          ></span>

          <!-- ============ 西侧海岸：贝壳 / 石头 / 浪花 ============
               这一整片从第一阶段就存在，所以只挂繁荣度门禁、不挂阶段门禁。 -->
          <div
            class="knowledge-island__zone knowledge-island__zone--west-shore"
            data-role="knowledge-island-zone-west-shore"
            :style="zoneStyle('west-shore')"
            aria-hidden="true"
          >
            <span class="knowledge-island__surf-ring knowledge-island__surf-ring--a"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__surf-ring knowledge-island__surf-ring--b"></span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__surf-ring knowledge-island__surf-ring--c"></span>
            <span class="knowledge-island__shell" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-a" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-b" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__shell knowledge-island__shell--flourishing" aria-hidden="true"></span>
            <span class="knowledge-island__rock" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__rock knowledge-island__rock--lush" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__rock knowledge-island__rock--flourishing" aria-hidden="true"></span>
          </div>

          <!-- ============ 中央绿地：嫩芽 / 草丛 / 花 ============
               全部挂在 features 上：0 枚时这一整块不会被创建。 -->
          <div
            v-if="hasIslandFeature('嫩芽') || hasIslandFeature('小草丛')"
            class="knowledge-island__zone knowledge-island__zone--green"
            data-role="knowledge-island-zone-green"
            :style="zoneStyle('green')"
            aria-hidden="true"
          >
            <span v-if="hasIslandFeature('嫩芽')" class="knowledge-island__sprout" aria-hidden="true">
              <span class="knowledge-island__sprout-stem"></span>
              <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--left"></span>
              <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--right"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--lush-left"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--lush-right"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--flourishing"></span>
            </span>

            <span v-if="hasIslandFeature('小草丛')" class="knowledge-island__grass" aria-hidden="true">
              <span class="knowledge-island__grass-blade knowledge-island__grass-blade--a"></span>
              <span class="knowledge-island__grass-blade knowledge-island__grass-blade--b"></span>
              <span class="knowledge-island__grass-blade knowledge-island__grass-blade--c"></span>
              <!-- 丰盛开始出现"第二丛草 + 小花"：多出来的是另一种东西，不只是同一丛变多。 -->
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__grass-extra"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__flower knowledge-island__flower--a"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__flower knowledge-island__flower--b"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__flower knowledge-island__flower--c"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__flower knowledge-island__flower--d"></span>
            </span>
          </div>

          <!-- ============ 营地区：椰树 / 帐篷 / 营火 ============
               繁荣度三档在这块是"性质"变化而不是数量变化：
                 基础 = 一顶帐篷；
                 丰盛 = 旗子 + 木箱（像有人在这儿扎过营）；
                 繁荣 = 营火 + 炊烟（岛上有人在生活）。 -->
          <div
            v-if="hasIslandFeature('椰子树') || hasIslandFeature('小帐篷')"
            class="knowledge-island__zone knowledge-island__zone--camp"
            data-role="knowledge-island-zone-camp"
            :style="zoneStyle('camp')"
            aria-hidden="true"
          >
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
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__palm-fruit knowledge-island__palm-fruit--lush"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__palm-fruit knowledge-island__palm-fruit--flourishing"></span>
            </span>

            <span v-if="hasIslandFeature('小帐篷')" class="knowledge-island__camp" aria-hidden="true">
              <span class="knowledge-island__camp-body"></span>
              <span class="knowledge-island__camp-door"></span>
              <!-- 旗与木箱从丰盛档才出现：基础档的营地就是干干净净一顶帐篷。 -->
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__camp-flag"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__camp-crate"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-crate knowledge-island__camp-crate--flourishing"></span>
              <!-- 营火与炊烟是繁荣档：岛上真的有人在生活。 -->
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-campfire"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-smoke"></span>
            </span>
          </div>

          <!-- ============ 东侧港口：码头 / 小船 ============
               码头与小船整体挂在 features 上；岛的岬角也是从这一阶段的地形里长出来的，
               所以码头永远贴着东岸，而不是浮在一片沙洲旁边的水面上。 -->
          <div
            v-if="hasIslandFeature('小码头') || hasIslandFeature('泊岸小船')"
            class="knowledge-island__zone knowledge-island__zone--harbor"
            data-role="knowledge-island-zone-harbor"
            :style="zoneStyle('harbor')"
            aria-hidden="true"
          >
            <span v-if="hasIslandFeature('小码头')" class="knowledge-island__dock" aria-hidden="true">
              <span class="knowledge-island__dock-plank knowledge-island__dock-plank--a"></span>
              <span class="knowledge-island__dock-plank knowledge-island__dock-plank--b"></span>
              <span class="knowledge-island__dock-post knowledge-island__dock-post--a"></span>
              <span class="knowledge-island__dock-post knowledge-island__dock-post--b"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-plank knowledge-island__dock-plank--lush"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-post knowledge-island__dock-post--lush"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-bollard"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__dock-net"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__dock-lantern"></span>
            </span>

            <span v-if="hasIslandFeature('泊岸小船')" class="knowledge-island__boat" aria-hidden="true">
              <span class="knowledge-island__boat-hull"></span>
              <span class="knowledge-island__boat-mast"></span>
              <span class="knowledge-island__boat-sail"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__boat-rigging"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__boat-flag"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__boat-anchor"></span>
            </span>
          </div>

          <!-- ============ 高地区：灯塔 ============
               灯塔连同它的光束都在这一个街区里；光束是灯塔的子元素，
               所以无论岛屿怎么变，光都从灯塔自己的窗口射出去，不会飘到别处。 -->
          <div
            v-if="hasIslandFeature('灯塔')"
            class="knowledge-island__zone knowledge-island__zone--highland"
            data-role="knowledge-island-zone-highland"
            :style="zoneStyle('highland')"
            aria-hidden="true"
          >
            <span class="knowledge-island__lighthouse" aria-hidden="true">
              <span class="knowledge-island__lighthouse-roof"></span>
              <span class="knowledge-island__lighthouse-tower"></span>
              <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--a"></span>
              <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--b"></span>
              <span class="knowledge-island__lighthouse-light"></span>
              <!-- 光束是灯塔的子元素：起点永远钉在灯塔的窗口上。 -->
              <span class="knowledge-island__beam" :class="`knowledge-island__beam--${prosperityKey()}`"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--lush"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--flourishing"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__lighthouse-base"></span>
            </span>
          </div>
        </div>
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
  min-width: 0;
}

/* ===========================================================================
   世界坐标
   ---------------------------------------------------------------------------
   整幅图都画在一个固定 400 × 225（16:9）的设计画布上，
   然后按画面宽度整体等比缩放：
     scale = 画面宽度 / 400
   这样做换来三件事：
     1) compact 与 hero 用的是同一套坐标、同一个画布 → 同一座岛在两个尺寸下构图完全一致，
        只是缩放倍数不同（以前 compact 是 16:8.5、hero 是 16:9 + 视口分档 scale，两边构图会走样）；
     2) 固定像素的建筑（椰树、帐篷、灯塔）会跟着天空和海岸一起等比放大，
        搬到整页宽度上时不会缩成岛上的小点；
     3) 画布缩放后正好等于画面盒，永远不会超出画面，因此不会横向溢出。
   画面盒是 inline-size 容器，所以 100cqw 就是它的宽度，缩放倍数直接由它算出来，
   不需要任何视口分档的魔法数字。
   =========================================================================== */
.knowledge-island__figure {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  container-type: inline-size;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid rgba(50, 143, 174, 0.22);
  border-radius: 18px;
  background:
    radial-gradient(circle at 82% 12%, rgba(255, 255, 255, 0.5) 0 5%, transparent 5.5%),
    linear-gradient(180deg, #ccecf8 0%, #e8f8fb 57%, #dff3f3 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 10px 18px -18px rgba(37, 106, 126, 0.55);
}

/* 世界画布：整个 400 × 225（16:9）的设计坐标系。
   --ki-u 是「一个设计像素在真实画面里有多大」：画面盒是 inline-size 容器，
   所以 100cqw 就是画面宽度，除以 400 得到设计单位。
   画布用 inset: 0 铺满画面盒，画面盒本身是 16:9，
   于是 compact 与 hero 拿到的是同一套坐标、同一个画布、同一份构图，只是尺寸不同。
   所有内部元素都写成 calc(var(--ki-u) * N)，N 就是设计画布上的像素数：
     - 椰树 34、灯塔 22、贝壳 11……这些数字只在这套坐标里有意义；
     - 画面被放大多少倍，所有元素就等比放大多少倍，不会缩成岛上的小点；
     - 画布铺满画面盒，永远不会超出画面，因此不会横向溢出。

   类名必须是 __world，不能叫 __stage：信息区里「当前：XX」那个段落
   已经占用了 .knowledge-island__stage，两处同名会互相污染
   （同名规则会让那个段落也变成 position: absolute + inset: 0，
     于是它铺满整张庆祝弹层卡片，把下面「知道啦」按钮整个盖住）。 */
.knowledge-island__world {
  --ki-u: calc(100cqw / 400);
  position: absolute;
  inset: 0;
}

/* ---------- 天空 ---------- */
.knowledge-island__sun {
  position: absolute;
  top: calc(var(--ki-u) * 14);
  right: calc(var(--ki-u) * 24);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 22);
  border: calc(var(--ki-u) * 2) solid rgba(255, 250, 211, 0.9);
  border-radius: 50%;
  background: #ffd979;
  box-shadow: 0 0 0 calc(var(--ki-u) * 4) rgba(255, 232, 155, 0.22), 0 calc(var(--ki-u) * 8) calc(var(--ki-u) * 15) calc(var(--ki-u) * -10) rgba(214, 142, 37, 0.6);
  z-index: 1;
}

.knowledge-island__cloud {
  position: absolute;
  width: calc(var(--ki-u) * 62);
  height: calc(var(--ki-u) * 18);
  border-radius: calc(var(--ki-u) * 999);
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
  top: calc(var(--ki-u) * 26);
  left: calc(var(--ki-u) * 34);
  transform: scale(0.78);
}

.knowledge-island__cloud--right {
  top: calc(var(--ki-u) * 46);
  left: calc(var(--ki-u) * 248);
  transform: scale(0.58);
  opacity: 0.56;
}

.knowledge-island__cloud--flourishing {
  top: calc(var(--ki-u) * 16);
  left: calc(var(--ki-u) * 150);
  transform: scale(0.5);
  opacity: 0.66;
}

.knowledge-island__sky-dot {
  position: absolute;
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1;
}

.knowledge-island__sky-dot--a {
  top: calc(var(--ki-u) * 24);
  left: calc(var(--ki-u) * 124);
}

.knowledge-island__sky-dot--b {
  top: calc(var(--ki-u) * 52);
  left: calc(var(--ki-u) * 172);
  width: calc(var(--ki-u) * 4);
  height: calc(var(--ki-u) * 4);
  opacity: 0.72;
}

/* 海鸥：两笔就够像一只鸟，不引入动画系统。 */
.knowledge-island__gull {
  position: absolute;
  width: calc(var(--ki-u) * 9);
  height: calc(var(--ki-u) * 4);
  border-top: calc(var(--ki-u) * 2) solid rgba(72, 130, 156, 0.66);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  transform: rotate(-8deg);
  z-index: 1;
}

.knowledge-island__gull::after {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * 1);
  top: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 7);
  height: calc(var(--ki-u) * 4);
  border-top: calc(var(--ki-u) * 2) solid rgba(72, 130, 156, 0.66);
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  transform: rotate(6deg);
}

.knowledge-island__gull--a {
  top: calc(var(--ki-u) * 42);
  left: calc(var(--ki-u) * 252);
  transform: rotate(-8deg) scale(0.9);
}

.knowledge-island__gull--b {
  top: calc(var(--ki-u) * 58);
  left: calc(var(--ki-u) * 280);
  transform: rotate(-8deg) scale(0.7);
  opacity: 0.78;
}

.knowledge-island__gull--c {
  top: calc(var(--ki-u) * 32);
  left: calc(var(--ki-u) * 208);
  transform: rotate(-8deg) scale(0.6);
  opacity: 0.66;
}

/* ---------- 海（画布级背景） ---------- */
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
    rgba(255, 255, 255, 0.18) 0 calc(var(--ki-u) * 2),
    transparent calc(var(--ki-u) * 2) calc(var(--ki-u) * 22)
  );
  opacity: 0.72;
}

.knowledge-island__sea::before {
  top: 20%;
}

.knowledge-island__sea::after {
  top: 53%;
  transform: translateX(calc(var(--ki-u) * -18));
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
  --wave-shift: calc(var(--ki-u) * 3);
  position: absolute;
  display: block;
  height: calc(var(--ki-u) * 11);
  border-top: calc(var(--ki-u) * 3) solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  transform: translateX(0) rotate(var(--wave-angle));
  transform-origin: left center;
  animation: knowledge-island-wave-drift 7s ease-in-out infinite alternate;
}

.knowledge-island__surf-line::after {
  content: "";
  position: absolute;
  right: 7%;
  top: calc(var(--ki-u) * -5);
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 5);
  border-top: calc(var(--ki-u) * 2) solid rgba(255, 255, 255, 0.68);
  border-radius: 50%;
  transform: rotate(-16deg);
}

.knowledge-island__surf-line--a {
  top: 40%;
  left: 4%;
  width: 17%;
  --wave-angle: -4deg;
  --wave-shift: calc(var(--ki-u) * 2);
}

.knowledge-island__surf-line--b {
  top: 24%;
  left: 25%;
  width: 24%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 3deg;
  --wave-shift: calc(var(--ki-u) * 4);
  animation-delay: -1.8s;
}

.knowledge-island__surf-line--c {
  top: 53%;
  left: 54%;
  width: 19%;
  --wave-angle: -2deg;
  --wave-shift: calc(var(--ki-u) * 3);
  animation-delay: -3.4s;
}

.knowledge-island__surf-line--d {
  top: 18%;
  left: 79%;
  width: 13%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 5deg;
  --wave-shift: calc(var(--ki-u) * 2);
  animation-delay: -5.2s;
}

.knowledge-island__surf-line--lush-a {
  top: 62%;
  left: 12%;
  width: 15%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 2deg;
  --wave-shift: calc(var(--ki-u) * 3);
  animation-delay: -2.6s;
}

.knowledge-island__surf-line--lush-b {
  top: 33%;
  left: 56%;
  width: 20%;
  --wave-angle: -3deg;
  --wave-shift: calc(var(--ki-u) * 2);
  animation-delay: -4.4s;
}

.knowledge-island__surf-line--flourishing-a {
  top: 70%;
  left: 38%;
  width: 14%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 4deg;
  --wave-shift: calc(var(--ki-u) * 3);
  animation-delay: -6.1s;
}

.knowledge-island__surf-line--flourishing-b {
  top: 14%;
  left: 66%;
  width: 17%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: -5deg;
  --wave-shift: calc(var(--ki-u) * 2);
  animation-delay: -0.9s;
}

/* ===========================================================================
   下一阶段预告
   ---------------------------------------------------------------------------
   只画下一阶段那一条更宽的岸线：一点微光 + 一条淡虚线。
   画在海面之上、岛身之下，所以它读起来是"岛将来会扩到这里"，
   而不是"这里已经盖好了什么"。
   =========================================================================== */
.knowledge-island__next-terrain {
  position: absolute;
  overflow: visible;
  pointer-events: none;
  z-index: 5;
  animation: knowledge-island-next-breathe 5.2s ease-in-out infinite;
}

.knowledge-island__next-fill {
  fill: rgba(255, 255, 255, 0.17);
}

.knowledge-island__next-outline {
  fill: none;
  stroke: rgba(255, 255, 255, 0.82);
  stroke-width: 1.4;
  /* 非等比缩放的世界画布里，描边宽度必须锁死，否则虚线会随岛变形而忽粗忽细。 */
  stroke-dasharray: 5 4;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

@keyframes knowledge-island-next-breathe {
  0%,
  100% {
    opacity: 0.5;
  }

  50% {
    opacity: 0.92;
  }
}

/* ===========================================================================
   岛身
   ---------------------------------------------------------------------------
   下面这一块是「印章决定岛有多大」的落点：
     .knowledge-island__terrain 的 left / bottom / width / height / --ki-unit
     全部是行内样式，来自 knowledgeIslandTerrain。
   组件 CSS 里没有任何岛屿尺寸数字，所以换阶段＝换一份地形数据，而不是换一堆 CSS。
   =========================================================================== */
.knowledge-island__terrain {
  position: absolute;
  z-index: 6;
}

.knowledge-island__island-shadow {
  position: absolute;
  left: 4%;
  right: 4%;
  bottom: -5%;
  height: 22%;
  border-radius: 50%;
  background: rgba(39, 91, 108, 0.24);
  filter: blur(calc(var(--ki-u) * 3));
  z-index: 0;
}

/* 岸线浪花环：和岸线是同一条形状、整体放大一圈、白一些，
   所以任何阶段都严丝合缝地贴着海岸（它和岛身盒子一起缩放）。
   两个元素共用同一份地形表的形状点，不会画出两条不一样的海岸。 */
.knowledge-island__shore-ring {
  position: absolute;
  inset: -3.5%;
  background: rgba(255, 252, 236, 0.5);
  z-index: 1;
}

.knowledge-island__ground {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(170deg, #ffe7b6 0%, #ffd28a 100%);
  box-shadow: inset 0 calc(var(--ki-u) * 3) 0 rgba(255, 255, 255, 0.68), 0 calc(var(--ki-u) * 10) calc(var(--ki-u) * 18) calc(var(--ki-u) * -16) rgba(49, 77, 73, 0.68);
  z-index: 2;
}

/* 草地内的纹理：一小片深一点的草色，避免大片纯绿显得平。
   形状跟着地形走，所以任何阶段都不会跑到岛外面。 */
.knowledge-island__grassland::after {
  content: "";
  position: absolute;
  left: 18%;
  top: 24%;
  width: 30%;
  height: 22%;
  border-radius: 50%;
  background: rgba(112, 190, 122, 0.5);
  transform: rotate(-8deg);
}

.knowledge-island__grassland {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, #a5d98d 0%, #79c57d 100%);
  opacity: 0.95;
  z-index: 3;
}

.knowledge-island__highland {
  position: absolute;
  inset: 0;
  background: linear-gradient(168deg, #bfe6a4 0%, #8dcd8b 100%);
  box-shadow: inset 0 calc(var(--ki-u) * 2) 0 rgba(255, 255, 255, 0.5);
  z-index: 4;
}

/* ===========================================================================
   街区
   ---------------------------------------------------------------------------
   街区盒子挂在岛身盒子内部，left / bottom / width / height 来自
   KNOWLEDGE_ISLAND_ZONES（岛屿自身的归一化坐标，与阶段无关）。
   于是：
     - 岛长大 → 街区跟着长大，街区里的东西不会掉到岛外面；
     - 岛换阶段 → 街区位置不变，所以贝壳永远在西岸、码头永远在东港。
   =========================================================================== */
.knowledge-island__zone {
  position: absolute;
  z-index: 6;
}

/* 街区里的东西按「街区盒子的百分比」摆放：这样它们跟着岛一起缩放，
   不需要为每个阶段各写一套 px 坐标。 */
.knowledge-island__zone > * {
  position: absolute;
}

/* ---------- 西侧海岸：浪花环 / 贝壳 / 石头 ----------
   基础档就是一只贝壳 + 一块石头 + 一圈浪花；
   丰盛、繁荣各再补一只贝壳、一块石头、一圈浪花，但位置全都错开，
   所以看起来是"西岸更热闹"，不是"同一只贝壳复制了四份"。 */
.knowledge-island__surf-ring {
  border: calc(var(--ki-u) * 2) solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  transform: translate(-50%, 50%);
}

.knowledge-island__surf-ring--a {
  left: 28%;
  bottom: 4%;
  width: 22%;
  height: 22%;
}

.knowledge-island__surf-ring--b {
  left: 66%;
  bottom: 0;
  width: 18%;
  height: 20%;
  border-width: calc(var(--ki-u) * 1.5);
  opacity: 0.86;
}

.knowledge-island__surf-ring--c {
  left: 46%;
  bottom: 16%;
  width: 26%;
  height: 18%;
  border-width: calc(var(--ki-u) * 1.5);
  opacity: 0.8;
}

.knowledge-island__shell {
  left: 50%;
  bottom: 30%;
  width: calc(var(--ki-u) * 11 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 8 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -5.5) * var(--ki-unit, 1));
  border: calc(var(--ki-u) * 2) solid #efad83;
  border-bottom: 0;
  border-radius: calc(var(--ki-u) * 12) calc(var(--ki-u) * 12) 0 0;
  transform: rotate(-16deg);
  box-shadow: inset 0 calc(var(--ki-u) * 2) 0 rgba(255, 244, 214, 0.72);
}

.knowledge-island__shell--lush-a {
  left: 32%;
  bottom: 56%;
  opacity: 0.9;
  transform: rotate(12deg);
}

.knowledge-island__shell--lush-b {
  left: 70%;
  bottom: 44%;
  opacity: 0.82;
  transform: rotate(-28deg);
}

.knowledge-island__shell--flourishing {
  left: 44%;
  bottom: 74%;
  opacity: 0.88;
  transform: rotate(22deg);
}

.knowledge-island__rock {
  left: 50%;
  bottom: 30%;
  width: calc(var(--ki-u) * 15 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 9 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -7.5) * var(--ki-unit, 1));
  border-radius: 70% 50% 48% 60%;
  background: linear-gradient(145deg, #9caeb0 0%, #6c898e 100%);
  box-shadow: inset calc(var(--ki-u) * 2) calc(var(--ki-u) * 2) 0 rgba(255, 255, 255, 0.38), 0 calc(var(--ki-u) * 4) calc(var(--ki-u) * 8) calc(var(--ki-u) * -7) rgba(38, 76, 86, 0.8);
  transform: rotate(-12deg);
}

.knowledge-island__rock--lush {
  left: 82%;
  bottom: 22%;
  width: calc(var(--ki-u) * 13 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 8 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -6.5) * var(--ki-unit, 1));
  transform: rotate(17deg);
  opacity: 0.82;
}

.knowledge-island__rock--flourishing {
  left: 14%;
  bottom: 48%;
  width: calc(var(--ki-u) * 12 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 7 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -6) * var(--ki-unit, 1));
  transform: rotate(8deg);
  opacity: 0.8;
}

/* ---------- 中央绿地：嫩芽 / 草丛 / 花 ---------- */
.knowledge-island__sprout {
  left: 26%;
  bottom: 6%;
  width: calc(var(--ki-u) * 24 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 31 * var(--ki-unit, 1));
}

.knowledge-island__sprout-stem {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: calc(var(--ki-u) * 3);
  height: calc(var(--ki-u) * 20);
  transform: translateX(-50%) rotate(4deg);
  border-radius: calc(var(--ki-u) * 999);
  background: #4c9d5d;
}

.knowledge-island__sprout-leaf {
  position: absolute;
  bottom: calc(var(--ki-u) * 14);
  width: calc(var(--ki-u) * 14);
  height: calc(var(--ki-u) * 8);
  border-radius: 100% 0 100% 0;
  background: #4dba72;
}

.knowledge-island__sprout-leaf--left {
  left: calc(var(--ki-u) * 1);
  transform: rotate(-28deg);
}

.knowledge-island__sprout-leaf--right {
  right: calc(var(--ki-u) * 1);
  transform: scaleX(-1) rotate(-28deg);
}

.knowledge-island__sprout-leaf--lush-left {
  bottom: calc(var(--ki-u) * 20);
  left: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 11);
  height: calc(var(--ki-u) * 6);
  transform: rotate(-52deg);
  background: #3fa860;
}

.knowledge-island__sprout-leaf--lush-right {
  bottom: calc(var(--ki-u) * 20);
  right: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 11);
  height: calc(var(--ki-u) * 6);
  transform: scaleX(-1) rotate(-52deg);
  background: #3fa860;
}

.knowledge-island__sprout-leaf--flourishing {
  bottom: calc(var(--ki-u) * 7);
  left: calc(var(--ki-u) * 5);
  width: calc(var(--ki-u) * 9);
  height: calc(var(--ki-u) * 5);
  transform: rotate(-10deg);
  background: #6bc97e;
}

.knowledge-island__grass {
  left: 58%;
  bottom: 4%;
  width: calc(var(--ki-u) * 22 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 19 * var(--ki-unit, 1));
}

.knowledge-island__grass-blade {
  position: absolute;
  bottom: 0;
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 17);
  border-radius: 100% 0 100% 0;
  background: #4b9f60;
  transform-origin: bottom center;
}

.knowledge-island__grass-blade--a {
  left: calc(var(--ki-u) * 2);
  transform: rotate(-25deg);
}

.knowledge-island__grass-blade--b {
  left: calc(var(--ki-u) * 9);
  height: calc(var(--ki-u) * 19);
}

.knowledge-island__grass-blade--c {
  right: calc(var(--ki-u) * 1);
  transform: rotate(29deg);
}

/* 丰盛档多出来的第二丛草：不是把原来那丛变高，而是旁边多了一丛。 */
.knowledge-island__grass-extra {
  position: absolute;
  left: 12%;
  bottom: 2%;
  width: calc(var(--ki-u) * 17 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 14 * var(--ki-unit, 1));
  border-radius: 100% 0 100% 0;
  background: linear-gradient(180deg, #57a96a 0%, #4b9f60 100%);
  transform: rotate(-14deg);
  transform-origin: bottom center;
  opacity: 0.92;
}

.knowledge-island__flower {
  position: absolute;
  width: calc(var(--ki-u) * 6);
  height: calc(var(--ki-u) * 6);
  border-radius: 50%;
  background: #ef8fb0;
  box-shadow: 0 0 0 calc(var(--ki-u) * 1.5) rgba(255, 255, 255, 0.72);
}

.knowledge-island__flower::after {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * 2);
  top: calc(var(--ki-u) * 6);
  width: calc(var(--ki-u) * 2);
  height: calc(var(--ki-u) * 5);
  background: #4b9f60;
}

.knowledge-island__flower--a {
  left: calc(var(--ki-u) * 3);
  bottom: calc(var(--ki-u) * 20);
  background: #f2a0bd;
}

.knowledge-island__flower--b {
  right: calc(var(--ki-u) * 5);
  bottom: calc(var(--ki-u) * 18);
  background: #f7c078;
}

.knowledge-island__flower--c {
  left: calc(var(--ki-u) * 12);
  bottom: calc(var(--ki-u) * 8);
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  background: #ef8fb0;
}

.knowledge-island__flower--d {
  right: calc(var(--ki-u) * 14);
  bottom: calc(var(--ki-u) * 6);
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  background: #c9a2ee;
}

/* ---------- 营地区：椰树 / 帐篷 / 旗 / 木箱 / 营火 / 炊烟 ---------- */
.knowledge-island__palm {
  left: 6%;
  bottom: 2%;
  width: calc(var(--ki-u) * 34 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 52 * var(--ki-unit, 1));
}

.knowledge-island__palm-trunk {
  position: absolute;
  left: calc(var(--ki-u) * 13);
  bottom: 0;
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 36);
  border-radius: 60% 44% 18% 18%;
  background: repeating-linear-gradient(168deg, #b97842 0 calc(var(--ki-u) * 6), #d19452 calc(var(--ki-u) * 6) calc(var(--ki-u) * 9));
  transform: rotate(7deg);
  transform-origin: bottom center;
}

.knowledge-island__palm-crown {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--ki-u) * 32);
  height: calc(var(--ki-u) * 26);
}

.knowledge-island__palm-leaf {
  position: absolute;
  left: calc(var(--ki-u) * 14);
  top: calc(var(--ki-u) * 11);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 7);
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

.knowledge-island__palm-leaf--e {
  transform: rotate(-58deg) scale(0.68);
}

.knowledge-island__palm-leaf--f {
  transform: rotate(292deg) scale(0.58);
}

.knowledge-island__palm-fruit {
  position: absolute;
  left: calc(var(--ki-u) * 14);
  top: calc(var(--ki-u) * 15);
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  border-radius: 50%;
  background: #8f683a;
  box-shadow: calc(var(--ki-u) * 4) calc(var(--ki-u) * 2) 0 #8f683a;
}

.knowledge-island__palm-fruit--lush {
  left: calc(var(--ki-u) * 15);
  top: calc(var(--ki-u) * 17);
  box-shadow: calc(var(--ki-u) * 4) calc(var(--ki-u) * 2) 0 #8f683a;
}

.knowledge-island__palm-fruit--flourishing {
  left: calc(var(--ki-u) * 11);
  top: calc(var(--ki-u) * 18);
  box-shadow: calc(var(--ki-u) * 4) calc(var(--ki-u) * 2) 0 #8f683a, calc(var(--ki-u) * 7) calc(var(--ki-u) * 4) 0 #8f683a;
}

.knowledge-island__camp {
  left: 58%;
  bottom: 2%;
  width: calc(var(--ki-u) * 34 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 26 * var(--ki-unit, 1));
}

.knowledge-island__camp-body {
  position: absolute;
  left: calc(var(--ki-u) * 2);
  bottom: 0;
  width: calc(var(--ki-u) * 30);
  height: calc(var(--ki-u) * 22);
  background: #f2a65b;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  filter: drop-shadow(0 calc(var(--ki-u) * 2) 0 rgba(173, 102, 58, 0.22));
}

.knowledge-island__camp-door {
  position: absolute;
  left: calc(var(--ki-u) * 13);
  bottom: 0;
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 12);
  border-radius: calc(var(--ki-u) * 7) calc(var(--ki-u) * 7) 0 0;
  background: #7b6756;
}

/* 丰盛：旗 + 木箱 —— 看起来像有人在这儿扎过营。 */
.knowledge-island__camp-flag {
  position: absolute;
  top: calc(var(--ki-u) * -3);
  left: calc(var(--ki-u) * 18);
  width: calc(var(--ki-u) * 1.5);
  height: calc(var(--ki-u) * 9);
  background: #80512f;
}

.knowledge-island__camp-flag::after {
  content: "";
  position: absolute;
  top: 0;
  left: calc(var(--ki-u) * 1.5);
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 5.5);
  background: #ef6e65;
  clip-path: polygon(0 0, 100% 28%, 0 100%);
}

.knowledge-island__camp-crate {
  position: absolute;
  left: calc(var(--ki-u) * -4);
  bottom: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 7);
  height: calc(var(--ki-u) * 6);
  border: calc(var(--ki-u) * 0.75) solid rgba(122, 78, 40, 0.4);
  border-radius: calc(var(--ki-u) * 1.5);
  background: #d59a5c;
}

.knowledge-island__camp-crate--flourishing {
  left: calc(var(--ki-u) * -9.5);
  width: calc(var(--ki-u) * 5.5);
  height: calc(var(--ki-u) * 5);
  background: #c68b50;
}

/* 繁荣：营火 + 炊烟 —— 岛上真的有人在生活。 */
.knowledge-island__camp-campfire {
  position: absolute;
  right: calc(var(--ki-u) * -6);
  bottom: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 6.5);
  height: calc(var(--ki-u) * 8);
  border-radius: 50% 50% 40% 40%;
  background: radial-gradient(circle at 50% 70%, #fff0b0 0 34%, #f2a33c 62%, rgba(242, 163, 60, 0) 100%);
  box-shadow: 0 0 calc(var(--ki-u) * 5) rgba(255, 214, 128, 0.66);
}

.knowledge-island__camp-smoke {
  position: absolute;
  right: calc(var(--ki-u) * -3);
  bottom: calc(var(--ki-u) * 10);
  width: calc(var(--ki-u) * 4);
  height: calc(var(--ki-u) * 11);
  border-radius: calc(var(--ki-u) * 999);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.75) 100%);
  transform: skewX(-9deg);
  animation: knowledge-island-smoke-rise 3.6s ease-in-out infinite;
}

@keyframes knowledge-island-smoke-rise {
  0%,
  100% {
    opacity: 0.32;
    transform: skewX(-9deg) translateY(calc(var(--ki-u) * 2));
  }

  50% {
    opacity: 0.72;
    transform: skewX(-9deg) translateY(calc(var(--ki-u) * -2));
  }
}

/* ---------- 东侧港口：码头 / 小船 ----------
   基础档 = 码头 + 泊岸小船；
   丰盛 = 索具 + 缆桩 + 小旗（有人在用）；
   繁荣 = 渔网 + 挂灯 + 小锚（夜里也亮着）。 */
/* 码头：起点压在岛的东岸上，末端伸进东侧那片水面。
   它的落点由港口街区给出，街区又由地形给出，所以岛屿长大时码头一直贴着东岸，
   不会变成一座浮在沙洲旁边的桥。 */
.knowledge-island__dock {
  left: calc(var(--ki-u) * 4);
  bottom: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 60 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 22 * var(--ki-unit, 1));
  transform: rotate(-6deg);
  transform-origin: left bottom;
}

.knowledge-island__dock-plank {
  position: absolute;
  left: 0;
  width: 100%;
  height: calc(var(--ki-u) * 5);
  border: calc(var(--ki-u) * 0.6) solid rgba(130, 74, 38, 0.35);
  border-radius: calc(var(--ki-u) * 2.5);
  background: linear-gradient(180deg, #e6b36d 0%, #b77a42 100%);
  box-shadow: inset 0 calc(var(--ki-u) * 0.6) 0 rgba(255, 245, 204, 0.58);
}

.knowledge-island__dock-plank--a {
  top: calc(var(--ki-u) * 3);
}

.knowledge-island__dock-plank--b {
  top: calc(var(--ki-u) * 9);
}

.knowledge-island__dock-plank--lush {
  top: calc(var(--ki-u) * 15);
}

.knowledge-island__dock-post {
  position: absolute;
  top: calc(var(--ki-u) * 3);
  width: calc(var(--ki-u) * 3.5);
  height: calc(var(--ki-u) * 16);
  border-radius: calc(var(--ki-u) * 2);
  background: #8f5a32;
}

.knowledge-island__dock-post--a {
  left: calc(var(--ki-u) * 3);
}

.knowledge-island__dock-post--b {
  right: calc(var(--ki-u) * 3);
}

.knowledge-island__dock-post--lush {
  left: 50%;
  top: calc(var(--ki-u) * 3);
  transform: translateX(-50%);
}

/* 丰盛：缆桩，码头真的被系过缆。 */
.knowledge-island__dock-bollard {
  position: absolute;
  left: 62%;
  top: 0;
  width: calc(var(--ki-u) * 3);
  height: calc(var(--ki-u) * 5);
  border-radius: calc(var(--ki-u) * 1.5);
  background: #6f4a2a;
}

.knowledge-island__dock-bollard::after {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * -3);
  top: calc(var(--ki-u) * 0.75);
  width: calc(var(--ki-u) * 9);
  height: calc(var(--ki-u) * 1);
  border-radius: calc(var(--ki-u) * 999);
  background: rgba(111, 74, 42, 0.72);
}

/* 繁荣：渔网 + 挂灯。 */
.knowledge-island__dock-net {
  position: absolute;
  right: calc(var(--ki-u) * -7);
  top: calc(var(--ki-u) * 6);
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 9);
  border: calc(var(--ki-u) * 0.6) solid rgba(122, 84, 48, 0.4);
  border-radius: calc(var(--ki-u) * 1.5);
  background:
    repeating-linear-gradient(45deg, rgba(122, 84, 48, 0.28) 0 calc(var(--ki-u) * 0.6), transparent calc(var(--ki-u) * 0.6) calc(var(--ki-u) * 3)),
    repeating-linear-gradient(-45deg, rgba(122, 84, 48, 0.28) 0 calc(var(--ki-u) * 0.6), transparent calc(var(--ki-u) * 0.6) calc(var(--ki-u) * 3));
  transform: rotate(8deg);
}

.knowledge-island__dock-lantern {
  position: absolute;
  left: 20%;
  top: calc(var(--ki-u) * -6);
  width: calc(var(--ki-u) * 4.5);
  height: calc(var(--ki-u) * 6);
  border-radius: calc(var(--ki-u) * 1.5) calc(var(--ki-u) * 1.5) calc(var(--ki-u) * 2) calc(var(--ki-u) * 2);
  background: #ffe08a;
  box-shadow: 0 0 calc(var(--ki-u) * 5) rgba(255, 214, 128, 0.85);
}

.knowledge-island__dock-lantern::before {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * 1.5);
  top: calc(var(--ki-u) * -3);
  width: calc(var(--ki-u) * 1);
  height: calc(var(--ki-u) * 3);
  background: #6f4a2a;
}

/* 小船：停在码头末端外侧的海面上，浮在岛的东南角，不压在沙上。 */
.knowledge-island__boat {
  left: 84%;
  bottom: -18%;
  width: calc(var(--ki-u) * 26 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 29 * var(--ki-unit, 1));
}

.knowledge-island__boat-hull {
  position: absolute;
  left: calc(var(--ki-u) * 2);
  bottom: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 8.5);
  border-radius: 0 0 calc(var(--ki-u) * 15) calc(var(--ki-u) * 15);
  background: #f08d55;
  border: calc(var(--ki-u) * 0.8) solid rgba(131, 74, 54, 0.35);
}

.knowledge-island__boat-mast {
  position: absolute;
  left: calc(var(--ki-u) * 12);
  bottom: calc(var(--ki-u) * 9);
  width: calc(var(--ki-u) * 1.6);
  height: calc(var(--ki-u) * 19);
  background: #765a48;
}

.knowledge-island__boat-sail {
  position: absolute;
  left: calc(var(--ki-u) * 14);
  top: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 13);
  height: calc(var(--ki-u) * 15);
  background: #fff4d0;
  clip-path: polygon(0 0, 100% 80%, 0 100%);
  border: calc(var(--ki-u) * 0.8) solid rgba(185, 135, 77, 0.3);
}

/* 丰盛：索具 + 小旗 —— 船出海了。 */
.knowledge-island__boat-rigging {
  position: absolute;
  left: calc(var(--ki-u) * 3);
  top: calc(var(--ki-u) * 4);
  width: calc(var(--ki-u) * 20);
  height: calc(var(--ki-u) * 1.2);
  background: rgba(118, 90, 72, 0.72);
  transform: rotate(6deg);
}

.knowledge-island__boat-flag {
  position: absolute;
  left: calc(var(--ki-u) * 13.5);
  top: calc(var(--ki-u) * -0.5);
  width: calc(var(--ki-u) * 7);
  height: calc(var(--ki-u) * 4);
  background: #7fc9e0;
  clip-path: polygon(0 0, 100% 26%, 0 100%);
}

/* 繁荣：小锚。 */
.knowledge-island__boat-anchor {
  position: absolute;
  left: calc(var(--ki-u) * 0.5);
  bottom: 0;
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  border: calc(var(--ki-u) * 1.2) solid #6f5a4c;
  border-top: 0;
  border-radius: 0 0 calc(var(--ki-u) * 5) calc(var(--ki-u) * 5);
}

.knowledge-island__boat-anchor::before {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * 1.6);
  top: calc(var(--ki-u) * -3.4);
  width: calc(var(--ki-u) * 1.2);
  height: calc(var(--ki-u) * 3.4);
  background: #6f5a4c;
}

/* ---------- 高地区：灯塔 + 灯塔自己的光束 ---------- */
.knowledge-island__lighthouse {
  left: 50%;
  bottom: 0;
  width: calc(var(--ki-u) * 22 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 46 * var(--ki-unit, 1));
  margin-left: calc(var(--ki-u) * -11 * var(--ki-unit, 1));
  z-index: 7;
}

.knowledge-island__lighthouse-roof {
  position: absolute;
  left: calc(var(--ki-u) * 2);
  top: 0;
  width: calc(var(--ki-u) * 18);
  height: calc(var(--ki-u) * 9);
  border-radius: 50% 50% 18% 18%;
  background: #e7665a;
  box-shadow: inset 0 var(--ki-u) 0 rgba(255, 245, 220, 0.42);
}

.knowledge-island__lighthouse-tower {
  position: absolute;
  left: calc(var(--ki-u) * 4);
  top: calc(var(--ki-u) * 8);
  width: calc(var(--ki-u) * 14);
  height: calc(var(--ki-u) * 37);
  clip-path: polygon(14% 0, 86% 0, 100% 100%, 0 100%);
  background: repeating-linear-gradient(180deg, #fff3cf 0 calc(var(--ki-u) * 9), #e47763 calc(var(--ki-u) * 9) calc(var(--ki-u) * 14));
  border-radius: var(--ki-u) var(--ki-u) 0 0;
}

.knowledge-island__lighthouse-window {
  position: absolute;
  left: calc(var(--ki-u) * 8);
  width: calc(var(--ki-u) * 6);
  height: calc(var(--ki-u) * 6);
  border-radius: var(--ki-u);
  background: #5c9eb4;
  box-shadow: inset var(--ki-u) var(--ki-u) 0 rgba(255, 255, 255, 0.7);
}

.knowledge-island__lighthouse-window--a {
  top: calc(var(--ki-u) * 16);
}

.knowledge-island__lighthouse-window--b {
  top: calc(var(--ki-u) * 28);
}

.knowledge-island__lighthouse-light {
  position: absolute;
  left: calc(var(--ki-u) * 7.5);
  top: calc(var(--ki-u) * 3.5);
  width: calc(var(--ki-u) * 7);
  height: calc(var(--ki-u) * 6);
  border-radius: 50%;
  background: #ffe58d;
  box-shadow: 0 0 0 var(--ki-u) rgba(255, 242, 164, 0.5);
}

/* 光束：灯塔的子元素，左边就贴着灯塔的灯室，向东射出去。
   以前它是画布级绝对定位（right: 4% / bottom: 53%），和灯塔的位置各写各的，
   所以光总是从画面右边射出来、跟灯塔没关系；现在它是灯塔的子元素，
   岛屿再怎么变，光都从灯塔自己的窗口射出去。 */
.knowledge-island__beam {
  position: absolute;
  left: 100%;
  top: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 92 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 20 * var(--ki-unit, 1));
  background: linear-gradient(90deg, rgba(255, 226, 132, 0.95), rgba(255, 238, 160, 0.55) 40%, rgba(255, 238, 160, 0));
  clip-path: polygon(0 36%, 100% 0, 100% 100%, 0 64%);
  animation: knowledge-island-beam 4s ease-in-out infinite;
  z-index: -1;
}

.knowledge-island__beam--lush {
  width: calc(var(--ki-u) * 112 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 24 * var(--ki-unit, 1));
}

.knowledge-island__beam--flourishing {
  width: calc(var(--ki-u) * 132 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 28 * var(--ki-unit, 1));
}

/* 繁荣：窗更亮 + 塔基座（灯更结实了）。 */
.knowledge-island__lighthouse-window--lush {
  top: calc(var(--ki-u) * 22);
  background: #ffe9a8;
  box-shadow: 0 0 calc(var(--ki-u) * 4) rgba(255, 226, 140, 0.86);
}

.knowledge-island__lighthouse-window--flourishing {
  top: calc(var(--ki-u) * 34);
  background: #ffe9a8;
  box-shadow: 0 0 calc(var(--ki-u) * 5) rgba(255, 226, 140, 0.92);
}

.knowledge-island__lighthouse-base {
  position: absolute;
  left: 0;
  bottom: calc(var(--ki-u) * -2);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 5);
  border-radius: 0 0 var(--ki-u) var(--ki-u);
  background: linear-gradient(180deg, #e8dcc4 0%, #cbbb9c 100%);
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

/* ===========================================================================
   尺寸
   ---------------------------------------------------------------------------
   compact 与 hero 现在共用同一套世界坐标与同一个 16:9 画面盒，
   所以这里不再有任何"按视口分档缩放"的魔法数字：两种尺寸只有卡片内边距和圆角不同。
   画面内容、元素数量、解锁规则完全一样，构图也完全一样。
   =========================================================================== */
.knowledge-island--hero {
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
  border-radius: 24px;
}

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
  .knowledge-island {
    padding: 11px 12px;
  }
}

/* 动效全部是可关的：减少动态偏好下不呼吸、不冒烟、不闪灯。 */
@media (prefers-reduced-motion: reduce) {
  .knowledge-island__beam,
  .knowledge-island__surf-line,
  .knowledge-island__camp-smoke,
  .knowledge-island__next-terrain {
    animation: none;
  }

  /* 关掉动画后，预告轮廓不能淡到看不见：给一个稳定的静态强度。 */
  .knowledge-island__next-terrain {
    opacity: 0.78;
  }

  .knowledge-island__fill {
    transition: none;
  }
}
</style>
