// net/backend.ts — transport abstraction (plan §10). A room is an append-only
// event channel plus an atomic cell-claim (shared board). Implemented by an
// in-memory stand-in (offline/tests) and by Firebase RTDB (online).
import type { NetEvent, ClaimResolution, PlayerId } from '../contracts';

export interface RoomChannel {
  /** Append an event to the room log (fans out to all subscribers). */
  send(e: NetEvent): Promise<void>;
  /** Subscribe to events. Replays existing history first (like RTDB
   *  onChildAdded), then streams new events. Returns an unsubscribe fn. */
  subscribe(cb: (e: NetEvent) => void): () => void;
  /** Atomically claim cells for `uid` (shared-board mode). All-or-nothing. */
  claim(uid: PlayerId, cells: number[], seq: number): Promise<ClaimResolution>;
  /** Wipe all persisted room state (event log + shared claims). The host calls
   *  this when (re)creating a room so a new match never replays a previous
   *  match's events — critical for the small 3-digit code space where rooms are
   *  reused frequently. */
  reset(): Promise<void>;
  close(): void;
}

export interface NetBackend {
  open(roomId: string): RoomChannel;
}
