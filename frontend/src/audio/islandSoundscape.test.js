import { describe, expect, it } from "vitest";
import {
  getPendingSoundscapeAccentCount,
  resolveIslandSoundscape,
  startIslandSoundscape,
  stopIslandSoundscape,
  syncIslandSoundscapeScene
} from "./islandSoundscape.js";
import { KNOWLEDGE_ISLAND_STAGES } from "../utils/knowledgeIslandGrowth.js";

// 这一组测试只守「纯配置层」：阶段 + 繁荣度 → 声景里该有什么。
// WebAudio 播放层在测试环境里没有 AudioContext，会安静退化成 no-op，
// 所以 start / stop / sync 只验证"不会抛错、不会排定时器"。

describe("islandSoundscape · 阶段化声景配置", () => {
  it("初见小岛最安静：没有风、没有铃、没有雾号", () => {
    const scene = resolveIslandSoundscape("first-sight", 0);

    expect(scene.windLevel).toBe(0);
    expect(scene.bellEnabled).toBe(false);
    expect(scene.foghornEnabled).toBe(false);
    expect(scene.gullDelayFactor).toBe(1);
  });

  it("萌芽海岸起有风，且风的强度随阶段爬升", () => {
    const levels = KNOWLEDGE_ISLAND_STAGES.map((stage) => resolveIslandSoundscape(stage.id, 0).windLevel);

    // 第一阶段无风，之后每个阶段都有，且大体单调不减。
    expect(levels[0]).toBe(0);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index]).toBeGreaterThan(0);
      expect(levels[index]).toBeGreaterThanOrEqual(levels[index - 1]);
    }
  });

  it("探险码头起有船铃，知识灯塔后才有雾号", () => {
    expect(resolveIslandSoundscape("palm-camp", 0).bellEnabled).toBe(false);
    expect(resolveIslandSoundscape("explorer-dock", 0).bellEnabled).toBe(true);
    expect(resolveIslandSoundscape("starwatch-hill", 0).bellEnabled).toBe(true);
    expect(resolveIslandSoundscape("starwatch-hill", 0).foghornEnabled).toBe(false);
    expect(resolveIslandSoundscape("knowledge-lighthouse", 0).foghornEnabled).toBe(true);
  });

  it("繁荣度只收紧鸥鸣间隔，绝不放大：系数始终在 0 < f ≤ 1", () => {
    const basic = resolveIslandSoundscape("first-sight", 0);
    const lush = resolveIslandSoundscape("first-sight", 1);
    const flourishing = resolveIslandSoundscape("first-sight", 2);

    expect(basic.gullDelayFactor).toBe(1);
    expect(lush.gullDelayFactor).toBeLessThan(1);
    expect(flourishing.gullDelayFactor).toBeLessThan(lush.gullDelayFactor);
    expect(flourishing.gullDelayFactor).toBeGreaterThan(0);
  });

  it("繁荣度只影响鸥鸣间隔，不影响风 / 铃 / 雾号", () => {
    for (const stage of KNOWLEDGE_ISLAND_STAGES) {
      const quiet = resolveIslandSoundscape(stage.id, 0);
      const lively = resolveIslandSoundscape(stage.id, 2);

      expect(lively.windLevel).toBe(quiet.windLevel);
      expect(lively.bellEnabled).toBe(quiet.bellEnabled);
      expect(lively.foghornEnabled).toBe(quiet.foghornEnabled);
    }
  });

  it("阶段顺序仍然只有 knowledgeIslandGrowth 一个来源：未知 id 退化成最安静的配置", () => {
    for (const brokenStageId of [undefined, null, "", "not-a-stage", 0, {}]) {
      const scene = resolveIslandSoundscape(brokenStageId, 0);

      expect(scene).toEqual(resolveIslandSoundscape("first-sight", 0));
    }
  });

  it("脏繁荣度按基础档处理，不抛错", () => {
    for (const brokenLevel of [undefined, null, "abc", NaN, -5, 99, {}]) {
      const scene = resolveIslandSoundscape("palm-camp", brokenLevel);

      expect(scene.gullDelayFactor).toBeGreaterThan(0);
      expect(scene.gullDelayFactor).toBeLessThanOrEqual(1);
    }
  });
});

describe("islandSoundscape · 无音频环境下的安全退化", () => {
  it("没有 AudioContext / 未解锁时 start 是安静的 no-op，也不排任何点缀音", () => {
    expect(() => {
      startIslandSoundscape();
      syncIslandSoundscapeScene({ stageId: "knowledge-lighthouse", prosperityLevel: 2 });
      stopIslandSoundscape();
    }).not.toThrow();

    expect(getPendingSoundscapeAccentCount()).toBe(0);
  });
});
