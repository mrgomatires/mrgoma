'use client';

import React, { FC, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useGenerateFixedPagination } from '@/app/hooks/useGeneratePagination';
import { TiresData } from '@/app/interfaces/tires';
import CollapsibleSearchBar from '@/app/ui/components/CollapsibleSearchBar/CollapsibleSearchBar';
import ErrorDisplay from '@/app/ui/components/ErrorDisplay/ErrorDisplay';
import LoadingScreen from '@/app/ui/components/LoadingScreen/LoadingScreen';
import NoResultsFound from '@/app/ui/components/NotResultsFound/NoResultsFound';
import type { LooseningSuggestion } from '@/app/ui/components/NotResultsFound/NoResultsFound';
import ResultsHeader from '@/app/ui/components/ResultsHeader/ResultsHeader';
import { useSearchEvent } from '@/app/ui/components/SearchEvent/useSearchEvent';
import ResultsSkeleton from '@/app/ui/components/TireCardSkeleton/TireCardSkeleton';
import TireResults from '@/app/ui/components/TireResults/TireResults';
import TireTable from '@/app/ui/components/TireTable/TireTable';
import { promoBannerConfig } from '@/app/ui/sections/PromoBanner/config/promoBanner';
import PromoBanner from '@/app/ui/sections/PromoBanner/PromoBanner';
import { LISTS } from '@/app/utils/ecommerce';
import type { TireView } from '@/app/utils/filterUtils';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  getAvailablePageSizes,
  validatePageSize,
} from '@/app/utils/paginationUtils';
import { createPaginatedResponse } from '@/app/utils/transformTireData';

import { PaginatedTiresResponse } from '../utils/fetchTiresServer';

interface SearchResultsProps {
  initialData?: PaginatedTiresResponse;
  /** How the buyer is reading the results — decided on the server, from the URL. */
  view?: TireView;
  /** Ways out of an empty result, computed on the server with their counts. */
  suggestions?: LooseningSuggestion[];
  /** What the results are, in words — built from the applied filters. */
  heading?: string;
  searchParams?: {
    page?: string;
    pageSize?: string;
    w?: string;
    s?: string;
    d?: string;
  };
}

/**
 * SearchResults component displays the search results page for tires,
 * including the header section, lateral filters, and the list of tire products.
 * It handles pagination, sorting, and filtering functionality.
 *
 * @returns The SearchResults component.
 */
const SearchResults: FC<SearchResultsProps> = ({
  initialData,
  view = 'list',
  suggestions = [],
  heading,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // GA4 `search` where every size search lands (feature 046, D5).
  useSearchEvent(searchParams);
  const [tiresData, setTiresData] = useState<PaginatedTiresResponse>(
    initialData ?? {
      tires: [],
      totalCount: 0,
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPages: 1,
      error: '',
    }
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  // Skip the first client-side fetch when SSR data was already provided
  const skipNextFetch = useRef(Boolean(initialData));

  /**
   * Pagination state starts from the URL, not from page 1.
   *
   * It used to start at `DEFAULT_PAGE` and let an effect catch up. On a reload
   * of `?page=7`, that effect's `setPage(7)` only lands on the next render, but
   * the effect below that writes state back into the URL runs in the same first
   * commit — still holding page 1 — and `router.replace`d the URL to `?page=1`.
   * The first effect then read page 1 and the buyer was sent back to the start,
   * at the cost of a second full server render of `/tires`.
   */
  const [page, setPage] = useState<number>(
    () => parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10) || DEFAULT_PAGE
  );
  const [pageSize, setPageSize] = useState<number>(() =>
    validatePageSize(
      parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE
    )
  );
  const totalPages = Math.ceil(tiresData.totalCount / pageSize);
  const maxVisiblePages = 10;

  // Refs to track current values for comparison in effects
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);

  // Tire size parameters
  const width = searchParams.get('w') || '';
  const sidewall = searchParams.get('s') || '';
  const diameter = searchParams.get('d') || '';

  // Function to get the tire size to display
  const getTireSize = () => {
    if (width && sidewall && diameter) {
      return `${width}/${sidewall}/${diameter}`;
    }
    return '';
  };

  // Function to update pagination parameters in the URL
  const updatePaginationParams = useCallback(
    (pageNum: number, pageSizeNum: number) => {
      try {
        // Validate page size
        const validatedPageSize = validatePageSize(pageSizeNum);

        // Notify if adjusted
        if (pageSizeNum !== validatedPageSize) {
          console.warn(`Invalid pageSize: ${pageSizeNum} adjusted to ${validatedPageSize}`);
        }

        // Use current location to avoid dependency on searchParams identity
        const params = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.search : ''
        );

        const currentPage = parseInt(params.get('page') || String(DEFAULT_PAGE), 10);
        const currentPageSize = parseInt(params.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);

        // If it already matches, don't navigate to avoid loops
        if (currentPage === pageNum && currentPageSize === validatedPageSize) {
          return;
        }

        // Update and replace (no push) to avoid polluting history
        params.set('page', pageNum.toString());
        params.set('pageSize', validatedPageSize.toString());
        router.replace(`?${params.toString()}`, { scroll: false });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Error updating pagination:', errorMessage);
      }
    },
    [router]
  );

  const getDataTires = useCallback(
    async (page: number) => {
      if (count === 1) {
        setLoading(true);
        try {
          const baseUrl = window.location.origin;
          const params = new URLSearchParams(searchParams.toString());

          params.set('page', page.toString());
          params.set('pageSize', pageSize.toString());

          const response = await fetch(`${baseUrl}/api/tires?${params.toString()}`);
          const result: { records: TiresData[]; totalCount: number } = await response.json();

          const tiresData = result.records;
          const totalCount = result.totalCount;

          const dataTransformed = createPaginatedResponse(
            tiresData,
            page,
            pageSize,
            totalCount
          ) as PaginatedTiresResponse;
          setTiresData(dataTransformed);

          setCount(0);
        } catch (error: unknown) {
          setError(error instanceof Error ? error.message : String(error));
        } finally {
          setLoading(false);
        }
      }
    },
    [searchParams, pageSize, count]
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

  const handleNextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prevPage => prevPage + 1);
      handleUpScroll();
    }
  }, [page, totalPages, handleUpScroll]);

  const handlePreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(prevPage => prevPage - 1);
      handleUpScroll();
    }
  }, [page, handleUpScroll]);

  const handlePageClick = useCallback(
    (pageNumber: number) => {
      setPage(pageNumber);
      handleUpScroll();
    },
    [handleUpScroll]
  );

  const handleFirstPage = useCallback(() => {
    setPage(1);
    handleUpScroll();
  }, [handleUpScroll]);

  const handleLastPage = useCallback(() => {
    setPage(totalPages);
    handleUpScroll();
  }, [totalPages, handleUpScroll]);

  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newPageSize = parseInt(event.target.value, 10);

      const currentRecordIndex = (page - 1) * pageSize;
      const newPage = Math.floor(currentRecordIndex / newPageSize) + 1;

      setPageSize(newPageSize);
      setPage(newPage);
    },
    [page, pageSize]
  );

  const pagination = useGenerateFixedPagination(page, totalPages, maxVisiblePages);
  const availablePageSizes = getAvailablePageSizes(tiresData.totalCount);

  // Update refs when state changes
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10);
    const urlPageSizeRaw = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);

    // Validar el tamaño de página
    const urlPageSize = validatePageSize(urlPageSizeRaw);

    // Si se detectó un valor inválido, actualizarlo en la URL
    if (urlPageSizeRaw !== urlPageSize && searchParams.has('pageSize')) {
      updatePaginationParams(urlPage, urlPageSize);
    }

    if (pageRef.current !== urlPage) setPage(urlPage);
    if (pageSizeRef.current !== urlPageSize) setPageSize(urlPageSize);
  }, [searchParams, updatePaginationParams]);

  useEffect(() => {
    void getDataTires(page);
  }, [getDataTires, page]);

  useEffect(() => {
    updatePaginationParams(page, pageSize);
  }, [updatePaginationParams, page, pageSize]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    setCount(1);
  }, [searchParams]);

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
            {loading ? (
              <ResultsSkeleton count={pageSize} />
            ) : tiresData.tires.length === 0 ? (
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
                            disabled={page === 1}
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
                            disabled={page === 1}
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
                            disabled={page === totalPages}
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
                            disabled={page === totalPages}
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
