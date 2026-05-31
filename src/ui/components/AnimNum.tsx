// ui/components/AnimNum.tsx — a number that count-ups from `from` to `to` over
// `dur` ms when `run` flips true. Presentation-only; honours reduced-motion by
// snapping straight to the target (no rAF). Ported from the design package
// prototype's settlement/result ledgers.
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
  from,
  to,
  run = true,
  dur = 600,
  className,
}: {
  from: number;
  to: number;
  run?: boolean;
  dur?: number;
  className?: string;
}) {
  const [v, setV] = useState(run ? from : to);
  const raf = useRef(0);
  useEffect(() => {
    if (!run || prefersReducedMotion()) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setV(Math.round(from + (to - from) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [run, from, to, dur]);
  return <span className={className}>{v.toLocaleString()}</span>;
}
