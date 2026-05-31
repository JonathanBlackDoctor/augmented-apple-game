// matchmaking/lobby.ts — public "quick match" lobby (code-less matchmaking).
// A waiting host advertises its room code under the shared `queue` node; a joiner
// reads the queue, picks the oldest open room, and joins it as a guest. Backed by
// Firebase RTDB online (with an onDisconnect cleanup so a closed tab never leaves
// a dead room advertised); a no-op offline, where the in-memory backend is a
// single page and quick match simply hosts and falls back to a bot.
import type { Database } from 'firebase/database';

export interface PublicLobby {
  /** Find an open room advertised by another player (returns its code), or null. */
  findOpenRoom(selfUid: string): Promise<string | null>;
  /** Advertise my room as open and waiting for an opponent. */
  advertise(selfUid: string, code: string): Promise<void>;
  /** Remove my advertisement (matched, cancelled, or left). */
  withdraw(selfUid: string): Promise<void>;
}

/** Offline stand-in: never finds an opponent, so quick match hosts + bot-falls-back. */
export const NO_LOBBY: PublicLobby = {
  async findOpenRoom() {
    return null;
  },
  async advertise() {},
  async withdraw() {},
};

interface Entry {
  code: string;
  ts: number;
}

export class FirebaseLobby implements PublicLobby {
  constructor(private readonly db: Database) {}

  async findOpenRoom(selfUid: string): Promise<string | null> {
    const { ref, get } = await import('firebase/database');
    const snap = await get(ref(this.db, 'queue'));
    const val = (snap.val() as Record<string, Entry> | null) ?? {};
    const open = Object.entries(val)
      .filter(([uid, e]) => uid !== selfUid && e && typeof e.code === 'string')
      .sort((a, b) => (a[1].ts ?? 0) - (b[1].ts ?? 0)); // oldest waiting first
    return open.length ? open[0][1].code : null;
  }

  async advertise(selfUid: string, code: string): Promise<void> {
    const { ref, set, onDisconnect, serverTimestamp } = await import('firebase/database');
    const r = ref(this.db, `queue/${selfUid}`);
    await set(r, { code, ts: serverTimestamp() });
    // Auto-clean the advertisement if the tab closes before withdraw() runs, so a
    // dead room is never handed out to a joiner.
    void onDisconnect(r).remove();
  }

  async withdraw(selfUid: string): Promise<void> {
    const { ref, remove, onDisconnect } = await import('firebase/database');
    const r = ref(this.db, `queue/${selfUid}`);
    await onDisconnect(r).cancel();
    await remove(r);
  }
}
