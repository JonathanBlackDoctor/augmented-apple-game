import { useEffect, useState } from 'react';
import { useOnlineStore } from '../../app/onlineStore';
import { hudTimerState } from './hudTimer';
import { AnimNum } from './AnimNum';
import { SeriesPips } from './SeriesPips';

interface Pop {
  seq: number;
  amount: number;
}

export function OnlineHud() {
  const s = useOnlineStore();
  const live = s.phase === 'round';
  const myTotal = s.myTotal + (live ? s.myScore : 0);
  const oppTotal = s.oppTotal + (live ? s.oppScore : 0);
  const pct = Math.max(0, Math.min(1, s.durationMs ? s.remainingMs / s.durationMs : 0));
  const secs = Math.max(0, Math.ceil(s.remainingMs / 1000));
  const low = secs <= 5;
  const fill = live ? hudTimerState(secs, s.owned) : '';

  // Mirror the opponent's "+N" gain pulses into a short list of floating popups.
  const [pops, setPops] = useState<Pop[]>([]);
  useEffect(() => {
    if (s.oppGainSeq === 0) return;
    setPops((cur) => [...cur, { seq: s.oppGainSeq, amount: s.oppGainAmount }]);
  }, [s.oppGainSeq, s.oppGainAmount]);
  const removePop = (seq: number): void => setPops((cur) => cur.filter((p) => p.seq !== seq));

  return (
    <div className="hud versus-hud">
      <div className="vs-side me">
        <span className="vs-label">{s.myName}</span>
        <span className="vs-score">
          <AnimNum to={myTotal} live dur={450} />
        </span>
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
        <SeriesPips history={s.roundHistory} total={s.rounds} />
        <div className={`time-bar${low ? ' low' : ''}`}>
          <div className={`time-fill${fill ? ' ' + fill : ''}`} style={{ width: `${pct * 100}%` }} />
        </div>
        <span className={`time-num${low ? ' low' : ''}`}>{live ? secs : '—'}</span>
      </div>
      <div className="vs-side opp">
        <span className="vs-label">
          {s.oppName}
          {s.oppPresent ? '' : ' (대기)'}
        </span>
        {/* Re-key on each opponent gain so the pulse animation restarts; gate on
            seq > 0 to avoid a spurious pulse at match start. */}
        <span
          key={`opp-${s.oppGainSeq}`}
          className={`vs-score${s.oppGainSeq > 0 ? ' opp-score' : ''}`}
        >
          {oppTotal}
        </span>
        {pops.map((p) => (
          <span key={p.seq} className="score-pop" onAnimationEnd={() => removePop(p.seq)}>
            +{p.amount}
          </span>
        ))}
      </div>
    </div>
  );
}
