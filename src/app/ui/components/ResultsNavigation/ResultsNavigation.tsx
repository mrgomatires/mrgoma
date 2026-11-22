'use client';

import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from 'react';

import { usePathname, useRouter } from 'next/navigation';

/**
 * `scroll` as in `router.push`: links taken over keep `next/link`'s default
 * (true — what they did before 061: a filter brings the page back to the top of
 * the results); the programmatic callers pass what they always passed (false).
 */
type Navigate = (href: string, options?: { replace?: boolean; scroll?: boolean }) => void;

interface ResultsNavigationValue {
  navigate: Navigate;
  /** A change made through `navigate` is on its way: the server is rendering it. */
  isPending: boolean;
}

const ResultsNavigationContext = createContext<ResultsNavigationValue | null>(null);

/**
 * `href` with the current list/table view carried over when it names none
 * (061). The view switch updates the URL in the browser only
 * (`history.pushState`), so links the server built before the switch don't
 * know about it; without this, the next filter would drop back to the list.
 */
export function withCurrentView(href: string, currentSearch: string): string {
  const view = new URLSearchParams(currentSearch).get('view');
  if (!view) return href;
  const base = typeof window === 'undefined' ? 'http://localhost/' : window.location.href;
  const url = new URL(href, base);
  if (url.searchParams.has('view')) return href;
  url.searchParams.set('view', view);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Every change to the results on `/tires` — a filter, a chip, the sort, a
 * range, the page, the page size — goes through one transition, so the list
 * can show that new results are on their way (061).
 *
 * Before 061 the list kept its own copy of the results and fetched them again
 * from `/api/tires` after every change, although the server had just rendered
 * them: two catalogue searches per click. Now the list renders the server's
 * answer, and this provider owns the pending state while that answer comes.
 *
 * Links stay links (crawlable, middle-click, "filtering is navigation", 052):
 * a plain left click on a same-page link inside the region is taken over here,
 * in React's capture phase — before `next/link`'s own `onClick`, which then
 * sees the event default-prevented and does not navigate a second time.
 * `useRouter` navigations are transitions themselves, so `isPending` lasts
 * until the new render commits (measured in 061's results, T2).
 */
export default function ResultsNavigation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback<Navigate>(
    (href, options = {}) => {
      const target = withCurrentView(href, window.location.search);
      const scroll = options.scroll ?? false;
      startTransition(() => {
        if (options.replace) router.replace(target, { scroll });
        else router.push(target, { scroll });
      });
    },
    [router]
  );

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element | null)?.closest?.('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    // Links that handle themselves without the server (the list/table switch).
    if (anchor.closest('[data-results-nav="skip"]')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== pathname) return;
    const next = `${url.pathname}${url.search}`;
    if (next === `${window.location.pathname}${window.location.search}`) return;
    e.preventDefault();
    // As `next/link` would: scroll to the new results (matches production).
    navigate(next, { scroll: true });
  };

  const value = useMemo(() => ({ navigate, isPending }), [navigate, isPending]);

  return (
    <ResultsNavigationContext.Provider value={value}>
      <div className={className} onClickCapture={onClickCapture}>
        {children}
      </div>
    </ResultsNavigationContext.Provider>
  );
}

/**
 * Navigate the results. Inside `ResultsNavigation` (`/tires`) the change is
 * tracked as pending; elsewhere (`/tires/used` shares the rail) it is a plain
 * router navigation, as before 061.
 */
export function useResultsNavigation(): ResultsNavigationValue {
  const context = useContext(ResultsNavigationContext);
  const router = useRouter();
  const fallback = useCallback<Navigate>(
    (href, options = {}) => {
      const scroll = options.scroll ?? false;
      if (options.replace) router.replace(href, { scroll });
      else router.push(href, { scroll });
    },
    [router]
  );
  return context ?? { navigate: fallback, isPending: false };
}
