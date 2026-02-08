import { drawBoard } from './BoardRenderer.ts';
import { drawUI, drawGameOver, drawPause } from './UIRenderer.ts';
import type { Layout } from '../layout.ts';
import type { GameState } from '../game/GameState.ts';

const SHAKE_DURATION = 150; // ms
const SHAKE_INTENSITY = 5;  // max pixels offset

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private shakeTimer = 0;
  layout: Layout;

  constructor(ctx: CanvasRenderingContext2D, layout: Layout) {
    this.ctx = ctx;
    this.layout = layout;
  }

  triggerShake(): void {
    this.shakeTimer = SHAKE_DURATION;
  }

  render(state: GameState, delta: number) {
    const ctx = this.ctx;
    const layout = this.layout;

    // Update shake
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const progress = Math.max(0, this.shakeTimer / SHAKE_DURATION);
      const intensity = SHAKE_INTENSITY * progress;
      offsetX = (Math.random() * 2 - 1) * intensity;
      offsetY = (Math.random() * 2 - 1) * intensity;
    }

    ctx.save();
    ctx.clearRect(-10, -10, layout.canvasWidth + 20, layout.canvasHeight + 20);
    ctx.translate(offsetX, offsetY);

    drawBoard(ctx, layout, state.board, state.activePiece, state.getGhostPosition(), state.clearingRows, state.clearAnimTimer);
    drawUI(
      ctx,
      layout,
      state.holdPiece,
      state.holdUsed,
      state.getNextPieces(),
      state.score,
      state.level,
      state.lines,
    );

    if (state.isGameOver) {
      drawGameOver(ctx, layout, state.score);
    } else if (state.isPaused) {
      drawPause(ctx, layout);
    }

    ctx.restore();
  }
}
