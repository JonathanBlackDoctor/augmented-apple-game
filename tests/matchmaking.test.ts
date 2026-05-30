import { describe, it, expect } from 'vitest';
import { makeRoomCode, isValidRoomCode, ROOM_CODE_LEN } from '../src/matchmaking/roomCode';
import { parseDeepLink, buildRoomLink } from '../src/matchmaking/deepLink';
import { BackendMatchmaker } from '../src/matchmaking';
import { InMemoryNetBackend } from '../src/net';
import { makeRng } from '../src/core';
import type { PublicProfile } from '../src/contracts';

describe('room codes', () => {
  it('generates valid 3-digit numeric codes', () => {
    const rng = makeRng('seed');
    for (let i = 0; i < 50; i++) {
      const code = makeRoomCode(rng);
      expect(code.length).toBe(ROOM_CODE_LEN);
      expect(/^[0-9]{3}$/.test(code)).toBe(true);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });
  it('rejects malformed codes', () => {
    expect(isValidRoomCode('12')).toBe(false); // too short
    expect(isValidRoomCode('12a')).toBe(false); // non-digit
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
