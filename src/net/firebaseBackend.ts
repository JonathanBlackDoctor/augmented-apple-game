// net/firebaseBackend.ts — NetBackend over Firebase RTDB (plan §10). Drop-in
// replacement for the in-memory backend: events via push/onChildAdded, shared
// cell claims via an atomic transaction.
import { ref, push, onChildAdded, runTransaction, remove } from 'firebase/database';
import type { Database } from 'firebase/database';
import type { NetEvent, ClaimResolution, PlayerId } from '../contracts';
import type { NetBackend, RoomChannel } from './backend';
import { getDb } from './firebaseApp';

export class FirebaseNetBackend implements NetBackend {
  private readonly db: Database;
  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  open(roomId: string): RoomChannel {
    const matchRef = ref(this.db, `rooms/${roomId}/match`);
    const eventsRef = ref(this.db, `rooms/${roomId}/match/events`);
    const ownedRef = ref(this.db, `rooms/${roomId}/match/shared/owned`);
    const unsubs: Array<() => void> = [];
    return {
      send: async (e: NetEvent) => {
        await push(eventsRef, e);
      },
      subscribe: (cb) => {
        // onChildAdded replays existing children then streams new ones.
        const unsub = onChildAdded(eventsRef, (snap) => {
          const v = snap.val() as NetEvent | null;
          if (v) cb(v);
        });
        unsubs.push(unsub);
        return unsub;
      },
      claim: async (uid: PlayerId, cells: number[], _seq: number): Promise<ClaimResolution> => {
        let ok = true;
        await runTransaction(ownedRef, (current: Record<string, string> | null) => {
          const owned = current ?? {};
          for (const c of cells) {
            const o = owned[String(c)];
            if (o && o !== uid) {
              ok = false;
              return; // undefined => abort the transaction (no write)
            }
          }
          for (const c of cells) owned[String(c)] = uid;
          return owned;
        });
        return ok ? { ok: true, cells } : { ok: false, reason: 'claimed' };
      },
      reset: async () => {
        // Remove the whole match node so a reused room code starts clean (RTDB
        // persists children forever; onChildAdded would otherwise replay the
        // previous match's ready/phase/clear events into the new match).
        await remove(matchRef);
      },
      close: () => {
        for (const u of unsubs) u();
      },
    };
  }
}
