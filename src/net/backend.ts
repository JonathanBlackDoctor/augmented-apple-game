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
  close(): void;
}

/** Pre-join probe result: 'empty' = no such room, 'waiting' = host still in
 *  lobby, 'started' = match already started/finished (too late to join). */
export type RoomStatus = 'empty' | 'waiting' | 'started';

export interface NetBackend {
  open(roomId: string): RoomChannel;
  /** Probe a room without joining (and without creating it). Lets the UI show
   *  an "invite expired" notice instead of entering a dead room. */
  roomStatus?(roomId: string): Promise<RoomStatus>;
}
