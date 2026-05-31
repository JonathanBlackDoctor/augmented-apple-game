// app/onlineStore.ts — UI state for the online 1v1 flow (lobby + live match).
import { create } from 'zustand';
import type { AugTier } from '../contracts';
import type { OnlinePhase } from './OnlineMatch';
import { START_MMR } from '../ranking/elo';

export type OnlineStage = 'menu' | 'hosting' | 'connecting' | 'playing' | 'result';

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
  offers: string[];
  offerTier: AugTier | null;
  rerollsLeft: number;
  winner: 'me' | 'opp' | 'draw' | null;
  mmrDelta: number | null;
  mmr: number; // my MMR AFTER the ranked result (for the result rank band)
  newRecord: boolean;
  oppName: string;
  oppPresent: boolean;
  oppConnected: boolean;
  oppLeft: boolean;
  noOpponent: boolean;
  myName: string;
  set: (p: Partial<OnlineStore>) => void;
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
  offers: [] as string[],
  offerTier: null as AugTier | null,
  rerollsLeft: 1,
  winner: null as 'me' | 'opp' | 'draw' | null,
  mmrDelta: null as number | null,
  mmr: START_MMR,
  newRecord: false,
  oppName: '상대',
  oppPresent: false,
  oppConnected: false,
  oppLeft: false,
  noOpponent: false,
  myName: '나',
};

export const useOnlineStore = create<OnlineStore>((set) => ({
  ...INIT,
  set: (p) => set(p),
  reset: () => set({ ...INIT }),
}));
