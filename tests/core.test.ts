import { describe, it, expect } from 'vitest';
import { createEngine, generateBoard, rectToCells, makeRng } from '../src/core';
import type { Board, RoundConfig, Rect, ClearAction, ClearResult } from '../src/contracts';
import type { AugmentHookBus } from '../src/contracts';

// A no-op hook bus: returns undefined everywhere, so the engine falls back to
// its base behaviour (pure sum-to-10 game with no augments). This keeps the
// core tests dependency-free (core + contracts only).
const noopBus: AugmentHookBus = { run: () => undefined };

function cfg(seed: string, over: Partial<RoundConfig> = {}): RoundConfig {
  return {
    seed,
    cols: 17,
    rows: 10,
    durationMs: 30_000,
    targetSum: 10,
    modeId: 'separate',
    augmentIds: [],
    ...over,
  };
}

function board(cells: number[], cols: number): Board {
  return { cols, rows: cells.length / cols, cells: cells as Board['cells'] };
}

/** Brute-force a valid clear on the current engine board (small rects only). */
function findValidRect(b: Readonly<Board>, evaluate: (r: Rect) => { valid: boolean }): Rect | null {
  for (let y0 = 0; y0 < b.rows; y0++) {
    for (let y1 = y0; y1 < Math.min(y0 + 3, b.rows); y1++) {
      for (let x0 = 0; x0 < b.cols; x0++) {
        for (let x1 = x0; x1 < Math.min(x0 + 5, b.cols); x1++) {
          const r = { x0, y0, x1, y1 };
          if (evaluate(r).valid) return r;
        }
      }
    }
  }
  return null;
}

describe('sum-to-10 judgment (rectToCells)', () => {
  it('accepts an exact pair summing to the target', () => {
    const b = board([4, 6, 2], 3);
    expect(rectToCells(b, { x0: 0, y0: 0, x1: 1, y1: 0 })).toEqual({ cells: [0, 1], sum: 10 });
  });

  it('rejects sums below / above the target', () => {
    const b = board([4, 6, 2], 3);
    expect(rectToCells(b, { x0: 0, y0: 0, x1: 0, y1: 0 }).sum).toBe(4); // too low
    expect(rectToCells(b, { x0: 0, y0: 0, x1: 2, y1: 0 }).sum).toBe(12); // too high
  });

  it('skips empty (cleared) cells', () => {
    const b = board([0, 4, 6], 3); // 0 = already cleared
    const r = rectToCells(b, { x0: 0, y0: 0, x1: 2, y1: 0 });
    expect(r.cells).toEqual([1, 2]); // index 0 skipped
    expect(r.sum).toBe(10);
  });

  it('supports multi-apple rectangles (2D)', () => {
    const b = board([1, 2, 3, 4], 2); // 2x2: 1 2 / 3 4
    const r = rectToCells(b, { x0: 0, y0: 0, x1: 1, y1: 1 });
    expect(r.cells.length).toBe(4);
    expect(r.sum).toBe(10);
  });

  it('clamps and normalizes inverted / out-of-bounds rects', () => {
    const b = board([4, 6, 2], 3);
    // inverted x and clamped beyond width
    expect(rectToCells(b, { x0: 1, y0: 0, x1: 0, y1: 0 })).toEqual({ cells: [0, 1], sum: 10 });
    expect(rectToCells(b, { x0: 0, y0: 0, x1: 99, y1: 99 }).sum).toBe(12);
  });
});

describe('engine evaluate / commit / score', () => {
  it('a valid commit clears the cells and scores 1 point per apple', () => {
    const e = createEngine();
    e.init(cfg('score-seed'), makeRng('score-seed'), noopBus);
    const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect));
    expect(r).not.toBeNull();
    const before = e.getScore();
    const res = e.commit({ seq: 1, rect: r!, tMs: 100 }) as ClearResult;
    expect('rejected' in res).toBe(false);
    expect(res.count).toBeGreaterThan(0);
    expect(res.finalScore).toBe(res.count); // base scoring: 1 per apple
    expect(e.getScore()).toBe(before + res.count);
    // cleared cells are now empty
    for (const i of res.cells) expect(e.getBoard().cells[i]).toBe(0);
  });

  it('keeps the combo within a 2s window and resets it after a longer gap', () => {
    // Record the comboCount the engine reports to onClear for each clear.
    const combos: number[] = [];
    const recordBus: AugmentHookBus = {
      run: (point, ...args) => {
        if (point === 'onClear') combos.push((args[1] as { comboCount: number }).comboCount);
        return undefined;
      },
    };
    const e = createEngine();
    e.init(cfg('combo-window'), makeRng('combo-window'), recordBus);
    let seq = 0;
    // The streak the engine reports in its commit result — the value the UI
    // controllers (HUD/SFX/FX) now mirror, so it must match what augments see.
    const returned: number[] = [];
    // tMs gaps: 0 -> +500 -> +1500 (all within 2s) -> +2001 (lapsed)
    for (const tMs of [0, 500, 2000, 4001]) {
      const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect));
      if (!r) break;
      returned.push((e.commit({ seq: ++seq, rect: r, tMs }) as ClearResult).comboCount);
    }
    // First three chain (1,2,3); the >2s gap before the fourth restarts at 1.
    expect(combos).toEqual([1, 2, 3, 1]);
    // The commit result exposes the same streak (single source of truth).
    expect(returned).toEqual([1, 2, 3, 1]);
  });

  it('rejects an invalid selection without changing the score', () => {
    const e = createEngine();
    e.init(cfg('reject-seed'), makeRng('reject-seed'), noopBus);
    // find a single non-empty cell whose value != 10 -> always invalid alone
    const idx = e.getBoard().cells.findIndex((v) => v > 0);
    const col = idx % e.getBoard().cols;
    const row = Math.floor(idx / e.getBoard().cols);
    const res = e.commit({ seq: 1, rect: { x0: col, y0: row, x1: col, y1: row }, tMs: 0 });
    expect('rejected' in res && res.rejected).toBe(true);
    expect(e.getScore()).toBe(0);
  });
});

describe('determinism', () => {
  it('same seed + config => identical board', () => {
    const b1 = generateBoard(cfg('determinism'));
    const b2 = generateBoard(cfg('determinism'));
    expect(b1.cells).toEqual(b2.cells);
  });

  it('two engines with the same seed build identical boards', () => {
    const e1 = createEngine();
    const e2 = createEngine();
    e1.init(cfg('same'), makeRng('same'), noopBus);
    e2.init(cfg('same'), makeRng('same'), noopBus);
    expect(e1.getBoard().cells).toEqual(e2.getBoard().cells);
  });

  it('different seeds => different boards', () => {
    const a = generateBoard(cfg('aaa'));
    const b = generateBoard(cfg('bbb'));
    expect(a.cells).not.toEqual(b.cells);
  });
});

describe('re-simulation (replay) consistency', () => {
  it('replaying the same action log yields the same score', () => {
    const e = createEngine();
    e.init(cfg('replay-seed'), makeRng('replay-seed'), noopBus);
    const actions: ClearAction[] = [];
    let seq = 0;
    for (let n = 0; n < 8; n++) {
      const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect));
      if (!r) break;
      const action = { seq: ++seq, rect: r, tMs: n * 1000 };
      actions.push(action);
      e.commit(action);
    }
    expect(actions.length).toBeGreaterThan(0);
    const live = e.getScore();

    // (a) same engine replays its own log
    expect(e.replay(actions)).toBe(live);
    // (b) a brand-new engine with the same seed replays the log to the same score
    const fresh = createEngine();
    fresh.init(cfg('replay-seed'), makeRng('replay-seed'), noopBus);
    expect(fresh.replay(actions)).toBe(live);
  });

  it('detects a tampered action log (different score)', () => {
    const e = createEngine();
    e.init(cfg('tamper'), makeRng('tamper'), noopBus);
    const good: ClearAction[] = [];
    let seq = 0;
    for (let n = 0; n < 5; n++) {
      const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect));
      if (!r) break;
      const a = { seq: ++seq, rect: r, tMs: n };
      good.push(a);
      e.commit(a);
    }
    const honest = e.replay(good);
    // Inject a bogus extra "clear" that is not actually valid on a fresh board.
    const tampered = [...good, { seq: 99, rect: { x0: 0, y0: 0, x1: 0, y1: 0 }, tMs: 999 }];
    // A fresh replay of the tampered log must not silently award extra points
    // beyond what the deterministic board allows.
    expect(e.replay(tampered)).toBe(honest); // the bogus single-cell clear is rejected -> no extra score
  });
});

describe('timer (injected monotonic clock)', () => {
  it('counts down and ends exactly at zero', () => {
    const e = createEngine();
    e.init(cfg('timer', { durationMs: 1000 }), makeRng('timer'), noopBus);
    expect(e.tick(0)).toEqual({ remainingMs: 1000, ended: false }); // first tick anchors
    expect(e.tick(400).remainingMs).toBe(600);
    expect(e.tick(900).remainingMs).toBe(100);
    const end = e.tick(1000);
    expect(end.remainingMs).toBe(0);
    expect(end.ended).toBe(true);
  });

  it('rejects commits after the round ended', () => {
    const e = createEngine();
    e.init(cfg('ended', { durationMs: 100 }), makeRng('ended'), noopBus);
    e.tick(0);
    e.tick(200); // ends
    const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect)) ?? { x0: 0, y0: 0, x1: 1, y1: 0 };
    const res = e.commit({ seq: 1, rect: r, tMs: 50 });
    expect('rejected' in res && res.rejected).toBe(true);
  });
});
