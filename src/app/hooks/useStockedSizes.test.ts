import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetStockedSizesCache, useStockedSizes } from './useStockedSizes';

const ok = (sizes: string[]) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ sizes }) } as Response);

describe('useStockedSizes (049)', () => {
  beforeEach(() => resetStockedSizesCache());
  afterEach(() => vi.unstubAllGlobals());

  it('shares one request between pickers on the page', async () => {
    const fetchMock = vi.fn(() => ok(['235/45/18']));
    vi.stubGlobal('fetch', fetchMock);
    const a = renderHook(() => useStockedSizes());
    const b = renderHook(() => useStockedSizes());
    await waitFor(() => expect(a.result.current.tree).not.toBeNull());
    await waitFor(() => expect(b.result.current.tree).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.result.current.isLoading).toBe(false);
    expect([...a.result.current.tree!.keys()]).toEqual(['235']);
  });

  it('reports a failure without throwing, and retries on the next mount', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockImplementation(() => ok(['205/55/16']));
    vi.stubGlobal('fetch', fetchMock);
    const first = renderHook(() => useStockedSizes());
    await waitFor(() => expect(first.result.current.error).toBe(true));
    expect(first.result.current.tree).toBeNull();
    const second = renderHook(() => useStockedSizes());
    await waitFor(() => expect(second.result.current.tree).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
