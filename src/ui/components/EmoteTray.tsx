// ui/components/EmoteTray.tsx — in-battle emote launcher (Clash-Royale-style).
// A corner button opens your unlocked emotes; tapping one fires a bubble on your
// side (rendered by EmoteOverlay) and a small SFX.
import { useState } from 'react';
import { useProgressStore } from '../../app/progressStore';
import { useVersusStore } from '../../app/versusStore';
import { getEmote, type Emote } from '../../emotes';
import { sfx } from '../../app/sound';

export function EmoteTray() {
  const unlocked = useProgressStore((s) => s.unlockedEmotes);
  const send = useVersusStore((s) => s.sendMyEmote);
  const [open, setOpen] = useState(false);
  const emotes = unlocked.map(getEmote).filter((e): e is Emote => Boolean(e));

  const fire = (id: string): void => {
    send(id);
    sfx.emote();
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
