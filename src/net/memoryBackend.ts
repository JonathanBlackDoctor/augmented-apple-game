// net/memoryBackend.ts — in-process RTDB stand-in (plan §10). Deterministic,
// synchronous fan-out. Powers offline play (vs bot), local dev without Firebase,
// and 2-client simulation tests.
import type { NetEvent, PlayerId } from '../contracts';
import type { NetBackend, RoomChannel } from './backend';

interface Room {
  subs: Set<(e: NetEvent) => void>;
  log: NetEvent[];
  owned: Map<number, PlayerId>;
}

export class InMemoryNetBackend implements NetBackend {
  private rooms = new Map<string, Room>();

  private room(id: string): Room {
    let r = this.rooms.get(id);
    if (!r) {
      r = { subs: new Set(), log: [], owned: new Map() };
      this.rooms.set(id, r);
    }
    return r;
  }

  open(roomId: string): RoomChannel {
    const room = this.room(roomId);
    return {
      send: async (e) => {
        room.log.push(e);
        for (const cb of [...room.subs]) cb(e);
      },
      subscribe: (cb) => {
        for (const e of [...room.log]) cb(e); // replay history (onChildAdded-like)
        room.subs.add(cb);
        return () => room.subs.delete(cb);
      },
      claim: async (uid, cells, _seq) => {
        for (const c of cells) {
          const owner = room.owned.get(c);
          if (owner !== undefined && owner !== uid) return { ok: false, reason: 'claimed' };
        }
        for (const c of cells) room.owned.set(c, uid);
        return { ok: true, cells };
      },
      reset: async () => {
        room.log.length = 0;
        room.owned.clear();
      },
      close: () => {
        /* per-subscription cleanup happens via the returned unsubscribe fn */
      },
    };
  }
}
