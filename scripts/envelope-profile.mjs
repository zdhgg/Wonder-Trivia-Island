// Profiles the level envelope of the first seconds and of each loop repeat,
// to see whether the loop "breathes" audibly at the seam.
import fs from "fs";
import path from "path";

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

const rms = (a, b) => { let s = 0; const to = Math.min(n, b); for (let i = Math.max(0,a); i < to; i++) s += L[i]*L[i]; return Math.sqrt(s / Math.max(1, to - Math.max(0,a))); };
const db = (v) => 20*Math.log10(v + 1e-12);

console.log("=== per-0.5s RMS across the whole file (dBFS, file level) ===");
const step = Math.round(sr * 0.5);
for (let t = 0; t < n; t += step) {
  const v = rms(t, t + step);
  const bar = "#".repeat(Math.max(0, Math.round((v) * 120)));
  const marker = t === 0 ? "  <-- LOOP START" : (t + step >= n ? "  <-- LOOP END" : "");
  console.log(`${(t/sr).toFixed(1).padStart(5)}s ${db(v).toFixed(1).padStart(7)} ${bar}${marker}`);
}

console.log("\n=== first 3 s in 100 ms detail (does the loop fade in?) ===");
const fine = Math.round(sr * 0.1);
for (let t = 0; t < Math.round(sr * 3); t += fine) {
  console.log(`${(t/sr).toFixed(1).padStart(5)}s ${db(rms(t, t+fine)).toFixed(1).padStart(7)} dBFS`);
}
console.log("\n=== last 3 s in 100 ms detail (does the loop fade out?) ===");
for (let t = n - Math.round(sr*3); t < n; t += fine) {
  console.log(`${(t/sr).toFixed(1).padStart(5)}s ${db(rms(t, Math.min(n, t+fine))).toFixed(1).padStart(7)} dBFS`);
}
