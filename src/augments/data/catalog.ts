// augments/data/catalog.ts — initial augment set (plan §8.3). Data-driven and
// extensible. Balance numbers are first-pass and meant for playtest tuning.
// All entries below are SOLO-useful; pure-disruption augments (family
// 'disrupt') arrive with versus mode (Phase 4) and are excluded from solo rolls.
import type { Augment, AppleValue, Board } from '../../contracts';

function tagGolden(b: Board, rng: import('../../contracts').SeededRng, count: number): void {
  if (!b.tags) return;
  const n = b.cells.length;
  const used = new Set<number>();
  for (let k = 0; k < count; k++) {
    let idx = rng.int(n);
    let guard = 0;
    while ((b.cells[idx] <= 0 || used.has(idx)) && guard++ < 40) idx = rng.int(n);
    used.add(idx);
    b.tags[idx] = 'golden';
  }
}

export const CATALOG: Augment[] = [
  // ----- time -----
  {
    id: 'time.relief',
    name: '여유',
    desc: '라운드 시작 시 +3초',
    tier: 'silver',
    family: 'time',
    hooks: { modifyRoundConfig: (cfg) => ({ ...cfg, durationMs: cfg.durationMs + 3000 }) },
  },
  {
    id: 'time.countdown',
    name: '초읽기',
    desc: '콤보(2연속+) 성공마다 +0.5초',
    tier: 'silver',
    family: 'time',
    hooks: {
      onClear: (r, c) => {
        if (c.comboCount >= 2) c.grantTimeMs(500);
        return r;
      },
    },
  },
  {
    id: 'time.afterimage',
    name: '잔상',
    desc: '드래그하는 동안 시간 60% 감속',
    tier: 'gold',
    family: 'time',
    hooks: {
      onTick: (s, c) => (c.isDragging ? { ...s, remainingMs: s.remainingMs + c.deltaMs * 0.6 } : s),
    },
  },
  {
    id: 'time.lord',
    name: '시간의 지배자',
    desc: '드래그하지 않는 동안 타이머 정지',
    tier: 'prismatic',
    family: 'time',
    hooks: {
      onTick: (s, c) =>
        c.isDragging ? s : { remainingMs: s.remainingMs + c.deltaMs, paused: true },
    },
  },
  // ----- combo -----
  {
    id: 'combo.training',
    name: '훈련',
    desc: '4개 이상 한 번에 제거 시 +5%',
    tier: 'silver',
    family: 'combo',
    hooks: {
      onClear: (r) =>
        r.count >= 4 ? { ...r, finalScore: r.finalScore + Math.ceil(r.finalScore * 0.05) } : r,
    },
  },
  {
    id: 'combo.chain',
    name: '연쇄',
    desc: '콤보 유지 시 점수 1.5배 (끊기면 리셋)',
    tier: 'gold',
    family: 'combo',
    hooks: {
      onClear: (r, c) =>
        c.comboCount >= 2
          ? { ...r, finalScore: Math.round(r.finalScore * 1.5), comboMultiplier: r.comboMultiplier * 1.5 }
          : r,
    },
  },
  // ----- board -----
  {
    id: 'board.rearrange',
    name: '재배치',
    desc: '라운드 시작 시 합 10 짝을 여러 개 만들어 줌',
    tier: 'silver',
    family: 'board',
    hooks: {
      onBoardInit: (b, rng) => {
        const n = b.cells.length;
        for (let k = 0; k < 6; k++) {
          const idx = rng.int(n);
          const col = idx % b.cols;
          if (col < b.cols - 1) {
            const right = b.cells[idx + 1];
            if (right > 0) b.cells[idx] = Math.min(9, Math.max(1, 10 - right)) as AppleValue;
          }
        }
      },
    },
  },
  {
    id: 'board.golden',
    name: '황금 사과',
    desc: '라운드당 황금 사과 2개 (점수 2배)',
    tier: 'gold',
    family: 'board',
    hooks: {
      onBoardInit: (b, rng) => tagGolden(b, rng, 2),
      onClear: (r, c) => {
        const golden = c.clearedTags.filter((t) => t === 'golden').length;
        return golden > 0 ? { ...r, finalScore: r.finalScore + golden } : r;
      },
    },
  },
  // ----- rule -----
  {
    id: 'rule.kindness',
    name: '친절',
    desc: '합 9도 인정',
    tier: 'silver',
    family: 'rule',
    hooks: {
      validateSelection: (c) => (c.sum === 9 && c.cells.length > 0 ? { accept: true } : undefined),
    },
  },
  {
    id: 'rule.eleven',
    name: '11의 길',
    desc: '합 10·11 모두 인정',
    tier: 'gold',
    family: 'rule',
    hooks: {
      validateSelection: (c) => (c.sum === 11 && c.cells.length > 0 ? { accept: true } : undefined),
    },
  },
  {
    id: 'rule.alchemy',
    name: '연금술',
    desc: '10의 배수면 모두 인정 (10·20·30…)',
    tier: 'prismatic',
    family: 'rule',
    hooks: {
      validateSelection: (c) =>
        c.sum > 0 && c.sum % 10 === 0 && c.cells.length > 0 ? { accept: true } : undefined,
    },
  },
  // ----- risk -----
  {
    id: 'risk.glasscannon',
    name: '유리대포',
    desc: '점수 3배, 그러나 타이머 2배 속도',
    tier: 'prismatic',
    family: 'risk',
    hooks: {
      modifyRoundConfig: (cfg) => ({ ...cfg, durationMs: Math.round(cfg.durationMs / 2) }),
      onClear: (r) => ({ ...r, finalScore: r.finalScore * 3, comboMultiplier: r.comboMultiplier * 3 }),
    },
  },
];

const BY_ID = new Map(CATALOG.map((a) => [a.id, a]));
export function byId(id: string): Augment | undefined {
  return BY_ID.get(id);
}
