import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectedFiltersProvider } from '@/app/context/SelectedFilters';
import { resetStockedSizesCache } from '@/app/hooks/useStockedSizes';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/app/utils/analytics', () => ({ trackEvent: vi.fn() }));
// The 3D preview (three.js) and the "More filters" panel are not under test.
vi.mock('@/app/ui/components/TirePreview3D/TirePreview3D', () => ({ default: () => null }));
vi.mock('@/app/ui/components/TirePreview3D/TirePreview3DMobile', () => ({ default: () => null }));
vi.mock('@/app/ui/components/HomeMoreFilters/HomeMoreFilters', () => ({ default: () => null }));

import SearchBySize from './SearchBySize';

describe('SearchBySize with the size picker (049)', () => {
  beforeEach(() => {
    resetStockedSizesCache();
    push.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sizes: ['235/45/18', '235/45/19', '205/55/16'] }),
        } as Response)
      )
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('never searches on its own; Search takes focus and builds the same URL (AC4, AC7c)', async () => {
    const user = userEvent.setup();
    render(
      <SelectedFiltersProvider>
        <SearchBySize />
      </SelectedFiltersProvider>
    );
    const width = screen.getByRole('button', { name: /^Width/ });
    await waitFor(() => expect(width).toHaveAttribute('aria-disabled', 'false'));

    await user.click(width);
    await user.click(screen.getByRole('button', { name: '235' }));
    await user.click(screen.getByRole('button', { name: '45' }));
    await user.click(screen.getByRole('button', { name: '18' }));

    expect(push).not.toHaveBeenCalled();
    const search = screen.getByRole('button', { name: 'Search Tires' });
    await waitFor(() => expect(document.activeElement).toBe(search));
    expect(search).toHaveClass('search-ready');

    await user.click(search);
    expect(push).toHaveBeenCalledWith('/tires?w=235&s=45&d=18');
  });

  it('removing the width chip clears the steps after it', async () => {
    const user = userEvent.setup();
    render(
      <SelectedFiltersProvider>
        <SearchBySize />
      </SelectedFiltersProvider>
    );
    const width = screen.getByRole('button', { name: /^Width/ });
    await waitFor(() => expect(width).toHaveAttribute('aria-disabled', 'false'));
    await user.click(width);
    await user.click(screen.getByRole('button', { name: '235' }));
    await user.click(screen.getByRole('button', { name: '45' }));
    await user.click(screen.getByRole('button', { name: 'Remove width filter' }));
    expect(screen.getByRole('button', { name: /^Width/ })).toHaveTextContent('Select');
    expect(screen.getByRole('button', { name: /^Aspect ratio/ })).toHaveTextContent('Select');
    expect(screen.getByRole('button', { name: 'Select all measurements' })).toBeDisabled();
  });
});
