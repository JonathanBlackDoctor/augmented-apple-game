// app/versusStore.ts — UI state specific to the vs-opponent mode (opponent score,
// round wins, final result). Shared timer/score/combo stay in the main store.
import { create } from 'zustand';

export interface VersusState {
  oppName: string;
  oppAvatar: string;
  oppTier: string;
  oppTotal: number;
  oppRoundScore: number;
  roundWins: { me: number; opp: number };
  winner: 'me' | 'opp' | 'draw' | null;
  mmrDelta: number | null;
  ranked: boolean;
  setOpponent(name: string, avatar: string, tier: string, ranked: boolean): void;
  setLive(oppTotal: number, oppRoundScore: number, roundWins: { me: number; opp: number }): void;
  setResult(winner: 'me' | 'opp' | 'draw', mmrDelta: number | null): void;
  reset(): void;
}

const INIT = {
  oppName: 'AI 봇',
  oppAvatar: '🤖',
  oppTier: 'Silver',
  oppTotal: 0,
  oppRoundScore: 0,
  roundWins: { me: 0, opp: 0 },
  winner: null as 'me' | 'opp' | 'draw' | null,
  mmrDelta: null as number | null,
  ranked: false,
};

export const useVersusStore = create<VersusState>((set) => ({
  ...INIT,
  setOpponent: (oppName, oppAvatar, oppTier, ranked) =>
    set({ ...INIT, oppName, oppAvatar, oppTier, ranked }),
  setLive: (oppTotal, oppRoundScore, roundWins) => set({ oppTotal, oppRoundScore, roundWins }),
  setResult: (winner, mmrDelta) => set({ winner, mmrDelta }),
  reset: () => set({ ...INIT }),
}));
