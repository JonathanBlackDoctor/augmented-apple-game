import { describe, it, expect } from 'vitest';
import { createSharedMode } from '../src/roundmodes/shared';
import { createSabotageMode } from '../src/roundmodes/sabotage';
import { shuffleOrder } from '../src/roundmodes/sabotageFx';
import type { Claim } from '../src/contracts';

describe('shared round mode', () => {
  it('builds a single shared-board config', () => {
    const r = createSharedMode().buildRound('seed:r0', ['a', 'b']);
    expect(r.kind).toBe('shared');
    if (r.kind === 'shared') expect(r.config.modeId).toBe('shared');
  });

  it('resolves claims first-come, all-or-nothing', () => {
    const mode = createSharedMode();
    const owned = new Set<number>();
    const a: Claim = { player: 'a', seq: 1, cells: [3, 4], tsServer: 1 };
    const b: Claim = { player: 'b', seq: 1, cells: [4, 5], tsServer: 2 };
    expect(mode.resolveClaim!(a, owned).ok).toBe(true);
    expect(mode.resolveClaim!(b, owned).ok).toBe(false); // cell 4 already owned
    expect(mode.resolveClaim!({ player: 'b', seq: 2, cells: [5, 6], tsServer: 3 }, owned).ok).toBe(
      true,
    );
  });
});

describe('sabotage mode + deterministic shuffle', () => {
  it('uses separate boards', () => {
    expect(createSabotageMode().buildRound('s', ['a', 'b']).kind).toBe('separate');
  });

  it('shuffle is identical for the same subseed and differs otherwise', () => {
    expect(shuffleOrder(20, 'ev:1')).toEqual(shuffleOrder(20, 'ev:1'));
    expect(shuffleOrder(20, 'ev:1')).not.toEqual(shuffleOrder(20, 'ev:2'));
    expect(shuffleOrder(20, 'ev:1')).toHaveLength(20);
  });
});
