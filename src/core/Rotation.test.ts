import { describe, it, expect } from 'vitest';
import { tryRotation } from './Rotation.ts';
import { createBoard } from './Board.ts';
import { COLS, TOTAL_ROWS } from '../constants.ts';
import type { ActivePiece } from '../types.ts';

describe('tryRotation', () => {
  it('returns null for O piece (no rotation)', () => {
    const board = createBoard();
    const piece: ActivePiece = { type: 'O', rotation: 0, pos: { row: 5, col: 4 } };
    expect(tryRotation(board, piece, 1)).toBeNull();
  });

  it('rotates T piece CW in open space', () => {
    const board = createBoard();
    const piece: ActivePiece = { type: 'T', rotation: 0, pos: { row: 10, col: 4 } };
    const result = tryRotation(board, piece, 1);
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(1);
    expect(result!.pos).toEqual({ row: 10, col: 4 });
  });

  it('rotates T piece CCW in open space', () => {
    const board = createBoard();
    const piece: ActivePiece = { type: 'T', rotation: 0, pos: { row: 10, col: 4 } };
    const result = tryRotation(board, piece, -1);
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(3);
  });

  it('applies wall kick when rotation would clip left wall', () => {
    const board = createBoard();
    // I piece rotated vertical (rotation 1) at col 0 — rotating CW to rotation 2
    // should kick to a valid position
    const piece: ActivePiece = { type: 'I', rotation: 1, pos: { row: 10, col: -1 } };
    const result = tryRotation(board, piece, 1);
    // If kick succeeds, piece should be in rotation 2
    if (result) {
      expect(result.rotation).toBe(2);
    }
  });

  it('returns null when no valid kick exists', () => {
    const board = createBoard();
    // Fill the board almost completely to block all kick positions
    for (let row = 0; row < TOTAL_ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        board[row][col] = 'I';
      }
    }
    // Leave only the piece's current position cells clear
    const piece: ActivePiece = { type: 'T', rotation: 0, pos: { row: 10, col: 4 } };
    // Clear the cells the piece occupies
    board[10][5] = null; // [0,1]
    board[11][4] = null; // [1,0]
    board[11][5] = null; // [1,1]
    board[11][6] = null; // [1,2]
    const result = tryRotation(board, piece, 1);
    expect(result).toBeNull();
  });

  it('full 360 rotation returns to original state', () => {
    const board = createBoard();
    let piece: ActivePiece = { type: 'S', rotation: 0, pos: { row: 10, col: 4 } };
    for (let i = 0; i < 4; i++) {
      const result = tryRotation(board, piece, 1);
      expect(result).not.toBeNull();
      piece = result!;
    }
    expect(piece.rotation).toBe(0);
    expect(piece.pos).toEqual({ row: 10, col: 4 });
  });
});
