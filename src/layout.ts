import { COLS, VISIBLE_ROWS, TOUCH_BUTTON_GAP } from './constants.ts';

export interface ButtonRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  touchEnabled: boolean;
  buttonBarTop: number;
  buttonBarHeight: number;
  holdButtonRect: ButtonRect;
  rotateCCWButtonRect: ButtonRect;
  pauseButtonRect: ButtonRect;
}

export function computeLayout(viewportWidth: number, viewportHeight: number, touchEnabled = false): Layout {
  const padding = 10;
  const topPadding = 20;
  const statsHeight = 55;
  const bottomPadding = 15;
  const buttonBarHeight = touchEnabled ? 46 : 0;
  const buttonBarGap = touchEnabled ? TOUCH_BUTTON_GAP : 0;

  // Cell size based on available height
  const availableHeight = viewportHeight - topPadding - statsHeight - bottomPadding - buttonBarHeight - buttonBarGap;
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

  const buttonBarTop = statsTop + statsPanelHeight + buttonBarGap;

  const canvasWidth = nextPanelX + nextPanelWidth + padding;
  const canvasHeight = touchEnabled
    ? buttonBarTop + buttonBarHeight + bottomPadding
    : statsTop + statsPanelHeight + bottomPadding;

  // Compute button rects (3 buttons centered under the board)
  const buttonCount = 3;
  const totalGap = (buttonCount - 1) * TOUCH_BUTTON_GAP;
  const buttonWidth = Math.floor((boardWidth - totalGap) / buttonCount);
  const buttonsStartX = boardX;

  const emptyRect: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };

  const holdButtonRect: ButtonRect = touchEnabled
    ? { x: buttonsStartX, y: buttonBarTop, width: buttonWidth, height: buttonBarHeight }
    : emptyRect;
  const rotateCCWButtonRect: ButtonRect = touchEnabled
    ? { x: buttonsStartX + buttonWidth + TOUCH_BUTTON_GAP, y: buttonBarTop, width: buttonWidth, height: buttonBarHeight }
    : emptyRect;
  const pauseButtonRect: ButtonRect = touchEnabled
    ? { x: buttonsStartX + 2 * (buttonWidth + TOUCH_BUTTON_GAP), y: buttonBarTop, width: buttonWidth, height: buttonBarHeight }
    : emptyRect;

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
    touchEnabled,
    buttonBarTop,
    buttonBarHeight,
    holdButtonRect,
    rotateCCWButtonRect,
    pauseButtonRect,
  };
}
