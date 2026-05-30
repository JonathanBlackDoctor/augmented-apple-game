import { describe, it, expect } from 'vitest';
import { createSeparateMode } from '../src/roundmodes';

describe('separate round mode', () => {
  it('builds an identical-seed config for each player', () => {
    const mode = createSeparateMode();
    const r = mode.buildRound('room:seed:r0', ['p1', 'p2']);
    expect(r.kind).toBe('separate');
    if (r.kind === 'separate') {
      expect(r.configs.p1.seed).toBe('room:seed:r0');
      expect(r.configs.p2.seed).toBe('room:seed:r0');
      expect(r.configs.p1.modeId).toBe('separate');
    }
    expect(mode.isShared).toBe(false);
  });

  it('scores the higher total as the winner with a bonus', () => {
    const mode = createSeparateMode({ winnerBonus: 50 });
    const out = mode.scoreRound({ p1: 120, p2: 90 });
    expect(out.winner).toBe('p1');
    expect(out.bonus).toBe(50);
  });

  it('reports a draw with no bonus on a tie', () => {
    const out = createSeparateMode().scoreRound({ p1: 100, p2: 100 });
    expect(out.winner).toBe('draw');
    expect(out.bonus).toBe(0);
  });
});
