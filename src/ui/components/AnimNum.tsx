// ui/components/AnimNum.tsx — a number that count-ups to `to` over `dur` ms.
// Two modes:
//   • reveal (default): shows `from` until `run` flips true, then animates
//     from → to. Used by ledgers/result screens that stage their reveal.
//   • live: animates from the previously shown value each time `to` changes.
//     Used by the in-play HUD score so gains tween smoothly.
// Presentation-only; honours reduced-motion by snapping straight to `to`.
import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export function AnimNum({
  from = 0,
  to,
  run = true,
  dur = 600,
  live = false,
  className,
}: {
  from?: number;
  to: number;
  run?: boolean;
  dur?: number;
  live?: boolean;
  className?: string;
}) {
  const [v, setV] = useState(from);
  const shown = useRef(from);
  const raf = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      shown.current = to;
      setV(to);
      return;
    }
    if (!run) {
      shown.current = from;
      setV(from);
      return;
    }
    const start = live ? shown.current : from;
    if (start === to) {
      shown.current = to;
      setV(to);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const val = Math.round(start + (to - start) * e);
      shown.current = val;
      setV(val);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [run, from, to, dur, live]);
  return <span className={className}>{v.toLocaleString()}</span>;
}
