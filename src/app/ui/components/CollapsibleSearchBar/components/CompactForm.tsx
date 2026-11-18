'use client';

import React, { useRef, useState } from 'react';

import { useStockedSizes } from '@/app/hooks/useStockedSizes';
import { EditIcon, XMarkIcon } from '@/app/ui/components/Icons/Icons';
import SeeAllSizesLink from '@/app/ui/components/SeeAllSizesLink/SeeAllSizesLink';
import SizePicker from '@/app/ui/components/SizePicker/SizePicker';

import { TireFilters } from '../hooks/useTireSearch';

interface CompactFormProps {
  selectedFilters: TireFilters;
  /** Search with the staged size: one navigation (049, D3). */
  onApplyAction: (size: TireFilters) => void;
  onResetFiltersAction: () => void;
  onCloseAction: () => void;
}

/**
 * The `/tires` floating "Edit tire size" form.
 *
 * Since 049 it holds the size picker: width → ratio → rim with buttons that only
 * offer sizes for sale. Picks are **staged** here and applied by Search in one
 * navigation — the drop-downs used to reload the listing on every change. A
 * partial size (only a width) can still be searched, as before.
 *
 * Fixed to the bottom-left at 320 px, so its height is capped to the viewport
 * and the grid scrolls inside it instead of running off a phone screen.
 */
export const CompactForm: React.FC<CompactFormProps> = ({
  selectedFilters,
  onApplyAction,
  onResetFiltersAction,
  onCloseAction,
}) => {
  const { tree, error } = useStockedSizes();
  const [staged, setStaged] = useState<TireFilters>(selectedFilters);
  const [ready, setReady] = useState(false);
  const searchRef = useRef<HTMLButtonElement>(null);

  const changed =
    staged.w !== selectedFilters.w ||
    staged.s !== selectedFilters.s ||
    staged.d !== selectedFilters.d;

  return (
    <div
      className="fixed bottom-20 left-4 z-50 sm:z-40 md:z-40 lg:z-40 xl:z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-80 max-w-[90vw] max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain"
      style={{ position: 'fixed' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <EditIcon className="w-4 h-4 text-green-600" aria-hidden />
          Edit Tire Size
        </h3>
        <button
          type="button"
          onClick={onCloseAction}
          aria-label="Close"
          className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
        >
          <XMarkIcon className="w-4 h-4" aria-hidden />
        </button>
      </div>

      <div className="space-y-2">
        <SizePicker
          tree={tree}
          value={staged}
          onChange={next => {
            setStaged(next);
            setReady(false);
          }}
          onComplete={() => {
            setReady(true);
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
          surface="tires"
          error={error}
        />

        <button
          ref={searchRef}
          type="button"
          onClick={() => onApplyAction(staged)}
          disabled={!changed}
          className={`w-full min-h-11 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 ${
            changed
              ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }${ready && changed ? ' search-ready' : ''}`}
        >
          Search
        </button>

        <button
          type="button"
          onClick={() => {
            setStaged({ w: '', s: '', d: '' });
            setReady(false);
            onResetFiltersAction();
          }}
          className="w-full cursor-pointer flex items-center justify-center gap-1 text-gray-700 hover:text-gray-900 py-1 px-2 border border-gray-300 rounded-md transition-colors hover:bg-gray-50 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <span>Reset Selection</span>
        </button>

        <SeeAllSizesLink surface="tires_form" className="w-full justify-center" />
      </div>
    </div>
  );
};
