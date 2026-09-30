// Simulates exactly what the browser does with <audio loop>: the decoded
// buffer repeats end-to-end. Measuring the repeated stream answers the
// listening questions (dropouts at the wrap, level stability, fatigue from
// repetition) more precisely than listening can.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const bgmPath = process.argv[2] || path.join(repo, "frontend/src/assets/audio/island-bgm-loop.wav");
const wavesPath = path.join(repo, "frontend/src/assets/audio/island-waves-loop.wav");

function readWav(p) {
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
  return { L, sr, n, dur: n / sr, ch };
}

const rms = (a, from, to) => {
  from = Math.max(0, from | 0); to = Math.min(a.length, to | 0);
  if (to <= from) return 0;
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / (to - from));
};

const bgm = readWav(bgmPath);
const sr = bgm.sr;
const L = bgm.L;
const N = bgm.n;

// App levels: element.volume = masterVolume * musicVolume = 0.72 * 0.42
const BGM_GAIN = 0.72 * 0.42;
const WAVES_GAIN = 0.72 * 0.16;

console.log("=".repeat(68));
console.log("LOOP SIMULATION  (what <audio loop> actually plays back)");
console.log("=".repeat(68));
console.log(`  asset duration   ${bgm.dur.toFixed(3)} s`);
console.log(`  element volume   ${BGM_GAIN.toFixed(4)}  (= masterVolume 0.72 x musicVolume 0.42)`);
console.log(`  post-gain RMS    ${(20 * Math.log10(rms(L, 0, N) * BGM_GAIN)).toFixed(2)} dBFS`);
const peakAbs = (() => { let m = 0; for (let i = 0; i < L.length; i++) { const v = Math.abs(L[i]); if (v > m) m = v; } return m; })();
console.log(`  post-gain peak   ${(20 * Math.log10(peakAbs * BGM_GAIN)).toFixed(2)} dBFS`);

// ---- 1. simulate 3 wraps (168 s of playback) ----
// Build the actually-repeated stream, because the browser plays the buffer
// end-to-end: measuring across a wrap means reading across the boundary.
const REPEATS = 3;
const total = N * REPEATS;
const R = new Float64Array(total);
for (let r = 0; r < REPEATS; r++) R.set(L, r * N);
const rmsR = (a, b) => {
  a = Math.max(0, a | 0); b = Math.min(R.length, b | 0);
  if (b <= a) return 0;
  let s = 0;
  for (let i = a; i < b; i++) s += R[i] * R[i];
  return Math.sqrt(s / (b - a));
};

console.log(`\n--- simulating ${REPEATS} consecutive loops (${(total / sr).toFixed(1)} s of playback) ---`);

const win = Math.round(sr * 0.1);
for (let r = 0; r < REPEATS; r++) {
  const wrapStart = r * N;
  const before = rmsR(wrapStart - win, wrapStart);
  const after = rmsR(wrapStart, wrapStart + win);
  const ref = rmsR(wrapStart + Math.round(sr * 20), wrapStart + Math.round(sr * 20) + win);
  const dip = (20 * Math.log10(after / before)).toFixed(2);
  const vsRef = (20 * Math.log10(after / ref)).toFixed(2);
  const step = Math.abs(R[wrapStart] - R[wrapStart - 1]);
  console.log(`  wrap ${r + 1} @ ${String((wrapStart / sr).toFixed(0)).padStart(3)}s : before ${before.toFixed(5)}  after ${after.toFixed(5)}  level change ${dip} dB (vs steady ${vsRef} dB)  sample step ${step.toFixed(6)}`);
}

let worstStep = 0, worstAt = 0;
for (let r = 0; r < REPEATS; r++) {
  const i = r * N;
  const step = Math.abs(R[i] - R[i - 1]);
  if (step > worstStep) { worstStep = step; worstAt = i / sr; }
}
console.log(`  worst sample step across any wrap: ${worstStep.toFixed(6)} @ ${worstAt.toFixed(1)}s`);

// ---- 2. dropouts anywhere in the repeated stream ----
const bucket = Math.round(sr * 0.5);
const silent = [];
let minRms = Infinity, minAt = 0;
for (let p = 0; p < total; p += bucket) {
  const v = rmsR(p, p + bucket);
  if (v < minRms) { minRms = v; minAt = p / sr; }
  if (v < 0.01 * rmsR(0, N)) silent.push(+((p / sr).toFixed(1)));
}
console.log(`\n  quietest 0.5 s window anywhere: RMS ${minRms.toFixed(5)} @ ${minAt.toFixed(1)}s`);
console.log(`  near-silent windows (<0.005 RMS): ${silent.length}${silent.length ? " at " + silent.slice(0, 10).join(", ") + "s" : ""}`);

// ---- 3. long-term level stability (fatigue / drift) ----
const perSec = [];
for (let r = 0; r < REPEATS; r++) {
  for (let s = 0; s < Math.floor(bgm.dur); s++) perSec.push(rms(L, s * sr, (s + 1) * sr));
}
const sorted = [...perSec].sort((a, b) => a - b);
console.log(`\n--- level stability over ${perSec.length} one-second windows ---`);
console.log(`  min ${sorted[0].toFixed(4)}  p25 ${sorted[(sorted.length*0.25)|0].toFixed(4)}  median ${sorted[(sorted.length*0.5)|0].toFixed(4)}  p75 ${sorted[(sorted.length*0.75)|0].toFixed(4)}  max ${sorted[sorted.length-1].toFixed(4)}`);
console.log(`  max/min spread      ${(20*Math.log10(sorted[sorted.length-1]/sorted[0])).toFixed(2)} dB`);
console.log(`  p75/p25 spread      ${(20*Math.log10(sorted[(sorted.length*0.75)|0]/sorted[(sorted.length*0.25)|0])).toFixed(2)} dB`);

// ---- 4. repetition: how long before the ear notices the loop? ----
console.log(`\n--- repetition ---`);
console.log(`  loop period ${bgm.dur.toFixed(1)} s  ->  repeats in 2 min: ${(120 / bgm.dur).toFixed(2)}`);
console.log(`  loop period ${bgm.dur.toFixed(1)} s  ->  repeats in 10 min: ${(600 / bgm.dur).toFixed(2)}`);

// ---- 5. coexistence with the island waves at their real app levels ----
console.log(`\n--- coexistence with island ambience (app levels) ---`);
try {
  const waves = readWav(wavesPath);
  const bgmRms = rms(L, 0, N) * BGM_GAIN;
  const wavesRms = rms(waves.L, 0, waves.n) * WAVES_GAIN;
  const sumRms = Math.sqrt(bgmRms * bgmRms + wavesRms * wavesRms);
  console.log(`  BGM  at element gain      RMS ${bgmRms.toFixed(5)}  (${(20*Math.log10(bgmRms)).toFixed(2)} dBFS)`);
  console.log(`  waves at element gain     RMS ${wavesRms.toFixed(5)}  (${(20*Math.log10(wavesRms)).toFixed(2)} dBFS)`);
  console.log(`  BGM over waves            ${(20*Math.log10(bgmRms/wavesRms)).toFixed(2)} dB  (BGM sits above the bed, as intended)`);
  console.log(`  combined incoherent sum   RMS ${sumRms.toFixed(5)}  (${(20*Math.log10(sumRms)).toFixed(2)} dBFS)`);
  console.log(`  combined headroom to 0dB  ${(-20*Math.log10(sumRms)).toFixed(2)} dB`);
} catch (e) {
  console.log("  (waves asset unavailable: " + e.message + ")");
}

// ---- 6. the same for the previous 24 s asset, for comparison ----
console.log(`\n${"=".repeat(68)}`);
console.log("SAME MEASUREMENTS ON THE PREVIOUS ASSET (for comparison)");
console.log("=".repeat(68));
const old = process.argv[3];
if (old && fs.existsSync(old)) {
  const o = readWav(old);
  const oWrapDip = (() => {
    const win = Math.round(o.sr * 0.1);
    const before = rms(o.L, o.n - win, o.n);
    const after = rms(o.L, 0, win);
    return +(20 * Math.log10(after / before)).toFixed(2);
  })();
  const oRef = rms(o.L, Math.round(o.sr * 12), Math.round(o.sr * 12) + Math.round(o.sr * 0.1));
  const oAfter = rms(o.L, 0, Math.round(o.sr * 0.1));
  let oSilent = 0, oMin = Infinity;
  for (let p = 0; p < o.n; p += Math.round(o.sr * 0.5)) {
    const v = rms(o.L, p, p + Math.round(o.sr * 0.5));
    if (v < oMin) oMin = v;
    if (v < 0.005) oSilent++;
  }
  const oSec = [];
  for (let s = 0; s < Math.floor(o.dur); s++) oSec.push(rms(o.L, s * o.sr, (s + 1) * o.sr));
  const oS = [...oSec].sort((a, b) => a - b);
  console.log(`  duration                ${o.dur.toFixed(1)} s`);
  console.log(`  loop wrap level dip     ${oWrapDip} dB  (tail->head, 100ms windows)`);
  console.log(`  head vs reference       ${(20*Math.log10(oAfter/oRef)).toFixed(2)} dB  (this was the audible "hole")`);
  console.log(`  quietest 0.5s window    ${oMin.toFixed(5)}   near-silent windows: ${oSilent}`);
  console.log(`  max/min 1s spread       ${(20*Math.log10(oS[oS.length-1]/oS[0])).toFixed(2)} dB`);
  console.log(`  repeats in 2 min        ${(120/o.dur).toFixed(2)}`);
} else {
  console.log("  (pass the old wav path as argv[3] to compare)");
}
