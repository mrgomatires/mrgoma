import { FC } from 'react';

import Link from 'next/link';

import { hasValue, removeValue, setParam, toggleValue } from '@/app/utils/filterHref';
import {
  QUICK_TREAD_STEP,
  isNewOnly,
  TREAD_SR_HINT,
  treadLabel,
  withUsed,
} from '@/app/utils/usedFilters';
import type { TireFilters } from '@/repositories/filtersClause';

type Chip = {
  group: 'patched' | 'runFlat' | 'tread';
  value: string;
  label: string;
  /** Read after a shorthand label, for screen readers only (WCAG 2.5.3). */
  srHint?: string;
  applied: boolean;
  href: string;
};

interface UsedQuickChipsProps {
  filters: TireFilters;
  /** The current query string, including the leading `?`. */
  search: string;
  basePath: string;
  className?: string;
}

/**
 * The used-tire filters buyers reach for most, one tap above the results
 * (feature 052, D2): "Not patched", "Run-flat", "8/32"+".
 *
 * Plain links, like the rail (no JavaScript needed, every state a URL), and the
 * same parameters the rail writes, so a chip and its rail option are always
 * the same filter. A used filter narrows to used (D3); while browsing new tires
 * only "Run-flat" is offered (D5).
 *
 * On a phone the row scrolls sideways with a fade at the edge that has more
 * (modern-web-guidance, scrollability affordance hints).
 */
const UsedQuickChips: FC<UsedQuickChipsProps> = ({ filters, search, basePath, className = '' }) => {
  const newOnly = isNewOnly(filters);
  const notPatched = hasValue(search, 'patched', 'no');
  const runFlat = hasValue(search, 'kindSale', 'yes');
  const tread = filters.minTreadDepth === QUICK_TREAD_STEP;

  const chips: Chip[] = [
    ...(newOnly
      ? []
      : [
          {
            group: 'patched' as const,
            value: 'no',
            label: 'Not patched',
            applied: notPatched,
            href: notPatched
              ? removeValue(search, 'patched', 'no')
              : toggleValue(withUsed(search), 'patched', 'no'),
          },
        ]),
    {
      group: 'runFlat',
      value: 'yes',
      label: 'Run-flat',
      applied: runFlat,
      href: toggleValue(search, 'kindSale', 'yes'),
    },
    ...(newOnly
      ? []
      : [
          {
            group: 'tread' as const,
            value: String(QUICK_TREAD_STEP),
            label: treadLabel(QUICK_TREAD_STEP),
            srHint: TREAD_SR_HINT,
            applied: tread,
            href: tread
              ? setParam(search, 'minTreadDepth', undefined)
              : setParam(withUsed(search), 'minTreadDepth', String(QUICK_TREAD_STEP)),
          },
        ]),
  ];

  return (
    <ul aria-label="Quick filters" className={`quick-chips flex gap-2 ${className}`.trim()}>
      {chips.map(chip => (
        <li key={chip.group} className="shrink-0">
          <Link
            href={`${basePath}${chip.href}`}
            aria-current={chip.applied ? 'true' : undefined}
            // As the rail's options: the same event whether the tap applies or
            // clears it, so a chip and its rail option report alike.
            data-track="filter_apply"
            data-track-category="tires_filter"
            data-track-label={`${chip.group}:${chip.value}`}
            data-track-filter-group={chip.group}
            data-track-filter-value={chip.value}
            data-track-surface="quick_chips"
            className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 ${
              chip.applied
                ? 'border-[#0a0a0a] bg-[#0a0a0a] text-[#9dfb40]'
                : 'border-gray-300 bg-white text-gray-800 hover:border-gray-900'
            }`}
          >
            {chip.applied && <span aria-hidden="true">✓</span>}
            {chip.label}
            {chip.srHint && (
              <>
                {' '}
                <span className="sr-only">{chip.srHint}</span>
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default UsedQuickChips;
