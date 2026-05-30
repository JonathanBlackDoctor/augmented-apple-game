// app/MatchController.ts — runtime conductor (plan §15). Wires the pure core to
// the Pixi board, pointer input, monotonic clock, SFX and the UI store. Runs a
// solo match of N rounds with an optional augment-pick step between rounds.
import { createEngine, makeRng } from '../core';
import type { AugmentHookBus, AugTier, CoreEngine, Rect, RoundConfig } from '../contracts';
import { BoardView } from '../board/BoardView';
import { computeLayout, type BoardLayout } from '../board/layout';
import { InputController, type DragHandlers } from '../input/InputController';
import { createMonotonicClock } from './clock';
import { sfx } from './sound';
import { useGameStore } from './store';
import { getSettings } from './settingsStore';

const NOOP_BUS: AugmentHookBus = { run: () => undefined };

export interface MatchPlan {
  rounds: number;
  seedBase: string;
  cols: number;
  rows: number;
  durationMs: number;
  targetSum: number;
  modeId: string;
  /** Build the accumulated augment hook bus for the owned set (Phase 1+). */
  buildHookBus?: (owned: string[]) => AugmentHookBus;
  /** Offer augments before round `roundIndex` (>=1). Omit for Phase 0. */
  rollOffer?: (roundIndex: number, owned: string[]) => { tier: AugTier; ids: string[] };
}

export class MatchController {
  private readonly board = new BoardView();
  private readonly engine: CoreEngine = createEngine();
  private readonly clock = createMonotonicClock();
  private input: InputController | null = null;
  private layout: BoardLayout | null = null;
  private parent: HTMLElement | null = null;
  private ro: ResizeObserver | null = null;

  private raf = 0;
  private seq = 0;
  private roundStart = 0;
  private comboStreak = 0;
  private roundActive = false;
  private plan: MatchPlan | null = null;
  private roundIndex = 0;
  private owned: string[] = [];

  async mount(parent: HTMLElement): Promise<void> {
    this.parent = parent;
    this.layout = this.calcLayout();
    await this.board.mount(parent, this.layout);
    this.input = new InputController(this.board.app.canvas, () => this.layout, this.handlers);
    this.input.attach();
    window.addEventListener('resize', this.onResize);
    // Re-fit when the host element resizes (not just the window) — guards against
    // "clicks land on the wrong cell" after the container size shifts.
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(parent);
  }

  startMatch(plan: MatchPlan): void {
    this.clock.resume(); // in case a restart was triggered from a paused state
    this.plan = plan;
    // Board size can come from settings → re-fit the layout before the round.
    this.layout = this.calcLayout();
    this.board.setLayout(this.layout);
    this.owned = [];
    this.roundIndex = 0;
    useGameStore.getState().startMatch(plan.rounds, plan.durationMs);
    this.beginRound();
  }

  restart(): void {
    if (this.plan) this.startMatch(this.plan);
  }

  pick(id: string): void {
    if (!this.plan) return;
    this.owned.push(id);
    useGameStore.getState().addOwned(id);
    sfx.pick();
    this.beginRound();
  }

  pause(): void {
    if (this.clock.paused) return;
    this.clock.pause();
    cancelAnimationFrame(this.raf);
  }

  resume(): void {
    if (!this.clock.paused) return;
    this.clock.resume();
    if (this.roundActive) this.loop();
  }

  destroy(): void {
    this.roundActive = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    this.ro = null;
    this.input?.detach();
    this.board.destroy();
  }

  // ---- round lifecycle ------------------------------------------------------

  private beginRound(): void {
    const plan = this.plan!;
    const cfg: RoundConfig = {
      seed: `${plan.seedBase}:r${this.roundIndex}`,
      cols: plan.cols,
      rows: plan.rows,
      durationMs: plan.durationMs,
      targetSum: plan.targetSum,
      modeId: plan.modeId,
      augmentIds: [...this.owned],
    };
    const bus = plan.buildHookBus ? plan.buildHookBus(this.owned) : NOOP_BUS;
    this.engine.init(cfg, makeRng(cfg.seed), bus);
    this.board.setBoard(this.engine.getBoard());
    this.board.showSelection(null, false);

    this.seq = 0;
    this.comboStreak = 0;
    this.roundStart = this.clock.now();
    this.roundActive = true;

    const dur = this.engineDuration();
    const st = useGameStore.getState();
    st.setRound(this.roundIndex);
    st.setRoundScore(0);
    st.setCombo(0, 0);
    useGameStore.setState({ durationMs: dur, remainingMs: dur });
    st.setPhase('round');

    this.loop();
  }

  private engineDuration(): number {
    // tick once at t=0 to anchor and read the (possibly augment-modified) total.
    return this.engine.tick(this.clock.now()).remainingMs;
  }

  private loop = (): void => {
    if (!this.roundActive) return;
    const { remainingMs, ended } = this.engine.tick(this.clock.now());
    useGameStore.getState().setRemaining(remainingMs);
    if (ended) {
      this.endRound();
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private endRound(): void {
    this.roundActive = false;
    cancelAnimationFrame(this.raf);
    const score = this.engine.getScore();
    useGameStore.getState().commitRound(score);
    sfx.end();
    this.roundIndex++;

    const plan = this.plan!;
    if (this.roundIndex >= plan.rounds) {
      this.finish();
    } else if (plan.rollOffer) {
      const { tier, ids } = plan.rollOffer(this.roundIndex, this.owned);
      const st = useGameStore.getState();
      st.setOffers(ids, tier);
      st.setPhase('augment');
    } else {
      this.beginRound();
    }
  }

  private finish(): void {
    const st = useGameStore.getState();
    st.finishMatch();
    st.setPhase('result');
    this.board.showSelection(null, false);
  }

  // ---- input handlers -------------------------------------------------------

  private handlers: DragHandlers = {
    onStart: () => {
      this.engine.setDragging(true);
      if (this.owned.includes('time.lord')) this.board.setLabelsHidden(true);
    },
    onMove: (rect: Rect | null) => {
      if (!this.roundActive || !rect) {
        this.board.showSelection(null, false);
        return;
      }
      const ev = this.engine.evaluate(rect);
      this.board.showSelection(rect, ev.valid);
    },
    onEnd: (rect: Rect | null) => {
      this.engine.setDragging(false);
      if (this.owned.includes('time.lord')) this.board.setLabelsHidden(false);
      this.board.showSelection(null, false);
      if (!this.roundActive || !rect) return;
      // A single-cell selection can't sum to the target (apples are 1–9), so a
      // stray tap is a no-op — don't punish the combo or buzz a "fail".
      if (rect.x0 === rect.x1 && rect.y0 === rect.y1 && !this.engine.evaluate(rect).valid) return;
      const res = this.engine.commit({
        seq: ++this.seq,
        rect,
        tMs: this.clock.now() - this.roundStart,
      });
      const st = useGameStore.getState();
      if ('rejected' in res) {
        this.comboStreak = 0;
        st.setCombo(0);
        sfx.fail();
        return;
      }
      this.comboStreak++;
      this.board.burst(res.cells);
      this.board.setBoard(this.engine.getBoard());
      st.setRoundScore(this.engine.getScore());
      st.setCombo(this.comboStreak, res.count);
      sfx.clear(this.comboStreak);
    },
  };

  // ---- layout ---------------------------------------------------------------

  private calcLayout(): BoardLayout {
    const w = this.parent?.clientWidth || window.innerWidth;
    const h = this.parent?.clientHeight || window.innerHeight;
    const cols = this.plan?.cols ?? 17;
    const rows = this.plan?.rows ?? 10;
    const scale = getSettings().appleScale;
    return computeLayout(cols, rows, w, h, Math.max(4, Math.round(Math.min(w, h) * 0.014)), scale);
  }

  private onResize = (): void => {
    const next = this.calcLayout();
    if (this.layout && next.width === this.layout.width && next.height === this.layout.height) return;
    this.layout = next;
    this.board.setLayout(this.layout);
  };
}
