// Sound effect voices: piece lock, hard drop lock, line clear

export class SfxEngine {
  private ctx: AudioContext;
  private noiseBuffer: AudioBuffer;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.noiseBuffer = this.createNoiseBuffer();
  }

  private createNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx;
    const length = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Subtle metallic click-thud (~100ms)
  playLock(time: number, destination: AudioNode): void {
    const ctx = this.ctx;

    // Body: sine pitch sweep 200Hz → 80Hz
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.06);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.15);

    // Click: noise burst through bandpass
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  // Punchier impact version of lock (~180ms)
  playHardDropLock(time: number, destination: AudioNode): void {
    const ctx = this.ctx;

    // Impact body: wider sine sweep 300Hz → 50Hz
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.35, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.25);

    // Distortion crack: short square wave burst
    const sq = ctx.createOscillator();
    sq.type = 'square';
    sq.frequency.value = 150;

    const sqFilter = ctx.createBiquadFilter();
    sqFilter.type = 'highpass';
    sqFilter.frequency.value = 800;

    const sqGain = ctx.createGain();
    sqGain.gain.setValueAtTime(0.15, time);
    sqGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    sq.connect(sqFilter);
    sqFilter.connect(sqGain);
    sqGain.connect(destination);
    sq.start(time);
    sq.stop(time + 0.05);

    // Noise burst: bandpass at 4kHz
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 4000;
    noiseFilter.Q.value = 3;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start(time);
    noise.stop(time + 0.08);
  }

  // Rising data sweep — pitch scales with line count
  playLineClear(lineCount: number, time: number, destination: AudioNode): void {
    const ctx = this.ctx;

    const baseFreqs = [0, 400, 550, 700, 900];
    const baseFreq = baseFreqs[lineCount] ?? 400;
    const duration = 0.15 + lineCount * 0.05;

    // Sweep: sawtooth with resonant lowpass filter
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(baseFreq, time);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 2, time + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(baseFreq, time);
    filter.frequency.linearRampToValueAtTime(baseFreq * 3, time + duration);
    filter.Q.value = 6;

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0, time);
    gain1.gain.linearRampToValueAtTime(0.12, time + 0.005);
    gain1.gain.setValueAtTime(0.12, time + duration * 0.6);
    gain1.gain.linearRampToValueAtTime(0, time + duration);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(destination);
    osc1.start(time);
    osc1.stop(time + duration + 0.05);

    // Harmonic: square a fifth above
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = baseFreq * 1.5;

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, time);
    gain2.gain.linearRampToValueAtTime(0.06, time + 0.005);
    gain2.gain.setValueAtTime(0.06, time + duration * 0.6);
    gain2.gain.linearRampToValueAtTime(0, time + duration);

    osc2.connect(gain2);
    gain2.connect(destination);
    osc2.start(time);
    osc2.stop(time + duration + 0.05);

    // 3+ lines: extra octave sawtooth
    if (lineCount >= 3) {
      const osc3 = ctx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.value = baseFreq * 2;

      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0, time);
      gain3.gain.linearRampToValueAtTime(0.04, time + 0.005);
      gain3.gain.setValueAtTime(0.04, time + duration * 0.6);
      gain3.gain.linearRampToValueAtTime(0, time + duration);

      osc3.connect(gain3);
      gain3.connect(destination);
      osc3.start(time);
      osc3.stop(time + duration + 0.05);
    }

    // 4 lines (Tetris): noise sweep through rising bandpass
    if (lineCount >= 4) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2000, time);
      noiseFilter.frequency.linearRampToValueAtTime(8000, time + duration);
      noiseFilter.Q.value = 3;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, time);
      noiseGain.gain.linearRampToValueAtTime(0.08, time + 0.01);
      noiseGain.gain.setValueAtTime(0.08, time + duration * 0.6);
      noiseGain.gain.linearRampToValueAtTime(0, time + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(destination);
      noise.start(time);
      noise.stop(time + duration + 0.05);
    }
  }
}
