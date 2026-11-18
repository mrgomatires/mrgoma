import { FC } from 'react';

import Link from 'next/link';

/**
 * "See all sizes →" — the way from a size picker to the size index (050).
 * No hooks: renders in server components (the filter rail) and client ones
 * (the home picker, the `/tires` floating form) alike.
 */
const SeeAllSizesLink: FC<{ surface: 'home' | 'tires_form' | 'rail'; className?: string }> = ({
  surface,
  className = '',
}) => (
  <Link
    href="/tires/size"
    data-track="see_all_sizes"
    data-track-category="size_index"
    data-track-surface={surface}
    className={`inline-flex min-h-11 items-center text-sm font-semibold text-green-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded-sm ${className}`}
  >
    See all sizes →
  </Link>
);

export default SeeAllSizesLink;
