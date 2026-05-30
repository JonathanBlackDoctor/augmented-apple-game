// app/VersusController.ts — runtime conductor for the vs-AI mode. Wires the
// headless VersusMatch to the Pixi board, pointer input, monotonic clock, SFX,
// profile (anon identity) and ranking (unranked vs bot). Mirrors MatchController.
import type { Rect, Profile, PublicProfile } from '../contracts';
import { BoardView } from '../board/BoardView';
import { computeLayout, type BoardLayout } from '../board/layout';
import { InputController, type DragHandlers } from '../input/InputController';
import { createMonotonicClock } from './clock';
import { sfx } from './sound';
import { useGameStore } from './store';
import { useVersusStore } from './versusStore';
import { VersusMatch, type VersusPhase } from './VersusMatch';
import { LocalProfileService, browserKV } from '../profile';
import { StandardRankingService, InMemoryRankingStore } from '../ranking';
import { difficultyForMmr, type Difficulty } from '../bot';

const COLS = 17;
const ROWS = 10;
const DURATION = 30_000;
const TARGET = 10;
const ROUNDS = 5;
export const AUGMENT_MS = 12_000; // augment-pick window before auto-picking
export const ROUND_CHECK_MS = 3_500; // mid-round review screen duration

export class VersusController {
  private readonly board = new BoardView();
  private readonly clock = createMonotonicClock();
  private input: InputController | null = null;
  private layout: BoardLayout | null = null;
  private parent: HTMLElement | null = null;

  private raf = 0;
  private comboStreak = 0;
  private match: VersusMatch | null = null;
  private resolved = false;
  private lastPhase: VersusPhase | null = null;
  private prevBotScore = 0;

  private readonly profileSvc = new LocalProfileService(browserKV());
  private readonly ranking = new StandardRankingService(new InMemoryRankingStore());
  private profile: Profile | null = null;

  async mount(parent: HTMLElement): Promise<void> {
    this.parent = parent;
    this.layout = this.calcLayout();
    await this.board.mount(parent, this.layout);
    this.input = new InputController(this.board.app.canvas, () => this.layout, this.handlers);
    this.input.attach();
    window.addEventListener('resize', this.onResize);
    this.profile = await this.profileSvc.signInAnon();
  }

  startVersus(): void {
    const mmr = this.profile?.mmr ?? 1000;
    const diff = difficultyForMmr(mmr);
    const tierLabel = diff === 'hard' ? 'Gold' : diff === 'normal' ? 'Silver' : 'Bronze';
    this.match = new VersusMatch({
      seedBase: `versus:${Date.now()}`,
      difficulty: diff,
      rounds: ROUNDS,
      cols: COLS,
      rows: ROWS,
      durationMs: DURATION,
      targetSum: TARGET,
      augmentMs: AUGMENT_MS,
      roundCheckMs: ROUND_CHECK_MS,
    });
    this.comboStreak = 0;
    this.resolved = false;
    this.lastPhase = null;
    this.prevBotScore = 0;
    useGameStore.getState().startVersus(ROUNDS, DURATION);
    useVersusStore.getState().setOpponent(`AI 봇 · ${this.diffLabel(diff)}`, '🤖', tierLabel, false);
    this.board.setBoard(this.match.myBoard());
    this.board.showSelection(null, false);
    cancelAnimationFrame(this.raf); // avoid a double loop on restart
    this.loop();
  }

  private diffLabel(d: Difficulty): string {
    return d === 'hard' ? '어려움' : d === 'normal' ? '보통' : '쉬움';
  }

  restart(): void {
    this.startVersus();
  }

  pick(id: string): void {
    if (!this.match) return;
    // The continuous loop drives the round transition + board refresh; here we
    // only register the pick. (No-op if we're past the augment window.)
    this.match.pickAugment(id, this.clock.now());
    sfx.pick();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.input?.detach();
    this.board.destroy();
    this.match = null;
  }

  // Single continuous rAF driver: keeps ticking through the timed roundCheck and
  // augment overlays so their countdowns advance (and auto-pick fires). Started
  // once per match in startVersus(); never re-entered elsewhere.
  private loop = (): void => {
    const m = this.match;
    if (!m) return;
    const snap = m.tick(this.clock.now());
    this.sync();
    const st = useGameStore.getState();
    const vs = useVersusStore.getState();
    if (snap.phase === 'matchResult') {
      void this.finish();
      return;
    }
    if (snap.phase === 'round') {
      // A fresh round just began (augment → round): refresh the board + combo.
      if (this.lastPhase === 'augment') {
        this.board.setBoard(m.myBoard());
        this.comboStreak = 0;
        useGameStore.getState().setCombo(0);
      }
      st.setPhase('round');
    } else if (snap.phase === 'roundCheck') {
      const r = snap.lastRound;
      if (r) {
        vs.setRoundCheck(
          r.myScore,
          r.botScore,
          r.winner === 'me' ? 'me' : r.winner === 'bot' ? 'opp' : 'draw',
          snap.round,
          snap.phaseRemainingMs,
        );
      } else {
        vs.setOverlayRemaining(snap.phaseRemainingMs);
      }
      st.setPhase('roundCheck');
    } else if (snap.phase === 'augment') {
      st.setOffers(snap.offers, snap.offerTier ?? 'silver');
      vs.setOverlayRemaining(snap.phaseRemainingMs);
      st.setPhase('augment');
    }
    this.lastPhase = snap.phase;
    this.raf = requestAnimationFrame(this.loop);
  };

  private sync(): void {
    const m = this.match;
    if (!m) return;
    const s = m.snapshot();
    const st = useGameStore.getState();
    useGameStore.setState({ durationMs: DURATION, remainingMs: s.remainingMs, owned: s.myOwned });
    st.setRound(s.round);
    st.setRoundScore(s.myScore);
    st.setTotalScore(s.myTotal);
    st.setCombo(this.comboStreak);
    useVersusStore
      .getState()
      .setLive(s.botTotal, s.botScore, { me: s.roundWins.me, opp: s.roundWins.bot });
    // Opponent "+N" popup: bot's per-round score is cumulative, so a positive
    // frame-to-frame delta is a fresh clear (round reset → 0 yields a negative
    // delta we ignore).
    const delta = s.botScore - this.prevBotScore;
    if (delta > 0) useVersusStore.getState().bumpOppGain(delta);
    this.prevBotScore = s.botScore;
  }

  private async finish(): Promise<void> {
    const m = this.match;
    if (!m || this.resolved) return;
    this.resolved = true;
    const s = m.snapshot();
    const winner = s.winner === 'me' ? 'me' : s.winner === 'bot' ? 'opp' : 'draw';
    let mmrDelta: number | null = 0;
    if (this.profile) {
      const opp: PublicProfile = {
        uid: 'bot',
        nickname: 'AI',
        avatar: '🤖',
        tier: 'Silver',
        mmr: this.profile.mmr,
      };
      const result = winner === 'me' ? 'win' : winner === 'opp' ? 'loss' : 'draw';
      const r = await this.ranking.applyResult(this.profile, opp, result, false); // bot = unranked
      mmrDelta = r.mmrDelta;
      this.profileSvc.persist();
    }
    this.board.showSelection(null, false);
    useVersusStore.getState().setResult(winner, mmrDelta);
    useGameStore.getState().setPhase('result');
  }

  private handlers: DragHandlers = {
    onStart: () => {
      this.match?.setDragging(true);
      if (this.match?.snapshot().myOwned.includes('time.lord')) this.board.setLabelsHidden(true);
    },
    onMove: (rect: Rect | null) => {
      if (!this.match || !rect) {
        this.board.showSelection(null, false);
        return;
      }
      this.board.showSelection(rect, this.match.evaluate(rect));
    },
    onEnd: (rect: Rect | null) => {
      const m = this.match;
      if (!m) return;
      m.setDragging(false);
      if (m.snapshot().myOwned.includes('time.lord')) this.board.setLabelsHidden(false);
      this.board.showSelection(null, false);
      if (!rect) return;
      const res = m.myCommit(rect, this.clock.now());
      if (!res || 'rejected' in res) {
        this.comboStreak = 0;
        useGameStore.getState().setCombo(0);
        if (res) sfx.fail();
        return;
      }
      this.comboStreak++;
      this.board.burst(res.cells);
      this.board.scorePopup(res.cells, res.finalScore);
      this.board.setBoard(m.myBoard());
      useGameStore.getState().setRoundScore(m.snapshot().myScore);
      useGameStore.getState().setCombo(this.comboStreak, res.count);
      sfx.clear(this.comboStreak);
    },
  };

  private calcLayout(): BoardLayout {
    const w = this.parent?.clientWidth || window.innerWidth;
    const h = this.parent?.clientHeight || window.innerHeight;
    return computeLayout(COLS, ROWS, w, h, Math.max(6, Math.round(Math.min(w, h) * 0.02)));
  }

  private onResize = (): void => {
    this.layout = this.calcLayout();
    this.board.setLayout(this.layout);
  };
}
