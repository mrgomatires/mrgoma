import { LIFE_BUCKETS, PRICE_BUCKETS, bucketOfRange } from '@/app/utils/facetBuckets';
import { hasValue, setParam, setRange, toggleValue } from '@/app/utils/filterHref';
import { brandName } from '@/app/utils/tireNaming';
import {
  TREAD_STEPS,
  conditionHref,
  TREAD_SR_HINT,
  treadLabel,
  withUsed,
} from '@/app/utils/usedFilters';
import type { TireFacets } from '@/repositories/facetQuery';
import type { TireFilters } from '@/repositories/filtersClause';

import type { FacetOption } from './FacetGroup';
import type { RangeOption } from './RangeFacet';

/**
 * Turning counts into links, kept apart from the rendering so it can be tested.
 *
 * Two rules run through all of it:
 *
 * **The options are the stock.** Every list is built from what the facet query
 * returned, never from a constant. The old rim chips were hardcoded `13…22`, so
 * they offered 14" — one tire — while hiding 23", 24", 26" and 19.5", which is
 * **102 tires in stock that no buyer could reach**. A list built from the data
 * cannot make either mistake.
 *
 * **An option that returns nothing is not offered.** It never appears in the
 * counts, so it never appears here.
 */

const CONDITION_LABELS: Record<string, string> = { new: 'New', used: 'Used' };
const YES_NO_LABELS: Record<string, string> = { yes: 'Yes', no: 'No' };

function tally(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts).filter(([, count]) => count > 0);
}

/** Sizes read as numbers — "9" before "10", and "19.5" between 19 and 20. */
function byNumber(a: [string, number], b: [string, number]): number {
  return parseFloat(a[0]) - parseFloat(b[0]);
}

function byCountThenName(a: [string, number], b: [string, number]): number {
  return b[1] - a[1] || a[0].localeCompare(b[0]);
}

/** A set-valued facet: brands, condition, patched, run-flat. */
export function setOptions(
  counts: Record<string, number>,
  param: string,
  search: string,
  basePath: string,
  {
    label = (value: string) => value,
    sort = byCountThenName,
    order,
  }: {
    label?: (value: string) => string;
    sort?: (a: [string, number], b: [string, number]) => number;
    /** A fixed order, for groups where "New, Used" reads better than by size. */
    order?: string[];
  } = {}
): FacetOption[] {
  const entries = tally(counts);
  const sorted = order
    ? entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    : entries.sort(sort);

  return sorted.map(([value, count]) => ({
    value,
    label: label(value),
    count,
    href: `${basePath}${toggleValue(search, param, value)}`,
    // `hasValue` parses the query string properly. A regex over the raw URL
    // would have to know about percent-encoded commas and would report a value
    // applied when it is merely a prefix of another.
    applied: hasValue(search, param, value),
  }));
}

/** A single-valued facet: the three parts of a size. */
export function sizeOptions(
  counts: Record<string, number>,
  param: string,
  search: string,
  basePath: string,
  current: string | undefined,
  suffix = ''
): FacetOption[] {
  return tally(counts)
    .sort(byNumber)
    .map(([value, count]) => ({
      value,
      label: `${value}${suffix}`,
      count,
      // Picking the applied value again clears it, so a size is undoable in one
      // click without hunting for the chip.
      href: `${basePath}${setParam(search, param, current === value ? undefined : value)}`,
      applied: current === value,
    }));
}

/** A bucketed range: price, remaining life. */
export function rangeOptions(
  buckets: typeof PRICE_BUCKETS,
  counts: Record<string, number>,
  search: string,
  basePath: string,
  minParam: string,
  maxParam: string,
  value: [number | undefined, number | undefined]
): RangeOption[] {
  // Derived, never stored: the band that reads as applied is whichever one the
  // current bounds *are*. That is why two controls cannot disagree.
  const appliedId = bucketOfRange(value[0], value[1], buckets)?.id;

  return buckets
    .filter(bucket => (counts[bucket.id] ?? 0) > 0)
    .map(bucket => {
      const isApplied = appliedId === bucket.id;
      return {
        id: bucket.id,
        label: bucket.label,
        count: counts[bucket.id],
        href: `${basePath}${
          isApplied
            ? setRange(search, minParam, maxParam, undefined, undefined)
            : setRange(search, minParam, maxParam, bucket.min, bucket.max)
        }`,
        applied: isApplied,
        min: bucket.min,
        max: bucket.max,
      };
    });
}

/**
 * Minimum tread, in steps (052, D1): "at least 8/32"" counts every used tire
 * whose whole 32nds are 8 or more — the facet holds whole-32nd buckets, so the
 * step's count is the sum of the buckets from it up, which is exactly what
 * `TRY_CAST(Tread AS float) >= 8` returns. Single-select: another step replaces
 * it, the applied one clears it. Applying narrows the view to used (D3).
 */
export function treadOptions(
  counts: Record<string, number>,
  search: string,
  basePath: string,
  current: number | undefined
): FacetOption[] {
  const buckets = tally(counts).map(([value, count]) => [Number(value), count] as const);
  return TREAD_STEPS.map(step => ({
    step,
    count: buckets.filter(([value]) => value >= step).reduce((sum, [, n]) => sum + n, 0),
  }))
    .filter(({ count }) => count > 0)
    .map(({ step, count }) => {
      const applied = current === step;
      return {
        value: String(step),
        label: treadLabel(step),
        srHint: TREAD_SR_HINT,
        count,
        href: `${basePath}${
          applied
            ? setParam(search, 'minTreadDepth', undefined)
            : setParam(withUsed(search), 'minTreadDepth', String(step))
        }`,
        applied,
      };
    });
}

/**
 * The condition options, whose links follow the used rule (052, D3): the used
 * filters survive only when the next set is exactly `used`.
 */
function conditionOptions(
  counts: Record<string, number>,
  search: string,
  basePath: string
): FacetOption[] {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const current = (params.get('condition') ?? '').split(',').filter(Boolean);
  return setOptions(counts, 'condition', search, basePath, {
    label: v => CONDITION_LABELS[v] ?? v,
    order: ['used', 'new'],
  }).map(option => {
    const next = option.applied
      ? current.filter(c => c.toLowerCase() !== option.value)
      : [...current, option.value];
    return { ...option, href: `${basePath}${conditionHref(search, next)}` };
  });
}

export type RailGroups = {
  condition: FacetOption[];
  width: FacetOption[];
  sidewall: FacetOption[];
  rim: FacetOption[];
  brand: FacetOption[];
  price: RangeOption[];
  life: RangeOption[];
  tread: FacetOption[];
  patched: FacetOption[];
  runFlat: FacetOption[];
};

/**
 * Every group the rail renders, in one call.
 *
 * Order is decided elsewhere — this returns them by name. What it fixes is the
 * shape of each: which parameter it writes, how it is labelled and how it sorts.
 */
export function buildRailGroups(
  facets: TireFacets,
  filters: TireFilters,
  search: string,
  basePath: string
): RailGroups {
  return {
    condition: conditionOptions(facets.condition, search, basePath),
    width: sizeOptions(facets.width, 'w', search, basePath, filters.width),
    sidewall: sizeOptions(facets.sidewall, 's', search, basePath, filters.sidewall),
    rim: sizeOptions(facets.rim, 'd', search, basePath, filters.diameter, '"'),
    // Brands are stored in capitals; `brandName` is the one place that decides
    // how a brand is written for a reader.
    brand: setOptions(facets.brand, 'brands', search, basePath, { label: brandName }),
    price: rangeOptions(PRICE_BUCKETS, facets.price, search, basePath, 'minPrice', 'maxPrice', [
      filters.minPrice,
      filters.maxPrice,
    ]),
    // Life and patched are used filters: applying one narrows to used (052, D3).
    life: rangeOptions(
      LIFE_BUCKETS,
      facets.life,
      withUsed(search),
      basePath,
      'minRemainingLife',
      'maxRemainingLife',
      [filters.minRemainingLife, filters.maxRemainingLife]
    ),
    tread: treadOptions(facets.tread ?? {}, search, basePath, filters.minTreadDepth),
    patched: setOptions(facets.patched, 'patched', withUsed(search), basePath, {
      label: v => YES_NO_LABELS[v] ?? v,
      order: ['no', 'yes'],
    }),
    runFlat: setOptions(facets.runFlat, 'kindSale', search, basePath, {
      label: v => YES_NO_LABELS[v] ?? v,
      order: ['yes', 'no'],
    }),
  };
}
