# OG image generator

Generates [`public/og.png`](../../public/og.png) — the Open Graph / social card.

It is **not** a screenshot. It recreates an actual late-game playthrough as a
1200×630 landscape (desktop/tablet) scene, rebuilt from the game's own renderer
constants so it stays on-brand:

- **Apples** — circle body + elliptical `radial-gradient(72% 60% at 50% 30%)` +
  stem/leaf (or bomb fuse), palettes and number colours verbatim from
  [`src/board/candyApple.ts`](../../src/board/candyApple.ts).
- **Sky** — 해질녘/황혼 (dusk) gradient sampled from the
  [`DayNightSky`](../../src/ui/components/DayNightSky.tsx) keyframes, with a
  setting sun, early stars and hill silhouettes.
- **HUD** — score / warn timer bar / combo chip, dusk-adaptive warm ink, mirroring
  [`Hud.tsx`](../../src/ui/components/Hud.tsx) + `styles.css`.
- **Augments, all firing at once** (the requested moment):
  - **폭탄** — explosion rings + flung particles + spark.
  - **황금 ×2** + **보석 +20** — cleared in a valid (sum-10) selection with the
    `+점수` headline, sum bubble and sparkles.
  - **도박사** — a die mid-tumble landing the `2×` roll.
  - Right rail shows the four owned-augment crests, embedded verbatim from
    [`augmentEmblems.ts`](../../src/ui/components/augmentEmblems.ts).

## Rebuild

```bash
cd tools/og-image
npm install         # @resvg/resvg-js, sharp, two @expo-google-fonts (.ttf) packages
npm run build       # → writes ../../public/og.png (renders at 2× then downscales)
```

Pass an explicit output path with `node gen.mjs path/to/out.png`.

Fonts (Quicksand for numerals, Noto Sans KR for Korean — the registry-installable
stand-ins for the app's Quicksand + Pretendard) are pulled from the
`@expo-google-fonts/*` packages, which ship real `.ttf` files that resvg can load.
