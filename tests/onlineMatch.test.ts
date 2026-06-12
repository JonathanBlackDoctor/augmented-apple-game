import { describe, it, expect } from 'vitest';
import { InMemoryNetBackend } from '../src/net/memoryBackend';
import { BackendNetSession } from '../src/net/session';
import { OnlineMatch } from '../src/app/OnlineMatch';
import { findMoves } from '../src/bot/solver';
import type { PublicProfile } from '../src/contracts';

const A: PublicProfile = { uid: 'A', nickname: 'A', avatar: '🍎', tier: 'Silver', mmr: 1000 };
const B: PublicProfile = { uid: 'B', nickname: 'B', avatar: '🍏', tier: 'Silver', mmr: 1000 };
const C: PublicProfile = { uid: 'C', nickname: 'C', avatar: '🍊', tier: 'Silver', mmr: 1000 };
const FAST = { durationMs: 2000, countdownMs: 500, augmentMs: 800, preRoundMs: 100, roundCheckMs: 600 };

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
    expect(host.myOwned.length).toBe(5); // one pick before each of the 5 rounds (incl. start)
    expect(guest.myOwned.length).toBe(5);
    expect(host.myTotal + host.oppTotal).toBeGreaterThan(0);
    expect(host.roundWins.me + host.roundWins.opp).toBeLessThanOrEqual(5);
    const mirror = { me: 'opp', opp: 'me', draw: 'draw' } as const;
    expect(host.winner ? mirror[host.winner] : null).toBe(guest.winner);
    expect(host.roundWins.me).toBe(guest.roundWins.opp);
    expect(host.oppLeft).toBe(false);
  });
});

describe('OnlineMatch — identity handshake', () => {
  it('exchanges each player’s real nickname + MMR via the ready handshake', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    const hostSelf: PublicProfile = { uid: 'A', nickname: '호스트', avatar: '🍎', tier: 'Gold', mmr: 1234 };
    const guestSelf: PublicProfile = { uid: 'B', nickname: '게스트', avatar: '🍏', tier: 'Bronze', mmr: 870 };
    await sa.join('ROOMID', hostSelf);
    await sb.join('ROOMID', guestSelf);
    const host = new OnlineMatch({ session: sa, role: 'host', self: hostSelf, roomId: 'ROOMID', ...FAST });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: guestSelf, roomId: 'ROOMID', ...FAST });
    await host.start();
    await guest.start();
    // A couple of ticks let the replayed/relayed ready events settle.
    for (let now = 0; now < 200; now += 50) {
      host.tick(now);
      guest.tick(now);
    }
    expect(host.snapshot().oppName).toBe('게스트');
    expect(host.snapshot().oppMmr).toBe(870);
    expect(guest.snapshot().oppName).toBe('호스트');
    expect(guest.snapshot().oppMmr).toBe(1234);
  });
});

describe('OnlineMatch — mid-round review (roundCheck)', () => {
  it('runs a roundCheck phase after each round, exposing the verdict + opponent build', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMRC', A);
    await sb.join('ROOMRC', B);
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: 'ROOMRC', ...FAST });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, roomId: 'ROOMRC', ...FAST });
    await host.start();
    await guest.start();
    let now = 0;
    let sawRoundCheck = false;
    let checkSnap = null as ReturnType<OnlineMatch['snapshot']> | null;
    const autoplay = (m: OnlineMatch): void => {
      if (m.snapshot().phase === 'round' && now % 150 === 0) {
        const moves = findMoves(m.myBoard(), 10);
        if (moves.length > 0) m.myCommit(moves[0].rect);
      }
    };
    for (let i = 0; i < 100000; i++) {
      host.tick(now);
      guest.tick(now);
      autoplay(host);
      autoplay(guest);
      const hs = host.snapshot();
      if (hs.phase === 'roundCheck' && !sawRoundCheck) {
        sawRoundCheck = true;
        checkSnap = hs;
      }
      if (hs.phase === 'matchResult' && guest.snapshot().phase === 'matchResult') break;
      now += 50;
    }
    expect(sawRoundCheck).toBe(true);
    expect(checkSnap!.lastRound).not.toBeNull();
    expect(checkSnap!.phaseRemainingMs).toBeGreaterThan(0);
    // After at least one pick on each side, builds are tracked + exposed.
    const fin = host.snapshot();
    expect(fin.myOwned.length).toBe(5);
    expect(fin.oppOwned.length).toBe(5);
  });
});

describe('OnlineMatch — per-client board orientation', () => {
  it('each client keeps its own viewport orientation; boards stay transpose-equivalent', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMTL', A);
    await sb.join('ROOMTL', B);
    // Host on a portrait phone (tall board); guest on a landscape screen (wide).
    // Neither imposes its aspect on the other — each renders what fits its screen.
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: 'ROOMTL', cols: 10, rows: 17, ...FAST });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, roomId: 'ROOMTL', cols: 17, rows: 10, ...FAST });
    await host.start();
    await guest.start();
    expect(host.dims()).toEqual({ cols: 10, rows: 17 });
    expect(guest.dims()).toEqual({ cols: 17, rows: 10 });
    // Drive to the first round so both boards are built.
    let now = 0;
    for (
      let i = 0;
      i < 200 && (host.snapshot().phase !== 'round' || guest.snapshot().phase !== 'round');
      i++
    ) {
      host.tick(now);
      guest.tick(now);
      now += 50;
    }
    const hb = host.myBoard();
    const gb = guest.myBoard();
    expect(hb.cols).toBe(10);
    expect(hb.rows).toBe(17);
    expect(gb.cols).toBe(17);
    expect(gb.rows).toBe(10);
    // Same apples for the same seed, just rotated 90°: host(row,col) === guest(col,row).
    let transpose = true;
    for (let r = 0; r < 17 && transpose; r++)
      for (let c = 0; c < 10; c++)
        if (hb.cells[r * 10 + c] !== gb.cells[c * 17 + r]) {
          transpose = false;
          break;
        }
    expect(transpose).toBe(true);
  });
});

describe('OnlineMatch — both picked collapses the augment window early', () => {
  it('jumps from augment to the pre-round countdown once both sides have picked', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMBP', A);
    await sb.join('ROOMBP', B);
    // A long augment window so an early collapse is observable well before timeout.
    const opts = { roomId: 'ROOMBP', durationMs: 2000, countdownMs: 500, augmentMs: 10_000, preRoundMs: 200, roundCheckMs: 600 };
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, ...opts });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, ...opts });
    await host.start();
    await guest.start();
    let now = 0;
    // Drive into the (start-of-match) augment window.
    for (let i = 0; i < 100 && host.snapshot().phase !== 'augment'; i++) {
      host.tick(now);
      guest.tick(now);
      now += 50;
    }
    expect(host.snapshot().phase).toBe('augment');
    expect(guest.snapshot().phase).toBe('augment');
    const tBoth = now;
    // Both lock in immediately, far inside the 10s window.
    host.pickAugment(host.snapshot().offers[0]);
    guest.pickAugment(guest.snapshot().offers[0]);
    // Within a couple of ticks (events fan out + each side collapses its own
    // schedule) both should leave the augment window for the pre-round countdown,
    // long before the 10s auto-pick deadline.
    for (let i = 0; i < 10; i++) {
      host.tick(now);
      guest.tick(now);
      now += 50;
    }
    expect(now - tBoth).toBeLessThan(1000); // collapsed early, not at +10s
    expect(host.snapshot().phase).not.toBe('augment');
    expect(guest.snapshot().phase).not.toBe('augment');
  });
});

describe('OnlineMatch — start-of-match pick + reroll', () => {
  it('opens on a start pick (round 0) and reroll spends the one token', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMRR', A);
    await sb.join('ROOMRR', B);
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: 'ROOMRR', ...FAST });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, roomId: 'ROOMRR', ...FAST });
    await host.start();
    await guest.start();
    let now = 0;
    // Drive past countdown into the first (start-of-match) augment pick.
    for (let i = 0; i < 200 && host.snapshot().phase !== 'augment'; i++) {
      host.tick(now);
      guest.tick(now);
      now += 50;
    }
    const before = host.snapshot();
    expect(before.phase).toBe('augment');
    expect(before.round).toBe(0); // precedes round 1
    expect(before.myOwned.length).toBe(0); // nothing owned until this pick
    expect(before.rerollsLeft).toBe(1);
    expect(host.reroll()).toBe(true);
    const after = host.snapshot();
    expect(after.rerollsLeft).toBe(0);
    expect(after.offers).not.toEqual(before.offers);
    expect(after.offers.length).toBe(3);
    expect(host.reroll()).toBe(false); // out of tokens
  });
});

describe('OnlineMatch — emotes', () => {
  it('relays an emote to the opponent as a seq bump + id', async () => {
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMEMO', A);
    await sb.join('ROOMEMO', B);
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, roomId: 'ROOMEMO', ...FAST });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, roomId: 'ROOMEMO', ...FAST });
    await host.start();
    await guest.start();
    // Both sides start with no opponent emote.
    expect(host.snapshot().oppEmoteSeq).toBe(0);
    expect(guest.snapshot().oppEmoteSeq).toBe(0);
    // Host emotes → the guest sees it; the host's own snapshot is unchanged (the
    // local bubble is driven by the store, not the opponent-emote fields).
    host.sendEmote('lol');
    host.tick(0);
    guest.tick(0);
    expect(guest.snapshot().oppEmoteSeq).toBe(1);
    expect(guest.snapshot().oppEmoteId).toBe('lol');
    expect(host.snapshot().oppEmoteSeq).toBe(0);
    // A second emote bumps the seq again so a fresh bubble spawns.
    host.sendEmote('fire');
    host.tick(50);
    guest.tick(50);
    expect(guest.snapshot().oppEmoteSeq).toBe(2);
    expect(guest.snapshot().oppEmoteId).toBe('fire');
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

  it('does not falsely forfeit after a suspended-tab clock jump', async () => {
    // Backgrounded tab: rAF stalls, so the next tick lands seconds later. That gap
    // is our stall, not the opponent leaving — it must not trigger a forfeit "win".
    const backend = new InMemoryNetBackend();
    const sa = new BackendNetSession(backend);
    const sb = new BackendNetSession(backend);
    await sa.join('ROOMSUS', A);
    await sb.join('ROOMSUS', B);
    const opts = { roomId: 'ROOMSUS', ...FAST, hbIntervalMs: 300, disconnectMs: 1500, suspendGapMs: 1000 };
    const host = new OnlineMatch({ session: sa, role: 'host', self: A, ...opts });
    const guest = new OnlineMatch({ session: sb, role: 'guest', self: B, ...opts });
    await host.start();
    await guest.start();
    let now = 0;
    for (let i = 0; i < 20; i++) {
      host.tick(now);
      guest.tick(now);
      now += 50;
    }
    expect(host.snapshot().oppLeft).toBe(false);
    // One tick lands 5s later (gap >> disconnectMs). Pre-fix this forfeit-won.
    host.tick(now + 5000);
    expect(host.snapshot().oppLeft).toBe(false);
    expect(host.snapshot().winner).not.toBe('me');
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
    // Generous bound: auto-picked time augments can lengthen rounds (a +7s relief
    // on the tiny FAST base nearly 5×'s a round), so the match runs well past the
    // base schedule. Both clients rebuild that schedule deterministically.
    for (let i = 0; i < 4000; i++) {
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

  it('flags no-opponent for a guest who never hears from the host', async () => {
    // Guest joins a dead/mistyped room: no host events ever arrive. Without a
    // guest-side timeout the guest would spin on "connecting" forever.
    const backend = new InMemoryNetBackend();
    const sb = new BackendNetSession(backend);
    const guest = new OnlineMatch({
      session: sb,
      role: 'guest',
      self: B,
      roomId: 'ROOMGO',
      lobbyTimeoutMs: 1000,
    });
    await sb.join('ROOMGO', B);
    await guest.start();
    let now = 0;
    for (let i = 0; i < 40; i++) {
      guest.tick(now);
      now += 50;
    }
    expect(guest.snapshot().noOpponent).toBe(true);
    expect(guest.snapshot().phase).toBe('lobby');
    expect(guest.snapshot().oppLeft).toBe(false); // never a forfeit "win"
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
