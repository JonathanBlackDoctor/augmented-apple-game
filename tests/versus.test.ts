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
    } else if (snap.phase === 'roundCheck') {
      // mid-round review is timer-driven: just advance the clock past it
      now += 50;
    } else if (snap.phase === 'augment') {
      m.pickAugment(snap.offers[0], now);
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
    expect(s.myOwned.length).toBe(5); // one pick before each of the 5 rounds (incl. start)
  });

  it('is deterministic for the same seed + same auto-play', () => {
    const a = playFullMatch('same:seed').snapshot();
    const b = playFullMatch('same:seed').snapshot();
    expect(a.myTotal).toBe(b.myTotal);
    expect(a.botTotal).toBe(b.botTotal);
    expect(a.winner).toBe(b.winner);
    expect(a.roundWins).toEqual(b.roundWins);
  });

  it('enters a mid-round review (roundCheck) once a round ends', () => {
    const m = new VersusMatch({ seedBase: 'check:1', difficulty: 'normal', durationMs: 1000 });
    let now = 0;
    // The match opens on the start-of-match augment pick; take it to reach round 1.
    if (m.snapshot().phase === 'augment') m.pickAugment(m.snapshot().offers[0], now);
    while (m.snapshot().phase === 'round' && now < 5000) now = (m.tick(now), now + 50);
    const snap = m.snapshot();
    expect(snap.phase).toBe('roundCheck');
    expect(snap.lastRound).not.toBeNull();
    expect(['me', 'bot', 'draw']).toContain(snap.lastRound!.winner);
    expect(snap.phaseRemainingMs).toBeGreaterThan(0);
  });

  it('opens on a start-of-match augment pick before round 1', () => {
    const m = new VersusMatch({ seedBase: 'start:1', difficulty: 'normal', durationMs: 1000 });
    const snap = m.snapshot();
    expect(snap.phase).toBe('augment');
    expect(snap.round).toBe(0); // the pick precedes round 1 (0-based round 0)
    expect(snap.offers.length).toBe(3);
    expect(snap.myOwned.length).toBe(0); // nothing owned until this pick is made
    expect(snap.rerollsLeft).toBe(1); // one reroll token per match
  });

  it('reroll spends a token and draws a fresh offer; second reroll is a no-op', () => {
    const m = new VersusMatch({ seedBase: 'reroll:1', difficulty: 'normal', durationMs: 1000 });
    const before = m.snapshot().offers.slice();
    expect(m.reroll()).toBe(true);
    const after = m.snapshot();
    expect(after.rerollsLeft).toBe(0);
    expect(after.offers).not.toEqual(before); // a different draw
    expect(after.offers.length).toBe(3);
    expect(m.reroll()).toBe(false); // out of tokens
    expect(m.snapshot().rerollsLeft).toBe(0);
  });

  it('auto-picks the first offer when the augment timer elapses', () => {
    const m = new VersusMatch({
      seedBase: 'auto:1',
      difficulty: 'normal',
      durationMs: 1000,
      roundCheckMs: 200,
      augmentMs: 2000,
    });
    let now = 0;
    // advance until the augment window opens
    while (m.snapshot().phase !== 'augment' && now < 10000) now = (m.tick(now), now + 50);
    expect(m.snapshot().phase).toBe('augment');
    const expected = m.snapshot().offers[0];
    // never call pickAugment: let the timer fire
    while (m.snapshot().phase === 'augment' && now < 20000) now = (m.tick(now), now + 50);
    const snap = m.snapshot();
    expect(snap.phase).toBe('round'); // advanced into round 2
    expect(snap.myOwned).toContain(expected);
  });
});
