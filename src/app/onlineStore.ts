// app/onlineStore.ts — UI state for the online 1v1 flow (lobby + live match).
import { create } from 'zustand';
import type { AugTier } from '../contracts';
import type { OnlinePhase } from './OnlineMatch';
import type { RoundResult } from './versusStore';
import { START_MMR } from '../ranking/elo';

export type OnlineStage = 'menu' | 'hosting' | 'connecting' | 'playing' | 'result';

// Overlay durations, mirroring versus (VersusController AUGMENT_MS / ROUND_CHECK_MS).
// Single source for both the match schedule (OnlineController → OnlineMatch) and the
// overlay countdown bars (OnlineScreen), so the timer and the schedule never drift.
export const ONLINE_AUGMENT_MS = 12_000;
export const ONLINE_PRE_ROUND_MS = 3_000; // 3·2·1 countdown between the pick and the round
export const ONLINE_ROUND_CHECK_MS = 3_500;

export interface OnlineStore {
  stage: OnlineStage;
  roomCode: string;
  link: string;
  isPublic: boolean;
  error: string | null;
  phase: OnlinePhase;
  round: number;
  rounds: number;
  remainingMs: number;
  durationMs: number;
  myScore: number;
  oppScore: number;
  myTotal: number;
  oppTotal: number;
  roundWins: { me: number; opp: number };
  roundHistory: { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[];
  combo: number;
  owned: string[];
  oppOwned: string[];
  offers: string[];
  offerTier: AugTier | null;
  rerollsLeft: number;
  // countdown for the timed augment / roundCheck overlays (schedule-driven)
  overlayRemainingMs: number;
  // the just-finished round, for the mid-round review screen (라운드 점검)
  roundResult: RoundResult | null;
  // opponent "+N" score-popup pulses (seq bumps each time the opponent scores)
  oppGainSeq: number;
  oppGainAmount: number;
  // emote bubbles (Clash-Royale-style): seq bumps each time a side emotes
  myEmoteSeq: number;
  myEmoteId: string | null;
  oppEmoteSeq: number;
  oppEmoteId: string | null;
  winner: 'me' | 'opp' | 'draw' | null;
  mmrDelta: number | null;
  mmr: number; // my MMR AFTER the ranked result (for the result rank band)
  newRecord: boolean;
  oppName: string;
  oppPresent: boolean;
  oppConnected: boolean;
  oppLeft: boolean;
  noOpponent: boolean;
  // true when this session was opened via a 1:1 invite/deep link (?room=…), so a
  // dead room is surfaced as an "expired invite link" rather than a generic miss.
  fromInvite: boolean;
  myName: string;
  set: (p: Partial<OnlineStore>) => void;
  /** Locally fire my own emote bubble (the controller also sends it on the wire). */
  sendMyEmote: (id: string) => void;
  reset: () => void;
}

const INIT = {
  stage: 'menu' as OnlineStage,
  roomCode: '',
  link: '',
  isPublic: false,
  error: null as string | null,
  phase: 'lobby' as OnlinePhase,
  round: 0,
  rounds: 5,
  remainingMs: 30_000,
  durationMs: 30_000,
  myScore: 0,
  oppScore: 0,
  myTotal: 0,
  oppTotal: 0,
  roundWins: { me: 0, opp: 0 },
  roundHistory: [] as { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[],
  combo: 0,
  owned: [] as string[],
  oppOwned: [] as string[],
  offers: [] as string[],
  offerTier: null as AugTier | null,
  rerollsLeft: 1,
  overlayRemainingMs: 0,
  roundResult: null as RoundResult | null,
  oppGainSeq: 0,
  oppGainAmount: 0,
  myEmoteSeq: 0,
  myEmoteId: null as string | null,
  oppEmoteSeq: 0,
  oppEmoteId: null as string | null,
  winner: null as 'me' | 'opp' | 'draw' | null,
  mmrDelta: null as number | null,
  mmr: START_MMR,
  newRecord: false,
  oppName: '상대',
  oppPresent: false,
  oppConnected: false,
  oppLeft: false,
  noOpponent: false,
  fromInvite: false,
  myName: '나',
};

export const useOnlineStore = create<OnlineStore>((set) => ({
  ...INIT,
  set: (p) => set(p),
  sendMyEmote: (id) => set((s) => ({ myEmoteSeq: s.myEmoteSeq + 1, myEmoteId: id })),
  reset: () => set({ ...INIT }),
}));
