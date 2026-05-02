from __future__ import annotations

import math
import random
import wave
from pathlib import Path

SAMPLE_RATE = 22050
MASTER_GAIN = 0.82
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "frontend" / "src" / "assets" / "audio"


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def pan_gains(pan: float) -> tuple[float, float]:
    normalized_pan = clamp(pan, -1.0, 1.0)
    left_gain = math.sqrt((1.0 - normalized_pan) * 0.5)
    right_gain = math.sqrt((1.0 + normalized_pan) * 0.5)
    return left_gain, right_gain


def note_to_frequency(note_name: str) -> float:
    note_offsets = {
        "C": 0,
        "C#": 1,
        "Db": 1,
        "D": 2,
        "D#": 3,
        "Eb": 3,
        "E": 4,
        "F": 5,
        "F#": 6,
        "Gb": 6,
        "G": 7,
        "G#": 8,
        "Ab": 8,
        "A": 9,
        "A#": 10,
        "Bb": 10,
        "B": 11,
    }
    pitch = note_name[:-1]
    octave = int(note_name[-1])
    semitone_offset = note_offsets[pitch] - 9 + (octave - 4) * 12
    return 440.0 * (2.0 ** (semitone_offset / 12.0))


def wave_sample(waveform: str, phase: float) -> float:
    wrapped_phase = phase % 1.0

    if waveform == "triangle":
        return 2.0 * abs(2.0 * wrapped_phase - 1.0) - 1.0

    if waveform == "saw":
        return 2.0 * wrapped_phase - 1.0

    if waveform == "soft_square":
        return math.tanh(2.8 * math.sin(2.0 * math.pi * wrapped_phase))

    if waveform == "noise":
        return random.uniform(-1.0, 1.0)

    return math.sin(2.0 * math.pi * wrapped_phase)


def note_envelope(
    elapsed: float,
    sustain_duration: float,
    attack: float,
    decay: float,
    sustain_level: float,
    release: float,
) -> float:
    if elapsed < 0.0:
        return 0.0

    if attack > 0.0 and elapsed < attack:
        return elapsed / attack

    elapsed -= attack

    if decay > 0.0 and elapsed < decay:
        return 1.0 - (1.0 - sustain_level) * (elapsed / decay)

    elapsed -= decay

    if elapsed < sustain_duration:
        return sustain_level

    elapsed -= sustain_duration

    if release > 0.0 and elapsed < release:
        return sustain_level * (1.0 - elapsed / release)

    return 0.0


def smooth_loop_edges(channel: list[float], overlap_duration: float) -> None:
    overlap_samples = min(int(overlap_duration * SAMPLE_RATE), len(channel) // 4)

    if overlap_samples <= 1:
        return

    head = channel[:overlap_samples]
    tail = channel[-overlap_samples:]

    for index in range(overlap_samples):
        blend = index / max(1, overlap_samples - 1)
        tail_weight = math.cos(blend * math.pi * 0.5)
        head_weight = math.sin(blend * math.pi * 0.5)
        blended_sample = tail[index] * tail_weight + head[index] * head_weight
        channel[index] = blended_sample
        channel[-overlap_samples + index] = blended_sample


def add_tone(
    left_channel: list[float],
    right_channel: list[float],
    *,
    start: float,
    duration: float,
    frequency: float,
    volume: float,
    waveform: str = "sine",
    pan: float = 0.0,
    attack: float = 0.01,
    decay: float = 0.08,
    sustain_level: float = 0.72,
    release: float = 0.12,
    vibrato_rate: float = 0.0,
    vibrato_depth: float = 0.0,
    harmonics: tuple[tuple[float, float], ...] = ((1.0, 1.0),),
) -> None:
    left_gain, right_gain = pan_gains(pan)
    note_start = max(0, int(start * SAMPLE_RATE))
    note_end = min(len(left_channel), int((start + duration + release) * SAMPLE_RATE))
    sustain_duration = max(0.0, duration - attack - decay)

    for sample_index in range(note_start, note_end):
        elapsed = sample_index / SAMPLE_RATE - start
        envelope = note_envelope(elapsed, sustain_duration, attack, decay, sustain_level, release)

        if envelope <= 0.0:
            continue

        current_frequency = frequency
        if vibrato_rate > 0.0 and vibrato_depth > 0.0:
            current_frequency *= 1.0 + vibrato_depth * math.sin(2.0 * math.pi * vibrato_rate * elapsed)

        composite_sample = 0.0
        for harmonic_multiplier, harmonic_gain in harmonics:
            phase = elapsed * current_frequency * harmonic_multiplier
            composite_sample += harmonic_gain * wave_sample(waveform, phase)

        composite_sample *= volume * envelope
        left_channel[sample_index] += composite_sample * left_gain
        right_channel[sample_index] += composite_sample * right_gain


def add_noise_hit(
    left_channel: list[float],
    right_channel: list[float],
    *,
    start: float,
    duration: float,
    volume: float,
    pan: float = 0.0,
) -> None:
    left_gain, right_gain = pan_gains(pan)
    hit_start = max(0, int(start * SAMPLE_RATE))
    hit_end = min(len(left_channel), int((start + duration) * SAMPLE_RATE))
    rng = random.Random(int(start * 1000) + 7)
    smooth = 0.0

    for sample_index in range(hit_start, hit_end):
        elapsed = sample_index / SAMPLE_RATE - start
        shape = max(0.0, 1.0 - elapsed / max(duration, 0.001)) ** 2
        smooth = smooth * 0.74 + rng.uniform(-1.0, 1.0) * 0.26
        sample_value = smooth * volume * shape
        left_channel[sample_index] += sample_value * left_gain
        right_channel[sample_index] += sample_value * right_gain


def normalize_and_write(path: Path, left_channel: list[float], right_channel: list[float]) -> None:
    peak = max(
        max((abs(sample) for sample in left_channel), default=0.0),
        max((abs(sample) for sample in right_channel), default=0.0),
        0.001,
    )
    normalization_gain = MASTER_GAIN / peak
    pcm_frames = bytearray()

    for left_sample, right_sample in zip(left_channel, right_channel):
        left_pcm = int(clamp(left_sample * normalization_gain, -1.0, 1.0) * 32767)
        right_pcm = int(clamp(right_sample * normalization_gain, -1.0, 1.0) * 32767)
        pcm_frames.extend(left_pcm.to_bytes(2, byteorder="little", signed=True))
        pcm_frames.extend(right_pcm.to_bytes(2, byteorder="little", signed=True))

    with wave.open(str(path), "wb") as wave_file:
        wave_file.setnchannels(2)
        wave_file.setsampwidth(2)
        wave_file.setframerate(SAMPLE_RATE)
        wave_file.writeframes(pcm_frames)


def render_background_section(
    left_channel: list[float],
    right_channel: list[float],
    *,
    section_start: float,
    chord_progression: list[tuple[str, tuple[str, str, str]]],
    melody: list[tuple[float, str, float]],
    accent_note_starts: set[float],
    arp_patterns: tuple[tuple[tuple[float, int, float], ...], ...],
    profile: dict[str, float],
) -> None:
    beat = 0.5
    bar = beat * 4.0

    for bar_index, (bass_note, chord_notes) in enumerate(chord_progression):
        bar_start = section_start + bar_index * bar

        for chord_note in chord_notes:
            chord_frequency = note_to_frequency(chord_note)
            add_tone(
                left_channel,
                right_channel,
                start=bar_start,
                duration=1.84,
                frequency=chord_frequency,
                volume=profile["chord_volume"],
                waveform="sine",
                pan=-profile["chord_pan"] if "3" in chord_note else profile["chord_pan"],
                attack=profile["chord_attack"],
                decay=profile["chord_decay"],
                sustain_level=profile["chord_sustain"],
                release=profile["chord_release"],
                harmonics=((1.0, 0.97), (2.0, 0.03)),
            )
            add_tone(
                left_channel,
                right_channel,
                start=bar_start,
                duration=1.9,
                frequency=chord_frequency * 2.0,
                volume=profile["shimmer_volume"],
                waveform="soft_square",
                pan=-profile["shimmer_pan"] if "3" in chord_note else profile["shimmer_pan"],
                attack=profile["shimmer_attack"],
                decay=profile["shimmer_decay"],
                sustain_level=profile["shimmer_sustain"],
                release=profile["shimmer_release"],
                harmonics=((1.0, 0.88), (2.0, 0.08), (3.0, 0.04)),
            )

        for beat_index in range(4):
            bass_start = bar_start + beat_index * beat
            bass_frequency = note_to_frequency(bass_note)
            add_tone(
                left_channel,
                right_channel,
                start=bass_start,
                duration=0.22,
                frequency=bass_frequency,
                volume=profile["bass_volume"],
                waveform="sine",
                pan=-profile["bass_pan"],
                attack=profile["bass_attack"],
                decay=profile["bass_decay"],
                sustain_level=profile["bass_sustain"],
                release=profile["bass_release"],
                harmonics=((1.0, 0.94), (2.0, 0.06)),
            )
            add_noise_hit(
                left_channel,
                right_channel,
                start=bass_start + 0.015,
                duration=0.04,
                volume=profile["bass_noise_volume"],
                pan=0.0,
            )

        for offset, note_index, pan in arp_patterns[bar_index]:
            add_tone(
                left_channel,
                right_channel,
                start=bar_start + offset,
                duration=profile["arp_duration"],
                frequency=note_to_frequency(chord_notes[note_index]),
                volume=profile["arp_volume"],
                waveform="triangle",
                pan=pan,
                attack=profile["arp_attack"],
                decay=profile["arp_decay"],
                sustain_level=profile["arp_sustain"],
                release=profile["arp_release"],
                harmonics=((1.0, 0.8), (2.0, 0.14), (4.0, 0.04)),
            )

    for start, note_name, duration_seconds in melody:
        note_frequency = note_to_frequency(note_name)
        add_tone(
            left_channel,
            right_channel,
            start=section_start + start,
            duration=duration_seconds,
            frequency=note_frequency,
            volume=profile["lead_volume"],
            waveform="sine",
            pan=profile["lead_pan"],
            attack=profile["lead_attack"],
            decay=profile["lead_decay"],
            sustain_level=profile["lead_sustain"],
            release=profile["lead_release"],
            vibrato_rate=profile["lead_vibrato_rate"],
            vibrato_depth=profile["lead_vibrato_depth"],
            harmonics=((1.0, 0.96), (2.0, 0.04)),
        )
        if round(start, 2) in accent_note_starts:
            add_tone(
                left_channel,
                right_channel,
                start=section_start + start,
                duration=min(profile["accent_max_duration"], max(profile["accent_min_duration"], duration_seconds * 0.32)),
                frequency=note_frequency,
                volume=profile["accent_volume"],
                waveform="triangle",
                pan=0.0,
                attack=profile["accent_attack"],
                decay=profile["accent_decay"],
                sustain_level=profile["accent_sustain"],
                release=profile["accent_release"],
                harmonics=((1.0, 0.78), (2.0, 0.16), (4.0, 0.05)),
            )


def create_background_loop() -> tuple[list[float], list[float]]:
    section_duration = 8.0
    sections = [
        {
            "chord_progression": [
                ("C3", ("G3", "C4", "E4")),
                ("A2", ("A3", "C4", "E4")),
                ("F2", ("A3", "C4", "F4")),
                ("G2", ("B3", "D4", "G4")),
            ],
            "melody": [
                (0.0, "B4", 0.32),
                (0.34, "C5", 0.28),
                (0.66, "D5", 0.34),
                (1.06, "E5", 0.42),
                (1.54, "D5", 0.28),
                (1.86, "B4", 0.18),
                (2.0, "A4", 0.34),
                (2.36, "B4", 0.28),
                (2.68, "C5", 0.34),
                (3.08, "E5", 0.44),
                (3.58, "D5", 0.26),
                (3.86, "C5", 0.18),
                (4.0, "C5", 0.32),
                (4.34, "D5", 0.3),
                (4.68, "E5", 0.34),
                (5.08, "F5", 0.44),
                (5.58, "E5", 0.26),
                (5.86, "C5", 0.18),
                (6.0, "B4", 0.32),
                (6.34, "C5", 0.28),
                (6.66, "D5", 0.34),
                (7.06, "G5", 0.4),
                (7.5, "E5", 0.2),
                (7.74, "D5", 0.16),
            ],
            "accent_note_starts": {0.0, 1.06, 2.0, 3.08, 4.0, 5.08, 6.0, 7.06},
            "arp_patterns": (
                ((0.22, 1, -0.08), (0.68, 2, 0.08), (1.2, 1, -0.04), (1.62, 0, 0.04)),
                ((0.16, 0, -0.06), (0.58, 1, 0.06), (1.08, 2, -0.04), (1.56, 1, 0.04)),
                ((0.28, 1, -0.05), (0.82, 2, 0.05), (1.34, 0, -0.03), (1.72, 2, 0.04)),
                ((0.2, 1, -0.05), (0.64, 2, 0.06), (1.12, 1, -0.03), (1.5, 0, 0.03)),
            ),
            "profile": {},
        },
        {
            "chord_progression": [
                ("F2", ("A3", "C4", "F4")),
                ("C3", ("G3", "C4", "E4")),
                ("D3", ("A3", "D4", "F4")),
                ("G2", ("B3", "D4", "G4")),
            ],
            "melody": [
                (0.0, "A4", 0.34),
                (0.36, "C5", 0.3),
                (0.72, "E5", 0.38),
                (1.16, "F5", 0.42),
                (1.64, "E5", 0.24),
                (1.92, "C5", 0.18),
                (2.0, "G4", 0.32),
                (2.34, "A4", 0.28),
                (2.66, "C5", 0.34),
                (3.04, "D5", 0.4),
                (3.5, "E5", 0.28),
                (3.8, "D5", 0.18),
                (4.0, "A4", 0.32),
                (4.34, "B4", 0.28),
                (4.66, "D5", 0.34),
                (5.08, "F5", 0.42),
                (5.56, "E5", 0.24),
                (5.84, "D5", 0.18),
                (6.0, "G4", 0.32),
                (6.34, "A4", 0.28),
                (6.66, "B4", 0.32),
                (7.04, "D5", 0.42),
                (7.52, "C5", 0.2),
                (7.76, "B4", 0.16),
            ],
            "accent_note_starts": {0.0, 1.16, 2.0, 3.04, 4.0, 5.08, 6.0, 7.04},
            "arp_patterns": (
                ((0.18, 0, -0.06), (0.74, 2, 0.06), (1.26, 1, -0.03), (1.62, 2, 0.04)),
                ((0.22, 1, -0.05), (0.68, 2, 0.06), (1.18, 0, -0.04), (1.58, 1, 0.03)),
                ((0.24, 1, -0.05), (0.78, 2, 0.05), (1.32, 1, -0.03), (1.7, 0, 0.03)),
                ((0.18, 1, -0.06), (0.62, 2, 0.06), (1.14, 1, -0.04), (1.54, 0, 0.04)),
            ),
            "profile": {
                "lead_volume": 0.058,
                "shimmer_volume": 0.011,
                "arp_volume": 0.0135,
            },
        },
        {
            "chord_progression": [
                ("A2", ("A3", "C4", "E4")),
                ("F2", ("A3", "C4", "F4")),
                ("C3", ("G3", "C4", "E4")),
                ("G2", ("B3", "D4", "G4")),
            ],
            "melody": [
                (0.0, "E5", 0.34),
                (0.36, "C5", 0.28),
                (0.68, "B4", 0.32),
                (1.06, "C5", 0.38),
                (1.5, "E5", 0.4),
                (1.94, "D5", 0.18),
                (2.0, "C5", 0.34),
                (2.36, "A4", 0.28),
                (2.68, "C5", 0.34),
                (3.08, "E5", 0.4),
                (3.54, "D5", 0.26),
                (3.84, "C5", 0.18),
                (4.0, "G4", 0.34),
                (4.36, "B4", 0.28),
                (4.68, "C5", 0.34),
                (5.08, "E5", 0.4),
                (5.54, "G5", 0.24),
                (5.82, "E5", 0.18),
                (6.0, "D5", 0.32),
                (6.34, "B4", 0.28),
                (6.66, "A4", 0.3),
                (7.02, "B4", 0.34),
                (7.4, "D5", 0.22),
                (7.66, "E5", 0.18),
            ],
            "accent_note_starts": {0.0, 1.06, 2.0, 3.08, 4.0, 5.08, 6.0, 7.02},
            "arp_patterns": (
                ((0.2, 2, -0.05), (0.66, 1, 0.05), (1.18, 0, -0.03), (1.62, 1, 0.03)),
                ((0.24, 1, -0.05), (0.76, 2, 0.05), (1.28, 0, -0.03), (1.68, 1, 0.03)),
                ((0.18, 0, -0.04), (0.64, 1, 0.05), (1.16, 2, -0.03), (1.58, 1, 0.03)),
                ((0.22, 1, -0.05), (0.72, 2, 0.06), (1.24, 0, -0.03), (1.6, 1, 0.03)),
            ),
            "profile": {
                "lead_volume": 0.054,
                "bass_volume": 0.07,
                "arp_volume": 0.0125,
                "accent_volume": 0.009,
                "bass_noise_volume": 0.001,
            },
        },
    ]
    duration = section_duration * len(sections)
    total_samples = int(duration * SAMPLE_RATE)
    left_channel = [0.0] * total_samples
    right_channel = [0.0] * total_samples
    default_profile = {
        "chord_volume": 0.048,
        "chord_pan": 0.05,
        "chord_attack": 0.12,
        "chord_decay": 0.24,
        "chord_sustain": 0.84,
        "chord_release": 0.18,
        "shimmer_volume": 0.01,
        "shimmer_pan": 0.02,
        "shimmer_attack": 0.2,
        "shimmer_decay": 0.28,
        "shimmer_sustain": 0.76,
        "shimmer_release": 0.24,
        "bass_volume": 0.075,
        "bass_pan": 0.02,
        "bass_attack": 0.012,
        "bass_decay": 0.08,
        "bass_sustain": 0.52,
        "bass_release": 0.1,
        "bass_noise_volume": 0.0015,
        "arp_duration": 0.11,
        "arp_volume": 0.014,
        "arp_attack": 0.003,
        "arp_decay": 0.04,
        "arp_sustain": 0.16,
        "arp_release": 0.06,
        "lead_volume": 0.056,
        "lead_pan": 0.0,
        "lead_attack": 0.022,
        "lead_decay": 0.08,
        "lead_sustain": 0.8,
        "lead_release": 0.16,
        "lead_vibrato_rate": 3.1,
        "lead_vibrato_depth": 0.0014,
        "accent_min_duration": 0.09,
        "accent_max_duration": 0.12,
        "accent_volume": 0.01,
        "accent_attack": 0.002,
        "accent_decay": 0.05,
        "accent_sustain": 0.14,
        "accent_release": 0.05,
    }

    for section_index, section in enumerate(sections):
        render_background_section(
            left_channel,
            right_channel,
            section_start=section_index * section_duration,
            chord_progression=section["chord_progression"],
            melody=section["melody"],
            accent_note_starts=section["accent_note_starts"],
            arp_patterns=section["arp_patterns"],
            profile={**default_profile, **section["profile"]},
        )

    smooth_loop_edges(left_channel, 0.03)
    smooth_loop_edges(right_channel, 0.03)
    return left_channel, right_channel


def create_success_sound() -> tuple[list[float], list[float]]:
    duration = 0.72
    total_samples = int(duration * SAMPLE_RATE)
    left_channel = [0.0] * total_samples
    right_channel = [0.0] * total_samples

    for start, note_name, pan in ((0.0, "C5", -0.1), (0.14, "E5", 0.08), (0.28, "G5", 0.16)):
        add_tone(
            left_channel,
            right_channel,
            start=start,
            duration=0.16,
            frequency=note_to_frequency(note_name),
            volume=0.18,
            waveform="triangle",
            pan=pan,
            attack=0.004,
            decay=0.07,
            sustain_level=0.3,
            release=0.2,
            harmonics=((1.0, 0.86), (2.0, 0.18), (4.0, 0.05)),
        )

    add_tone(
        left_channel,
        right_channel,
        start=0.42,
        duration=0.18,
        frequency=note_to_frequency("C6"),
        volume=0.13,
        waveform="triangle",
        pan=0.12,
        attack=0.004,
        decay=0.06,
        sustain_level=0.24,
        release=0.18,
        harmonics=((1.0, 0.78), (3.0, 0.12)),
    )
    return left_channel, right_channel


def create_error_sound() -> tuple[list[float], list[float]]:
    duration = 0.58
    total_samples = int(duration * SAMPLE_RATE)
    left_channel = [0.0] * total_samples
    right_channel = [0.0] * total_samples

    for start, note_name in ((0.0, "E3"), (0.14, "C3")):
        add_tone(
            left_channel,
            right_channel,
            start=start,
            duration=0.18,
            frequency=note_to_frequency(note_name),
            volume=0.18,
            waveform="soft_square",
            pan=-0.08,
            attack=0.005,
            decay=0.08,
            sustain_level=0.38,
            release=0.15,
            vibrato_rate=7.5,
            vibrato_depth=0.024,
            harmonics=((1.0, 0.9), (2.0, 0.14)),
        )

    add_noise_hit(left_channel, right_channel, start=0.03, duration=0.16, volume=0.04, pan=0.02)
    add_noise_hit(left_channel, right_channel, start=0.17, duration=0.14, volume=0.032, pan=-0.08)
    return left_channel, right_channel


def create_finish_sound() -> tuple[list[float], list[float]]:
    duration = 1.28
    total_samples = int(duration * SAMPLE_RATE)
    left_channel = [0.0] * total_samples
    right_channel = [0.0] * total_samples
    notes = [
        (0.0, "C5"),
        (0.12, "E5"),
        (0.24, "G5"),
        (0.38, "C6"),
        (0.62, "E6"),
    ]

    for start, note_name in notes:
        add_tone(
            left_channel,
            right_channel,
            start=start,
            duration=0.22,
            frequency=note_to_frequency(note_name),
            volume=0.17,
            waveform="triangle",
            pan=0.14 if "6" in note_name else -0.06,
            attack=0.005,
            decay=0.08,
            sustain_level=0.34,
            release=0.24,
            harmonics=((1.0, 0.82), (2.0, 0.16), (3.0, 0.06)),
        )

    for chord_note in ("C5", "E5", "G5"):
        add_tone(
            left_channel,
            right_channel,
            start=0.76,
            duration=0.32,
            frequency=note_to_frequency(chord_note),
            volume=0.12,
            waveform="triangle",
            pan=0.18,
            attack=0.01,
            decay=0.08,
            sustain_level=0.42,
            release=0.26,
            harmonics=((1.0, 0.78), (2.0, 0.18)),
        )

    add_noise_hit(left_channel, right_channel, start=0.78, duration=0.18, volume=0.028, pan=0.0)
    return left_channel, right_channel


def create_toggle_sound() -> tuple[list[float], list[float]]:
    duration = 0.34
    total_samples = int(duration * SAMPLE_RATE)
    left_channel = [0.0] * total_samples
    right_channel = [0.0] * total_samples

    add_tone(
        left_channel,
        right_channel,
        start=0.0,
        duration=0.09,
        frequency=note_to_frequency("B4"),
        volume=0.14,
        waveform="triangle",
        pan=-0.06,
        attack=0.004,
        decay=0.05,
        sustain_level=0.24,
        release=0.08,
        harmonics=((1.0, 0.82), (2.0, 0.18)),
    )
    add_tone(
        left_channel,
        right_channel,
        start=0.08,
        duration=0.12,
        frequency=note_to_frequency("E5"),
        volume=0.13,
        waveform="triangle",
        pan=0.08,
        attack=0.004,
        decay=0.05,
        sustain_level=0.24,
        release=0.08,
        harmonics=((1.0, 0.8), (3.0, 0.12)),
    )
    add_noise_hit(left_channel, right_channel, start=0.01, duration=0.06, volume=0.02, pan=0.0)
    return left_channel, right_channel


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    assets = {
        "island-bgm-loop.wav": create_background_loop(),
        "sfx-success.wav": create_success_sound(),
        "sfx-error.wav": create_error_sound(),
        "sfx-finish.wav": create_finish_sound(),
        "sfx-toggle.wav": create_toggle_sound(),
    }

    for filename, (left_channel, right_channel) in assets.items():
        normalize_and_write(OUTPUT_DIR / filename, left_channel, right_channel)
        print(f"Generated {filename}")


if __name__ == "__main__":
    main()
