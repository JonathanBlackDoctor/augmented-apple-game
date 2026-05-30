import { useState } from 'react';
import { isInAppBrowser, openExternal } from '../../compat';

// Shown inside KakaoTalk / Instagram / etc. in-app webviews, which can break
// fullscreen, audio and deep links (plan §14). Offers to reopen externally.
export function InAppBanner() {
  const [show, setShow] = useState(() => isInAppBrowser());
  if (!show) return null;
  return (
    <div className="inapp-banner">
      <span>더 나은 플레이를 위해 크롬·사파리 등 외부 브라우저에서 열어주세요.</span>
      <div className="inapp-actions">
        <button className="btn-mini" onClick={() => openExternal(window.location.href)}>
          외부로 열기
        </button>
        <button className="btn-mini ghost" onClick={() => setShow(false)}>
          닫기
        </button>
      </div>
    </div>
  );
}
