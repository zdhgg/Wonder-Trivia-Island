"""生成知识岛页面的「轻柔海浪环境声」循环。

为什么不直接找一个现成的海浪 mp3：
本仓库里所有音频素材都是自带的合成结果（见 generate_audio_assets.py），
音频来源清楚、可复现、不会带进第三方版权。所以这里同样用纯 Python 合成，
不引入任何来源不明的外部资源。

声音是怎么做出来的（全部是"周期 = 循环长度"的分量，保证循环点天然对齐）：
  1) 底噪层：白噪声过一级单极点低通，得到"海面隆隆的底"；
  2) 浪花层：白噪声过更亮的一级低通，得到"泡沫的沙沙声"，
     用一个 6 秒周期（12 秒里正好两轮）的尖锐包络去推它，
     于是每 6 秒涌过来一次稍响的浪；
  3) 起伏层：几个周期分别是 3 / 4 / 6 秒的低频正弦叠在一起当总包络，
     所有周期都能整除 12 秒，所以循环点前后完全对上。

循环衔接：
先多渲染 CROSSFADE_SECONDS 秒当作"尾巴"，再用等功率交叉淡化把这截尾巴
折回头部，最后只保留 12 秒。这样：
    输出[0]      = 尾巴[0]，正好接在输出[N-1] 后面 → 循环点连续；
    输出[X-1]    = 原始头部[X-1]，正好接在输出[X-2] 后面 → 折缝处也连续。
两处接缝都是连续的，所以循环听不出接点。

用法：
    python scripts/generate_island_waves.py
"""

from __future__ import annotations

import math
import random
import wave
from pathlib import Path

SAMPLE_RATE = 22050
LOOP_SECONDS = 12.0
CHANNELS = 2
# 底噪 / 浪花两层各自的目标峰值。整体先做低幅归一化，
# 运行时还会再乘一个很低的音量系数（见 frontend/src/audio/islandAmbience.js），
# 保证它只是背景，永远盖不住学习页面的提示音与讲解声。
BED_PEAK = 0.34
FOAM_PEAK = 0.26
NORMALIZE_PEAK = 0.52
# 交叉淡化长度：海浪比音效需要更长的过渡，太短会听得出接缝。
CROSSFADE_SECONDS = 1.5
OUTPUT_PATH = (
    Path(__file__).resolve().parents[1]
    / "frontend"
    / "src"
    / "assets"
    / "audio"
    / "island-waves-loop.wav"
)

# 一级单极点低通系数。系数越小越暗：约等于 fc ≈ SAMPLE_RATE * a / (2π)。
BED_LP_COEFFICIENT = 0.055
FOAM_LP_COEFFICIENT = 0.34
# 立体声去相关程度：0 = 完全相同（单声道），1 = 两路完全独立。
STEREO_DECORRELATION = 0.55


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def total_samples() -> int:
    return int(LOOP_SECONDS * SAMPLE_RATE)


def swell_envelope(elapsed: float) -> float:
    """整段循环的总包络。

    三个分量的周期分别是 3 / 4 / 6 秒——都能整除 12 秒，
    所以 elapsed = 0 与 elapsed = 12 的取值完全相同，循环点不会跳。
    """
    slow = math.sin(2.0 * math.pi * elapsed / 6.0)
    mid = math.sin(2.0 * math.pi * elapsed / 4.0 + 0.9)
    fast = math.sin(2.0 * math.pi * elapsed / 3.0 + 2.1)
    combined = 0.55 + 0.30 * slow + 0.18 * mid + 0.09 * fast

    return clamp(combined, 0.0, 1.4)


def wave_break_envelope(elapsed: float) -> float:
    """浪花层的包络：每 6 秒涌过来一次稍响的浪。

    pow 把它压成"大部分时间很轻、偶尔一次明显"的形状，
    这样听起来才像一波一波的浪，而不是持续的沙沙声。
    """
    rise = 0.5 + 0.5 * math.sin(2.0 * math.pi * elapsed / 6.0 - 1.2)

    return clamp(rise, 0.0, 1.0) ** 3


def crossfade_samples() -> int:
    return int(CROSSFADE_SECONDS * SAMPLE_RATE)


def fold_tail_into_head(buffer: list[float], loop_samples: int) -> list[float]:
    """把多渲染出来的那截尾巴等功率交叉淡化地折回头部，然后截回循环长度。

    buffer 的长度是 loop_samples + overlap_samples，其中：
        buffer[0 .. loop_samples-1]   是我们要保留的循环本体；
        buffer[loop_samples .. ]      是本体之后自然延续的尾巴。

    折完之后：
        输出[0]     = 尾巴[0]（cos 项占满），它正好是 输出[loop_samples-1] 的下一拍；
        输出[X-1]   = 原始本体[X-1]（sin 项占满），它正好是 输出[X-2] 的下一拍。
    所以"折缝"和"循环缝"两处都听不出接点。
    """
    overlap = min(crossfade_samples(), len(buffer) - loop_samples)

    for index in range(overlap):
        blend = index / max(1, overlap - 1)
        tail_weight = math.cos(blend * math.pi * 0.5)
        head_weight = math.sin(blend * math.pi * 0.5)
        head_sample = buffer[index]
        tail_sample = buffer[loop_samples + index]
        buffer[index] = tail_sample * tail_weight + head_sample * head_weight

    return buffer[:loop_samples]


def render_channel(seed: int) -> list[float]:
    """渲染一路立体声（含多出来的那截尾巴）。

    固定随机种子 → 每次生成的字节完全一样，素材可复现、可审阅。
    """
    rng = random.Random(seed)
    loop_samples = total_samples()
    overlap = crossfade_samples()
    rendered = [0.0] * (loop_samples + overlap)

    bed_state = 0.0
    foam_state = 0.0

    for index in range(len(rendered)):
        elapsed = index / SAMPLE_RATE
        # 包络按 12 秒取模，所以尾巴那一段的包络和循环本体是同一条连续曲线。
        phase = elapsed % LOOP_SECONDS
        swell = swell_envelope(phase)
        wave_break = wave_break_envelope(phase)

        # 底噪：低通白噪声。
        bed_state += (rng.uniform(-1.0, 1.0) - bed_state) * BED_LP_COEFFICIENT
        # 浪花：更亮的低通白噪声，音量随涌浪包络起伏。
        foam_state += (rng.uniform(-1.0, 1.0) - foam_state) * FOAM_LP_COEFFICIENT

        # 涌浪时底噪更沉（振幅更大），退潮时更弱，这就是"起伏"。
        bed_gain = BED_PEAK * (0.42 + 0.58 * swell)
        foam_gain = FOAM_PEAK * (0.16 + 0.84 * wave_break) * (0.5 + 0.5 * swell)

        rendered[index] = bed_state * bed_gain + foam_state * foam_gain

    return rendered


def decorrelate(left_channel: list[float], right_channel: list[float]) -> None:
    """让两路不完全一样，听上去才是"一片海"而不是贴在耳朵上的单声道。"""
    blend = STEREO_DECORRELATION

    for index in range(len(right_channel)):
        right_channel[index] = right_channel[index] * (1.0 - blend) + left_channel[index] * blend


def normalize_and_write(path: Path, left_channel: list[float], right_channel: list[float]) -> None:
    peak = max(
        max((abs(sample) for sample in left_channel), default=0.0),
        max((abs(sample) for sample in right_channel), default=0.0),
        0.001,
    )
    normalization_gain = NORMALIZE_PEAK / peak
    pcm_frames = bytearray()

    for left_sample, right_sample in zip(left_channel, right_channel):
        left_pcm = int(clamp(left_sample * normalization_gain, -1.0, 1.0) * 32767)
        right_pcm = int(clamp(right_sample * normalization_gain, -1.0, 1.0) * 32767)
        pcm_frames.extend(left_pcm.to_bytes(2, byteorder="little", signed=True))
        pcm_frames.extend(right_pcm.to_bytes(2, byteorder="little", signed=True))

    path.parent.mkdir(parents=True, exist_ok=True)

    with wave.open(str(path), "wb") as wave_file:
        wave_file.setnchannels(CHANNELS)
        wave_file.setsampwidth(2)
        wave_file.setframerate(SAMPLE_RATE)
        wave_file.writeframes(pcm_frames)


def create_island_waves_loop() -> tuple[list[float], list[float]]:
    loop_samples = total_samples()
    left_channel = render_channel(seed=20260930)
    right_channel = render_channel(seed=20260931)

    decorrelate(left_channel, right_channel)

    return (
        fold_tail_into_head(left_channel, loop_samples),
        fold_tail_into_head(right_channel, loop_samples),
    )


def main() -> None:
    left_channel, right_channel = create_island_waves_loop()
    normalize_and_write(OUTPUT_PATH, left_channel, right_channel)
    print(f"Success! Island waves loop written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
