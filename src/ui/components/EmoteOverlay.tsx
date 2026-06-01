// ui/components/EmoteOverlay.tsx — floating emote bubbles for both sides. Driven
// by emote pulses (seq bumps) from whichever store the screen passes in (versus
// or online), so it works identically in AI and friend battles. A timed
// self-removal (not just onAnimationEnd) guarantees the bubble clears: under
// prefers-reduced-motion the CSS sets `animation: none`, so the animationend
// event never fires and bubbles would otherwise linger forever.
import { useEffect, useState } from 'react';
import { getEmote } from '../../emotes';
import { sfx } from '../../app/sound';

// Slightly longer than the emoteFloat animation (1.8s) so a bubble that *does*
// animate finishes naturally; the timer is the hard backstop for the no-animation
// (reduced-motion) case.
const BUBBLE_TTL_MS = 2200;

export interface EmoteSignals {
  myEmoteSeq: number;
  myEmoteId: string | null;
  oppEmoteSeq: number;
  oppEmoteId: string | null;
}

interface Bubble {
  seq: number;
  emoji: string;
}

function Side({ seq, id, side }: { seq: number; id: string | null; side: 'me' | 'opp' }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  useEffect(() => {
    if (seq === 0 || !id) return;
    const e = getEmote(id);
    if (!e) return;
    setBubbles((cur) => [...cur, { seq, emoji: e.emoji }]);
    sfx.emote(); // a small chime whenever an emote pops — mine or the opponent's
    const t = setTimeout(() => setBubbles((c) => c.filter((x) => x.seq !== seq)), BUBBLE_TTL_MS);
    return () => clearTimeout(t);
  }, [seq, id]);
  return (
    <div className={`emote-bubbles ${side}`}>
      {bubbles.map((b) => (
        <span
          key={b.seq}
          className="emote-bubble"
          onAnimationEnd={() => setBubbles((c) => c.filter((x) => x.seq !== b.seq))}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}

export function EmoteOverlay({ myEmoteSeq, myEmoteId, oppEmoteSeq, oppEmoteId }: EmoteSignals) {
  return (
    <>
      <Side seq={myEmoteSeq} id={myEmoteId} side="me" />
      <Side seq={oppEmoteSeq} id={oppEmoteId} side="opp" />
    </>
  );
}
