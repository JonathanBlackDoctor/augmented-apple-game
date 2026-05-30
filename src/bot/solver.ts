// bot/solver.ts — sum-target rectangle solver via 2D prefix sums (plan §13). PURE.
import type { Board, Rect } from '../contracts';

export interface BotMove {
  rect: Rect;
  count: number; // apples removed by this move
}

interface Prefix {
  sum: number[]; // (rows+1)*(cols+1) inclusive prefix of cell values
  cnt: number[]; // inclusive prefix of non-empty counts
  cols: number;
  rows: number;
}

/** Build inclusive 2D prefix sums. Empty cells (0) contribute 0 to the sum. */
export function buildPrefix(board: Board): Prefix {
  const { cols, rows, cells } = board;
  const w = cols + 1;
  const sum = new Array<number>(w * (rows + 1)).fill(0);
  const cnt = new Array<number>(w * (rows + 1)).fill(0);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = cells[y * cols + x];
      const a = (y + 1) * w + (x + 1);
      sum[a] = v + sum[y * w + (x + 1)] + sum[(y + 1) * w + x] - sum[y * w + x];
      cnt[a] = (v > 0 ? 1 : 0) + cnt[y * w + (x + 1)] + cnt[(y + 1) * w + x] - cnt[y * w + x];
    }
  }
  return { sum, cnt, cols, rows };
}

function area(p: number[], w: number, x0: number, y0: number, x1: number, y1: number): number {
  return (
    p[(y1 + 1) * w + (x1 + 1)] - p[y0 * w + (x1 + 1)] - p[(y1 + 1) * w + x0] + p[y0 * w + x0]
  );
}

/** All rectangles whose enclosed apple values sum to `target` (>=1 apple). */
export function findMoves(board: Board, target: number): BotMove[] {
  const pre = buildPrefix(board);
  const w = pre.cols + 1;
  const moves: BotMove[] = [];
  for (let y0 = 0; y0 < pre.rows; y0++) {
    for (let y1 = y0; y1 < pre.rows; y1++) {
      for (let x0 = 0; x0 < pre.cols; x0++) {
        for (let x1 = x0; x1 < pre.cols; x1++) {
          const s = area(pre.sum, w, x0, y0, x1, y1);
          if (s > target) break; // values >= 0: widening only grows the sum -> prune
          if (s === target) {
            const c = area(pre.cnt, w, x0, y0, x1, y1);
            if (c >= 1) moves.push({ rect: { x0, y0, x1, y1 }, count: c });
          }
        }
      }
    }
  }
  return moves;
}
