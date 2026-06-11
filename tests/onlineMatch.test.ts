import { describe, it, expect } from 'vitest';
import { InMemoryNetBackend } from '../src/net/memoryBackend';
import { BackendNetSession } from '../src/net/session';
import { OnlineMatch } from '../src/app/OnlineMatch';
import { findMoves } from '../src/bot/solver';
import type { PublicProfile } from '../src/contracts';

const A: PublicProfile = { uid: 'A', nickname: 'A', avatar: '🍎', tier: 'Silver', mmr: 1000 };
const B: PublicProfile = { uid: 'B', nickname: 'B', avatar: '🍏', tier: 'Silver', mmr: 1000 };
const C: PublicProfile = { uid: 'C', nickname: 'C', avatar: '🍊', tier: 'Silver', mmr: 1000 };
const FAST = { durationMs: 2000, countdownMs: 500, augmentMs: 800 };

async function simulate(room: string) {
  const backend = new InMemoryNetBackend();
  const sa = new BackendNetSession(backend);
  const sb = new BackendNetSession(backend);
  await sa.join(room, A);
  await sb.join(room, B);
  const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: room, ...FAST });
  const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, roomId: room, ...FAST });
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
    expect(host.myOwned.length).toBe(4);
    expect(guest.myOwned.length).toBe(4);
    expect(host.myTotal + host.oppTotal).toBeGreaterThan(0);
    expect(host.roundWins.me + host.roundWins.opp).toBeLessThanOrEqual(5);
    const mirror = { me: 'opp', opp: 'me', draw: 'draw' } as const;
    expect(host.winner ? mirror[host.winner] : null).toBe(guest.winner);
    expect(host.roundWins.me).toBe(guest.roundWins.opp);
    expect(host.oppLeft).toBe(false);
  });
});

describe('OnlineMatch — robustness', () => {
  it('host wins by forfeit when the opponent stops responding', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMDC', A);
    await sb.join('ROOMDC', B);
    const opts = { roomId: 'ROOMDC', ...FAST, hbIntervalMs: 300, disconnectMs: 1500 };
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, ...opts });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, ...opts });
    await host.start();
    await guest.start();
    let now = 0;
    for (let i = 0; i < 30; i++) {
      host.tick(now);
      guest.tick(now);
      now += 50;
    }
    // guest goes silent; host keeps ticking past the disconnect threshold
    for (let i = 0; i < 200 && host.snapshot().phase !== 'matchResult'; i++) {
      host.tick(now);
      now += 50;
    }
    const s = host.snapshot();
    expect(s.oppLeft).toBe(true);
    expect(s.winner).toBe('me');
  });

  it('flags no-opponent after the lobby timeout', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const host = new OnlineMatch({
      session: sa,
      role: 'host',
      self: A,
      roomId: 'ROOMLO',
      lobbyTimeoutMs: 1000,
    });
    await sa.join('ROOMLO', A);
    await host.start();
    let now = 0;
    for (let i = 0; i < 40; i++) {
      host.tick(now);
      now += 50;
    }
    expect(host.snapshot().noOpponent).toBe(true);
    expect(host.snapshot().phase).toBe('lobby');
  });

  it('guest flags no-opponent when no live host starts a countdown (stale invite)', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    await sa.join('ROOMEX', A); // stale host 'ready' remains in the room log; host gone
    const sb = new BackendNetSession(backend);
    await sb.join('ROOMEX', B);
    const guest = new OnlineMatch({
      session: sb,
      role: 'guest',
      self: B,
      roomId: 'ROOMEX',
      lobbyTimeoutMs: 1000,
    });
    await guest.start();
    let now = 0;
    for (let i = 0; i < 40; i++) {
      guest.tick(now);
      now += 50;
    }
    expect(guest.snapshot().noOpponent).toBe(true);
    expect(guest.snapshot().phase).toBe('lobby'); // never auto-starts a match
  });

  it('ignores a third party joining the room (2-player cap)', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    const sc = new BackendNetSession(backend);
    await sa.join('ROOMCAP', A);
    await sb.join('ROOMCAP', B);
    await sc.join('ROOMCAP', C);
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: 'ROOMCAP', ...FAST });
    await host.start();
    await sb.send({ t: 'ready', player: 'B', phase: 'lobby' });
    await sc.send({ t: 'clear', player: 'C', seq: 1, cells: [0], score: 999, ts: 1 });
    host.tick(0);
    host.tick(50);
    // host locked onto B; C's bogus score is ignored
    expect(host.snapshot().oppScore).not.toBe(999);
  });
});
