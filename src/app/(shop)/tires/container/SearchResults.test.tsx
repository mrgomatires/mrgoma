import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransformedTire } from '@/app/interfaces/tires';

const state = vi.hoisted(() => ({
  search: '',
  navigate: vi.fn(),
  isPending: false,
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: state.replace, push: state.push, prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.search),
  usePathname: () => '/tires',
}));
vi.mock('@/app/ui/components/ResultsNavigation/ResultsNavigation', () => ({
  useResultsNavigation: () => ({ navigate: state.navigate, isPending: state.isPending }),
}));

// The list itself is tested elsewhere; here: what it receives, and how often
// it mounts.
const mounts = vi.hoisted(() => ({ count: 0, offsets: [] as number[] }));
vi.mock('@/app/ui/components/TireResults/TireResults', async () => {
  const React = await import('react');
  return {
    default: ({ products, indexOffset }: { products: { id: string }[]; indexOffset: number }) => {
      React.useEffect(() => {
        mounts.count++;
      }, []);
      mounts.offsets.push(indexOffset);
      return (
        <ul data-testid="cards">
          {products.map(p => (
            <li key={p.id}>{p.id}</li>
          ))}
        </ul>
      );
    },
  };
});
vi.mock('@/app/ui/components/TireTable/TireTable', () => ({
  default: () => <table data-testid="table" />,
}));
vi.mock('@/app/ui/components/ResultsHeader/ResultsHeader', () => ({
  default: () => <div data-testid="header" />,
}));
vi.mock('@/app/ui/components/CollapsibleSearchBar/CollapsibleSearchBar', () => ({
  default: () => null,
}));
vi.mock('@/app/ui/sections/PromoBanner/PromoBanner', () => ({ default: () => null }));

import SearchResults from './SearchResults';
import type { PaginatedTiresResponse } from '../utils/fetchTiresServer';

const tires = (ids: string[]) => ids.map(id => ({ id }) as unknown as TransformedTire);
const page = (
  n: number,
  ids = ['a', 'b'],
  pageSize = 20,
  totalCount = 200
): PaginatedTiresResponse => ({
  tires: tires(ids),
  totalCount,
  page: n,
  pageSize,
  totalPages: Math.ceil(totalCount / pageSize),
  error: '',
});

const fetchSpy = vi.fn();

beforeEach(() => {
  state.search = '';
  state.isPending = false;
  state.navigate.mockReset();
  state.replace.mockReset();
  state.push.mockReset();
  mounts.count = 0;
  mounts.offsets = [];
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
  window.history.replaceState(null, '', '/tires');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SearchResults renders the server page and fetches nothing (061)', () => {
  it('never asks /api/tires — not on load, not when the URL or the data change', () => {
    const { rerender } = render(<SearchResults data={page(1)} />);
    state.search = 'brands=PIRELLI';
    rerender(<SearchResults data={page(1, ['c', 'd'])} />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a new page from the server replaces the cards in place, without remounting them', () => {
    const { rerender } = render(<SearchResults data={page(1, ['a', 'b'])} />);
    rerender(<SearchResults data={page(1, ['c', 'd'])} />);
    expect(screen.getByTestId('cards').textContent).toBe('cd');
    expect(mounts.count).toBe(1);
  });

  it('positions on page 2 start after page 1 (GA4 select_item / view_item_list)', () => {
    render(<SearchResults data={page(2)} />);
    expect(mounts.offsets.at(-1)).toBe(20);
  });

  it('does not touch the URL on load (039: a reload on ?page=7 stayed on page 7)', () => {
    window.history.replaceState(null, '', '/tires?page=7&pageSize=20');
    state.search = 'page=7&pageSize=20';
    render(<SearchResults data={page(7)} />);
    expect(state.replace).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });
});

describe('pagination navigates (061)', () => {
  it('next page: one navigation, history replaced, filters and view kept', () => {
    window.history.replaceState(null, '', '/tires?brands=PIRELLI&view=table');
    state.search = 'brands=PIRELLI&view=table';
    render(<SearchResults data={page(1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(state.navigate).toHaveBeenCalledTimes(1);
    expect(state.navigate).toHaveBeenCalledWith(
      '/tires?brands=PIRELLI&view=table&page=2&pageSize=20',
      { replace: true }
    );
  });

  it('the current page number does nothing', () => {
    render(<SearchResults data={page(3)} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('page size keeps the first tire on screen in view', () => {
    render(<SearchResults data={page(2)} />);
    fireEvent.change(screen.getByLabelText('Rows per page:'), { target: { value: '10' } });
    // Tire 21 was first on page 2 of 20; with 10 per page it is on page 3.
    expect(state.navigate).toHaveBeenCalledWith('/tires?page=3&pageSize=10', { replace: true });
  });
});

describe('while a change is on its way (061)', () => {
  it('the list is dimmed, inert and busy; pagination is disabled; the header is not', () => {
    state.isPending = true;
    render(<SearchResults data={page(2)} />);
    const list = screen.getByTestId('cards').parentElement!;
    expect(list).toHaveAttribute('inert');
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(list.className).toContain('opacity-50');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByLabelText('Rows per page:')).toBeDisabled();
    expect(screen.getByTestId('header').closest('[inert]')).toBeNull();
  });

  it('is fully interactive otherwise', () => {
    render(<SearchResults data={page(2)} />);
    const list = screen.getByTestId('cards').parentElement!;
    expect(list).not.toHaveAttribute('inert');
    expect(list).toHaveAttribute('aria-busy', 'false');
  });
});

describe('the view comes from the URL (061: the switch never asks the server)', () => {
  it('?view=table shows the table', () => {
    state.search = 'view=table';
    render(<SearchResults data={page(1)} />);
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('no view shows the list', () => {
    render(<SearchResults data={page(1)} />);
    expect(screen.getByTestId('cards')).toBeInTheDocument();
  });
});
