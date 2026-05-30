import { describe, it, expect } from 'vitest';
import { VersusMatch } from '../src/app/VersusMatch';
import { findMoves } from '../src/bot/solver';

/** Drive a full match headlessly: the "human" auto-plays with the solver. */
function playFullMatch(seedBase: string): VersusMatch {
  const m = new VersusMatch({ seedBase, difficulty: 'normal', durationMs: 3000 });
  let now = 0;
  let guard = 0;
  while (m.snapshot().phase !== 'matchResult' && guard++ < 200000) {
    const snap = m.tick(now);
    if (snap.phase === 'round') {
      if (now % 200 === 0) {
        const moves = findMoves(m.myBoard(), 10);
        if (moves.length > 0) m.myCommit(moves[0].rect, now);
      }
      now += 50;
    } else if (snap.phase === 'augment') {
      m.pickAugment(snap.offers[0]);
      now += 50;
    }
  }
  return m;
}

describe('VersusMatch — you vs AI, full headless match', () => {
  it('runs 5 rounds to a decisive result', () => {
    const s = playFullMatch('roomZ:123').snapshot();
    expect(s.phase).toBe('matchResult');
    expect(s.round).toBe(4); // 0-based final round
    expect(['me', 'bot', 'draw']).toContain(s.winner);
    expect(s.roundWins.me + s.roundWins.bot).toBeLessThanOrEqual(5);
    expect(s.myTotal + s.botTotal).toBeGreaterThan(0);
    expect(s.myOwned.length).toBe(4); // one augment pick before rounds 2..5
  });

  it('is deterministic for the same seed + same auto-play', () => {
    const a = playFullMatch('same:seed').snapshot();
    const b = playFullMatch('same:seed').snapshot();
    expect(a.myTotal).toBe(b.myTotal);
    expect(a.botTotal).toBe(b.botTotal);
    expect(a.winner).toBe(b.winner);
    expect(a.roundWins).toEqual(b.roundWins);
  });
});
