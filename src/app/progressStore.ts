// app/progressStore.ts — level-campaign progress + emote collection, persisted to
// localStorage (mirrors the bestTotal/settings pattern). Sequential unlock: level
// 1 is always playable; clearing level N raises the unlock ceiling to N+1 and
// grants the emote reward for N (first clear only).
import { create } from 'zustand';
import { MAX_LEVEL } from '../bot/levels';
import { STARTER_EMOTE_IDS, emoteForLevel } from '../emotes';

const KEY = 'aag.progress.v1';

interface Persisted {
  highestCleared: number; // highest level beaten (0 = none yet)
  unlockedEmotes: string[];
}

function fresh(): Persisted {
  return { highestCleared: 0, unlockedEmotes: [...STARTER_EMOTE_IDS] };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      highestCleared: typeof p.highestCleared === 'number' ? p.highestCleared : 0,
      unlockedEmotes:
        Array.isArray(p.unlockedEmotes) && p.unlockedEmotes.length > 0
          ? p.unlockedEmotes
          : [...STARTER_EMOTE_IDS],
    };
  } catch {
    return fresh();
  }
}

function save(p: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode / disabled storage — ignore */
  }
}

export interface ProgressStore {
  highestCleared: number;
  unlockedEmotes: string[];
  selectedLevel: number; // level chosen to play next (session only)
  /** Set when a fresh emote is unlocked, so the result screen can reveal it. */
  lastReward: { level: number; emoteId: string } | null;
  highestUnlocked(): number; // highest *playable* level
  isCleared(level: number): boolean;
  isUnlocked(level: number): boolean;
  selectLevel(level: number): void;
  /** Record a win on `level`; unlocks the next level + its emote (first time). */
  recordClear(level: number): void;
  clearReward(): void;
  reset(): void;
}

export const useProgressStore = create<ProgressStore>((set, get) => {
  const init = load();
  const unlocked = (highestCleared: number): number => Math.min(MAX_LEVEL, highestCleared + 1);
  return {
    highestCleared: init.highestCleared,
    unlockedEmotes: init.unlockedEmotes,
    selectedLevel: unlocked(init.highestCleared),
    lastReward: null,
    highestUnlocked: () => unlocked(get().highestCleared),
    isCleared: (level) => level <= get().highestCleared,
    isUnlocked: (level) => level <= unlocked(get().highestCleared),
    selectLevel: (selectedLevel) =>
      set({ selectedLevel: Math.min(MAX_LEVEL, Math.max(1, selectedLevel)) }),
    recordClear: (level) => {
      const s = get();
      const reward = emoteForLevel(level);
      const isNewEmote = !s.unlockedEmotes.includes(reward.id);
      const highestCleared = Math.max(s.highestCleared, level);
      const unlockedEmotes = isNewEmote ? [...s.unlockedEmotes, reward.id] : s.unlockedEmotes;
      set({
        highestCleared,
        unlockedEmotes,
        lastReward: isNewEmote ? { level, emoteId: reward.id } : null,
      });
      save({ highestCleared, unlockedEmotes });
    },
    clearReward: () => set({ lastReward: null }),
    reset: () => {
      const f = fresh();
      set({ ...f, selectedLevel: 1, lastReward: null });
      save(f);
    },
  };
});

/** Plain snapshot for non-React consumers (controllers). */
export function getProgress(): ProgressStore {
  return useProgressStore.getState();
}
