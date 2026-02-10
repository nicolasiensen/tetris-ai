// Lookahead scheduler: uses setInterval to schedule notes ahead
// using AudioContext's high-precision clock

import {
  AUDIO_BASE_BPM,
  AUDIO_MAX_BPM,
  AUDIO_BPM_PER_LEVEL,
  AUDIO_SCHEDULE_AHEAD,
  AUDIO_LOOKAHEAD,
} from '../constants.ts';
import {
  TOTAL_STEPS,
  getLeadNote,
  getBassFreq,
  getArpFreq,
  getDrumStep,
} from './Composition.ts';
import { SynthEngine } from './SynthEngine.ts';
import { DrumEngine } from './DrumEngine.ts';

export class Transport {
  private ctx: AudioContext;
  private synth: SynthEngine;
  private drums: DrumEngine;
  private leadDest: AudioNode;
  private bassDest: AudioNode;
  private arpDest: AudioNode;
  private drumDest: AudioNode;

  private bpm: number = AUDIO_BASE_BPM;
  private currentStep = 0;
  private nextStepTime = 0;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;

  constructor(
    ctx: AudioContext,
    synth: SynthEngine,
    drums: DrumEngine,
    leadDest: AudioNode,
    bassDest: AudioNode,
    arpDest: AudioNode,
    drumDest: AudioNode,
  ) {
    this.ctx = ctx;
    this.synth = synth;
    this.drums = drums;
    this.leadDest = leadDest;
    this.bassDest = bassDest;
    this.arpDest = arpDest;
    this.drumDest = drumDest;
  }

  set level(n: number) {
    this.bpm = Math.min(
      AUDIO_BASE_BPM + (n - 1) * AUDIO_BPM_PER_LEVEL,
      AUDIO_MAX_BPM,
    );
  }

  private get sixteenthDuration(): number {
    return 60 / this.bpm / 4;
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05; // tiny lead-in
    this.schedule();
    this.timerHandle = setInterval(() => this.schedule(), AUDIO_LOOKAHEAD);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private schedule(): void {
    const deadline = this.ctx.currentTime + AUDIO_SCHEDULE_AHEAD;
    while (this.nextStepTime < deadline) {
      this.playStep(this.currentStep, this.nextStepTime);
      // Recalculate duration each step for smooth BPM transitions
      this.nextStepTime += this.sixteenthDuration;
      this.currentStep = (this.currentStep + 1) % TOTAL_STEPS;
    }
  }

  private playStep(step: number, time: number): void {
    const dur = this.sixteenthDuration;

    // Lead melody
    const leadFreq = getLeadNote(step);
    if (leadFreq != null) {
      this.synth.playLeadNote(leadFreq, time, dur * 1.8, this.leadDest);
    }

    // Bass
    const bassFreq = getBassFreq(step);
    if (bassFreq != null) {
      this.synth.playBassNote(bassFreq, time, dur * 1.5, this.bassDest);
    }

    // Arp
    const arpFreq = getArpFreq(step);
    if (arpFreq != null) {
      this.synth.playArpNote(arpFreq, time, dur, this.arpDest);
    }

    // Drums
    const drumStep = getDrumStep(step);
    if (drumStep.kick) this.drums.playKick(time, this.drumDest);
    if (drumStep.snare) this.drums.playSnare(time, this.drumDest);
    if (drumStep.hihat) this.drums.playHiHat(time, this.drumDest);
  }
}
