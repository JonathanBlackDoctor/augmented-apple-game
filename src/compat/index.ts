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

/** Pure UA check for phones/tablets (testable). iPadOS 13+ masquerades as Mac,
 *  so callers should also consider touch capability via {@link isMobileLikely}. */
export function isMobileUA(ua?: string): boolean {
  const s = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(s);
}

/** True on real touch phones/tablets — used to gate the landscape-fullscreen
 *  button so it doesn't show on desktop. Mobile UA, or a coarse-pointer touch
 *  screen (catches iPadOS-as-Mac without flagging touch laptops with a mouse). */
export function isMobileLikely(): boolean {
  if (isMobileUA()) return true;
  if (typeof navigator === 'undefined') return false;
  const touch = navigator.maxTouchPoints > 0;
  const coarse =
    typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return touch && coarse;
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

type OrientationLock = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

/** Lock to landscape — only works while fullscreen on most browsers and is a
 *  no-op where unsupported (e.g. iOS Safari), so callers can fire-and-forget. */
export function lockLandscape(): void {
  if (typeof screen === 'undefined') return;
  const o = screen.orientation as OrientationLock | undefined;
  if (o?.lock) void o.lock('landscape').catch(() => {});
}

export function unlockOrientation(): void {
  if (typeof screen === 'undefined') return;
  const o = screen.orientation as OrientationLock | undefined;
  try {
    o?.unlock?.();
  } catch {
    /* unsupported — ignore */
  }
}

/** Go fullscreen then lock to landscape. Both steps degrade gracefully where the
 *  browser refuses (must run from a user gesture). Awaiting fullscreen first
 *  matters: orientation lock is rejected until the element is actually fullscreen. */
export async function enterLandscapeFullscreen(
  el: Element = document.documentElement,
): Promise<void> {
  const e = el as FsElement;
  const fn = e.requestFullscreen?.bind(e) ?? e.webkitRequestFullscreen?.bind(e);
  if (fn) {
    try {
      await fn();
    } catch {
      /* gesture/permission denied — still try to lock below */
    }
  }
  lockLandscape();
}

export function exitLandscapeFullscreen(): void {
  unlockOrientation();
  exitFullscreen();
}

export async function toggleLandscapeFullscreen(el?: Element): Promise<void> {
  if (isFullscreen()) exitLandscapeFullscreen();
  else await enterLandscapeFullscreen(el);
}
