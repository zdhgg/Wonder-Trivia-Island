"""Objective acceptance metrics for the default BGM asset.

Kept in scripts/ so the BGM can be re-measured after any regeneration instead of
being judged by ear alone. Pure stdlib, so it runs anywhere Python does.

Usage:
    python scripts/verify_bgm.py [path-to-wav]
"""
from __future__ import annotations

import math
import sys
import wave
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WAV = REPO_ROOT / "frontend" / "src" / "assets" / "audio" / "island-bgm-loop.wav"

# Reference figures from the pre-optimisation 24 s asset, measured with the same
# averaged-FFT method this script uses (not estimated).
BASELINE = {
    "durationSec": 24.0,
    "fileBytes": 2116844,
    "peak": 0.8193,
    "rms": 0.2202,
    "rmsDbfs": -13.14,
    "crestDb": 11.29,
    "p95OverP05Db": 1.31,
    "p75OverP25Db": 1.31,
    "highMinusMidDb": -30.97,
    "midMinusLowDb": 3.29,
    "seamDipDbVsMid": -12.8,
}


def read_wav(path: Path) -> tuple[list[float], list[float], int, int, int]:
    with wave.open(str(path), "rb") as handle:
        channels = handle.getnchannels()
        width = handle.getsampwidth()
        rate = handle.getframerate()
        frames = handle.readframes(handle.getnframes())

    if width != 2:
        raise SystemExit(f"expected 16-bit PCM, got {width * 8}-bit")

    count = len(frames) // (2 * channels)
    left: list[float] = [0.0] * count
    right: list[float] = [0.0] * count

    for index in range(count):
        base = index * channels * 2
        left[index] = int.from_bytes(frames[base : base + 2], "little", signed=True) / 32768
        if channels == 2:
            right[index] = int.from_bytes(frames[base + 2 : base + 4], "little", signed=True) / 32768
        else:
            right[index] = left[index]

    return left, right, rate, channels, width


def db(value: float) -> float:
    return 20 * math.log10(value + 1e-12)


def _fft(re: list[float], im: list[float]) -> None:
    """In-place iterative radix-2 FFT."""
    n = len(re)
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j |= bit
        if i < j:
            re[i], re[j] = re[j], re[i]
            im[i], im[j] = im[j], im[i]

    length = 2
    while length <= n:
        angle = -2.0 * math.pi / length
        wr = math.cos(angle)
        wi = math.sin(angle)
        half = length // 2
        for start in range(0, n, length):
            cr, ci = 1.0, 0.0
            for k in range(half):
                ur, ui = re[start + k], im[start + k]
                ar = re[start + k + half]
                ai = im[start + k + half]
                vr = ar * cr - ai * ci
                vi = ar * ci + ai * cr
                re[start + k] = ur + vr
                im[start + k] = ui + vi
                re[start + k + half] = ur - vr
                im[start + k + half] = ui - vi
                cr, ci = cr * wr - ci * wi, cr * wi + ci * wr
        length <<= 1


def analyse(path: Path) -> dict:
    left, right, rate, channels, width = read_wav(path)
    total = len(left)
    duration = total / rate

    peak = 0.0
    clipped = 0
    sum_squares = 0.0
    for index in range(total):
        value = max(abs(left[index]), abs(right[index]))
        if value > peak:
            peak = value
        if value >= 0.999:
            clipped += 1
        sum_squares += (left[index] ** 2 + right[index] ** 2) / 2
    rms = math.sqrt(sum_squares / total)

    # --- loop seam: last sample -> first sample, plus a +/-100 ms window ---
    seam_step = abs(left[0] - left[-1])
    seam_step_r = abs(right[0] - right[-1])
    window = int(rate * 0.1)
    def window_rms(channel: list[float], start: int, stop: int) -> float:
        start = max(0, start)
        stop = min(total, stop)
        return math.sqrt(sum(v * v for v in channel[start:stop]) / max(1, stop - start))

    head_rms = window_rms(left, 0, window)
    tail_rms = window_rms(left, total - window, total)
    mid_start = int(rate * duration * 0.4)
    mid_stop = int(rate * duration * 0.6)
    mid_rms = window_rms(left, mid_start, mid_stop)

    # Largest sample-to-sample jump anywhere, plus how it compares with the
    # typical jump. A real click is an isolated outlier; a track with genuine
    # high-frequency content has a uniformly higher sample-to-sample delta.
    deltas = [abs(left[i] - left[i - 1]) for i in range(1, total)]
    ordered_deltas = sorted(deltas)
    max_jump = ordered_deltas[-1]
    p999_jump = ordered_deltas[int(len(ordered_deltas) * 0.999)]
    max_jump_at = deltas.index(max_jump) / rate + 1.0 / rate

    # --- dynamics over 0.5 s windows ---
    win = int(rate * 0.5)
    env: list[float] = []
    for start in range(0, total - win, win):
        acc = 0.0
        for index in range(start, start + win):
            acc += (left[index] ** 2 + right[index] ** 2) / 2
        env.append(math.sqrt(acc / win))
    ordered = sorted(env)
    p05 = ordered[int(len(ordered) * 0.05)]
    p25 = ordered[int(len(ordered) * 0.25)]
    p50 = ordered[int(len(ordered) * 0.50)]
    p75 = ordered[int(len(ordered) * 0.75)]
    p95 = ordered[int(len(ordered) * 0.95)]

    # --- band energy via a real averaged FFT (low <250, mid 250-2k, high 2k-Nyq) ---
    # A one-pole proxy was tried first and turned out to under-report the top
    # band badly, so this uses an actual Hann-windowed FFT and sums every bin.
    fft_size = 8192
    hop = fft_size // 2
    re = [0.0] * fft_size
    im = [0.0] * fft_size
    spectrum = [0.0] * (fft_size // 2)
    windows = 0
    for start in range(0, total - fft_size, hop):
        for i in range(fft_size):
            window = 0.5 - 0.5 * math.cos(2.0 * math.pi * i / (fft_size - 1))
            re[i] = (left[start + i] if start + i < total else 0.0) * window
            im[i] = 0.0
        _fft(re, im)
        for k in range(fft_size // 2):
            spectrum[k] += re[k] * re[k] + im[k] * im[k]
        windows += 1

    if windows:
        spectrum = [v / windows for v in spectrum]
        bin_hz = rate / fft_size
        nyquist = rate / 2.0

        def band_energy(lo: float, hi: float) -> float:
            first = max(0, int(lo / bin_hz))
            last = min(len(spectrum) - 1, int(hi / bin_hz))
            return 10.0 * math.log10(sum(spectrum[first : last + 1]) + 1e-20)

        low_db = band_energy(20, 250)
        mid_db = band_energy(250, 2000)
        high_db = band_energy(2000, nyquist)
    else:
        low_db = mid_db = high_db = -200.0

    # --- section similarity: are the 8 s blocks distinguishable? ---
    section_len = int(rate * 8)
    section_count = max(1, total // section_len)
    envelopes: list[list[float]] = []
    step = max(1, int(rate * 0.05))
    for index in range(section_count):
        base = index * section_len
        env_row = []
        for offset in range(0, section_len - step, step):
            chunk = 0.0
            for k in range(offset, offset + step):
                chunk += (left[base + k] ** 2 + right[base + k] ** 2) / 2
            env_row.append(math.sqrt(chunk / step))
        envelopes.append(env_row)

    def pearson(a: list[float], b: list[float]) -> float:
        size = min(len(a), len(b))
        mean_a = sum(a[:size]) / size
        mean_b = sum(b[:size]) / size
        num = den_a = den_b = 0.0
        for index in range(size):
            da = a[index] - mean_a
            db_ = b[index] - mean_b
            num += da * db_
            den_a += da * da
            den_b += db_ * db_
        return num / math.sqrt(den_a * den_b) if den_a and den_b else 0.0

    pairs = []
    for i in range(len(envelopes)):
        for j in range(i + 1, len(envelopes)):
            pairs.append(pearson(envelopes[i], envelopes[j]))
    mean_similarity = sum(pairs) / len(pairs) if pairs else 0.0

    # --- onsets per second (is there still a fixed beat grid?) ---
    # Flux-based: rising energy in a short analysis window, with a refractory
    # period so one note cannot register several times.  Reported alongside a
    # "how grid-locked is it" figure: if the onsets land on a fixed subdivision
    # the loop feels metronomic.
    hop = int(rate * 0.01)
    win = int(rate * 0.04)
    envelope = []
    for start in range(0, total - win, hop):
        acc = 0.0
        for index in range(start, start + win):
            acc += (left[index] ** 2 + right[index] ** 2) / 2
        envelope.append(math.sqrt(acc / win))

    flux = [0.0]
    for index in range(1, len(envelope)):
        flux.append(max(0.0, envelope[index] - envelope[index - 1]))

    if flux:
        mean_flux = sum(flux) / len(flux)
        threshold = mean_flux * 1.9
        refractory = int(0.22 / 0.01)
        onset_times: list[float] = []
        last_onset = -refractory
        for index in range(1, len(flux) - 1):
            if flux[index] > threshold and flux[index] >= flux[index - 1] and flux[index] >= flux[index + 1]:
                if index - last_onset >= refractory:
                    onset_times.append(index * 0.01)
                    last_onset = index

        # Grid-lockedness: if the gaps between onsets cluster on one value, the
        # rhythm is a fixed grid. Spread-out gaps mean the rhythm is free.
        gaps = [
            round(onset_times[i] - onset_times[i - 1], 2)
            for i in range(1, len(onset_times))
            if onset_times[i] - onset_times[i - 1] < 3.0
        ]
        gap_counts: dict[float, int] = {}
        for gap in gaps:
            gap_counts[gap] = gap_counts.get(gap, 0) + 1
        dominant_gap_share = (max(gap_counts.values()) / len(gaps)) if gaps else 0.0
    else:
        onset_times = []
        dominant_gap_share = 0.0

    # --- dropout scan: any half-second window that is effectively silent ---
    # A section whose harmony stops before the section ends leaves an audible
    # hole even when the loop seam itself is perfect, so scan the whole file.
    scan = int(rate * 0.5)
    quietest = float("inf")
    quietest_at = 0.0
    silent_windows = 0
    window_rms_all: list[float] = []
    for start in range(0, total, scan):
        acc = 0.0
        count = 0
        for index in range(start, min(total, start + scan)):
            acc += (left[index] ** 2 + right[index] ** 2) / 2
            count += 1
        if not count:
            break
        value = math.sqrt(acc / count)
        window_rms_all.append(value)
        if value < quietest:
            quietest = value
            quietest_at = start / rate
        if value < 0.01 * rms:
            silent_windows += 1

    return {
        "path": str(path),
        "fileBytes": path.stat().st_size,
        "sampleRate": rate,
        "channels": channels,
        "bitDepth": width * 8,
        "durationSec": round(duration, 4),
        "inTargetRange48to72": 48.0 <= duration <= 72.0,
        "peak": round(peak, 4),
        "peakDbfs": round(db(peak), 2),
        "rms": round(rms, 4),
        "rmsDbfs": round(db(rms), 2),
        "crestDb": round(db(peak) - db(rms), 2),
        "clippedSamples": clipped,
        "p05": round(p05, 4),
        "p25": round(p25, 4),
        "p50": round(p50, 4),
        "p75": round(p75, 4),
        "p95": round(p95, 4),
        "p95OverP05Db": round(db(p95) - db(p05), 2),
        "p75OverP25Db": round(db(p75) - db(p25), 2),
        "lowDb": round(low_db, 2),
        "midDb": round(mid_db, 2),
        "highDb": round(high_db, 2),
        "midMinusLowDb": round(mid_db - low_db, 2),
        "highMinusMidDb": round(high_db - mid_db, 2),
        "seamStepLeft": round(seam_step, 6),
        "seamStepRight": round(seam_step_r, 6),
        "headRms100ms": round(head_rms, 5),
        "tailRms100ms": round(tail_rms, 5),
        "midRms100ms": round(mid_rms, 5),
        "seamDipDbVsMid": round(db(tail_rms) - db(mid_rms), 2),
        "maxSampleJump": round(max_jump, 5),
        "maxSampleJumpAtSec": round(max_jump_at, 3),
        "p999SampleJump": round(p999_jump, 5),
        "maxOverP999Jump": round(max_jump / (p999_jump + 1e-12), 2),
        "sectionCount": section_count,
        "meanSectionSimilarity": round(mean_similarity, 3),
        "maxSectionSimilarity": round(max(pairs), 3) if pairs else 0.0,
        "onsetsPerSec": round(len(onset_times) / duration, 2),
        "dominantGapShare": round(dominant_gap_share, 3),
        "quietestHalfSecRms": round(quietest, 5),
        "quietestHalfSecAtSec": round(quietest_at, 2),
        "nearSilentWindows": silent_windows,
        "quietestVsMeanDb": round(db(quietest) - db(rms), 2),
    }


def verdict(metrics: dict) -> list[tuple[bool, str]]:
    return [
        (metrics["inTargetRange48to72"], f"duration {metrics['durationSec']}s in 48-72s"),
        (metrics["channels"] == 2, f"stereo preserved ({metrics['channels']} ch)"),
        (metrics["sampleRate"] == 22050, f"sample rate preserved ({metrics['sampleRate']})"),
        (metrics["bitDepth"] == 16, "16-bit preserved"),
        (metrics["clippedSamples"] == 0, "no clipped samples"),
        # p05 is near zero by design (the loop opens where the previous pass
        # ring-out is still decaying), so use the 25th percentile instead, which
        # measures the musical dynamic range rather than the loop boundary.
        (metrics["p75OverP25Db"] > 3.0, f"dynamics p75/p25 = {metrics['p75OverP25Db']} dB > 3 dB (was 1.31)"),
        (metrics["highMinusMidDb"] > -10.0, f"high-mid {metrics['highMinusMidDb']} dB > -10 dB (was -30.97)"),
        (-6.0 <= metrics["midMinusLowDb"] <= 6.0, f"mid-low {metrics['midMinusLowDb']} dB, bass not dominant"),
        (metrics["seamDipDbVsMid"] > -3.0, f"loop seam dip {metrics['seamDipDbVsMid']} dB > -3 dB (was -12.8)"),
        (metrics["seamStepLeft"] < 0.02, f"seam sample step {metrics['seamStepLeft']} (no click)"),
        (metrics["maxOverP999Jump"] < 2.5, f"no isolated click (max/p99.9 jump {metrics['maxOverP999Jump']} < 2.5)"),
        (metrics["meanSectionSimilarity"] < 0.8, f"section similarity {metrics['meanSectionSimilarity']} < 0.8 (was 0.88)"),
        (metrics["dominantGapShare"] < 0.35, f"rhythm not grid-locked (dominant gap share {metrics['dominantGapShare']} < 0.35)"),
        # No dead air anywhere: a quiet passage is fine, silence is not.
        (metrics["nearSilentWindows"] == 0, f"no near-silent 0.5s windows (found {metrics['nearSilentWindows']})"),
        (metrics["quietestVsMeanDb"] > -18.0, f"quietest passage {metrics['quietestVsMeanDb']} dB vs mean > -18 dB"),
    ]


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WAV
    metrics = analyse(path)

    print("=" * 72)
    print("BGM asset metrics:", metrics["path"])
    print("=" * 72)
    for key, value in metrics.items():
        if key != "path":
            print(f"  {key:28} {value}")

    print("\n" + "-" * 72)
    print(f"{'metric':30} {'before':>12} {'after':>12}")
    print("-" * 72)
    for label, key, fmt in [
        ("duration (s)", "durationSec", "{:.2f}"),
        ("file size (MB)", "fileBytes", "{:.2f}"),
        ("peak", "peak", "{:.4f}"),
        ("rms", "rms", "{:.4f}"),
        ("crest (dB)", "crestDb", "{:.2f}"),
        ("p75/p25 dynamic (dB)", "p75OverP25Db", "{:.2f}"),
        ("mid-low (dB)", "midMinusLowDb", "{:.2f}"),
        ("high-mid (dB)", "highMinusMidDb", "{:.2f}"),
        ("seam dip (dB)", "seamDipDbVsMid", "{:.2f}"),
    ]:
        before_value = BASELINE.get(key)
        if before_value is None:
            before_text = "-"
        elif key == "fileBytes":
            before_text = f"{before_value / 1048576:.2f}"
        else:
            before_text = fmt.format(before_value)
        print(f"{label:30} {before_text:>12} {fmt.format(metrics[key]):>12}")

    print("\n" + "=" * 72)
    print("Acceptance criteria")
    print("=" * 72)
    checks = verdict(metrics)
    for passed, description in checks:
        print(f"  [{'PASS' if passed else 'FAIL'}] {description}")
    failures = [d for ok, d in checks if not ok]
    print()
    if failures:
        print(f"RESULT: {len(failures)} check(s) failing")
        return 1
    print("RESULT: all checks pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
