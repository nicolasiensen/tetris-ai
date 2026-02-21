import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TouchInput } from './TouchInput.ts';
import { computeLayout, type Layout } from '../layout.ts';
import { TOUCH_DRAG_THRESHOLD, TOUCH_TAP_MAX_MS } from '../constants.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a touch-enabled layout for a typical mobile viewport. */
function createLayout(width = 400, height = 700): Layout {
  return computeLayout(width, height, true);
}

/** Minimal mock canvas that returns a controlled bounding rect. */
function createMockCanvas(cssWidth: number, cssHeight: number, dpr = 1): HTMLCanvasElement {
  const listeners = new Map<string, EventListener>();

  const canvas = {
    width: cssWidth * dpr,
    height: cssHeight * dpr,
    addEventListener: vi.fn((type: string, fn: EventListener) => {
      listeners.set(type, fn);
    }),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: cssWidth,
      height: cssHeight,
      right: cssWidth,
      bottom: cssHeight,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
    // Expose for dispatching simulated events
    _listeners: listeners,
  };

  return canvas as unknown as HTMLCanvasElement;
}

/** Build a minimal Touch object. */
function makeTouch(id: number, clientX: number, clientY: number): Touch {
  return { identifier: id, clientX, clientY } as unknown as Touch;
}

/** Build a TouchEvent with the given changedTouches. */
function makeTouchEvent(type: string, touches: Touch[]): TouchEvent {
  return {
    type,
    preventDefault: vi.fn(),
    changedTouches: Object.assign(touches.slice(), {
      item: (i: number) => touches[i],
    }),
  } as unknown as TouchEvent;
}

/** Dispatch a touch event on the mock canvas. */
function dispatch(canvas: ReturnType<typeof createMockCanvas>, event: TouchEvent) {
  const listener = (canvas as unknown as { _listeners: Map<string, EventListener> })._listeners.get(
    event.type,
  );
  if (listener) (listener as (e: TouchEvent) => void)(event);
}

/** Stub GameState used in update(). */
function createMockState() {
  return {
    isGameOver: false,
    isPaused: false,
    rotate: vi.fn(),
    hardDrop: vi.fn(),
    moveLeft: vi.fn(),
    moveRight: vi.fn(),
    softDrop: vi.fn(),
    hold: vi.fn(),
    reset: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TouchInput', () => {
  let layout: Layout;
  let canvas: ReturnType<typeof createMockCanvas>;
  let touchInput: TouchInput;

  beforeEach(() => {
    layout = createLayout();
    canvas = createMockCanvas(layout.canvasWidth, layout.canvasHeight, 1);
    touchInput = new TouchInput(canvas, layout);
  });

  afterEach(() => {
    touchInput.destroy();
  });

  // ── Coordinate mapping ──────────────────────────────────────────────

  describe('coordinate mapping with DPR', () => {
    it('maps touch in board center correctly at DPR 1', () => {
      const state = createMockState();
      const boardCenterX = layout.boardX + layout.boardWidth / 2;
      const boardCenterY = layout.boardY + layout.boardHeight / 2;

      // Tap in center of board
      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, boardCenterX, boardCenterY)]));
      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, boardCenterX, boardCenterY)]));
      touchInput.update(0, state as never);

      expect(state.rotate).toHaveBeenCalledWith(1);
    });

    it('maps touch in board center correctly at DPR 2', () => {
      // Recreate with DPR=2 (canvas.width = cssWidth * 2, but CSS size stays the same)
      const dpr2Canvas = createMockCanvas(layout.canvasWidth, layout.canvasHeight, 2);
      const dpr2Input = new TouchInput(dpr2Canvas, layout);
      const state = createMockState();

      const boardCenterX = layout.boardX + layout.boardWidth / 2;
      const boardCenterY = layout.boardY + layout.boardHeight / 2;

      dispatch(
        dpr2Canvas,
        makeTouchEvent('touchstart', [makeTouch(0, boardCenterX, boardCenterY)]),
      );
      dispatch(dpr2Canvas, makeTouchEvent('touchend', [makeTouch(0, boardCenterX, boardCenterY)]));
      dpr2Input.update(0, state as never);

      expect(state.rotate).toHaveBeenCalledWith(1);
      dpr2Input.destroy();
    });

    it('maps touch in board center correctly at DPR 3', () => {
      const dpr3Canvas = createMockCanvas(layout.canvasWidth, layout.canvasHeight, 3);
      const dpr3Input = new TouchInput(dpr3Canvas, layout);
      const state = createMockState();

      const boardCenterX = layout.boardX + layout.boardWidth / 2;
      const boardCenterY = layout.boardY + layout.boardHeight / 2;

      dispatch(
        dpr3Canvas,
        makeTouchEvent('touchstart', [makeTouch(0, boardCenterX, boardCenterY)]),
      );
      dispatch(dpr3Canvas, makeTouchEvent('touchend', [makeTouch(0, boardCenterX, boardCenterY)]));
      dpr3Input.update(0, state as never);

      expect(state.rotate).toHaveBeenCalledWith(1);
      dpr3Input.destroy();
    });
  });

  // ── Tap → rotateCW ──────────────────────────────────────────────────

  describe('tap gesture', () => {
    it('registers a tap as rotateCW', () => {
      const state = createMockState();
      const x = layout.boardX + layout.boardWidth / 2;
      const y = layout.boardY + layout.boardHeight / 2;

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, x, y)]));
      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, x, y)]));
      touchInput.update(0, state as never);

      expect(state.rotate).toHaveBeenCalledWith(1);
    });

    it('does not register a tap outside the board area', () => {
      const state = createMockState();
      // Touch outside the board entirely (top-left corner)
      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, 0, 0)]));
      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, 0, 0)]));
      touchInput.update(0, state as never);

      expect(state.rotate).not.toHaveBeenCalled();
    });

    it('does not register a tap that exceeds time threshold', () => {
      const state = createMockState();
      const x = layout.boardX + layout.boardWidth / 2;
      const y = layout.boardY + layout.boardHeight / 2;

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0) // touchstart
        .mockReturnValueOnce(TOUCH_TAP_MAX_MS + 50); // touchend

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, x, y)]));
      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, x, y)]));
      touchInput.update(0, state as never);

      expect(state.rotate).not.toHaveBeenCalled();
    });
  });

  // ── Drag → move / soft drop ─────────────────────────────────────────

  describe('drag gesture', () => {
    it('queues moveRight when dragging right by one cell', () => {
      const state = createMockState();
      const startX = layout.boardX + layout.boardWidth / 2;
      const startY = layout.boardY + layout.boardHeight / 2;

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, startX, startY)]));
      // Drag right past threshold + one cell
      const dx = TOUCH_DRAG_THRESHOLD + layout.cellSize;
      dispatch(canvas, makeTouchEvent('touchmove', [makeTouch(0, startX + dx, startY)]));
      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, startX + dx, startY)]));
      touchInput.update(0, state as never);

      expect(state.moveRight).toHaveBeenCalled();
    });

    it('queues moveLeft when dragging left by one cell', () => {
      const state = createMockState();
      const startX = layout.boardX + layout.boardWidth / 2;
      const startY = layout.boardY + layout.boardHeight / 2;

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, startX, startY)]));
      const dx = -(TOUCH_DRAG_THRESHOLD + layout.cellSize);
      dispatch(canvas, makeTouchEvent('touchmove', [makeTouch(0, startX + dx, startY)]));
      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, startX + dx, startY)]));
      touchInput.update(0, state as never);

      expect(state.moveLeft).toHaveBeenCalled();
    });

    it('queues softDrop when dragging down by one cell', () => {
      const state = createMockState();
      const startX = layout.boardX + layout.boardWidth / 2;
      const startY = layout.boardY + layout.boardHeight / 4;

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, startX, startY)]));
      const dy = TOUCH_DRAG_THRESHOLD + layout.cellSize;
      dispatch(canvas, makeTouchEvent('touchmove', [makeTouch(0, startX, startY + dy)]));
      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, startX, startY + dy)]));
      touchInput.update(0, state as never);

      expect(state.softDrop).toHaveBeenCalled();
    });
  });

  // ── Swipe → hard drop ───────────────────────────────────────────────

  describe('swipe hard drop', () => {
    it('queues hardDrop on fast downward swipe', () => {
      const state = createMockState();
      const startX = layout.boardX + layout.boardWidth / 2;
      const startY = layout.boardY + 20;
      const swipeDistance = 200;

      // Simulate a fast swipe: two move events close in time, then end
      const t0 = 1000;
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(t0) // touchstart
        .mockReturnValueOnce(t0 + 10) // first move
        .mockReturnValueOnce(t0 + 100) // second move (velocity sample updates)
        .mockReturnValueOnce(t0 + 120); // touchend

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, startX, startY)]));
      // First move to start dragging
      dispatch(
        canvas,
        makeTouchEvent('touchmove', [makeTouch(0, startX, startY + TOUCH_DRAG_THRESHOLD + 1)]),
      );
      // Second move — enough time has passed that velocity sample gets recorded
      dispatch(canvas, makeTouchEvent('touchmove', [makeTouch(0, startX, startY + swipeDistance)]));
      // End — velocity = (endY - sampleY) / dt should exceed threshold
      dispatch(
        canvas,
        makeTouchEvent('touchend', [makeTouch(0, startX, startY + swipeDistance + 50)]),
      );
      touchInput.update(0, state as never);

      expect(state.hardDrop).toHaveBeenCalled();
    });
  });

  // ── Button presses ──────────────────────────────────────────────────

  describe('button presses', () => {
    it('queues hold when touching the hold button', () => {
      const state = createMockState();
      const btn = layout.holdButtonRect;
      const x = btn.x + btn.width / 2;
      const y = btn.y + btn.height / 2;

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, x, y)]));
      touchInput.update(0, state as never);

      expect(state.hold).toHaveBeenCalled();
      expect(touchInput.buttonState.hold).toBe(true);

      dispatch(canvas, makeTouchEvent('touchend', [makeTouch(0, x, y)]));
      expect(touchInput.buttonState.hold).toBe(false);
    });

    it('queues rotateCCW when touching the CCW button', () => {
      const state = createMockState();
      const btn = layout.rotateCCWButtonRect;
      const x = btn.x + btn.width / 2;
      const y = btn.y + btn.height / 2;

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, x, y)]));
      touchInput.update(0, state as never);

      expect(state.rotate).toHaveBeenCalledWith(-1);
    });

    it('queues togglePause when touching the pause button', () => {
      const state = createMockState();
      const btn = layout.pauseButtonRect;
      const x = btn.x + btn.width / 2;
      const y = btn.y + btn.height / 2;

      dispatch(canvas, makeTouchEvent('touchstart', [makeTouch(0, x, y)]));
      touchInput.update(0, state as never);

      expect(state.isPaused).toBe(true);
    });

    it('detects button press correctly at DPR 3', () => {
      const dpr3Canvas = createMockCanvas(layout.canvasWidth, layout.canvasHeight, 3);
      const dpr3Input = new TouchInput(dpr3Canvas, layout);
      const state = createMockState();

      const btn = layout.holdButtonRect;
      const x = btn.x + btn.width / 2;
      const y = btn.y + btn.height / 2;

      dispatch(dpr3Canvas, makeTouchEvent('touchstart', [makeTouch(0, x, y)]));
      dpr3Input.update(0, state as never);

      expect(state.hold).toHaveBeenCalled();
      dpr3Input.destroy();
    });
  });
});
