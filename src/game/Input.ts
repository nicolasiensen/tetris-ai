import { DAS_DELAY_MS, ARR_MS } from '../constants.ts';
import type { GameState } from './GameState.ts';

export class Input {
  onMuteToggle: (() => void) | null = null;
  restartBlocked = false;

  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private dasDirection: 'left' | 'right' | null = null;
  private dasCharge = 0;
  private dasLastShift = 0;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  update(delta: number, state: GameState): void {
    // Mute toggle works in any state
    if (this.keysJustPressed.has('KeyM')) {
      this.onMuteToggle?.();
    }

    if (state.isGameOver) {
      if (this.keysJustPressed.has('KeyR') && !this.restartBlocked) {
        state.reset();
      }
      this.keysJustPressed.clear();
      return;
    }

    // Pause toggle
    if (this.keysJustPressed.has('Escape') || this.keysJustPressed.has('KeyP')) {
      state.isPaused = !state.isPaused;
      this.keysJustPressed.clear();
      return;
    }

    if (state.isPaused) {
      this.keysJustPressed.clear();
      return;
    }

    // Instant actions
    if (this.keysJustPressed.has('ArrowUp') || this.keysJustPressed.has('KeyX')) {
      state.rotate(1);
    }
    if (this.keysJustPressed.has('KeyZ')) {
      state.rotate(-1);
    }
    if (this.keysJustPressed.has('Space')) {
      state.hardDrop();
    }
    if (
      this.keysJustPressed.has('ShiftLeft') ||
      this.keysJustPressed.has('ShiftRight') ||
      this.keysJustPressed.has('KeyC')
    ) {
      state.hold();
    }

    // DAS for left/right
    const leftDown = this.keysDown.has('ArrowLeft');
    const rightDown = this.keysDown.has('ArrowRight');

    // Determine current DAS direction
    let currentDir: 'left' | 'right' | null = null;
    if (leftDown && !rightDown) currentDir = 'left';
    else if (rightDown && !leftDown) currentDir = 'right';
    // If both are pressed, keep the most recent one (tracked by dasDirection)
    else if (leftDown && rightDown) currentDir = this.dasDirection;

    if (currentDir !== this.dasDirection) {
      this.dasDirection = currentDir;
      this.dasCharge = 0;
      this.dasLastShift = 0;

      // Instant initial move on direction change
      if (currentDir === 'left') state.moveLeft();
      if (currentDir === 'right') state.moveRight();
    } else if (currentDir) {
      this.dasCharge += delta;
      if (this.dasCharge >= DAS_DELAY_MS) {
        this.dasLastShift += delta;
        while (this.dasLastShift >= ARR_MS) {
          this.dasLastShift -= ARR_MS;
          if (currentDir === 'left') state.moveLeft();
          if (currentDir === 'right') state.moveRight();
        }
      }
    }

    // Soft drop
    state.softDropping = this.keysDown.has('ArrowDown');

    this.keysJustPressed.clear();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    this.keysDown.add(e.code);
    this.keysJustPressed.add(e.code);

    // Prevent default for game keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);

    // Reset DAS if the direction key was released
    if (
      (e.code === 'ArrowLeft' && this.dasDirection === 'left') ||
      (e.code === 'ArrowRight' && this.dasDirection === 'right')
    ) {
      this.dasDirection = null;
      this.dasCharge = 0;
      this.dasLastShift = 0;
    }
  };

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
