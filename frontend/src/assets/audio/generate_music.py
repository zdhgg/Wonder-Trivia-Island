import wave
import struct
import math
from pathlib import Path

SAMPLE_RATE = 44100
MAX_AMP = 32767

def note_freq(note_name):
    notes = {'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
             'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
             'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50}
    return notes.get(note_name, 0.0)

def generate_tone(freq, duration, volume=0.5, wave_type='square'):
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = float(i) / SAMPLE_RATE
        if freq == 0:
            sample = 0.0
        else:
            if wave_type == 'square':
                sample = 0.6 if math.sin(2 * math.pi * freq * t) > 0 else -0.6
            elif wave_type == 'triangle':
                sample = 2.0 * abs(2.0 * (t * freq - math.floor(t * freq + 0.5))) - 1.0
            else:
                sample = math.sin(2 * math.pi * freq * t)

        # Envelope: very bouncy ADSR
        attack = 0.02
        decay = 0.15
        sustain = 0.3
        release = 0.05

        env = 1.0
        if t < attack:
            env = t / attack
        elif t < attack + decay:
            env = 1.0 - (1.0 - sustain) * ((t - attack) / decay)
        elif t > duration - release:
            env = sustain * (duration - t) / release
        else:
            env = sustain

        samples.append(sample * env * volume)
    return samples

BPM = 140
BEAT_DURATION = 60.0 / BPM

melody = [
    ('C5', 1), ('G4', 1), ('E4', 1), ('G4', 1), ('A4', 1.5), ('G4', 0.5), ('E4', 2),
    ('F4', 1), ('A4', 1), ('C5', 1), ('A4', 1), ('G4', 4),
    ('D5', 1), ('B4', 1), ('G4', 1), ('B4', 1), ('C5', 1.5), ('B4', 0.5), ('A4', 2),
    ('G4', 1), ('E4', 1), ('D4', 1), ('E4', 1), ('C5', 4),

    ('E5', 1), ('E5', 1), ('E5', 2), ('C5', 1), ('C5', 1), ('C5', 2),
    ('A4', 1), ('C5', 1), ('F5', 1), ('E5', 1), ('D5', 4),
    ('D5', 1), ('D5', 1), ('D5', 2), ('B4', 1), ('B4', 1), ('B4', 2),
    ('G4', 1), ('A4', 1), ('B4', 1), ('D5', 1), ('C5', 4)
]

bass = [
    ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1),
    ('F3', 1), ('C4', 1), ('F3', 1), ('C4', 1), ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1),
    ('G3', 1), ('D4', 1), ('G3', 1), ('D4', 1), ('G3', 1), ('D4', 1), ('G3', 1), ('D4', 1),
    ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1), ('C3', 2), ('G3', 2),

    ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1),
    ('F3', 1), ('C4', 1), ('F3', 1), ('C4', 1), ('G3', 1), ('D4', 1), ('G3', 1), ('D4', 1),
    ('G3', 1), ('D4', 1), ('G3', 1), ('D4', 1), ('G3', 1), ('D4', 1), ('G3', 1), ('D4', 1),
    ('C3', 1), ('G3', 1), ('C3', 1), ('G3', 1), ('C3', 2), ('G3', 2)
]

arpeggio = []
for note, beats in bass:
    arpeggio.append(('0', 0.5))
    arpeggio.append((note[:-1] + '5', 0.5))

def render_track(track_data, wave_type, vol):
    s = []
    for n, b in track_data:
        s.extend(generate_tone(note_freq(n), b * BEAT_DURATION, vol, wave_type))
    return s

print("Rendering melody...")
m_samp = render_track(melody, 'square', 0.25)
print("Rendering bass...")
b_samp = render_track(bass, 'triangle', 0.4)
print("Rendering arpeggio...")
a_samp = render_track(arpeggio, 'sine', 0.15)

print("Mixing tracks...")
total_len = max(len(m_samp), len(b_samp), len(a_samp))
mixed = []
for i in range(total_len):
    m = m_samp[i] if i < len(m_samp) else 0.0
    b = b_samp[i] if i < len(b_samp) else 0.0
    a = a_samp[i] if i < len(a_samp) else 0.0
    mixed.append(m + b + a)

out_path = Path(__file__).with_name('island-bgm-loop.wav')

print("Writing WAV file...")
mixed_looped = mixed * 3

with wave.open(str(out_path), 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    packed = bytearray()
    for s in mixed_looped:
        val = int(max(-1.0, min(1.0, s)) * MAX_AMP)
        packed.extend(struct.pack('<h', val))
    wf.writeframes(packed)

print('Success! Music written to ' + str(out_path))
