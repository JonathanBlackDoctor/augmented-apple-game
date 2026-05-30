/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset URLs relative so the same build works locally (preview)
// and on a GitHub Pages *project* subpath. Deep-links use ?room= query params
// (not path routing) so no base-aware router is required. If you prefer an
// absolute base, set it to '/<your-repo-name>/'.
export default defineConfig({
  base: './',
  plugins: [react()],
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
