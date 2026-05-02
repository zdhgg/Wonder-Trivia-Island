export const DEFAULT_AUDIO_PREFERENCES = Object.freeze({
  masterVolume: 0.72,
  musicVolume: 0.42,
  sfxVolume: 0.9,
  musicEnabled: true,
  sfxEnabled: true
});

export const AUDIO_CUES = Object.freeze({
  success: Object.freeze([
    { frequency: 523.25, start: 0, duration: 0.12, volume: 0.12, type: "triangle" },
    { frequency: 659.25, start: 0.12, duration: 0.12, volume: 0.12, type: "triangle" },
    { frequency: 783.99, start: 0.24, duration: 0.18, volume: 0.15, type: "triangle" }
  ]),
  error: Object.freeze([
    { frequency: 320, start: 0, duration: 0.13, volume: 0.14, type: "sawtooth" },
    { frequency: 270, start: 0.13, duration: 0.18, volume: 0.16, type: "sawtooth" }
  ]),
  finish: Object.freeze([
    { frequency: 523.25, start: 0, duration: 0.1, volume: 0.1, type: "triangle" },
    { frequency: 659.25, start: 0.1, duration: 0.1, volume: 0.1, type: "triangle" },
    { frequency: 783.99, start: 0.2, duration: 0.12, volume: 0.12, type: "triangle" },
    { frequency: 1046.5, start: 0.32, duration: 0.22, volume: 0.15, type: "triangle" }
  ]),
  toggle: Object.freeze([
    { frequency: 493.88, start: 0, duration: 0.08, volume: 0.09, type: "triangle" },
    { frequency: 659.25, start: 0.08, duration: 0.16, volume: 0.11, type: "triangle" }
  ])
});

const BGM_SECTION_DURATION = 8;
const BGM_BEAT = 0.5;

function noteToFrequency(noteName) {
  const noteOffsets = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11
  };
  const pitch = noteName.slice(0, -1);
  const octave = Number(noteName.slice(-1));
  const semitoneOffset = noteOffsets[pitch] - 9 + (octave - 4) * 12;
  return 440 * 2 ** (semitoneOffset / 12);
}

function mergeSectionProfile(overrides = {}) {
  return {
    chordVolume: 0.0036,
    chordPan: 0.05,
    chordDuration: 1.84,
    shimmerVolume: 0.0012,
    shimmerDuration: 1.84,
    bassVolume: 0.0042,
    bassDuration: 0.22,
    arpVolume: 0.0018,
    arpDuration: 0.1,
    leadVolume: 0.0076,
    leadType: "sine",
    accentVolume: 0.0022,
    accentDuration: 0.1,
    ...overrides
  };
}

function buildBackgroundSection(sectionStart, section, profile) {
  const layers = {
    lead: [],
    bass: [],
    pad: [],
    arp: [],
    accent: []
  };

  section.chordProgression.forEach(([bassNote, chordNotes], barIndex) => {
    const barStart = sectionStart + barIndex * BGM_BEAT * 4;

    chordNotes.forEach((chordNote) => {
      layers.pad.push({
        frequency: noteToFrequency(chordNote),
        start: barStart,
        duration: profile.chordDuration,
        volume: profile.chordVolume,
        type: "sine"
      });
      layers.pad.push({
        frequency: noteToFrequency(chordNote) * 2,
        start: barStart,
        duration: profile.shimmerDuration,
        volume: profile.shimmerVolume,
        type: "triangle"
      });
    });

    for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
      layers.bass.push({
        frequency: noteToFrequency(bassNote),
        start: barStart + beatIndex * BGM_BEAT,
        duration: profile.bassDuration,
        volume: profile.bassVolume,
        type: "sine"
      });
    }

    section.arpPatterns[barIndex].forEach(([offset, noteIndex]) => {
      layers.arp.push({
        frequency: noteToFrequency(chordNotes[noteIndex]),
        start: barStart + offset,
        duration: profile.arpDuration,
        volume: profile.arpVolume,
        type: "triangle"
      });
    });
  });

  section.melody.forEach(([start, noteName, duration]) => {
    layers.lead.push({
      frequency: noteToFrequency(noteName),
      start: sectionStart + start,
      duration,
      volume: profile.leadVolume,
      type: profile.leadType
    });

    if (section.accentNoteStarts.has(Number(start.toFixed(2)))) {
      layers.accent.push({
        frequency: noteToFrequency(noteName),
        start: sectionStart + start,
        duration: Math.min(profile.accentDuration, Math.max(0.08, duration * 0.32)),
        volume: profile.accentVolume,
        type: "triangle"
      });
    }
  });

  return layers;
}

const bgmSections = [
  {
    chordProgression: [
      ["C3", ["G3", "C4", "E4"]],
      ["A2", ["A3", "C4", "E4"]],
      ["F2", ["A3", "C4", "F4"]],
      ["G2", ["B3", "D4", "G4"]]
    ],
    melody: [
      [0.0, "B4", 0.32],
      [0.34, "C5", 0.28],
      [0.66, "D5", 0.34],
      [1.06, "E5", 0.42],
      [1.54, "D5", 0.28],
      [1.86, "B4", 0.18],
      [2.0, "A4", 0.34],
      [2.36, "B4", 0.28],
      [2.68, "C5", 0.34],
      [3.08, "E5", 0.44],
      [3.58, "D5", 0.26],
      [3.86, "C5", 0.18],
      [4.0, "C5", 0.32],
      [4.34, "D5", 0.3],
      [4.68, "E5", 0.34],
      [5.08, "F5", 0.44],
      [5.58, "E5", 0.26],
      [5.86, "C5", 0.18],
      [6.0, "B4", 0.32],
      [6.34, "C5", 0.28],
      [6.66, "D5", 0.34],
      [7.06, "G5", 0.4],
      [7.5, "E5", 0.2],
      [7.74, "D5", 0.16]
    ],
    accentNoteStarts: new Set([0.0, 1.06, 2.0, 3.08, 4.0, 5.08, 6.0, 7.06]),
    arpPatterns: [
      [
        [0.22, 1],
        [0.68, 2],
        [1.2, 1],
        [1.62, 0]
      ],
      [
        [0.16, 0],
        [0.58, 1],
        [1.08, 2],
        [1.56, 1]
      ],
      [
        [0.28, 1],
        [0.82, 2],
        [1.34, 0],
        [1.72, 2]
      ],
      [
        [0.2, 1],
        [0.64, 2],
        [1.12, 1],
        [1.5, 0]
      ]
    ],
    profile: {}
  },
  {
    chordProgression: [
      ["F2", ["A3", "C4", "F4"]],
      ["C3", ["G3", "C4", "E4"]],
      ["D3", ["A3", "D4", "F4"]],
      ["G2", ["B3", "D4", "G4"]]
    ],
    melody: [
      [0.0, "A4", 0.34],
      [0.36, "C5", 0.3],
      [0.72, "E5", 0.38],
      [1.16, "F5", 0.42],
      [1.64, "E5", 0.24],
      [1.92, "C5", 0.18],
      [2.0, "G4", 0.32],
      [2.34, "A4", 0.28],
      [2.66, "C5", 0.34],
      [3.04, "D5", 0.4],
      [3.5, "E5", 0.28],
      [3.8, "D5", 0.18],
      [4.0, "A4", 0.32],
      [4.34, "B4", 0.28],
      [4.66, "D5", 0.34],
      [5.08, "F5", 0.42],
      [5.56, "E5", 0.24],
      [5.84, "D5", 0.18],
      [6.0, "G4", 0.32],
      [6.34, "A4", 0.28],
      [6.66, "B4", 0.32],
      [7.04, "D5", 0.42],
      [7.52, "C5", 0.2],
      [7.76, "B4", 0.16]
    ],
    accentNoteStarts: new Set([0.0, 1.16, 2.0, 3.04, 4.0, 5.08, 6.0, 7.04]),
    arpPatterns: [
      [
        [0.18, 0],
        [0.74, 2],
        [1.26, 1],
        [1.62, 2]
      ],
      [
        [0.22, 1],
        [0.68, 2],
        [1.18, 0],
        [1.58, 1]
      ],
      [
        [0.24, 1],
        [0.78, 2],
        [1.32, 1],
        [1.7, 0]
      ],
      [
        [0.18, 1],
        [0.62, 2],
        [1.14, 1],
        [1.54, 0]
      ]
    ],
    profile: {
      leadVolume: 0.0079,
      shimmerVolume: 0.00135,
      arpVolume: 0.0017
    }
  },
  {
    chordProgression: [
      ["A2", ["A3", "C4", "E4"]],
      ["F2", ["A3", "C4", "F4"]],
      ["C3", ["G3", "C4", "E4"]],
      ["G2", ["B3", "D4", "G4"]]
    ],
    melody: [
      [0.0, "E5", 0.34],
      [0.36, "C5", 0.28],
      [0.68, "B4", 0.32],
      [1.06, "C5", 0.38],
      [1.5, "E5", 0.4],
      [1.94, "D5", 0.18],
      [2.0, "C5", 0.34],
      [2.36, "A4", 0.28],
      [2.68, "C5", 0.34],
      [3.08, "E5", 0.4],
      [3.54, "D5", 0.26],
      [3.84, "C5", 0.18],
      [4.0, "G4", 0.34],
      [4.36, "B4", 0.28],
      [4.68, "C5", 0.34],
      [5.08, "E5", 0.4],
      [5.54, "G5", 0.24],
      [5.82, "E5", 0.18],
      [6.0, "D5", 0.32],
      [6.34, "B4", 0.28],
      [6.66, "A4", 0.3],
      [7.02, "B4", 0.34],
      [7.4, "D5", 0.22],
      [7.66, "E5", 0.18]
    ],
    accentNoteStarts: new Set([0.0, 1.06, 2.0, 3.08, 4.0, 5.08, 6.0, 7.02]),
    arpPatterns: [
      [
        [0.2, 2],
        [0.66, 1],
        [1.18, 0],
        [1.62, 1]
      ],
      [
        [0.24, 1],
        [0.76, 2],
        [1.28, 0],
        [1.68, 1]
      ],
      [
        [0.18, 0],
        [0.64, 1],
        [1.16, 2],
        [1.58, 1]
      ],
      [
        [0.22, 1],
        [0.72, 2],
        [1.24, 0],
        [1.6, 1]
      ]
    ],
    profile: {
      leadVolume: 0.0073,
      bassVolume: 0.0039,
      arpVolume: 0.0015,
      accentVolume: 0.0019
    }
  }
];

const bgmLayers = bgmSections.map((section, sectionIndex) =>
  buildBackgroundSection(sectionIndex * BGM_SECTION_DURATION, section, mergeSectionProfile(section.profile))
);

export const ISLAND_BGM_TRACK = Object.freeze({
  loopDuration: BGM_SECTION_DURATION * bgmSections.length,
  layers: Object.freeze(
    ["lead", "bass", "pad", "arp", "accent"].map((layerName) =>
      Object.freeze(bgmLayers.flatMap((sectionLayers) => sectionLayers[layerName]))
    )
  )
});
