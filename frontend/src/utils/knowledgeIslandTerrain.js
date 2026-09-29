// 知识岛地形：只回答「这座岛长什么样」，不回答「这座岛算第几阶段」。
//
// 分工（这一层最重要的边界，改动时务必保留）：
//   - 阶段顺序、阶段阈值、当前阶段 / 下一阶段，仍然只有 knowledgeIslandGrowth 一个来源。
//     本文件里没有 0 / 3 / 7 / 15 / 30，也没有任何 threshold 字段。
//   - 入口只接受「已经算好的 stageId」，不读印章数、不读星星数。
//     阶段是从 knowledgeIslandGrowth 拿到的 id 直接查表，不在这里重新判定。
//   - 星星（繁荣度）完全不进来：地形与「这一阶段长什么样」有关，
//     与「这些已有的东西有多丰富」无关，那是 knowledgeIslandProsperity 的事。
//
// 所以本文件是纯数据 + 纯函数：
//   - KNOWLEDGE_ISLAND_ZONES  ：岛上的「街区」，所有阶段共用同一套归一化坐标；
//   - KNOWLEDGE_ISLAND_TERRAINS：每个阶段的岛身占地、岸线形状、绿地形状、高地形状、元素尺寸倍率。
//
// 为什么街区坐标是「岛屿自身」的归一化坐标（0~1），而不是画布坐标（px / %）：
//   画布坐标一旦写死，岛屿长大的瞬间所有东西都会漂到岛外面去。
//   归一化坐标 + 「整块岛身盒子」意味着：岛屿变大时，每个街区跟着岛一起长大和移动，
//   贝壳永远在贝壳该在的位置，码头永远贴着东岸，灯塔永远站在高地上。
//   这也是这一轮「建筑相对岛屿区域定位」的全部实现方式。

// ---------------------------------------------------------------------------
// 岛上的街区（区域）
//
// 五个街区是岛屿本身的地理，和阶段无关，所以只有一份，所有阶段共用：
//   west-shore 西侧海岸 —— 贝壳 / 石头 / 岸线浪花
//   green     中央绿地 —— 嫩芽 / 草丛 / 花
//   camp      营地区   —— 椰树 / 帐篷 / 营火
//   harbor    东侧港口 —— 码头 / 小船 / 渔网 / 挂灯
//   highland  高地区   —— 灯塔（只出现在有这个高地的阶段）
//
// 坐标含义：x = 街区中心在岛身盒子里从左往右的比例；
//           y = 街区底边在岛身盒子里从下往上的比例（也就是「站在多高的地上」）。
// 它们刻意与阶段无关：阶段决定岛有多大，但岛上的街区不会因为岛长大而搬家。
// ---------------------------------------------------------------------------
// 键就是街区 id（kebab-case），因为 id 才是对外的稳定契约：组件按 id 取，测试也按 id 遍历。
export const KNOWLEDGE_ISLAND_ZONES = Object.freeze({
  "west-shore": Object.freeze({
    id: "west-shore",
    label: "西侧海岸",
    x: 0.22,
    y: 0.26,
    w: 0.3,
    h: 0.26
  }),
  green: Object.freeze({
    id: "green",
    label: "中央绿地",
    x: 0.3,
    y: 0.3,
    w: 0.22,
    h: 0.36
  }),
  camp: Object.freeze({
    id: "camp",
    label: "营地区",
    x: 0.5,
    y: 0.34,
    w: 0.22,
    h: 0.44
  }),
  harbor: Object.freeze({
    id: "harbor",
    label: "东侧港口",
    x: 0.78,
    y: 0.32,
    w: 0.3,
    h: 0.24
  }),
  highland: Object.freeze({
    id: "highland",
    label: "高地区",
    x: 0.76,
    y: 0.6,
    w: 0.13,
    h: 0.3
  })
});

// 唯一一份「街区 id」清单，用途只有两个：给组件渲染用、给测试遍历用。
// 它是地图上的地点，不是成长顺序，所以这里不存在「下一个街区」这种概念。
export const KNOWLEDGE_ISLAND_ZONE_IDS = Object.freeze([
  "west-shore",
  "green",
  "camp",
  "harbor",
  "highland"
]);

// ---------------------------------------------------------------------------
// 每个阶段的岛身
//
// footprint：岛身盒子在「世界坐标」里的占地。
//   世界坐标是一个固定 400 × 225 的画布（16:9），compact 与 hero 共用同一套坐标，
//   只是整块缩放比例不同（见 KnowledgeIslandGrowth.vue 的 .knowledge-island__stage）。
//   left / bottom / width / height 全部是这个画布上的百分比。
//   五个阶段的面积单调递增：30×25 → 44×31 → 56×36 → 66×40 → 76×43，
//   面积比约 1 : 1.82 : 2.69 : 3.52 : 4.36，一眼能看出岛在长大。
//   岛整体向右（东侧）扩张，所以西岸的位置相对稳定，变化集中在东边；
//   东岸刻意留出一片水面给码头和小船，不让最大阶段的岛把港口挤出画布。
//
// unit：这一阶段岛上建筑 / 细节的尺寸倍率。
//   它只是「岛大了以后东西看起来不至于太小」的微调，不参与任何解锁判定。
//
// ground / grass / relief：岸线形状。
//   形状点用 0~100 的相对坐标（x 从左、y 从上），画在岛身盒子内部。
//   grass 为 null = 这一阶段岛上没有绿地（0 枚时必须是 null，测试钉住了这一点）。
//   relief 为 null = 这一阶段岛上没有高地。
// ---------------------------------------------------------------------------
const freezeShape = (points) => Object.freeze(points.map((point) => Object.freeze(point)));

export const KNOWLEDGE_ISLAND_TERRAINS = Object.freeze({
  // 初见小岛：30% 左右的小沙洲，只有沙，一根草都没有。
  "first-sight": Object.freeze({
    id: "first-sight",
    footprint: Object.freeze({ left: 30, bottom: 19, width: 30, height: 25 }),
    unit: 0.72,
    ground: freezeShape([
      [2, 60], [7, 45], [16, 33], [29, 24], [43, 20], [57, 21], [70, 26],
      [82, 35], [93, 46], [98, 60], [92, 71], [79, 78], [63, 82], [47, 82],
      [33, 78], [20, 72], [9, 66]
    ]),
    // 0 枚 = 明显的小沙洲：这里必须是 null，画布上不许有任何绿色。
    grass: null,
    relief: null
  }),

  // 萌芽海岸：46% 左右，面积接近翻倍，中央冒出第一片绿地。
  "sprout-coast": Object.freeze({
    id: "sprout-coast",
    footprint: Object.freeze({ left: 26, bottom: 18, width: 44, height: 31 }),
    unit: 0.84,
    ground: freezeShape([
      [1, 58], [5, 42], [13, 29], [25, 20], [38, 15], [50, 14], [60, 18],
      [68, 24], [76, 21], [85, 26], [94, 36], [99, 50], [96, 63], [88, 72],
      [76, 79], [63, 82], [50, 86], [37, 82], [25, 76], [14, 70], [5, 64]
    ]),
    // 第一片绿地：很小，只在中央偏左。
    grass: freezeShape([
      [15, 60], [20, 48], [29, 41], [38, 40], [45, 48], [43, 58],
      [34, 64], [24, 65], [18, 63]
    ]),
    relief: null
  }),

  // 椰林营地：59% 左右，绿地连成片，营地区成形。
  "palm-camp": Object.freeze({
    id: "palm-camp",
    footprint: Object.freeze({ left: 22, bottom: 17, width: 56, height: 36 }),
    unit: 0.94,
    ground: freezeShape([
      [1, 60], [4, 42], [11, 28], [22, 19], [34, 13], [47, 11], [58, 15],
      [66, 22], [74, 19], [83, 24], [92, 33], [99, 47], [98, 60], [90, 70],
      [78, 77], [66, 80], [55, 84], [43, 88], [31, 84], [20, 77], [11, 70], [4, 66]
    ]),
    grass: freezeShape([
      [8, 58], [14, 43], [26, 35], [40, 33], [52, 36], [60, 44],
      [62, 55], [55, 64], [43, 69], [30, 68], [18, 65], [11, 62]
    ]),
    relief: null
  }),

  // 探险码头：70% 左右，东侧海岸伸出一条岬角，把港口位置让出来。
  "explorer-dock": Object.freeze({
    id: "explorer-dock",
    footprint: Object.freeze({ left: 17, bottom: 16, width: 66, height: 40 }),
    unit: 1,
    ground: freezeShape([
      [1, 61], [4, 42], [11, 27], [22, 18], [35, 12], [47, 10], [58, 14],
      [66, 21], [73, 18], [80, 23], [87, 27], [96, 33], [99, 43], [94, 50],
      [99, 58], [95, 70], [85, 77], [72, 80], [60, 83], [49, 88], [37, 85],
      [25, 78], [14, 71], [4, 66]
    ]),
    grass: freezeShape([
      [6, 57], [12, 41], [24, 32], [38, 29], [52, 32], [63, 38],
      [71, 48], [70, 58], [61, 66], [47, 70], [33, 69], [20, 66], [10, 63]
    ]),
    relief: null
  }),

  // 知识灯塔：81% 左右，最终完整岛形，中央偏东隆起一块高地。
  "knowledge-lighthouse": Object.freeze({
    id: "knowledge-lighthouse",
    footprint: Object.freeze({ left: 11, bottom: 15, width: 76, height: 43 }),
    unit: 1.06,
    ground: freezeShape([
      [1, 62], [3, 42], [9, 27], [18, 18], [29, 12], [41, 9], [52, 10],
      [60, 15], [68, 13], [76, 18], [85, 21], [95, 29], [99, 40], [95, 50],
      [99, 60], [93, 71], [82, 78], [69, 81], [57, 84], [46, 90], [34, 86],
      [23, 79], [12, 72], [3, 67]
    ]),
    grass: freezeShape([
      [5, 56], [10, 39], [22, 29], [37, 25], [52, 27], [64, 32],
      [74, 40], [78, 50], [74, 60], [64, 68], [49, 73], [34, 72], [20, 68], [9, 63]
    ]),
    // 高地：灯塔的地基，只在这一阶段存在。
    // 形状要盖住灯塔的落点（街区 highland 的 x = 0.76 / y = 0.60，落在形状 x ≈ 76 / y ≈ 40），
    // 否则灯塔会站在土台边缘之外，看起来像浮在半空。
    relief: freezeShape([
      [58, 70], [62, 56], [68, 42], [76, 33], [84, 42], [90, 56], [94, 70], [84, 78], [68, 78]
    ])
  })
});

// 未知 / 脏 stageId 时的兜底：画最小的一块沙洲。
// 这里是「最朴素的样子」，不是「第 0 阶段」——本文件不表达任何阶段顺序。
export const KNOWLEDGE_ISLAND_TERRAIN_FALLBACK_ID = "first-sight";

// 与展示层（knowledgeIslandGrowth / prosperity）同一套容错口径：
// 非法输入不抛错，退化成兜底地形。
export function getKnowledgeIslandTerrain(stageId) {
  const normalizedStageId = String(stageId ?? "").trim();
  const terrain = KNOWLEDGE_ISLAND_TERRAINS[normalizedStageId];

  return terrain || KNOWLEDGE_ISLAND_TERRAINS[KNOWLEDGE_ISLAND_TERRAIN_FALLBACK_ID];
}

export function getKnowledgeIslandZone(zoneId) {
  const normalizedZoneId = String(zoneId ?? "").trim();

  return KNOWLEDGE_ISLAND_ZONES[normalizedZoneId] || null;
}

// 岛身盒子的行内样式：位置与尺寸完全来自地形表，组件里不写任何岛屿尺寸。
// --ki-unit 一起下发，岛上每个建筑 / 细节的 px 尺寸都乘它，
// 所以「岛变大 + 东西略微变大」是一起生效的，不存在两处各调一次。
export function buildTerrainFootprintStyle(terrain) {
  const footprint = terrain?.footprint ?? {};
  const safeWidth = Number(footprint.width) || 0;
  const safeHeight = Number(footprint.height) || 0;
  const safeUnit = Number(terrain?.unit);

  return {
    left: `${Number(footprint.left) || 0}%`,
    bottom: `${Number(footprint.bottom) || 0}%`,
    width: `${safeWidth}%`,
    height: `${safeHeight}%`,
    "--ki-unit": Number.isFinite(safeUnit) && safeUnit > 0 ? String(safeUnit) : "1"
  };
}

// 街区盒子的行内样式：x / y / w / h 来自 KNOWLEDGE_ISLAND_ZONES（与阶段无关）。
export function buildZoneStyle(zone) {
  if (!zone) {
    return {};
  }

  return {
    left: `${(Number(zone.x) || 0) * 100}%`,
    bottom: `${(Number(zone.y) || 0) * 100}%`,
    width: `${(Number(zone.w) || 0) * 100}%`,
    height: `${(Number(zone.h) || 0) * 100}%`
  };
}

// 形状点 → CSS clip-path（百分比，元素自己有多大就占多大）。
// shape 为 null（这一阶段没有绿地 / 高地）时返回空字符串，调用方据此不渲染该层。
export function buildTerrainClipPath(shape) {
  if (!Array.isArray(shape) || shape.length < 3) {
    return "";
  }

  const points = shape
    .map((point) => `${(Number(point?.[0]) || 0)}% ${(Number(point?.[1]) || 0)}%`)
    .join(", ");

  return `polygon(${points})`;
}

// 形状点 → SVG points 属性（0~100 的 viewBox 里直接可用）。
// 下一阶段的虚线轮廓要用它，所以和 clip-path 共用同一份点，不会画出另一条岸线。
export function buildTerrainSvgPoints(shape) {
  if (!Array.isArray(shape) || shape.length < 3) {
    return "";
  }

  return shape.map((point) => `${Number(point?.[0]) || 0},${Number(point?.[1]) || 0}`).join(" ");
}

// ---------------------------------------------------------------------------
// 下一阶段预告
//
// 「下一阶段」这件事仍然只有 knowledgeIslandGrowth 知道：
// 它已经把 nextStage 算好并放在 island.nextStage 上（满级时是 null）。
// 本函数只做一次「按 nextStage.id 查地形表」，然后把那条更宽的岸线交给组件画虚线。
// 所以预告永远只指向紧邻的那一个阶段，不会跳级，也没有任何阈值判断。
// ---------------------------------------------------------------------------
export function buildKnowledgeIslandNextTerrainPreview(island) {
  const nextStageId = island?.nextStage?.id;

  // 满级：nextStage 为 null / 缺字段 / 查不到地形 → 什么都不预告。
  if (!nextStageId) {
    return null;
  }

  const terrain = KNOWLEDGE_ISLAND_TERRAINS[String(nextStageId).trim()];

  if (!terrain) {
    return null;
  }

  return {
    stageId: terrain.id,
    footprintStyle: buildTerrainFootprintStyle(terrain),
    points: buildTerrainSvgPoints(terrain.ground)
  };
}
