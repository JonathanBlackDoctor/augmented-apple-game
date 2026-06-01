// Inner markup of the four active augments' crests, copied verbatim from
// src/ui/components/augmentEmblems.ts (EMBLEM_SVG) with the outer <svg> wrapper
// removed and var(--font) → Quicksand for static rasterization.
export const EMBLEM_INNER = {
  bomb: `<defs><radialGradient id="bm-b" cx="38%" cy="30%" r="82%"><stop offset="0" stop-color="#6b7280"/><stop offset="45" stop-color="#3a4250"/><stop offset="100" stop-color="#1c2230"/></radialGradient></defs>
      <path d="M52 18 C56 8 64 5 70 8" fill="none" stroke="#8a6a40" stroke-width="2.6" stroke-linecap="round"/>
      <g><path d="M70 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" fill="#ffb53a"/><circle cx="70" cy="8" r="2.2" fill="#fff3c4"/></g>
      <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" transform="translate(8,12) scale(.84)" fill="url(#bm-b)"/>
      <ellipse cx="44" cy="40" rx="11" ry="7" fill="#aeb6c6" opacity=".4"/>
      <circle cx="42" cy="36" r="3.4" fill="#fff" opacity=".5"/>
      <g transform="translate(76,78)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#bcc7d4" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="Quicksand" font-size="7.4" font-weight="800" fill="#5d6b7d">+10</text></g>`,
  golden: `<defs><radialGradient id="gd-b" cx="38%" cy="30%" r="82%"><stop offset="0" stop-color="#fff6cf"/><stop offset="42" stop-color="#ffd35a"/><stop offset="100" stop-color="#c8890f"/></radialGradient></defs>
      <g>
        <rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/>
        <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="url(#gd-b)" stroke="#c8890f" stroke-width="1"/>
        <ellipse cx="38" cy="33" rx="13" ry="9" fill="#fff" opacity="0.62"/><circle cx="66" cy="40" r="3.4" fill="#fff" opacity=".55"/>
      </g>
      <g fill="#fff6cf"><path d="M20 28 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 Z"/></g>
      <g fill="#fff6cf"><path d="M82 56 l1.1 2.8 2.8 1.1 -2.8 1.1 -1.1 2.8 -1.1 -2.8 -2.8 -1.1 2.8 -1.1 Z"/></g>
      <g transform="translate(76,76)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="3.2" text-anchor="middle" font-family="Quicksand" font-size="9" font-weight="800" fill="#B97F12">×2</text></g>`,
  gem: `<defs><linearGradient id="gm-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff3ff"/><stop offset="50" stop-color="#5ec6e8"/><stop offset="100" stop-color="#2f7fc4"/></linearGradient><linearGradient id="gm-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd6ef"/><stop offset="100" stop-color="#2766aa"/></linearGradient></defs>
      <rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/>
      <g>
        <path d="M50 20 L74 38 L66 50 L58 84 L42 84 L34 50 L26 38 Z" fill="url(#gm-l)" stroke="#cdeefb" stroke-width="1"/>
        <path d="M50 20 L50 84 M26 38 L66 50 M74 38 L34 50 M34 50 L50 84 M66 50 L50 84" stroke="#ffffff" stroke-width="1" opacity=".55" fill="none"/>
        <path d="M50 20 L74 38 L66 50 L50 46 Z" fill="#ffffff" opacity=".3"/>
        <path d="M50 46 L66 50 L58 84 L50 84 Z" fill="#1f5d9e" opacity=".25"/>
        <circle cx="44" cy="38" r="2.6" fill="#fff" opacity=".85"/>
      </g>
      <g transform="translate(76,78)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="Quicksand" font-size="7.6" font-weight="800" fill="#B97F12">+20</text></g>`,
  gambler: `<defs><linearGradient id="gb-d1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="100" stop-color="#e6e0ff"/></linearGradient><linearGradient id="gb-d2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe9ff"/><stop offset="100" stop-color="#c9c0f0"/></linearGradient></defs>
      <g style="transform-origin:42px 46px">
        <rect x="22" y="26" width="40" height="40" rx="9" fill="url(#gb-d1)" stroke="#cfc6ff" stroke-width="1.4" transform="rotate(-12 42 46)"/>
        <g transform="rotate(-12 42 46)" fill="#8a7dff"><circle cx="33" cy="37" r="3.2"/><circle cx="51" cy="37" r="3.2"/><circle cx="33" cy="55" r="3.2"/><circle cx="51" cy="55" r="3.2"/><circle cx="42" cy="46" r="3.2"/></g>
      </g>
      <g style="transform-origin:66px 64px">
        <rect x="54" y="50" width="28" height="28" rx="7" fill="url(#gb-d2)" stroke="#cfc6ff" stroke-width="1.2" transform="rotate(14 68 64)"/>
        <g transform="rotate(14 68 64)" fill="#6f63c8"><circle cx="62" cy="58" r="2.4"/><circle cx="74" cy="70" r="2.4"/><circle cx="68" cy="64" r="2.4"/></g>
      </g>
      <g transform="translate(24,26)"><circle r="10" fill="#fffdf6"/><circle r="10" fill="none" stroke="#5ec88f" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="Quicksand" font-size="7.6" font-weight="800" fill="#2f7a52">3×</text></g>
      <g transform="translate(82,30)"><circle r="10" fill="#fffdf6"/><circle r="10" fill="none" stroke="#e04a36" stroke-width="2.2"/><text x="0" y="2.2" text-anchor="middle" font-family="Quicksand" font-size="6.2" font-weight="800" fill="#c93f2c">0.4×</text></g>`,
};
