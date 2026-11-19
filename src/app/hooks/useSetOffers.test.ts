import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSetOffers } from './useSetOffers';

const offer = (id: string) => ({ size: 4, total: 400, ids: [id, '9', '8', '7'] });

const stubFetch = (impl: (url: string) => Promise<unknown>) => {
  const fn = vi.fn((url: string) => impl(url));
  vi.stubGlobal('fetch', fn);
  return fn;
};
const ok = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('useSetOffers (054)', () => {
  it('asks once for the list, ids deduped and sorted', async () => {
    const fetchFn = stubFetch(() => ok({ offers: { '2': offer('2') } }));
    const { result } = renderHook(() => useSetOffers(['10', '2', 2]));
    await waitFor(() => expect(result.current['2']).toBeDefined());
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('/api/tires/sets?ids=2,10');
  });

  it('asks again for a new page and never shows the old page’s answer', async () => {
    stubFetch(url =>
      ok({ offers: url.endsWith('ids=1') ? { '1': offer('1') } : { '5': offer('5') } })
    );
    const { result, rerender } = renderHook(({ ids }) => useSetOffers(ids), {
      initialProps: { ids: ['1'] },
    });
    await waitFor(() => expect(result.current['1']).toBeDefined());
    rerender({ ids: ['5'] });
    expect(result.current['1']).toBeUndefined();
    await waitFor(() => expect(result.current['5']).toBeDefined());
  });

  it('shows nothing when the request fails', async () => {
    const fetchFn = stubFetch(() => Promise.resolve({ ok: false, status: 500 }));
    const { result } = renderHook(() => useSetOffers(['1']));
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(result.current).toEqual({});
  });

  it('asks nothing for an empty list', () => {
    const fetchFn = stubFetch(() => ok({ offers: {} }));
    renderHook(() => useSetOffers([]));
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
