// app/settingsStore.ts — user preferences (zustand), persisted to localStorage.
// Read by the home/game screens and the controllers; written by the settings UI.
// Mirrors the best-score localStorage pattern in store.ts (key aag.bestTotal.v1).
import { create } from 'zustand';
import type { Difficulty } from '../bot';
import { sfx } from './sound';

export type AiDifficultyPref = 'auto' | Difficulty; // 'auto' | 'easy' | 'normal' | 'hard'

export interface Settings {
  soundEnabled: boolean;
  aiDifficulty: AiDifficultyPref;
  roundDurationMs: number;
  boardCols: number;
  boardRows: number;
  /** Fraction of each grid cell the apple fills (0–1). Smaller = more spacing. */
  appleScale: number;
  showAiMiniboard: boolean;
}

/** Selectable round lengths (ms) surfaced in the settings UI. */
export const DURATION_OPTIONS = [20_000, 30_000, 45_000, 60_000] as const;

/** Selectable apple counts surfaced in the settings UI (grid dimensions). */
export const BOARD_PRESETS: { label: string; cols: number; rows: number }[] = [
  { label: '적게', cols: 11, rows: 7 },
  { label: '보통', cols: 17, rows: 10 },
  { label: '많이', cols: 21, rows: 12 },
];

/** Selectable apple sizes (cell fill fraction). Smaller leaves more whitespace. */
export const APPLE_SIZE_PRESETS: { label: string; scale: number }[] = [
  { label: '작게', scale: 0.6 },
  { label: '보통', scale: 0.8 },
  { label: '크게', scale: 1 },
];

const DEFAULTS: Settings = {
  soundEnabled: true,
  aiDifficulty: 'auto',
  roundDurationMs: 30_000,
  boardCols: 17,
  boardRows: 10,
  appleScale: 0.8,
  showAiMiniboard: true,
};

const KEY = 'aag.settings.v1';

function pick(s: Settings): Settings {
  return {
    soundEnabled: s.soundEnabled,
    aiDifficulty: s.aiDifficulty,
    roundDurationMs: s.roundDurationMs,
    boardCols: s.boardCols,
    boardRows: s.boardRows,
    appleScale: s.appleScale,
    showAiMiniboard: s.showAiMiniboard,
  };
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pick(s)));
  } catch {
    /* private mode / disabled storage — ignore */
  }
}

export interface SettingsStore extends Settings {
  setSoundEnabled(v: boolean): void;
  setAiDifficulty(v: AiDifficultyPref): void;
  setRoundDurationMs(v: number): void;
  setBoardSize(cols: number, rows: number): void;
  setAppleScale(v: number): void;
  setShowAiMiniboard(v: boolean): void;
  reset(): void;
}

const initial = load();
// Apply the persisted sound preference to the SFX engine on startup.
sfx.setEnabled(initial.soundEnabled);

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const commit = (patch: Partial<Settings>): void => {
    set(patch);
    save(get());
  };
  return {
    ...initial,
    setSoundEnabled: (soundEnabled) => {
      sfx.setEnabled(soundEnabled);
      commit({ soundEnabled });
    },
    setAiDifficulty: (aiDifficulty) => commit({ aiDifficulty }),
    setRoundDurationMs: (roundDurationMs) => commit({ roundDurationMs }),
    setBoardSize: (boardCols, boardRows) => commit({ boardCols, boardRows }),
    setAppleScale: (appleScale) => commit({ appleScale }),
    setShowAiMiniboard: (showAiMiniboard) => commit({ showAiMiniboard }),
    reset: () => {
      sfx.setEnabled(DEFAULTS.soundEnabled);
      commit({ ...DEFAULTS });
    },
  };
});

/** Plain snapshot for non-React consumers (controllers, plan builders). */
export function getSettings(): Settings {
  return pick(useSettingsStore.getState());
}
