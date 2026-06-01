// augments/runtime.ts — tier schedule, deterministic 3-pick rolls, and the
// AugmentRuntime implementation (plan §5.3, §8.1).
import type { Augment, AugmentHookBus, AugmentRuntime, AugTier, SeededRng } from '../contracts';
import { CATALOG, byId } from './data/catalog';
import { createHookBus } from './hookBus';

/** Tier schedule: R1·R2 silver -> R3·R4 gold -> R5 prismatic (0-based index).
 *  Used by the solo augment-practice and online modes. */
export function tierForRound(roundIndex: number): AugTier {
  if (roundIndex < 2) return 'silver';
  if (roundIndex < 4) return 'gold';
  return 'prismatic';
}

/** Versus schedule (5 picks, one before each round). Picks 2 & 4 (0-based rounds
 *  1 & 3) blend two adjacent tiers so a stronger tier can show up earlier:
 *  R1 silver · R2 silver+gold · R3 gold · R4 gold+prismatic · R5 prismatic. */
export function versusOfferTiers(roundIndex: number): AugTier[] {
  switch (roundIndex) {
    case 0:
      return ['silver'];
    case 1:
      return ['silver', 'gold'];
    case 2:
      return ['gold'];
    case 3:
      return ['gold', 'prismatic'];
    default:
      return ['prismatic'];
  }
}

function eligible(tiers: AugTier[], owned: string[]): Augment[] {
  const tierSet = new Set(tiers);
  const ownedSet = new Set(owned);
  const conflicts = new Set<string>();
  for (const id of owned) byId(id)?.conflictsWith?.forEach((c) => conflicts.add(c));
  return CATALOG.filter(
    (a) =>
      tierSet.has(a.tier) &&
      a.family !== 'disrupt' && // solo: skip pure-disruption augments
      !ownedSet.has(a.id) &&
      !conflicts.has(a.id),
  );
}

/** Deterministic partial Fisher–Yates: pick up to `k` distinct ids. */
function sampleN(ids: string[], k: number, rng: SeededRng): string[] {
  const arr = ids.slice();
  for (let i = 0; i < Math.min(k, arr.length); i++) {
    const j = i + rng.int(arr.length - i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(k, arr.length));
}

/** Offer 3 distinct augment ids drawn from the union of `tiers`, excluding
 *  owned/conflicts. Cards keep their own tier, so a mixed pool yields a mix.
 *  `exclude` (e.g. the offer being rerolled) is avoided first so a reroll never
 *  shows the same cards again; it only falls back to those ids when the fresh
 *  pool can't fill all 3 slots, so the offer is always 3 distinct cards. */
export function rollOfferTiers(
  tiers: AugTier[],
  rng: SeededRng,
  owned: string[],
  exclude: string[] = [],
): string[] {
  const pool = eligible(tiers, owned).map((a) => a.id);
  const excludeSet = new Set(exclude);
  const fresh = pool.filter((id) => !excludeSet.has(id));
  const picks = sampleN(fresh, 3, rng);
  // Not enough fresh cards (tiny pool after a reroll) → fill from the excluded
  // ones, still distinct, rather than leaving empty slots.
  if (picks.length < 3) {
    const stale = pool.filter((id) => excludeSet.has(id) && !picks.includes(id));
    picks.push(...sampleN(stale, 3 - picks.length, rng));
  }
  // Last-resort degrade if the whole pool is exhausted (keeps the UI to 3 slots).
  while (picks.length < 3 && pool.length > 0) picks.push(pool[picks.length % pool.length]);
  return picks;
}

/** Offer 3 distinct augment ids of a single `tier`, excluding owned/conflicts. */
export function rollOffer(
  tier: AugTier,
  rng: SeededRng,
  owned: string[],
  exclude: string[] = [],
): string[] {
  return rollOfferTiers([tier], rng, owned, exclude);
}

/** Owning 3+ augments of the same family grants a permanent +50% score bonus
 *  (stacking per family that reaches the threshold). Folded into the hook bus as
 *  a synthetic augment so every mode (solo/versus/online) gets it for free. The
 *  threshold/bonus are exported so the augment-pick UI can show the same numbers. */
export const SET_SYNERGY_BONUS = 0.5;
export const SET_SYNERGY_THRESHOLD = 3;
function familySetSynergy(list: Augment[]): Augment | null {
  const counts = new Map<string, number>();
  for (const a of list) counts.set(a.family, (counts.get(a.family) ?? 0) + 1);
  let sets = 0;
  for (const n of counts.values()) if (n >= SET_SYNERGY_THRESHOLD) sets++;
  if (sets === 0) return null;
  const mult = (1 + SET_SYNERGY_BONUS) ** sets;
  return {
    id: 'synergy.set',
    name: '세트 시너지',
    desc: '같은 계열 증강 3개 이상 보유 시 점수 +50%',
    tier: 'silver',
    family: 'combo',
    hooks: {
      onClear: (r) => ({
        ...r,
        finalScore: Math.round(r.finalScore * mult),
        comboMultiplier: r.comboMultiplier * mult,
      }),
    },
  };
}

export function buildHookBusFor(owned: string[]): AugmentHookBus {
  const list = owned.map(byId).filter((a): a is Augment => Boolean(a));
  // Apply the set-synergy multiplier last so it scales the fully-augmented score.
  const synergy = familySetSynergy(list);
  return createHookBus(synergy ? [...list, synergy] : list);
}

/** Stateful AugmentRuntime per the contract (used by tests / future net sync). */
export function createAugmentRuntime(): AugmentRuntime {
  const owned: string[] = [];
  return {
    rollOffer(tier, rng, ownedIds) {
      const ids = rollOffer(tier, rng, ownedIds.length ? ownedIds : owned);
      return [ids[0], ids[1], ids[2]] as [string, string, string];
    },
    pick(id) {
      owned.push(id);
    },
    buildHookBus() {
      return buildHookBusFor(owned);
    },
  };
}
