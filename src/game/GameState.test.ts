import { describe, it, expect } from 'vitest';
import { GameState } from './GameState.ts';
import { Randomizer } from '../core/Randomizer.ts';
import {
  COLS,
  TOTAL_ROWS,
  BUFFER_ROWS,
  SOFT_DROP_SCORE,
  HARD_DROP_SCORE,
  SCORE_TABLE,
  LOCK_DELAY_MS,
  LINE_CLEAR_ANIM_MS,
  LINES_PER_LEVEL,
  MAX_LOCK_RESETS,
  getDropInterval,
} from '../constants.ts';
import { SPAWN_COL, SPAWN_ROW } from '../core/Piece.ts';
import type { PieceType } from '../types.ts';

/**
 * Creates a Randomizer that yields pieces in a fixed, repeating sequence.
 * The first element is consumed by GameState's constructor (spawnPiece).
 */
function createTestRandomizer(sequence: PieceType[]): Randomizer {
  let index = 0;
  return {
    next() {
      return sequence[index++ % sequence.length];
    },
    peek(count: number) {
      const result: PieceType[] = [];
      for (let i = 0; i < count; i++) {
        result.push(sequence[(index + i) % sequence.length]);
      }
      return result;
    },
  } as unknown as Randomizer;
}

/** Shorthand: create a GameState with a known piece sequence. */
function createState(sequence: PieceType[] = ['T', 'I', 'O', 'S', 'Z', 'J', 'L']): GameState {
  return new GameState(createTestRandomizer(sequence));
}

describe('GameState', () => {
  // ── initial state ────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with score 0, level 1, 0 lines', () => {
      const state = createState();
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.lines).toBe(0);
    });

    it('spawns the first piece at the spawn position', () => {
      const state = createState();
      expect(state.activePiece).not.toBeNull();
      expect(state.activePiece!.type).toBe('T');
      expect(state.activePiece!.rotation).toBe(0);
      expect(state.activePiece!.pos).toEqual({ row: SPAWN_ROW, col: SPAWN_COL });
    });

    it('is not game over or paused', () => {
      const state = createState();
      expect(state.isGameOver).toBe(false);
      expect(state.isPaused).toBe(false);
    });

    it('has no hold piece', () => {
      const state = createState();
      expect(state.holdPiece).toBeNull();
    });
  });

  // ── movement ─────────────────────────────────────────────────────

  describe('movement', () => {
    it('moveLeft shifts piece one column left', () => {
      const state = createState();
      const col = state.activePiece!.pos.col;
      expect(state.moveLeft()).toBe(true);
      expect(state.activePiece!.pos.col).toBe(col - 1);
    });

    it('moveRight shifts piece one column right', () => {
      const state = createState();
      const col = state.activePiece!.pos.col;
      expect(state.moveRight()).toBe(true);
      expect(state.activePiece!.pos.col).toBe(col + 1);
    });

    it('moveLeft returns false at left wall', () => {
      const state = createState();
      while (state.moveLeft()) {
        /* move to wall */
      }
      expect(state.moveLeft()).toBe(false);
    });

    it('moveRight returns false at right wall', () => {
      const state = createState();
      while (state.moveRight()) {
        /* move to wall */
      }
      expect(state.moveRight()).toBe(false);
    });

    it('does not change row when moving horizontally', () => {
      const state = createState();
      const row = state.activePiece!.pos.row;
      state.moveLeft();
      expect(state.activePiece!.pos.row).toBe(row);
    });
  });

  // ── soft drop ────────────────────────────────────────────────────

  describe('soft drop', () => {
    it('moves piece down one row', () => {
      const state = createState();
      const row = state.activePiece!.pos.row;
      expect(state.softDrop()).toBe(true);
      expect(state.activePiece!.pos.row).toBe(row + 1);
    });

    it('adds SOFT_DROP_SCORE per row', () => {
      const state = createState();
      state.softDrop();
      state.softDrop();
      expect(state.score).toBe(SOFT_DROP_SCORE * 2);
    });

    it('returns false when piece cannot move down', () => {
      const state = createState();
      while (state.softDrop()) {
        /* drop to bottom */
      }
      expect(state.softDrop()).toBe(false);
    });
  });

  // ── hard drop ────────────────────────────────────────────────────

  describe('hard drop', () => {
    it('locks piece at the bottom of the board', () => {
      const state = createState();
      state.hardDrop();
      // T rotation 0 offsets: [0,1],[1,0],[1,1],[1,2] — bottom cells at row TOTAL_ROWS-1
      expect(state.board[TOTAL_ROWS - 1][SPAWN_COL]).toBe('T');
      expect(state.board[TOTAL_ROWS - 1][SPAWN_COL + 1]).toBe('T');
      expect(state.board[TOTAL_ROWS - 1][SPAWN_COL + 2]).toBe('T');
      expect(state.board[TOTAL_ROWS - 2][SPAWN_COL + 1]).toBe('T');
    });

    it('scores HARD_DROP_SCORE per row dropped', () => {
      const state = createState();
      // T piece: bottom cells at row+1, max row+1 = TOTAL_ROWS-1 → max row = TOTAL_ROWS-2
      // rows dropped = (TOTAL_ROWS - 2) - SPAWN_ROW = 20
      state.hardDrop();
      expect(state.score).toBe(20 * HARD_DROP_SCORE);
    });

    it('sets hardDropped flag', () => {
      const state = createState();
      expect(state.hardDropped).toBe(false);
      state.hardDrop();
      expect(state.hardDropped).toBe(true);
    });

    it('does not set locked flag on hard drop', () => {
      const state = createState();
      state.hardDrop();
      expect(state.locked).toBe(false);
    });

    it('spawns the next piece after locking', () => {
      const state = createState();
      state.hardDrop();
      expect(state.activePiece).not.toBeNull();
      expect(state.activePiece!.type).toBe('I');
    });
  });

  // ── rotation ─────────────────────────────────────────────────────

  describe('rotation', () => {
    it('rotates piece clockwise', () => {
      const state = createState();
      expect(state.rotate(1)).toBe(true);
      expect(state.activePiece!.rotation).toBe(1);
    });

    it('rotates piece counter-clockwise', () => {
      const state = createState();
      expect(state.rotate(-1)).toBe(true);
      expect(state.activePiece!.rotation).toBe(3);
    });

    it('returns false when all kick positions are blocked', () => {
      const state = createState();
      // Fill entire board, then clear only the current piece cells
      for (let r = 0; r < TOTAL_ROWS; r++) for (let c = 0; c < COLS; c++) state.board[r][c] = 'O';

      // T at (2,3) rotation 0 cells: (2,4),(3,3),(3,4),(3,5)
      state.board[2][4] = null;
      state.board[3][3] = null;
      state.board[3][4] = null;
      state.board[3][5] = null;

      expect(state.rotate(1)).toBe(false);
    });
  });

  // ── hold ─────────────────────────────────────────────────────────

  describe('hold', () => {
    it('stores current piece and spawns the next one', () => {
      const state = createState();
      state.hold();
      expect(state.holdPiece).toBe('T');
      expect(state.activePiece!.type).toBe('I');
    });

    it('swaps hold piece with active piece on second hold', () => {
      const state = createState(); // T active
      state.hold(); // hold=T, active=I
      state.hardDrop(); // lock I, active=O, holdUsed reset
      state.hold(); // hold=O, active=T (swapped back)
      expect(state.holdPiece).toBe('O');
      expect(state.activePiece!.type).toBe('T');
    });

    it('cannot hold twice before placing a piece', () => {
      const state = createState();
      state.hold(); // hold=T, active=I
      const afterFirst = state.activePiece!.type;
      state.hold(); // should be a no-op
      expect(state.activePiece!.type).toBe(afterFirst);
    });

    it('resets hold availability after locking a piece', () => {
      const state = createState();
      state.hold(); // holdUsed = true
      state.hardDrop(); // spawnPiece resets holdUsed
      state.hold(); // should succeed
      expect(state.holdPiece).toBe('O');
    });

    it('resets rotation and position when swapping from hold', () => {
      const state = createState();
      state.rotate(1);
      state.moveLeft();
      state.hold(); // hold T, active=I
      state.hardDrop(); // lock I, active=O
      state.hold(); // hold O, active=T from hold

      expect(state.activePiece!.rotation).toBe(0);
      expect(state.activePiece!.pos).toEqual({ row: SPAWN_ROW, col: SPAWN_COL });
    });
  });

  // ── ghost position ───────────────────────────────────────────────

  describe('ghost position', () => {
    it('returns the lowest valid position on an empty board', () => {
      const state = createState();
      const ghost = state.getGhostPosition();
      expect(ghost).not.toBeNull();
      // T bottom cells at row+1, max row = TOTAL_ROWS-2
      expect(ghost!.row).toBe(TOTAL_ROWS - 2);
      expect(ghost!.col).toBe(SPAWN_COL);
    });

    it('returns null when piece is already at the bottom', () => {
      const state = createState();
      while (state.softDrop()) {
        /* drop to bottom */
      }
      expect(state.getGhostPosition()).toBeNull();
    });
  });

  // ── next pieces ──────────────────────────────────────────────────

  describe('next pieces', () => {
    it('returns the upcoming 5 pieces from the randomizer', () => {
      const state = createState(['T', 'I', 'O', 'S', 'Z', 'J', 'L']);
      // T consumed by spawn → next 5: I, O, S, Z, J
      expect(state.getNextPieces()).toEqual(['I', 'O', 'S', 'Z', 'J']);
    });
  });

  // ── gravity (tick) ───────────────────────────────────────────────

  describe('gravity', () => {
    it('drops piece after one drop interval', () => {
      const state = createState();
      const row = state.activePiece!.pos.row;
      state.tick(getDropInterval(1));
      expect(state.activePiece!.pos.row).toBe(row + 1);
    });

    it('does not drop piece before the interval elapses', () => {
      const state = createState();
      const row = state.activePiece!.pos.row;
      state.tick(getDropInterval(1) - 1);
      expect(state.activePiece!.pos.row).toBe(row);
    });

    it('drops multiple rows when enough time accumulates', () => {
      const state = createState();
      const row = state.activePiece!.pos.row;
      state.tick(getDropInterval(1) * 3);
      expect(state.activePiece!.pos.row).toBe(row + 3);
    });
  });

  // ── lock delay ───────────────────────────────────────────────────

  describe('lock delay', () => {
    it('locks piece after LOCK_DELAY_MS when grounded', () => {
      const state = createState();
      while (state.softDrop()) {
        /* drop to bottom */
      }
      state.tick(LOCK_DELAY_MS);
      // Should have locked and spawned the next piece
      expect(state.activePiece!.type).toBe('I');
    });

    it('sets locked flag when piece locks via gravity', () => {
      const state = createState();
      expect(state.locked).toBe(false);
      while (state.softDrop()) {
        /* drop to bottom */
      }
      state.tick(LOCK_DELAY_MS);
      expect(state.locked).toBe(true);
    });

    it('does not lock before LOCK_DELAY_MS', () => {
      const state = createState();
      while (state.softDrop()) {
        /* drop to bottom */
      }
      state.tick(LOCK_DELAY_MS - 1);
      expect(state.activePiece!.type).toBe('T');
    });

    it('resets lock timer on horizontal movement', () => {
      const state = createState();
      while (state.softDrop()) {
        /* drop to bottom */
      }

      state.tick(LOCK_DELAY_MS - 100); // accumulate most of lock time
      state.moveLeft(); // resets timer
      state.tick(100); // only 100ms since reset — should NOT lock

      expect(state.activePiece!.type).toBe('T');
    });

    it('stops resetting after MAX_LOCK_RESETS', () => {
      const state = createState();
      while (state.softDrop()) {
        /* drop to bottom */
      }

      // Exhaust all lock resets by alternating left/right
      for (let i = 0; i < MAX_LOCK_RESETS; i++) {
        state.tick(LOCK_DELAY_MS - 1);
        if (i % 2 === 0) state.moveLeft();
        else state.moveRight();
      }

      // Resets exhausted — piece should lock after full delay
      state.tick(LOCK_DELAY_MS);
      expect(state.activePiece!.type).toBe('I');
    });
  });

  // ── line clearing ────────────────────────────────────────────────

  describe('line clearing', () => {
    it('clears a single full row', () => {
      const state = createState();
      // Fill bottom row except cols 3-5 (where T bottom cells land)
      for (let c = 0; c < COLS; c++) {
        if (c < 3 || c > 5) state.board[TOTAL_ROWS - 1][c] = 'O';
      }

      state.hardDrop();
      expect(state.isClearing).toBe(true);
      expect(state.clearingRows).toHaveLength(1);

      state.tick(LINE_CLEAR_ANIM_MS);
      expect(state.isClearing).toBe(false);
      expect(state.lines).toBe(1);
    });

    it('clears multiple rows simultaneously', () => {
      // O piece fills 2×2: offsets [0,1],[0,2],[1,1],[1,2]
      // At spawn col 3 → columns 4,5
      const state = createState(['O', 'T', 'I', 'S', 'Z', 'J', 'L']);
      for (let c = 0; c < COLS; c++) {
        if (c !== 4 && c !== 5) {
          state.board[TOTAL_ROWS - 1][c] = 'I';
          state.board[TOTAL_ROWS - 2][c] = 'I';
        }
      }

      state.hardDrop();
      expect(state.clearingRows).toHaveLength(2);

      state.tick(LINE_CLEAR_ANIM_MS);
      expect(state.lines).toBe(2);
    });

    it('sets linesCleared to the number of cleared rows', () => {
      const state = createState();
      for (let c = 0; c < COLS; c++) {
        if (c < 3 || c > 5) state.board[TOTAL_ROWS - 1][c] = 'O';
      }

      state.hardDrop();
      expect(state.linesCleared).toBe(1);
    });

    it('sets linesCleared for double clear', () => {
      const state = createState(['O', 'T', 'I', 'S', 'Z', 'J', 'L']);
      for (let c = 0; c < COLS; c++) {
        if (c !== 4 && c !== 5) {
          state.board[TOTAL_ROWS - 1][c] = 'I';
          state.board[TOTAL_ROWS - 2][c] = 'I';
        }
      }

      state.hardDrop();
      expect(state.linesCleared).toBe(2);
    });

    it('linesCleared is 0 when no lines are cleared', () => {
      const state = createState();
      state.hardDrop();
      expect(state.linesCleared).toBe(0);
    });

    it('does not finish animation before LINE_CLEAR_ANIM_MS', () => {
      const state = createState();
      for (let c = 0; c < COLS; c++) {
        if (c < 3 || c > 5) state.board[TOTAL_ROWS - 1][c] = 'O';
      }

      state.hardDrop();
      state.tick(LINE_CLEAR_ANIM_MS - 1);
      expect(state.isClearing).toBe(true);
    });
  });

  // ── scoring and levels ───────────────────────────────────────────

  describe('scoring and levels', () => {
    it('awards correct score for a single line clear', () => {
      const state = createState();
      for (let c = 0; c < COLS; c++) {
        if (c < 3 || c > 5) state.board[TOTAL_ROWS - 1][c] = 'O';
      }

      state.hardDrop();
      const scoreAfterDrop = state.score; // hard-drop points only
      state.tick(LINE_CLEAR_ANIM_MS);
      expect(state.score).toBe(scoreAfterDrop + SCORE_TABLE[1] * 1);
    });

    it('awards correct score for a double line clear', () => {
      const state = createState(['O', 'T', 'I', 'S', 'Z', 'J', 'L']);
      for (let c = 0; c < COLS; c++) {
        if (c !== 4 && c !== 5) {
          state.board[TOTAL_ROWS - 1][c] = 'I';
          state.board[TOTAL_ROWS - 2][c] = 'I';
        }
      }

      state.hardDrop();
      const scoreAfterDrop = state.score;
      state.tick(LINE_CLEAR_ANIM_MS);
      expect(state.score).toBe(scoreAfterDrop + SCORE_TABLE[2] * 1);
    });

    it('multiplies line clear score by current level', () => {
      const state = createState();
      state.level = 3;
      for (let c = 0; c < COLS; c++) {
        if (c < 3 || c > 5) state.board[TOTAL_ROWS - 1][c] = 'O';
      }

      state.hardDrop();
      const scoreAfterDrop = state.score;
      state.tick(LINE_CLEAR_ANIM_MS);
      expect(state.score).toBe(scoreAfterDrop + SCORE_TABLE[1] * 3);
    });

    it('increases level every LINES_PER_LEVEL lines', () => {
      const state = createState();
      state.lines = LINES_PER_LEVEL - 1;
      for (let c = 0; c < COLS; c++) {
        if (c < 3 || c > 5) state.board[TOTAL_ROWS - 1][c] = 'O';
      }

      state.hardDrop();
      state.tick(LINE_CLEAR_ANIM_MS);
      expect(state.lines).toBe(LINES_PER_LEVEL);
      expect(state.level).toBe(2);
    });
  });

  // ── game over ────────────────────────────────────────────────────

  describe('game over', () => {
    it('triggers when the next spawn position is blocked', () => {
      const state = createState(['T', 'T', 'I', 'O', 'S', 'Z', 'J']);
      // Block the spawn area for the NEXT T piece
      state.board[SPAWN_ROW][SPAWN_COL + 1] = 'O';
      state.board[SPAWN_ROW + 1][SPAWN_COL] = 'O';
      state.board[SPAWN_ROW + 1][SPAWN_COL + 1] = 'O';
      state.board[SPAWN_ROW + 1][SPAWN_COL + 2] = 'O';

      state.hardDrop(); // locks current T, tries to spawn next T → blocked
      expect(state.isGameOver).toBe(true);
    });

    it('triggers when piece locks entirely above visible area', () => {
      const state = createState();
      // Fill everything from BUFFER_ROWS down
      for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++)
        for (let c = 0; c < COLS; c++) state.board[r][c] = 'O';

      // Clear only the T piece's current cells so it's in a valid position
      state.board[2][4] = null;
      state.board[3][3] = null;
      state.board[3][4] = null;
      state.board[3][5] = null;

      // Hard drop can't move down — piece locks at rows 2-3 (all in buffer)
      state.hardDrop();
      expect(state.isGameOver).toBe(true);
    });

    it('tick does nothing when game is over', () => {
      const state = createState();
      state.isGameOver = true;
      const row = state.activePiece!.pos.row;
      state.tick(getDropInterval(1) * 10);
      expect(state.activePiece!.pos.row).toBe(row);
    });
  });

  // ── pause ────────────────────────────────────────────────────────

  describe('pause', () => {
    it('tick does nothing when paused', () => {
      const state = createState();
      state.isPaused = true;
      const row = state.activePiece!.pos.row;
      state.tick(getDropInterval(1) * 10);
      expect(state.activePiece!.pos.row).toBe(row);
    });
  });

  // ── reset ────────────────────────────────────────────────────────

  describe('reset', () => {
    it('restores all state to initial values', () => {
      const state = createState();
      // Mutate state
      state.hardDrop();
      state.score = 999;
      state.lines = 50;
      state.level = 6;
      state.isPaused = true;

      state.reset();

      expect(state.score).toBe(0);
      expect(state.lines).toBe(0);
      expect(state.level).toBe(1);
      expect(state.isGameOver).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.holdPiece).toBeNull();
      expect(state.hardDropped).toBe(false);
      expect(state.locked).toBe(false);
      expect(state.linesCleared).toBe(0);
      expect(state.activePiece).not.toBeNull();
    });
  });
});
