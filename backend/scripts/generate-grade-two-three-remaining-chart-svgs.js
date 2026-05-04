const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const publicRoot = path.join(repoRoot, "frontend", "public");

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeSvg(relativePath, svg) {
  const filePath = path.join(publicRoot, relativePath.replace(/^\//, ""));
  ensureDir(filePath);
  fs.writeFileSync(filePath, svg, "utf8");
}

function card(title, subtitle, lines, accent) {
  const text = lines
    .map((line, index) => `<tspan x="82" y="${118 + index * 26}">${line}</tspan>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280">
  <rect width="480" height="280" rx="28" fill="#F9F6F1" />
  <rect x="34" y="24" width="412" height="232" rx="26" fill="#FFFDFC" stroke="#E8DCCF" />
  <rect x="34" y="24" width="412" height="46" rx="26" fill="${accent}" />
  <text x="56" y="53" font-size="22" font-weight="800" fill="#FFFFFF">${title}</text>
  <text x="58" y="92" font-size="15" font-weight="600" fill="#8D6D58">${subtitle}</text>
  <rect x="62" y="108" width="356" height="112" rx="18" fill="#FFF6EC" stroke="#F0D7BD" />
  <text x="82" y="118" font-size="19" font-weight="700" fill="#6A4631">${text}</text>
</svg>`;
}

const assets = [
  {
    path: "/images/challenge/g2-upper-stage3/duty-roster-xiaodong-xiaomei-xiaojun.svg",
    svg: card("值日表", "看清星期和对应同学", ["周一  小东  扫地", "周二  小美  擦黑板", "周三  小军  摆桌椅"], "#D88B3F")
  },
  {
    path: "/images/challenge/g2-lower-stage3/duty-roster-xiaoqing-xiaolin-xiaohong.svg",
    svg: card("值日表", "看清周二是谁", ["周一  小青  擦桌子", "周二  小林  摆椅子", "周三  小红  关窗"], "#D88B3F")
  },
  {
    path: "/images/challenge/g3-upper-stage5/class-notice-ropework-card.svg",
    svg: card("班级公告", "按星期查看安排", ["周三  带跳绳参加比赛", "周四  交手工作品", "周五  展示读书卡"], "#C96B3B")
  },
  {
    path: "/images/challenge/g3-upper-stage7/plant-observe-water-sun.svg",
    svg: card("种植步骤", "看事情先后顺序", ["1. 记录种植观察", "2. 给植物浇水", "3. 把花盆搬到阳光下"], "#4D9E68")
  },
  {
    path: "/images/challenge/g3-lower-stage5/leaf-specimen-steps.svg",
    svg: card("植物标本", "按步骤完成", ["1. 采集叶片", "2. 夹在书里压平", "3. 贴在记录卡上"], "#4D9E68")
  },
  {
    path: "/images/challenge/g3-lower-stage5/note-science-cabinet-second-shelf.svg",
    svg: card("留言", "根据物品位置找答案", ["观察表  在科学柜第二层", "放大镜  在窗边", "记录本  在讲台上"], "#5F8FCE")
  },
  {
    path: "/images/challenge/g3-lower-stage7/study-tour-steps-model.svg",
    svg: card("研学流程", "看清制作模型前一步", ["1. 听讲解", "2. 分组记录", "3. 制作模型"], "#5F8FCE")
  }
];

for (const asset of assets) {
  writeSvg(asset.path, asset.svg);
}

console.log(`Generated ${assets.length} remaining chart/step SVG files.`);
