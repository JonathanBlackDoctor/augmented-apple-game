// app/augmentFxData.ts — per-augment activation/FX metadata.
//
// Ported from the design showcase ("증강 쇼케이스", augment data + FX player):
// each augment has an activation archetype (kind), a glow color, and the
// badge(s) that float/slam on activation. Used by app/augmentFx.ts to play
// the in-game "발동 연출" over the board. Presentation-only; no game logic.

export type FxColorKey =
  | 'green' | 'gold' | 'prism' | 'red' | 'silver' | 'teal' | 'blue' | 'dark' | 'orange';

export interface FxBadge { t: string; c: FxColorKey; big?: boolean }
export interface ActSpec {
  kind: 'gain' | 'slow' | 'speed' | 'window' | 'combo' | 'gauge' | 'burst' | 'spawn' | 'allow' | 'dice';
  glow: FxColorKey;
  badges?: FxBadge[];
  repeat?: number; count?: number; ramp?: boolean; drain?: boolean; shatter?: boolean;
  spawn?: { type: string; count: number };
  stamp?: string;
  results?: FxBadge[];
}

/** [main, dark, soft-rgba] per FX color key (showcase palette). */
export const FX_COL: Record<FxColorKey, [string, string, string]> = {
  green: ['#5E9A4E', '#3f7a32', 'rgba(94,154,78,.22)'],
  gold: ['#E3A12A', '#B97F12', 'rgba(227,161,42,.24)'],
  prism: ['#8a7dff', '#5b4fb0', 'rgba(138,125,255,.24)'],
  red: ['#e04a36', '#c93f2c', 'rgba(224,74,54,.20)'],
  silver: ['#aab6c6', '#5d6b7d', 'rgba(120,138,160,.20)'],
  teal: ['#3aa3a0', '#207a77', 'rgba(58,163,160,.22)'],
  blue: ['#2f8fc4', '#1f6699', 'rgba(47,143,196,.22)'],
  dark: ['#4a5260', '#2a3140', 'rgba(40,48,64,.22)'],
  orange: ['#d8742a', '#a85518', 'rgba(216,116,42,.22)'],
};

export const ACT: Record<string, ActSpec> = {
  "time.relief": {"kind":"gain","glow":"green","badges":[{"t":"+7초","c":"green","big":true}]},
  "time.countdown": {"kind":"gain","glow":"green","repeat":3,"badges":[{"t":"+0.5초","c":"green"}]},
  "time.tempo": {"kind":"gauge","glow":"teal","badges":[{"t":"+0.5초","c":"teal"}]},
  "time.warmup": {"kind":"window","glow":"gold","badges":[{"t":"1.5×","c":"gold","big":true},{"t":"8초","c":"gold"}]},
  "time.spurt": {"kind":"speed","glow":"red","badges":[{"t":"2×","c":"gold","big":true}]},
  "time.lord": {"kind":"slow","glow":"prism","badges":[{"t":"×1.5 SLOW","c":"prism"}]},
  "combo.training": {"kind":"combo","glow":"green","count":3,"badges":[{"t":"+10%","c":"green","big":true}]},
  "combo.chain": {"kind":"combo","glow":"gold","count":4,"badges":[{"t":"1.5×","c":"gold","big":true}]},
  "combo.frenzy": {"kind":"gauge","glow":"gold","ramp":true,"badges":[{"t":"×1.03","c":"gold"},{"t":"×1.21 …","c":"gold"}]},
  "combo.massacre": {"kind":"burst","glow":"gold","badges":[{"t":"2×","c":"gold","big":true}]},
  "board.rearrange": {"kind":"spawn","glow":"silver","spawn":{"type":"triplet","count":8},"badges":[{"t":"합10 ×8","c":"silver"}]},
  "board.golden": {"kind":"spawn","glow":"gold","spawn":{"type":"gold","count":5},"badges":[{"t":"×2","c":"gold","big":true}]},
  "board.gem": {"kind":"spawn","glow":"blue","spawn":{"type":"gem","count":1},"badges":[{"t":"+15","c":"blue","big":true}]},
  "board.bomb": {"kind":"spawn","glow":"dark","spawn":{"type":"bomb","count":2},"badges":[{"t":"+10","c":"silver"},{"t":"+10","c":"silver"}]},
  "board.rainbow": {"kind":"spawn","glow":"prism","spawn":{"type":"wild","count":5},"badges":[{"t":"+8","c":"prism"}]},
  "rule.kindness": {"kind":"allow","glow":"green","stamp":"9","badges":[{"t":"합 9 허용","c":"green"}]},
  "rule.eleven": {"kind":"allow","glow":"prism","stamp":"11·13·17","badges":[{"t":"소수 허용","c":"prism"}]},
  "rule.alchemy": {"kind":"allow","glow":"prism","stamp":"×5","badges":[{"t":"5의 배수 허용","c":"prism"}]},
  "rule.twenty": {"kind":"allow","glow":"gold","stamp":"20","badges":[{"t":"합 20","c":"gold"},{"t":"×2","c":"gold","big":true}]},
  "risk.glasscannon": {"kind":"speed","glow":"prism","shatter":true,"badges":[{"t":"×3","c":"prism","big":true},{"t":"타이머 2×","c":"red"}]},
  "risk.tightrope": {"kind":"gauge","glow":"gold","drain":true,"badges":[{"t":"1.6×","c":"gold","big":true},{"t":"−8초","c":"red"}]},
  "risk.gambler": {"kind":"dice","glow":"prism","results":[{"t":"3×","c":"green"},{"t":"0.4×","c":"red"}]},
};
