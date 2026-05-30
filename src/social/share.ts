// social/share.ts — Web Share API with clipboard fallback (plan §14). The Kakao
// SDK path activates once a JS key is configured (see kakaoConfig).
export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export async function shareLink(p: SharePayload): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: p.title, text: p.text, url: p.url });
      return 'shared';
    }
  } catch {
    /* user cancelled or unsupported — fall through to clipboard */
  }
  try {
    await navigator.clipboard.writeText(p.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Kakao JS key is public by design; fill in after creating the Kakao app. */
export const kakaoConfig = { jsKey: 'REPLACE_ME' as const };
export const KAKAO_CONFIGURED = false;
