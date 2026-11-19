import React from 'react';

import { act, render } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/app/context/CartContext';
import { CompareProvider } from '@/app/context/CompareContext';
import { SelectedFiltersProvider } from '@/app/context/SelectedFilters';
import { DetailModalProvider } from '@/app/context/ShowDetailModal';
import { FiltersProvider } from '@/app/context/ShowFilterContext';
import { MenuProvider } from '@/app/context/ShowMenuContext';

/**
 * 058: opening the seller dashboard asked the server for everything twice —
 * the tire list, brands, ranges, heights, the session and the page data —
 * doubling its database work on a 10-connection pool. Counted here on mount,
 * with the real components and the network mocked, so a second request from
 * any of them fails the test.
 */

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  params: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
  usePathname: () => '/dashboard',
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <img alt={typeof alt === 'string' ? alt : ''} />,
}));

// The assistant is lazy and talks to its own endpoint only when opened.
vi.mock('next/dynamic', () => ({ default: () => () => null }));
// …but the table, also loaded through next/dynamic, is the point: mount it.
vi.mock('@/app/ui/sections/DashboardTableContainer/DashboardTableContainer', async () => {
  const { default: DashboardTable } =
    await import('@/app/ui/components/DashboardTable/DashboardTable');
  return { default: () => <DashboardTable /> };
});

const RANGES = {
  minPrice: 10,
  maxPrice: 500,
  minTreadDepth: 1,
  maxTreadDepth: 12,
  minRemainingLife: 0,
  maxRemainingLife: 100,
};

function answer(path: string): unknown {
  if (path.startsWith('/api/auth/session'))
    return { user: { name: 'seller' }, expires: '2999-01-01' };
  if (path.startsWith('/api/dashboard/tires')) return { records: [], totalCount: 0 };
  if (path.startsWith('/api/dashboard/ranges')) return RANGES;
  return [];
}

let calls: string[] = [];

beforeEach(() => {
  calls = [];
  nav.push.mockReset();
  nav.replace.mockReset();
  nav.params = new URLSearchParams();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      calls.push(url.pathname + url.search);
      const body = answer(url.pathname);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const { default: Dashboard } = await import('./Dashboard');
const { default: DashboardHeader } =
  await import('@/app/ui/sections/DashboardHeader/DashboardHeader');

// As the dashboard layout does (058): the server's session is handed in, so
// the provider reads none on load (`bundle.guard.test.ts` keeps the layout so).
const SESSION = { user: { name: 'seller' }, expires: '2999-01-01T00:00:00.000Z' };

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider session={SESSION}>
      <DetailModalProvider>
        <FiltersProvider>
          <SelectedFiltersProvider>
            <MenuProvider>
              <CartProvider>
                <CompareProvider>{children}</CompareProvider>
              </CartProvider>
            </MenuProvider>
          </SelectedFiltersProvider>
        </FiltersProvider>
      </DetailModalProvider>
    </SessionProvider>
  );
}

async function settle() {
  // Brands are fetched after a short debounce; wait well past it.
  for (let i = 0; i < 25; i++) {
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
  }
}

const count = (prefix: string) => calls.filter(c => c.startsWith(prefix)).length;

describe('the dashboard asks for each thing once when it opens', () => {
  it.each([
    '/api/dashboard/tires',
    '/api/dashboard/brands',
    '/api/dashboard/ranges',
    '/api/dashboard/stores',
    '/api/dimensions/heights',
  ])('%s — once', async prefix => {
    render(
      <Providers>
        <DashboardHeader />
        <Dashboard />
      </Providers>
    );
    await settle();
    expect(count(prefix), `requests: ${calls.join(' | ')}`).toBe(1);
  });

  it('and reads no session in the browser: the server handed it in', async () => {
    render(
      <Providers>
        <DashboardHeader />
        <Dashboard />
      </Providers>
    );
    await settle();
    expect(count('/api/auth/session'), `requests: ${calls.join(' | ')}`).toBe(0);
  });

  it('but still re-reads it once when the tab is shown again (focus refresh)', async () => {
    render(
      <Providers>
        <DashboardHeader />
        <Dashboard />
      </Providers>
    );
    await settle();
    expect(count('/api/auth/session')).toBe(0);

    // next-auth refreshes on `visibilitychange` when the tab is visible: it is
    // how a sign-out in another tab is noticed. Kept on purpose (058, FR3).
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await settle();
    // At least one: the refresh is kept. At most two: next-auth 5 beta echoes
    // its own refresh — getSession announces itself on a new BroadcastChannel
    // and the provider's "another tab" listener reads again. Not ours to fix
    // without patching the library; the session is a JWT read (no database),
    // and this only happens when the tab is shown again. If an upgrade drops
    // the echo, tighten this to 1.
    const reads = count('/api/auth/session');
    expect(reads, `requests: ${calls.join(' | ')}`).toBeGreaterThanOrEqual(1);
    expect(reads).toBeLessThanOrEqual(2);
  }, 15_000);

  it('opening the phone filter panel asks for nothing: the options are shared', async () => {
    const { getByRole } = render(
      <Providers>
        <DashboardHeader />
        <Dashboard />
      </Providers>
    );
    await settle();
    const before = calls.length;

    await act(async () => {
      getByRole('button', { name: 'Show filters', hidden: true }).click();
    });
    await settle();
    // The panel really opened (its own filter list is mounted now)…
    expect(document.querySelectorAll('[role="dialog"]').length).toBeGreaterThan(0);
    // …and asked the server for nothing.
    expect(calls.slice(before), 'requests made by opening the panel').toEqual([]);
  }, 15_000);

  it('and does not navigate on mount (no extra page-data request)', async () => {
    render(
      <Providers>
        <DashboardHeader />
        <Dashboard />
      </Providers>
    );
    await settle();
    expect(nav.push.mock.calls.map(c => c[0])).toEqual([]);
    expect(nav.replace.mock.calls.map(c => c[0])).toEqual([]);
  });
});
