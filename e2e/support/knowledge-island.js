// 知识岛（Phase 2C-A）E2E 共享常量与辅助函数。
//
// 阶段名 / 文案一律从应用自己的纯函数取，不在测试里手写第二份，
// 这样测试校验的是“界面有没有如实展示算出来的阶段”，而不是复制一份期望值。
const KNOWLEDGE_ISLAND_REGION = "我的知识岛";
const KNOWLEDGE_ISLAND_FIGURE = '[data-role="knowledge-island-figure"]';
const KNOWLEDGE_ISLAND_TRACK = ".knowledge-island__track";
const KNOWLEDGE_ISLAND_FILL = ".knowledge-island__fill";

// 首页长期成长入口（整行可点，打开同一个探险收藏册）。
const HOME_ISLAND_ROW_LABEL = /打开我的探险收藏册，查看我的知识岛/;

function sectionCountText(stampCount) {
  return `累计 ${stampCount} 枚探险印章`;
}

function islandStampText(stampCount) {
  return `已经攒了 ${stampCount} 枚探险印章`;
}

// 首页摘要那一行读作「<阶段名> · 已经攒了 N 枚探险印章」。
function homeIslandText(stampCount, stageName) {
  return `${stageName} · ${islandStampText(stampCount)}`;
}

module.exports = {
  KNOWLEDGE_ISLAND_REGION,
  KNOWLEDGE_ISLAND_FIGURE,
  KNOWLEDGE_ISLAND_TRACK,
  KNOWLEDGE_ISLAND_FILL,
  HOME_ISLAND_ROW_LABEL,
  sectionCountText,
  islandStampText,
  homeIslandText
};
