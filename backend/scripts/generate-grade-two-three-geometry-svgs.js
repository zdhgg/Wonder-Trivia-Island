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

function layout({ title, subtitle, body, accent = "#2C7BE5", bg = "#EFF7FF" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280">
  <defs>
    <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="${bg}" />
    </linearGradient>
  </defs>
  <rect width="480" height="280" rx="28" fill="${bg}" />
  <rect x="32" y="24" width="416" height="232" rx="28" fill="url(#panel)" stroke="#CFE2F7" />
  <rect x="32" y="24" width="416" height="44" rx="28" fill="${accent}" />
  <text x="52" y="52" font-size="22" font-weight="800" fill="#FFFFFF">${title}</text>
  <text x="52" y="88" font-size="15" font-weight="600" fill="#58718D">${subtitle}</text>
  ${body}
</svg>`;
}

function clockFace(hour, cx, cy, label) {
  const handAngles = {
    3: 0,
    6: 90,
    8: 150,
    10: 210
  };
  const angle = ((handAngles[hour] ?? 0) - 90) * (Math.PI / 180);
  const hx = cx + Math.cos(angle) * 28;
  const hy = cy + Math.sin(angle) * 28;

  return `
    <circle cx="${cx}" cy="${cy}" r="40" fill="#FFFFFF" stroke="#88B7E8" stroke-width="4" />
    <circle cx="${cx}" cy="${cy}" r="4" fill="#2C7BE5" />
    <line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#2C7BE5" stroke-width="5" stroke-linecap="round" />
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 18}" stroke="#FF8A3D" stroke-width="4" stroke-linecap="round" />
    <text x="${cx}" y="${cy + 66}" text-anchor="middle" font-size="16" font-weight="700" fill="#35516F">${label}</text>
  `;
}

function rectangleDiagram(width, height, unit, note) {
  return `
    <rect x="128" y="106" width="168" height="84" rx="8" fill="#E9F4FF" stroke="#2C7BE5" stroke-width="4" />
    <text x="212" y="98" text-anchor="middle" font-size="18" font-weight="700" fill="#2C7BE5">${width}${unit}</text>
    <text x="314" y="154" font-size="18" font-weight="700" fill="#2C7BE5">${height}${unit}</text>
    <text x="52" y="228" font-size="16" font-weight="600" fill="#5B7087">${note}</text>
  `;
}

function squareDiagram(side, unit, note) {
  return `
    <rect x="156" y="102" width="124" height="124" rx="8" fill="#E9F4FF" stroke="#2C7BE5" stroke-width="4" />
    <text x="218" y="94" text-anchor="middle" font-size="18" font-weight="700" fill="#2C7BE5">${side}${unit}</text>
    <text x="52" y="244" font-size="16" font-weight="600" fill="#5B7087">${note}</text>
  `;
}

function stripDiagram(total, parts, usedLabel, note) {
  const usedWidth = 220;
  const remainWidth = 72;
  return `
    <rect x="92" y="126" width="${usedWidth}" height="28" rx="14" fill="#FFB36B" />
    <rect x="${92 + usedWidth}" y="126" width="${remainWidth}" height="28" rx="14" fill="#D8ECFF" />
    <text x="92" y="110" font-size="18" font-weight="700" fill="#35516F">总长 ${total}</text>
    <text x="202" y="144" text-anchor="middle" font-size="16" font-weight="700" fill="#7A3B00">${usedLabel}</text>
    <text x="${92 + usedWidth + remainWidth / 2}" y="144" text-anchor="middle" font-size="16" font-weight="700" fill="#2C7BE5">剩余</text>
    <text x="52" y="214" font-size="18" font-weight="700" fill="#2C7BE5">${parts}</text>
    <text x="52" y="238" font-size="16" font-weight="600" fill="#5B7087">${note}</text>
  `;
}

const assets = [
  {
    path: "/images/challenge/g2-general/clock-3-to-6.svg",
    svg: layout({
      title: "钟面时间",
      subtitle: "观察开始和结束时刻",
      body: `
        ${clockFace(3, 166, 148, "3时")}
        <text x="238" y="156" font-size="30" font-weight="800" fill="#2C7BE5">→</text>
        ${clockFace(6, 314, 148, "6时")}
      `
    })
  },
  {
    path: "/images/challenge/g3-general/rectangle-7x3-perimeter.svg",
    svg: layout({
      title: "长方形",
      subtitle: "先看长和宽，再想周长",
      body: rectangleDiagram(7, 3, "厘米", "周长要把四条边都算进去。")
    })
  },
  {
    path: "/images/challenge/g2-upper-stage1/clock-8-plus-2-hours.svg",
    svg: layout({
      title: "时间推算",
      subtitle: "先看现在是几时",
      body: `
        ${clockFace(8, 166, 148, "现在 8时")}
        <text x="238" y="156" font-size="26" font-weight="800" fill="#2C7BE5">+2小时</text>
        ${clockFace(10, 344, 148, "再过 2 小时")}
      `
    })
  },
  {
    path: "/images/challenge/g2-lower-stage7/rope-84-four-squares-18.svg",
    svg: layout({
      title: "绳子剪拼",
      subtitle: "每个正方形有 4 条边",
      body: stripDiagram("84厘米", "4个边长18厘米的正方形", "先用掉做正方形的部分", "想一想还剩下多少厘米。")
    })
  },
  {
    path: "/images/challenge/g3-upper-stage6/rectangle-9x4-perimeter.svg",
    svg: layout({
      title: "周长计算",
      subtitle: "长方形的四条边围一圈",
      body: rectangleDiagram(9, 4, "厘米", "把长和宽各算两次。")
    })
  },
  {
    path: "/images/challenge/g3-upper-stage7/wire-120-square-18.svg",
    svg: layout({
      title: "铁丝围图形",
      subtitle: "边长 18 厘米的正方形",
      body: `
        ${squareDiagram(18, "厘米", "先算正方形需要多少铁丝。")}
        <text x="320" y="132" font-size="18" font-weight="700" fill="#35516F">铁丝总长</text>
        <text x="320" y="160" font-size="26" font-weight="800" fill="#2C7BE5">120 厘米</text>
      `
    })
  },
  {
    path: "/images/challenge/g3-lower-stage1/rectangle-8x5-area.svg",
    svg: layout({
      title: "面积基础",
      subtitle: "长方形面积 = 长 × 宽",
      body: rectangleDiagram(8, 5, "米", "先数长，再数宽。")
    })
  },
  {
    path: "/images/challenge/g3-lower-stage2/playground-9x4-perimeter.svg",
    svg: layout({
      title: "操场周长",
      subtitle: "绕操场一圈就是周长",
      body: rectangleDiagram(9, 4, "米", "围一圈要把四条边都算上。")
    })
  },
  {
    path: "/images/challenge/g3-lower-stage2/square-tile-6-area.svg",
    svg: layout({
      title: "正方形面积",
      subtitle: "边长是 6 分米",
      body: squareDiagram(6, "分米", "面积要算里面一共有多少平方分米。")
    })
  },
  {
    path: "/images/challenge/g3-lower-stage3/grass-11x4-over-40.svg",
    svg: layout({
      title: "面积判断",
      subtitle: "先算长方形面积，再和 40 比一比",
      body: `
        ${rectangleDiagram(11, 4, "米", "面积超过 40 平方米吗？")}
        <rect x="324" y="118" width="84" height="44" rx="12" fill="#FFF1E0" stroke="#FF9B46" stroke-width="3" />
        <text x="366" y="146" text-anchor="middle" font-size="22" font-weight="800" fill="#D46B00">40㎡</text>
      `
    })
  },
  {
    path: "/images/challenge/g3-lower-stage5/garden-12x5-three-plants.svg",
    svg: layout({
      title: "菜地种植",
      subtitle: "先算面积，再看每平方米种多少株",
      body: `
        ${rectangleDiagram(12, 5, "米", "每平方米种 3 株番茄。")}
        <text x="328" y="152" font-size="20" font-weight="800" fill="#2C7BE5">3 株/㎡</text>
      `
    })
  },
  {
    path: "/images/challenge/g3-lower-stage5/four-square-boards-9.svg",
    svg: layout({
      title: "展板面积",
      subtitle: "一共有 4 块同样大的正方形展板",
      body: `
        <rect x="120" y="108" width="60" height="60" rx="6" fill="#E9F4FF" stroke="#2C7BE5" stroke-width="3" />
        <rect x="194" y="108" width="60" height="60" rx="6" fill="#E9F4FF" stroke="#2C7BE5" stroke-width="3" />
        <rect x="120" y="182" width="60" height="60" rx="6" fill="#E9F4FF" stroke="#2C7BE5" stroke-width="3" />
        <rect x="194" y="182" width="60" height="60" rx="6" fill="#E9F4FF" stroke="#2C7BE5" stroke-width="3" />
        <text x="286" y="146" font-size="18" font-weight="700" fill="#2C7BE5">每块边长 9 分米</text>
        <text x="286" y="176" font-size="16" font-weight="600" fill="#5B7087">先算一块，再看 4 块。</text>
      `
    })
  },
  {
    path: "/images/challenge/g3-lower-stage5/cloth-8x6-minus-14.svg",
    svg: layout({
      title: "布料面积",
      subtitle: "先算整块布，再减去剪掉的部分",
      body: `
        ${rectangleDiagram(8, 6, "米", "剪去 14 平方米后还剩多少？")}
        <rect x="312" y="118" width="88" height="44" rx="12" fill="#FFF1E0" stroke="#FF9B46" stroke-width="3" />
        <text x="356" y="146" text-anchor="middle" font-size="20" font-weight="800" fill="#D46B00">减 14㎡</text>
      `
    })
  },
  {
    path: "/images/challenge/g3-lower-stage6/rectangle-12x5-area.svg",
    svg: layout({
      title: "面积计算",
      subtitle: "长方形面积 = 长 × 宽",
      body: rectangleDiagram(12, 5, "厘米", "面积单位要写平方厘米。")
    })
  },
  {
    path: "/images/challenge/g3-lower-stage6/square-7-perimeter.svg",
    svg: layout({
      title: "正方形周长",
      subtitle: "4 条边都一样长",
      body: squareDiagram(7, "厘米", "周长等于 4 个边长相加。")
    })
  },
  {
    path: "/images/challenge/g3-lower-stage7/garden-16x9-two-plants.svg",
    svg: layout({
      title: "综合种植",
      subtitle: "先算面积，再乘每平方米的株数",
      body: `
        ${rectangleDiagram(16, 9, "米", "每平方米种 2 株番茄。")}
        <text x="320" y="152" font-size="20" font-weight="800" fill="#2C7BE5">2 株/㎡</text>
      `
    })
  },
  {
    path: "/images/challenge/g3-lower-stage7/square-15-fence-42-left.svg",
    svg: layout({
      title: "围篱笆",
      subtitle: "边长 15 米的正方形空地",
      body: `
        ${squareDiagram(15, "米", "已经装好 42 米，还差多少米？")}
        <rect x="300" y="118" width="92" height="44" rx="12" fill="#FFF1E0" stroke="#FF9B46" stroke-width="3" />
        <text x="346" y="146" text-anchor="middle" font-size="20" font-weight="800" fill="#D46B00">已装 42米</text>
      `
    })
  }
];

for (const asset of assets) {
  writeSvg(asset.path, asset.svg);
}

console.log(`Generated ${assets.length} geometry/time SVG files.`);
