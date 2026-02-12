import { GameState } from './GameState.ts';
import { Input } from './Input.ts';
import { TouchInput } from './TouchInput.ts';
import { Renderer } from '../render/Renderer.ts';
import { AudioManager } from '../audio/AudioManager.ts';
import { computeLayout } from '../layout.ts';

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export class GameLoop {
  private lastTime = 0;
  private animationId = 0;
  private gameState: GameState;
  private input: Input;
  private touchInput: TouchInput | null = null;
  private renderer: Renderer;
  private audioManager: AudioManager;
  private audioStarted = false;
  private wasGameOver = false;
  private canvas: HTMLCanvasElement;
  private touchEnabled: boolean;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.touchEnabled = isTouchDevice();

    const layout = computeLayout(window.innerWidth, window.innerHeight, this.touchEnabled);
    this.gameState = new GameState();
    this.input = new Input();
    this.renderer = new Renderer(ctx, layout);
    this.audioManager = new AudioManager();
    this.applyLayout(layout);

    if (this.touchEnabled) {
      canvas.style.touchAction = 'none';
      this.touchInput = new TouchInput(canvas, layout);
    }

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onFirstInteraction, { once: true });
    window.addEventListener('touchstart', this.onFirstInteraction, { once: true });
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private onFirstInteraction = (): void => {
    if (!this.audioStarted) {
      this.audioStarted = true;
      this.audioManager.init();
      this.audioManager.play();
    }
  };

  private loop = (currentTime: number): void => {
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const cappedDelta = Math.min(delta, 100);

    this.input.update(cappedDelta, this.gameState);
    this.touchInput?.update(cappedDelta, this.gameState);
    this.gameState.tick(cappedDelta);

    if (this.gameState.hardDropped) {
      this.renderer.triggerShake();
      if (this.audioStarted) this.audioManager.playHardDropLockSfx();
      this.gameState.hardDropped = false;
    }

    if (this.gameState.locked) {
      if (this.audioStarted) this.audioManager.playLockSfx();
      this.gameState.locked = false;
    }

    if (this.gameState.linesCleared > 0) {
      if (this.audioStarted) this.audioManager.playLineClearSfx(this.gameState.linesCleared);
      this.gameState.linesCleared = 0;
    }

    // Mute toggle
    if (this.input.muteToggled) {
      this.audioManager.toggleMute();
      this.input.muteToggled = false;
    }

    // Audio state sync
    if (this.audioStarted) {
      if (this.gameState.isGameOver) {
        this.audioManager.stop();
      } else if (this.wasGameOver && !this.gameState.isGameOver) {
        this.audioManager.restart();
      } else if (this.gameState.isPaused) {
        this.audioManager.pause();
      } else {
        this.audioManager.resume();
        this.audioManager.setLevel(this.gameState.level);
      }
    }
    this.wasGameOver = this.gameState.isGameOver;

    this.renderer.render(this.gameState, cappedDelta, this.touchInput?.buttonState);

    this.animationId = requestAnimationFrame(this.loop);
  };

  private onResize = (): void => {
    const layout = computeLayout(window.innerWidth, window.innerHeight, this.touchEnabled);
    this.renderer.layout = layout;
    this.touchInput?.updateLayout(layout);
    this.applyLayout(layout);
  };

  private applyLayout(layout: ReturnType<typeof computeLayout>): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = layout.canvasWidth * dpr;
    this.canvas.height = layout.canvasHeight * dpr;
    this.canvas.style.width = `${layout.canvasWidth}px`;
    this.canvas.style.height = `${layout.canvasHeight}px`;
    // Setting canvas.width resets the context transform, so re-apply DPR scaling
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onFirstInteraction);
    window.removeEventListener('touchstart', this.onFirstInteraction);
    this.input.destroy();
    this.touchInput?.destroy();
    this.audioManager.destroy();
  }
}
