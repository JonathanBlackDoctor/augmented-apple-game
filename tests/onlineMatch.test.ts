import { describe, it, expect } from 'vitest';
import { InMemoryNetBackend } from '../src/net/memoryBackend';
import { BackendNetSession } from '../src/net/session';
import { OnlineMatch } from '../src/app/OnlineMatch';
import { findMoves } from '../src/bot/solver';
import type { PublicProfile } from '../src/contracts';

const A: PublicProfile = { uid: 'A', nickname: 'A', avatar: '🍎', tier: 'Silver', mmr: 1000 };
const B: PublicProfile = { uid: 'B', nickname: 'B', avatar: '🍏', tier: 'Silver', mmr: 1000 };

async function simulate(room: string) {
  const backend = new InMemoryNetBackend();
  const sa = new BackendNetSession(backend);
  const sb = new BackendNetSession(backend);
  await sa.join(room, A);
  await sb.join(room, B);
  const opts = { roomId: room, durationMs: 2000, countdownMs: 500, augmentMs: 800 };
  const host = new OnlineMatch({ session: sa, role: 'host', self: A, ...opts });
  const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, ...opts });
  await host.start();
  await guest.start();

  let now = 0;
  const autoplay = (m: OnlineMatch): void => {
    if (m.snapshot().phase === 'round' && now % 150 === 0) {
      const moves = findMoves(m.myBoard(), 10);
      if (moves.length > 0) m.myCommit(moves[0].rect);
    }
  };
  let guard = 0;
  while (guard++ < 100000) {
    host.tick(now);
    guest.tick(now);
    autoplay(host);
    autoplay(guest);
    if (host.snapshot().phase === 'matchResult' && guest.snapshot().phase === 'matchResult') break;
    now += 50;
  }
  return { host: host.snapshot(), guest: guest.snapshot() };
}

describe('OnlineMatch — 2-client in-memory full match', () => {
  it('both clients complete 5 rounds, see each other, and agree on the winner', async () => {
    const { host, guest } = await simulate('ROOMAA');
    expect(host.phase).toBe('matchResult');
    expect(guest.phase).toBe('matchResult');
    expect(host.oppPresent).toBe(true);
    expect(guest.oppPresent).toBe(true);
    // 4 augment picks (auto-picked when the window passes) for each side
    expect(host.myOwned.length).toBe(4);
    expect(guest.myOwned.length).toBe(4);
    // both actually scored something
    expect(host.myTotal + host.oppTotal).toBeGreaterThan(0);
    expect(host.roundWins.me + host.roundWins.opp).toBeLessThanOrEqual(5);
    // each side is the mirror of the other
    const mirror = { me: 'opp', opp: 'me', draw: 'draw' } as const;
    expect(host.winner ? mirror[host.winner] : null).toBe(guest.winner);
    expect(host.roundWins.me).toBe(guest.roundWins.opp);
  });
});
