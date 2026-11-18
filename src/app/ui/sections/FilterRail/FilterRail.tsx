import { FC } from 'react';

import Link from 'next/link';

import SeeAllSizesLink from '@/app/ui/components/SeeAllSizesLink/SeeAllSizesLink';
import { clearAll } from '@/app/utils/filterHref';
import type { TireFacets } from '@/repositories/facetQuery';
import type { TireFilters } from '@/repositories/filtersClause';
import type { TireRangeResult } from '@/repositories/tiresRepository';

import { appliedChips } from './appliedChips';
import AppliedFilters from './AppliedFilters';
import FacetGroup from './FacetGroup';
import { buildRailGroups } from './railOptions';
import RangeFacet from './RangeFacet';
import SearchableFacet from './SearchableFacet';

export interface FilterRailProps {
  facets: TireFacets;
  filters: TireFilters;
  /** The current query string, including the leading `?`. */
  search: string;
  basePath: string;
  ranges: TireRangeResult;
  /**
   * On a phone the rail lives inside a `<details>` whose summary already says
   * "Filters" — repeating it four lines below is the panel telling the buyer
   * what they just tapped. Clear all stays either way.
   */
  showTitle?: boolean;
  /**
   * Drop the card chrome — border, rounding, background, padding.
   *
   * Inside the mobile disclosure the card belongs to the `<details>`, so drawing
   * it again here produced **two bordered boxes with a gap between them**: the
   * summary read as one section and its own contents as another.
   */
  bare?: boolean;
}

/**
 * The order the groups are read in, fixed here so it cannot drift from the
 * decision that set it.
 *
 * **Brand first**, at the owner's direction — it is the filter buyers reach for,
 * and burying it under three size lists put the most-used control furthest from
 * the top. Then condition, which splits the catalogue almost in two
 * (2.687 / 1.440). Then the three parts of a size, folded away because most
 * people already know theirs and type it. Then price, then how much life is
 * left, and last the two details that only matter once the rest is decided.
 */
export const RAIL_ORDER = [
  'brand',
  'condition',
  'width',
  'sidewall',
  'rim',
  'price',
  'life',
  'patched',
  'runFlat',
] as const;

/**
 * Groups long enough that a flat list is worse than a search box.
 *
 * Brand is 115 options; width, profile and rim are 22, 17 and 14 — **168 rows**
 * between the top of the rail and the price filter if every one is drawn.
 */
const SEARCHABLE: Partial<
  Record<(typeof RAIL_ORDER)[number], { noun: string; plural?: string; numeric?: boolean }>
> = {
  brand: { noun: 'brand' },
  width: { noun: 'width', numeric: true },
  sidewall: { noun: 'profile', numeric: true },
  rim: { noun: 'size', plural: 'sizes', numeric: true },
};

/** The three parts of a size: folded away unless the buyer has picked one. */
const COLLAPSIBLE = new Set<(typeof RAIL_ORDER)[number]>(['width', 'sidewall', 'rim']);

const TITLES: Record<(typeof RAIL_ORDER)[number], string> = {
  condition: 'Condition',
  width: 'Width',
  sidewall: 'Profile',
  rim: 'Rim size',
  brand: 'Brand',
  price: 'Price',
  life: 'Tread life',
  patched: 'Patched',
  runFlat: 'Run-flat',
};

/**
 * The filter rail.
 *
 * A server component: every option is a `<Link>` and nothing here holds state,
 * so filtering works with JavaScript disabled or still downloading, and every
 * filtered view is a URL that can be shared. Only the brand search box and the
 * range sliders cross into the browser, because they are the two things that
 * genuinely need to.
 */
const FilterRail: FC<FilterRailProps> = ({
  facets,
  filters,
  search,
  basePath,
  ranges,
  showTitle = true,
  bare = false,
}) => {
  const groups = buildRailGroups(facets, filters, search, basePath);
  const chips = appliedChips(filters, search, basePath);

  return (
    <div className={bare ? '' : 'rounded-xl border border-gray-200 bg-white p-4'}>
      <div
        className={`flex items-baseline justify-between gap-2 ${
          showTitle || chips.length > 0 ? 'mb-3' : ''
        }`}
      >
        {showTitle && <h2 className="text-sm font-bold text-gray-900">Filters</h2>}
        {chips.length > 0 && (
          <Link
            href={`${basePath}${clearAll(search)}`}
            data-track="filter_clear_all"
            data-track-category="tires_filter"
            className="ml-auto text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            Clear all
          </Link>
        )}
      </div>

      {chips.length > 0 && <AppliedFilters chips={chips} className="mb-4" />}

      <div className="flex flex-col gap-4">
        {RAIL_ORDER.map(group => {
          if (group === 'price' || group === 'life') {
            const options = groups[group];
            if (options.length < 2) return null;
            const isPrice = group === 'price';
            return (
              <RangeFacet
                key={group}
                title={TITLES[group]}
                trackGroup={group}
                options={options}
                bounds={
                  isPrice
                    ? [ranges.minPrice, ranges.maxPrice]
                    : [ranges.minRemainingLife, ranges.maxRemainingLife]
                }
                value={
                  isPrice
                    ? [filters.minPrice, filters.maxPrice]
                    : [filters.minRemainingLife, filters.maxRemainingLife]
                }
                minParam={isPrice ? 'minPrice' : 'minRemainingLife'}
                maxParam={isPrice ? 'maxPrice' : 'maxRemainingLife'}
                basePath={basePath}
                search={search}
                unit={isPrice ? 'currency' : 'percent'}
              />
            );
          }

          // Brand, condition, patched and run-flat combine with OR: picking a
          // second adds it. Size does not — a tire has one width, one profile,
          // one rim — so those replace instead, and get no checkbox.
          const additive = group !== 'width' && group !== 'sidewall' && group !== 'rim';
          const options = groups[group];
          const applied = options.find(o => o.applied);
          const searchable = SEARCHABLE[group];

          if (searchable) {
            if (options.length === 0) return null;
            return (
              <FacetGroup
                key={group}
                title={TITLES[group]}
                trackGroup={group}
                options={[]}
                collapsible={COLLAPSIBLE.has(group)}
                defaultOpen={Boolean(applied)}
                summaryValue={applied?.label}
              >
                <SearchableFacet
                  options={options}
                  trackGroup={group}
                  noun={searchable.noun}
                  nounPlural={searchable.plural}
                  numeric={searchable.numeric}
                  multiSelect={additive}
                />
                {/* The way to every size we sell (050), under the last part of a size. */}
                {group === 'rim' && <SeeAllSizesLink surface="rail" className="mt-1" />}
              </FacetGroup>
            );
          }

          return (
            <FacetGroup
              key={group}
              title={TITLES[group]}
              trackGroup={group}
              options={options}
              multiSelect={additive}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FilterRail;
