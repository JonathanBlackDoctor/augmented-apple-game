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
 *  independent of any externally-injected live RNG. */
export function generateBoard(cfg: RoundConfig): Board {
  const cols = cfg.cols;
  const rows = cfg.rows;
  const n = cols * rows;
  const rng: SeededRng = makeRng(cfg.seed).fork('board');
  const cells: Cell[] = new Array<Cell>(n);
  const tags: CellTag[] = new Array<CellTag>(n);
  for (let i = 0; i < n; i++) {
    cells[i] = (1 + rng.int(9)) as AppleValue; // uniform 1..9
    tags[i] = 'normal';
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
