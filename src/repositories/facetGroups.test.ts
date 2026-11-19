import { describe, expect, it } from 'vitest';

import {
  FACET_GROUPS,
  activeGroups,
  buildFacetQuery,
  mergeGroupFacets,
  omitGroup,
  type TireFacets,
} from '@/repositories/facetQuery';

/**
 * The rule this file exists for: **a group is counted with every other filter
 * applied but not its own.**
 *
 * Count brands with the brand filter still on and 114 of the 115 report zero —
 * so the buyer who picked Pirelli can never switch to Michelin, because the only
 * option that looks available is the one already chosen. It is the classic
 * faceted-search bug, it looks completely correct in a screenshot, and it is the
 * reason the page runs more than one query.
 */

const empty = (): TireFacets => ({
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
});

describe('activeGroups', () => {
  it('finds nothing on an unfiltered catalogue', () => {
    expect(activeGroups({})).toEqual([]);
  });

  it('maps each filter to the group that owns it', () => {
    expect(activeGroups({ brands: ['PIRELLI'] })).toEqual(['brand']);
    expect(activeGroups({ diameter: '20' })).toEqual(['rim']);
    expect(activeGroups({ minPrice: 100, maxPrice: 149 })).toEqual(['price']);
    expect(activeGroups({ minRemainingLife: 90 })).toEqual(['life']);
    expect(activeGroups({ kindSale: ['yes'] })).toEqual(['runFlat']);
    expect(activeGroups({ width: '225', sidewall: '50' })).toEqual(['width', 'sidewall']);
  });

  it('ignores a filter that is present but empty', () => {
    expect(activeGroups({ brands: [] })).toEqual([]);
    expect(activeGroups({ diameter: '' })).toEqual([]);
  });

  it('returns groups in the rail order, so the queries are deterministic', () => {
    const groups = activeGroups({ brands: ['PIRELLI'], condition: ['used'], diameter: '20' });
    expect(groups).toEqual(FACET_GROUPS.filter(g => groups.includes(g)));
  });
});

describe('omitGroup', () => {
  it("lifts only that group's own filter", () => {
    const filters = { brands: ['PIRELLI'], diameter: '20', condition: ['used'] };
    expect(omitGroup(filters, 'brand')).toEqual({ diameter: '20', condition: ['used'] });
    expect(omitGroup(filters, 'rim')).toEqual({ brands: ['PIRELLI'], condition: ['used'] });
  });

  it('lifts both bounds of a range together', () => {
    expect(omitGroup({ minPrice: 100, maxPrice: 149, diameter: '20' }, 'price')).toEqual({
      diameter: '20',
    });
  });

  it('does not mutate what it was given', () => {
    const filters = { brands: ['PIRELLI'] };
    omitGroup(filters, 'brand');
    expect(filters).toEqual({ brands: ['PIRELLI'] });
  });
});

/**
 * Asserted through the SQL, not only through the object: this is the step where
 * a mistake would still produce a page that looks right.
 */
describe('the query a group is counted with', () => {
  it('carries the other filters but not its own', () => {
    const filters = { brands: ['PIRELLI'], diameter: '20' };

    const brandQuery = buildFacetQuery(omitGroup(filters, 'brand'));
    expect(brandQuery.params.map(p => p.name)).not.toContain('brand0');
    expect(brandQuery.params.map(p => p.value)).toContain('%/20');

    const rimQuery = buildFacetQuery(omitGroup(filters, 'rim'));
    expect(rimQuery.params.map(p => p.value)).not.toContain('%/20');
    expect(rimQuery.params.map(p => p.value)).toContain('PIRELLI');
  });
});

describe('mergeGroupFacets', () => {
  it("takes each active group's counts from its own query", () => {
    const base = { ...empty(), brand: { PIRELLI: 964 }, rim: { '20': 300 }, total: 300 };
    const brandFacets = { ...empty(), brand: { PIRELLI: 964, MICHELIN: 88 }, total: 825 };

    const merged = mergeGroupFacets(base, [{ group: 'brand', facets: brandFacets }]);

    // The brand group now offers a brand the buyer could switch to.
    expect(merged.facets.brand).toEqual({ PIRELLI: 964, MICHELIN: 88 });
    // Everything else still reflects the full filter set.
    expect(merged.facets.rim).toEqual({ '20': 300 });
    expect(merged.facets.total).toBe(300);
  });

  it('reports what removing each filter would return', () => {
    const merged = mergeGroupFacets(empty(), [
      { group: 'brand', facets: { ...empty(), total: 825 } },
      { group: 'rim', facets: { ...empty(), total: 964 } },
    ]);

    // This is the empty state's whole content: "remove 20\" → 825 tires".
    expect(merged.withoutGroup).toEqual({ brand: 825, rim: 964 });
  });

  it('reports nothing to remove when nothing is filtered', () => {
    expect(mergeGroupFacets(empty(), []).withoutGroup).toEqual({});
  });
});
