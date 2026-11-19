import { LIFE_BUCKETS, PRICE_BUCKETS, bucketCase } from '@/app/utils/facetBuckets';
import { STOREFRONT_SELLABLE_WHERE } from '@/repositories/feedQuery';
import { buildFiltersClause, type SqlParam, type TireFilters } from '@/repositories/filtersClause';

/**
 * How many tires sit behind each filter option.
 *
 * The catalog used to offer options without saying what was behind them: of the
 * 1.610 brand × rim combinations `/tires` presented, **only 338 had stock**, so
 * four clicks in five landed on "No Tires Found". A count beside every option
 * removes the guess, and an option built from the data cannot offer a size the
 * warehouse does not have — or hide one it does.
 *
 * **One pass, not one per facet.** Seven separate `GROUP BY` queries over
 * `dbo.View_Tires` — a fifteen-table join — cost seven scans and were measured
 * at 876 ms. `GROUPING SETS` asks for all of them in a single scan: **244 ms
 * server-side for seven, re-measured at nine.** No index, no cache, no schema
 * change; the difference is entirely in how the question is asked.
 *
 * Every WHERE comes from `buildFiltersClause`, the same builder the results use.
 * Two hand-written translations of "what this filter means" would eventually
 * disagree, and the symptom — a count promising tires the next page does not
 * show — is the least debuggable kind of wrong.
 */

export type FacetTally = Record<string, number>;

export type TireFacets = {
  brand: FacetTally;
  condition: FacetTally;
  patched: FacetTally;
  runFlat: FacetTally;
  rim: FacetTally;
  width: FacetTally;
  sidewall: FacetTally;
  price: FacetTally;
  life: FacetTally;
  /** Used tires by whole 32nds of tread (`'8'` → 8.0–8.9/32"); new tires are not counted (052). */
  tread: FacetTally;
  /** Every tire matching the filters, whatever its facets. */
  total: number;
};

/** The facet groups, in the order the rail shows them. */
export const FACET_GROUPS = [
  'condition',
  'width',
  'sidewall',
  'rim',
  'brand',
  'price',
  'life',
  'tread',
  'patched',
  'runFlat',
] as const;

export type FacetGroupName = (typeof FACET_GROUPS)[number];

/**
 * `RealSize` is `225/50/19`. It is computed inside the view, so no index can
 * ever help a `LIKE` against it — and a row whose value is malformed must still
 * be counted in the brand and price facets rather than dropped, or the totals
 * stop matching what the results page shows. Hence the shape guard per
 * expression instead of a `WHERE`.
 */
const WELL_FORMED = "LEN(RealSize) - LEN(REPLACE(RealSize, '/', '')) = 2";
const WIDTH_EXPR = `CASE WHEN ${WELL_FORMED} THEN LEFT(RealSize, CHARINDEX('/', RealSize) - 1) END`;
const RIM_EXPR = `CASE WHEN ${WELL_FORMED} THEN RIGHT(RealSize, CHARINDEX('/', REVERSE(RealSize)) - 1) END`;
const SIDEWALL_EXPR = `CASE WHEN ${WELL_FORMED} THEN SUBSTRING(RealSize, CHARINDEX('/', RealSize) + 1, LEN(RealSize) - CHARINDEX('/', RealSize) - CHARINDEX('/', REVERSE(RealSize))) END`;

const PRICE_EXPR = bucketCase('TRY_CAST(Price AS float)', PRICE_BUCKETS);
/**
 * Tread, life and patched describe **used** tires (052, D3): their links narrow
 * the view to used, so their counts must leave new tires out or the number
 * beside an option would not be what the link returns. A new tire gets `NULL`,
 * which `mapFacetRows` skips (it still counts in the total).
 */
const USED = 'ISNULL(ProductTypeId, 0) <> 1';
const LIFE_EXPR = `CASE WHEN ${USED} THEN ${bucketCase("TRY_CAST(REPLACE(RemainingLife, '%', '') AS int)", LIFE_BUCKETS)} END`;
const TREAD_EXPR = `CASE WHEN ${USED} THEN CAST(FLOOR(TRY_CAST(Tread AS float)) AS int) END`;

/** Column alias → the facet group it fills. Order matters only for readability. */
const DIMENSIONS: { alias: string; group: FacetGroupName; expr: string }[] = [
  { alias: 'fBrand', group: 'brand', expr: 'Brand' },
  {
    alias: 'fCondition',
    group: 'condition',
    expr: "CASE WHEN ProductTypeId = 1 THEN 'new' ELSE 'used' END",
  },
  {
    alias: 'fPatched',
    group: 'patched',
    expr: `CASE WHEN ${USED} THEN CASE WHEN Patched = '0' THEN 'no' ELSE 'yes' END END`,
  },
  {
    alias: 'fRunFlat',
    group: 'runFlat',
    expr: "CASE WHEN KindSale = 'Yes' THEN 'yes' ELSE 'no' END",
  },
  { alias: 'fRim', group: 'rim', expr: RIM_EXPR },
  { alias: 'fWidth', group: 'width', expr: WIDTH_EXPR },
  { alias: 'fSidewall', group: 'sidewall', expr: SIDEWALL_EXPR },
  { alias: 'fPrice', group: 'price', expr: PRICE_EXPR },
  { alias: 'fLife', group: 'life', expr: LIFE_EXPR },
  { alias: 'fTread', group: 'tread', expr: TREAD_EXPR },
];

export function buildFacetQuery(filters: TireFilters): { query: string; params: SqlParam[] } {
  const { clause, params } = buildFiltersClause(filters);

  const projection = DIMENSIONS.map(d => `${d.expr} AS ${d.alias}`).join(',\n    ');
  const grouping = DIMENSIONS.map(d => `GROUPING(${d.alias}) AS g${d.alias}`).join(',\n  ');
  const values = DIMENSIONS.map(d => d.alias).join(', ');
  // Each dimension on its own, plus `()` for the grand total — the number the
  // results header shows, so the facets and the header cannot disagree either.
  const sets = [...DIMENSIONS.map(d => `(${d.alias})`), '()'].join(', ');

  const query = `WITH s AS (
  SELECT
    ${projection}
  FROM dbo.View_Tires
  WHERE ${STOREFRONT_SELLABLE_WHERE}${clause}
)
SELECT
  ${grouping},
  ${values},
  COUNT_BIG(*) AS n
FROM s
GROUP BY GROUPING SETS (${sets})`;

  return { query, params };
}

type FacetRow = Record<string, string | number | null>;

export function emptyFacets(): TireFacets {
  return {
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
  };
}

export function mapFacetRows(rows: FacetRow[]): TireFacets {
  const facets = emptyFacets();

  for (const row of rows) {
    // Exactly one dimension is grouped-by in each row; the rest are rolled up.
    const dimension = DIMENSIONS.find(d => Number(row[`g${d.alias}`]) === 0);
    const count = Number(row.n) || 0;

    if (!dimension) {
      // The `()` set: every dimension rolled up, so this is the grand total.
      facets.total = count;
      continue;
    }

    const value = row[dimension.alias];
    // A malformed `RealSize` or an unbucketed price lands here. It still counts
    // towards the total — it simply has no option to sit under.
    if (value === null || value === undefined || value === '') continue;

    facets[dimension.group][String(value).trim()] = count;
  }

  return facets;
}

/**
 * Which `TireFilters` keys each facet group owns.
 *
 * A group is counted with every *other* filter applied but not its own. Without
 * that, picking Pirelli reports zero for all 114 other brands and the buyer can
 * never switch — the classic faceted-search bug, and the reason this file runs
 * more than one query.
 */
const GROUP_KEYS: Record<FacetGroupName, (keyof TireFilters)[]> = {
  condition: ['condition'],
  width: ['width'],
  sidewall: ['sidewall'],
  rim: ['diameter'],
  brand: ['brands'],
  price: ['minPrice', 'maxPrice'],
  life: ['minRemainingLife', 'maxRemainingLife'],
  tread: ['minTreadDepth', 'maxTreadDepth'],
  patched: ['patched'],
  runFlat: ['kindSale'],
};

/** The groups the buyer has actually filtered on. */
export function activeGroups(filters: TireFilters): FacetGroupName[] {
  return FACET_GROUPS.filter(group =>
    GROUP_KEYS[group].some(key => {
      const value = filters[key];
      return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '';
    })
  );
}

/** The same filters with one group's contribution taken out. */
export function omitGroup(filters: TireFilters, group: FacetGroupName): TireFilters {
  const next = { ...filters };
  for (const key of GROUP_KEYS[group]) delete next[key];
  return next;
}

/**
 * The counts the rail renders, plus — for each filtered group — how many tires
 * removing it would return.
 *
 * That second number is what turns "No Tires Found" into "remove 13" and you'll
 * see 964 Pirellis". It costs nothing extra: it is the grand total of the query
 * that had to run anyway so the group could be re-picked.
 */
export type RequestFacets = {
  facets: TireFacets;
  /** group → tires returned if that group's filter were removed. */
  withoutGroup: Partial<Record<FacetGroupName, number>>;
};

/** Merge each active group's own-filter-removed counts over the base result. */
export function mergeGroupFacets(
  base: TireFacets,
  perGroup: { group: FacetGroupName; facets: TireFacets }[]
): RequestFacets {
  const facets: TireFacets = { ...base };
  const withoutGroup: Partial<Record<FacetGroupName, number>> = {};

  for (const { group, facets: own } of perGroup) {
    facets[group] = own[group];
    withoutGroup[group] = own.total;
  }

  return { facets, withoutGroup };
}
