import { describe, it, expect } from 'vitest';
import { CATALOG } from '../src/augments';
import { EMBLEM_SVG } from '../src/ui/components/augmentEmblems';

// Guards the faithful port of the showcase crests against drift: every
// solo-rollable augment must keep a well-formed crest whose tier finish matches
// the catalog, and no crest may reference a non-existent augment.
describe('augment emblems', () => {
  const tierClass: Record<string, string> = {
    silver: 'silver',
    gold: 'gold',
    prismatic: 'prism',
  };

  it('provides a crest for every non-disrupt catalog augment', () => {
    for (const a of CATALOG) {
      if (a.family === 'disrupt') continue;
      expect(EMBLEM_SVG[a.id], `missing emblem for ${a.id}`).toBeTruthy();
    }
  });

  it('every crest is one well-formed <svg> on the 0..100 viewBox', () => {
    for (const [id, svg] of Object.entries(EMBLEM_SVG)) {
      expect(svg.trimStart().startsWith('<svg'), `${id} not an svg`).toBe(true);
      expect(svg.includes('viewBox="0 0 100 100"'), `${id} viewBox`).toBe(true);
      expect(svg.match(/<svg/g)?.length, `${id} svg open count`).toBe(1);
      expect(svg.match(/<\/svg>/g)?.length, `${id} svg close count`).toBe(1);
    }
  });

  it('every emblem id maps to a real augment', () => {
    const ids = new Set(CATALOG.map((a) => a.id));
    for (const id of Object.keys(EMBLEM_SVG)) {
      expect(ids.has(id), `${id} not in catalog`).toBe(true);
    }
  });

  it("each crest's tier finish matches its augment", () => {
    for (const a of CATALOG) {
      const svg = EMBLEM_SVG[a.id];
      if (!svg) continue;
      expect(svg.includes(`class="emblem ${tierClass[a.tier]}"`), `${a.id} tier finish`).toBe(true);
    }
  });
});
