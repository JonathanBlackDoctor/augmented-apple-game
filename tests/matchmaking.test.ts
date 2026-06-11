import { describe, it, expect } from 'vitest';
import { makeRoomCode, isValidRoomCode, ROOM_CODE_LEN } from '../src/matchmaking/roomCode';
import { parseDeepLink, buildRoomLink, stripDeepLink } from '../src/matchmaking/deepLink';
import { BackendMatchmaker } from '../src/matchmaking';
import { InMemoryNetBackend } from '../src/net';
import { makeRng } from '../src/core';
import type { PublicProfile } from '../src/contracts';

describe('room codes', () => {
  it('generates valid 6-char codes without ambiguous chars', () => {
    const rng = makeRng('seed');
    for (let i = 0; i < 50; i++) {
      const code = makeRoomCode(rng);
      expect(code.length).toBe(ROOM_CODE_LEN);
      expect(/[IO01]/.test(code)).toBe(false);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });
  it('rejects malformed codes', () => {
    expect(isValidRoomCode('abc')).toBe(false);
    expect(isValidRoomCode('IIIIII')).toBe(false); // 'I' is excluded
  });
});

describe('deep links', () => {
  it('round-trips room + inviter through a full URL', () => {
    const link = buildRoomLink('https://x.github.io/aag/', 'ABC234', 'uid9');
    const dl = parseDeepLink(new URL(link).search);
    expect(dl.room).toBe('ABC234');
    expect(dl.inv).toBe('uid9');
  });
  it('parses bare and prefixed queries', () => {
    expect(parseDeepLink('?room=PQRS78').room).toBe('PQRS78');
    expect(parseDeepLink('room=PQRS78').room).toBe('PQRS78');
    expect(parseDeepLink('').room).toBeUndefined();
  });
  it('strips consumed room/inv params, leaving other params alone', () => {
    const out = stripDeepLink('https://x.github.io/aag/?room=ABC234&inv=u9&keep=1');
    expect(out).toBe('https://x.github.io/aag/?keep=1');
    expect(stripDeepLink('https://x.github.io/aag/')).toBeNull();
  });
});

describe('offline matchmaker', () => {
  const self: PublicProfile = { uid: 'me', nickname: 'me', avatar: '🍎', tier: 'Silver', mmr: 1000 };
  const deps = () => ({
    backend: new InMemoryNetBackend(),
    rng: makeRng('s'),
    self,
    origin: 'https://x.io/',
  });

  it('creates a room with a shareable link', async () => {
    const { roomId, link } = await new BackendMatchmaker(deps()).createRoom(['separate']);
    expect(isValidRoomCode(roomId)).toBe(true);
    expect(link).toContain('room=' + roomId);
  });

  it('quick match falls back to a bot when there is no queue', async () => {
    const { opponent, session } = await new BackendMatchmaker(deps()).quickMatch();
    expect(opponent).toBe('bot');
    expect(session).toBeTruthy();
  });
});
