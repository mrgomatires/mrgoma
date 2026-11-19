import { describe, expect, it } from 'vitest';

import { appliedChips, looseningSuggestions } from './appliedChips';

/**
 * The property that matters: **removing one filter must leave the others
 * exactly as they were.** A chip that quietly takes a second filter with it
 * renders identically to one that works — the page loads, the results look
 * plausible, and the buyer's other choice is simply gone.
 */

describe('appliedChips', () => {
  it('shows nothing when nothing is applied', () => {
    expect(appliedChips({}, '', '/tires')).toEqual([]);
  });

  it('names each applied filter the way the buyer chose it', () => {
    const chips = appliedChips(
      {
        condition: ['used'],
        diameter: '20',
        brands: ['PIRELLI'],
        minPrice: 100,
        maxPrice: 149,
        kindSale: ['yes'],
      },
      '?condition=used&d=20&brands=PIRELLI&minPrice=100&maxPrice=149&kindSale=yes',
      '/tires'
    );

    expect(chips.map(c => c.label)).toEqual(['Used', '20"', 'Pirelli', '$100 – $149', 'Run-flat']);
  });

  it('removes exactly one filter per chip', () => {
    const search = '?condition=used&d=20&brands=PIRELLI';
    const chips = appliedChips(
      { condition: ['used'], diameter: '20', brands: ['PIRELLI'] },
      search,
      '/tires'
    );

    for (const chip of chips) {
      const after = new URLSearchParams(chip.href.split('?')[1] ?? '');
      const before = new URLSearchParams(search.slice(1));
      const removed = [...before.keys()].filter(key => !after.has(key));
      expect(removed).toHaveLength(1);
    }
  });

  it('gives each of two brands its own chip', () => {
    const chips = appliedChips(
      { brands: ['PIRELLI', 'MICHELIN'] },
      '?brands=PIRELLI,MICHELIN',
      '/tires'
    );
    expect(chips.map(c => c.label)).toEqual(['Pirelli', 'Michelin']);
    expect(chips[0].href).toBe('/tires?brands=MICHELIN');
    expect(chips[1].href).toBe('/tires?brands=PIRELLI');
  });

  /** Both bounds are one choice, so they are one chip and go together. */
  it('treats a price band as one chip', () => {
    const chips = appliedChips(
      { minPrice: 100, maxPrice: 149, diameter: '20' },
      '?minPrice=100&maxPrice=149&d=20',
      '/tires'
    );
    const price = chips.filter(c => c.group === 'price');
    expect(price).toHaveLength(1);
    expect(price[0].href).toBe('/tires?d=20');
  });

  it('names a band by its band, and a hand-set span by its numbers', () => {
    expect(appliedChips({ minPrice: 100, maxPrice: 149 }, '', '/t')[0].label).toBe('$100 – $149');
    expect(appliedChips({ minPrice: 140, maxPrice: 185 }, '', '/t')[0].label).toBe('$140 – $185');
    expect(appliedChips({ minPrice: 300 }, '', '/t')[0].label).toBe('$300 & up');
  });

  it('reads remaining life the same way', () => {
    expect(appliedChips({ minRemainingLife: 90 }, '', '/t')[0].label).toBe('90% & up');
    expect(appliedChips({ minRemainingLife: 82, maxRemainingLife: 91 }, '', '/t')[0].label).toBe(
      '82 – 91%'
    );
  });

  it('says whether patched means yes or no, rather than just "Patched"', () => {
    expect(appliedChips({ patched: ['no'] }, '', '/t')[0].label).toBe('Not patched');
    expect(appliedChips({ patched: ['yes'] }, '', '/t')[0].label).toBe('Patched');
  });

  it('keeps how the buyer is reading the list when a chip is removed', () => {
    const chips = appliedChips(
      { brands: ['PIRELLI'] },
      '?brands=PIRELLI&view=table&sort=price-asc',
      '/tires'
    );
    expect(chips[0].href).toContain('view=table');
    expect(chips[0].href).toContain('sort=price-asc');
  });

  it('tags each chip with its group, which the empty state needs', () => {
    const chips = appliedChips({ brands: ['PIRELLI'], diameter: '13' }, '', '/tires');
    expect(chips.map(c => c.group).sort()).toEqual(['brand', 'rim']);
  });
});

/**
 * The empty state's whole content. These numbers are a promise — "remove this
 * and you will see 957 tires" — so the rule below matters more than the shape:
 * **a suggestion is only offered when its number is exactly true.**
 */
describe('looseningSuggestions', () => {
  it('pairs each applied filter with what removing it returns', () => {
    const chips = appliedChips(
      { brands: ['PIRELLI'], diameter: '13' },
      '?brands=PIRELLI&d=13',
      '/tires'
    );
    // `withoutGroup.rim` is the total with the *rim* filter lifted — i.e. what
    // removing 13" returns: every Pirelli. Getting this pairing backwards is the
    // easiest mistake here, and it produces two confident, wrong promises.
    const suggestions = looseningSuggestions(chips, { rim: 957, brand: 2 });

    expect(suggestions).toEqual([
      { label: '13"', count: 957, href: '/tires?brands=PIRELLI' },
      { label: 'Pirelli', count: 2, href: '/tires?d=13' },
    ]);
  });

  it('puts the way out that leads furthest first', () => {
    const chips = appliedChips(
      { brands: ['PIRELLI'], diameter: '13' },
      '?brands=PIRELLI&d=13',
      '/t'
    );
    expect(looseningSuggestions(chips, { rim: 5, brand: 900 })[0].label).toBe('Pirelli');
  });

  /**
   * `withoutGroup.brand` is the count with *every* brand lifted, while a chip
   * removes one brand. Offering "Remove Pirelli → 1.240" when 1.240 is the
   * figure for removing Pirelli **and** Michelin is a precise, confident lie —
   * worse than the vague message it replaces.
   */
  it('says nothing about a group holding two filters, rather than saying something false', () => {
    const chips = appliedChips(
      { brands: ['PIRELLI', 'MICHELIN'] },
      '?brands=PIRELLI,MICHELIN',
      '/tires'
    );
    expect(looseningSuggestions(chips, { brand: 1240 })).toEqual([]);
  });

  it('still suggests the other groups when one of them is ambiguous', () => {
    const chips = appliedChips(
      { brands: ['PIRELLI', 'MICHELIN'], diameter: '13' },
      '?brands=PIRELLI,MICHELIN&d=13',
      '/tires'
    );
    const suggestions = looseningSuggestions(chips, { brand: 1240, rim: 957 });
    expect(suggestions.map(s => s.label)).toEqual(['13"']);
  });

  it('does not offer a way out that leads nowhere either', () => {
    const chips = appliedChips({ diameter: '13' }, '?d=13', '/tires');
    expect(looseningSuggestions(chips, { rim: 0 })).toEqual([]);
  });

  it('offers nothing when nothing is applied', () => {
    expect(looseningSuggestions([], {})).toEqual([]);
  });
});

/**
 * The pairing is the part that can be wrong while looking right: swap the two
 * and the page shows two confident numbers, both false, and nothing fails.
 * Asserted end to end against the real filter shapes.
 */
describe('a suggestion promises what its own link delivers', () => {
  it('the count belongs to the filters that survive the removal', () => {
    // Removing 13" leaves `brands=PIRELLI`, so its number is the one measured
    // for the query with the rim lifted — 957, not the 2 tires that are 13".
    const chips = appliedChips(
      { brands: ['PIRELLI'], diameter: '13' },
      '?brands=PIRELLI&d=13',
      '/tires'
    );
    const byLabel = Object.fromEntries(
      looseningSuggestions(chips, { rim: 957, brand: 2 }).map(s => [s.label, s])
    );

    expect(byLabel['13"'].href).toBe('/tires?brands=PIRELLI');
    expect(byLabel['13"'].count).toBe(957);
    expect(byLabel.Pirelli.href).toBe('/tires?d=13');
    expect(byLabel.Pirelli.count).toBe(2);
  });
});

describe('used filters (052)', () => {
  it('shows the tread chip and removes only the tread (AC7)', () => {
    const chips = appliedChips(
      { condition: ['used'], minTreadDepth: 8 },
      '?condition=used&minTreadDepth=8',
      '/tires'
    );
    const tread = chips.find(c => c.group === 'tread')!;
    expect(tread.label).toBe('Tread 8/32"+');
    expect(tread.href).toBe('/tires?condition=used');
  });

  it('removing Used drops the used filters with it', () => {
    const chips = appliedChips(
      { condition: ['used'], patched: ['no'] },
      '?condition=used&patched=no',
      '/tires'
    );
    expect(chips.find(c => c.group === 'condition')!.href).toBe('/tires');
  });

  it('leaves the condition out on /tires/used', () => {
    const chips = appliedChips({ condition: ['used'] }, '', '/tires/used', { hideCondition: true });
    expect(chips).toEqual([]);
  });
});
