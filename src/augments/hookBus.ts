// augments/hookBus.ts — folds the owned augments' hooks at each core hook point
// (plan §5.3, §8.2). The core calls bus.run(point, ...args); semantics here:
//   modifyRoundConfig  -> thread the config through each augment
//   onBoardInit        -> side-effecting, each augment gets an independent fork
//   validateSelection  -> OR the accept flags, last cells override wins
//   onClear            -> thread the ClearResult through each augment
//   onTick             -> thread the TickState through each augment
//   emitSabotage       -> concat all events
//   onIncomingSabotage -> side-effecting
import type {
  Augment,
  AugmentHookBus,
  HookPoint,
  ClearResult,
  ClearCtx,
  SelCtx,
  SelOverride,
  TickState,
  TickCtx,
  RoundConfig,
  Board,
  SabotageEvent,
  SabCtx,
} from '../contracts';
import type { SeededRng } from '../contracts';

export function createHookBus(augments: Augment[]): AugmentHookBus {
  return {
    run(point: HookPoint, ...args: any[]): any {
      switch (point) {
        case 'modifyRoundConfig': {
          let cfg = args[0] as RoundConfig;
          for (const a of augments) if (a.hooks.modifyRoundConfig) cfg = a.hooks.modifyRoundConfig(cfg);
          return cfg;
        }
        case 'onBoardInit': {
          const board = args[0] as Board;
          const rng = args[1] as SeededRng;
          for (const a of augments) a.hooks.onBoardInit?.(board, rng.fork(a.id));
          return undefined;
        }
        case 'validateSelection': {
          const ctx = args[0] as SelCtx;
          let accept = false;
          let cells: number[] | undefined;
          for (const a of augments) {
            const r = a.hooks.validateSelection?.(ctx);
            if (r) {
              if (r.accept) accept = true;
              if (r.cells) cells = r.cells;
            }
          }
          return accept || cells ? ({ accept, cells } as Partial<SelOverride>) : undefined;
        }
        case 'onClear': {
          let result = args[0] as ClearResult;
          const ctx = args[1] as ClearCtx;
          for (const a of augments) if (a.hooks.onClear) result = a.hooks.onClear(result, ctx);
          return result;
        }
        case 'onTick': {
          let state = args[0] as TickState;
          const ctx = args[1] as TickCtx;
          for (const a of augments) if (a.hooks.onTick) state = a.hooks.onTick(state, ctx);
          return state;
        }
        case 'emitSabotage': {
          const ctx = args[0] as SabCtx;
          const out: SabotageEvent[] = [];
          for (const a of augments) {
            const evs = a.hooks.emitSabotage?.(ctx);
            if (evs) out.push(...evs);
          }
          return out;
        }
        case 'onIncomingSabotage': {
          const ev = args[0] as SabotageEvent;
          const ctx = args[1] as SabCtx;
          for (const a of augments) a.hooks.onIncomingSabotage?.(ev, ctx);
          return undefined;
        }
        default:
          return undefined;
      }
    },
  };
}

export const emptyHookBus: AugmentHookBus = createHookBus([]);
