import { describe, it, expect } from 'vitest';
import { computeLayout, pointerToRect, cellCenter } from '../src/board/layout';

describe('board layout geometry', () => {
  it('fits square cells and centers the grid', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    expect(l.cell).toBeGreaterThan(0);
    // cell limited by the tighter of width/height
    expect(l.cell).toBe(Math.floor(Math.min((700 - 20) / 17, (420 - 20) / 10)));
    expect(l.width).toBe(l.cell * 17 + 20);
    expect(l.height).toBe(l.cell * 10 + 20);
  });

  it('captures a cell whose center is inside the drag box', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    const { cx, cy } = cellCenter(l, 3, 4);
    const r = pointerToRect(l, cx - 1, cy - 1, cx + 1, cy + 1);
    expect(r).toEqual({ x0: 3, y0: 4, x1: 3, y1: 4 });
  });

  it('captures a contiguous range of cells', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    const a = cellCenter(l, 2, 1);
    const b = cellCenter(l, 5, 3);
    const r = pointerToRect(l, a.cx, a.cy, b.cx, b.cy);
    expect(r).toEqual({ x0: 2, y0: 1, x1: 5, y1: 3 });
  });

  it('returns null when no center is captured (tiny drag between cells)', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    const a = cellCenter(l, 2, 2);
    const b = cellCenter(l, 3, 2);
    // a sliver strictly between the two centers, capturing neither
    const midX = (a.cx + b.cx) / 2;
    const r = pointerToRect(l, midX - 0.4, a.cy - 0.4, midX + 0.4, a.cy + 0.4);
    expect(r).toBeNull();
  });
});
