// augments/index.ts — public surface of the augment system.
export { CATALOG, byId } from './data/catalog';
export { createHookBus, emptyHookBus } from './hookBus';
export { tierForRound, rollOffer, buildHookBusFor, createAugmentRuntime } from './runtime';
