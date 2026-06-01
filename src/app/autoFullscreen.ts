// app/autoFullscreen.ts — make mobile default to landscape + fullscreen.
//
// Browsers only allow fullscreen / orientation-lock from a user gesture, so we
// can't force it on load. Instead we arm a one-shot handler that, on the player's
// very first tap (on a phone/tablet), drops the browser chrome and locks to
// landscape — giving the maximum board area without the player hunting for the
// "가로모드 전체화면" button. Degrades gracefully where the browser refuses
// (notably iOS Safari, which ignores both APIs — there the 사파리 바로가기 /
// installed PWA provides the standalone landscape experience instead).
import { isMobileLikely, enterLandscapeFullscreen } from '../compat';

let armed = false;

export function armAutoLandscape(): void {
  if (typeof window === 'undefined' || armed) return;
  if (!isMobileLikely()) return;
  armed = true;
  const onFirstGesture = (): void => {
    window.removeEventListener('pointerdown', onFirstGesture);
    void enterLandscapeFullscreen();
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
}
