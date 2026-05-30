// core/index.ts — public surface of the pure engine.
export { makeRng } from './rng';
export {
  generateBoard,
  rectToCells,
  normalizeRect,
  cellIndex,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  DEFAULT_DURATION_MS,
  DEFAULT_TARGET_SUM,
} from './board';
export { createEngine } from './engine';
