// MusicToggle — floating speaker button to mute/unmute the background music.
// The mute state lives in the store (persisted across sessions); this component
// keeps the bgm player in sync with it and arms playback on the first gesture.
import { useEffect } from 'react';
import { useGameStore } from '../../app/store';
import { bgm } from '../../app/bgm';

export function MusicToggle() {
  const muted = useGameStore((s) => s.musicMuted);
  const toggleMusic = useGameStore((s) => s.toggleMusic);

  // Push the current mute state into the player whenever it changes.
  useEffect(() => {
    bgm.setMuted(muted);
  }, [muted]);

  // Autoplay is blocked until a user gesture — arm playback on the first one.
  useEffect(() => {
    const arm = (): void => bgm.arm();
    const opts = { once: true } as const;
    window.addEventListener('pointerdown', arm, opts);
    window.addEventListener('keydown', arm, opts);
    window.addEventListener('touchstart', arm, opts);
    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
    };
  }, []);

  return (
    <button
      type="button"
      className="music-toggle"
      onClick={() => toggleMusic()}
      aria-pressed={muted}
      aria-label={muted ? '배경 음악 켜기' : '배경 음악 끄기'}
      title={muted ? '배경 음악 켜기' : '배경 음악 끄기'}
    >
      {muted ? (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            d="M4 9v6h4l5 4V5L8 9H4z"
            fill="currentColor"
          />
          <path
            d="M16 9l5 6M21 9l-5 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          <path
            d="M16.5 8.5a5 5 0 010 7M18.8 6.2a8 8 0 010 11.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </button>
  );
}
