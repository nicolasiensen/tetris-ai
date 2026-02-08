import { COLS, VISIBLE_ROWS } from './constants.ts';

export interface Layout {
  cellSize: number;
  miniCell: number;
  padding: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  holdPanelX: number;
  holdPanelWidth: number;
  nextPanelX: number;
  nextPanelWidth: number;
  statsTop: number;
  statsPanelHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function computeLayout(viewportWidth: number, viewportHeight: number): Layout {
  const padding = 10;
  const topPadding = 20;
  const statsHeight = 55;
  const bottomPadding = 15;

  // Cell size based on available height
  const availableHeight = viewportHeight - topPadding - statsHeight - bottomPadding;
  const cellFromHeight = Math.floor(availableHeight / VISIBLE_ROWS);

  // Also constrain by width: board + two side panels + gaps must fit
  // sidePanelWidth = 5 * cellSize, gap = padding * 2
  // total = padding + sidePanel + padding + board + padding + sidePanel + padding
  // total = 4*padding + 5*cell + COLS*cell + 5*cell = 4*padding + (COLS+10)*cell
  const cellFromWidth = Math.floor((viewportWidth - 4 * padding) / (COLS + 10));

  const cellSize = Math.max(12, Math.min(cellFromHeight, cellFromWidth, 36));
  const miniCell = Math.round(cellSize * 0.65);

  const holdPanelWidth = 5 * cellSize;
  const nextPanelWidth = 5 * cellSize;
  const boardWidth = COLS * cellSize;
  const boardHeight = VISIBLE_ROWS * cellSize;

  const boardX = holdPanelWidth + padding * 2;
  const boardY = topPadding;
  const holdPanelX = padding;
  const nextPanelX = boardX + boardWidth + padding;

  const statsTop = boardY + boardHeight + padding;
  const statsPanelHeight = statsHeight;

  const canvasWidth = nextPanelX + nextPanelWidth + padding;
  const canvasHeight = statsTop + statsPanelHeight + bottomPadding;

  return {
    cellSize,
    miniCell,
    padding,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    holdPanelX,
    holdPanelWidth,
    nextPanelX,
    nextPanelWidth,
    statsTop,
    statsPanelHeight,
    canvasWidth,
    canvasHeight,
  };
}
