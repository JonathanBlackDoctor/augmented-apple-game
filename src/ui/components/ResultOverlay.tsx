import { useGameStore } from '../../app/store';
import { AnimNum } from './AnimNum';

export function ResultOverlay({ onReplay, onHome }: { onReplay: () => void; onHome: () => void }) {
  const totalScore = useGameStore((s) => s.totalScore);
  const best = useGameStore((s) => s.bestTotal);
  const rounds = useGameStore((s) => s.totalRounds);
  const isBest = totalScore > 0 && totalScore >= best;
  return (
    <div className="overlay">
      <div className="result-card">
        <h2 className="result-title">{isBest ? '최고 기록!' : '게임 종료'}</h2>
        <div className="big-score">
          <AnimNum from={0} to={totalScore} dur={700} />
          <span className="unit">점</span>
        </div>
        <p className="best-line">
          최고 {best} · {rounds}라운드
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={onReplay}>
            다시 하기
          </button>
          <button className="btn ghost" onClick={onHome}>
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
