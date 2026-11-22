import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ search: 'brands=PIRELLI&page=3', navigate: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.search),
  usePathname: () => '/tires',
}));
vi.mock('@/app/ui/components/ResultsNavigation/ResultsNavigation', () => ({
  useResultsNavigation: () => ({ navigate: state.navigate, isPending: false }),
}));

const { default: ResultsHeader } = await import('./ResultsHeader');

beforeEach(() => state.navigate.mockReset());

describe('ResultsHeader sort (061)', () => {
  it('a sort change is one results navigation, back to page 1, filters kept', () => {
    render(<ResultsHeader showFilterButton={false} />);
    fireEvent.change(screen.getByLabelText('Sort results'), { target: { value: 'price-asc' } });
    expect(state.navigate).toHaveBeenCalledTimes(1);
    expect(state.navigate).toHaveBeenCalledWith('/tires?brands=PIRELLI&page=1&sort=price-asc');
  });

  it('clearing the sort removes it from the URL', () => {
    state.search = 'brands=PIRELLI&sort=price-asc';
    render(<ResultsHeader showFilterButton={false} />);
    fireEvent.change(screen.getByLabelText('Sort results'), { target: { value: '' } });
    expect(state.navigate).toHaveBeenCalledWith('/tires?brands=PIRELLI&page=1');
  });
});
