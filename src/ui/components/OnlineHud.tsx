import { useOnlineStore } from '../../app/onlineStore';

export function OnlineHud() {
  const s = useOnlineStore();
  const live = s.phase === 'round';
  const myTotal = s.myTotal + (live ? s.myScore : 0);
  const oppTotal = s.oppTotal + (live ? s.oppScore : 0);
  const pct = Math.max(0, Math.min(1, s.durationMs ? s.remainingMs / s.durationMs : 0));
  const secs = Math.max(0, Math.ceil(s.remainingMs / 1000));
  const low = secs <= 5;
  return (
    <div className="hud versus-hud">
      <div className="vs-side me">
        <span className="vs-label">{s.myName}</span>
        <span className="vs-score">{myTotal}</span>
        {s.combo > 1 && <span className="combo-chip">{s.combo}콤보</span>}
      </div>
      <div className="hud-center">
        <div className="vs-meta">
          <span className="round-chip">
            R{s.round + 1}
            <span className="of">/{s.rounds}</span>
          </span>
          <span className="vs-wins">
            {s.roundWins.me} : {s.roundWins.opp}
          </span>
        </div>
        <div className={`time-bar${low ? ' low' : ''}`}>
          <div className="time-fill" style={{ width: `${pct * 100}%` }} />
        </div>
        <span className={`time-num${low ? ' low' : ''}`}>{live ? secs : '—'}</span>
      </div>
      <div className="vs-side opp">
        <span className="vs-label">
          {s.oppName}
          {s.oppPresent ? '' : ' (대기)'}
        </span>
        <span className="vs-score">{oppTotal}</span>
      </div>
    </div>
  );
}
