// Fast averaged-FFT band analysis of a WAV, in Node.
// Usage: node tmp/fft-bands.mjs <wav> [label]
import fs from "fs";

const path = process.argv[2];
const label = process.argv[3] || path.split(/[\\/]/).pop();
const buf = fs.readFileSync(path);

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

const N = 8192, hop = N >> 1;
const re = new Float64Array(N), im = new Float64Array(N);
const acc = new Float64Array(N / 2);
let wins = 0;
for (let s = 0; s + N <= n; s += hop) {
  for (let i = 0; i < N; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)); // Hann
    re[i] = (L[s + i] || 0) * w;
    im[i] = 0;
  }
  fft(re, im);
  for (let k = 0; k < N / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
  wins++;
}
for (let k = 0; k < N / 2; k++) acc[k] /= wins;

const binHz = sr / N;
const band = (lo, hi) => {
  const a = Math.max(0, Math.round(lo / binHz));
  const b = Math.min(N / 2 - 1, Math.round(hi / binHz));
  let t = 0;
  for (let k = a; k <= b; k++) t += acc[k];
  return 10 * Math.log10(t + 1e-20);
};
const nyq = sr / 2;
const low = band(20, 250), mid = band(250, 2000), high = band(2000, nyq);
let peak = 0, sq = 0;
for (let i = 0; i < n; i++) { const v = Math.abs(L[i]); if (v > peak) peak = v; sq += L[i] * L[i]; }
const rms = Math.sqrt(sq / n);

console.log(`--- ${label} (${(n / sr).toFixed(1)}s, ${sr}Hz, ${wins} windows) ---`);
console.log(`  low  20-250      ${low.toFixed(2)} dB`);
console.log(`  mid  250-2000    ${mid.toFixed(2)} dB`);
console.log(`  high 2000-Nyq    ${high.toFixed(2)} dB`);
console.log(`  mid-low          ${(mid - low).toFixed(2)} dB`);
console.log(`  high-mid         ${(high - mid).toFixed(2)} dB   <-- brightness`);
console.log(`  high-low         ${(high - low).toFixed(2)} dB   <-- tilt`);
console.log(`  peak ${peak.toFixed(4)}  rms ${rms.toFixed(4)}  (${(20*Math.log10(rms)).toFixed(2)} dBFS)`);

function fft(re, im) {
  const nn = re.length;
  for (let i = 1, j = 0; i < nn; i++) {
    let bit = nn >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= nn; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < nn; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}
