// core/board.ts — deterministic board generation + selection geometry (plan §7).
// PURE: framework-free, no ambient time/randomness.
import type {
  Board,
  Cell,
  CellTag,
  AppleValue,
  Rect,
  RoundConfig,
} from '../contracts/core';
import type { SeededRng } from '../contracts/rng';
import { makeRng } from './rng';

export const DEFAULT_COLS = 17;
export const DEFAULT_ROWS = 10;
export const DEFAULT_DURATION_MS = 30_000;
export const DEFAULT_TARGET_SUM = 10;

export function cellIndex(cols: number, col: number, row: number): number {
  return row * cols + col;
}

/** Build the board purely from cfg.seed so replay() can reproduce it exactly,
 *  independent of any externally-injected live RNG.
 *
 *  Orientation-canonical: values are always drawn in the LANDSCAPE (wide) order
 *  — a W×H grid where W≥H — then mapped into the requested orientation. This way
 *  a portrait board (cols<rows) is the exact TRANSPOSE of the landscape board
 *  with the same seed: identical apples, just rotated 90°. Online opponents can
 *  therefore each render the board in the orientation that fits their own screen
 *  (a phone gets the tall layout) while staying perfectly fair — a rectangle and
 *  its transpose contain the same values and sum the same. Landscape boards
 *  (cols≥rows, what solo/AI modes always use) are produced exactly as before, so
 *  their generation — and every existing seed/replay — is unchanged. */
export function generateBoard(cfg: RoundConfig): Board {
  const cols = cfg.cols;
  const rows = cfg.rows;
  const n = cols * rows;
  const rng: SeededRng = makeRng(cfg.seed).fork('board');
  // Canonical landscape dimensions (the long side is the width).
  const cw = Math.max(cols, rows);
  const ch = Math.min(cols, rows);
  // Draw the canonical landscape values in row-major order (same sequence the
  // old code used for a landscape board, so wide boards are byte-identical).
  const canon: AppleValue[] = new Array<AppleValue>(n);
  for (let i = 0; i < n; i++) canon[i] = (1 + rng.int(9)) as AppleValue; // uniform 1..9
  const cells: Cell[] = new Array<Cell>(n);
  const tags: CellTag[] = new Array<CellTag>(n);
  const portrait = cols < rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Landscape: identity. Portrait: this cell (col,row) maps to canonical
      // (canonCol=row, canonRow=col) — i.e. the transpose of the wide board.
      const ci = portrait ? col * cw + row : row * cw + col;
      cells[row * cols + col] = canon[ci];
      tags[row * cols + col] = 'normal';
    }
  }
  return { cols, rows, cells, tags };
}

/** Normalize a (possibly inverted) grid rect and clamp it to the board. */
export function normalizeRect(board: Board, rect: Rect): Rect {
  const x0 = Math.max(0, Math.min(rect.x0, rect.x1));
  const x1 = Math.min(board.cols - 1, Math.max(rect.x0, rect.x1));
  const y0 = Math.max(0, Math.min(rect.y0, rect.y1));
  const y1 = Math.min(board.rows - 1, Math.max(rect.y0, rect.y1));
  return { x0, y0, x1, y1 };
}

export interface RectCells {
  cells: number[]; // non-empty cell indices inside the rect
  sum: number; // sum of their apple values
}

/** Collect the non-empty cells inside a grid rect and their value sum. */
export function rectToCells(board: Board, rect: Rect): RectCells {
  const r = normalizeRect(board, rect);
  const cells: number[] = [];
  let sum = 0;
  for (let row = r.y0; row <= r.y1; row++) {
    for (let col = r.x0; col <= r.x1; col++) {
      const idx = row * board.cols + col;
      const v = board.cells[idx];
      if (v > 0) {
        cells.push(idx);
        sum += v;
      }
    }
  }
  return { cells, sum };
}
