// matchmaking/Matchmaker.ts — rooms, deep links, quick match w/ bot fallback
// (plan §11). The offline implementation has no queue, so quickMatch resolves
// to a bot immediately; the Firebase matchmaker overrides quickMatch with a real
// MMR queue and ~12s wait before falling back to a bot.
import type { Matchmaker, NetSession, PublicProfile, SeededRng } from '../contracts';
import type { NetBackend } from '../net';
import { BackendNetSession } from '../net';
import { makeRoomCode } from './roomCode';
import { buildRoomLink } from './deepLink';

export interface MatchmakerDeps {
  backend: NetBackend;
  rng: SeededRng;
  self: PublicProfile;
  origin: string;
  inviterUid?: string;
}

export class BackendMatchmaker implements Matchmaker {
  constructor(private readonly deps: MatchmakerDeps) {}

  async createRoom(_modeSet: string[]): Promise<{ roomId: string; link: string }> {
    const roomId = makeRoomCode(this.deps.rng);
    const link = buildRoomLink(this.deps.origin, roomId, this.deps.inviterUid);
    return { roomId, link };
  }

  async joinRoom(roomId: string): Promise<NetSession> {
    const session = new BackendNetSession(this.deps.backend);
    await session.join(roomId, this.deps.self);
    return session;
  }

  async quickMatch(): Promise<{ session: NetSession; opponent: 'human' | 'bot' }> {
    const roomId = 'solo-' + makeRoomCode(this.deps.rng);
    const session = await this.joinRoom(roomId);
    return { session, opponent: 'bot' };
  }

  cancel(): void {
    /* offline matchmaker resolves synchronously — nothing to cancel */
  }
}
