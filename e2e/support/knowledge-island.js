// 知识岛（Phase 2C-A）E2E 共享常量与辅助函数。
//
// 阶段名 / 文案一律从应用自己的纯函数取，不在测试里手写第二份，
// 这样测试校验的是“界面有没有如实展示算出来的阶段”，而不是复制一份期望值。
const KNOWLEDGE_ISLAND_REGION = "我的知识岛";
const KNOWLEDGE_ISLAND_FIGURE = '[data-role="knowledge-island-figure"]';
const KNOWLEDGE_ISLAND_TRACK = ".knowledge-island__track";
const KNOWLEDGE_ISLAND_FILL = ".knowledge-island__fill";

// 知识岛独立页面：深链直接打开，路径不带参数。
const KNOWLEDGE_ISLAND_PAGE_URL = "/#/knowledge-island";
const KNOWLEDGE_ISLAND_PAGE_TITLE = "我的知识岛";
const KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT = '[data-role="island-page-stamp-count"]';
const KNOWLEDGE_ISLAND_PAGE_STAR_COUNT = '[data-role="island-page-star-count"]';
const KNOWLEDGE_ISLAND_PAGE_NEXT = '[data-role="island-page-next"]';

// 收藏册里的知识岛入口卡（整座岛已经搬到独立页面，这里只留一个入口）。
const COLLECTION_ISLAND_ENTRY = '[data-role="collection-island-entry"]';
const COLLECTION_ISLAND_ENTRY_LABEL = "去看看我的小岛";

// 首页长期成长入口（整行可点，打开知识岛独立页面）。
const HOME_ISLAND_ROW_LABEL = /打开我的知识岛/;

function sectionCountText(stampCount) {
  return `累计 ${stampCount} 枚探险印章`;
}

function islandStampText(stampCount) {
  return `已经攒了 ${stampCount} 枚探险印章`;
}

// 收藏册入口卡上的「当前：<阶段> · <繁荣度>」与「N 枚探险印章 · M 颗星」。
function collectionIslandStageText(stageName, prosperityLabel) {
  return `当前：${stageName} · ${prosperityLabel}`;
}

function collectionIslandMetaText(stampCount, starCount) {
  return `${stampCount} 枚探险印章 · ${starCount} 颗星`;
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
  KNOWLEDGE_ISLAND_PAGE_URL,
  KNOWLEDGE_ISLAND_PAGE_TITLE,
  KNOWLEDGE_ISLAND_PAGE_STAGE_COUNT,
  KNOWLEDGE_ISLAND_PAGE_STAR_COUNT,
  KNOWLEDGE_ISLAND_PAGE_NEXT,
  COLLECTION_ISLAND_ENTRY,
  COLLECTION_ISLAND_ENTRY_LABEL,
  HOME_ISLAND_ROW_LABEL,
  sectionCountText,
  islandStampText,
  collectionIslandStageText,
  collectionIslandMetaText,
  homeIslandText
};
