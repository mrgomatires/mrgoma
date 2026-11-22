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

describe('useSetOffers asks once per set of cards (061)', () => {
  it('a re-render with the same cards (new array, same ids) asks nothing again', async () => {
    const fetchFn = stubFetch(() => ok({ offers: {} }));
    const { rerender } = renderHook(({ ids }) => useSetOffers(ids), {
      initialProps: { ids: ['3', '1'] },
    });
    rerender({ ids: ['1', '3'] });
    rerender({ ids: ['1', '3', '3'] });
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  });

  it('new cards cancel only the previous request, and ask once', async () => {
    const signals: AbortSignal[] = [];
    const fetchFn = vi.fn((_: string, init?: { signal?: AbortSignal }) => {
      signals.push(init!.signal!);
      return new Promise(() => {}); // never answers: still in flight
    });
    vi.stubGlobal('fetch', fetchFn);
    const { rerender } = renderHook(({ ids }) => useSetOffers(ids), {
      initialProps: { ids: ['1'] },
    });
    rerender({ ids: ['2'] });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(signals[0].aborted).toBe(true); // the replaced cards' request
    expect(signals[1].aborted).toBe(false); // the cards on screen
  });

  it('cards shown again (list → table → list) reuse the answer: no request', async () => {
    const fetchFn = stubFetch(() => ok({ offers: { '1': offer('1') } }));
    const first = renderHook(() => useSetOffers(['1']));
    await waitFor(() => expect(first.result.current['1']).toBeDefined());
    first.unmount();
    const again = renderHook(() => useSetOffers(['1']));
    expect(again.result.current['1']).toBeDefined(); // at once, from memory
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
