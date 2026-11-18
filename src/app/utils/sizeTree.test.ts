import { describe, expect, it } from 'vitest';

import {
  allSizes,
  buildSizeTree,
  isFlotation,
  parseSize,
  ratiosFor,
  reconcile,
  rimsFor,
  widthGroups,
} from './sizeTree';
import live from './sizeTree.fixture.json';

// The 293 sizes for sale on 2026-11-18 (sellable rule), straight from the DB.
const LIVE = live as string[];

describe('sizeTree (049)', () => {
  const tree = buildSizeTree(LIVE);

  it('makes every size for sale reachable, and offers nothing else (AC2, AC3)', () => {
    const offered = allSizes(tree);
    expect(LIVE).toHaveLength(293);
    expect(new Set(offered)).toEqual(new Set(LIVE));
  });

  it('keeps the parts verbatim — flotation and half-inch rims included', () => {
    expect(ratiosFor(tree, '35')).toContain('12.50');
    expect(rimsFor(tree, '35', '12.50')).toEqual(['17', '20', '22']);
    const half = LIVE.find(s => s.endsWith('/19.5'));
    if (half) {
      const [w, s] = parseSize(half)!;
      expect(rimsFor(tree, w, s)).toContain('19.5');
    }
  });

  it('groups widths in 100s, 200s, 300s and truck flotation, in numeric order (D2)', () => {
    const groups = widthGroups(tree);
    expect(groups.map(g => g.id)).toEqual(['100s', '200s', '300s', 'flotation']);
    expect(groups.find(g => g.id === 'flotation')!.widths).toEqual(['35', '37']);
    for (const g of groups) {
      expect(g.widths).toEqual([...g.widths].sort((a, b) => Number(a) - Number(b)));
    }
    expect(groups.flatMap(g => g.widths)).toHaveLength(24);
  });

  it('orders ratios and rims numerically', () => {
    const tiny = buildSizeTree(['235/45/20', '235/5/18', '235/45/18', '235/45/19.5']);
    expect(ratiosFor(tiny, '235')).toEqual(['5', '45']);
    expect(rimsFor(tiny, '235', '45')).toEqual(['18', '19.5', '20']);
  });

  it('ignores malformed sizes and drops empty groups', () => {
    const t = buildSizeTree(['235/45/18', '', 'LT 33x12.50', '235/45', 'abc/1/2']);
    expect(allSizes(t)).toEqual(['235/45/18']);
    expect(widthGroups(t).map(g => g.id)).toEqual(['200s']);
    expect(ratiosFor(t, '999')).toEqual([]);
  });

  it('keeps later steps only while they still exist (FR5)', () => {
    const t = buildSizeTree(['235/45/18', '235/40/19', '245/45/18']);
    expect(reconcile(t, { w: '245', s: '45', d: '18' })).toEqual({ w: '245', s: '45', d: '18' });
    expect(reconcile(t, { w: '245', s: '40', d: '19' })).toEqual({ w: '245', s: '', d: '' });
    expect(reconcile(t, { w: '235', s: '45', d: '19' })).toEqual({ w: '235', s: '45', d: '' });
  });

  it('knows flotation widths', () => {
    expect(isFlotation('35')).toBe(true);
    expect(isFlotation('235')).toBe(false);
  });
});
