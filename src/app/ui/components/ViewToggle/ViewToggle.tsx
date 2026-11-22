'use client';

import { FC, type MouseEvent } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { setView } from '@/app/utils/filterHref';
import { parseTireView, type TireView } from '@/app/utils/filterUtils';

interface ViewToggleProps {
  /** The view the server rendered; the URL decides once the page is live. */
  current: TireView;
  /** The query string the server rendered, so switching keeps every filter. */
  search: string;
  basePath: string;
}

const VIEWS: { value: TireView; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'table', label: 'Table' },
];

/**
 * How the results are read — a list of rows with photos, or a compact table.
 *
 * **Half the catalogue has no photo**, so the row's widest column is a
 * placeholder for every second listing. The choice is in the URL rather than in
 * component state, so a shared link opens the way the sender was reading it and
 * it survives every filter change.
 *
 * Switching shows the **same results** in the other layout, so since 061 it
 * asks the server for nothing: a plain click updates the URL with
 * `history.pushState`, which Next syncs with `useSearchParams` without a
 * navigation, and the list re-renders from it. It also keeps the page (it used
 * to send the buyer back to page 1). The links stay real links — crawlable,
 * and a new tab still gets a server-rendered page — and are marked so
 * `ResultsNavigation` leaves them alone.
 */
const ViewToggle: FC<ViewToggleProps> = ({ current, search, basePath }) => {
  const live = useSearchParams();
  const liveSearch = live ? `?${live.toString()}` : search;
  const liveCurrent = live ? parseTireView(live.get('view')) : current;

  const onClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    window.history.pushState(null, '', href);
    // Where a navigation would have left the buyer: Next scrolls the page's
    // segment (`<main>`) to the top — what the switch did before 061.
    document.querySelector('main')?.scrollIntoView({ block: 'start' });
  };

  return (
    <div
      role="group"
      aria-label="Result view"
      className="inline-flex rounded-md border border-gray-300 bg-white p-0.5"
    >
      {VIEWS.map(view => {
        const isCurrent = view.value === liveCurrent;
        const href = `${basePath}${setView(liveSearch, view.value === 'list' ? undefined : view.value)}`;
        return (
          <Link
            key={view.value}
            href={href}
            prefetch={false}
            onClick={e => onClick(e, href)}
            data-results-nav="skip"
            aria-current={isCurrent ? 'true' : undefined}
            data-track="results_view"
            data-track-category="tires_filter"
            data-track-label={view.value}
            className={`rounded px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
              // White on `bg-green-600` measures 3.21:1 — below the 4.5:1 AA needs at this
              // size. `green-700` clears it and stays on-brand.
              isCurrent ? 'bg-green-700 text-white' : 'text-gray-600 hover:text-green-700'
            }`}
          >
            {view.label}
          </Link>
        );
      })}
    </div>
  );
};

export default ViewToggle;
