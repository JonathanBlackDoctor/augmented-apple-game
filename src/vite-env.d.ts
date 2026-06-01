/// <reference types="vite/client" />

// Build stamp injected by vite.config.ts (`define`). Compared at runtime against
// the deployed `version.json` so stale clients (cached old bundle) auto-refresh.
declare const __BUILD_ID__: string;
