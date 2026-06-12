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
import { START_MMR, tierFromMmr } from '../ranking/elo';
import { sfx } from './sound';
import { playActivation, playClear, updateAmbient } from './augmentFx';
import {
  useOnlineStore,
  ONLINE_AUGMENT_MS,
  ONLINE_PRE_ROUND_MS,
  ONLINE_ROUND_CHECK_MS,
} from './onlineStore';
import type { RoundResult } from './versusStore';
import { useGameStore, type Phase } from './store';
import { getSettings } from './settingsStore';
import { OnlineMatch, type OnlineSnapshot, type Role } from './OnlineMatch';
import { InMemoryNetBackend } from '../net/memoryBackend';
import { BackendNetSession } from '../net/session';
import type { NetBackend } from '../net/backend';
import { FIREBASE_CONFIGURED } from '../net/firebaseConfig';
import { makeRoomCode, isValidRoomCode, buildRoomLink, parseDeepLink } from '../matchmaking';
import { NO_LOBBY, type PublicLobby } from '../matchmaking/lobby';
import { NO_PRESENCE, type RoomPresence } from '../matchmaking/presence';
import { StandardRankingService, InMemoryRankingStore } from '../ranking';
import { LocalProfileService, browserKV } from '../profile';
import { COMPANION_ID, COMPANION_FIRST_MS, COMPANION_INTERVAL_MS } from './companion';

const DURATION = 30_000;

export class OnlineController {
  private readonly board = new BoardView();
  private readonly clock = createMonotonicClock();
  private input: InputController | null = null;
  private layout: BoardLayout | null = null;
  private parent: HTMLElement | null = null;

  private raf = 0;
  private comboStreak = 0;
  private prevOppScore = 0; // tracks the opponent's per-round score for "+N" pulses
  private match: OnlineMatch | null = null;
  private backend: NetBackend | null = null;
  private lobby: PublicLobby = NO_LOBBY;
  private advertised = false; // currently listed in the public lobby
  private presence: RoomPresence = NO_PRESENCE;
  private heldRoom: string | null = null; // private invite room we currently hold
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
  // 새콤이 companion (board.companion): auto-clears on MY board at a fixed cadence.
  private companionOn = false;
  private companionStart = 0;
  private companionNextAt = 0;

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
      const { getDb } = await import('../net/firebaseApp');
      const { FirebaseLobby } = await import('../matchmaking/lobby');
      const { FirebaseRoomPresence } = await import('../matchmaking/presence');
      this.lobby = new FirebaseLobby(getDb());
      this.presence = new FirebaseRoomPresence(getDb());
    }
    useOnlineStore.getState().set({ myName: this.profile.nickname });
    const dl = parseDeepLink(window.location.search);
    if (dl.room) {
      // Arrived via a 1:1 invite link.
      useOnlineStore.getState().set({ fromInvite: true });
      const c = dl.room.toUpperCase();
      if (!isValidRoomCode(c)) {
        // Malformed (broken) link → straight to the expired screen.
        useOnlineStore.getState().set({ stage: 'connecting', noOpponent: true });
      } else if (await this.presence.isHeld(c)) {
        // The host is still waiting in the room → join as usual.
        await this.join(c);
      } else {
        // The host has already left (its room hold auto-clears on disconnect), so
        // this invite link is dead. Surface the expired screen immediately WITHOUT
        // joining: joining a dead room would replay its stale countdown event and
        // auto-start a one-sided match the player could never finish.
        useOnlineStore.getState().set({ stage: 'connecting', noOpponent: true });
      }
    } else {
      useOnlineStore.getState().set({ stage: 'menu' });
    }
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
    useOnlineStore.getState().set({ stage: 'hosting', roomCode: code, link, error: null, isPublic: false });
    // Mark the room as live so anyone following the invite link knows the host is
    // here; the hold auto-clears on disconnect and on release (leaving / matched).
    this.heldRoom = code;
    void this.presence.hold(code);
    await this.enter(code, 'host');
  }

  /** Code-less public match: join whoever is already waiting in the public lobby,
   *  otherwise host a public room and wait for any web player to be matched in. */
  async quickMatch(): Promise<void> {
    const uid = this.profile?.uid ?? '';
    useOnlineStore.getState().set({ stage: 'connecting', error: null, isPublic: true });
    let open: string | null = null;
    try {
      open = await this.lobby.findOpenRoom(uid);
    } catch {
      /* lobby read failed → fall back to hosting a public room */
    }
    if (open) {
      await this.join(open);
      return;
    }
    const code = makeRoomCode(makeRng(`${Date.now()}:${Math.random()}`));
    try {
      await this.lobby.advertise(uid, code);
      this.advertised = true;
    } catch {
      /* advertise failed → still host; we just won't be auto-discovered */
    }
    useOnlineStore.getState().set({ stage: 'hosting', roomCode: code, link: '', error: null, isPublic: true });
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
    // Each client picks the board aspect that fits ITS OWN viewport (portrait →
    // tall). Boards stay fair across orientations because generateBoard() makes a
    // portrait board the exact transpose of the landscape one for the same seed
    // (same apples, rotated 90°), so each player sees comfortably-sized apples on
    // their own screen regardless of the opponent's device.
    const dims = pickGridDims();
    this.match = new OnlineMatch({
      session,
      role,
      self: this.pub(),
      roomId: code,
      durationMs: DURATION,
      augmentMs: ONLINE_AUGMENT_MS,
      preRoundMs: ONLINE_PRE_ROUND_MS,
      roundCheckMs: ONLINE_ROUND_CHECK_MS,
      cols: dims.cols,
      rows: dims.rows,
    });
    this.resolved = false;
    this.started = false;
    this.comboStreak = 0;
    this.prevOppScore = 0;
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
    // Once an opponent is matched in, pull our public-lobby advertisement and our
    // invite-room hold so no third player can be routed into this room.
    if (this.advertised && s.oppPresent) this.withdrawLobby();
    if (this.heldRoom && s.oppPresent) this.releasePresence();
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
      this.armCompanion(s);
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
      this.companionOn = false;
    }
    if (s.phase === 'round') {
      updateAmbient(this.board, s.myOwned, s.remainingMs, s.roundDurationMs);
      this.tickCompanion();
    }

    // Opponent "+N" popup: their per-round score is cumulative within a round, so a
    // positive frame-to-frame delta is a fresh clear (round reset → 0 yields a
    // negative delta we ignore). Mirrors VersusController.sync.
    const oppDelta = s.oppScore - this.prevOppScore;
    if (oppDelta > 0) {
      useOnlineStore.setState((c) => ({ oppGainSeq: c.oppGainSeq + 1, oppGainAmount: oppDelta }));
      // 시간의 지배자: the opponent owns time.lord and just cleared → veil MY apples
      // as "?" for 0.5s, re-armed on each of their clears.
      if (s.oppOwned.includes('time.lord')) this.board.pulseHideLabels(500);
    }
    this.prevOppScore = s.oppScore;

    // Mirror the opponent's emote pulse into the store so EmoteOverlay spawns a
    // bubble (and plays its SFX) on the far side. seq is monotonic, so a plain
    // copy is enough — the overlay re-keys on it.
    if (s.oppEmoteSeq !== st.oppEmoteSeq) {
      st.set({ oppEmoteSeq: s.oppEmoteSeq, oppEmoteId: s.oppEmoteId });
    }

    // Build the mid-round review payload while the roundCheck overlay is up; keep
    // the previous one otherwise so the overlay's staged animation stays stable.
    let roundResult: RoundResult | null = st.roundResult;
    if (s.phase === 'roundCheck' && s.lastRound) {
      roundResult = {
        my: s.lastRound.myScore,
        opp: s.lastRound.oppScore,
        winner: s.lastRound.winner,
        round: s.round,
        bonus: s.lastRound.bonus,
        myTotal: s.myTotal,
        oppTotal: s.oppTotal,
        history: s.roundHistory.map((h) => ({ ...h })),
      };
    }

    this.lastRound = s.round;
    this.lastPhase = s.phase;
    st.set({
      phase: s.phase,
      round: s.round,
      rounds: s.rounds,
      remainingMs: s.remainingMs,
      durationMs: s.roundDurationMs, // augment-modified length → correct HUD timer bar
      overlayRemainingMs: s.phaseRemainingMs,
      myScore: s.myScore,
      oppScore: s.oppScore,
      myTotal: s.myTotal,
      oppTotal: s.oppTotal,
      roundWins: s.roundWins,
      roundResult,
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
      oppOwned: s.oppOwned,
    });

    // Mirror the match clock into the shared game store so the DayNightSky
    // backdrop — which reads useGameStore like every other mode — advances WITH
    // the online rounds instead of idling on its home auto-cycle (the "라운드와
    // 배경이 연동되지 않는" bug). Only once play has started; the lobby keeps the
    // ambient home cycle.
    if (s.phase !== 'lobby') {
      const skyPhase: Phase =
        s.phase === 'roundCheck'
          ? 'roundCheck'
          : s.phase === 'augment'
            ? 'augment'
            : s.phase === 'matchResult'
              ? 'result'
              : s.phase === 'preRound'
                ? 'preRound'
                : 'round';
      // Sit at the round's start-of-day anchor through the countdown/augment/
      // preRound beats (full clock), sweep during the round, rest at its end
      // during the review.
      const skyRound = s.phase === 'countdown' ? 0 : s.round;
      const skyRemaining =
        s.phase === 'round'
          ? s.remainingMs
          : s.phase === 'roundCheck' || s.phase === 'matchResult'
            ? 0
            : s.roundDurationMs;
      useGameStore.setState({
        phase: skyPhase,
        roundIndex: skyRound,
        totalRounds: s.rounds,
        remainingMs: skyRemaining,
        durationMs: s.roundDurationMs,
      });
    }
  }

  pick(id: string): void {
    this.match?.pickAugment(id);
    this.pendingActivation = id; // activation FX plays when the next round opens
    sfx.pick();
  }

  /** Fire my own emote locally and broadcast it to the opponent. */
  sendEmote(id: string): void {
    useOnlineStore.getState().sendMyEmote(id);
    this.match?.sendEmote(id);
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
      // Weight the ELO by the opponent's real rating (exchanged in the handshake);
      // fall back to our own MMR only if it never arrived (treats them as equal).
      const oppMmr = s.oppMmr ?? this.profile.mmr;
      const opp: PublicProfile = {
        uid: 'opp',
        nickname: s.oppName,
        avatar: '🍏',
        tier: tierFromMmr(oppMmr),
        mmr: oppMmr,
      };
      const result = winner === 'me' ? 'win' : winner === 'opp' ? 'loss' : 'draw';
      // A backend write hiccup must never swallow the result screen — rank the
      // result best-effort and always fall through to showing the outcome.
      try {
        const r = await this.ranking.applyResult(this.profile, opp, result, 'pvp');
        mmrDelta = r.mmrDelta;
        await this.persistProfile();
      } catch (err) {
        console.error('[ranking] failed to persist online result', err);
      }
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
      this.board.showSelection(null, false);
      if (!rect) return;
      const evalBefore = m.evalDetail(rect);
      // Stray single-cell tap can't be a valid move — silent no-op (keep combo),
      // mirroring VersusController so a mistap never breaks the streak or fails.
      if (rect.x0 === rect.x1 && rect.y0 === rect.y1 && !evalBefore.valid) return;
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
        durationMs: snap.roundDurationMs,
      });
    },
  };

  /** Arm 새콤이's auto-clear cadence for a fresh round (owner check + presence). */
  private armCompanion(s: OnlineSnapshot): void {
    this.companionOn = s.myOwned.includes(COMPANION_ID);
    this.companionStart = this.clock.now();
    this.companionNextAt = COMPANION_FIRST_MS;
    this.board.companionPresence(this.companionOn);
  }

  /** Let 새콤이 pop a sum-10 group for me whenever its timer comes due. */
  private tickCompanion(): void {
    const m = this.match;
    if (!this.companionOn || !m) return;
    const t = this.clock.now() - this.companionStart;
    let guard = 0;
    while (t >= this.companionNextAt && guard++ < 4) {
      this.companionNextAt += COMPANION_INTERVAL_MS;
      const info = m.companionClear();
      if (!info) break;
      this.board.burst(info.cells);
      this.board.setBoard(m.myBoard());
      const center = this.board.centroidPx(info.cells);
      if (center) this.board.companionPop(center.x, center.y);
      this.board.scorePopup(info.cells, info.finalScore);
      sfx.clear(1);
    }
  }

  /** Remove our public-lobby advertisement (matched, cancelled, or screen left). */
  private withdrawLobby(): void {
    if (!this.advertised) return;
    this.advertised = false;
    void this.lobby.withdraw(this.profile?.uid ?? '');
  }

  /** Release our invite-room hold (matched, cancelled, or screen left) so the link
   *  goes dead the moment we stop hosting. */
  private releasePresence(): void {
    if (!this.heldRoom) return;
    const code = this.heldRoom;
    this.heldRoom = null;
    void this.presence.release(code);
  }

  destroy(): void {
    this.withdrawLobby();
    this.releasePresence();
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
