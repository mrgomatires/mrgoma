'use client';

import { FC } from 'react';

import { useCompare } from '@/app/context/CompareContext';
import type { TransformedTire } from '@/app/interfaces/tires';
import type { GaList } from '@/app/utils/ecommerce';
import { brandName, modelName } from '@/app/utils/tireNaming';

/**
 * "Compare" on a tire card or list row (feature 051).
 *
 * A labelled **checkbox**: "include this tire in the comparison" is a binary,
 * reversible choice, and the platform announces it as checked or not. (A toggle
 * button would need `aria-pressed`, which `ariaPressed.guard.test.ts` keeps out
 * of `src/app`.) The state comes from the compare store, so a refused fourth
 * tire simply stays unchecked while the tray explains the limit.
 *
 * Renders nothing outside the compare provider.
 */
const CompareToggle: FC<{ tire: TransformedTire; list?: GaList; className?: string }> = ({
  tire,
  list,
  className = '',
}) => {
  const compare = useCompare();
  if (!compare) return null;
  const checked = compare.has(String(tire.id));
  const name = [brandName(tire.brand), tire.model ? modelName(tire.model) : '', tire.size]
    .filter(Boolean)
    .join(' ');

  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full px-2 text-sm font-semibold text-gray-700 hover:text-gray-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-600 ${className}`}
      onClick={e => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => compare.toggle(tire, list)}
        // The visible word first (WCAG 2.5.3), then which tire: a text span
        // would run "Compare" and the brand together in the computed name.
        aria-label={`Compare ${name}`.trim()}
        className="h-4 w-4 cursor-pointer rounded border-gray-400 accent-green-600 focus-visible:outline-none"
      />
      Compare
    </label>
  );
};

export default CompareToggle;
