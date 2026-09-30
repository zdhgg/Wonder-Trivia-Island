// Per-pair section envelope correlation, to target which sections to differentiate.
import fs from "fs";
const p = process.argv[2];
const buf = fs.readFileSync(p);
let off = 12, dOff = 0, dLen = 0, sr = 0, ch = 0;
while (off + 8 <= buf.length) {
  const id = buf.toString("ascii", off, off + 4);
  const sz = buf.readUInt32LE(off + 4);
  if (id === "fmt ") { ch = buf.readUInt16LE(off + 10); sr = buf.readUInt32LE(off + 12); }
  if (id === "data") { dOff = off + 8; dLen = sz; }
  off += 8 + sz + (sz % 2);
}
const n = dLen / 2 / ch;
const L = new Float64Array(n);
for (let i = 0; i < n; i++) L[i] = buf.readInt16LE(dOff + i * ch * 2) / 32768;

const seg = Math.round(sr * 8);
const count = Math.floor(n / seg);
const step = Math.round(sr * 0.05);
const env = [];
for (let s = 0; s < count; s++) {
  const e = [];
  for (let o = 0; o + step < seg; o += step) {
    let acc = 0;
    for (let k = o; k < o + step; k++) acc += L[s * seg + k] * L[s * seg + k];
    e.push(Math.sqrt(acc / step));
  }
  env.push(e);
}
const pearson = (a, b) => {
  const m = Math.min(a.length, b.length);
  let ma = 0, mb = 0;
  for (let i = 0; i < m; i++) { ma += a[i]; mb += b[i]; }
  ma /= m; mb /= m;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < m; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return num / Math.sqrt(da * db);
};
console.log(`sections: ${count}`);
const means = env.map(e => e.reduce((a, b) => a + b, 0) / e.length);
env.forEach((e, i) => console.log(`  S${i + 1} meanRms ${means[i].toFixed(4)}  (${(20*Math.log10(means[i])).toFixed(1)} dBFS)`));
console.log("\npairwise correlation (higher = more alike):");
const pairs = [];
for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) pairs.push([i, j, pearson(env[i], env[j])]);
pairs.sort((a, b) => b[2] - a[2]);
for (const [i, j, c] of pairs) console.log(`  S${i + 1} vs S${j + 1}: ${c.toFixed(3)}`);
console.log(`\nmean ${(pairs.reduce((a, b) => a + b[2], 0) / pairs.length).toFixed(3)}`);
