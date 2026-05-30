import { describe, it, expect } from 'vitest';
import { buildPrefix, findMoves } from '../src/bot/solver';
import { decide, difficultyForMmr } from '../src/bot/BotPlayer';
import { makeRng } from '../src/core';
import type { Board, Cell, CellTag } from '../src/contracts';

function board(cols: number, rows: number, vals: number[]): Board {
  return { cols, rows, cells: vals.slice() as Cell[], tags: vals.map((): CellTag => 'normal') };
}

describe('bot solver', () => {
  it('prefix sum equals the brute-force full-board total', () => {
    const b = board(3, 2, [1, 2, 3, 4, 5, 6]);
    const pre = buildPrefix(b);
    const w = pre.cols + 1;
    expect(pre.sum[2 * w + 3]).toBe(21);
  });

  it('finds a horizontal pair summing to 10', () => {
    const b = board(3, 2, [4, 6, 1, 9, 1, 2]);
    const moves = findMoves(b, 10);
    expect(moves.length).toBeGreaterThan(0);
    const hasTopPair = moves.some(
      (m) => m.rect.x0 === 0 && m.rect.x1 === 1 && m.rect.y0 === 0 && m.rect.y1 === 0,
    );
    expect(hasTopPair).toBe(true);
    for (const m of moves) {
      let s = 0;
      for (let y = m.rect.y0; y <= m.rect.y1; y++)
        for (let x = m.rect.x0; x <= m.rect.x1; x++) s += b.cells[y * b.cols + x];
      expect(s).toBe(10);
    }
  });

  it('ignores empty (0) cells inside a rectangle', () => {
    const b = board(3, 1, [4, 0, 6]);
    const moves = findMoves(b, 10);
    expect(moves.some((m) => m.rect.x0 === 0 && m.rect.x1 === 2)).toBe(true);
  });

  it('returns no moves when nothing sums to target', () => {
    expect(findMoves(board(2, 1, [1, 2]), 10).length).toBe(0);
  });
});

describe('bot decide', () => {
  const b = board(3, 2, [4, 6, 1, 9, 1, 2]);

  it('hard difficulty returns a valid move', () => {
    expect(decide(b, 10, 'hard', makeRng('s'))).not.toBeNull();
  });

  it('is deterministic for a fixed seed', () => {
    expect(decide(b, 10, 'normal', makeRng('seed1'))).toEqual(
      decide(b, 10, 'normal', makeRng('seed1')),
    );
  });

  it('returns null on a board with no solution', () => {
    expect(decide(board(2, 1, [1, 2]), 10, 'hard', makeRng('x'))).toBeNull();
  });

  it('maps mmr to difficulty', () => {
    expect(difficultyForMmr(1000)).toBe('easy');
    expect(difficultyForMmr(1300)).toBe('normal');
    expect(difficultyForMmr(1700)).toBe('hard');
  });
});
