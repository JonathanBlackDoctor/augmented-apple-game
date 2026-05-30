// DayNightSky — living "햇살 과수원" backdrop that cycles dawn→day→dusk→night.
// Ported from the design 시안 (배경 - 낮밤 순환.html). In a multi-round match
// each round maps to a time of day (R1 아침 … R5 밤); on the home screen it
// gently auto-cycles. Purely decorative: sits behind all content (aria-hidden),
// and never changes UI text colour — game surfaces carry their own contrast.
import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../app/store';

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

const KF: Keyframe[] = [
  { p: 0.0, top: '#A9C8E4', mid: '#FCE6CB', hor: '#F8CF9E', gFar: '#A6C77E', gNear: '#6E9F52', tree: '#4d7a44', cloud: '#ffffff' },
  { p: 0.26, top: '#8FBFE9', mid: '#EAF3F7', hor: '#FCF4DE', gFar: '#A9C97F', gNear: '#73A655', tree: '#52803f', cloud: '#ffffff' },
  { p: 0.52, top: '#A6BFDC', mid: '#FFE7B8', hor: '#FFD295', gFar: '#A0BD72', gNear: '#6C9A4D', tree: '#4f7a3e', cloud: '#fff3df' },
  { p: 0.76, top: '#7E6CA6', mid: '#FF9C76', hor: '#FFC062', gFar: '#7C875A', gNear: '#54693F', tree: '#3e5436', cloud: '#ffd9c0' },
  { p: 0.9, top: '#3C3A72', mid: '#7A5A86', hor: '#E8895E', gFar: '#3f5560', gNear: '#2a4150', tree: '#22323a', cloud: '#caa8c0' },
  { p: 1.0, top: '#10173A', mid: '#1E2A52', hor: '#34375F', gFar: '#26414f', gNear: '#1a2f3c', tree: '#16242b', cloud: '#3a4a6a' },
];
const ROUND_P = [0.06, 0.3, 0.52, 0.74, 0.95];
const CYCLE = 60; // seconds for a full auto day

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
  const roundIndex = useGameStore((s) => s.roundIndex);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const phase = useGameStore((s) => s.phase);

  const targetRef = useRef(ROUND_P[0]);
  const autoRef = useRef(true);

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
      Array.from({ length: 9 }, (_, i) => {
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
      Array.from({ length: 6 }, (_, i) => {
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
      Array.from({ length: 16 }, (_, i) => ({
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

  // Decide the target phase whenever the round/match state changes.
  useEffect(() => {
    if (phase === 'home') {
      autoRef.current = true;
    } else if (totalRounds > 1) {
      autoRef.current = false;
      targetRef.current = ROUND_P[clamp(roundIndex, 0, ROUND_P.length - 1)];
    } else {
      autoRef.current = false;
      targetRef.current = ROUND_P[0];
    }
  }, [roundIndex, totalRounds, phase]);

  // Render loop.
  useEffect(() => {
    let raf = 0;
    let cur = targetRef.current;
    let last = performance.now();

    const render = (p: number): void => {
      const s = sample(p);
      if (skyRef.current) {
        skyRef.current.style.background = `linear-gradient(180deg, ${s.top} 0%, ${s.mid} 46%, ${s.hor} 70%)`;
      }
      // sun arc
      const ts = clamp(p / 0.84, 0, 1);
      const sunX = 6 + ts * 88;
      const sunY = 62 - Math.sin(ts * Math.PI) * 52;
      const sunOp = smooth(0.0, 0.04, p) * (1 - smooth(0.78, 0.88, p));
      const sunScale = 1 + smooth(0.55, 0.82, p) * 0.55;
      const sunCol =
        p < 0.6 ? mix('#FFF0C2', '#FFD587', smooth(0.2, 0.6, p)) : mix('#FFD587', '#FF7E4E', smooth(0.6, 0.82, p));
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
      // moon arc
      const tm = clamp((p - 0.6) / 0.4, 0, 1);
      const moonX = 12 + tm * 70;
      const moonY = 64 - Math.sin(tm * 0.92 * Math.PI + 0.1) * 50;
      if (moonRef.current) {
        moonRef.current.style.left = `${moonX}%`;
        moonRef.current.style.top = `${moonY}%`;
        moonRef.current.style.opacity = String(smooth(0.64, 0.84, p));
      }
      // stars
      if (starsRef.current) starsRef.current.style.opacity = String(clamp(smooth(0.72, 0.96, p), 0, 1));
      // ground
      if (hFarRef.current)
        hFarRef.current.style.background = `radial-gradient(120% 100% at 38% 100%, ${s.gFar}, transparent 74%)`;
      if (hMidRef.current)
        hMidRef.current.style.background = `radial-gradient(120% 100% at 66% 100%, ${mix(
          KF[0].gFar,
          KF[0].gNear,
          0.5,
        )}, transparent 76%)`;
      if (hNearRef.current)
        hNearRef.current.style.background = `radial-gradient(120% 100% at 34% 100%, ${s.gNear}, transparent 80%)`;
      if (treesRef.current) treesRef.current.style.setProperty('--tree', s.tree);
      // particles
      const day = 1 - smooth(0.62, 0.86, p);
      if (motesRef.current) motesRef.current.style.opacity = String(day * 0.9);
      if (petalsRef.current)
        petalsRef.current.style.opacity = String(clamp(smooth(0.3, 0.5, p) - smooth(0.74, 0.9, p), 0, 1) * 0.9);
      if (fliesRef.current) fliesRef.current.style.opacity = String(smooth(0.72, 0.94, p));
      if (cloudsRef.current) {
        cloudsRef.current.style.setProperty('--cloud', s.cloud);
        cloudsRef.current.style.opacity = String(1 - smooth(0.74, 1, p) * 0.85);
      }
    };

    const frame = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = targetRef.current;
      if (autoRef.current) {
        targetRef.current = (target + dt / CYCLE) % 1;
        cur = targetRef.current;
      } else {
        cur += (target - cur) * 0.08;
        if (Math.abs(target - cur) < 0.0005) cur = target;
      }
      render(cur);
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
