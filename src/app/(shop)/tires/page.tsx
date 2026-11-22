import { Suspense } from 'react';

import type { Metadata } from 'next';

import SearchResults from '@/app/(shop)/tires/container/SearchResults';
import TiresHero from '@/app/(shop)/tires/container/TiresHero';
import { fetchTiresServer } from '@/app/(shop)/tires/utils/fetchTiresServer';
import { sizePageSlug } from '@/app/(shop)/tires/utils/sizeCatalog';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import LoadingScreen from '@/app/ui/components/LoadingScreen/LoadingScreen';
import ResultsNavigation from '@/app/ui/components/ResultsNavigation/ResultsNavigation';
import ViewToggle from '@/app/ui/components/ViewToggle/ViewToggle';
import { appliedChips, looseningSuggestions } from '@/app/ui/sections/FilterRail/appliedChips';
import FilterRail from '@/app/ui/sections/FilterRail/FilterRail';
import FilterRailMobile from '@/app/ui/sections/FilterRail/FilterRailMobile';
import UsedQuickChips from '@/app/ui/sections/UsedQuickChips/UsedQuickChips';
import { buildTireFilters, parseTireView } from '@/app/utils/filterUtils';
import { resultsHeading } from '@/app/utils/resultsHeading';
import { buildBreadcrumbJsonLd, buildPageTypeJsonLd, tiresMetadata } from '@/app/utils/seo';
import { normalizeUsedFilters } from '@/app/utils/usedFilters';
import { getCachedTireRanges } from '@/repositories/cachedCatalog';
import { fetchFacetsForRequest } from '@/repositories/tireFacets';

/**
 * **The counts must never be baked at build time.**
 *
 * Reading `searchParams` already makes a route dynamic — but bare `/tires`, with
 * no parameters at all, is exactly the case a build can prerender, and it is the
 * page whose counts matter most. The sellable total moved by eight tires during a
 * single working session; a figure fixed at build time would be wrong by morning,
 * and a facet that promises stock the catalogue no longer has is worse than no
 * facet. The route's three siblings all declare `revalidate = 3600`, so leaving
 * this to inference would be leaving it to a reader's assumption.
 */
export const dynamic = 'force-dynamic';

const EMPTY_FACETS = {
  facets: {
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
  },
  withoutGroup: {},
};

/** Sane travel for the sliders when the database cannot be reached. */
const FALLBACK_RANGES = {
  minPrice: 0,
  maxPrice: 1000,
  minTreadDepth: 0,
  maxTreadDepth: 12,
  minRemainingLife: 50,
  maxRemainingLife: 100,
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; s?: string; d?: string; page?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;

  /**
   * Only a *complete* size can consolidate onto a `/tires/size/{slug}` landing
   * page, so the catalog is only consulted when all three parameters are there —
   * plain `/tires` and every partial facet cost no extra query.
   *
   * The `.catch` is load-bearing. `/tires` survives a database outage today:
   * `fetchTiresServer` catches and renders an empty catalog, the facet and range
   * reads below have their own `.catch`, and `tiresMetadata` is pure. This would
   * otherwise be the route's only unguarded database call, and a throw inside
   * `generateMetadata` takes the whole page down rather than just its metadata.
   * Caught, it yields `null` — the same answer an unstocked size gives — and the
   * canonical falls back to `/tires`, which is correct rather than merely safe.
   */
  const sizeSlug =
    sp?.w && sp?.s && sp?.d ? await sizePageSlug(sp.w, sp.s, sp.d).catch(() => null) : null;

  return tiresMetadata({
    w: sp?.w,
    s: sp?.s,
    d: sp?.d,
    page: parseInt(sp?.page || '1', 10) || 1,
    sizeSlug,
  });
}

/** The request's parameters as a query string the link builders can work from. */
function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach(one => params.append(key, one));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}

export default async function TiresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = toSearchParams(sp);
  // Tread, life and patched mean used tires (052, D3), whatever the URL says.
  const filters = normalizeUsedFilters(buildTireFilters(params));
  const search = params.toString() ? `?${params.toString()}` : '';
  const view = parseTireView(params.get('view'));

  /**
   * All three together rather than one after another. Measured against the live
   * database, three facet queries plus the results query in parallel settled at
   * **330 ms wall clock** — less than a single cold one, because they overlap
   * instead of queueing. The page pays the slowest, not the sum.
   *
   * Each read catches its own failure: the catalogue renders without its facets
   * rather than not at all.
   */
  const [initialData, facetResult, ranges] = await Promise.all([
    fetchTiresServer(sp),
    fetchFacetsForRequest(filters).catch(() => EMPTY_FACETS),
    getCachedTireRanges().catch(() => FALLBACK_RANGES),
  ]);

  const size =
    filters.width && filters.sidewall && filters.diameter
      ? `${filters.width}/${filters.sidewall}/${filters.diameter}`
      : '';

  /**
   * What to loosen when nothing matches. No extra query: these are the totals of
   * the per-group queries the rail already needed.
   */
  const suggestions = looseningSuggestions(
    appliedChips(filters, search, '/tires'),
    facetResult.withoutGroup
  );

  const railProps = {
    facets: facetResult.facets,
    filters,
    search,
    basePath: '/tires',
    ranges,
  };

  return (
    <>
      {/*
       * Outside the Suspense boundary on purpose: the node describes the page,
       * not the results, so it must be in the HTML whether or not the catalog
       * has resolved. No product `ItemList` here — the audit is explicit that
       * declaring one before block 5 consolidates the URLs would describe 1.622
       * pages that are really 1.140 products.
       */}
      <JsonLd
        data={[
          buildPageTypeJsonLd({
            type: 'CollectionPage',
            path: '/tires',
            name: 'Used & New Tires',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Tires', url: '/tires' },
          ]),
        ]}
      />
      <main className="bg-gray-50">
        <TiresHero size={size} totalCount={initialData.totalCount} />

        <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          {/* The page's single <h1> lives in the hero above. */}
          <h2 id="products-heading" className="sr-only">
            {size
              ? `Used & New Tires in Miami & Orlando – Size ${size}`
              : 'Used & New Tires in Miami & Orlando'}
          </h2>

          {/* One pending state for every change to the results — filters, chips,
              sort, range, page — while the server renders them (061). */}
          <ResultsNavigation>
            <section aria-labelledby="products-heading">
              <div className="pt-6 lg:hidden">
                <FilterRailMobile {...railProps} />
              </div>

              {/*
               * Two columns, and the left one travels with the results.
               *
               * `lg:self-start` is load-bearing: a grid item stretches to the row
               * height by default, so `sticky` would have nothing to move within
               * and would silently do nothing at all. `lg:top-20` clears the site
               * header, which is itself sticky at `top-14`.
               *
               * The rail costs the results nothing. The list was capped at
               * `max-w-3xl` and centred inside this container, leaving 224 px blank
               * on each side; giving 240 px of that to the rail leaves the list
               * **wider** than it was.
               */}
              <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
                <aside
                  aria-label="Filters"
                  className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto"
                >
                  <FilterRail {...railProps} />
                </aside>

                {/*
                 * `min-w-0` is load-bearing.
                 *
                 * A grid item defaults to `min-width: auto`, which refuses to
                 * shrink below its content's intrinsic width. On a phone the
                 * results column therefore pushed the whole document wider than
                 * the viewport: the header and the hero rendered at screen width
                 * while the cards ran off the side, and the browser zoomed out to
                 * fit. The results were never a grid item before this feature, so
                 * the page had never met this.
                 */}
                <div className="min-w-0">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <UsedQuickChips
                      filters={filters}
                      search={search}
                      basePath="/tires"
                      className="min-w-0"
                    />
                    <ViewToggle current={view} search={search} basePath="/tires" />
                  </div>
                  <Suspense fallback={<LoadingScreen message="Loading results ..." />}>
                    <SearchResults
                      data={initialData}
                      suggestions={suggestions}
                      heading={resultsHeading(filters)}
                    />
                  </Suspense>
                </div>
              </div>
            </section>
          </ResultsNavigation>
        </div>
      </main>
    </>
  );
}
