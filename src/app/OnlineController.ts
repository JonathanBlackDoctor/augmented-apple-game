// app/OnlineController.ts — runtime conductor for online 1v1. Wires OnlineMatch
// to the Pixi board, input, clock, SFX, the Firebase backend + anonymous profile,
// and the onlineStore. Handles room create/join, deep-link auto-join, nickname.
import type { Rect, Profile, ProfileService, PublicProfile, RankingService } from '../contracts';
import { makeRng } from '../core';
import { BoardView } from '../board/BoardView';
import { computeLayout, type BoardLayout } from '../board/layout';
import { pickGridDims } from '../board/orientation';
import { InputController, type DragHandlers } from '../input/InputController';
import { createMonotonicClock } from './clock';
import { START_MMR } from '../ranking/elo';
import { sfx } from './sound';
import { playActivation, playClear, updateAmbient } from './augmentFx';
import { useOnlineStore } from './onlineStore';
import { useGameStore } from './store';
import { getSettings } from './settingsStore';
import { OnlineMatch, type OnlineSnapshot, type Role } from './OnlineMatch';
import { InMemoryNetBackend } from '../net/memoryBackend';
import { BackendNetSession } from '../net/session';
import type { NetBackend } from '../net/backend';
import { FIREBASE_CONFIGURED } from '../net/firebaseConfig';
import { makeRoomCode, isValidRoomCode, buildRoomLink, parseDeepLink } from '../matchmaking';
import { StandardRankingService, InMemoryRankingStore } from '../ranking';
import { LocalProfileService, browserKV } from '../profile';

const DURATION = 30_000;

export class OnlineController {
  private readonly board = new BoardView();
  private readonly clock = createMonotonicClock();
  private input: InputController | null = null;
  private layout: BoardLayout | null = null;
  private parent: HTMLElement | null = null;

  private raf = 0;
  private comboStreak = 0;
  private match: OnlineMatch | null = null;
  private backend: NetBackend | null = null;
  private ranking: RankingService = new StandardRankingService(new InMemoryRankingStore());
  private profile: Profile | null = null;
  private profileSvc: ProfileService | null = null;
  private persistProfile: () => Promise<void> = async () => {};
  private resolved = false;
  private started = false;
  private lastRound = -1;
  private lastPhase = '';
  private pendingActivation: string | null = null;
  private activationTimer = 0;

  async mount(parent: HTMLElement): Promise<void> {
    this.parent = parent;
    this.layout = this.calc();
    await this.board.mount(parent, this.layout);
    this.input = new InputController(this.board.app.canvas, () => this.layout, this.handlers);
    this.input.attach();
    window.addEventListener('resize', this.onResize);
    this.backend = await this.makeBackend();
    this.profile = await this.signIn();
    if (FIREBASE_CONFIGURED) {
      const { FirebaseRankingStore } = await import('../ranking/firebaseStore');
      this.ranking = new StandardRankingService(new FirebaseRankingStore());
    }
    useOnlineStore.getState().set({ myName: this.profile.nickname });
    const dl = parseDeepLink(window.location.search);
    if (dl.room && isValidRoomCode(dl.room.toUpperCase())) await this.join(dl.room);
    else useOnlineStore.getState().set({ stage: 'menu' });
  }

  private async makeBackend(): Promise<NetBackend> {
    if (FIREBASE_CONFIGURED) {
      const { FirebaseNetBackend } = await import('../net/firebaseBackend');
      return new FirebaseNetBackend();
    }
    return new InMemoryNetBackend();
  }

  private async signIn(): Promise<Profile> {
    if (FIREBASE_CONFIGURED) {
      const { FirebaseProfileService } = await import('../profile/firebase');
      const svc = new FirebaseProfileService();
      this.profileSvc = svc;
      this.persistProfile = () => svc.save();
      return svc.signInAnon();
    }
    const svc = new LocalProfileService(browserKV());
    this.profileSvc = svc;
    this.persistProfile = async () => svc.persist();
    return svc.signInAnon();
  }

  async setNickname(n: string): Promise<void> {
    if (!this.profileSvc) return;
    await this.profileSvc.setNickname(n);
    this.profile = this.profileSvc.get();
    useOnlineStore.getState().set({ myName: this.profile.nickname });
  }

  private pub(): PublicProfile {
    const p = this.profile!;
    return { uid: p.uid, nickname: p.nickname, avatar: p.avatar, tier: p.tier, mmr: p.mmr };
  }

  async create(): Promise<void> {
    const code = makeRoomCode(makeRng(`${Date.now()}:${Math.random()}`));
    const base = window.location.href.split('?')[0];
    const link = buildRoomLink(base, code, this.profile?.uid);
    useOnlineStore.getState().set({ stage: 'hosting', roomCode: code, link, error: null });
    await this.enter(code, 'host');
  }

  async join(code: string): Promise<void> {
    const c = code.toUpperCase();
    if (!isValidRoomCode(c)) {
      useOnlineStore.getState().set({ error: '코드 형식이 올바르지 않아요 (3자리)' });
      return;
    }
    useOnlineStore.getState().set({ stage: 'connecting', roomCode: c, error: null });
    await this.enter(c, 'guest');
  }

  private async enter(code: string, role: Role): Promise<void> {
    if (!this.backend) return;
    const session = new BackendNetSession(this.backend);
    // The host (re)creates the room, so wipe any leftover events from a previous
    // match that reused this code; the guest joins into that clean room.
    await session.join(code, this.pub(), { reset: role === 'host' });
    // The host fixes the board aspect from its own viewport (portrait → tall) and
    // broadcasts it on countdown; the guest joins with defaults and then adopts it,
    // so both clients render the same shared-seed board.
    const dims = role === 'host' ? pickGridDims() : undefined;
    this.match = new OnlineMatch({
      session,
      role,
      self: this.pub(),
      roomId: code,
      durationMs: DURATION,
      cols: dims?.cols,
      rows: dims?.rows,
    });
    this.resolved = false;
    this.started = false;
    this.comboStreak = 0;
    this.lastRound = -1;
    this.lastPhase = '';
    await this.match.start(this.clock.now());
    this.loop();
  }

  private loop = (): void => {
    const m = this.match;
    if (!m) return;
    const s = m.tick(this.clock.now());
    this.sync(s);
    if (s.phase === 'matchResult') {
      void this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private sync(s: OnlineSnapshot): void {
    const st = useOnlineStore.getState();
    if (!this.started && s.phase !== 'lobby') {
      this.started = true;
      st.set({ stage: 'playing' });
    }
    if (s.phase === 'round' && this.match && (s.round !== this.lastRound || this.lastPhase !== 'round')) {
      // Re-fit the layout to the agreed board aspect (the guest may have just
      // adopted the host's dims during countdown).
      this.layout = this.calc();
      this.board.setLayout(this.layout);
      this.board.resetFx();
      this.board.setBoard(this.match.myBoard());
      this.board.showSelection(null, false);
      this.comboStreak = 0;
      const activate = this.pendingActivation;
      this.pendingActivation = null;
      clearTimeout(this.activationTimer);
      if (activate) {
        this.activationTimer = window.setTimeout(() => {
          if (useOnlineStore.getState().phase === 'round') playActivation(this.board, activate);
        }, 140);
      }
    } else if (s.phase !== 'round' && this.lastPhase === 'round') {
      this.board.resetFx();
    }
    if (s.phase === 'round') updateAmbient(this.board, s.myOwned, s.remainingMs, DURATION);
    this.lastRound = s.round;
    this.lastPhase = s.phase;
    st.set({
      phase: s.phase,
      round: s.round,
      rounds: s.rounds,
      remainingMs: s.remainingMs,
      durationMs: DURATION,
      myScore: s.myScore,
      oppScore: s.oppScore,
      myTotal: s.myTotal,
      oppTotal: s.oppTotal,
      roundWins: s.roundWins,
      offers: s.offers,
      offerTier: s.offerTier,
      rerollsLeft: s.rerollsLeft,
      oppName: s.oppName,
      oppPresent: s.oppPresent,
      oppConnected: s.oppConnected,
      oppLeft: s.oppLeft,
      noOpponent: s.noOpponent,
      combo: this.comboStreak,
      owned: s.myOwned,
    });
  }

  pick(id: string): void {
    this.match?.pickAugment(id);
    this.pendingActivation = id; // activation FX plays when the next round opens
    sfx.pick();
  }

  /** Spend a reroll token on the current augment offer (no-op if none left). */
  reroll(): void {
    if (this.match?.reroll()) {
      const s = this.match.snapshot();
      useOnlineStore.getState().set({
        offers: s.offers,
        offerTier: s.offerTier,
        rerollsLeft: s.rerollsLeft,
      });
      sfx.pick();
    }
  }

  private async finish(): Promise<void> {
    const m = this.match;
    if (!m || this.resolved) return;
    this.resolved = true;
    const s = m.snapshot();
    const winner = s.winner ?? 'draw';
    let mmrDelta: number | null = null;
    if (this.profile && s.oppPresent) {
      const opp: PublicProfile = {
        uid: 'opp',
        nickname: s.oppName,
        avatar: '🍏',
        tier: 'Silver',
        mmr: this.profile.mmr,
      };
      const result = winner === 'me' ? 'win' : winner === 'opp' ? 'loss' : 'draw';
      const r = await this.ranking.applyResult(this.profile, opp, result, true);
      mmrDelta = r.mmrDelta;
      await this.persistProfile();
    }
    this.board.showSelection(null, false);
    // New personal-best total (shared across modes)? Capture before finishMatch().
    const gs = useGameStore.getState();
    const newRecord = s.myTotal > gs.bestTotal;
    gs.setTotalScore(s.myTotal);
    gs.finishMatch();
    useOnlineStore.getState().set({
      stage: 'result',
      winner,
      mmrDelta,
      mmr: this.profile?.mmr ?? START_MMR,
      newRecord,
      roundHistory: s.roundHistory,
    });
  }

  private handlers: DragHandlers = {
    onStart: () => {
      this.match?.setDragging(true);
      if (this.match?.snapshot().myOwned.includes('time.lord')) {
        this.board.setLabelsHidden(true);
        this.board.effects?.desat(true);
      }
    },
    onMove: (rect: Rect | null) => {
      if (!this.match || !rect) {
        this.board.showSelection(null, false);
        return;
      }
      const ev = this.match.evalDetail(rect);
      this.board.showSelection(rect, ev.valid, ev.sum);
    },
    onEnd: (rect: Rect | null) => {
      const m = this.match;
      if (!m) return;
      m.setDragging(false);
      if (m.snapshot().myOwned.includes('time.lord')) {
        this.board.setLabelsHidden(false);
        this.board.effects?.desat(false);
      }
      this.board.showSelection(null, false);
      if (!rect) return;
      const evalBefore = m.evalDetail(rect);
      const preTags = m.myBoard().tags?.slice() ?? [];
      const res = m.myCommit(rect);
      if (!res || 'rejected' in res) {
        this.comboStreak = 0;
        if (res) sfx.fail();
        return;
      }
      this.comboStreak++;
      this.board.burst(res.cells);
      this.board.setBoard(m.myBoard());
      sfx.clear(this.comboStreak);
      const snap = m.snapshot();
      playClear(this.board, snap.myOwned, {
        cells: res.cells,
        tags: res.cells.map((i) => preTags[i] ?? 'normal'),
        count: res.count,
        comboStreak: this.comboStreak,
        sum: evalBefore.sum,
        baseScore: res.baseScore,
        finalScore: res.finalScore,
        comboMultiplier: res.comboMultiplier,
        remainingMs: snap.remainingMs,
        durationMs: DURATION,
      });
    },
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.activationTimer);
    window.removeEventListener('resize', this.onResize);
    this.input?.detach();
    this.board.destroy();
    this.match?.destroy();
    this.match = null;
  }

  private calc(): BoardLayout {
    const w = this.parent?.clientWidth || window.innerWidth;
    const h = this.parent?.clientHeight || window.innerHeight;
    // Follow the match's agreed board aspect (host-chosen, guest-adopted).
    const d = this.match?.dims() ?? pickGridDims();
    const scale = getSettings().appleScale;
    return computeLayout(d.cols, d.rows, w, h, Math.max(4, Math.round(Math.min(w, h) * 0.014)), scale);
  }
  private onResize = (): void => {
    this.layout = this.calc();
    this.board.setLayout(this.layout);
  };
}
