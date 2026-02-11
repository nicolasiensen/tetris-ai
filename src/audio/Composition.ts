// Pure data: note sequences, chord progressions, and drum patterns
// All in E minor: Em - Am - C - B (i - iv - VI - V)
// 8 bars, 16 steps per bar = 128 steps total

// MIDI note numbers for reference, converted to frequency at playback
// E2=64.18, E3=164.81, E4=329.63, B3=246.94, etc.

function noteFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Chord tones per bar (2 bars each chord = 32 steps per chord)
// Em: E G B | Am: A C E | C: C E G | B: B D# F#
const CHORD_BARS: number[][] = [
  [64, 67, 71], // Em (E4, G4, B4)
  [64, 67, 71], // Em
  [69, 72, 76], // Am (A4, C5, E5)
  [69, 72, 76], // Am
  [72, 76, 79], // C  (C5, E5, G5)
  [72, 76, 79], // C
  [71, 75, 78], // B  (B4, D#5, F#5)
  [71, 75, 78], // B
];

// Root notes per bar (bass plays these)
const BASS_ROOTS: number[] = [
  40, // E2
  40, // E2
  45, // A2
  45, // A2
  48, // C3
  48, // C3
  47, // B2
  47, // B2
];

// Lead melody: step index within bar -> MIDI note (null = rest)
// Plays a cyberpunk-style melodic phrase over the chords
const LEAD_PATTERN: (number | null)[] = [
  // Bar 1 (Em)
  76,
  null,
  71,
  null,
  72,
  null,
  71,
  null,
  67,
  null,
  null,
  null,
  64,
  null,
  null,
  null,
  // Bar 2 (Em)
  76,
  null,
  79,
  null,
  76,
  null,
  71,
  null,
  72,
  null,
  71,
  null,
  null,
  null,
  null,
  null,
  // Bar 3 (Am)
  69,
  null,
  72,
  null,
  76,
  null,
  72,
  null,
  69,
  null,
  null,
  null,
  76,
  null,
  null,
  null,
  // Bar 4 (Am)
  77,
  null,
  76,
  null,
  72,
  null,
  69,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  // Bar 5 (C)
  79,
  null,
  76,
  null,
  72,
  null,
  76,
  null,
  79,
  null,
  null,
  null,
  84,
  null,
  null,
  null,
  // Bar 6 (C)
  79,
  null,
  76,
  null,
  72,
  null,
  null,
  null,
  79,
  null,
  76,
  null,
  null,
  null,
  null,
  null,
  // Bar 7 (B)
  78,
  null,
  75,
  null,
  71,
  null,
  75,
  null,
  78,
  null,
  null,
  null,
  83,
  null,
  null,
  null,
  // Bar 8 (B)
  78,
  null,
  75,
  null,
  71,
  null,
  null,
  null,
  75,
  null,
  78,
  null,
  null,
  null,
  null,
  null,
];

// Bass: step index within bar -> plays root + octave pattern
// Plays on beats 1, the "and" of 2, beat 3, and the "and" of 4
const BASS_STEPS: number[] = [0, 3, 6, 8, 10, 12];

// Arp: plays every other sixteenth, cycling through chord tones
const ARP_STEPS: number[] = [0, 2, 4, 6, 8, 10, 12, 14];

// Drums pattern per bar (16 steps)
export interface DrumStep {
  kick: boolean;
  snare: boolean;
  hihat: boolean;
}

const DRUM_PATTERN: DrumStep[] = [
  // Classic electronic beat
  { kick: true, snare: false, hihat: true }, // 1
  { kick: false, snare: false, hihat: false }, //
  { kick: false, snare: false, hihat: true }, // 1+
  { kick: false, snare: false, hihat: false }, //
  { kick: false, snare: true, hihat: true }, // 2
  { kick: false, snare: false, hihat: false }, //
  { kick: false, snare: false, hihat: true }, // 2+
  { kick: true, snare: false, hihat: false }, //
  { kick: true, snare: false, hihat: true }, // 3
  { kick: false, snare: false, hihat: false }, //
  { kick: false, snare: false, hihat: true }, // 3+
  { kick: false, snare: false, hihat: false }, //
  { kick: false, snare: true, hihat: true }, // 4
  { kick: false, snare: false, hihat: false }, //
  { kick: true, snare: false, hihat: true }, // 4+
  { kick: false, snare: false, hihat: true }, //
];

export const TOTAL_STEPS = 128; // 8 bars * 16 steps

export function getLeadNote(step: number): number | null {
  const note = LEAD_PATTERN[step];
  return note != null ? noteFreq(note) : null;
}

export function getBassFreq(step: number): number | null {
  const bar = Math.floor(step / 16);
  const barStep = step % 16;
  if (!BASS_STEPS.includes(barStep)) return null;
  const root = BASS_ROOTS[bar];
  // Alternate between root and octave up
  return noteFreq(barStep < 8 ? root : root + 12);
}

export function getArpFreq(step: number): number | null {
  const bar = Math.floor(step / 16);
  const barStep = step % 16;
  if (!ARP_STEPS.includes(barStep)) return null;
  const chordTones = CHORD_BARS[bar];
  // Cycle through chord tones and add octave variation
  const idx = ARP_STEPS.indexOf(barStep);
  const tone = chordTones[idx % chordTones.length];
  // Play one octave up for upper arp notes
  return noteFreq(tone + (idx >= 4 ? 12 : 0));
}

export function getDrumStep(step: number): DrumStep {
  return DRUM_PATTERN[step % 16];
}
