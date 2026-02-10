// Voice factory for lead, bass, and arp synth voices

export class SynthEngine {
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  // Detuned dual-sawtooth with lowpass filter sweep
  playLeadNote(
    freq: number,
    time: number,
    duration: number,
    destination: AudioNode,
  ): void {
    const ctx = this.ctx;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.005; // slight detune

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.linearRampToValueAtTime(3000, time + duration * 0.3);
    filter.frequency.linearRampToValueAtTime(1200, time + duration);
    filter.Q.value = 4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
    gain.gain.setValueAtTime(0.15, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  // Sawtooth + sub-octave square, heavy lowpass
  playBassNote(
    freq: number,
    time: number,
    duration: number,
    destination: AudioNode,
  ): void {
    const ctx = this.ctx;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq / 2; // sub-octave

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 2;

    const gain1 = ctx.createGain();
    gain1.gain.value = 0.2;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.12;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(1, time + 0.005);
    envelope.gain.setValueAtTime(1, time + duration * 0.6);
    envelope.gain.linearRampToValueAtTime(0, time + duration);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(filter);
    gain2.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  // Square wave with bandpass filter, short percussive
  playArpNote(
    freq: number,
    time: number,
    duration: number,
    destination: AudioNode,
  ): void {
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq * 2;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    const noteDur = duration * 0.4; // short percussive
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + noteDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + noteDur + 0.05);
  }
}
