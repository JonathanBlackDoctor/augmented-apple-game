import { useGameStore } from '../../app/store';
import { useVersusStore } from '../../app/versusStore';

export function VersusResult({ onReplay, onHome }: { onReplay: () => void; onHome: () => void }) {
  const myTotal = useGameStore((s) => s.totalScore);
  const v = useVersusStore();
  const title = v.winner === 'me' ? '승리!' : v.winner === 'opp' ? '패배' : '무승부';
  const cls = v.winner === 'me' ? 'win' : v.winner === 'opp' ? 'loss' : 'draw';
  return (
    <div className="overlay">
      <div className={`result-card versus ${cls}`}>
        <h2 className="result-title">{title}</h2>
        <div className="vs-final">
          <div className="vs-final-side">
            <span className="vs-label">나</span>
            <span className="big-score">{myTotal}</span>
          </div>
          <span className="vs-colon">:</span>
          <div className="vs-final-side">
            <span className="vs-label">{v.oppName}</span>
            <span className="big-score">{v.oppTotal}</span>
          </div>
        </div>
        <p className="best-line">
          라운드 {v.roundWins.me} : {v.roundWins.opp}
          {v.ranked ? '' : ' · 연습(언랭크)'}
        </p>
        {v.ranked && v.mmrDelta !== null && (
          <p className="mmr-line">
            MMR {v.mmrDelta >= 0 ? '+' : ''}
            {v.mmrDelta}
          </p>
        )}
        <div className="btn-row">
          <button className="btn primary" onClick={onReplay}>
            다시 대결
          </button>
          <button className="btn ghost" onClick={onHome}>
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
