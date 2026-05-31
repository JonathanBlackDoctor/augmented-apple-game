// app/store.ts — UI state (zustand). The conductor writes; React screens read.
import { create } from 'zustand';
import type { AugTier } from '../contracts';

export type Phase = 'home' | 'round' | 'roundCheck' | 'augment' | 'result';
export type Mode = 'solo' | 'augment' | 'versus' | 'online' | 'leaderboard' | 'levels';

const BEST_KEY = 'aag.bestTotal.v1';
function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(n: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* private mode / disabled storage — ignore */
  }
}

export interface GameStore {
  phase: Phase;
  mode: Mode;
  roundIndex: number;
  totalRounds: number;
  durationMs: number;
  remainingMs: number;
  roundScore: number;
  totalScore: number;
  combo: number;
  lastClearCount: number;
  bestTotal: number;
  offers: string[];
  offerTier: AugTier | null;
  rerollsLeft: number;
  owned: string[];

  startSolo(): void;
  startAugment(): void;
  startMatch(totalRounds: number, durationMs: number): void;
  startVersus(totalRounds: number, durationMs: number): void;
  startLevels(): void;
  startOnline(): void;
  startLeaderboard(): void;
  setPhase(p: Phase): void;
  setRound(i: number): void;
  setRemaining(ms: number): void;
  setRoundScore(s: number): void;
  setTotalScore(s: number): void;
  setCombo(c: number, lastClearCount?: number): void;
  commitRound(score: number): void;
  setOffers(ids: string[], tier: AugTier): void;
  setRerollsLeft(n: number): void;
  addOwned(id: string): void;
  finishMatch(): void;
  goHome(): void;
}

function resetRound(totalRounds: number, durationMs: number) {
  return {
    roundIndex: 0,
    totalRounds,
    durationMs,
    remainingMs: durationMs,
    roundScore: 0,
    totalScore: 0,
    combo: 0,
    lastClearCount: 0,
    offers: [] as string[],
    offerTier: null as AugTier | null,
    rerollsLeft: 0,
    owned: [] as string[],
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'home',
  mode: 'solo',
  roundIndex: 0,
  totalRounds: 1,
  durationMs: 30_000,
  remainingMs: 30_000,
  roundScore: 0,
  totalScore: 0,
  combo: 0,
  lastClearCount: 0,
  bestTotal: loadBest(),
  offers: [],
  offerTier: null,
  rerollsLeft: 0,
  owned: [],

  startSolo: () => set({ mode: 'solo', phase: 'round' }),
  startAugment: () => set({ mode: 'augment', phase: 'round' }),
  startMatch: (totalRounds, durationMs) =>
    set({ phase: 'round', ...resetRound(totalRounds, durationMs) }),
  startVersus: (totalRounds, durationMs) =>
    set({ mode: 'versus', phase: 'round', ...resetRound(totalRounds, durationMs) }),
  startLevels: () => set({ mode: 'levels', phase: 'home' }),
  startOnline: () => set({ mode: 'online' }),
  startLeaderboard: () => set({ mode: 'leaderboard' }),
  setPhase: (phase) => set({ phase }),
  setRound: (roundIndex) => set({ roundIndex }),
  setRemaining: (remainingMs) => set({ remainingMs }),
  setRoundScore: (roundScore) => set({ roundScore }),
  setTotalScore: (totalScore) => set({ totalScore }),
  setCombo: (combo, lastClearCount) =>
    set((s) => ({ combo, lastClearCount: lastClearCount ?? s.lastClearCount })),
  commitRound: (score) => set((s) => ({ totalScore: s.totalScore + score, roundScore: 0 })),
  setOffers: (offers, offerTier) => set({ offers, offerTier }),
  setRerollsLeft: (rerollsLeft) => set({ rerollsLeft }),
  addOwned: (id) => set((s) => ({ owned: [...s.owned, id] })),
  finishMatch: () => {
    const total = get().totalScore;
    const best = Math.max(get().bestTotal, total);
    if (best !== get().bestTotal) saveBest(best);
    set({ bestTotal: best });
  },
  goHome: () => set({ phase: 'home' }),
}));
