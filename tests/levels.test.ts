import { describe, it, expect } from 'vitest';
import { AI_LEVELS, MAX_LEVEL, levelInfo, levelTuning, levelMmr } from '../src/bot/levels';
import { tierFromMmr } from '../src/ranking/elo';
import { EMOTES, STARTER_EMOTE_IDS, emoteForLevel, getEmote } from '../src/emotes';

describe('AI levels', () => {
  it('has exactly MAX_LEVEL named rivals, numbered 1..10', () => {
    expect(AI_LEVELS.length).toBe(MAX_LEVEL);
    AI_LEVELS.forEach((lv, i) => {
      expect(lv.level).toBe(i + 1);
      expect(lv.name.length).toBeGreaterThan(0);
      expect(lv.avatar.length).toBeGreaterThan(0);
    });
  });

  it('gets faster + steadier as the level rises (think-time ↓, blunders ↓)', () => {
    for (let l = 2; l <= MAX_LEVEL; l++) {
      const prev = levelTuning(l - 1);
      const cur = levelTuning(l);
      expect(cur.minDelayMs).toBeLessThanOrEqual(prev.minDelayMs);
      expect(cur.maxDelayMs).toBeLessThanOrEqual(prev.maxDelayMs);
      expect(cur.blunderChance).toBeLessThanOrEqual(prev.blunderChance);
    }
    // Once the bot stops playing fully-random (level 3+), the move choice tightens.
    for (let l = 4; l <= MAX_LEVEL; l++) {
      expect(levelTuning(l).pickTop).toBeLessThanOrEqual(levelTuning(l - 1).pickTop);
    }
  });

  it('level 1 is far gentler than level 10', () => {
    expect(levelTuning(1).minDelayMs).toBeGreaterThan(levelTuning(10).minDelayMs * 4);
    expect(levelTuning(1).blunderChance).toBe(1); // always a random move
    expect(levelTuning(10).blunderChance).toBe(0); // never blunders
    expect(levelTuning(10).pickTop).toBe(1); // always optimal
  });

  it('clamps out-of-range levels', () => {
    expect(levelInfo(0)).toBe(AI_LEVELS[0]);
    expect(levelInfo(99)).toBe(AI_LEVELS[MAX_LEVEL - 1]);
  });

  it('assigns a strictly rising MMR spanning Bronze → Master', () => {
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(levelMmr(l)).toBeGreaterThan(levelMmr(l - 1));
    }
    expect(tierFromMmr(levelMmr(1))).toBe('Bronze');
    expect(tierFromMmr(levelMmr(MAX_LEVEL))).toBe('Master');
    // Out-of-range levels clamp to the ends, never NaN.
    expect(levelMmr(0)).toBe(levelMmr(1));
    expect(levelMmr(99)).toBe(levelMmr(MAX_LEVEL));
  });
});

describe('rival emote personas', () => {
  it('each level has a distinct-feeling, valid emote persona', () => {
    for (const lv of AI_LEVELS) {
      const p = lv.emote;
      expect(p.chattiness).toBeGreaterThan(0);
      expect(p.chattiness).toBeLessThanOrEqual(1);
      const pools = [p.greet, p.ahead, p.even, p.behind, p.roundWin, p.roundLoss, p.augment];
      for (const pool of pools) {
        expect(pool.length).toBeGreaterThan(0);
        for (const id of pool) expect(getEmote(id), `${lv.name}: unknown emote "${id}"`).toBeTruthy();
      }
    }
  });

  it('the shy sprout emotes far less than the boastful golden apple', () => {
    const sprout = levelInfo(1).emote.chattiness;
    const golden = levelInfo(7).emote.chattiness;
    expect(sprout).toBeLessThan(golden);
  });
});

describe('emote rewards', () => {
  it('maps each level to a distinct, real, non-starter emote', () => {
    const ids = new Set<string>();
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const e = emoteForLevel(l);
      expect(getEmote(e.id)).toBeTruthy();
      expect(STARTER_EMOTE_IDS).not.toContain(e.id);
      ids.add(e.id);
    }
    expect(ids.size).toBe(MAX_LEVEL);
  });

  it('starters + all 10 level rewards collect every emote in the dex', () => {
    const collected = new Set<string>(STARTER_EMOTE_IDS);
    for (let l = 1; l <= MAX_LEVEL; l++) collected.add(emoteForLevel(l).id);
    expect(collected.size).toBe(EMOTES.length);
  });
});
