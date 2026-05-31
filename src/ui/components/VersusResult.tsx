import { useGameStore } from '../../app/store';
import { useVersusStore } from '../../app/versusStore';
import { useProgressStore } from '../../app/progressStore';
import { getEmote } from '../../emotes';
import { MAX_LEVEL } from '../../bot';
import { AnimNum } from './AnimNum';

export function VersusResult({
  onReplay,
  onNextLevel,
  onLevels,
}: {
  onReplay: () => void;
  onNextLevel: () => void;
  onLevels: () => void;
}) {
  const myTotal = useGameStore((s) => s.totalScore);
  const v = useVersusStore();
  const level = useProgressStore((s) => s.selectedLevel);
  const reward = useProgressStore((s) => s.lastReward);
  const win = v.winner === 'me';
  const title = win ? '승리!' : v.winner === 'opp' ? '패배' : '무승부';
  const cls = win ? 'win' : v.winner === 'opp' ? 'loss' : 'draw';
  const rewardEmote = reward ? getEmote(reward.emoteId) : undefined;
  const isLast = level >= MAX_LEVEL;

  return (
    <div className="overlay">
      <div className={`result-card versus ${cls}`}>
        <h2 className="result-title">{title}</h2>
        <p className="vs-level-line">
          {v.oppAvatar} {v.oppName}
        </p>
        <div className="vs-final">
          <div className="vs-final-side">
            <span className="vs-label">나</span>
            <span className="big-score">
              <AnimNum from={0} to={myTotal} dur={700} />
            </span>
          </div>
          <span className="vs-colon">:</span>
          <div className="vs-final-side">
            <span className="vs-label">{v.oppName}</span>
            <span className="big-score">
              <AnimNum from={0} to={v.oppTotal} dur={700} />
            </span>
          </div>
        </div>
        <p className="best-line">
          라운드 {v.roundWins.me} : {v.roundWins.opp}
        </p>
        {win && rewardEmote && (
          <div className="reward-pop">
            <span className="reward-cap">새 감정표현 획득!</span>
            <span className="reward-emoji">{rewardEmote.emoji}</span>
            <span className="reward-label">{rewardEmote.label}</span>
          </div>
        )}
        {win && isLast && <p className="best-line">🏆 모든 레벨을 클리어했어요!</p>}
        <div className="btn-row">
          {win && !isLast ? (
            <button className="btn primary" onClick={onNextLevel}>
              다음 레벨 →
            </button>
          ) : (
            <button className="btn primary" onClick={onReplay}>
              {win ? '다시 대결' : '다시 도전'}
            </button>
          )}
          <button className="btn ghost" onClick={onLevels}>
            레벨 목록
          </button>
        </div>
      </div>
    </div>
  );
}
