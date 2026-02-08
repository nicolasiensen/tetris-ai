import {
  PIECE_COLORS,
  PIECE_COLORS_DARK,
  UI_BG,
  TEXT_COLOR,
  GRID_COLOR,
} from '../constants.ts';
import { PIECE_SHAPES } from '../core/Piece.ts';
import type { Layout } from '../layout.ts';
import type { PieceType } from '../types.ts';

const CORNER_RADIUS = 6;

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

function drawMiniPiece(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  centerX: number,
  centerY: number,
  miniCell: number,
  dimmed: boolean = false,
) {
  const cells = PIECE_SHAPES[type][0];
  let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
  for (const [r, c] of cells) {
    minRow = Math.min(minRow, r);
    maxRow = Math.max(maxRow, r);
    minCol = Math.min(minCol, c);
    maxCol = Math.max(maxCol, c);
  }
  const pieceW = (maxCol - minCol + 1) * miniCell;
  const pieceH = (maxRow - minRow + 1) * miniCell;
  const offsetX = centerX - pieceW / 2;
  const offsetY = centerY - pieceH / 2;
  const pad = Math.max(1, Math.round(miniCell * 0.1));

  ctx.globalAlpha = dimmed ? 0.3 : 1;
  for (const [r, c] of cells) {
    const x = offsetX + (c - minCol) * miniCell + pad;
    const y = offsetY + (r - minRow) * miniCell + pad;
    const size = miniCell - pad * 2;

    ctx.fillStyle = PIECE_COLORS[type];
    drawRoundedRect(ctx, x, y, size, size, 2);
    ctx.fill();

    ctx.strokeStyle = PIECE_COLORS_DARK[type];
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, size, size, 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawUI(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  holdPiece: PieceType | null,
  holdUsed: boolean,
  nextPieces: PieceType[],
  score: number,
  level: number,
  lines: number,
) {
  const { boardX, boardY, boardWidth, holdPanelX, holdPanelWidth, nextPanelX, nextPanelWidth, miniCell, statsTop, statsPanelHeight } = layout;

  // Hold panel
  const holdHeight = miniCell * 4 + 30;
  ctx.fillStyle = UI_BG;
  drawRoundedRect(ctx, holdPanelX, boardY, holdPanelWidth, holdHeight, CORNER_RADIUS);
  ctx.fill();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, holdPanelX, boardY, holdPanelWidth, holdHeight, CORNER_RADIUS);
  ctx.stroke();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${Math.round(miniCell * 0.65)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('HOLD', holdPanelX + holdPanelWidth / 2, boardY + 18);

  if (holdPiece) {
    drawMiniPiece(ctx, holdPiece, holdPanelX + holdPanelWidth / 2, boardY + holdHeight / 2 + 8, miniCell, holdUsed);
  }

  // Next panel
  const nextItemHeight = miniCell * 3;
  const nextPanelHeight = 28 + nextPieces.length * nextItemHeight;

  ctx.fillStyle = UI_BG;
  drawRoundedRect(ctx, nextPanelX, boardY, nextPanelWidth, nextPanelHeight, CORNER_RADIUS);
  ctx.fill();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, nextPanelX, boardY, nextPanelWidth, nextPanelHeight, CORNER_RADIUS);
  ctx.stroke();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${Math.round(miniCell * 0.65)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('NEXT', nextPanelX + nextPanelWidth / 2, boardY + 18);

  for (let i = 0; i < nextPieces.length; i++) {
    drawMiniPiece(
      ctx,
      nextPieces[i],
      nextPanelX + nextPanelWidth / 2,
      boardY + 28 + nextItemHeight * 0.5 + i * nextItemHeight,
      miniCell,
    );
  }

  // Score / Level / Lines — below the board
  ctx.fillStyle = UI_BG;
  drawRoundedRect(ctx, boardX, statsTop, boardWidth, statsPanelHeight, CORNER_RADIUS);
  ctx.fill();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, boardX, statsTop, boardWidth, statsPanelHeight, CORNER_RADIUS);
  ctx.stroke();

  const col1 = boardX + 15;
  const col2 = boardX + boardWidth / 3 + 10;
  const col3 = boardX + (boardWidth * 2) / 3 + 5;
  const labelY = statsTop + 18;
  const valueY = statsTop + 40;

  ctx.textAlign = 'left';

  ctx.fillStyle = '#888';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('SCORE', col1, labelY);
  ctx.fillText('LEVEL', col2, labelY);
  ctx.fillText('LINES', col3, labelY);

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(score.toLocaleString(), col1, valueY);
  ctx.fillText(level.toString(), col2, valueY);
  ctx.fillText(lines.toString(), col3, valueY);
}

export function drawGameOver(ctx: CanvasRenderingContext2D, layout: Layout, score: number) {
  const { boardX, boardY, boardWidth, boardHeight, touchEnabled } = layout;
  const centerX = boardX + boardWidth / 2;
  const centerY = boardY + boardHeight / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(boardX, boardY, boardWidth, boardHeight);

  ctx.textAlign = 'center';

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('GAME OVER', centerX, centerY - 20);

  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(`Score: ${score.toLocaleString()}`, centerX, centerY + 20);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(touchEnabled ? 'Tap to restart' : 'Press R to restart', centerX, centerY + 50);
}

export function drawPause(ctx: CanvasRenderingContext2D, layout: Layout) {
  const { boardX, boardY, boardWidth, boardHeight, touchEnabled } = layout;
  const centerX = boardX + boardWidth / 2;
  const centerY = boardY + boardHeight / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(boardX, boardY, boardWidth, boardHeight);

  ctx.textAlign = 'center';
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('PAUSED', centerX, centerY);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(touchEnabled ? 'Tap pause to resume' : 'Press ESC to resume', centerX, centerY + 35);
}
