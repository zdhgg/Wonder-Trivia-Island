from __future__ import annotations

import argparse
import csv
import math
import sys
import wave
from array import array
from pathlib import Path

DEFAULT_SAMPLE_RATE = 16000
DEFAULT_SAMPLE_WIDTH = 2
DEFAULT_TRIM_THRESHOLD = 220
DEFAULT_CHUNK_MS = 20
DEFAULT_PADDING_MS = 80


def normalize_relative_path(value: str) -> str:
    return str(value).replace("\\", "/").strip()


def load_selection_targets(selection_tsv: Path) -> tuple[set[str], set[str]]:
    selected_targets: set[str] = set()
    selected_lessons: set[str] = set()

    with selection_tsv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            lesson_id = normalize_relative_path(row.get("lessonId") or "")
            if lesson_id:
                selected_lessons.add(lesson_id)

            relative_target = normalize_relative_path(row.get("suggestedTarget") or row.get("expectedAssetPath") or "")
            if not relative_target:
                continue

            selected_targets.add(str(Path(relative_target).with_suffix(".wav")).replace("\\", "/"))

    return selected_targets, selected_lessons


def trim_silence(
    samples: list[int],
    sample_rate: int,
    threshold: int,
    chunk_ms: int,
    padding_ms: int,
) -> list[int]:
    if not samples:
        return samples

    samples_per_chunk = max(1, int(sample_rate * chunk_ms / 1000))
    padding_samples = max(0, int(sample_rate * padding_ms / 1000))

    first_sound = None
    last_sound = None

    for offset in range(0, len(samples), samples_per_chunk):
        chunk = samples[offset : offset + samples_per_chunk]
        if not chunk:
            continue

        rms = math.sqrt(sum(sample * sample for sample in chunk) / len(chunk))
        if rms > threshold:
            if first_sound is None:
                first_sound = offset
            last_sound = offset + len(chunk)

    if first_sound is None or last_sound is None:
        return samples

    start = max(0, first_sound - padding_samples)
    end = min(len(samples), last_sound + padding_samples)
    return samples[start:end]


def unpack_pcm_samples(frames: bytes, sample_width: int) -> list[int]:
    if sample_width == 2:
        pcm_samples = array("h")
        pcm_samples.frombytes(frames)
        if sys.byteorder != "little":
            pcm_samples.byteswap()
        return pcm_samples.tolist()

    if sample_width == 1:
        return [((sample - 128) << 8) for sample in frames]

    if sample_width == 4:
        pcm_samples = array("i")
        pcm_samples.frombytes(frames)
        if sys.byteorder != "little":
            pcm_samples.byteswap()
        return [max(-32768, min(32767, sample >> 16)) for sample in pcm_samples]

    raise ValueError(f"Unsupported sample width: {sample_width}")


def pack_pcm_samples(samples: list[int]) -> bytes:
    pcm_samples = array("h", (max(-32768, min(32767, int(sample))) for sample in samples))
    if sys.byteorder != "little":
        pcm_samples.byteswap()
    return pcm_samples.tobytes()


def mix_to_mono(samples: list[int], channels: int) -> list[int]:
    if channels == 1:
        return samples

    if channels == 2:
        return [int((samples[index] + samples[index + 1]) / 2) for index in range(0, len(samples), 2)]

    raise ValueError(f"Unsupported channel count: {channels}")


def resample_linear(samples: list[int], source_rate: int, target_rate: int) -> list[int]:
    if not samples or source_rate == target_rate:
        return samples

    target_length = max(1, round(len(samples) * target_rate / source_rate))
    if target_length == 1:
        return [samples[0]]

    source_last_index = len(samples) - 1
    resampled = []

    for target_index in range(target_length):
        source_position = target_index * source_last_index / (target_length - 1)
        left_index = int(source_position)
        right_index = min(source_last_index, left_index + 1)
        blend = source_position - left_index
        sample_value = samples[left_index] * (1 - blend) + samples[right_index] * blend
        resampled.append(int(round(sample_value)))

    return resampled


def optimize_wav_file(
    wav_path: Path,
    target_rate: int,
    threshold: int,
    chunk_ms: int,
    padding_ms: int,
) -> tuple[int, int]:
    original_size = wav_path.stat().st_size

    with wave.open(str(wav_path), "rb") as source_wave:
        channels = source_wave.getnchannels()
        sample_width = source_wave.getsampwidth()
        sample_rate = source_wave.getframerate()
        frames = source_wave.readframes(source_wave.getnframes())

    samples = unpack_pcm_samples(frames, sample_width)
    samples = mix_to_mono(samples, channels)
    channels = 1
    sample_width = DEFAULT_SAMPLE_WIDTH
    samples = trim_silence(samples, sample_rate, threshold, chunk_ms, padding_ms)
    samples = resample_linear(samples, sample_rate, target_rate)
    sample_rate = target_rate
    frames = pack_pcm_samples(samples)

    with wave.open(str(wav_path), "wb") as optimized_wave:
        optimized_wave.setnchannels(channels)
        optimized_wave.setsampwidth(sample_width)
        optimized_wave.setframerate(sample_rate)
        optimized_wave.writeframes(frames)

    return original_size, wav_path.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description="Trim and downsample study narration WAV assets.")
    parser.add_argument("--root", default="frontend/src/assets/audio/study", help="Directory containing study WAV assets.")
    parser.add_argument("--selection-tsv", default="", help="Optional TSV file limiting which assets to optimize.")
    parser.add_argument("--target-rate", type=int, default=DEFAULT_SAMPLE_RATE, help="Target WAV sample rate.")
    parser.add_argument("--threshold", type=int, default=DEFAULT_TRIM_THRESHOLD, help="Silence trim RMS threshold.")
    parser.add_argument("--chunk-ms", type=int, default=DEFAULT_CHUNK_MS, help="Trim analysis chunk size in ms.")
    parser.add_argument("--padding-ms", type=int, default=DEFAULT_PADDING_MS, help="Silence padding kept around speech.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    selection_targets, selection_lessons = load_selection_targets(Path(args.selection_tsv).resolve()) if args.selection_tsv else (set(), set())

    if not root.exists():
        raise FileNotFoundError(f"Study audio root not found: {root}")

    wav_paths = sorted(root.rglob("*.wav"))

    if selection_targets or selection_lessons:
        wav_paths = [
            wav_path
            for wav_path in wav_paths
            if normalize_relative_path(str(wav_path.relative_to(Path.cwd()))) in selection_targets
            or any(part in selection_lessons for part in wav_path.parts)
        ]

    if not wav_paths:
        print("No WAV assets matched current filters.")
        return

    total_original = 0
    total_optimized = 0

    for wav_path in wav_paths:
        original_size, optimized_size = optimize_wav_file(
            wav_path=wav_path,
            target_rate=args.target_rate,
            threshold=args.threshold,
            chunk_ms=args.chunk_ms,
            padding_ms=args.padding_ms,
        )
        total_original += original_size
        total_optimized += optimized_size
        print(f"Optimized {wav_path} :: {original_size} -> {optimized_size} bytes")

    saved_bytes = total_original - total_optimized
    saved_percent = (saved_bytes / total_original * 100) if total_original else 0
    print(
        f"Optimized {len(wav_paths)} files :: {total_original} -> {total_optimized} bytes "
        f"(saved {saved_bytes} bytes, {saved_percent:.1f}%)"
    )


if __name__ == "__main__":
    main()
