// board/layout.ts — PURE board geometry: viewport <-> grid mapping.
// No framework, no DOM. Unit-tested in tests/layout.test.ts.
import type { Rect } from '../contracts';

export interface BoardLayout {
  cols: number;
  rows: number;
  cell: number; // px size of a square cell
  originX: number; // px of grid's left edge inside the canvas
  originY: number;
  width: number; // canvas logical width
  height: number;
}

/** Fit a cols×rows grid of square cells into an available area, centered. */
export function computeLayout(
  cols: number,
  rows: number,
  availW: number,
  availH: number,
  pad = 8,
): BoardLayout {
  const innerW = Math.max(0, availW - pad * 2);
  const innerH = Math.max(0, availH - pad * 2);
  const cell = Math.max(1, Math.floor(Math.min(innerW / cols, innerH / rows)));
  const gridW = cell * cols;
  const gridH = cell * rows;
  const width = gridW + pad * 2;
  const height = gridH + pad * 2;
  return { cols, rows, cell, originX: pad, originY: pad, width, height };
}

/** Pixel rectangle (in canvas coords) occupied by a given cell. */
export function cellRect(
  l: BoardLayout,
  col: number,
  row: number,
): { x: number; y: number; w: number; h: number } {
  return { x: l.originX + col * l.cell, y: l.originY + row * l.cell, w: l.cell, h: l.cell };
}

export function cellCenter(l: BoardLayout, col: number, row: number): { cx: number; cy: number } {
  return { cx: l.originX + (col + 0.5) * l.cell, cy: l.originY + (row + 0.5) * l.cell };
}

/** Map a drag (two pixel points) to a grid Rect: every cell whose CENTER lies
 *  within the dragged pixel box is included (fruit-box "apples in the box").
 *  Returns null when no cell center is captured. */
export function pointerToRect(
  l: BoardLayout,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Rect | null {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);

  let x0 = Infinity;
  let x1 = -Infinity;
  for (let c = 0; c < l.cols; c++) {
    const cx = l.originX + (c + 0.5) * l.cell;
    if (cx >= minX && cx <= maxX) {
      if (c < x0) x0 = c;
      if (c > x1) x1 = c;
    }
  }
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let r = 0; r < l.rows; r++) {
    const cy = l.originY + (r + 0.5) * l.cell;
    if (cy >= minY && cy <= maxY) {
      if (r < y0) y0 = r;
      if (r > y1) y1 = r;
    }
  }
  if (x1 < x0 || y1 < y0) return null;
  return { x0, y0, x1, y1 };
}
