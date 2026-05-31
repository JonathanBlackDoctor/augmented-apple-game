// bot/levels.ts — the 10 named AI rivals for the level campaign, themed as an
// apple ripening from a sprout into a legendary "emperor apple". Difficulty is
// hand-tuned (NOT a linear interpolation): levels 1–2 are far gentler than a
// casual human (very long "thinking", fully random moves), the curve steepens
// through the midgame, and level 10 out-paces a perfect-but-slow player (instant,
// always-optimal). Strength rises by shrinking think-time, narrowing the move
// choice (pickTop → 1), and cutting random blunders (→ 0). PURE data.
import type { BotTuning } from './BotPlayer';

export interface AiLevel {
  level: number; // 1..10
  name: string; // rival nickname (shown as the opponent)
  title: string; // flavor descriptor
  avatar: string; // emoji portrait
  taunt: string; // shown on the level card
  tuning: BotTuning;
}

export const MAX_LEVEL = 10;

export const AI_LEVELS: AiLevel[] = [
  {
    level: 1,
    name: '새싹이',
    title: '갓 돋아난 떡잎',
    avatar: '🌱',
    taunt: '흙냄새… 좋다…',
    tuning: { minDelayMs: 6500, maxDelayMs: 9500, pickTop: 1, blunderChance: 1 },
  },
  {
    level: 2,
    name: '풋사과',
    title: '아직 덜 익은',
    avatar: '🍏',
    taunt: '나… 아직 시큼해…',
    tuning: { minDelayMs: 5200, maxDelayMs: 7800, pickTop: 1, blunderChance: 1 },
  },
  {
    level: 3,
    name: '새콤이',
    title: '상큼한 한 입',
    avatar: '🍎',
    taunt: '한 입 깨물어 볼래?',
    tuning: { minDelayMs: 4200, maxDelayMs: 6400, pickTop: 8, blunderChance: 0.8 },
  },
  {
    level: 4,
    name: '꿀사과',
    title: '속까지 꽉 찬 단맛',
    avatar: '🍯',
    taunt: '달콤하게 이겨주지.',
    tuning: { minDelayMs: 3400, maxDelayMs: 5200, pickTop: 7, blunderChance: 0.58 },
  },
  {
    level: 5,
    name: '애플파이',
    title: '노릇하게 구워진',
    avatar: '🥧',
    taunt: '갓 구운 맛을 보여줄게!',
    tuning: { minDelayMs: 2700, maxDelayMs: 4200, pickTop: 6, blunderChance: 0.42 },
  },
  {
    level: 6,
    name: '홍옥',
    title: '명품 붉은 품종',
    avatar: '❤️',
    taunt: '품격의 차이를 보여주마.',
    tuning: { minDelayMs: 2050, maxDelayMs: 3300, pickTop: 5, blunderChance: 0.3 },
  },
  {
    level: 7,
    name: '황금사과',
    title: '빛나는 과수원의 왕',
    avatar: '🥇',
    taunt: '황금빛 실력 차이다.',
    tuning: { minDelayMs: 1450, maxDelayMs: 2450, pickTop: 4, blunderChance: 0.19 },
  },
  {
    level: 8,
    name: '독사과',
    title: '한 입이면 끝장',
    avatar: '🧪',
    taunt: '달콤한 함정에 빠졌군.',
    tuning: { minDelayMs: 1050, maxDelayMs: 1850, pickTop: 3, blunderChance: 0.11 },
  },
  {
    level: 9,
    name: '선악과',
    title: '지혜를 건 금단의 열매',
    avatar: '🌳',
    taunt: '모든 수가 내 손바닥 안이다.',
    tuning: { minDelayMs: 700, maxDelayMs: 1250, pickTop: 2, blunderChance: 0.04 },
  },
  {
    level: 10,
    name: '사과대제',
    title: '모든 사과의 정점',
    avatar: '👑',
    taunt: '내가 곧 사과의 전부다.',
    tuning: { minDelayMs: 320, maxDelayMs: 640, pickTop: 1, blunderChance: 0 },
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
