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
//
// 轻互动（第四层，纯表现）：
//   这一层只做「点一下有回应」，不写任何持久状态、不加奖励、不改印章或星星：
//     - 热点按钮不放在 role="img" 里面，而是单独一层盖在画面上，
//       位置由脚本按真实元素量出来（anchor 选择器），所以永远不会画歪、也不会盖住别的按钮；
//     - 每次点按只有一个「正在回应」的热点，动画短、结束即复位；
//     - 唯一的"状态"是组件内的临时 UI 状态（回合一结束就清掉），刷新页面即恢复原样。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
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

// ---------------------------------------------------------------------------
// 轻互动：点一下有回应
// ---------------------------------------------------------------------------
// 这一层是「表现」，不是「成长」：
//   - 它不读、不写任何账本，不加收藏 / 奖励 / 货币，也不碰印章与星星；
//   - 阶段、进度、下一阶段仍然只有 knowledgeIslandGrowth 说了算；
//   - 唯一的内存状态是"哪一个热点正在回应"和"提示文字是什么"，
//     两者都由定时器复位，刷新页面立刻回到原样。
// 热点位置不写死坐标：每帧按锚点选择器量真实元素的盒子，
// 所以贝壳 / 石头 / 海鸥无论在哪个阶段、哪个尺寸下都贴在它自己身上。
const figureRef = ref(null);
const hotSpots = ref([]);
const activeHotSpotId = ref("");
const hintText = ref("");
const ripples = ref([]);

let syncFrame = 0;
let resetTimer = 0;
let hintTimer = 0;
let rippleSeq = 0;
let resizeObserver = null;
// 涟漪的收尾定时器也登记进来：组件被关掉时一并清掉，
// 避免回调回头去改一个已经没人看的 ref。
const rippleTimers = new Set();

// 锚点选择器 → 热点 id。没有对应元素时（例如繁荣度不足时没有海鸥）这个热点就不出现。
// kind 决定这块热点长什么样：
//   box  —— 盖住锚点元素本身（贝壳 / 石头 / 海鸥）；
//   chip —— 只是一枚看得见的小牌子，钉在锚点的一个位置上（下一阶段预告）；
//   band —— 一整条固定的画面区域（海面）。
const HOT_SPOT_DEFS = Object.freeze([
  { id: "shell", anchor: ".knowledge-island__shell", kind: "box" },
  { id: "rock", anchor: ".knowledge-island__rock", kind: "box" },
  { id: "gull", anchor: ".knowledge-island__gull--a", kind: "box" },
  { id: "next", anchor: '[data-role="knowledge-island-next-terrain"]', kind: "chip" },
  { id: "sea", anchor: null, kind: "band" }
]);

// 每个热点点一下说什么。全部是对孩子说的短句，不含任何新的成长规则。
const HOT_SPOT_LABELS = Object.freeze({
  shell: { label: "看看西岸的贝壳", hint: "发现了一枚贝壳" },
  rock: { label: "看看西岸的石头", hint: "石头被浪花拍了一下" },
  gull: { label: "看看天上飞过的海鸥", hint: "海鸥从岛上飞过" },
  next: { label: "看看岛外面的虚线轮廓", hint: "" },
  sea: { label: "点一点海面", hint: "海面泛起一圈小涟漪" }
});

// 「还差多少印章，长成什么样」这句话完全由 knowledgeIslandGrowth 已经算好的字段拼出来：
// remainingToNext 是它算的差值，nextStage.name 是它认定的下一阶段，组件不重新判断阈值。
const nextStageHintText = computed(() => {
  const nextStage = props.island?.nextStage;
  const remaining = Number(props.island?.remainingToNext) || 0;

  if (!nextStage?.name) {
    return "";
  }

  return `还差 ${remaining} 枚印章，将成长为「${nextStage.name}」`;
});

function hotSpotLabel(id) {
  if (id === "next") {
    return nextStageHintText.value || HOT_SPOT_LABELS.next.label;
  }

  return HOT_SPOT_LABELS[id]?.label || "";
}

function hotSpotHint(id) {
  if (id === "next") {
    return nextStageHintText.value;
  }

  return HOT_SPOT_LABELS[id]?.hint || "";
}

// 把每个锚点的真实盒子换算成「相对画面盒的百分比」，直接喂给热点层的内联样式。
// 量的是画面盒（不是世界画布），所以 compact 与 hero 共用同一段换算。
function syncHotSpots() {
  const figure = figureRef.value;

  if (!figure) {
    hotSpots.value = [];
    return;
  }

  const frame = figure.getBoundingClientRect();

  if (frame.width <= 0) {
    hotSpots.value = [];
    return;
  }

  const toPercentBox = (rect) => ({
    left: ((rect.left - frame.left) / frame.width) * 100,
    top: ((rect.top - frame.top) / frame.height) * 100,
    width: (rect.width / frame.width) * 100,
    height: (rect.height / frame.height) * 100
  });

  const measured = HOT_SPOT_DEFS.map((definition) => {
    if (definition.kind === "band") {
      // 海面：画面下方一条横带。这里写的是"世界画布上的比例"，
      // 与地形表无关，因此在任何阶段都是同一片开阔水面。
      return { id: definition.id, box: { left: 0, top: 74, width: 100, height: 26 } };
    }

    const target = figure.querySelector(definition.anchor);

    if (!target) {
      return null;
    }

    const rect = target.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    if (definition.kind === "chip") {
      // 预告轮廓只用一枚看得见的小牌子，不用整块轮廓当隐形热区：
      // 轮廓在 400×225 的世界里比现在的岛只大一圈，
      // 拿它的矩形当热区会几乎盖住整座岛，孩子点椰子树也会弹出"还差几枚"。
      // 牌子钉在轮廓左端、也就是虚线最清楚的那一段上。
      return {
        id: definition.id,
        box: {
          left: ((rect.left - frame.left) / frame.width) * 100,
          top: ((rect.top + rect.height * 0.52 - frame.top) / frame.height) * 100,
          width: 0,
          height: 0
        }
      };
    }

    return { id: definition.id, box: toPercentBox(rect) };
  }).filter(Boolean);

  hotSpots.value = measured;
}

function scheduleHotSpotSync() {
  if (typeof window === "undefined" || !window.requestAnimationFrame) {
    return;
  }

  if (syncFrame) {
    window.cancelAnimationFrame(syncFrame);
  }

  syncFrame = window.requestAnimationFrame(() => {
    syncFrame = 0;
    syncHotSpots();
  });
}

function clearTimers() {
  if (typeof window !== "undefined") {
    if (resetTimer) {
      window.clearTimeout(resetTimer);
      resetTimer = 0;
    }
    if (hintTimer) {
      window.clearTimeout(hintTimer);
      hintTimer = 0;
    }
  }

  rippleTimers.forEach((timer) => window.clearTimeout(timer));
  rippleTimers.clear();
  // 定时器被清掉的同时要把涟漪本身也收走：
  // 只清定时器不清元素的话，阶段切换时那一圈涟漪会永远留在画面上。
  ripples.value = [];
}

function showHint(text) {
  if (!text) {
    return;
  }

  hintText.value = text;

  if (typeof window === "undefined") {
    return;
  }

  if (hintTimer) {
    window.clearTimeout(hintTimer);
  }

  // 提示只停留一会儿就自己收走，不需要孩子手动关。
  hintTimer = window.setTimeout(() => {
    hintText.value = "";
    hintTimer = 0;
  }, 2400);
}

function pushRipple(point) {
  rippleSeq += 1;
  const ripple = { key: rippleSeq, x: point.x, y: point.y };
  ripples.value = [...ripples.value, ripple];

  if (typeof window === "undefined") {
    return;
  }

  const timer = window.setTimeout(() => {
    rippleTimers.delete(timer);
    ripples.value = ripples.value.filter((item) => item.key !== ripple.key);
  }, 1200);

  rippleTimers.add(timer);
}

function ripplePointFromEvent(event) {
  const frame = figureRef.value;

  if (!frame) {
    return { x: 50, y: 88 };
  }

  const rect = frame.getBoundingClientRect();
  const clientX = event?.clientX;
  const clientY = event?.clientY;

  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    // 键盘触发没有坐标：落在水面正中，同样看得见。
    return { x: 50, y: 88 };
  }

  return {
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
  };
}

function triggerHotSpot(id, event) {
  // 一次只回应一个：连点不会叠成一堆动画，也不会一直吵。
  activeHotSpotId.value = id;
  showHint(hotSpotHint(id));

  if (id === "sea") {
    pushRipple(ripplePointFromEvent(event));
  }

  if (typeof window === "undefined") {
    return;
  }

  if (resetTimer) {
    window.clearTimeout(resetTimer);
  }

  resetTimer = window.setTimeout(() => {
    activeHotSpotId.value = "";
    resetTimer = 0;
  }, 1100);
}

onMounted(() => {
  scheduleHotSpotSync();
  nextTick(scheduleHotSpotSync);

  if (typeof ResizeObserver === "undefined" || !figureRef.value) {
    return;
  }

  // 画面盒尺寸一变（改窗口、换 compact/hero、字号变化）就重新量一遍热点位置。
  resizeObserver = new ResizeObserver(scheduleHotSpotSync);
  resizeObserver.observe(figureRef.value);
});

onBeforeUnmount(() => {
  clearTimers();

  if (typeof window !== "undefined" && syncFrame) {
    window.cancelAnimationFrame(syncFrame);
    syncFrame = 0;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// 阶段 / 繁荣度 / 尺寸一变，画面里的元素就换了一批，热点必须跟着重新量。
watch(
  () => [props.island?.currentStage?.id, prosperityKey(), sizeKey()],
  () => {
    clearTimers();
    activeHotSpotId.value = "";
    hintText.value = "";
    scheduleHotSpotSync();
    nextTick(scheduleHotSpotSync);
  }
);
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
      `knowledge-island--${sizeKey()}`,
      { [`knowledge-island--active-${activeHotSpotId}`]: Boolean(activeHotSpotId) }
    ]"
  >
    <div
      ref="figureRef"
      class="knowledge-island__figure"
      data-role="knowledge-island-figure"
      :data-stage="island.currentStage.id"
      :data-prosperity="prosperityKey()"
    >
      <!-- 世界画布：固定 400 × 225 的设计画布（16:9），内部所有尺寸都按它换算。
           类名刻意用 __world 而不是 __stage：__stage 这个名字已经被信息区里
           「当前：XX」那个段落占用了，两处同名会让那条规则把段落也变成绝对定位、
           铺满整张卡片（庆祝弹层里的按钮就是这样被盖住的）。

           role="img" 与整段画面说明放在世界画布上，而不是画面盒上：
           画面盒里还叠着一层可点的热点按钮，把 role="img" 留在外面
           会让整层按钮对读屏软件变成装饰（role=img 的子树是纯展示的）。 -->
      <div
        class="knowledge-island__world"
        role="img"
        :aria-label="`知识岛现在的样子：${island.currentStage.name}，${island.prosperityLabel}。${island.currentStage.summary}`"
      >
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
        <!-- 偶尔掠过的一只：与上面三只停在天上的海鸥不同，它大部分时间待在画面外，
             只是每隔很久从天上慢慢横穿过去一次。
             它是纯装饰：不参与热点测量（可点的那只仍然是 __gull--a），
             所以这里动起来不会把「点海鸥」那个热点的位置带歪。 -->
        <span
          v-if="isProsperityAtLeast(1)"
          class="knowledge-island__gull knowledge-island__gull--flyby"
          aria-hidden="true"
        ></span>

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
          :class="{ 'knowledge-island__next-terrain--tapped': activeHotSpotId === 'next' }"
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
            <span class="knowledge-island__shell knowledge-island__shell--main" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-a" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-b" aria-hidden="true"></span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__shell knowledge-island__shell--flourishing" aria-hidden="true"></span>
            <span class="knowledge-island__rock knowledge-island__rock--main" aria-hidden="true">
              <!-- 石头脚下那一小圈水：被点时才荡开，平时是透明的。 -->
              <span class="knowledge-island__rock-splash"></span>
            </span>
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

      <!-- ============ 轻互动层 ============
           一层透明按钮，贴在画面上、盖住对应元素。
           位置不是写死的坐标，而是每次按锚点元素量出来的百分比，
           所以贝壳 / 石头 / 海鸥换了阶段也永远贴着自己，不会飘。
           这一层整体不吃点击（pointer-events: none），
           只有按钮本身可点，因此不会挡住卡片里的任何其它东西。 -->
      <div
        class="knowledge-island__hotspots"
        data-role="knowledge-island-hotspots"
        :class="{ 'knowledge-island__hotspots--active': Boolean(activeHotSpotId) }"
      >
        <span
          v-for="ripple in ripples"
          :key="ripple.key"
          class="knowledge-island__ripple"
          :style="{ left: `${ripple.x}%`, top: `${ripple.y}%` }"
          aria-hidden="true"
        ></span>

        <button
          v-for="hotSpot in hotSpots"
          :key="hotSpot.id"
          type="button"
          :class="[
            'knowledge-island__hotspot',
            `knowledge-island__hotspot--${hotSpot.id}`,
            { 'knowledge-island__hotspot--on': activeHotSpotId === hotSpot.id }
          ]"
          :style="{
            left: `${hotSpot.box.left}%`,
            top: `${hotSpot.box.top}%`,
            width: `${hotSpot.box.width}%`,
            height: `${hotSpot.box.height}%`
          }"
          :data-role="`knowledge-island-hotspot-${hotSpot.id}`"
          :aria-label="hotSpotLabel(hotSpot.id)"
          @click="triggerHotSpot(hotSpot.id, $event)"
        >
          <!-- 只有"下一阶段预告"是一枚看得见的牌子：其余热点保持透明，
               画面上不会多出一堆方框。牌子上的数字同样来自 knowledgeIslandGrowth。 -->
          <template v-if="hotSpot.id === 'next'">
            <span class="knowledge-island__hotspot-chip">还差 {{ island.remainingToNext }} 枚</span>
          </template>
        </button>
      </div>

      <!-- 回话气泡：点一下才出现，一会儿自己收走。
           用 aria-live 播报，键盘和读屏用户点完热点同样知道发生了什么。 -->
      <p
        v-if="hintText"
        class="knowledge-island__hint"
        data-role="knowledge-island-hint"
        role="status"
        aria-live="polite"
      >
        {{ hintText }}
      </p>
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
  /* ===========================================================================
     环境生命感（第五层，纯表现）
     ---------------------------------------------------------------------------
     小岛应该"轻轻动起来、听起来像一个海岛"，但不能抢主体，所以这一层的规矩是：
       1. 全部用 CSS animation，不用 JS 高频定时器驱动画面；
       2. 全部只动 transform / opacity —— 不动 width / height / top / left，
          所以绝不会引起重排，也不会把画面推出边界造成横向溢出；
       3. 具体物件仍然以「点击才回应」为主：这里动的全是环境
          （海、云、天上偶尔飞过的海鸥、光晕）和极轻的静物摆动；
       4. 节奏与幅度统一挂在这几个变量上，繁荣度只改"动得多快、动多大"，
          绝不参与任何阶段、印章或解锁判定。
     基础档是默认值（最克制），下面两档只是把节奏收快一点、幅度放大一点。
     =========================================================================== */
  --ki-ambient-wave: 26s;   /* 岸边浪纹的横向漂移 */
  --ki-ambient-swell: 30s;  /* 整条浪带的缓慢起伏 */
  --ki-ambient-cloud: 108s; /* 云漂移（一轮要长到不像在循环） */
  --ki-ambient-flyby: 78s;  /* 海鸥掠过的完整周期（含长时间不出现） */
  --ki-ambient-sun: 13s;    /* 太阳光晕的呼吸 */
  --ki-ambient-sway: 9.5s;  /* 嫩芽 / 草丛轻摆 */
  --ki-ambient-bob: 8s;     /* 小船轻摇 */
  --ki-ambient-beam: 19s;   /* 灯塔光束缓慢扫动 */
  /* 幅度系数：所有环境动画的位移 / 角度都乘它，繁荣度越高动得越多一点。 */
  --ki-ambient-amp: 1;

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

/* 丰盛：稍微多一点动态 —— 节奏快一档、幅度大一点点。
   仍然只是"多一点"，不是换一套动画。 */
.knowledge-island--prosperity-lush {
  --ki-ambient-wave: 23s;
  --ki-ambient-swell: 26s;
  --ki-ambient-cloud: 96s;
  --ki-ambient-flyby: 68s;
  --ki-ambient-sun: 11.5s;
  --ki-ambient-sway: 8.4s;
  --ki-ambient-bob: 7s;
  --ki-ambient-beam: 16.5s;
  --ki-ambient-amp: 1.35;
}

/* 繁荣：动态稍丰富。同样只是变量不同，动画本身与解锁规则一个字都没改。 */
.knowledge-island--prosperity-flourishing {
  --ki-ambient-wave: 20s;
  --ki-ambient-swell: 22s;
  --ki-ambient-cloud: 84s;
  --ki-ambient-flyby: 58s;
  --ki-ambient-sun: 10s;
  --ki-ambient-sway: 7.4s;
  --ki-ambient-bob: 6.2s;
  --ki-ambient-beam: 14s;
  --ki-ambient-amp: 1.7;
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

/* 光晕的"呼吸"落在这一层伪元素上，而不是去动 ::before 之外那颗太阳本体：
   只改 opacity 与极小的 scale，所以不触发重排，太阳本体的位置与大小也一动不动。
   直径取 280%（22 设计单位 → 约 61.6），配合同样的位移上限，
   最右也只到设计画布 400 以内，永远不会顶出画面。 */
.knowledge-island__sun::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 280%;
  height: 280%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 233, 158, 0.5) 0%, rgba(255, 226, 132, 0) 68%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: knowledge-island-sun-breathe var(--ki-ambient-sun) ease-in-out infinite;
}

@keyframes knowledge-island-sun-breathe {
  0%,
  100% {
    opacity: 0.34;
    transform: translate(-50%, -50%) scale(0.96);
  }

  50% {
    opacity: 0.62;
    transform: translate(-50%, -50%) scale(1.04);
  }
}

.knowledge-island__cloud {
  --ki-cloud-scale: 1;
  --ki-cloud-direction: 1;
  position: absolute;
  width: calc(var(--ki-u) * 62);
  height: calc(var(--ki-u) * 18);
  border-radius: calc(var(--ki-u) * 999);
  background: rgba(255, 255, 255, 0.72);
  opacity: 0.86;
  z-index: 1;
  /* 云的静止大小改由 --ki-cloud-scale 承担，transform 整个交给漂移动画，
     这样"缩放"和"漂移"不会互相覆盖。 */
  transform: translateX(0) scale(var(--ki-cloud-scale));
  animation: knowledge-island-cloud-drift var(--ki-ambient-cloud) ease-in-out infinite alternate;
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

/* 三朵云各走各的：左边一朵慢慢往右飘，右边一朵反向飘得更慢，
   繁荣档多出来的那朵走得稍快一点。
   周期与幅度都极小（每轮只移动 ±10 个设计单位），所以看不出在循环，
   而且三朵云的漂移范围都远在 400 设计单位之内。 */
.knowledge-island__cloud--left {
  top: calc(var(--ki-u) * 26);
  left: calc(var(--ki-u) * 34);
  --ki-cloud-scale: 0.78;
  --ki-cloud-direction: 1;
  animation-delay: -21s;
}

.knowledge-island__cloud--right {
  top: calc(var(--ki-u) * 46);
  left: calc(var(--ki-u) * 248);
  --ki-cloud-scale: 0.58;
  --ki-cloud-direction: -1;
  opacity: 0.56;
  /* 反向 + 更慢，避免两朵云看起来是同一段动画的两份拷贝。 */
  animation-duration: calc(var(--ki-ambient-cloud) * 1.45);
  animation-delay: -63s;
}

.knowledge-island__cloud--flourishing {
  top: calc(var(--ki-u) * 16);
  left: calc(var(--ki-u) * 150);
  --ki-cloud-scale: 0.5;
  --ki-cloud-direction: 1;
  opacity: 0.66;
  animation-duration: calc(var(--ki-ambient-cloud) * 0.82);
  animation-delay: -37s;
}

@keyframes knowledge-island-cloud-drift {
  from {
    transform: translateX(calc(var(--ki-u) * -10 * var(--ki-ambient-amp) * var(--ki-cloud-direction)))
      scale(var(--ki-cloud-scale));
  }

  to {
    transform: translateX(calc(var(--ki-u) * 10 * var(--ki-ambient-amp) * var(--ki-cloud-direction)))
      scale(var(--ki-cloud-scale));
  }
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

/* 海鸥：一只飞鸟的轮廓是「两道向上张开的翅膀 + 中间一个身子」，
   以前是两段半圆弧，远看只是天上两个小点。
   现在把一只海鸥拆成三个笔画画在同一个盒子里：
     容器本身只负责摆位置和大小；
     ::before / ::after 是左右两边的翅膀（四分之一圆弧，外端高、中间低，
       所以两翼在正中间形成一个浅浅的 V，这就是海鸥的标志性剪影）；
     盒子的背景层是身子（一个小小的深色椭圆），让「这是一只鸟」更确定。
   尺寸比原来大了一圈，缩到 compact 时也还认得出来。 */
.knowledge-island__gull {
  position: absolute;
  width: calc(var(--ki-u) * 14);
  height: calc(var(--ki-u) * 7);
  /* 身子：两翼正中间那一小团深色。没有它，两道弧线会被看成两道云。 */
  background: radial-gradient(
    ellipse calc(var(--ki-u) * 3.6) calc(var(--ki-u) * 2.2) at 50% 70%,
    rgba(52, 104, 138, 0.88) 0%,
    rgba(52, 104, 138, 0) 74%
  );
  z-index: 1;
}

.knowledge-island__gull::before,
.knowledge-island__gull::after {
  content: "";
  position: absolute;
  bottom: 22%;
  width: 56%;
  height: 74%;
  border-top: calc(var(--ki-u) * 1.7) solid rgba(52, 104, 138, 0.82);
}

.knowledge-island__gull::before {
  left: 0;
  border-top-right-radius: 100% 100%;
  transform: rotate(-4deg);
}

.knowledge-island__gull::after {
  right: 0;
  border-top-left-radius: 100% 100%;
  transform: rotate(4deg);
}

.knowledge-island__gull--a {
  top: calc(var(--ki-u) * 40);
  left: calc(var(--ki-u) * 250);
}

.knowledge-island__gull--b {
  top: calc(var(--ki-u) * 57);
  left: calc(var(--ki-u) * 282);
  transform: scale(0.72);
  opacity: 0.8;
}

.knowledge-island__gull--c {
  top: calc(var(--ki-u) * 30);
  left: calc(var(--ki-u) * 206);
  transform: scale(0.62);
  opacity: 0.68;
}

/* 偶尔掠过的一只海鸥。
   一个周期里只有前 1/4 的时间在画面里横穿过去，剩下的时间停在画面外、不可见，
   所以它是"偶尔有一只飞过"，而不是"一直有一只在那扇翅膀"。
   关键约束：可点的那只海鸥是 __gull--a，它的热点位置是按静止盒子量出来的，
   所以这里必须另起一个元素——绝不能去动 __gull--a，否则热区会停在原地点不到鸟。 */
.knowledge-island__gull--flyby {
  top: calc(var(--ki-u) * 34);
  left: 0;
  transform: scale(0.8);
  opacity: 0;
  animation: knowledge-island-gull-flyby var(--ki-ambient-flyby) linear infinite;
}

@keyframes knowledge-island-gull-flyby {
  0% {
    transform: translateX(calc(var(--ki-u) * -30)) translateY(calc(var(--ki-u) * 7)) scale(0.8);
    opacity: 0;
  }

  5% {
    opacity: 0.66;
  }

  26% {
    transform: translateX(calc(var(--ki-u) * 430)) translateY(calc(var(--ki-u) * -5)) scale(0.8);
    opacity: 0.6;
  }

  34% {
    transform: translateX(calc(var(--ki-u) * 430)) translateY(calc(var(--ki-u) * -5)) scale(0.8);
    opacity: 0;
  }

  100% {
    transform: translateX(calc(var(--ki-u) * 430)) translateY(calc(var(--ki-u) * -5)) scale(0.8);
    opacity: 0;
  }
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
  /* 整条浪带非常缓慢地轻轻起伏：位移只有 ±0.9 个设计单位，
     远小于浪带自身 14% 的高度，所以不会露出海面、也不会碰到岛。
     动的是这一整层而不是海面本身——海面不跟着晃，晃的只是贴着岸的那几道浪。 */
  animation: knowledge-island-sea-swell var(--ki-ambient-swell) ease-in-out infinite alternate;
}

@keyframes knowledge-island-sea-swell {
  from {
    transform: translateY(calc(var(--ki-u) * -0.9 * var(--ki-ambient-amp)));
  }

  to {
    transform: translateY(calc(var(--ki-u) * 0.9 * var(--ki-ambient-amp)));
  }
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
  /* 岸边浪纹只做非常缓慢的横向漂移：周期由繁荣度变量给出（基础档 26s 一轮），
     每一段浪纹还各自带一个负 delay，所以它们从一开始就是错开的。 */
  animation: knowledge-island-wave-drift var(--ki-ambient-wave) ease-in-out infinite alternate;
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

/* 西岸这一层压在中央绿地之上。
   贝壳、圆石、礁石都是"沙滩上的前景"，本来就该挡在草后面；
   而且这一层里有可点的热点，元素被草盖住就等于点不到了。 */
.knowledge-island__zone--west-shore {
  z-index: 7;
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

/* ---------- 贝壳 ----------
   以前是一只描边的半圆，看着像个月牙或者羊角。现在画成真正的扇贝：
     - 壳体：上宽下窄的扇面（圆角 + 上半部更鼓），底边收成一个小壳脐；
     - 壳肋：从壳脐往外发散的放射线，这是扇贝最认得出的特征；
     - 边缘：外沿有一圈更深的描边，让它在沙滩上也跳得出来。
   壳肋用 repeating-conic-gradient 从壳脐往上发散，
   角度步长固定成"隔一条亮一条"，远处看也还是一把扇子。 */
/* 西岸这几件东西的落点是分开摆的，不是挤在一处：
   圆石压在街区最左下的水边，贝壳落在街区最右下方的沙滩上，中间留出整条街区，
   其它贝壳 / 礁石再按高度错开。
   这样点贝壳不会点到石头，点石头也不会点到贝壳。
   这不只是构图好看 —— 贝壳和石头各自都挂着一块 44px 的可点范围，
   390 窄屏上西岸街区只有几十像素宽（60 上下），两块热区并排放不下，
   必须把它们顶到街区两头才分得开；挤在一处就等于误触。
   （可点范围可以比图形大，所以贝壳本身仍然不必画到 40px。） */
.knowledge-island__shell {
  left: 96%;
  bottom: 6%;
  width: calc(var(--ki-u) * 15 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 13 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -7.5) * var(--ki-unit, 1));
  border: calc(var(--ki-u) * 1.1) solid rgba(201, 118, 74, 0.85);
  border-radius: 50% 50% 26% 26% / 88% 88% 30% 30%;
  background: linear-gradient(180deg, #fff3e0 0%, #fbcf9f 58%, #f0a878 100%);
  box-shadow:
    inset 0 calc(var(--ki-u) * -1.2) 0 rgba(214, 122, 76, 0.45),
    0 calc(var(--ki-u) * 1.5) calc(var(--ki-u) * 3) calc(var(--ki-u) * -1.6) rgba(150, 86, 52, 0.45);
  transform: rotate(-16deg);
}

/* 壳肋：圆锥渐变从正下方（壳脐）往上发散，隔一条深色。 */
.knowledge-island__shell::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: repeating-conic-gradient(
    from 118deg at 50% 100%,
    rgba(201, 118, 74, 0.38) 0deg 3.6deg,
    rgba(255, 255, 255, 0) 3.6deg 13deg
  );
}

/* 壳脐：底边正中一颗小圆点，是扇贝转轴的位置，也让"这是壳"更确定。 */
.knowledge-island__shell::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(var(--ki-u) * -0.6);
  width: calc(var(--ki-u) * 4.2);
  height: calc(var(--ki-u) * 3);
  margin-left: calc(var(--ki-u) * -2.1);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: linear-gradient(180deg, #e39a68 0%, #c9713f 100%);
}

.knowledge-island__shell--lush-a {
  left: 30%;
  bottom: 48%;
  opacity: 0.92;
  transform: rotate(14deg) scale(0.86);
}

.knowledge-island__shell--lush-b {
  left: 62%;
  bottom: 30%;
  opacity: 0.84;
  transform: rotate(-30deg) scale(0.76);
}

.knowledge-island__shell--flourishing {
  left: 46%;
  bottom: 80%;
  opacity: 0.9;
  transform: rotate(24deg) scale(0.8);
}

/* ---------- 石头 ----------
   刻意分成两种，长得不一样才叫"石头"：
     - 圆石（--main）：一块圆润的大卵石，卧在沙上，脚下压一圈湿沙；
     - 礁石（--lush / --flourishing）：棱角分明的暗色礁岩，顶上带一小撮海草，
       形状用 clip-path 切出尖角，和圆石的圆弧轮廓一眼能分开。 */
.knowledge-island__rock--main {
  left: 4%;
  bottom: 8%;
  width: calc(var(--ki-u) * 21 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 15 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -10.5) * var(--ki-unit, 1));
  border-radius: 52% 48% 44% 56% / 64% 62% 38% 36%;
  background: linear-gradient(148deg, #9db0b1 0%, #71868a 50%, #4c6369 100%);
  box-shadow:
    inset calc(var(--ki-u) * 2.6) calc(var(--ki-u) * 2.4) 0 rgba(255, 255, 255, 0.62),
    inset calc(var(--ki-u) * -2.2) calc(var(--ki-u) * -1.8) 0 rgba(44, 70, 78, 0.5),
    0 calc(var(--ki-u) * 4) calc(var(--ki-u) * 7) calc(var(--ki-u) * -6) rgba(38, 76, 86, 0.75);
  transform: rotate(-9deg);
}

/* 圆石脚下那圈被浪打湿的沙：没有它，石头会像浮在沙滩上。 */
.knowledge-island__rock--main::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(var(--ki-u) * -2.4);
  width: 118%;
  height: 42%;
  margin-left: -59%;
  border-radius: 50%;
  background: rgba(214, 178, 118, 0.75);
}

/* 礁石：尖角 + 亮顶暗底 + 顶上一撮海草，和圆石完全不是一个轮廓。 */
.knowledge-island__rock--lush {
  left: 34%;
  bottom: 46%;
  width: calc(var(--ki-u) * 19 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 20 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -9.5) * var(--ki-unit, 1));
  clip-path: polygon(4% 100%, 0% 44%, 20% 10%, 50% 0%, 78% 16%, 100% 50%, 96% 100%);
  /* 礁石不能画成一团黑影：上亮下暗 + 一道明显的亮面，
     远看才是一块有棱角的石头，而不是地上的影子。 */
  background: linear-gradient(168deg, #d3dcdd 0%, #a3b2b6 30%, #6f868d 68%, #4a646e 100%);
  filter: drop-shadow(0 calc(var(--ki-u) * 2) calc(var(--ki-u) * 3) calc(var(--ki-u) * -2) rgba(38, 76, 86, 0.7));
}

.knowledge-island__rock--lush::after {
  content: "";
  position: absolute;
  left: 32%;
  top: calc(var(--ki-u) * -1.8);
  width: 36%;
  height: 32%;
  border-radius: 60% 20% 60% 20%;
  background: linear-gradient(180deg, #7cc86e 0%, #3d8a4a 100%);
  transform: rotate(-16deg);
}

.knowledge-island__rock--flourishing {
  left: 72%;
  bottom: 58%;
  width: calc(var(--ki-u) * 12 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 9 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -6) * var(--ki-unit, 1));
  /* 第二块礁石：比第一块更瘦更斜，两块礁石不重样。 */
  clip-path: polygon(10% 100%, 4% 40%, 30% 4%, 62% 10%, 96% 44%, 88% 100%);
  background: linear-gradient(150deg, #cdd7d9 0%, #9babb0 34%, #657d86 72%, #465f69 100%);
  filter: drop-shadow(0 calc(var(--ki-u) * 2) calc(var(--ki-u) * 3) calc(var(--ki-u) * -2) rgba(38, 76, 86, 0.65));
  transform: rotate(-14deg);
  opacity: 0.95;
}

/* ---------- 中央绿地：嫩芽 / 草丛 / 花 ---------- */
/* 阶段专属生命感之一：萌芽海岸之后，嫩芽与草丛轻轻摆一下。
   摆的是整个容器（容器本身没有基础 transform，所以不会顶掉叶子自己的角度），
   支点放在底部，幅度只有 ±1.4° × 繁荣度系数——是"有风"，不是"被吹"。 */
.knowledge-island__sprout {
  left: 26%;
  bottom: 6%;
  width: calc(var(--ki-u) * 24 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 31 * var(--ki-unit, 1));
  transform-origin: bottom center;
  animation: knowledge-island-sway var(--ki-ambient-sway) ease-in-out infinite alternate;
}

@keyframes knowledge-island-sway {
  from {
    transform: rotate(calc(-1.4deg * var(--ki-ambient-amp)));
  }

  to {
    transform: rotate(calc(1.4deg * var(--ki-ambient-amp)));
  }
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
  transform-origin: bottom center;
  /* 和嫩芽同一段动画，但方向与节奏错开一点，两丛草不会同步摆。 */
  animation: knowledge-island-sway calc(var(--ki-ambient-sway) * 1.24) ease-in-out infinite alternate-reverse;
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
  /* 阶段专属生命感之二：探险码头之后，小船轻轻摇一下。
     支点放在船身中下方，位移 ±0.7、倾角 ±0.9°，都是设计单位级的小数，
     所以它始终停在码头的位置附近，不会漂出港口街区。 */
  transform-origin: 50% 88%;
  animation: knowledge-island-boat-bob var(--ki-ambient-bob) ease-in-out infinite alternate;
}

@keyframes knowledge-island-boat-bob {
  from {
    transform: translateY(calc(var(--ki-u) * 0.7 * var(--ki-ambient-amp)))
      rotate(calc(-0.9deg * var(--ki-ambient-amp)));
  }

  to {
    transform: translateY(calc(var(--ki-u) * -0.7 * var(--ki-ambient-amp)))
      rotate(calc(0.9deg * var(--ki-ambient-amp)));
  }
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
  /* 阶段专属生命感之三：知识灯塔之后，光束除了缓慢明暗呼吸，还非常缓慢地左右扫一下。
     两条动画动的是不同属性（一条 opacity、一条 transform），互不覆盖。
     支点钉在灯塔的窗口上（left center），所以扫的是光束自己，光的起点始终不动。 */
  transform-origin: left center;
  animation:
    knowledge-island-beam var(--ki-ambient-beam) ease-in-out infinite,
    knowledge-island-beam-sweep calc(var(--ki-ambient-beam) * 1.6) ease-in-out infinite alternate;
  z-index: -1;
}

@keyframes knowledge-island-beam-sweep {
  from {
    transform: rotate(calc(-2.2deg * var(--ki-ambient-amp)));
  }

  to {
    transform: rotate(calc(2.2deg * var(--ki-ambient-amp)));
  }
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

   hero 额外加了一条上限：桌面端不再让画面铺满整屏。
   画面盒仍是 16:9、仍按 100% 宽缩放，只是整张卡片封顶并居中，
   于是宽屏上画面稳定在约 1020 × 575，下面的成长信息能露出来一截；
   窄屏（820 / 390）因为卡片本来就比上限窄，仍然是接近满宽的整幅画面。
   =========================================================================== */
.knowledge-island--hero {
  gap: 0;
  padding: 10px 12px 12px;
  border-radius: 26px;
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

/* ===========================================================================
   轻互动层
   ---------------------------------------------------------------------------
   画面本身是 role="img"（一整幅插画），所以可点的按钮不能画在里面——
   role=img 的子树对读屏软件是纯展示的。这一层是画面盒里的兄弟节点，
   透明按钮按锚点元素量出来的百分比盖在对应东西上。

   几条硬约束都写在这里，改的时候别破坏：
     1) 整层 pointer-events: none，只有按钮 auto —— 不会挡住卡片里的其它东西；
     2) 每一层 z-index 都压在画面元素之上，但按钮之间按"小 → 大"排，
        所以点贝壳不会先被海面接走；
     3) 小热点用 min-width / min-height 撑到 44px 左右的可点范围，
        但盒子仍以锚点为中心，所以既不误触、也不和邻居打架；
     4) 动画都由 .knowledge-island__hotspot--on 触发，1.1 秒后由脚本摘掉。
   =========================================================================== */
.knowledge-island__hotspots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.knowledge-island__hotspot {
  position: absolute;
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  pointer-events: auto;
  -webkit-appearance: none;
  appearance: none;
  transform: translate(-50%, -50%);
  transition:
    transform 180ms ease,
    filter 180ms ease;
}

.knowledge-island__hotspot:focus-visible {
  outline: 3px solid rgba(255, 141, 74, 0.95);
  outline-offset: 3px;
  border-radius: 14px;
}

/* 预告那枚小牌本身是胶囊，聚焦时不要被上面的通用圆角改成方块。 */
.knowledge-island__hotspot--next:focus-visible {
  border-radius: 999px;
}

/* 海面垫底：它是最大的一块，点在没被别的东西接住的位置就是点到了水。 */
.knowledge-island__hotspot--sea {
  z-index: 1;
  transform: none;
}

/* 下一阶段预告不是一块盖住整座岛的隐形热区 —— 那样点椰子树也会弹出"还差几枚"。
   它是一枚看得见的小牌子，钉在虚线轮廓最清楚的那一段上。 */
.knowledge-island__hotspot--next {
  z-index: 4;
  width: 0;
  height: 0;
  padding: 5px 11px;
  border: 1.5px solid rgba(150, 106, 24, 0.34);
  border-radius: 999px;
  /* 暖白小牌：压在蓝色海面和白色虚线上都读得清，
     一眼就知道"这里可以点，点它告诉我还差多少"。 */
  background: rgba(255, 249, 228, 0.96);
  box-shadow: 0 8px 16px -12px rgba(10, 40, 60, 0.9);
  color: #8a5a00;
  white-space: nowrap;
}

.knowledge-island__hotspot--next:hover {
  background: #fff6da;
}

.knowledge-island__hotspot--next.knowledge-island__hotspot--on {
  border-color: rgba(150, 106, 24, 0.7);
  background: #fff2cc;
}

.knowledge-island__hotspot-chip {
  display: block;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.3;
}

.knowledge-island__hotspot--shell,
.knowledge-island__hotspot--rock,
.knowledge-island__hotspot--gull {
  z-index: 3;
  /* 触屏友好：把小小的贝壳 / 石头 / 海鸥撑成一块好点的小方块，
     但仍然以元素本身为中心，所以不会伸到旁边的元素上去。
     热区可以比图形大 —— 贝壳在 390 上只有十几像素，可点范围必须是 44px 才够手指点。
     分开放不下的问题靠「圆石靠左、贝壳靠右」这件视觉布局来解决，
     不在这里把可点范围越缩越小。 */
  min-width: 44px;
  min-height: 44px;
}

/* 悬停 / 按下只给一点点回弹，提示"这里可以点"，不做持续动画。 */
.knowledge-island__hotspot--shell:hover,
.knowledge-island__hotspot--rock:hover,
.knowledge-island__hotspot--gull:hover {
  transform: translate(-50%, -50%) scale(1.06);
}

.knowledge-island__hotspot--shell:active,
.knowledge-island__hotspot--rock:active,
.knowledge-island__hotspot--gull:active {
  transform: translate(-50%, -50%) scale(0.96);
}

/* --- 被点到的瞬间：画面上真正动起来的是元素自己，不是这块透明按钮 ---
   触发方式是根节点上的 .knowledge-island--active-<热点 id>，
   因为画面（role=img）和热点按钮是兄弟节点，CSS 兄弟选择器跨不过去。 */

/* 贝壳：轻轻弹一下。 */
.knowledge-island--active-shell .knowledge-island__shell--main {
  animation: knowledge-island-shell-bounce 720ms ease;
}

/* 石头：晃一下，脚下溅一点水。 */
.knowledge-island--active-rock .knowledge-island__rock--main {
  animation: knowledge-island-rock-wobble 720ms ease;
}

.knowledge-island__rock-splash {
  position: absolute;
  left: 50%;
  bottom: 4%;
  width: calc(var(--ki-u) * 20);
  height: calc(var(--ki-u) * 7);
  margin-left: calc(var(--ki-u) * -10);
  border: calc(var(--ki-u) * 1.4) solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 12;
}

.knowledge-island--active-rock .knowledge-island__rock-splash {
  animation: knowledge-island-rock-splash 720ms ease-out;
}

/* 海鸥：短距离飞一段再回来，不做连续飞行动画。 */
.knowledge-island--active-gull .knowledge-island__gull--a {
  animation: knowledge-island-gull-glide 900ms ease;
}

/* 涟漪：点在哪儿就在哪儿荡一圈。 */
.knowledge-island__ripple {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  pointer-events: none;
  animation: knowledge-island-ripple 1100ms ease-out forwards;
}

/* 预告轮廓：点一下虚线加粗一档。
   这里刻意不叠第二个动画——那条虚线本来就在缓慢呼吸，
   两个 animation 叠在一起会互相顶掉；加粗描边是静态状态，
   减少动态偏好下也照样看得见「我点到它了」。 */
.knowledge-island__next-terrain--tapped .knowledge-island__next-outline {
  stroke-width: 2.6;
  stroke: rgba(255, 255, 255, 0.98);
}

.knowledge-island__next-terrain--tapped .knowledge-island__next-fill {
  fill: rgba(255, 255, 255, 0.3);
}

/* 回话气泡：贴在画面下沿，不遮岛上的东西。 */
.knowledge-island__hint {
  position: absolute;
  left: 50%;
  bottom: calc(2.5% + 6px);
  z-index: 30;
  max-width: min(86%, 420px);
  margin: 0;
  padding: 9px 16px;
  border: 1.5px solid rgba(255, 255, 255, 0.86);
  border-radius: 999px;
  background: rgba(24, 62, 84, 0.86);
  box-shadow: 0 12px 24px -18px rgba(10, 40, 60, 0.9);
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.4;
  text-align: center;
  transform: translateX(-50%);
  animation: knowledge-island-hint-in 220ms ease;
  pointer-events: none;
}

@keyframes knowledge-island-shell-bounce {
  0% {
    transform: rotate(0deg) translateY(0);
  }
  35% {
    transform: rotate(9deg) translateY(calc(var(--ki-u) * -3));
  }
  70% {
    transform: rotate(-5deg) translateY(0);
  }
  100% {
    transform: rotate(0deg) translateY(0);
  }
}

@keyframes knowledge-island-rock-wobble {
  0% {
    transform: rotate(0deg);
  }
  30% {
    transform: rotate(-7deg) translateX(calc(var(--ki-u) * -0.8));
  }
  65% {
    transform: rotate(5deg) translateX(calc(var(--ki-u) * 0.6));
  }
  100% {
    transform: rotate(0deg);
  }
}

@keyframes knowledge-island-rock-splash {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  30% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes knowledge-island-gull-glide {
  0% {
    transform: translate(0, 0);
  }
  40% {
    transform: translate(calc(var(--ki-u) * -9), calc(var(--ki-u) * -4));
  }
  75% {
    transform: translate(calc(var(--ki-u) * 7), calc(var(--ki-u) * 2));
  }
  100% {
    transform: translate(0, 0);
  }
}

@keyframes knowledge-island-ripple {
  0% {
    opacity: 0.85;
    transform: scale(0.35);
  }
  100% {
    opacity: 0;
    transform: scale(7);
  }
}

@keyframes knowledge-island-hint-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 繁荣度只轻微影响互动的手感：基础档就是轻轻动一下，
   丰盛 / 繁荣档多一圈光效，看着更"有生活气"。
   它不改变任何阶段、印章或星星，只影响这几秒的动画。 */
.knowledge-island--prosperity-lush .knowledge-island__hotspot--shell.knowledge-island__hotspot--on,
.knowledge-island--prosperity-flourishing .knowledge-island__hotspot--shell.knowledge-island__hotspot--on {
  box-shadow: 0 0 0 6px rgba(255, 214, 140, 0.35);
}

.knowledge-island--prosperity-flourishing .knowledge-island__hotspot--gull.knowledge-island__hotspot--on {
  box-shadow: 0 0 0 6px rgba(198, 141, 26, 0.28);
}


/* 动效全部是可关的：减少动态偏好下不呼吸、不冒烟、不闪灯。 */
@media (prefers-reduced-motion: reduce) {
  .knowledge-island__beam,
  .knowledge-island__surf-line,
  .knowledge-island__camp-smoke,
  .knowledge-island__next-terrain {
    animation: none;
  }

  /* ---- 环境生命感：减少动态下全部关掉 ----
     这一组是"自己微动"的环境层（海、云、掠过的海鸥、光晕、灯塔光束）
     以及极轻的静物摆动（嫩芽 / 草丛 / 小船）。
     它们没有交互反馈要表达，所以直接停掉不会损失任何信息：
     画面仍然是完整的一幅画，只是静止。 */
  .knowledge-island__surf,
  .knowledge-island__sun::after,
  .knowledge-island__cloud,
  .knowledge-island__gull--flyby,
  .knowledge-island__sprout,
  .knowledge-island__grass,
  .knowledge-island__boat {
    animation: none;
  }

  /* 太阳光晕关掉动画后不能淡到没有：给一个稳定的静态强度。 */
  .knowledge-island__sun::after {
    opacity: 0.46;
  }

  /* 光束同理：原来是在 0.42～0.84 之间呼吸，
     直接关掉动画会让它变成常亮的 1，反而比有动画时更抢眼。 */
  .knowledge-island__beam {
    opacity: 0.6;
  }

  /* 关掉动画后，预告轮廓不能淡到看不见：给一个稳定的静态强度。 */
  .knowledge-island__next-terrain {
    opacity: 0.78;
  }

  .knowledge-island__fill {
    transition: none;
  }

  /* ---- 轻互动在减少动态下同样可用，只是不再晃 ----
     反馈不能只剩动画：热点本身会亮起一圈静态描边，
     回话气泡照常出现，所以「点了有反应」这件事一点没少。 */
  .knowledge-island--active-shell .knowledge-island__shell--main,
  .knowledge-island--active-rock .knowledge-island__rock--main,
  .knowledge-island--active-rock .knowledge-island__rock-splash,
  .knowledge-island--active-gull .knowledge-island__gull--a,
  .knowledge-island__ripple,
  .knowledge-island__next-terrain,
  .knowledge-island__hint {
    animation: none;
  }

  .knowledge-island__hotspot {
    transition: none;
  }

  /* 只把小热点（贝壳 / 石头 / 海鸥）的悬停回弹关掉。
     绝不能写成 .knowledge-island__hotspot:hover —— 海面热点平时是
     transform: none（它按左上角定位），一旦被通用的居中 transform 接管，
     鼠标移上去它就会整体错位，点击落到别处去，海面就点不响了。 */
  .knowledge-island__hotspot--shell:hover,
  .knowledge-island__hotspot--rock:hover,
  .knowledge-island__hotspot--gull:hover,
  .knowledge-island__hotspot--shell:active,
  .knowledge-island__hotspot--rock:active,
  .knowledge-island__hotspot--gull:active {
    transform: translate(-50%, -50%);
  }

  /* 静态替代：被点到的热点亮起一圈描边，不做任何位移。 */
  .knowledge-island__hotspot--on {
    outline: 3px solid rgba(255, 141, 74, 0.95);
    outline-offset: 2px;
  }

  /* 涟漪在减少动态下缩成一个小圈慢慢淡出：仍然看得见"水面动了一下"。 */
  .knowledge-island--active-sea .knowledge-island__hotspot--sea {
    background: radial-gradient(circle, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 70%);
  }
}
</style>
