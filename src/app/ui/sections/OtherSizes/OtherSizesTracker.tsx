'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { trackEvent } from '@/app/utils/analytics';

/**
 * Reports a rim group of "Other sizes of this tire" being **opened** (049).
 *
 * A `summary` click cannot say whether it opens or closes its `<details>`, so
 * markup alone (`data-track`) would count both. `toggle` carries the new state;
 * it does not bubble, hence the capture listener on the wrapper.
 */
export default function OtherSizesTracker({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Skip the toggle events fired while hydrating the default-open group.
    const armedAt = performance.now();
    const onToggle = (e: Event) => {
      const details = e.target as HTMLDetailsElement;
      if (!details.matches?.('details[data-rim]') || !details.open) return;
      if (performance.now() - armedAt < 50) return;
      trackEvent({
        action: 'other_sizes_open',
        category: 'detail',
        label: details.dataset.rim,
      });
    };
    el.addEventListener('toggle', onToggle, true);
    return () => el.removeEventListener('toggle', onToggle, true);
  }, []);

  return (
    <div ref={ref} className="space-y-2">
      {children}
    </div>
  );
}
