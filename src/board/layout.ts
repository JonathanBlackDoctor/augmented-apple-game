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

/** Fit a cols×rows grid of square cells into an available area, centered.
 *  `scale` (0–1) shrinks the fitted cell so the whole grid occupies less of the
 *  area — apples stay packed together, but more background shows around the board.
 *  The canvas (width/height) shrinks with the grid so the flex host can center it. */
export function computeLayout(
  cols: number,
  rows: number,
  availW: number,
  availH: number,
  pad = 8,
  scale = 1,
): BoardLayout {
  const innerW = Math.max(0, availW - pad * 2);
  const innerH = Math.max(0, availH - pad * 2);
  const fitted = Math.min(innerW / cols, innerH / rows);
  const cell = Math.max(1, Math.floor(fitted * Math.max(0.2, Math.min(1, scale))));
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

function clampInt(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Pixel point (canvas coords) -> the grid cell that contains it. Points that
 *  fall in the padding or outside the grid clamp to the nearest edge cell, so
 *  a tap *always* resolves to a real cell (never "between" cells). */
export function pointToCell(l: BoardLayout, x: number, y: number): { col: number; row: number } {
  const col = clampInt(Math.floor((x - l.originX) / l.cell), 0, l.cols - 1);
  const row = clampInt(Math.floor((y - l.originY) / l.cell), 0, l.rows - 1);
  return { col, row };
}

/** Map a drag (two pixel points in canvas coords) to an inclusive grid Rect.
 *  Cell-snapped marquee: selects the block spanning the cell under the drag's
 *  start and the cell under the current point. A tap (a≈b) selects the single
 *  cell under the pointer. Intentionally forgiving — small/imprecise drags and
 *  taps always register (the old "cell-center inside the box" rule dropped most
 *  clicks). Returns null only for a degenerate layout. */
export function pointerToRect(
  l: BoardLayout,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Rect | null {
  if (l.cell <= 0) return null;
  const a = pointToCell(l, ax, ay);
  const b = pointToCell(l, bx, by);
  return {
    x0: Math.min(a.col, b.col),
    y0: Math.min(a.row, b.row),
    x1: Math.max(a.col, b.col),
    y1: Math.max(a.row, b.row),
  };
}
