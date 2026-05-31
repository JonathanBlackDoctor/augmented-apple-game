// ui/components/augmentEmblems.ts — per-augment glossy SVG crests.
//
// Ported 1:1 from the design showcase "증강 쇼케이스 (단일파일)" (catalog
// screen). Each crest is a self-contained viewBox 0 0 100 100 vector keyed
// by augment id, in the "햇살 과수원 (Sunlit Orchard)" palette, with a family
// motif system (clock/stopwatch=time, spark/flame=combo, apple=board,
// crystal/heart=rule, dice/cannon=risk) and three tier finishes
// (silver/gold/prism). Idle micro-animations are driven by the .emblem-scoped
// classes in ui/styles.css. The gradient/clip ids below are namespaced per
// render by <AugmentEmblem/> so multiple crests can coexist on one screen.
//
// NOTE: tiers here use the showcase token 'prism'; the app's AugTier is
// 'prismatic'. The class is only the crest's internal drop-shadow finish, so
// it stays as authored and does not clash with the card-level tier styling.

export const EMBLEM_SVG: Record<string, string> = {
  "time.relief": `<svg class="emblem silver" viewBox="0 0 100 100" role="img" aria-label="여유 시계">
      <defs><radialGradient id="rl-f" cx="40%" cy="32%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="55" stop-color="#eef1f6"/><stop offset="100" stop-color="#d3dbe6"/></radialGradient><linearGradient id="rl-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f7"/><stop offset="50" stop-color="#c4cdda"/><stop offset="100" stop-color="#a9b5c5"/></linearGradient></defs>
      <g transform="rotate(20 66 18)"><rect x="63.4" y="12" width="2.8" height="9" rx="1.4" fill="#7a5230"/><path d="M66 14 C71 8 80 7 85 9 C81 17 73 20 65 17 Z" fill="#6fb35a"/></g>
      <circle cx="50" cy="50" r="35" fill="url(#rl-r)"/>
      <circle cx="50" cy="50" r="30.5" fill="url(#rl-f)"/>
      <line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(0 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(30 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(60 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(90 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(120 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(150 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(180 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(210 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(240 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(270 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(300 50 50)"/><line x1="50" y1="23" x2="50" y2="28" stroke="#aeb6c6" stroke-width="1.8" stroke-linecap="round" transform="rotate(330 50 50)"/>
      <line x1="50" y1="50" x2="41" y2="36" stroke="#4a4a5e" stroke-width="3" stroke-linecap="round"/>
      <line x1="50" y1="50" x2="61" y2="46" stroke="#4a4a5e" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="3" fill="#3a3a4e"/>
      <ellipse cx="40" cy="34" rx="12" ry="7" fill="#fff" opacity="0.55"/>
      <g transform="translate(75,76)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#5E9A4E" stroke-width="2.2"/><text x="0" y="2.6" text-anchor="middle" font-family="var(--font)" font-size="7.2" font-weight="800" fill="#3f7a32">+7초</text></g>
    </svg>`,
  "time.countdown": `<svg class="emblem silver" viewBox="0 0 100 100" role="img" aria-label="초읽기 스톱워치">
      <defs><radialGradient id="cd-f" cx="40%" cy="32%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="55" stop-color="#eef1f6"/><stop offset="100" stop-color="#d2dae6"/></radialGradient><linearGradient id="cd-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f7"/><stop offset="50" stop-color="#c4cdda"/><stop offset="100" stop-color="#a9b5c5"/></linearGradient></defs>
      <rect x="46" y="6" width="8" height="7" rx="2" fill="url(#cd-r)"/>
      <rect x="44.5" y="3.5" width="11" height="4.5" rx="2.2" fill="url(#cd-r)"/>
      <line x1="71" y1="22" x2="77" y2="16" stroke="#aab6c6" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="54" r="33" fill="url(#cd-r)"/>
      <circle cx="50" cy="54" r="28.5" fill="url(#cd-f)"/>
      <line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(0 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(30 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(60 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(90 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(120 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(150 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(180 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(210 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(240 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(270 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(300 50 54)"/><line x1="50" y1="29" x2="50" y2="35" stroke="#9fa9bb" stroke-width="2.4" stroke-linecap="round" transform="rotate(330 50 54)"/>
      <path d="M50 54 L50 35" stroke="#e04a36" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="50" cy="54" r="3" fill="#e04a36"/>
      <ellipse cx="41" cy="40" rx="11" ry="6.5" fill="#fff" opacity="0.5"/>
      <g transform="translate(75,78)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#5E9A4E" stroke-width="2.2"/><text x="0" y="2.4" text-anchor="middle" font-family="var(--font)" font-size="6.6" font-weight="800" fill="#3f7a32">+0.5</text></g>
    </svg>`,
  "time.tempo": `<svg class="emblem silver" viewBox="0 0 100 100" role="img" aria-label="속도 게이지">
      <defs><radialGradient id="tp-f" cx="42%" cy="30%" r="85%"><stop offset="0" stop-color="#ffffff"/><stop offset="55" stop-color="#eef1f6"/><stop offset="100" stop-color="#d2dae6"/></radialGradient><linearGradient id="tp-arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fb6d6"/><stop offset="60" stop-color="#7fd1c0"/><stop offset="100" stop-color="#62b86f"/></linearGradient></defs>
      <circle cx="50" cy="56" r="34" fill="url(#tp-f)" stroke="#c4cdda" stroke-width="1.4"/>
      <path d="M22 60 A30 30 0 0 1 78 60" fill="none" stroke="#dde3ec" stroke-width="6" stroke-linecap="round"/>
      <path d="M22 60 A30 30 0 0 1 70 38" fill="none" stroke="url(#tp-arc)" stroke-width="6" stroke-linecap="round"/>
      <g stroke="#9fa9bb" stroke-width="1.6" stroke-linecap="round">
        <line x1="24" y1="58" x2="29" y2="56"/><line x1="33" y1="44" x2="37" y2="48"/><line x1="50" y1="38" x2="50" y2="43"/><line x1="67" y1="44" x2="63" y2="48"/>
      </g>
      <line x1="50" y1="60" x2="66" y2="44" stroke="#e04a36" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="60" r="4.2" fill="#3a3a4e"/>
      <ellipse cx="40" cy="44" rx="10" ry="6" fill="#fff" opacity="0.45"/>
      <g transform="translate(76,30)"><circle r="10" fill="#fffdf6"/><circle r="10" fill="none" stroke="#5E9A4E" stroke-width="2.2"/><text x="0" y="2.4" text-anchor="middle" font-family="var(--font)" font-size="6.6" font-weight="800" fill="#3f7a32">+0.5</text></g>
    </svg>`,
  "time.warmup": `<svg class="emblem silver" viewBox="0 0 100 100" role="img" aria-label="워밍업 일출">
      <defs><radialGradient id="wu-sun" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#fff3c4"/><stop offset="55" stop-color="#ffd166"/><stop offset="100" stop-color="#f0a32a"/></radialGradient><linearGradient id="wu-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde9c0"/><stop offset="100" stop-color="#fdfaf2"/></linearGradient></defs>
      <circle cx="50" cy="50" r="37" fill="url(#wu-sky)" stroke="#ecd9b0" stroke-width="1.4"/>
      <g stroke="#f4b740" stroke-width="3" stroke-linecap="round" class="anim twinkle">
        <line x1="50" y1="22" x2="50" y2="14"/><line x1="68" y1="30" x2="74" y2="24"/><line x1="32" y1="30" x2="26" y2="24"/><line x1="74" y1="48" x2="82" y2="46"/><line x1="26" y1="48" x2="18" y2="46"/>
      </g>
      <path d="M30 60 A20 20 0 0 1 70 60 Z" fill="url(#wu-sun)"/>
      <line x1="22" y1="60" x2="78" y2="60" stroke="#e8a93a" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="42" cy="52" rx="8" ry="4" fill="#fff" opacity="0.5"/>
      <g transform="translate(76,30)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="2.6" text-anchor="middle" font-family="var(--font)" font-size="7.2" font-weight="800" fill="#B97F12">1.5×</text></g>
    </svg>`,
  "time.spurt": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="막판 스퍼트">
      <defs><radialGradient id="sp-f" cx="40%" cy="32%" r="82%"><stop offset="0" stop-color="#fffaf0"/><stop offset="55" stop-color="#ffe9b8"/><stop offset="100" stop-color="#f0c163"/></radialGradient><linearGradient id="sp-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a0"/><stop offset="50" stop-color="#e3a12a"/><stop offset="100" stop-color="#a9740f"/></linearGradient></defs>
      <g stroke="#e6892a" stroke-width="3.2" stroke-linecap="round" opacity=".7" class="anim twinkle">
        <line x1="6" y1="36" x2="24" y2="38"/><line x1="4" y1="52" x2="26" y2="52"/><line x1="8" y1="68" x2="24" y2="66"/>
      </g>
      <g transform="rotate(-13 52 52)">
        <circle cx="52" cy="52" r="31" fill="url(#sp-r)"/>
        <circle cx="52" cy="52" r="26.5" fill="url(#sp-f)"/>
        <line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(0 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(30 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(60 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(90 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(120 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(150 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(180 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(210 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(240 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(270 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(300 52 52)"/><line x1="52" y1="29" x2="52" y2="33" stroke="#c98f24" stroke-width="1.8" stroke-linecap="round" transform="rotate(330 52 52)"/>
        <line x1="52" y1="52" x2="42" y2="38" stroke="#7a4a10" stroke-width="3" stroke-linecap="round"/>
        <line x1="52" y1="52" x2="65" y2="48" stroke="#7a4a10" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="52" cy="52" r="3" fill="#5a3a0c"/>
      </g>
      <ellipse cx="43" cy="38" rx="10" ry="6" fill="#fff" opacity="0.55"/>
      <g transform="translate(78,76)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="3.2" text-anchor="middle" font-family="var(--font)" font-size="9" font-weight="800" fill="#B97F12">2×</text></g>
    </svg>`,
  "time.lord": `<svg class="emblem prism" viewBox="0 0 100 100" role="img" aria-label="시간의 지배자">
      <defs><radialGradient id="lord-face" cx="40%" cy="32%" r="80%"><stop offset="0" stop-color="#fefcff"/><stop offset="52" stop-color="#eef0fb"/><stop offset="100" stop-color="#d6dcf0"/></radialGradient><linearGradient id="lord-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b8cff"/><stop offset="48" stop-color="#6fd6cf"/><stop offset="100" stop-color="#ffd27a"/></linearGradient><linearGradient id="lord-hand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#564a72"/><stop offset="100" stop-color="#2c2440"/></linearGradient></defs>
      <rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/>
      <path class="freeze-pulse" d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="none" stroke="#bfe9ff" stroke-width="6" opacity=".5"/>
      <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="url(#lord-face)" stroke="url(#lord-rim)" stroke-width="3.4"/>
      <circle cx="50" cy="51" r="30" fill="none" stroke="#c9cfe7" stroke-width="1.1"/>
      <line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(0 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(30 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(60 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(90 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(120 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(150 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(180 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(210 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(240 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(270 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(300 50 51)"/><line x1="50" y1="24" x2="50" y2="29" stroke="#b3bbdb" stroke-width="1.8" stroke-linecap="round" transform="rotate(330 50 51)"/>
      <line x1="50" y1="51" x2="37" y2="41" stroke="url(#lord-hand)" stroke-width="3.4" stroke-linecap="round"/>
      <line x1="50" y1="51" x2="63" y2="39" stroke="url(#lord-hand)" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="50" cy="51" r="3.6" fill="#2c2440"/><circle cx="50" cy="51" r="1.4" fill="#9b8cff"/>
      <ellipse cx="39" cy="33" rx="15" ry="9" fill="#fff" opacity="0.5"/>
      <g fill="#dff3ff" stroke="#bfe6ff" stroke-width=".5">
        <path class="anim twinkle" d="M22 30 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z"/>
        <path class="anim twinkle" style="animation-delay:.9s" d="M78 36 l1.3 3.4 3.4 1.3 -3.4 1.3 -1.3 3.4 -1.3 -3.4 -3.4 -1.3 3.4 -1.3 Z"/>
        <path class="anim twinkle" style="animation-delay:1.6s" d="M70 80 l1.1 2.8 2.8 1.1 -2.8 1.1 -1.1 2.8 -1.1 -2.8 -2.8 -1.1 2.8 -1.1 Z"/>
      </g>
    </svg>`,
  "combo.training": `<svg class="emblem silver" viewBox="0 0 100 100" role="img" aria-label="훈련 과녁">
      <defs><radialGradient id="tr-b" cx="42%" cy="34%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="60" stop-color="#eef2f7"/><stop offset="100" stop-color="#cfd8e3"/></radialGradient></defs>
      <circle cx="48" cy="52" r="32" fill="url(#tr-b)" stroke="#c2ccd9" stroke-width="1.6"/>
      <circle cx="48" cy="52" r="23" fill="none" stroke="#b9c4d2" stroke-width="3"/>
      <circle cx="48" cy="52" r="13" fill="none" stroke="#9fb6d6" stroke-width="3"/>
      <circle cx="48" cy="52" r="4.5" fill="#e04a36"/>
      <path d="M40 52 l6 7 14 -16" fill="none" stroke="#5E9A4E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="anim twinkle"/>
      <ellipse cx="38" cy="40" rx="9" ry="5.5" fill="#fff" opacity="0.5"/>
      <g transform="translate(76,76)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#5E9A4E" stroke-width="2.2"/><text x="0" y="2.3" text-anchor="middle" font-family="var(--font)" font-size="6.4" font-weight="800" fill="#3f7a32">+10%</text></g>
    </svg>`,
  "combo.chain": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="연쇄 스파크">
      <defs><radialGradient id="ch-s" cx="40%" cy="36%" r="68%"><stop offset="0" stop-color="#fff9e2"/><stop offset="42" stop-color="#ffd968"/><stop offset="100" stop-color="#d2900d"/></radialGradient><radialGradient id="ch-c" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#ffffff"/><stop offset="100" stop-color="#ffe39a"/></radialGradient></defs>
      <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" transform="translate(27,28.5) scale(.45)" fill="#f4ca6e" opacity=".3"/>
      <g transform="translate(74,28)"><path class="anim twinkle" style="animation-delay:.3s" d="M0 -19 C2.6 -6 6 -2.6 19 0 C6 2.6 2.6 6 0 19 C-2.6 6 -6 2.6 -19 0 C-6 -2.6 -2.6 -6 0 -19 Z" transform="scale(.32)" fill="url(#ch-s)"/></g>
      <g transform="translate(26,73)"><path class="anim twinkle" style="animation-delay:1.1s" d="M0 -19 C2.6 -6 6 -2.6 19 0 C6 2.6 2.6 6 0 19 C-2.6 6 -6 2.6 -19 0 C-6 -2.6 -2.6 -6 0 -19 Z" transform="scale(.26)" fill="url(#ch-s)"/></g>
      <g transform="translate(80,70)"><path class="anim twinkle" style="animation-delay:1.7s" d="M0 -19 C2.6 -6 6 -2.6 19 0 C6 2.6 2.6 6 0 19 C-2.6 6 -6 2.6 -19 0 C-6 -2.6 -2.6 -6 0 -19 Z" transform="scale(.19)" fill="url(#ch-s)"/></g>
      <g transform="translate(47,49)">
        <path class="spin-slow" d="M0 -23 C3.2 -7.5 7.5 -3.2 23 0 C7.5 3.2 3.2 7.5 0 23 C-3.2 7.5 -7.5 3.2 -23 0 C-7.5 -3.2 -3.2 -7.5 0 -23 Z" fill="url(#ch-s)" stroke="#fff0bd" stroke-width=".8"/>
        <path d="M0 -12 C1.7 -4 4 -1.7 12 0 C4 1.7 1.7 4 0 12 C-1.7 4 -4 1.7 -12 0 C-4 -1.7 -1.7 -4 0 -12 Z" fill="url(#ch-c)"/>
        <circle cx="-4" cy="-4" r="2.4" fill="#fff" opacity=".85"/>
      </g>
      <g transform="translate(76,76)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="3.0" text-anchor="middle" font-family="var(--font)" font-size="8.4" font-weight="800" fill="#B97F12">1.5×</text></g>
    </svg>`,
  "combo.frenzy": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="폭주 불꽃">
      <defs><radialGradient id="fz-o" cx="46%" cy="75%" r="78%"><stop offset="0" stop-color="#fff2b0"/><stop offset="40" stop-color="#ffb838"/><stop offset="78" stop-color="#f0641e"/><stop offset="100" stop-color="#c43412"/></radialGradient><radialGradient id="fz-i" cx="50%" cy="70%" r="55%"><stop offset="0" stop-color="#fff6d8"/><stop offset="100" stop-color="#ffc24a"/></radialGradient></defs>
      <path class="bob" d="M50 14 C61 30 74 36 70 56 C67 74 58 84 50 84 C42 84 30 75 30 56 C26 38 41 36 44 22 C46 30 52 30 50 14 Z" fill="url(#fz-o)"/>
      <path d="M50 40 C57 50 62 56 58 66 C56 76 52 80 50 80 C46 80 42 74 42 65 C42 56 48 54 50 40 Z" fill="url(#fz-i)"/>
      <path class="anim twinkle" d="M50 30 l1.4 4.6 1.6 -4 1.2 4.2" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round"/>
      <g stroke="#fff0bd" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" class="anim twinkle" style="animation-delay:.6s">
        <path d="M50 60 l4 5 -4 -2 -4 2 Z" fill="#fff0bd"/>
      </g>
      <ellipse cx="43" cy="50" rx="5" ry="8" fill="#fff" opacity="0.5" transform="rotate(-20 43 50)"/>
      <g transform="translate(76,30)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="var(--font)" font-size="7.6" font-weight="800" fill="#B97F12">폭주</text></g>
    </svg>`,
  "combo.massacre": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="대량 제거 폭발">
      <defs><radialGradient id="ms-b" cx="48%" cy="46%" r="70%"><stop offset="0" stop-color="#fffbe8"/><stop offset="38" stop-color="#ffd35a"/><stop offset="78" stop-color="#f08a1e"/><stop offset="100" stop-color="#d2520d"/></radialGradient><radialGradient id="ms-c" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#ffffff"/><stop offset="100" stop-color="#ffe39a"/></radialGradient></defs>
      <path class="spin-slow" d="M50 8 L57 38 L86 30 L62 50 L84 72 L54 60 L50 92 L46 60 L16 72 L38 50 L14 30 L43 38 Z" fill="url(#ms-b)" stroke="#ffe08a" stroke-width="1"/>
      <circle cx="50" cy="50" r="17" fill="url(#ms-c)"/>
      <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" transform="translate(33,33) scale(.34)" fill="#e04a36" opacity=".9"/>
      <ellipse cx="43" cy="44" rx="6" ry="4" fill="#fff" opacity="0.8"/>
      <g fill="#fff3c4" class="anim twinkle"><circle cx="24" cy="26" r="2.4"/><circle cx="80" cy="24" r="2"/><circle cx="78" cy="78" r="2.4"/></g>
      <g transform="translate(78,78)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="3.2" text-anchor="middle" font-family="var(--font)" font-size="9" font-weight="800" fill="#B97F12">2×</text></g>
    </svg>`,
  "board.rearrange": `<svg class="emblem silver" viewBox="0 0 100 100" role="img" aria-label="재배치 스왑">
      <defs><radialGradient id="rr-a" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="#ff9a77"/><stop offset="50" stop-color="#e04a36"/><stop offset="100" stop-color="#b1301e"/></radialGradient><radialGradient id="rr-g" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="#ffe07a"/><stop offset="50" stop-color="#e3a12a"/><stop offset="100" stop-color="#b97f12"/></radialGradient></defs>
      <path class="anim spin-arrows" d="M28 32 A26 22 0 0 1 72 32" fill="none" stroke="#9fb0c4" stroke-width="3" stroke-linecap="round"/>
      <path d="M70 26 l5 6 -7 1 Z" fill="#9fb0c4"/>
      <path d="M72 70 A26 22 0 0 1 28 70" fill="none" stroke="#9fb0c4" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 76 l-5 -6 7 -1 Z" fill="#9fb0c4"/>
      <g transform="translate(1,18) scale(.58)"><rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/><path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="url(#rr-a)"/><ellipse cx="38" cy="34" rx="12" ry="8" fill="#fff" opacity="0.42"/><text x="50" y="62" text-anchor="middle" font-family="var(--font)" font-size="30" font-weight="800" fill="#fff" opacity=".9">7</text></g>
      <g transform="translate(53,18) scale(.58)"><rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/><path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="url(#rr-g)"/><ellipse cx="38" cy="34" rx="12" ry="8" fill="#fff" opacity="0.42"/><text x="50" y="62" text-anchor="middle" font-family="var(--font)" font-size="30" font-weight="800" fill="#fff" opacity=".9">3</text></g>
      <g transform="translate(50,52)"><circle r="11.5" fill="#fffdf6"/><circle r="11.5" fill="none" stroke="#bcc7d4" stroke-width="2.4"/><text x="0" y="4.4" text-anchor="middle" font-family="var(--font)" font-size="13" font-weight="800" fill="#5d6b7d">10</text></g>
    </svg>`,
  "board.golden": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="황금 사과">
      <defs><radialGradient id="gd-b" cx="38%" cy="30%" r="82%"><stop offset="0" stop-color="#fff6cf"/><stop offset="42" stop-color="#ffd35a"/><stop offset="100" stop-color="#c8890f"/></radialGradient></defs>
      <g class="bob">
        <rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/>
        <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="url(#gd-b)" stroke="#c8890f" stroke-width="1"/>
        <ellipse cx="38" cy="33" rx="13" ry="9" fill="#fff" opacity="0.62"/><circle cx="66" cy="40" r="3.4" fill="#fff" opacity=".55"/>
      </g>
      <g fill="#fff6cf" class="anim twinkle"><path d="M20 28 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 Z"/></g>
      <g fill="#fff6cf" class="anim twinkle" style="animation-delay:1s"><path d="M82 56 l1.1 2.8 2.8 1.1 -2.8 1.1 -1.1 2.8 -1.1 -2.8 -2.8 -1.1 2.8 -1.1 Z"/></g>
      <g transform="translate(76,76)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="3.2" text-anchor="middle" font-family="var(--font)" font-size="9" font-weight="800" fill="#B97F12">×2</text></g>
    </svg>`,
  "board.gem": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="보석 사과">
      <defs><linearGradient id="gm-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff3ff"/><stop offset="50" stop-color="#5ec6e8"/><stop offset="100" stop-color="#2f7fc4"/></linearGradient><linearGradient id="gm-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd6ef"/><stop offset="100" stop-color="#2766aa"/></linearGradient></defs>
      <rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/>
      <g class="bob">
        <path d="M50 20 L74 38 L66 50 L58 84 L42 84 L34 50 L26 38 Z" fill="url(#gm-l)" stroke="#cdeefb" stroke-width="1"/>
        <path d="M50 20 L50 84 M26 38 L66 50 M74 38 L34 50 M34 50 L50 84 M66 50 L50 84" stroke="#ffffff" stroke-width="1" opacity=".55" fill="none"/>
        <path d="M50 20 L74 38 L66 50 L50 46 Z" fill="#ffffff" opacity=".3"/>
        <path d="M50 46 L66 50 L58 84 L50 84 Z" fill="#1f5d9e" opacity=".25"/>
        <circle cx="44" cy="38" r="2.6" fill="#fff" opacity=".85" class="anim twinkle"/>
      </g>
      <g transform="translate(76,78)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="var(--font)" font-size="7.6" font-weight="800" fill="#B97F12">+15</text></g>
    </svg>`,
  "board.bomb": `<svg class="emblem silver" viewBox="0 0 100 100" role="img" aria-label="폭탄 사과">
      <defs><radialGradient id="bm-b" cx="38%" cy="30%" r="82%"><stop offset="0" stop-color="#6b7280"/><stop offset="45" stop-color="#3a4250"/><stop offset="100" stop-color="#1c2230"/></radialGradient></defs>
      <path d="M52 18 C56 8 64 5 70 8" fill="none" stroke="#8a6a40" stroke-width="2.6" stroke-linecap="round"/>
      <g class="anim twinkle"><path d="M70 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" fill="#ffb53a"/><circle cx="70" cy="8" r="2.2" fill="#fff3c4"/></g>
      <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" transform="translate(8,12) scale(.84)" fill="url(#bm-b)"/>
      <ellipse cx="44" cy="40" rx="11" ry="7" fill="#aeb6c6" opacity=".4"/>
      <circle cx="42" cy="36" r="3.4" fill="#fff" opacity=".5"/>
      <g transform="translate(76,78)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#bcc7d4" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="var(--font)" font-size="7.4" font-weight="800" fill="#5d6b7d">+10</text></g>
    </svg>`,
  "board.rainbow": `<svg class="emblem prism" viewBox="0 0 100 100" role="img" aria-label="무지개 와일드 사과">
      <defs><radialGradient id="rb-b" cx="40%" cy="30%" r="82%"><stop offset="0" stop-color="#ffffff"/><stop offset="48" stop-color="#f3f0fb"/><stop offset="100" stop-color="#dfe2f0"/></radialGradient><linearGradient id="rb-sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9ec4"/><stop offset="25" stop-color="#ffe08a"/><stop offset="50" stop-color="#8fe6c8"/><stop offset="75" stop-color="#7fc4f0"/><stop offset="100" stop-color="#b3a8ff"/></linearGradient><clipPath id="rb-cl"><path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z"/></clipPath></defs>
      <g class="bob">
        <rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/>
        <path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="url(#rb-b)" stroke="#cdd2e6" stroke-width="1.2"/>
        <g clip-path="url(#rb-cl)"><rect class="sheen-rect" x="0" y="8" width="34" height="90" fill="url(#rb-sh)" opacity=".5"/></g>
        <text x="50" y="64" text-anchor="middle" font-family="var(--font)" font-size="40" font-weight="800" fill="url(#rb-sh)">★</text>
        <ellipse cx="37" cy="33" rx="13" ry="8" fill="#fff" opacity="0.6"/>
      </g>
      <g transform="translate(76,78)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#8a7dff" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="var(--font)" font-size="7.6" font-weight="800" fill="#5b4fb0">+8</text></g>
    </svg>`,
  "rule.kindness": `<svg class="emblem prism" viewBox="0 0 100 100" role="img" aria-label="친절 하트">
      <defs><radialGradient id="kn-h" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ffc7bb"/><stop offset="45" stop-color="#ef6f57"/><stop offset="100" stop-color="#c93f2c"/></radialGradient></defs>
      <g class="beat">
        <path d="M50 82 C30 66 22 52 22 42 C22 33 28 28 36 28 C43 28 48 33 50 38 C52 33 57 28 64 28 C72 28 78 33 78 42 C78 52 70 66 50 82 Z" fill="none" stroke="#ffd3c9" stroke-width="5" opacity=".5"/>
        <rect x="48.4" y="20" width="3.2" height="9" rx="1.6" fill="#7a5230"/>
        <path d="M51 23 C54 18 60 16.5 65 17.5 C64 23.5 59 26 51 25 Z" fill="#6fb35a"/>
        <path d="M50 82 C30 66 22 52 22 42 C22 33 28 28 36 28 C43 28 48 33 50 38 C52 33 57 28 64 28 C72 28 78 33 78 42 C78 52 70 66 50 82 Z" fill="url(#kn-h)"/>
        <ellipse cx="38" cy="42" rx="9" ry="13" fill="#fff" opacity="0.5" transform="rotate(-22 38 42)"/><circle cx="60" cy="46" r="3" fill="#fff" opacity=".4"/>
      </g>
      <g transform="translate(74,72)"><circle r="12" fill="#fffdf6"/><circle r="12" fill="none" stroke="#bcc7d4" stroke-width="2.2"/><text x="0" y="5.0" text-anchor="middle" font-family="var(--font)" font-size="14" font-weight="800" fill="#5d6b7d">9</text></g>
    </svg>`,
  "rule.eleven": `<svg class="emblem prism" viewBox="0 0 100 100" role="img" aria-label="소수의 길 크리스탈">
      <defs><linearGradient id="el-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9c0ff"/><stop offset="45" stop-color="#9b8cff"/><stop offset="100" stop-color="#6f6ad0"/></linearGradient><linearGradient id="el-c2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff0ea"/><stop offset="100" stop-color="#6ad7d0"/></linearGradient></defs>
      <g class="bob">
        <path d="M50 14 L72 36 L64 78 L36 78 L28 36 Z" fill="url(#el-c)" stroke="#d7d0ff" stroke-width="1"/>
        <path d="M50 14 L72 36 L50 44 Z" fill="#ffffff" opacity=".32"/>
        <path d="M28 36 L50 44 L36 78 Z" fill="url(#el-c2)" opacity=".55"/>
        <path d="M50 44 L64 78 L50 80 Z" fill="#4a3f9e" opacity=".3"/>
        <text x="50" y="62" text-anchor="middle" font-family="var(--font)" font-size="24" font-weight="800" fill="#fff" opacity=".92">11</text>
        <circle cx="42" cy="34" r="2.4" fill="#fff" class="anim twinkle"/>
      </g>
      <g fill="#cfc6ff" class="anim twinkle" style="animation-delay:.8s"><circle cx="20" cy="44" r="1.8"/><circle cx="82" cy="52" r="1.6"/><circle cx="76" cy="24" r="1.4"/></g>
    </svg>`,
  "rule.alchemy": `<svg class="emblem prism" viewBox="0 0 100 100" role="img" aria-label="연금술 분광">
      <defs><linearGradient id="al-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0d8ff"/><stop offset="50" stop-color="#b3a8ff"/><stop offset="100" stop-color="#7f78d8"/></linearGradient><linearGradient id="al-rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9ec4"/><stop offset="33" stop-color="#ffe08a"/><stop offset="66" stop-color="#8fe6c8"/><stop offset="100" stop-color="#9bb8ff"/></linearGradient></defs>
      <path class="anim twinkle" d="M62 40 L92 30 L92 50 Z" fill="url(#al-rb)" opacity=".85"/>
      <g class="spin-slow" style="transform-origin:50px 52px">
        <path d="M50 22 L70 40 L62 70 L38 70 L30 40 Z" fill="url(#al-c)" stroke="#e6e0ff" stroke-width="1"/>
        <path d="M50 22 L70 40 L50 48 Z" fill="#fff" opacity=".35"/>
        <path d="M30 40 L50 48 L38 70 Z" fill="#6f6ad0" opacity=".3"/>
      </g>
      <text x="46" y="58" text-anchor="middle" font-family="var(--font)" font-size="20" font-weight="800" fill="#fff" opacity=".9">×5</text>
      <g fill="#d4ccff" class="anim twinkle" style="animation-delay:.6s"><circle cx="22" cy="58" r="2"/><circle cx="30" cy="78" r="1.6"/></g>
    </svg>`,
  "rule.twenty": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="20의 결단">
      <defs><radialGradient id="tw-b" cx="40%" cy="32%" r="78%"><stop offset="0" stop-color="#fff6cf"/><stop offset="45" stop-color="#ffce5a"/><stop offset="100" stop-color="#c8890f"/></radialGradient><linearGradient id="tw-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe89a"/><stop offset="100" stop-color="#a9740f"/></linearGradient></defs>
      <circle cx="50" cy="50" r="36" fill="url(#tw-r)"/>
      <circle cx="50" cy="50" r="30" fill="url(#tw-b)"/>
      <g stroke="#e3a12a" stroke-width="1.4" opacity=".5"><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(0 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(30 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(60 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(90 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(120 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(150 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(180 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(210 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(240 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(270 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(300 50 50)"/><line x1="50" y1="17" x2="50" y2="21" stroke="#c98f24" stroke-width="2" stroke-linecap="round" transform="rotate(330 50 50)"/></g>
      <text x="50" y="62" text-anchor="middle" font-family="var(--font)" font-size="34" font-weight="800" fill="#8a5a08">20</text>
      <ellipse cx="38" cy="34" rx="11" ry="7" fill="#fff" opacity="0.55"/>
      <g transform="translate(78,30)"><circle r="10" fill="#fffdf6"/><circle r="10" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="2.9" text-anchor="middle" font-family="var(--font)" font-size="8" font-weight="800" fill="#B97F12">×2</text></g>
    </svg>`,
  "risk.glasscannon": `<svg class="emblem prism" viewBox="0 0 100 100" role="img" aria-label="유리대포">
      <defs><linearGradient id="gc-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8d2ff"/><stop offset="50" stop-color="#a89cf0"/><stop offset="100" stop-color="#6f63c8"/></linearGradient><linearGradient id="gc-rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff5a7a"/><stop offset="20" stop-color="#ffb838"/><stop offset="40" stop-color="#ffe24a"/><stop offset="60" stop-color="#5ee08a"/><stop offset="80" stop-color="#4ab8e8"/><stop offset="100" stop-color="#9b6aff"/></linearGradient></defs>
      <g class="anim twinkle"><path d="M60 50 L94 36 L94 64 Z" fill="url(#gc-rb)" opacity=".9"/></g>
      <g transform="rotate(-24 48 58)">
        <rect x="22" y="48" width="40" height="20" rx="6" fill="url(#gc-c)" stroke="#e0dbff" stroke-width="1"/>
        <ellipse cx="62" cy="58" rx="4" ry="10" fill="#cfc6ff"/>
        <rect x="24" y="50" width="34" height="5" rx="2.5" fill="#fff" opacity=".4"/>
        <circle cx="30" cy="58" r="3" fill="#fff" opacity=".5" class="anim twinkle"/>
      </g>
      <path d="M44 70 l4 8 -8 0 Z" fill="#9b8cff" opacity=".5"/>
      <g transform="translate(28,30)"><circle r="11" fill="#fffdf6"/><circle r="11" fill="none" stroke="#8a7dff" stroke-width="2.2"/><text x="0" y="3.0" text-anchor="middle" font-family="var(--font)" font-size="8.4" font-weight="800" fill="#5b4fb0">×3</text></g>
      <g stroke="#b3a8ff" stroke-width="1.4" opacity=".6" class="anim twinkle" style="animation-delay:.5s"><path d="M40 44 l4 4 M52 40 l3 3" stroke-linecap="round"/></g>
    </svg>`,
  "risk.tightrope": `<svg class="emblem gold" viewBox="0 0 100 100" role="img" aria-label="외줄타기">
      <defs><radialGradient id="tr2-a" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ff9a77"/><stop offset="50" stop-color="#e04a36"/><stop offset="100" stop-color="#b1301e"/></radialGradient></defs>
      <line x1="8" y1="58" x2="92" y2="58" stroke="#c98f24" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="8" y1="58" x2="92" y2="58" stroke="#ffe7a0" stroke-width=".8" stroke-linecap="round"/>
      <g class="anim sway" style="transform-origin:50px 58px">
        <line x1="20" y1="44" x2="80" y2="44" stroke="#9c6c0c" stroke-width="2" stroke-linecap="round"/>
        <circle cx="20" cy="44" r="3" fill="#e3a12a"/><circle cx="80" cy="44" r="3" fill="#e3a12a"/>
        <g transform="translate(8,6) scale(.66)"><rect x="48.4" y="8" width="3.2" height="9" rx="1.6" fill="#7a5230"/><path d="M51 11 C53 5 60 3 66 4 C65 11 59 14 51 13 Z" fill="#6fb35a"/><path d="M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z" fill="url(#tr2-a)"/><ellipse cx="38" cy="34" rx="12" ry="8" fill="#fff" opacity="0.42"/></g>
      </g>
      <g transform="translate(78,30)"><circle r="10" fill="#fffdf6"/><circle r="10" fill="none" stroke="#E3A12A" stroke-width="2.2"/><text x="0" y="2.6" text-anchor="middle" font-family="var(--font)" font-size="7.2" font-weight="800" fill="#B97F12">1.6×</text></g>
      <g transform="translate(22,82)"><circle r="9.5" fill="#fffdf6"/><circle r="9.5" fill="none" stroke="#e04a36" stroke-width="2.2"/><text x="0" y="2.4" text-anchor="middle" font-family="var(--font)" font-size="6.8" font-weight="800" fill="#c93f2c">−8s</text></g>
    </svg>`,
  "risk.gambler": `<svg class="emblem prism" viewBox="0 0 100 100" role="img" aria-label="도박사 주사위">
      <defs><linearGradient id="gb-d1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="100" stop-color="#e6e0ff"/></linearGradient><linearGradient id="gb-d2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe9ff"/><stop offset="100" stop-color="#c9c0f0"/></linearGradient></defs>
      <g class="anim dice-tumble" style="transform-origin:42px 46px">
        <rect x="22" y="26" width="40" height="40" rx="9" fill="url(#gb-d1)" stroke="#cfc6ff" stroke-width="1.4" transform="rotate(-12 42 46)"/>
        <g transform="rotate(-12 42 46)" fill="#8a7dff"><circle cx="33" cy="37" r="3.2"/><circle cx="51" cy="37" r="3.2"/><circle cx="33" cy="55" r="3.2"/><circle cx="51" cy="55" r="3.2"/><circle cx="42" cy="46" r="3.2"/></g>
      </g>
      <g class="anim dice-tumble" style="transform-origin:66px 64px;animation-delay:.4s">
        <rect x="54" y="50" width="28" height="28" rx="7" fill="url(#gb-d2)" stroke="#cfc6ff" stroke-width="1.2" transform="rotate(14 68 64)"/>
        <g transform="rotate(14 68 64)" fill="#6f63c8"><circle cx="62" cy="58" r="2.4"/><circle cx="74" cy="70" r="2.4"/><circle cx="68" cy="64" r="2.4"/></g>
      </g>
      <g transform="translate(24,26)"><circle r="10" fill="#fffdf6"/><circle r="10" fill="none" stroke="#5ec88f" stroke-width="2.2"/><text x="0" y="2.7" text-anchor="middle" font-family="var(--font)" font-size="7.6" font-weight="800" fill="#2f7a52">3×</text></g>
      <g transform="translate(82,30)"><circle r="10" fill="#fffdf6"/><circle r="10" fill="none" stroke="#e04a36" stroke-width="2.2"/><text x="0" y="2.2" text-anchor="middle" font-family="var(--font)" font-size="6.2" font-weight="800" fill="#c93f2c">0.4×</text></g>
    </svg>`,
};
