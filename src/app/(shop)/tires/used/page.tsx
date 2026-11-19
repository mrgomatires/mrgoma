import { Suspense } from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import { BrowseFilters } from '@/app/(shop)/tires/container/BrowseFilters/BrowseFilters';
import { TireGrid } from '@/app/(shop)/tires/container/TireGrid/TireGrid';
import { TiresData } from '@/app/interfaces/tires';
import { JsonLd } from '@/app/ui/components';
import { FilterRail, FilterRailMobile, UsedQuickChips } from '@/app/ui/sections';
import { onlineInventoryLabel } from '@/app/utils/brandClaims';
import { LISTS } from '@/app/utils/ecommerce';
import { buildTireFilters } from '@/app/utils/filterUtils';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, usedTiresMetadata } from '@/app/utils/seo';
import { transformTireData } from '@/app/utils/transformTireData';
import { normalizeUsedFilters, usedCatalogHref } from '@/app/utils/usedFilters';
import { getCachedTireRanges } from '@/repositories/cachedCatalog';
import { getCachedUsedLanding } from '@/repositories/cachedUsedLanding';
import { emptyFacets } from '@/repositories/facetQuery';
import { fetchFacetsForRequest } from '@/repositories/tireFacets';
import { pickTireListFields } from '@/repositories/tireListFields';
import { fetchBrands, fetchTires } from '@/repositories/tiresRepository';

/**
 * Dynamic since 052: the rail filters in place (D4), so the page reads
 * `searchParams`. The plain URL is served from `getCachedUsedLanding`.
 */

export const metadata: Metadata = usedTiresMetadata();

const reasons = [
  {
    title: '30-Day Warranty',
    body: 'Every used tire comes with a 30-day warranty — because we stand behind what we sell.',
  },
  {
    title: 'ASE-Inspected',
    body: 'Every tire goes through inspection by ASE-certified technicians before it reaches you. No guesswork, no surprises.',
  },
  {
    title: 'Save Up to 70%',
    body: 'Quality used tires cost a fraction of new — without sacrificing safety. Same free shipping, same expert installation.',
  },
  {
    title: 'Rideshare Rates',
    body: 'Special pricing for Uber and Lyft drivers who depend on their vehicle. Ask about our rideshare discount at checkout.',
  },
];

const FALLBACK_RANGES = {
  minPrice: 0,
  maxPrice: 1000,
  minTreadDepth: 0,
  maxTreadDepth: 12,
  minRemainingLife: 50,
  maxRemainingLife: 100,
};

const BASE_PATH = '/tires/used';

function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach(one => params.append(key, one));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}

export default async function UsedTiresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = toSearchParams(await searchParams);
  // Pagination lives on /tires; this page shows the first 24.
  params.delete('page');
  params.delete('view');
  params.sort();
  const search = params.toString() ? `?${params.toString()}` : '';
  // The page is used tires: whatever the URL says about condition (052, D4).
  const filters = normalizeUsedFilters({ ...buildTireFilters(params), condition: ['used'] });
  const filtered = Object.keys(filters).some(key => key !== 'condition');

  const [landing, filteredResult, filteredFacets, ranges, brands] = await Promise.all([
    getCachedUsedLanding().catch(() => null),
    filtered ? fetchTires(0, 24, filters).catch(() => null) : null,
    filtered ? fetchFacetsForRequest(filters).catch(() => null) : null,
    getCachedTireRanges().catch(() => FALLBACK_RANGES),
    fetchBrands().catch(() => [] as string[]),
  ]);
  const result = (filtered ? filteredResult : landing?.result) ?? { records: [], totalCount: 0 };
  const facets = (filtered ? filteredFacets : landing?.facets)?.facets ?? emptyFacets();

  // Through the same whitelist as `/api/tires`: public fields plus the city (051).
  const tires = result.records.map(pickTireListFields).map(r => transformTireData(r as TiresData));
  const totalCount = result.totalCount;
  // The page's own figure for the hero and JSON-LD: every used tire, unfiltered.
  const usedTotal = landing?.result.totalCount ?? totalCount;

  const railProps = {
    facets,
    filters,
    search,
    basePath: BASE_PATH,
    ranges,
    hideCondition: true,
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tires', url: '/tires' },
    { name: 'Used Tires', url: '/tires/used' },
  ]);

  const itemListJsonLd = buildItemListJsonLd({
    url: '/tires/used',
    name: 'Used tires available online',
    count: usedTotal,
  });

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />

      <main className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <nav className="bg-gray-50 border-b border-gray-200" aria-label="Breadcrumb">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-green-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/tires" className="hover:text-green-600 transition-colors">
              Tires
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Used Tires</span>
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-[#0a0a0a] text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 text-[clamp(80px,15vw,180px)] font-black leading-none select-none pointer-events-none"
            style={{ color: 'rgba(245,158,11,0.06)', letterSpacing: '-4px' }}
            aria-hidden="true"
          >
            USED
          </span>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-amber-400" />
              <span className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">
                Pre-owned
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-5 text-white">
              <span style={{ color: '#fbbf24' }}>Used</span> Tires{' '}
              <span className="block" style={{ color: '#9dfb40' }}>
                Miami & Orlando
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-lg leading-relaxed">
              Every used tire in our inventory is ASE-inspected and backed by our 30-day warranty.
              Quality you can trust at a price that makes sense.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold">
                {usedTotal > 0 ? onlineInventoryLabel(usedTotal) : 'In stock now'}
              </span>
              <span
                className="border rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  color: '#fbbf24',
                  borderColor: 'rgba(251,191,36,0.3)',
                  background: 'rgba(251,191,36,0.1)',
                }}
              >
                30-Day Warranty
              </span>
              <span className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold">
                Free Shipping
              </span>
            </div>
          </div>
        </section>

        {/* Tires, filtered in place (052, D4) — right under the hero, so a
            filter's reload lands on its results. */}
        <section className="py-10" aria-labelledby="used-results-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              id="used-results-heading"
              className="text-2xl font-black tracking-tight text-gray-900"
            >
              Used tires available now
            </h2>
            <p className="mt-1 text-sm text-gray-500">Inventory updated daily</p>

            <div className="mt-6 lg:hidden">
              <FilterRailMobile {...railProps} />
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
              <aside
                aria-label="Filters"
                className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto"
              >
                <FilterRail {...railProps} />
              </aside>

              <div className="min-w-0">
                <UsedQuickChips
                  filters={filters}
                  search={search}
                  basePath={BASE_PATH}
                  className="mb-4"
                />
                <TireGrid
                  tires={tires}
                  totalCount={totalCount}
                  viewAllHref={usedCatalogHref(search)}
                  list={LISTS.usedTires}
                  viewAllLabel={`View all ${totalCount} used tires`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* The browse strip: links to every brand page and rim size. Navigation,
            not a filter — and the brand pages' inbound links (tiresPage.guard). */}
        <Suspense fallback={null}>
          <BrowseFilters brands={brands} variant="used" />
        </Suspense>

        {/* Why used tires */}
        <section className="py-16 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <p className="text-green-600 text-xs font-bold tracking-[0.2em] uppercase mb-2">
              Why choose used
            </p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-10">
              Smart savings, zero compromise
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {reasons.map(reason => (
                <div
                  key={reason.title}
                  className="border border-gray-200 rounded-2xl p-7 hover:border-green-300 hover:shadow-sm transition-all duration-200"
                >
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{reason.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{reason.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-[#9dfb40] relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
              backgroundSize: '12px 12px',
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center text-center gap-6">
            <h2 className="text-black text-3xl sm:text-4xl font-black tracking-tight">
              Need help finding the right size?
            </h2>
            <p className="text-black/60 max-w-md">
              Use our tire search or contact our ASE-certified team — they know tires inside and
              out.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/tires"
                className="bg-black text-[#9dfb40] font-bold px-10 py-4 rounded-full hover:bg-zinc-900 transition-colors duration-200"
              >
                Search by Size
              </Link>
              <Link
                href="/contact"
                className="border-2 border-black text-black font-bold px-10 py-4 rounded-full hover:bg-black hover:text-[#9dfb40] transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
