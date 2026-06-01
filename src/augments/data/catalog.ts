// augments/data/catalog.ts — augment set (plan §8.3). Data-driven and
// extensible. Balance numbers are tuned via Monte-Carlo playtest (see plan).
// All entries below are SOLO-useful; pure-disruption augments (family
// 'disrupt') arrive with versus mode (Phase 4) and are excluded from solo rolls.
import type { Augment, AppleValue, Board, CellTag } from '../../contracts';

/** Tag `count` random non-empty cells with `tag` (deterministic via rng). */
function tagCells(b: Board, rng: import('../../contracts').SeededRng, count: number, tag: CellTag): void {
  if (!b.tags) return;
  const n = b.cells.length;
  const used = new Set<number>();
  for (let k = 0; k < count; k++) {
    let idx = rng.int(n);
    let guard = 0;
    while ((b.cells[idx] <= 0 || used.has(idx)) && guard++ < 40) idx = rng.int(n);
    used.add(idx);
    b.tags[idx] = tag;
  }
}

/** Trial-division primality for the small sums this game produces. */
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}

export const CATALOG: Augment[] = [
  // ----- time -----
  {
    id: 'time.relief',
    name: '여유',
    desc: '라운드 시작 시 +7초',
    tier: 'silver',
    family: 'time',
    hooks: { modifyRoundConfig: (cfg) => ({ ...cfg, durationMs: cfg.durationMs + 7000 }) },
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
    id: 'time.tempo',
    name: '가속 보상',
    desc: '콤보 3연속+ 유지 시 제거마다 +0.5초',
    tier: 'silver',
    family: 'time',
    hooks: {
      onClear: (r, c) => {
        if (c.comboCount >= 3) c.grantTimeMs(500);
        return r;
      },
    },
  },
  {
    id: 'time.warmup',
    name: '워밍업',
    desc: '라운드 첫 8초 동안 점수 1.5배',
    tier: 'silver',
    family: 'time',
    hooks: {
      onClear: (r, c) =>
        c.tMs <= 8000 ? { ...r, finalScore: Math.round(r.finalScore * 1.5) } : r,
    },
  },
  {
    id: 'time.spurt',
    name: '막판 스퍼트',
    desc: '라운드 마지막 7초 동안 점수 2배',
    tier: 'gold',
    family: 'time',
    hooks: {
      onClear: (r, c) =>
        c.tMs >= c.config.durationMs - 7000
          ? { ...r, finalScore: r.finalScore * 2, comboMultiplier: r.comboMultiplier * 2 }
          : r,
    },
  },
  {
    id: 'time.lord',
    name: '시간의 지배자',
    desc: '드래그 중 시간 2배 감속, 단 그동안 숫자가 보이지 않음',
    tier: 'prismatic',
    family: 'time',
    hooks: {
      // While dragging, time flows at 1/2 speed (2x slower); idle is normal,
      // so the round always ends (no infinite-pause exploit). The "numbers
      // hidden while dragging" drawback is applied by the UI layer (BoardView).
      onTick: (s, c) =>
        c.isDragging ? { remainingMs: s.remainingMs + c.deltaMs * (1 / 2), paused: false } : s,
    },
  },
  // ----- combo -----
  {
    id: 'combo.training',
    name: '훈련',
    desc: '3개 이상 한 번에 제거 시 +30%',
    tier: 'silver',
    family: 'combo',
    hooks: {
      onClear: (r) =>
        r.count >= 3 ? { ...r, finalScore: r.finalScore + Math.ceil(r.finalScore * 0.3) } : r,
    },
  },
  {
    id: 'combo.chain',
    name: '연쇄',
    desc: '4개 이상 한 번에 제거 시 점수 2배',
    tier: 'gold',
    family: 'combo',
    hooks: {
      onClear: (r) =>
        r.count >= 4
          ? { ...r, finalScore: r.finalScore * 2, comboMultiplier: r.comboMultiplier * 2 }
          : r,
    },
  },
  {
    id: 'combo.frenzy',
    name: '폭주',
    desc: '한 번에 많이 제거할수록 점수 가속 (사과 1개당 +5%)',
    tier: 'gold',
    family: 'combo',
    hooks: {
      onClear: (r) => {
        const mult = 1 + r.count * 0.05;
        return { ...r, finalScore: Math.round(r.finalScore * mult), comboMultiplier: r.comboMultiplier * mult };
      },
    },
  },
  {
    id: 'combo.massacre',
    name: '대량 제거',
    desc: '5개 이상 한 번에 제거 시 점수 3배',
    tier: 'gold',
    family: 'combo',
    hooks: {
      onClear: (r) =>
        r.count >= 5
          ? { ...r, finalScore: r.finalScore * 3, comboMultiplier: r.comboMultiplier * 3 }
          : r,
    },
  },
  // ----- board -----
  {
    id: 'board.rearrange',
    name: '재배치',
    desc: '라운드 시작 시 합 10짜리 3칸 묶음 2개를 만들어 줌',
    tier: 'silver',
    family: 'board',
    hooks: {
      onBoardInit: (b, rng) => {
        const used = new Set<number>();
        let placed = 0;
        let guard = 0;
        while (placed < 2 && guard++ < 200) {
          const row = rng.int(b.rows);
          const col = rng.int(Math.max(1, b.cols - 2)); // need col, col+1, col+2
          const i0 = row * b.cols + col;
          if (used.has(i0) || used.has(i0 + 1) || used.has(i0 + 2)) continue;
          // split 10 into three parts each in 1..8
          const a = 1 + rng.int(5); // 1..5
          const b2 = 1 + rng.int(Math.max(1, 10 - a - 1)); // >=1, leaves >=1 for c
          const c = 10 - a - b2;
          if (c < 1 || c > 9 || b2 < 1 || b2 > 9) continue;
          b.cells[i0] = a as AppleValue;
          b.cells[i0 + 1] = b2 as AppleValue;
          b.cells[i0 + 2] = c as AppleValue;
          used.add(i0);
          used.add(i0 + 1);
          used.add(i0 + 2);
          placed++;
        }
      },
    },
  },
  {
    id: 'board.golden',
    name: '황금 사과',
    desc: '황금 사과 5개 — 황금 사과는 점수 2배(개당 +1점)',
    tier: 'gold',
    family: 'board',
    hooks: {
      onBoardInit: (b, rng) => tagCells(b, rng, 5, 'golden'),
      onClear: (r, c) => {
        const golden = c.clearedTags.filter((t) => t === 'golden').length;
        return golden > 0 ? { ...r, finalScore: r.finalScore + golden } : r;
      },
    },
  },
  {
    id: 'board.gem',
    name: '보석 사과',
    desc: '보석 사과 1개 (제거 시 +20점)',
    tier: 'gold',
    family: 'board',
    hooks: {
      onBoardInit: (b, rng) => tagCells(b, rng, 1, 'gem'),
      onClear: (r, c) => {
        const gems = c.clearedTags.filter((t) => t === 'gem').length;
        return gems > 0 ? { ...r, finalScore: r.finalScore + gems * 20 } : r;
      },
    },
  },
  {
    id: 'board.bomb',
    name: '폭탄 사과',
    desc: '폭탄 사과 2개 — 제거 시 상하좌우에 남은 사과도 함께 터뜨림 (터진 사과 각 +2점)',
    tier: 'silver',
    family: 'board',
    hooks: {
      onBoardInit: (b, rng) => tagCells(b, rng, 2, 'bomb'),
      // When a bomb apple is cleared, blow up its (up to 4) orthogonal
      // neighbours that are still on the board. Mutates the live engine board
      // (same reference the UI re-reads via getBoard()) and adds the exploded
      // cells to result.cells so they animate/score like normal clears. Single
      // level only — exploded bombs do not chain. Deterministic (geometry-based),
      // so replay/online sync stay reproducible.
      onClear: (r, c) => {
        const board = c.board;
        const { cols, rows } = board;
        const extra: number[] = [];
        r.cells.forEach((idx, i) => {
          if (c.clearedTags[i] !== 'bomb') return;
          const col = idx % cols;
          const row = (idx - col) / cols;
          const neighbours = [
            row > 0 ? idx - cols : -1, // up
            row < rows - 1 ? idx + cols : -1, // down
            col > 0 ? idx - 1 : -1, // left
            col < cols - 1 ? idx + 1 : -1, // right
          ];
          for (const n of neighbours) {
            if (n < 0 || board.cells[n] <= 0 || extra.includes(n)) continue;
            board.cells[n] = 0;
            if (board.tags) board.tags[n] = 'normal';
            extra.push(n);
          }
        });
        return extra.length > 0
          ? { ...r, cells: [...r.cells, ...extra], finalScore: r.finalScore + extra.length * 2 }
          : r;
      },
    },
  },
  {
    id: 'board.rainbow',
    name: '무지개 사과',
    desc: '만능 사과 5개 — 부족분을 채워 합 완성',
    tier: 'prismatic',
    family: 'board',
    hooks: {
      onBoardInit: (b, rng) => tagCells(b, rng, 5, 'wild'),
      validateSelection: (c) => {
        if (c.cells.length === 0) return undefined;
        const tags = c.board.tags;
        if (!tags) return undefined;
        let wilds = 0;
        let nonWildSum = 0;
        for (const idx of c.cells) {
          if (tags[idx] === 'wild') wilds++;
          else nonWildSum += c.board.cells[idx] as number;
        }
        if (wilds === 0) return undefined;
        // Each wild can represent any value 1..9; accept if the shortfall to the
        // target can be covered by the wild(s).
        const need = c.targetSum - nonWildSum;
        return need >= wilds && need <= wilds * 9 ? { accept: true } : undefined;
      },
    },
  },
  // ----- rule -----
  {
    id: 'rule.kindness',
    name: '친절',
    desc: '합 11도 인정',
    tier: 'prismatic',
    family: 'rule',
    conflictsWith: ['rule.eleven', 'rule.alchemy'],
    hooks: {
      validateSelection: (c) => (c.sum === 11 && c.cells.length > 0 ? { accept: true } : undefined),
    },
  },
  {
    id: 'rule.eleven',
    name: '소수의 길',
    desc: '합이 10 이상의 소수면 인정 (11·13·17·19·23…)',
    tier: 'prismatic',
    family: 'rule',
    conflictsWith: ['rule.kindness', 'rule.alchemy'],
    hooks: {
      validateSelection: (c) =>
        c.sum >= 10 && isPrime(c.sum) && c.cells.length > 0 ? { accept: true } : undefined,
    },
  },
  {
    id: 'rule.alchemy',
    name: '연금술',
    desc: '합이 5의 배수면 인정, 단 25 이하만 (5·10·15·20·25)',
    tier: 'prismatic',
    family: 'rule',
    conflictsWith: ['rule.kindness', 'rule.eleven'],
    hooks: {
      validateSelection: (c) =>
        c.sum > 0 && c.sum % 5 === 0 && c.sum <= 25 && c.cells.length > 0 ? { accept: true } : undefined,
    },
  },
  {
    id: 'rule.twenty',
    name: '20의 결단',
    desc: '합이 정확히 20인 제거 인정 + 그 점수 2배',
    tier: 'gold',
    family: 'rule',
    hooks: {
      validateSelection: (c) => (c.sum === 20 && c.cells.length > 0 ? { accept: true } : undefined),
      onClear: (r, c) => {
        const sum = c.clearedValues.reduce((a, v) => a + v, 0);
        return sum === 20
          ? { ...r, finalScore: r.finalScore * 2, comboMultiplier: r.comboMultiplier * 2 }
          : r;
      },
    },
  },
  // ----- risk -----
  {
    id: 'risk.glasscannon',
    name: '유리대포',
    desc: '점수 2배, 그러나 타이머 2배 속도',
    tier: 'prismatic',
    family: 'risk',
    hooks: {
      modifyRoundConfig: (cfg) => ({ ...cfg, durationMs: Math.round(cfg.durationMs / 2) }),
      onClear: (r) => ({ ...r, finalScore: r.finalScore * 2, comboMultiplier: r.comboMultiplier * 2 }),
    },
  },
  {
    id: 'risk.tightrope',
    name: '외줄타기',
    desc: '시간 -8초, 대신 모든 점수 1.6배',
    tier: 'gold',
    family: 'risk',
    hooks: {
      modifyRoundConfig: (cfg) => ({ ...cfg, durationMs: Math.max(5000, cfg.durationMs - 8000) }),
      onClear: (r) => ({ ...r, finalScore: Math.round(r.finalScore * 1.6), comboMultiplier: r.comboMultiplier * 1.6 }),
    },
  },
  {
    id: 'risk.gambler',
    name: '도박사',
    desc: '제거마다 50% 점수 2배, 50% 점수 0.5배 (도박)',
    tier: 'prismatic',
    family: 'risk',
    hooks: {
      onClear: (r, c) => {
        const mult = c.rng.next() < 0.5 ? 2 : 0.5;
        return { ...r, finalScore: Math.round(r.finalScore * mult), comboMultiplier: r.comboMultiplier * mult };
      },
    },
  },
];

const BY_ID = new Map(CATALOG.map((a) => [a.id, a]));
export function byId(id: string): Augment | undefined {
  return BY_ID.get(id);
}
