'use client';

import { FC, useContext, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { SelectedFiltersContext } from '@/app/context/SelectedFilters';
import { useStockedSizes } from '@/app/hooks/useStockedSizes';
import { useTireSizeWithContext } from '@/app/hooks/useTireSizeWithContext';
import { ButtonSearch, SizeSelector } from '@/app/ui/components';
import HomeMoreFilters, {
  HomeExtraFilters,
} from '@/app/ui/components/HomeMoreFilters/HomeMoreFilters';
import SizePicker, { type SizePick } from '@/app/ui/components/SizePicker/SizePicker';
import TirePreview3D from '@/app/ui/components/TirePreview3D/TirePreview3D';
import TirePreview3DMobile from '@/app/ui/components/TirePreview3D/TirePreview3DMobile';
import { CarFront } from '@/app/ui/icons';
import { TireSize } from '@/app/ui/interfaces/tireSize';
import { reconcile } from '@/app/utils/sizeTree';

const URL_PARAMS = {
  width: 'w',
  sidewall: 's',
  diameter: 'd',
};

const EMPTY_FILTERS: HomeExtraFilters = {
  brands: [],
  condition: [],
  minPrice: null,
  maxPrice: null,
};

/** Removable chip for an applied non-size filter. */
const FilterChip: FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 py-1 pl-3 pr-1.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
    {label}
    <button
      type="button"
      onClick={onRemove}
      data-track="remove_home_filter"
      data-track-category="home_search"
      data-track-label={label}
      aria-label={`Remove ${label} filter`}
      className="flex h-4 w-4 items-center justify-center rounded-full text-green-600 hover:bg-green-200 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  </span>
);

const SearchBySize: FC = () => {
  const { selectedFilters } = useContext(SelectedFiltersContext);
  const { tireSize, updateTireSize, isComplete } = useTireSizeWithContext();

  // Every size for sale, loaded once; the picker derives its steps from it (049).
  const { tree, error: sizesError } = useStockedSizes();

  const searchRef = useRef<HTMLButtonElement>(null);
  const [searchReady, setSearchReady] = useState(false);

  const router = useRouter();

  // Extra (non-size) filters chosen via the "More filters" panel.
  const [extraFilters, setExtraFilters] = useState<HomeExtraFilters>(EMPTY_FILTERS);

  const buildUrl = (extra: HomeExtraFilters) => {
    const params = new URLSearchParams();

    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (value && key in URL_PARAMS) {
        const paramName = URL_PARAMS[key as keyof typeof URL_PARAMS];
        params.append(paramName, value);
      }
    });

    // Param names match what /tires (buildTireFilters) already understands.
    if (extra.brands.length) params.append('brands', extra.brands.join(','));
    if (extra.condition.length) params.append('condition', extra.condition.join(','));
    if (extra.minPrice !== null) params.append('minPrice', String(extra.minPrice));
    if (extra.maxPrice !== null) params.append('maxPrice', String(extra.maxPrice));

    return `/tires?${params.toString()}`;
  };

  const handleSearch = () => router.push(buildUrl(extraFilters));

  // Apply only stages the filters as chips; the main Search button runs the
  // actual search (size + any staged filters).
  const handleApplyFilters = (extra: HomeExtraFilters) => setExtraFilters(extra);

  const removeBrand = (brand: string) =>
    setExtraFilters(prev => ({ ...prev, brands: prev.brands.filter(b => b !== brand) }));
  const removeCondition = (value: string) =>
    setExtraFilters(prev => ({ ...prev, condition: prev.condition.filter(c => c !== value) }));
  const removePrice = () => setExtraFilters(prev => ({ ...prev, minPrice: null, maxPrice: null }));

  const hasPriceFilter = extraFilters.minPrice !== null || extraFilters.maxPrice !== null;
  const hasExtraFilters =
    extraFilters.brands.length > 0 || extraFilters.condition.length > 0 || hasPriceFilter;

  const pick: SizePick = { w: tireSize.width, s: tireSize.sidewall, d: tireSize.diameter };

  const setPick = (next: SizePick) => {
    updateTireSize({ width: next.w, sidewall: next.s, diameter: next.d });
    setSearchReady(false);
  };

  // A complete size never searches by itself (D3): Search takes the focus and
  // a highlight, so the brand/condition/price filters can still be added.
  const onSizeComplete = () => {
    setSearchReady(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  // The chips under the picker: removing a part drops what no longer exists.
  const removePart = (type: keyof TireSize) => {
    const key = ({ width: 'w', sidewall: 's', diameter: 'd' } as const)[type];
    const next = { ...pick, [key]: '' };
    setPick(tree ? reconcile(tree, next) : { w: '', s: '', d: '' });
  };

  const canSearch = isComplete();
  // Allow searching with only filters (no complete size), so brand/price-only
  // searches aren't blocked by the "select all measurements" gate.
  const searchEnabled = canSearch || hasExtraFilters;

  return (
    <>
      <div className="flex gap-5 w-full">
        <div className="w-full md:w-3/5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CarFront className="w-5 h-5 text-gray-600" />
                <span className="text-base font-medium text-gray-600 capitalize ml-1">
                  Tire Size
                </span>
              </div>
              <TirePreview3DMobile
                onSearch={handleSearch}
                canSearch={searchEnabled}
                selector={{ tree, value: pick, onChange: setPick, error: sizesError }}
              />
            </div>
            <SizePicker
              tree={tree}
              value={pick}
              onChange={setPick}
              onComplete={onSizeComplete}
              surface="home"
              error={sizesError}
            />
            {(pick.w || pick.s || pick.d) && (
              <div className="flex flex-wrap gap-2">
                {(Object.entries(tireSize) as [keyof TireSize, string][]).map(([key, value]) =>
                  value ? (
                    <SizeSelector
                      key={key}
                      filterKey={key}
                      value={value}
                      removeFilter={removePart}
                    />
                  ) : null
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <HomeMoreFilters value={extraFilters} onApply={handleApplyFilters} />
              {extraFilters.brands.map(brand => (
                <FilterChip key={`b-${brand}`} label={brand} onRemove={() => removeBrand(brand)} />
              ))}
              {extraFilters.condition.map(value => (
                <FilterChip
                  key={`c-${value}`}
                  label={value === 'new' ? 'New' : 'Used'}
                  onRemove={() => removeCondition(value)}
                />
              ))}
              {hasPriceFilter && (
                <FilterChip
                  label={`$${extraFilters.minPrice ?? 0}–$${extraFilters.maxPrice ?? '∞'}`}
                  onRemove={removePrice}
                />
              )}
            </div>

            <ButtonSearch
              ref={searchRef}
              onClick={handleSearch}
              disabled={searchEnabled}
              highlight={searchReady && searchEnabled}
            />
          </div>
        </div>
        {/* Fixed at the box's closed height (h-64 minus padding) and pinned to the
            top: when a picker step opens and the box grows, the model must not
            grow with it (049, owner review). */}
        <div className="hidden md:flex items-start justify-center flex-1">
          <div className="h-56 w-full">
            <TirePreview3D />
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchBySize;
