import {
  BUFFER_ROWS,
  getDropInterval,
  HARD_DROP_SCORE,
  LINE_CLEAR_ANIM_MS,
  LINES_PER_LEVEL,
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  SCORE_TABLE,
  SOFT_DROP_FACTOR,
  SOFT_DROP_SCORE,
} from '../constants.ts';
import {
  createBoard,
  getCells,
  isValidPosition,
  lockPiece,
  findFullRows,
  removeRows,
} from '../core/Board.ts';
import { SPAWN_COL, SPAWN_ROW } from '../core/Piece.ts';
import { tryRotation } from '../core/Rotation.ts';
import { Randomizer } from '../core/Randomizer.ts';
import type { ActivePiece, BoardGrid, PieceType, Position } from '../types.ts';
import type { GameStateEventMap, GameStateEventHandler } from './GameStateEvents.ts';

export class GameState {
  board: BoardGrid;
  activePiece: ActivePiece | null = null;
  holdPiece: PieceType | null = null;
  holdUsed = false;
  score = 0;
  level = 1;
  lines = 0;
  isGameOver = false;

  private _isPaused = false;

  get isPaused(): boolean {
    return this._isPaused;
  }

  set isPaused(value: boolean) {
    if (value === this._isPaused) return;
    this._isPaused = value;
    this.emit(value ? 'pause' : 'resume');
  }

  // Line clear animation state (exposed for renderer)
  clearingRows: number[] = [];
  clearAnimTimer = 0;

  private createRandomizer: () => Randomizer;
  private randomizer: Randomizer;
  private dropTimer = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private isGrounded = false;
  softDropping = false;
  private _wasHardDrop = false;

  // Event listeners
  private listeners: {
    [K in keyof GameStateEventMap]?: GameStateEventHandler<K>[];
  } = {};

  constructor(randomizer?: Randomizer) {
    this.createRandomizer = randomizer ? () => randomizer : () => new Randomizer();
    this.board = createBoard();
    this.randomizer = this.createRandomizer();
    this.spawnPiece();
  }

  on<K extends keyof GameStateEventMap>(event: K, handler: GameStateEventHandler<K>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    (this.listeners[event] as GameStateEventHandler<K>[]).push(handler);
  }

  off<K extends keyof GameStateEventMap>(event: K, handler: GameStateEventHandler<K>): void {
    const list = this.listeners[event];
    if (!list) return;
    const idx = (list as GameStateEventHandler<K>[]).indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  private emit<K extends keyof GameStateEventMap>(
    event: K,
    ...args: GameStateEventMap[K] extends void ? [] : [GameStateEventMap[K]]
  ): void {
    const list = this.listeners[event];
    if (!list) return;
    for (const handler of list) {
      (handler as (...a: unknown[]) => void)(...args);
    }
  }

  getNextPieces(): PieceType[] {
    return this.randomizer.peek(5);
  }

  getGhostPosition(): Position | null {
    if (!this.activePiece) return null;
    const { type, rotation, pos } = this.activePiece;
    let ghostRow = pos.row;
    while (isValidPosition(this.board, type, rotation, { row: ghostRow + 1, col: pos.col })) {
      ghostRow++;
    }
    if (ghostRow === pos.row) return null; // already at bottom
    return { row: ghostRow, col: pos.col };
  }

  spawnPiece(): void {
    const type = this.randomizer.next();
    const piece: ActivePiece = {
      type,
      rotation: 0,
      pos: { row: SPAWN_ROW, col: SPAWN_COL },
    };

    if (!isValidPosition(this.board, piece.type, piece.rotation, piece.pos)) {
      this.activePiece = piece; // show the piece overlapping for game over visual
      this.isGameOver = true;
      this.emit('gameOver');
      return;
    }

    this.activePiece = piece;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.isGrounded = false;
    this.holdUsed = false;
  }

  moveLeft(): boolean {
    return this.tryMove(0, -1);
  }

  moveRight(): boolean {
    return this.tryMove(0, 1);
  }

  softDrop(): boolean {
    const moved = this.tryMove(1, 0);
    if (moved) {
      this.score += SOFT_DROP_SCORE;
      this.dropTimer = 0;
    }
    return moved;
  }

  hardDrop(): void {
    if (!this.activePiece) return;
    let rows = 0;
    while (this.tryMove(1, 0)) {
      rows++;
    }
    this.score += rows * HARD_DROP_SCORE;
    this.emit('hardDrop');
    this._wasHardDrop = true;
    this.doLock();
  }

  rotate(direction: 1 | -1): boolean {
    if (!this.activePiece) return false;
    const result = tryRotation(this.board, this.activePiece, direction);
    if (result) {
      this.activePiece = result;
      this.resetLockDelay();
      return true;
    }
    return false;
  }

  hold(): void {
    if (!this.activePiece || this.holdUsed) return;

    const currentType = this.activePiece.type;
    if (this.holdPiece) {
      // Swap
      const swapType = this.holdPiece;
      this.holdPiece = currentType;
      this.activePiece = {
        type: swapType,
        rotation: 0,
        pos: { row: SPAWN_ROW, col: SPAWN_COL },
      };
    } else {
      this.holdPiece = currentType;
      this.spawnPiece();
    }
    this.holdUsed = true;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.isGrounded = false;
  }

  get isClearing(): boolean {
    return this.clearingRows.length > 0;
  }

  tick(deltaMs: number): void {
    if (this.isGameOver || this.isPaused) return;

    // Line clear animation in progress
    if (this.isClearing) {
      this.clearAnimTimer += deltaMs;
      if (this.clearAnimTimer >= LINE_CLEAR_ANIM_MS) {
        this.finishLineClear();
      }
      return;
    }

    if (!this.activePiece) return;

    // Gravity
    const dropInterval = this.softDropping
      ? getDropInterval(this.level) / SOFT_DROP_FACTOR
      : getDropInterval(this.level);

    this.dropTimer += deltaMs;
    while (this.dropTimer >= dropInterval) {
      this.dropTimer -= dropInterval;
      if (this.softDropping) {
        this.softDrop();
      } else {
        this.tryMove(1, 0);
      }
    }

    // Lock delay
    const grounded = !isValidPosition(
      this.board,
      this.activePiece.type,
      this.activePiece.rotation,
      { row: this.activePiece.pos.row + 1, col: this.activePiece.pos.col },
    );

    if (grounded) {
      if (!this.isGrounded) {
        this.isGrounded = true;
        this.lockTimer = 0;
      }
      this.lockTimer += deltaMs;
      if (this.lockTimer >= LOCK_DELAY_MS) {
        this.doLock();
      }
    } else {
      this.isGrounded = false;
      this.lockTimer = 0;
    }
  }

  private tryMove(rowDelta: number, colDelta: number): boolean {
    if (!this.activePiece) return false;
    const newPos = {
      row: this.activePiece.pos.row + rowDelta,
      col: this.activePiece.pos.col + colDelta,
    };
    if (isValidPosition(this.board, this.activePiece.type, this.activePiece.rotation, newPos)) {
      this.activePiece.pos = newPos;
      if (colDelta !== 0) {
        this.resetLockDelay();
      }
      return true;
    }
    return false;
  }

  private resetLockDelay(): void {
    if (this.isGrounded && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  private doLock(): void {
    if (!this.activePiece) return;

    lockPiece(this.board, this.activePiece);

    if (!this._wasHardDrop) {
      this.emit('lock');
    }
    this._wasHardDrop = false;

    // Check if piece locked entirely above visible area
    const cells = getCells(this.activePiece.type, this.activePiece.rotation, this.activePiece.pos);
    const allAbove = cells.every((c) => c.row < BUFFER_ROWS);
    if (allAbove) {
      this.isGameOver = true;
      this.emit('gameOver');
      return;
    }

    this.activePiece = null;

    const fullRows = findFullRows(this.board);
    if (fullRows.length > 0) {
      // Start animation — rows stay visible while flashing
      this.clearingRows = fullRows;
      this.clearAnimTimer = 0;
      this.emit('lineClear', { count: fullRows.length });
    } else {
      this.spawnPiece();
    }
  }

  private finishLineClear(): void {
    const count = this.clearingRows.length;
    removeRows(this.board, this.clearingRows);

    this.lines += count;
    this.score += (SCORE_TABLE[count] ?? 0) * this.level;
    const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.emit('levelChange', { level: newLevel });
    }

    this.clearingRows = [];
    this.clearAnimTimer = 0;
    this.spawnPiece();
  }

  reset(): void {
    this.board = createBoard();
    this.activePiece = null;
    this.holdPiece = null;
    this.holdUsed = false;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isGameOver = false;
    this._isPaused = false;
    this.randomizer = new Randomizer();
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.isGrounded = false;
    this.softDropping = false;
    this._wasHardDrop = false;
    this.clearingRows = [];
    this.clearAnimTimer = 0;
    this.spawnPiece();
    this.emit('restart');
  }
}
