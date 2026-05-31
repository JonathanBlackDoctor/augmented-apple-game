// emotes — Clash-Royale-style expression collectibles. Two emotes are unlocked
// from the start so the in-battle emote tray is never empty; clearing AI level N
// unlocks one more (see emoteForLevel). The collection IS the level reward. PURE.
export interface Emote {
  id: string;
  emoji: string;
  label: string;
}

// Index 0..1 = starters; index 2..11 = the level 1..10 rewards (emoteForLevel).
export const EMOTES: Emote[] = [
  { id: 'hi', emoji: '👋', label: '안녕!' },
  { id: 'apple', emoji: '🍎', label: '사과!' },
  { id: 'nice', emoji: '😀', label: '좋았어!' }, // lvl 1
  { id: 'cool', emoji: '😎', label: '여유' }, // lvl 2
  { id: 'lol', emoji: '🤣', label: '푸하하' }, // lvl 3
  { id: 'smug', emoji: '😏', label: '후훗' }, // lvl 4
  { id: 'shock', emoji: '😮', label: '헉!' }, // lvl 5
  { id: 'fire', emoji: '🔥', label: '불타올라' }, // lvl 6
  { id: 'wink', emoji: '😉', label: '좋은데?' }, // lvl 7
  { id: 'angry', emoji: '😤', label: '분하다' }, // lvl 8
  { id: 'bolt', emoji: '⚡', label: '전광석화' }, // lvl 9
  { id: 'trophy', emoji: '🏆', label: '챔피언' }, // lvl 10
];

export const STARTER_EMOTE_IDS = ['hi', 'apple'];

const BY_ID = new Map(EMOTES.map((e) => [e.id, e]));

export function getEmote(id: string): Emote | undefined {
  return BY_ID.get(id);
}

/** The emote rewarded for clearing AI level `level` (1..10). */
export function emoteForLevel(level: number): Emote {
  const idx = Math.min(EMOTES.length - 1, Math.max(1, level) + 1); // level1 → index 2
  return EMOTES[idx];
}
