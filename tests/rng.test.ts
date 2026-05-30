import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng';

describe('SeededRng (mulberry32)', () => {
  it('is deterministic: same seed yields the same sequence', () => {
    const a = makeRng('seed-123');
    const b = makeRng('seed-123');
    const sa = Array.from({ length: 50 }, () => a.next());
    const sb = Array.from({ length: 50 }, () => b.next());
    expect(sa).toEqual(sb);
  });

  it('produces different sequences for different seeds', () => {
    const a = makeRng('seed-A');
    const b = makeRng('seed-B');
    const sa = Array.from({ length: 20 }, () => a.next());
    const sb = Array.from({ length: 20 }, () => b.next());
    expect(sa).not.toEqual(sb);
  });

  it('next() stays within [0, 1)', () => {
    const r = makeRng('range');
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) stays within [0, n)', () => {
    const r = makeRng('ints');
    for (let i = 0; i < 1000; i++) {
      const v = r.int(9);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(9);
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(r.int(0)).toBe(0);
  });

  it('fork is reproducible and label-dependent (cross-client sync)', () => {
    const seq = (r: ReturnType<typeof makeRng>) => Array.from({ length: 10 }, () => r.int(1000));
    const parent1 = makeRng('match:42');
    const parent2 = makeRng('match:42');
    // Same parent seed + same label => identical sub-stream on every client.
    expect(seq(parent1.fork('shuffle'))).toEqual(seq(parent2.fork('shuffle')));
    // Different labels => different sub-streams.
    expect(seq(makeRng('match:42').fork('a'))).not.toEqual(seq(makeRng('match:42').fork('b')));
  });

  it('roughly uniform over 1..9 (sanity)', () => {
    const r = makeRng('uniform');
    const counts = new Array(9).fill(0);
    const N = 90000;
    for (let i = 0; i < N; i++) counts[r.int(9)]++;
    const expected = N / 9;
    for (const c of counts) {
      expect(Math.abs(c - expected) / expected).toBeLessThan(0.1); // within 10%
    }
  });
});
