export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type RotationState = 0 | 1 | 2 | 3;

export interface Position {
  row: number;
  col: number;
}

export interface ActivePiece {
  type: PieceType;
  rotation: RotationState;
  pos: Position;
}

export type Cell = PieceType | null;

export type BoardGrid = Cell[][];
