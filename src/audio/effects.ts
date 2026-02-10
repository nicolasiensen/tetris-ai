// Audio effect chain factory functions

export function createReverb(ctx: AudioContext): ConvolverNode {
  const convolver = ctx.createConvolver();

  // Generate synthetic impulse response (1.5 seconds)
  const rate = ctx.sampleRate;
  const length = rate * 1.5;
  const impulse = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Exponential decay with random noise
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }

  convolver.buffer = impulse;
  return convolver;
}

export function createDelay(ctx: AudioContext, bpm: number): DelayNode {
  // 3/16 note delay
  const sixteenthDuration = 60 / bpm / 4;
  const delay = ctx.createDelay(2);
  delay.delayTime.value = sixteenthDuration * 3;
  return delay;
}

export function createCompressor(ctx: AudioContext): DynamicsCompressorNode {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;
  return compressor;
}
