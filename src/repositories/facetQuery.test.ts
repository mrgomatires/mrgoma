import { describe, expect, it } from 'vitest';

import { LIFE_BUCKETS, PRICE_BUCKETS } from '@/app/utils/facetBuckets';
import { FACET_GROUPS, buildFacetQuery, mapFacetRows } from '@/repositories/facetQuery';
import { buildFiltersClause } from '@/repositories/filtersClause';

/**
 * The facet query answers "how many tires are behind this option". Two things
 * must hold, and both are asserted over structure rather than over a golden
 * string, because the query is generated:
 *
 * 1. **No user input is ever concatenated into it.** It reaches SQL Server only
 *    as a bound parameter.
 * 2. **It filters exactly like the results do.** A count that promises tires the
 *    next page does not show is the least debuggable kind of wrong.
 */

describe('buildFacetQuery', () => {
  it('asks for all nine facets plus a grand total in one statement', () => {
    const { query } = buildFacetQuery({});
    expect(query).toContain('GROUPING SETS');
    // Nine dimensions, each on its own, plus `()` for the total.
    expect(query.match(/GROUPING\(/g)).toHaveLength(FACET_GROUPS.length);
    expect(query).toContain('()');
    expect((query.match(/SELECT/g) ?? []).length).toBe(2); // the CTE and the roll-up
  });

  it('never concatenates a filter value into the SQL', () => {
    const nasty = "PIRELLI'; DROP TABLE View_Tires; --";
    const { query, params } = buildFacetQuery({ brands: [nasty], diameter: '20' });

    expect(query).not.toContain('DROP TABLE');
    expect(query).not.toContain(nasty);
    // The diameter reaches SQL as a bound placeholder, never as its own value.
    // Asserting the string "20" is absent would be a false negative — the price
    // bucket boundaries contain "200" and "299".
    expect(query).toContain('@diameterPattern');
    expect(query).not.toContain("'%/20'");
    expect(params.map(p => p.value)).toContain(nasty);
    expect(params.map(p => p.value)).toContain('%/20');
  });

  it('uses the same WHERE the results use, for the same filters', () => {
    const filters = { brands: ['PIRELLI'], diameter: '20', condition: ['used'] };
    const { clause, params } = buildFiltersClause(filters);
    const built = buildFacetQuery(filters);

    expect(built.query).toContain(clause);
    expect(built.params).toEqual(params);
  });

  it('counts sellable tires only', () => {
    // Not the dashboard's looser rule: a facet must never offer a sold tire.
    expect(buildFacetQuery({}).query).toContain("Condition != 'sold'");
    expect(buildFacetQuery({}).query).toContain(
      "TRY_CAST(REPLACE(RemainingLife, '%', '') AS int) >= 50"
    );
  });

  it('derives the price and life brackets from the bucket definitions', () => {
    const { query } = buildFacetQuery({});
    for (const b of [...PRICE_BUCKETS, ...LIFE_BUCKETS]) {
      expect(query).toContain(`THEN '${b.id}'`);
    }
  });

  it('counts tread, life and patched over used tires only (052)', () => {
    const { query } = buildFacetQuery({});
    expect(query).toContain(
      'CASE WHEN ISNULL(ProductTypeId, 0) <> 1 THEN CAST(FLOOR(TRY_CAST(Tread AS float)) AS int) END AS fTread'
    );
    expect(query).toMatch(/CASE WHEN ISNULL\(ProductTypeId, 0\) <> 1 THEN CASE WHEN Patched = '0'/);
    expect(query).toMatch(
      /CASE WHEN ISNULL\(ProductTypeId, 0\) <> 1 THEN CASE WHEN TRY_CAST\(REPLACE\(RemainingLife/
    );
  });

  /**
   * `RealSize` is computed in the view and can be malformed. Such a row must
   * still reach the brand and price counts, or the facet totals stop matching
   * the number the results header prints.
   */
  it('does not drop a row whose size is malformed', () => {
    const { query } = buildFacetQuery({});
    expect(query).not.toMatch(/WHERE[^)]*CHARINDEX\('\/', RealSize\) > 0/);
    expect(query).toContain("LEN(RealSize) - LEN(REPLACE(RealSize, '/', '')) = 2");
  });
});

describe('mapFacetRows', () => {
  const row = (grouped: string, value: string | null, n: number) => {
    const aliases = [
      'fBrand',
      'fCondition',
      'fPatched',
      'fRunFlat',
      'fRim',
      'fWidth',
      'fSidewall',
      'fPrice',
      'fLife',
      'fTread',
    ];
    const out: Record<string, string | number | null> = { n };
    for (const a of aliases) {
      out[`g${a}`] = a === grouped ? 0 : 1;
      out[a] = a === grouped ? value : null;
    }
    return out;
  };

  it('files each row under the one dimension it grouped by', () => {
    const facets = mapFacetRows([
      row('fBrand', 'PIRELLI', 964),
      row('fRim', '20', 825),
      row('fCondition', 'used', 2687),
      row('fPrice', 'p2', 1342),
    ]);

    expect(facets.brand).toEqual({ PIRELLI: 964 });
    expect(facets.rim).toEqual({ '20': 825 });
    expect(facets.condition).toEqual({ used: 2687 });
    expect(facets.price).toEqual({ p2: 1342 });
  });

  it('reads the all-rolled-up row as the grand total', () => {
    const total: Record<string, string | number | null> = { n: 4127 };
    for (const a of [
      'fBrand',
      'fCondition',
      'fPatched',
      'fRunFlat',
      'fRim',
      'fWidth',
      'fSidewall',
      'fPrice',
      'fLife',
      'fTread',
    ]) {
      total[`g${a}`] = 1;
      total[a] = null;
    }
    expect(mapFacetRows([total]).total).toBe(4127);
  });

  it('gives an unparseable size no option to sit under, but keeps it in the total', () => {
    const facets = mapFacetRows([row('fRim', null, 3), row('fRim', '20', 825)]);
    expect(facets.rim).toEqual({ '20': 825 });
    expect(Object.keys(facets.rim)).not.toContain('null');
  });

  it('trims stored values, which carry stray whitespace', () => {
    expect(mapFacetRows([row('fBrand', ' PIRELLI ', 964)]).brand).toEqual({ PIRELLI: 964 });
  });

  it('starts every group empty rather than undefined', () => {
    const facets = mapFacetRows([]);
    for (const group of FACET_GROUPS) expect(facets[group]).toEqual({});
    expect(facets.total).toBe(0);
  });
});
