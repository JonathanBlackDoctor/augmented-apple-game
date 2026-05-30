// compat/index.ts — in-app browser detection, external open, fullscreen (plan §14).
// UA detection is pure/testable; the open/fullscreen helpers touch browser APIs.
export interface InAppInfo {
  inApp: boolean;
  app: string | null;
}

const PATTERNS: Array<[RegExp, string]> = [
  [/KAKAOTALK/i, 'KakaoTalk'],
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB/i, 'Facebook'],
  [/Line\//i, 'LINE'],
  [/NAVER\(inapp/i, 'Naver'],
  [/DaumApps/i, 'Daum'],
];

export function detectInApp(ua: string): InAppInfo {
  for (const [re, app] of PATTERNS) if (re.test(ua)) return { inApp: true, app };
  return { inApp: false, app: null };
}

export function isInAppBrowser(ua?: string): boolean {
  const s = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return detectInApp(s).inApp;
}

/** Best-effort "open in external browser" for in-app webviews (plan §14). */
export function openExternal(url: string): void {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Android/i.test(ua)) {
    if (/KAKAOTALK/i.test(ua)) {
      window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
      return;
    }
    const noScheme = url.replace(/^https?:\/\//, '');
    window.location.href = `intent://${noScheme}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }
  // iOS in-app webviews can't be opened programmatically reliably — the caller
  // should show a "tap ⋯ → open in Safari" guide instead.
  window.open(url, '_blank');
}

type FsElement = Element & { webkitRequestFullscreen?: () => Promise<void> };
type FsDocument = Document & {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
};

export function requestFullscreen(el: Element = document.documentElement): void {
  const e = el as FsElement;
  const fn = e.requestFullscreen?.bind(e) ?? e.webkitRequestFullscreen?.bind(e);
  if (fn) void fn();
}

export function exitFullscreen(): void {
  const d = document as FsDocument;
  const fn = d.exitFullscreen?.bind(d) ?? d.webkitExitFullscreen?.bind(d);
  if (fn) void fn();
}

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document as FsDocument;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

export function toggleFullscreen(el?: Element): void {
  if (isFullscreen()) exitFullscreen();
  else requestFullscreen(el);
}
