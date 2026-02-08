# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` (Vite dev server with HMR)
- **Build:** `npm run build` (runs `tsc && vite build`, output to `dist/`)
- **Preview production build:** `npm run preview`
- **Type check only:** `npx tsc --noEmit`

There are no tests or linting configured.

## Architecture

This is a browser-based Tetris game built with TypeScript and rendered on an HTML Canvas. It uses Vite as the build tool with no runtime dependencies.

### Layer structure

**`src/core/`** — Pure game logic with no side effects:
- `Board.ts` — Board grid operations: creation, collision detection (`isValidPosition`), piece locking, row clearing
- `Piece.ts` — Tetromino shape definitions (SRS rotation states as `[row, col]` offsets), spawn position constants
- `Rotation.ts` — SRS wall kick tables (separate tables for I-piece vs JLSTZ) and `tryRotation` which tests kick offsets
- `Randomizer.ts` — 7-bag random piece generator with peek-ahead support

**`src/game/`** — Game state management and input:
- `GameState.ts` — Central game state class: gravity, lock delay (with reset limit), line clear animation timing, scoring, level progression. Orchestrates core functions.
- `GameLoop.ts` — `requestAnimationFrame` loop that wires Input → GameState.tick → Renderer. Handles canvas resizing.
- `Input.ts` — Keyboard handler with DAS (Delayed Auto Shift) and ARR (Auto Repeat Rate) for left/right movement

**`src/render/`** — Canvas 2D rendering (stateless draw functions + Renderer class):
- `Renderer.ts` — Top-level render orchestrator with screen shake effect on hard drop
- `BoardRenderer.ts` — Draws the board grid, locked cells, active piece, ghost piece, and line clear flash animation
- `UIRenderer.ts` — Draws hold panel, next queue (5 pieces), score/level/lines stats, game over and pause overlays

**`src/`** — Shared modules:
- `types.ts` — Core type definitions (`PieceType`, `ActivePiece`, `BoardGrid`, etc.)
- `constants.ts` — All tuning values: board dimensions (10x20 + 4 buffer rows), timing (DAS, ARR, lock delay), scoring table, colors
- `layout.ts` — Responsive layout calculator that sizes everything based on viewport dimensions

### Key design patterns

- The board has 4 invisible buffer rows above the 20 visible rows (`BUFFER_ROWS`). Pieces spawn in the buffer zone. Row indices in the grid are absolute (0-23), and renderers subtract `BUFFER_ROWS` to get visible row positions.
- Game state mutation and rendering are fully separated — renderers receive state and draw it without modifying anything.
- The game loop caps delta time at 100ms to prevent physics jumps on tab focus.

### Controls

Arrow keys (move/soft drop), Up/X (rotate CW), Z (rotate CCW), Space (hard drop), Shift/C (hold), Escape/P (pause), R (restart after game over).
