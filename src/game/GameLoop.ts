import { GameState } from './GameState.ts';
import { Input } from './Input.ts';
import { Renderer } from '../render/Renderer.ts';
import { computeLayout } from '../layout.ts';

export class GameLoop {
  private lastTime = 0;
  private animationId = 0;
  private gameState: GameState;
  private input: Input;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    const layout = computeLayout(window.innerWidth, window.innerHeight);
    this.gameState = new GameState();
    this.input = new Input();
    this.renderer = new Renderer(ctx, layout);
    this.applyLayout(layout);

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
    this.gameState.tick(cappedDelta);

    if (this.gameState.hardDropped) {
      this.renderer.triggerShake();
      this.gameState.hardDropped = false;
    }

    this.renderer.render(this.gameState, cappedDelta);

    this.animationId = requestAnimationFrame(this.loop);
  };

  private onResize = (): void => {
    const layout = computeLayout(window.innerWidth, window.innerHeight);
    this.renderer.layout = layout;
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
  }
}
