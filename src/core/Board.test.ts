import { describe, it, expect } from 'vitest';
import { createBoard, getCells, isValidPosition, lockPiece, findFullRows, removeRows } from './Board.ts';
import { COLS, TOTAL_ROWS } from '../constants.ts';

describe('createBoard', () => {
  it('creates a grid of TOTAL_ROWS x COLS filled with null', () => {
    const board = createBoard();
    expect(board).toHaveLength(TOTAL_ROWS);
    for (const row of board) {
      expect(row).toHaveLength(COLS);
      expect(row.every((cell) => cell === null)).toBe(true);
    }
  });
});

describe('getCells', () => {
  it('returns absolute cell positions for a T piece at spawn rotation', () => {
    const cells = getCells('T', 0, { row: 2, col: 3 });
    // T shape rotation 0: [[0,1],[1,0],[1,1],[1,2]]
    expect(cells).toEqual([
      { row: 2, col: 4 },
      { row: 3, col: 3 },
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ]);
  });

  it('returns correct positions for I piece rotated CW', () => {
    const cells = getCells('I', 1, { row: 0, col: 0 });
    // I shape rotation 1: [[0,2],[1,2],[2,2],[3,2]]
    expect(cells).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 2, col: 2 },
      { row: 3, col: 2 },
    ]);
  });
});

describe('isValidPosition', () => {
  it('returns true for a piece in an empty board within bounds', () => {
    const board = createBoard();
    expect(isValidPosition(board, 'T', 0, { row: 5, col: 3 })).toBe(true);
  });

  it('returns false when piece extends beyond left wall', () => {
    const board = createBoard();
    expect(isValidPosition(board, 'T', 0, { row: 5, col: -1 })).toBe(false);
  });

  it('returns false when piece extends beyond right wall', () => {
    const board = createBoard();
    // T rotation 0 extends to col+2, so col=8 puts a cell at col 10 (out of bounds)
    expect(isValidPosition(board, 'T', 0, { row: 5, col: 8 })).toBe(false);
  });

  it('returns false when piece extends below bottom', () => {
    const board = createBoard();
    expect(isValidPosition(board, 'T', 0, { row: TOTAL_ROWS - 1, col: 3 })).toBe(false);
  });

  it('returns false when piece overlaps an occupied cell', () => {
    const board = createBoard();
    board[6][4] = 'O'; // block where T center would land
    expect(isValidPosition(board, 'T', 0, { row: 5, col: 3 })).toBe(false);
  });
});

describe('lockPiece', () => {
  it('places piece cells onto the board', () => {
    const board = createBoard();
    lockPiece(board, { type: 'O', rotation: 0, pos: { row: 5, col: 4 } });
    // O shape rotation 0: [[0,1],[0,2],[1,1],[1,2]]
    expect(board[5][5]).toBe('O');
    expect(board[5][6]).toBe('O');
    expect(board[6][5]).toBe('O');
    expect(board[6][6]).toBe('O');
  });
});

describe('findFullRows', () => {
  it('returns empty array when no rows are full', () => {
    const board = createBoard();
    expect(findFullRows(board)).toEqual([]);
  });

  it('detects a single full row', () => {
    const board = createBoard();
    const row = TOTAL_ROWS - 1;
    for (let col = 0; col < COLS; col++) {
      board[row][col] = 'I';
    }
    expect(findFullRows(board)).toEqual([row]);
  });

  it('detects multiple full rows', () => {
    const board = createBoard();
    const row1 = TOTAL_ROWS - 1;
    const row2 = TOTAL_ROWS - 2;
    for (let col = 0; col < COLS; col++) {
      board[row1][col] = 'I';
      board[row2][col] = 'S';
    }
    expect(findFullRows(board)).toEqual([row2, row1]);
  });
});

describe('removeRows', () => {
  it('removes full rows and adds empty rows at top', () => {
    const board = createBoard();
    const bottomRow = TOTAL_ROWS - 1;
    const secondRow = TOTAL_ROWS - 2;

    // Fill bottom row completely
    for (let col = 0; col < COLS; col++) {
      board[bottomRow][col] = 'I';
    }
    // Put a marker in the row above
    board[secondRow][0] = 'T';

    removeRows(board, [bottomRow]);

    expect(board).toHaveLength(TOTAL_ROWS);
    // The marker row should now be the bottom row
    expect(board[bottomRow][0]).toBe('T');
    // Top row should be empty
    expect(board[0].every((cell) => cell === null)).toBe(true);
  });

  it('removes multiple rows correctly', () => {
    const board = createBoard();
    const row1 = TOTAL_ROWS - 1;
    const row2 = TOTAL_ROWS - 2;
    const row3 = TOTAL_ROWS - 3;

    for (let col = 0; col < COLS; col++) {
      board[row1][col] = 'I';
      board[row2][col] = 'I';
    }
    board[row3][5] = 'L';

    removeRows(board, [row1, row2]);

    expect(board).toHaveLength(TOTAL_ROWS);
    // The marker should now be at the bottom
    expect(board[TOTAL_ROWS - 1][5]).toBe('L');
  });
});
