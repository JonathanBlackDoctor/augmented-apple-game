import { describe, it, expect } from 'vitest';
import { anchor, roundTarget, ROUND_P } from '../src/ui/components/skyClock';

describe('skyClock day-night progression', () => {
  it('starts each round at its tuned anchor (remaining = full)', () => {
    for (let i = 0; i < ROUND_P.length; i++) {
      expect(roundTarget(i, 5, 30_000, 30_000)).toBeCloseTo(ROUND_P[i], 5);
    }
  });

  it('a round ending hands off seamlessly to the next round starting', () => {
    // R1 fully elapsed lands exactly where R2 begins.
    const endOfR1 = roundTarget(0, 5, 0, 30_000);
    const startOfR2 = roundTarget(1, 5, 30_000, 30_000);
    expect(endOfR1).toBeCloseTo(startOfR2, 5);
    expect(endOfR1).toBeCloseTo(ROUND_P[1], 5);
  });

  it('the final round and the match end at daybreak (p=1 ≡ p=0, a seamless loop)', () => {
    expect(roundTarget(4, 5, 0, 30_000)).toBeCloseTo(1, 5);
    expect(anchor(5, 5)).toBe(1);
  });

  it('a single-round match sweeps the whole day and loops back to morning', () => {
    expect(roundTarget(0, 1, 30_000, 30_000)).toBeCloseTo(ROUND_P[0], 5);
    expect(roundTarget(0, 1, 0, 30_000)).toBeCloseTo(1, 5);
  });

  it('progresses linearly with elapsed time within a round', () => {
    // Half the clock gone → halfway between this round and the next.
    const mid = roundTarget(0, 5, 15_000, 30_000);
    expect(mid).toBeCloseTo((ROUND_P[0] + ROUND_P[1]) / 2, 5);
  });

  it('a slowed clock yields a proportionally slowed sweep', () => {
    // With a slow-time augment the same wall-clock tick leaves more remainingMs,
    // so the phase advances less — strictly behind the un-slowed sweep.
    const normal = roundTarget(0, 5, 20_000, 30_000); // 1/3 elapsed
    const slowed = roundTarget(0, 5, 24_000, 30_000); // time crept slower → less elapsed
    expect(slowed).toBeLessThan(normal);
  });

  it('a frozen clock (augment-pick / between rounds) holds the phase', () => {
    const a = roundTarget(2, 5, 12_345, 30_000);
    const b = roundTarget(2, 5, 12_345, 30_000);
    expect(a).toBe(b);
  });

  it('clamps a hostile clock instead of overshooting', () => {
    expect(roundTarget(0, 5, -100, 30_000)).toBeCloseTo(ROUND_P[1], 5); // beyond end
    expect(roundTarget(0, 5, 40_000, 30_000)).toBeCloseTo(ROUND_P[0], 5); // before start
    expect(roundTarget(0, 5, 30_000, 0)).toBeCloseTo(ROUND_P[0], 5); // zero duration
  });

  it('falls back to an even day spread for matches longer than the anchor table', () => {
    const n = 8;
    expect(anchor(0, n)).toBeCloseTo(ROUND_P[0], 5);
    expect(anchor(n, n)).toBe(1);
    expect(anchor(4, n)).toBeGreaterThan(anchor(3, n));
  });
});
