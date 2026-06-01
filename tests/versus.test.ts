import { describe, it, expect } from 'vitest';
import { VersusMatch } from '../src/app/VersusMatch';
import { findMoves } from '../src/bot/solver';
import { levelTuning } from '../src/bot';

/** Drive a full match headlessly: the "human" auto-plays with the solver. */
function playFullMatch(seedBase: string): VersusMatch {
  const m = new VersusMatch({ seedBase, tuning: levelTuning(5), durationMs: 3000 });
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
      m.pickAugment(snap.offers[0], now);
      now += 50;
    } else {
      // mid-round review is timer-driven: just advance the clock past it
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
    const m = new VersusMatch({ seedBase: 'check:1', tuning: levelTuning(5), durationMs: 1000 });
    let now = 0;
    // The match opens on the start-of-match augment pick; take it to reach round 1.
    if (m.snapshot().phase === 'augment') m.pickAugment(m.snapshot().offers[0], now);
    // The pick opens a 3·2·1 pre-round countdown before the round runs; advance
    // through preRound + round until the mid-round review opens.
    while (m.snapshot().phase !== 'roundCheck' && now < 8000) now = (m.tick(now), now + 50);
    const snap = m.snapshot();
    expect(snap.phase).toBe('roundCheck');
    expect(snap.lastRound).not.toBeNull();
    expect(['me', 'bot', 'draw']).toContain(snap.lastRound!.winner);
    expect(snap.phaseRemainingMs).toBeGreaterThan(0);
  });

  it('auto-picks the first offer when the augment timer elapses', () => {
    const m = new VersusMatch({
      seedBase: 'auto:1',
      tuning: levelTuning(5),
      durationMs: 1000,
      roundCheckMs: 200,
      augmentMs: 2000,
    });
    let now = 0;
    // advance until the augment window opens
    while (m.snapshot().phase !== 'augment' && now < 10000) now = (m.tick(now), now + 50);
    expect(m.snapshot().phase).toBe('augment');
    const expected = m.snapshot().offers[0];
    // never call pickAugment: let the timer fire (auto-pick → preRound → round)
    while (m.snapshot().phase === 'augment' && now < 20000) now = (m.tick(now), now + 50);
    // The auto-pick lands the offer immediately; the round itself follows the
    // 3·2·1 pre-round countdown.
    expect(m.snapshot().myOwned).toContain(expected);
    while (m.snapshot().phase === 'preRound' && now < 25000) now = (m.tick(now), now + 50);
    const snap = m.snapshot();
    expect(snap.phase).toBe('round'); // advanced into round 2
    expect(snap.myOwned).toContain(expected);
  });
});

describe('VersusMatch — start-of-match pick + reroll', () => {
  it('opens on a start pick (round 0) and reroll spends the one token', () => {
    const m = new VersusMatch({ seedBase: 'start:1', tuning: levelTuning(5), durationMs: 1000 });
    const before = m.snapshot();
    expect(before.phase).toBe('augment');
    expect(before.round).toBe(0); // the pick precedes round 1 (0-based round 0)
    expect(before.offers.length).toBe(3);
    expect(before.myOwned.length).toBe(0); // nothing owned until this pick is made
    expect(before.rerollsLeft).toBe(1); // one reroll token per match
    const beforeOffers = before.offers.slice();
    expect(m.reroll()).toBe(true);
    const after = m.snapshot();
    expect(after.rerollsLeft).toBe(0);
    expect(after.offers).not.toEqual(beforeOffers);
    expect(after.offers.length).toBe(3);
    expect(m.reroll()).toBe(false); // out of tokens
    expect(m.snapshot().rerollsLeft).toBe(0);
  });
});
