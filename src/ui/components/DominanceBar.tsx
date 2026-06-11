import { useEffect, useRef, useState } from 'react';

/** Score gap (in points) that reads as a decisive lead — the seam saturates
    near the edge around here. Tune to the round-score scale. */
const K = 30;
/** Max seam deviation from centre; clamps the split to 8%..92% so both
    players' colours stay visible even in a blowout. */
const MAX_BIAS = 0.42;

/**
 * "전선(戰線) 바" — a full-bleed tug-of-war bar pinned to the top edge of the
 * versus HUD. The seam between the two player colours is pushed toward the
 * trailing side by the *current round* score gap. Deliberately styled apart
 * from the timer bar (matte, square, no urgency pulse) so the two never blur
 * together: timer = urgency, this = 전황.
 */
export function DominanceBar({ me, opp }: { me: number; opp: number }) {
  const diff = me - opp;
  // tanh squashes the gap: sensitive near 0 (close games move the seam a lot),
  // saturating for large leads so the bar never dies in a corner.
  const offset = Math.tanh(diff / K) * MAX_BIAS;
  const seam = (0.5 + offset) * 100;
  const tie = Math.abs(seam - 50) <= 5;

  // Flash the seam when the lead changes hands — the round's climax beat.
  const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0;
  const prevSign = useRef(0);
  const [flipSeq, setFlipSeq] = useState(0);
  useEffect(() => {
    if (sign !== 0 && prevSign.current !== 0 && sign !== prevSign.current) {
      setFlipSeq((n) => n + 1);
    }
    if (sign !== 0) prevSign.current = sign;
  }, [sign]);

  const leader = sign > 0 ? 'me' : sign < 0 ? 'opp' : 'even';

  return (
    <div className={`dom-bar${tie ? ' tie' : ''}`} aria-hidden="true">
      {/* My colour fills from the left; the container background is the
          opponent's colour. translateX keeps the repaint on the GPU. */}
      <div className="dom-me" style={{ transform: `translateX(${seam - 100}%)` }} />
      <div className="dom-tick" />
      <div className={`dom-seam ${leader}`} style={{ left: `${seam}%` }}>
        {flipSeq > 0 && <span key={flipSeq} className="dom-flash" />}
      </div>
    </div>
  );
}
