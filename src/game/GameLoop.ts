import { GameState } from './GameState.ts';
import { Input } from './Input.ts';
import { TouchInput } from './TouchInput.ts';
import { Renderer } from '../render/Renderer.ts';
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
  private canvas: HTMLCanvasElement;
  private touchEnabled: boolean;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.touchEnabled = isTouchDevice();

    const layout = computeLayout(window.innerWidth, window.innerHeight, this.touchEnabled);
    this.gameState = new GameState();
    this.input = new Input();
    this.renderer = new Renderer(ctx, layout);
    this.applyLayout(layout);

    if (this.touchEnabled) {
      canvas.style.touchAction = 'none';
      this.touchInput = new TouchInput(canvas, layout);
    }

    window.addEventListener('resize', this.onResize);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (currentTime: number): void => {
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const cappedDelta = Math.min(delta, 100);

    this.input.update(cappedDelta, this.gameState);
    this.touchInput?.update(cappedDelta, this.gameState);
    this.gameState.tick(cappedDelta);

    if (this.gameState.hardDropped) {
      this.renderer.triggerShake();
      this.gameState.hardDropped = false;
    }

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
    this.canvas.width = layout.canvasWidth;
    this.canvas.height = layout.canvasHeight;
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.input.destroy();
    this.touchInput?.destroy();
  }
}
