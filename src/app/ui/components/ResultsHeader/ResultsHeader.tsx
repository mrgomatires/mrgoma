'use client';

import React, { FC, useCallback, useContext, useEffect, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { ShowFilterContext } from '@/app/context/ShowFilterContext';
import { AdjustmentsHorizontalIcon } from '@/app/ui/components/Icons/Icons';
import { useResultsNavigation } from '@/app/ui/components/ResultsNavigation/ResultsNavigation';

interface ResultsHeaderProps {
  /**
   * What the results are. Computed on the server from the applied filters, so
   * the heading and the rail's chips can never describe different things.
   */
  heading?: string;
  getTireSize?: () => string;
  resultsCount?: number;
  totalCount?: number;
  showTitle?: boolean;
  showCount?: boolean;
  showSort?: boolean;
  /** The mobile drawer trigger. `/dashboard` still needs it; `/tires` does not. */
  showFilterButton?: boolean;
}

/**
 * ResultsHeader component displays the header section for tire search results,
 * including the current tire size, filter button for mobile, results' count,
 * and sorting options for price.
 */
const ResultsHeader: FC<ResultsHeaderProps> = ({
  heading,
  getTireSize,
  resultsCount,
  totalCount,
  showTitle = true,
  showCount = true,
  showSort = true,
  showFilterButton = true,
}) => {
  const { setShowFilter } = useContext(ShowFilterContext);
  // On /tires the change is tracked as pending (061); elsewhere a plain push.
  const { navigate } = useResultsNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sortOption, setSortOption] = useState('');

  // Initialize a sort option from URL on the component mount
  useEffect(() => {
    const urlSortOption = searchParams.get('sort') || '';
    setSortOption(urlSortOption);
  }, [searchParams]);

  // Handle sort change
  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newSortOption = event.target.value;
      setSortOption(newSortOption);

      // Update URL with new sort parameter
      const params = new URLSearchParams(searchParams.toString());

      if (newSortOption) {
        params.set('sort', newSortOption);
      } else {
        params.delete('sort');
      }

      // Reset to first page when sort changes
      params.set('page', '1');

      navigate(`${pathname}?${params.toString()}`);
    },
    [navigate, pathname, searchParams]
  );

  // Get the tire size to display
  const tireSize = getTireSize && getTireSize();

  return (
    <div
      className={`flex flex-wrap gap-2 justify-between lg:justify-between items-center ${showTitle || showCount || showSort ? 'mt-6' : ''}`}
    >
      {/* Left side - Tire size title */}
      <div className="flex flex-wrap items-center gap-2 min-w-[250px]">
        {showTitle && (
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {tireSize ? (
              <>
                Tire results for:{' '}
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-green-700 ring-1 ring-green-200">
                  {tireSize}
                </span>
              </>
            ) : (
              // It used to read "All tires" whatever was applied, on the one
              // page whose purpose is narrowing.
              (heading ?? 'All tires')
            )}
          </h2>
        )}
        {/*
         * The green "Filters" button that used to sit here opened the mobile
         * drawer the filter rail replaced. On a phone it left two controls
         * called Filters within one screen of each other — this one, and the
         * rail's own disclosure above the results — and this one opened a panel
         * that is no longer part of the page.
         *
         * `ResultsHeader` is shared with `/dashboard`, which still uses that
         * drawer, so the button is gated rather than deleted.
         */}
        {showFilterButton && (
          <button
            type="button"
            className="lg:hidden flex items-center justify-center p-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
            aria-label="Show filters"
            onClick={() => setShowFilter(true)}
          >
            <span className="sr-only">Filters</span>
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
            <span className="ml-1">Filters</span>
          </button>
        )}
      </div>

      {/* Right side - Sort and count */}
      {(showCount || showSort) && (
        <div className="flex items-center gap-4">
          {showCount && (
            <span className="text-sm text-gray-500" aria-live="polite">
              Showing <span className="font-semibold text-gray-700">{resultsCount}</span> of{' '}
              <span className="font-semibold text-gray-700">
                {totalCount?.toLocaleString('en-US')}
              </span>{' '}
              results
            </span>
          )}
          {showSort && (
            <select
              className="bg-white border border-gray-300 rounded-md py-1 px-3 text-sm text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer transition-colors"
              value={sortOption}
              onChange={handleSortChange}
              aria-label="Sort results"
            >
              <option value="">Sort by</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="life-desc">Most tread left</option>
              <option value="newest">Newest arrivals</option>
            </select>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsHeader;
