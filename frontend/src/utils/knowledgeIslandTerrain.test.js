import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_ISLAND_TERRAIN_FALLBACK_ID,
  KNOWLEDGE_ISLAND_TERRAINS,
  KNOWLEDGE_ISLAND_ZONE_IDS,
  KNOWLEDGE_ISLAND_ZONES,
  buildKnowledgeIslandNextTerrainPreview,
  buildTerrainClipPath,
  buildTerrainFootprintStyle,
  buildTerrainSvgPoints,
  buildZoneStyle,
  getKnowledgeIslandTerrain,
  getKnowledgeIslandZone
} from "./knowledgeIslandTerrain.js";
import { KNOWLEDGE_ISLAND_STAGES, buildKnowledgeIslandGrowth } from "./knowledgeIslandGrowth.js";

// 这一组测试守住本轮新增的「视觉分层」边界：
//   knowledgeIslandGrowth 决定「现在是第几阶段 / 下一阶段是谁」（唯一业务真相）；
//   knowledgeIslandTerrain 只决定「这一阶段长什么样」（纯视觉）。
// 两者最容易被破坏的地方是地形层偷偷长出第二套阶段顺序或阈值，所以这里逐条钉死。

// 阶段 id 顺序只在测试里写一次，且直接从 KNOWLEDGE_ISLAND_STAGES 派生，
// 地形模块自己绝不允许持有这份顺序。
const STAGE_IDS = KNOWLEDGE_ISLAND_STAGES.map((stage) => stage.id);

function footprintArea(terrain) {
  return terrain.footprint.width * terrain.footprint.height;
}

describe("knowledgeIslandTerrain · 阶段与地形一一对应", () => {
  it("每个阶段都有一份地形，没有多余也没有缺失", () => {
    expect(Object.keys(KNOWLEDGE_ISLAND_TERRAINS).sort()).toEqual([...STAGE_IDS].sort());
  });

  it("地形表里不出现任何阶段阈值或阶段顺序", () => {
    // 地形表只允许出现阶段 id；threshold / 名称 / 摘要这些业务字段都不许复制一份过来。
    for (const [stageId, terrain] of Object.entries(KNOWLEDGE_ISLAND_TERRAINS)) {
      expect(terrain.id).toBe(stageId);
      expect(terrain).not.toHaveProperty("threshold");
      expect(terrain).not.toHaveProperty("name");
      expect(terrain).not.toHaveProperty("features");
      expect(terrain).not.toHaveProperty("nextStage");
    }

    // 阶段顺序数组也不许在导出里出现（它是数组，地形表必须是按 id 索引的对象）。
    expect(Array.isArray(KNOWLEDGE_ISLAND_TERRAINS)).toBe(false);
  });

  it("getKnowledgeIslandTerrain 对未知 / 脏 id 安全退化成最小沙洲", () => {
    const fallback = KNOWLEDGE_ISLAND_TERRAINS[KNOWLEDGE_ISLAND_TERRAIN_FALLBACK_ID];

    expect(getKnowledgeIslandTerrain("first-sight")).toBe(fallback);
    expect(getKnowledgeIslandTerrain("not-a-stage")).toBe(fallback);
    expect(getKnowledgeIslandTerrain("")).toBe(fallback);
    expect(getKnowledgeIslandTerrain(null)).toBe(fallback);
    expect(getKnowledgeIslandTerrain(undefined)).toBe(fallback);
    // 兜底就是最小的一块沙洲：0 枚那一档的占地。
    expect(getKnowledgeIslandTerrain(42).footprint).toEqual(fallback.footprint);
  });
});

describe("knowledgeIslandTerrain · 岛屿随阶段明显变大", () => {
  it("六个阶段的岛身面积严格递增", () => {
    const areas = STAGE_IDS.map((stageId) => footprintArea(getKnowledgeIslandTerrain(stageId)));

    for (let index = 1; index < areas.length; index += 1) {
      expect(
        areas[index],
        `${STAGE_IDS[index]} 的岛身面积没有比 ${STAGE_IDS[index - 1]} 大`
      ).toBeGreaterThan(areas[index - 1]);
    }
  });

  it("0 枚是明显的小沙洲，最高阶段至少是它的四倍", () => {
    const first = footprintArea(getKnowledgeIslandTerrain("first-sight"));
    const last = footprintArea(getKnowledgeIslandTerrain("knowledge-lighthouse"));

    // 宽度口径也对齐本轮定下的 30% / 44% / 56% / 66% / 71% / 76% 量级。
    expect(getKnowledgeIslandTerrain("first-sight").footprint.width).toBe(30);
    expect(getKnowledgeIslandTerrain("sprout-coast").footprint.width).toBe(44);
    expect(getKnowledgeIslandTerrain("palm-camp").footprint.width).toBe(56);
    expect(getKnowledgeIslandTerrain("explorer-dock").footprint.width).toBe(66);
    expect(getKnowledgeIslandTerrain("starwatch-hill").footprint.width).toBe(71);
    expect(getKnowledgeIslandTerrain("knowledge-lighthouse").footprint.width).toBe(76);

    // 「明显的小沙洲」：最大阶段至少 4 倍面积。
    expect(last / first).toBeGreaterThan(4);
  });

  it("每一阶段的岛身都在世界画布内，且不贴边", () => {
    for (const stageId of STAGE_IDS) {
      const { left, bottom, width, height } = getKnowledgeIslandTerrain(stageId).footprint;

      expect(left).toBeGreaterThan(0);
      expect(bottom).toBeGreaterThan(0);
      expect(left + width).toBeLessThan(100);
      expect(bottom + height).toBeLessThan(100);
    }
  });

  it("岛整体向东扩张：西岸不会一路往左跑", () => {
    const westEdges = STAGE_IDS.map((stageId) => getKnowledgeIslandTerrain(stageId).footprint.left);
    const eastEdges = STAGE_IDS.map(
      (stageId) => {
        const { left, width } = getKnowledgeIslandTerrain(stageId).footprint;

        return left + width;
      }
    );

    // 东岸持续向右推进（岛真的在长大）。
    for (let index = 1; index < eastEdges.length; index += 1) {
      expect(eastEdges[index]).toBeGreaterThan(eastEdges[index - 1]);
    }

    // 西岸只小幅左移，不出现「整座岛平移」这种看起来没长大的情况。
    expect(westEdges[0] - westEdges[westEdges.length - 1]).toBeLessThanOrEqual(24);
  });

  it("尺寸倍率是合法的正数，并且大体随阶段递增", () => {
    const units = STAGE_IDS.map((stageId) => getKnowledgeIslandTerrain(stageId).unit);

    units.forEach((unit) => {
      expect(unit).toBeGreaterThan(0);
      expect(unit).toBeLessThanOrEqual(1.5);
    });

    for (let index = 1; index < units.length; index += 1) {
      expect(units[index]).toBeGreaterThan(units[index - 1]);
    }
  });
});

describe("knowledgeIslandTerrain · 岸线 / 绿地 / 高地", () => {
  it("0 枚时没有任何绿地与高地", () => {
    const first = getKnowledgeIslandTerrain("first-sight");

    expect(first.grass).toBeNull();
    expect(first.relief).toBeNull();
  });

  it("绿地只出现在有草的阶段，且逐阶段变大", () => {
    const grassAreas = STAGE_IDS.map((stageId) => {
      const grass = getKnowledgeIslandTerrain(stageId).grass;

      return Array.isArray(grass) ? grass.length : 0;
    });

    // 第一阶段 0 个点（没有绿地），其余阶段都有。
    expect(grassAreas[0]).toBe(0);
    expect(grassAreas.slice(1).every((count) => count > 2)).toBe(true);

    // 绿地覆盖的盒子面积同样随岛屿递增。
    const greenAreas = STAGE_IDS.slice(1).map((stageId) => {
      const { width, height } = getKnowledgeIslandTerrain(stageId).footprint;

      return width * height;
    });

    for (let index = 1; index < greenAreas.length; index += 1) {
      expect(greenAreas[index]).toBeGreaterThan(greenAreas[index - 1]);
    }
  });

  it("高地从观星高台开始出现，一直留到灯塔阶段", () => {
    const withRelief = STAGE_IDS.filter((stageId) => getKnowledgeIslandTerrain(stageId).relief);

    expect(withRelief).toEqual(["starwatch-hill", "knowledge-lighthouse"]);
  });

  it("所有形状都是 0~100 的合法多边形点，clip-path 与 SVG 共用同一份点", () => {
    const shapes = [];

    for (const stageId of STAGE_IDS) {
      const terrain = getKnowledgeIslandTerrain(stageId);

      shapes.push(terrain.ground);
      shapes.push(terrain.grass, terrain.relief);
    }

    for (const shape of shapes) {
      if (shape === null) {
        continue;
      }

      expect(shape.length).toBeGreaterThanOrEqual(3);
      shape.forEach((point) => {
        expect(point).toHaveLength(2);
        point.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });

      // 同一份点既渲染成 CSS clip-path，也渲染成下一阶段的 SVG 虚线。
      expect(buildTerrainSvgPoints(shape).split(" ")).toHaveLength(shape.length);
      expect(buildTerrainClipPath(shape).startsWith("polygon(")).toBe(true);
    }
  });

  it("形状容错：空 / 非法形状不会生成半截 clip-path", () => {
    expect(buildTerrainClipPath(null)).toBe("");
    expect(buildTerrainClipPath([])).toBe("");
    expect(buildTerrainClipPath([[1, 2]])).toBe("");
    expect(buildTerrainSvgPoints(null)).toBe("");
    expect(buildTerrainSvgPoints(undefined)).toBe("");
  });
});

describe("knowledgeIslandTerrain · 街区（相对岛屿区域定位）", () => {
  it("五个街区都存在，且坐标全部落在岛屿盒子内", () => {
    expect(Object.keys(KNOWLEDGE_ISLAND_ZONES)).toHaveLength(KNOWLEDGE_ISLAND_ZONE_IDS.length);

    for (const zoneId of KNOWLEDGE_ISLAND_ZONE_IDS) {
      const zone = getKnowledgeIslandZone(zoneId);

      expect(zone, `缺少街区 ${zoneId}`).toBeTruthy();
      expect(zone.id).toBe(zoneId);
      // x 是中心，w 是宽度 → 左右都要落在 0~1。
      expect(zone.x - zone.w / 2).toBeGreaterThanOrEqual(0);
      expect(zone.x + zone.w / 2).toBeLessThanOrEqual(1);
      expect(zone.y).toBeGreaterThanOrEqual(0);
      expect(zone.y + zone.h).toBeLessThanOrEqual(1);
    }
  });

  it("街区顺序是地理顺序：西岸在左、港口在右、高地最高", () => {
    const west = getKnowledgeIslandZone("west-shore");
    const green = getKnowledgeIslandZone("green");
    const camp = getKnowledgeIslandZone("camp");
    const harbor = getKnowledgeIslandZone("harbor");
    const highland = getKnowledgeIslandZone("highland");

    expect(west.x).toBeLessThan(green.x);
    expect(green.x).toBeLessThan(camp.x);
    expect(camp.x).toBeLessThan(harbor.x);
    // 高地站在所有街区之上。
    expect(highland.y).toBeGreaterThan(camp.y);
    expect(highland.y).toBeGreaterThan(green.y);
    expect(highland.y).toBeGreaterThan(harbor.y);
  });

  it("街区坐标与阶段无关：同一个街区的 x / y 在所有阶段里是同一份", () => {
    // 这一条是「建筑不会漂移」的根本保证：街区不随阶段变化，
    // 变化的是岛身盒子，街区跟着盒子走，所以建筑永远站在自己的区域里。
    const zoneSignatures = STAGE_IDS.map((stageId) =>
      getKnowledgeIslandTerrain(stageId).id
    );

    expect(new Set(zoneSignatures).size).toBe(STAGE_IDS.length);

    for (const zoneId of KNOWLEDGE_ISLAND_ZONE_IDS) {
      const zone = getKnowledgeIslandZone(zoneId);
      const style = buildZoneStyle(zone);

      expect(style.left).toBe(`${zone.x * 100}%`);
      expect(style.bottom).toBe(`${zone.y * 100}%`);
      expect(style.width).toBe(`${zone.w * 100}%`);
      expect(style.height).toBe(`${zone.h * 100}%`);
    }
  });

  it("未知街区返回 null，不猜", () => {
    expect(getKnowledgeIslandZone("nowhere")).toBeNull();
    expect(buildZoneStyle(null)).toEqual({});
  });
});

describe("knowledgeIslandTerrain · 下一阶段预告", () => {
  it("预告指向紧邻的下一阶段，且就是那一阶段更宽的岛身", () => {
    for (let index = 0; index < STAGE_IDS.length - 1; index += 1) {
      const stampCount = KNOWLEDGE_ISLAND_STAGES[index].threshold;
      const island = buildKnowledgeIslandGrowth(stampCount);
      const preview = buildKnowledgeIslandNextTerrainPreview(island);

      expect(preview, `${STAGE_IDS[index]} 没有预告`).toBeTruthy();
      expect(preview.stageId).toBe(STAGE_IDS[index + 1]);
      // 只指向下一阶段，不会跳级。
      expect(preview.stageId).toBe(island.nextStage.id);
      // 预告的占地严格大于当前阶段，否则就不是「扩张预告」。
      expect(preview.footprintStyle.width).not.toBe(islandTerrainWidth(island.currentStage.id));
      expect(footprintArea(getKnowledgeIslandTerrain(preview.stageId))).toBeGreaterThan(
        footprintArea(getKnowledgeIslandTerrain(island.currentStage.id))
      );
    }
  });

  it("满级没有下一阶段 → 不预告", () => {
    const island = buildKnowledgeIslandGrowth(KNOWLEDGE_ISLAND_STAGES.at(-1).threshold);

    expect(island.isMaxStage).toBe(true);
    expect(island.nextStage).toBeNull();
    expect(buildKnowledgeIslandNextTerrainPreview(island)).toBeNull();
  });

  it("星星再多也只影响繁荣度，预告仍然只指向同一个下一阶段", () => {
    for (const starCount of [0, 21, 63, 500]) {
      const island = buildKnowledgeIslandGrowth(7, { starCount });
      const preview = buildKnowledgeIslandNextTerrainPreview(island);

      expect(island.currentStage.id).toBe("palm-camp");
      expect(preview.stageId).toBe(island.nextStage.id);
      expect(preview.stageId).toBe("explorer-dock");
    }
  });

  it("脏输入安全退化：没有 nextStage / nextStage 没有 id 一律不预告", () => {
    expect(buildKnowledgeIslandNextTerrainPreview(null)).toBeNull();
    expect(buildKnowledgeIslandNextTerrainPreview({})).toBeNull();
    expect(buildKnowledgeIslandNextTerrainPreview({ nextStage: {} })).toBeNull();
    expect(buildKnowledgeIslandNextTerrainPreview({ nextStage: { id: "nope" } })).toBeNull();
  });

  it("预告用的是下一阶段真实的岸线点，不是当前阶段的", () => {
    const island = buildKnowledgeIslandGrowth(3);
    const preview = buildKnowledgeIslandNextTerrainPreview(island);

    expect(preview.points).toBe(
      buildTerrainSvgPoints(getKnowledgeIslandTerrain("palm-camp").ground)
    );
    expect(preview.points).not.toBe(
      buildTerrainSvgPoints(getKnowledgeIslandTerrain("sprout-coast").ground)
    );
  });
});

describe("knowledgeIslandTerrain · 样式输出", () => {
  it("岛身样式把 footprint 翻译成百分比，并带上尺寸倍率", () => {
    const style = buildTerrainFootprintStyle(getKnowledgeIslandTerrain("palm-camp"));

    expect(style.left).toBe("22%");
    expect(style.bottom).toBe("17%");
    expect(style.width).toBe("56%");
    expect(style.height).toBe("36%");
    expect(style["--ki-unit"]).toBe("0.94");
  });

  it("脏地形安全退化成 0 尺寸与 1 倍率，不产生 NaN", () => {
    const style = buildTerrainFootprintStyle(null);

    expect(style.left).toBe("0%");
    expect(style.width).toBe("0%");
    expect(style["--ki-unit"]).toBe("1");
    expect(Object.values(style).every((value) => !String(value).includes("NaN"))).toBe(true);
  });
});

function islandTerrainWidth(stageId) {
  return `${getKnowledgeIslandTerrain(stageId).footprint.width}%`;
}
