import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNearViewport } from './useNearViewport';

afterEach(() => {
  vi.unstubAllGlobals();
});

type Callback = (entries: { isIntersecting: boolean }[]) => void;

function stubObserver() {
  const state: { cb: Callback | null; options?: IntersectionObserverInit } = { cb: null };
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Callback, options?: IntersectionObserverInit) {
        state.cb = cb;
        state.options = options;
      }
      observe = observe;
      disconnect = disconnect;
    }
  );
  return { state, observe, disconnect };
}

const ref = { current: document.createElement('div') };

describe('useNearViewport', () => {
  it('stays false until the element comes near, then true and stops watching', () => {
    const { state, observe, disconnect } = stubObserver();
    const { result } = renderHook(() => useNearViewport(ref));

    expect(result.current).toBe(false);
    expect(observe).toHaveBeenCalledWith(ref.current);
    expect(state.options?.rootMargin).toBe('400px');

    act(() => state.cb?.([{ isIntersecting: false }]));
    expect(result.current).toBe(false);

    act(() => state.cb?.([{ isIntersecting: true }]));
    expect(result.current).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });

  it('is true at once where IntersectionObserver does not exist', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { result } = renderHook(() => useNearViewport(ref));
    expect(result.current).toBe(true);
  });

  it('stops watching on unmount', () => {
    const { disconnect } = stubObserver();
    const { unmount } = renderHook(() => useNearViewport(ref));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
