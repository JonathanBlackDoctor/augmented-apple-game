// ui/components/EmoteOverlay.tsx — floating emote bubbles for both sides. Watches
// the versus store's emote pulses (seq bumps) and spawns a short-lived bubble.
// A timed self-removal (not just onAnimationEnd) guarantees the bubble clears:
// under prefers-reduced-motion the CSS sets `animation: none`, so the
// animationend event never fires and bubbles would otherwise linger forever.
import { useEffect, useState } from 'react';
import { useVersusStore } from '../../app/versusStore';
import { getEmote } from '../../emotes';

// Slightly longer than the emoteFloat animation (1.8s) so a bubble that *does*
// animate finishes naturally; the timer is the hard backstop for the no-animation
// (reduced-motion) case.
const BUBBLE_TTL_MS = 2200;

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

export function EmoteOverlay() {
  const myEmoteSeq = useVersusStore((s) => s.myEmoteSeq);
  const myEmoteId = useVersusStore((s) => s.myEmoteId);
  const oppEmoteSeq = useVersusStore((s) => s.oppEmoteSeq);
  const oppEmoteId = useVersusStore((s) => s.oppEmoteId);
  return (
    <>
      <Side seq={myEmoteSeq} id={myEmoteId} side="me" />
      <Side seq={oppEmoteSeq} id={oppEmoteId} side="opp" />
    </>
  );
}
