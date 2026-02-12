// Top-level audio facade: init, play, pause, resume, stop, restart, mute, setLevel
// Builds the full signal chain and manages state transitions

import { AUDIO_BASE_BPM, AUDIO_MASTER_VOLUME } from '../constants.ts';
import { SynthEngine } from './SynthEngine.ts';
import { DrumEngine } from './DrumEngine.ts';
import { SfxEngine } from './SfxEngine.ts';
import { Transport } from './Transport.ts';
import { createReverb, createDelay, createCompressor } from './effects.ts';

type AudioState = 'uninitialized' | 'stopped' | 'playing' | 'paused';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private transport: Transport | null = null;
  private masterGain: GainNode | null = null;
  private sfx: SfxEngine | null = null;
  private sfxGain: GainNode | null = null;
  private state: AudioState = 'uninitialized';
  private muted = false;
  private savedVolume = AUDIO_MASTER_VOLUME;

  init(): void {
    if (this.state !== 'uninitialized') return;

    const ctx = new AudioContext();
    this.ctx = ctx;

    // Create effects chain
    const compressor = createCompressor(ctx);
    const reverb = createReverb(ctx);
    const delay = createDelay(ctx, AUDIO_BASE_BPM);

    // Master gain → compressor → destination
    const masterGain = ctx.createGain();
    masterGain.gain.value = AUDIO_MASTER_VOLUME;
    this.masterGain = masterGain;

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Reverb bus (wet mix)
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.2;
    reverb.connect(reverbGain);
    reverbGain.connect(compressor);

    // Delay bus (wet mix)
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.15;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.3;
    delay.connect(delayGain);
    delayGain.connect(compressor);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);

    // Dry bus → compressor
    // Each voice gets its own gain node routing to dry + sends
    const leadGain = ctx.createGain();
    leadGain.gain.value = 0.4;
    leadGain.connect(compressor); // dry
    leadGain.connect(reverb); // reverb send
    leadGain.connect(delay); // delay send

    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.4;
    bassGain.connect(compressor);

    const arpGain = ctx.createGain();
    arpGain.gain.value = 0.4;
    arpGain.connect(compressor);
    arpGain.connect(delay); // delay send for arp

    const drumGain = ctx.createGain();
    drumGain.gain.value = 0.4;
    drumGain.connect(compressor);

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = 1;
    sfxGain.connect(compressor);
    this.sfxGain = sfxGain;

    // Create engines
    const synth = new SynthEngine(ctx);
    const drums = new DrumEngine(ctx);
    this.sfx = new SfxEngine(ctx);

    // Create transport
    this.transport = new Transport(ctx, synth, drums, leadGain, bassGain, arpGain, drumGain);

    this.state = 'stopped';

    // Apply mute state if already muted before init
    if (this.muted) {
      masterGain.gain.value = 0;
    }
  }

  play(): void {
    if (this.state !== 'stopped') return;
    this.ctx!.resume();
    this.transport!.start();
    this.state = 'playing';
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.ctx!.suspend();
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.ctx!.resume();
    this.state = 'playing';
  }

  stop(): void {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    this.transport!.stop();
    this.state = 'stopped';
  }

  restart(): void {
    this.stop();
    this.play();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      if (this.muted) {
        this.savedVolume = this.masterGain.gain.value;
        this.masterGain.gain.value = 0;
      } else {
        this.masterGain.gain.value = this.savedVolume;
      }
    }
  }

  playLockSfx(): void {
    if (!this.ctx || !this.sfx || !this.sfxGain) return;
    this.sfx.playLock(this.ctx.currentTime, this.sfxGain);
  }

  playHardDropLockSfx(): void {
    if (!this.ctx || !this.sfx || !this.sfxGain) return;
    this.sfx.playHardDropLock(this.ctx.currentTime, this.sfxGain);
  }

  playLineClearSfx(lineCount: number): void {
    if (!this.ctx || !this.sfx || !this.sfxGain) return;
    this.sfx.playLineClear(lineCount, this.ctx.currentTime, this.sfxGain);
  }

  setLevel(level: number): void {
    if (this.transport) {
      this.transport.level = level;
    }
  }

  destroy(): void {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.transport = null;
    this.masterGain = null;
    this.sfx = null;
    this.sfxGain = null;
    this.state = 'uninitialized';
  }
}
