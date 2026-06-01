// ui/components/LandscapeFullscreenButton.tsx — mobile-only button that drops the
// browser chrome and locks the screen to landscape, giving phones the maximum
// board area. Hidden on desktop. Both fullscreen and orientation lock degrade
// gracefully where the browser refuses (notably iOS Safari ignores the lock).
import { useEffect, useState } from 'react';
import { isFullscreen, isMobileLikely, toggleLandscapeFullscreen } from '../../compat';

export function LandscapeFullscreenButton() {
  const [show] = useState(isMobileLikely);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    if (!show) return;
    const sync = () => setFs(isFullscreen());
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, [show]);

  if (!show) return null;

  return (
    <button
      type="button"
      className="btn ghost small landscape-fs-btn"
      onClick={() => void toggleLandscapeFullscreen()}
    >
      {fs ? '⤡ 전체화면 끄기' : '⛶ 가로모드 전체화면'}
    </button>
  );
}
