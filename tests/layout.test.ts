import { describe, it, expect } from 'vitest';
import { computeLayout, pointerToRect, pointToCell, cellCenter } from '../src/board/layout';

describe('board layout geometry', () => {
  it('fits square cells and centers the grid', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    expect(l.cell).toBeGreaterThan(0);
    // cell limited by the tighter of width/height
    expect(l.cell).toBe(Math.floor(Math.min((700 - 20) / 17, (420 - 20) / 10)));
    expect(l.width).toBe(l.cell * 17 + 20);
    expect(l.height).toBe(l.cell * 10 + 20);
  });

  it('a tap selects the single cell under the pointer', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    const { cx, cy } = cellCenter(l, 3, 4);
    // start == end (a pure click): snaps to exactly that cell, never null.
    const r = pointerToRect(l, cx, cy, cx, cy);
    expect(r).toEqual({ x0: 3, y0: 4, x1: 3, y1: 4 });
  });

  it('captures a contiguous range of cells', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    const a = cellCenter(l, 2, 1);
    const b = cellCenter(l, 5, 3);
    const r = pointerToRect(l, a.cx, a.cy, b.cx, b.cy);
    expect(r).toEqual({ x0: 2, y0: 1, x1: 5, y1: 3 });
  });

  it('a short drag across a cell boundary selects both cells', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    // from just inside cell (2,2) to just inside neighbour (3,2)
    const a = cellCenter(l, 2, 2);
    const b = cellCenter(l, 3, 2);
    const r = pointerToRect(l, a.cx, a.cy, b.cx, b.cy);
    expect(r).toEqual({ x0: 2, y0: 2, x1: 3, y1: 2 });
  });

  it('taps outside the grid clamp to the nearest edge cell (never null)', () => {
    const l = computeLayout(17, 10, 700, 420, 10);
    expect(pointToCell(l, -9999, -9999)).toEqual({ col: 0, row: 0 });
    expect(pointToCell(l, 9999, 9999)).toEqual({ col: 16, row: 9 });
    // a click in the top-left padding still resolves to cell (0,0), not null
    expect(pointerToRect(l, 0, 0, 0, 0)).toEqual({ x0: 0, y0: 0, x1: 0, y1: 0 });
  });
});
