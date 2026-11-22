'use client';

import React, { FC, Suspense, useCallback } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { useGenerateFixedPagination } from '@/app/hooks/useGeneratePagination';
import CollapsibleSearchBar from '@/app/ui/components/CollapsibleSearchBar/CollapsibleSearchBar';
import ErrorDisplay from '@/app/ui/components/ErrorDisplay/ErrorDisplay';
import LoadingScreen from '@/app/ui/components/LoadingScreen/LoadingScreen';
import NoResultsFound from '@/app/ui/components/NotResultsFound/NoResultsFound';
import type { LooseningSuggestion } from '@/app/ui/components/NotResultsFound/NoResultsFound';
import ResultsHeader from '@/app/ui/components/ResultsHeader/ResultsHeader';
import { useResultsNavigation } from '@/app/ui/components/ResultsNavigation/ResultsNavigation';
import { useSearchEvent } from '@/app/ui/components/SearchEvent/useSearchEvent';
import TireResults from '@/app/ui/components/TireResults/TireResults';
import TireTable from '@/app/ui/components/TireTable/TireTable';
import { promoBannerConfig } from '@/app/ui/sections/PromoBanner/config/promoBanner';
import PromoBanner from '@/app/ui/sections/PromoBanner/PromoBanner';
import { LISTS } from '@/app/utils/ecommerce';
import { parseTireView, type TireView } from '@/app/utils/filterUtils';
import { DEFAULT_PAGE, getAvailablePageSizes } from '@/app/utils/paginationUtils';

import { PaginatedTiresResponse } from '../utils/fetchTiresServer';

interface SearchResultsProps {
  /** The page of results the server rendered for the current URL. */
  data: PaginatedTiresResponse;
  /** Ways out of an empty result, computed on the server with their counts. */
  suggestions?: LooseningSuggestion[];
  /** What the results are, in words — built from the applied filters. */
  heading?: string;
}

/**
 * The results on `/tires`: their header, the list (or table) and pagination.
 *
 * **It renders the server's answer and fetches nothing (061).** It used to keep
 * its own copy of the results, seeded once from the server, and fetch them
 * again from the catalogue API after every filter, page or sort change — although
 * the server had just rendered that very page. Two catalogue searches per
 * click, and the list swapped to a skeleton meanwhile, which unmounted the
 * cards and restarted their set-offer requests. Now every change is a
 * navigation (`ResultsNavigation`): the server renders the new page, this
 * component receives it as `data`, and the cards update in place. While the
 * change is on its way the current list is dimmed and inert.
 */
const SearchResults: FC<SearchResultsProps> = ({ data, suggestions = [], heading }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname() || '/tires';
  const { navigate, isPending } = useResultsNavigation();
  // GA4 `search` where every size search lands (feature 046, D5).
  useSearchEvent(searchParams);

  // From the URL, not a server prop: the list/table switch updates the URL in
  // the browser only (061 — no server render, no catalogue search).
  const view: TireView = parseTireView(searchParams.get('view'));

  const page = Math.max(DEFAULT_PAGE, data.page || DEFAULT_PAGE);
  const pageSize = data.pageSize;
  const totalPages = Math.max(1, data.totalPages || Math.ceil(data.totalCount / pageSize));
  const maxVisiblePages = 10;
  const tiresData = data;
  const error = data.error || null;

  // Tire size parameters
  const width = searchParams.get('w') || '';
  const sidewall = searchParams.get('s') || '';
  const diameter = searchParams.get('d') || '';

  const getTireSize = () => {
    if (width && sidewall && diameter) {
      return `${width}/${sidewall}/${diameter}`;
    }
    return '';
  };

  /** This page's URL with `page` / `pageSize` set — every filter and the view kept. */
  const hrefWith = useCallback(
    (changes: Record<string, number>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(changes)) params.set(key, String(value));
      return `${pathname}?${params.toString()}`;
    },
    [pathname]
  );

  const handleUpScroll = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Move screen-reader focus back to the results heading so context isn't lost.
    const heading = document.getElementById('products-heading');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, []);

  /** Go to a page: one navigation (history replaced, as before 061). */
  const goToPage = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(1, target), totalPages);
      if (next === page) return;
      navigate(hrefWith({ page: next, pageSize }), { replace: true });
      handleUpScroll();
    },
    [navigate, hrefWith, page, pageSize, totalPages, handleUpScroll]
  );

  const handleNextPage = useCallback(() => goToPage(page + 1), [goToPage, page]);
  const handlePreviousPage = useCallback(() => goToPage(page - 1), [goToPage, page]);
  const handlePageClick = useCallback((pageNumber: number) => goToPage(pageNumber), [goToPage]);
  const handleFirstPage = useCallback(() => goToPage(1), [goToPage]);
  const handleLastPage = useCallback(() => goToPage(totalPages), [goToPage, totalPages]);

  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newPageSize = parseInt(event.target.value, 10);
      // Keep the first tire on screen in view: the page that contains it.
      const currentRecordIndex = (page - 1) * pageSize;
      const newPage = Math.floor(currentRecordIndex / newPageSize) + 1;
      navigate(hrefWith({ page: newPage, pageSize: newPageSize }), { replace: true });
    },
    [navigate, hrefWith, page, pageSize]
  );

  const pagination = useGenerateFixedPagination(page, totalPages, maxVisiblePages);
  const availablePageSizes = getAvailablePageSizes(tiresData.totalCount);

  return (
    <Suspense fallback={<LoadingScreen message="Preparing your tire selection..." />}>
      {/*
       * The hero, the filter rail and the page shell live in `page.tsx` now:
       * the rail and this list are two columns of one grid, and a client
       * component cannot be one of them while owning the other. What is left
       * here is the results themselves — the list, its header and its
       * pagination.
       */}
      <div className="relative">
        <div className="mb-6">
          <ResultsHeader
            heading={heading}
            showFilterButton={false}
            getTireSize={getTireSize}
            resultsCount={tiresData?.tires?.length || 0}
            totalCount={tiresData.totalCount}
          />
        </div>
        <div className="mb-6">
          <PromoBanner content={promoBannerConfig.home} />
        </div>
        {error ? (
          <ErrorDisplay
            title="Error Loading Tires"
            message="We couldn't load the tire data at this moment."
            error={error}
            onRetry={() => window.location.reload()}
          />
        ) : (
          <div className="relative">
            {/* While a change is on its way the current results stay, dimmed and
                inert (061): no skeleton, so the cards are not unmounted and
                remounted, and nothing here can be clicked until the new page
                replaces it. The header and pagination stay out of `inert`, so
                focus moved to the heading on a page change is not lost. */}
            <div
              inert={isPending}
              aria-busy={isPending}
              className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : ''}`}
            >
              {tiresData.tires.length === 0 ? (
                <NoResultsFound
                  title="No Tires Found"
                  message={
                    suggestions.length > 0
                      ? 'Nothing matches all of your filters at once.'
                      : "We couldn't find any tires matching your search criteria. Please try different specifications."
                  }
                  suggestions={suggestions}
                />
              ) : view === 'table' ? (
                <TireTable products={tiresData.tires} list={LISTS.catalog} />
              ) : (
                <TireResults
                  products={tiresData.tires}
                  list={LISTS.catalog}
                  indexOffset={
                    // From the data's own page, not the page state: the state
                    // moves before the new tires arrive, and would re-report the
                    // old ones at the new positions (found in the browser, 046).
                    (Math.max(1, tiresData.page || 1) - 1) * (tiresData.pageSize || pageSize)
                  }
                />
              )}
            </div>
            {tiresData.tires.length > 0 && (
              <div className="mt-16">
                <div className="mt-16 w-full">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="overflow-auto">
                      <nav
                        aria-label="Pagination"
                        className="mt-4 flex items-center justify-start md:justify-center gap-2 h-min"
                      >
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={handleFirstPage}
                            disabled={page === 1 || isPending}
                            aria-label="First page"
                            title="First page"
                            aria-disabled={page === 1}
                            className={`${page === 1 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : 'cursor-pointer bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-500'} px-3 py-2 h-min min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500`}
                          >
                            &lt;&lt;
                          </button>
                          <button
                            type="button"
                            onClick={handlePreviousPage}
                            disabled={page === 1 || isPending}
                            aria-label="Previous page"
                            title="Previous page"
                            aria-disabled={page === 1}
                            className={`${page === 1 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : 'cursor-pointer bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-500'} px-3 py-2 h-min min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500`}
                          >
                            &lt;
                          </button>
                        </div>
                        {pagination.map((pageNumber, index) =>
                          typeof pageNumber === 'number' ? (
                            <button
                              type="button"
                              key={index}
                              onClick={() => handlePageClick(pageNumber)}
                              disabled={isPending}
                              aria-current={pageNumber === page ? 'page' : undefined}
                              className={`px-3 py-2 cursor-pointer h-min min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                                pageNumber === page
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-500'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          ) : (
                            <span key={index} className="px-3 py-1.5 mx-1 text-gray-500">
                              {pageNumber}
                            </span>
                          )
                        )}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={handleNextPage}
                            disabled={page === totalPages || isPending}
                            aria-label="Next page"
                            title="Next page"
                            aria-disabled={page === totalPages}
                            className={`${page === totalPages ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : 'cursor-pointer bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-500'} px-3 py-2 h-min min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500`}
                          >
                            &gt;
                          </button>
                          <button
                            type="button"
                            onClick={handleLastPage}
                            disabled={page === totalPages || isPending}
                            aria-label="Last page"
                            title="Last page"
                            aria-disabled={page === totalPages}
                            className={`${page === totalPages ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : 'cursor-pointer bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-500'} px-3 py-2 h-min min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500`}
                          >
                            &gt;&gt;
                          </button>
                        </div>
                        <span className="ml-3 text-sm text-gray-500 shrink-0">
                          Page <span className="font-semibold text-gray-700">{page}</span> of{' '}
                          <span className="font-semibold text-gray-700">{totalPages}</span>
                        </span>
                      </nav>
                    </div>
                    {tiresData.totalCount >= 10 && (
                      <div className="md:ml-4 h-min flex items-center md:justify-end">
                        <label htmlFor="pageSize" className="mr-2 text-sm text-gray-600">
                          Rows per page:
                        </label>
                        <select
                          id="pageSize"
                          value={pageSize}
                          onChange={handlePageSizeChange}
                          disabled={isPending}
                          className="bg-white border border-gray-300 rounded-md py-1.5 px-3 text-sm text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer transition-colors"
                        >
                          {availablePageSizes.map(size => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/*
       * The mobile size search stays: it is a persistent way in for the buyer
       * who arrives knowing their size, which is a different moment from
       * opening the collapsed filter panel to narrow what is already on screen.
       */}
      <div className="block lg:hidden">
        <CollapsibleSearchBar redirectBasePath={'tires'} />
      </div>
    </Suspense>
  );
};

export default SearchResults;
