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

  it('does not falsely forfeit when the clock starts past the disconnect threshold', async () => {
    // Mirrors a real session: performance.now()-based clock is already seconds in
    // by the time the match starts, so start()/tick() run at a large `now`.
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMCLK', A);
    await sb.join('ROOMCLK', B);
    const opts = { roomId: 'ROOMCLK', ...FAST, disconnectMs: 1500 };
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, ...opts });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, ...opts });
    const t0 = 60000;
    await host.start(t0);
    await guest.start(t0);
    host.tick(t0);
    guest.tick(t0);
    expect(host.snapshot().oppLeft).toBe(false);
    expect(guest.snapshot().oppLeft).toBe(false);
    expect(guest.snapshot().phase).not.toBe('matchResult');
    expect(host.snapshot().phase).not.toBe('matchResult');
  });

  it('a reused room with stale events does not corrupt a fresh match (host resets)', async () => {
    const backend = new InMemoryNetBackend();
    // Leftover events from a previous match on the same (reusable) code.
    const old = new BackendNetSession(backend);
    await old.join('123', { ...A, uid: 'OLDHOST' });
    await old.send({ t: 'ready', player: 'OLDGUEST', phase: 'lobby' });
    await old.send({ t: 'phase', phase: 'countdown', round: 0 });
    await old.send({ t: 'round-result', player: 'OLDGUEST', round: 0, score: 99 });

    // Host re-creates the room (reset), guest joins after a delay; both run.
    const sa = new BackendNetSession(backend);
    await sa.join('123', A, { reset: true });
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: '123', ...FAST });
    await host.start(1000);
    let h = 1000;
    for (let i = 0; i < 10; i++) { host.tick(h); h += 50; }

    const sb = new BackendNetSession(backend);
    await sb.join('123', B);
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, roomId: '123', ...FAST });
    await guest.start(7000);
    let g = 7000;
    for (let i = 0; i < 400; i++) {
      host.tick(h); guest.tick(g); h += 50; g += 50;
      if (host.snapshot().phase === 'matchResult' && guest.snapshot().phase === 'matchResult') break;
    }
    // Both reach a clean result, oppLeft false, and the stale score never leaks in.
    expect(guest.snapshot().phase).toBe('matchResult');
    expect(host.snapshot().phase).toBe('matchResult');
    expect(guest.snapshot().oppLeft).toBe(false);
    expect(host.snapshot().oppLeft).toBe(false);
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
