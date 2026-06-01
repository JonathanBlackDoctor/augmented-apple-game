/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// One id per build (CI commit SHA when available, else a timestamp). It's baked
// into the bundle via `define` AND written to dist/version.json; the running app
// polls version.json and reloads when the two differ, so a redeploy can't leave
// PC/mobile clients stuck on a cached old bundle (see src/app/updateCheck.ts).
const buildId = (process.env.GITHUB_SHA ?? Date.now().toString(36)).slice(0, 12);

// Emit version.json into the build output. (Only runs for `vite build`; in dev
// the file is absent and the updater simply skips — see updateCheck.ts.)
function emitVersionJson(): Plugin {
  return {
    name: 'emit-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      });
    },
  };
}

// base: './' keeps asset URLs relative so the same build works locally (preview)
// and on a GitHub Pages *project* subpath. Deep-links use ?room= query params
// (not path routing) so no base-aware router is required. If you prefer an
// absolute base, set it to '/<your-repo-name>/'.
export default defineConfig({
  base: './',
  plugins: [react(), emitVersionJson()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: { provider: 'v8' },
  },
});
