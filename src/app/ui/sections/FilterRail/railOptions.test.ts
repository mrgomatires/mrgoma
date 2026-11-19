import { describe, expect, it } from 'vitest';

import { LIFE_BUCKETS, PRICE_BUCKETS } from '@/app/utils/facetBuckets';
import type { TireFacets } from '@/repositories/facetQuery';

import { buildRailGroups, rangeOptions, setOptions, sizeOptions } from './railOptions';

/**
 * The rail's options must be **the stock**, never a constant.
 *
 * The chips this replaces were hardcoded `13…22`: they offered 14", which has a
 * single tire, and hid 23" (92), 24" (7), 26" (2) and 19.5" (1) — **102 tires in
 * the warehouse that no buyer could reach**. So the tests below are written over
 * data rather than over expected values: give the builder a catalogue and the
 * options are whatever that catalogue contains.
 */

const facets = (over: Partial<TireFacets> = {}): TireFacets => ({
  brand: {},
  condition: {},
  patched: {},
  runFlat: {},
  rim: {},
  width: {},
  sidewall: {},
  price: {},
  life: {},
  tread: {},
  total: 0,
  ...over,
});

describe('the options are the stock', () => {
  it('offers every rim size the catalogue holds, including the odd ones', () => {
    const rims = { '20': 825, '23': 93, '24': 7, '26': 2, '19.5': 1, '14': 1 };
    const options = sizeOptions(rims, 'd', '', '/tires', undefined, '"');

    expect(options.map(o => o.value)).toEqual(['14', '19.5', '20', '23', '24', '26']);
    expect(options.map(o => o.label)).toContain('23"');
  });

  it('offers no size the catalogue has run out of', () => {
    // Stated over data: a zero count is simply absent, so a future gap needs no
    // code change to be handled.
    const options = sizeOptions({ '20': 825, '13': 0 }, 'd', '', '/tires', undefined);
    expect(options.map(o => o.value)).toEqual(['20']);
  });

  it('sorts sizes as numbers, so 19.5 lands between 19 and 20', () => {
    const options = sizeOptions(
      { '9': 1, '10': 1, '19': 1, '19.5': 1, '20': 1 },
      'd',
      '',
      '/t',
      undefined
    );
    expect(options.map(o => o.value)).toEqual(['9', '10', '19', '19.5', '20']);
  });

  it('sorts brands by how much stock is behind them', () => {
    const options = setOptions({ MICHELIN: 303, PIRELLI: 964, TOYO: 12 }, 'brands', '', '/tires');
    expect(options.map(o => o.value)).toEqual(['PIRELLI', 'MICHELIN', 'TOYO']);
  });
});

describe('what an option links to', () => {
  it('adds a value while keeping the other filters', () => {
    const options = setOptions({ PIRELLI: 964 }, 'brands', '?d=20&view=table', '/tires');
    expect(options[0].href).toContain('brands=PIRELLI');
    expect(options[0].href).toContain('d=20');
    expect(options[0].href).toContain('view=table');
  });

  it('removes the value again when it is already applied', () => {
    const options = setOptions({ PIRELLI: 964 }, 'brands', '?brands=PIRELLI&d=20', '/tires');
    expect(options[0].applied).toBe(true);
    expect(options[0].href).toBe('/tires?d=20');
  });

  it('lets a chosen size be undone in one click', () => {
    const options = sizeOptions({ '20': 825 }, 'd', '?d=20&brands=PIRELLI', '/tires', '20');
    expect(options[0].applied).toBe(true);
    expect(options[0].href).toBe('/tires?brands=PIRELLI');
  });

  it('does not mark a value applied when it is only a prefix of another', () => {
    const options = setOptions({ PIRELLI: 1 }, 'brands', '?brands=PIRELLI PZERO', '/tires');
    expect(options[0].applied).toBe(false);
  });
});

describe('range bands', () => {
  const counts = { p1: 417, p2: 1342, p3: 1021, p4: 934, p5: 413 };

  it('marks the band the current bounds actually are', () => {
    const options = rangeOptions(
      PRICE_BUCKETS,
      counts,
      '?minPrice=100&maxPrice=149',
      '/tires',
      'minPrice',
      'maxPrice',
      [100, 149]
    );
    expect(options.filter(o => o.applied).map(o => o.id)).toEqual(['p2']);
  });

  it('marks none for a span the buyer set by hand', () => {
    const options = rangeOptions(
      PRICE_BUCKETS,
      counts,
      '?minPrice=140&maxPrice=185',
      '/tires',
      'minPrice',
      'maxPrice',
      [140, 185]
    );
    expect(options.filter(o => o.applied)).toHaveLength(0);
  });

  it('clears the range when the applied band is clicked again', () => {
    const options = rangeOptions(
      PRICE_BUCKETS,
      counts,
      '?minPrice=100&maxPrice=149&d=20',
      '/tires',
      'minPrice',
      'maxPrice',
      [100, 149]
    );
    expect(options.find(o => o.id === 'p2')!.href).toBe('/tires?d=20');
  });

  it('hides a band nothing falls into', () => {
    // The 50–59% band holds five tires today and can empty entirely.
    const options = rangeOptions(
      LIFE_BUCKETS,
      { l1: 2045, l2: 1018, l3: 1059, l4: 0 },
      '',
      '/t',
      'minRemainingLife',
      'maxRemainingLife',
      [undefined, undefined]
    );
    expect(options.map(o => o.id)).toEqual(['l1', 'l2', 'l3']);
  });
});

describe('buildRailGroups', () => {
  const full = facets({
    condition: { used: 2687, new: 1440 },
    brand: { PIRELLI: 964, BFGOODRICH: 30 },
    rim: { '20': 825, '23': 93 },
    width: { '225': 400, '245': 300 },
    sidewall: { '50': 200, '55': 100 },
    price: { p1: 417, p2: 1342 },
    life: { l1: 2045 },
    patched: { no: 3000, yes: 1127 },
    runFlat: { yes: 494, no: 3633 },
    total: 4127,
  });

  it('writes each group to the parameter that already exists for it', () => {
    const groups = buildRailGroups(full, {}, '', '/tires');
    expect(groups.condition[0].href).toContain('condition=');
    expect(groups.rim[0].href).toContain('d=');
    expect(groups.width[0].href).toContain('w=');
    expect(groups.sidewall[0].href).toContain('s=');
    expect(groups.brand[0].href).toContain('brands=');
    expect(groups.runFlat[0].href).toContain('kindSale=');
  });

  it('reads Used before New, which is what this shop mostly sells', () => {
    expect(buildRailGroups(full, {}, '', '/tires').condition.map(o => o.label)).toEqual([
      'Used',
      'New',
    ]);
  });

  it('writes brand names for a reader, not as they are stored', () => {
    const labels = buildRailGroups(full, {}, '', '/tires').brand.map(o => o.label);
    expect(labels).toContain('Pirelli');
    expect(labels).toContain('BFGoodrich');
    expect(labels).not.toContain('BFGOODRICH');
  });

  it('marks a size applied from the parsed filters, not from the raw URL', () => {
    const groups = buildRailGroups(full, { diameter: '20' }, '?d=20', '/tires');
    expect(groups.rim.find(o => o.value === '20')!.applied).toBe(true);
    expect(groups.rim.find(o => o.value === '23')!.applied).toBe(false);
  });

  it('returns an empty group rather than a broken one when a facet has no stock', () => {
    const groups = buildRailGroups(facets(), {}, '', '/tires');
    expect(groups.brand).toEqual([]);
    expect(groups.price).toEqual([]);
  });
});

describe('used filters (052)', () => {
  const withTread = facets({
    condition: { used: 3807, new: 3093 },
    tread: { '5': 4, '6': 623, '7': 1449, '8': 932, '9': 576, '10': 223 },
    patched: { no: 1802, yes: 2005 },
  });

  it('offers tread steps with cumulative counts (AC1)', () => {
    const { tread } = buildRailGroups(withTread, {}, '', '/tires');
    expect(tread.map(o => [o.label, o.count])).toEqual([
      ['6/32"+', 3803],
      ['7/32"+', 3180],
      ['8/32"+', 1731],
      ['9/32"+', 799],
    ]);
  });

  it('a step narrows to used; the applied step clears itself', () => {
    const groups = buildRailGroups(withTread, {}, '?brands=PIRELLI', '/tires');
    expect(groups.tread[2].href).toBe('/tires?brands=PIRELLI&condition=used&minTreadDepth=8');
    const applied = buildRailGroups(
      withTread,
      { condition: ['used'], minTreadDepth: 8 },
      '?condition=used&minTreadDepth=8',
      '/tires'
    );
    expect(applied.tread[2].applied).toBe(true);
    expect(applied.tread[2].href).toBe('/tires?condition=used');
    expect(applied.tread[3].href).toBe('/tires?condition=used&minTreadDepth=9');
  });

  it('patched and life links narrow to used', () => {
    const groups = buildRailGroups(withTread, {}, '', '/tires');
    expect(groups.patched.find(o => o.value === 'no')!.href).toBe(
      '/tires?condition=used&patched=no'
    );
  });

  it('"New" from a used view with tread leads to a URL without the tread (AC5)', () => {
    const search = '?condition=used&minTreadDepth=8';
    const groups = buildRailGroups(
      withTread,
      { condition: ['used'], minTreadDepth: 8 },
      search,
      '/tires'
    );
    const newOption = groups.condition.find(o => o.value === 'new')!;
    expect(newOption.href).not.toContain('minTreadDepth');
    // Unticking Used drops it too.
    expect(groups.condition.find(o => o.value === 'used')!.href).toBe('/tires');
  });
});
