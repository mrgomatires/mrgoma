import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetStockedSizesCache } from '@/app/hooks/useStockedSizes';

const nav = vi.hoisted(() => ({ push: vi.fn(), query: 'brands=Pirelli&page=3' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));
vi.mock('@/app/utils/analytics', () => ({ trackEvent: vi.fn() }));

import CollapsibleSearchBar from './CollapsibleSearchBar';

describe('/tires floating size form with the picker (049)', () => {
  beforeEach(() => {
    resetStockedSizesCache();
    nav.push.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sizes: ['235/45/18', '245/40/19'] }),
        } as Response)
      )
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const open = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<CollapsibleSearchBar redirectBasePath="tires" />);
    await user.click(screen.getAllByRole('button')[0]);
    const width = screen.getByRole('button', { name: /^Width/ });
    await waitFor(() => expect(width).toHaveAttribute('aria-disabled', 'false'));
    return width;
  };

  it('stages the picks and searches once, on Search, keeping other filters (AC4, AC7c)', async () => {
    const user = userEvent.setup();
    await user.click(await open(user));
    await user.click(screen.getByRole('button', { name: '235' }));
    await user.click(screen.getByRole('button', { name: '45' }));
    await user.click(screen.getByRole('button', { name: '18' }));
    expect(nav.push).not.toHaveBeenCalled();

    const search = screen.getByRole('button', { name: 'Search' });
    await waitFor(() => expect(document.activeElement).toBe(search));
    await user.click(search);
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith('/tires?brands=Pirelli&w=235&s=45&d=18');
  });

  it('can still search a width alone, as before', async () => {
    const user = userEvent.setup();
    await user.click(await open(user));
    await user.click(screen.getByRole('button', { name: '245' }));
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(nav.push).toHaveBeenCalledWith('/tires?brands=Pirelli&w=245');
  });

  it('keeps Search disabled until the size changes', async () => {
    const user = userEvent.setup();
    await open(user);
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
  });
});
