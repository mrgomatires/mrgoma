'use client';

import { type ComponentProps, useState } from 'react';

import Link from 'next/link';

type Props = Omit<ComponentProps<typeof Link>, 'prefetch'>;

/**
 * A `next/link` that pre-loads its page only once the shopper shows intent:
 * the pointer enters it or a finger touches it (059).
 *
 * Next prefetches every link as it enters the viewport, and on `/tires` it
 * did so again after every filter change — the header's "New tires" and
 * "Shop by size" re-downloaded their whole pages each time, and every card's
 * brand and size links were fetched as the cards scrolled by. This is the
 * pattern Next documents as "Hover-triggered prefetch"
 * (`node_modules/next/dist/docs/01-app/02-guides/prefetching.md`), plus touch
 * for phones. `prefetch={false}` alone would also switch off the hover
 * prefetch; `null` is Next's default once intent is shown.
 *
 * Site-wide since 060: every link to a tire's page (each such pre-load was a
 * database read), the whole menu but the logo, and the footer. Links people
 * usually do follow (the logo, the home page's main buttons, "View all…",
 * pagination, "Checkout", the filter rail) keep Next's default.
 *
 * One component for the pages and the layout. In 059 the header got its own
 * copy because importing this module made the header ship twice; the cause
 * was the root 404 importing `Header` directly (a second entry), fixed in 060.
 * `perf-budget.mjs` fails if the header ships twice again.
 *
 * Still a plain `<a href>`: crawlable, keyboard-reachable (a keyboard user's
 * page loads on Enter, as for any link). Measured in
 * spec/features/059-tires-prefetch-repeats/results.md and
 * spec/features/060-intent-prefetch-site/results.md.
 */
export default function IntentPrefetchLink({ onMouseEnter, onTouchStart, ...props }: Props) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={e => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={e => {
        setIntent(true);
        onTouchStart?.(e);
      }}
    />
  );
}
