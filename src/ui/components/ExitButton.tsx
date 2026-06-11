// Floating "leave to home" control shown during play. Two-step inline confirm
// so a stray tap near the board edge can't kill a live match.
import { useState } from 'react';

export function ExitButton({ onExit }: { onExit: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button className="exit-fab" aria-label="홈으로 나가기" onClick={() => setConfirming(true)}>
        ✕
      </button>
    );
  }
  return (
    <div className="exit-fab confirm">
      <span>나갈까요?</span>
      <button className="btn-mini" onClick={onExit}>
        나가기
      </button>
      <button className="btn-mini ghost" onClick={() => setConfirming(false)}>
        계속
      </button>
    </div>
  );
}
