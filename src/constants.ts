import type { PieceType } from './types.ts';

// Board dimensions
export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const BUFFER_ROWS = 4;
export const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS;

// Timing
export const LINE_CLEAR_ANIM_MS = 300;
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const DAS_DELAY_MS = 167;
export const ARR_MS = 33;
export const SOFT_DROP_FACTOR = 20;

// Level/speed — ms per gravity drop
export function getDropInterval(level: number): number {
  const speeds = [
    1000, 793, 618, 473, 355, 262, 190, 135, 94, 64,
    43, 28, 18, 12, 8, 5, 3, 2, 1, 1,
  ];
  return speeds[Math.min(level - 1, speeds.length - 1)];
}

export const LINES_PER_LEVEL = 10;

// Scoring
export const SCORE_TABLE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};
export const SOFT_DROP_SCORE = 1;
export const HARD_DROP_SCORE = 2;

// Colors
export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

export const PIECE_COLORS_DARK: Record<PieceType, string> = {
  I: '#009b9b',
  O: '#9b9b00',
  T: '#6800a0',
  S: '#009b00',
  Z: '#9b0000',
  J: '#00009b',
  L: '#9b6800',
};

// Touch input
export const TOUCH_DRAG_THRESHOLD = 10;
export const TOUCH_TAP_MAX_MS = 200;
export const TOUCH_TAP_MAX_DISTANCE = 15;
export const TOUCH_SWIPE_VELOCITY = 0.8; // px/ms
export const TOUCH_BUTTON_GAP = 12;

export const GHOST_ALPHA = 0.25;
export const BOARD_BG = '#1a1a2e';
export const GRID_COLOR = '#2a2a4a';
export const UI_BG = '#16213e';
export const TEXT_COLOR = '#e0e0e0';
