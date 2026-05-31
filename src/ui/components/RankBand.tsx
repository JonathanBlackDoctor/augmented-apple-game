// ui/components/RankBand.tsx — ranked-result MMR band. Shows the current tier
// chip, the ± delta, an animated progress bar within the tier, and a
// promotion/demotion banner when the result crossed a tier boundary. Colours
// live here (presentation), the band math lives in the pure ranking/elo module.
// Ported from the design package prototype's MatchResult ledger.
import { useEffect, useState } from 'react';
import type { Tier } from '../../contracts';
import { mmrBand, tierFromMmr } from '../../ranking/elo';
import { AnimNum } from './AnimNum';

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

const RANK_STYLE: Record<Tier, { ko: string; color: string; metal: string }> = {
  Iron: { ko: '아이언', color: '#8a8079', metal: '#b7ada3' },
  Bronze: { ko: '브론즈', color: '#b07a45', metal: '#cd9b6a' },
  Silver: { ko: '실버', color: '#8d99a4', metal: '#c3cdd6' },
  Gold: { ko: '골드', color: '#d6a32f', metal: '#f0cf7a' },
  Platinum: { ko: '플래티넘', color: '#3fa896', metal: '#7fd9c8' },
  Diamond: { ko: '다이아', color: '#4f9be8', metal: '#8fc6f5' },
  Master: { ko: '마스터', color: '#9b6cf0', metal: '#c3a8ff' },
};

export function RankBand({ mmrAfter, mmrDelta }: { mmrAfter: number; mmrDelta: number }) {
  const reduce = prefersReducedMotion();
  const [advanced, setAdvanced] = useState(reduce);
  useEffect(() => {
    if (reduce) {
      setAdvanced(true);
      return;
    }
    const id = setTimeout(() => setAdvanced(true), 600);
    return () => clearTimeout(id);
  }, [reduce]);

  const mmrBefore = mmrAfter - mmrDelta;
  const show = mmrBand(advanced ? mmrAfter : mmrBefore);
  const crossed = tierFromMmr(mmrAfter) !== tierFromMmr(mmrBefore);
  const promoted = crossed && mmrAfter > mmrBefore;
  const demoted = crossed && mmrAfter < mmrBefore;
  const afterTier = RANK_STYLE[tierFromMmr(mmrAfter)];
  const style = RANK_STYLE[show.tier];
  const up = mmrDelta >= 0;

  return (
    <div className="mmrbox">
      <div className="mmr-head">
        <span
          className="tier-chip"
          style={{ background: `linear-gradient(120deg, ${style.color}, ${style.metal})` }}
        >
          {style.ko}
        </span>
        <span className={`mmr-delta ${up ? 'up' : 'down'}`}>
          {up ? '+' : ''}
          {mmrDelta} MMR
        </span>
      </div>
      <div className="mmr-track">
        <i
          style={{
            width: `${show.pct}%`,
            background: `linear-gradient(90deg, ${style.color}, ${style.metal})`,
          }}
        />
      </div>
      <div className="mmr-scale">
        <span>{show.min}</span>
        <AnimNum from={mmrBefore} to={advanced ? mmrAfter : mmrBefore} run={advanced} dur={600} />
        <span>{show.max}</span>
      </div>
      {promoted && advanced && <div className="mmr-promote up">▲ {afterTier.ko} 승급!</div>}
      {demoted && advanced && <div className="mmr-promote down">▼ {afterTier.ko} 강등</div>}
    </div>
  );
}
