// matchmaking/presence.ts — liveness marker for a private 1:1 invite room. A host
// "holds" its room while it waits on the hosting screen; the hold is auto-cleared
// when the tab closes (onDisconnect) or when the host leaves within the app. A
// guest arriving via an invite link (?room=CODE) checks the hold before joining:
// no hold means the host is gone and the link is dead, so we surface the expired
// screen instead of joining — joining a dead room would replay its stale countdown
// event and auto-start a one-sided match the player can never finish.
import type { Database } from 'firebase/database';

export interface RoomPresence {
  /** Mark this room as held by a live host; auto-cleared if the tab closes. */
  hold(code: string): Promise<void>;
  /** Release the hold (host left the room within the app, e.g. went home). */
  release(code: string): Promise<void>;
  /** Whether a live host currently holds the room (false → expired/dead link). */
  isHeld(code: string): Promise<boolean>;
}

/** Offline stand-in: the in-memory backend is a single page, so an invite link is
 *  only ever followed in the same tab that created it — treat rooms as live. */
export const NO_PRESENCE: RoomPresence = {
  async hold() {},
  async release() {},
  async isHeld() {
    return true;
  },
};

export class FirebaseRoomPresence implements RoomPresence {
  constructor(private readonly db: Database) {}

  async hold(code: string): Promise<void> {
    const { ref, set, onDisconnect, serverTimestamp } = await import('firebase/database');
    const r = ref(this.db, `rooms/${code}/host`);
    await set(r, { ts: serverTimestamp() });
    // Auto-clear the hold if the host's tab closes before release() runs, so a dead
    // room stops being handed out to anyone who later follows the invite link.
    void onDisconnect(r).remove();
  }

  async release(code: string): Promise<void> {
    const { ref, remove, onDisconnect } = await import('firebase/database');
    const r = ref(this.db, `rooms/${code}/host`);
    await onDisconnect(r).cancel();
    await remove(r);
  }

  async isHeld(code: string): Promise<boolean> {
    const { ref, get } = await import('firebase/database');
    const snap = await get(ref(this.db, `rooms/${code}/host`));
    return snap.exists();
  }
}
