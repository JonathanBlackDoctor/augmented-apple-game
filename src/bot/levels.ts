// bot/levels.ts — the 10 named AI rivals for the level campaign. Difficulty is
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
    name: '꼬물이',
    title: '갓 깨어난 애벌레',
    avatar: '🐛',
    taunt: '사과… 같이 먹을래?',
    tuning: { minDelayMs: 6500, maxDelayMs: 9500, pickTop: 1, blunderChance: 1 },
  },
  {
    level: 2,
    name: '느긋',
    title: '느림보 달팽이',
    avatar: '🐌',
    taunt: '천천히… 가자…',
    tuning: { minDelayMs: 5200, maxDelayMs: 7800, pickTop: 1, blunderChance: 1 },
  },
  {
    level: 3,
    name: '점박이',
    title: '씩씩한 무당벌레',
    avatar: '🐞',
    taunt: '나 이래 봬도 빠르다고!',
    tuning: { minDelayMs: 4200, maxDelayMs: 6400, pickTop: 8, blunderChance: 0.8 },
  },
  {
    level: 4,
    name: '깡총',
    title: '사과 도둑 토끼',
    avatar: '🐰',
    taunt: '사과는 전부 내 거야!',
    tuning: { minDelayMs: 3400, maxDelayMs: 5200, pickTop: 7, blunderChance: 0.58 },
  },
  {
    level: 5,
    name: '꼬리',
    title: '약삭빠른 여우',
    avatar: '🦊',
    taunt: '머리를 좀 써볼까?',
    tuning: { minDelayMs: 2700, maxDelayMs: 4200, pickTop: 6, blunderChance: 0.42 },
  },
  {
    level: 6,
    name: '우직',
    title: '곰 과수원지기',
    avatar: '🐻',
    taunt: '한 수 가르쳐 주마.',
    tuning: { minDelayMs: 2050, maxDelayMs: 3300, pickTop: 5, blunderChance: 0.3 },
  },
  {
    level: 7,
    name: '초고속',
    title: '하늘을 가르는 매',
    avatar: '🦅',
    taunt: '내 속도를 따라와 봐.',
    tuning: { minDelayMs: 1450, maxDelayMs: 2450, pickTop: 4, blunderChance: 0.19 },
  },
  {
    level: 8,
    name: '그림자',
    title: '늑대 전략가',
    avatar: '🐺',
    taunt: '네 빈틈은 이미 보인다.',
    tuning: { minDelayMs: 1050, maxDelayMs: 1850, pickTop: 3, blunderChance: 0.11 },
  },
  {
    level: 9,
    name: '불꽃',
    title: '사과 드래곤',
    avatar: '🐉',
    taunt: '전부 태워주마!',
    tuning: { minDelayMs: 700, maxDelayMs: 1250, pickTop: 2, blunderChance: 0.04 },
  },
  {
    level: 10,
    name: '텐',
    title: '사과의 제왕',
    avatar: '👑',
    taunt: '완벽함이 무엇인지 보여주지.',
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
