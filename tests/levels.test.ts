import { describe, it, expect } from 'vitest';
import { AI_LEVELS, MAX_LEVEL, levelInfo, levelTuning } from '../src/bot/levels';
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
