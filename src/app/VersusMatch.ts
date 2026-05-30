// app/VersusMatch.ts — headless 5-round versus engine (you vs an AI bot,
// "separate boards" mode, plan §9/§13). Deterministic given the same seeds, the
// same human commits, and the same bot rng. Drives the vs-AI UI and is exercised
// end-to-end in tests. No DOM/Pixi here — pure orchestration over the core.
import { createEngine, makeRng } from '../core';
import type {
  AugmentHookBus,
  AugTier,
  Board,
  CommitResult,
  CoreEngine,
  Rect,
  RoundConfig,
  SeededRng,
} from '../contracts';
import { decide, type Difficulty } from '../bot';
import { tierForRound, rollOffer, buildHookBusFor } from '../augments/runtime';

export type VersusPhase = 'round' | 'augment' | 'matchResult';

export interface VersusOptions {
  seedBase: string;
  rounds: number;
  cols: number;
  rows: number;
  durationMs: number;
  targetSum: number;
  difficulty: Difficulty;
  winnerBonus: number;
}

export interface VersusSnapshot {
  phase: VersusPhase;
  round: number; // 0-based
  rounds: number;
  remainingMs: number;
  myScore: number;
  botScore: number;
  myTotal: number;
  botTotal: number;
  roundWins: { me: number; bot: number };
  offers: string[];
  offerTier: AugTier | null;
  myOwned: string[];
  winner: 'me' | 'bot' | 'draw' | null;
}

const DEFAULTS = { rounds: 5, cols: 17, rows: 10, durationMs: 30_000, targetSum: 10, winnerBonus: 50 };

export class VersusMatch {
  private readonly opts: VersusOptions;
  private readonly myEngine: CoreEngine = createEngine();
  private readonly botEngine: CoreEngine = createEngine();
  private readonly botRng: SeededRng;

  private round = 0;
  private phase: VersusPhase = 'round';
  private roundStartMs: number | null = null;
  private remainingMs = 0;
  private mySeq = 0;
  private botSeq = 0;
  private botNextAt = 0;
  private botActive = true;

  private myTotal = 0;
  private botTotal = 0;
  private roundWins = { me: 0, bot: 0 };
  private myOwned: string[] = [];
  private botOwned: string[] = [];
  private offers: string[] = [];
  private offerTier: AugTier | null = null;
  private winner: 'me' | 'bot' | 'draw' | null = null;

  constructor(opts: Partial<VersusOptions> & { seedBase: string; difficulty: Difficulty }) {
    this.opts = {
      seedBase: opts.seedBase,
      rounds: opts.rounds ?? DEFAULTS.rounds,
      cols: opts.cols ?? DEFAULTS.cols,
      rows: opts.rows ?? DEFAULTS.rows,
      durationMs: opts.durationMs ?? DEFAULTS.durationMs,
      targetSum: opts.targetSum ?? DEFAULTS.targetSum,
      difficulty: opts.difficulty,
      winnerBonus: opts.winnerBonus ?? DEFAULTS.winnerBonus,
    };
    this.botRng = makeRng(`${this.opts.seedBase}:bot`);
    this.beginRound();
  }

  private roundSeed(r: number): string {
    return `${this.opts.seedBase}:r${r}`;
  }

  private hookBus(owned: string[]): AugmentHookBus {
    return buildHookBusFor(owned);
  }

  private beginRound(): void {
    const o = this.opts;
    const mkCfg = (owned: string[]): RoundConfig => ({
      seed: this.roundSeed(this.round),
      cols: o.cols,
      rows: o.rows,
      durationMs: o.durationMs,
      targetSum: o.targetSum,
      modeId: 'separate',
      augmentIds: [...owned],
    });
    const seed = this.roundSeed(this.round);
    this.myEngine.init(mkCfg(this.myOwned), makeRng(seed), this.hookBus(this.myOwned));
    this.botEngine.init(mkCfg(this.botOwned), makeRng(seed), this.hookBus(this.botOwned));
    this.remainingMs = o.durationMs;
    this.roundStartMs = null;
    this.mySeq = 0;
    this.botSeq = 0;
    this.botNextAt = 500 + this.botRng.int(600); // first "think" before acting
    this.botActive = true;
    this.phase = 'round';
  }

  myBoard(): Readonly<Board> {
    return this.myEngine.getBoard();
  }

  /** Preview validity for drag highlighting (UI only). */
  evaluate(rect: Rect): boolean {
    return this.myEngine.evaluate(rect).valid;
  }

  setDragging(d: boolean): void {
    this.myEngine.setDragging(d);
  }

  /** Apply a human removal (UI drag-end). No-op outside the round phase. */
  myCommit(rect: Rect, nowMs: number): CommitResult | null {
    if (this.phase !== 'round') return null;
    return this.myEngine.commit({
      seq: ++this.mySeq,
      rect,
      tMs: nowMs - (this.roundStartMs ?? nowMs),
    });
  }

  /** Advance timers + bot AI to `nowMs` (monotonic ms). Returns a snapshot. */
  tick(nowMs: number): VersusSnapshot {
    if (this.phase === 'round') {
      if (this.roundStartMs === null) this.roundStartMs = nowMs;
      const my = this.myEngine.tick(nowMs);
      this.botEngine.tick(nowMs);
      this.remainingMs = my.remainingMs;
      this.runBot(nowMs);
      if (my.ended) this.endRound();
    }
    return this.snapshot();
  }

  private runBot(nowMs: number): void {
    const elapsed = nowMs - (this.roundStartMs ?? nowMs);
    let guard = 0;
    while (this.botActive && elapsed >= this.botNextAt && guard++ < 12) {
      const d = decide(this.botEngine.getBoard(), this.opts.targetSum, this.opts.difficulty, this.botRng);
      if (!d) {
        this.botActive = false;
        break;
      }
      this.botEngine.commit({ seq: ++this.botSeq, rect: d.rect, tMs: elapsed });
      this.botNextAt += d.delayMs;
    }
  }

  private endRound(): void {
    const my = this.myEngine.getScore();
    const bot = this.botEngine.getScore();
    this.myTotal += my;
    this.botTotal += bot;
    if (my > bot) {
      this.myTotal += this.opts.winnerBonus;
      this.roundWins.me++;
    } else if (bot > my) {
      this.botTotal += this.opts.winnerBonus;
      this.roundWins.bot++;
    }
    if (this.round + 1 >= this.opts.rounds) {
      this.winner =
        this.myTotal > this.botTotal ? 'me' : this.botTotal > this.myTotal ? 'bot' : 'draw';
      this.phase = 'matchResult';
    } else {
      const tier = tierForRound(this.round + 1);
      this.offerTier = tier;
      this.offers = rollOffer(tier, makeRng(`${this.roundSeed(this.round + 1)}:offer:me`), this.myOwned);
      this.phase = 'augment';
    }
  }

  /** Human picks an augment id; the bot auto-picks its own; next round begins. */
  pickAugment(id: string): void {
    if (this.phase !== 'augment') return;
    this.myOwned.push(id);
    const tier = this.offerTier ?? tierForRound(this.round + 1);
    const botOffers = rollOffer(tier, makeRng(`${this.roundSeed(this.round + 1)}:offer:bot`), this.botOwned);
    if (botOffers.length > 0) this.botOwned.push(botOffers[this.botRng.int(botOffers.length)]);
    this.round++;
    this.beginRound();
  }

  snapshot(): VersusSnapshot {
    return {
      phase: this.phase,
      round: this.round,
      rounds: this.opts.rounds,
      remainingMs: this.remainingMs,
      myScore: this.myEngine.getScore(),
      botScore: this.botEngine.getScore(),
      myTotal: this.myTotal,
      botTotal: this.botTotal,
      roundWins: { ...this.roundWins },
      offers: [...this.offers],
      offerTier: this.offerTier,
      myOwned: [...this.myOwned],
      winner: this.winner,
    };
  }
}
