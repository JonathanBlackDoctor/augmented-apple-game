// ui/components/EmoteOverlay.tsx — floating emote bubbles for both sides. Watches
// the versus store's emote pulses (seq bumps) and spawns a short-lived bubble that
// removes itself on animation end (same pattern as the score "+N" popups).
import { useEffect, useState } from 'react';
import { useVersusStore } from '../../app/versusStore';
import { getEmote } from '../../emotes';

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
