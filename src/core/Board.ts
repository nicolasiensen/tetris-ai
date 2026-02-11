import { COLS, TOTAL_ROWS } from '../constants.ts';
import { PIECE_SHAPES } from './Piece.ts';
import type { BoardGrid, ActivePiece, PieceType, RotationState, Position } from '../types.ts';

export function createBoard(): BoardGrid {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
}

export function getCells(type: PieceType, rotation: RotationState, pos: Position): Position[] {
  return PIECE_SHAPES[type][rotation].map(([row, col]) => ({
    row: pos.row + row,
    col: pos.col + col,
  }));
}

export function isValidPosition(
  board: BoardGrid,
  type: PieceType,
  rotation: RotationState,
  pos: Position,
): boolean {
  const cells = getCells(type, rotation, pos);
  return cells.every(
    ({ row, col }) =>
      row >= 0 && row < TOTAL_ROWS && col >= 0 && col < COLS && board[row][col] === null,
  );
}

export function lockPiece(board: BoardGrid, piece: ActivePiece): void {
  const cells = getCells(piece.type, piece.rotation, piece.pos);
  for (const { row, col } of cells) {
    if (row >= 0 && row < TOTAL_ROWS) {
      board[row][col] = piece.type;
    }
  }
}

export function findFullRows(board: BoardGrid): number[] {
  const rows: number[] = [];
  for (let row = 0; row < TOTAL_ROWS; row++) {
    if (board[row].every((cell) => cell !== null)) {
      rows.push(row);
    }
  }
  return rows;
}

export function removeRows(board: BoardGrid, rows: number[]): void {
  // Remove from bottom to top so indices stay valid
  const sorted = [...rows].sort((a, b) => b - a);
  for (const row of sorted) {
    board.splice(row, 1);
  }
  for (let i = 0; i < sorted.length; i++) {
    board.unshift(Array(COLS).fill(null));
  }
}
