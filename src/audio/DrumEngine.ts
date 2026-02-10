// Drum voice factory: kick, snare, hi-hat using oscillators and noise

export class DrumEngine {
  private ctx: AudioContext;
  private noiseBuffer: AudioBuffer;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.noiseBuffer = this.createNoiseBuffer();
  }

  private createNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx;
    const length = ctx.sampleRate * 0.5; // 500ms of noise
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Sine pitch sweep from 150Hz to 40Hz
  playKick(time: number, destination: AudioNode): void {
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  // Triangle body + noise snap
  playSnare(time: number, destination: AudioNode): void {
    const ctx = this.ctx;

    // Body (triangle)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 180;

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.35, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.15);

    // Noise snap
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start(time);
    noise.stop(time + 0.12);
  }

  // Filtered noise burst
  playHiHat(time: number, destination: AudioNode): void {
    const ctx = this.ctx;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
    noise.stop(time + 0.08);
  }
}
