// app/versusStore.ts — UI state specific to the vs-opponent mode (opponent score,
// round wins, final result). Shared timer/score/combo stay in the main store.
import { create } from 'zustand';
import { START_MMR } from '../ranking/elo';

export interface RoundResult {
  my: number;
  opp: number;
  winner: 'me' | 'opp' | 'draw';
  round: number; // 0-based round that just finished
  bonus: number; // winner bonus awarded this round
  myTotal: number; // cumulative total AFTER this round (incl. bonus)
  oppTotal: number;
  // every finished round so far (oldest→newest), for the pip strip
  history: { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[];
}

export interface VersusState {
  oppName: string;
  oppAvatar: string;
  oppTier: string;
  oppTotal: number;
  oppRoundScore: number;
  oppOwned: string[];
  roundWins: { me: number; opp: number };
  // completed rounds so far (oldest→newest), for the HUD pip strip + result strip
  roundHistory: { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[];
  winner: 'me' | 'opp' | 'draw' | null;
  newRecord: boolean;
  mmrDelta: number | null;
  mmr: number; // my AI-ladder MMR AFTER the result (for the result rank band)
  ranked: boolean;
  // mid-round review + augment-pick countdown (shared by both timed overlays)
  overlayRemainingMs: number;
  roundResult: RoundResult | null;
  // opponent "+N" score-popup pulses (seq bumps each time the bot scores)
  oppGainSeq: number;
  oppGainAmount: number;
  // emote bubbles (Clash-Royale-style): seq bumps each time a side emotes
  myEmoteSeq: number;
  myEmoteId: string | null;
  oppEmoteSeq: number;
  oppEmoteId: string | null;
  setOpponent(name: string, avatar: string, tier: string, ranked: boolean): void;
  setLive(
    oppTotal: number,
    oppRoundScore: number,
    roundWins: { me: number; opp: number },
    oppOwned: string[],
    roundHistory: { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[],
  ): void;
  setRoundCheck(result: RoundResult, remainingMs: number): void;
  setOverlayRemaining(ms: number): void;
  bumpOppGain(delta: number): void;
  sendMyEmote(id: string): void;
  sendOppEmote(id: string): void;
  setResult(
    winner: 'me' | 'opp' | 'draw',
    mmrDelta: number | null,
    mmr: number,
    newRecord: boolean,
  ): void;
  reset(): void;
}

const INIT = {
  oppName: 'AI 봇',
  oppAvatar: '🤖',
  oppTier: 'Silver',
  oppTotal: 0,
  oppRoundScore: 0,
  oppOwned: [] as string[],
  roundWins: { me: 0, opp: 0 },
  roundHistory: [] as { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[],
  winner: null as 'me' | 'opp' | 'draw' | null,
  newRecord: false,
  mmrDelta: null as number | null,
  mmr: START_MMR,
  ranked: false,
  overlayRemainingMs: 0,
  roundResult: null as RoundResult | null,
  oppGainSeq: 0,
  oppGainAmount: 0,
  myEmoteSeq: 0,
  myEmoteId: null as string | null,
  oppEmoteSeq: 0,
  oppEmoteId: null as string | null,
};

export const useVersusStore = create<VersusState>((set) => ({
  ...INIT,
  setOpponent: (oppName, oppAvatar, oppTier, ranked) =>
    set({ ...INIT, oppName, oppAvatar, oppTier, ranked }),
  setLive: (oppTotal, oppRoundScore, roundWins, oppOwned, roundHistory) =>
    set({ oppTotal, oppRoundScore, roundWins, oppOwned, roundHistory }),
  setRoundCheck: (result, remainingMs) =>
    set({ roundResult: result, overlayRemainingMs: remainingMs }),
  setOverlayRemaining: (overlayRemainingMs) => set({ overlayRemainingMs }),
  bumpOppGain: (delta) =>
    set((s) => ({ oppGainSeq: s.oppGainSeq + 1, oppGainAmount: delta })),
  sendMyEmote: (id) => set((s) => ({ myEmoteSeq: s.myEmoteSeq + 1, myEmoteId: id })),
  sendOppEmote: (id) => set((s) => ({ oppEmoteSeq: s.oppEmoteSeq + 1, oppEmoteId: id })),
  setResult: (winner, mmrDelta, mmr, newRecord) => set({ winner, mmrDelta, mmr, newRecord }),
  reset: () => set({ ...INIT }),
}));
