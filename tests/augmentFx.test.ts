import { describe, it, expect } from 'vitest';
import { planClear, type FxClearCtx, type FxDir } from '../src/app/augmentFx';

function ctx(over: Partial<FxClearCtx> = {}): FxClearCtx {
  return {
    cells: [0, 1, 2],
    tags: ['normal', 'normal', 'normal'],
    count: 3,
    comboStreak: 1,
    sum: 10,
    baseScore: 6,
    finalScore: 6,
    comboMultiplier: 1,
    remainingMs: 20_000,
    durationMs: 30_000,
    ...over,
  };
}
const find = (d: FxDir[], k: FxDir['k']): FxDir | undefined => d.find((x) => x.k === k);

describe('planClear (in-game augment FX)', () => {
  it('always leads with a score popup carrying the gained points', () => {
    const d = planClear([], ctx({ finalScore: 1234 }));
    expect(d[0].k).toBe('popup');
    if (d[0].k === 'popup') expect(d[0].big).toContain('1,234');
  });

  it("reads the gambler's roll from final vs base score", () => {
    const win = find(planClear(['risk.gambler'], ctx({ baseScore: 6, finalScore: 12 })), 'dice');
    const lose = find(planClear(['risk.gambler'], ctx({ baseScore: 6, finalScore: 3 })), 'dice');
    expect(win?.k === 'dice' && win.text).toBe('10×');
    expect(lose?.k === 'dice' && lose.text).toBe('0×');
  });

  it('stamps rule clears keyed off the sum', () => {
    const twenty = find(planClear(['rule.twenty'], ctx({ sum: 20 })), 'stamp');
    const kind = find(planClear(['rule.kindness'], ctx({ sum: 9 })), 'stamp');
    const prime = find(planClear(['rule.eleven'], ctx({ sum: 13 })), 'stamp');
    expect(twenty?.k === 'stamp' && twenty.text).toBe('20');
    expect(kind?.k === 'stamp' && kind.text).toBe('허용');
    expect(prime?.k === 'stamp' && prime.text).toBe('소수 13');
    // ...but not when the augment isn't owned
    expect(find(planClear([], ctx({ sum: 9 })), 'stamp')).toBeUndefined();
  });

  it('bursts on a 4+ massacre clear', () => {
    const d = planClear(['combo.massacre'], ctx({ count: 4 }));
    expect(find(d, 'flash')).toBeDefined();
    expect(find(d, 'shake')).toBeDefined();
    expect(find(d, 'particles')).toBeDefined();
    // not below the threshold
    expect(find(planClear(['combo.massacre'], ctx({ count: 3 })), 'flash')).toBeUndefined();
  });

  it('sparkles special apples and tags the bonus', () => {
    const d = planClear([], ctx({ tags: ['golden', 'gem', 'normal'] }));
    const sparks = d.filter((x) => x.k === 'spark');
    expect(sparks.length).toBe(2);
    const pop = d[0];
    expect(pop.k).toBe('popup');
    if (pop.k === 'popup') {
      const labels = pop.tags.map((t) => t.t);
      expect(labels).toContain('황금 ×2');
      expect(labels).toContain('보석 +20');
    }
  });
});
