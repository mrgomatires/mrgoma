'use client';

import React, { FC, useContext, useEffect, useState } from 'react';

import { ShowFilterContext } from '@/app/context/ShowFilterContext';
import { Dialog, DialogBackdrop, DialogPanel } from '@/app/ui/components/Dialog/Dialog';
import { XMarkIcon } from '@/app/ui/components/Icons/Icons';
import FilterMobileContent from '@/app/ui/sections/FilterMobileContent/FilterMobileContent';
import { useFilters } from '@/app/ui/sections/FiltersMobile/hooks/useFilters';

const FiltersMobile: FC<{
  redirectBasePath: string;
  apiBasePath?: string;
  showPriceFilter?: boolean;
  showStoreFilter?: boolean;
  showLocalFilter?: boolean;
}> = ({
  redirectBasePath,
  apiBasePath = '/api',
  showPriceFilter = true,
  showStoreFilter = false,
  showLocalFilter = false,
}) => {
  const { showFilter, setShowFilter } = useContext(ShowFilterContext);
  const { resetFilters } = useFilters(redirectBasePath, apiBasePath);
  const [headerOffset, setHeaderOffset] = useState(0);
  // Separación mínima para evitar solapamiento visual con el header
  const EXTRA_TOP = 4;

  useEffect(() => {
    const getHeaderEl = () => document.querySelector('header') as HTMLElement | null;
    let headerEl = getHeaderEl();

    const updateOffset = () => {
      headerEl = headerEl || getHeaderEl();
      const rect = headerEl?.getBoundingClientRect();
      const base = rect?.bottom ?? 0;
      const offset = Math.max(0, Math.round(base) + EXTRA_TOP);
      setHeaderOffset(offset);
    };

    updateOffset();

    let ro: ResizeObserver | null = null;
    if (headerEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateOffset());
      ro.observe(headerEl);
    }

    window.addEventListener('resize', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      if (ro && headerEl) ro.unobserve(headerEl);
    };
  }, []);

  return (
    <>
      {/* Mobile view */}
      <Dialog
        open={showFilter}
        onCloseAction={() => setShowFilter(false)}
        ariaLabelledby="filters-mobile-title"
        className="relative z-40 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black opacity-40 transition-opacity duration-300 ease-linear cursor-pointer"
        />
        <div
          className="fixed inset-0 z-40 flex"
          style={{ top: headerOffset }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowFilter(false);
            }
          }}
        >
          <DialogPanel
            transition
            className="relative mr-auto flex h-full w-full max-w-xs transform flex-col overflow-y-auto bg-gray-50 py-4 pb-12 shadow-xl transition duration-300 ease-in-out"
          >
            <div className="flex items-center justify-between px-4">
              <h2 id="filters-mobile-title" className="text-lg font-medium text-gray-900">
                Additional Filters
              </h2>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                aria-label="Close filters"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-green-600"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <div className="px-4 mt-2 mb-2">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full py-2 text-white bg-green-600 hover:bg-green-500 rounded-md text-sm font-medium transition-colors"
              >
                Reset Filters
              </button>
            </div>
            <FilterMobileContent
              isMobile={true}
              redirectBasePath={redirectBasePath}
              apiBasePath={apiBasePath}
              showPriceFilter={showPriceFilter}
              showStoreFilter={showStoreFilter}
              showLocalFilter={showLocalFilter}
            />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};

export default FiltersMobile;
