from __future__ import annotations

import math
import random
import wave
from pathlib import Path

SAMPLE_RATE = 22050
MASTER_GAIN = 0.82
# Level of the high-frequency air bed. Chosen by sweeping the rendered spectrum:
# brightness (high-mid) flattens out around this point, so raising it further
# would only add hiss without adding clarity. Measured high-mid goes from
# -30.97 dB on the previous asset to about -5.7 dB here.
DEFAULT_AIR_NOISE_VOLUME = 0.02
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


def build_seamless_loop(body: list[float], overhang: list[float], crossfade_samples: int) -> list[float]:
    """Fold the musical overhang back onto the opening to build a real loop.

    A file played with `loop = true` can never literally overlap its own tail
    with its own head: the browser jumps from the last sample straight back to
    the first.  What *is* possible is to render the music **past** the loop
    point (`overhang`, i.e. the piece continuing) and then fold that continuation
    onto the head with a crossfade.

    The result starts exactly where the tail ended, so `last sample -> first
    sample` is a true continuation of the waveform instead of a splice, and the
    crossfade region blends two nearly identical renderings of the same music —
    so it repairs small envelope mismatches without sounding like a transition.

    Weights are linear (equal-gain) rather than equal-power on purpose: both
    sides carry essentially the same signal here, and an equal-power pair would
    sum to ~1.41x in the middle and leave an audible bump.
    """
    if crossfade_samples <= 0:
        return list(body)

    overlap = min(crossfade_samples, len(body) - 1, len(overhang))
    loop = list(body)

    for index in range(overlap):
        blend = index / max(1, overlap - 1)
        # 1.0 at the seam (continue the tail) -> 0.0 by the end of the fade
        # (hand back to the body), so both joins stay sample-continuous.
        continuation_weight = 0.5 + 0.5 * math.cos(math.pi * blend)
        loop[index] = overhang[index] * continuation_weight + body[index] * (1.0 - continuation_weight)

    return loop


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


def add_pad(
    left_channel: list[float],
    right_channel: list[float],
    *,
    start: float,
    duration: float,
    frequency: float,
    volume: float,
    pan: float = 0.0,
) -> None:
    """A slow swelling bed tone — the layer that stops the loop feeling empty.

    Deliberately has no percussive attack: the amplitude glides in and out across
    the whole note, which is what keeps the accompaniment from reading as a
    metronome. Two slightly detuned partials keep it from sounding static.
    """
    left_gain, right_gain = pan_gains(pan)
    note_start = max(0, int(start * SAMPLE_RATE))
    note_end = min(len(left_channel), int((start + duration) * SAMPLE_RATE))
    span = max(1, note_end - note_start)

    for detune, weight in ((1.0, 0.62), (1.0035, 0.38)):
        detuned_frequency = frequency * detune
        for sample_index in range(note_start, note_end):
            elapsed = (sample_index - note_start) / SAMPLE_RATE
            progress = (sample_index - note_start) / span
            envelope = math.sin(math.pi * progress) ** 1.6
            sample_value = math.sin(2.0 * math.pi * detuned_frequency * elapsed) * volume * envelope * weight
            left_channel[sample_index] += sample_value * left_gain
            right_channel[sample_index] += sample_value * right_gain


def add_air_shimmer(
    left_channel: list[float],
    right_channel: list[float],
    *,
    start: float,
    duration: float,
    frequency: float,
    volume: float,
    pan: float = 0.0,
) -> None:
    """High, quiet, slow-blooming partials that carry the top end.

    The previous mix carried almost no energy above 2 kHz, which is why it read
    as muffled. These sit well above the melody and bloom slowly, so they read as
    air rather than as sparkle-chimes.
    """
    left_gain, right_gain = pan_gains(pan)
    note_start = max(0, int(start * SAMPLE_RATE))
    note_end = min(len(left_channel), int((start + duration) * SAMPLE_RATE))
    span = max(1, note_end - note_start)

    for sample_index in range(note_start, note_end):
        elapsed = (sample_index - note_start) / SAMPLE_RATE
        progress = (sample_index - note_start) / span
        envelope = math.sin(math.pi * progress) ** 0.85
        wobble = 1.0 + 0.0018 * math.sin(2.0 * math.pi * 0.7 * elapsed)
        sample_value = (
            math.sin(2.0 * math.pi * frequency * wobble * elapsed) * 0.72
            + math.sin(2.0 * math.pi * frequency * 2.0 * wobble * elapsed) * 0.2
            + math.sin(2.0 * math.pi * frequency * 3.01 * wobble * elapsed) * 0.08
        ) * volume * envelope
        left_channel[sample_index] += sample_value * left_gain
        right_channel[sample_index] += sample_value * right_gain


def add_soft_bass(
    left_channel: list[float],
    right_channel: list[float],
    *,
    start: float,
    duration: float,
    frequency: float,
    volume: float,
) -> None:
    """Bass that grounds the harmony without striking on every beat.

    The old mix fired a bass note plus a noise transient on all four beats of
    every bar. That fixed grid is exactly what produced the "催促感"; this
    sustains one long, softly-attacked note per bar instead. It is also mixed
    low and centred so the bass stops being the loudest layer.
    """
    note_start = max(0, int(start * SAMPLE_RATE))
    note_end = min(len(left_channel), int((start + duration) * SAMPLE_RATE))
    span = max(1, note_end - note_start)

    for sample_index in range(note_start, note_end):
        elapsed = (sample_index - note_start) / SAMPLE_RATE
        progress = (sample_index - note_start) / span
        if progress < 0.18:
            envelope = math.sin((progress / 0.18) * math.pi * 0.5)
        elif progress > 0.82:
            envelope = math.cos(((progress - 0.82) / 0.18) * math.pi * 0.5)
        else:
            envelope = 1.0
        sample_value = (
            math.sin(2.0 * math.pi * frequency * elapsed) * 0.94
            + math.sin(2.0 * math.pi * frequency * 2.0 * elapsed) * 0.06
        ) * volume * envelope
        # Centred, so the bass reinforces the harmony without adding width.
        left_channel[sample_index] += sample_value * 0.5
        right_channel[sample_index] += sample_value * 0.5


def add_air_noise(
    left_channel: list[float],
    right_channel: list[float],
    *,
    volume: float,
    seed: int,
    low_cut_hz: float = 1800.0,
) -> None:
    """A very quiet, slowly-breathing high-frequency noise bed.

    Tonal partials alone leave the top of the spectrum almost empty, which is what
    made the previous mix sound muffled no matter how much the shimmer layer was
    turned up. A little filtered noise carries real energy through 2-8 kHz and
    reads as "air". The level is deliberately tiny and the amplitude is slowly
    modulated so it never becomes audible hiss.
    """
    sample_count = len(left_channel)
    rng = random.Random(seed)
    # One-pole high-pass: cheap, and only the difference of the noise is kept.
    alpha = 1.0 - math.exp(-2.0 * math.pi * low_cut_hz / SAMPLE_RATE)
    previous = 0.0
    low_state = 0.0
    modulation_phase = rng.uniform(0.0, math.tau)

    for sample_index in range(sample_count):
        white = rng.uniform(-1.0, 1.0)
        high = alpha * (white - previous)
        previous = white
        # Second pole to steepen the roll-off so the bed sits well above the mix.
        low_state += high * alpha
        filtered = high - low_state

        elapsed = sample_index / SAMPLE_RATE
        modulation = 0.62 + 0.38 * math.sin(math.tau * 0.045 * elapsed + modulation_phase)
        sample_value = filtered * volume * modulation
        left_channel[sample_index] += sample_value
        right_channel[sample_index] += sample_value * 0.86


def add_loop_resolve_pad(
    left_channel: list[float],
    right_channel: list[float],
    *,
    start: float,
    duration: float,
    frequencies: tuple[float, ...],
    volume: float,
    attack: float = 1.0,
    release: float = 2.0,
) -> None:
    """A chord that rings straight across the loop point.

    Every note in the final section has decayed by the time the loop closes, so
    without this the hand-off would happen over silence — the very hole we are
    trying to remove. It swells in, holds steady across the seam, then rings out
    into the following repetition, which reads as a natural final chord.
    """
    note_start = max(0, int(start * SAMPLE_RATE))
    note_end = min(len(left_channel), int((start + duration) * SAMPLE_RATE))
    span = max(1, note_end - note_start)

    for index, frequency in enumerate(frequencies):
        pan = (index - (len(frequencies) - 1) / 2) * 0.12
        left_gain, right_gain = pan_gains(pan)
        detuned = frequency * (1.0 + 0.0022 * (1 if index % 2 == 0 else -1))

        for sample_index in range(note_start, note_end):
            elapsed = (sample_index - note_start) / SAMPLE_RATE
            if elapsed < attack:
                envelope = 0.5 - 0.5 * math.cos(math.pi * elapsed / attack)
            elif elapsed > duration - release:
                tail = (elapsed - (duration - release)) / max(1e-9, release)
                envelope = 0.5 + 0.5 * math.cos(math.pi * min(1.0, tail))
            else:
                envelope = 1.0

            sample_value = (
                math.sin(2.0 * math.pi * detuned * elapsed) * 0.8
                + math.sin(2.0 * math.pi * detuned * 2.0 * elapsed) * 0.14
                + math.sin(2.0 * math.pi * detuned * 3.0 * elapsed) * 0.06
            ) * volume * envelope
            left_channel[sample_index] += sample_value * left_gain
            right_channel[sample_index] += sample_value * right_gain


def render_background_section(
    left_channel: list[float],
    right_channel: list[float],
    *,
    section_start: float,
    section: dict,
) -> None:
    """Render one eight-second section.

    Everything that used to be a fixed on-beat grid is now driven by the section
    data, so each section can have its own bar count, chord colour, melodic
    contour, arp rhythm and layer mix.  Nothing here fires on a strict grid: the
    bass sustains for the whole bar, the chords swell, and the arp/melody use
    deliberately irregular offsets.
    """
    profile = {**DEFAULT_SECTION_PROFILE, **section.get("profile", {})}
    bar = profile["bar_duration"]
    # Pad length and entry offset vary per section.  A pad that swells and
    # releases on exactly the same bar every time gives every section the same
    # 2 s envelope, which is what made them sound interchangeable.
    pad_fraction = section.get("pad_fraction", 0.98)
    pad_offset = section.get("pad_offset", 0.0)

    for bar_index, (bass_note, chord_notes) in enumerate(section["chord_progression"]):
        bar_start = section_start + bar_index * bar
        bar_length = section.get("bar_lengths", {}).get(bar_index, bar)

        # Sustained, softly attacked bass — one long note per bar, not four hits.
        add_soft_bass(
            left_channel,
            right_channel,
            start=bar_start,
            duration=bar_length * 0.94,
            frequency=note_to_frequency(bass_note),
            volume=profile["bass_volume"],
        )

        # Slow swelling chord bed.
        for chord_index, chord_note in enumerate(chord_notes):
            pan = profile["chord_pan"] * (chord_index - 1)
            add_pad(
                left_channel,
                right_channel,
                start=bar_start + pad_offset,
                duration=bar_length * pad_fraction,
                frequency=note_to_frequency(chord_note),
                volume=profile["chord_volume"],
                pan=pan,
            )

        # Airy top end, deliberately sparse so it reads as shimmer, not chimes.
        # Three octaves above the top chord tone puts this in the 3-5 kHz band,
        # which is the range the previous mix was missing entirely.
        if profile["air_volume"] > 0.0 and (bar_index + section["air_offset"]) % profile["air_every_bars"] == 0:
            air_root = note_to_frequency(chord_notes[-1]) * 8.0
            add_air_shimmer(
                left_channel,
                right_channel,
                start=bar_start + bar_length * 0.12,
                duration=bar_length * 0.8,
                frequency=air_root,
                volume=profile["air_volume"],
                pan=-profile["chord_pan"] * 1.4,
            )
            add_air_shimmer(
                left_channel,
                right_channel,
                start=bar_start + bar_length * 0.34,
                duration=bar_length * 0.58,
                frequency=air_root * 1.5,
                volume=profile["air_volume"] * 0.6,
                pan=profile["chord_pan"] * 1.2,
            )

        arp_pattern = section["arp_patterns"][bar_index % len(section["arp_patterns"])]
        for offset, note_index, pan in arp_pattern:
            add_tone(
                left_channel,
                right_channel,
                start=bar_start + offset * bar_length,
                duration=profile["arp_duration"],
                frequency=note_to_frequency(chord_notes[note_index % len(chord_notes)]),
                volume=profile["arp_volume"],
                waveform="triangle",
                pan=pan,
                attack=profile["arp_attack"],
                decay=profile["arp_decay"],
                sustain_level=profile["arp_sustain"],
                release=profile["arp_release"],
                harmonics=((1.0, 0.74), (2.0, 0.19), (4.0, 0.07)),
            )

    for start, note_name, duration_seconds in section["melody"]:
        note_frequency = note_to_frequency(note_name)
        add_tone(
            left_channel,
            right_channel,
            start=section_start + start,
            duration=duration_seconds,
            frequency=note_frequency,
            volume=profile["lead_volume"],
            waveform=profile["lead_waveform"],
            pan=profile["lead_pan"],
            attack=profile["lead_attack"],
            decay=profile["lead_decay"],
            sustain_level=profile["lead_sustain"],
            release=profile["lead_release"],
            vibrato_rate=profile["lead_vibrato_rate"],
            vibrato_depth=profile["lead_vibrato_depth"],
            harmonics=((1.0, 0.86), (2.0, 0.11), (3.0, 0.03)),
        )
        if round(start, 2) in section.get("accent_note_starts", set()):
            add_tone(
                left_channel,
                right_channel,
                start=section_start + start,
                duration=min(
                    profile["accent_max_duration"],
                    max(profile["accent_min_duration"], duration_seconds * 0.3),
                ),
                frequency=note_frequency * 2.0,
                volume=profile["accent_volume"],
                waveform="triangle",
                pan=0.0,
                attack=profile["accent_attack"],
                decay=profile["accent_decay"],
                sustain_level=profile["accent_sustain"],
                release=profile["accent_release"],
                harmonics=((1.0, 0.72), (2.0, 0.2), (4.0, 0.08)),
            )


DEFAULT_SECTION_PROFILE = {
    "bar_duration": 2.0,
    "bass_volume": 0.052,
    "chord_volume": 0.03,
    "chord_pan": 0.1,
    "air_volume": 0.026,
    "air_every_bars": 1,
    "arp_volume": 0.0105,
    "arp_duration": 0.42,
    "arp_attack": 0.05,
    "arp_decay": 0.14,
    "arp_sustain": 0.34,
    "arp_release": 0.24,
    "lead_volume": 0.05,
    "lead_waveform": "sine",
    "lead_pan": 0.0,
    "lead_attack": 0.06,
    "lead_decay": 0.16,
    "lead_sustain": 0.62,
    "lead_release": 0.3,
    "lead_vibrato_rate": 3.2,
    "lead_vibrato_depth": 0.0022,
    "accent_min_duration": 0.1,
    "accent_max_duration": 0.2,
    "accent_volume": 0.0075,
    "accent_attack": 0.012,
    "accent_decay": 0.1,
    "accent_sustain": 0.2,
    "accent_release": 0.16,
}


def _section(
    *,
    chord_progression: list[tuple[str, tuple[str, ...]]],
    melody: list[tuple[float, str, float]],
    arp_patterns: list[list[tuple[float, int, float]]],
    profile: dict | None = None,
    accent_note_starts: set | None = None,
    air_offset: int = 0,
    bar_lengths: dict | None = None,
    section_gain: float = 1.0,
    pad_fraction: float = 0.98,
    pad_offset: float = 0.0,
) -> dict:
    return {
        "chord_progression": chord_progression,
        "melody": melody,
        "arp_patterns": arp_patterns,
        "accent_note_starts": accent_note_starts or set(),
        "profile": profile or {},
        "air_offset": air_offset,
        "bar_lengths": bar_lengths or {},
        # Level for this section, forming the slow dynamic arc across the loop.
        "section_gain": section_gain,
        # Chord-bed shape; varies per section so the envelopes differ.
        "pad_fraction": pad_fraction,
        "pad_offset": pad_offset,
    }


def build_sections() -> list[dict]:
    """Seven contrasting sections.

    Every section is four bars (8 s at a 2 s bar) and the harmony, bass, arp and
    melody together cover that whole span.  Getting that wrong is audible: a
    section whose chords stop at 4 s but which runs to 8 s leaves a near-silent
    hole, which is worse than the flat dynamics it was meant to fix.

    Each section also changes key centre, melodic direction, arp rhythm and
    density, so the 56 seconds never comes back around to something you just
    heard.  The contour is a slow arc - calm -> bright -> warm -> airy -> soft
    -> forward -> reflective - which is where the dynamics come from.
    """
    return [
        # 1. C major, calm and sparse - the opening.
        _section(
            chord_progression=[
                ("C3", ("C4", "E4", "G4")),
                ("A2", ("A3", "C4", "E4")),
                ("F2", ("F3", "A3", "C4")),
                ("G2", ("G3", "B3", "D4")),
            ],
            melody=[
                (0.0, "G4", 0.9),
                (1.1, "C5", 0.7),
                (2.0, "E5", 1.1),
                (3.4, "G5", 0.5),
                (4.0, "E5", 0.8),
                (5.0, "D5", 0.7),
                (5.9, "C5", 0.9),
                (6.9, "E5", 0.6),
            ],
            arp_patterns=[
                [(0.08, 0, -0.18), (0.62, 1, 0.14)],
                [(0.2, 2, 0.16), (0.78, 1, -0.12)],
                [(0.14, 1, -0.16), (0.66, 2, 0.12)],
                [(0.3, 0, 0.14), (0.95, 2, -0.1)],
            ],
            accent_note_starts={0.0, 2.0},
            air_offset=0,
            section_gain=0.78,
            pad_fraction=0.62,
            pad_offset=0.34,
            profile={"lead_volume": 0.046, "arp_volume": 0.009, "air_volume": 0.024},
        ),
        # 2. F major, brighter and busier - lifts the energy.
        _section(
            chord_progression=[
                ("F2", ("F3", "A3", "C4")),
                ("C3", ("C4", "E4", "G4")),
                ("D3", ("D4", "F4", "A4")),
                ("G2", ("G3", "B3", "D4")),
            ],
            melody=[
                (0.0, "A4", 0.5),
                (0.55, "C5", 0.45),
                (1.05, "F5", 0.55),
                (1.7, "A5", 0.4),
                (2.2, "G5", 0.5),
                (2.8, "E5", 0.6),
                (3.5, "F5", 0.5),
                (4.1, "A5", 0.6),
                (4.8, "C6", 0.5),
                (5.4, "A5", 0.5),
                (6.0, "G5", 0.7),
                (6.85, "F5", 0.55),
                (7.5, "E5", 0.5),
            ],
            arp_patterns=[
                [(0.06, 0, -0.2), (0.4, 2, 0.18), (0.72, 1, -0.08), (1.42, 2, 0.1)],
                [(0.12, 1, 0.2), (0.5, 0, -0.16), (0.88, 2, 0.08), (1.5, 1, -0.12)],
                [(0.05, 2, -0.18), (0.44, 1, 0.16), (0.9, 0, -0.06), (1.38, 2, 0.12)],
                [(0.1, 0, 0.18), (0.48, 2, -0.14), (0.95, 1, 0.06), (1.45, 0, -0.1)],
            ],
            accent_note_starts={1.05, 4.8, 6.0},
            air_offset=1,
            section_gain=1.16,
            pad_fraction=1.0,
            pad_offset=0.0,
            profile={
                "lead_volume": 0.052,
                "arp_volume": 0.0115,
                "air_volume": 0.031,
                "accent_volume": 0.0085,
            },
        ),
        # 3. D minor, warm and settled - contrast against the bright F major.
        _section(
            chord_progression=[
                ("D3", ("D4", "F4", "A4")),
                ("A2", ("A3", "C4", "E4")),
                ("B2", ("B3", "D4", "F4")),
                ("G2", ("G3", "B3", "D4")),
            ],
            melody=[
                (0.0, "F4", 1.3),
                (1.5, "A4", 0.8),
                (2.4, "D5", 1.0),
                (3.6, "C5", 0.6),
                (4.3, "A4", 1.2),
                (5.7, "B4", 0.7),
                (6.5, "D5", 0.9),
            ],
            arp_patterns=[
                [(0.15, 0, 0.16), (0.95, 1, -0.14)],
                [(0.08, 2, -0.16), (0.68, 0, 0.12), (1.3, 1, -0.06)],
                [(0.22, 1, 0.18), (1.05, 2, -0.12)],
                [(0.12, 0, -0.15), (0.75, 2, 0.14), (1.35, 0, -0.05)],
            ],
            accent_note_starts={0.0, 2.4, 6.5},
            air_offset=0,
            section_gain=0.95,
            pad_fraction=0.82,
            pad_offset=0.2,
            profile={
                "lead_volume": 0.048,
                "lead_waveform": "sine",
                "arp_volume": 0.0095,
                "air_volume": 0.027,
                "chord_volume": 0.032,
            },
        ),
        # 4. G major, airy and open - the breathing-room section.
        _section(
            chord_progression=[
                ("G2", ("G3", "B3", "D4")),
                ("D3", ("D4", "F4", "A4")),
                ("E2", ("E3", "G3", "B3")),
                ("C3", ("C4", "E4", "G4")),
            ],
            melody=[
                (0.0, "B4", 1.0),
                (1.2, "D5", 0.8),
                (2.2, "G5", 1.4),
                (3.9, "F5", 0.7),
                (4.8, "D5", 1.1),
                (6.1, "B4", 0.9),
                (7.0, "G4", 0.7),
            ],
            arp_patterns=[
                [(0.42, 2, -0.1)],
                [(0.24, 1, 0.18)],
                [(0.36, 0, 0.14), (1.28, 2, -0.12)],
                [(0.5, 1, -0.15)],
            ],
            accent_note_starts={2.2},
            air_offset=1,
            section_gain=0.72,
            pad_fraction=1.22,
            pad_offset=0.0,
            profile={
                "lead_volume": 0.044,
                "arp_volume": 0.0085,
                "air_volume": 0.038,
                "chord_volume": 0.028,
                "bass_volume": 0.046,
            },
        ),
        # 5. C major, soft landing - drops back down after the airy section.
        _section(
            chord_progression=[
                ("C3", ("C4", "E4", "G4")),
                ("F2", ("F3", "A3", "C4")),
                ("D3", ("D4", "F4", "A4")),
                ("G2", ("G3", "B3", "D4")),
            ],
            melody=[
                (0.0, "E5", 1.5),
                (1.7, "G5", 0.6),
                (2.4, "E5", 1.1),
                (3.7, "C5", 0.8),
                (4.6, "A4", 1.3),
                (6.1, "F4", 0.7),
                (7.0, "G4", 0.6),
            ],
            arp_patterns=[
                [(0.46, 1, 0.12)],
                [(0.3, 2, -0.14), (1.4, 0, -0.06)],
                [(0.38, 0, 0.14)],
                [(0.22, 1, -0.15), (1.34, 2, -0.05)],
            ],
            accent_note_starts={0.0},
            air_offset=0,
            section_gain=0.82,
            pad_fraction=0.7,
            pad_offset=0.28,
            profile={
                "lead_volume": 0.043,
                "arp_volume": 0.008,
                "air_volume": 0.023,
                "chord_volume": 0.027,
                "bass_volume": 0.044,
            },
        ),
        # 6. A minor, the most melodic and most forward-moving section.
        _section(
            chord_progression=[
                ("A2", ("A3", "C4", "E4")),
                ("F2", ("F3", "A3", "C4")),
                ("C3", ("C4", "E4", "G4")),
                ("G2", ("G3", "B3", "D4")),
            ],
            melody=[
                (0.0, "A4", 0.45),
                (0.5, "C5", 0.4),
                (0.95, "E5", 0.5),
                (1.5, "A5", 0.6),
                (2.2, "G5", 0.45),
                (2.7, "E5", 0.5),
                (3.25, "C5", 0.55),
                (3.85, "D5", 0.5),
                (4.4, "F5", 0.55),
                (5.0, "E5", 0.45),
                (5.5, "C5", 0.5),
                (6.05, "D5", 0.6),
                (6.75, "G5", 0.6),
            ],
            arp_patterns=[
                [(0.05, 0, -0.2), (0.36, 2, 0.18), (0.66, 1, -0.1), (1.3, 2, 0.12)],
                [(0.1, 1, 0.2), (0.44, 0, -0.16), (0.78, 2, 0.1), (1.36, 1, -0.12)],
                [(0.04, 2, -0.18), (0.38, 1, 0.16), (0.7, 0, -0.08), (1.34, 1, 0.1)],
                [(0.12, 0, 0.18), (0.48, 2, -0.14), (0.82, 1, 0.08), (1.4, 0, -0.1)],
            ],
            accent_note_starts={1.5, 3.85, 6.75},
            air_offset=1,
            section_gain=1.10,
            pad_fraction=0.94,
            pad_offset=0.08,
            profile={
                "lead_volume": 0.053,
                "lead_waveform": "triangle",
                "arp_volume": 0.0115,
                "air_volume": 0.032,
                "accent_volume": 0.0085,
            },
        ),
        # 7. F major, reflective close that hands back to section 1's C major.
        _section(
            chord_progression=[
                ("F2", ("F3", "A3", "C4")),
                ("C3", ("C4", "E4", "G4")),
                ("G2", ("G3", "B3", "D4")),
                ("C3", ("C4", "E4", "G4")),
            ],
            melody=[
                (0.0, "C5", 1.2),
                (1.4, "A4", 0.9),
                (2.5, "F4", 1.3),
                (4.0, "G4", 0.8),
                (4.9, "C5", 1.0),
                (6.0, "E5", 1.2),
                (7.3, "D5", 0.5),
            ],
            arp_patterns=[
                [(0.25, 1, 0.14), (1.15, 0, -0.12)],
                [(0.14, 2, -0.14), (0.82, 1, 0.12), (1.5, 0, -0.05)],
                [(0.3, 0, 0.13), (1.1, 2, -0.13)],
                [(0.2, 1, -0.15), (0.88, 0, 0.11), (1.52, 2, -0.05)],
            ],
            accent_note_starts={6.0},
            air_offset=0,
            section_gain=0.88,
            pad_fraction=1.15,
            pad_offset=0.16,
            profile={
                "lead_volume": 0.045,
                "arp_volume": 0.0085,
                "air_volume": 0.029,
                "chord_volume": 0.029,
                "bass_volume": 0.045,
                "lead_release": 0.42,
            },
        ),
    ]


def create_background_loop() -> tuple[list[float], list[float]]:
    """Compose the default BGM and fold it into a seamless loop.

    Seven distinct eight-second sections = 56 s of music.  A further 2 s is
    rendered past the loop point and folded back onto the head, so the browser's
    `loop` hand-off lands on a real waveform continuation rather than a splice.
    """
    section_duration = 8.0
    crossfade_duration = 2.0

    sections = build_sections()
    loop_duration = section_duration * len(sections)
    total_samples = int((loop_duration + crossfade_duration) * SAMPLE_RATE)
    left_channel = [0.0] * total_samples
    right_channel = [0.0] * total_samples

    for section_index, section in enumerate(sections):
        render_background_section(
            left_channel,
            right_channel,
            section_start=section_index * section_duration,
            section=section,
        )
        # Per-section level arc.  Every section is now fully covered (so there is
        # never dead air), which on its own made their envelopes look alike; this
        # puts the slow rise-and-fall back, which is both the musical point and
        # what keeps the sections distinguishable.
        gain = section.get("section_gain", 1.0)
        if gain != 1.0:
            start = section_index * section_duration
            first = int(start * SAMPLE_RATE)
            last = min(total_samples, int((start + section_duration) * SAMPLE_RATE))
            for index in range(first, last):
                left_channel[index] *= gain
                right_channel[index] *= gain

    # The overhang must actually contain music, otherwise the crossfade below
    # would blend the real opening against silence and manufacture the very hole
    # it is meant to remove. So the first two seconds of the piece are rendered
    # again, past the loop point, exactly as playback would continue them.
    for section_index, section in enumerate(sections):
        overhang_start = loop_duration + section_index * section_duration
        if overhang_start >= total_samples - 1:
            break
        render_background_section(
            left_channel,
            right_channel,
            section_start=overhang_start,
            section=section,
        )

    # A sustained chord under the seam, so the hand-off always lands on music.
    resolve_frequencies = tuple(
        note_to_frequency(name) for name in ("C3", "G3", "C4", "E4", "G4")
    )
    add_loop_resolve_pad(
        left_channel,
        right_channel,
        start=loop_duration - section_duration * 0.6,
        duration=section_duration * 0.6 + crossfade_duration,
        frequencies=resolve_frequencies,
        volume=0.019,
    )

    # High-frequency air bed across the whole piece. Tonal partials alone leave
    # 2-8 kHz nearly empty, which is what made the old mix sound muffled.
    add_air_noise(left_channel, right_channel, volume=DEFAULT_AIR_NOISE_VOLUME, seed=20260930)

    loop_samples = int(loop_duration * SAMPLE_RATE)
    crossfade_samples = int(crossfade_duration * SAMPLE_RATE)

    left_loop = build_seamless_loop(
        left_channel[:loop_samples], left_channel[loop_samples:], crossfade_samples
    )
    right_loop = build_seamless_loop(
        right_channel[:loop_samples], right_channel[loop_samples:], crossfade_samples
    )

    # 8 ms edge fade purely as a DC/click safety net.  Unlike the old
    # "fade both edges toward silence" approach this leaves the loop point at
    # full level, so there is no audible hole on every pass.
    edge_samples = int(0.008 * SAMPLE_RATE)
    for index in range(edge_samples):
        blend = index / max(1, edge_samples - 1)
        fade_in = math.sin(blend * math.pi * 0.5)
        fade_out = math.cos(blend * math.pi * 0.5)
        left_loop[index] *= fade_in
        right_loop[index] *= fade_in
        left_loop[-edge_samples + index] *= fade_out
        right_loop[-edge_samples + index] *= fade_out

    return left_loop, right_loop


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
