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
 * The header menu has its own copy (`MenuPrefetchLink`): importing this module
 * from the header made Turbopack load the header twice on every page.
 *
 * Still a plain `<a href>`: crawlable, keyboard-reachable (a keyboard user's
 * page loads on Enter, as for any link). Measured in
 * spec/features/059-tires-prefetch-repeats/results.md.
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
