// app/augmentFx.ts — turns game events (augment pick, clear, timer) into the
// in-game "발동 연출" over the board, driven entirely from observable outcomes
// (ClearResult + owned set) so the pure core stays untouched. `planClear` is a
// pure function (unit-tested); the `play*` helpers execute it against a BoardView.
import type { CellTag } from '../contracts';
import type { BoardView } from '../board/BoardView';
import type { FxTag } from '../board/BoardFx';
import { ACT, FX_COL, type FxColorKey } from './augmentFxData';
import { byId } from '../augments';

const PRIMES = new Set([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
const c = (k: FxColorKey): [string, string, string] => FX_COL[k];

/** Spawn type (showcase) -> board CellTag. */
const TAG_OF: Record<string, CellTag> = { gold: 'golden', gem: 'gem', bomb: 'bomb', wild: 'wild' };

export interface FxClearCtx {
  cells: number[]; // cleared cell indices
  tags: CellTag[]; // tag per cleared cell, parallel to `cells`
  count: number; // apples removed
  comboStreak: number; // consecutive successful clears
  sum: number; // matched apple-value sum
  baseScore: number;
  finalScore: number;
  comboMultiplier: number;
  remainingMs: number;
  durationMs: number;
}

export type FxDir =
  | { k: 'popup'; big: string; tags: FxTag[]; color: string }
  | { k: 'ring'; color: string }
  | { k: 'particles'; color: string; n: number }
  | { k: 'spark'; cells: number[]; color: string }
  | { k: 'stamp'; text: string; bd: string; fg: string }
  | { k: 'dice'; text: string; color: string }
  | { k: 'flash' }
  | { k: 'shake' };

/** Pure: decide the FX for a clear from its observable outcome + owned set. */
export function planClear(owned: string[], ctx: FxClearCtx): FxDir[] {
  const has = (id: string): boolean => owned.includes(id);
  const dirs: FxDir[] = [];
  const tags: FxTag[] = [];
  const cellsTagged = (t: CellTag): number[] => ctx.cells.filter((_, i) => ctx.tags[i] === t);
  const n = (t: CellTag): number => ctx.tags.reduce((a, x) => a + (x === t ? 1 : 0), 0);

  // Special apples (board augments) — sparkle each, note the bonus.
  const nWild = n('wild');
  const nBomb = n('bomb');
  const nGem = n('gem');
  const nGold = n('golden');
  if (nWild) {
    dirs.push({ k: 'spark', cells: cellsTagged('wild'), color: c('prism')[0] });
    tags.push({ t: `와일드 ×${nWild}`, c: c('prism')[1] });
  }
  if (nBomb) {
    dirs.push({ k: 'spark', cells: cellsTagged('bomb'), color: '#ffb53a' });
    tags.push({ t: '폭탄 💥', c: c('silver')[1] });
  }
  if (nGem) {
    dirs.push({ k: 'spark', cells: cellsTagged('gem'), color: c('blue')[0] });
    tags.push({ t: `보석 +${nGem * 20}`, c: c('blue')[1] });
  }
  if (nGold) {
    dirs.push({ k: 'spark', cells: cellsTagged('golden'), color: c('gold')[0] });
    tags.push({ t: '황금 ×2', c: c('gold')[1] });
  }

  // Rule augments — a "허용/소수/×5/20" stamp keyed off the (observable) sum.
  if (has('rule.twenty') && ctx.sum === 20) {
    dirs.push({ k: 'stamp', text: '20', bd: c('gold')[0], fg: c('gold')[1] });
    tags.push({ t: '20 결단 ×2', c: c('gold')[1] });
  } else if (has('rule.kindness') && ctx.sum === 9) {
    dirs.push({ k: 'stamp', text: '허용', bd: c('green')[0], fg: c('green')[1] });
  } else if (has('rule.eleven') && ctx.sum <= 20 && PRIMES.has(ctx.sum)) {
    dirs.push({ k: 'stamp', text: `소수 ${ctx.sum}`, bd: c('prism')[0], fg: c('prism')[1] });
  } else if (has('rule.alchemy') && ctx.sum % 5 === 0 && ctx.sum !== 10) {
    dirs.push({ k: 'stamp', text: `×5 ${ctx.sum}`, bd: c('prism')[0], fg: c('prism')[1] });
  }

  // Combo / score augments — fire on their observable trigger condition.
  if (has('combo.massacre') && ctx.count >= 4) {
    dirs.push({ k: 'flash' }, { k: 'shake' }, { k: 'particles', color: c('gold')[0], n: 18 });
    tags.push({ t: '대량 ×3', c: c('gold')[1] });
  }
  if (has('combo.training') && ctx.count >= 3) tags.push({ t: '훈련 +30%', c: c('green')[1] });
  if (has('combo.chain') && ctx.count >= 4) {
    dirs.push({ k: 'spark', cells: ctx.cells, color: c('gold')[0] });
    tags.push({ t: '연쇄 ×2', c: c('gold')[1] });
  }
  if (has('combo.frenzy')) {
    dirs.push({ k: 'particles', color: c('orange')[0], n: Math.min(20, ctx.count * 3) });
    tags.push({ t: `폭주 ×${(1 + ctx.count * 0.05).toFixed(2)}`, c: c('gold')[1] });
  }
  if (has('time.spurt') && ctx.remainingMs <= 7000) tags.push({ t: '막판 ×2', c: c('gold')[1] });
  if (has('risk.glasscannon')) tags.push({ t: '대포 ×3', c: c('prism')[1] });
  if (has('risk.tightrope')) tags.push({ t: '외줄 ×1.6', c: c('gold')[1] });
  if (has('risk.gambler')) {
    // Gambler is the only sub-1 multiplier, so final<base ⇔ the 0× roll landed.
    const won = ctx.finalScore >= ctx.baseScore;
    dirs.push({ k: 'dice', text: won ? '10×' : '0×', color: won ? c('green')[1] : c('red')[1] });
  }

  // Set synergy — 3+ augments of one family grant +20% (already folded into
  // finalScore by the core); surface it as a tag so the player sees the bonus.
  const famCounts = new Map<string, number>();
  for (const id of owned) {
    const a = byId(id);
    if (a) famCounts.set(a.family, (famCounts.get(a.family) ?? 0) + 1);
  }
  let synergySets = 0;
  for (const cnt of famCounts.values()) if (cnt >= 3) synergySets++;
  if (synergySets > 0) tags.push({ t: `세트 +${synergySets * 20}%`, c: c('green')[1] });

  // Headline: the gained score + contributing tags, tinted by the net multiplier.
  const m = ctx.comboMultiplier;
  const pc = m >= 3 ? '#5b4fb0' : m >= 2 ? '#B97F12' : m < 1 ? '#c93f2c' : '#3f7a32';
  dirs.unshift({ k: 'popup', big: `+${ctx.finalScore.toLocaleString()}`, tags: tags.slice(0, 3), color: pc });
  dirs.push({ k: 'ring', color: pc });
  return dirs;
}

/** Execute the clear FX over the board. */
export function playClear(board: BoardView, owned: string[], ctx: FxClearCtx): void {
  const fx = board.effects;
  if (!fx) return;
  const center = board.centroidPx(ctx.cells);
  if (!center) return;
  for (const d of planClear(owned, ctx)) {
    switch (d.k) {
      case 'popup':
        fx.popup(center.x, center.y, d.big, d.tags, d.color);
        break;
      case 'ring':
        fx.ring(center.x, center.y, d.color);
        break;
      case 'particles':
        fx.particles(center.x, center.y, d.color, d.n);
        break;
      case 'stamp':
        fx.stamp(center.x, center.y, d.text, d.bd, d.fg);
        break;
      case 'dice':
        fx.dice(center.x, center.y, d.text, d.color);
        break;
      case 'spark':
        for (const i of d.cells) {
          const p = board.cellCenterPx(i);
          if (p) fx.spark(p.x, p.y, d.color);
        }
        break;
      case 'flash':
        fx.flash();
        break;
      case 'shake':
        fx.shake();
        break;
    }
  }
}

/** Play an augment's activation flourish when it is freshly picked. */
export function playActivation(board: BoardView, id: string): void {
  const fx = board.effects;
  const act = ACT[id];
  const center = board.boardCenterPx();
  if (!fx || !act || !center) return;
  const g = FX_COL[act.glow];
  fx.ring(center.x, center.y, g[0]);

  const badges = act.badges ?? [];
  badges.forEach((b, i) => {
    const bc = FX_COL[b.c];
    const x = center.x + (i - (badges.length - 1) / 2) * 64;
    fx.popup(x, center.y, b.t, null, bc[1]);
  });

  switch (act.kind) {
    case 'gain':
      fx.timeFloat(badges[0]?.t ?? '+시간');
      break;
    case 'speed':
      fx.shake();
      break;
    case 'burst':
      fx.particles(center.x, center.y, g[0], 16);
      break;
    case 'allow':
      fx.stamp(center.x, center.y, act.stamp ?? '허용', g[0], g[1]);
      break;
    case 'spawn': {
      const tag = TAG_OF[act.spawn?.type ?? ''];
      if (tag) {
        for (const i of board.cellsWithTag(tag)) {
          const p = board.cellCenterPx(i);
          if (p) {
            fx.spark(p.x, p.y, g[0]);
            fx.ring(p.x, p.y, g[0]);
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

/** Toggle the ambient board vignettes for owned sustain augments each frame. */
export function updateAmbient(
  board: BoardView,
  owned: string[],
  remainingMs: number,
  durationMs: number,
): void {
  const fx = board.effects;
  if (!fx) return;
  fx.vignette('prism', owned.includes('risk.glasscannon') || owned.includes('time.lord'));
  fx.vignette('warm', owned.includes('time.warmup') && remainingMs > durationMs - 8000);
  fx.vignette('red', owned.includes('time.spurt') && remainingMs <= 7000);
}
