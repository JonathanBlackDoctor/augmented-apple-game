// Regression tests for time-family augments combining with the round clock.
//   ① the round timer must show the augment-modified duration from the FIRST
//      in-round frame (no base-duration flicker), and
//   ② online, a time augment must actually change the round LENGTH (not just the
//      displayed number), with both clients rebuilding the shared schedule in step.
import { describe, it, expect } from 'vitest';
import { VersusMatch } from '../src/app/VersusMatch';
import { InMemoryNetBackend } from '../src/net/memoryBackend';
import { BackendNetSession } from '../src/net/session';
import { OnlineMatch } from '../src/app/OnlineMatch';
import type { PublicProfile } from '../src/contracts';

const RELIEF = 'time.relief'; // +7s
const TIGHTROPE = 'risk.tightrope'; // -8s
const IDLE_BOT = { minDelayMs: 9e9, maxDelayMs: 9e9, pickTop: 1, blunderChance: 1 };

/** Drive a vs-AI match, force-owning `wishlist` (one per round), and record the
 *  remainingMs reported on the FIRST snapshot of each round. */
function firstRoundFrames(wishlist: string[]): Record<number, { remaining: number; duration: number }> {
  const m = new VersusMatch({
    seedBase: 'flicker',
    tuning: IDLE_BOT,
    augmentMs: 500,
    preRoundMs: 50,
    roundCheckMs: 50,
  });
  const out: Record<number, { remaining: number; duration: number }> = {};
  const picked = new Set<number>();
  let prev = '';
  let now = 0;
  for (let i = 0; i < 100000; i++) {
    const s = m.tick(now);
    if (s.phase === 'augment' && !picked.has(s.round)) {
      const want = wishlist[picked.size];
      if (want) {
        m.pickAugment(want, now);
        picked.add(s.round);
        continue;
      }
    }
    if (s.phase === 'round' && prev !== 'round')
      out[s.round] = { remaining: s.remainingMs, duration: s.roundDurationMs };
    prev = s.phase;
    if (s.phase === 'matchResult') break;
    now += 100;
  }
  return out;
}

describe('time augments + round clock (regression)', () => {
  it('① vs-AI: first in-round frame already reflects +7s (no base-30s flicker)', () => {
    const f = firstRoundFrames([RELIEF]);
    expect(f[0].remaining).toBe(37_000); // pre-fix this was 30_000 for one frame
    expect(f[0].duration).toBe(37_000); // HUD bar denominator matches → fills correctly
  });

  it('① vs-AI: +7s & -8s stacked → first frame 29s, never the base 30s', () => {
    const f = firstRoundFrames([RELIEF, TIGHTROPE]);
    expect(f[0].remaining).toBe(37_000); // round 0: relief only
    expect(f[1].remaining).toBe(29_000); // round 1: relief + tightrope = 30 + 7 - 8
    expect(f[1].duration).toBe(29_000); // bar denominator tracks the stacked duration
  });

  it('② online: a +7s relief actually lengthens the round, both clients in lockstep', async () => {
    const A: PublicProfile = { uid: 'A', nickname: 'A', avatar: '🍎', tier: 'Silver', mmr: 1000 };
    const B: PublicProfile = { uid: 'B', nickname: 'B', avatar: '🍏', tier: 'Silver', mmr: 1000 };
    const FAST = { durationMs: 4000, countdownMs: 300, augmentMs: 600, preRoundMs: 100, roundCheckMs: 300 };
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('room', A);
    await sb.join('room', B);
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: 'room', ...FAST });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, roomId: 'room', ...FAST });
    await host.start();
    await guest.start();

    let now = 0;
    let r0Start = -1;
    let r0End = -1;
    let prevHost = '';
    for (let i = 0; i < 100000; i++) {
      host.tick(now);
      guest.tick(now);
      // Both players keep picking relief in every augment window (idempotent).
      if (host.snapshot().phase === 'augment') host.pickAugment(RELIEF);
      if (guest.snapshot().phase === 'augment') guest.pickAugment(RELIEF);

      const hs = host.snapshot();
      const inR0 = hs.phase === 'round' && hs.round === 0;
      if (inR0 && prevHost !== 'round') r0Start = now;
      if (!inR0 && prevHost === 'round' && r0Start >= 0 && r0End < 0) r0End = now;
      prevHost = inR0 ? 'round' : hs.phase;

      if (host.snapshot().phase === 'matchResult' && guest.snapshot().phase === 'matchResult') break;
      now += 50;
    }

    // Round 0's window grew from the 4s base to ~11s (4 + 7), proving the time
    // augment changed the actual round length, not just the displayed number.
    const length = r0End - r0Start;
    expect(length).toBeGreaterThan(9_000);
    expect(length).toBeLessThan(13_000);

    // Both clients finished the (now-longer) match together and agree on the verdict.
    expect(host.snapshot().phase).toBe('matchResult');
    expect(guest.snapshot().phase).toBe('matchResult');
    const mirror = { me: 'opp', opp: 'me', draw: 'draw' } as const;
    expect(guest.snapshot().winner).toBe(mirror[host.snapshot().winner as 'me' | 'opp' | 'draw']);
  });
});
