// augments/index.ts — public surface of the augment system.
export { CATALOG, byId } from './data/catalog';
export { createHookBus, emptyHookBus } from './hookBus';
export {
  tierForRound,
  versusOfferTiers,
  rollOffer,
  rollOfferTiers,
  buildHookBusFor,
  createAugmentRuntime,
  SET_SYNERGY_BONUS,
  SET_SYNERGY_THRESHOLD,
} from './runtime';
