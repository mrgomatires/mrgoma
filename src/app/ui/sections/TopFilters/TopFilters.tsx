'use client';

import { FC, useState, useRef, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { TireSelector } from '@/app/ui/components/CollapsibleSearchBar/components/TireSelector';
import { useTireSearch } from '@/app/ui/components/CollapsibleSearchBar/hooks/useTireSearch';
import FilterBody from '@/app/ui/sections/FilterBody/FilterBody';
import { filtersItems } from '@/app/ui/sections/FiltersMobile/FiltersItems';
import { useFilters } from '@/app/ui/sections/FiltersMobile/hooks/useFilters';
import { StoreLocationFilter } from '@/app/ui/sections/TopFilters/StoreLocationFilter';

export const CodeFilterInput: FC<{ redirectBasePath: string; fullWidth?: boolean }> = ({
  redirectBasePath,
  fullWidth = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('code') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = value.length > 0;

  const pushCode = (code: string) => {
    const params = new URLSearchParams(window.location.search);
    if (code) {
      params.set('code', code);
    } else {
      params.delete('code');
    }
    params.set('page', '1');
    router.push(`/${redirectBasePath}?${params.toString()}`, { scroll: false });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setValue(digits);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushCode(digits), 400);
  };

  const handleClear = () => {
    setValue('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushCode('');
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 ${
        fullWidth ? 'w-full py-2.5' : 'py-1'
      } ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}`}
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="search"
        placeholder="Tire Code"
        value={value}
        onChange={handleChange}
        maxLength={20}
        style={{ fontSize: '16px' }}
        className={`${fullWidth ? 'flex-1' : 'w-24'} bg-transparent outline-none placeholder-gray-400 leading-none ${
          isActive ? 'text-green-700' : 'text-gray-700'
        }`}
      />
      {isActive && (
        <button
          type="button"
          onClick={handleClear}
          className="text-green-600 hover:text-green-800 font-bold leading-none cursor-pointer text-base"
          aria-label="Clear tire code filter"
        >
          ×
        </button>
      )}
    </div>
  );
};

export const TopFilters: FC<{
  redirectBasePath: string;
  apiBasePath?: string;
  showPriceFilter?: boolean;
  showStoreFilter?: boolean;
  inlineTireSize?: boolean;
  showLocalFilter?: boolean;
  showCodeFilter?: boolean;
}> = ({
  redirectBasePath,
  apiBasePath = '/api',
  showPriceFilter = true,
  showStoreFilter = false,
  inlineTireSize = false,
  showLocalFilter = false,
  showCodeFilter = false,
}) => {
  const {
    rangeInputs,
    rangeBounds,
    availableBrands,
    availableStores,
    availableLocations,
    isLoadingLocations,
    handleRangeChange,
    handleCheckboxChange,
    isLoadingRanges,
    isChecked,
    resetFilters,
    isLoadingBrands,
    isLoadingStores,
    checkboxInputs,
  } = useFilters(redirectBasePath, apiBasePath, { enableStoreFilter: showStoreFilter });

  // Tire size form state (CompactForm equivalent) using the same hook used in CollapsibleSearchBar
  const {
    selectedFilters: tireSelectedFilters,
    handleFilterChange: handleTireFilterChange,
    resetFilters: resetTireFilters,
  } = useTireSearch(redirectBasePath);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isTireSizeActive = () =>
    Boolean(tireSelectedFilters.w || tireSelectedFilters.s || tireSelectedFilters.d);

  const topSections = [
    ...(showPriceFilter ? [{ id: 'price', name: 'Price' }] : []),
    { id: 'treadDepth', name: 'Tread Depth' },
    { id: 'remainingLife', name: 'Remaining Life' },
    ...filtersItems.map(item => ({ id: item.id, name: item.name })),
    ...(showLocalFilter ? [{ id: 'local', name: 'Local Install Only' }] : []),
  ] as { id: string; name: string }[];

  // Shared renderer for filter panels to avoid duplication across mobile and desktop views
  const buildDeps = () => ({
    rangeInputs,
    rangeBounds,
    availableBrands,
    handleRangeChange,
    handleCheckboxChange,
    isLoadingRanges,
    isChecked,
    isLoadingBrands,
  });

  const isRangeActive = (id: 'price' | 'treadDepth' | 'remainingLife') => {
    const [curMin, curMax] = rangeInputs[id];
    const [defMin, defMax] = rangeBounds[id];
    return curMin > defMin || curMax < defMax;
  };

  const isCheckboxGroupActive = (id: 'condition' | 'patched' | 'kindSale') => {
    return (checkboxInputs?.[id] || []).length > 0;
  };

  const isBrandsActive = () => (checkboxInputs?.brands || []).length > 0;

  const isFilterActive = (id: string) => {
    if (id === 'price' || id === 'treadDepth' || id === 'remainingLife') return isRangeActive(id);
    if (id === 'condition' || id === 'patched' || id === 'kindSale')
      return isCheckboxGroupActive(id);
    if (id === 'brands') return isBrandsActive();
    if (id === 'local') return (checkboxInputs?.local || []).length > 0;
    return false;
  };

  const activeClass = 'bg-green-50 border-green-500 text-green-700';
  const defaultClass = 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50';

  return (
    <div ref={menuRef} className="w-full sticky top-14 z-30 hidden lg:block">
      <div className="flex items-start bg-white border border-gray-200 rounded-lg p-2">
        <div className="flex items-center mr-2 md:mr-3">
          <span className="text-xs font-medium text-gray-500">Filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Tire Size filter */}
          {inlineTireSize ? (
            <div className="flex items-center gap-2 border border-green-200 rounded-md px-3 py-1.5">
              <TireSelector
                selectedFilters={tireSelectedFilters}
                onFilterChangeAction={handleTireFilterChange}
                flat
              />
              {isTireSizeActive() && (
                <button
                  type="button"
                  onClick={() => resetTireFilters()}
                  className="cursor-pointer text-xs border border-green-200 text-green-600 hover:bg-green-50 rounded px-1.5 py-0.5 shrink-0 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            (() => {
              const isOpen = openMenu === 'tireSize';
              const isActive = isTireSizeActive();
              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(prev => (prev === 'tireSize' ? null : 'tireSize'))}
                    className={`px-3 py-2 text-sm rounded-md border cursor-pointer flex items-center gap-2 ${isOpen || isActive ? activeClass : defaultClass}`}
                  >
                    <span>Tire Size</span>
                    <svg
                      className={`h-4 w-4 text-current transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="absolute left-0 mt-2 z-50 w-88 md:w-104 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                      <div className="space-y-2">
                        <TireSelector
                          selectedFilters={tireSelectedFilters}
                          onFilterChangeAction={handleTireFilterChange}
                        />
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => resetTireFilters()}
                            className="px-3 py-1.5 cursor-pointer text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Reset Selection
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenMenu(null)}
                            className="px-3 py-1.5 cursor-pointer text-xs rounded-md bg-green-600 text-white hover:bg-green-500"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
          {topSections.map(item => {
            const isOpen = openMenu === item.id;
            const isActive = isFilterActive(item.id);
            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(prev => (prev === item.id ? null : item.id))}
                  className={`px-3 py-2 text-sm rounded-md border cursor-pointer flex items-center gap-2 ${isOpen || isActive ? activeClass : defaultClass}`}
                >
                  <span>{item.name}</span>
                  <svg
                    className={`h-4 w-4 text-current transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {isOpen && (
                  <div className="absolute left-0 mt-2 z-50 w-80 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    {FilterBody(item.id, buildDeps(), { isMobile: false })}
                  </div>
                )}
              </div>
            );
          })}

          {/*
            Store and Location as one group, dressed like the Size block beside
            it: they are one dependent pair — a shelf code means nothing without
            its store — exactly as no sidewall is offered without a width.
          */}
          {showStoreFilter && (
            <StoreLocationFilter
              stores={availableStores}
              selectedStores={checkboxInputs?.stores || []}
              isLoadingStores={isLoadingStores}
              locations={availableLocations}
              selectedLocations={checkboxInputs?.locations || []}
              isLoadingLocations={isLoadingLocations}
              openMenu={openMenu}
              onOpenAction={setOpenMenu}
              onChangeAction={handleCheckboxChange}
              activeClass={activeClass}
              defaultClass={defaultClass}
            />
          )}

          {(availableBrands.length > 0 || isLoadingBrands) && (
            <div className="relative">
              {(() => {
                const isOpen = openMenu === 'brands';
                const isActive = isBrandsActive();
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(prev => (prev === 'brands' ? null : 'brands'))}
                      className={`px-3 py-2 text-sm rounded-md border cursor-pointer flex items-center gap-2 ${isOpen || isActive ? activeClass : defaultClass}`}
                    >
                      <span>Brands</span>
                      <svg
                        className={`h-4 w-4 text-current transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="absolute left-0 mt-2 z-50 w-80 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                        {FilterBody('brands', buildDeps(), {
                          isMobile: false,
                          containerExtraClass: 'pr-1',
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="ml-auto pl-2 self-center flex items-center gap-2">
          {showCodeFilter && <CodeFilterInput redirectBasePath={redirectBasePath} />}
          <button
            type="button"
            onClick={() => {
              // First, reset tire filters without pushing a new URL to avoid race conditions
              resetTireFilters(false);
              // Then reset the rest of filters and perform a single URL update that removes all params
              resetFilters();
            }}
            className="px-3 py-2 cursor-pointer text-xs rounded-md text-white bg-green-600 hover:bg-green-500 whitespace-nowrap"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopFilters;
