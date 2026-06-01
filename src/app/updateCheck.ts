// app/updateCheck.ts — keep clients off a stale cached bundle.
//
// GitHub Pages can't set custom Cache-Control, so a browser (or an installed
// PWA) that already loaded the site may keep serving the cached old index.html
// + hashed JS after a redeploy — which is exactly how PC/mobile ended up on the
// pre-update apple while a fresh iPad showed the new one.
//
// Fix: each build bakes a `__BUILD_ID__` into the bundle and writes the same id
// to dist/version.json (vite.config.ts). We fetch version.json with cache
// bypassed; if its id differs from the baked one, a newer build is live and we
// reload. Reloading pulls the new index.html + bundle, whose baked id now
// matches version.json, so it settles after one reload (no loop).

const VERSION_URL = `${import.meta.env.BASE_URL}version.json`;
// Backstop poll for long-lived sessions that never background the tab.
const POLL_MS = 5 * 60_000;

let reloading = false;

async function fetchDeployedId(): Promise<string | null> {
  try {
    // cache:'no-store' + a cache-busting query so no layer hands us a stale copy.
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const id = (data as { buildId?: unknown })?.buildId;
    return typeof id === 'string' ? id : null;
  } catch {
    // Offline / file missing (e.g. dev) — nothing to do.
    return null;
  }
}

async function check(): Promise<void> {
  if (reloading) return;
  const deployed = await fetchDeployedId();
  if (deployed && deployed !== __BUILD_ID__) {
    reloading = true;
    window.location.reload();
  }
}

/** Start polling for new deploys. No-op in dev (no version.json is emitted). */
export function startUpdateCheck(): void {
  if (!import.meta.env.PROD || typeof window === 'undefined') return;
  // Check when the user returns to the tab — they're between actions, not
  // mid-drag, so a reload then is unobtrusive.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  window.setInterval(() => void check(), POLL_MS);
  void check();
}
