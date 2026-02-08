import { describe, it, expect } from 'vitest';
import { computeLayout } from './layout.ts';

describe('computeLayout', () => {
  describe('without touch', () => {
    it('produces a layout with touchEnabled false by default', () => {
      const layout = computeLayout(800, 600);
      expect(layout.touchEnabled).toBe(false);
      expect(layout.buttonBarHeight).toBe(0);
      expect(layout.holdButtonRect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
      expect(layout.rotateCCWButtonRect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
      expect(layout.pauseButtonRect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('does not change canvas height when touchEnabled is false', () => {
      const layoutDefault = computeLayout(800, 600);
      const layoutExplicit = computeLayout(800, 600, false);
      expect(layoutDefault.canvasHeight).toBe(layoutExplicit.canvasHeight);
    });
  });

  describe('with touch', () => {
    it('sets touchEnabled to true', () => {
      const layout = computeLayout(800, 600, true);
      expect(layout.touchEnabled).toBe(true);
    });

    it('includes button bar in canvas height', () => {
      const layout = computeLayout(800, 600, true);
      // Canvas height = buttonBarTop + buttonBarHeight + bottomPadding (15)
      expect(layout.canvasHeight).toBe(layout.buttonBarTop + layout.buttonBarHeight + 15);
    });

    it('computes button rects with positive dimensions', () => {
      const layout = computeLayout(800, 600, true);
      for (const rect of [layout.holdButtonRect, layout.rotateCCWButtonRect, layout.pauseButtonRect]) {
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
        expect(rect.x).toBeGreaterThan(0);
        expect(rect.y).toBeGreaterThan(0);
      }
    });

    it('positions buttons below the stats panel', () => {
      const layout = computeLayout(800, 600, true);
      const statsBottom = layout.statsTop + layout.statsPanelHeight;
      expect(layout.holdButtonRect.y).toBeGreaterThan(statsBottom);
    });

    it('places buttons in left-to-right order without overlap', () => {
      const layout = computeLayout(800, 600, true);
      const hold = layout.holdButtonRect;
      const ccw = layout.rotateCCWButtonRect;
      const pause = layout.pauseButtonRect;

      expect(ccw.x).toBeGreaterThan(hold.x + hold.width);
      expect(pause.x).toBeGreaterThan(ccw.x + ccw.width);
    });

    it('all buttons share the same vertical position', () => {
      const layout = computeLayout(800, 600, true);
      expect(layout.holdButtonRect.y).toBe(layout.rotateCCWButtonRect.y);
      expect(layout.rotateCCWButtonRect.y).toBe(layout.pauseButtonRect.y);
    });
  });
});
