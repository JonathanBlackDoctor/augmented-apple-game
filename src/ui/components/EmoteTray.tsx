// ui/components/EmoteTray.tsx — in-battle emote launcher (Clash-Royale-style).
// A corner button opens your unlocked emotes; tapping one fires a bubble on your
// side via the `onSend` callback (versus or online). The bubble + its SFX are
// rendered/played by EmoteOverlay, so the same tray works in both modes.
import { useState } from 'react';
import { useProgressStore } from '../../app/progressStore';
import { getEmote, type Emote } from '../../emotes';

export function EmoteTray({ onSend }: { onSend: (id: string) => void }) {
  const unlocked = useProgressStore((s) => s.unlockedEmotes);
  const [open, setOpen] = useState(false);
  const emotes = unlocked.map(getEmote).filter((e): e is Emote => Boolean(e));

  const fire = (id: string): void => {
    onSend(id);
    setOpen(false);
  };

  return (
    <div className="emote-tray">
      {open && (
        <div className="emote-popup">
          {emotes.map((e) => (
            <button
              key={e.id}
              className="emote-opt"
              onClick={() => fire(e.id)}
              title={e.label}
              aria-label={e.label}
            >
              {e.emoji}
            </button>
          ))}
        </div>
      )}
      <button
        className={`emote-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="감정표현"
      >
        😀
      </button>
    </div>
  );
}
