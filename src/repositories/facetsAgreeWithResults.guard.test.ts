import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildFacetQuery } from '@/repositories/facetQuery';
import { STOREFRONT_SELLABLE_WHERE } from '@/repositories/feedQuery';
import { buildFiltersClause, type TireFilters } from '@/repositories/filtersClause';

/**
 * A facet count is a promise: "pick this and you will see 825 tires." The page
 * behind it is built by a different query, and if the two ever describe
 * different sets, the promise breaks in the least debuggable way — nothing
 * throws, nothing logs, the number is simply a lie.
 *
 * Both are `STOREFRONT_SELLABLE_WHERE` plus `buildFiltersClause(filters)`. This
 * asserts that, filter by filter, rather than trusting that they were written
 * from the same intention. Confirmed once against the live catalogue on
 * 2026-08-25: the results count and the facet grand total were both **4.127**,
 * and each of the nine groups summed to exactly that.
 */

const COMBINATIONS: [name: string, filters: TireFilters][] = [
  ['nothing', {}],
  ['one brand', { brands: ['PIRELLI'] }],
  ['two brands', { brands: ['PIRELLI', 'MICHELIN'] }],
  ['a rim', { diameter: '20' }],
  ['a full size', { width: '225', sidewall: '50', diameter: '19' }],
  ['a partial size', { width: '225' }],
  ['condition', { condition: ['used'] }],
  ['a price band', { minPrice: 100, maxPrice: 149 }],
  ['remaining life', { minRemainingLife: 90 }],
  ['patched and run-flat', { patched: ['no'], kindSale: ['yes'] }],
  ['minimum tread (052)', { condition: ['used'], minTreadDepth: 8 }],
  [
    'everything at once',
    {
      brands: ['PIRELLI'],
      diameter: '20',
      condition: ['used'],
      patched: ['no'],
      kindSale: ['no'],
      minPrice: 150,
      maxPrice: 199,
      minRemainingLife: 75,
      maxRemainingLife: 89,
    },
  ],
];

/** The WHERE the results query would run, composed exactly as `fetchTiresInternal` does. */
function resultsWhere(filters: TireFilters): string {
  return STOREFRONT_SELLABLE_WHERE + buildFiltersClause(filters).clause;
}

function facetWhere(query: string): string {
  const match = query.match(/\n {2}WHERE ([\s\S]*?)\n\)/);
  if (!match) throw new Error('facet query has no WHERE to compare');
  return match[1];
}

describe('the counts and the results describe the same tires', () => {
  it.each(COMBINATIONS)('for %s', (_name, filters) => {
    const built = buildFacetQuery(filters);
    expect(facetWhere(built.query)).toBe(resultsWhere(filters));
    expect(built.params).toEqual(buildFiltersClause(filters).params);
  });

  /**
   * The comparison above only holds while the results path keeps composing its
   * WHERE the same way. This reads the source so that changing it there fails
   * here, rather than silently invalidating every assertion in this file.
   */
  it('and the results path still composes its WHERE from the same two pieces', () => {
    const source = readFileSync('src/repositories/tiresRepository.ts', 'utf8');
    expect(source).toContain('const { clause, params } = buildFiltersClause(filters);');
    expect(source).toContain('const whereClause = baseWhereClause + clause;');
    expect(source).toContain(
      'return fetchTiresInternal(offset, pageSize, filters, STOREFRONT_SELLABLE_WHERE);'
    );
  });
});
