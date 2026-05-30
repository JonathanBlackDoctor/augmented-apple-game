// DayNightSky — living "햇살 과수원" backdrop that cycles as ONE seamless day:
// 아침/낮 → 오후 → 해질녘 → 밤 → 황혼(동틀녘) → back to 아침/낮. The phase p∈[0,1]
// is a true loop (the p=1 keyframe equals the p=0 one) so the sky never jumps
// when R5 hands back to R1 or when the home auto-cycle wraps. The sun and moon
// ride opposite ends of that loop: the sun arcs across the daytime half and the
// moon across the night half, so when one is setting low on the west the other
// is rising low on the east — they're never crowded together. During a match
// the phase advances WITH the round clock (see skyClock): each round sweeps
// from its own time of day toward the next and the match breaks into dawn, so
// it inherits time augments for free and freezes during augment-pick / between
// rounds; on the home screen it gently auto-cycles. Purely decorative: sits
// behind all content (aria-hidden) and never changes UI text colour.
import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../app/store';
import { bgm } from '../../app/bgm';
import { roundTarget } from './skyClock';

interface Keyframe {
  p: number;
  top: string;
  mid: string;
  hor: string;
  gFar: string;
  gNear: string;
  tree: string;
  cloud: string;
}

// One looping day. p=0 and p=1 are the SAME morning so the wrap is seamless;
// 오후(0.20) → 해질녘(0.42) → 밤(0.70) → 황혼/동틀녘(0.93) brighten back to dawn.
const KF: Keyframe[] = [
  { p: 0.0, top: '#9CC2E8', mid: '#E9F1F2', hor: '#FBF1DA', gFar: '#A6C77E', gNear: '#6E9F52', tree: '#4d7a44', cloud: '#ffffff' },
  { p: 0.2, top: '#A6C0DD', mid: '#FFE7BE', hor: '#FFD597', gFar: '#A0BD72', gNear: '#6C9A4D', tree: '#4f7a3e', cloud: '#fff3df' },
  { p: 0.42, top: '#7E6CA6', mid: '#FF9C76', hor: '#FFB860', gFar: '#7C875A', gNear: '#54693F', tree: '#3e5436', cloud: '#ffd9c0' },
  { p: 0.58, top: '#3C3A72', mid: '#6B4F88', hor: '#D87E5C', gFar: '#46505f', gNear: '#30414f', tree: '#2a363f', cloud: '#b89ac0' },
  { p: 0.7, top: '#10173A', mid: '#1E2A52', hor: '#34375F', gFar: '#26414f', gNear: '#1a2f3c', tree: '#16242b', cloud: '#3a4a6a' },
  { p: 0.85, top: '#161E40', mid: '#272E58', hor: '#473A66', gFar: '#283a4a', gNear: '#1c2f3a', tree: '#182830', cloud: '#414a6a' },
  { p: 0.93, top: '#4C4B82', mid: '#956F98', hor: '#F0A877', gFar: '#5a6560', gNear: '#3f5040', tree: '#33433a', cloud: '#c7a0b8' },
  { p: 1.0, top: '#9CC2E8', mid: '#E9F1F2', hor: '#FBF1DA', gFar: '#A6C77E', gNear: '#6E9F52', tree: '#4d7a44', cloud: '#ffffff' },
];
const CYCLE = 60; // seconds for a full auto day on the home screen

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const hx = (c: string): [number, number, number] => {
  const s = c.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const mix = (a: string, b: string, t: number): string => {
  const x = hx(a);
  const y = hx(b);
  return `rgb(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))})`;
};
function sample(p: number): Record<keyof Omit<Keyframe, 'p'>, string> {
  let i = 0;
  while (i < KF.length - 1 && p > KF[i + 1].p) i++;
  const a = KF[i];
  const b = KF[Math.min(i + 1, KF.length - 1)];
  const t = a === b ? 0 : clamp((p - a.p) / (b.p - a.p), 0, 1);
  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    hor: mix(a.hor, b.hor, t),
    gFar: mix(a.gFar, b.gFar, t),
    gNear: mix(a.gNear, b.gNear, t),
    tree: mix(a.tree, b.tree, t),
    cloud: mix(a.cloud, b.cloud, t),
  };
}

const rnd = (s: number): number => {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
};

export function DayNightSky() {
  // Match state is read from the store inside the render loop (per frame) rather
  // than via subscriptions: the phase is a continuous function of the live clock,
  // so there is nothing to re-render — the refs below carry every visual change.

  // Static decorative elements — positions fixed once (CSS drives their motion).
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const s = 1 + rnd(i + 1) * 2.2;
        return {
          width: s,
          height: s,
          left: `${rnd(i + 2) * 100}%`,
          top: `${rnd(i + 5) * 58}%`,
          ['--d' as string]: `${2 + rnd(i + 3) * 3}s`,
          animationDelay: `${-rnd(i + 4) * 4}s`,
        } as React.CSSProperties;
      }),
    [],
  );
  const clouds = useMemo(
    () =>
      [
        [0, '12%', 150, 46],
        [0, '24%', 200, 60],
        [0, '8%', 120, 40],
      ].map((c, i) => ({
        left: 0,
        top: c[1] as string,
        width: c[2] as number,
        height: c[3] as number,
        animationDuration: `${70 + i * 26}s`,
        animationDelay: `${-i * 22}s`,
      })),
    [],
  );
  const trees = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => ({
        left: `${3 + i * 7.6 + rnd(i + 1) * 3}%`,
        transform: `scale(${0.8 + rnd(i + 3) * 0.7})`,
      })),
    [],
  );
  const motes = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const s = 5 + rnd(i + 1) * 10;
        return {
          width: s,
          height: s,
          left: `${8 + rnd(i + 2) * 84}%`,
          top: `${28 + rnd(i + 5) * 48}%`,
          animationDuration: `${11 + rnd(i + 3) * 7}s`,
          animationDelay: `${-rnd(i + 4) * 12}s`,
        } as React.CSSProperties;
      }),
    [],
  );
  const petals = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const s = 8 + rnd(i + 21) * 7;
        return {
          width: s,
          height: s * 0.92,
          left: `${rnd(i + 22) * 92}%`,
          top: `${-10 - rnd(i + 23) * 20}%`,
          animationDuration: `${10 + rnd(i + 24) * 7}s`,
          animationDelay: `${-rnd(i + 25) * 10}s`,
        } as React.CSSProperties;
      }),
    [],
  );
  const fireflies = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: `${rnd(i + 1) * 96}%`,
        top: `${52 + rnd(i + 2) * 42}%`,
        animationDuration: `${5 + rnd(i + 3) * 5}s`,
        animationDelay: `${-rnd(i + 4) * 6}s`,
      })),
    [],
  );

  // Refs to the live (per-frame mutated) layers.
  const skyRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const sunDiscRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<HTMLDivElement>(null);
  const treesRef = useRef<HTMLDivElement>(null);
  const hFarRef = useRef<HTMLDivElement>(null);
  const hMidRef = useRef<HTMLDivElement>(null);
  const hNearRef = useRef<HTMLDivElement>(null);
  const motesRef = useRef<HTMLDivElement>(null);
  const petalsRef = useRef<HTMLDivElement>(null);
  const fliesRef = useRef<HTMLDivElement>(null);

  // Render loop.
  useEffect(() => {
    let raf = 0;
    let cur = 0; // currently displayed phase
    let autoP = 0; // home-screen auto-cycle accumulator
    let last = performance.now();

    const render = (p: number): void => {
      const s = sample(p);
      if (skyRef.current) {
        skyRef.current.style.background = `linear-gradient(180deg, ${s.top} 0%, ${s.mid} 46%, ${s.hor} 70%)`;
      }
      // Sun rides the daytime half: it rises low on the east (left), climbs to
      // noon, and sets low on the west (right) at 해질녘. Its arc is phase-shifted
      // so the daylight window is contiguous across the p=1→0 wrap (dawn ≈ 0.92,
      // sunset ≈ 0.50). Opacity stays full through the day, fades out at sunset,
      // and fades back in at sunrise — continuous across the wrap (op(1)=op(0)=1).
      const sd = (p + 0.08) % 1; // shifted so sunrise sits at sd=0
      const ts = clamp(sd / 0.58, 0, 1);
      const sunX = 12 + ts * 76;
      const sunY = 60 - Math.sin(ts * Math.PI) * 52;
      const sunOp = clamp(1 - smooth(0.44, 0.52, p) + smooth(0.9, 1.0, p), 0, 1);
      const sunScale = 1 + (smooth(0.3, 0.46, p) - smooth(0.92, 1.0, p)) * 0.55;
      const sunCol =
        p < 0.3 ? mix('#FFF0C2', '#FFD587', smooth(0.05, 0.3, p)) : mix('#FFD587', '#FF7E4E', smooth(0.3, 0.48, p));
      if (sunRef.current) {
        sunRef.current.style.left = `${sunX}%`;
        sunRef.current.style.top = `${sunY}%`;
        sunRef.current.style.opacity = String(sunOp);
        sunRef.current.style.transform = `scale(${sunScale})`;
      }
      if (sunDiscRef.current) {
        sunDiscRef.current.style.background = `radial-gradient(circle, #fffdf2 8%, ${sunCol} 42%, transparent 70%)`;
        sunDiscRef.current.style.boxShadow = `0 0 60px 24px ${sunCol.replace('rgb(', 'rgba(').replace(')', ',0.45)')}`;
      }
      // Moon rides the night half — the opposite end of the same loop. It rises
      // low on the east (left) just as the sun sets on the west, crosses the sky
      // through deepest night, and sets low on the west by 황혼 as the sun rises
      // on the east: the two are always on opposite horizons, never crowded.
      const tm = clamp((p - 0.46) / 0.5, 0, 1);
      const moonX = 12 + tm * 76;
      const moonY = 60 - Math.sin(tm * Math.PI) * 52;
      if (moonRef.current) {
        moonRef.current.style.left = `${moonX}%`;
        moonRef.current.style.top = `${moonY}%`;
        moonRef.current.style.opacity = String(clamp(smooth(0.48, 0.56, p) - smooth(0.9, 0.96, p), 0, 1));
      }
      // stars — out through the night, gone by daybreak
      if (starsRef.current)
        starsRef.current.style.opacity = String(clamp(smooth(0.55, 0.7, p) * (1 - smooth(0.9, 1.0, p)), 0, 1));
      // ground (all three hills follow the live phase — no static layer)
      if (hFarRef.current)
        hFarRef.current.style.background = `radial-gradient(120% 100% at 38% 100%, ${s.gFar}, transparent 74%)`;
      if (hMidRef.current)
        hMidRef.current.style.background = `radial-gradient(120% 100% at 66% 100%, ${mix(
          s.gFar,
          s.gNear,
          0.5,
        )}, transparent 76%)`;
      if (hNearRef.current)
        hNearRef.current.style.background = `radial-gradient(120% 100% at 34% 100%, ${s.gNear}, transparent 80%)`;
      if (treesRef.current) treesRef.current.style.setProperty('--tree', s.tree);
      // particles — daylight sun-motes, 오후~해질녘 blossom petals, night fireflies
      const day = clamp(1 - smooth(0.4, 0.55, p) + smooth(0.9, 1.0, p), 0, 1);
      if (motesRef.current) motesRef.current.style.opacity = String(day * 0.9);
      if (petalsRef.current)
        petalsRef.current.style.opacity = String(clamp(smooth(0.12, 0.28, p) - smooth(0.46, 0.58, p), 0, 1) * 0.95);
      if (fliesRef.current)
        fliesRef.current.style.opacity = String(clamp(smooth(0.52, 0.66, p) * (1 - smooth(0.9, 1.0, p)), 0, 1));
      if (cloudsRef.current) {
        cloudsRef.current.style.setProperty('--cloud', s.cloud);
        cloudsRef.current.style.opacity = String(1 - smooth(0.5, 0.66, p) * (1 - smooth(0.9, 1.0, p)) * 0.85);
      }
    };

    const frame = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = useGameStore.getState();
      if (st.phase === 'home') {
        // Ambient day: advance continuously (no easing avoids a 1→0 wrap jolt).
        autoP = (autoP + dt / CYCLE) % 1;
        cur = autoP;
      } else {
        // Follow the live round clock; easing only softens the home→round handoff.
        const target = roundTarget(st.roundIndex, st.totalRounds, st.remainingMs, st.durationMs);
        cur += (target - cur) * 0.08;
        if (Math.abs(target - cur) < 0.0005) cur = target;
        autoP = cur; // keep the ambient cycle in sync for a smooth return home
      }
      render(cur);
      // Drive the music crossfade from the same live phase as the sky.
      bgm.setPhase(cur);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="dn-stage" aria-hidden>
      <div className="dn-sky" ref={skyRef} />
      <div className="dn-stars" ref={starsRef}>
        {stars.map((st, i) => (
          <i key={i} style={st} />
        ))}
      </div>
      <div className="dn-clouds" ref={cloudsRef}>
        {clouds.map((c, i) => (
          <div key={i} className="dn-cloud" style={c} />
        ))}
      </div>
      <div className="dn-sun" ref={sunRef}>
        <div className="dn-disc" ref={sunDiscRef} />
      </div>
      <div className="dn-moon" ref={moonRef}>
        <div className="dn-moon-disc" />
        <span className="dn-c1" />
        <span className="dn-c2" />
        <span className="dn-c3" />
      </div>
      <div className="dn-ground">
        <div className="dn-hill" ref={hFarRef} data-h="far" />
        <div className="dn-hill" ref={hMidRef} data-h="mid" />
        <div className="dn-hill" ref={hNearRef} data-h="near" />
      </div>
      <div className="dn-trees" ref={treesRef}>
        {trees.map((t, i) => (
          <i key={i} style={t} />
        ))}
      </div>
      <div className="dn-fx">
        <div className="dn-motes" ref={motesRef}>
          {motes.map((m, i) => (
            <i key={i} className="dn-mote" style={m} />
          ))}
        </div>
        <div className="dn-petals" ref={petalsRef}>
          {petals.map((p, i) => (
            <i key={i} className="dn-petal" style={p} />
          ))}
        </div>
        <div className="dn-flies" ref={fliesRef}>
          {fireflies.map((f, i) => (
            <i key={i} className="dn-fly" style={f} />
          ))}
        </div>
      </div>
    </div>
  );
}
