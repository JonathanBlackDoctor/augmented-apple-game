// ui/components/Countdown.tsx — pre-round 3·2·1 → 시작! intro. The GameScreen
// pauses the active controller's clock while this is up, so the round timer and
// bot both stay frozen until "시작!". Reduced-motion shortens but still gates
// the start so play never begins mid-animation.
import { useEffect, useRef, useState } from 'react';

function reduced(): boolean {
  try {
    return (
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export function Countdown({ onDone, durationMs }: { onDone: () => void; durationMs?: number }) {
  const [n, setN] = useState(3);
  const rm = reduced();
  // Keep the latest callback without retriggering the step timer each render.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (n < 0) {
      doneRef.current();
      return;
    }
    // When a total duration is supplied (schedule-driven pre-round countdowns),
    // pace the 3·2·1·시작 beats to fill it so the overlay clears as the round
    // begins — even under reduced motion, where self-paced beats would otherwise
    // finish early and leave a frozen gap before play starts.
    const ms = durationMs
      ? Math.round(durationMs * (n === 0 ? 0.19 : 0.27))
      : rm
        ? 250
        : n === 0
          ? 600
          : 800;
    const id = setTimeout(() => setN((x) => x - 1), ms);
    return () => clearTimeout(id);
  }, [n, rm, durationMs]);
  if (n < 0) return null;
  return (
    <div className="overlay light countdown-overlay">
      <b key={n} className={`count-num${n === 0 ? ' go' : ''}`}>
        {n === 0 ? '시작!' : n}
      </b>
    </div>
  );
}
