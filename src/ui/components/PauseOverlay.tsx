// ui/components/PauseOverlay.tsx — in-game pause menu. The timer and the AI bot
// are both frozen while this is open (the controller pauses the shared clock).
export function PauseOverlay(props: {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onSettings: () => void;
  onHelp: () => void;
}) {
  return (
    <div className="overlay">
      <div className="result-card pause-card">
        <h2 className="result-title">일시정지</h2>
        <div className="pause-actions">
          <button className="btn primary" onClick={props.onResume}>
            이어하기
          </button>
          <button className="btn ghost" onClick={props.onSettings}>
            설정
          </button>
          <button className="btn ghost" onClick={props.onHelp}>
            도움말
          </button>
          <button className="btn ghost" onClick={props.onRestart}>
            다시 시작
          </button>
          <button className="btn ghost" onClick={props.onHome}>
            홈
          </button>
        </div>
      </div>
    </div>
  );
}
