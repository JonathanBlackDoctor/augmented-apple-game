import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../app/store';
import {
  useOnlineStore,
  ONLINE_AUGMENT_MS,
  ONLINE_PRE_ROUND_MS,
  ONLINE_ROUND_CHECK_MS,
} from '../../app/onlineStore';
import { OnlineController } from '../../app/OnlineController';
import { OnlineHud } from '../components/OnlineHud';
import { EmoteTray } from '../components/EmoteTray';
import { EmoteOverlay } from '../components/EmoteOverlay';
import { AugmentOverlay } from '../components/AugmentOverlay';
import { RoundCheckOverlay } from '../components/RoundCheckOverlay';
import { OwnedAugments, OpponentAugments } from '../components/OwnedAugments';
import { Countdown } from '../components/Countdown';
import { AnimNum } from '../components/AnimNum';
import { RankBand } from '../components/RankBand';
import { RoundStrip } from '../components/RoundStrip';

export function OnlineScreen() {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<OnlineController | null>(null);
  const s = useOnlineStore();
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');

  useEffect(() => {
    let disposed = false;
    const ctrl = new OnlineController();
    ctrlRef.current = ctrl;
    void (async () => {
      const host = hostRef.current;
      if (!host) return;
      await ctrl.mount(host);
      if (disposed) ctrl.destroy();
    })();
    return () => {
      disposed = true;
      ctrl.destroy();
      ctrlRef.current = null;
      useOnlineStore.getState().reset();
    };
  }, []);

  useEffect(() => {
    if (s.myName && !nick) setNick(s.myName);
  }, [s.myName, nick]);

  const copyLink = (): void => {
    void navigator.clipboard?.writeText(s.link);
  };
  const goHome = (): void => {
    useOnlineStore.getState().reset();
    useGameStore.setState({ mode: 'solo' });
    useGameStore.getState().goHome();
  };
  const switchToAI = (): void => {
    useOnlineStore.getState().reset();
    useGameStore.setState({ mode: 'versus' });
    useGameStore.getState().startVersus(5, 30_000);
  };

  const cls = s.winner === 'me' ? 'win' : s.winner === 'opp' ? 'loss' : 'draw';

  return (
    <div className="screen game online">
      <div className="board-host" ref={hostRef} />
      {s.stage === 'playing' && <OnlineHud />}
      {s.stage === 'playing' && <OwnedAugments ids={s.owned} />}
      {s.stage === 'playing' && <OpponentAugments ids={s.oppOwned} />}
      {s.stage === 'playing' && (
        <EmoteOverlay
          myEmoteSeq={s.myEmoteSeq}
          myEmoteId={s.myEmoteId}
          oppEmoteSeq={s.oppEmoteSeq}
          oppEmoteId={s.oppEmoteId}
        />
      )}
      {s.stage === 'playing' && (
        <EmoteTray onSend={(id) => ctrlRef.current?.sendEmote(id)} />
      )}

      {s.stage === 'menu' && (
        <div className="overlay">
          <div className="lobby-card">
            <h2>친구와 1:1 대결</h2>
            <div className="nick-row">
              <span className="nick-label">닉네임</span>
              <input
                className="nick-input"
                value={nick}
                maxLength={16}
                onChange={(e) => setNick(e.target.value)}
              />
              <button className="btn-mini" onClick={() => void ctrlRef.current?.setNickname(nick)}>
                저장
              </button>
            </div>
            <button className="btn online" onClick={() => void ctrlRef.current?.quickMatch()}>
              공개 방 · 아무나와 바로 대전
            </button>
            <p className="aug-sub">코드 없이 웹에 접속한 누구와도 매칭돼요</p>

            <div className="lobby-divider">
              <span>또는 친구와 비공개 대결</span>
            </div>

            <button className="btn primary" onClick={() => void ctrlRef.current?.create()}>
              비공개 방 만들기
            </button>
            <div className="join-row">
              <input
                className="code-input"
                value={code}
                maxLength={3}
                inputMode="numeric"
                placeholder="코드 3자리"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <button className="btn gold" onClick={() => void ctrlRef.current?.join(code)}>
                입장
              </button>
            </div>
            {s.error && <p className="err">{s.error}</p>}
            <button className="btn ghost" onClick={goHome}>
              홈으로
            </button>
          </div>
        </div>
      )}

      {s.stage === 'hosting' && (
        <div className="overlay">
          <div className="lobby-card">
            {s.isPublic ? (
              <>
                <h2>상대를 찾는 중…</h2>
                {s.noOpponent ? (
                  <>
                    <p className="aug-sub">지금은 대기 중인 상대가 없어요.</p>
                    <button className="btn versus" onClick={switchToAI}>
                      AI와 대결로 전환
                    </button>
                  </>
                ) : (
                  <>
                    <p className="aug-sub">웹에 접속한 다른 플레이어를 기다리고 있어요…</p>
                    <div className="spinner" />
                  </>
                )}
              </>
            ) : (
              <>
                <h2>방 코드</h2>
                <div className="room-code">{s.roomCode}</div>
                <button className="btn primary" onClick={copyLink}>
                  초대 링크 복사
                </button>
                {s.noOpponent ? (
                  <>
                    <p className="aug-sub">아직 아무도 안 왔어요.</p>
                    <button className="btn versus" onClick={switchToAI}>
                      AI와 대결로 전환
                    </button>
                  </>
                ) : (
                  <>
                    <p className="aug-sub">상대가 입장하면 자동으로 시작돼요…</p>
                    <div className="spinner" />
                  </>
                )}
              </>
            )}
            <button className="btn ghost" onClick={goHome}>
              취소
            </button>
          </div>
        </div>
      )}

      {s.stage === 'connecting' && (
        <div className="overlay">
          <div className="lobby-card">
            {s.noOpponent ? (
              <>
                <h2>상대를 찾을 수 없어요</h2>
                <p className="aug-sub">방 코드를 확인하거나 다시 시도해 주세요.</p>
              </>
            ) : (
              <>
                <h2>연결 중…</h2>
                <div className="spinner" />
              </>
            )}
            <button className="btn ghost" onClick={goHome}>
              {s.noOpponent ? '돌아가기' : '취소'}
            </button>
          </div>
        </div>
      )}

      {/* Animated 3·2·1 intro (parity with versus): once at match start and again
          before every round (after the augment pick — the window closes and this
          countdown leads into the round). The schedule drives the real round
          start, so onDone is a no-op here. */}
      {s.stage === 'playing' && (s.phase === 'countdown' || s.phase === 'preRound') && (
        <Countdown
          onDone={() => {}}
          durationMs={s.phase === 'preRound' ? ONLINE_PRE_ROUND_MS : undefined}
        />
      )}

      {s.stage === 'playing' && s.phase === 'augment' && (
        <AugmentOverlay
          onPick={(id) => ctrlRef.current?.pick(id)}
          onReroll={() => ctrlRef.current?.reroll()}
          remainingMs={s.overlayRemainingMs}
          totalMs={ONLINE_AUGMENT_MS}
          offers={s.offers}
          offerTier={s.offerTier}
          roundIndex={s.round}
          rerollsLeft={s.rerollsLeft}
          owned={s.owned}
        />
      )}

      {s.stage === 'playing' && s.phase === 'roundCheck' && (
        <RoundCheckOverlay
          result={s.roundResult}
          wins={s.roundWins}
          oppName={s.oppName}
          remaining={s.overlayRemainingMs}
          totalRounds={s.rounds}
          roundCheckMs={ONLINE_ROUND_CHECK_MS}
        />
      )}

      {s.stage === 'result' && (
        <div className="overlay">
          <div className={`result-card versus ${cls}`}>
            {s.newRecord && s.winner !== 'opp' && <div className="newrec-badge">★ 신기록</div>}
            <h2 className="result-title">
              {s.winner === 'me' ? '승리!' : s.winner === 'opp' ? '패배' : '무승부'}
            </h2>
            {s.oppLeft && <p className="aug-sub">상대가 나갔습니다 · 부전승</p>}
            <div className="vs-final">
              <div className="vs-final-side">
                <span className="vs-label">{s.myName}</span>
                <span className="big-score">
                  <AnimNum from={0} to={s.myTotal} dur={700} />
                </span>
              </div>
              <span className="vs-colon">:</span>
              <div className="vs-final-side">
                <span className="vs-label">{s.oppName}</span>
                <span className="big-score">
                  <AnimNum from={0} to={s.oppTotal} dur={700} />
                </span>
              </div>
            </div>
            <p className="best-line">
              라운드 {s.roundWins.me} : {s.roundWins.opp}
            </p>
            {s.roundHistory.length > 0 && <RoundStrip history={s.roundHistory} />}
            {s.mmrDelta !== null && <RankBand mmrAfter={s.mmr} mmrDelta={s.mmrDelta} />}
            <div className="btn-row">
              <button className="btn ghost" onClick={goHome}>
                홈으로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
