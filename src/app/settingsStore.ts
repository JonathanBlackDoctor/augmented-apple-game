// app/settingsStore.ts — user preferences (zustand), persisted to localStorage.
// Read by the home/game screens and the controllers; written by the settings UI.
// Mirrors the best-score localStorage pattern in store.ts (key aag.bestTotal.v1).
import { create } from 'zustand';
import { sfx } from './sound';

export interface Settings {
  soundEnabled: boolean;
  /** Grid scale (0–1): shrinks the whole board so apples stay packed but more
   *  background shows around the edges. Smaller = smaller apples + more margin. */
  appleScale: number;
}

/** Fixed round length (ms). Round time is no longer user-configurable — every
 *  round runs this long. Consumed by the game/level controllers. */
export const ROUND_DURATION_MS = 30_000;

/** Fixed board dimensions (the former "보통/medium" apple-count preset). Apple
 *  count is no longer user-configurable — it's pinned to this medium grid. */
export const BOARD_COLS = 17;
export const BOARD_ROWS = 10;

/** Selectable apple sizes (board scale). Smaller shrinks the whole board, keeping
 *  apples packed while leaving more background margin around it. */
export const APPLE_SIZE_PRESETS: { label: string; scale: number }[] = [
  { label: '작게', scale: 0.6 },
  { label: '보통', scale: 0.8 },
  { label: '크게', scale: 1 },
];

const DEFAULTS: Settings = {
  soundEnabled: true,
  appleScale: 0.8,
};

const KEY = 'aag.settings.v1';

function pick(s: Settings): Settings {
  return {
    soundEnabled: s.soundEnabled,
    appleScale: s.appleScale,
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
  setAppleScale(v: number): void;
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
    setAppleScale: (appleScale) => commit({ appleScale }),
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
