import {
  TOUCH_DRAG_THRESHOLD,
  TOUCH_TAP_MAX_MS,
  TOUCH_TAP_MAX_DISTANCE,
  TOUCH_SWIPE_VELOCITY,
} from '../constants.ts';
import type { Layout, ButtonRect } from '../layout.ts';
import type { GameState } from './GameState.ts';

type GesturePhase = 'idle' | 'tracking' | 'dragging';

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface GestureState {
  phase: GesturePhase;
  touchId: number;
  start: TouchPoint;
  prev: TouchPoint;
  // A point sampled ~80-100ms ago for reliable velocity calculation
  velocitySample: TouchPoint;
  // How many full columns/rows we've already applied
  appliedCols: number;
  appliedRows: number;
}

export interface TouchButtonState {
  hold: boolean;
  rotateCCW: boolean;
  pause: boolean;
}

type QueuedAction =
  | { type: 'rotateCW' }
  | { type: 'rotateCCW' }
  | { type: 'hardDrop' }
  | { type: 'moveLeft' }
  | { type: 'moveRight' }
  | { type: 'softDrop' }
  | { type: 'hold' }
  | { type: 'togglePause' }
  | { type: 'reset' };

function pointInRect(x: number, y: number, rect: ButtonRect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export class TouchInput {
  restartBlocked = false;
  private canvas: HTMLCanvasElement;
  private layout: Layout;
  private gesture: GestureState | null = null;
  private actions: QueuedAction[] = [];
  buttonState: TouchButtonState = { hold: false, rotateCCW: false, pause: false };
  private activeBtnTouchIds = new Map<number, 'hold' | 'rotateCCW' | 'pause'>();

  constructor(canvas: HTMLCanvasElement, layout: Layout) {
    this.canvas = canvas;
    this.layout = layout;

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  updateLayout(layout: Layout): void {
    this.layout = layout;
  }

  update(_delta: number, state: GameState): void {
    const actions = this.actions;
    this.actions = [];

    for (const action of actions) {
      if (state.isGameOver) {
        if ((action.type === 'reset' || action.type === 'rotateCW') && !this.restartBlocked) {
          state.reset();
        }
        continue;
      }

      if (action.type === 'togglePause') {
        state.isPaused = !state.isPaused;
        continue;
      }

      if (state.isPaused) continue;

      switch (action.type) {
        case 'rotateCW':
          state.rotate(1);
          break;
        case 'rotateCCW':
          state.rotate(-1);
          break;
        case 'hardDrop':
          state.hardDrop();
          break;
        case 'moveLeft':
          state.moveLeft();
          break;
        case 'moveRight':
          state.moveRight();
          break;
        case 'softDrop':
          state.softDrop();
          break;
        case 'hold':
          state.hold();
          break;
      }
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
  }

  private canvasCoords(touch: Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (this.layout.canvasWidth / rect.width),
      y: (touch.clientY - rect.top) * (this.layout.canvasHeight / rect.height),
    };
  }

  private isInBoardArea(x: number, y: number): boolean {
    const { boardX, boardY, boardWidth, boardHeight } = this.layout;
    return x >= boardX && x <= boardX + boardWidth && y >= boardY && y <= boardY + boardHeight;
  }

  private checkButton(x: number, y: number): 'hold' | 'rotateCCW' | 'pause' | null {
    if (!this.layout.touchEnabled) return null;
    if (pointInRect(x, y, this.layout.holdButtonRect)) return 'hold';
    if (pointInRect(x, y, this.layout.rotateCCWButtonRect)) return 'rotateCCW';
    if (pointInRect(x, y, this.layout.pauseButtonRect)) return 'pause';
    return null;
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const { x, y } = this.canvasCoords(touch);

      // Check buttons first
      const btn = this.checkButton(x, y);
      if (btn) {
        this.activeBtnTouchIds.set(touch.identifier, btn);
        this.buttonState[btn] = true;
        if (btn === 'hold') this.actions.push({ type: 'hold' });
        else if (btn === 'rotateCCW') this.actions.push({ type: 'rotateCCW' });
        else if (btn === 'pause') this.actions.push({ type: 'togglePause' });
        continue;
      }

      // Board gesture — only track one gesture at a time
      if (this.isInBoardArea(x, y) && !this.gesture) {
        const point: TouchPoint = { x, y, time: performance.now() };
        this.gesture = {
          phase: 'tracking',
          touchId: touch.identifier,
          start: point,
          prev: point,
          velocitySample: point,
          appliedCols: 0,
          appliedRows: 0,
        };
      }
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    if (!this.gesture) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== this.gesture.touchId) continue;

      const { x, y } = this.canvasCoords(touch);
      const dx = x - this.gesture.start.x;
      const dy = y - this.gesture.start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (this.gesture.phase === 'tracking' && distance > TOUCH_DRAG_THRESHOLD) {
        this.gesture.phase = 'dragging';
      }

      if (this.gesture.phase === 'dragging') {
        const { cellSize } = this.layout;

        // Horizontal movement: columns moved relative to start
        const totalCols = Math.round(dx / cellSize);
        const colDelta = totalCols - this.gesture.appliedCols;
        if (colDelta > 0) {
          for (let j = 0; j < colDelta; j++) this.actions.push({ type: 'moveRight' });
        } else if (colDelta < 0) {
          for (let j = 0; j < -colDelta; j++) this.actions.push({ type: 'moveLeft' });
        }
        this.gesture.appliedCols = totalCols;

        // Vertical movement (down only): rows moved relative to start
        const totalRows = Math.floor(dy / cellSize);
        const rowDelta = totalRows - this.gesture.appliedRows;
        if (rowDelta > 0) {
          for (let j = 0; j < rowDelta; j++) this.actions.push({ type: 'softDrop' });
        }
        this.gesture.appliedRows = Math.max(this.gesture.appliedRows, totalRows);

        const now = performance.now();
        // Update velocity sample if it's stale enough (~80ms window)
        if (now - this.gesture.velocitySample.time >= 80) {
          this.gesture.velocitySample = this.gesture.prev;
        }
        this.gesture.prev = { x, y, time: now };
      }
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Button release
      const btn = this.activeBtnTouchIds.get(touch.identifier);
      if (btn) {
        this.activeBtnTouchIds.delete(touch.identifier);
        // Only clear pressed state if no other touch is on the same button
        let stillPressed = false;
        for (const b of this.activeBtnTouchIds.values()) {
          if (b === btn) {
            stillPressed = true;
            break;
          }
        }
        if (!stillPressed) this.buttonState[btn] = false;
        continue;
      }

      // Gesture end
      if (this.gesture && touch.identifier === this.gesture.touchId) {
        const { x, y } = this.canvasCoords(touch);
        const now = performance.now();

        if (this.gesture.phase === 'tracking') {
          // Potential tap
          const elapsed = now - this.gesture.start.time;
          const dx = x - this.gesture.start.x;
          const dy = y - this.gesture.start.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (elapsed <= TOUCH_TAP_MAX_MS && dist <= TOUCH_TAP_MAX_DISTANCE) {
            this.actions.push({ type: 'rotateCW' });
          }
        } else if (this.gesture.phase === 'dragging') {
          // Check for fast downward swipe → hard drop
          const sample = this.gesture.velocitySample;
          const dt = now - sample.time;
          if (dt > 0) {
            const vy = (y - sample.y) / dt;
            if (vy >= TOUCH_SWIPE_VELOCITY) {
              this.actions.push({ type: 'hardDrop' });
            }
          }
        }

        this.gesture = null;
      }
    }
  };
}
