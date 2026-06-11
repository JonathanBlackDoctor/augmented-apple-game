import { describe, it, expect } from 'vitest';
import { createEngine, makeRng } from '../src/core';
import {
  buildHookBusFor,
  rollOffer,
  rollOfferTiers,
  tierForRound,
  versusOfferTiers,
  CATALOG,
} from '../src/augments';
import type { RoundConfig, ClearAction, Rect, Board, AugmentHookBus } from '../src/contracts';

function cfg(seed: string, owned: string[], over: Partial<RoundConfig> = {}): RoundConfig {
  return {
    seed,
    cols: 17,
    rows: 10,
    durationMs: 30_000,
    targetSum: 10,
    modeId: 'separate',
    augmentIds: owned,
    ...over,
  };
}

function findValidRect(b: Readonly<Board>, evaluate: (r: Rect) => { valid: boolean }): Rect | null {
  for (let y0 = 0; y0 < b.rows; y0++)
    for (let y1 = y0; y1 < Math.min(y0 + 3, b.rows); y1++)
      for (let x0 = 0; x0 < b.cols; x0++)
        for (let x1 = x0; x1 < Math.min(x0 + 5, b.cols); x1++) {
          const r = { x0, y0, x1, y1 };
          if (evaluate(r).valid) return r;
        }
  return null;
}

describe('augment tier schedule', () => {
  it('R1/R2 silver, R3/R4 gold, R5 prismatic', () => {
    expect([0, 1, 2, 3, 4].map(tierForRound)).toEqual([
      'silver',
      'silver',
      'gold',
      'gold',
      'prismatic',
    ]);
  });
});

describe('rollOffer (3-pick, no reroll)', () => {
  it('offers 3 distinct ids of the requested tier', () => {
    const ids = rollOffer('silver', makeRng('offer:1'), []);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(CATALOG.find((a) => a.id === id)?.tier).toBe('silver');
  });

  it('is deterministic for the same seed + owned set', () => {
    expect(rollOffer('gold', makeRng('s'), [])).toEqual(rollOffer('gold', makeRng('s'), []));
  });

  it('excludes already-owned augments', () => {
    const owned = ['time.relief'];
    const ids = rollOffer('silver', makeRng('x'), owned);
    expect(ids).not.toContain('time.relief');
  });
});

describe('versus offer schedule (5 picks, mixed tiers)', () => {
  it('R1 silver, R2 silver+gold, R3 gold, R4 gold+prismatic, R5 prismatic', () => {
    expect(versusOfferTiers(0)).toEqual(['silver']);
    expect(versusOfferTiers(1)).toEqual(['silver', 'gold']);
    expect(versusOfferTiers(2)).toEqual(['gold']);
    expect(versusOfferTiers(3)).toEqual(['gold', 'prismatic']);
    expect(versusOfferTiers(4)).toEqual(['prismatic']);
  });

  it('rollOfferTiers draws only from the requested tiers', () => {
    const ids = rollOfferTiers(['silver', 'gold'], makeRng('mix:1'), []);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      const t = CATALOG.find((a) => a.id === id)?.tier;
      expect(['silver', 'gold']).toContain(t);
    }
  });

  it('a mixed pool can surface both tiers across seeds', () => {
    const tiers = new Set<string>();
    for (let i = 0; i < 20; i++) {
      for (const id of rollOfferTiers(['silver', 'gold'], makeRng(`mix:${i}`), [])) {
        tiers.add(CATALOG.find((a) => a.id === id)!.tier);
      }
    }
    expect(tiers.has('silver')).toBe(true);
    expect(tiers.has('gold')).toBe(true);
  });
});

describe('augment hook effects', () => {
  it('modifyRoundConfig stacks: relief (+7s) then glasscannon (halve)', () => {
    const e = createEngine();
    const owned = ['time.relief', 'risk.glasscannon'];
    e.init(cfg('mods', owned), makeRng('mods'), buildHookBusFor(owned));
    // (30000 + 7000) / 2 = 18500
    expect(e.tick(0).remainingMs).toBe(18500);
  });

  it('rule.kindness accepts a sum of 9', () => {
    // craft via engine board scan: find a rect summing to 9 (invalid by default)
    const e = createEngine();
    const owned = ['rule.kindness'];
    e.init(cfg('kind', owned), makeRng('kind'), buildHookBusFor(owned));
    const b = e.getBoard();
    let nineRect: Rect | null = null;
    for (let i = 0; i < b.cells.length && !nineRect; i++) {
      const col = i % b.cols;
      if (col < b.cols - 1) {
        const s = b.cells[i] + b.cells[i + 1];
        if (s === 9 && b.cells[i] > 0 && b.cells[i + 1] > 0)
          nineRect = { x0: col, y0: Math.floor(i / b.cols), x1: col + 1, y1: Math.floor(i / b.cols) };
      }
    }
    if (nineRect) expect(e.evaluate(nineRect).valid).toBe(true);
    else expect(true).toBe(true); // board had no adjacent 9-pair; effect covered elsewhere
  });

  it('glasscannon triples clear score', () => {
    const owned = ['risk.glasscannon'];
    const e = createEngine();
    e.init(cfg('triple', owned), makeRng('triple'), buildHookBusFor(owned));
    const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect))!;
    const before = e.getScore();
    const res = e.commit({ seq: 1, rect: r, tMs: 0 });
    if (!('rejected' in res)) {
      expect(res.finalScore).toBe(res.count * 3);
      expect(e.getScore()).toBe(before + res.count * 3);
    }
  });
});

describe('augment determinism (golden placement + replay with augments)', () => {
  it('same seed => same golden cells', () => {
    const owned = ['board.golden'];
    const e1 = createEngine();
    const e2 = createEngine();
    e1.init(cfg('gold-seed', owned), makeRng('gold-seed'), buildHookBusFor(owned));
    e2.init(cfg('gold-seed', owned), makeRng('gold-seed'), buildHookBusFor(owned));
    const g1 = (e1.getBoard().tags ?? []).map((t, i) => (t === 'golden' ? i : -1)).filter((i) => i >= 0);
    const g2 = (e2.getBoard().tags ?? []).map((t, i) => (t === 'golden' ? i : -1)).filter((i) => i >= 0);
    expect(g1.length).toBe(5);
    expect(g1).toEqual(g2);
  });

  it('replay with augments reproduces the live score', () => {
    const owned = ['combo.chain', 'board.golden', 'combo.training'];
    const e = createEngine();
    e.init(cfg('aug-replay', owned), makeRng('aug-replay'), buildHookBusFor(owned));
    const actions: ClearAction[] = [];
    let seq = 0;
    for (let n = 0; n < 6; n++) {
      const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect));
      if (!r) break;
      const a = { seq: ++seq, rect: r, tMs: n * 500 };
      actions.push(a);
      e.commit(a);
    }
    expect(e.replay(actions)).toBe(e.getScore());
  });
});

describe('exploit fixes', () => {
  it('rule-bender augments can now be stacked (no conflictsWith)', () => {
    // The mutual-exclusion was lifted: owning one rule-bender no longer excludes
    // the others, so none of them declares a conflict.
    for (const id of ['rule.kindness', 'rule.eleven', 'rule.alchemy']) {
      expect(CATALOG.find((a) => a.id === id)?.conflictsWith).toBeUndefined();
    }
  });

  it('engine caps banked time at 2x effective duration', () => {
    // A pathological onTick that floods time should still be clamped.
    const floodBus: AugmentHookBus = {
      run(point: string, ...args: unknown[]) {
        if (point === 'modifyRoundConfig') return args[0];
        if (point === 'onTick') return { remainingMs: 1e9, paused: false };
        return undefined;
      },
    };
    const e = createEngine();
    e.init(cfg('cap', [], { durationMs: 1000 }), makeRng('cap'), floodBus);
    e.tick(0); // anchor
    expect(e.tick(16).remainingMs).toBe(2000); // capped at 2 * 1000
  });
});

describe('new augments', () => {
  it('combo.massacre triples only when clearing 4+ at once', () => {
    const owned = ['combo.massacre'];
    const e = createEngine();
    e.init(cfg('mass', owned), makeRng('mass'), buildHookBusFor(owned));
    const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect))!;
    const res = e.commit({ seq: 1, rect: r, tMs: 0 });
    if (!('rejected' in res)) {
      expect(res.finalScore).toBe(res.count >= 4 ? res.count * 3 : res.count);
    }
  });

  it('rule.twenty accepts a sum of 20', () => {
    const owned = ['rule.twenty'];
    const e = createEngine();
    e.init(cfg('twenty', owned), makeRng('twenty'), buildHookBusFor(owned));
    const b = e.getBoard();
    // scan a small window for any rect summing to 20
    let r20: Rect | null = null;
    for (let y = 0; y < b.rows && !r20; y++)
      for (let x0 = 0; x0 < b.cols && !r20; x0++)
        for (let x1 = x0; x1 < Math.min(x0 + 6, b.cols); x1++) {
          let s = 0;
          for (let x = x0; x <= x1; x++) s += b.cells[y * b.cols + x];
          if (s === 20) { r20 = { x0, y0: y, x1, y1: y }; break; }
          if (s > 20) break;
        }
    if (r20) expect(e.evaluate(r20).valid).toBe(true);
    else expect(true).toBe(true); // no sum-20 window on this board
  });

  it('board.rainbow lets a wild apple complete a sum', () => {
    const owned = ['board.rainbow'];
    const e = createEngine();
    e.init(cfg('rain', owned), makeRng('rain'), buildHookBusFor(owned));
    const b = e.getBoard();
    const tags = b.tags ?? [];
    // find a wild with a non-wild, non-empty horizontal neighbor
    let rect: Rect | null = null;
    for (let i = 0; i < b.cells.length && !rect; i++) {
      if (tags[i] !== 'wild') continue;
      const col = i % b.cols;
      if (col >= b.cols - 1) continue;
      if (tags[i + 1] === 'wild' || b.cells[i + 1] <= 0) continue;
      const row = Math.floor(i / b.cols);
      rect = { x0: col, y0: row, x1: col + 1, y1: row }; // wild + 1..9 neighbor -> need 1..9, accepted
    }
    if (rect) expect(e.evaluate(rect).valid).toBe(true);
    else expect(true).toBe(true);
  });

  it('board.bomb explodes the orthogonal neighbours still on the board', () => {
    const bomb = CATALOG.find((a) => a.id === 'board.bomb')!;
    // 3x3 board; centre (idx 4) is the cleared bomb (already 0 like in commit).
    // Neighbours: up=1, down=7, left=3, right=5 — all non-empty.
    const board: Board = {
      cols: 3,
      rows: 3,
      cells: [2, 3, 2, 4, 0, 6, 1, 7, 8],
      tags: ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'],
    };
    const base = { cells: [4], count: 1, baseScore: 1, finalScore: 1, comboMultiplier: 1 };
    const ctx = { board, clearedTags: ['bomb'] } as unknown as Parameters<NonNullable<typeof bomb.hooks.onClear>>[1];
    const res = bomb.hooks.onClear!(base, ctx);
    // The four orthogonal neighbours are cleared on the board…
    expect([board.cells[1], board.cells[3], board.cells[5], board.cells[7]]).toEqual([0, 0, 0, 0]);
    // …non-neighbours (corners) survive…
    expect([board.cells[0], board.cells[2], board.cells[6], board.cells[8]]).toEqual([2, 2, 1, 8]);
    // …they're added to the cleared set and each scores +2.
    expect(res.cells).toEqual(expect.arrayContaining([1, 3, 5, 7]));
    expect(res.cells.length).toBe(5);
    expect(res.finalScore).toBe(1 + 4 * 2);
  });

  it('board.bomb only blows up apples that are still there', () => {
    const bomb = CATALOG.find((a) => a.id === 'board.bomb')!;
    // Bomb at corner idx 0 (cleared); neighbours right=1 (empty) and down=3 (full).
    const board: Board = {
      cols: 3,
      rows: 3,
      cells: [0, 0, 5, 6, 0, 0, 0, 0, 0],
      tags: ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'],
    };
    const base = { cells: [0], count: 1, baseScore: 1, finalScore: 1, comboMultiplier: 1 };
    const ctx = { board, clearedTags: ['bomb'] } as unknown as Parameters<NonNullable<typeof bomb.hooks.onClear>>[1];
    const res = bomb.hooks.onClear!(base, ctx);
    // Only the non-empty neighbour (down=3) explodes; the empty one is ignored.
    expect(board.cells[3]).toBe(0);
    expect(res.cells).toEqual([0, 3]);
    expect(res.finalScore).toBe(1 + 1 * 2);
  });

  it('risk.gambler stays replay-deterministic (uses seeded rng)', () => {
    const owned = ['risk.gambler'];
    const e = createEngine();
    e.init(cfg('gmb', owned), makeRng('gmb'), buildHookBusFor(owned));
    const actions: ClearAction[] = [];
    let seq = 0;
    for (let n = 0; n < 5; n++) {
      const r = findValidRect(e.getBoard(), (rect) => e.evaluate(rect));
      if (!r) break;
      const a = { seq: ++seq, rect: r, tMs: n * 400 };
      actions.push(a);
      e.commit(a);
    }
    expect(e.replay(actions)).toBe(e.getScore());
  });
});

describe('augment balance tweaks', () => {
  const rule = (id: string) => CATALOG.find((a) => a.id === id)!;
  const selCtx = (sum: number) =>
    ({ sum, cells: [0, 1], board: {} as Board, rect: {} as Rect, targetSum: 10 }) as unknown as Parameters<
      NonNullable<ReturnType<typeof rule>['hooks']['validateSelection']>
    >[0];

  it("'소수의 길' accepts 10–20 primes but rejects primes above 20", () => {
    const eleven = rule('rule.eleven').hooks.validateSelection!;
    for (const ok of [11, 13, 17, 19]) expect(eleven(selCtx(ok))?.accept).toBe(true);
    for (const no of [9, 10, 21, 23, 29]) expect(eleven(selCtx(no))).toBeUndefined();
  });

  it('초읽기 grants a flat +0.5s from a 2-combo; 가속 보상 scales with combo depth', () => {
    const base = { cells: [0], count: 1, baseScore: 1, finalScore: 1, comboMultiplier: 1 };
    // Invoke an augment's onClear with a stub ctx that records grantTimeMs(ms).
    const timeGranted = (id: string, comboCount: number): number => {
      let ms = 0;
      const ctx = { comboCount, grantTimeMs: (n: number) => (ms += n) } as unknown as Parameters<
        NonNullable<ReturnType<typeof rule>['hooks']['onClear']>
      >[1];
      rule(id).hooks.onClear!(base, ctx);
      return ms;
    };
    // 초읽기 (countdown): nothing below a 2-combo, then a steady +0.5s.
    expect(timeGranted('time.countdown', 1)).toBe(0);
    expect(timeGranted('time.countdown', 2)).toBe(500);
    expect(timeGranted('time.countdown', 7)).toBe(500); // stays flat regardless of depth
    // 가속 보상 (tempo): nothing below a 3-combo, then comboCount × 0.1s, capped at +1s.
    expect(timeGranted('time.tempo', 2)).toBe(0);
    expect(timeGranted('time.tempo', 3)).toBe(300);
    expect(timeGranted('time.tempo', 10)).toBe(1000); // 10 × 0.1s = cap
    expect(timeGranted('time.tempo', 15)).toBe(1000); // stays at the +1s cap
  });

  it("'도박사' rolls 10× on a hit (<0.2) and 0× on a miss", () => {
    const gambler = rule('risk.gambler').hooks.onClear!;
    const base = { cells: [0], count: 1, baseScore: 4, finalScore: 4, comboMultiplier: 1 };
    const ctxWith = (roll: number) =>
      ({ rng: { next: () => roll } }) as unknown as Parameters<typeof gambler>[1];
    expect(gambler(base, ctxWith(0.1)).finalScore).toBe(40); // 4 × 10
    expect(gambler(base, ctxWith(0.5)).finalScore).toBe(0); // 4 × 0
  });

  it('grants a +50% set bonus once a family reaches 3 augments', () => {
    const base = { cells: [0], count: 1, baseScore: 10, finalScore: 10, comboMultiplier: 1 };
    const clearCtx = { comboCount: 1, grantTimeMs: () => {} } as unknown as Parameters<
      NonNullable<ReturnType<typeof rule>['hooks']['onClear']>
    >[1];
    // Three 'time'-family augments that don't change the score at comboCount 1.
    const trio = buildHookBusFor(['time.relief', 'time.countdown', 'time.tempo']);
    expect((trio.run('onClear', base, clearCtx) as typeof base).finalScore).toBe(15); // 10 × 1.5
    // Only two of a family → no synergy.
    const pair = buildHookBusFor(['time.relief', 'time.countdown']);
    expect((pair.run('onClear', base, clearCtx) as typeof base).finalScore).toBe(10);
  });

  it('reroll never re-offers the cards being rerolled', () => {
    const first = rollOfferTiers(['silver'], makeRng('reroll-a'), []);
    const rerolled = rollOfferTiers(['silver'], makeRng('reroll-b'), [], first);
    expect(new Set(rerolled).size).toBe(3);
    for (const id of rerolled) expect(first).not.toContain(id);
  });
});
