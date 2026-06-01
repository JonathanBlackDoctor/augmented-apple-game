// bot/levels.ts — the 10 named AI rivals for the level campaign, themed as an
// apple ripening from a sprout into a legendary "emperor apple". Difficulty is
// hand-tuned (NOT a linear interpolation): level 1 is still the gentle on-ramp
// (always a random move) but no longer dawdles, levels 2–5 now think quicker,
// blunder less and aim closer to the best move, the curve steepens through the
// midgame, and level 10 out-paces a perfect-but-slow player (instant,
// always-optimal). Strength rises by shrinking think-time, narrowing the move
// choice (pickTop → 1), and cutting random blunders (→ 0).
//
// Each rival also carries an `emote` PERSONA so the tone AND degree of its
// in-battle reactions differ: a shy sprout barely emotes, a flashy golden apple
// gloats constantly, the emperor is sparing but regal. PURE data.
import type { BotTuning } from './BotPlayer';

/** Per-rival emote personality: which reactions it uses and how often. All ids
 *  must exist in src/emotes (EMOTES). `chattiness` (0..1) scales emote frequency. */
export interface EmotePersona {
  chattiness: number; // 0..1 — how often the rival emotes (scales the trigger chance)
  greet: string[]; // at match start
  ahead: string[]; // taunt while leading (new round / on its own clear)
  even: string[]; // breezy reaction while even or behind (on its own clear)
  behind: string[]; // rattled when the player pulls ahead
  roundWin: string[]; // celebrates on the round-check screen after taking the round
  roundLoss: string[]; // reacts on the round-check screen after dropping the round
  augment: string[]; // muses while picking an augment between rounds
}

export interface AiLevel {
  level: number; // 1..10
  name: string; // rival nickname (shown as the opponent)
  title: string; // flavor descriptor
  avatar: string; // emoji portrait
  taunt: string; // shown on the level card
  tuning: BotTuning;
  emote: EmotePersona;
}

export const MAX_LEVEL = 10;

export const AI_LEVELS: AiLevel[] = [
  {
    level: 1,
    name: '새싹이',
    title: '갓 돋아난 떡잎',
    avatar: '🌱',
    taunt: '흙냄새… 좋다…',
    tuning: { minDelayMs: 4800, maxDelayMs: 7200, pickTop: 1, blunderChance: 1 },
    // Shy & innocent: soft, wide-eyed reactions — now a touch more talkative.
    emote: { chattiness: 0.34, greet: ['hi', 'apple'], ahead: ['nice', 'apple'], even: ['apple'], behind: ['shock'], roundWin: ['nice', 'apple'], roundLoss: ['shock'], augment: ['apple', 'hi'] },
  },
  {
    level: 2,
    name: '풋사과',
    title: '아직 덜 익은',
    avatar: '🍏',
    taunt: '나… 아직 시큼해…',
    tuning: { minDelayMs: 4000, maxDelayMs: 6000, pickTop: 8, blunderChance: 0.78 },
    // Timid and a touch sour: easily startled, but warming up to the chatter.
    emote: { chattiness: 0.42, greet: ['hi', 'apple'], ahead: ['nice', 'wink'], even: ['apple', 'nice'], behind: ['shock'], roundWin: ['nice', 'wink'], roundLoss: ['shock', 'apple'], augment: ['apple', 'hi'] },
  },
  {
    level: 3,
    name: '새콤이',
    title: '상큼한 한 입',
    avatar: '🍎',
    taunt: '한 입 깨물어 볼래?',
    tuning: { minDelayMs: 3300, maxDelayMs: 5100, pickTop: 7, blunderChance: 0.55 },
    // Cheeky and playful: giggles and winks constantly.
    emote: { chattiness: 0.68, greet: ['hi', 'wink'], ahead: ['lol', 'wink', 'nice'], even: ['wink', 'nice'], behind: ['shock', 'angry'], roundWin: ['lol', 'wink'], roundLoss: ['shock', 'angry'], augment: ['wink', 'cool', 'nice'] },
  },
  {
    level: 4,
    name: '꿀사과',
    title: '속까지 꽉 찬 단맛',
    avatar: '🍯',
    taunt: '달콤하게 이겨주지.',
    tuning: { minDelayMs: 2700, maxDelayMs: 4300, pickTop: 6, blunderChance: 0.42 },
    // Sweet and friendly: warm, encouraging reactions all round long.
    emote: { chattiness: 0.62, greet: ['hi', 'nice'], ahead: ['cool', 'nice', 'wink'], even: ['nice', 'wink'], behind: ['shock'], roundWin: ['nice', 'cool'], roundLoss: ['shock', 'nice'], augment: ['nice', 'wink', 'cool'] },
  },
  {
    level: 5,
    name: '애플파이',
    title: '노릇하게 구워진',
    avatar: '🥧',
    taunt: '갓 구운 맛을 보여줄게!',
    tuning: { minDelayMs: 2200, maxDelayMs: 3500, pickTop: 5, blunderChance: 0.32 },
    // Hearty & jovial: laughs loudly, the most cheerful of the bunch.
    emote: { chattiness: 0.82, greet: ['hi', 'lol'], ahead: ['lol', 'fire', 'cool'], even: ['lol', 'nice'], behind: ['shock', 'angry'], roundWin: ['lol', 'fire'], roundLoss: ['shock', 'angry'], augment: ['lol', 'cool', 'fire'] },
  },
  {
    level: 6,
    name: '홍옥',
    title: '명품 붉은 품종',
    avatar: '❤️',
    taunt: '품격의 차이를 보여주마.',
    tuning: { minDelayMs: 1750, maxDelayMs: 2875, pickTop: 5, blunderChance: 0.25 },
    // Proud & elegant: composed, faintly haughty smirks — and more of them.
    emote: { chattiness: 0.64, greet: ['cool'], ahead: ['smug', 'cool'], even: ['cool', 'wink'], behind: ['shock', 'angry'], roundWin: ['smug', 'cool'], roundLoss: ['shock'], augment: ['cool', 'smug'] },
  },
  {
    level: 7,
    name: '황금사과',
    title: '빛나는 과수원의 왕',
    avatar: '🥇',
    taunt: '황금빛 실력 차이다.',
    tuning: { minDelayMs: 1450, maxDelayMs: 2450, pickTop: 4, blunderChance: 0.19 },
    // Boastful show-off: emotes the most, loves to flaunt trophies.
    emote: { chattiness: 0.95, greet: ['cool', 'trophy'], ahead: ['trophy', 'smug', 'bolt', 'cool'], even: ['cool', 'smug'], behind: ['angry', 'shock'], roundWin: ['trophy', 'smug', 'bolt'], roundLoss: ['angry', 'shock'], augment: ['cool', 'trophy', 'smug'] },
  },
  {
    level: 8,
    name: '독사과',
    title: '한 입이면 끝장',
    avatar: '🧪',
    taunt: '달콤한 함정에 빠졌군.',
    tuning: { minDelayMs: 1050, maxDelayMs: 1850, pickTop: 3, blunderChance: 0.11 },
    // Sly & sinister: mocking smirks, cold when crossed — relishes every moment.
    emote: { chattiness: 0.72, greet: ['smug'], ahead: ['smug', 'lol'], even: ['smug', 'wink'], behind: ['angry'], roundWin: ['smug', 'lol'], roundLoss: ['angry'], augment: ['smug', 'wink'] },
  },
  {
    level: 9,
    name: '선악과',
    title: '지혜를 건 금단의 열매',
    avatar: '🌳',
    taunt: '모든 수가 내 손바닥 안이다.',
    tuning: { minDelayMs: 700, maxDelayMs: 1250, pickTop: 2, blunderChance: 0.04 },
    // Calm & cryptic: every reaction deliberate, but it lets more of them show.
    emote: { chattiness: 0.5, greet: ['cool'], ahead: ['smug', 'bolt'], even: ['cool'], behind: ['shock', 'angry'], roundWin: ['smug', 'bolt'], roundLoss: ['shock'], augment: ['cool', 'smug'] },
  },
  {
    level: 10,
    name: '사과대제',
    title: '모든 사과의 정점',
    avatar: '👑',
    taunt: '내가 곧 사과의 전부다.',
    tuning: { minDelayMs: 320, maxDelayMs: 640, pickTop: 1, blunderChance: 0 },
    // Regal & commanding: impactful — and now holds court more freely.
    emote: { chattiness: 0.56, greet: ['cool', 'trophy'], ahead: ['trophy', 'smug', 'bolt'], even: ['cool'], behind: ['angry'], roundWin: ['trophy', 'bolt', 'smug'], roundLoss: ['angry'], augment: ['cool', 'smug'] },
  },
];

/** Clamp `level` to 1..MAX_LEVEL and return its rival definition. */
export function levelInfo(level: number): AiLevel {
  const i = Math.min(MAX_LEVEL, Math.max(1, Math.round(level))) - 1;
  return AI_LEVELS[i];
}

export function levelTuning(level: number): BotTuning {
  return levelInfo(level).tuning;
}
