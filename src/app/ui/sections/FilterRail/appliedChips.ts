import { LIFE_BUCKETS, PRICE_BUCKETS, bucketOfRange } from '@/app/utils/facetBuckets';
import { removeValue, setParam, setRange } from '@/app/utils/filterHref';
import { brandName } from '@/app/utils/tireNaming';
import { conditionHref, treadLabel } from '@/app/utils/usedFilters';
import type { TireFilters } from '@/repositories/filtersClause';

export type AppliedChip = {
  /** Which facet group it belongs to — the empty state names this. */
  group: string;
  label: string;
  /** Where removing just this one leads. */
  href: string;
};

/**
 * What is applied right now, each removable on its own.
 *
 * A filtered catalogue used to say nothing about what was filtering it: the
 * heading read "All tires" whatever was applied, and the only way back was the
 * Back button or clearing everything. These chips are the state made visible,
 * and they are also what the empty result reads from — "remove 13" and you'll
 * see 964 Pirellis" is this list plus a count.
 */
export function appliedChips(
  filters: TireFilters,
  search: string,
  basePath: string,
  {
    /** `/tires/used`: the condition is the page itself, not a filter to remove (052). */
    hideCondition = false,
  }: { hideCondition?: boolean } = {}
): AppliedChip[] {
  const chips: AppliedChip[] = [];
  const at = (href: string) => `${basePath}${href}`;

  const conditions = hideCondition ? [] : (filters.condition ?? []);
  for (const value of conditions) {
    chips.push({
      group: 'condition',
      label: value === 'new' ? 'New' : 'Used',
      // Leaving "used" also drops the used-only filters (052, D3).
      href: at(
        conditionHref(
          search,
          conditions.filter(c => c !== value)
        )
      ),
    });
  }

  for (const [group, param, current, suffix] of [
    ['width', 'w', filters.width, ''],
    ['sidewall', 's', filters.sidewall, ''],
    ['rim', 'd', filters.diameter, '"'],
  ] as const) {
    if (current) {
      chips.push({
        group,
        label: `${current}${suffix}`,
        href: at(setParam(search, param, undefined)),
      });
    }
  }

  for (const value of filters.brands ?? []) {
    chips.push({
      group: 'brand',
      label: brandName(value),
      href: at(removeValue(search, 'brands', value)),
    });
  }

  // A band and a hand-set span are the same filter and read the same way: the
  // band's name when the bounds are a band, the numbers themselves otherwise.
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const band = bucketOfRange(filters.minPrice, filters.maxPrice, PRICE_BUCKETS);
    chips.push({
      group: 'price',
      label: band ? band.label : priceSpan(filters.minPrice, filters.maxPrice),
      href: at(setRange(search, 'minPrice', 'maxPrice', undefined, undefined)),
    });
  }

  if (filters.minRemainingLife !== undefined || filters.maxRemainingLife !== undefined) {
    const band = bucketOfRange(filters.minRemainingLife, filters.maxRemainingLife, LIFE_BUCKETS);
    chips.push({
      group: 'life',
      label: band ? band.label : lifeSpan(filters.minRemainingLife, filters.maxRemainingLife),
      href: at(setRange(search, 'minRemainingLife', 'maxRemainingLife', undefined, undefined)),
    });
  }

  if (filters.minTreadDepth !== undefined) {
    chips.push({
      group: 'tread',
      label: `Tread ${treadLabel(filters.minTreadDepth)}`,
      href: at(setParam(search, 'minTreadDepth', undefined)),
    });
  }

  for (const value of filters.patched ?? []) {
    chips.push({
      group: 'patched',
      label: value === 'yes' ? 'Patched' : 'Not patched',
      href: at(removeValue(search, 'patched', value)),
    });
  }

  for (const value of filters.kindSale ?? []) {
    chips.push({
      group: 'runFlat',
      label: value === 'yes' ? 'Run-flat' : 'Not run-flat',
      href: at(removeValue(search, 'kindSale', value)),
    });
  }

  return chips;
}

function priceSpan(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `$${min} – $${max}`;
  if (min !== undefined) return `$${min} & up`;
  return `Under $${(max ?? 0) + 1}`;
}

function lifeSpan(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `${min} – ${max}%`;
  if (min !== undefined) return `${min}% & up`;
  return `Up to ${max}%`;
}

/**
 * Ways out of an empty result, each with the number of tires it leads to.
 *
 * The counts cost nothing: `fetchFacetsForRequest` already runs one query per
 * filtered group with that group's own filter lifted, so "what removing this
 * would return" is that query's grand total — a number the page had to compute
 * anyway for the group to be re-pickable.
 *
 * **A group with two chips is deliberately skipped.** `withoutGroup.brand` is
 * the count with *every* brand filter lifted, while a chip removes only its own
 * brand. Offering "Remove Pirelli → 1.240 tires" when 1.240 is the figure for
 * removing Pirelli *and* Michelin would be a precise, confident lie — worse than
 * the vague message it replaces.
 */
export function looseningSuggestions(
  chips: AppliedChip[],
  withoutGroup: Partial<Record<string, number>>
): { label: string; count: number; href: string }[] {
  const perGroup = new Map<string, number>();
  for (const chip of chips) perGroup.set(chip.group, (perGroup.get(chip.group) ?? 0) + 1);

  return chips
    .filter(chip => perGroup.get(chip.group) === 1)
    .map(chip => ({ label: chip.label, count: withoutGroup[chip.group] ?? 0, href: chip.href }))
    .filter(suggestion => suggestion.count > 0)
    .sort((a, b) => b.count - a.count);
}
