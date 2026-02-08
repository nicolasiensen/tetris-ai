import {
  BUFFER_ROWS,
  BOARD_BG,
  GRID_COLOR,
  LINE_CLEAR_ANIM_MS,
  PIECE_COLORS,
  PIECE_COLORS_DARK,
  GHOST_ALPHA,
  VISIBLE_ROWS,
  COLS,
} from '../constants.ts';
import { getCells } from '../core/Board.ts';
import type { Layout } from '../layout.ts';
import type { BoardGrid, ActivePiece, Position, PieceType } from '../types.ts';

const CORNER_RADIUS = 3;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  col: number,
  visibleRow: number,
  type: PieceType,
  alpha: number = 1,
) {
  const pad = Math.max(1, Math.round(layout.cellSize * 0.07));
  const x = layout.boardX + col * layout.cellSize + pad;
  const y = layout.boardY + visibleRow * layout.cellSize + pad;
  const size = layout.cellSize - pad * 2;

  ctx.globalAlpha = alpha;

  ctx.fillStyle = PIECE_COLORS[type];
  drawRoundedRect(ctx, x, y, size, size, CORNER_RADIUS);
  ctx.fill();

  ctx.strokeStyle = PIECE_COLORS_DARK[type];
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x, y, size, size, CORNER_RADIUS);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  board: BoardGrid,
  activePiece: ActivePiece | null,
  ghostPos: Position | null,
  clearingRows: number[],
  clearAnimTimer: number,
) {
  const { boardX, boardY, boardWidth, boardHeight, cellSize } = layout;
  const clearingSet = new Set(clearingRows);

  // Board background
  drawRoundedRect(ctx, boardX, boardY, boardWidth, boardHeight, 6);
  ctx.fillStyle = BOARD_BG;
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  for (let row = 1; row < VISIBLE_ROWS; row++) {
    const y = boardY + row * cellSize;
    ctx.beginPath();
    ctx.moveTo(boardX, y);
    ctx.lineTo(boardX + boardWidth, y);
    ctx.stroke();
  }
  for (let col = 1; col < COLS; col++) {
    const x = boardX + col * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, boardY);
    ctx.lineTo(x, boardY + boardHeight);
    ctx.stroke();
  }

  // Locked cells
  for (let row = BUFFER_ROWS; row < board.length; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      if (cell) {
        drawCell(ctx, layout, col, row - BUFFER_ROWS, cell);
      }
    }
  }

  // Line clear animation: flash white then fade out
  if (clearingRows.length > 0) {
    const progress = Math.min(clearAnimTimer / LINE_CLEAR_ANIM_MS, 1);
    // First half: flash to white. Second half: fade out.
    let alpha: number;
    if (progress < 0.5) {
      alpha = progress * 2; // 0 → 1
    } else {
      alpha = 1 - (progress - 0.5) * 2; // 1 → 0
    }
    for (const row of clearingRows) {
      const visibleRow = row - BUFFER_ROWS;
      if (visibleRow >= 0) {
        const y = boardY + visibleRow * cellSize;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(boardX, y, boardWidth, cellSize);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Ghost piece
  if (activePiece && ghostPos) {
    const ghostCells = getCells(activePiece.type, activePiece.rotation, ghostPos);
    for (const { row, col } of ghostCells) {
      const visibleRow = row - BUFFER_ROWS;
      if (visibleRow >= 0 && !clearingSet.has(row)) {
        drawCell(ctx, layout, col, visibleRow, activePiece.type, GHOST_ALPHA);
      }
    }
  }

  // Active piece
  if (activePiece) {
    const cells = getCells(activePiece.type, activePiece.rotation, activePiece.pos);
    for (const { row, col } of cells) {
      const visibleRow = row - BUFFER_ROWS;
      if (visibleRow >= 0 && !clearingSet.has(row)) {
        drawCell(ctx, layout, col, visibleRow, activePiece.type);
      }
    }
  }

  // Board border
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, boardX, boardY, boardWidth, boardHeight, 6);
  ctx.stroke();
}
