/* ESLint config — includes the MANDATORY "core purity" rules from plan §3/§7:
   src/core/** must never import react/pixi.js/firebase/zustand or touch DOM
   globals, Date.now, or Math.random. All randomness comes from an injected
   SeededRng; all time comes from an injected monotonic clock. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', 'coverage', 'node_modules', '*.cjs', 'vite.config.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      // ★ PURE CORE — deterministic, framework-free, no ambient time/randomness.
      files: ['src/core/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'core must stay framework-free' },
              { group: ['pixi.js', 'pixi.js/*'], message: 'core must not render' },
              { group: ['firebase', 'firebase/*'], message: 'core must not touch network' },
              { group: ['zustand', 'zustand/*'], message: 'core must not depend on app state lib' },
            ],
          },
        ],
        'no-restricted-globals': [
          'error',
          { name: 'window', message: 'core is framework-free' },
          { name: 'document', message: 'core is framework-free' },
          { name: 'navigator', message: 'core is framework-free' },
          { name: 'localStorage', message: 'core is framework-free' },
          { name: 'performance', message: 'inject a monotonic clock instead' },
          { name: 'requestAnimationFrame', message: 'core is framework-free' },
          { name: 'Date', message: 'inject a monotonic clock instead of using Date' },
        ],
        'no-restricted-properties': [
          'error',
          { object: 'Math', property: 'random', message: 'use the injected SeededRng' },
          { object: 'Date', property: 'now', message: 'inject a monotonic clock' },
        ],
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
    },
  ],
};
