import type { RotationState, ActivePiece } from '../types.ts';
import type { BoardGrid } from '../types.ts';
import { isValidPosition } from './Board.ts';

type KickKey = '0->1' | '1->0' | '1->2' | '2->1' | '2->3' | '3->2' | '3->0' | '0->3';
type KickTable = Record<KickKey, [number, number][]>;

// Wall kicks: [colOffset, rowOffset] in screen coords (positive row = down)
// Converted from SRS wiki tables where positive y = up: rowOffset = -y

const JLSTZ_KICKS: KickTable = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS: KickTable = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

export function tryRotation(
  board: BoardGrid,
  piece: ActivePiece,
  direction: 1 | -1,
): ActivePiece | null {
  if (piece.type === 'O') return null; // O doesn't rotate

  const newRotation = (((piece.rotation + direction) % 4) + 4) % 4 as RotationState;
  const kickTable = piece.type === 'I' ? I_KICKS : JLSTZ_KICKS;
  const key = `${piece.rotation}->${newRotation}` as KickKey;
  const kicks = kickTable[key];

  for (const [colOffset, rowOffset] of kicks) {
    const newPos = {
      row: piece.pos.row + rowOffset,
      col: piece.pos.col + colOffset,
    };
    if (isValidPosition(board, piece.type, newRotation, newPos)) {
      return { type: piece.type, rotation: newRotation, pos: newPos };
    }
  }

  return null;
}
