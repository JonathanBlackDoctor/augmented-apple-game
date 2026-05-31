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
            한 번에 여러 개를 지우면 <b>콤보</b> 점수가 올라가요.
          </li>
          <li>
            <b>증강 모드</b>: 라운드마다 능력을 골라 점점 강해집니다.
          </li>
          <li>
            <b>AI 레벨 도전</b>: 이름을 가진 AI와 1~10단계로 대결! 이기면 다음 레벨과{' '}
            <b>감정표현</b>이 열려요. 대결 중엔 오른쪽 아래 😀 버튼으로 이모트를 보낼 수 있어요.
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
