// app/VersusController.ts — runtime conductor for the vs-AI mode. Wires the
// headless VersusMatch to the Pixi board, pointer input, monotonic clock, SFX,
// profile (anon identity) and ranking (unranked vs bot). Mirrors MatchController.
import type { Rect, Profile, PublicProfile } from '../contracts';
import { BoardView } from '../board/BoardView';
import { computeLayout, type BoardLayout } from '../board/layout';
import { pickGridDims } from '../board/orientation';
import { InputController, type DragHandlers } from '../input/InputController';
import { createMonotonicClock } from './clock';
import { sfx } from './sound';
import { useGameStore } from './store';
import { useVersusStore } from './versusStore';
import { VersusMatch } from './VersusMatch';
import { LocalProfileService, browserKV } from '../profile';
import { StandardRankingService, InMemoryRankingStore } from '../ranking';
import { difficultyForMmr, type Difficulty } from '../bot';

const DURATION = 30_000;
const TARGET = 10;
const ROUNDS = 5;

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
  // Board aspect chosen for this device's viewport (portrait → tall). Local
  // mode: player and bot share these dims, so no cross-device sync is needed.
  private cols = 17;
  private rows = 10;

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
    const dims = pickGridDims();
    this.cols = dims.cols;
    this.rows = dims.rows;
    this.match = new VersusMatch({
      seedBase: `versus:${Date.now()}`,
      difficulty: diff,
      rounds: ROUNDS,
      cols: this.cols,
      rows: this.rows,
      durationMs: DURATION,
      targetSum: TARGET,
    });
    this.comboStreak = 0;
    this.resolved = false;
    useGameStore.getState().startVersus(ROUNDS, DURATION);
    useVersusStore.getState().setOpponent(`AI 봇 · ${this.diffLabel(diff)}`, '🤖', tierLabel, false);
    this.layout = this.calcLayout();
    this.board.setLayout(this.layout);
    this.board.setBoard(this.match.myBoard());
    this.board.showSelection(null, false);
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
    this.match.pickAugment(id);
    sfx.pick();
    this.board.setBoard(this.match.myBoard());
    useGameStore.getState().setPhase('round');
    this.loop();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.input?.detach();
    this.board.destroy();
    this.match = null;
  }

  private loop = (): void => {
    const m = this.match;
    if (!m) return;
    const snap = m.tick(this.clock.now());
    this.sync();
    if (snap.phase === 'round') {
      this.raf = requestAnimationFrame(this.loop);
    } else if (snap.phase === 'augment') {
      const st = useGameStore.getState();
      st.setOffers(snap.offers, snap.offerTier ?? 'silver');
      st.setPhase('augment');
    } else {
      void this.finish();
    }
  };

  private sync(): void {
    const m = this.match;
    if (!m) return;
    const s = m.snapshot();
    const st = useGameStore.getState();
    useGameStore.setState({ durationMs: DURATION, remainingMs: s.remainingMs });
    st.setRound(s.round);
    st.setRoundScore(s.myScore);
    st.setTotalScore(s.myTotal);
    st.setCombo(this.comboStreak);
    useVersusStore
      .getState()
      .setLive(s.botTotal, s.botScore, { me: s.roundWins.me, opp: s.roundWins.bot });
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
    onStart: () => this.match?.setDragging(true),
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
      this.board.setBoard(m.myBoard());
      useGameStore.getState().setRoundScore(m.snapshot().myScore);
      useGameStore.getState().setCombo(this.comboStreak, res.count);
      sfx.clear(this.comboStreak);
    },
  };

  private calcLayout(): BoardLayout {
    const w = this.parent?.clientWidth || window.innerWidth;
    const h = this.parent?.clientHeight || window.innerHeight;
    return computeLayout(this.cols, this.rows, w, h, Math.max(4, Math.round(Math.min(w, h) * 0.014)));
  }

  private onResize = (): void => {
    this.layout = this.calcLayout();
    this.board.setLayout(this.layout);
  };
}
