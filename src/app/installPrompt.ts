// app/installPrompt.ts — "앱으로 다운로드" (PWA install) support.
//
// Chromium fires `beforeinstallprompt` when the app is installable; we stash the
// event so the settings button can trigger the native prompt on demand. iOS
// Safari has no such API — there the only path is "공유 → 홈 화면에 추가"
// (사파리 바로가기), so the UI shows those steps instead.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Suppress Chrome's mini-infobar; we surface our own button in settings.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
  });
}

/** Already launched as an installed app (standalone display mode)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

/** iPhone/iPad/iPod, including iPadOS 13+ which masquerades as a Mac. */
export function isIOS(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
}

/** A native install prompt is currently available (Chromium only). */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Fire the native install prompt. Returns its outcome, or 'unavailable' when no
 *  deferred prompt is held (iOS, Firefox, or criteria not yet met). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome;
}
