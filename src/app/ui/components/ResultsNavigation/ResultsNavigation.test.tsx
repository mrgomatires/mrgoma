import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Link from 'next/link';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), pathname: '/tires' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => nav.pathname,
}));

const {
  default: ResultsNavigation,
  useResultsNavigation,
  withCurrentView,
} = await import('./ResultsNavigation');

beforeEach(() => {
  nav.push.mockReset();
  nav.replace.mockReset();
  window.history.replaceState(null, '', '/tires');
});

describe('withCurrentView (061)', () => {
  it('carries the view onto a link that names none', () => {
    expect(withCurrentView('/tires?brands=PIRELLI', '?view=table')).toBe(
      '/tires?brands=PIRELLI&view=table'
    );
  });
  it('leaves a link that names a view, and the list view, alone', () => {
    expect(withCurrentView('/tires?view=list', '?view=table')).toBe('/tires?view=list');
    expect(withCurrentView('/tires?brands=PIRELLI', '')).toBe('/tires?brands=PIRELLI');
  });
});

describe('ResultsNavigation takes over same-page links (061)', () => {
  const renderLinks = (extra?: React.ReactNode) =>
    render(
      <ResultsNavigation>
        <a href="/tires?brands=PIRELLI">Pirelli</a>
        <a href="/tires">Clear all</a>
        <a href="/tires/used">Used page</a>
        <a href="/tires?brands=X" target="_blank">
          New tab
        </a>
        <a href="https://example.com/tires?x=1">External</a>
        {extra}
      </ResultsNavigation>
    );

  it('a plain click on a filter link navigates once, scrolling as next/link would', () => {
    renderLinks();
    const link = screen.getByText('Pirelli');
    const click = fireEvent.click(link);
    expect(click).toBe(false); // default prevented: the browser does not follow it
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith('/tires?brands=PIRELLI', { scroll: true });
  });

  it('"Clear all" (the bare page) is a results change too', () => {
    window.history.replaceState(null, '', '/tires?brands=PIRELLI');
    renderLinks();
    fireEvent.click(screen.getByText('Clear all'));
    expect(nav.push).toHaveBeenCalledWith('/tires', { scroll: true });
  });

  it.each([
    ['another page', 'Used page', {}],
    ['a new tab', 'New tab', {}],
    ['an external link', 'External', {}],
    ['a cmd-click', 'Pirelli', { metaKey: true }],
    ['a ctrl-click', 'Pirelli', { ctrlKey: true }],
    ['a middle click', 'Pirelli', { button: 1 }],
  ])('leaves %s to the browser', (_, text, init) => {
    renderLinks();
    fireEvent.click(screen.getByText(text), init);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('leaves links marked data-results-nav="skip" (the view switch) to themselves', () => {
    render(
      <ResultsNavigation>
        <a href="/tires?view=table" data-results-nav="skip">
          Table
        </a>
      </ResultsNavigation>
    );
    fireEvent.click(screen.getByText('Table'));
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('ignores a link to the URL already shown', () => {
    window.history.replaceState(null, '', '/tires?brands=PIRELLI');
    renderLinks();
    fireEvent.click(screen.getByText('Pirelli'));
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('carries the table view onto the filter', () => {
    window.history.replaceState(null, '', '/tires?view=table');
    renderLinks();
    fireEvent.click(screen.getByText('Pirelli'));
    expect(nav.push).toHaveBeenCalledWith('/tires?brands=PIRELLI&view=table', {
      scroll: true,
    });
  });

  it("a real next/link sees the click already handled, so it doesn't navigate again", () => {
    const seen: boolean[] = [];
    const router = { push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };
    render(
      <AppRouterContext.Provider value={router as never}>
        <ResultsNavigation>
          <Link href="/tires?brands=MICHELIN" onClick={e => seen.push(e.defaultPrevented)}>
            Michelin
          </Link>
        </ResultsNavigation>
      </AppRouterContext.Provider>
    );
    fireEvent.click(screen.getByText('Michelin'));
    // next/link runs the caller's onClick, then returns when defaultPrevented.
    expect(seen).toEqual([true]);
    expect(nav.push).toHaveBeenCalledTimes(1);
  });
});

describe('useResultsNavigation (061)', () => {
  function Probe({ href, replace }: { href: string; replace?: boolean }) {
    const { navigate, isPending } = useResultsNavigation();
    return (
      <button
        type="button"
        data-pending={String(isPending)}
        onClick={() => navigate(href, { replace })}
      >
        go
      </button>
    );
  }

  it('without a provider it is a plain router navigation (as on /tires/used)', () => {
    render(<Probe href="/tires/used?min=1" />);
    fireEvent.click(screen.getByText('go'));
    expect(nav.push).toHaveBeenCalledWith('/tires/used?min=1', { scroll: false });
    expect(screen.getByText('go')).toHaveAttribute('data-pending', 'false');
  });

  it('inside the provider it can replace instead of push (page changes)', async () => {
    render(
      <ResultsNavigation>
        <Probe href="/tires?page=2" replace />
      </ResultsNavigation>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('go'));
    });
    expect(nav.replace).toHaveBeenCalledWith('/tires?page=2', { scroll: false });
    expect(nav.push).not.toHaveBeenCalled();
  });
});
