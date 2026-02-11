import { UI_BG, GRID_COLOR, TEXT_COLOR } from '../constants.ts';
import type { Layout, ButtonRect } from '../layout.ts';
import type { TouchButtonState } from '../game/TouchInput.ts';

const CORNER_RADIUS = 6;
const PRESSED_COLOR = '#2a3a6e';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  rect: ButtonRect,
  label: string,
  pressed: boolean,
) {
  ctx.fillStyle = pressed ? PRESSED_COLOR : UI_BG;
  drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, CORNER_RADIUS);
  ctx.fill();

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, CORNER_RADIUS);
  ctx.stroke();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.textBaseline = 'alphabetic';
}

export function drawTouchButtons(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  buttonState: TouchButtonState,
) {
  drawButton(ctx, layout.holdButtonRect, 'HOLD', buttonState.hold);
  drawButton(ctx, layout.rotateCCWButtonRect, 'CCW', buttonState.rotateCCW);
  drawButton(ctx, layout.pauseButtonRect, 'PAUSE', buttonState.pause);
}
