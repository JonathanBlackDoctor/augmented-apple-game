// app/versusStore.ts — UI state specific to the vs-opponent mode (opponent score,
// round wins, final result). Shared timer/score/combo stay in the main store.
import { create } from 'zustand';

export interface RoundResult {
  my: number;
  opp: number;
  winner: 'me' | 'opp' | 'draw';
  round: number; // 0-based round that just finished
}

export interface VersusState {
  oppName: string;
  oppAvatar: string;
  oppTier: string;
  oppTotal: number;
  oppRoundScore: number;
  oppOwned: string[];
  roundWins: { me: number; opp: number };
  winner: 'me' | 'opp' | 'draw' | null;
  mmrDelta: number | null;
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
  ): void;
  setRoundCheck(
    my: number,
    opp: number,
    winner: 'me' | 'opp' | 'draw',
    round: number,
    remainingMs: number,
  ): void;
  setOverlayRemaining(ms: number): void;
  bumpOppGain(delta: number): void;
  sendMyEmote(id: string): void;
  sendOppEmote(id: string): void;
  setResult(winner: 'me' | 'opp' | 'draw', mmrDelta: number | null): void;
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
  winner: null as 'me' | 'opp' | 'draw' | null,
  mmrDelta: null as number | null,
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
  setLive: (oppTotal, oppRoundScore, roundWins, oppOwned) =>
    set({ oppTotal, oppRoundScore, roundWins, oppOwned }),
  setRoundCheck: (my, opp, winner, round, remainingMs) =>
    set({ roundResult: { my, opp, winner, round }, overlayRemainingMs: remainingMs }),
  setOverlayRemaining: (overlayRemainingMs) => set({ overlayRemainingMs }),
  bumpOppGain: (delta) =>
    set((s) => ({ oppGainSeq: s.oppGainSeq + 1, oppGainAmount: delta })),
  sendMyEmote: (id) => set((s) => ({ myEmoteSeq: s.myEmoteSeq + 1, myEmoteId: id })),
  sendOppEmote: (id) => set((s) => ({ oppEmoteSeq: s.oppEmoteSeq + 1, oppEmoteId: id })),
  setResult: (winner, mmrDelta) => set({ winner, mmrDelta }),
  reset: () => set({ ...INIT }),
}));
