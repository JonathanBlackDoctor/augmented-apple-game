// contracts/net.ts — realtime sync events & session (plan §5.5, §10)
import type { PlayerId, ClaimResolution } from './roundmode';
import type { PublicProfile } from './profile';

export type SabKind = 'blackout' | 'shuffle' | 'steal' | 'freeze' | 'junk';

export interface SabotageEvent {
  from: PlayerId;
  to: PlayerId;
  kind: SabKind;
  subseed: string; // deterministic application (rng.fork(subseed))
  payload?: any;
  ts: number;
}

export type MatchPhase =
  | 'lobby'
  | 'countdown'
  | 'round'
  | 'augment'
  | 'roundResult'
  | 'matchResult';

export type NetEvent =
  | { t: 'clear'; player: PlayerId; seq: number; cells: number[]; score: number; ts: number }
  | { t: 'claim'; player: PlayerId; seq: number; cells: number[]; ts: number }
  | { t: 'sabotage'; ev: SabotageEvent }
  | { t: 'augment-pick'; player: PlayerId; round: number; augId: string }
  | { t: 'round-result'; player: PlayerId; round: number; score: number }
  | { t: 'phase'; phase: MatchPhase; round: number; startAtServerTs?: number }
  | { t: 'ready'; player: PlayerId; phase: MatchPhase }
  | { t: 'heartbeat'; player: PlayerId; ts: number };

export interface NetSession {
  /** `opts.reset` wipes the room's persisted state before joining — used by the
   *  host when (re)creating a room so a reused code never inherits a previous
   *  match's events. */
  join(roomId: string, profile: PublicProfile, opts?: { reset?: boolean }): Promise<void>;
  on(cb: (e: NetEvent) => void): () => void;
  send(e: NetEvent): Promise<void>;
  /** Shared-board mode: atomic cell claim via transaction. */
  claim?(cells: number[], seq: number): Promise<ClaimResolution>;
  close(): void;
}
