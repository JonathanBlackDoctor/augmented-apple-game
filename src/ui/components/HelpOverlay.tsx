// ui/components/HelpOverlay.tsx — quick "how to play" modal. Reused by the home
// screen and the pause menu.
export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="result-card help-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="result-title">플레이 방법</h2>
        <ul className="help-list">
          <li>
            합이 <b>10</b>이 되도록 사과를 <b>드래그</b>해 담으세요.
          </li>
          <li>
            실수 없이 <b>연속</b>으로 지울수록 <b>콤보</b>가 쌓여 점수가 올라가요.
          </li>
          <li>
            <b>증강 모드</b>: 라운드마다 능력을 골라 점점 강해집니다.
          </li>
          <li>
            <b>AI 대결</b>: 같은 보드로 5라운드, 총점으로 승부! 오른쪽 위 작은 화면에서 AI가 어떻게
            두는지 볼 수 있어요.
          </li>
        </ul>
        <div className="btn-row">
          <button className="btn primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
