import { describe, expect, it } from 'vitest';

import { popularSizes, sizesByRim, tireCountLabel } from './sizeIndex';

const counts = [
  { size: '235/45/18', units: 12 },
  { size: '225/45/18', units: 12 },
  { size: '315/30/22', units: 270 },
  { size: '245/70/19.5', units: 2 },
  { size: '215/75/14', units: 1 },
  { size: '35/12.50/20', units: 3 },
  { size: '255/45/19', units: 206 },
  { size: 'junk', units: 99 },
  { size: '205/55/16', units: 0 },
];

describe('sizeIndex (050)', () => {
  it('popular = most tires, ties in size order, junk and empty ignored (D1, AC7d)', () => {
    expect(popularSizes(counts, 4).map(c => c.size)).toEqual([
      '315/30/22',
      '255/45/19',
      '225/45/18',
      '235/45/18',
    ]);
    expect(popularSizes(counts)).toHaveLength(7);
  });

  it('groups by rim in numeric order, 19.5 between 19 and 20 (AC1)', () => {
    const groups = sizesByRim(counts);
    expect(groups.map(g => g.rim)).toEqual(['14', '18', '19', '19.5', '20', '22']);
    expect(groups.find(g => g.rim === '18')!.sizes.map(s => s.size)).toEqual([
      '225/45/18',
      '235/45/18',
    ]);
    expect(groups.find(g => g.rim === '20')!.sizes[0]).toEqual({ size: '35/12.50/20', units: 3 });
  });

  it('labels counts as the page says them (D2)', () => {
    expect(tireCountLabel(1)).toBe('1 tire');
    expect(tireCountLabel(12)).toBe('12 tires');
    expect(tireCountLabel(1200)).toBe('1,200 tires');
  });
});
