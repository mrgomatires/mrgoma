'use client';

import { useCallback, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

// Define types for the tire filters - simplified without rear tire parameters
export interface TireFilters {
  w: string;
  s: string;
  d: string;
}

/**
 * Custom hook to manage tire search functionality
 * Handles URL parameters and tire selection state
 */
export const useTireSearch = (redirectBasePath: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL parameters - only front tire dimensions
  const [selectedFilters, setSelectedFilters] = useState<TireFilters>({
    w: searchParams.get('w') || '',
    s: searchParams.get('s') || '',
    d: searchParams.get('d') || '',
  });

  /**
   * Update a single filter value and update the URL
   */
  const handleFilterChange = useCallback(
    (value: string, type: keyof TireFilters) => {
      const newFilters = {
        ...selectedFilters,
        [type]: value,
      };
      setSelectedFilters(newFilters);

      // Update URL parameters
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      //se cambio
      router.push(`/${redirectBasePath}?${params.toString()}`);
    },
    [selectedFilters, searchParams, router]
  );

  /**
   * Reset all tire dimension filters
   * Optionally avoid pushing to the router (for coordinated URL updates)
   */
  const resetFilters = useCallback(
    (shouldPush: boolean = true) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('w');
      params.delete('s');
      params.delete('d');

      setSelectedFilters({
        w: '',
        s: '',
        d: '',
      });

      if (shouldPush) {
        router.push(`/${redirectBasePath}?${params.toString()}`);
      }
    },
    [searchParams, router]
  );

  /**
   * Apply a whole size in one navigation (049): the size picker stages width,
   * ratio and rim and searches only when the shopper presses Search (D3).
   * `handleFilterChange` keeps navigating on every change for the dashboard.
   */
  const applySize = useCallback(
    (size: TireFilters) => {
      setSelectedFilters(size);
      const params = new URLSearchParams(searchParams.toString());
      (['w', 's', 'd'] as const).forEach(key => {
        if (size[key]) params.set(key, size[key]);
        else params.delete(key);
      });
      // A new size starts the results from the first page.
      params.delete('page');
      router.push(`/${redirectBasePath}?${params.toString()}`);
    },
    [searchParams, router, redirectBasePath]
  );

  return {
    selectedFilters,
    handleFilterChange,
    resetFilters,
    applySize,
  };
};
