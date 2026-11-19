import RangeSlider from '@/app/ui/components/RangeSlider/RangeSlider';
import { filtersItems } from '@/app/ui/sections/FiltersMobile/FiltersItems';
import { brandName } from '@/app/utils/tireNaming';

type RangeKey = 'price' | 'treadDepth' | 'remainingLife';
type FilterKey = 'brands' | 'condition' | 'patched' | 'kindSale' | 'local';

interface FilterDeps {
  rangeInputs: Record<RangeKey, [number, number]>;
  rangeBounds: Record<RangeKey, [number, number]>;
  availableBrands: string[];
  handleRangeChange: (key: RangeKey, value: [number, number]) => void;
  handleCheckboxChange: React.ChangeEventHandler<HTMLInputElement>;
  isLoadingRanges: boolean;
  isChecked: (key: FilterKey, value: string) => boolean;
  isLoadingBrands: boolean;
}

export const FilterBody = (
  id: string,
  deps: FilterDeps,
  opts?: { isMobile?: boolean; idPrefix?: string; containerExtraClass?: string }
) => {
  const {
    rangeInputs,
    rangeBounds,
    availableBrands,
    handleRangeChange,
    handleCheckboxChange,
    isLoadingRanges,
    isChecked,
    isLoadingBrands,
  } = deps || {};

  const isMobile = opts?.isMobile ?? false;
  const idPrefix = opts?.idPrefix ?? '';
  const containerExtra = opts?.containerExtraClass ?? '';

  if (id === 'price') {
    return (
      <div className="space-y-4">
        {isLoadingRanges ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-2 text-sm text-gray-500">Loading price range...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">${rangeInputs.price[0]}</span>
              <span className="text-sm text-gray-600">${rangeInputs.price[1]}</span>
            </div>
            <RangeSlider
              min={rangeBounds.price[0]}
              max={rangeBounds.price[1]}
              step={1}
              value={rangeInputs.price}
              onChange={value => handleRangeChange('price', value)}
            />
          </>
        )}
      </div>
    );
  }

  if (id === 'treadDepth') {
    return (
      <div className="space-y-4">
        {isLoadingRanges ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-2 text-sm text-gray-500">Loading tread depth range...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{rangeInputs.treadDepth[0]}</span>
              <span className="text-sm text-gray-600">{rangeInputs.treadDepth[1]}</span>
            </div>
            <RangeSlider
              min={rangeBounds.treadDepth[0]}
              max={rangeBounds.treadDepth[1]}
              step={1}
              value={rangeInputs.treadDepth}
              onChange={value => handleRangeChange('treadDepth', value)}
            />
          </>
        )}
      </div>
    );
  }

  if (id === 'remainingLife') {
    return (
      <div className="space-y-4">
        {isLoadingRanges ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-2 text-sm text-gray-500">Loading remaining life range...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{rangeInputs.remainingLife[0]}%</span>
              <span className="text-sm text-gray-600">{rangeInputs.remainingLife[1]}%</span>
            </div>
            <RangeSlider
              min={rangeBounds.remainingLife[0]}
              max={rangeBounds.remainingLife[1]}
              step={1}
              value={rangeInputs.remainingLife}
              onChange={value => handleRangeChange('remainingLife', value)}
            />
          </>
        )}
      </div>
    );
  }

  if (id === 'brands') {
    return (
      <div>
        {isLoadingBrands ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-2 text-sm text-gray-500">Updating brands...</span>
          </div>
        ) : (
          <div
            className={`space-y-${isMobile ? '6' : '4'} h-full max-h-96 overflow-y-auto ${containerExtra}`}
          >
            {availableBrands.length === 0 ? (
              <p className="text-sm text-gray-500">
                No brands available for the current filters. Please try a different combination.
              </p>
            ) : (
              availableBrands.map((brand: string, idx: number) => (
                <div key={brand} className="flex items-center">
                  <input
                    id={`filter-${idPrefix}brands-${idx}`}
                    name="brands[]"
                    value={brand}
                    type="checkbox"
                    checked={isChecked('brands', brand)}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                  />
                  <label
                    htmlFor={`filter-${idPrefix}brands-${idx}`}
                    className={`ml-3 ${isMobile ? 'flex-1 text-gray-500' : 'text-gray-600'} text-sm`}
                  >
                    {/* The label only. `value` stays as stored so the query
                        still matches the catalog. */}
                    {brandName(brand)}
                  </label>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  if (id === 'local') {
    const options = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];
    return (
      <div className={`space-y-${isMobile ? '6' : '4'}`}>
        {options.map((option, optionIdx) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`filter-${idPrefix}local-${optionIdx}`}
              name="local[]"
              value={option.value}
              type="checkbox"
              checked={isChecked('local', option.value)}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
            />
            <label
              htmlFor={`filter-${idPrefix}local-${optionIdx}`}
              className={`ml-3 ${isMobile ? 'flex-1 text-gray-500' : 'text-gray-600'} text-sm`}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    );
  }

  // filtersItems sections
  const section = filtersItems.find(s => s.id === id);
  if (section) {
    return (
      <div className={`space-y-${isMobile ? '6' : '4'}`}>
        {section.options.map((option, optionIdx) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`filter-${idPrefix}${section.id}-${optionIdx}`}
              name={`${section.id}[]`}
              value={option.value}
              type="checkbox"
              checked={isChecked(section.id as FilterKey, option.value)}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
            />
            <label
              htmlFor={`filter-${idPrefix}${section.id}-${optionIdx}`}
              className={`ml-3 ${isMobile ? 'flex-1 text-gray-500' : 'text-gray-600'} text-sm`}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default FilterBody;
