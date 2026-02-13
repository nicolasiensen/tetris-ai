import { GameState } from './GameState.ts';
import { Input } from './Input.ts';
import { TouchInput } from './TouchInput.ts';
import { Renderer } from '../render/Renderer.ts';
import { AudioManager } from '../audio/AudioManager.ts';
import { LeaderboardOverlay } from '../ui/LeaderboardOverlay.ts';
import { createSession } from '../api.ts';
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
  private leaderboardOverlay: LeaderboardOverlay;
  private audioStarted = false;
  private canvas: HTMLCanvasElement;
  private touchEnabled: boolean;
  private sessionToken: string | null = null;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.touchEnabled = isTouchDevice();

    const layout = computeLayout(window.innerWidth, window.innerHeight, this.touchEnabled);
    this.gameState = new GameState();
    this.input = new Input();
    this.renderer = new Renderer(ctx, layout);
    this.audioManager = new AudioManager();
    this.leaderboardOverlay = new LeaderboardOverlay(canvas.parentElement!, () => {
      this.input.restartBlocked = false;
      if (this.touchInput) this.touchInput.restartBlocked = false;
      this.gameState.reset();
    });
    this.applyLayout(layout);
    this.requestSession();

    if (this.touchEnabled) {
      canvas.style.touchAction = 'none';
      this.touchInput = new TouchInput(canvas, layout);
    }

    // Subscribe to game state events
    this.gameState.on('hardDrop', () => {
      this.renderer.triggerShake();
      if (this.audioStarted) this.audioManager.playHardDropLockSfx();
    });

    this.gameState.on('lock', () => {
      if (this.audioStarted) this.audioManager.playLockSfx();
    });

    this.gameState.on('lineClear', ({ count }) => {
      if (this.audioStarted) this.audioManager.playLineClearSfx(count);
    });

    this.gameState.on('gameOver', () => {
      if (this.audioStarted) this.audioManager.stop();
      this.input.restartBlocked = true;
      if (this.touchInput) this.touchInput.restartBlocked = true;
      const token = this.sessionToken;
      this.sessionToken = null;
      setTimeout(() => {
        this.leaderboardOverlay.show(
          {
            score: this.gameState.score,
            level: this.gameState.level,
            lines: this.gameState.lines,
          },
          token,
        );
      }, 500);
    });

    this.gameState.on('pause', () => {
      if (this.audioStarted) this.audioManager.pause();
    });

    this.gameState.on('resume', () => {
      if (this.audioStarted) {
        this.audioManager.resume();
        this.audioManager.setLevel(this.gameState.level);
      }
    });

    this.gameState.on('levelChange', ({ level }) => {
      if (this.audioStarted) this.audioManager.setLevel(level);
    });

    this.gameState.on('restart', () => {
      if (this.audioStarted) this.audioManager.restart();
      this.leaderboardOverlay.hide();
      this.requestSession();
    });

    this.input.onMuteToggle = () => this.audioManager.toggleMute();

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
    this.renderer.render(this.gameState, cappedDelta, this.touchInput?.buttonState);

    this.animationId = requestAnimationFrame(this.loop);
  };

  private requestSession(): void {
    createSession()
      .then(({ token }) => {
        this.sessionToken = token;
      })
      .catch(() => {
        this.sessionToken = null;
      });
  }

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
    this.leaderboardOverlay.destroy();
  }
}
