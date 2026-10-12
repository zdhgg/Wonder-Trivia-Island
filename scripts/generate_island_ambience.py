"""Build the island's 48-second wave loop and three real gull calls.

Run: python scripts/generate_island_ambience.py --gull-source PATH
Or:  python scripts/generate_island_ambience.py --download

Only --download accesses the network. The gull source is CC0; its URL, checksum,
credit and edit details are recorded in frontend/src/assets/audio/SOURCES.md.
The wave loop is synthesized locally with deterministic, irregular swells.
Requires the repository's ffmpeg-static dependency (or ffmpeg on PATH).
"""
from __future__ import annotations

import argparse
import array
import hashlib
import math
import random
import shutil
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "frontend/src/assets/audio"
SAMPLE_RATE = 24000
LOOP_SECONDS = 48
CROSSFADE_SECONDS = 2
GULL_URL = "https://upload.wikimedia.org/wikipedia/commons/5/5c/XC707075_-_European_Herring_Gull_-_Larus_argentatus.mp3"
GULL_SHA256 = "ae6efd68b13693c81b875720af6783eea5281a6606d27c67673d420424d59fea"
# Distinct isolated flight calls, including a little natural onset and decay.
GULL_SEGMENTS = ((4.50, 0.78), (5.24, 0.82), (6.06, 0.93))


def write_pcm(path, left, right, rms_db=-21, peak_limit=0.5):
    peak = max(max(map(abs, left)), max(map(abs, right)), 0.001)
    rms = math.sqrt(sum(v*v for v in left + right) / (len(left) + len(right)))
    gain = min(peak_limit / peak, 10 ** (rms_db / 20) / max(rms, 0.00001))
    pcm = array.array("h")
    for l, r in zip(left, right):
        pcm.extend((round(l * gain * 32767), round(r * gain * 32767)))
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())
    print(f"{path.name}: {len(left)/SAMPLE_RATE:.2f}s, RMS {20*math.log10(rms*gain):.1f} dBFS")


def create_waves():
    # Swell positions, durations and heights vary over the entire loop.
    rng = random.Random(20261001)
    swells = []
    position = 0
    while position < LOOP_SECONDS:
        swells.append((position, rng.uniform(5.5, 9.5), rng.uniform(0.6, 1.0)))
        position += rng.uniform(4.5, 7.5)

    def envelope(elapsed):
        phase = elapsed % LOOP_SECONDS
        energy = 0.0
        for start, duration, height in swells:
            progress = ((phase - start) % LOOP_SECONDS) / duration
            if progress < 1:
                energy += height * math.sin(math.pi * progress) ** 2
        return energy

    # Interpolate an envelope table rather than repeating trigonometry per sample.
    envelopes = [envelope(i / 100) for i in range(LOOP_SECONDS * 100 + 1)]
    count = int((LOOP_SECONDS + CROSSFADE_SECONDS) * SAMPLE_RATE)
    channels = []
    for seed in (20261002, 20261003):
        rng = random.Random(seed)
        bed = foam = 0.0
        channel = []
        for i in range(count):
            phase = (i / SAMPLE_RATE % LOOP_SECONDS) * 100
            whole = int(phase)
            mix = phase - whole
            swell = envelopes[whole] * (1-mix) + envelopes[whole+1] * mix
            bed += (rng.uniform(-1, 1) - bed) * 0.055
            foam += (rng.uniform(-1, 1) - foam) * 0.30
            channel.append(bed * (0.18 + 0.26*swell) + foam * (0.018 + 0.18*swell*swell))
        channels.append(channel)
    # Slight stereo correlation keeps the sea wide without a phase trick.
    left, right = channels
    right = [0.7*r + 0.3*l for l, r in zip(left, right)]
    loop = LOOP_SECONDS * SAMPLE_RATE
    overlap = CROSSFADE_SECONDS * SAMPLE_RATE
    for channel in (left, right):
        for i in range(overlap):
            phase = i / (overlap-1) * math.pi/2
            channel[i] = channel[loop+i]*math.cos(phase) + channel[i]*math.sin(phase)
    write_pcm(AUDIO_DIR / "island-waves-loop.wav", left[:loop], right[:loop], peak_limit=0.52)


def create_gulls(source):
    checksum = hashlib.sha256(source.read_bytes()).hexdigest()
    if checksum != GULL_SHA256:
        raise ValueError(f"Unexpected source checksum: {checksum}")
    bundled = ROOT / "node_modules/ffmpeg-static" / ("ffmpeg.exe" if sys.platform == "win32" else "ffmpeg")
    ffmpeg = str(bundled) if bundled.exists() else shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("Run npm install to install ffmpeg-static.")
    for index, (start, duration) in enumerate(GULL_SEGMENTS):
        filters = "highpass=f=400,lowpass=f=4400,afftdn=nr=8:nf=-38,equalizer=f=2500:t=q:w=0.9:g=-2"
        result = subprocess.run([
            ffmpeg, "-v", "error", "-ss", str(start), "-i", str(source),
            "-t", str(duration), "-af", filters, "-ac", "1", "-ar", str(SAMPLE_RATE),
            "-f", "f32le", "pipe:1"
        ], check=True, capture_output=True)
        samples = array.array("f")
        samples.frombytes(result.stdout)
        if sys.byteorder != "little":
            samples.byteswap()
        # No pitch shifting: retain the real call, only soften its edges.
        for i in range(len(samples)):
            attack = min(1.0, i / (SAMPLE_RATE * 0.045))
            release = min(1.0, (len(samples)-1-i) / (SAMPLE_RATE * 0.13))
            samples[i] *= math.sin(attack*math.pi/2) * math.sin(release*math.pi/2)
        # The visible gull is slightly right of center; keep the image subtle.
        left_gain = (0.92, 0.96, 0.90)[index]
        left = [v*left_gain for v in samples]
        right = list(samples)
        suffix = "" if index == 0 else f"-{index+1}"
        write_pcm(AUDIO_DIR / f"island-gull-cry{suffix}.wav", left, right)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gull-source", type=Path, default=ROOT / "tmp/audio-sources/XC707075.mp3")
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    if args.download:
        args.gull_source.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(GULL_URL, headers={"User-Agent": "WonderTriviaIsland/1.0 (audio asset build)"})
        args.gull_source.write_bytes(urllib.request.urlopen(request, timeout=30).read())
    if not args.gull_source.is_file():
        parser.error("Provide --gull-source PATH or --download.")
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    create_gulls(args.gull_source)
    create_waves()


if __name__ == "__main__":
    main()
