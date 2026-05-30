import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../app/store';
import { useOnlineStore } from '../../app/onlineStore';
import { OnlineController } from '../../app/OnlineController';
import { byId } from '../../augments';
import { OnlineHud } from '../components/OnlineHud';

const TIER_LABEL: Record<string, string> = { silver: '실버', gold: '골드', prismatic: '프리즘' };

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
            <p className="aug-sub">방을 만들어 링크를 공유하거나, 받은 코드로 입장하세요</p>
            <button className="btn primary" onClick={() => void ctrlRef.current?.create()}>
              방 만들기
            </button>
            <div className="join-row">
              <input
                className="code-input"
                value={code}
                maxLength={6}
                placeholder="코드 6자리"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
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
            <button className="btn ghost" onClick={goHome}>
              취소
            </button>
          </div>
        </div>
      )}

      {s.stage === 'connecting' && (
        <div className="overlay">
          <div className="lobby-card">
            <h2>연결 중…</h2>
            <div className="spinner" />
          </div>
        </div>
      )}

      {s.stage === 'playing' && s.phase === 'countdown' && (
        <div className="overlay light">
          <div className="countdown">곧 시작!</div>
        </div>
      )}

      {s.stage === 'playing' && s.phase === 'augment' && (
        <div className="overlay">
          <div className="augment-panel">
            <div className="aug-head">
              {s.offerTier && <span className={`tier-badge ${s.offerTier}`}>{TIER_LABEL[s.offerTier]}</span>}
              <h2>증강 선택</h2>
              <p className="aug-sub">하나를 골라 빌드를 쌓으세요 · 리롤 없음</p>
            </div>
            <div className="aug-grid">
              {s.offers.map((id) => {
                const a = byId(id);
                if (!a) return null;
                return (
                  <button
                    key={id}
                    className={`aug-card ${a.tier}`}
                    onClick={() => ctrlRef.current?.pick(id)}
                  >
                    <span className="aug-name">{a.name}</span>
                    <span className="aug-desc">{a.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {s.stage === 'result' && (
        <div className="overlay">
          <div className={`result-card versus ${cls}`}>
            <h2 className="result-title">
              {s.winner === 'me' ? '승리!' : s.winner === 'opp' ? '패배' : '무승부'}
            </h2>
            {s.oppLeft && <p className="aug-sub">상대가 나갔습니다 · 부전승</p>}
            <div className="vs-final">
              <div className="vs-final-side">
                <span className="vs-label">{s.myName}</span>
                <span className="big-score">{s.myTotal}</span>
              </div>
              <span className="vs-colon">:</span>
              <div className="vs-final-side">
                <span className="vs-label">{s.oppName}</span>
                <span className="big-score">{s.oppTotal}</span>
              </div>
            </div>
            <p className="best-line">
              라운드 {s.roundWins.me} : {s.roundWins.opp}
            </p>
            {s.mmrDelta !== null && (
              <p className="mmr-line">
                MMR {s.mmrDelta >= 0 ? '+' : ''}
                {s.mmrDelta}
              </p>
            )}
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
