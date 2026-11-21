'use client';

import { type ComponentProps, useState } from 'react';

import Link from 'next/link';

type Props = Omit<ComponentProps<typeof Link>, 'prefetch' | 'onMouseEnter' | 'onTouchStart'>;

/**
 * The header menu's copy of `IntentPrefetchLink` (059): pre-loads its page
 * only once the pointer enters it or a finger touches it.
 *
 * A copy on purpose. When the header imported the module the tire cards also
 * use, Turbopack split the header into two chunks that every page then loaded
 * (+12 KB gzip on each shopper page, measured with `npm run perf:budget`).
 * Kept to the menu's needs; the cards' version has the tests for the shared
 * behavior, `menu.prefetch.test.tsx` pins this one.
 */
export default function MenuPrefetchLink(props: Props) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={() => setIntent(true)}
      onTouchStart={() => setIntent(true)}
    />
  );
}
