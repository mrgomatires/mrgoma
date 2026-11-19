/**
 * Client component: it holds filter state and calls `useFilters`. The directive
 * was missing until `026` added a `useState` here — the barrel re-exports this
 * module and `not-found.tsx` reaches it from a Server Component, so the build
 * failed where the test suite could not: vitest does not enforce RSC boundaries.
 */
'use client';

import React, { FC, useState } from 'react';

import {
  Disclosure,
  DisclosureButton,
  DisclosureIcon,
  DisclosurePanel,
} from '@/app/ui/components/Disclosure/Disclosure';
import FilterBody from '@/app/ui/sections/FilterBody/FilterBody';
import { filtersItems } from '@/app/ui/sections/FiltersMobile/FiltersItems';
import { useFilters } from '@/app/ui/sections/FiltersMobile/hooks/useFilters';
import { StoreLocationFilter } from '@/app/ui/sections/TopFilters/StoreLocationFilter';
/**
 * FilterContent is a component that renders a form with various filters, such as price, tread depth, remaining life, and checkboxes.
 * It takes an optional `isMobile` prop, which determines whether the component is rendered for mobile devices or not.
 * @prop {boolean} isMobile - Whether the component is rendered for mobile devices or not (default is false).
 */
export const FilterMobileContent: FC<{
  isMobile?: boolean;
  redirectBasePath: string;
  apiBasePath?: string;
  showPriceFilter?: boolean;
  showStoreFilter?: boolean;
  showLocalFilter?: boolean;
}> = ({
  isMobile = false,
  redirectBasePath,
  apiBasePath = '/api',
  showPriceFilter = true,
  showStoreFilter = false,
  showLocalFilter = false,
}) => {
  const {
    rangeInputs,
    rangeBounds,
    availableBrands,
    availableStores,
    availableLocations,
    isLoadingLocations,
    checkboxInputs,
    handleRangeChange,
    handleCheckboxChange,
    isLoadingRanges,
    isChecked,
    isLoadingBrands,
    isLoadingStores,
  } = useFilters(redirectBasePath, apiBasePath, { enableStoreFilter: showStoreFilter });

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const borderClass = isMobile ? 'border-t' : 'border-b';
  const paddingClass = isMobile ? 'px-4' : '';

  return (
    <form className={`${isMobile ? 'mt-2 px-5' : 'space-y-4'}`}>
      {/* Price Filter */}
      {showPriceFilter && (
        <Disclosure
          defaultOpen={true}
          as="div"
          className={`${borderClass} border-gray-200 py-6 ${paddingClass}`}
        >
          <h3 className="-my-3 flow-root">
            <DisclosureButton className="flex w-full items-center justify-between bg-gray-50 py-3 text-sm text-gray-400 hover:text-gray-500">
              <span className="font-medium text-gray-900">Price</span>
              <span className="ml-6 flex items-center text-green-600">
                <DisclosureIcon />
              </span>
            </DisclosureButton>
          </h3>
          <DisclosurePanel className="pt-6 h-20">
            {FilterBody(
              'price',
              {
                rangeInputs,
                rangeBounds,
                availableBrands,
                handleRangeChange,
                handleCheckboxChange,
                isLoadingRanges,
                isChecked,
                isLoadingBrands,
              },
              { isMobile, idPrefix: isMobile ? 'mobile-' : '' }
            )}
          </DisclosurePanel>
        </Disclosure>
      )}

      {/*
        Store and Location as one group, the same pairing the desktop bar shows.
        Sharing the component rather than mirroring its markup is deliberate: two
        hand-kept copies drifting apart is how `Location` came to mean two things.
      */}
      {showStoreFilter && (
        <div className="border-b border-gray-200 py-4">
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
            activeClass="border-green-600 bg-green-50 text-green-700"
            defaultClass="border-gray-300 bg-white text-gray-700"
            inline
          />
        </div>
      )}

      {/* Tread Depth Filter */}
      <Disclosure
        defaultOpen={true}
        as="div"
        className={`${borderClass} border-gray-200 py-6 ${paddingClass}`}
      >
        <h3 className="-my-3 flow-root">
          <DisclosureButton className="flex w-full items-center justify-between bg-gray-50 py-3 text-sm text-gray-400 hover:text-gray-500">
            <span className="font-medium text-gray-900">Tread Depth</span>
            <span className="ml-6 flex items-center text-green-600">
              <DisclosureIcon />
            </span>
          </DisclosureButton>
        </h3>
        <DisclosurePanel className="pt-6 h-20">
          {FilterBody(
            'treadDepth',
            {
              rangeInputs,
              rangeBounds,
              availableBrands,
              handleRangeChange,
              handleCheckboxChange,
              isLoadingRanges,
              isChecked,
              isLoadingBrands,
            },
            { isMobile, idPrefix: isMobile ? 'mobile-' : '' }
          )}
        </DisclosurePanel>
      </Disclosure>

      {/* Remaining Life Filter */}
      <Disclosure
        defaultOpen={true}
        as="div"
        className={`${borderClass} border-gray-200 py-6 ${paddingClass}`}
      >
        <h3 className="-my-3 flow-root">
          <DisclosureButton className="flex w-full items-center justify-between bg-gray-50 py-3 text-sm text-gray-400 hover:text-gray-500">
            <span className="font-medium text-gray-900">Remaining Life</span>
            <span className="ml-6 flex items-center text-green-600">
              <DisclosureIcon />
            </span>
          </DisclosureButton>
        </h3>
        <DisclosurePanel className="pt-6 h-20">
          {FilterBody(
            'remainingLife',
            {
              rangeInputs,
              rangeBounds,
              availableBrands,
              handleRangeChange,
              handleCheckboxChange,
              isLoadingRanges,
              isChecked,
              isLoadingBrands,
            },
            { isMobile, idPrefix: isMobile ? 'mobile-' : '' }
          )}
        </DisclosurePanel>
      </Disclosure>

      {/* Checkbox Filters */}
      {filtersItems.map(section => (
        <Disclosure
          defaultOpen={true}
          key={section.id}
          as="div"
          className={`${borderClass} border-gray-200 py-6 ${paddingClass}`}
        >
          <h3 className={`${isMobile ? '-mx-2' : ''} -my-3 flow-root`}>
            <DisclosureButton
              className={`flex w-full items-center justify-between bg-gray-50 ${isMobile ? 'px-2' : ''} py-3 text-sm text-gray-400 hover:text-gray-500`}
            >
              <span className="font-medium text-gray-900">{section.name}</span>
              <span className="ml-6 flex items-center text-green-600">
                <DisclosureIcon />
              </span>
            </DisclosureButton>
          </h3>
          <DisclosurePanel className="pt-6">
            {FilterBody(
              section.id,
              {
                rangeInputs,
                rangeBounds,
                availableBrands,
                handleRangeChange,
                handleCheckboxChange,
                isLoadingRanges,
                isChecked,
                isLoadingBrands,
              },
              { isMobile, idPrefix: isMobile ? 'mobile-' : '' }
            )}
          </DisclosurePanel>
        </Disclosure>
      ))}

      {/* Local Filter (dashboard only) */}
      {showLocalFilter && (
        <Disclosure
          defaultOpen={true}
          as="div"
          className={`${borderClass} border-gray-200 py-6 ${paddingClass}`}
        >
          <h3 className={`${isMobile ? '-mx-2' : ''} -my-3 flow-root`}>
            <DisclosureButton
              className={`flex w-full items-center justify-between bg-gray-50 ${isMobile ? 'px-2' : ''} py-3 text-sm text-gray-400 hover:text-gray-500`}
            >
              <span className="font-medium text-gray-900">Local Install Only</span>
              <span className="ml-6 flex items-center text-green-600">
                <DisclosureIcon />
              </span>
            </DisclosureButton>
          </h3>
          <DisclosurePanel className="pt-6">
            {FilterBody(
              'local',
              {
                rangeInputs,
                rangeBounds,
                availableBrands,
                handleRangeChange,
                handleCheckboxChange,
                isLoadingRanges,
                isChecked,
                isLoadingBrands,
              },
              { isMobile, idPrefix: isMobile ? 'mobile-' : '' }
            )}
          </DisclosurePanel>
        </Disclosure>
      )}

      {(availableBrands.length > 0 || isLoadingBrands) && (
        <Disclosure
          as="div"
          className={`${borderClass} border-gray-200 py-6 ${paddingClass}`}
          defaultOpen={true}
        >
          <h3 className={`${isMobile ? '-mx-2' : ''} -my-3 flow-root`}>
            <DisclosureButton
              className={`flex w-full items-center justify-between bg-gray-50 ${isMobile ? 'px-2' : ''} py-3 text-sm text-gray-400 hover:text-gray-500`}
            >
              <span className="font-medium text-gray-900">Brands</span>
              <span className="ml-6 flex items-center text-green-600">
                <DisclosureIcon />
              </span>
            </DisclosureButton>
          </h3>
          <DisclosurePanel className="pt-6">
            {FilterBody(
              'brands',
              {
                rangeInputs,
                rangeBounds,
                availableBrands,
                handleRangeChange,
                handleCheckboxChange,
                isLoadingRanges,
                isChecked,
                isLoadingBrands,
              },
              { isMobile, idPrefix: isMobile ? 'mobile-' : '' }
            )}
          </DisclosurePanel>
        </Disclosure>
      )}
    </form>
  );
};

export default FilterMobileContent;
