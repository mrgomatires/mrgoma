import { FC } from 'react';

import { TireSize } from '@/app/ui/interfaces/tireSize';

export interface SizeSelectorProps {
  filterKey: string;
  value: string;
  removeFilter: (type: keyof TireSize) => void;
}

/** The names the size picker's steps use (049), so a chip and its step agree. */
const LABELS: Record<string, string> = {
  width: 'Width',
  sidewall: 'Aspect ratio',
  diameter: 'Rim',
};

export const SizeSelector: FC<SizeSelectorProps> = ({ filterKey, value, removeFilter }) => {
  return (
    <span
      key={filterKey}
      className="inline-flex items-center rounded-full bg-green-50 border border-green-300 px-1 text-xs font-medium text-green-700"
    >
      {LABELS[filterKey] ?? filterKey}: {value}
      <button
        type="button"
        onClick={() => removeFilter(filterKey as keyof TireSize)}
        className="inline-flex items-center rounded-full bg-green-50 p-1 text-green-700 hover:bg-green-100"
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        <span className="sr-only">
          Remove {(LABELS[filterKey] ?? filterKey).toLowerCase()} filter
        </span>
      </button>
    </span>
  );
};

export default SizeSelector;
