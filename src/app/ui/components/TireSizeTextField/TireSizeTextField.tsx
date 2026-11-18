'use client';

import { FC, useId } from 'react';

import { CarFront } from '@/app/ui/icons';
import { cleanInput } from '@/app/utils/cleanInput';
import { formatTireSize } from '@/app/utils/formatTireSize';
import { handleKeyPress } from '@/app/utils/handleKeyPress';

/** `255/55/18` — the only shape this field produces when complete. */
export const isCompleteTireSize = (value: string) => /^\d{3}\/\d{2}\/\d{2}$/.test(value);

interface TireSizeTextFieldProps {
  value: string;
  /** The formatted value (`255/55/18`) after every keystroke or paste. */
  onValueChange: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * The typed tire-size field — one component for the home "Search by Text" tab,
 * `/instant-quote` and the size index (050).
 *
 * Digits only, formatted as the shopper types (`2555518` → `255/55/18`); a
 * pasted `P255/55R18` is reduced to its digits the same way. No autocomplete.
 */
const TireSizeTextField: FC<TireSizeTextFieldProps> = ({ value, onValueChange, autoFocus }) => {
  const uid = useId();
  const isInvalid = value.trim().length > 0 && !isCompleteTireSize(value);
  const inputId = `${uid}-size`;
  const helpId = `${uid}-help`;
  const errorId = `${uid}-error`;

  return (
    <div className="space-y-4">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700 flex items-center">
        <CarFront className="w-5 h-5 text-gray-600" />
        <span className="text-base font-medium text-gray-600 capitalize ml-1">Tire Size</span>
      </label>
      <input
        id={inputId}
        autoFocus={autoFocus}
        inputMode="numeric"
        type="text"
        placeholder="e.g. 255/55/18"
        autoComplete="off"
        enterKeyHint="search"
        title="Enter tire size as Width/Aspect/Diameter, e.g. 255/55/18"
        aria-describedby={isInvalid ? `${helpId} ${errorId}` : helpId}
        aria-invalid={isInvalid}
        value={value}
        onChange={event => onValueChange(formatTireSize(cleanInput(event.target.value)))}
        onKeyDown={handleKeyPress}
        className={`w-full bg-white rounded-md py-2 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-shadow border ${
          isInvalid ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      <div className="flex items-center justify-between">
        <p id={helpId} className="text-xs text-gray-600">
          Enter size as Width/Aspect/Diameter (e.g., 255/55/18).
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onValueChange('')}
            className="text-xs text-gray-600 cursor-pointer underline hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
          >
            Clear
          </button>
        )}
      </div>
      {isInvalid && (
        <p id={errorId} className="text-xs text-red-600">
          Please complete the size as 3 digits / 2 digits / 2 digits.
        </p>
      )}
    </div>
  );
};

export default TireSizeTextField;
