import { describe, it, expect } from 'vitest';
import { InMemoryNetBackend } from '../src/net/memoryBackend';
import { BackendNetSession } from '../src/net/session';
import type { NetEvent, PublicProfile } from '../src/contracts';

const pubA: PublicProfile = { uid: 'A', nickname: 'A', avatar: '🍎', tier: 'Silver', mmr: 1000 };
const pubB: PublicProfile = { uid: 'B', nickname: 'B', avatar: '🍏', tier: 'Silver', mmr: 1000 };

describe('in-memory net — 2-client simulation', () => {
  it('propagates events between two sessions in one room', async () => {
    const backend = new InMemoryNetBackend();
    const a = new BackendNetSession(backend);
    const b = new BackendNetSession(backend);
    await a.join('room1', pubA);
    await b.join('room1', pubB);
    const aSeen: NetEvent[] = [];
    const bSeen: NetEvent[] = [];
    a.on((e) => aSeen.push(e));
    b.on((e) => bSeen.push(e));
    await a.send({ t: 'clear', player: 'A', seq: 1, cells: [0, 1], score: 2, ts: 1 });
    await b.send({ t: 'round-result', player: 'B', round: 0, score: 5 });
    expect(bSeen.some((e) => e.t === 'clear' && e.player === 'A')).toBe(true);
    expect(aSeen.some((e) => e.t === 'round-result' && e.player === 'B')).toBe(true);
  });

  it('late subscriber replays history (presence)', async () => {
    const backend = new InMemoryNetBackend();
    const a = new BackendNetSession(backend);
    await a.join('r2', pubA); // 'ready' sent before anyone is listening
    const b = new BackendNetSession(backend);
    await b.join('r2', pubB);
    const seen: NetEvent[] = [];
    b.on((e) => seen.push(e));
    expect(seen.some((e) => e.t === 'ready' && e.player === 'A')).toBe(true);
  });

  it('reports room status for invite-expiry checks without creating the room', async () => {
    const backend = new InMemoryNetBackend();
    expect(await backend.roomStatus('ghost')).toBe('empty');
    expect(await backend.roomStatus('ghost')).toBe('empty'); // probe must not create it
    const a = new BackendNetSession(backend);
    await a.join('r4', pubA); // host 'ready' lands in the log
    expect(await backend.roomStatus('r4')).toBe('waiting');
    await a.send({ t: 'phase', phase: 'countdown', round: 0, startAtServerTs: 0 });
    expect(await backend.roomStatus('r4')).toBe('started');
  });

  it('shared-board claim is atomic: first wins, overlap loses, disjoint ok', async () => {
    const backend = new InMemoryNetBackend();
    const a = new BackendNetSession(backend);
    const b = new BackendNetSession(backend);
    await a.join('r3', pubA);
    await b.join('r3', pubB);
    const r1 = await a.claim([10, 11], 1);
    const r2 = await b.claim([11, 12], 1); // overlaps cell 11 -> rejected
    const r3 = await b.claim([12, 13], 2); // disjoint -> ok
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
    expect(r3.ok).toBe(true);
  });
});
